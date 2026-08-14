export type FirefighterSfxKey =
  | "water1"
  | "water2"
  | "water3"
  | "smoke"
  | "protected"
  | "extinguished"
  | "canadair"
  | "no_effect";

const URLS: Record<FirefighterSfxKey, string> = {
  water1: "/sounds/darts-firefighter/water_1.wav",
  water2: "/sounds/darts-firefighter/water_2.wav",
  water3: "/sounds/darts-firefighter/water_3.wav",
  smoke: "/sounds/darts-firefighter/smoke_clear.wav",
  protected: "/sounds/darts-firefighter/protected.wav",
  extinguished: "/sounds/darts-firefighter/extinguished.wav",
  canadair: "/sounds/darts-firefighter/canadair.wav",
  no_effect: "/sounds/darts-firefighter/no_effect.wav",
};

// Petit pool par son : évite cloneNode() à chaque action et réduit fortement
// les allocations/GC sur mobile quand plusieurs feedbacks s'enchaînent.
const POOL_SIZE = 2;
const pools = new Map<FirefighterSfxKey, HTMLAudioElement[]>();
const cursors = new Map<FirefighterSfxKey, number>();
let idlePreloadScheduled = false;

function ensurePool(key: FirefighterSfxKey) {
  if (typeof Audio === "undefined") return [];
  const cached = pools.get(key);
  if (cached) return cached;
  const rows = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(URLS[key]);
    audio.preload = "auto";
    return audio;
  });
  pools.set(key, rows);
  cursors.set(key, 0);
  return rows;
}

function runPreload() {
  idlePreloadScheduled = false;
  if (typeof Audio === "undefined") return;
  (Object.keys(URLS) as FirefighterSfxKey[]).forEach((key) => {
    for (const audio of ensurePool(key)) {
      try { audio.load(); } catch {}
    }
  });
}

export function preloadDartsFirefighterSfx() {
  if (typeof window === "undefined" || typeof Audio === "undefined" || idlePreloadScheduled) return;
  idlePreloadScheduled = true;
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(runPreload, { timeout: 1200 });
  } else {
    window.setTimeout(runPreload, 350);
  }
}

export function playDartsFirefighterSfx(key: FirefighterSfxKey, volume = 0.78) {
  try {
    const pool = ensurePool(key);
    if (!pool.length) return null;
    const cursor = cursors.get(key) || 0;
    const audio = pool[cursor % pool.length];
    cursors.set(key, (cursor + 1) % pool.length);
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    try { audio.currentTime = 0; } catch {}
    void audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}
