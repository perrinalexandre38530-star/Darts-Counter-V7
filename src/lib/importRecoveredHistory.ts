/*
 * importRecoveredHistory.ts
 *
 * Patch complet d'import Historique pour fichiers de récupération.
 * À intégrer côté importeur AVANT le rejet "Format invalide".
 *
 * Formats acceptés :
 * - dc_recovered_match_import_v1 / v2
 * - dc_match_share_v1
 * - dc_recovered_history_bundle_v2
 * - restore-like: { _v: 1|2, history: { _v: 1, rows/items: [...] } }
 * - ligne native d'historique isolée
 *
 * Dépendance attendue dans le projet : src/lib/history avec History.upsert(row)
 */

import { History } from './history';

type AnyRecord = Record<string, any>;

export type RecoveredHistoryImportResult = {
  ok: boolean;
  imported: number;
  ignored: number;
  rows: AnyRecord[];
  message: string;
};

function isObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asArraySafe(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (isObject(v)) return Object.values(v);
  return [];
}

function parseJsonStringMaybe(v: any): any {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s) return v;
  if (!s.startsWith('{') && !s.startsWith('[')) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}

function firstDefined<T = any>(...values: T[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function safeNumber(v: any, fallback = Date.now()): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(v);
    if (Number.isFinite(d)) return d;
  }
  return fallback;
}

function cleanString(v: any, fallback = ''): string {
  if (v === undefined || v === null) return fallback;
  return String(v).trim() || fallback;
}

function sanitizePlayers(players: any[]): any[] {
  return asArraySafe(players).map((p, index) => {
    if (!isObject(p)) {
      return {
        id: String(p || `player_${index + 1}`),
        name: String(p || `Joueur ${index + 1}`),
      };
    }
    const id = cleanString(firstDefined(p.id, p.playerId, p.profileId, p.userId), `player_${index + 1}`);
    return {
      ...p,
      id,
      playerId: cleanString(firstDefined(p.playerId, p.id, p.profileId, p.userId), id),
      profileId: cleanString(firstDefined(p.profileId, p.playerId, p.id, p.userId), id),
      name: cleanString(firstDefined(p.name, p.displayName, p.nickname, p.playerName), `Joueur ${index + 1}`),
    };
  });
}

function resolvePayload(src: AnyRecord): AnyRecord {
  const rawPayload = firstDefined(
    src.payloadDecoded,
    src.payload,
    src.data,
    src.game,
    src.state,
    src.state_json,
    src.raw,
    {}
  );
  const parsed = parseJsonStringMaybe(rawPayload);
  return isObject(parsed) ? parsed : {};
}

function unwrapCandidate(raw: any): any {
  const parsed = parseJsonStringMaybe(raw);
  if (!isObject(parsed)) return parsed;

  // Wrappers courants générés par les exports de récupération.
  if (isObject(parsed.match)) return parsed.match;
  if (isObject(parsed.item)) return parsed.item;
  if (isObject(parsed.row)) return parsed.row;

  // Certains fichiers "share" mettent le match dans payload/data.
  if (isObject(parsed.payload) && (parsed.payload.id || parsed.payload.matchId || parsed.payload.players || parsed.payload.summary)) {
    return parsed.payload;
  }
  if (isObject(parsed.data) && (parsed.data.id || parsed.data.matchId || parsed.data.players || parsed.data.summary)) {
    return parsed.data;
  }

  return parsed;
}

function inferSport(src: AnyRecord, payload: AnyRecord): string {
  const raw = cleanString(firstDefined(src.sport, src.header?.sport, payload.sport, src.game, payload.game, src.kind, src.mode), 'darts');
  const lower = raw.toLowerCase();
  if (lower.includes('baby')) return 'babyfoot';
  if (lower.includes('darts') || lower.includes('x01') || lower.includes('cricket') || lower.includes('killer') || lower.includes('golf') || lower.includes('shanghai')) return 'darts';
  return raw;
}

function inferMode(src: AnyRecord, payload: AnyRecord): string {
  const raw = cleanString(firstDefined(src.mode, src.kind, src.header?.mode, payload.mode, payload.kind, payload.onlineMode), 'match');
  const lower = raw.toLowerCase();
  if (lower.includes('baby')) return 'babyfoot';
  if (lower.includes('x01')) return 'x01';
  if (lower.includes('cricket')) return 'cricket';
  if (lower.includes('killer')) return 'killer';
  if (lower.includes('golf')) return 'golf';
  if (lower.includes('shanghai')) return 'shanghai';
  return raw;
}

function buildTitle(src: AnyRecord, payload: AnyRecord, mode: string, id: string): string {
  const explicit = cleanString(firstDefined(src.title, src.header?.title, payload.title), '');
  if (explicit) return explicit;

  const players = sanitizePlayers(firstDefined(src.players, src.header?.players, payload.players, []));
  const names = players.map((p) => p.name).filter(Boolean).slice(0, 4);
  if (names.length >= 2) return `${mode.toUpperCase()} - ${names.join(' vs ')}`;
  if (names.length === 1) return `${mode.toUpperCase()} - ${names[0]}`;
  return `Partie récupérée ${id}`;
}

function normalizeOneRecoveredRow(input: any): AnyRecord | null {
  const unwrapped = unwrapCandidate(input);
  if (!isObject(unwrapped)) return null;

  const src = unwrapped;
  const payload = resolvePayload(src);

  const id = cleanString(firstDefined(
    src.matchId,
    src.id,
    src.header?.matchId,
    src.header?.id,
    payload.matchId,
    payload.id,
    payload.config?.id,
    payload.lobbyId
  ));
  if (!id) return null;

  const now = Date.now();
  const createdAt = safeNumber(firstDefined(src.createdAt, src.header?.createdAt, payload.createdAt, payload.config?.createdAt, src.date, payload.date), now);
  const updatedAt = safeNumber(firstDefined(src.updatedAt, src.finishedAt, src.header?.updatedAt, payload.updatedAt, payload.finishedAt), createdAt);
  const finishedAt = safeNumber(firstDefined(src.finishedAt, payload.finishedAt, src.header?.finishedAt, updatedAt), updatedAt);

  const mode = inferMode(src, payload);
  const sport = inferSport(src, payload);
  const players = sanitizePlayers(firstDefined(src.players, src.header?.players, payload.players, payload.config?.players, []));

  const summary = isObject(src.summary)
    ? src.summary
    : isObject(src.header?.summary)
      ? src.header.summary
      : isObject(payload.summary)
        ? payload.summary
        : {};

  const stats = isObject(src.stats)
    ? src.stats
    : isObject(payload.stats)
      ? payload.stats
      : isObject(payload.detailedByPlayer)
        ? { detailedByPlayer: payload.detailedByPlayer }
        : {};

  const row: AnyRecord = {
    id,
    matchId: id,
    kind: mode,
    mode,
    sport,
    status: cleanString(firstDefined(src.status, src.header?.status, payload.status, payload.phase), 'finished'),
    title: buildTitle(src, payload, mode, id),
    createdAt,
    updatedAt,
    finishedAt,
    players,
    winnerId: firstDefined(src.winnerId, src.header?.winnerId, payload.winnerId, payload.winner?.id, summary.winnerId, null),
    winnerName: firstDefined(src.winnerName, src.header?.winnerName, payload.winnerName, payload.winner?.name, summary.winnerName, null),
    score: firstDefined(src.score, src.header?.score, payload.score, summary.score, null),
    summary,
    stats,
    game: firstDefined(src.game, src.header?.game, payload.game, null),
    payload,
    payloadDecoded: payload,
    source: cleanString(firstDefined(src.source, src.header?.source), 'recovered-import'),
    recovery: isObject(src.recovery) ? src.recovery : { importedRecovered: true, importer: 'importRecoveredHistory.ts' },
  };

  // Compat ancienne carte historique : certains écrans lisent directement ces champs.
  if (!row.date) row.date = finishedAt;
  if (!row.at) row.at = finishedAt;
  if (!row.modeLabel) row.modeLabel = mode.toUpperCase();

  return row;
}

export function normalizeRecoveredHistoryImport(rawInput: any): AnyRecord[] {
  const raw = parseJsonStringMaybe(rawInput);
  if (!isObject(raw) && !Array.isArray(raw)) return [];

  // Liste brute de lignes ou de matchs.
  if (Array.isArray(raw)) {
    return raw.map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  }

  // Bundle technique v2.
  if (raw.schema === 'dc_recovered_history_bundle_v2') {
    return asArraySafe(raw.items || raw.rows || raw.matches).map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  }

  // Bundle v1/v2 direct.
  if (raw.schema === 'dc_recovered_match_import_v1' || raw.schema === 'dc_recovered_match_import_v2') {
    return asArraySafe(raw.items || raw.rows || raw.matches || raw.match || raw.payload || raw.data).map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  }

  // Full restore-like : _v + history.rows/items.
  if ((raw._v === 1 || raw._v === 2) && isObject(raw.history)) {
    const rows = asArraySafe(raw.history.items || raw.history.rows || raw.history.matches);
    if (rows.length) return rows.map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  }

  // Certains exports complets mettent les lignes dans payload.history.
  if (isObject(raw.payload) && isObject(raw.payload.history)) {
    const rows = asArraySafe(raw.payload.history.items || raw.payload.history.rows || raw.payload.history.matches);
    if (rows.length) return rows.map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  }

  // Fichier partageable flat/wrapped ou ligne native isolée.
  const candidate = unwrapCandidate(raw);
  const normalized = normalizeOneRecoveredRow(candidate);
  return normalized ? [normalized] : [];
}

export function isRecoveredHistoryImport(raw: any): boolean {
  return normalizeRecoveredHistoryImport(raw).length > 0;
}

export async function importRecoveredHistoryRows(rows: AnyRecord[]): Promise<RecoveredHistoryImportResult> {
  const normalizedRows = rows.map(normalizeOneRecoveredRow).filter(Boolean) as AnyRecord[];
  let imported = 0;
  let ignored = 0;

  for (const row of normalizedRows) {
    try {
      await History.upsert(row);
      imported += 1;
    } catch (err) {
      console.warn('[importRecoveredHistory] ligne ignorée', row?.id, err);
      ignored += 1;
    }
  }

  return {
    ok: imported > 0,
    imported,
    ignored,
    rows: normalizedRows,
    message: imported > 0
      ? `${imported} partie(s) récupérée(s) importée(s) dans l'historique.`
      : `Aucune partie récupérable importée.`,
  };
}

export async function importRecoveredHistoryJson(raw: any): Promise<RecoveredHistoryImportResult> {
  const rows = normalizeRecoveredHistoryImport(raw);
  if (!rows.length) {
    return {
      ok: false,
      imported: 0,
      ignored: 0,
      rows: [],
      message: `Format non reconnu par l'importeur de récupération.`,
    };
  }
  return importRecoveredHistoryRows(rows);
}

export async function importRecoveredHistoryFile(file: File): Promise<RecoveredHistoryImportResult> {
  const text = await file.text();
  const parsed = parseJsonStringMaybe(text);
  return importRecoveredHistoryJson(parsed);
}

/**
 * À appeler dans ton handler existant, juste AVANT l'alerte "Format invalide".
 * Retourne true si le fichier a été pris en charge par ce patch.
 */
export async function tryRecoveredHistoryImportBeforeInvalid(parsedJson: any): Promise<boolean> {
  const result = await importRecoveredHistoryJson(parsedJson);
  if (!result.ok) return false;
  alert(result.message);
  return true;
}

export default {
  normalizeRecoveredHistoryImport,
  isRecoveredHistoryImport,
  importRecoveredHistoryRows,
  importRecoveredHistoryJson,
  importRecoveredHistoryFile,
  tryRecoveredHistoryImportBeforeInvalid,
};
