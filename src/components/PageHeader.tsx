import React from "react";

type Slot = React.ReactNode;

export default function PageHeader(props: {
  title?: string;
  left?: Slot;
  right?: Slot;
  subtitle?: string;

  // ✅ NEW: ticker plein-largeur (remplace title/subtitle)
  tickerSrc?: string;
  tickerAlt?: string;
  tickerHeight?: number;
}) {
  const {
    title = "",
    left,
    right,
    subtitle,
    tickerSrc,
    tickerAlt = "ticker",
    tickerHeight = 92,
  } = props;

  const hasTicker = !!tickerSrc;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        padding: hasTicker ? 0 : "12px 12px 10px",
        backdropFilter: "blur(10px)",
        background:
          "linear-gradient(180deg, rgba(10,10,18,0.92) 0%, rgba(10,10,18,0.65) 70%, rgba(10,10,18,0.0) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {hasTicker ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <img
            src={tickerSrc!}
            alt={tickerAlt}
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              height: tickerHeight,
              objectFit: "cover",
            }}
          />

          {(left || right) ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
                pointerEvents: "none",
              }}
            >
              <div style={{ pointerEvents: "auto" }}>{left ?? null}</div>
              <div style={{ pointerEvents: "auto" }}>{right ?? null}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: hasTicker ? "none" : "grid",
          gridTemplateColumns: "56px 1fr 56px",
          alignItems: "center",
          gap: 10,
          minHeight: 56,
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
