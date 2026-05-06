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

function statRow(label: string, left: string | number, right: string | number, last = false) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "52px minmax(0,1fr) 52px",
        gap: 8,
        alignItems: "center",
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 24, fontWeight: 1100, color: "#b4ff39" }}>{left}</div>
      <div style={{ textAlign: "center", fontSize: 16, fontWeight: 1000, color: "rgba(255,255,255,0.96)" }}>{label}</div>
      <div style={{ textAlign: "center", fontSize: 24, fontWeight: 1100, color: "#ff5fb1" }}>{right}</div>
    </div>
  );
}

function infoCard(label: string, value: string, valueColor?: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 16,
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 0.9, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000, lineHeight: 1.15, color: valueColor || "#fff" }}>{value}</div>
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
  handicapA = 0,
  handicapB = 0,
  penaltiesA = 0,
  penaltiesB = 0,
}: Props) {
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
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>Statistiques</div>
        <div style={{ marginTop: 5, fontSize: 22, fontWeight: 1100 }}>Lecture rapide du match</div>
        <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{teamAName} vs {teamBName}</div>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          padding: "0 14px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        {statRow("Buts", goalsA, goalsB)}
        {statRow("Handicap", handicapA, handicapB)}
        {statRow("Penalties", penaltiesA, penaltiesB, true)}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {infoCard("Temps", durationLabel)}
        {infoCard("Cadence", cadenceLabel)}
        {infoCard("Dernier but", lastGoalLabel)}
        {infoCard("Momentum", momentumLabel, "#c7ff4f")}
      </div>
    </div>
  );
}
