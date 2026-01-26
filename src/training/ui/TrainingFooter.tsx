// ============================================
// src/training/ui/TrainingFooter.tsx
// Footer stats (score / hit% / ppm)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { TrainingStats } from "../engine/trainingStats";

function fmtPct(v: number) {
  const n = Math.round((v || 0) * 100);
  return `${n}%`;
}
function fmtNum(v: number) {
  return Math.round(v || 0).toString();
}

export default function TrainingFooter({
  stats,
  rightSlot,
}: {
  stats: TrainingStats;
  rightSlot?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.78) 35%, rgba(0,0,0,.90) 100%)",
        borderTop: `1px solid ${theme.borderSoft}`,
        zIndex: 70,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 10 }}>
          <div style={{ flex: 1, borderRadius: 14, padding: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.45)" }}>
            <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 900, letterSpacing: 0.8 }}>SCORE</div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 18, color: theme.primary }}>{fmtNum(stats.score)}</div>
          </div>
          <div style={{ flex: 1, borderRadius: 14, padding: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.45)" }}>
            <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 900, letterSpacing: 0.8 }}>HIT %</div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 18, color: theme.primary }}>{fmtPct(stats.hitRate)}</div>
          </div>
          <div style={{ flex: 1, borderRadius: 14, padding: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.45)" }}>
            <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 900, letterSpacing: 0.8 }}>PPM</div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 18, color: theme.primary }}>{fmtNum(stats.ppm)}</div>
          </div>
        </div>

        {rightSlot ? <div style={{ marginLeft: 8 }}>{rightSlot}</div> : null}
      </div>
    </div>
  );
}
