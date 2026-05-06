import React from "react";
import BabyFootPenaltyBar from "../BabyFootPenaltyBar";
import type { BabyFootState, BabyFootTeamId } from "../../lib/babyfootStore";

type Props = {
  state: BabyFootState;
  lastGoalLabel: string;
  liveContext: string[];
  onPenaltyShot: (team: BabyFootTeamId, scored: boolean) => void;
};

function chip(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };
}

function action(glow: string): React.CSSProperties {
  return {
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: `linear-gradient(180deg, ${glow}28, ${glow}12)`,
    color: "#fff",
    fontWeight: 1100,
    letterSpacing: 0.3,
    cursor: "pointer",
  };
}

export default function BabyFootPhasePanel({ state, liveContext, onPenaltyShot }: Props) {
  const isPenalties = state.phase === "penalties";
  const statusLabel = state.finished ? "Terminé" : isPenalties ? "Live" : state.phase === "overtime" ? "Overtime" : "Live";

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1, color: "rgba(255,255,255,0.64)", textTransform: "uppercase" }}>Contexte</div>
          <div style={{ marginTop: 4, fontSize: 19, fontWeight: 1100 }}>{isPenalties ? "Séance de penalties" : state.phase === "overtime" ? "Prolongation" : "Match en cours"}</div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 36,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid rgba(199,255,38,0.20)",
            background: "rgba(199,255,38,0.08)",
            color: "#eaff84",
            fontSize: 13,
            fontWeight: 1100,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#9dff57", boxShadow: "0 0 12px rgba(157,255,87,0.46)" }} />
          {statusLabel}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {liveContext.slice(0, 3).map((entry, index) => (
          <span key={`${entry}-${index}`} style={chip()}>{entry}</span>
        ))}
      </div>

      {isPenalties ? (
        <>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <BabyFootPenaltyBar label={state.teamA} shots={state.penalties?.shotsA ?? 0} goals={state.penalties?.goalsA ?? 0} />
            <BabyFootPenaltyBar label={state.teamB} shots={state.penalties?.shotsB ?? 0} goals={state.penalties?.goalsB ?? 0} />
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => onPenaltyShot("A", true)} style={action("rgba(199,255,38,0.9)")}>{state.teamA} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("B", true)} style={action("rgba(255,89,176,0.9)")}>{state.teamB} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("A", false)} style={action("rgba(255,255,255,0.34)")}>{state.teamA} ✕</button>
            <button type="button" onClick={() => onPenaltyShot("B", false)} style={action("rgba(255,255,255,0.34)")}>{state.teamB} ✕</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
