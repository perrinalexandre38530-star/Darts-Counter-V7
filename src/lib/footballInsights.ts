// =============================================================
// DARTS FOOTBALL — insights carrière / records / face-à-face
// Helpers purs et tolérants aux anciennes formes d'historique.
// =============================================================

const n = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const txt = (value: any) => String(value ?? "").trim();
const low = (value: any) => txt(value).toLowerCase();
const pct = (value: any, total: any) => (n(total) > 0 ? Math.round((n(value) / n(total)) * 1000) / 10 : 0);

export function isFootballHistoryRecord(record: any): boolean {
  const tag = [
    record?.kind,
    record?.mode,
    record?.game?.mode,
    record?.summary?.kind,
    record?.summary?.mode,
    record?.summary?.game?.mode,
    record?.payload?.kind,
    record?.payload?.mode,
    record?.payload?.game?.mode,
    record?.payload?.stats?.mode,
  ].map(low).join("|");
  return tag.includes("football") && !tag.includes("babyfoot");
}

export function footballHistoryPlayedAt(record: any): number {
  return n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt || record?.summary?.finishedAt);
}

export function footballHistoryRows(record: any): any[] {
  const pools = [
    record?.summary?.perPlayer,
    record?.summary?.rankings,
    record?.payload?.summary?.perPlayer,
    record?.payload?.summary?.rankings,
    record?.payload?.stats?.players,
    record?.payload?.players,
    record?.players,
  ].filter(Array.isArray) as any[][];
  if (!pools.length) return [];
  const merged = new Map<string, any>();
  for (const pool of pools) {
    for (const row of pool) {
      const id = txt(row?.id || row?.playerId || row?.profileId || row?.name || row?.playerName);
      if (!id) continue;
      merged.set(id, { ...(merged.get(id) || {}), ...row });
    }
  }
  return [...merged.values()];
}

export function footballFindHistoryRow(record: any, playerId?: string, playerName?: string): any | null {
  const pid = txt(playerId);
  const pname = low(playerName);
  const rows = footballHistoryRows(record);
  if (pid) {
    const byId = rows.find((row: any) => txt(row?.id || row?.playerId || row?.profileId) === pid);
    if (byId) return byId;
  }
  if (pname) {
    const byName = rows.find((row: any) => low(row?.name || row?.playerName) === pname);
    if (byName) return byName;
  }
  return null;
}

export function footballHistoryDraw(record: any): boolean {
  return Boolean(record?.summary?.draw || record?.payload?.summary?.draw || record?.draw);
}

export function footballHistoryWinnerIds(record: any): string[] {
  return [
    record?.winnerIds,
    record?.summary?.winnerIds,
    record?.payload?.winnerIds,
    record?.winnerId,
    record?.summary?.winnerId,
  ].flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : []).map(String);
}

export function footballHistoryResult(record: any, row: any, playerId?: string): "W" | "D" | "L" {
  if (footballHistoryDraw(record)) return "D";
  const pid = txt(playerId || row?.id || row?.playerId || row?.profileId);
  const won = row?.win === true || row?.winner === true || (pid && footballHistoryWinnerIds(record).includes(pid));
  return won ? "W" : "L";
}

export function footballRowAccuracy(row: any): number {
  const stored = n(row?.accuracy);
  if (stored > 0) return stored;
  return pct(n(row?.successfulActions), n(row?.darts));
}

function sideNamesForRecord(record: any): string[] {
  const rows = footballHistoryRows(record);
  const fromRows = rows.map((row: any) => txt(row?.sideName)).filter(Boolean);
  const state = record?.resume?.state || record?.payload?.stateSnapshot || record?.payload?.state || {};
  const fromState = Array.isArray(state?.sides) ? state.sides.map((side: any) => txt(side?.name)).filter(Boolean) : [];
  return [...new Set([...fromRows, ...fromState])];
}

export function footballOpponentLabel(record: any, row: any): string {
  const ownSide = txt(row?.sideName);
  const rows = footballHistoryRows(record);
  const opponentSides = [...new Set(rows.map((item: any) => txt(item?.sideName)).filter((name: string) => name && (!ownSide || name !== ownSide)))];
  if (opponentSides.length) return opponentSides.join(" + ");
  const sides = sideNamesForRecord(record).filter((name) => !ownSide || name !== ownSide);
  if (sides.length) return sides.join(" + ");
  const ownId = txt(row?.id || row?.playerId || row?.profileId);
  const others = rows.filter((item: any) => txt(item?.id || item?.playerId || item?.profileId) !== ownId).map((item: any) => txt(item?.name || item?.playerName)).filter(Boolean);
  return [...new Set(others)].join(" + ") || "Adversaire";
}

function scoreForSide(record: any, sideId: string): number | null {
  const summary = record?.summary || record?.payload?.summary || {};
  const state = record?.resume?.state || record?.payload?.stateSnapshot || {};
  const scoreBySide = summary?.scoreBySide || state?.scoreBySide || {};
  if (!sideId || scoreBySide?.[sideId] == null) return null;
  return n(scoreBySide[sideId]);
}

export function buildFootballHeadToHead(records: any[] = [], playerId?: string, playerName?: string) {
  const groups = new Map<string, any>();
  for (const record of records || []) {
    if (!isFootballHistoryRecord(record)) continue;
    const row = footballFindHistoryRow(record, playerId, playerName);
    if (!row) continue;
    const opponent = footballOpponentLabel(record, row);
    const key = low(opponent) || "adversaire";
    const item = groups.get(key) || { opponent, games: 0, wins: 0, draws: 0, losses: 0, goals: 0, goalsAgainst: 0, lastPlayedAt: 0 };
    const result = footballHistoryResult(record, row, playerId);
    item.games += 1;
    item.wins += result === "W" ? 1 : 0;
    item.draws += result === "D" ? 1 : 0;
    item.losses += result === "L" ? 1 : 0;
    item.goals += n(row?.goals);
    item.lastPlayedAt = Math.max(item.lastPlayedAt, footballHistoryPlayedAt(record));

    const ownSideId = txt(row?.sideId);
    const state = record?.resume?.state || record?.payload?.stateSnapshot || {};
    const sides = Array.isArray(state?.sides) ? state.sides : [];
    const otherSide = sides.find((side: any) => txt(side?.id) && txt(side?.id) !== ownSideId);
    const against = scoreForSide(record, txt(otherSide?.id));
    if (against != null) item.goalsAgainst += against;
    groups.set(key, item);
  }
  return [...groups.values()].sort((a, b) => b.games - a.games || b.lastPlayedAt - a.lastPlayedAt);
}

function eventIsKey(event: any): boolean {
  const value = `${low(event?.type)} ${low(event?.label)}`;
  return /(goal|but|save|arr[eê]t|intercept|counter|contre|penalt|tackle|tacle|clean|winner)/i.test(value);
}

export function footballKeyMomentsFromState(state: any, limit = 10) {
  const visits = Array.isArray(state?.visits) ? state.visits : [];
  const moments: any[] = [];
  for (const visit of visits) {
    for (const event of Array.isArray(visit?.events) ? visit.events : []) {
      if (!eventIsKey(event)) continue;
      const score = visit?.scoreAfter || {};
      const sides = Array.isArray(state?.sides) ? state.sides : [];
      const scoreLine = sides.length >= 2 ? `${n(score?.[sides[0]?.id])} - ${n(score?.[sides[1]?.id])}` : "";
      moments.push({
        id: `${visit?.id || moments.length}-${moments.length}`,
        type: txt(event?.type),
        label: txt(event?.label) || "Action clé",
        period: n(visit?.period) || 1,
        round: n(visit?.round) || 1,
        turn: n(visit?.turn),
        playerId: txt(visit?.playerId),
        sideId: txt(visit?.sideId),
        scoreLine,
      });
    }
  }
  return moments.slice(-Math.max(1, limit));
}

export function footballKeyMomentsFromRecord(record: any, limit = 6) {
  const state = record?.resume?.state || record?.payload?.stateSnapshot || record?.payload?.state || {};
  if (Array.isArray(state?.visits) && state.visits.length) return footballKeyMomentsFromState(state, limit);
  const visits = record?.summary?.visits || record?.payload?.visits || record?.payload?.visitHistory || [];
  return footballKeyMomentsFromState({ ...state, visits }, limit);
}

const recordMetrics = [
  { key: "goals", label: "Buts sur un match", icon: "⚽", min: 1 },
  { key: "saves", label: "Arrêts sur un match", icon: "🧤", min: 1 },
  { key: "interceptions", label: "Interceptions sur un match", icon: "🛡️", min: 1 },
  { key: "shotsOnTarget", label: "Tirs cadrés sur un match", icon: "🥅", min: 1 },
  { key: "bestProgress", label: "Progression sur une volée", icon: "🚀", min: 1 },
] as const;

export function buildFootballEndInsights(records: any[] = [], state: any, profilesById?: Map<string, any>) {
  const startedAt = n(state?.startedAt) || Date.now();
  const prior = (records || []).filter((record: any) => isFootballHistoryRecord(record) && footballHistoryPlayedAt(record) > 0 && footballHistoryPlayedAt(record) < startedAt);
  const breakthroughs: any[] = [];

  for (const player of Array.isArray(state?.players) ? state.players : []) {
    const pid = txt(player?.id);
    const profile = profilesById?.get?.(pid) || player;
    const pname = txt(profile?.name || profile?.displayName || profile?.display_name || player?.name || "Joueur");
    const current = state?.statsByPlayer?.[pid] || {};
    const previousRows = prior.map((record: any) => footballFindHistoryRow(record, pid, pname)).filter(Boolean);
    if (!previousRows.length) continue;

    for (const metric of recordMetrics) {
      const currentValue = n(current?.[metric.key]);
      const previous = Math.max(0, ...previousRows.map((row: any) => n(row?.[metric.key])));
      if (currentValue >= metric.min && currentValue > previous) {
        breakthroughs.push({ playerId: pid, playerName: pname, metric: metric.key, label: metric.label, icon: metric.icon, value: currentValue, previous });
      }
    }

    const currentAccuracy = pct(n(current?.successfulActions), n(current?.darts));
    const priorAccuracy = Math.max(0, ...previousRows.filter((row: any) => n(row?.darts) >= 3).map((row: any) => footballRowAccuracy(row)));
    if (n(current?.darts) >= 3 && currentAccuracy > 0 && currentAccuracy > priorAccuracy) {
      breakthroughs.push({ playerId: pid, playerName: pname, metric: "accuracy", label: "Meilleure précision", icon: "🎯", value: currentAccuracy, previous: priorAccuracy, suffix: "%" });
    }
  }

  const sideA = state?.sides?.[0];
  const sideB = state?.sides?.[1];
  const sideAName = txt(sideA?.name);
  const sideBName = txt(sideB?.name);
  const rivalry = { games: 0, winsA: 0, winsB: 0, draws: 0, sideAName, sideBName };
  if (sideAName && sideBName) {
    for (const record of prior) {
      const names = sideNamesForRecord(record);
      if (!names.includes(sideAName) || !names.includes(sideBName)) continue;
      rivalry.games += 1;
      if (footballHistoryDraw(record)) { rivalry.draws += 1; continue; }
      const rows = footballHistoryRows(record);
      const aWon = rows.some((row: any) => txt(row?.sideName) === sideAName && (row?.win === true || row?.winner === true));
      const bWon = rows.some((row: any) => txt(row?.sideName) === sideBName && (row?.win === true || row?.winner === true));
      if (aWon) rivalry.winsA += 1;
      else if (bWon) rivalry.winsB += 1;
    }
  }

  return {
    priorMatchCount: prior.length,
    breakthroughs: breakthroughs.sort((a, b) => n(b.value) - n(a.value)).slice(0, 12),
    rivalry: rivalry.games ? rivalry : null,
    moments: footballKeyMomentsFromState(state, 12),
  };
}
