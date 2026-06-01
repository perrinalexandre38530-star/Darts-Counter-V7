import React from "react";
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
  type MemorySlot,
  type NasSlot,
  type StorageBlock,
  type VaultSummary,
} from "../lib/storageVault";

type Props = { go?: (tab: any, params?: any) => void };

function fmtBytes(bytes?: number | null) {
  const n = Number(bytes || 0);
  if (!n) return "0 o";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} Ko`;
  return `${Math.round(n / 1024 / 102.4) / 10} Mo`;
}

function fmtDate(value?: string | null) {
  if (!value) return "date inconnue";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}

function scoreLabel(s: VaultSummary) {
  const parts: string[] = [];
  if (s.matches || s.historyRows) parts.push(`${Math.max(s.matches, s.historyRows)} partie(s)`);
  if (s.profiles) parts.push(`${s.profiles} profil(s)`);
  if (s.statsBlocks) parts.push(`${s.statsBlocks} bloc(s) stats`);
  if (s.mediaRefs || s.dataImages) parts.push(`${s.mediaRefs + s.dataImages} média(s)`);
  return parts.length ? parts.join(" · ") : "contenu non identifié";
}

function SummaryPills({ summary }: { summary: VaultSummary }) {
  const items = [
    ["PARTIES", Math.max(summary.matches || 0, summary.historyRows || 0)],
    ["PROFILS", summary.profiles || 0],
    ["STATS", summary.statsBlocks || 0],
    ["MÉDIAS", (summary.mediaRefs || 0) + (summary.dataImages || 0)],
    ["TAILLE", fmtBytes(summary.bytes)],
  ];
  return (
    <div className="sv-pills">
      {items.map(([label, value]) => (
        <span key={String(label)} className="sv-pill"><b>{label}</b>{String(value)}</span>
      ))}
    </div>
  );
}

function BlockCard({ block }: { block: StorageBlock }) {
  return (
    <div className="sv-card sv-block-card">
      <div className="sv-card-top">
        <div>
          <div className="sv-source">{block.source}</div>
          <h3>{block.title}</h3>
          <p>{block.subtitle || block.location}</p>
        </div>
        <span className={block.recoverable ? "sv-badge-ok" : "sv-badge-muted"}>{block.recoverable ? "lisible" : "info"}</span>
      </div>
      <SummaryPills summary={block.summary} />
      <div className="sv-meta-grid">
        <div><b>Chemin</b><span>{block.location}</span></div>
        <div><b>Date</b><span>{fmtDate(block.updatedAt || block.createdAt || block.summary.exportedAt || null)}</span></div>
        <div><b>Sports vus</b><span>{block.summary.sports?.slice(0, 6).join(", ") || "—"}</span></div>
        <div><b>Noms vus</b><span>{block.summary.names?.slice(0, 6).join(", ") || "—"}</span></div>
      </div>
    </div>
  );
}

function LocalSlotCard({ slot, onRestore, onDelete, onExport }: { slot: MemorySlot; onRestore: (id: string) => void; onDelete: (id: string) => void; onExport: (slot: MemorySlot) => void }) {
  return (
    <div className="sv-card">
      <div className="sv-card-top">
        <div>
          <div className="sv-source">BLOC LOCAL</div>
          <h3>{slot.label}</h3>
          <p>{fmtDate(slot.createdAt)} · {slot.source}</p>
        </div>
        <span className="sv-badge-ok">restaurable</span>
      </div>
      <SummaryPills summary={slot.summary} />
      <div className="sv-actions-row">
        <button className="sv-btn sv-danger" onClick={() => onRestore(slot.id)}>Restaurer ce bloc</button>
        <button className="sv-btn" onClick={() => onExport(slot)}>Exporter JSON</button>
        <button className="sv-btn sv-muted" onClick={() => onDelete(slot.id)}>Supprimer</button>
      </div>
    </div>
  );
}

function NasSlotCard({ slot, onPreview, onRestore }: { slot: NasSlot; onPreview: (id: string) => void; onRestore: (id: string) => void }) {
  const summary = slot.summary as VaultSummary | undefined;
  return (
    <div className="sv-card">
      <div className="sv-card-top">
        <div>
          <div className="sv-source">{slot.latest ? "NAS ACTUEL" : "NAS SLOT"}</div>
          <h3>{slot.latest ? "Backup NAS actuellement actif" : `Backup NAS ${slot.id}`}</h3>
          <p>{fmtDate(slot.createdAt || slot.updatedAt)} · version {slot.version ?? "?"}</p>
        </div>
        <span className="sv-badge-ok">slot</span>
      </div>
      {summary ? <SummaryPills summary={summary} /> : <p className="sv-note">Clique sur “Lire contenu” pour analyser ce slot sans le restaurer.</p>}
      <div className="sv-actions-row">
        <button className="sv-btn" onClick={() => onPreview(slot.id)}>Lire contenu</button>
        <button className="sv-btn sv-danger" onClick={() => onRestore(slot.id)}>Restaurer ce NAS</button>
      </div>
    </div>
  );
}

export default function StorageVaultPage({ go }: Props) {
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [slots, setSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [busy, setBusy] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [filter, setFilter] = React.useState<string>("all");

  const refreshLocal = React.useCallback(async () => {
    setBusy("scan-local");
    try {
      const [b, s] = await Promise.all([scanLocalStorageAndIndexedDb(), listLocalMemorySlots()]);
      setBlocks(b);
      setSlots(s);
      setMessage(`Scan local terminé : ${b.length} bloc(s) trouvés.`);
    } catch (e: any) {
      setMessage(e?.message || "Erreur scan local");
    } finally {
      setBusy("");
    }
  }, []);

  const refreshNas = React.useCallback(async () => {
    setBusy("scan-nas");
    try {
      const list = await listNasMemorySlots();
      setNasSlots(list);
      setMessage(`NAS : ${list.length} sauvegarde(s) listée(s).`);
    } catch (e: any) {
      setMessage(e?.message || "Impossible de lister les sauvegardes NAS.");
    } finally {
      setBusy("");
    }
  }, []);

  React.useEffect(() => {
    refreshLocal();
    refreshNas();
  }, [refreshLocal, refreshNas]);

  async function handleCreateLocal() {
    setBusy("create-local");
    try {
      const slot = await createLocalMemorySlot("Bloc local manuel", "manual");
      await refreshLocal();
      setMessage(`Bloc local créé : ${scoreLabel(slot.summary)}.`);
    } catch (e: any) {
      setMessage(e?.message || "Création du bloc local impossible.");
    } finally { setBusy(""); }
  }

  async function handleCreateNas() {
    const ok = window.confirm("Créer une nouvelle sauvegarde NAS versionnée maintenant ? Elle sera ajoutée aux 10 derniers slots NAS.");
    if (!ok) return;
    setBusy("create-nas");
    try {
      const res: any = await createNasVersionedSnapshot();
      await refreshNas();
      setMessage(`Sauvegarde NAS créée. ${res?.summary ? scoreLabel(res.summary as any) : ""}`);
    } catch (e: any) {
      setMessage(e?.message || "Création sauvegarde NAS impossible.");
    } finally { setBusy(""); }
  }

  async function handleRestoreLocal(id: string) {
    const ok = window.confirm("Restaurer ce bloc local ? Un bloc de sécurité sera créé juste avant, puis l’app rechargera.");
    if (!ok) return;
    setBusy("restore-local");
    try {
      const slot = await restoreLocalMemorySlot(id);
      setMessage(`Bloc restauré : ${slot.label}. Rechargement…`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e: any) { setMessage(e?.message || "Restauration locale impossible."); setBusy(""); }
  }

  async function handleDeleteLocal(id: string) {
    const ok = window.confirm("Supprimer ce bloc local de sécurité ?");
    if (!ok) return;
    setBusy("delete-local");
    try { await deleteLocalMemorySlot(id); await refreshLocal(); setMessage("Bloc supprimé."); }
    catch (e: any) { setMessage(e?.message || "Suppression impossible."); }
    finally { setBusy(""); }
  }

  async function handlePreviewNas(id: string) {
    setBusy(`preview-nas:${id}`);
    try {
      const pulled = await pullNasMemorySlot(id);
      setNasSlots((prev) => prev.map((s) => s.id === id ? { ...s, summary: pulled.summary, version: pulled.slot.version ?? s.version, updatedAt: pulled.slot.updatedAt ?? s.updatedAt } : s));
      setMessage(`Slot NAS lu : ${scoreLabel(pulled.summary)}.`);
    } catch (e: any) {
      setMessage(e?.message || "Lecture du slot NAS impossible.");
    } finally { setBusy(""); }
  }

  async function handleRestoreNas(id: string) {
    const ok = window.confirm("Restaurer cette sauvegarde NAS ? Un bloc local de sécurité sera créé avant restauration. Le NAS actif sera replacé sur ce slot si le backend le permet.");
    if (!ok) return;
    setBusy("restore-nas");
    try {
      const res = await restoreNasMemorySlot(id);
      setMessage(`NAS restauré : ${scoreLabel(res.summary)}. Rechargement…`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e: any) { setMessage(e?.message || "Restauration NAS impossible."); setBusy(""); }
  }

  async function handleExportSlot(slot: MemorySlot) {
    await exportJsonDownload(slot.payload, `multisports_bloc_local_${slot.createdAt.replace(/[:.]/g, "-")}.json`);
  }

  const filteredBlocks = blocks.filter((b) => {
    if (filter === "all") return true;
    if (filter === "matches") return Math.max(b.summary.matches, b.summary.historyRows) > 0;
    if (filter === "profiles") return b.summary.profiles > 0;
    if (filter === "stats") return b.summary.statsBlocks > 0;
    return b.source === filter;
  });

  const localTotals = React.useMemo(() => blocks.reduce((acc, b) => {
    acc.matches += Math.max(b.summary.matches || 0, b.summary.historyRows || 0);
    acc.profiles = Math.max(acc.profiles, b.summary.profiles || 0);
    acc.bytes += b.summary.bytes || 0;
    return acc;
  }, { matches: 0, profiles: 0, bytes: 0 }), [blocks]);

  return (
    <div className="sv-root">
      <style>{css}</style>
      <header className="sv-header">
        <button className="sv-back" onClick={() => go?.("settings")}>‹</button>
        <div>
          <h1>Carte mémoire</h1>
          <p>LocalStorage · IndexedDB · NAS · restaurations versionnées</p>
        </div>
      </header>

      <section className="sv-hero">
        <div>
          <div className="sv-kicker">COFFRE DE SAUVEGARDES</div>
          <h2>Voir où tes parties sont réellement stockées</h2>
          <p>Cette page scanne les blocs locaux et les slots NAS comme une carte mémoire de console. Avant chaque restauration, elle crée un bloc local de secours.</p>
        </div>
        <div className="sv-hero-stats">
          <span><b>{filteredBlocks.length}</b> blocs</span>
          <span><b>{localTotals.matches}</b> traces parties</span>
          <span><b>{localTotals.profiles}</b> profils max</span>
          <span><b>{fmtBytes(localTotals.bytes)}</b> local lu</span>
        </div>
      </section>

      <div className="sv-toolbar">
        <button className="sv-btn" disabled={!!busy} onClick={refreshLocal}>Scanner local</button>
        <button className="sv-btn" disabled={!!busy} onClick={refreshNas}>Scanner NAS</button>
        <button className="sv-btn sv-primary" disabled={!!busy} onClick={handleCreateLocal}>Créer bloc local</button>
        <button className="sv-btn sv-primary" disabled={!!busy} onClick={handleCreateNas}>Créer sauvegarde NAS</button>
      </div>

      <div className="sv-filters">
        {[
          ["all", "Tout"], ["matches", "Parties"], ["profiles", "Profils"], ["stats", "Stats"], ["localStorage", "LocalStorage"], ["indexedDB", "IndexedDB"],
        ].map(([id, label]) => (
          <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {message && <div className="sv-message">{busy ? "⏳ " : ""}{message || busy}</div>}
      {busy && !message && <div className="sv-message">⏳ Traitement : {busy}</div>}

      <section className="sv-section">
        <h2>Slots locaux de secours</h2>
        <p className="sv-note">Ces blocs sont stockés dans IndexedDB séparé <b>dc_memory_card_v1</b>, limite automatique : 10 derniers.</p>
        {slots.length === 0 ? <div className="sv-empty">Aucun bloc local manuel pour l’instant.</div> : (
          <div className="sv-grid">{slots.map((slot) => <LocalSlotCard key={slot.id} slot={slot} onRestore={handleRestoreLocal} onDelete={handleDeleteLocal} onExport={handleExportSlot} />)}</div>
        )}
      </section>

      <section className="sv-section">
        <h2>Sauvegardes NAS versionnées</h2>
        <p className="sv-note">Le backend patché garde jusqu’à <b>10 versions NAS</b>. “Lire contenu” analyse le slot sans restaurer.</p>
        {nasSlots.length === 0 ? <div className="sv-empty">Aucun slot NAS listé ou backend pas encore patché.</div> : (
          <div className="sv-grid">{nasSlots.map((slot) => <NasSlotCard key={slot.id} slot={slot} onPreview={handlePreviewNas} onRestore={handleRestoreNas} />)}</div>
        )}
      </section>

      <section className="sv-section">
        <h2>Blocs détectés sur l’appareil</h2>
        {filteredBlocks.length === 0 ? <div className="sv-empty">Aucun bloc correspondant au filtre.</div> : (
          <div className="sv-grid">{filteredBlocks.slice(0, 160).map((block) => <BlockCard key={block.id} block={block} />)}</div>
        )}
      </section>
    </div>
  );
}

const css = `
.sv-root{min-height:100vh;background:radial-gradient(circle at top,#13243c 0,#06070b 42%,#020204 100%);color:#f7fbff;padding:14px 14px 80px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sv-header{display:flex;align-items:center;gap:12px;max-width:1120px;margin:0 auto 14px}.sv-back{width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:white;font-size:34px;line-height:1;cursor:pointer}.sv-header h1{margin:0;font-size:28px;letter-spacing:.2px}.sv-header p{margin:3px 0 0;color:rgba(255,255,255,.62);font-size:13px}.sv-hero{max-width:1120px;margin:0 auto 14px;padding:16px;border-radius:24px;background:linear-gradient(135deg,rgba(21,255,240,.14),rgba(125,92,255,.12));border:1px solid rgba(103,241,255,.28);box-shadow:0 0 28px rgba(0,255,255,.12);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px}.sv-kicker{font-size:11px;color:#52faff;font-weight:900;letter-spacing:1.5px}.sv-hero h2{margin:4px 0 6px;font-size:22px}.sv-hero p{margin:0;color:rgba(255,255,255,.72);line-height:1.45}.sv-hero-stats{display:grid;grid-template-columns:repeat(2,150px);gap:8px}.sv-hero-stats span{border-radius:16px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);padding:10px;color:rgba(255,255,255,.74);font-size:12px}.sv-hero-stats b{display:block;color:white;font-size:20px}.sv-toolbar,.sv-filters{max-width:1120px;margin:0 auto 12px;display:flex;gap:8px;flex-wrap:wrap}.sv-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:9px 13px;font-weight:800;font-size:12px;letter-spacing:.3px;text-transform:uppercase;cursor:pointer}.sv-btn:disabled{opacity:.45;cursor:wait}.sv-primary{border-color:#35f6ff;box-shadow:0 0 14px rgba(53,246,255,.22);color:#9ffcff}.sv-danger{border-color:#ff4d7d;color:#ffb5c8;box-shadow:0 0 14px rgba(255,77,125,.18)}.sv-muted{opacity:.78}.sv-filters button{border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.28);color:rgba(255,255,255,.75);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:800;cursor:pointer}.sv-filters button.on{color:#081014;background:#57f6ff;border-color:#57f6ff}.sv-message{max-width:1120px;margin:0 auto 12px;border-radius:16px;padding:10px 12px;background:rgba(87,246,255,.1);border:1px solid rgba(87,246,255,.28);color:#dffeff;font-weight:700}.sv-section{max-width:1120px;margin:18px auto 0}.sv-section h2{font-size:18px;margin:0 0 6px}.sv-note{margin:0 0 10px;color:rgba(255,255,255,.62);font-size:13px;line-height:1.45}.sv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}.sv-card{border-radius:22px;background:rgba(13,19,32,.86);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 26px rgba(0,0,0,.28);padding:13px}.sv-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.sv-source{color:#51f5ff;font-size:10px;font-weight:900;letter-spacing:1.3px;text-transform:uppercase}.sv-card h3{font-size:15px;margin:4px 0 4px;word-break:break-word}.sv-card p{margin:0;color:rgba(255,255,255,.6);font-size:12px;line-height:1.35}.sv-badge-ok,.sv-badge-muted{border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap}.sv-badge-ok{background:rgba(56,255,188,.13);border:1px solid rgba(56,255,188,.36);color:#99ffd9}.sv-badge-muted{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.55)}.sv-pills{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0}.sv-pill{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);border-radius:999px;padding:6px 8px;font-size:11px;color:#fff}.sv-pill b{color:#7df7ff;margin-right:5px}.sv-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.sv-meta-grid div{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;min-width:0}.sv-meta-grid b{display:block;color:rgba(255,255,255,.46);font-size:10px;text-transform:uppercase;margin-bottom:3px}.sv-meta-grid span{display:block;color:rgba(255,255,255,.86);font-size:12px;overflow:hidden;text-overflow:ellipsis}.sv-actions-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.sv-empty{border-radius:18px;padding:18px;border:1px dashed rgba(255,255,255,.22);color:rgba(255,255,255,.55);background:rgba(255,255,255,.04)}@media(max-width:720px){.sv-root{padding-inline:10px}.sv-hero{grid-template-columns:1fr}.sv-hero-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sv-grid{grid-template-columns:1fr}.sv-meta-grid{grid-template-columns:1fr}.sv-header h1{font-size:24px}}
`;
