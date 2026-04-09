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
        borderRadius: 16,
        padding: 11,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.64 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1100, lineHeight: 1.15, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  goalsA,
  goalsB,
  totalGoals,
  durationLabel,
  lastGoalLabel,
  momentumLabel,
}: Props) {
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
      <div>
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.68 }}>STATS LIVE</div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>Lecture rapide</div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
        {statBlock("Buts", `${totalGoals} (${goalsA}–${goalsB})`)}
        {statBlock("Temps", durationLabel)}
        {statBlock("Dernier but", lastGoalLabel)}
        {statBlock("Momentum", momentumLabel)}
      </div>
    </div>
  );
}
