import React from "react";
import BabyFootPenaltyBar from "../BabyFootPenaltyBar";
import type { BabyFootState, BabyFootTeamId } from "../../lib/babyfootStore";

type Props = {
  state: BabyFootState;
  lastGoalLabel: string;
  liveContext: string[];
  onPenaltyShot: (team: BabyFootTeamId, scored: boolean) => void;
};

function badge(label: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 999,
        padding: "6px 9px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 11,
        fontWeight: 1000,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function actionStyle(glow: string): React.CSSProperties {
  return {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: `linear-gradient(180deg, ${glow}33, ${glow}12)`,
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
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 14px 26px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.66, textTransform: "uppercase" }}>Contexte</div>
          <div style={{ marginTop: 3, fontSize: 16, fontWeight: 1100 }}>{isPenalties ? "Séance de penalties" : "Match en cours"}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>
          {state.finished ? "Terminé" : state.phase === "overtime" ? "Prolongation" : isPenalties ? "Tirs au but" : "Live"}
        </div>
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
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.62, textTransform: "uppercase" }}>Dernier but</div>
        <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000, lineHeight: 1.15 }}>{lastGoalLabel}</div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{liveContext.slice(0, 5).map(badge)}</div>

      {isPenalties ? (
        <>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <BabyFootPenaltyBar label={state.teamA} shots={penalties?.shotsA ?? 0} goals={penalties?.goalsA ?? 0} />
            <BabyFootPenaltyBar label={state.teamB} shots={penalties?.shotsB ?? 0} goals={penalties?.goalsB ?? 0} />
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
            <button type="button" onClick={() => onPenaltyShot("A", true)} style={actionStyle("rgba(124,255,196,0.9)")}>{state.teamA} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("A", false)} style={actionStyle("rgba(255,255,255,0.35)")}>{state.teamA} ✕</button>
            <button type="button" onClick={() => onPenaltyShot("B", true)} style={actionStyle("rgba(255,130,184,0.9)")}>{state.teamB} ✓</button>
            <button type="button" onClick={() => onPenaltyShot("B", false)} style={actionStyle("rgba(255,255,255,0.35)")}>{state.teamB} ✕</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
