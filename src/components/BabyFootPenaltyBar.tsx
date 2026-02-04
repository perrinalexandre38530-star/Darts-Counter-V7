import React from "react";

type Props = { label: string; shots: number; goals: number; max?: number };

export default function BabyFootPenaltyBar({ label, shots, goals, max = 5 }: Props) {
  const misses = Math.max(0, shots - goals);
  const filled = Math.min(max, shots);
  const remaining = Math.max(0, max - filled);

  const slots: ("goal" | "miss" | "empty")[] = [
    ...Array(Math.min(goals, max)).fill("goal"),
    ...Array(Math.min(misses, Math.max(0, max - goals))).fill("miss"),
    ...Array(remaining).fill("empty"),
  ].slice(0, max) as any;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontWeight: 950, opacity: 0.85 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {slots.map((s, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background:
                s === "goal"
                  ? "rgba(124,255,196,0.22)"
                  : s === "miss"
                  ? "rgba(255,185,185,0.20)"
                  : "rgba(255,255,255,0.06)",
              boxShadow:
                s === "goal"
                  ? "0 0 12px rgba(124,255,196,0.25)"
                  : s === "miss"
                  ? "0 0 10px rgba(255,185,185,0.20)"
                  : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
