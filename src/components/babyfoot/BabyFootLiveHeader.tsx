import React from "react";

type TabItem = {
  key: string;
  label: string;
};

type Props = {
  phaseLabel: string;
  modeLabel: string;
  clockLabel: string;
  secondaryLabel?: string;
  ruleLabels?: string[];
  clockRunning: boolean;
  hasStarted: boolean;
  onStartClock: () => void;
  onPauseClock: () => void;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

function pill(accent = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
    padding: "0 6px",
    borderRadius: 999,
    border: accent ? "1px solid rgba(199,255,38,0.34)" : "1px solid rgba(255,255,255,0.08)",
    background: accent ? "linear-gradient(180deg, rgba(199,255,38,0.18), rgba(199,255,38,0.07))" : "rgba(255,255,255,0.04)",
    color: accent ? "#f5ffbf" : "rgba(255,255,255,0.94)",
    fontSize: 8,
    fontWeight: 1000,
    letterSpacing: 0.15,
    maxWidth: 72,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    boxShadow: accent ? "0 0 14px rgba(199,255,38,0.15)" : "none",
  };
}

function transportButton(disabled: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : "rgba(199,255,38,0.26)"}`,
    background: disabled ? "rgba(255,255,255,0.04)" : "linear-gradient(180deg, rgba(199,255,38,0.14), rgba(199,255,38,0.06))",
    color: disabled ? "rgba(255,255,255,0.32)" : "#eaff84",
    display: "grid",
    placeItems: "center",
    cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : "0 0 12px rgba(199,255,38,0.10)",
    padding: 0,
    flex: "0 0 auto",
  };
}

function tabButton(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    minHeight: 34,
    padding: "0 8px",
    borderRadius: 999,
    border: active ? "1px solid rgba(199,255,38,0.30)" : "1px solid rgba(255,255,255,0.08)",
    background: active ? "linear-gradient(180deg, rgba(199,255,38,0.18), rgba(199,255,38,0.07))" : "rgba(255,255,255,0.04)",
    color: active ? "#f5ffbf" : "rgba(255,255,255,0.92)",
    fontSize: 10,
    fontWeight: 1000,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    boxShadow: active ? "0 0 12px rgba(199,255,38,0.12)" : "none",
  };
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="8,5 19,12 8,19 8,5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function BabyFootLiveHeader({
  phaseLabel,
  modeLabel,
  clockLabel,
  secondaryLabel,
  ruleLabels = [],
  clockRunning,
  hasStarted,
  onStartClock,
  onPauseClock,
  tabs,
  activeTab,
  onTabChange,
}: Props) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 7,
        border: "1px solid rgba(120,150,255,0.14)",
        background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 4,
            rowGap: 3,
            alignItems: "center",
            alignContent: "center",
            minWidth: 0,
            flexWrap: "wrap",
            overflow: "hidden",
            maxHeight: 42,
          }}
        >
          {phaseLabel && phaseLabel !== "MATCH" ? <span style={pill(true)}>{phaseLabel}</span> : null}
          <span style={pill(true)}>{modeLabel}</span>
          {secondaryLabel ? <span style={pill()}>{secondaryLabel}</span> : null}
          {ruleLabels.map((label) => (
            <span key={label} style={pill()}>{label}</span>
          ))}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            minHeight: 40,
            padding: "3px 6px",
            borderRadius: 999,
            border: "1px solid rgba(199,255,38,0.28)",
            background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,20,0.98))",
            boxShadow: "0 0 14px rgba(199,255,38,0.09)",
            flex: "0 0 auto",
          }}
        >
          <span style={{ color: "#ebff86", fontSize: 14, lineHeight: 1 }}>◔</span>
          <span style={{ color: "#fff3a3", fontSize: 18, lineHeight: 1, fontWeight: 1100, minWidth: 50, textAlign: "center" }}>{clockLabel}</span>
          <button
            type="button"
            aria-label={hasStarted ? "Reprendre" : "Démarrer"}
            title={hasStarted ? "Reprendre" : "Démarrer"}
            onClick={onStartClock}
            disabled={clockRunning}
            style={transportButton(clockRunning)}
          >
            <PlayIcon />
          </button>
          <button
            type="button"
            aria-label="Pause"
            title="Pause"
            onClick={onPauseClock}
            disabled={!clockRunning}
            style={transportButton(!clockRunning)}
          >
            <PauseIcon />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`, gap: 8 }}>
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => onTabChange(tab.key)} style={tabButton(activeTab === tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
