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
  teamAName = "Équipe A",
  teamBName = "Équipe B",
}: Props) {
  const total = Math.max(1, bestOf);
  const needed = Math.floor(total / 2) + 1;
  const safeSetsA = Math.max(0, setsA);
  const safeSetsB = Math.max(0, setsB);
  const activeIndex = Math.max(0, Math.min(total - 1, currentSet - 1));

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.72 }}>SETS</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100, letterSpacing: 0.4 }}>
            {safeSetsA}–{safeSetsB}
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.08)",
            fontSize: 12,
            fontWeight: 1000,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
          }}
        >
          BO{total} • premier à {needed}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.72 }}>SET EN COURS</div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 1000 }}>Set {Math.min(total, Math.max(1, currentSet))} / {total}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 12, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>ÉQUIPE A</div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teamAName}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: total }).map((_, index) => {
            const filledByA = index < safeSetsA;
            const filledByB = index >= total - safeSetsB;
            const isActive = index === activeIndex && !filledByA && !filledByB && safeSetsA + safeSetsB < total;
            return (
              <div
                key={index}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid rgba(255,255,255,0.14)",
                  background: filledByA
                    ? "linear-gradient(180deg, rgba(124,255,196,0.40), rgba(124,255,196,0.16))"
                    : filledByB
                    ? "linear-gradient(180deg, rgba(255,130,184,0.38), rgba(255,130,184,0.16))"
                    : isActive
                    ? "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: filledByA
                    ? "0 0 16px rgba(124,255,196,0.25)"
                    : filledByB
                    ? "0 0 16px rgba(255,130,184,0.24)"
                    : isActive
                    ? "0 0 14px rgba(255,255,255,0.12)"
                    : "none",
                }}
              />
            );
          })}
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>ÉQUIPE B</div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teamBName}
          </div>
        </div>
      </div>
    </div>
  );
}
