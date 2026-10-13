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


export function footballPerformanceRating(stats: any): number {
  const darts = n(stats?.darts);
  const involvement = darts + n(stats?.goals) + n(stats?.saves) + n(stats?.interceptions);
  if (involvement <= 0) return 0;
  const accuracy = pct(n(stats?.successfulActions), Math.max(1, darts));
  const raw = 4.2
    + Math.min(2.2, accuracy * 0.022)
    + Math.min(2.4, n(stats?.goals) * 0.85)
    + Math.min(1.2, n(stats?.saves) * 0.24)
    + Math.min(1.1, n(stats?.interceptions) * 0.20)
    + Math.min(0.7, n(stats?.counterAttacks) * 0.16)
    + Math.min(0.5, n(stats?.shotsOnTarget) * 0.08)
    - Math.min(0.8, n(stats?.misses) * 0.04);
  return Math.round(Math.max(1, Math.min(10, raw)) * 10) / 10;
}



// -----------------------------------------------------------------------------
// V7 — ADN tactique + carte de cible
// -----------------------------------------------------------------------------

const clamp100 = (value: any) => Math.max(0, Math.min(100, Math.round(n(value))));
const ratio100 = (value: any, total: any) => n(total) > 0 ? clamp100((n(value) / n(total)) * 100) : 0;

export function footballTacticalProfile(stats: any) {
  const darts = n(stats?.darts);
  const attackVisits = n(stats?.attackVisits);
  const defenseVisits = n(stats?.defenseVisits);
  const goalkeeperVisits = n(stats?.goalkeeperVisits);
  const shots = n(stats?.shots);
  const hits = n(stats?.hits);
  const successful = n(stats?.successfulActions);

  const accuracy = ratio100(successful, darts);
  const boardControl = ratio100(hits, darts);
  const progression = attackVisits > 0 ? clamp100((n(stats?.advances) / Math.max(1, attackVisits * 2)) * 100) : 0;
  const creation = attackVisits > 0 ? clamp100(((n(stats?.passes) + n(stats?.counterAttacks) * 1.5) / Math.max(1, attackVisits * 1.6)) * 100) : 0;
  const shotAccuracy = ratio100(n(stats?.shotsOnTarget), shots);
  const conversion = ratio100(n(stats?.goals), shots);
  const interceptionRate = ratio100(n(stats?.interceptions), defenseVisits);
  const defensiveActivity = defenseVisits > 0 ? clamp100(((n(stats?.tackles) + n(stats?.clearances)) / Math.max(1, defenseVisits * 1.5)) * 100) : 0;
  const saveRate = ratio100(n(stats?.saves), goalkeeperVisits);
  const possession = defenseVisits > 0 ? ratio100(n(stats?.possessionWins), defenseVisits) : 0;

  const scores = {
    attaque: clamp100(accuracy * 0.34 + progression * 0.42 + creation * 0.24),
    finition: clamp100(shotAccuracy * 0.45 + conversion * 0.55),
    defense: clamp100(interceptionRate * 0.58 + defensiveActivity * 0.27 + possession * 0.15),
    gardien: clamp100(saveRate),
    controle: clamp100(boardControl * 0.58 + accuracy * 0.42),
  };

  const descriptors: Record<string, { label: string; icon: string; color: string }> = {
    attaque: { label: "Meneur offensif", icon: "🚀", color: "#65e5aa" },
    finition: { label: "Finisseur", icon: "⚽", color: "#ffd36b" },
    defense: { label: "Mur défensif", icon: "🛡️", color: "#ff5b77" },
    gardien: { label: "Gardien", icon: "🧤", color: "#35d0ff" },
    controle: { label: "Maître de la cible", icon: "🎯", color: "#a78bfa" },
  };
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ordered[0] || ["controle", 0];
  const second = ordered[1] || ["controle", 0];
  const balanced = n(top[1]) > 0 && n(top[1]) - n(second[1]) <= 6;
  const descriptor = balanced
    ? { label: "Joueur polyvalent", icon: "⭐", color: "#ffd36b" }
    : descriptors[String(top[0])] || descriptors.controle;

  return {
    ...scores,
    label: descriptor.label,
    icon: descriptor.icon,
    color: descriptor.color,
    dominant: String(top[0]),
    dominantScore: n(top[1]),
  };
}

function footballRecordVisits(record: any): any[] {
  const sources = [
    record?.summary?.visits,
    record?.payload?.summary?.visits,
    record?.payload?.visits,
    record?.payload?.visitHistory,
    record?.resume?.state?.visits,
    record?.payload?.stateSnapshot?.visits,
  ];
  return (sources.find(Array.isArray) || []) as any[];
}

function footballDartSegment(dart: any): number | null {
  if (!dart || dart?.bed === "MISS" || dart?.bed === "OB" || dart?.bed === "IB") return null;
  const segment = n(dart?.number);
  return segment >= 1 && segment <= 20 ? segment : null;
}

function footballMissionHit(visit: any, dart: any): boolean {
  const action = txt(visit?.action);
  if (!dart || dart?.bed === "MISS") return false;
  if (action === "classic_possession") return dart?.bed === "OB" || dart?.bed === "IB";
  if (action === "classic_shot") return dart?.bed === "D" || dart?.bed === "IB";
  if (dart?.bed === "OB" || dart?.bed === "IB") return action === "goalkeeper" || action === "penalty" || action === "attack";
  const segment = footballDartSegment(dart);
  const targets = [
    ...(Array.isArray(visit?.targets) ? visit.targets : []),
    ...(Array.isArray(visit?.saveTargets) ? visit.saveTargets : []),
  ].map(n);
  return segment != null && targets.includes(segment);
}

export function buildFootballSectorProfileFromVisits(visits: any[] = [], playerId?: string) {
  const pid = txt(playerId);
  const sectors = Array.from({ length: 20 }, (_, index) => ({
    sector: index + 1,
    darts: 0,
    missionHits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
  }));
  let bull = 0, dbull = 0, misses = 0, totalDarts = 0, missionHits = 0;

  for (const visit of visits || []) {
    if (pid && txt(visit?.playerId) !== pid) continue;
    for (const dart of Array.isArray(visit?.darts) ? visit.darts : []) {
      totalDarts += 1;
      if (!dart || dart?.bed === "MISS") { misses += 1; continue; }
      if (dart?.bed === "OB") { bull += 1; if (footballMissionHit(visit, dart)) missionHits += 1; continue; }
      if (dart?.bed === "IB") { dbull += 1; if (footballMissionHit(visit, dart)) missionHits += 1; continue; }
      const segment = footballDartSegment(dart);
      if (segment == null) continue;
      const row = sectors[segment - 1];
      row.darts += 1;
      if (dart?.bed === "S") row.singles += 1;
      if (dart?.bed === "D") row.doubles += 1;
      if (dart?.bed === "T") row.triples += 1;
      if (footballMissionHit(visit, dart)) {
        row.missionHits += 1;
        missionHits += 1;
      }
    }
  }

  const ranked = [...sectors]
    .filter((row) => row.darts > 0)
    .sort((a, b) => b.missionHits - a.missionHits || b.darts - a.darts || a.sector - b.sector);

  return {
    sectors,
    topSectors: ranked.slice(0, 5),
    strongestSector: ranked[0] || null,
    bull,
    dbull,
    misses,
    totalDarts,
    missionHits,
    missionRate: ratio100(missionHits, totalDarts),
  };
}

export function buildFootballSectorProfileFromState(state: any, playerId?: string) {
  return buildFootballSectorProfileFromVisits(Array.isArray(state?.visits) ? state.visits : [], playerId);
}

export function buildFootballSectorProfileFromRecord(record: any, playerId?: string) {
  return buildFootballSectorProfileFromVisits(footballRecordVisits(record), playerId);
}

export function buildFootballSectorProfileFromRecords(records: any[] = [], playerId?: string) {
  const visits = (records || []).flatMap((record: any) => footballRecordVisits(record));
  return buildFootballSectorProfileFromVisits(visits, playerId);
}

type FootballCareerSnapshot = {
  games: number; wins: number; draws: number; losses: number; goals: number; saves: number; interceptions: number;
};

const careerMilestones = [
  { key: "games", values: [1, 10, 25, 50, 100, 250], icon: "🏟️", label: "Matchs joués" },
  { key: "wins", values: [1, 10, 25, 50, 100], icon: "🏆", label: "Victoires" },
  { key: "goals", values: [1, 10, 25, 50, 100, 250], icon: "⚽", label: "Buts" },
  { key: "saves", values: [10, 25, 50, 100, 250], icon: "🧤", label: "Arrêts" },
  { key: "interceptions", values: [10, 25, 50, 100, 250], icon: "🛡️", label: "Interceptions" },
] as const;

export function buildFootballCareerSnapshot(records: any[] = [], playerId?: string, playerName?: string): FootballCareerSnapshot {
  const snapshot: FootballCareerSnapshot = { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, saves: 0, interceptions: 0 };
  for (const record of records || []) {
    if (!isFootballHistoryRecord(record)) continue;
    const row = footballFindHistoryRow(record, playerId, playerName);
    if (!row) continue;
    snapshot.games += 1;
    const result = footballHistoryResult(record, row, playerId);
    snapshot.wins += result === "W" ? 1 : 0;
    snapshot.draws += result === "D" ? 1 : 0;
    snapshot.losses += result === "L" ? 1 : 0;
    snapshot.goals += n(row?.goals);
    snapshot.saves += n(row?.saves);
    snapshot.interceptions += n(row?.interceptions);
  }
  return snapshot;
}

export function buildFootballCareerProgress(records: any[] = [], playerId?: string, playerName?: string) {
  const snapshot = buildFootballCareerSnapshot(records, playerId, playerName);
  const next: any[] = [];
  const achieved: any[] = [];
  for (const definition of careerMilestones) {
    const value = n((snapshot as any)[definition.key]);
    const reached = definition.values.filter((target) => value >= target);
    if (reached.length) {
      const target = reached[reached.length - 1];
      achieved.push({ ...definition, target, value });
    }
    const target = definition.values.find((goal) => value < goal);
    if (target != null) next.push({ ...definition, target, value, progress: Math.min(100, Math.round((value / target) * 100)) });
  }
  return { snapshot, achieved, next };
}

function currentPlayerCareerValue(state: any, player: any, key: string): number {
  const stats = state?.statsByPlayer?.[player?.id] || {};
  if (key === "games") return 1;
  if (key === "wins") return state?.draw ? 0 : (Array.isArray(state?.winnerPlayerIds) && state.winnerPlayerIds.includes(player?.id) ? 1 : 0);
  return n(stats?.[key]);
}

export function footballCareerMilestonesUnlocked(records: any[] = [], state: any, profilesById?: Map<string, any>) {
  const unlocked: any[] = [];
  const prior = (records || []).filter((record: any) => isFootballHistoryRecord(record) && footballHistoryPlayedAt(record) > 0 && footballHistoryPlayedAt(record) < (n(state?.startedAt) || Date.now()));
  for (const player of Array.isArray(state?.players) ? state.players : []) {
    const pid = txt(player?.id);
    const profile = profilesById?.get?.(pid) || player;
    const pname = txt(profile?.name || profile?.displayName || profile?.display_name || player?.name || "Joueur");
    const before = buildFootballCareerSnapshot(prior, pid, pname);
    for (const definition of careerMilestones) {
      const previous = n((before as any)[definition.key]);
      const current = previous + currentPlayerCareerValue(state, player, definition.key);
      for (const target of definition.values) {
        if (previous < target && current >= target) unlocked.push({ playerId: pid, playerName: pname, key: definition.key, icon: definition.icon, label: definition.label, target, value: current });
      }
    }
  }
  return unlocked.slice(0, 12);
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
    milestones: footballCareerMilestonesUnlocked(records, state, profilesById),
    ratings: (Array.isArray(state?.players) ? state.players : []).map((player: any) => {
      const pid = txt(player?.id);
      const profile = profilesById?.get?.(pid) || player;
      return { playerId: pid, playerName: txt(profile?.name || profile?.displayName || profile?.display_name || player?.name || "Joueur"), rating: footballPerformanceRating(state?.statsByPlayer?.[pid] || {}) };
    }).sort((a: any, b: any) => b.rating - a.rating),
  };
}

// -----------------------------------------------------------------------------
// V8 — Momentum live + distinctions de match + palmarès avancé
// -----------------------------------------------------------------------------

export function buildFootballMomentumFromState(state: any, windowSize = 6) {
  const sides = Array.isArray(state?.sides) ? state.sides.slice(0, 2) : [];
  const visits = Array.isArray(state?.visits) ? state.visits.slice(-Math.max(1, Number(windowSize) || 6)) : [];
  const raw: Record<string, number> = Object.fromEntries(sides.map((side: any) => [txt(side?.id), 0]));

  for (const visit of visits) {
    const sideId = txt(visit?.sideId);
    if (!sideId || raw[sideId] == null) continue;
    let value = 0.7;
    for (const event of Array.isArray(visit?.events) ? visit.events : []) {
      const type = low(event?.type);
      const label = low(event?.label);
      if (type.includes("goal") || label.includes("but")) value += 9;
      else if (type.includes("shot_on_target") || label.includes("tir cadr")) value += 3.2;
      else if (type.includes("save") || label.includes("arrêt") || label.includes("arret")) value += 3.6;
      else if (type.includes("interception") || label.includes("interception")) value += label.includes("contre") ? 4.6 : 3.3;
      else if (type.includes("counter") || label.includes("contre-attaque")) value += 4.2;
      else if (type.includes("advance") || label.includes("progression")) value += Math.max(0.8, Math.min(3.6, n(event?.value) * 1.15));
      else if (type.includes("clearance") || label.includes("repouss")) value += 1.4;
      else if (type.includes("penalt") && (label.includes("but") || label.includes("marqu"))) value += 5.5;
      else if (type.includes("miss") || label.includes("manqué") || label.includes("rate")) value -= 0.35;
    }
    raw[sideId] = Math.max(0, raw[sideId] + value);
  }

  if (sides.length < 2) return { leftPct: 50, rightPct: 50, leaderSideId: null, label: "ÉQUILIBRÉ", window: visits.length, scores: raw };
  const leftId = txt(sides[0]?.id);
  const rightId = txt(sides[1]?.id);
  const leftScore = Math.max(0, n(raw[leftId]));
  const rightScore = Math.max(0, n(raw[rightId]));
  const total = leftScore + rightScore;
  const leftPct = total > 0 ? Math.round((leftScore / total) * 100) : 50;
  const rightPct = 100 - leftPct;
  const gap = Math.abs(leftPct - rightPct);
  const leaderSideId = gap < 8 ? null : leftPct > rightPct ? leftId : rightId;
  const label = gap < 8 ? "ÉQUILIBRÉ" : gap < 24 ? "LÉGER TEMPS FORT" : gap < 45 ? "TEMPS FORT" : "DOMINATION";
  return { leftPct, rightPct, leaderSideId, label, window: visits.length, scores: raw };
}

export function footballMatchHonoursFromState(state: any, profilesById?: Map<string, any>) {
  const honours: any[] = [];
  const players = Array.isArray(state?.players) ? state.players : [];
  const sides = Array.isArray(state?.sides) ? state.sides : [];
  const scoreBySide = state?.scoreBySide || {};
  const winnerSideId = Array.isArray(state?.winnerSideIds) ? txt(state.winnerSideIds[0]) : "";
  const sideName = (id: string) => txt(sides.find((side: any) => txt(side?.id) === id)?.name || "Équipe");
  const playerLabel = (player: any) => {
    const profile = profilesById?.get?.(txt(player?.id)) || player;
    return txt(profile?.name || profile?.displayName || profile?.display_name || player?.name || "Joueur");
  };
  const push = (item: any) => {
    const key = `${item.scope || "player"}:${item.playerId || item.sideId || ""}:${item.label}`;
    if (!honours.some((entry: any) => entry.key === key)) honours.push({ key, ...item });
  };

  if (winnerSideId) {
    const loser = sides.find((side: any) => txt(side?.id) !== winnerSideId);
    const winnerScore = n(scoreBySide?.[winnerSideId]);
    const loserScore = n(scoreBySide?.[txt(loser?.id)]);
    if (loser && loserScore === 0) push({ scope: "team", sideId: winnerSideId, icon: "🧱", label: "CLEAN SHEET", detail: `${sideName(winnerSideId)} n'a encaissé aucun but`, color: "#65e5aa", priority: 98 });
    if (winnerScore - loserScore >= 3) push({ scope: "team", sideId: winnerSideId, icon: "🔥", label: "VICTOIRE LARGE", detail: `${winnerScore - loserScore} buts d'écart`, color: "#ff5b77", priority: 86 });

    const cameBack = (Array.isArray(state?.visits) ? state.visits : []).some((visit: any) => {
      const before = visit?.scoreBefore || {};
      return n(before?.[winnerSideId]) < n(before?.[txt(loser?.id)]);
    });
    if (cameBack) push({ scope: "team", sideId: winnerSideId, icon: "↗️", label: "REMONTÉE", detail: `${sideName(winnerSideId)} a renversé le match`, color: "#ffd36b", priority: 100 });
  }

  if (state?.stage === "penalties" || state?.config?.variant === "penalties") {
    if (winnerSideId) push({ scope: "team", sideId: winnerSideId, icon: "🥅", label: "ROI DES PENALTIES", detail: `${sideName(winnerSideId)} gagne la séance`, color: "#35d0ff", priority: 92 });
  }
  if (state?.config?.variant === "golden_goal" && winnerSideId) {
    push({ scope: "team", sideId: winnerSideId, icon: "⚡", label: "GOLDEN GOAL", detail: "Victoire au premier but", color: "#ffd36b", priority: 94 });
  }

  for (const player of players) {
    const pid = txt(player?.id);
    const stats = state?.statsByPlayer?.[pid] || {};
    const name = playerLabel(player);
    const rating = footballPerformanceRating(stats);
    const accuracy = footballRowAccuracy(stats);
    const base = { scope: "player", playerId: pid, playerName: name };

    if (n(stats?.goals) >= 3) push({ ...base, icon: "🎩", label: "HAT-TRICK", detail: `${n(stats.goals)} buts`, color: "#ffd36b", priority: 96 });
    if (n(stats?.saves) >= 3) push({ ...base, icon: "🧤", label: "MUR", detail: `${n(stats.saves)} arrêts`, color: "#35d0ff", priority: 82 });
    if (n(stats?.interceptions) >= 3) push({ ...base, icon: "🛡️", label: "SENTINELLE", detail: `${n(stats.interceptions)} interceptions`, color: "#ff5b77", priority: 80 });
    if (n(stats?.advances) >= 8) push({ ...base, icon: "🚀", label: "MOTEUR", detail: `+${n(stats.advances)} zones gagnées`, color: "#65e5aa", priority: 72 });
    if (n(stats?.darts) >= 6 && accuracy >= 70) push({ ...base, icon: "🎯", label: "SNIPER", detail: `${Math.round(accuracy * 10) / 10}% de précision`, color: "#a78bfa", priority: 84 });
    if (rating >= 9) push({ ...base, icon: "⭐", label: "MASTERCLASS", detail: `Note ${rating.toFixed(1)}/10`, color: "#ffd36b", priority: 99 });
    if (n(stats?.counterAttacks) >= 2) push({ ...base, icon: "⚡", label: "CONTRE-ATTAQUANT", detail: `${n(stats.counterAttacks)} contres`, color: "#65e5aa", priority: 74 });
    if (n(stats?.penaltiesScored) >= 3) push({ ...base, icon: "🥅", label: "SANG-FROID", detail: `${n(stats.penaltiesScored)} penalties marqués`, color: "#35d0ff", priority: 78 });
  }

  return honours.sort((a: any, b: any) => n(b.priority) - n(a.priority)).slice(0, 12);
}

export function buildFootballCareerHonours(records: any[] = [], playerId?: string, playerName?: string) {
  const summary = {
    cleanSheets: 0,
    comebacks: 0,
    hatTricks: 0,
    wallGames: 0,
    sentinelGames: 0,
    sniperGames: 0,
    masterclasses: 0,
    goldenGoalWins: 0,
    shootoutWins: 0,
    bestRating: 0,
  };

  for (const record of records || []) {
    if (!isFootballHistoryRecord(record)) continue;
    const row = footballFindHistoryRow(record, playerId, playerName);
    if (!row) continue;
    const result = footballHistoryResult(record, row, playerId);
    const rating = footballPerformanceRating(row);
    summary.bestRating = Math.max(summary.bestRating, rating);
    if (n(row?.goals) >= 3) summary.hatTricks += 1;
    if (n(row?.saves) >= 3) summary.wallGames += 1;
    if (n(row?.interceptions) >= 3) summary.sentinelGames += 1;
    if (n(row?.darts) >= 6 && footballRowAccuracy(row) >= 70) summary.sniperGames += 1;
    if (rating >= 9) summary.masterclasses += 1;

    const state = record?.resume?.state || record?.payload?.stateSnapshot || record?.payload?.state || {};
    const variant = txt(record?.summary?.variant || record?.payload?.variant || record?.payload?.config?.variant || state?.config?.variant);
    if (result === "W" && variant === "golden_goal") summary.goldenGoalWins += 1;
    if (result === "W" && (variant === "penalties" || state?.stage === "penalties")) summary.shootoutWins += 1;

    if (result === "W") {
      const ownSideId = txt(row?.sideId);
      const sides = Array.isArray(state?.sides) ? state.sides : [];
      const opponent = sides.find((side: any) => txt(side?.id) && txt(side?.id) !== ownSideId);
      if (opponent) {
        const opponentScore = scoreForSide(record, txt(opponent?.id));
        if (opponentScore === 0) summary.cleanSheets += 1;
        const cameBack = (Array.isArray(state?.visits) ? state.visits : []).some((visit: any) => {
          const before = visit?.scoreBefore || {};
          return n(before?.[ownSideId]) < n(before?.[txt(opponent?.id)]);
        });
        if (cameBack) summary.comebacks += 1;
      }
    }
  }

  return summary;
}

