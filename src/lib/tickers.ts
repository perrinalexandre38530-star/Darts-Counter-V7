// @ts-nocheck
// =============================================================
// src/lib/tickers.ts
// Central helper to resolve ticker images by key.
// Used by DiceMenuGames (and can be reused elsewhere).
//
// Notes:
// - We rely on Vite import.meta.glob for static assets.
// - If a key is unknown or asset missing, returns null.
// =============================================================

type GlobMap = Record<string, () => Promise<any>>;

// Grab all tickers under src/assets/tickers (png/jpg/webp)
const TICKERS_GLOB: GlobMap = import.meta.glob("../assets/tickers/**/*.{png,jpg,jpeg,webp}", { eager: false });

// Small alias map (optional). Add entries when you create dice tickers.
const ALIASES: Record<string, string> = {
  // Example:
  // "dice_duel": "ticker_dice_duel.png",
};

function normalizeKey(key: string) {
  return String(key || "").trim().toLowerCase().replace(/\s+/g, "_");
}

// Resolve by filename (best-effort)
export async function getTicker(key: string): Promise<string | null> {
  const k = normalizeKey(key);
  const wantedName = ALIASES[k] || k;

  // Try exact filename match
  const entries = Object.keys(TICKERS_GLOB);
  const exact = entries.find((p) => p.toLowerCase().endsWith(`/${wantedName}`) || p.toLowerCase().endsWith(`/${wantedName}.png`) || p.toLowerCase().endsWith(`/${wantedName}.jpg`) || p.toLowerCase().endsWith(`/${wantedName}.jpeg`) || p.toLowerCase().endsWith(`/${wantedName}.webp`));
  if (exact) {
    try {
      const mod = await TICKERS_GLOB[exact]();
      return mod?.default || mod || null;
    } catch {
      return null;
    }
  }

  // Try partial match on filename
  const partial = entries.find((p) => p.toLowerCase().includes(wantedName));
  if (partial) {
    try {
      const mod = await TICKERS_GLOB[partial]();
      return mod?.default || mod || null;
    } catch {
      return null;
    }
  }

  return null;
}

// Synchronous wrapper when you don't want async (returns null if not already cached).
// Prefer getTicker() above for real usage.
export function getTickerSync(_key: string): string | null {
  return null;
}
