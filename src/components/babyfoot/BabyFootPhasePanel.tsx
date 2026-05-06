import React from "react";
import BabyFootPenaltyBar from "../BabyFootPenaltyBar";
import type { BabyFootState, BabyFootTeamId } from "../../lib/babyfootStore";

type Props = {
  state: BabyFootState;
  lastGoalLabel: string;
  liveContext: string[];
  onPenaltyShot: (team: BabyFootTeamId, scored: boolean) => void;
};

function badge(label: string, accent = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: accent ? "1px solid rgba(255,210,74,0.16)" : "1px solid rgba(255,255,255,0.08)",
    background: accent ? "rgba(255,210,74,0.08)" : "rgba(255,255,255,0.04)",
    color: accent ? "#fff2a8" : "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };
}

function shootButton(glow: string): React.CSSProperties {
  return {
    minHeight: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: `linear-gradient(180deg, ${glow}28, ${glow}12)`,
    color: "#fff",
    fontWeight: 1100,
    letterSpacing: 0.4,
    cursor: "pointer",
  };
}

export default function BabyFootPhasePanel({ state, lastGoalLabel, liveContext, onPenaltyShot }: Props) {
  const penalties = state.penalties;
  const isPenalties = state.phase === "penalties";

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,210,74,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: "0 14px 28px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Contexte</div>
          <div style={{ marginTop: 3, fontSize: 17, fontWeight: 1100 }}>{isPenalties ? "Séance de penalties" : state.phase === "overtime" ? "Prolongation" : "Match en cours"}</div>
        </div>
        <span style={badge(state.finished ? "Terminé" : isPenalties ? "Penalties" : state.phase === "overtime" ? "Overtime" : "Live", true)}>
          {state.finished ? "Terminé" : isPenalties ? "Penalties" : state.phase === "overtime" ? "Overtime" : "Live"}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 14,
          padding: "10px 11px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>Dernier but</div>
        <div style={{ marginTop: 5, fontSize: 15, fontWeight: 1000, lineHeight: 1.15 }}>{lastGoalLabel}</div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {liveContext.slice(0, 4).map((label, idx) => (
          <span key={`${label}-${idx}`} style={badge(label)}>{label}</span>
        ))}
      </div>

      {isPenalties ? (
        <>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <BabyFootPenaltyBar label={state.teamA} shots={penalties?.shotsA ?? 0} goals={penalties?.goalsA ?? 0} />
            <BabyFootPenaltyBar label={state.teamB} shots={penalties?.shotsB ?? 0} goals={penalties?.goalsB ?? 0} />
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => onPenaltyShot("A", true)} style={shootButton("rgba(180,255,57,0.9)")}>{state.teamA} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("B", true)} style={shootButton("rgba(255,130,184,0.9)")}>{state.teamB} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("A", false)} style={shootButton("rgba(255,255,255,0.35)")}>{state.teamA} ✕</button>
            <button type="button" onClick={() => onPenaltyShot("B", false)} style={shootButton("rgba(255,255,255,0.35)")}>{state.teamB} ✕</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
