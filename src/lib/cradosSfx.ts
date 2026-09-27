// ============================================
// CRADOS — identité sonore dédiée
// - réutilise dart-hit du X01 (aucune duplication d'asset)
// - sons dédiés pour les mécaniques CRADOS
// - respecte les préférences audio globales via le gestionnaire SFX commun
// ============================================

import { playSfx, unlockAudio } from "./sfx";

export type CradosSfxKey =
  | "start"
  | "hit"
  | "bull"
  | "dbull"
  | "double"
  | "triple"
  | "miss"
  | "turn"
  | "victory"
  | "eliminated"
  | "warning"
  | "legWin"
  | "zoneClaimed"
  | "zoneStolen"
  | "dirtyPenalty";

const CRADOS_SFX_URL: Record<CradosSfxKey, string> = {
  start: "/sounds/crados/crados-start.mp3",
  // Son déjà présent/utilisé par X01 : ne pas dupliquer le fichier.
  hit: "/sounds/dart-hit.mp3",
  bull: "/sounds/crados/crados-bull.mp3",
  // splendide.mp3 compressé/renommé pour CRADOS : réservé au DOUBLE BULL.
  dbull: "/sounds/crados/crados-dbull.mp3",
  double: "/sounds/crados/crados-double.mp3",
  triple: "/sounds/crados/crados-triple.mp3",
  miss: "/sounds/crados/crados-miss.mp3",
  turn: "/sounds/crados/crados-turn.mp3",
  victory: "/sounds/crados/crados-victory.mp3",
  eliminated: "/sounds/crados/crados-eliminated.mp3",
  warning: "/sounds/crados/crados-warning.mp3",
  legWin: "/sounds/crados/crados-leg-win.mp3",
  zoneClaimed: "/sounds/crados/crados-zone-claimed.mp3",
  zoneStolen: "/sounds/crados/crados-zone-stolen.mp3",
  dirtyPenalty: "/sounds/crados/crados-dirty-penalty.mp3",
};

const DEFAULT_VOLUME: Record<CradosSfxKey, number> = {
  start: 0.56,
  hit: 0.70,
  bull: 0.82,
  dbull: 0.88,
  double: 0.78,
  triple: 0.82,
  miss: 0.78,
  turn: 0.56,
  victory: 0.62,
  eliminated: 0.78,
  warning: 0.72,
  legWin: 0.70,
  zoneClaimed: 0.72,
  zoneStolen: 0.76,
  dirtyPenalty: 0.72,
};

export function unlockCradosAudio() {
  return unlockAudio();
}

export function playCradosSfx(key: CradosSfxKey, volume = DEFAULT_VOLUME[key], enabled = true) {
  if (!enabled) return;
  playSfx(CRADOS_SFX_URL[key], { volume });
}

export type CradosVictoryMood = "blowout" | "tight" | "comeback" | "solid";

/** Petite signature de victoire contextuelle sans nouvel asset lourd. */
export function playCradosVictorySignature(mood: CradosVictoryMood = "solid", enabled = true) {
  if (!enabled) return;
  playCradosSfx("victory", undefined, true);
  if (typeof window === "undefined") return;
  if (mood === "blowout") {
    window.setTimeout(() => playCradosSfx("dbull", 0.50, true), 520);
    window.setTimeout(() => playCradosSfx("triple", 0.42, true), 980);
  } else if (mood === "tight") {
    window.setTimeout(() => playCradosSfx("bull", 0.46, true), 720);
  } else if (mood === "comeback") {
    window.setTimeout(() => playCradosSfx("zoneStolen", 0.42, true), 560);
    window.setTimeout(() => playCradosSfx("bull", 0.42, true), 1040);
  }
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
  if (bed === "T" || rawMult === 3) return "triple";
  if (bed === "D" || rawMult === 2) return "double";
  return "hit";
}

export function playCradosDartSfx(dart: any, enabled = true) {
  if (!enabled) return;
  playCradosSfx(cradosSfxKeyForDart(dart), undefined, true);
}

/** Lecture espacée utile pour les volées automatiques des bots. */
export function playCradosDartSequence(darts: any[], gapMs = 170, enabled = true) {
  const rows = Array.isArray(darts) ? darts.slice(0, 3) : [];
  if (!enabled) return 0;
  rows.forEach((dart, index) => {
    if (index === 0) playCradosDartSfx(dart, true);
    else window.setTimeout(() => playCradosDartSfx(dart, true), index * gapMs);
  });
  return rows.length ? Math.max(0, (rows.length - 1) * gapMs) : 0;
}
