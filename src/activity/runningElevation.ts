import { haversineMeters, routeDistanceMeters } from "./activityMath";
import { routeElapsedAtDistance } from "./runningRoutes";
import type { ActivityRecord, GeoPoint } from "./activityTypes";

export type ElevationSample = {
  index: number;
  distanceM: number;
  altitudeM: number;
  gradePct: number;
  elapsedMs: number | null;
};

export type RunningHill = {
  id: string;
  startDistanceM: number;
  endDistanceM: number;
  distanceM: number;
  gainM: number;
  avgGradePct: number;
  maxGradePct: number;
  startAltitudeM: number;
  endAltitudeM: number;
};

export type TerrainKind = "flat" | "rolling" | "hilly" | "mountainous";

export type RunningTerrainAnalysis = {
  hasElevation: boolean;
  distanceM: number;
  gainM: number;
  lossM: number;
  minAltitudeM: number | null;
  maxAltitudeM: number | null;
  maxGradePct: number;
  gainPerKm: number;
  hills: RunningHill[];
  difficultyScore: number;
  terrain: TerrainKind;
  samples: ElevationSample[];
};

export type HillEffort = RunningHill & {
  activityId: string;
  startedAt: number;
  elapsedMs: number | null;
  verticalSpeedMph: number | null;
  title?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothAltitudes(points: GeoPoint[], radius = 2): Array<number | null> {
  return points.map((point, index) => {
    if (!Number.isFinite(point.altitude)) return null;
    const values: number[] = [];
    for (let i = Math.max(0, index - radius); i <= Math.min(points.length - 1, index + radius); i += 1) {
      if (Number.isFinite(points[i]?.altitude)) values.push(Number(points[i].altitude));
    }
    if (!values.length) return null;
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
}

function elapsedAtPoint(points: GeoPoint[], index: number): number | null {
  const point = points[index];
  if (Number.isFinite(point?.elapsedMs)) return Math.max(0, Number(point.elapsedMs));
  const first = Number(points[0]?.timestamp || 0);
  const current = Number(point?.timestamp || 0);
  return first > 0 && current >= first ? current - first : null;
}

export function buildElevationSamples(points: GeoPoint[]): ElevationSample[] {
  if (points.length < 2) return [];
  const altitudes = smoothAltitudes(points);
  const out: ElevationSample[] = [];
  let cumulative = 0;
  let previousValid: { point: GeoPoint; altitudeM: number; distanceM: number } | null = null;

  for (let index = 0; index < points.length; index += 1) {
    if (index > 0) cumulative += haversineMeters(points[index - 1], points[index]);
    const altitude = altitudes[index];
    if (!Number.isFinite(altitude)) continue;
    let gradePct = 0;
    if (previousValid) {
      const horizontal = Math.max(1, cumulative - previousValid.distanceM);
      gradePct = horizontal >= 15 ? clamp(((Number(altitude) - previousValid.altitudeM) / horizontal) * 100, -35, 35) : 0;
    }
    out.push({ index, distanceM: cumulative, altitudeM: Number(altitude), gradePct, elapsedMs: elapsedAtPoint(points, index) });
    previousValid = { point: points[index], altitudeM: Number(altitude), distanceM: cumulative };
  }
  return out;
}

function detectHills(samples: ElevationSample[]): RunningHill[] {
  if (samples.length < 3) return [];
  const hills: RunningHill[] = [];
  let start = 0;

  const commit = (end: number) => {
    if (end <= start) return;
    const a = samples[start];
    const b = samples[end];
    const distanceM = Math.max(0, b.distanceM - a.distanceM);
    const gainM = b.altitudeM - a.altitudeM;
    if (distanceM < 120 || gainM < 8) return;
    const avgGradePct = (gainM / Math.max(1, distanceM)) * 100;
    if (avgGradePct < 2) return;
    const local = samples.slice(start + 1, end + 1);
    const maxGradePct = local.reduce((best, row) => Math.max(best, row.gradePct), 0);
    hills.push({
      id: `hill_${Math.round(a.distanceM)}_${Math.round(b.distanceM)}`,
      startDistanceM: a.distanceM,
      endDistanceM: b.distanceM,
      distanceM,
      gainM,
      avgGradePct,
      maxGradePct,
      startAltitudeM: a.altitudeM,
      endAltitudeM: b.altitudeM,
    });
  };

  let peak = start;
  let peakAltitude = samples[start].altitudeM;
  for (let i = 1; i < samples.length; i += 1) {
    const altitude = samples[i].altitudeM;
    if (altitude >= peakAltitude) {
      peakAltitude = altitude;
      peak = i;
      continue;
    }
    const drop = peakAltitude - altitude;
    if (drop >= 5) {
      commit(peak);
      start = i;
      peak = i;
      peakAltitude = altitude;
    } else if (altitude < samples[start].altitudeM) {
      start = i;
      peak = i;
      peakAltitude = altitude;
    }
  }
  commit(peak);

  return hills
    .filter((hill, index, rows) => index === 0 || hill.startDistanceM - rows[index - 1].endDistanceM > 25 || hill.gainM > rows[index - 1].gainM * 0.45)
    .sort((a, b) => a.startDistanceM - b.startDistanceM);
}

export function analyzeRunningTerrain(points: GeoPoint[]): RunningTerrainAnalysis {
  const distanceM = routeDistanceMeters(points);
  const samples = buildElevationSamples(points);
  if (samples.length < 2) {
    return { hasElevation: false, distanceM, gainM: 0, lossM: 0, minAltitudeM: null, maxAltitudeM: null, maxGradePct: 0, gainPerKm: 0, hills: [], difficultyScore: 0, terrain: "flat", samples: [] };
  }

  let gainM = 0;
  let lossM = 0;
  let maxGradePct = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const delta = samples[i].altitudeM - samples[i - 1].altitudeM;
    if (delta >= 1.2) gainM += delta;
    else if (delta <= -1.2) lossM += Math.abs(delta);
    maxGradePct = Math.max(maxGradePct, samples[i].gradePct);
  }
  const hills = detectHills(samples);
  const minAltitudeM = Math.min(...samples.map((row) => row.altitudeM));
  const maxAltitudeM = Math.max(...samples.map((row) => row.altitudeM));
  const km = Math.max(.25, distanceM / 1000);
  const gainPerKm = gainM / km;
  const distanceScore = clamp((km / 25) * 24, 0, 24);
  const elevationScore = clamp((gainPerKm / 45) * 36, 0, 36);
  const gradeScore = clamp((maxGradePct / 14) * 22, 0, 22);
  const hillScore = clamp((hills.length / 5) * 18, 0, 18);
  const difficultyScore = Math.round(clamp(distanceScore + elevationScore + gradeScore + hillScore, 0, 100));
  const terrain: TerrainKind = difficultyScore >= 72 ? "mountainous" : difficultyScore >= 46 ? "hilly" : difficultyScore >= 22 ? "rolling" : "flat";
  return { hasElevation: true, distanceM, gainM, lossM, minAltitudeM, maxAltitudeM, maxGradePct, gainPerKm, hills, difficultyScore, terrain, samples };
}

export function terrainLabel(terrain: TerrainKind, lang: string) {
  const row = {
    flat: ["PLAT", "FLAT", "LLANO"],
    rolling: ["VALLONNÉ", "ROLLING", "ONDULADO"],
    hilly: ["ACCIDENTÉ", "HILLY", "CON CUESTAS"],
    mountainous: ["MONTAGNE", "MOUNTAINOUS", "MONTAÑA"],
  }[terrain];
  return lang === "fr" ? row[0] : lang === "es" ? row[2] : row[1];
}

export function terrainAdvice(analysis: RunningTerrainAnalysis, lang: string) {
  const terrain = terrainLabel(analysis.terrain, lang);
  let presetId = "easy";
  if (analysis.hills.length >= 2 || analysis.gainPerKm >= 28 || analysis.maxGradePct >= 7) presetId = "hills";
  else if (analysis.distanceM >= 12000) presetId = "long";
  else if (analysis.terrain === "flat" && analysis.distanceM >= 4000) presetId = "tempo";

  const fr = presetId === "hills"
    ? `Parcours ${terrain.toLowerCase()} : privilégie une séance côtes, un départ contrôlé et garde de la marge avant les montées les plus raides.`
    : presetId === "long"
      ? `Parcours long (${(analysis.distanceM / 1000).toFixed(1)} km) : pars en endurance et conserve une allure régulière.`
      : presetId === "tempo"
        ? `Parcours plutôt plat : bon support pour une séance tempo ou un travail d’allure régulière.`
        : `Profil modéré : une sortie facile reste le choix le plus polyvalent.`;
  const en = presetId === "hills"
    ? `Hilly route: choose a hill-focused session, start controlled and keep margin before the steepest climbs.`
    : presetId === "long"
      ? `Long route (${(analysis.distanceM / 1000).toFixed(1)} km): stay aerobic and keep the effort even.`
      : presetId === "tempo"
        ? `Mostly flat route: a good match for tempo or steady pace work.`
        : `Moderate profile: an easy run is the most versatile choice.`;
  const es = presetId === "hills"
    ? `Ruta con cuestas: prioriza una sesión de subidas, empieza controlado y guarda margen antes de las pendientes más fuertes.`
    : presetId === "long"
      ? `Ruta larga (${(analysis.distanceM / 1000).toFixed(1)} km): mantén un esfuerzo aeróbico y regular.`
      : presetId === "tempo"
        ? `Ruta bastante llana: buena opción para tempo o ritmo constante.`
        : `Perfil moderado: una salida suave es la opción más versátil.`;
  return { presetId, text: lang === "fr" ? fr : lang === "es" ? es : en };
}

export function activityHillEfforts(activity: ActivityRecord): HillEffort[] {
  const analysis = analyzeRunningTerrain(activity.route || []);
  return analysis.hills.map((hill) => {
    const start = routeElapsedAtDistance(activity.route || [], hill.startDistanceM);
    const end = routeElapsedAtDistance(activity.route || [], hill.endDistanceM);
    const elapsedMs = start != null && end != null && end > start ? end - start : null;
    const verticalSpeedMph = elapsedMs && elapsedMs > 0 ? hill.gainM / (elapsedMs / 3_600_000) : null;
    return { ...hill, activityId: activity.id, startedAt: activity.startedAt, elapsedMs, verticalSpeedMph, title: activity.title };
  });
}

export function bestHillEfforts(activities: ActivityRecord[]) {
  const efforts = activities.flatMap(activityHillEfforts).filter((row) => row.gainM >= 8);
  return {
    biggestGain: efforts.slice().sort((a, b) => b.gainM - a.gainM)[0] || null,
    steepest: efforts.slice().sort((a, b) => b.avgGradePct - a.avgGradePct)[0] || null,
    fastestVertical: efforts.filter((row) => row.verticalSpeedMph != null).sort((a, b) => Number(b.verticalSpeedMph) - Number(a.verticalSpeedMph))[0] || null,
    efforts: efforts.sort((a, b) => b.startedAt - a.startedAt),
  };
}

export type ElevationPaceRow = {
  km: number;
  paceSecPerKm: number | null;
  elevationDeltaM: number;
  gainM: number;
};

export function elevationPaceRows(activity: ActivityRecord): ElevationPaceRow[] {
  const analysis = analyzeRunningTerrain(activity.route || []);
  if (!analysis.samples.length) return [];
  return (activity.splits || []).map((split, index) => {
    const startM = index * 1000;
    const endM = (index + 1) * 1000;
    const rows = analysis.samples.filter((row) => row.distanceM >= startM && row.distanceM <= endM);
    const first = rows[0];
    const last = rows[rows.length - 1];
    let gainM = 0;
    for (let i = 1; i < rows.length; i += 1) gainM += Math.max(0, rows[i].altitudeM - rows[i - 1].altitudeM);
    return { km: split.index, paceSecPerKm: split.paceSecPerKm, elevationDeltaM: first && last ? last.altitudeM - first.altitudeM : 0, gainM };
  });
}
