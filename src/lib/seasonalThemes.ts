/** Saison météorologique de l’hémisphère nord, déterminée par la date locale. */
export type AppSeason = "winter" | "spring" | "summer" | "autumn";
export function getAppSeason(date: Date = new Date()): AppSeason {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}
export const SEASON_THEMES: Record<AppSeason, { color: string; glow: string; label: string; emoji: string }> = {
  winter: { color: "#a9dcff", glow: "rgba(93,177,245,.27)", label: "Hiver", emoji: "❄" },
  spring: { color: "#b8f2a1", glow: "rgba(101,208,123,.22)", label: "Printemps", emoji: "✿" },
  summer: { color: "#ffda82", glow: "rgba(255,184,75,.25)", label: "Été", emoji: "☀" },
  autumn: { color: "#f4b780", glow: "rgba(224,114,55,.26)", label: "Automne", emoji: "❧" },
};
export function getSeasonHeaderBackground(date: Date = new Date()): string {
  const theme = SEASON_THEMES[getAppSeason(date)];
  return `radial-gradient(ellipse at 90% 0%,${theme.glow},transparent 52%),linear-gradient(135deg,rgba(8,10,20,.98),rgba(14,18,34,.98))`;
}
