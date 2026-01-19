import React from "react";

export default function OptionRow(props: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { label, hint, children } = props;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.95 }}>{label}</div>
        {hint ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{hint}</div> : null}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
