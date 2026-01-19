// ============================================
// src/components/NewGameTickerBar.tsx
// Ticker bar en 3 parties :
// - LEFT: new_game.png fixe (full height)
// - CENTER: ticker image du mode au ratio 800/230 (proportions respectées)
// - RIGHT: play.png fixe (full height, cliquable) -> ouvre la config du mode affiché
// ============================================

import React from "react";

export type NewTickerItem = {
  id: string;
  label?: string;
  tickerSrc: string;     // image ticker du mode (png)
  configTarget: string;  // tab:xxx ou url/hash
};

type Props = {
  items: NewTickerItem[];
  intervalMs?: number;
  onNavigate?: (target: string) => void;

  leftLogoSrc: string; // new_game.png
  playLogoSrc: string; // play.png

  heightPx?: number;      // hauteur totale du ticker
  sideLogoScale?: number; // taille relative des logos (0..1)
  paddingX?: number;      // padding horizontal
};

export default function NewGameTickerBar({
  items,
  intervalMs = 3000,
  onNavigate,
  leftLogoSrc,
  playLogoSrc,

  heightPx = 58,
  sideLogoScale = 0.98,
  paddingX = 10,
}: Props) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  const [idx, setIdx] = React.useState(0);
  const current = safe[idx % Math.max(1, safe.length)];

  React.useEffect(() => {
    if (safe.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((v) => (v + 1) % safe.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [safe.length, intervalMs]);

  const go = (target: string) => {
    if (!target) return;
    if (onNavigate) return onNavigate(target);

    if (target.startsWith("#")) {
      window.location.hash = target.replace(/^#/, "");
      return;
    }
    window.location.href = target;
  };

  if (safe.length === 0) return null;

  const sideH = Math.round(heightPx * sideLogoScale);

  return (
    <div
      style={{
        height: heightPx,
        width: "100%",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
        boxShadow: "0 12px 26px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(0,255,255,0.10), transparent 55%), radial-gradient(circle at 85% 40%, rgba(255,0,200,0.08), transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: `0 ${paddingX}px`,
        }}
      >
        {/* LEFT: NEW full height */}
        <div style={{ height: sideH, width: sideH, flexShrink: 0, display: "grid", placeItems: "center" }}>
          <img
            src={leftLogoSrc}
            alt="NEW"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.55))",
            }}
            draggable={false}
          />
        </div>

        {/* CENTER: ratio 800/230 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            aspectRatio: "800 / 230",
            height: sideH,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.18)",
            position: "relative",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 6,
              height: 2,
              borderRadius: 999,
              background:
                "linear-gradient(90deg, rgba(0,255,255,0.35), rgba(255,0,200,0.25), rgba(255,215,120,0.20))",
              boxShadow: "0 0 14px rgba(0,255,255,0.14)",
              pointerEvents: "none",
            }}
          />

          <img
            key={current?.id || idx}
            src={current?.tickerSrc}
            alt={current?.label || "new mode"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "6px 10px",
              boxSizing: "border-box",
              display: "block",
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.55))",
            }}
            draggable={false}
          />
        </div>

        {/* RIGHT: PLAY full height */}
        <button
          type="button"
          onClick={() => go(current?.configTarget)}
          style={{
            height: sideH,
            width: sideH,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            border: "none",
            background: "transparent",
            padding: 0,
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Play"
        >
          <img
            src={playLogoSrc}
            alt="PLAY"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.55))",
            }}
            draggable={false}
          />
        </button>
      </div>
    </div>
  );
}