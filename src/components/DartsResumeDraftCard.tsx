import React from "react";
import type { DartsDraftMode } from "../lib/dartsMatchDrafts";
import { clearDartsMatchDraft, readDartsMatchDraft, hasUnassignedLegacyDartsMatchDraft, claimLegacyDartsMatchDraft } from "../lib/dartsMatchDrafts";
import { getStorageUser } from "../lib/storage";

const TITLES: Record<DartsDraftMode, string> = {
  five_lives: "LES 5 VIES", chase: "CHASE", halve_it: "HALVE-IT", split_score: "SPLIT SCORE",
};

/** Reprise explicite : une nouvelle partie ne doit jamais écraser silencieusement un brouillon. */
export default function DartsResumeDraftCard({ mode, onResume, accent = "#f5c56b" }: {
  mode: DartsDraftMode;
  onResume: (config: Record<string, any>) => void;
  accent?: string;
}) {
  const scope = getStorageUser();
  const [draft, setDraft] = React.useState(() => readDartsMatchDraft(mode, scope));
  const [legacy, setLegacy] = React.useState(() => hasUnassignedLegacyDartsMatchDraft(mode, scope));
  React.useEffect(() => {
    setDraft(readDartsMatchDraft(mode, scope));
    setLegacy(hasUnassignedLegacyDartsMatchDraft(mode, scope));
  }, [mode, scope]);
  if (!draft && !legacy) return null;
  if (!draft && legacy) return <section role="status" style={{ margin: "10px 8px", padding: 12, borderRadius: 14, border: `1px solid ${accent}88`, background: "rgba(12,20,30,.96)", display: "grid", gap: 9 }}>
    <strong style={{ color: accent, fontSize: 12 }}>ANCIENNE PARTIE {TITLES[mode]} DÉTECTÉE</strong>
    <span style={{ color: "#d1d5db", fontSize: 11 }}>Ce brouillon date d'avant la séparation des comptes. Il n'a pas de propriétaire enregistré. Récupère-le uniquement s'il t'appartient.</span>
    <button type="button" onClick={() => {
      if (!window.confirm("Ce brouillon n'est pas attribué à un compte. Confirmer qu'il t'appartient et le transférer à ce compte ?")) return;
      if (claimLegacyDartsMatchDraft(mode, scope)) { setDraft(readDartsMatchDraft(mode, scope)); setLegacy(false); }
      else window.alert("Impossible de récupérer le brouillon. L'original est conservé.");
    }} style={{ borderRadius: 12, padding: "10px 12px", border: `1px solid ${accent}`, color: "#090d14", background: accent, fontWeight: 900 }}>RÉCUPÉRER L'ANCIENNE PARTIE</button>
  </section>;
  const date = new Date(draft.savedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  return <section style={{ margin: "10px 8px", padding: 12, borderRadius: 14, border: `1px solid ${accent}88`, background: "rgba(12,20,30,.96)", display: "grid", gap: 9 }}>
    <div style={{ color: accent, fontWeight: 950, fontSize: 12 }}>PARTIE {TITLES[mode]} À REPRENDRE</div>
    <div style={{ color: "#d1d5db", fontSize: 11 }}>Sauvegardée sur cet appareil le {date}. Reprends au même joueur, avec les scores et les fléchettes déjà saisis.</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => onResume(draft.config)} style={{ flex: "1 1 150px", borderRadius: 12, padding: "10px 12px", border: `1px solid ${accent}`, color: "#090d14", background: accent, fontWeight: 1000, cursor: "pointer" }}>▶ REPRENDRE</button>
      <button type="button" onClick={() => { if (window.confirm(`Supprimer la partie ${TITLES[mode]} non terminée ?`)) { clearDartsMatchDraft(mode, scope); setDraft(null); } }} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.20)", color: "#f4c4c8", background: "rgba(255,255,255,.05)", cursor: "pointer" }}>Abandonner</button>
    </div>
  </section>;
}
