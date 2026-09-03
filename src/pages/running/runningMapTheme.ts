import { pickRunningText as pickText } from "../../activity/runningShared";

export type RunningMapTheme = "tourist" | "illustrated" | "light" | "night" | "satellite";

const STORAGE_KEY = "mss-running-map-theme-v1";
const THEMES: RunningMapTheme[] = ["tourist", "illustrated", "light", "night", "satellite"];

export function normalizeRunningMapTheme(value: unknown): RunningMapTheme {
  const id = String(value || "").toLowerCase() as RunningMapTheme;
  return THEMES.includes(id) ? id : "tourist";
}

export function loadRunningMapTheme(): RunningMapTheme {
  if (typeof window === "undefined") return "tourist";
  try { return normalizeRunningMapTheme(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return "tourist"; }
}

export function saveRunningMapTheme(theme: RunningMapTheme) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, normalizeRunningMapTheme(theme)); } catch {}
}

export function runningMapThemeIcon(theme: RunningMapTheme) {
  if (theme === "tourist") return "⛰";
  if (theme === "illustrated") return "✎";
  if (theme === "light") return "☀";
  if (theme === "night") return "☾";
  return "◉";
}

export function runningMapThemeLabel(theme: RunningMapTheme, lang: string) {
  if (theme === "tourist") return pickText(lang, "Touristique", "Tourist", "Turístico");
  if (theme === "illustrated") return pickText(lang, "Dessin", "Illustrated", "Dibujo");
  if (theme === "light") return pickText(lang, "Clair", "Light", "Claro");
  if (theme === "night") return pickText(lang, "Nuit", "Night", "Noche");
  return pickText(lang, "Satellite", "Satellite", "Satélite");
}

export function runningMapThemes(lang: string): Array<[RunningMapTheme, string]> {
  return THEMES.map((theme) => [theme, runningMapThemeLabel(theme, lang)]);
}

// Raster imagery is deliberately lazy: these URLs are never requested until
// the user actually selects Satellite. MapLibre keeps the vector map beneath
// it, so a transient imagery failure never leaves the map blank.
export const RUNNING_SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
