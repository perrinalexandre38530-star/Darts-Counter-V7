import React from "react";
import type { BabyFootRichStats } from "../../lib/babyfootRichStats";
import type { BabyFootCompareMode, BabyFootStatRow } from "../../lib/babyfootStatSections";
import { buildBabyFootStatSections } from "../../lib/babyfootStatSections";

type Props = {
  teamAName: string;
  teamBName: string;
  durationLabel: string;
  lastGoalLabel: string;
  momentumLabel: string;
  cadenceLabel: string;
  stats: BabyFootRichStats;
};

type WinnerSide = "left" | "right" | "tie" | "none";

function toNum(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getWinner(left: string | number, right: string | number, compare: BabyFootCompareMode = "high"): WinnerSide {
  if (compare === "none") return "none";
  const l = toNum(left);
  const r = toNum(right);
  if (l === r) return "tie";
  if (compare === "low") return l < r ? "left" : "right";
  return l > r ? "left" : "right";
}

function valueStyle(side: "left" | "right", isBest: boolean, accent = false): React.CSSProperties {
  const activeColor = side === "left" ? "#d9ff3f" : "#ff67bd";
  const activeGlow = side === "left" ? "rgba(210,255,73,.42)" : "rgba(255,103,189,.34)";
  return {
    minWidth: 56,
    textAlign: side === "left" ? "left" : "right",
    fontSize: accent ? 24 : 21,
    lineHeight: 1,
    fontWeight: 1100,
    color: isBest ? activeColor : "#f4f5fb",
    textShadow: isBest ? `0 0 12px ${activeGlow}` : "none",
    fontVariantNumeric: "tabular-nums",
  };
}

function underlineHalf(side: "left" | "right", active: boolean) {
  const background = active
    ? side === "left"
      ? "linear-gradient(90deg, rgba(255,207,87,0.00) 0%, rgba(214,255,62,0.95) 62%, rgba(214,255,62,0.22) 100%)"
      : "linear-gradient(270deg, rgba(255,207,87,0.00) 0%, rgba(255,103,189,0.96) 62%, rgba(255,103,189,0.22) 100%)"
    : side === "left"
      ? "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.07) 72%, rgba(255,255,255,0.02) 100%)"
      : "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.07) 72%, rgba(255,255,255,0.02) 100%)";
  const boxShadow = active
    ? side === "left"
      ? "0 0 12px rgba(214,255,62,.18)"
      : "0 0 12px rgba(255,103,189,.16)"
    : "none";

  return <div style={{ flex: 1, height: 3, borderRadius: 999, background, boxShadow }} />;
}

function statLabel(label: string, winner: WinnerSide, accent = false) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
      <div
        style={{
          textAlign: "center",
          fontSize: accent ? 13 : 12,
          fontWeight: 1000,
          letterSpacing: accent ? 0.55 : 0.15,
          color: "rgba(255,255,255,0.98)",
          textTransform: accent ? "uppercase" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: "100%",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        {underlineHalf("left", winner === "left")}
        <div style={{ width: 10, height: 3, borderRadius: 999, background: "rgba(255,255,255,.08)" }} />
        {underlineHalf("right", winner === "right")}
      </div>
    </div>
  );
}

function boardRow(row: BabyFootStatRow) {
  const winner = getWinner(row.left, row.right, row.compare);
  const leftBest = winner === "left";
  const rightBest = winner === "right";
  return (
    <div
      key={row.label}
      style={{
        display: "grid",
        gridTemplateColumns: "70px minmax(0,1fr) 70px",
        gap: 10,
        alignItems: "center",
        padding: "9px 2px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={valueStyle("left", leftBest, row.accent)}>{row.left}</div>
      {statLabel(row.label, winner, row.accent)}
      <div style={{ ...valueStyle("right", rightBest, row.accent), justifySelf: "end" }}>{row.right}</div>
    </div>
  );
}

function sectionHeader(label: string) {
  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 4,
        padding: "5px 10px",
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(41,74,255,0.98), rgba(66,111,255,0.56))",
        boxShadow: "0 0 16px rgba(62,104,255,0.28)",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 1100,
        letterSpacing: 1.2,
        color: "#fff",
        textTransform: "uppercase",
      }}
    >
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
      <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 15, fontWeight: 1000, lineHeight: 1.15, color: valueColor || "#fff" }}>{value}</div>
    </div>
  );
}

function sideLegend(name: string, color: string, align: "left" | "right") {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "flex-end", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.1, color, textTransform: "uppercase" }}>{align === "left" ? "Joueur A" : "Joueur B"}</div>
      <div style={{ fontSize: 17, fontWeight: 1100, color, lineHeight: 1.05, textAlign: align, textShadow: `0 0 10px ${align === 'left' ? 'rgba(199,255,38,.22)' : 'rgba(255,89,176,.20)'}` }}>{name}</div>
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
  const sections = buildBabyFootStatSections(stats);

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
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.1, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>Statistiques</div>
          <div style={{ marginTop: 5, fontSize: 19, fontWeight: 1100 }}>Lecture rapide</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{teamAName} vs {teamBName}</div>
        </div>
        {sideLegend(teamBName, "#ff59b0", "right")}
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          padding: "6px 14px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(4,8,20,0.78), rgba(2,5,14,0.92))",
          boxShadow: "inset 0 0 0 1px rgba(56,88,220,0.08)",
        }}
      >
        {sections.map((section) => (
          <React.Fragment key={section.key}>
            {sectionHeader(section.title)}
            {section.rows.map((row) => boardRow(row))}
          </React.Fragment>
        ))}
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
