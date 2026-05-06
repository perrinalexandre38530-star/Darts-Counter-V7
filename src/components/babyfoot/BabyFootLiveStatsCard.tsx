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

function statRow(label: string, left: string | number, right: string | number) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "52px minmax(0,1fr) 52px",
        gap: 8,
        alignItems: "center",
        padding: "7px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 1100, color: "#b4ff39" }}>{left}</div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 1000, color: "rgba(255,255,255,0.88)" }}>{label}</div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 1100, color: "#ff82b8" }}>{right}</div>
    </div>
  );
}

function infoPill(label: string, value: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 12,
        padding: "10px 11px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 1000, lineHeight: 1.15 }}>{value}</div>
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
        border: "1px solid rgba(255,210,74,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: "0 14px 28px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Statistiques</div>
        <div style={{ marginTop: 3, fontSize: 21, fontWeight: 1100 }}>Lecture rapide du match</div>
        <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.70)" }}>{teamAName} vs {teamBName}</div>
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 16,
          padding: "2px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        {statRow("Buts", goalsA, goalsB)}
        {setsEnabled ? statRow("Sets", setsA, setsB) : statRow("Handicap", handicapA, handicapB)}
        {statRow("Penalties", penaltiesA, penaltiesB)}
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {infoPill("Temps", durationLabel)}
        {infoPill("Cadence", cadenceLabel)}
        {infoPill("Dernier but", lastGoalLabel)}
        {infoPill("Momentum", momentumLabel)}
      </div>
    </div>
  );
}
