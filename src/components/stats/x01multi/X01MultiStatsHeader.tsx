// ============================================================
// src/components/stats/x01multi/X01MultiStatsHeader.tsx
// Header X01 MULTI — style TrainingX01 (H1)
// ============================================================

import React from "react";
import { GoldPill } from "../../StatsPlayerDashboard";

const T = {
  gold: "#F6C256",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

const goldNeon: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  textTransform: "uppercase",
  color: T.gold,
  textShadow: "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
  letterSpacing: 0.8,
  marginBottom: 10,
};

const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
  textAlign: "center",
};

export type TimeRange = "day" | "week" | "month" | "year" | "all";

type Props = {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
};

export default function X01MultiStatsHeader({ range, onChange }: Props) {
  return (
    <div style={card}>
      {/* TITRE */}
      <div style={goldNeon}>X01 MULTI</div>

      {/* FILTRES (J/S/M/A/ALL) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          flexWrap: "nowrap",
        }}
      >
        {(["day", "week", "month", "year", "all"] as TimeRange[]).map((r) => (
          <GoldPill
            key={r}
            active={range === r}
            onClick={() => onChange(r)}
            style={{
              padding: "4px 12px",
              fontSize: 11,
              minWidth: "unset",
              whiteSpace: "nowrap",
            }}
          >
            {r === "day" && "Jour"}
            {r === "week" && "Semaine"}
            {r === "month" && "Mois"}
            {r === "year" && "Année"}
            {r === "all" && "All"}
          </GoldPill>
        ))}
      </div>
    </div>
  );
}
