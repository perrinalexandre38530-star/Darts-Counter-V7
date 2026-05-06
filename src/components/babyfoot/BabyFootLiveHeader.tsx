import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
};

function chip(label: string, emphasis = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: emphasis ? "7px 12px" : "6px 10px",
    borderRadius: 999,
    border: emphasis ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.10)",
    background: emphasis ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
    color: emphasis ? "#fff" : "rgba(255,255,255,0.84)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.45,
    whiteSpace: "nowrap",
    lineHeight: 1,
    textTransform: "uppercase",
  };
}

export default function BabyFootLiveHeader({ phaseLabel, modeLabel, clockLabel, targetLabel, secondaryLabel }: Props) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        boxShadow: "0 14px 26px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span style={chip(phaseLabel, true)}>{phaseLabel}</span>
          <span style={chip(modeLabel)}>{modeLabel}</span>
          {secondaryLabel ? <span style={chip(secondaryLabel)}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            minWidth: 82,
            borderRadius: 14,
            padding: "7px 10px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
            textAlign: "right",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 1000, letterSpacing: 0.9, opacity: 0.6, textTransform: "uppercase" }}>Chrono</div>
          <div style={{ marginTop: 2, fontSize: 19, fontWeight: 1100, lineHeight: 1 }}>{clockLabel}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 12,
          padding: "8px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.16)",
          fontSize: 12,
          fontWeight: 950,
          lineHeight: 1.15,
          opacity: 0.92,
        }}
      >
        {targetLabel}
      </div>
    </div>
  );
}
