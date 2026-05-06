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
  setsEnabled?: boolean;
  setsA?: number;
  setsB?: number;
  handicapA?: number;
  handicapB?: number;
  penaltiesA?: number;
  penaltiesB?: number;
};

function row(label: string, left: string | number, right: string | number) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "56px minmax(0,1fr) 56px",
        gap: 8,
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 1100, color: "#9dff57" }}>{left}</div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 1000, opacity: 0.9 }}>{label}</div>
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 1100, color: "#ff82b8" }}>{right}</div>
    </div>
  );
}

function meta(label: string, value: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 12,
        padding: "10px 11px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.62, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000, lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  teamAName,
  teamBName,
  goalsA,
  goalsB,
  durationLabel,
  lastGoalLabel,
  momentumLabel,
  cadenceLabel,
  setsEnabled = false,
  setsA = 0,
  setsB = 0,
  handicapA = 0,
  handicapB = 0,
  penaltiesA = 0,
  penaltiesB = 0,
}: Props) {
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
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.66, textTransform: "uppercase" }}>Statistiques</div>
        <div style={{ marginTop: 3, fontSize: 17, fontWeight: 1100 }}>Lecture rapide du match</div>
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.72 }}>{teamAName} vs {teamBName}</div>
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          padding: "2px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.16)",
        }}
      >
        {row("Buts", goalsA, goalsB)}
        {setsEnabled ? row("Sets", setsA, setsB) : row("Handicap", handicapA, handicapB)}
        {row("Penalties", penaltiesA, penaltiesB)}
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
        {meta("Temps", durationLabel)}
        {meta("Cadence", cadenceLabel)}
        {meta("Dernier but", lastGoalLabel)}
        {meta("Momentum", momentumLabel)}
      </div>
    </div>
  );
}
