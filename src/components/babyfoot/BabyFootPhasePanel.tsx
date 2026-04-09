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
        padding: "7px 10px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
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
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: emphasized
      ? "linear-gradient(180deg, rgba(124,255,196,0.24), rgba(124,255,196,0.10))"
      : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 1100,
    letterSpacing: 0.5,
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
          borderRadius: 20,
          padding: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
          boxShadow: "0 16px 34px rgba(0,0,0,0.26)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.68 }}>PHASE</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>PENALTIES</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.84 }}>Tour • {turn === "A" ? state.teamA : state.teamB}</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <BabyFootPenaltyBar label={state.teamA} shots={pen?.shotsA ?? 0} goals={pen?.goalsA ?? 0} />
          <BabyFootPenaltyBar label={state.teamB} shots={pen?.shotsB ?? 0} goals={pen?.goalsB ?? 0} />
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

  const liveTitle = state.phase === "overtime" ? "PROLONGATION" : state.finished ? "MATCH TERMINÉ" : "CONTEXTE LIVE";
  const compactContext = liveContext.slice(0, 4);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 16px 34px rgba(0,0,0,0.26)",
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.68 }}>PHASE</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>{liveTitle}</div>
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.16)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>DERNIER BUT</div>
          <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000 }}>{lastGoalLabel}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{compactContext.map(infoPill)}</div>
      </div>
    </div>
  );
}
