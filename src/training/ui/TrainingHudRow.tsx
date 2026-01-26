// ============================================
// src/training/ui/TrainingHudRow.tsx
// Ligne HUD (chips néon) — cohérent X01/Killer
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

function Pill({ label, value }: { label: string; value: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 14,
        padding: "10px 12px",
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.45)",
        boxShadow: `0 0 14px ${theme.primary}22`,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 0.8, opacity: 0.75, fontWeight: 900 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ marginTop: 4, fontWeight: 900, fontSize: 16, color: theme.primary }}>
        {value}
      </div>
    </div>
  );
}

export default function TrainingHudRow({
  left,
  mid,
  right,
}: {
  left: { label: string; value: React.ReactNode };
  mid?: { label: string; value: React.ReactNode } | null;
  right?: { label: string; value: React.ReactNode } | null;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <Pill label={left.label} value={left.value} />
      {mid ? <Pill label={mid.label} value={mid.value} /> : null}
      {right ? <Pill label={right.label} value={right.value} /> : null}
    </div>
  );
}
