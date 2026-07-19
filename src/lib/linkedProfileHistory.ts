import LZString from "lz-string";

function isObject(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(value: any): any | null {
  if (isObject(value) || Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Les snapshots NAS conservent le payload lourd de History dans
 * `payloadCompressed` (LZ-String UTF16). Une association de profil doit le
 * décoder avant de recréer la partie, sinon seul l'en-tête léger est importé.
 */
export function decodeLinkedHistoryPayload(row: any): any | null {
  if (isObject(row?.payload) || Array.isArray(row?.payload)) return row.payload;

  const packed = row?.payloadCompressed ?? row?.detail?.payloadCompressed ?? null;
  if (typeof packed !== "string" || !packed.length) return null;

  const direct = parseJsonObject(packed);
  if (direct) return direct;

  const attempts = [
    () => LZString.decompressFromUTF16(packed),
    () => LZString.decompress(packed),
    () => LZString.decompressFromBase64(packed),
  ];
  for (const attempt of attempts) {
    try {
      const parsed = parseJsonObject(attempt());
      if (parsed) return parsed;
    } catch {}
  }
  return null;
}

function playerListScore(value: any): number {
  if (!Array.isArray(value) || !value.length) return 0;
  let score = value.length * 1000;
  for (const player of value) {
    if (!isObject(player)) continue;
    for (const key of [
      "id", "playerId", "profileId", "userId", "name", "displayName", "nickname",
      "avatarUrl", "teamId", "teamName", "rank", "score", "sets", "legs", "stats",
    ]) {
      if (player[key] !== undefined && player[key] !== null && player[key] !== "") score += 1;
    }
  }
  return score;
}

function pickRichestPlayers(...candidates: any[]): any[] {
  let best: any[] = [];
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = playerListScore(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return Array.isArray(best) ? best : [];
}

function firstDefined(...values: any[]): any {
  for (const value of values) if (value !== undefined && value !== null) return value;
  return undefined;
}

/**
 * Reconstruit une ligne History complète depuis son en-tête + payload compressé.
 * Le payload détaillé gagne sur les compteurs légers de l'en-tête (qui peuvent
 * être restés à 0 pendant le dernier autosave).
 */
export function hydrateLinkedHistoryRow(row: any): any {
  if (!isObject(row)) return row;
  const payloadRaw = decodeLinkedHistoryPayload(row);
  if (!isObject(payloadRaw)) return row;

  const payloadSummary = isObject(payloadRaw.summary) ? payloadRaw.summary : {};
  const rowSummary = isObject(row.summary) ? row.summary : {};
  const summary = { ...rowSummary, ...payloadSummary };
  const players = pickRichestPlayers(
    row.players,
    rowSummary.players,
    payloadRaw.players,
    payloadSummary.players,
    payloadRaw.config?.players,
    payloadRaw.cfg?.players,
  );

  if (players.length) summary.players = players;

  const payload = {
    ...payloadRaw,
    ...(players.length ? { players } : {}),
    summary,
  };

  const hydrated: any = {
    ...row,
    payload,
    summary,
    ...(players.length ? { players } : {}),
    winnerId: firstDefined(
      payloadSummary.winnerId,
      payloadRaw.winnerId,
      payloadRaw.result?.winnerId,
      row.winnerId,
    ) ?? null,
    game: {
      ...(isObject(payloadRaw.game) ? payloadRaw.game : {}),
      ...(isObject(row.game) ? row.game : {}),
    },
  };

  // Champs fréquemment lus directement à la racine par les cartes et écrans
  // de détail multi-sports. On ne remplace jamais une valeur racine existante.
  for (const key of [
    "sport", "mode", "variant", "score", "scoreA", "scoreB", "finalScore", "finalScores",
    "scores", "scoreByPlayer", "remainingScores", "winner", "winnerTeam", "rankings",
    "teams", "teamA", "teamB", "stats", "matchStats", "liveStatsByPlayer", "events",
    "feed", "matchFeed", "legs", "sets", "visitHistory", "visitsHistory", "legDetails",
    "detailedByPlayer", "dartSetIdsByPlayer",
  ]) {
    if (hydrated[key] === undefined && payloadRaw[key] !== undefined) hydrated[key] = payloadRaw[key];
  }

  // Le payload a été décodé : ne pas conserver une seconde copie compressée
  // dans l'en-tête matérialisé.
  delete hydrated.payloadCompressed;
  return hydrated;
}

export function linkedHistoryRowQuality(row: any): number {
  if (!isObject(row)) return 0;
  let score = 0;
  if (isObject(row.payload)) score += 100_000;
  if (typeof row.payloadCompressed === "string" && row.payloadCompressed.length) score += 50_000 + row.payloadCompressed.length;
  if (isObject(row.summary)) score += 5_000 + Object.keys(row.summary).length * 10;
  score += playerListScore(row.players);
  try { score += Math.min(25_000, JSON.stringify(row).length); } catch {}
  return score;
}

