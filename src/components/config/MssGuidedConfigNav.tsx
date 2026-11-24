import React from "react";
import MssAwenaExplainButton from "../MssAwenaExplainButton";

/** MSS — navigation visuelle commune des configurations guidées.
 * Ce composant ne possède aucun état de jeu : le configurateur garde la main
 * sur l'étape, le mode, la restauration des paramètres et les validations. */
export function MssGuidedConfigNav({
  steps, step, selectionSummary, accent, onStepChange, onPrev, onNext,
  onComplete, onAwenaExplain, compactLikeKiller = false,
}: {
  steps: string[];
  step: number;
  selectionSummary?: string;
  accent: string;
  onStepChange: (step: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
  onAwenaExplain: () => void;
  compactLikeKiller?: boolean;
}) {
  const current = Math.min(Math.max(0, step), Math.max(0, steps.length - 1));
  const final = current === steps.length - 1;
  return (
    <section className="mss-guided-config-nav" style={{
      borderRadius: 18, border: `1px solid ${accent}55`,
      background: "rgba(9,12,24,.95)", padding: compactLikeKiller ? "10px 12px" : "13px 14px 12px", marginBottom: 14,
      boxShadow: "0 10px 26px rgba(0,0,0,.30)", minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: accent }}>{compactLikeKiller ? "Configuration" : "Configuration guidée"}</div>
          <div style={{ color: "#abb4cd", fontSize: 11, marginTop: 3, overflowWrap: "anywhere" }}>
            Étape {current + 1}/{steps.length} · {steps[current]}{selectionSummary ? ` · ${selectionSummary}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" aria-current="page" onClick={() => onStepChange(current)} style={{
            borderRadius: 999, padding: "8px 11px", color: accent, fontWeight: 900,
            border: `1px solid ${accent}`, background: `${accent}18`, cursor: "pointer", fontSize: 11,
          }}>Guidée</button>
          <button type="button" onClick={onComplete} aria-label="Passer en configuration complète" style={{
            borderRadius: 999, padding: "8px 11px", color: "#e2e6f2", fontWeight: 850,
            border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.035)", cursor: "pointer", fontSize: 11,
          }}>Complète</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: compactLikeKiller ? 5 : 6, flexWrap: "wrap", justifyContent: compactLikeKiller ? "center" : "flex-start", marginTop: compactLikeKiller ? 8 : 12, alignItems: "center" }} role="group" aria-label="Étapes de la configuration guidée">
        {steps.map((label, i) => (
          <button type="button" key={`${label}-${i}`} onClick={() => onStepChange(i)} title={label} aria-label={`Étape ${i + 1} : ${label}`} aria-current={i === current ? "step" : undefined}
            style={{ width: compactLikeKiller ? (i === current ? 29 : 20) : 34, height: compactLikeKiller ? (i === current ? 23 : 20) : 34, borderRadius: compactLikeKiller ? 9 : "50%", border: `1px solid ${i === current ? accent : "rgba(255,255,255,.13)"}`, background: i === current ? `${accent}25` : "rgba(255,255,255,.035)", color: i === current ? accent : "#aab3cb", fontSize: compactLikeKiller ? 10 : 12, fontWeight: 900, cursor: "pointer", flex: compactLikeKiller ? `0 0 ${i === current ? 29 : 20}px` : "0 0 34px" }}>
            {i + 1}
          </button>
        ))}
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,.09)", borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
        <div style={{ width: `${((current + 1) / Math.max(1, steps.length)) * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${accent},#ff8fd0)`, transition: "width .18s ease" }} />
      </div>
      {(!compactLikeKiller || current > 0) && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 11, marginBottom: 10 }}>
          <MssAwenaExplainButton onClick={onAwenaExplain} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        <button type="button" onClick={onPrev} disabled={current === 0} style={{ height: 44, minWidth: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.13)", background: "rgba(255,255,255,.035)", color: current === 0 ? "#667087" : "#fff", fontSize: 13, fontWeight: 900, cursor: current === 0 ? "default" : "pointer" }}>← Précédent</button>
        <button type="button" onClick={onNext} disabled={final} style={{ height: 44, minWidth: 0, borderRadius: 999, border: `1px solid ${accent}90`, background: final ? "rgba(255,255,255,.035)" : `${accent}18`, color: final ? "#667087" : accent, fontSize: 13, fontWeight: 900, cursor: final ? "default" : "pointer" }}>Suivant →</button>
      </div>
    </section>
  );
}

/** Choix du type de participants, iconographie proche du BottomNav MSS. */
export function MssParticipantTypeChoice({ kind, active, accent, onClick }: {
  kind: "players" | "teams"; active: boolean; accent: string; onClick: () => void;
}) {
  const label = kind === "players" ? "JOUEURS" : "ÉQUIPES";
  return <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} style={{
    minWidth: 0, width: "100%", minHeight: 112, borderRadius: 20, cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
    background: active ? `linear-gradient(145deg,${accent},#ffe3a0)` : "rgba(255,255,255,.035)",
    border: `1px solid ${accent}${active ? "" : "70"}`, color: active ? "#32343b" : accent,
    boxShadow: active ? `0 0 16px ${accent}21` : "none", padding: "13px 6px",
  }}>
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "players" ? <><circle cx="12" cy="7" r="3"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></> : <><circle cx="6.6" cy="8.5" r="2.3"/><circle cx="12" cy="6.5" r="2.6"/><circle cx="17.4" cy="8.5" r="2.3"/><path d="M2 20v-1.5a4.6 4.6 0 0 1 6.7-4.1M6.5 20v-1.2a5.5 5.5 0 0 1 11 0V20M15.3 14.4a4.6 4.6 0 0 1 6.7 4.1V20"/></>}
    </svg>
    <span style={{ fontSize: 12, fontWeight: 950, letterSpacing: .65 }}>{label}</span>
  </button>;
}
