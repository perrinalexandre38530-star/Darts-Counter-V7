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
  tickerEdgeFade?: "default" | "strong";
  /** Ajustement de l'image dans la bande ticker. `contain` garantit que l'image complète reste visible. */
  tickerFit?: "cover" | "contain";
  /** Espace réservé sous le ticker pour éviter qu'un premier bloc ne vienne le toucher / passer dessous. */
  tickerBottomGap?: number;
  /** Décalage top du header sticky. Utile avec le full-bleed qui compense le padding haut du container. */
  stickyTop?: number;
}) {
  const {
    title = "",
    left,
    right,
    subtitle,
    tickerSrc,
    tickerAlt = "ticker",
    tickerHeight = 92,
    tickerEdgeFade = "default",
    tickerFit = "cover",
    tickerBottomGap = 10,
    stickyTop = 0,
  } = props;

  const hasTicker = !!tickerSrc;
  const effectiveTickerBottomGap = hasTicker ? Math.max(10, tickerBottomGap) : 0;
  // Correspond au padding de .container (src/index.css)
  const CONTAINER_PAD_TOP = 18;
  const CONTAINER_PAD_X = 16;


  return (
    <div
      style={{
        position: "sticky",
        top: stickyTop,
        zIndex: 30,
        // Full-bleed ticker: neutralise le padding du wrapper `.container` (18px top / 16px sides)
        marginTop: hasTicker ? -CONTAINER_PAD_TOP : 0,
        marginLeft: hasTicker ? -CONTAINER_PAD_X : 0,
        marginRight: hasTicker ? -CONTAINER_PAD_X : 0,
        width: hasTicker ? "calc(100% + 32px)" : undefined,

        padding: hasTicker ? `0 0 ${effectiveTickerBottomGap}px` : "12px 12px 10px",
        backdropFilter: "blur(10px)",
        background:
          "linear-gradient(180deg, rgba(10,10,18,0.92) 0%, rgba(10,10,18,0.65) 70%, rgba(10,10,18,0.0) 100%)",
        borderBottom: hasTicker ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {hasTicker ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: tickerHeight,
            paddingTop: "env(safe-area-inset-top)",
            overflow: "hidden",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          {tickerFit === "contain" ? (
            <img
              src={tickerSrc!}
              alt=""
              aria-hidden
              draggable={false}
              style={{
                position: "absolute",
                inset: -8,
                width: "calc(100% + 16px)",
                height: "calc(100% + 16px)",
                objectFit: "cover",
                objectPosition: "center",
                filter: "blur(5px) saturate(.9) brightness(.52)",
                opacity: .7,
                transform: "scale(1.03)",
              }}
            />
          ) : null}
          <img
            src={tickerSrc!}
            alt={tickerAlt}
            draggable={false}
            style={{
              position: "relative",
              zIndex: 1,
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: tickerFit,
              objectPosition: "center",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              zIndex: 2,
              inset: 0,
              pointerEvents: "none",
              background: tickerEdgeFade === "strong"
                ? "linear-gradient(90deg, rgba(2,3,9,.98) 0%, rgba(2,3,9,.92) 6%, rgba(2,3,9,.78) 12%, rgba(2,3,9,.42) 20%, rgba(2,3,9,0) 30%, rgba(2,3,9,0) 70%, rgba(2,3,9,.42) 80%, rgba(2,3,9,.78) 88%, rgba(2,3,9,.92) 94%, rgba(2,3,9,.98) 100%)"
                : "linear-gradient(90deg, rgba(2,3,9,.74) 0%, rgba(2,3,9,.28) 16%, rgba(2,3,9,0) 30%, rgba(2,3,9,0) 70%, rgba(2,3,9,.28) 84%, rgba(2,3,9,.74) 100%)",
            }}
          />
          {tickerFit === "contain" ? (
            <>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: "24%",
                  pointerEvents: "none",
                  background: "linear-gradient(90deg, rgba(7,10,18,.98) 0%, rgba(7,10,18,.88) 28%, rgba(7,10,18,.45) 62%, rgba(7,10,18,0) 100%)",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: "24%",
                  pointerEvents: "none",
                  background: "linear-gradient(270deg, rgba(7,10,18,.98) 0%, rgba(7,10,18,.88) 28%, rgba(7,10,18,.45) 62%, rgba(7,10,18,0) 100%)",
                }}
              />
            </>
          ) : null}

          {(left || right) ? (
            <div
              style={{
                position: "absolute",
                zIndex: 3,
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
