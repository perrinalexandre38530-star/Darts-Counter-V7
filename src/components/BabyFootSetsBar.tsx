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
    border: `1px solid ${active ? accent : "rgba(255,255,255,0.16)"}`,
    background: active ? accent : "transparent",
    boxShadow: active ? `0 0 8px ${accent}55` : "none",
  };
}

export default function BabyFootSetsBar({
  setsA,
  setsB,
  bestOf,
  currentSet = 1,
  teamAName = "Joueur A",
  teamBName = "Joueur B",
}: Props) {
  const left = Math.max(0, Number(setsA) || 0);
  const right = Math.max(0, Number(setsB) || 0);
  const bo = Math.max(1, Number(bestOf) || 1);
  const setNo = Math.max(1, Number(currentSet) || 1);
  const winTarget = Math.max(1, Math.floor(bo / 2) + 1);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 12,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 16px 36px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div title={teamAName} style={{ fontSize: 15, fontWeight: 1100, color: "#c7ff26", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamAName}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {Array.from({ length: winTarget }).map((_, index) => (
              <div key={`left-${index}`} style={dot(index < left, "#c7ff26")} />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 92, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1, color: "rgba(255,255,255,0.82)", textTransform: "uppercase" }}>Sets</div>
          <div style={{ marginTop: 4, fontSize: 30, lineHeight: 1, fontWeight: 1100, color: "#fff" }}>
            <span style={{ color: "#c7ff26" }}>{left}</span>
            <span style={{ padding: "0 7px", opacity: 0.84, color: "#fff" }}>–</span>
            <span style={{ color: "#ff59b0" }}>{right}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 1000, color: "rgba(255,255,255,0.74)" }}>BO{bo} • set {setNo}/{bo}</div>
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div title={teamBName} style={{ fontSize: 15, fontWeight: 1100, color: "#ff59b0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamBName}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {Array.from({ length: winTarget }).map((_, index) => (
              <div key={`right-${index}`} style={dot(index < right, "#ff59b0")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
