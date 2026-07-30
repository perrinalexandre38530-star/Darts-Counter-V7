// src/lib/dartsTelemetry.ts
// ============================================================================
// Canonical dart telemetry for every Darts mode.
//
// Contract:
// - one exact ordered record per validated dart
// - darts are grouped into visits/volleys (0..3 darts)
// - S / D / T / BULL / DBULL / MISS are never inferred from an aggregate score
// - all history writers are normalized by History.upsert()
//
// This module is intentionally dependency-free so it can be used by gameplay,
// history, imports, compact encoding and future statistics rebuilds.
// ============================================================================

export type CanonicalDartBed = "S" | "D" | "T" | "BULL" | "DBULL" | "MISS";

export type CanonicalDart = {
  bed: CanonicalDartBed;
  value: number;
  multiplier: 0 | 1 | 2 | 3;
  score: number;
  label: string;
  segment?: number | null;
  target?: number | string | null;
  valid?: boolean;
  timestamp?: number;
  meta?: Record<string, any>;
};

export type CanonicalVisit = {
  id: string;
  playerId: string;
  visitIndex: number;
  darts: CanonicalDart[];
  score: number;
  startedAt?: number;
  endedAt?: number;
  roundIndex?: number;
  legIndex?: number;
  setIndex?: number;
  bust?: boolean;
  result?: string | null;
  source?: string;
  meta?: Record<string, any>;
};

export type DartsTelemetry = {
  schema: "darts.telemetry.v1";
  version: 1;
  exact: true;
  visits: CanonicalVisit[];
  totals: {
    visits: number;
    darts: number;
    score: number;
    singles: number;
    doubles: number;
    triples: number;
    bulls: number;
    dbulls: number;
    misses: number;
  };
  perPlayer: Record<string, {
    visits: number;
    darts: number;
    score: number;
    bestVisit: number;
    singles: number;
    doubles: number;
    triples: number;
    bulls: number;
    dbulls: number;
    misses: number;
    hitRate: number;
  }>;
};

const NON_DART_SPORTS = new Set([
  "babyfoot", "foosball", "petanque", "pétanque", "molkky", "mölkky",
  "pingpong", "ping_pong", "table_tennis", "dice", "yams", "football", "foot",
]);

const DART_MODE_HINTS = [
  "x01", "301", "501", "701", "901", "1001", "cricket", "killer", "five_lives",
  "five lives", "5 vies", "shanghai", "halve", "count_up", "count-up", "super_bull",
  "bobs", "bob's", "shooter", "prisoner", "scram", "golf", "baseball", "attrape",
  "president", "président", "capital", "loterie", "lottery", "territ", "departement",
  "département", "warfare", "battle_royale", "battle royale", "darts_racer", "bowling",
  "knockout", "tic_tac_toe", "tic-tac-toe", "happy_mille", "enculette", "batard",
  "bâtard", "rugby", "football", "170", "training", "darts_mode",
];

const PLAYER_ID_KEYS = [
  "playerId", "profileId", "by", "actorId", "participantId", "entityId", "ownerId",
  "currentPlayerId", "userId", "uid",
];

const VISIT_ARRAY_KEYS = [
  "visits", "visitHistory", "volleyHistory", "volleys", "turns", "turnHistory", "history",
  "events", "dartEvents", "dartsHistory", "dartHistory", "dartLog", "cricketEvents",
  "cricketDartLog", "throws", "throwHistory", "throwLog", "throwLabels", "roundHistory", "timeline",
  "visitLog", "darts", "hits", "dartDetails",
];

const DART_ARRAY_KEYS = [
  "darts", "throw", "currentThrow", "turnDarts", "visitDarts", "volley", "hits", "dartResults",
];

function isObj(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function finite(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && /^-?\d+(?:\.\d+)?$/.test(v.trim())) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function int(v: any, fallback = 0): number {
  const n = finite(v);
  return n === undefined ? fallback : Math.round(n);
}

function timestamp(v: any): number | undefined {
  const n = finite(v);
  if (n !== undefined && n > 0) return n;
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function cleanText(v: any): string {
  return String(v ?? "").trim();
}

function normalizeBed(raw: any): CanonicalDartBed | null {
  const s = cleanText(raw).toUpperCase().replace(/[\s_-]+/g, "");
  if (!s) return null;
  if (["MISS", "M", "0", "OUT", "OFF", "NONE"].includes(s)) return "MISS";
  if (["DBULL", "DB", "IB", "INNERBULL", "BULL50", "D25"].includes(s)) return "DBULL";
  if (["BULL", "SB", "OB", "OUTERBULL", "BULL25", "S25"].includes(s)) return "BULL";
  if (["S", "SINGLE", "SIMPLE"].includes(s)) return "S";
  if (["D", "DOUBLE"].includes(s)) return "D";
  if (["T", "TRIPLE", "TREBLE"].includes(s)) return "T";
  return null;
}

function parseDartString(raw: string): CanonicalDart | null {
  const s = cleanText(raw).toUpperCase().replace(/[\s_-]+/g, "");
  if (!s) return null;
  const special = normalizeBed(s);
  if (special === "MISS") return makeCanonicalDart("MISS", 0);
  if (special === "BULL") return makeCanonicalDart("BULL", 25);
  if (special === "DBULL") return makeCanonicalDart("DBULL", 25);

  const m = s.match(/^(S|D|T)(\d{1,2})$/);
  if (m) {
    const bed = m[1] as "S" | "D" | "T";
    const value = Math.max(1, Math.min(20, Number(m[2])));
    return makeCanonicalDart(bed, value);
  }
  if (/^\d{1,2}$/.test(s)) {
    const value = Number(s);
    if (value === 25) return makeCanonicalDart("BULL", 25);
    if (value === 50) return makeCanonicalDart("DBULL", 25);
    if (value >= 1 && value <= 20) return makeCanonicalDart("S", value);
  }
  return null;
}

export function makeCanonicalDart(
  bed: CanonicalDartBed,
  rawValue: number,
  extras?: Partial<CanonicalDart>,
): CanonicalDart {
  const value = bed === "MISS" ? 0 : bed === "BULL" || bed === "DBULL" ? 25 : Math.max(1, Math.min(20, int(rawValue, 0)));
  const multiplier: 0 | 1 | 2 | 3 = bed === "MISS" ? 0 : bed === "D" || bed === "DBULL" ? 2 : bed === "T" ? 3 : 1;
  const score = bed === "MISS" ? 0 : bed === "DBULL" ? 50 : value * multiplier;
  const label = bed === "MISS" ? "MISS" : bed === "BULL" ? "BULL" : bed === "DBULL" ? "DBULL" : `${bed}${value}`;
  return {
    bed,
    value,
    multiplier,
    score,
    label,
    segment: bed === "MISS" ? null : value,
    ...extras,
  };
}

export function normalizeDart(raw: any): CanonicalDart | null {
  if (raw == null) return null;
  if (typeof raw === "string") return parseDartString(raw);
  if (typeof raw === "number") {
    if (raw === 0) return makeCanonicalDart("MISS", 0);
    if (raw === 25) return makeCanonicalDart("BULL", 25);
    if (raw === 50) return makeCanonicalDart("DBULL", 25);
    if (raw >= 1 && raw <= 20) return makeCanonicalDart("S", raw);
    return null; // never infer a bed from an aggregate score
  }
  if (!isObj(raw)) return null;

  if (raw.bed || raw.ring || raw.zone || raw.type || raw.kind) {
    const bedRaw = raw.bed ?? raw.ring ?? raw.zone ?? raw.type ?? raw.kind;
    let bed = normalizeBed(bedRaw);
    const segmentRaw = raw.segment ?? raw.number ?? raw.n ?? raw.target ?? raw.v ?? raw.value;
    const segNum = finite(segmentRaw);

    // Cricket rings SB/DB use segment 25. Generic "D"/"T" use segment number.
    if (!bed && typeof bedRaw === "string") {
      const parsed = parseDartString(`${bedRaw}${segNum ?? ""}`);
      if (parsed) return { ...parsed, timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid };
    }
    if (bed) {
      if ((bed === "S" || bed === "D" || bed === "T") && segNum === 25) bed = bed === "D" ? "DBULL" : "BULL";
      const d = makeCanonicalDart(bed, segNum ?? (bed === "BULL" || bed === "DBULL" ? 25 : 0), {
        target: raw.target ?? null,
        valid: raw.valid,
        timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts),
      });
      return d;
    }
  }

  const label = raw.label ?? raw.dartLabel ?? raw.resultKey ?? raw.resultLabel ?? raw.code;
  if (typeof label === "string") {
    const parsed = parseDartString(label);
    if (parsed) return { ...parsed, timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid };
  }

  // UI shape: { v: 1..20|25|50|0, mult: 1|2|3 }
  const v = finite(raw.v ?? raw.number ?? raw.segment ?? raw.target);
  const mult = int(raw.mult ?? raw.multiplier ?? raw.m, 1);
  if (v !== undefined) {
    if (v <= 0) return makeCanonicalDart("MISS", 0, { timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid });
    if (v === 50) return makeCanonicalDart("DBULL", 25, { timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid });
    if (v === 25) return makeCanonicalDart(mult >= 2 ? "DBULL" : "BULL", 25, { timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid });
    if (v >= 1 && v <= 20) {
      const bed: CanonicalDartBed = mult >= 3 ? "T" : mult >= 2 ? "D" : "S";
      return makeCanonicalDart(bed, v, { timestamp: timestamp(raw.timestamp ?? raw.at ?? raw.ts), valid: raw.valid });
    }
  }

  // Some recorders store rawScore + ring + segment; rawScore alone is not enough.
  return null;
}

export function scoreDarts(darts: any[]): number {
  return (Array.isArray(darts) ? darts : []).reduce((sum, d) => sum + (normalizeDart(d)?.score || 0), 0);
}

function playerIdOf(row: any, fallback = ""): string {
  if (!row) return fallback;
  for (const k of PLAYER_ID_KEYS) {
    const v = row?.[k];
    if (v != null && cleanText(v)) return cleanText(v);
  }
  const nested = row?.player?.id ?? row?.profile?.id ?? row?.actor?.id ?? row?.participant?.id;
  return nested != null && cleanText(nested) ? cleanText(nested) : fallback;
}

function visitIndexOf(row: any, fallback: number): number {
  const n = finite(
    row?.visitIndex ?? row?.visitIdx ?? row?.turnIndex ?? row?.turn ?? row?.visit ?? row?.volleyIndex ?? row?.roundVisit,
  );
  return n === undefined ? fallback : Math.max(0, Math.round(n));
}

function roundIndexOf(row: any): number | undefined {
  const n = finite(row?.roundIndex ?? row?.roundIdx ?? row?.round ?? row?.holeIndex ?? row?.holeIdx);
  return n === undefined ? undefined : Math.max(0, Math.round(n));
}

function extractDartArray(row: any): any[] | null {
  if (Array.isArray(row)) {
    return row.some((x) => normalizeDart(x)) ? row : null;
  }
  if (!isObj(row)) return null;
  for (const k of DART_ARRAY_KEYS) {
    const v = row[k];
    if (Array.isArray(v) && v.some((x) => normalizeDart(x))) return v;
    // Several legacy engines store one exact dart in `throw`, `hit` or
    // `currentThrow` instead of an array. Preserve it instead of silently
    // dropping the S/D/T information.
    if (v != null && !Array.isArray(v) && normalizeDart(v)) return [v];
  }
  if (row.dart != null && normalizeDart(row.dart)) return [row.dart];
  if (normalizeDart(row)) return [row];
  return null;
}

function canonicalVisitFromRow(
  row: any,
  fallbackIndex: number,
  source: string,
  forcedPlayerId = "",
): CanonicalVisit | null {
  const rawDarts = extractDartArray(row);
  if (!rawDarts) return null;
  const darts = rawDarts.map(normalizeDart).filter(Boolean) as CanonicalDart[];
  if (!darts.length) return null;

  const playerId = playerIdOf(row, forcedPlayerId);
  if (!playerId) return null;
  const visitIndex = visitIndexOf(row, fallbackIndex);
  const startedAt = timestamp(row?.startedAt ?? row?.startAt ?? row?.at ?? row?.timestamp ?? darts[0]?.timestamp);
  const endedAt = timestamp(row?.endedAt ?? row?.endAt ?? row?.at ?? row?.timestamp ?? darts[darts.length - 1]?.timestamp);
  const score = darts.reduce((sum, d) => sum + d.score, 0);
  const result = row?.result ?? row?.notes ?? row?.outcome ?? row?.action ?? null;
  const explicitId = cleanText(row?.id ?? row?.visitId ?? row?.turnId);
  const id = explicitId || `${playerId}:${visitIndex}:${startedAt || 0}:${darts.map((d) => d.label).join("-")}`;

  return {
    id,
    playerId,
    visitIndex,
    darts,
    score,
    startedAt,
    endedAt,
    roundIndex: roundIndexOf(row),
    legIndex: finite(row?.legIndex ?? row?.leg) === undefined ? undefined : Math.max(0, int(row?.legIndex ?? row?.leg)),
    setIndex: finite(row?.setIndex ?? row?.set) === undefined ? undefined : Math.max(0, int(row?.setIndex ?? row?.set)),
    bust: !!row?.bust,
    result: result == null ? null : cleanText(result),
    source,
    meta: {
      dartIndex: finite(row?.dartIndex ?? row?.dartIdx ?? row?.throwIndex),
      eventType: row?.type ?? row?.kind ?? null,
    },
  };
}

function collectArrays(root: any, basePath: string): Array<{ rows: any[]; path: string; playerId?: string }> {
  const out: Array<{ rows: any[]; path: string; playerId?: string }> = [];
  if (!isObj(root)) return out;

  const addFrom = (obj: any, path: string, playerId = "") => {
    if (!isObj(obj)) return;
    for (const key of VISIT_ARRAY_KEYS) {
      const rows = obj[key];
      if (Array.isArray(rows) && rows.length) out.push({ rows, path: `${path}.${key}`, playerId: playerId || undefined });
    }
  };

  addFrom(root, basePath);
  for (const key of ["state", "summary", "result", "stats", "match", "game", "resume", "finalSummary", "engineState"]) {
    addFrom(root[key], `${basePath}.${key}`);
  }

  const playerSources = [root.players, root.perPlayer, root.entities, root.standings, root.rankings, root.summary?.players, root.summary?.perPlayer];
  for (const src of playerSources) {
    if (Array.isArray(src)) {
      src.forEach((p: any, i: number) => addFrom(p, `${basePath}.players[${i}]`, playerIdOf(p)));
    } else if (isObj(src)) {
      Object.entries(src).forEach(([pid, p]) => addFrom(p, `${basePath}.players.${pid}`, playerIdOf(p, pid)));
    }
  }
  return out;
}

function groupSingleDartEvents(visits: CanonicalVisit[]): CanonicalVisit[] {
  const out: CanonicalVisit[] = [];
  const groups = new Map<string, CanonicalVisit[]>();

  for (const visit of visits) {
    const canGroup = visit.darts.length === 1 && Number.isFinite(visit.visitIndex);
    const key = canGroup ? `${visit.playerId}|${visit.visitIndex}|${visit.roundIndex ?? ""}|${visit.legIndex ?? ""}|${visit.setIndex ?? ""}` : "";
    if (!key) {
      out.push(visit);
      continue;
    }
    const rows = groups.get(key) || [];
    rows.push(visit);
    groups.set(key, rows);
  }

  for (const rows of groups.values()) {
    rows.sort((a, b) => {
      const ai = finite(a?.meta?.dartIndex);
      const bi = finite(b?.meta?.dartIndex);
      if (ai !== undefined && bi !== undefined && ai !== bi) return ai - bi;
      const at = a.startedAt ?? a.endedAt ?? 0;
      const bt = b.startedAt ?? b.endedAt ?? 0;
      return at - bt;
    });

    const first = rows[0];
    const darts: CanonicalDart[] = [];
    const seenDartSlots = new Set<string>();
    let startedAt: number | undefined;
    let endedAt: number | undefined;

    for (const row of rows) {
      const dart = row.darts[0];
      if (!dart) continue;
      const idx = finite(row?.meta?.dartIndex);
      const eventTime = row.startedAt ?? row.endedAt ?? dart.timestamp ?? 0;
      // Killer and several event-driven modes emit multiple semantic events for
      // the same physical dart. The position in the volley is authoritative.
      const slot = idx !== undefined ? `i:${idx}` : `t:${eventTime}:${dart.label}`;
      if (seenDartSlots.has(slot)) continue;
      seenDartSlots.add(slot);
      darts.push(dart);
      startedAt = startedAt === undefined ? row.startedAt : Math.min(startedAt, row.startedAt ?? startedAt);
      endedAt = endedAt === undefined ? row.endedAt : Math.max(endedAt, row.endedAt ?? endedAt);
      if (darts.length >= 3) break;
    }

    if (!darts.length) continue;
    const merged: CanonicalVisit = {
      ...first,
      darts,
      score: darts.reduce((sum, d) => sum + d.score, 0),
      startedAt,
      endedAt,
      id: `${first.playerId}:${first.visitIndex}:${startedAt || 0}:${darts.map((d) => d.label).join("-")}`,
    };
    out.push(merged);
  }
  return out;
}

function dedupeVisits(visits: CanonicalVisit[]): CanonicalVisit[] {
  const seen = new Set<string>();
  const out: CanonicalVisit[] = [];
  const sorted = groupSingleDartEvents(visits).sort((a, b) => {
    const ta = a.startedAt ?? a.endedAt ?? 0;
    const tb = b.startedAt ?? b.endedAt ?? 0;
    if (ta !== tb) return ta - tb;
    if (a.visitIndex !== b.visitIndex) return a.visitIndex - b.visitIndex;
    return a.playerId.localeCompare(b.playerId);
  });

  for (const v of sorted) {
    const sig = `${v.playerId}|${v.visitIndex}|${v.roundIndex ?? ""}|${v.legIndex ?? ""}|${v.setIndex ?? ""}|${v.darts.map((d) => d.label).join(",")}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ ...v, id: v.id || sig });
  }

  // Re-index per player only when every extracted visit had an unusable repeated 0.
  const byPlayer = new Map<string, CanonicalVisit[]>();
  out.forEach((v) => {
    const rows = byPlayer.get(v.playerId) || [];
    rows.push(v);
    byPlayer.set(v.playerId, rows);
  });
  byPlayer.forEach((rows) => {
    const distinct = new Set(rows.map((r) => r.visitIndex));
    if (rows.length > 1 && distinct.size === 1 && distinct.has(0)) rows.forEach((r, i) => { r.visitIndex = i; });
  });
  return out;
}

export function isDartsRecord(rec: any, payload?: any): boolean {
  const p = payload ?? rec?.payload ?? {};
  const sport = cleanText(rec?.sport ?? p?.sport ?? rec?.summary?.sport ?? p?.summary?.sport).toLowerCase();
  if (sport) return sport === "darts" || sport === "dart";
  const kind = cleanText(rec?.kind ?? rec?.mode ?? p?.kind ?? p?.mode ?? rec?.game?.mode ?? p?.game?.mode).toLowerCase();
  if (NON_DART_SPORTS.has(kind)) return false;
  const haystack = [kind, rec?.summary?.title, p?.summary?.title, rec?.game?.mode, p?.config?.mode]
    .filter(Boolean).map((x) => cleanText(x).toLowerCase()).join(" ");
  return DART_MODE_HINTS.some((hint) => haystack.includes(hint));
}

export function buildDartsTelemetry(rec: any, payload?: any): DartsTelemetry | null {
  const p = payload ?? rec?.payload ?? {};
  if (!isDartsRecord(rec, p)) return null;

  const arrays = [
    ...collectArrays(rec, "record"),
    ...collectArrays(p, "payload"),
  ];

  // Canonical telemetry is the preferred source.
  if (Array.isArray(p?.telemetry?.visits)) arrays.unshift({ rows: p.telemetry.visits, path: "payload.telemetry.visits" });
  if (Array.isArray(p?.dartTelemetry?.visits)) arrays.unshift({ rows: p.dartTelemetry.visits, path: "payload.dartTelemetry.visits" });

  const extracted: CanonicalVisit[] = [];
  arrays.forEach(({ rows, path, playerId }) => {
    rows.forEach((row, index) => {
      const visit = canonicalVisitFromRow(row, index, path, playerId || "");
      if (visit) extracted.push(visit);
    });
  });

  const visits = dedupeVisits(extracted);
  if (!visits.length) return null;

  const totals = { visits: 0, darts: 0, score: 0, singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0 };
  const perPlayer: DartsTelemetry["perPlayer"] = {};
  for (const visit of visits) {
    totals.visits += 1;
    totals.darts += visit.darts.length;
    totals.score += visit.score;
    const row = perPlayer[visit.playerId] || {
      visits: 0, darts: 0, score: 0, bestVisit: 0,
      singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0, hitRate: 0,
    };
    row.visits += 1;
    row.darts += visit.darts.length;
    row.score += visit.score;
    row.bestVisit = Math.max(row.bestVisit, visit.score);
    for (const dart of visit.darts) {
      if (dart.bed === "S") { totals.singles += 1; row.singles += 1; }
      else if (dart.bed === "D") { totals.doubles += 1; row.doubles += 1; }
      else if (dart.bed === "T") { totals.triples += 1; row.triples += 1; }
      else if (dart.bed === "BULL") { totals.bulls += 1; row.bulls += 1; }
      else if (dart.bed === "DBULL") { totals.dbulls += 1; row.dbulls += 1; }
      else { totals.misses += 1; row.misses += 1; }
    }
    perPlayer[visit.playerId] = row;
  }
  Object.values(perPlayer).forEach((row) => {
    const hits = row.singles + row.doubles + row.triples + row.bulls + row.dbulls;
    row.hitRate = row.darts > 0 ? hits / row.darts : 0;
  });

  return { schema: "darts.telemetry.v1", version: 1, exact: true, visits, totals, perPlayer };
}

function mergePerPlayerSummary(existing: any, telemetry: DartsTelemetry): any {
  const byId: Record<string, any> = {};
  if (Array.isArray(existing)) {
    for (const row of existing) {
      const pid = playerIdOf(row);
      if (pid) byId[pid] = { ...row };
    }
  } else if (isObj(existing)) {
    for (const [pid, row] of Object.entries(existing)) byId[pid] = isObj(row) ? { ...row } : {};
  }
  for (const [pid, stats] of Object.entries(telemetry.perPlayer)) {
    const prev = byId[pid] || {};
    byId[pid] = {
      ...stats,
      ...prev,
      playerId: prev.playerId ?? pid,
      id: prev.id ?? pid,
      darts: prev.darts ?? prev.dartsThrown ?? stats.darts,
      dartsThrown: prev.dartsThrown ?? prev.darts ?? stats.darts,
      visits: prev.visits ?? stats.visits,
      points: prev.points ?? prev.totalScore ?? stats.score,
      totalScore: prev.totalScore ?? prev.points ?? stats.score,
      bestVisit: prev.bestVisit ?? stats.bestVisit,
      singles: prev.singles ?? stats.singles,
      doubles: prev.doubles ?? stats.doubles,
      triples: prev.triples ?? stats.triples,
      bulls: prev.bulls ?? stats.bulls,
      dbulls: prev.dbulls ?? stats.dbulls,
      misses: prev.misses ?? stats.misses,
      hitRate: prev.hitRate ?? stats.hitRate,
    };
  }
  return byId;
}

export function enrichDartsTelemetry(rec: any, payload?: any): { record: any; payload: any; telemetry: DartsTelemetry | null } {
  const sourcePayload = payload ?? rec?.payload ?? null;
  const telemetry = buildDartsTelemetry(rec, sourcePayload);
  if (!isDartsRecord(rec, sourcePayload)) return { record: rec, payload: sourcePayload, telemetry: null };

  const baseSummary = isObj(rec?.summary) ? rec.summary : {};
  if (!telemetry) {
    return {
      record: {
        ...rec,
        summary: {
          ...baseSummary,
          telemetryVersion: 1,
          telemetryExact: false,
          telemetryCoverage: baseSummary.telemetryCoverage ?? "missing",
        },
      },
      payload: sourcePayload,
      telemetry: null,
    };
  }

  const hitSummary = {
    ...telemetry.totals,
    byPlayer: telemetry.perPlayer,
  };
  const nextPayload = {
    ...(isObj(sourcePayload) ? sourcePayload : {}),
    telemetry,
    dartTelemetry: telemetry,
    // Common aliases make legacy stat readers immediately compatible.
    visitHistory: Array.isArray((sourcePayload as any)?.visitHistory)
      ? (sourcePayload as any).visitHistory
      : telemetry.visits,
    hitSummary: {
      ...((isObj((sourcePayload as any)?.hitSummary) ? (sourcePayload as any).hitSummary : {})),
      ...hitSummary,
    },
  };
  const nextSummary = {
    ...baseSummary,
    telemetryVersion: 1,
    telemetryExact: true,
    telemetryCoverage: "full",
    visits: baseSummary.visits ?? telemetry.totals.visits,
    darts: baseSummary.darts ?? telemetry.totals.darts,
    dartsThrown: baseSummary.dartsThrown ?? telemetry.totals.darts,
    hitSummary: {
      ...((isObj(baseSummary.hitSummary) ? baseSummary.hitSummary : {})),
      ...hitSummary,
    },
    perPlayer: mergePerPlayerSummary(baseSummary.perPlayer, telemetry),
  };
  return {
    record: { ...rec, summary: nextSummary, telemetryVersion: 1 },
    payload: nextPayload,
    telemetry,
  };
}

export function canonicalVisitFromUiDarts(args: {
  playerId: string;
  darts: any[];
  visitIndex: number;
  startedAt?: number;
  endedAt?: number;
  roundIndex?: number;
  result?: string | null;
  source?: string;
  meta?: Record<string, any>;
}): CanonicalVisit {
  const darts = (args.darts || []).map(normalizeDart).filter(Boolean) as CanonicalDart[];
  const startedAt = args.startedAt ?? Date.now();
  const score = darts.reduce((sum, d) => sum + d.score, 0);
  return {
    id: `${args.playerId}:${args.visitIndex}:${startedAt}:${darts.map((d) => d.label).join("-")}`,
    playerId: String(args.playerId),
    visitIndex: Math.max(0, Math.round(args.visitIndex || 0)),
    darts,
    score,
    startedAt,
    endedAt: args.endedAt ?? Date.now(),
    roundIndex: args.roundIndex,
    result: args.result ?? null,
    source: args.source ?? "gameplay",
    meta: args.meta,
  };
}

// Enumerates every legal 1/2/3 dart score and returns an exact deterministic
// decomposition. Used only for bots/legacy score generators; human inputs must
// always be entered dart by dart.
let SCORE_COMBINATIONS: Map<number, CanonicalDart[]> | null = null;
function scoreCombinations(): Map<number, CanonicalDart[]> {
  if (SCORE_COMBINATIONS) return SCORE_COMBINATIONS;
  const beds: CanonicalDart[] = [makeCanonicalDart("MISS", 0), makeCanonicalDart("BULL", 25), makeCanonicalDart("DBULL", 25)];
  for (let n = 1; n <= 20; n++) {
    beds.push(makeCanonicalDart("S", n), makeCanonicalDart("D", n), makeCanonicalDart("T", n));
  }
  const map = new Map<number, CanonicalDart[]>();
  for (const a of beds) {
    if (!map.has(a.score)) map.set(a.score, [a]);
    for (const b of beds) {
      const s2 = a.score + b.score;
      if (!map.has(s2)) map.set(s2, [a, b]);
      for (const c of beds) {
        const s3 = s2 + c.score;
        if (!map.has(s3)) map.set(s3, [a, b, c]);
      }
    }
  }
  SCORE_COMBINATIONS = map;
  return map;
}

export function exactDartsForScore(rawScore: number): CanonicalDart[] {
  const target = Math.max(0, Math.min(180, Math.round(Number(rawScore) || 0)));
  const map = scoreCombinations();
  if (map.has(target)) return (map.get(target) || []).map((d) => ({ ...d }));
  for (let delta = 1; delta <= 180; delta++) {
    const low = target - delta;
    const high = target + delta;
    if (low >= 0 && map.has(low)) return (map.get(low) || []).map((d) => ({ ...d }));
    if (high <= 180 && map.has(high)) return (map.get(high) || []).map((d) => ({ ...d }));
  }
  return [makeCanonicalDart("MISS", 0)];
}

export function canonicalToUiDart(d: CanonicalDart): { v: number; mult: 1 | 2 | 3 } {
  if (d.bed === "MISS") return { v: 0, mult: 1 };
  if (d.bed === "BULL") return { v: 25, mult: 1 };
  if (d.bed === "DBULL") return { v: 25, mult: 2 };
  return { v: d.value, mult: d.multiplier as 1 | 2 | 3 };
}
