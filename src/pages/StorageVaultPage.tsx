import * as React from "react";
import {
  createLocalMemorySlot,
  createNasVersionedSnapshot,
  deleteLocalMemorySlot,
  exportJsonDownload,
  listLocalMemorySlots,
  listNasMemorySlots,
  pullNasMemorySlot,
  restoreLocalMemorySlot,
  restoreNasMemorySlot,
  scanLocalStorageAndIndexedDb,
  summarizeVaultPayload,
  type MemorySlot,
  type NasSlot,
  type StorageBlock,
  type VaultSummary,
} from "../lib/storageVault";

// Page autonome côté UI, mais restauration branchée sur le vrai moteur de l'app :
// exportCloudSnapshot()/importCloudSnapshot() via src/lib/storageVault.ts.
// Important : ne pas remplacer ce fichier par un simple proxy de 2 lignes, sinon
// certains environnements/patchs l'ouvrent comme fichier incomplet.

type Props = { go?: (tab: any, params?: any) => void };

type ReadNasState = {
  slotId: string;
  summary: VaultSummary;
  payload: any;
};

const neon = "#22d3ee";
const gold = "#facc15";
const danger = "#fb7185";
const success = "#34d399";
const warn = "#fbbf24";
const bg = "#020617";

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function fmtBytes(n: number | null | undefined) {
  const v = Number(n || 0);
  if (!v) return "0 o";
  if (v < 1024) return `${v} o`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} ko`;
  return `${(v / 1024 / 1024).toFixed(2)} Mo`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("fr-FR");
}

function summaryFromSlot(slot: NasSlot | MemorySlot | StorageBlock | null | undefined): VaultSummary {
  const raw: any = (slot as any)?.summary || {};
  return {
    bytes: Number(raw.bytes || 0),
    keys: Number(raw.keys || 0),
    profiles: Number(raw.profiles || 0),
    matches: Number(raw.matches || 0),
    historyRows: Number(raw.historyRows || 0),
    statsBlocks: Number(raw.statsBlocks || raw.stats || 0),
    mediaRefs: Number(raw.mediaRefs || 0),
    dataImages: Number(raw.dataImages || 0),
    sports: Array.isArray(raw.sports) ? raw.sports : [],
    names: Array.isArray(raw.names) ? raw.names : [],
    probableContent: Array.isArray(raw.probableContent) ? raw.probableContent : [],
    exportedAt: raw.exportedAt || null,
  };
}

function score(summary: Partial<VaultSummary>) {
  return Number(summary.matches || 0) * 20
    + Number(summary.historyRows || 0) * 10
    + Number(summary.profiles || 0) * 6
    + Number(summary.statsBlocks || 0) * 5
    + Number(summary.mediaRefs || 0)
    + Number(summary.dataImages || 0);
}

function quality(summary: Partial<VaultSummary>) {
  const s = score(summary);
  if (s >= 80) return { label: "TRÈS PROMETTEUR", color: success };
  if (s >= 20) return { label: "À INSPECTER", color: warn };
  return { label: "FAIBLE", color: danger };
}

function titleForSource(source?: string) {
  if (source === "nasSlot") return "Slot NAS";
  if (source === "nasLatest") return "Backup NAS courant";
  if (source === "localSlot") return "Bloc local restaurable";
  if (source === "indexedDB") return "IndexedDB";
  if (source === "localStorage") return "LocalStorage";
  return "Bloc";
}

function stringifySafe(value: any) {
  try { return JSON.stringify(value, null, 2); } catch { return String(value ?? ""); }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  color: "#e2e8f0",
  background: `radial-gradient(circle at 30% 0%, rgba(34,211,238,.16), transparent 34%), ${bg}`,
  padding: "18px 14px 96px",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(34,211,238,.30)",
  background: "linear-gradient(180deg, rgba(15,23,42,.96), rgba(2,6,23,.96))",
  boxShadow: "0 0 24px rgba(34,211,238,.12)",
  borderRadius: 20,
  padding: 14,
};

const buttonStyle: React.CSSProperties = {
  border: `1px solid ${neon}`,
  color: neon,
  background: "rgba(34,211,238,.12)",
  borderRadius: 13,
  padding: "10px 12px",
  fontWeight: 1000,
  fontSize: 12,
  cursor: "pointer",
};

function ActionButton({ children, onClick, disabled, tone = "cyan", title }: {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "cyan" | "gold" | "red" | "green" | "dark";
  title?: string;
}) {
  const color = tone === "gold" ? gold : tone === "red" ? danger : tone === "green" ? success : tone === "dark" ? "#e2e8f0" : neon;
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => { void onClick?.(); }}
      style={{
        ...buttonStyle,
        borderColor: color,
        color,
        background: tone === "dark" ? "rgba(15,23,42,.72)" : `${color}20`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#cbd5e1", fontSize: 12 }}>
      <span style={{ opacity: 0.72 }}>{label}</span>
      <strong style={{ color: "#f8fafc", textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong>
    </div>
  );
}

function SummaryLines({ summary }: { summary: VaultSummary }) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <Line label="Contenu" value={`${summary.matches} parties • ${summary.profiles} profils • ${summary.statsBlocks} stats • ${summary.mediaRefs + summary.dataImages} médias`} />
      <Line label="Taille" value={fmtBytes(summary.bytes)} />
      <Line label="Sports" value={summary.sports?.length ? summary.sports.join(", ") : "—"} />
      <Line label="Noms" value={summary.names?.length ? summary.names.join(", ") : "—"} />
      {summary.probableContent?.length ? <Line label="Probable" value={summary.probableContent.join(", ")} /> : null}
      {summary.exportedAt ? <Line label="Export" value={fmtDate(summary.exportedAt)} /> : null}
    </div>
  );
}

function BlockCard({ block }: { block: StorageBlock }) {
  const summary = summaryFromSlot(block);
  const q = quality(summary);
  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis" }}>{block.title || titleForSource(block.source)}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
            {block.subtitle || titleForSource(block.source)} • {block.location}
          </div>
        </div>
        <span style={{ color: q.color, border: `1px solid ${q.color}`, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap" }}>{q.label}</span>
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.18)", margin: "12px 0" }} />
      <SummaryLines summary={summary} />
      {block.createdAt || block.updatedAt ? <div style={{ marginTop: 8 }}><Line label="Date" value={fmtDate(block.createdAt || block.updatedAt)} /></div> : null}
    </div>
  );
}

function LocalSlotCard({ slot, busy, onRestore, onDelete, onExport }: {
  slot: MemorySlot;
  busy?: boolean;
  onRestore: (slot: MemorySlot) => void | Promise<void>;
  onDelete: (slot: MemorySlot) => void | Promise<void>;
  onExport: (slot: MemorySlot) => void | Promise<void>;
}) {
  const summary = summaryFromSlot(slot);
  const q = quality(summary);
  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 1000 }}>{slot.label || "Bloc local"}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>IndexedDB sécurité • dc_memory_card_v1.slots</div>
        </div>
        <span style={{ color: q.color, border: `1px solid ${q.color}`, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, height: 18 }}>{q.label}</span>
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.18)", margin: "12px 0" }} />
      <SummaryLines summary={summary} />
      <div style={{ marginTop: 8 }}><Line label="Créé" value={fmtDate(slot.createdAt)} /></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <ActionButton disabled={busy} tone="green" onClick={() => onRestore(slot)}>Restaurer local</ActionButton>
        <ActionButton disabled={busy} onClick={() => onExport(slot)}>Exporter</ActionButton>
        <ActionButton disabled={busy} tone="red" onClick={() => onDelete(slot)}>Supprimer</ActionButton>
      </div>
    </div>
  );
}

function NasSlotCard({ slot, busy, readState, onRead, onRestore, onExport }: {
  slot: NasSlot;
  busy?: boolean;
  readState?: ReadNasState | null;
  onRead: (slot: NasSlot) => void | Promise<void>;
  onRestore: (slot: NasSlot) => void | Promise<void>;
  onExport: (slot: NasSlot) => void | Promise<void>;
}) {
  const slotId = String(slot.id || "");
  const baseSummary = readState?.slotId === slotId ? readState.summary : summaryFromSlot(slot as any);
  const q = quality(baseSummary);
  const label = slot.latest ? "Backup NAS courant" : `Slot NAS ${slotId.slice(-8) || "versionné"}`;
  return (
    <div style={{ ...panelStyle, borderColor: slot.latest ? "rgba(250,204,21,.42)" : "rgba(34,211,238,.30)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 1000 }}>{label}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
            PostgreSQL NAS • {slot.latest ? "/sync/pull" : `/sync/slots/${slotId}`}
          </div>
        </div>
        <span style={{ color: q.color, border: `1px solid ${q.color}`, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, height: 18 }}>{q.label}</span>
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,.18)", margin: "12px 0" }} />
      <SummaryLines summary={baseSummary} />
      <div style={{ marginTop: 8 }}>
        <Line label="Créé" value={fmtDate(slot.createdAt || slot.updatedAt)} />
        <Line label="Version" value={slot.version ?? "—"} />
        <Line label="Promu" value={fmtDate(slot.promotedAt)} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <ActionButton disabled={busy} onClick={() => onRead(slot)}>Lire contenu</ActionButton>
        <ActionButton disabled={busy} tone="green" onClick={() => onRestore(slot)}>Restaurer ce NAS</ActionButton>
        <ActionButton disabled={busy} onClick={() => onExport(slot)}>Exporter NAS</ActionButton>
      </div>
      {readState?.slotId === slotId ? (
        <div style={{ marginTop: 10, border: "1px solid rgba(52,211,153,.35)", borderRadius: 14, padding: 10, background: "rgba(52,211,153,.08)", color: "#bbf7d0", fontSize: 12, fontWeight: 800 }}>
          Contenu lu : {readState.summary.matches} parties • {readState.summary.profiles} profils • {readState.summary.statsBlocks} stats. Ce payload est restaurable dans ton compte/navigateur.
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ margin: "22px 0 10px" }}>
      <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>{children}</h2>
      {sub ? <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

export default function StorageVaultPage({ go }: Props) {
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [readNas, setReadNas] = React.useState<Record<string, ReadNasState>>({});
  const [message, setMessage] = React.useState("Scan en attente…");
  const [busy, setBusy] = React.useState(false);
  const [showRaw, setShowRaw] = React.useState(false);
  const [rawPreview, setRawPreview] = React.useState("");

  const sortedBlocks = React.useMemo(() => {
    return [...blocks].sort((a, b) => score(summaryFromSlot(b)) - score(summaryFromSlot(a))).slice(0, 80);
  }, [blocks]);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [nextBlocks, nextLocalSlots, nextNasSlots] = await Promise.all([
        scanLocalStorageAndIndexedDb().catch((error) => {
          console.warn("scanLocalStorageAndIndexedDb failed", error);
          return [] as StorageBlock[];
        }),
        listLocalMemorySlots().catch((error) => {
          console.warn("listLocalMemorySlots failed", error);
          return [] as MemorySlot[];
        }),
        listNasMemorySlots().catch((error) => {
          console.warn("listNasMemorySlots failed", error);
          setMessage(`NAS indisponible : ${error?.message || error}`);
          return [] as NasSlot[];
        }),
      ]);
      setBlocks(nextBlocks);
      setLocalSlots(nextLocalSlots);
      setNasSlots(nextNasSlots);
      setMessage(`Scan terminé : ${nextBlocks.length} bloc(s) locaux, ${nextLocalSlots.length} bloc(s) de sécurité, ${nextNasSlots.length} slot(s) NAS.`);
    } catch (error: any) {
      setMessage(`Erreur scan : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const createLocal = async () => {
    setBusy(true);
    try {
      const slot = await createLocalMemorySlot("Bloc local de sécurité", "manual");
      setMessage(`Bloc local créé : ${slot.summary.matches} parties • ${slot.summary.profiles} profils • ${slot.summary.statsBlocks} stats.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Création bloc local impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const createNas = async () => {
    setBusy(true);
    try {
      const result = await createNasVersionedSnapshot();
      setMessage(`Slot NAS créé. ${result?.slotId ? `ID : ${result.slotId}` : "Backup versionné enregistré côté NAS."}`);
      await refresh();
    } catch (error: any) {
      setMessage(`Création slot NAS impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const readNasSlot = async (slot: NasSlot) => {
    const id = String(slot.id || "");
    if (!id) return;
    setBusy(true);
    try {
      const pulled = await pullNasMemorySlot(id);
      const summary = pulled.summary || summarizeVaultPayload(pulled.payload);
      setReadNas((prev) => ({ ...prev, [id]: { slotId: id, summary, payload: pulled.payload } }));
      setRawPreview(stringifySafe(pulled.payload).slice(0, 16000));
      setMessage(`Slot NAS lu : ${summary.matches} parties • ${summary.profiles} profils • ${summary.statsBlocks} stats.`);
    } catch (error: any) {
      setMessage(`Lecture NAS impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const restoreNas = async (slot: NasSlot) => {
    const id = String(slot.id || "");
    if (!id) return;
    const known = readNas[id]?.summary || summaryFromSlot(slot as any);
    const ok = window.confirm(
      `Restaurer cette sauvegarde NAS sur ce navigateur/compte ?\n\n` +
      `${slot.latest ? "Backup courant" : id}\n` +
      `${fmtDate(slot.createdAt || slot.updatedAt)}\n\n` +
      `Contenu détecté : ${known.matches} parties • ${known.profiles} profils • ${known.statsBlocks} stats.\n\n` +
      `Un bloc local de sécurité sera créé avant restauration, puis l'application sera rechargée.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const restored = await restoreNasMemorySlot(id);
      setMessage(`Sauvegarde NAS restaurée : ${restored.summary.matches} parties • ${restored.summary.profiles} profils • ${restored.summary.statsBlocks} stats. Rechargement…`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error: any) {
      setMessage(`Restauration NAS impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const exportNas = async (slot: NasSlot) => {
    const id = String(slot.id || "");
    if (!id) return;
    setBusy(true);
    try {
      const pulled = readNas[id] || await pullNasMemorySlot(id).then((r) => ({ slotId: id, summary: r.summary, payload: r.payload }));
      await exportJsonDownload({ slot, summary: pulled.summary, payload: pulled.payload }, `${id || "slot-nas"}.json`);
      setMessage("Export NAS téléchargé.");
    } catch (error: any) {
      setMessage(`Export NAS impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const restoreLocal = async (slot: MemorySlot) => {
    const s = summaryFromSlot(slot);
    const ok = window.confirm(
      `Restaurer ce bloc local ?\n\n${slot.label}\n${fmtDate(slot.createdAt)}\n\n` +
      `Contenu : ${s.matches} parties • ${s.profiles} profils • ${s.statsBlocks} stats.\n\n` +
      `Un bloc de sécurité sera créé avant restauration, puis l'application sera rechargée.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await restoreLocalMemorySlot(slot.id);
      setMessage("Bloc local restauré. Rechargement…");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error: any) {
      setMessage(`Restauration locale impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteLocal = async (slot: MemorySlot) => {
    if (!window.confirm(`Supprimer ce bloc local ?\n\n${slot.label}\n${fmtDate(slot.createdAt)}`)) return;
    setBusy(true);
    try {
      await deleteLocalMemorySlot(slot.id);
      setMessage("Bloc local supprimé.");
      await refresh();
    } catch (error: any) {
      setMessage(`Suppression impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const exportLocal = async (slot: MemorySlot) => {
    await exportJsonDownload(slot, `${slot.id || "bloc-local"}.json`);
    setMessage("Export local téléchargé.");
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (go) go("settings");
  };

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: neon, fontSize: 12, fontWeight: 1000, letterSpacing: ".12em", textTransform: "uppercase" }}>Carte mémoire</div>
            <h1 style={{ color: "#fff", margin: "4px 0", fontSize: 25 }}>Coffre de sauvegardes</h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, lineHeight: 1.35 }}>
              Inspecte localStorage, IndexedDB, blocs locaux et backups NAS. Une restauration réelle réinjecte le snapshot avec le moteur de stockage de l'application.
            </p>
          </div>
          <ActionButton tone="dark" onClick={goBack}>Retour</ActionButton>
        </div>

        <div style={{ ...panelStyle, marginBottom: 12, borderColor: busy ? "rgba(251,191,36,.40)" : "rgba(34,211,238,.30)" }}>
          <strong style={{ color: busy ? warn : neon }}>{busy ? "Traitement" : "Info"}</strong>
          <div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13, lineHeight: 1.35 }}>{message}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 14 }}>
          <ActionButton disabled={busy} onClick={refresh}>Scanner</ActionButton>
          <ActionButton disabled={busy} onClick={createLocal}>Créer bloc local</ActionButton>
          <ActionButton disabled={busy} tone="gold" onClick={createNas}>Créer slot NAS</ActionButton>
          <ActionButton disabled={busy} tone="dark" onClick={() => setShowRaw((v) => !v)}>{showRaw ? "Masquer brut" : "Voir brut"}</ActionButton>
        </div>

        <SectionTitle sub="Backups stockés côté NAS/PostgreSQL. C'est ici qu'il faut lire puis restaurer une sauvegarde sur ton compte/navigateur.">
          Slots NAS / backups versionnés
        </SectionTitle>
        <div style={{ display: "grid", gap: 10 }}>
          {asArray(nasSlots).length ? asArray(nasSlots).map((slot) => (
            <NasSlotCard
              key={`nas-${slot.id}`}
              slot={slot}
              busy={busy}
              readState={readNas[String(slot.id || "")] || null}
              onRead={readNasSlot}
              onRestore={restoreNas}
              onExport={exportNas}
            />
          )) : (
            <div style={panelStyle}>
              <div style={{ color: "#fff", fontWeight: 1000 }}>Aucun slot NAS affiché</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                Clique sur <strong>Scanner</strong>. Si rien n'apparaît, crée d'abord un slot avec <strong>Créer slot NAS</strong>. Si le NAS est indisponible, vérifie que tu es connecté au compte utilisateur et que le backend répond à <code>/sync/slots</code>.
              </div>
            </div>
          )}
        </div>

        <SectionTitle sub="Ces blocs sont stockés dans le navigateur. Ils servent de point de sécurité avant restauration.">
          Blocs de sécurité locaux
        </SectionTitle>
        <div style={{ display: "grid", gap: 10 }}>
          {asArray(localSlots).length ? asArray(localSlots).map((slot) => (
            <LocalSlotCard
              key={`local-${slot.id}`}
              slot={slot}
              busy={busy}
              onRestore={restoreLocal}
              onDelete={deleteLocal}
              onExport={exportLocal}
            />
          )) : (
            <div style={panelStyle}>Aucun bloc de sécurité local. Crée un bloc avant toute restauration risquée.</div>
          )}
        </div>

        <SectionTitle sub="Inspection brute des zones de stockage trouvées. Ces cartes ne sont pas toutes restaurables telles quelles.">
          Blocs locaux détectés
        </SectionTitle>
        <div style={{ display: "grid", gap: 10 }}>
          {sortedBlocks.length ? sortedBlocks.map((block) => <BlockCard key={block.id} block={block} />) : <div style={panelStyle}>Aucun bloc local détecté pour l'instant.</div>}
        </div>

        {showRaw ? (
          <>
            <SectionTitle sub="Aperçu du dernier payload NAS lu, utile pour diagnostic.">Aperçu brut</SectionTitle>
            <div style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Limité aux 16 000 premiers caractères.</div>
                <ActionButton tone="dark" onClick={async () => { const ok = await copyText(rawPreview); setMessage(ok ? "Aperçu copié." : "Copie impossible."); }}>Copier</ActionButton>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 360, overflow: "auto", margin: 0, color: "#bae6fd", fontSize: 11 }}>{rawPreview || "Aucun slot NAS lu. Clique sur Lire contenu."}</pre>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
