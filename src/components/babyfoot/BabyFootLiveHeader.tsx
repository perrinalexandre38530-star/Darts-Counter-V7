import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
};

function pill(label: string, active = false): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: active ? "7px 11px" : "6px 10px",
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
    color: active ? "#fff" : "rgba(255,255,255,0.82)",
    fontWeight: 1000,
    fontSize: 11,
    letterSpacing: 0.35,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };
}

export default function BabyFootLiveHeader({ phaseLabel, modeLabel, clockLabel, targetLabel, secondaryLabel }: Props) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 220px at 0% 0%, rgba(124,255,196,0.09), transparent 42%), radial-gradient(900px 220px at 100% 100%, rgba(255,130,184,0.08), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span style={pill(phaseLabel, true)}>{phaseLabel}</span>
          <span style={pill(modeLabel)}>{modeLabel}</span>
          {secondaryLabel ? <span style={pill(secondaryLabel)}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: "6px 10px",
            minWidth: 78,
            textAlign: "right",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.62 }}>CHRONO</div>
          <div style={{ marginTop: 2, fontSize: 18, fontWeight: 1100, lineHeight: 1 }}>{clockLabel}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 950,
          opacity: 0.88,
          lineHeight: 1.15,
        }}
      >
        {targetLabel}
      </div>
    </div>
  );
}
