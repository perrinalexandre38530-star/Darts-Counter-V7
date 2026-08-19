import type { AwenaSettings } from "./awena.types";

export const AWENA_SETTINGS_KEY = "dc_awena_settings_v1";

export const DEFAULT_AWENA_SETTINGS: AwenaSettings = {
  enabled: true,
  voiceEnabled: true,
  voiceCommandsEnabled: false,
  preferOnDeviceRecognition: true,
  interventionMode: "active",
  autoSpeak: true,
  volume: 0.9,
  rate: 1.0,
  pitch: 1.0,
  voiceName: null,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function normalizeAwenaSettings(input: Partial<AwenaSettings> | null | undefined): AwenaSettings {
  const mode = input?.interventionMode;
  return {
    enabled: input?.enabled !== false,
    voiceEnabled: input?.voiceEnabled !== false,
    voiceCommandsEnabled: input?.voiceCommandsEnabled === true,
    preferOnDeviceRecognition: input?.preferOnDeviceRecognition !== false,
    interventionMode: mode === "off" || mode === "discreet" || mode === "active" || mode === "coach" ? mode : "active",
    autoSpeak: input?.autoSpeak !== false,
    volume: clamp(input?.volume, 0, 1, DEFAULT_AWENA_SETTINGS.volume),
    rate: clamp(input?.rate, 0.65, 1.45, DEFAULT_AWENA_SETTINGS.rate),
    pitch: clamp(input?.pitch, 0.75, 1.25, DEFAULT_AWENA_SETTINGS.pitch),
    voiceName: typeof input?.voiceName === "string" && input.voiceName.trim() ? input.voiceName.trim() : null,
  };
}

export function loadAwenaSettings(): AwenaSettings {
  if (typeof window === "undefined") return DEFAULT_AWENA_SETTINGS;
  try {
    const raw = window.localStorage.getItem(AWENA_SETTINGS_KEY);
    if (!raw) return DEFAULT_AWENA_SETTINGS;
    return normalizeAwenaSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_AWENA_SETTINGS;
  }
}

export function saveAwenaSettings(settings: AwenaSettings): AwenaSettings {
  const normalized = normalizeAwenaSettings(settings);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AWENA_SETTINGS_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("dc:awena-settings", { detail: normalized }));
    } catch {}
  }
  return normalized;
}
