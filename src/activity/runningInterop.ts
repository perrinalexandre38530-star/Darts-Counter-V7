import { averagePaceSecPerKm, averageSpeedMps, buildKilometerSplits, elevationGainMeters, movingTimeMs, routeDistanceMeters } from "./activityMath";
import type { ActivityRecord, ActivitySource, GeoPoint } from "./activityTypes";
import type { RunningRouteTemplate } from "./runningRoutes";
import { privacyTrimRoute, type RunningPrivacyPrefs } from "./runningPrivacy";

export type RunningImportResult =
  | { kind: "activity"; activity: ActivityRecord; warnings: string[] }
  | { kind: "route"; route: RunningRouteTemplate; warnings: string[] };

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function numberFrom(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function timeFrom(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Date.parse(value.trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseGpx(xml: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  const re = /<(?:[\w.-]+:)?(?:trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?(?:trkpt|rtept)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const lat = numberFrom(/\blat\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
    const lon = numberFrom(/\blon\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const altitude = numberFrom(/<(?:[\w.-]+:)?ele\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    const timestamp = timeFrom(/<(?:[\w.-]+:)?time\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    points.push({ lat: Number(lat), lon: Number(lon), altitude, timestamp: timestamp || 0 });
  }
  return points;
}

function parseTcx(xml: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  const re = /<(?:[\w.-]+:)?Trackpoint\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?Trackpoint>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const body = match[1] || "";
    const lat = numberFrom(/<(?:[\w.-]+:)?LatitudeDegrees\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    const lon = numberFrom(/<(?:[\w.-]+:)?LongitudeDegrees\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const altitude = numberFrom(/<(?:[\w.-]+:)?AltitudeMeters\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    const timestamp = timeFrom(/<(?:[\w.-]+:)?Time\b[^>]*>([^<]+)<\//i.exec(body)?.[1]);
    points.push({ lat: Number(lat), lon: Number(lon), altitude, timestamp: timestamp || 0 });
  }
  return points;
}

function normalizeTimedPoints(points: GeoPoint[]): { points: GeoPoint[]; timed: boolean; startedAt: number; endedAt: number } {
  const validTimes = points.map((point) => point.timestamp).filter((value) => Number.isFinite(value) && value > 0);
  const timed = validTimes.length >= 2 && Math.max(...validTimes) > Math.min(...validTimes);
  const startedAt = timed ? Math.min(...validTimes) : Date.now();
  let last = startedAt;
  const normalized = points.map((point, index) => {
    const proposed = timed && point.timestamp > 0 ? point.timestamp : startedAt + index * 1000;
    const timestamp = Math.max(last, proposed);
    last = timestamp;
    return { ...point, timestamp, elapsedMs: Math.max(0, timestamp - startedAt) };
  });
  return { points: normalized, timed, startedAt, endedAt: normalized[normalized.length - 1]?.timestamp || startedAt };
}


function simplifyRoute(points: GeoPoint[], maxPoints = 420): GeoPoint[] {
  if (points.length <= maxPoints) return points.map((point) => ({ ...point }));
  const step = Math.ceil(points.length / maxPoints);
  const out = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  return out.slice(0, maxPoints).map((point) => ({ ...point }));
}

function titleFromFile(fileName: string) {
  return decodeXml(String(fileName || "Running import").replace(/\.(gpx|tcx)$/i, "").replace(/[_-]+/g, " ").trim()) || "Running import";
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseRunningImport(text: string, fileName: string): RunningImportResult {
  const xml = String(text || "");
  if (xml.length > 12_000_000) throw new Error("Fichier trop volumineux (12 Mo max)." );
  const ext = /\.tcx$/i.test(fileName) ? "tcx" : /\.gpx$/i.test(fileName) ? "gpx" : /TrainingCenterDatabase/i.test(xml) ? "tcx" : "gpx";
  const raw = ext === "tcx" ? parseTcx(xml) : parseGpx(xml);
  if (raw.length < 2) throw new Error("Aucun tracé GPS exploitable trouvé dans ce fichier.");
  const normalized = normalizeTimedPoints(raw);
  const distanceM = routeDistanceMeters(normalized.points);
  if (distanceM < 50) throw new Error("Le tracé importé est trop court pour une activité Running.");
  const elevationGainM = elevationGainMeters(normalized.points);
  const warnings: string[] = [];
  if (!normalized.timed) warnings.push("Le fichier ne contient pas de chronométrage exploitable : il est importé comme parcours uniquement.");
  const title = titleFromFile(fileName);

  if (!normalized.timed) {
    const route: RunningRouteTemplate = {
      id: makeId(`route_${ext}`),
      name: title,
      route: simplifyRoute(normalized.points),
      distanceM,
      elevationGainM,
      referenceElapsedMs: 0,
      createdAt: Date.now(),
      source: ext,
      sourceFileName: fileName,
    };
    return { kind: "route", route, warnings };
  }

  const elapsedMs = Math.max(1, normalized.endedAt - normalized.startedAt);
  const activity: ActivityRecord = {
    id: makeId(`import_${ext}`),
    sport: "running",
    source: ext as ActivitySource,
    verification: "declared",
    startedAt: normalized.startedAt,
    endedAt: normalized.endedAt,
    elapsedMs,
    movingMs: movingTimeMs(normalized.points) || elapsedMs,
    distanceM,
    avgSpeedMps: averageSpeedMps(distanceM, elapsedMs),
    avgPaceSecPerKm: averagePaceSecPerKm(distanceM, elapsedMs),
    elevationGainM,
    route: normalized.points,
    splits: buildKilometerSplits(normalized.points, normalized.startedAt),
    title,
    workoutType: "free",
    deviceName: ext.toUpperCase(),
    sourceFileName: fileName,
    importedAt: Date.now(),
    createdAt: Date.now(),
  };
  return { kind: "activity", activity, warnings };
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function activityToGpx(activity: ActivityRecord, prefs: RunningPrivacyPrefs): string {
  const points = privacyTrimRoute(activity.route || [], prefs.hideStartEndM);
  if (points.length < 2) throw new Error("La zone privée masque trop de points pour exporter ce parcours.");
  const body = points.map((point) => {
    const ele = Number.isFinite(point.altitude) ? `<ele>${Number(point.altitude).toFixed(1)}</ele>` : "";
    const time = prefs.includeTimestampsInExport && Number.isFinite(point.timestamp) && point.timestamp > 0 ? `<time>${new Date(point.timestamp).toISOString()}</time>` : "";
    return `<trkpt lat="${point.lat.toFixed(7)}" lon="${point.lon.toFixed(7)}">${ele}${time}</trkpt>`;
  }).join("");
  const name = xmlEscape(activity.title || "Running Performance");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Running Performance - Multisports Scoring" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${name}</name></metadata><trk><name>${name}</name><trkseg>${body}</trkseg></trk></gpx>`;
}

export function downloadGpx(activity: ActivityRecord, prefs: RunningPrivacyPrefs) {
  const xml = activityToGpx(activity, prefs);
  const blob = new Blob([xml], { type: "application/gpx+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const base = (activity.title || "running-performance").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "running-performance";
  anchor.href = url;
  anchor.download = `${base}.gpx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
