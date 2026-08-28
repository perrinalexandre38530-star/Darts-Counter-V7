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
  "treadmill",
];

export const OUTDOOR_SPORT_PROFILES: Record<OutdoorPerformanceSport, OutdoorSportProfile> = {
  running: { id: "running", icon: "🏃", fr: "Running", en: "Running", es: "Running", shortFr: "RUN", shortEn: "RUN", shortEs: "RUN", primaryMetric: "pace", supportsPacer: true, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 25, weeklyElevationM: 250, weeklySessions: 3 },
  trail: { id: "trail", icon: "⛰️", fr: "Trail", en: "Trail", es: "Trail", shortFr: "TRAIL", shortEn: "TRAIL", shortEs: "TRAIL", primaryMetric: "pace", supportsPacer: false, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 22, weeklyElevationM: 700, weeklySessions: 3 },
  hiking: { id: "hiking", icon: "🥾", fr: "Randonnée", en: "Hiking", es: "Senderismo", shortFr: "RANDO", shortEn: "HIKE", shortEs: "RUTA", primaryMetric: "speed", supportsPacer: false, supportsIntervals: false, supportsRaceGoals: false, weeklyDistanceKm: 20, weeklyElevationM: 600, weeklySessions: 2 },
  walking: { id: "walking", icon: "🚶", fr: "Marche", en: "Walking", es: "Caminata", shortFr: "MARCHE", shortEn: "WALK", shortEs: "CAMINAR", primaryMetric: "speed", supportsPacer: false, supportsIntervals: true, supportsRaceGoals: false, weeklyDistanceKm: 18, weeklyElevationM: 250, weeklySessions: 4 },
  "nordic-walking": { id: "nordic-walking", icon: "🥢", fr: "Marche nordique", en: "Nordic walking", es: "Marcha nórdica", shortFr: "NORDIQUE", shortEn: "NORDIC", shortEs: "NÓRDICA", primaryMetric: "speed", supportsPacer: false, supportsIntervals: true, supportsRaceGoals: false, weeklyDistanceKm: 20, weeklyElevationM: 300, weeklySessions: 3 },
  treadmill: { id: "treadmill", icon: "🏃‍♂️", fr: "Tapis roulant", en: "Treadmill", es: "Cinta de correr", shortFr: "TAPIS", shortEn: "TREADMILL", shortEs: "CINTA", primaryMetric: "pace", supportsPacer: true, supportsIntervals: true, supportsRaceGoals: true, weeklyDistanceKm: 20, weeklyElevationM: 0, weeklySessions: 3 },
};

const STORAGE_KEY = "mss-running-performance-activity-v1";

export function canonicalOutdoorPerformanceSport(value: unknown): OutdoorPerformanceSport {
  const raw = String(value || "");
  if (raw === "nordic-walking") return "walking";
  return OUTDOOR_PERFORMANCE_SPORTS.includes(raw as OutdoorPerformanceSport) ? raw as OutdoorPerformanceSport : "running";
}

export function isOutdoorPerformanceSport(value: unknown): value is OutdoorPerformanceSport {
  const raw = String(value || "");
  return raw === "nordic-walking" || OUTDOOR_PERFORMANCE_SPORTS.includes(raw as OutdoorPerformanceSport);
}

export function loadOutdoorPerformanceSport(): OutdoorPerformanceSport {
  try {
    return canonicalOutdoorPerformanceSport(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "running";
  }
}

export function saveOutdoorPerformanceSport(sport: OutdoorPerformanceSport) {
  const canonical = canonicalOutdoorPerformanceSport(sport);
  try { localStorage.setItem(STORAGE_KEY, canonical); } catch {}
  try { window.dispatchEvent(new CustomEvent("mss:outdoor-performance-sport", { detail: { sport: canonical } })); } catch {}
}

export function outdoorSportLabel(sport: OutdoorPerformanceSport, lang: string) {
  const profile = OUTDOOR_SPORT_PROFILES[canonicalOutdoorPerformanceSport(sport)];
  return lang === "fr" ? profile.fr : lang === "es" ? profile.es : profile.en;
}

export function outdoorSportShortLabel(sport: OutdoorPerformanceSport, lang: string) {
  const profile = OUTDOOR_SPORT_PROFILES[canonicalOutdoorPerformanceSport(sport)];
  return lang === "fr" ? profile.shortFr : lang === "es" ? profile.shortEs : profile.shortEn;
}

export function filterOutdoorActivities(records: ActivityRecord[], sport: OutdoorPerformanceSport) {
  const canonical = canonicalOutdoorPerformanceSport(sport);
  return records.filter((record) => canonicalOutdoorPerformanceSport(record.sport) === canonical);
}

export function outdoorUsesSpeedMetric(sport: OutdoorPerformanceSport) {
  return OUTDOOR_SPORT_PROFILES[canonicalOutdoorPerformanceSport(sport)].primaryMetric === "speed";
}

export function outdoorAverageMetricLabel(sport: OutdoorPerformanceSport, lang: string) {
  if (outdoorUsesSpeedMetric(sport)) return lang === "fr" ? "VITESSE MOY." : lang === "es" ? "VELOCIDAD MEDIA" : "AVG SPEED";
  return lang === "fr" ? "ALLURE MOY." : lang === "es" ? "RITMO MEDIO" : "AVG PACE";
}

export function outdoorAverageSpeedKmh(record: Pick<ActivityRecord, "avgSpeedMps" | "avgPaceSecPerKm">) {
  const direct = Number(record.avgSpeedMps || 0) * 3.6;
  if (Number.isFinite(direct) && direct > 0) return direct;
  const pace = Number(record.avgPaceSecPerKm || 0);
  return Number.isFinite(pace) && pace > 0 ? 3600 / pace : 0;
}

export function outdoorAverageMetricValue(record: Pick<ActivityRecord, "avgSpeedMps" | "avgPaceSecPerKm">, sport: OutdoorPerformanceSport) {
  if (outdoorUsesSpeedMetric(sport)) return `${outdoorAverageSpeedKmh(record).toFixed(1)} km/h`;
  const pace = Number(record.avgPaceSecPerKm || 0);
  if (!Number.isFinite(pace) || pace <= 0) return "--:-- /km";
  const total = Math.round(pace);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} /km`;
}

export function outdoorActivityTitle(sport: OutdoorPerformanceSport, lang: string) {
  return lang === "fr" ? "Sortie" : lang === "es" ? "Salida" : "Activity";
}

export function outdoorPresetIds(sport: OutdoorPerformanceSport) {
  if (sport === "running") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  if (sport === "trail") return new Set(["free", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  if (sport === "hiking") return new Set(["free", "distance-5k", "distance-10k", "easy", "long", "hills"]);
  if (sport === "walking") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "tempo", "long", "hills"]);
  if (sport === "treadmill") return new Set(["free", "distance-1k", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills", "recovery"]);
  return new Set(["free", "distance-5k", "distance-10k", "easy", "tempo", "intervals", "long", "hills"]);
}


export function outdoorTrainingPresetIds(sport: OutdoorPerformanceSport) {
  if (sport === "running") return ["easy", "tempo", "intervals", "hills", "long", "recovery"];
  if (sport === "trail") return ["easy", "hills", "long", "recovery"];
  if (sport === "walking") return ["easy", "tempo", "hills", "long"];
  if (sport === "treadmill") return ["easy", "tempo", "intervals", "hills", "long", "recovery"];
  return [];
}

export function outdoorGoalDistancesKm(sport: OutdoorPerformanceSport) {
  if (sport === "running") return [1, 5, 10, 21.1];
  if (sport === "trail") return [5, 10, 20, 30];
  if (sport === "hiking") return [5, 10, 15, 20];
  if (sport === "walking") return [3, 5, 10, 15];
  return [1, 5, 10];
}

export function outdoorGoalDurationsMin(sport: OutdoorPerformanceSport) {
  if (sport === "trail") return [45, 60, 90, 120, 180];
  if (sport === "hiking") return [60, 120, 180, 240];
  if (sport === "walking") return [20, 30, 45, 60, 90, 120];
  if (sport === "treadmill") return [20, 30, 45, 60];
  return [20, 30, 45, 60, 90];
}

export function outdoorDefaultGoal(sport: OutdoorPerformanceSport) {
  if (sport === "trail") return { distanceKm: 10, durationMin: 90 };
  if (sport === "hiking") return { distanceKm: 10, durationMin: 120 };
  if (sport === "walking") return { distanceKm: 5, durationMin: 45 };
  if (sport === "treadmill") return { distanceKm: 5, durationMin: 30 };
  return { distanceKm: 5, durationMin: 45 };
}

export function outdoorRecommendationPreset(sport: OutdoorPerformanceSport, hasElevation: boolean, longRoute: boolean) {
  if (sport === "trail") return hasElevation ? "hills" : longRoute ? "long" : "tempo";
  if (sport === "hiking") return hasElevation ? "hills" : "long";
  if (sport === "walking") return hasElevation ? "hills" : longRoute ? "long" : "easy";
  if (sport === "treadmill") return "tempo";
  return hasElevation ? "hills" : longRoute ? "long" : "easy";
}
