// ============================================
// src/lib/killerSfx.ts
// Killer SFX ADDITIF (ne remplace rien)
// ============================================

import { playSfx } from "./sfxCore";

type Mult = "S" | "D" | "T";

const pick = (a: string[]) =>
  a[Math.floor(Math.random() * a.length)];

const KILL: Record<Mult, string[]> = {
  // FIX CASSE ANDROID / LINUX
  S: ["/sounds/killer-kill-1.mp3", "/sounds/killer-kill-1.mp3"],
  D: ["/sounds/killer-kill-2.mp3"],
  T: ["/sounds/killer-kill-3.mp3"],
};

const SELF: Record<Mult, string[]> = {
  S: ["/sounds/killer-selfhit-1.mp3"],
  D: ["/sounds/killer-selfhit-2.mp3"],
  T: ["/sounds/killer-selfhit-3.mp3"],
};

const AUTOKILL: Record<Mult, string[]> = {
  S: ["/sounds/killer-autokill-1.mp3"],
  D: ["/sounds/killer-autokill-2.mp3"],
  T: ["/sounds/killer-autokill-3.mp3"],
};

export const killerSfx = {
  kill(mult: Mult) {
    playSfx(pick(KILL[mult]), { volume: 0.9 });
  },
  selfHit(mult: Mult) {
    playSfx(pick(SELF[mult]), { volume: 0.9 });
  },
  autoKill(mult: Mult) {
    playSfx(pick(AUTOKILL[mult]), { volume: 1 });
  },
};