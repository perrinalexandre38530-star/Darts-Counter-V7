import React from "react";

type Props = { setsA: number; setsB: number; bestOf: number };

export default function BabyFootSetsBar({ setsA, setsB, bestOf }: Props) {
  const total = Math.max(1, bestOf);
  const needed = Math.floor(total / 2) + 1;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 30,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.10)",
          fontWeight: 950,
          letterSpacing: 0.7,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        SETS {setsA}–{setsB} (BO{bestOf}) • à {needed}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: needed }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: i < setsA ? "rgba(124,255,196,0.22)" : i < setsB ? "rgba(255,102,204,0.20)" : "rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
