// ============================================
// src/lib/sound.ts — Gestion simple des sons
// ============================================

import { isAudioCategoryEnabled, resolveAudioVolume } from "./audioPreferences";
import type { Dart as UIDart } from "./types";

export function playSound(name: string) {
  const normalized = String(name || "").toLowerCase();
  const category = ["180", "bust", "victory", "game-intro", "shanghai"].some((token) => normalized.includes(token)) ? "arcade" : "impact";
  if (!isAudioCategoryEnabled(category)) return;
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = resolveAudioVolume(0.9, category);
    audio.play().catch(() => {});
  } catch (err) {
    console.warn("Erreur lecture son:", name, err);
  }
}

export function playDartSfx(dart: UIDart, volley?: UIDart[]) {
  const total = volley?.reduce((s, d) => s + (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult), 0) || 0;
  if (total === 180) return playSound("180");

  if (dart.v === 25 && dart.mult === 2) return playSound("doublebull");
  if (dart.v === 25) return playSound("bull");
  if (dart.mult === 3) return playSound("triple");
  if (dart.mult === 2) return playSound("double");

  return playSound("dart-hit");
}
