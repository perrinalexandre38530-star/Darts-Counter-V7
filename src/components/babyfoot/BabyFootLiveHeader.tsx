import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
};

function pill(label: string, tone: "accent" | "neutral" = "neutral"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "0 16px",
    borderRadius: 999,
    border:
      tone === "accent"
        ? "1px solid rgba(180,255,57,0.34)"
        : "1px solid rgba(255,255,255,0.08)",
    background:
      tone === "accent"
        ? "linear-gradient(180deg, rgba(180,255,57,0.18), rgba(180,255,57,0.07))"
        : "rgba(255,255,255,0.04)",
    color: tone === "accent" ? "#f4ffbe" : "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.3,
    boxShadow: tone === "accent" ? "0 0 16px rgba(180,255,57,0.16)" : "none",
    whiteSpace: "nowrap",
  };
}

export default function BabyFootLiveHeader({
  phaseLabel,
  modeLabel,
  clockLabel,
  targetLabel,
  secondaryLabel,
}: Props) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        border: "1px solid rgba(120,150,255,0.14)",
        background:
          "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
          <span style={pill(phaseLabel, "accent")}>{phaseLabel}</span>
          <span style={pill(modeLabel)}>{modeLabel}</span>
          {secondaryLabel ? <span style={pill(secondaryLabel)}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            minWidth: 124,
            borderRadius: 18,
            padding: "10px 14px",
            border: "1px solid rgba(180,255,57,0.30)",
            background:
              "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,20,0.98))",
            boxShadow: "0 0 18px rgba(180,255,57,0.10)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#ebff86",
              fontSize: 12,
              fontWeight: 1000,
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>◔</span>
            <span>Chrono</span>
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 27,
              lineHeight: 1,
              fontWeight: 1100,
              color: "#fff4a9",
            }}
          >
            {clockLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 15,
          padding: "12px 14px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.20)",
          fontSize: 12,
          fontWeight: 1000,
          color: "rgba(255,255,255,0.96)",
        }}
      >
        {targetLabel}
      </div>
    </div>
  );
}
