import React from "react";
import type { BabyFootRichStats } from "../../lib/babyfootRichStats";
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

function neonValue(value: string | number, side: "left" | "right", accent = false) {
  const color = side === "left" ? "#c7ff26" : "#ff59b0";
  const glow = side === "left"
    ? "rgba(199,255,38,.46)"
    : "rgba(255,89,176,.44)";
  const bar = side === "left"
    ? "linear-gradient(90deg, rgba(199,255,38,.95), rgba(246,194,86,.72))"
    : "linear-gradient(90deg, rgba(255,89,176,.78), rgba(136,94,255,.95))";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: side === "left" ? "flex-start" : "flex-end", gap: 5 }}>
      <div
        style={{
          minWidth: 58,
          textAlign: side === "left" ? "left" : "right",
          fontSize: accent ? 26 : 22,
          lineHeight: 1,
          fontWeight: 1100,
          color,
          textShadow: `0 0 10px ${glow}`,
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: accent ? 40 : 34,
          height: 4,
          borderRadius: 999,
          background: bar,
          boxShadow: `0 0 10px ${glow}`,
        }}
      />
    </div>
  );
}

function boardRow(label: string, left: string | number, right: string | number, accent = false) {
  return (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "76px minmax(0,1fr) 76px",
        gap: 10,
        alignItems: "center",
        padding: "10px 2px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {neonValue(left, "left", accent)}
      <div
        style={{
          textAlign: "center",
          fontSize: accent ? 14 : 13,
          fontWeight: 1000,
          letterSpacing: accent ? 0.8 : 0.2,
          color: "rgba(255,255,255,0.98)",
          textTransform: accent ? "uppercase" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>{neonValue(right, "right", accent)}</div>
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
            {section.rows.map((row) => boardRow(row.label, row.left, row.right, row.accent))}
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
