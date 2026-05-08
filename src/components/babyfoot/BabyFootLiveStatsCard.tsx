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
  handicapA?: number;
  handicapB?: number;
  penaltiesA?: number;
  penaltiesB?: number;
  demiA?: number;
  demiB?: number;
  gamelleA?: number;
  gamelleB?: number;
  pecheA?: number;
  pecheB?: number;
  demiBonusA?: number;
  demiBonusB?: number;
};

function statRow(label: string, left: string | number, right: string | number, last = false) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "46px minmax(0,1fr) 46px",
        gap: 8,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 16, fontWeight: 1100, color: "#c7ff26" }}>{left}</div>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 1000, color: "rgba(255,255,255,0.96)" }}>{label}</div>
      <div style={{ textAlign: "center", fontSize: 16, fontWeight: 1100, color: "#ff59b0" }}>{right}</div>
    </div>
  );
}

function infoCard(label: string, value: string, valueColor?: string) {
  return (
    <div
      key={label}
      style={{
        borderRadius: 16,
        padding: "11px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.85, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000, lineHeight: 1.15, color: valueColor || "#fff" }}>{value}</div>
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
  demiA = 0,
  demiB = 0,
  gamelleA = 0,
  gamelleB = 0,
  pecheA = 0,
  pecheB = 0,
  demiBonusA = 0,
  demiBonusB = 0,
}: Props) {
  const rows = [
    ["Buts", goalsA, goalsB],
    ["Handicap", handicapA, handicapB],
    ["Penalties", penaltiesA, penaltiesB],
    ["Demis", demiA, demiB],
    ["Gamelles", gamelleA, gamelleB],
    ["Pêches", pecheA, pecheB],
    ["Bonus demi", demiBonusA, demiBonusB],
  ] as const;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 16px 36px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.05, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>Statistiques</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1100 }}>Lecture rapide du match</div>
        <div style={{ marginTop: 3, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{teamAName} vs {teamBName}</div>
      </div>

      <div style={{ marginTop: 12, borderRadius: 18, padding: "0 12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
        {rows.map(([label, left, right], index) => statRow(label, left, right, index === rows.length - 1))}
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {infoCard("Temps", durationLabel)}
        {infoCard("Cadence", cadenceLabel)}
        {infoCard("Dernier but", lastGoalLabel)}
        {infoCard("Momentum", momentumLabel, "#c7ff26")}
      </div>
    </div>
  );
}
