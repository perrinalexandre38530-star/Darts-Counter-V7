import React from "react";

export default function OptionRow(props: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const { label, hint, children, compact = false } = props;
  const isNarrow = typeof window !== "undefined" && window.innerWidth <= 560;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "minmax(0,1fr) minmax(96px,.86fr)" : (isNarrow ? "1fr" : "minmax(0,1fr) auto"),
        gap: compact ? 7 : (isNarrow ? 8 : 12),
        alignItems: "center",
        padding: compact ? "7px 9px" : "10px 12px",
        borderRadius: compact ? 12 : 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: compact ? 10.8 : (isNarrow ? 12.2 : 13), opacity: 0.95, lineHeight: 1.18 }}>{label}</div>
        {hint ? <div style={{ fontSize: compact ? 8.8 : (isNarrow ? 10.5 : 12), opacity: 0.75, marginTop: 2, lineHeight: 1.25 }}>{hint}</div> : null}
      </div>
      <div style={{ flexShrink: 0, width: compact ? "100%" : (isNarrow ? "100%" : "auto"), minWidth: 0 }}>{children}</div>
    </div>
  );
}
