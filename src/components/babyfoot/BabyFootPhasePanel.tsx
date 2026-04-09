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
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        fontSize: 12,
        fontWeight: 1000,
        opacity: 0.86,
      }}
    >
      {label}
    </div>
  );
}

function penaltyAction(label: string, emphasized: boolean): React.CSSProperties {
  return {
    height: 46,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: emphasized
      ? "linear-gradient(180deg, rgba(124,255,196,0.25), rgba(124,255,196,0.10))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 1100,
    letterSpacing: 0.6,
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
          borderRadius: 22,
          padding: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(900px 240px at 50% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
          boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.72 }}>PHASE</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>PENALTIES</div>
          </div>
          <div
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              fontSize: 12,
              fontWeight: 1000,
            }}
          >
            Tour • {turn === "A" ? state.teamA : state.teamB}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <BabyFootPenaltyBar label={state.teamA} shots={pen?.shotsA ?? 0} goals={pen?.goalsA ?? 0} />
          <BabyFootPenaltyBar label={state.teamB} shots={pen?.shotsB ?? 0} goals={pen?.goalsB ?? 0} />
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: turn === "A" ? "rgba(124,255,196,0.08)" : "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>{state.teamA}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => onPenaltyShot("A", true)} style={penaltyAction("MARQUÉ", true)}>
                MARQUÉ
              </button>
              <button type="button" onClick={() => onPenaltyShot("A", false)} style={penaltyAction("RATÉ", false)}>
                RATÉ
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: turn === "B" ? "rgba(255,130,184,0.08)" : "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>{state.teamB}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => onPenaltyShot("B", true)} style={penaltyAction("MARQUÉ", true)}>
                MARQUÉ
              </button>
              <button type="button" onClick={() => onPenaltyShot("B", false)} style={penaltyAction("RATÉ", false)}>
                RATÉ
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>
          5 tirs de base puis mort subite automatique si égalité.
        </div>
      </div>
    );
  }

  const liveTitle = state.phase === "overtime" ? "PROLONGATION" : state.finished ? "MATCH TERMINÉ" : "CONTEXTE LIVE";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.72 }}>PHASE</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>{liveTitle}</div>
        </div>
        <div
          style={{
            borderRadius: 16,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.18)",
            fontSize: 12,
            fontWeight: 1000,
            textAlign: "right",
          }}
        >
          Dernier but<br />
          <span style={{ fontSize: 14, opacity: 0.96 }}>{lastGoalLabel}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>{liveContext.map(infoPill)}</div>
    </div>
  );
}
