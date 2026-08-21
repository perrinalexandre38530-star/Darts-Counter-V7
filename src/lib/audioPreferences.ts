import { NAVIGATION_MUSIC_TRACK_IDS, type NavigationMusicTrackId } from "./navigationMusicCatalog";

export type NavigationPlaybackMode = "random" | "ordered";
export type AudioSfxCategory = "gameplay" | "impact" | "arcade" | "ui";

export type AudioPreferences = {
  version: 2;
  masterEnabled: boolean;
  navigationMusicEnabled: boolean;
  navigationVolume: number;
  navigationPlaybackMode: NavigationPlaybackMode;
  enabledTrackIds: NavigationMusicTrackId[];
  trackOrder: NavigationMusicTrackId[];
  duckAwenaEnabled: boolean;
  duckAwenaRatio: number;
  gameplaySfxEnabled: boolean;
  impactSfxEnabled: boolean;
  arcadeSfxEnabled: boolean;
  gameplaySfxVolume: number;
  uiSfxEnabled: boolean;
  uiSfxVolume: number;
};

export const AUDIO_PREFERENCES_STORAGE_KEY = "dc_audio_preferences_v2";
export const AUDIO_PREFERENCES_EVENT = "dc:audio-preferences-changed";
export const NAVIGATION_MUSIC_PREVIEW_EVENT = "dc:navigation-music-preview";

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  version: 2,
  masterEnabled: true,
  navigationMusicEnabled: true,
  navigationVolume: 0.22,
  navigationPlaybackMode: "random",
  enabledTrackIds: [...NAVIGATION_MUSIC_TRACK_IDS],
  trackOrder: [...NAVIGATION_MUSIC_TRACK_IDS],
  duckAwenaEnabled: true,
  duckAwenaRatio: 0.25,
  gameplaySfxEnabled: true,
  impactSfxEnabled: true,
  arcadeSfxEnabled: true,
  gameplaySfxVolume: 1,
  uiSfxEnabled: true,
  uiSfxVolume: 1,
};

const clamp01 = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
};

const sanitizeTrackIds = (value: unknown, fallback: NavigationMusicTrackId[]) => {
  const rows = Array.isArray(value) ? value : fallback;
  const valid = rows
    .map((entry) => String(entry || "") as NavigationMusicTrackId)
    .filter((entry) => NAVIGATION_MUSIC_TRACK_IDS.includes(entry));
  return Array.from(new Set(valid));
};

export function sanitizeAudioPreferences(value: unknown): AudioPreferences {
  const raw = value && typeof value === "object" ? (value as Partial<AudioPreferences>) : {};
  const trackOrder = sanitizeTrackIds(raw.trackOrder, [...NAVIGATION_MUSIC_TRACK_IDS]);
  for (const id of NAVIGATION_MUSIC_TRACK_IDS) {
    if (!trackOrder.includes(id)) trackOrder.push(id);
  }

  return {
    version: 2,
    masterEnabled: raw.masterEnabled !== false,
    navigationMusicEnabled: raw.navigationMusicEnabled !== false,
    navigationVolume: clamp01(raw.navigationVolume, DEFAULT_AUDIO_PREFERENCES.navigationVolume),
    navigationPlaybackMode: raw.navigationPlaybackMode === "ordered" ? "ordered" : "random",
    enabledTrackIds: sanitizeTrackIds(raw.enabledTrackIds, [...NAVIGATION_MUSIC_TRACK_IDS]),
    trackOrder,
    duckAwenaEnabled: raw.duckAwenaEnabled !== false,
    duckAwenaRatio: clamp01(raw.duckAwenaRatio, DEFAULT_AUDIO_PREFERENCES.duckAwenaRatio),
    gameplaySfxEnabled: raw.gameplaySfxEnabled !== false,
    impactSfxEnabled: raw.impactSfxEnabled !== false,
    arcadeSfxEnabled: raw.arcadeSfxEnabled !== false,
    gameplaySfxVolume: clamp01(raw.gameplaySfxVolume, DEFAULT_AUDIO_PREFERENCES.gameplaySfxVolume),
    uiSfxEnabled: raw.uiSfxEnabled !== false,
    uiSfxVolume: clamp01(raw.uiSfxVolume, DEFAULT_AUDIO_PREFERENCES.uiSfxVolume),
  };
}

export function getAudioPreferences(): AudioPreferences {
  if (typeof window === "undefined") return {
    ...DEFAULT_AUDIO_PREFERENCES,
    enabledTrackIds: [...DEFAULT_AUDIO_PREFERENCES.enabledTrackIds],
    trackOrder: [...DEFAULT_AUDIO_PREFERENCES.trackOrder],
  };
  try {
    const raw = window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
    return sanitizeAudioPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return {
      ...DEFAULT_AUDIO_PREFERENCES,
      enabledTrackIds: [...DEFAULT_AUDIO_PREFERENCES.enabledTrackIds],
      trackOrder: [...DEFAULT_AUDIO_PREFERENCES.trackOrder],
    };
  }
}

function emitAudioPreferences(next: AudioPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_EVENT, { detail: next }));
  } catch {}
}

export function setAudioPreferences(nextValue: unknown): AudioPreferences {
  const next = sanitizeAudioPreferences(nextValue);
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(AUDIO_PREFERENCES_STORAGE_KEY, JSON.stringify(next)); } catch {}
    emitAudioPreferences(next);
  }
  return next;
}

export function updateAudioPreferences(patch: Partial<AudioPreferences>): AudioPreferences {
  return setAudioPreferences({ ...getAudioPreferences(), ...patch, version: 2 });
}

export function resetAudioPreferences(): AudioPreferences {
  return setAudioPreferences({ ...DEFAULT_AUDIO_PREFERENCES, enabledTrackIds: [...NAVIGATION_MUSIC_TRACK_IDS], trackOrder: [...NAVIGATION_MUSIC_TRACK_IDS] });
}

export function subscribeAudioPreferences(listener: (prefs: AudioPreferences) => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = (event: Event) => {
    const detail = (event as CustomEvent<AudioPreferences>)?.detail;
    listener(detail ? sanitizeAudioPreferences(detail) : getAudioPreferences());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUDIO_PREFERENCES_STORAGE_KEY) listener(getAudioPreferences());
  };
  window.addEventListener(AUDIO_PREFERENCES_EVENT, onChange as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUDIO_PREFERENCES_EVENT, onChange as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getEnabledTrackIds(prefs = getAudioPreferences()): NavigationMusicTrackId[] {
  const enabled = new Set(prefs.enabledTrackIds);
  return prefs.trackOrder.filter((id) => enabled.has(id));
}


export function isMasterAudioEnabled(prefs = getAudioPreferences()): boolean {
  return prefs.masterEnabled;
}

export function isAudioCategoryEnabled(category: AudioSfxCategory, prefs = getAudioPreferences()): boolean {
  if (!prefs.masterEnabled) return false;
  if (category === "ui") return prefs.uiSfxEnabled;
  if (!prefs.gameplaySfxEnabled) return false;
  if (category === "impact") return prefs.impactSfxEnabled;
  if (category === "arcade") return prefs.arcadeSfxEnabled;
  return true;
}

export function resolveAudioVolume(localVolume: number, category: AudioSfxCategory, prefs = getAudioPreferences()): number {
  if (!isAudioCategoryEnabled(category, prefs)) return 0;
  const local = clamp01(localVolume, 1);
  const global = category === "ui" ? prefs.uiSfxVolume : prefs.gameplaySfxVolume;
  return Math.max(0, Math.min(1, local * global));
}
