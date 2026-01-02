// =============================================================
// src/components/home/ArcadeTicker.tsx
// Bandeau "arcade" (Home) — version robuste
// ✅ Affiche STRICTEMENT props.items (ordre respecté)
// ✅ Supporte activeIndex contrôlé depuis Home
// ✅ Auto-rotation + swipe + dots
// ✅ FIX: stop "guirlande de Noël" (backgroundRepeat: no-repeat)
// ✅ FIX: preload + fallback si image HS
// =============================================================

import * as React from "react";

export type ArcadeTickerItem = {
  id: string;
  title: string;
  text: string;
  detail?: string;
  backgroundImage?: string;
  accentColor?: string;
};

type Props = {
  items: ArcadeTickerItem[];
  intervalMs?: number;

  // contrôlé (optionnel)
  activeIndex?: number;

  // callbacks (optionnels)
  onIndexChange?: (index: number) => void;
  onActiveIndexChange?: (index: number) => void;
};

const SWIPE_THRESHOLD = 25;

export default function ArcadeTicker({
  items,
  intervalMs = 7000,
  activeIndex,
  onIndexChange,
  onActiveIndexChange,
}: Props) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const len = safeItems.length;

  const isControlled = typeof activeIndex === "number";

  const [internalIndex, setInternalIndex] = React.useState(0);
  const index = isControlled ? (activeIndex as number) : internalIndex;

  // clamp index si liste change
  React.useEffect(() => {
    if (!len) {
      if (!isControlled) setInternalIndex(0);
      return;
    }
    const clamped = Math.min(Math.max(index, 0), len - 1);
    if (clamped !== index) {
      if (!isControlled) setInternalIndex(clamped);
      onIndexChange?.(clamped);
      onActiveIndexChange?.(clamped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);

  const setIndexSafe = React.useCallback(
    (next: number) => {
      if (!len) return;
      const clamped = Math.min(Math.max(next, 0), len - 1);

      if (!isControlled) setInternalIndex(clamped);
      onIndexChange?.(clamped);
      onActiveIndexChange?.(clamped);
    },
    [len, isControlled, onIndexChange, onActiveIndexChange]
  );

  // auto-rotation
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!len) return;
    if (!intervalMs || intervalMs <= 0) return;

    const id = window.setInterval(() => {
      setIndexSafe((index + 1) % len);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [len, intervalMs, index, setIndexSafe]);

  const current = len ? safeItems[Math.min(index, len - 1)] : null;

  const accent = current?.accentColor ?? "#F6C256";
  const bg = (current?.backgroundImage ?? "").trim();

  // ------------------------------------------------------------
  // ✅ FIX: preload + fallback si l'image ne charge pas
  // ------------------------------------------------------------
  const [bgOk, setBgOk] = React.useState(true);

  React.useEffect(() => {
    if (!bg) {
      setBgOk(false);
      return;
    }

    let cancelled = false;
    setBgOk(true);

    const img = new Image();
    img.onload = () => {
      if (!cancelled) setBgOk(true);
    };
    img.onerror = () => {
      if (!cancelled) setBgOk(false);
    };
    img.src = bg;

    return () => {
      cancelled = true;
    };
  }, [bg]);

  // swipe
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const x = e.touches?.[0]?.clientX;
    if (x != null) setTouchStartX(x);
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null || !len) return;
    const x = e.changedTouches?.[0]?.clientX ?? touchStartX;
    const dx = x - touchStartX;

    if (Math.abs(dx) < SWIPE_THRESHOLD) {
      setTouchStartX(null);
      return;
    }

    if (dx < 0) setIndexSafe((index + 1) % len);
    else setIndexSafe((index - 1 + len) % len);

    setTouchStartX(null);
  };

  if (!current) return null;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 22,
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 18px 42px rgba(0,0,0,0.85)",
        backgroundColor: "#05060C",

        // ✅ FIX GUÊRLANDE: no-repeat + cover
        backgroundImage: bg && bgOk ? `url("${bg}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",

        // petit plus perf/visuel
        willChange: "background-image, transform",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,0,0,0.55))",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          padding: "12px 12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 10px ${accent}CC`,
              }}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.0,
                textTransform: "uppercase",
                color: accent,
                textShadow: `0 0 10px ${accent}55`,
              }}
            >
              {current.title}
            </div>
          </div>

          {/* Dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {safeItems.map((it, i) => {
              const active = i === Math.min(index, len - 1);
              return (
                <button
                  key={it.id || i}
                  type="button"
                  onClick={() => setIndexSafe(i)}
                  aria-label={`ticker-${i}`}
                  style={{
                    width: active ? 18 : 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: active ? accent : "rgba(255,255,255,0.28)",
                    boxShadow: active ? `0 0 10px ${accent}88` : "none",
                    transition: "all 180ms ease",
                    padding: 0,
                    opacity: active ? 1 : 0.75,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Text */}
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {current.text}
        </div>

        {/* Detail line (optional) */}
        {current.detail ? (
          <div
            style={{
              marginTop: 2,
              fontSize: 11,
              fontWeight: 800,
              color: "rgba(255,255,255,0.82)",
              opacity: 0.95,
            }}
          >
            {current.detail}
          </div>
        ) : null}

        {/* little accent bar */}
        <div
          style={{
            height: 2,
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 10px ${accent}55`,
            marginTop: 4,
          }}
        />
      </div>
    </div>
  );
}
