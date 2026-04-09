import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
};

function chip(label: string, active = false): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: active ? "7px 11px" : "6px 10px",
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
    color: active ? "#fff" : "rgba(255,255,255,0.84)",
    fontWeight: 1000,
    fontSize: 12,
    letterSpacing: 0.4,
    whiteSpace: "nowrap",
  };
}

export default function BabyFootLiveHeader({ phaseLabel, modeLabel, clockLabel, targetLabel, secondaryLabel }: Props) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(1000px 240px at 0% 0%, rgba(124,255,196,0.10), transparent 42%), radial-gradient(1000px 240px at 100% 100%, rgba(255,130,184,0.08), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
        boxShadow: "0 16px 34px rgba(0,0,0,0.26)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          <span style={chip(phaseLabel, true)}>{phaseLabel}</span>
          <span style={chip(modeLabel)}>{modeLabel}</span>
          {secondaryLabel ? <span style={chip(secondaryLabel)}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            borderRadius: 16,
            padding: "8px 10px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.16)",
            minWidth: 84,
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>CHRONO</div>
          <div style={{ marginTop: 4, fontSize: 17, fontWeight: 1100, lineHeight: 1 }}>{clockLabel}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 14,
          padding: "9px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.16)",
          fontSize: 12,
          fontWeight: 900,
          opacity: 0.9,
        }}
      >
        {targetLabel}
      </div>
    </div>
  );
}
