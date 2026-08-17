// ============================================================
// src/lib/startupAudioPrefs.ts
// Préférence locale dédiée à l’INTRO complète de démarrage :
// écran animé + jingle. La clé historique est conservée pour
// préserver le choix déjà enregistré par les utilisateurs.
// IMPORTANT : ne contrôle PAS les SFX, voix IA ou musiques des jeux.
// ============================================================

export const STARTUP_INTRO_MUSIC_KEY = "dc_startup_intro_music_enabled_v1";

export function getStartupIntroEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STARTUP_INTRO_MUSIC_KEY);
    if (raw == null) return true; // comportement historique par défaut
    return raw !== "0" && raw !== "false" && raw !== "off";
  } catch {
    return true;
  }
}

export function setStartupIntroEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STARTUP_INTRO_MUSIC_KEY, enabled ? "1" : "0");
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("dc:startup-intro-changed", { detail: { enabled } })
    );
  } catch {}
}

export function stopStartupIntroAudio(): void {
  if (typeof document === "undefined") return;
  const audio = document.getElementById("dc-splash-audio") as HTMLAudioElement | null;
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}

// Compatibilité avec le premier patch qui ne pilotait que le jingle.
// On garde ces alias pour ne casser aucun import éventuel hors de ce patch.
export const getStartupIntroMusicEnabled = getStartupIntroEnabled;
export const setStartupIntroMusicEnabled = setStartupIntroEnabled;
export const stopStartupIntroMusic = stopStartupIntroAudio;
