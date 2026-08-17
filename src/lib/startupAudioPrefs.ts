// ============================================================
// src/lib/startupAudioPrefs.ts
// Préférence locale dédiée au jingle de démarrage de l'application.
// IMPORTANT : ne contrôle PAS les SFX, voix IA ou musiques des modes de jeu.
// ============================================================

export const STARTUP_INTRO_MUSIC_KEY = "dc_startup_intro_music_enabled_v1";

export function getStartupIntroMusicEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STARTUP_INTRO_MUSIC_KEY);
    if (raw == null) return true; // comportement historique par défaut
    return raw !== "0" && raw !== "false" && raw !== "off";
  } catch {
    return true;
  }
}

export function setStartupIntroMusicEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STARTUP_INTRO_MUSIC_KEY, enabled ? "1" : "0");
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("dc:startup-intro-music-changed", { detail: { enabled } })
    );
  } catch {}
}

export function stopStartupIntroMusic(): void {
  if (typeof document === "undefined") return;
  const audio = document.getElementById("dc-splash-audio") as HTMLAudioElement | null;
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}
