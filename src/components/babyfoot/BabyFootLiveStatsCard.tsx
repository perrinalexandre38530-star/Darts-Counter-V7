import React from "react";

type Props = {
  teamAName: string;
  teamBName: string;
  goalsA: number;
  goalsB: number;
  totalGoals: number;
  durationLabel: string;
  lastGoalLabel: string;
  momentumLabel: string;
  cadenceLabel: string;
};

function statBlock(label: string, value: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1100, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  teamAName,
  teamBName,
  goalsA,
  goalsB,
  totalGoals,
  durationLabel,
  lastGoalLabel,
  momentumLabel,
  cadenceLabel,
}: Props) {
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
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.72 }}>STATS LIVE</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>Lecture rapide du match</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>{teamAName} vs {teamBName}</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
        {statBlock("Buts totaux", String(totalGoals))}
        {statBlock("Répartition", `${goalsA}–${goalsB}`)}
        {statBlock("Temps joué", durationLabel)}
        {statBlock("Cadence", cadenceLabel)}
        {statBlock("Dernier but", lastGoalLabel)}
        {statBlock("Momentum", momentumLabel)}
      </div>
    </div>
  );
}
