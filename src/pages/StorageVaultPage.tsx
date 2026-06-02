import * as React from "react";
import { apiGet, apiPost } from "../lib/apiClient";

// Page autonome volontairement : aucun import projet fragile.
// Objectif : permettre d'inspecter localStorage / IndexedDB / NAS même en situation de récupération.

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
type Block = {
  id: string;
  label: string;
  source: string;
  path: string;
  createdAt?: string;
  summary: Summary;
  payload?: any;
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
  return new Blob([toText(value)]).size;
}

function uniq(values: string[], max = 12) {
  return Array.from(new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))).slice(0, max);
}

function walk(value: any, acc: any = { profiles: 0, matches: 0, historyRows: 0, statsBlocks: 0, mediaRefs: 0, dataImages: 0, names: [], sports: [] }, depth = 0) {
  if (depth > 8 || value == null) return acc;
  if (typeof value === "string") {
    const s = value;
    if (/data:image\//i.test(s)) acc.dataImages += 1;
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
  if (joined.includes("profile") || obj.displayName || obj.nickname || obj.avatarUrl) acc.profiles += 1;
  if (joined.includes("match") || obj.sport || obj.result || obj.players) acc.matches += 1;
  if (joined.includes("history") || obj.createdAt || obj.created_at) acc.historyRows += 1;
  if (joined.includes("stats") || obj.avg3 || obj.bestVisit) acc.statsBlocks += 1;
  if (obj.avatarUrl || obj.avatar || obj.mediaId || obj.assetId || obj.avatarAssetId) acc.mediaRefs += 1;
  const name = obj.name || obj.displayName || obj.nickname || obj.local_profile_name || obj.playerName;
  if (typeof name === "string" && name.length <= 60) acc.names.push(name);
  const sport = obj.sport || obj.mode || obj.game;
  if (typeof sport === "string" && sport.length <= 30) acc.sports.push(sport.toLowerCase());
  for (const k of keys.slice(0, 100)) walk(obj[k], acc, depth + 1);
  return acc;
}

function summarize(value: any, keyCount = 1): Summary {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch {}
  }
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

async function scanAll(): Promise<Block[]> {
  const blocks: Block[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || "";
    const value = localStorage.getItem(key) || "";
    const summary = summarize(value);
    blocks.push({ id: `ls:${key}`, label: key, source: "localStorage", path: `localStorage.${key}`, summary });
  }
  const idbAny: any = indexedDB as any;
  if (typeof idbAny.databases === "function") {
    const dbs = await idbAny.databases();
    for (const info of dbs) {
      if (!info?.name) continue;
      await new Promise<void>((resolve) => {
        const req = indexedDB.open(info.name);
        req.onerror = () => resolve();
        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          let pending = stores.length;
          if (!pending) { db.close(); resolve(); return; }
          stores.forEach((storeName) => {
            try {
              const tx = db.transaction(String(storeName), "readonly");
              const store = tx.objectStore(String(storeName));
              const getAll = store.getAll ? store.getAll(undefined, 200) : null;
              if (!getAll) throw new Error("getAll indisponible");
              getAll.onsuccess = () => {
                const rows = getAll.result || [];
                const summary = summarize(rows, rows.length);
                blocks.push({ id: `idb:${info.name}:${storeName}`, label: `${info.name} / ${storeName}`, source: "IndexedDB", path: `IndexedDB.${info.name}.${storeName}`, summary });
              };
              tx.oncomplete = () => { if (--pending === 0) { db.close(); resolve(); } };
              tx.onerror = () => { if (--pending === 0) { db.close(); resolve(); } };
            } catch {
              if (--pending === 0) { db.close(); resolve(); }
            }
          });
        };
      });
    }
  }
  return blocks.sort((a, b) => score(b.summary) - score(a.summary));
}

async function makeSnapshot() {
  const local: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || "";
    local[key] = localStorage.getItem(key) || "";
  }
  const blocks = await scanAll();
  const summary = summarize({ localStorage: local, blocks }, Object.keys(local).length + blocks.length);
  return { exportedAt: new Date().toISOString(), origin: location.origin, localStorage: local, blocks, summary };
}

async function restoreSnapshot(payload: any) {
  const local = payload?.payload?.localStorage || payload?.localStorage || {};
  if (local && typeof local === "object") {
    for (const [k, v] of Object.entries(local)) localStorage.setItem(String(k), String(v));
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

const panel: React.CSSProperties = { background: "linear-gradient(180deg, rgba(15,23,42,.96), rgba(2,6,23,.96))", border: "1px solid rgba(34,211,238,.32)", boxShadow: "0 0 24px rgba(34,211,238,.14)", borderRadius: 18, padding: 14 };
const btn: React.CSSProperties = { border: `1px solid ${neon}`, color: neon, background: "rgba(34,211,238,.12)", borderRadius: 12, padding: "9px 11px", fontWeight: 900, fontSize: 12, cursor: "pointer" };

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#cbd5e1", fontSize: 12 }}><span style={{ opacity: .72 }}>{label}</span><strong style={{ color: "#f8fafc", textAlign: "right" }}>{value}</strong></div>;
}

function Card({ block, actions }: { block: Block; actions?: React.ReactNode }) {
  const q = quality(block.summary);
  return <div style={panel}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div><div style={{ color: "#fff", fontWeight: 1000 }}>{block.label}</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{block.source} • {block.path}</div></div>
      <span style={{ color: q.color, border: `1px solid ${q.color}`, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 1000, height: 18 }}>{q.text}</span>
    </div>
    <div style={{ height: 1, background: "rgba(148,163,184,.18)", margin: "12px 0" }} />
    <div style={{ display: "grid", gap: 7 }}>
      <Line label="Contenu" value={`${block.summary.matches} parties • ${block.summary.profiles} profils • ${block.summary.statsBlocks} stats • ${block.summary.mediaRefs} médias`} />
      <Line label="Taille" value={fmtBytes(block.summary.bytes)} />
      <Line label="Noms" value={block.summary.names.join(", ") || "—"} />
      <Line label="Sports" value={block.summary.sports.join(", ") || "—"} />
      {block.createdAt && <Line label="Créé" value={fmtDate(block.createdAt)} />}
    </div>
    {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{actions}</div>}
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
      const nasMessage = (nas as any)?.ok === false ? ` NAS indisponible : ${(nas as any).error}` : `${remoteSlots.length} slot(s) NAS.`;
      setMsg(`Scan terminé : ${b.length} blocs détectés, ${s.length} blocs de sécurité locaux. ${nasMessage}`);
    } catch (e: any) {
      setMsg(`Erreur scan : ${e?.message || e}`);
    } finally { setBusy(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const createSlot = async () => {
    setBusy(true);
    const snap = await makeSnapshot();
    const block: Block = { id: `slot_${Date.now()}`, label: "Bloc local de sécurité", source: "IndexedDB sécurité", path: `${DB_NAME}.${STORE}`, createdAt: snap.exportedAt, summary: snap.summary, payload: snap };
    await idbPut(block);
    await refresh();
    setMsg("Bloc local créé. Les 10 derniers sont conservés.");
    setBusy(false);
  };

  const restoreSlot = async (slot: Block) => {
    if (!window.confirm(`Restaurer ce bloc ?\n\n${slot.label}\n${fmtDate(slot.createdAt)}\n\nUn bloc de sécurité sera créé avant restauration.`)) return;
    await createSlot();
    await restoreSnapshot(slot);
    setMsg("Bloc restauré. Rechargement…");
    setTimeout(() => window.location.reload(), 600);
  };

  const createNasSlot = async () => {
    setBusy(true);
    try {
      const snap = await makeSnapshot();
      await apiPost("/sync/slots", { label: "Backup NAS versionné", payload: snap });
      const nas = await apiGet("/sync/slots").catch(() => null);
      setNasSlots(Array.isArray((nas as any)?.slots) ? (nas as any).slots : []);
      setMsg("Slot NAS créé. Le backup versionné est enregistré côté NAS.");
    } catch (e: any) {
      setMsg(`NAS non disponible ou backend non patché : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const restoreNasSlot = async (slot: NasSlot) => {
    const id = String(slot.id || slot.slotId || "");
    if (!id) return;
    if (!window.confirm(`Restaurer ce slot NAS ?\n\n${slot.latest ? "Backup courant" : id}\n${fmtDate(slot.createdAt || slot.updatedAt)}\n\nUn bloc local sera créé avant restauration.`)) return;
    setBusy(true);
    try {
      await createSlot();
      const data = await apiGet(`/sync/slots/${encodeURIComponent(id)}`);
      const payload = (data as any)?.payload;
      if (!payload) throw new Error("Payload NAS absent");
      await restoreSnapshot(payload);
      await apiPost(`/sync/slots/${encodeURIComponent(id)}/restore`, {}).catch(() => null);
      setMsg("Slot NAS restauré. Rechargement…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      setMsg(`Restauration NAS impossible : ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  return <div style={{ minHeight: "100vh", padding: "18px 14px 96px", color: "#e2e8f0", background: "radial-gradient(circle at 30% 0%, rgba(34,211,238,.14), transparent 34%), #020617" }}>
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <div><div style={{ color: neon, fontSize: 12, fontWeight: 1000, letterSpacing: ".12em", textTransform: "uppercase" }}>Carte mémoire</div><h1 style={{ color: "#fff", margin: "4px 0", fontSize: 25 }}>Coffre de sauvegardes</h1><p style={{ color: "#94a3b8", margin: 0, fontSize: 13 }}>Inspecte localStorage, IndexedDB et prépare des blocs de restauration comme une carte mémoire.</p></div>
        <button style={{ ...btn, color: "#e2e8f0", borderColor: "rgba(226,232,240,.5)", background: "rgba(15,23,42,.72)" }} onClick={() => go ? go("settings") : history.back()}>Retour</button>
      </div>
      <div style={{ ...panel, marginBottom: 12 }}><strong style={{ color: busy ? warn : neon }}>{busy ? "Traitement" : "Info"}</strong><div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13 }}>{msg}</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <button style={btn} disabled={busy} onClick={refresh}>Scanner</button>
        <button style={btn} disabled={busy} onClick={createSlot}>Créer bloc local</button>
        <button style={btn} disabled={busy} onClick={createNasSlot}>Créer slot NAS</button>
      </div>
      <h2 style={{ color: "#fff", fontSize: 18 }}>Blocs locaux détectés</h2>
      <div style={{ display: "grid", gap: 10 }}>{blocks.map((b) => <Card key={b.id} block={b} />)}</div>
      <h2 style={{ color: "#fff", fontSize: 18, marginTop: 22 }}>Slots NAS / backups versionnés</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {nasSlots.length ? nasSlots.map((slot) => {
          const block = nasSlotToBlock(slot);
          return <Card key={`nas-${block.id}`} block={block} actions={<>
            <button style={btn} onClick={() => restoreNasSlot(slot)}>Restaurer NAS</button>
            <button style={btn} onClick={async () => {
              try {
                const data = await apiGet(`/sync/slots/${encodeURIComponent(block.id)}`);
                downloadJson(`${block.id || "slot-nas"}.json`, data);
              } catch (e: any) {
                setMsg(`Export NAS impossible : ${e?.message || e}`);
              }
            }}>Exporter NAS</button>
          </>} />;
        }) : <div style={panel}>Aucun slot NAS affiché. Clique sur “Créer slot NAS”, puis “Scanner”.</div>}
      </div>

      <h2 style={{ color: "#fff", fontSize: 18, marginTop: 22 }}>Blocs de sécurité locaux</h2>
      <div style={{ display: "grid", gap: 10 }}>{slots.length ? slots.map((s) => <Card key={s.id} block={s} actions={<><button style={btn} onClick={() => restoreSlot(s)}>Restaurer</button><button style={btn} onClick={() => downloadJson(`${s.id}.json`, s)}>Exporter</button><button style={{ ...btn, borderColor: danger, color: danger, background: "rgba(251,113,133,.1)" }} onClick={async () => { await idbDelete(s.id); await refresh(); }}>Supprimer</button></>} />) : <div style={panel}>Aucun bloc de sécurité local. Crée un bloc avant toute restauration.</div>}</div>
    </div>
  </div>;
}
