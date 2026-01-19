import React from "react";

type Slot = React.ReactNode;

export default function PageHeader(props: {
  title: string;
  left?: Slot;
  right?: Slot;
  subtitle?: string;
}) {
  const { title, left, right, subtitle } = props;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        padding: "12px 12px 10px",
        backdropFilter: "blur(10px)",
        background:
          "linear-gradient(180deg, rgba(10,10,18,0.92) 0%, rgba(10,10,18,0.65) 70%, rgba(10,10,18,0.0) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr 44px",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-start" }}>{left ?? null}</div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.6, fontSize: 18 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8, fontWeight: 700 }}>{subtitle}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>{right ?? null}</div>
      </div>
    </div>
  );
}
