import React from "react";

function labelFor(key: string) {
  switch (key) {
    case "training_first_finish":
      return "1ère partie";
    case "training_10_plays":
      return "10 parties";
    case "training_tier_S":
      return "Tier S";
    case "timeattack_sub45s":
      return "TA < 45s";
    default:
      return key;
  }
}

export default function TrainingBadgesStrip({ badges }: { badges: any[] }) {
  if (!badges?.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {badges.slice(0, 12).map((b, idx) => (
        <span
          key={(b.badge_key || idx) + ":" + idx}
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}
          title={b.badge_key}
        >
          {labelFor(b.badge_key)}
        </span>
      ))}
    </div>
  );
}
