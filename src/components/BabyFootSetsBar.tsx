import React from "react";

type Props = {
  setsA: number;
  setsB: number;
  bestOf: number;
  currentSet?: number;
  teamAName?: string;
  teamBName?: string;
};

function winDot(active: boolean, accent: string): React.CSSProperties {
  return {
    width: 9,
    height: 9,
    borderRadius: 999,
    border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.10)",
    background: active ? accent : "rgba(255,255,255,0.04)",
    boxShadow: active ? `0 0 14px ${accent}55` : "none",
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
  const safeA = Math.max(0, Number(setsA) || 0);
  const safeB = Math.max(0, Number(setsB) || 0);
  const total = Math.max(1, Number(bestOf) || 1);
  const winTarget = Math.max(1, Math.floor(total / 2) + 1);
  const current = Math.max(1, Number(currentSet) || 1);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,210,74,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: "0 12px 26px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#9dff57", textTransform: "uppercase" }}>Sets A</div>
          <div title={teamAName} style={{ marginTop: 4, fontSize: 14, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamAName}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
            {Array.from({ length: winTarget }).map((_, i) => (
              <div key={`a-${i}`} style={winDot(i < safeA, "#9dff57")} />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 112, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>Sets remportés</div>
          <div style={{ marginTop: 2, fontSize: 30, fontWeight: 1100, lineHeight: 1, color: "#fff" }}>
            <span style={{ color: "#9dff57" }}>{safeA}</span>
            <span style={{ opacity: 0.45 }}>–</span>
            <span style={{ color: "#ff82b8" }}>{safeB}</span>
          </div>
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 26,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,210,74,0.12)",
              background: "rgba(255,210,74,0.08)",
              color: "#fff2a8",
              fontSize: 11,
              fontWeight: 1000,
            }}
          >
            BO{total} • set {current}
          </div>
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: "#ff82b8", textTransform: "uppercase" }}>Sets B</div>
          <div title={teamBName} style={{ marginTop: 4, fontSize: 14, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamBName}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
            {Array.from({ length: winTarget }).map((_, i) => (
              <div key={`b-${i}`} style={winDot(i < safeB, "#ff82b8")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
