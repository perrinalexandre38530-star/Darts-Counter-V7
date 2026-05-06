import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
};

function chip(label: string, tone: "strong" | "soft" = "soft"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: "0 11px",
    borderRadius: 999,
    border: tone === "strong" ? "1px solid rgba(255,210,74,0.28)" : "1px solid rgba(255,255,255,0.08)",
    background:
      tone === "strong"
        ? "linear-gradient(180deg, rgba(255,210,74,0.18), rgba(255,210,74,0.06))"
        : "rgba(255,255,255,0.04)",
    color: tone === "strong" ? "#fff2a8" : "rgba(255,255,255,0.86)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    boxShadow: tone === "strong" ? "0 0 14px rgba(255,210,74,0.12)" : "none",
  };
}

export default function BabyFootLiveHeader({ phaseLabel, modeLabel, clockLabel, targetLabel, secondaryLabel }: Props) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,210,74,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        boxShadow: "0 14px 28px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span style={chip(phaseLabel, "strong")}>{phaseLabel}</span>
          <span style={chip(modeLabel)}>{modeLabel}</span>
          {secondaryLabel ? <span style={chip(secondaryLabel)}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            minWidth: 76,
            borderRadius: 13,
            padding: "7px 10px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.28)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 1000, letterSpacing: 0.9, opacity: 0.6, textTransform: "uppercase" }}>Chrono</div>
          <div style={{ marginTop: 2, fontSize: 22, fontWeight: 1100, lineHeight: 1, color: "#fff2a8" }}>{clockLabel}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 12,
          padding: "9px 11px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.22)",
          fontSize: 12,
          fontWeight: 1000,
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {targetLabel}
      </div>
    </div>
  );
}
