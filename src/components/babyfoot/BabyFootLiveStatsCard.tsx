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
        borderRadius: 12,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.64 }}>{label}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: 14,
          fontWeight: 1100,
          lineHeight: 1.15,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  goalsA,
  goalsB,
  totalGoals,
  durationLabel,
  momentumLabel,
  cadenceLabel,
}: Props) {
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
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.68 }}>STATS LIVE</div>
      <div style={{ marginTop: 3, fontSize: 16, fontWeight: 1100 }}>Lecture rapide</div>

      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 7 }}>
        {statBlock("Répartition", `${goalsA}–${goalsB}`)}
        {statBlock("Buts", String(totalGoals))}
        {statBlock("Temps", durationLabel)}
        {statBlock("Cadence", cadenceLabel || momentumLabel)}
      </div>
    </div>
  );
}
