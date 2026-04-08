import React from "react";
import BabyFootPenaltyBar from "../BabyFootPenaltyBar";
import type { BabyFootState, BabyFootTeamId } from "../../lib/babyfootStore";

type Props = {
  state: BabyFootState;
  lastGoalLabel: string;
  liveContext: string[];
  onPenaltyShot: (team: BabyFootTeamId, scored: boolean) => void;
};

function infoPill(label: string) {
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
        opacity: 0.86,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function penaltyAction(emphasized: boolean): React.CSSProperties {
  return {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: emphasized
      ? "linear-gradient(180deg, rgba(124,255,196,0.24), rgba(124,255,196,0.10))"
      : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 1100,
    letterSpacing: 0.4,
    cursor: "pointer",
  };
}

export default function BabyFootPhasePanel({ state, lastGoalLabel, liveContext, onPenaltyShot }: Props) {
  const pen = state.penalties;

  if (state.phase === "penalties") {
    const turn = pen?.turn ?? "A";
    return (
      <div
        style={{
          borderRadius: 18,
          padding: 10,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
          boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.68 }}>PHASE</div>
            <div style={{ marginTop: 3, fontSize: 16, fontWeight: 1100 }}>PENALTIES</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.84 }}>Tour • {turn === "A" ? state.teamA : state.teamB}</div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
          <BabyFootPenaltyBar label={state.teamA} shots={pen?.shotsA ?? 0} goals={pen?.goalsA ?? 0} />
          <BabyFootPenaltyBar label={state.teamB} shots={pen?.shotsB ?? 0} goals={pen?.goalsB ?? 0} />
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          <button type="button" onClick={() => onPenaltyShot("A", true)} style={penaltyAction(true)}>
            {state.teamA} ✓
          </button>
          <button type="button" onClick={() => onPenaltyShot("A", false)} style={penaltyAction(false)}>
            {state.teamA} ✕
          </button>
          <button type="button" onClick={() => onPenaltyShot("B", true)} style={penaltyAction(true)}>
            {state.teamB} ✓
          </button>
          <button type="button" onClick={() => onPenaltyShot("B", false)} style={penaltyAction(false)}>
            {state.teamB} ✕
          </button>
        </div>
      </div>
    );
  }

  const liveTitle = state.phase === "overtime" ? "PROLONGATION" : state.finished ? "MATCH TERMINÉ" : "CONTEXTE";
  const compactContext = liveContext.slice(0, 3);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.68 }}>PHASE</div>
      <div style={{ marginTop: 3, fontSize: 16, fontWeight: 1100 }}>{liveTitle}</div>

      <div
        style={{
          marginTop: 9,
          borderRadius: 12,
          padding: "9px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.66 }}>DERNIER BUT</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            fontWeight: 1000,
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {lastGoalLabel}
        </div>
      </div>

      <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>{compactContext.map(infoPill)}</div>
    </div>
  );
}
