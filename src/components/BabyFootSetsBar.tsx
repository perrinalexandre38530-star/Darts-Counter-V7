import React from "react";

type Props = {
  setsA: number;
  setsB: number;
  bestOf: number;
  currentSet?: number;
  teamAName?: string;
  teamBName?: string;
};

export default function BabyFootSetsBar({
  setsA,
  setsB,
  bestOf,
  currentSet = 1,
}: Props) {
  const total = Math.max(1, bestOf);
  const needed = Math.floor(total / 2) + 1;
  const safeSetsA = Math.max(0, setsA);
  const safeSetsB = Math.max(0, setsB);
  const activeIndex = Math.max(0, Math.min(total - 1, currentSet - 1));

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 16px 34px rgba(0,0,0,0.26)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.68 }}>SETS</div>
          <div style={{ marginTop: 3, fontSize: 18, fontWeight: 1100 }}>{safeSetsA}–{safeSetsB}</div>
        </div>

        <div
          style={{
            borderRadius: 999,
            padding: "7px 10px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            fontSize: 12,
            fontWeight: 1000,
            whiteSpace: "nowrap",
          }}
        >
          BO{total} • win {needed}
        </div>

        <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.8 }}>
          Set {Math.min(total, Math.max(1, currentSet))}/{total}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {Array.from({ length: total }).map((_, index) => {
          const filledByA = index < safeSetsA;
          const filledByB = index >= total - safeSetsB;
          const isActive = index === activeIndex && !filledByA && !filledByB && safeSetsA + safeSetsB < total;
          return (
            <div
              key={index}
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                border: isActive ? "1px solid rgba(255,255,255,0.24)" : "1px solid rgba(255,255,255,0.12)",
                background: filledByA
                  ? "linear-gradient(180deg, rgba(124,255,196,0.42), rgba(124,255,196,0.16))"
                  : filledByB
                  ? "linear-gradient(180deg, rgba(255,130,184,0.42), rgba(255,130,184,0.16))"
                  : isActive
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.06)",
                boxShadow: filledByA
                  ? "0 0 12px rgba(124,255,196,0.20)"
                  : filledByB
                  ? "0 0 12px rgba(255,130,184,0.20)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
