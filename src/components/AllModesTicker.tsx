// ============================================
// src/components/AllModesTicker.tsx
// Ticker "Tous les modes" (random)
// - Affiche 1 ticker image à la fois
// - Change aléatoirement toutes les intervalMs
// - Respect ratio source 800x230 (contain)
//
// Images attendues:
// - src/assets/tickers/ticker_<gameId>.png
// ============================================

import React from "react";

export type AllModesTickerItem = {
  id: string;
  label: string;
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

type Props = {
  items: AllModesTickerItem[];
  intervalMs?: number;
  heightPx?: number;
  className?: string;
};

export default function AllModesTicker({
  items,
  intervalMs = 2600,
  heightPx = 52,
  className,
}: Props) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (safeItems.length <= 1) return;

    const t = window.setInterval(() => {
      setIdx((prev) => {
        if (safeItems.length <= 1) return 0;
        let next = Math.floor(Math.random() * safeItems.length);
        if (safeItems.length > 1 && next === prev) next = (prev + 1) % safeItems.length;
        return next;
      });
    }, Math.max(800, intervalMs));

    return () => window.clearInterval(t);
  }, [safeItems.length, intervalMs]);

  const current = safeItems.length ? safeItems[idx % safeItems.length] : null;

  const tickerSrc = React.useMemo(() => {
    if (!current) return null;
    return findTickerById(current.id);
  }, [current?.id]);

  return (
    <div
      className={className}
      style={{
        height: Math.max(44, heightPx),
        width: "100%",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.10))",
        boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
      }}
    >
      <div
        style={{
          height: "100%",
          aspectRatio: "800 / 230",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        {tickerSrc ? (
          <img
            src={tickerSrc}
            alt={current?.label || "ticker"}
            style={{
              height: "100%",
              width: "100%",
              objectFit: "contain", // ✅ respecte le ratio sans prendre la taille réelle
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
              color: "rgba(255,255,255,0.85)",
              fontWeight: 950,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              textShadow: "0 0 10px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              padding: "0 10px",
            }}
          >
            {current?.label || "MODE"}
          </div>
        )}
      </div>
    </div>
  );
}