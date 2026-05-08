import React from "react";

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  targetLabel: string;
  secondaryLabel?: string;
  clockRunning?: boolean;
  hasStarted?: boolean;
  onToggleClock?: () => void;
};

function pill(accent = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    border: accent ? "1px solid rgba(199,255,38,0.34)" : "1px solid rgba(255,255,255,0.08)",
    background: accent ? "linear-gradient(180deg, rgba(199,255,38,0.18), rgba(199,255,38,0.07))" : "rgba(255,255,255,0.04)",
    color: accent ? "#f5ffbf" : "rgba(255,255,255,0.94)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.28,
    whiteSpace: "nowrap",
    boxShadow: accent ? "0 0 12px rgba(199,255,38,0.15)" : "none",
  };
}

function clockBtn(active: boolean): React.CSSProperties {
  return {
    minHeight: 28,
    borderRadius: 999,
    padding: "0 12px",
    border: `1px solid ${active ? "rgba(199,255,38,0.28)" : "rgba(255,255,255,0.08)"}`,
    background: active ? "rgba(199,255,38,0.10)" : "rgba(255,255,255,0.04)",
    color: active ? "#efffa1" : "#fff",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.25,
    cursor: "pointer",
  };
}

export default function BabyFootLiveHeader({
  phaseLabel,
  modeLabel,
  clockLabel,
  targetLabel,
  secondaryLabel,
  clockRunning = false,
  hasStarted = false,
  onToggleClock,
}: Props) {
  const actionLabel = clockRunning ? "Pause" : hasStarted ? "Reprendre" : "Démarrer";

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 10,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.98), rgba(8,10,24,0.99))",
        boxShadow: "0 14px 34px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", minWidth: 0 }}>
          <span style={pill(true)}>{phaseLabel}</span>
          <span style={pill()}>{modeLabel}</span>
          {secondaryLabel ? <span style={pill()}>{secondaryLabel}</span> : null}
        </div>

        <div
          style={{
            minWidth: 110,
            borderRadius: 18,
            padding: "8px 10px",
            border: "1px solid rgba(199,255,38,0.30)",
            background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,20,0.98))",
            boxShadow: "0 0 14px rgba(199,255,38,0.10)",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: "#ebff86", fontSize: 10, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>◔</span>
            <span>Chrono</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 23, lineHeight: 1, fontWeight: 1100, color: "#fff3a3" }}>{clockLabel}</div>
        </div>
      </div>

      <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div
          style={{
            minWidth: 0,
            fontSize: 12,
            fontWeight: 1000,
            color: "rgba(255,255,255,0.96)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {targetLabel}
        </div>
        {onToggleClock ? (
          <button type="button" onClick={onToggleClock} style={clockBtn(!clockRunning)}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
