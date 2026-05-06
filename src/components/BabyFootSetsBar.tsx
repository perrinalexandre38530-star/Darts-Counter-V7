import React from "react";

type Props = {
  setsA: number;
  setsB: number;
  bestOf: number;
  currentSet?: number;
  teamAName?: string;
  teamBName?: string;
};

function dot(active: boolean, accent: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: 999,
    border: `1px solid ${active ? accent + "88" : "rgba(255,255,255,0.10)"}`,
    background: active ? `linear-gradient(180deg, ${accent}cc, ${accent}55)` : "rgba(255,255,255,0.05)",
    boxShadow: active ? `0 0 12px ${accent}44` : "none",
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
  const total = Math.max(1, Number(bestOf) || 1);
  const safeA = Math.max(0, Number(setsA) || 0);
  const safeB = Math.max(0, Number(setsB) || 0);
  const winTarget = Math.floor(total / 2) + 1;
  const current = Math.max(1, Math.min(Number(currentSet) || 1, total));

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 14px 24px rgba(0,0,0,0.26)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#7cffc4", textTransform: "uppercase" }}>Sets A</div>
          <div title={teamAName} style={{ marginTop: 4, fontSize: 14, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamAName}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {Array.from({ length: winTarget }).map((_, index) => (
              <div key={`a-${index}`} style={dot(index < safeA, "#7cffc4")} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", minWidth: 94 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, opacity: 0.62, textTransform: "uppercase" }}>Sets</div>
          <div style={{ marginTop: 3, fontSize: 32, fontWeight: 1100, lineHeight: 1 }}>
            {safeA}
            <span style={{ opacity: 0.5 }}>–</span>
            {safeB}
          </div>
          <div
            style={{
              marginTop: 7,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 26,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              fontSize: 11,
              fontWeight: 1000,
            }}
          >
            BO{total} • set {current}/{total}
          </div>
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#ff82b8", textTransform: "uppercase" }}>Sets B</div>
          <div title={teamBName} style={{ marginTop: 4, fontSize: 14, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamBName}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
            {Array.from({ length: winTarget }).map((_, index) => (
              <div key={`b-${index}`} style={dot(index < safeB, "#ff82b8")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
