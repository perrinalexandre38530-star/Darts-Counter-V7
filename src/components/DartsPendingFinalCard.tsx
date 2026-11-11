import React from "react";
import { History } from "../lib/history";
import { getStorageUser } from "../lib/storage";
import { listPendingDartsFinalResults, recoverPendingDartsFinalResult, type DartsFinalMode } from "../lib/dartsPendingFinalResults";

const LABELS: Record<DartsFinalMode, string> = {
  five_lives: "LES 5 VIES", chase: "CHASE", halve_it: "HALVE-IT", split_score: "SPLIT SCORE",
};
/** Permet de réessayer après un crash ou une erreur IndexedDB, sans rejouer la partie. */
export default function DartsPendingFinalCard({ mode, accent = "#ffd76a", onRecovered }: {
  mode: DartsFinalMode; accent?: string; onRecovered?: () => void;
}) {
  const scope = getStorageUser();
  const [item, setItem] = React.useState(() => listPendingDartsFinalResults(scope).find((x) => x.mode === mode) || null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    const update = () => setItem(listPendingDartsFinalResults(getStorageUser()).find((x) => x.mode === mode) || null);
    update();
    window.addEventListener("msc:darts-final-pending-updated", update);
    window.addEventListener("dc-history-updated", update);
    return () => {
      window.removeEventListener("msc:darts-final-pending-updated", update);
      window.removeEventListener("dc-history-updated", update);
    };
  }, [mode]);
  if (!item) return null;
  async function retry() {
    if (!item || saving) return;
    setSaving(true); setError(false);
    const ok = await recoverPendingDartsFinalResult(item.id, getStorageUser(), async (record) => {
      const saved = await History.get(item.id).catch(() => null);
      if (saved?.status === "finished") return true;
      await History.upsert(record as any);
      return true;
    });
    setSaving(false);
    if (ok) onRecovered?.();
    else setError(true);
  }
  return <section role="status" style={{ padding: 12, margin: "10px 8px", borderRadius: 14,
    border: `1px solid ${accent}99`, background: "rgba(12,20,30,.96)", color: "#f0f3fb" }}>
    <div style={{ color: accent, fontSize: 12, fontWeight: 950 }}>RÉSULTAT {LABELS[mode]} À RÉCUPÉRER</div>
    <p style={{ fontSize: 11, lineHeight: 1.5 }}>Cette partie est terminée, mais son enregistrement n'a pas encore été confirmé. Son résultat est conservé sur cet appareil.</p>
    {error && <p role="alert" style={{ fontSize: 11, color: "#ff9ba7" }}>Enregistrement impossible. Vérifie le stockage, puis réessaie.</p>}
    <button type="button" disabled={saving} onClick={retry}
      style={{ border: 0, padding: "10px 14px", borderRadius: 12, background: accent, color: "#101019", fontWeight: 950 }}>
      {saving ? "ENREGISTREMENT…" : "RÉCUPÉRER ET ENREGISTRER"}
    </button>
  </section>;
}
