import React from "react";
import type { BabyFootRichStats } from "../../lib/babyfootRichStats";
import type { BabyFootCompareMode, BabyFootStatRow } from "../../lib/babyfootStatSections";
import { buildBabyFootStatSections } from "../../lib/babyfootStatSections";

type Props = {
  teamAName: string;
  teamBName: string;
  teamAImageSrc?: string | null;
  teamBImageSrc?: string | null;
  goalsA?: number;
  goalsB?: number;
  totalGoals?: number;
  durationLabel: string;
  lastGoalLabel: string;
  momentumLabel: string;
  cadenceLabel: string;
  stats: BabyFootRichStats;
};

type WinnerSide = "left" | "right" | "tie" | "none";
const STATS_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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

function initials(name: string) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");
}

function avatarCircle(name: string, color: string, imageSrc?: string | null) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        border: `2px solid ${color}`,
        boxShadow: `0 0 16px ${color}55`,
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.30), ${color}cc 62%, rgba(5,7,18,.96) 100%)`,
        fontFamily: STATS_FONT,
        fontSize: 16,
        fontWeight: 1100,
        color: "#fff",
      }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function valueStyle(side: "left" | "right", isBest: boolean, accent = false): React.CSSProperties {
  const activeColor = side === "left" ? "#d9ff3f" : "#ff67bd";
  const activeGlow = side === "left" ? "rgba(210,255,73,.44)" : "rgba(255,103,189,.36)";
  return {
    minWidth: 78,
    textAlign: side === "left" ? "left" : "right",
    fontSize: accent ? 26 : 22,
    lineHeight: 1,
    fontWeight: 1100,
    fontFamily: STATS_FONT,
    color: isBest ? activeColor : "#f7f8fe",
    textShadow: isBest ? `0 0 14px ${activeGlow}` : "none",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: 0.2,
  };
}

function barStyle(side: "left" | "right", active: boolean): React.CSSProperties {
  const background = active
    ? side === "left"
      ? "linear-gradient(90deg, rgba(214,255,62,1) 0%, rgba(214,255,62,.78) 35%, rgba(214,255,62,0) 100%)"
      : "linear-gradient(90deg, rgba(255,103,189,0) 0%, rgba(255,103,189,.78) 65%, rgba(255,103,189,1) 100%)"
    : side === "left"
      ? "linear-gradient(90deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.06) 35%, rgba(255,255,255,0) 100%)"
      : "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.06) 65%, rgba(255,255,255,.14) 100%)";
  const boxShadow = active
    ? side === "left"
      ? "0 0 14px rgba(214,255,62,.26)"
      : "0 0 14px rgba(255,103,189,.24)"
    : "none";
  return { height: 4, borderRadius: 999, background, boxShadow };
}

function statLabel(label: string) {
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: 12,
        fontWeight: 1000,
        fontFamily: STATS_FONT,
        letterSpacing: 0.1,
        color: "rgba(255,255,255,0.98)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        width: "100%",
      }}
    >
      {label}
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
        padding: "8px 0 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "78px minmax(0,1fr) 78px", gap: 8, alignItems: "center" }}>
        <div style={valueStyle("left", leftBest, row.accent)}>{row.left}</div>
        {statLabel(row.label)}
        <div style={{ ...valueStyle("right", rightBest, row.accent), justifySelf: "end" }}>{row.right}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 26px 1fr", gap: 0, alignItems: "center", marginTop: 4 }}>
        <div style={barStyle("left", leftBest)} />
        <div />
        <div style={barStyle("right", rightBest)} />
      </div>
    </div>
  );
}

function sectionHeader(label: string) {
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 3,
        padding: "5px 10px",
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(41,74,255,0.98), rgba(66,111,255,0.56))",
        boxShadow: "0 0 16px rgba(62,104,255,0.28)",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 1100,
        fontFamily: STATS_FONT,
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
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 1000, fontFamily: STATS_FONT, letterSpacing: 0.8, color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 15, fontWeight: 1000, fontFamily: STATS_FONT, lineHeight: 1.12, color: valueColor || "#fff" }}>{value}</div>
    </div>
  );
}

function playerHeader(name: string, color: string, sideLabel: string, imageSrc?: string | null) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
      {avatarCircle(name, color, imageSrc)}
      <div style={{ fontSize: 10, fontWeight: 1000, fontFamily: STATS_FONT, letterSpacing: 0.9, color, textTransform: "uppercase" }}>{sideLabel}</div>
      <div style={{ fontSize: 16, fontWeight: 1100, fontFamily: STATS_FONT, color, lineHeight: 1.02, textAlign: "center", textShadow: `0 0 10px ${color}44`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 108 }}>{name}</div>
    </div>
  );
}

export default function BabyFootLiveStatsCard({
  teamAName,
  teamBName,
  teamAImageSrc,
  teamBImageSrc,
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
        padding: 14,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "108px minmax(0,1fr) 108px", gap: 10, alignItems: "end" }}>
        {playerHeader(teamAName, "#c7ff26", "Joueur A", teamAImageSrc)}
        <div style={{ textAlign: "center", alignSelf: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 1100, fontFamily: STATS_FONT, letterSpacing: 1.3, color: "#fff", textTransform: "uppercase", textShadow: "0 0 12px rgba(255,255,255,.16)" }}>STATS</div>
        </div>
        {playerHeader(teamBName, "#ff59b0", "Joueur B", teamBImageSrc)}
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 18,
          padding: "6px 12px 10px",
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

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {infoCard("Temps", durationLabel)}
        {infoCard("Cadence", cadenceLabel)}
        {infoCard("Dernier but", lastGoalLabel)}
        {infoCard("Momentum", momentumLabel, "#c7ff26")}
      </div>
    </div>
  );
}
