// ============================================
// CRADOS — identité sonore dédiée
// - réutilise dart-hit du X01 (aucune duplication d'asset)
// - BULL / DBULL / MISS / changement de joueur / intro / victoire dédiés
// - respecte les préférences audio globales via le gestionnaire SFX commun
// ============================================

import { playSfx, unlockAudio } from "./sfx";

export type CradosSfxKey = "start" | "hit" | "bull" | "dbull" | "miss" | "turn" | "victory";

const CRADOS_SFX_URL: Record<CradosSfxKey, string> = {
  start: "/sounds/crados/crados-start.mp3",
  // Son déjà présent/utilisé par X01 : ne pas dupliquer le fichier.
  hit: "/sounds/dart-hit.mp3",
  bull: "/sounds/crados/crados-bull.mp3",
  // splendide.mp3 compressé/renommé pour CRADOS : réservé au DOUBLE BULL.
  dbull: "/sounds/crados/crados-dbull.mp3",
  miss: "/sounds/crados/crados-miss.mp3",
  turn: "/sounds/crados/crados-turn.mp3",
  victory: "/sounds/crados/crados-victory.mp3",
};

const DEFAULT_VOLUME: Record<CradosSfxKey, number> = {
  start: 0.56,
  hit: 0.70,
  bull: 0.82,
  dbull: 0.88,
  miss: 0.78,
  turn: 0.56,
  victory: 0.62,
};

export function unlockCradosAudio() {
  return unlockAudio();
}

export function playCradosSfx(key: CradosSfxKey, volume = DEFAULT_VOLUME[key]) {
  playSfx(CRADOS_SFX_URL[key], { volume });
}

/** Accepte aussi bien la forme UI ({v,mult}) que moteur ({bed,number}). */
export function cradosSfxKeyForDart(dart: any): CradosSfxKey {
  if (!dart) return "hit";

  const bed = String(dart?.bed || "").trim().toUpperCase();
  const rawValue = Number(dart?.v ?? dart?.value ?? dart?.number ?? dart?.n ?? 0);
  const rawMult = Number(dart?.mult ?? dart?.multiplier ?? (bed === "T" ? 3 : bed === "D" || bed === "IB" ? 2 : 1));

  if (bed === "MISS" || rawValue === 0) return "miss";
  if (bed === "IB" || bed === "DBULL" || rawValue === 50 || (rawValue === 25 && rawMult === 2)) return "dbull";
  if (bed === "OB" || bed === "BULL" || rawValue === 25) return "bull";
  return "hit";
}

export function playCradosDartSfx(dart: any) {
  playCradosSfx(cradosSfxKeyForDart(dart));
}

/** Lecture espacée utile pour les volées automatiques des bots. */
export function playCradosDartSequence(darts: any[], gapMs = 170) {
  const rows = Array.isArray(darts) ? darts.slice(0, 3) : [];
  rows.forEach((dart, index) => {
    if (index === 0) playCradosDartSfx(dart);
    else window.setTimeout(() => playCradosDartSfx(dart), index * gapMs);
  });
  return rows.length ? Math.max(0, (rows.length - 1) * gapMs) : 0;
}
