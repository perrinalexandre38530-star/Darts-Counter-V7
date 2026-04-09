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
    padding: "7px 11px",
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.86)",
    fontWeight: 1000,
    fontSize: 12,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };
}

export default function BabyFootLiveHeader({ phaseLabel, modeLabel, clockLabel, targetLabel, secondaryLabel }: Props) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(1200px 260px at 0% 0%, rgba(124,255,196,0.10), transparent 45%), radial-gradient(1200px 260px at 100% 100%, rgba(255,130,184,0.08), transparent 45%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={chip(phaseLabel, true)}>{phaseLabel}</span>
          <span style={chip(modeLabel, false)}>{modeLabel}</span>
          <span style={chip(targetLabel, false)}>{targetLabel}</span>
          {secondaryLabel ? <span style={chip(secondaryLabel, false)}>{secondaryLabel}</span> : null}
        </div>

        <div style={{ textAlign: "right", minWidth: 94 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.7 }}>CHRONO</div>
          <div style={{ marginTop: 4, fontSize: 19, fontWeight: 1100, letterSpacing: 0.4 }}>{clockLabel}</div>
        </div>
      </div>
    </div>
  );
}
