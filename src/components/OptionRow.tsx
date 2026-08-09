import React from "react";

export default function OptionRow(props: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { label, hint, children } = props;
  const isNarrow = typeof window !== "undefined" && window.innerWidth <= 560;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) auto",
        gap: isNarrow ? 8 : 12,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: isNarrow ? 12.2 : 13, opacity: 0.95, lineHeight: 1.2 }}>{label}</div>
        {hint ? <div style={{ fontSize: isNarrow ? 10.5 : 12, opacity: 0.75, marginTop: 2, lineHeight: 1.3 }}>{hint}</div> : null}
      </div>
      <div style={{ flexShrink: 0, width: isNarrow ? "100%" : "auto" }}>{children}</div>
    </div>
  );
}
