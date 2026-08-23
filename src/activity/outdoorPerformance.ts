import type { ActivityRecord, ActivitySport } from "./activityTypes";

export type OutdoorPerformanceSport = Extract<ActivitySport, "running" | "trail" | "hiking" | "walking" | "nordic-walking" | "treadmill">;

export type OutdoorSportProfile = {
  id: OutdoorPerformanceSport;
  icon: string;
  fr: string;
  en: string;
  es: string;
  shortFr: string;
  shortEn: string;
  shortEs: string;
  primaryMetric: "pace" | "speed";
  supportsPacer: boolean;
  supportsIntervals: boolean;
  supportsRaceGoals: boolean;
  weeklyDistanceKm: number;
  weeklyElevationM: number;
  weeklySessions: number;
};

export const OUTDOOR_PERFORMANCE_SPORTS: OutdoorPerformanceSport[] = [
  "running",
  "trail",
  "hiking",
  "walking",
  "nordic-walking",
  "treadmill",
];

export const OUTDOOR_SPORT_PROFILES: Record<OutdoorPerformanceSport, OutdoorSportProfile> = {
  running: { id: "running", icon: "🏃", fr: "Running", en: "Running", es: "Running", shortFr: "RUN", shortEn: "RUN", shortEs: "RUN", primaryMetric: "pace", supportsPacer: true, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 25, weeklyElevationM: 250, weeklySessions: 3 },
  trail: { id: "trail", icon: "⛰️", fr: "Trail", en: "Trail", es: "Trail", shortFr: "TRAIL", shortEn: "TRAIL", shortEs: "TRAIL", primaryMetric: "pace", supportsPacer: false, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 22, weeklyElevationM: 700, weeklySessions: 3 },
  hiking: { id: "hiking", icon: "🥾", fr: "Randonnée", en: "Hiking", es: "Senderismo", shortFr: "RANDO", shortEn: "HIKE", shortEs: "RUTA", primaryMetric: "speed", supportsPacer: false, supportsIntervals: false, supportsRaceGoals: false, weeklyDistanceKm: 20, weeklyElevationM: 600, weeklySessions: 2 },
  walking: { id: "walking", icon: "🚶", fr: "Marche", en: "Walking", es: "Caminata", shortFr: "MARCHE", shortEn: "WALK", shortEs: "CAMINAR", primaryMetric: "speed", supportsPacer: false, supportsIntervals: false, supportsRaceGoals: false, weeklyDistanceKm: 18, weeklyElevationM: 200, weeklySessions: 4 },
  "nordic-walking": { id: "nordic-walking", icon: "🥢", fr: "Marche nordique", en: "Nordic walking", es: "Marcha nórdica", shortFr: "NORDIQUE", shortEn: "NORDIC", shortEs: "NÓRDICA", primaryMetric: "speed", supportsPacer: false, supportsIntervals: true, supportsRaceGoals: false, weeklyDistanceKm: 20, weeklyElevationM: 300, weeklySessions: 3 },
  treadmill: { id: "treadmill", icon: "🏃‍♂️", fr: "Tapis roulant", en: "Treadmill", es: "Cinta de correr", shortFr: "TAPIS", shortEn: "TREADMILL", shortEs: "CINTA", primaryMetric: "pace", supportsPacer: true, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 20, weeklyElevationM: 0, weeklySessions: 3 },
};

const STORAGE_KEY = "mss-running-performance-activity-v1";

export function isOutdoorPerformanceSport(value: unknown): value is OutdoorPerformanceSport {
  return OUTDOOR_PERFORMANCE_SPORTS.includes(String(value || "") as OutdoorPerformanceSport);
}

export function loadOutdoorPerformanceSport(): OutdoorPerformanceSport {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isOutdoorPerformanceSport(value) ? value : "running";
  } catch {
    return "running";
  }
}

export function saveOutdoorPerformanceSport(sport: OutdoorPerformanceSport) {
  try { localStorage.setItem(STORAGE_KEY, sport); } catch {}
  try { window.dispatchEvent(new CustomEvent("mss:outdoor-performance-sport", { detail: { sport } })); } catch {}
}

export function outdoorSportLabel(sport: OutdoorPerformanceSport, lang: string) {
  const profile = OUTDOOR_SPORT_PROFILES[sport];
  return lang === "fr" ? profile.fr : lang === "es" ? profile.es : profile.en;
}

export function outdoorSportShortLabel(sport: OutdoorPerformanceSport, lang: string) {
  const profile = OUTDOOR_SPORT_PROFILES[sport];
  return lang === "fr" ? profile.shortFr : lang === "es" ? profile.shortEs : profile.shortEn;
}

export function filterOutdoorActivities(records: ActivityRecord[], sport: OutdoorPerformanceSport) {
  return records.filter((record) => record.sport === sport);
}

export function outdoorActivityTitle(sport: OutdoorPerformanceSport, lang: string) {
  const profile = OUTDOOR_SPORT_PROFILES[sport];
  if (sport === "running") return lang === "fr" ? "Course" : lang === "es" ? "Carrera" : "Run";
  return outdoorSportLabel(sport, lang);
}

export function outdoorPresetIds(sport: OutdoorPerformanceSport) {
  if (sport === "running") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  if (sport === "trail") return new Set(["free", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  if (sport === "hiking") return new Set(["free", "distance-5k", "distance-10k", "easy", "long", "hills"]);
  if (sport === "walking") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "long"]);
  if (sport === "treadmill") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  return new Set(["free", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills"]);
}

export function outdoorRecommendationPreset(sport: OutdoorPerformanceSport, hasElevation: boolean, longRoute: boolean) {
  if (sport === "trail") return hasElevation ? "hills" : longRoute ? "long" : "tempo";
  if (sport === "hiking") return hasElevation ? "hills" : "long";
  if (sport === "walking") return longRoute ? "long" : "easy";
  if (sport === "nordic-walking") return hasElevation ? "hills" : "tempo";
  if (sport === "treadmill") return "tempo";
  return hasElevation ? "hills" : longRoute ? "long" : "easy";
}
