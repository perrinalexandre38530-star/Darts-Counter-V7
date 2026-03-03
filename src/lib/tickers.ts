// @ts-nocheck
// =============================================================
// src/lib/tickers.ts
// Central helper to resolve ticker images by key (SYNC).
//
// Why sync:
// - Most UI cards build CSS backgroundImage directly during render.
// - Vite supports import.meta.glob({ eager:true }) to load asset URLs at build time.
// =============================================================

// Map of asset path -> resolved URL string
const TICKERS: Record<string, string> = import.meta.glob(
  "../assets/tickers/**/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" }
) as any;

// Optional aliases: key -> filename (without path) or another key
const ALIASES: Record<string, string> = {
  // Dice convenience aliases (safe even if redundant)
  "dice_10000": "dice_10k",
  "dice_10_000": "dice_10k",
  "10_000": "dice_10k",
  "tenk": "dice_10k",
  "poker_dice": "dice_poker",
};

function normalizeKey(key: any) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[-]+/g, "_");
}

function resolveByFilename(wanted: string): string | null {
  const entries = Object.keys(TICKERS);
  const w = wanted.toLowerCase();

  // exact filename (with or without extension)
  const exact = entries.find((p) => {
    const pl = p.toLowerCase();
    return (
      pl.endsWith(`/${w}`) ||
      pl.endsWith(`/${w}.png`) ||
      pl.endsWith(`/${w}.jpg`) ||
      pl.endsWith(`/${w}.jpeg`) ||
      pl.endsWith(`/${w}.webp`)
    );
  });
  if (exact) return TICKERS[exact] || null;

  // partial match on filename segment
  const partial = entries.find((p) => p.toLowerCase().includes(`/${w}`) || p.toLowerCase().includes(w));
  if (partial) return TICKERS[partial] || null;

  return null;
}

/**
 * Resolve ticker URL by key.
 * Examples:
 * - getTicker("dice_duel") -> /assets/.../dice_duel.png
 * - getTicker("dice_games") -> /assets/.../dice_games.png
 */
export function getTicker(key: string): string | null {
  const k0 = normalizeKey(key);
  if (!k0) return null;

  // follow aliases once (then try again)
  const k = normalizeKey(ALIASES[k0] || k0);
  return resolveByFilename(k) || resolveByFilename(k0) || null;
}

// Back-compat export
export const getTickerSync = getTicker;
