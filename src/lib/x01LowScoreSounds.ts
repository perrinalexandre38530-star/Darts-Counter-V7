// Sons de chambrage X01 pour les petites volées.
// Fichiers servis depuis /public/sounds => URL runtime: /sounds/score_low_XX.mp3

export const X01_LOW_SCORE_SOUND_FILES: string[] = Array.from(
  { length: 86 },
  (_, index) => `score_low_${String(index + 1).padStart(2, "0")}.mp3`
);

let lastX01LowScoreSound = "";

export function pickX01LowScoreSound(): string {
  if (X01_LOW_SCORE_SOUND_FILES.length <= 1) {
    return X01_LOW_SCORE_SOUND_FILES[0] || "score-null.mp3";
  }

  let next =
    X01_LOW_SCORE_SOUND_FILES[
      Math.floor(Math.random() * X01_LOW_SCORE_SOUND_FILES.length)
    ];

  // Évite de rejouer exactement la même vanne deux fois de suite.
  if (next === lastX01LowScoreSound) {
    const index = X01_LOW_SCORE_SOUND_FILES.indexOf(next);
    next = X01_LOW_SCORE_SOUND_FILES[(index + 1) % X01_LOW_SCORE_SOUND_FILES.length];
  }

  lastX01LowScoreSound = next;
  return next;
}
