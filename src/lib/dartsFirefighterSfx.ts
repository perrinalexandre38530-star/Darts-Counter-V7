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

const cache = new Map<FirefighterSfxKey, HTMLAudioElement>();

function getAudio(key: FirefighterSfxKey) {
  if (typeof Audio === "undefined") return null;
  let audio = cache.get(key) || null;
  if (!audio) {
    audio = new Audio(URLS[key]);
    audio.preload = "auto";
    cache.set(key, audio);
  }
  return audio;
}

export function preloadDartsFirefighterSfx() {
  if (typeof Audio === "undefined") return;
  (Object.keys(URLS) as FirefighterSfxKey[]).forEach((key) => {
    try { getAudio(key)?.load(); } catch {}
  });
}

export function playDartsFirefighterSfx(key: FirefighterSfxKey, volume = 0.78) {
  try {
    const base = getAudio(key);
    if (!base) return null;
    // Clone pour permettre deux effets très rapprochés sans couper le précédent.
    const audio = base.cloneNode(true) as HTMLAudioElement;
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    void audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}
