// @ts-nocheck
// P’TIT 1 — pack audio dédié fourni par l'utilisateur.
// Assets compressés en MP3 dans /public/sounds/ptit1.
// Les sons passent par le moteur audio global (master / impacts / arcade / volume général).

import { playSfx, unlockAudio } from "./sfx";

export type Ptit1SfxKind =
  | "intro"
  | "end"
  | "inner"
  | "outer"
  | "double"
  | "triple"
  | "bull25"
  | "dbull1"
  | "dbull2"
  | "miss"
  | "jackpot"
  | "tripleNul"
  | "perfectOne"
  | "shield"
  | "zero"
  | "victory";

const BASE = "/sounds/ptit1";

const PTIT1_SFX: Record<Ptit1SfxKind, { url: string; volume: number }> = {
  intro:      { url: `${BASE}/intro.mp3`, volume: 0.62 },
  end:        { url: `${BASE}/end.mp3`, volume: 0.78 },
  inner:      { url: `${BASE}/small-single-impact.mp3`, volume: 0.72 },
  outer:      { url: `${BASE}/big-single-impact.mp3`, volume: 0.74 },
  double:     { url: `${BASE}/double-impact.mp3`, volume: 0.76 },
  triple:     { url: `${BASE}/triple-impact.mp3`, volume: 0.78 },
  bull25:     { url: `${BASE}/bull25-impact.mp3`, volume: 0.78 },
  dbull1:     { url: `${BASE}/dbull-1-impact.mp3`, volume: 0.82 },
  dbull2:     { url: `${BASE}/dbull-2-impact.mp3`, volume: 0.86 },
  miss:       { url: `${BASE}/miss-danger.mp3`, volume: 0.90 },
  jackpot:    { url: `${BASE}/jackpot-hit.mp3`, volume: 0.90 },
  tripleNul:  { url: `${BASE}/triple-zero.mp3`, volume: 0.88 },
  perfectOne: { url: `${BASE}/perfect-one.mp3`, volume: 0.92 },
  shield:     { url: `${BASE}/shield-unlock.mp3`, volume: 0.90 },
  zero:       { url: `${BASE}/zero-absolute.mp3`, volume: 0.94 },
  victory:    { url: `${BASE}/victory.mp3`, volume: 0.88 },
};

let endSequenceTimer: number | null = null;

export async function unlockPtit1Audio(enabled = true) {
  if (!enabled) return;
  try { await unlockAudio(); } catch {}
}

export function playPtit1Sfx(kind: Ptit1SfxKind, enabled = true) {
  if (!enabled) return;
  const row = PTIT1_SFX[kind];
  if (!row) return;
  try { playSfx(row.url, { volume: row.volume }); } catch {}
}

/**
 * Fin de partie : END d'abord, puis VICTORY quand un vainqueur existe.
 * Les deux fichiers utilisateur restent séparés afin de ne pas les superposer.
 */
export function playPtit1MatchEndSfx(enabled = true, withVictory = true) {
  if (!enabled) return;
  cancelPtit1MatchEndSfx();
  playPtit1Sfx("end", true);
  if (withVictory && typeof window !== "undefined") {
    endSequenceTimer = window.setTimeout(() => {
      endSequenceTimer = null;
      playPtit1Sfx("victory", true);
    }, 4350);
  }
}

export function cancelPtit1MatchEndSfx() {
  if (endSequenceTimer != null && typeof window !== "undefined") {
    try { window.clearTimeout(endSequenceTimer); } catch {}
  }
  endSequenceTimer = null;
}

/**
 * Convertit la métadonnée d'un impact P’TIT 1 vers le son utilisateur associé.
 * Les événements bonus/malus prennent toujours priorité sur le son d'impact normal.
 */
export function ptit1SfxKindForHit(meta: any): Ptit1SfxKind {
  const kind = String(meta?.kind || "inner");
  if (kind === "zero") return "zero";
  if (kind === "jackpot") return "jackpot";
  if (kind === "ptit1Perfect") return "perfectOne";
  if (kind === "tripleNul") return "tripleNul";
  if (kind === "miss") return "miss";
  if (kind === "dbull") return Number(meta?.dbullNo || 0) >= 2 ? "dbull2" : "dbull1";
  if (kind === "bull25") return "bull25";
  if (kind === "double") return "double";
  if (kind === "triple") return "triple";
  if (kind === "outer") return "outer";
  return "inner";
}

export function playPtit1HitSfx(meta: any, enabled = true) {
  playPtit1Sfx(ptit1SfxKindForHit(meta), enabled);
}

/** Séquence BOT, avec résolution du son à chaque fléchette. */
export function playPtit1DartSequence(
  darts: any[],
  enabled = true,
  resolveMeta?: (dart: any, index: number, before: any[]) => any,
  spacing = 180,
) {
  if (!enabled || typeof window === "undefined") return 0;
  const before: any[] = [];
  (darts || []).forEach((dart, index) => {
    const previous = before.slice();
    before.push(dart);
    window.setTimeout(() => {
      try {
        const meta = resolveMeta?.(dart, index, previous) || { kind: "inner" };
        playPtit1HitSfx(meta, true);
      } catch {}
    }, index * spacing);
  });
  return Math.max(0, ((darts || []).length - 1) * spacing);
}
