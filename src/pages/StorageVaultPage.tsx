import * as React from "react";
import { apiPost } from "../lib/apiClient";
import { exportCloudSnapshot, importCloudSnapshot } from "../lib/storage";
import {
  createLocalMemorySlot,
  createNasVersionedSnapshot,
  deleteLocalMemorySlot,
  deleteNasMemorySlot,
  exportJsonDownload,
  listLocalMemorySlots,
  listNasMemorySlots,
  pullNasMemorySlot,
  scanLocalStorageAndIndexedDb,
  summarizeVaultPayload,
  type MemorySlot,
  type NasSlot,
  type StorageBlock,
  type VaultSummary,
} from "../lib/storageVault";
import {
  markStatsIndexDirty,
  refreshStatsIndexFromHistoryNow,
} from "../lib/stats/rebuildStatsFromHistory";

type Props = { go?: (tab: any, params?: any) => void };
type TabKey = "backup" | "restore" | "valid" | "diagnostic";

const neon = "#22d3ee";
const gold = "#d9ff33";
const pink = "#f472b6";
const red = "#fb7185";
const green = "#34d399";
const amber = "#fbbf24";

const AUTH_KEYS = [
  "dc_nas_access_token_v1",
  "dc_nas_refresh_token_v1",
  "dc_online_auth_supabase_v1",
  "dc_api_url",
  "dc_api_timeout_ms",
];

function rememberAuthKeys() {
  const saved: Record<string, string> = {};
  try {
    for (const key of AUTH_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value != null) saved[key] = value;
    }
  } catch {}
  return () => {
    try {
      for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
    } catch {}
  };
}

function looksLikeCloudSnapshot(value: any): boolean {
  return !!value && typeof value === "object" && (
    value._v === 1 ||
    value._v === 2 ||
    value.idb ||
    value.localStorage ||
    value.history ||
    value.store ||
    value.data ||
    value.tournaments ||
    value.competitions
  );
}

function unwrapSnapshotEnvelope(input: any): any {
  if (input?.payload && looksLikeCloudSnapshot(input.payload)) return input.payload;
  if (input?.data?.payload && looksLikeCloudSnapshot(input.data.payload)) return input.data.payload;
  if (input?.snapshot && looksLikeCloudSnapshot(input.snapshot)) return input.snapshot;
  return input;
}

function n(value: any): number {
  const out = Number(value || 0);
  return Number.isFinite(out) ? out : 0;
}

function normalizeSummary(raw: Partial<VaultSummary> | undefined | null): VaultSummary {
  const s: any = raw || {};
  return {
    bytes: n(s.bytes),
    keys: n(s.keys),
    profiles: n(s.profiles),
    matches: n(s.matches),
    historyRows: n(s.historyRows),
    statsBlocks: n(s.statsBlocks || s.stats),
    mediaRefs: n(s.mediaRefs),
    dataImages: n(s.dataImages),
    sports: Array.isArray(s.sports) ? s.sports.map(String).slice(0, 12) : [],
    names: Array.isArray(s.names) ? s.names.map(String).slice(0, 16) : [],
    exportedAt: s.exportedAt || null,
    probableContent: Array.isArray(s.probableContent) ? s.probableContent.map(String) : [],
  };
}

function hasUsefulGameData(summary?: Partial<VaultSummary> | null): boolean {
  const s = normalizeSummary(summary || {});
  const probable = s.probableContent.map((x) => x.toLowerCase()).join(" ");
  return s.historyRows > 0 || s.matches > 0 || probable.includes("parties") || probable.includes("historique");
}

function isStatsOnly(summary?: Partial<VaultSummary> | null): boolean {
  const s = normalizeSummary(summary || {});
  return !hasUsefulGameData(s) && s.statsBlocks > 0;
}

function quality(summary?: Partial<VaultSummary> | null) {
  const s = normalizeSummary(summary || {});
  if (s.historyRows > 0 || s.matches > 0) return { label: "PARTIES VALIDES", color: green };
  if (s.statsBlocks > 0) return { label: "STATS SEULES", color: amber };
  if (s.profiles > 0) return { label: "PROFILS", color: neon };
  return { label: "TECHNIQUE", color: "#94a3b8" };
}

function fmtBytes(bytes?: number | null) {
  const b = n(bytes);
  if (!b) return "—";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function join(values?: string[], fallback = "—") {
  const list = Array.isArray(values) ? values.filter(Boolean).slice(0, 10) : [];
  return list.length ? list.join(", ") : fallback;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "18px 10px 96px",
  color: "#e5e7eb",
  background: "radial-gradient(circle at 20% 0%, rgba(217,255,51,.14), transparent 34%), radial-gradient(circle at 85% 12%, rgba(34,211,238,.10), transparent 32%), #020617",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(15,23,42,.94), rgba(2,6,23,.96))",
  border: "1px solid rgba(217,255,51,.20)",
  borderRadius: 20,
  boxShadow: "0 0 28px rgba(217,255,51,.08)",
  padding: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

const wrapText: React.CSSProperties = {
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const btn: React.CSSProperties = {
  border: `1px solid ${neon}`,
  color: neon,
  background: "rgba(34,211,238,.10)",
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 1000,
  fontSize: 12,
  cursor: "pointer",
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "normal",
};

const primaryBtn: React.CSSProperties = {
  ...btn,
  borderColor: gold,
  color: "#08111f",
  background: `linear-gradient(180deg, ${gold}, #b8ef19)`,
  boxShadow: "0 0 18px rgba(217,255,51,.24)",
};

const dangerBtn: React.CSSProperties = {
  ...btn,
  borderColor: red,
  color: red,
  background: "rgba(251,113,133,.10)",
};

function StatBox({ label, value, color = gold }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ ...panel, borderRadius: 16, padding: 12, minHeight: 70 }}>
      <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 25, lineHeight: 1.1, fontWeight: 1000, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr)", gap: 10, alignItems: "start", minWidth: 0 }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>{label}</span>
      <strong style={{ color: "#f8fafc", fontSize: 12, textAlign: "right", ...wrapText }}>{value}</strong>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      style={{
        ...btn,
        borderColor: active ? gold : "rgba(148,163,184,.24)",
        color: active ? gold : "#d1d5db",
        background: active ? "rgba(217,255,51,.13)" : "rgba(15,23,42,.62)",
        boxShadow: active ? "0 0 18px rgba(217,255,51,.22)" : "none",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Badge({ summary }: { summary: Partial<VaultSummary> }) {
  const q = quality(summary);
  return (
    <span style={{ border: `1px solid ${q.color}`, color: q.color, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap" }}>
      {q.label}
    </span>
  );
}

function SummaryLines({ summary }: { summary: Partial<VaultSummary> }) {
  const s = normalizeSummary(summary);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <Line label="Contenu" value={`${s.matches} parties • ${s.profiles} profils • ${s.statsBlocks} stats • ${s.mediaRefs + s.dataImages} médias`} />
      <Line label="Historique" value={`${s.historyRows} lignes`} />
      <Line label="Taille" value={fmtBytes(s.bytes)} />
      <Line label="Sports" value={join(s.sports)} />
      <Line label="Noms" value={join(s.names)} />
    </div>
  );
}

function NasCard({ slot, busy, onRestore, onExport, onDelete }: {
  slot: NasSlot;
  busy: boolean;
  onRestore: () => void;
  onExport: () => void;
  onDelete?: () => void;
}) {
  const summary = normalizeSummary(slot.summary || {});
  const id = String(slot.id || "latest");
  return (
    <div style={panel}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start", minWidth: 0 }}>
        <div style={wrapText}>
          <div style={{ color: "#fff", fontWeight: 1000, fontSize: 16 }}>{slot.latest ? "Backup NAS courant" : `Slot NAS ${id.slice(-6)}`}</div>
          <div style={{ color: "#93c5fd", fontSize: 11, marginTop: 3, ...wrapText }}>{slot.latest ? "/sync/pull" : `/sync/slots/${id}`}</div>
        </div>
        <Badge summary={summary} />
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.15)", margin: "12px 0" }} />
      <SummaryLines summary={summary} />
      <Line label="Créé" value={fmtDate(slot.createdAt || slot.updatedAt || null)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={primaryBtn} disabled={busy} onClick={onRestore}>Restaurer navigateur + compte</button>
        <button style={btn} disabled={busy} onClick={onExport}>Exporter JSON</button>
        {!slot.latest && onDelete && <button style={dangerBtn} disabled={busy} onClick={onDelete}>Supprimer slot</button>}
      </div>
    </div>
  );
}

function LocalSlotCard({ slot, busy, onRestore, onPush, onExport, onDelete }: {
  slot: MemorySlot;
  busy: boolean;
  onRestore: () => void;
  onPush: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const summary = normalizeSummary(slot.summary || summarizeVaultPayload(slot.payload));
  return (
    <div style={panel}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start", minWidth: 0 }}>
        <div style={wrapText}>
          <div style={{ color: "#fff", fontWeight: 1000, fontSize: 16 }}>{slot.label || "Bloc local"}</div>
          <div style={{ color: "#93c5fd", fontSize: 11, marginTop: 3, ...wrapText }}>{slot.id}</div>
        </div>
        <Badge summary={summary} />
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.15)", margin: "12px 0" }} />
      <SummaryLines summary={summary} />
      <Line label="Créé" value={fmtDate(slot.createdAt)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={primaryBtn} disabled={busy} onClick={onRestore}>Restaurer navigateur + compte</button>
        <button style={btn} disabled={busy} onClick={onPush}>Envoyer au compte</button>
        <button style={btn} disabled={busy} onClick={onExport}>Exporter</button>
        <button style={dangerBtn} disabled={busy} onClick={onDelete}>Supprimer</button>
      </div>
    </div>
  );
}

function BlockCard({ block, busy, onRestore, onExport }: {
  block: StorageBlock;
  busy: boolean;
  onRestore?: () => void;
  onExport: () => void;
}) {
  const summary = normalizeSummary(block.summary);
  return (
    <div style={panel}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start", minWidth: 0 }}>
        <div style={wrapText}>
          <div style={{ color: "#fff", fontWeight: 1000, fontSize: 16, ...wrapText }}>{block.title}</div>
          <div style={{ color: "#93c5fd", fontSize: 11, marginTop: 3, ...wrapText }}>{block.subtitle || block.location}</div>
        </div>
        <Badge summary={summary} />
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.15)", margin: "12px 0" }} />
      <SummaryLines summary={summary} />
      <Line label="Empl." value={block.location} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {onRestore && <button style={primaryBtn} disabled={busy} onClick={onRestore}>Restaurer ce bloc vers compte</button>}
        <button style={btn} disabled={busy} onClick={onExport}>Exporter bloc</button>
      </div>
    </div>
  );
}

async function pushSnapshotToAccount(payload: any, reason: string) {
  const snapshot = unwrapSnapshotEnvelope(payload);
  const version = Number(snapshot?._v || snapshot?.v || 2) || 2;
  return apiPost("/sync/push", { payload: snapshot, version, reason });
}

async function openExistingDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function applyRawBlockToBrowser(block: StorageBlock) {
  if (block.source === "localStorage") {
    const payload: any = block.payload || {};
    if (payload.key != null) {
      localStorage.setItem(String(payload.key), typeof payload.value === "string" ? payload.value : JSON.stringify(payload.value));
      return;
    }
    if (payload.all && typeof payload.all === "object") {
      for (const [key, value] of Object.entries(payload.all)) {
        localStorage.setItem(String(key), typeof value === "string" ? value : JSON.stringify(value));
      }
      return;
    }
  }

  if (block.source === "indexedDB" && block.dbName && block.storeName && Array.isArray((block.payload as any)?.rows)) {
    const db = await openExistingDb(block.dbName);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(String(block.storeName), "readwrite");
        const store = tx.objectStore(String(block.storeName));
        const keyPath = store.keyPath;
        for (const row of (block.payload as any).rows) {
          if (keyPath) store.put(row.value);
          else if (row.key != null) store.put(row.value, row.key);
          else store.put(row.value);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      try { db.close(); } catch {}
    }
    return;
  }

  throw new Error("Ce bloc est seulement diagnostique : il ne contient pas de payload restaurable direct.");
}

export default function StorageVaultPage({ go }: Props) {
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [showTechnical, setShowTechnical] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const validNasSlots = React.useMemo(() => nasSlots.filter((slot) => hasUsefulGameData(slot.summary)), [nasSlots]);
  const statsOnlyNasSlots = React.useMemo(() => nasSlots.filter((slot) => isStatsOnly(slot.summary)), [nasSlots]);
  const validBlocks = React.useMemo(() => blocks.filter((block) => hasUsefulGameData(block.summary)), [blocks]);
  const technicalBlocks = React.useMemo(() => blocks.filter((block) => !hasUsefulGameData(block.summary)), [blocks]);
  const visibleNasSlots = showTechnical ? nasSlots : validNasSlots;
  const visibleBlocks = showTechnical ? blocks : validBlocks;
  const allValidCount = validNasSlots.length + validBlocks.length + localSlots.filter((slot) => hasUsefulGameData(slot.summary)).length;

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [ls, ns, bs] = await Promise.all([
        listLocalMemorySlots().catch(() => []),
        listNasMemorySlots().catch(() => []),
        scanLocalStorageAndIndexedDb().catch(() => []),
      ]);
      setLocalSlots(ls);
      setNasSlots(ns);
      setBlocks(bs);
      const valid = ns.filter((slot) => hasUsefulGameData(slot.summary)).length + bs.filter((block) => hasUsefulGameData(block.summary)).length + ls.filter((slot) => hasUsefulGameData(slot.summary)).length;
      setMessage(`Scan terminé : ${valid} bloc(s) avec données de parties exploitables. Les blocs purement techniques sont masqués par défaut.`);
    } catch (error: any) {
      setMessage(`Erreur scan : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const afterRestoreHousekeeping = async (reason: string) => {
    try { markStatsIndexDirty(reason); } catch {}
    try { await refreshStatsIndexFromHistoryNow({ includeNonFinished: true, persist: true, reason }); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason } })); } catch {}
  };

  const restoreSnapshotIntoBrowserAndAccount = async (payload: any, reason: string, label: string) => {
    const snapshot = unwrapSnapshotEnvelope(payload);
    if (!looksLikeCloudSnapshot(snapshot)) throw new Error("Snapshot restaurable introuvable dans ce bloc.");
    const summary = summarizeVaultPayload(snapshot);
    const ok = window.confirm(
      `Restaurer ${label} ?\n\n` +
      `${summary.matches} parties • ${summary.historyRows} lignes historique • ${summary.profiles} profils • ${fmtBytes(summary.bytes)}\n\n` +
      `Étapes : bloc local de sécurité → restauration navigateur → envoi au compte NAS.`
    );
    if (!ok) return;
    const restoreAuth = rememberAuthKeys();
    await createLocalMemorySlot("Sécurité avant restauration", "before-restore").catch(() => null);
    await importCloudSnapshot(snapshot, { mode: "replace" });
    restoreAuth();
    await afterRestoreHousekeeping(reason);
    await pushSnapshotToAccount(snapshot, reason);
    setMessage(`Restauration terminée : ${summary.matches} partie(s) restaurée(s), puis renvoyée(s) sur ton compte. Rechargement…`);
    window.setTimeout(() => window.location.reload(), 900);
  };

  const createLocalSlot = async () => {
    setBusy(true);
    try {
      const slot = await createLocalMemorySlot("Bloc local de sécurité", "manual");
      setMessage(`Bloc local créé : ${slot.summary.matches} parties • ${slot.summary.profiles} profils.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Création bloc local impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const pushCurrentToAccount = async () => {
    const ok = window.confirm("Envoyer l’état complet actuel de ce navigateur sur ton compte NAS ?");
    if (!ok) return;
    setBusy(true);
    try {
      const snapshot = await exportCloudSnapshot();
      await pushSnapshotToAccount(snapshot, "manual-save-page-push");
      const summary = summarizeVaultPayload(snapshot);
      setMessage(`Compte NAS mis à jour : ${summary.matches} parties • ${summary.profiles} profils.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Envoi au compte impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const createNasBackup = async () => {
    const ok = window.confirm("Créer une sauvegarde NAS complète maintenant ?\n\nElle remplace le backup courant et ajoute un slot versionné côté NAS.");
    if (!ok) return;
    setBusy(true);
    try {
      const res: any = await createNasVersionedSnapshot();
      setMessage(`Sauvegarde NAS créée. ${res?.summary?.matches || res?.summary?.after?.historyCount || ""} partie(s) détectée(s).`);
      await refresh();
    } catch (error: any) {
      setMessage(`Sauvegarde NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreNas = async (slot: NasSlot) => {
    setBusy(true);
    try {
      const id = String(slot.id || "latest");
      const pulled = await pullNasMemorySlot(id);
      await restoreSnapshotIntoBrowserAndAccount(pulled.payload, `restore-nas:${id}`, slot.latest ? "le backup NAS courant" : `le slot NAS ${id.slice(-6)}`);
    } catch (error: any) {
      setMessage(`Restauration NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreLocal = async (slot: MemorySlot) => {
    setBusy(true);
    try {
      await restoreSnapshotIntoBrowserAndAccount(slot.payload, `restore-local:${slot.id}`, slot.label || slot.id);
    } catch (error: any) {
      setMessage(`Restauration locale impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreRawBlock = async (block: StorageBlock) => {
    const ok = window.confirm(
      `Restaurer ce bloc brut vers ton compte ?\n\n${block.title}\n${block.location}\n\n` +
      `À utiliser seulement pour un bloc qui contient de vraies parties/historique.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await createLocalMemorySlot("Sécurité avant bloc brut", "before-restore").catch(() => null);
      await applyRawBlockToBrowser(block);
      const snapshot = await exportCloudSnapshot();
      await afterRestoreHousekeeping(`restore-raw-block:${block.location}`);
      await pushSnapshotToAccount(snapshot, `restore-raw-block:${block.location}`);
      setMessage("Bloc brut réappliqué, puis snapshot complet envoyé sur le compte. Rechargement…");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error: any) {
      setMessage(`Restauration bloc brut impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const importJsonFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const snapshot = unwrapSnapshotEnvelope(parsed);
      await restoreSnapshotIntoBrowserAndAccount(snapshot, `restore-json:${file.name || "snapshot"}`, file.name || "fichier JSON");
    } catch (error: any) {
      setMessage(`Import JSON impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ ...panel, borderColor: "rgba(217,255,51,.36)", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", gap: 10, alignItems: "center", minWidth: 0 }}>
            <button
              style={{ ...btn, width: 42, height: 42, borderRadius: 999, padding: 0, borderColor: gold, color: gold, boxShadow: "0 0 16px rgba(217,255,51,.22)" }}
              onClick={() => { try { if (window.history.length > 1) window.history.back(); else go?.("settings"); } catch { go?.("settings"); } }}
              aria-label="Retour"
            >
              ←
            </button>
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ color: gold, fontWeight: 1000, fontSize: 25, lineHeight: 1.05, letterSpacing: ".04em", textShadow: "0 0 18px rgba(217,255,51,.8)", ...wrapText }}>SAUVEGARDE</div>
              <div style={{ color: "#cbd5e1", fontSize: 11, marginTop: 4, ...wrapText }}>Backup NAS • Synchronisation compte</div>
              <div style={{ color: "#94a3b8", fontSize: 11, ...wrapText }}>Restauration historique / stats / profils</div>
            </div>
            <button
              style={{ ...btn, width: 42, height: 42, borderRadius: 999, padding: 0, borderColor: neon, color: neon, boxShadow: "0 0 16px rgba(34,211,238,.22)" }}
              disabled={busy}
              onClick={refresh}
              aria-label="Actualiser"
            >
              ↻
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
            <StatBox label="Valides" value={allValidCount} color={green} />
            <StatBox label="NAS" value={validNasSlots.length} color={neon} />
            <StatBox label="Stats seules" value={statsOnlyNasSlots.length} color={amber} />
          </div>
        </div>

        <div style={{ ...panel, borderColor: busy ? `rgba(251,191,36,.45)` : "rgba(34,211,238,.28)", marginBottom: 12 }}>
          <strong style={{ color: busy ? amber : neon }}>{busy ? "Traitement en cours" : "Info"}</strong>
          <div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13, lineHeight: 1.4, ...wrapText }}>{message}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
          <TabButton active={tab === "backup"} onClick={() => setTab("backup")}>💾 Backup</TabButton>
          <TabButton active={tab === "restore"} onClick={() => setTab("restore")}>♻️ Restore</TabButton>
          <TabButton active={tab === "valid"} onClick={() => setTab("valid")}>✅ Valides</TabButton>
          <TabButton active={tab === "diagnostic"} onClick={() => setTab("diagnostic")}>🔎 Scan</TabButton>
        </div>

        {tab === "backup" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panel}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Créer / synchroniser</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Ici on garde uniquement les actions utiles : bloc local de sécurité, sauvegarde NAS complète, envoi du navigateur vers le compte et import JSON.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
                <button style={primaryBtn} disabled={busy} onClick={createNasBackup}>Créer sauvegarde NAS</button>
                <button style={btn} disabled={busy} onClick={pushCurrentToAccount}>Envoyer au compte</button>
                <button style={btn} disabled={busy} onClick={createLocalSlot}>Créer bloc sécurité</button>
                <button style={{ ...btn, borderColor: amber, color: amber, background: "rgba(251,191,36,.10)" }} disabled={busy} onClick={() => inputRef.current?.click()}>Importer JSON</button>
                <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => importJsonFile(e.currentTarget.files?.[0] || null)} />
              </div>
            </div>

            <div style={{ ...panel, borderColor: "rgba(251,191,36,.40)" }}>
              <strong style={{ color: amber }}>Flux clair pour récupérer tes données</strong>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.48, marginTop: 7, ...wrapText }}>
                1) Choisir un slot NAS ou un bloc local avec <b>PARTIES VALIDES</b>. 2) Cliquer <b>Restaurer navigateur + compte</b>. 3) L’application recharge. 4) Aller dans <b>Historique</b>, puis Stats. Les blocs <b>STATS SEULES</b> ne recréent pas les cartes historiques détaillées.
              </div>
            </div>
          </div>
        )}

        {tab === "restore" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={wrapText}>
                <strong style={{ color: "#fff" }}>Backups NAS restaurables</strong>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Affichage filtré : seulement les sauvegardes qui contiennent des parties/historique.</div>
              </div>
              <button style={btn} onClick={() => setShowTechnical((v) => !v)}>{showTechnical ? "Masquer technique" : "Afficher tout"}</button>
            </div>
            {visibleNasSlots.length ? visibleNasSlots.map((slot) => {
              const id = String(slot.id || "latest");
              return (
                <NasCard
                  key={`nas-${id}`}
                  slot={slot}
                  busy={busy}
                  onRestore={() => restoreNas(slot)}
                  onExport={async () => {
                    try {
                      const pulled = await pullNasMemorySlot(id);
                      exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
                    } catch (error: any) { setMessage(`Export NAS impossible : ${error?.message || error}`); }
                  }}
                  onDelete={!slot.latest ? async () => {
                    if (!window.confirm(`Supprimer définitivement ce slot NAS ?\n${id}`)) return;
                    setBusy(true);
                    try { await deleteNasMemorySlot(id); setMessage("Slot NAS supprimé."); await refresh(); }
                    catch (error: any) { setMessage(`Suppression NAS impossible : ${error?.message || error}`); }
                    finally { setBusy(false); }
                  } : undefined}
                />
              );
            }) : <div style={panel}>Aucun backup NAS avec parties valides affiché. Active “Afficher tout” pour voir les blocs techniques/stats seules.</div>}
          </div>
        )}

        {tab === "valid" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={wrapText}>
                <strong style={{ color: "#fff" }}>Données valides trouvées dans le navigateur</strong>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Ces blocs sont filtrés pour éviter les centaines de lignes inutiles.</div>
              </div>
              <button style={btn} onClick={() => setShowTechnical((v) => !v)}>{showTechnical ? "Masquer technique" : "Afficher tout"}</button>
            </div>

            <h2 style={{ margin: "6px 0 0", color: "#fff", fontSize: 18 }}>Blocs locaux de sécurité</h2>
            {localSlots.length ? localSlots.map((slot) => (
              <LocalSlotCard
                key={slot.id}
                slot={slot}
                busy={busy}
                onRestore={() => restoreLocal(slot)}
                onPush={async () => {
                  setBusy(true);
                  try { await pushSnapshotToAccount(slot.payload, `push-local-slot:${slot.id}`); setMessage("Bloc local envoyé au compte NAS."); await refresh(); }
                  catch (error: any) { setMessage(`Envoi impossible : ${error?.message || error}`); }
                  finally { setBusy(false); }
                }}
                onExport={() => exportJsonDownload(slot, `${slot.id}.json`)}
                onDelete={async () => { await deleteLocalMemorySlot(slot.id); await refresh(); }}
              />
            )) : <div style={panel}>Aucun bloc local de sécurité. Crée-en un avant toute restauration risquée.</div>}

            <h2 style={{ margin: "10px 0 0", color: "#fff", fontSize: 18 }}>Blocs de parties détectés</h2>
            {visibleBlocks.length ? visibleBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                busy={busy}
                onRestore={hasUsefulGameData(block.summary) ? () => restoreRawBlock(block) : undefined}
                onExport={() => exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`)}
              />
            )) : <div style={panel}>Aucun bloc local avec parties/historique. Lance “Scanner” ou restaure un slot NAS valide.</div>}
          </div>
        )}

        {tab === "diagnostic" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panel}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 19 }}>Diagnostic filtré</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Total scanné : {blocks.length} bloc(s). Valides parties : {validBlocks.length}. Techniques masqués : {technicalBlocks.length}. Par défaut, les blocs qui ne contiennent pas de parties/historique ne polluent plus la liste.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={primaryBtn} disabled={busy} onClick={refresh}>Scanner maintenant</button>
                <button style={btn} onClick={() => setShowTechnical((v) => !v)}>{showTechnical ? "Masquer technique" : "Afficher technique"}</button>
              </div>
            </div>

            {(showTechnical ? blocks : validBlocks).map((block) => (
              <BlockCard
                key={`diag-${block.id}`}
                block={block}
                busy={busy}
                onRestore={hasUsefulGameData(block.summary) ? () => restoreRawBlock(block) : undefined}
                onExport={() => exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
