import React from "react";
import type { BabyFootRichStats } from "../../lib/babyfootRichStats";

type Props = {
  teamAName: string;
  teamBName: string;
  durationLabel: string;
  lastGoalLabel: string;
  momentumLabel: string;
  cadenceLabel: string;
  stats: BabyFootRichStats;
};

function boardRow(label: string, left: string | number, right: string | number, accent = false) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "68px minmax(0,1fr) 68px",
        gap: 10,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ textAlign: "center", fontSize: accent ? 22 : 18, fontWeight: 1100, color: "#c7ff26" }}>{left}</div>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 1000, letterSpacing: 0.3, color: "rgba(255,255,255,0.96)", textTransform: accent ? "uppercase" : "none" }}>{label}</div>
      <div style={{ textAlign: "center", fontSize: accent ? 22 : 18, fontWeight: 1100, color: "#ff59b0" }}>{right}</div>
    </div>
  );
}

function sectionTitle(label: string) {
  return (
    <div style={{ marginTop: 12, marginBottom: 6, textAlign: "center", fontSize: 11, fontWeight: 1000, letterSpacing: 1.2, color: "rgba(255,255,255,0.56)", textTransform: "uppercase" }}>
      {label}
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
      <div style={{ marginTop: 6, fontSize: 15, fontWeight: 1000, lineHeight: 1.15, color: valueColor || "#fff" }}>{value}</div>
    </div>
  );
}

function sideLegend(name: string, color: string, align: "left" | "right") {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "flex-end", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.1, color, textTransform: "uppercase" }}>{align === "left" ? "Joueur A" : "Joueur B"}</div>
      <div style={{ fontSize: 17, fontWeight: 1100, color, lineHeight: 1.05, textAlign: align }}>{name}</div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  teamAName,
  teamBName,
  durationLabel,
  lastGoalLabel,
  momentumLabel,
  cadenceLabel,
  stats,
}: Props) {
  const topRows = [
    boardRow("Sets", stats.teamA.sets, stats.teamB.sets, true),
    boardRow("Legs", stats.teamA.legs, stats.teamB.legs),
    boardRow("Buts", stats.teamA.goals, stats.teamB.goals),
    boardRow("Moy. buts / leg", stats.teamA.avgGoalsPerLeg.toFixed(1), stats.teamB.avgGoalsPerLeg.toFixed(1)),
  ];

  const specialRows = [
    boardRow("Gamelle", stats.teamA.gamelle, stats.teamB.gamelle),
    boardRow("Pêche", stats.teamA.peche, stats.teamB.peche),
    boardRow("Demi", stats.teamA.demi, stats.teamB.demi),
    boardRow("Pissette", stats.teamA.pissette, stats.teamB.pissette),
  ];

  const impactRows = [
    boardRow("Pêche off.", stats.teamA.pecheOff, stats.teamB.pecheOff),
    boardRow("Pêche déf.", stats.teamA.pecheDef, stats.teamB.pecheDef),
    boardRow("Bonus demi", stats.teamA.demiBonus, stats.teamB.demiBonus),
    boardRow("Pénalties", stats.teamA.penalties, stats.teamB.penalties),
    boardRow("Handicap", stats.teamA.handicap, stats.teamB.handicap),
    boardRow("Diff. buts", stats.teamA.goalDiff, stats.teamB.goalDiff),
  ];

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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 12, alignItems: "end" }}>
        {sideLegend(teamAName, "#c7ff26", "left")}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>Statistiques</div>
          <div style={{ marginTop: 5, fontSize: 19, fontWeight: 1100 }}>Lecture rapide du match</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{teamAName} vs {teamBName}</div>
        </div>
        {sideLegend(teamBName, "#ff59b0", "right")}
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          padding: "0 14px 4px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(4,8,20,0.78), rgba(2,5,14,0.92))",
          boxShadow: "inset 0 0 0 1px rgba(56,88,220,0.08)",
        }}
      >
        {sectionTitle("Match")}
        {topRows}
        {sectionTitle("Coups spéciaux")}
        {specialRows}
        {sectionTitle("Impact")}
        {impactRows.map((row, idx) => React.cloneElement(row, { key: `impact-${idx}` }))}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {infoCard("Temps", durationLabel)}
        {infoCard("Cadence", cadenceLabel)}
        {infoCard("Dernier but", lastGoalLabel)}
        {infoCard("Momentum", momentumLabel, "#c7ff26")}
      </div>
    </div>
  );
}
