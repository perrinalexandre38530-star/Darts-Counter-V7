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
type TabKey = "restore" | "backup" | "diagnostic";
type SaveSource = "nas" | "local";
type SaveGrade = "complete" | "history" | "stats-only" | "profiles-only" | "technical";

type SaveQuality = {
  grade: SaveGrade;
  label: string;
  short: string;
  color: string;
  score: number;
  restorable: boolean;
  reason: string;
};

type SaveEntry = {
  key: string;
  source: SaveSource;
  slot: NasSlot | MemorySlot;
  summary: VaultSummary;
  title: string;
  subtitle: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  latest?: boolean;
  index: number;
  quality: SaveQuality;
};

const neon = "#22d3ee";
const gold = "#d9ff33";
const red = "#fb7185";
const green = "#34d399";
const amber = "#fbbf24";
const muted = "#94a3b8";

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
    sports: Array.isArray(s.sports) ? s.sports.map(String).filter(Boolean).slice(0, 16) : [],
    names: Array.isArray(s.names) ? s.names.map(String).filter(Boolean).slice(0, 20) : [],
    exportedAt: s.exportedAt || null,
    probableContent: Array.isArray(s.probableContent) ? s.probableContent.map(String).filter(Boolean) : [],
  };
}

function assessSave(summary?: Partial<VaultSummary> | null): SaveQuality {
  const s = normalizeSummary(summary || {});
  const probable = s.probableContent.map((x) => x.toLowerCase()).join(" ");
  const hasHistory = s.historyRows > 0 || s.matches > 0 || probable.includes("historique") || probable.includes("parties");
  const hasStats = s.statsBlocks > 0;
  const hasProfiles = s.profiles > 0;
  const hasSports = s.sports.length > 0;
  const hasPayloadSize = s.bytes > 25_000 || s.keys > 20;

  const score =
    Math.min(40, s.historyRows * 4) +
    Math.min(35, s.matches) +
    (hasStats ? 18 : 0) +
    (hasProfiles ? 14 : 0) +
    (hasSports ? 8 : 0) +
    (hasPayloadSize ? 5 : 0);

  if (hasHistory && hasProfiles && hasStats && hasSports) {
    return {
      grade: "complete",
      label: "SAUVEGARDE COMPLÈTE",
      short: "Complet",
      color: green,
      score: Math.max(92, score),
      restorable: true,
      reason: "Parties + historique + profils + stats détectés.",
    };
  }

  if (hasHistory && (hasProfiles || hasSports || hasStats)) {
    return {
      grade: "history",
      label: "PARTIES / HISTORIQUE",
      short: "Parties",
      color: gold,
      score: Math.max(68, score),
      restorable: true,
      reason: "Parties détectées. Restauration possible, mais le bloc semble moins complet.",
    };
  }

  if (hasStats) {
    return {
      grade: "stats-only",
      label: "STATS SEULES",
      short: "Stats seules",
      color: amber,
      score: Math.max(42, score),
      restorable: false,
      reason: "Stats détectées, mais pas assez d'historique pour recréer les cartes de parties.",
    };
  }

  if (hasProfiles) {
    return {
      grade: "profiles-only",
      label: "PROFILS SEULS",
      short: "Profils",
      color: neon,
      score: Math.max(25, score),
      restorable: false,
      reason: "Profils détectés, mais pas de parties exploitables.",
    };
  }

  return {
    grade: "technical",
    label: "TECHNIQUE",
    short: "Technique",
    color: muted,
    score,
    restorable: false,
    reason: "Bloc interne ou incomplet : masqué pour éviter une mauvaise restauration.",
  };
}

function isRestorable(summary?: Partial<VaultSummary> | null) {
  return assessSave(summary).restorable;
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

function saveCategory(summary: Partial<VaultSummary>) {
  const s = normalizeSummary(summary);
  const sports = s.sports.map((x) => x.toLowerCase());
  const probable = s.probableContent.map((x) => x.toLowerCase()).join(" ");
  if (sports.some((x) => /baby|foot|foos/.test(x))) return "Baby-foot";
  if (probable.includes("tournoi") || probable.includes("ligue") || probable.includes("compétition") || probable.includes("competition")) return "Compétitions";
  if (sports.some((x) => /x01|dart|cricket|killer|golf|shanghai|scram|warfare|territories|capital/.test(x))) return "Fléchettes";
  if (sports.length > 1) return "Multi-sports";
  return "Jeux";
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

function StatBox({ label, value, color = gold }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ ...panel, borderRadius: 16, padding: 12, minHeight: 70 }}>
      <div style={{ color: muted, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 25, lineHeight: 1.1, fontWeight: 1000, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "98px minmax(0,1fr)", gap: 10, alignItems: "start", minWidth: 0 }}>
      <span style={{ color: muted, fontSize: 12, fontWeight: 800 }}>{label}</span>
      <strong style={{ color: "#f8fafc", fontSize: 12, textAlign: "right", ...wrapText }}>{value}</strong>
    </div>
  );
}

function QualityBadge({ quality }: { quality: SaveQuality }) {
  return (
    <span style={{ border: `1px solid ${quality.color}`, color: quality.color, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap" }}>
      {quality.short} · {Math.min(100, Math.round(quality.score))}%
    </span>
  );
}

function SummaryLines({ summary }: { summary: Partial<VaultSummary> }) {
  const s = normalizeSummary(summary);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <Line label="Contenu" value={`${s.matches} parties • ${s.profiles} profils • ${s.statsBlocks} stats • ${s.mediaRefs + s.dataImages} médias`} />
      <Line label="Historique" value={`${s.historyRows} lignes`} />
      <Line label="Catégorie" value={saveCategory(s)} />
      <Line label="Taille" value={fmtBytes(s.bytes)} />
      <Line label="Sports" value={join(s.sports)} />
      <Line label="Noms" value={join(s.names)} />
    </div>
  );
}

function SaveCard({ entry, busy, expanded, onToggle, onRestore, onExport, onDelete }: {
  entry: SaveEntry;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete?: () => void;
}) {
  const q = entry.quality;
  const s = normalizeSummary(entry.summary);
  return (
    <div style={{ ...panel, borderColor: q.restorable ? "rgba(52,211,153,.38)" : "rgba(251,191,36,.28)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 12, alignItems: "center", minWidth: 0 }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: q.grade === "complete" ? "rgba(52,211,153,.14)" : "rgba(217,255,51,.12)",
            border: `1px solid ${q.color}`,
            color: q.color,
            fontWeight: 1000,
            boxShadow: `0 0 18px ${q.color}33`,
          }}
        >
          {String(entry.index).padStart(2, "0")}
        </div>

        <div style={wrapText}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ color: "#fff", fontSize: 16, ...wrapText }}>{entry.title}</strong>
            <QualityBadge quality={q} />
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4, ...wrapText }}>{entry.subtitle}</div>
          <div style={{ color: q.color, fontSize: 12, fontWeight: 900, marginTop: 6, ...wrapText }}>{q.reason}</div>
        </div>

        <button style={{ ...btn, padding: "9px 10px", borderColor: "rgba(148,163,184,.35)", color: "#e5e7eb" }} onClick={onToggle}>
          {expanded ? "Masquer" : "Détails"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>PARTIES</div>
          <div style={{ color: gold, fontWeight: 1000, fontSize: 18 }}>{s.matches}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>PROFILS</div>
          <div style={{ color: neon, fontWeight: 1000, fontSize: 18 }}>{s.profiles}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>STATS</div>
          <div style={{ color: green, fontWeight: 1000, fontSize: 18 }}>{s.statsBlocks}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <SummaryLines summary={s} />
          <Line label="Date" value={fmtDate(entry.createdAt || entry.updatedAt || null)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={q.restorable ? primaryBtn : { ...btn, borderColor: muted, color: muted }} disabled={busy || !q.restorable} onClick={onRestore}>
          Restaurer cet état
        </button>
        <button style={btn} disabled={busy} onClick={onExport}>Exporter JSON</button>
        {onDelete && <button style={dangerBtn} disabled={busy} onClick={onDelete}>Supprimer</button>}
      </div>
    </div>
  );
}

function TechnicalBlockCard({ block, busy, onExport }: {
  block: StorageBlock;
  busy: boolean;
  onExport: () => void;
}) {
  const summary = normalizeSummary(block.summary);
  const q = assessSave(summary);
  return (
    <div style={{ ...panel, borderColor: "rgba(148,163,184,.18)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, minWidth: 0 }}>
        <div style={wrapText}>
          <strong style={{ color: "#fff", fontSize: 14, ...wrapText }}>{block.title}</strong>
          <div style={{ color: muted, fontSize: 11, marginTop: 3, ...wrapText }}>{block.subtitle || block.location}</div>
        </div>
        <QualityBadge quality={q} />
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8, ...wrapText }}>
        Bloc brut détecté pour diagnostic. Il n’est pas proposé comme restauration principale.
      </div>
      <div style={{ marginTop: 10 }}>
        <SummaryLines summary={summary} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
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

export default function StorageVaultPage({ go }: Props) {
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [showDiagnostic, setShowDiagnostic] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const nasEntries = React.useMemo<SaveEntry[]>(() => {
    return nasSlots
      .map((slot, idx) => {
        const summary = normalizeSummary(slot.summary || {});
        const q = assessSave(summary);
        const id = String(slot.id || "latest");
        return {
          key: `nas:${id}`,
          source: "nas" as const,
          slot,
          summary,
          latest: Boolean((slot as any).latest || id === "latest"),
          createdAt: slot.createdAt || slot.updatedAt || null,
          updatedAt: slot.updatedAt || slot.createdAt || null,
          index: idx + 1,
          quality: q,
          title: (slot as any).latest || id === "latest" ? "Emplacement courant NAS" : `Emplacement NAS ${String(idx + 1).padStart(2, "0")}`,
          subtitle: q.restorable ? `${saveCategory(summary)} · ${fmtDate(slot.createdAt || slot.updatedAt || null)}` : `Masqué par garde-fou · ${q.label}`,
        };
      })
      .filter((entry) => entry.quality.grade === "complete" || entry.quality.grade === "history")
      .sort((a, b) => {
        const gradeA = a.quality.grade === "complete" ? 2 : 1;
        const gradeB = b.quality.grade === "complete" ? 2 : 1;
        if (gradeA !== gradeB) return gradeB - gradeA;
        return (Date.parse(b.createdAt || b.updatedAt || "") || 0) - (Date.parse(a.createdAt || a.updatedAt || "") || 0);
      });
  }, [nasSlots]);

  const localEntries = React.useMemo<SaveEntry[]>(() => {
    return localSlots
      .map((slot, idx) => {
        const summary = normalizeSummary(slot.summary || summarizeVaultPayload(slot.payload));
        const q = assessSave(summary);
        return {
          key: `local:${slot.id}`,
          source: "local" as const,
          slot,
          summary,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
          index: idx + 1,
          quality: q,
          title: `Bloc local ${String(idx + 1).padStart(2, "0")}`,
          subtitle: `${slot.label || "Sécurité locale"} · ${fmtDate(slot.createdAt)}`,
        };
      })
      .filter((entry) => entry.quality.restorable);
  }, [localSlots]);

  const restorableEntries = React.useMemo(() => [...nasEntries, ...localEntries], [nasEntries, localEntries]);
  const completeEntries = React.useMemo(() => restorableEntries.filter((entry) => entry.quality.grade === "complete"), [restorableEntries]);
  const historyEntries = React.useMemo(() => restorableEntries.filter((entry) => entry.quality.grade === "history"), [restorableEntries]);
  const technicalCount = blocks.length;

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

      const validNas = ns.filter((slot) => isRestorable(slot.summary)).length;
      const validLocal = ls.filter((slot) => isRestorable(slot.summary || summarizeVaultPayload(slot.payload))).length;
      setMessage(`${validNas + validLocal} emplacement(s) restaurable(s). Les blocs techniques/douteux restent cachés en mode expert pour éviter les mauvaises restaurations.`);
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
    const q = assessSave(summary);
    if (!q.restorable) {
      throw new Error(`Garde-fou restauration : bloc refusé. ${q.reason}`);
    }

    const ok = window.confirm(
      `Restaurer "${label}" ?\n\n` +
      `${summary.matches} parties • ${summary.historyRows} lignes historique • ${summary.profiles} profils • ${summary.statsBlocks} stats\n\n` +
      `L’application va créer une sécurité, restaurer le navigateur, envoyer au compte NAS puis recharger.`
    );
    if (!ok) return;

    const restoreAuth = rememberAuthKeys();
    await createLocalMemorySlot("Sécurité avant restauration", "before-restore").catch(() => null);
    await importCloudSnapshot(snapshot, { mode: "replace" });
    restoreAuth();
    await afterRestoreHousekeeping(reason);
    await pushSnapshotToAccount(snapshot, reason);
    setMessage(`Restauration terminée : ${summary.matches} partie(s), ${summary.profiles} profil(s), ${summary.statsBlocks} bloc(s) stats. Rechargement…`);
    window.setTimeout(() => window.location.reload(), 900);
  };

  const createLocalSlot = async () => {
    setBusy(true);
    try {
      const slot = await createLocalMemorySlot("Bloc local de sécurité", "manual");
      const q = assessSave(slot.summary || summarizeVaultPayload(slot.payload));
      setMessage(`Bloc local créé : ${q.label} · ${slot.summary.matches} parties • ${slot.summary.profiles} profils.`);
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
      const summary = summarizeVaultPayload(snapshot);
      const q = assessSave(summary);
      if (!q.restorable && !window.confirm(`Attention : le garde-fou ne trouve pas de parties fiables dans l’état actuel.\n\n${q.reason}\n\nEnvoyer quand même ?`)) return;
      await pushSnapshotToAccount(snapshot, "manual-save-page-push");
      setMessage(`Compte NAS mis à jour : ${summary.matches} parties • ${summary.profiles} profils • ${summary.statsBlocks} stats.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Envoi au compte impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const createNasBackup = async () => {
    const ok = window.confirm("Créer une sauvegarde NAS complète maintenant ?\n\nElle remplace l’emplacement courant et ajoute un point de restauration versionné.");
    if (!ok) return;
    setBusy(true);
    try {
      const res: any = await createNasVersionedSnapshot();
      const summary = normalizeSummary(res?.summary || res?.summary?.after || {});
      setMessage(`Sauvegarde NAS créée. ${summary.matches || res?.summary?.after?.historyCount || ""} partie(s) détectée(s).`);
      await refresh();
    } catch (error: any) {
      setMessage(`Sauvegarde NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreNas = async (entry: SaveEntry) => {
    setBusy(true);
    try {
      const slot = entry.slot as NasSlot;
      const id = String(slot.id || "latest");
      const pulled = await pullNasMemorySlot(id);
      await restoreSnapshotIntoBrowserAndAccount(
        pulled.payload,
        `restore-nas:${id}`,
        entry.title
      );
    } catch (error: any) {
      setMessage(`Restauration NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreLocal = async (entry: SaveEntry) => {
    setBusy(true);
    try {
      const slot = entry.slot as MemorySlot;
      await restoreSnapshotIntoBrowserAndAccount(slot.payload, `restore-local:${slot.id}`, entry.title);
    } catch (error: any) {
      setMessage(`Restauration locale impossible : ${error?.message || error}`);
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

  const toggleExpanded = (key: string) => setExpanded((old) => ({ ...old, [key]: !old[key] }));

  const renderEntry = (entry: SaveEntry) => (
    <SaveCard
      key={entry.key}
      entry={entry}
      busy={busy}
      expanded={Boolean(expanded[entry.key])}
      onToggle={() => toggleExpanded(entry.key)}
      onRestore={() => entry.source === "nas" ? restoreNas(entry) : restoreLocal(entry)}
      onExport={async () => {
        try {
          if (entry.source === "nas") {
            const slot = entry.slot as NasSlot;
            const id = String(slot.id || "latest");
            const pulled = await pullNasMemorySlot(id);
            exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          } else {
            exportJsonDownload(entry.slot, `${(entry.slot as MemorySlot).id}.json`);
          }
        } catch (error: any) {
          setMessage(`Export impossible : ${error?.message || error}`);
        }
      }}
      onDelete={entry.source === "nas" && !(entry.slot as NasSlot).latest ? async () => {
        const slot = entry.slot as NasSlot;
        const id = String(slot.id || "");
        if (!window.confirm(`Supprimer définitivement cet emplacement NAS ?\n${entry.title}`)) return;
        setBusy(true);
        try { await deleteNasMemorySlot(id); setMessage("Emplacement NAS supprimé."); await refresh(); }
        catch (error: any) { setMessage(`Suppression NAS impossible : ${error?.message || error}`); }
        finally { setBusy(false); }
      } : entry.source === "local" ? async () => {
        const slot = entry.slot as MemorySlot;
        if (!window.confirm(`Supprimer ce bloc local ?\n${entry.title}`)) return;
        await deleteLocalMemorySlot(slot.id);
        await refresh();
      } : undefined}
    />
  );

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
              <div style={{ color: "#cbd5e1", fontSize: 11, marginTop: 4, ...wrapText }}>Carte mémoire de l’application</div>
              <div style={{ color: muted, fontSize: 11, ...wrapText }}>On n’affiche que les emplacements restaurables.</div>
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
            <StatBox label="Emplacements" value={restorableEntries.length} color={green} />
            <StatBox label="Complets" value={completeEntries.length} color={gold} />
            <StatBox label="NAS" value={nasEntries.length} color={neon} />
          </div>
        </div>

        <div style={{ ...panel, borderColor: busy ? `rgba(251,191,36,.45)` : "rgba(34,211,238,.28)", marginBottom: 12 }}>
          <strong style={{ color: busy ? amber : neon }}>{busy ? "Traitement en cours" : "Info"}</strong>
          <div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13, lineHeight: 1.4, ...wrapText }}>{message}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
          <TabButton active={tab === "restore"} onClick={() => setTab("restore")}>🎮 Restaurer</TabButton>
          <TabButton active={tab === "backup"} onClick={() => setTab("backup")}>💾 Sauver</TabButton>
          <TabButton active={tab === "diagnostic"} onClick={() => setTab("diagnostic")}>🔎 Expert</TabButton>
        </div>

        {tab === "restore" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, borderColor: "rgba(52,211,153,.36)" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Choisir un état à restaurer</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Comme une carte mémoire : tu choisis un emplacement fiable, puis <b>Restaurer cet état</b>. Le garde-fou bloque les sauvegardes sans historique de parties.
              </p>
            </div>

            {completeEntries.length > 0 && (
              <>
                <h2 style={{ margin: "4px 0 0", color: green, fontSize: 17, textShadow: "0 0 12px rgba(52,211,153,.45)" }}>Sauvegardes complètes recommandées</h2>
                {completeEntries.map(renderEntry)}
              </>
            )}

            {historyEntries.length > 0 && (
              <>
                <h2 style={{ margin: "8px 0 0", color: gold, fontSize: 17, textShadow: "0 0 12px rgba(217,255,51,.35)" }}>Parties / historique à vérifier</h2>
                {historyEntries.map(renderEntry)}
              </>
            )}

            {!restorableEntries.length && (
              <div style={panel}>
                <strong style={{ color: amber }}>Aucun emplacement fiable affiché</strong>
                <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                  Le garde-fou ne trouve pas de sauvegarde avec parties/historique. Ouvre l’onglet Expert uniquement pour diagnostiquer les blocs bruts.
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "backup" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panel}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Créer un point de restauration</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Utilise surtout <b>Créer sauvegarde NAS</b>. C’est l’équivalent “Sauvegarder la partie” : historique, stats, profils et médias sont envoyés dans ton compte.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <button style={primaryBtn} disabled={busy} onClick={createNasBackup}>Créer sauvegarde NAS</button>
                <button style={btn} disabled={busy} onClick={createLocalSlot}>Créer sécurité locale</button>
                <button style={btn} disabled={busy} onClick={pushCurrentToAccount}>Envoyer état actuel</button>
                <button style={{ ...btn, borderColor: amber, color: amber, background: "rgba(251,191,36,.10)" }} disabled={busy} onClick={() => inputRef.current?.click()}>Importer latest.json</button>
                <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => importJsonFile(e.currentTarget.files?.[0] || null)} />
              </div>
            </div>

            <div style={{ ...panel, borderColor: "rgba(251,191,36,.34)" }}>
              <strong style={{ color: amber }}>Règle simple</strong>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.48, marginTop: 7, ...wrapText }}>
                Une sauvegarde fiable doit contenir <b>parties + historique + profils + stats</b>. Les blocs “stats seules” ou “techniques” sont masqués parce qu’ils ne peuvent pas reconstruire correctement les cartes historiques.
              </div>
            </div>
          </div>
        )}

        {tab === "diagnostic" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panel}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 19 }}>Mode expert</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Ici seulement on voit les blocs bruts IndexedDB/localStorage. Ils servent à comprendre où sont les données, pas à choisir une restauration normale.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={primaryBtn} disabled={busy} onClick={refresh}>Scanner maintenant</button>
                <button style={btn} onClick={() => setShowDiagnostic((v) => !v)}>{showDiagnostic ? "Masquer blocs bruts" : `Afficher ${technicalCount} blocs bruts`}</button>
              </div>
            </div>

            {showDiagnostic && blocks.map((block) => (
              <TechnicalBlockCard
                key={`diag-${block.id}`}
                block={block}
                busy={busy}
                onExport={() => exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
