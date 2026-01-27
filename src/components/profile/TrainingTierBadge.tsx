import React from "react";

export default function TrainingTierBadge({ tier }: { tier?: string }) {
  const t = (tier || "D").toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 34,
        height: 24,
        padding: "0 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.25)",
        fontWeight: 900,
        letterSpacing: 1,
      }}
      title="Training tier"
    >
      {t}
    </span>
  );
}
