// ============================================
// src/components/NewModesTicker.tsx
// Ticker "Nouveaux modes" — 3 zones
// - Gauche: logo NEW (fixe, full height)
// - Centre: ticker image (800x230 ratio) qui défile
// - Droite: logo PLAY (fixe, full height, cliquable)
// - Rotation auto toutes les intervalMs
//
// Chargement images tickers:
// - place tes images ici:  src/assets/tickers/ticker_<gameId>.png
// - ex: src/assets/tickers/ticker_count_up.png
// ============================================

import React from "react";

export type NewModeTickerItem = {
  id: string;
  label: string;
  // target de navigation quand on clique PLAY (ex: "tab:count_up_config" ou "count_up_config")
  configPath: string;
  // optionnel: si tu veux forcer une image, sinon auto via /assets/tickers
  tickerSrc?: string;
};

type Props = {
  items: NewModeTickerItem[];
  intervalMs?: number;
  leftLogoSrc: string;
  playLogoSrc: string;
  onNavigate: (path: string) => void;
  className?: string;

  // réglages layout
  heightPx?: number; // hauteur du ticker
  sidePadPx?: number; // padding horizontal global
  gapPx?: number; // gap entre zones
  // ratio source du ticker
  tickerAspectW?: number; // 800
  tickerAspectH?: number; // 230
};

const tickerGlob = import.meta.glob("../assets/tickers/ticker_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTickerById(id: string): string | null {
  const suffix = `/ticker_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

export default function NewModesTicker({
  items,
  intervalMs = 3000,
  leftLogoSrc,
  playLogoSrc,
  onNavigate,
  className,
  heightPx = 56,
  sidePadPx = 10,
  gapPx = 10,
  tickerAspectW = 800,
  tickerAspectH = 230,
}: Props) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (safeItems.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((v) => (v + 1) % safeItems.length);
    }, Math.max(800, intervalMs));
    return () => window.clearInterval(t);
  }, [safeItems.length, intervalMs]);

  const current = safeItems.length ? safeItems[idx % safeItems.length] : null;

  const tickerSrc = React.useMemo(() => {
    if (!current) return null;
    if (current.tickerSrc) return current.tickerSrc;
    return findTickerById(current.id);
  }, [current]);

  // Palette légère variable (optionnelle) via id => hue shift
  const hue = React.useMemo(() => {
    const s = String(current?.id || "x");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }, [current?.id]);

  const border = `rgba(255,255,255,0.10)`;
  const bg = `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.10))`;

  const height = Math.max(44, heightPx);
  const aspect = `${tickerAspectW} / ${tickerAspectH}`;

  return (
    <div
      className={className}
      style={{
        height,
        width: "100%",
        borderRadius: 16,
        border: `1px solid ${border}`,
        background: bg,
        boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        overflow: "hidden",
        display: "flex",
        alignItems: "stretch",
        paddingLeft: sidePadPx,
        paddingRight: sidePadPx,
        gap: gapPx,
      }}
    >
      {/* LEFT: NEW logo (full height) */}
      <div
        style={{
          flex: "0 0 auto",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src={leftLogoSrc}
          alt="NEW"
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            objectFit: "contain",
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.45))",
          }}
          draggable={false}
        />
      </div>

      {/* CENTER: ticker image (ratio 800/230) */}
      <div
        style={{
          flex: "1 1 auto",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: "100%",
            aspectRatio: aspect,
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* accent halo discret (pas d’aura dégueu) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -18,
              background: `radial-gradient(220px 90px at 50% 55%, hsla(${hue}, 85%, 65%, 0.22), rgba(0,0,0,0) 62%)`,
              filter: "blur(10px)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />

          {tickerSrc ? (
            <img
              key={current?.id || "none"}
              src={tickerSrc}
              alt={current?.label || "ticker"}
              style={{
                height: "100%",
                width: "100%",
                objectFit: "contain", // ✅ s’adapte sans garder la taille réelle
                display: "block",
                transform: "translateZ(0)",
              }}
              draggable={false}
            />
          ) : (
            <div
              style={{
                height: "100%",
                width: "100%",
                display: "grid",
                placeItems: "center",
                color: "rgba(255,255,255,0.75)",
                fontWeight: 800,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {current?.label ? current.label : "NOUVEAUX MODES"}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: PLAY logo (full height) */}
      <button
        type="button"
        onClick={() => {
          if (!current?.configPath) return;
          onNavigate(current.configPath);
        }}
        style={{
          flex: "0 0 auto",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: current?.configPath ? "pointer" : "default",
          opacity: current?.configPath ? 1 : 0.5,
        }}
        aria-label="Play"
      >
        <img
          src={playLogoSrc}
          alt="PLAY"
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            objectFit: "contain",
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.45))",
          }}
          draggable={false}
        />
      </button>
    </div>
  );
}
