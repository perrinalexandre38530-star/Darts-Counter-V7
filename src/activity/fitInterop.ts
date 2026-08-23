import { averagePaceSecPerKm, averageSpeedMps, buildKilometerSplits, elevationGainMeters, movingTimeMs, routeDistanceMeters } from "./activityMath";
import type { ActivityRecord, ActivitySensorDevice, ActivitySensorSample, ActivitySport, GeoPoint } from "./activityTypes";
import type { RunningImportResult } from "./runningInterop";
import type { RunningRouteTemplate } from "./runningRoutes";

const FIT_EPOCH_MS = 631_065_600_000;
const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;
const MAX_FIT_BYTES = 24_000_000;

type FitFieldDefinition = { fieldNum: number; size: number; baseType: number };
type FitDefinition = { globalMesgNum: number; littleEndian: boolean; fields: FitFieldDefinition[]; developerFieldBytes: number };
type FitScalar = number | string | null;
type FitMessage = { globalMesgNum: number; fields: Map<number, FitScalar>; timestampMs: number | null; activeElapsedMs: number | null };

type ParsedFit = {
  messages: FitMessage[];
  fileType: number | null;
  warnings: string[];
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromFile(fileName: string) {
  return String(fileName || "FIT import").replace(/\.fit$/i, "").replace(/[_-]+/g, " ").trim() || "FIT import";
}

function finite(value: FitScalar): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function field(message: FitMessage | null | undefined, fieldNum: number) {
  return message?.fields.get(fieldNum) ?? null;
}

function fitTimeMs(value: FitScalar): number | null {
  const seconds = finite(value);
  return seconds == null ? null : seconds * 1000 + FIT_EPOCH_MS;
}

function validCoordinate(raw: number | null) {
  return raw != null && raw !== 0x7fffffff && raw !== -0x80000000;
}

function decodeCoordinate(raw: number | null) {
  return validCoordinate(raw) ? Number(raw) * SEMICIRCLES_TO_DEGREES : null;
}

function scalarSize(baseType: number) {
  const type = baseType & 0x1f;
  if ([0, 1, 2, 10, 13].includes(type)) return 1;
  if ([3, 4, 11].includes(type)) return 2;
  if ([5, 6, 8, 12].includes(type)) return 4;
  if ([9, 14, 15, 16].includes(type)) return 8;
  return 1;
}

function invalidValue(type: number): number | bigint | null {
  if (type === 0 || type === 2) return 0xff;
  if (type === 1) return 0x7f;
  if (type === 3) return 0x7fff;
  if (type === 4) return 0xffff;
  if (type === 5) return 0x7fffffff;
  if (type === 6) return 0xffffffff;
  if (type === 10) return 0;
  if (type === 11) return 0;
  if (type === 12) return 0;
  if (type === 14) return 0x7fffffffffffffffn;
  if (type === 15) return 0xffffffffffffffffn;
  if (type === 16) return 0n;
  return null;
}

function readNumber(view: DataView, offset: number, baseType: number, littleEndian: boolean): FitScalar {
  const type = baseType & 0x1f;
  let value: number | bigint;
  if (type === 0 || type === 2 || type === 10 || type === 13) value = view.getUint8(offset);
  else if (type === 1) value = view.getInt8(offset);
  else if (type === 3) value = view.getInt16(offset, littleEndian);
  else if (type === 4 || type === 11) value = view.getUint16(offset, littleEndian);
  else if (type === 5) value = view.getInt32(offset, littleEndian);
  else if (type === 6 || type === 12) value = view.getUint32(offset, littleEndian);
  else if (type === 8) value = view.getFloat32(offset, littleEndian);
  else if (type === 9) value = view.getFloat64(offset, littleEndian);
  else if (type === 14) value = view.getBigInt64(offset, littleEndian);
  else if (type === 15 || type === 16) value = view.getBigUint64(offset, littleEndian);
  else return null;
  const invalid = invalidValue(type);
  if (invalid != null && value === invalid) return null;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : null;
  }
  return Number.isFinite(value) ? value : null;
}

function readField(view: DataView, offset: number, def: FitFieldDefinition, littleEndian: boolean): FitScalar {
  const type = def.baseType & 0x1f;
  if (type === 7) {
    const bytes: number[] = [];
    for (let i = 0; i < def.size; i += 1) {
      const byte = view.getUint8(offset + i);
      if (!byte) break;
      bytes.push(byte);
    }
    try { return new TextDecoder().decode(new Uint8Array(bytes)).trim() || null; } catch { return null; }
  }
  const unit = scalarSize(def.baseType);
  if (def.size < unit) return null;
  return readNumber(view, offset, def.baseType, littleEndian);
}

function timestampFromFields(fields: Map<number, FitScalar>) {
  return fitTimeMs(fields.get(253) ?? null);
}

function isStopEvent(message: FitMessage) {
  if (message.globalMesgNum !== 21) return false;
  const event = finite(field(message, 0));
  const eventType = finite(field(message, 1));
  return event === 0 && [1, 4, 8, 9].includes(Number(eventType));
}

function isStartEvent(message: FitMessage) {
  if (message.globalMesgNum !== 21) return false;
  const event = finite(field(message, 0));
  const eventType = finite(field(message, 1));
  return event === 0 && eventType === 0;
}

function decodeFit(buffer: ArrayBuffer): ParsedFit {
  if (buffer.byteLength < 12) throw new Error("Fichier FIT trop court.");
  if (buffer.byteLength > MAX_FIT_BYTES) throw new Error("Fichier FIT trop volumineux (24 Mo max).");
  const view = new DataView(buffer);
  const headerSize = view.getUint8(0);
  if (headerSize < 12 || headerSize > 64 || headerSize > buffer.byteLength) throw new Error("En-tête FIT invalide.");
  const signature = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (signature !== ".FIT") throw new Error("Ce fichier n'est pas un FIT valide.");
  const dataSize = view.getUint32(4, true);
  const dataEnd = Math.min(buffer.byteLength, headerSize + dataSize);
  if (dataEnd <= headerSize) throw new Error("FIT sans données exploitables.");

  const definitions = new Map<number, FitDefinition>();
  const messages: FitMessage[] = [];
  const warnings: string[] = [];
  let offset = headerSize;
  let lastFitTimestamp: number | null = null;
  let timerRunning = true;
  let lastTimelineMs: number | null = null;
  let activeElapsedMs = 0;
  let fileType: number | null = null;

  const advanceTimeline = (timestampMs: number | null) => {
    if (timestampMs == null) return;
    if (lastTimelineMs != null && timestampMs >= lastTimelineMs && timerRunning) activeElapsedMs += timestampMs - lastTimelineMs;
    lastTimelineMs = timestampMs;
  };

  while (offset < dataEnd) {
    const header = view.getUint8(offset++);
    const compressed = (header & 0x80) !== 0;
    const localMesgType = compressed ? (header >> 5) & 0x03 : header & 0x0f;

    if (!compressed && (header & 0x40) !== 0) {
      const hasDeveloperFields = (header & 0x20) !== 0;
      if (offset + 5 > dataEnd) break;
      offset += 1; // reserved
      const architecture = view.getUint8(offset++);
      const littleEndian = architecture === 0;
      const globalMesgNum = littleEndian ? view.getUint16(offset, true) : view.getUint16(offset, false);
      offset += 2;
      const numFields = view.getUint8(offset++);
      const fields: FitFieldDefinition[] = [];
      for (let i = 0; i < numFields; i += 1) {
        if (offset + 3 > dataEnd) break;
        fields.push({ fieldNum: view.getUint8(offset), size: view.getUint8(offset + 1), baseType: view.getUint8(offset + 2) });
        offset += 3;
      }
      let developerFieldBytes = 0;
      if (hasDeveloperFields && offset < dataEnd) {
        const numDeveloperFields = view.getUint8(offset++);
        for (let i = 0; i < numDeveloperFields; i += 1) {
          if (offset + 3 > dataEnd) break;
          developerFieldBytes += view.getUint8(offset + 1);
          offset += 3;
        }
      }
      definitions.set(localMesgType, { globalMesgNum, littleEndian, fields, developerFieldBytes });
      continue;
    }

    const definition = definitions.get(localMesgType);
    if (!definition) {
      warnings.push(`Définition FIT locale ${localMesgType} manquante.`);
      break;
    }

    let compressedTimestampFit: number | null = null;
    if (compressed) {
      const timeOffset = header & 0x1f;
      if (lastFitTimestamp != null) {
        let next = (lastFitTimestamp & ~0x1f) + timeOffset;
        if (next <= lastFitTimestamp) next += 0x20;
        compressedTimestampFit = next;
        lastFitTimestamp = next;
      }
    }

    const fields = new Map<number, FitScalar>();
    for (const def of definition.fields) {
      if (compressed && def.fieldNum === 253) {
        if (compressedTimestampFit != null) fields.set(253, compressedTimestampFit);
        continue;
      }
      if (offset + def.size > dataEnd) { offset = dataEnd; break; }
      const value = readField(view, offset, def, definition.littleEndian);
      if (value != null) fields.set(def.fieldNum, value);
      offset += def.size;
    }
    if (definition.developerFieldBytes > 0) offset = Math.min(dataEnd, offset + definition.developerFieldBytes);

    const fitTimestamp = finite(fields.get(253) ?? null);
    if (fitTimestamp != null) lastFitTimestamp = fitTimestamp;
    const timestampMs = timestampFromFields(fields);
    advanceTimeline(timestampMs);
    const message: FitMessage = { globalMesgNum: definition.globalMesgNum, fields, timestampMs, activeElapsedMs };
    if (isStopEvent(message)) timerRunning = false;
    else if (isStartEvent(message)) timerRunning = true;
    messages.push(message);
    if (definition.globalMesgNum === 0 && fileType == null) fileType = finite(fields.get(0) ?? null);
  }

  return { messages, fileType, warnings };
}

function recordAltitude(message: FitMessage) {
  const enhanced = finite(field(message, 78));
  if (enhanced != null) return enhanced / 5 - 500;
  const normal = finite(field(message, 2));
  return normal == null ? undefined : normal / 5 - 500;
}

function recordSpeed(message: FitMessage) {
  const enhanced = finite(field(message, 73));
  if (enhanced != null) return enhanced / 1000;
  const speed = finite(field(message, 6));
  return speed == null ? undefined : speed / 1000;
}

function recordDistance(message: FitMessage) {
  const value = finite(field(message, 5));
  return value == null ? undefined : value / 100;
}

function sessionSport(message: FitMessage | null): ActivitySport {
  const sport = finite(field(message, 5));
  const subSport = finite(field(message, 6));
  if (sport === 1 && [1, 45].includes(Number(subSport))) return "treadmill";
  if (sport === 1 && [3, 62].includes(Number(subSport))) return "trail";
  if (sport === 17 || sport === 16 || sport === 35) return "hiking";
  if (sport === 11) return "walking";
  return "running";
}

function distanceSplitsFromRecords(samples: Array<{ timestamp: number; activeElapsedMs: number; distanceM: number }>) {
  if (samples.length < 2) return [];
  const out: ActivityRecord["splits"] = [];
  let target = 1000;
  let previousSplitElapsed = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (cur.distanceM <= prev.distanceM) continue;
    while (target <= cur.distanceM + 0.01) {
      const ratio = Math.max(0, Math.min(1, (target - prev.distanceM) / Math.max(0.001, cur.distanceM - prev.distanceM)));
      const elapsed = prev.activeElapsedMs + (cur.activeElapsedMs - prev.activeElapsedMs) * ratio;
      const splitMs = Math.max(1, elapsed - previousSplitElapsed);
      out.push({ index: out.length + 1, distanceM: target, elapsedMs: elapsed, splitMs, paceSecPerKm: splitMs / 1000 });
      previousSplitElapsed = elapsed;
      target += 1000;
    }
  }
  return out;
}

function routeTemplate(points: GeoPoint[], distanceM: number, elevationGainM: number, fileName: string): RunningRouteTemplate {
  const maxPoints = 420;
  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  const simplified = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0).slice(0, maxPoints);
  return {
    id: makeId("route_fit"),
    name: titleFromFile(fileName),
    route: simplified,
    distanceM,
    elevationGainM,
    referenceElapsedMs: 0,
    createdAt: Date.now(),
    source: "fit",
    sourceFileName: fileName,
  };
}

export function parseFitImport(buffer: ArrayBuffer, fileName: string): RunningImportResult {
  const decoded = decodeFit(buffer);
  const records = decoded.messages.filter((message) => message.globalMesgNum === 20);
  const sessions = decoded.messages.filter((message) => message.globalMesgNum === 18);
  const session = sessions[sessions.length - 1] || null;
  const warnings = [...decoded.warnings];

  const rawStartMs = fitTimeMs(field(session, 2)) ?? records.find((message) => message.timestampMs != null)?.timestampMs ?? Date.now();
  const lastRecordMs = [...records].reverse().find((message) => message.timestampMs != null)?.timestampMs ?? null;
  const sessionEndMs = fitTimeMs(field(session, 253));
  const rawEndMs = Math.max(rawStartMs + 1000, lastRecordMs || 0, sessionEndMs || 0);

  const route: GeoPoint[] = [];
  const sensorSamples: ActivitySensorSample[] = [];
  const distanceTimeline: Array<{ timestamp: number; activeElapsedMs: number; distanceM: number }> = [];
  let latestDistanceM = 0;
  let hasHeartRate = false;
  let hasCadence = false;
  let hasSpeed = false;

  for (const message of records) {
    const timestamp = message.timestampMs;
    if (timestamp == null) continue;
    const activeElapsed = Math.max(0, message.activeElapsedMs ?? timestamp - rawStartMs);
    const lat = decodeCoordinate(finite(field(message, 0)));
    const lon = decodeCoordinate(finite(field(message, 1)));
    const altitude = recordAltitude(message);
    const speed = recordSpeed(message);
    const distance = recordDistance(message);
    if (distance != null && distance >= 0) latestDistanceM = Math.max(latestDistanceM, distance);
    if (distance != null) distanceTimeline.push({ timestamp, activeElapsedMs: activeElapsed, distanceM: distance });
    if (lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) route.push({ lat, lon, altitude, speed, timestamp, elapsedMs: activeElapsed });

    const heartRateBpm = finite(field(message, 3)) ?? undefined;
    const cadenceSpm = finite(field(message, 4)) ?? undefined;
    if (heartRateBpm != null) hasHeartRate = true;
    if (cadenceSpm != null) hasCadence = true;
    if (speed != null) hasSpeed = true;
    if (heartRateBpm != null || cadenceSpm != null || speed != null) sensorSamples.push({ timestamp, elapsedMs: activeElapsed, heartRateBpm, cadenceSpm, sensorSpeedMps: speed });
  }

  const sessionDistance = finite(field(session, 9));
  const distanceM = Math.max(0, sessionDistance != null ? sessionDistance / 100 : latestDistanceM || routeDistanceMeters(route));
  const sessionElapsedRaw = finite(field(session, 7));
  const sessionTimerRaw = finite(field(session, 8));
  const elapsedMs = Math.max(1000, sessionElapsedRaw != null ? sessionElapsedRaw : rawEndMs - rawStartMs);
  const movingMs = Math.max(1000, sessionTimerRaw != null ? sessionTimerRaw : (records[records.length - 1]?.activeElapsedMs || movingTimeMs(route) || elapsedMs));
  const sessionAscent = finite(field(session, 21));
  const elevationGainM = Math.max(0, sessionAscent ?? elevationGainMeters(route));
  const sport = sessionSport(session);
  const isCourseFile = decoded.fileType === 6;
  const hasTimedActivity = records.length >= 2 && (distanceM >= 30 || elapsedMs >= 30_000);

  if (isCourseFile || !hasTimedActivity) {
    if (route.length < 2) throw new Error("FIT sans parcours ou activité exploitable.");
    warnings.push("FIT importé comme parcours : aucune séance chronométrée complète n'a été détectée.");
    return { kind: "route", route: routeTemplate(route, distanceM || routeDistanceMeters(route), elevationGainM, fileName), warnings };
  }

  const sensorDevices: ActivitySensorDevice[] = [];
  if (hasHeartRate) sensorDevices.push({ kind: "heart-rate", name: "FIT · Cardio" });
  if (hasCadence || hasSpeed) sensorDevices.push({ kind: "running-speed-cadence", name: "FIT · Cadence/Vitesse" });
  const splits = distanceTimeline.length >= 2 ? distanceSplitsFromRecords(distanceTimeline) : route.length >= 2 ? buildKilometerSplits(route, rawStartMs) : [];
  const computedAvgSpeed = averageSpeedMps(distanceM, movingMs);
  const sessionAvgSpeed = finite(field(session, 14));
  const avgSpeedMps = sessionAvgSpeed != null ? sessionAvgSpeed / 1000 : computedAvgSpeed;
  const activity: ActivityRecord = {
    id: makeId("import_fit"),
    sport,
    source: "fit",
    verification: route.length >= 2 ? "gps" : "connected",
    startedAt: rawStartMs,
    endedAt: rawStartMs + elapsedMs,
    elapsedMs,
    movingMs,
    distanceM,
    avgSpeedMps,
    avgPaceSecPerKm: averagePaceSecPerKm(distanceM, movingMs),
    elevationGainM,
    route,
    splits,
    title: titleFromFile(fileName),
    workoutType: "free",
    deviceName: "FIT",
    sourceFileName: fileName,
    sensorSamples: sensorSamples.length ? sensorSamples : undefined,
    sensorDevices: sensorDevices.length ? sensorDevices : undefined,
    indoor: sport === "treadmill" || route.length < 2,
    importedAt: Date.now(),
    createdAt: Date.now(),
  };
  return { kind: "activity", activity, warnings };
}

export function __decodeFitForTests(buffer: ArrayBuffer) {
  return decodeFit(buffer);
}
