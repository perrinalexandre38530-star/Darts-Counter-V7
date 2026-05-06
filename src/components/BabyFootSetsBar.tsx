import React from "react";

type Props = {
  setsA: number;
  setsB: number;
  bestOf: number;
  currentSet?: number;
  teamAName?: string;
  teamBName?: string;
};

function setDot(fill: string, active = false): React.CSSProperties {
  return {
    width: 14,
    height: 14,
    borderRadius: 999,
    border: active ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
    background: fill,
    boxShadow:
      fill !== "rgba(255,255,255,0.06)"
        ? fill.includes("124,255,196")
          ? "0 0 12px rgba(124,255,196,0.22)"
          : "0 0 12px rgba(255,130,184,0.20)"
        : "none",
  };
}

export default function BabyFootSetsBar({
  setsA,
  setsB,
  bestOf,
  currentSet = 1,
  teamAName = "Équipe A",
  teamBName = "Équipe B",
}: Props) {
  const total = Math.max(1, bestOf || 1);
  const winTarget = Math.floor(total / 2) + 1;
  const safeA = Math.max(0, Number(setsA) || 0);
  const safeB = Math.max(0, Number(setsB) || 0);
  const current = Math.min(total, Math.max(1, currentSet || 1));

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#7cffc4", opacity: 0.92 }}>SETS A</div>
          <div
            title={teamAName}
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: 1100,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {teamAName}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, opacity: 0.64 }}>SETS</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 1100, lineHeight: 1 }}>{safeA}–{safeB}</div>
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#ff82b8", opacity: 0.92 }}>SETS B</div>
          <div
            title={teamBName}
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: 1100,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {teamBName}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-start", flexWrap: "wrap" }}>
          {Array.from({ length: winTarget }).map((_, index) => (
            <div
              key={`a-${index}`}
              style={setDot(index < safeA ? "linear-gradient(180deg, rgba(124,255,196,0.55), rgba(124,255,196,0.18))" : "rgba(255,255,255,0.06)")}
            />
          ))}
        </div>

        <div
          style={{
            borderRadius: 999,
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            fontSize: 11,
            fontWeight: 1000,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
          }}
        >
          BO{total} • set {current}/{total}
        </div>

        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {Array.from({ length: winTarget }).map((_, index) => (
            <div
              key={`b-${index}`}
              style={setDot(index < safeB ? "linear-gradient(180deg, rgba(255,130,184,0.55), rgba(255,130,184,0.18))" : "rgba(255,255,255,0.06)")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
