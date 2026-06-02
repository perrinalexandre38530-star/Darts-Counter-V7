import * as React from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { exportCloudSnapshot, importCloudSnapshot } from "../lib/storage";

// Coffre autonome : inspecte les zones locales, crée de vrais snapshots compte,
// restaure les snapshots NAS/local et garde les cartes dans la largeur écran.

type Props = { go?: (tab: any, params?: any) => void };

type Summary = {
  bytes: number;
  keys: number;
  profiles: number;
  matches: number;
  historyRows: number;
  statsBlocks: number;
  mediaRefs: number;
  dataImages: number;
  names: string[];
  sports: string[];
};

type RawKind = "localStorage" | "idbStore" | "snapshot";

type Block = {
  id: string;
  label: string;
  source: string;
  path: string;
  createdAt?: string;
  summary: Summary;
  payload?: any;
  rawKind?: RawKind;
  dbName?: string;
  storeName?: string;
  key?: IDBValidKey | string | number;
};

type NasSlot = {
  id: string;
  slotId?: string;
  ownerId?: string;
  version?: number;
  summary?: Partial<Summary> & Record<string, any>;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  promotedAt?: string | null;
  latest?: boolean;
};

const DB_NAME = "dc_memory_card_v1";
const STORE = "slots";
const MAX_SLOTS = 10;
const neon = "#22d3ee";
const danger = "#fb7185";
const success = "#34d399";
const warn = "#fbbf24";

function toText(value: any): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

function bytesOf(value: any): number {
  try { return new Blob([toText(value)]).size; } catch { return toText(value).length; }
}

function uniq(values: string[], max = 12) {
  return Array.from(new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))).slice(0, max);
}

function tryParse(value: any): any {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return value;
  if (!(raw.startsWith("{") || raw.startsWith("[") || raw.startsWith('"'))) return value;
  try { return JSON.parse(raw); } catch { return value; }
}

function walk(value: any, acc: any = { profiles: 0, matches: 0, historyRows: 0, statsBlocks: 0, mediaRefs: 0, dataImages: 0, names: [], sports: [] }, depth = 0) {
  if (depth > 8 || value == null) return acc;
  if (typeof value === "string") {
    const s = value;
    if (/data:image\//i.test(s)) acc.dataImages += 1;
    if (/\/media\//i.test(s) || /media_/i.test(s)) acc.mediaRefs += 1;
    if (/x01|darts|babyfoot|cricket|killer|petanque|pingpong|molkky/i.test(s)) {
      const m = s.match(/x01|darts|babyfoot|cricket|killer|petanque|pingpong|molkky/gi);
      if (m) acc.sports.push(...m.map((x) => x.toLowerCase()));
    }
    return acc;
  }
  if (typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 500)) walk(item, acc, depth + 1);
    return acc;
  }
  const obj = value as Record<string, any>;
  const keys = Object.keys(obj);
  const joined = keys.join(" ").toLowerCase();
  const hasProfileShape = obj.displayName || obj.nickname || obj.avatarUrl || obj.avatar || joined.includes("profile");
  const hasMatchShape = obj.sport || obj.result || obj.players || obj.participants || obj.teams || joined.includes("match");
  if (hasProfileShape) acc.profiles += 1;
  if (hasMatchShape) acc.matches += 1;
  if (joined.includes("history") || obj.createdAt || obj.created_at || obj.finishedAt) acc.historyRows += 1;
  if (joined.includes("stats") || obj.avg3 || obj.bestVisit || obj.bestCheckout) acc.statsBlocks += 1;
  if (obj.avatarUrl || obj.avatar || obj.mediaId || obj.assetId || obj.avatarAssetId) acc.mediaRefs += 1;
  const name = obj.name || obj.displayName || obj.nickname || obj.local_profile_name || obj.playerName || obj.teamName || obj.title;
  if (typeof name === "string" && name.length <= 80) acc.names.push(name);
  const sport = obj.sport || obj.mode || obj.game || obj.gameMode;
  if (typeof sport === "string" && sport.length <= 40) acc.sports.push(sport.toLowerCase());
  for (const k of keys.slice(0, 120)) walk(obj[k], acc, depth + 1);
  return acc;
}

function summarize(value: any, keyCount = 1): Summary {
  const parsed = tryParse(value);
  const acc = walk(parsed);
  return {
    bytes: bytesOf(value),
    keys: keyCount,
    profiles: Number(acc.profiles || 0),
    matches: Number(acc.matches || 0),
    historyRows: Number(acc.historyRows || 0),
    statsBlocks: Number(acc.statsBlocks || 0),
    mediaRefs: Number(acc.mediaRefs || 0),
    dataImages: Number(acc.dataImages || 0),
    names: uniq(acc.names || []),
    sports: uniq(acc.sports || []),
  };
}

function score(s: Partial<Summary>) {
  return Number(s.matches || 0) * 20 + Number(s.historyRows || 0) * 8 + Number(s.profiles || 0) * 6 + Number(s.statsBlocks || 0) * 5 + Number(s.mediaRefs || 0) + Number(s.dataImages || 0);
}

function quality(s: Partial<Summary>) {
  const n = score(s);
  if (n >= 80) return { text: "TRÈS PROMETTEUR", color: success };
  if (n >= 20) return { text: "À INSPECTER", color: warn };
  return { text: "FAIBLE", color: danger };
}

function normalizeSummary(raw: any): Summary {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    bytes: Number(s.bytes || 0),
    keys: Number(s.keys || 0),
    profiles: Number(s.profiles || 0),
    matches: Number(s.matches || 0),
    historyRows: Number(s.historyRows || 0),
    statsBlocks: Number(s.statsBlocks || s.stats || 0),
    mediaRefs: Number(s.mediaRefs || 0),
    dataImages: Number(s.dataImages || 0),
    names: uniq(Array.isArray(s.names) ? s.names : []),
    sports: uniq(Array.isArray(s.sports) ? s.sports : []),
  };
}

function nasSlotToBlock(slot: NasSlot): Block {
  const id = String(slot.id || slot.slotId || "");
  return {
    id,
    label: slot.latest ? "Backup NAS courant" : `Slot NAS ${id.slice(-6) || "versionné"}`,
    source: "NAS PostgreSQL",
    path: slot.latest ? "/sync/pull" : `/sync/slots/${id}`,
    createdAt: String(slot.createdAt || slot.updatedAt || ""),
    summary: normalizeSummary(slot.summary),
    payload: slot,
    rawKind: "snapshot",
  };
}

function fmtBytes(n: number) {
  if (!n) return "0 o";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("fr-FR");
}

function looksLikeCloudSnapshot(payload: any) {
  return !!payload && typeof payload === "object" && (payload._v === 1 || payload._v === 2 || payload.idb || payload.history || payload.tournaments || payload.competitions);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<Block[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a: Block, b: Block) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))));
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(block: Block) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(block);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const all = await idbGetAll();
  for (const old of all.slice(MAX_SLOTS)) await idbDelete(old.id);
}

async function idbDelete(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function openExistingDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readStoreSample(db: IDBDatabase, storeName: string, limit = 200): Promise<{ keys: IDBValidKey[]; values: any[] }> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(String(storeName), "readonly");
      const store = tx.objectStore(String(storeName));
      const valuesReq = store.getAll(undefined, limit);
      const keysReq = store.getAllKeys ? store.getAllKeys(undefined, limit) : null;
      let valuesDone = false;
      let keysDone = !keysReq;
      let values: any[] = [];
      let keys: IDBValidKey[] = [];
      const finish = () => {
        if (valuesDone && keysDone) resolve({ keys, values });
      };
      valuesReq.onsuccess = () => { values = valuesReq.result || []; valuesDone = true; finish(); };
      valuesReq.onerror = () => { valuesDone = true; finish(); };
      if (keysReq) {
        keysReq.onsuccess = () => { keys = keysReq.result || []; keysDone = true; finish(); };
        keysReq.onerror = () => { keysDone = true; finish(); };
      }
      tx.onerror = () => resolve({ keys, values });
    } catch {
      resolve({ keys: [], values: [] });
    }
  });
}

async function scanAll(): Promise<Block[]> {
  const blocks: Block[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || "";
    const value = localStorage.getItem(key) || "";
    const summary = summarize(value);
    blocks.push({
      id: `ls:${key}`,
      label: key,
      source: "localStorage",
      path: `localStorage.${key}`,
      summary,
      payload: { key, value },
      rawKind: "localStorage",
      key,
    });
  }

  const idbAny: any = indexedDB as any;
  const dbs = typeof idbAny.databases === "function" ? await idbAny.databases() : [];
  for (const info of dbs) {
    if (!info?.name || String(info.name) === DB_NAME) continue;
    await new Promise<void>((resolve) => {
      const req = indexedDB.open(info.name);
      req.onerror = () => resolve();
      req.onsuccess = async () => {
        const db = req.result;
        const stores = Array.from(db.objectStoreNames);
        for (const storeName of stores) {
          const { keys, values } = await readStoreSample(db, String(storeName));
          const rows = values.map((value, index) => ({ key: keys[index], value }));
          const summary = summarize(values, values.length);
          blocks.push({
            id: `idb:${info.name}:${storeName}`,
            label: `${info.name} / ${storeName}`,
            source: "IndexedDB",
            path: `IndexedDB.${info.name}.${storeName}`,
            summary,
            payload: { dbName: info.name, storeName, rows },
            dbName: String(info.name),
            storeName: String(storeName),
            rawKind: "idbStore",
          });
        }
        db.close();
        resolve();
      };
    });
  }

  return blocks.sort((a, b) => score(b.summary) - score(a.summary));
}

async function makeSnapshot() {
  const snapshot = await exportCloudSnapshot();
  const summary = summarize(snapshot);
  return { ...(snapshot as any), summary };
}

async function restoreSnapshot(payload: any) {
  const actual = payload?.payload && looksLikeCloudSnapshot(payload.payload) ? payload.payload : payload;
  if (looksLikeCloudSnapshot(actual)) {
    await importCloudSnapshot(actual, { mode: "replace" });
    return;
  }
  const local = actual?.payload?.localStorage || actual?.localStorage || {};
  if (local && typeof local === "object") {
    for (const [k, v] of Object.entries(local)) localStorage.setItem(String(k), String(v));
  }
}

async function pushSnapshotToAccount(payload: any, reason = "storage-vault-restore") {
  const actual = payload?.payload && looksLikeCloudSnapshot(payload.payload) ? payload.payload : payload;
  const cloudPayload = looksLikeCloudSnapshot(actual) ? actual : await exportCloudSnapshot();
  await apiPost("/sync/push", { payload: cloudPayload, version: Number((cloudPayload as any)?._v || 2), reason });
  return cloudPayload;
}

async function restoreRawDetectedBlock(block: Block) {
  if (block.rawKind === "localStorage" && block.payload?.key != null) {
    localStorage.setItem(String(block.payload.key), String(block.payload.value ?? ""));
    return;
  }
  if (block.rawKind === "idbStore" && block.dbName && block.storeName && Array.isArray(block.payload?.rows)) {
    const db = await openExistingDb(block.dbName);
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(String(block.storeName), "readwrite");
        const store = tx.objectStore(String(block.storeName));
        const keyPath = store.keyPath;
        for (const row of block.payload.rows) {
          if (keyPath) store.put(row.value);
          else if (row.key != null) store.put(row.value, row.key);
          else store.put(row.value);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) { reject(e); }
    }).finally(() => db.close());
  }
}

function downloadJson(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(15,23,42,.96), rgba(2,6,23,.96))",
  border: "1px solid rgba(34,211,238,.32)",
  boxShadow: "0 0 24px rgba(34,211,238,.14)",
  borderRadius: 18,
  padding: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

const btn: React.CSSProperties = {
  border: `1px solid ${neon}`,
  color: neon,
  background: "rgba(34,211,238,.12)",
  borderRadius: 12,
  padding: "9px 11px",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "normal",
};

const dangerBtn: React.CSSProperties = { ...btn, borderColor: danger, color: danger, background: "rgba(251,113,133,.1)" };
const mutedText: React.CSSProperties = { overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 };

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0, 1fr)", gap: 10, color: "#cbd5e1", fontSize: 12, alignItems: "start", minWidth: 0 }}>
    <span style={{ opacity: .72, minWidth: 0 }}>{label}</span>
    <strong style={{ color: "#f8fafc", textAlign: "right", ...mutedText }}>{value}</strong>
  </div>;
}

function Card({ block, actions, note }: { block: Block; actions?: React.ReactNode; note?: React.ReactNode }) {
  const q = quality(block.summary);
  return <div style={panel}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start", minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#fff", fontWeight: 1000, ...mutedText }}>{block.label}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, ...mutedText }}>{block.source} • {block.path}</div>
      </div>
      <span style={{ color: q.color, border: `1px solid ${q.color}`, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 1000, lineHeight: "16px", whiteSpace: "nowrap" }}>{q.text}</span>
    </div>
    <div style={{ height: 1, background: "rgba(148,163,184,.18)", margin: "12px 0" }} />
    <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <Line label="Contenu" value={`${block.summary.matches} parties • ${block.summary.profiles} profils • ${block.summary.statsBlocks} stats • ${block.summary.mediaRefs} médias`} />
      <Line label="Taille" value={fmtBytes(block.summary.bytes)} />
      <Line label="Noms" value={block.summary.names.join(", ") || "—"} />
      <Line label="Sports" value={block.summary.sports.join(", ") || "—"} />
      {block.createdAt && <Line label="Créé" value={fmtDate(block.createdAt)} />}
    </div>
    {note && <div style={{ marginTop: 10, color: "#bae6fd", fontSize: 12, lineHeight: 1.35, ...mutedText }}>{note}</div>}
    {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, minWidth: 0 }}>{actions}</div>}
  </div>;
}

export default function StorageVaultPage({ go }: Props) {
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [slots, setSlots] = React.useState<Block[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [msg, setMsg] = React.useState("Scan en attente…");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [b, s, nas] = await Promise.all([
        scanAll(),
        idbGetAll(),
        apiGet("/sync/slots").catch((error: any) => ({ ok: false, slots: [], error: error?.message || String(error) })),
      ]);
      const remoteSlots = Array.isArray((nas as any)?.slots) ? (nas as any).slots : [];
      setBlocks(b);
      setSlots(s);
      setNasSlots(remoteSlots);
      const nasMessage = (nas as any)?.ok === false ? `NAS indisponible : ${(nas as any).error}` : `${remoteSlots.length} slot(s) NAS.`;
      setMsg(`Scan terminé : ${b.length} blocs détectés, ${s.length} blocs de sécurité locaux. ${nasMessage}`);
    } catch (e: any) {
      setMsg(`Erreur scan : ${e?.message || e}`);
    } finally { setBusy(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const createSlot = async () => {
    setBusy(true);
    try {
      const snap = await makeSnapshot();
      const block: Block = {
        id: `slot_${Date.now()}`,
        label: "Bloc local de sécurité",
        source: "Snapshot complet navigateur",
        path: `${DB_NAME}.${STORE}`,
        createdAt: String((snap as any).exportedAt || new Date().toISOString()),
        summary: normalizeSummary((snap as any).summary || summarize(snap)),
        payload: snap,
        rawKind: "snapshot",
      };
      await idbPut(block);
      await refresh();
      setMsg("Bloc de sécurité complet créé. Il est restaurable et compatible Stats/Profils/Historique.");
      return block;
    } finally { setBusy(false); }
  };

  const restoreSlot = async (slot: Block) => {
    if (!window.confirm(`Restaurer ce bloc complet dans ce navigateur ?\n\n${slot.label}\n${fmtDate(slot.createdAt)}\n\nUn bloc de sécurité sera créé avant restauration.`)) return;
    setBusy(true);
    try {
      await createSlot();
      await restoreSnapshot(slot.payload || slot);
      setMsg("Bloc restauré dans le navigateur. Rechargement…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setMsg(`Restauration locale impossible : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const createNasSlot = async () => {
    setBusy(true);
    try {
      const snap = await makeSnapshot();
      await apiPost("/sync/slots", { label: "Backup NAS versionné", payload: snap, version: Number((snap as any)?._v || 2) });
      const nas = await apiGet("/sync/slots").catch(() => null);
      setNasSlots(Array.isArray((nas as any)?.slots) ? (nas as any).slots : []);
      setMsg("Slot NAS créé. Le backup versionné complet est enregistré côté NAS.");
    } catch (e: any) {
      setMsg(`NAS non disponible ou backend non patché : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const pushCurrentBrowserToAccount = async () => {
    if (!window.confirm("Envoyer l’état complet actuel de ce navigateur sur ton compte NAS ?\n\nC’est cette étape qui rend les profils/historiques/stats récupérés lisibles après reconnexion.")) return;
    setBusy(true);
    try {
      const snap = await makeSnapshot();
      await pushSnapshotToAccount(snap, "manual-account-snapshot");
      setMsg("Sauvegarde complète envoyée sur ton compte utilisateur NAS.");
      await refresh();
    } catch (e: any) {
      setMsg(`Envoi compte impossible : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const restoreNasSlot = async (slot: NasSlot) => {
    const id = String(slot.id || slot.slotId || "");
    if (!id) return;
    if (!window.confirm(`Restaurer ce slot NAS dans CE navigateur ET sur ton compte utilisateur ?\n\n${slot.latest ? "Backup courant" : id}\n${fmtDate(slot.createdAt || slot.updatedAt)}\n\nUn bloc local sera créé avant restauration.`)) return;
    setBusy(true);
    try {
      await createSlot();
      const data = await apiGet(`/sync/slots/${encodeURIComponent(id)}`);
      const payload = (data as any)?.payload;
      if (!payload) throw new Error("Payload NAS absent");
      await restoreSnapshot(payload);
      await pushSnapshotToAccount(payload, `restore-nas:${id}`);
      await apiPost(`/sync/slots/${encodeURIComponent(id)}/restore`, {}).catch(() => null);
      setMsg("Slot NAS restauré dans le navigateur et renvoyé sur ton compte. Rechargement…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setMsg(`Restauration NAS impossible : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const restoreDetectedToAccount = async (block: Block) => {
    if (!window.confirm(`Restaurer / réécrire ce bloc brut puis envoyer une sauvegarde complète sur ton compte ?\n\n${block.label}\n\nÀ utiliser seulement si ce bloc contient bien les données à récupérer.`)) return;
    setBusy(true);
    try {
      await createSlot();
      await restoreRawDetectedBlock(block);
      const snap = await makeSnapshot();
      await pushSnapshotToAccount(snap, `restore-detected:${block.path}`);
      setMsg("Bloc brut appliqué, puis snapshot complet envoyé sur ton compte. Rechargement…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setMsg(`Restauration du bloc impossible : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  return <div style={{ minHeight: "100vh", padding: "18px 10px 96px", color: "#e2e8f0", background: "radial-gradient(circle at 30% 0%, rgba(34,211,238,.14), transparent 34%), #020617", overflowX: "hidden", boxSizing: "border-box" }}>
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", minWidth: 0, boxSizing: "border-box", overflowX: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: neon, fontSize: 12, fontWeight: 1000, letterSpacing: ".12em", textTransform: "uppercase" }}>Carte mémoire</div>
          <h1 style={{ color: "#fff", margin: "4px 0", fontSize: 25, ...mutedText }}>Coffre de sauvegardes</h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, ...mutedText }}>Inspecte localStorage, IndexedDB et prépare des sauvegardes restaurables sur ton compte.</p>
        </div>
        <button style={{ ...btn, color: "#e2e8f0", borderColor: "rgba(226,232,240,.5)", background: "rgba(15,23,42,.72)", flex: "0 0 auto" }} onClick={() => go ? go("settings") : history.back()}>Retour</button>
      </div>

      <div style={{ ...panel, marginBottom: 12 }}><strong style={{ color: busy ? warn : neon }}>{busy ? "Traitement" : "Info"}</strong><div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13, ...mutedText }}>{msg}</div></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14, minWidth: 0 }}>
        <button style={btn} disabled={busy} onClick={refresh}>Scanner</button>
        <button style={btn} disabled={busy} onClick={createSlot}>Créer bloc sécurité</button>
        <button style={btn} disabled={busy} onClick={createNasSlot}>Créer slot NAS</button>
        <button style={btn} disabled={busy} onClick={pushCurrentBrowserToAccount}>Envoyer au compte</button>
      </div>

      <div style={{ ...panel, borderColor: "rgba(251,191,36,.45)", marginBottom: 14 }}>
        <strong style={{ color: warn }}>Comment restaurer dans ton compte utilisateur</strong>
        <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...mutedText }}>
          Le bon flux est : <b>Créer bloc sécurité</b> pour figer ce que voit le navigateur, puis <b>Envoyer au compte</b> pour l’enregistrer dans le NAS du compte connecté. Pour une vraie sauvegarde NAS, utilise directement <b>Restaurer NAS</b>. Les cartes “blocs locaux détectés” sont des zones brutes : le bouton <b>Restaurer ce bloc vers compte</b> les réécrit puis pousse un snapshot complet sur le compte.
        </div>
      </div>

      <h2 style={{ color: "#fff", fontSize: 18 }}>Slots NAS / backups versionnés</h2>
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        {nasSlots.length ? nasSlots.map((slot) => {
          const block = nasSlotToBlock(slot);
          return <Card key={`nas-${block.id}`} block={block} note="Sauvegarde NAS complète : le bouton restaure dans le navigateur puis renvoie le snapshot actif sur ton compte." actions={<>
            <button style={btn} disabled={busy} onClick={() => restoreNasSlot(slot)}>Restaurer NAS</button>
            <button style={btn} onClick={async () => {
              try {
                const data = await apiGet(`/sync/slots/${encodeURIComponent(block.id)}`);
                downloadJson(`${block.id || "slot-nas"}.json`, data);
              } catch (e: any) {
                setMsg(`Export NAS impossible : ${e?.message || e}`);
              }
            }}>Exporter NAS</button>
          </>} />;
        }) : <div style={panel}>Aucun slot NAS affiché. Clique sur “Créer slot NAS”, puis “Scanner”. Si rien n’apparaît, vérifie que tu es connecté et que le backend répond à /sync/slots.</div>}
      </div>

      <h2 style={{ color: "#fff", fontSize: 18, marginTop: 22 }}>Blocs de sécurité locaux</h2>
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        {slots.length ? slots.map((s) => <Card key={s.id} block={s} note="Sauvegarde complète restaurable. Après restauration navigateur, utilise Envoyer au compte pour la rattacher au compte utilisateur." actions={<>
          <button style={btn} disabled={busy} onClick={() => restoreSlot(s)}>Restaurer navigateur</button>
          <button style={btn} disabled={busy} onClick={async () => { await pushSnapshotToAccount(s.payload, `push-local-slot:${s.id}`); setMsg("Bloc local envoyé sur ton compte NAS."); }}>Envoyer au compte</button>
          <button style={btn} onClick={() => downloadJson(`${s.id}.json`, s)}>Exporter</button>
          <button style={dangerBtn} onClick={async () => { await idbDelete(s.id); await refresh(); }}>Supprimer</button>
        </>} />) : <div style={panel}>Aucun bloc de sécurité local. Clique sur “Créer bloc sécurité” avant toute restauration risquée.</div>}
      </div>

      <h2 style={{ color: "#fff", fontSize: 18, marginTop: 22 }}>Blocs locaux détectés</h2>
      <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, ...mutedText }}>Inspection brute des zones de stockage. Ces cartes sont maintenant contraintes à l’écran et ne doivent plus dépasser.</div>
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        {blocks.map((b) => <Card key={b.id} block={b} note="Bloc brut détecté : ce n’est pas toujours une sauvegarde complète. Le bouton ci-dessous le réécrit à son emplacement puis pousse un snapshot complet sur ton compte." actions={<>
          <button style={btn} disabled={busy} onClick={() => restoreDetectedToAccount(b)}>Restaurer ce bloc vers compte</button>
          <button style={btn} onClick={() => downloadJson(`${b.id.replace(/[^a-z0-9_-]/gi, "_")}.json`, b)}>Exporter bloc</button>
        </>} />)}
      </div>
    </div>
  </div>;
}
