// =============================================================
// src/lib/babyfootImportRules.ts
// Baby-Foot import / legacy correction helpers.
// - Imports must stay in inbox until the user accepts them.
// - Legacy limited-balls matches with a final DEMI must apply the
//   validated last-ball penalty before being written to History.
// =============================================================

function isObj(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: any, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function firstObj(...values: any[]): Record<string, any> | null {
  for (const value of values) {
    if (isObj(value)) return value;
  }
  return null;
}

function compactRootOf(record: any): Record<string, any> | null {
  const root = getPayloadRoot(record);
  const candidates = [
    record?.compact,
    record?.payload?.compact,
    root?.compact,
    root?.payload?.compact,
    record?.payload?.payload?.compact,
  ];
  for (const value of candidates) {
    if (isObj(value) && value.__compact === "match.v1") return value;
  }
  return null;
}

function parseScorePairFromLine(line: any): { scoreA: number; scoreB: number } | null {
  const text = str(line).trim();
  if (!text) return null;
  const colon = Array.from(text.matchAll(/:\s*(-?\d+)/g)).map((m) => Number(m[1]));
  if (colon.length >= 2 && Number.isFinite(colon[0]) && Number.isFinite(colon[1])) {
    return { scoreA: Math.max(0, colon[0]), scoreB: Math.max(0, colon[1]) };
  }
  const aroundDash = text.match(/(-?\d+)\s*(?:—|-|–|\/)\s*(-?\d+)/);
  if (aroundDash) {
    const a = Number(aroundDash[1]);
    const b = Number(aroundDash[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return { scoreA: Math.max(0, a), scoreB: Math.max(0, b) };
  }
  const nums = (text.match(/-?\d+/g) || []).map(Number).filter(Number.isFinite);
  if (nums.length >= 2) return { scoreA: Math.max(0, nums[0]), scoreB: Math.max(0, nums[1]) };
  return null;
}

function compactScorePair(record: any): { scoreA: number; scoreB: number } | null {
  const compact = compactRootOf(record);
  const state = firstObj(compact?.d?.s, compact?.d?.summary, compact?.summary);
  if (!state) return null;
  const a = state.scoreA ?? state.scorea ?? state.stats?.teamA?.score ?? state.stats?.teamA?.sc ?? state.stats?.teama?.score ?? state.stats?.teama?.sc;
  const b = state.scoreB ?? state.scoreb ?? state.stats?.teamB?.score ?? state.stats?.teamB?.sc ?? state.stats?.teamb?.score ?? state.stats?.teamb?.sc;
  const scoreA = Number(a);
  const scoreB = Number(b);
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
    return { scoreA: Math.max(0, scoreA), scoreB: Math.max(0, scoreB) };
  }
  return parseScorePairFromLine(state.scoreLine ?? state.scoreline);
}

function scoreLinePair(record: any): { scoreA: number; scoreB: number } | null {
  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  return (
    parseScorePairFromLine(record?.summary?.scoreLine ?? record?.summary?.scoreline) ||
    parseScorePairFromLine(summary?.scoreLine ?? summary?.scoreline) ||
    parseScorePairFromLine(root?.scoreLine ?? root?.scoreline) ||
    parseScorePairFromLine(record?.scoreLine ?? record?.scoreline)
  );
}

function preferredImportedScorePair(record: any): { scoreA: number; scoreB: number } | null {
  // Pour les imports corrigés, le compact et la scoreLine sont les sources les
  // plus fiables : certains anciens exports gardent encore payload.scoreA=7
  // alors que le score validé est déjà 5-1 dans compact/scoreLine.
  return compactScorePair(record) || scoreLinePair(record);
}

function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function getPayloadRoot(record: any) {
  if (isObj(record?.payload)) return record.payload;
  return record;
}

function getSummary(root: any) {
  return isObj(root?.summary) ? root.summary : {};
}

function firstEvents(record: any): any[] {
  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  const candidates = [
    root?.events,
    summary?.events,
    record?.events,
    record?.summary?.events,
    root?.payload?.events,
    root?.payload?.summary?.events,
  ];
  const hit = candidates.find((v) => Array.isArray(v) && v.length);
  return hit || [];
}

function setEvents(record: any, nextEvents: any[]) {
  const root = getPayloadRoot(record);
  if (isObj(root)) {
    if (Array.isArray(root.events)) root.events = nextEvents;
    if (isObj(root.summary) && Array.isArray(root.summary.events)) root.summary.events = nextEvents;
  }
  if (Array.isArray(record?.events)) record.events = nextEvents;
  if (isObj(record?.summary) && Array.isArray(record.summary.events)) record.summary.events = nextEvents;
}

function isPlayableBallEvent(event: any) {
  if (!event || typeof event !== "object") return false;
  if (event.t === "goal" || event.t === "demi") return true;
  if (event.t === "special") {
    const kind = String(event.kind || "");
    return kind === "gamelle" || kind === "peche_off" || kind === "peche_def" || kind === "pissette" || kind === "csc" || kind === "parachute";
  }
  return false;
}

function getScore(record: any, side: "A" | "B") {
  const key = side === "A" ? "scoreA" : "scoreB";
  const low = side === "A" ? "scorea" : "scoreb";
  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  return num(summary?.[key] ?? summary?.[low] ?? root?.[key] ?? root?.[low] ?? record?.[key] ?? record?.[low], 0);
}

function setScorePair(record: any, scoreA: number, scoreB: number) {
  const root = getPayloadRoot(record);
  const topSummary = isObj(record?.summary) ? record.summary : null;
  const summary = isObj(root?.summary) ? root.summary : null;

  const teamA = str(summary?.teamA ?? summary?.teama ?? root?.teamA ?? root?.teama ?? topSummary?.teamA ?? topSummary?.teama ?? record?.teamA ?? "Équipe A");
  const teamB = str(summary?.teamB ?? summary?.teamb ?? root?.teamB ?? root?.teamb ?? topSummary?.teamB ?? topSummary?.teamb ?? record?.teamB ?? "Équipe B");
  const scoreLine = `${teamA} : ${scoreA} • ${teamB} : ${scoreB}`;

  const apply = (obj: any) => {
    if (!isObj(obj)) return;
    obj.scoreA = scoreA;
    obj.scoreB = scoreB;
    obj.scorea = scoreA;
    obj.scoreb = scoreB;
    obj.scoreLine = scoreLine;
    obj.scoreline = scoreLine;
  };
  apply(record);
  apply(root);
  apply(summary);
  apply(topSummary);
  apply(root?.payload);
  apply(root?.payload?.summary);
  apply(record?.payload?.summary);

  const winnerTeam = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
  const winnerName = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : "Match nul";
  for (const obj of [record, root, summary, topSummary, root?.payload, root?.payload?.summary, record?.payload?.summary]) {
    if (!isObj(obj)) continue;
    obj.winnerTeam = winnerTeam;
    obj.winnerteam = winnerTeam;
    obj.winnerName = winnerName;
    obj.winnername = winnerName;
    obj.teamWinnerName = winnerName;
    obj.teamwinnername = winnerName;
  }

  const updateStatsObj = (stats: any) => {
    if (!isObj(stats)) return;
    const a = isObj(stats.teamA) ? stats.teamA : isObj(stats.teama) ? stats.teama : null;
    const b = isObj(stats.teamB) ? stats.teamB : isObj(stats.teamb) ? stats.teamb : null;
    if (a && b) {
      a.score = scoreA;
      a.sc = scoreA;
      b.score = scoreB;
      b.sc = scoreB;
      a.goalsConceded = scoreB;
      a.goalsconceded = scoreB;
      b.goalsConceded = scoreA;
      b.goalsconceded = scoreA;
      a.goalDiff = scoreA - scoreB;
      a.goaldiff = scoreA - scoreB;
      b.goalDiff = scoreB - scoreA;
      b.goaldiff = scoreB - scoreA;
      const legs = Math.max(1, num(stats.totalLegs ?? stats.totallegs, 1));
      a.avgGoalsPerLeg = Math.round((scoreA / legs) * 10) / 10;
      a.avggoalsperleg = a.avgGoalsPerLeg;
      b.avgGoalsPerLeg = Math.round((scoreB / legs) * 10) / 10;
      b.avggoalsperleg = b.avgGoalsPerLeg;
      stats.totalGoals = scoreA + scoreB;
      stats.totalgoals = scoreA + scoreB;
    }
  };
  for (const stats of [root?.stats, summary?.stats, record?.stats, topSummary?.stats, root?.payload?.stats, root?.payload?.summary?.stats]) updateStatsObj(stats);

  const compactCandidates = [record?.compact, record?.payload?.compact, root?.compact, root?.payload?.compact, record?.payload?.payload?.compact];
  for (const compact of compactCandidates) {
    if (!isObj(compact) || compact.__compact !== "match.v1") continue;
    const state = compact?.d?.s;
    if (isObj(state)) {
      state.scoreA = scoreA;
      state.scoreB = scoreB;
      state.scorea = scoreA;
      state.scoreb = scoreB;
      state.scoreLine = scoreLine;
      state.scoreline = scoreLine;
      updateStatsObj(state.stats);
    }
  }
}

function patchPlayerPenalty(record: any, scorerId: any, team: "A" | "B", penalty: number) {
  const id = String(scorerId || "").trim();
  if (!id || penalty <= 0) return;
  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  const sources = [root?.playerStats, summary?.playerStats, record?.playerStats, record?.summary?.playerStats].filter(isObj);
  for (const stats of sources) {
    const row = stats[id] || Object.values(stats).find((value: any) => {
      return isObj(value) && [value.id, value.playerId, value.profileId].some((x) => String(x || "") === id);
    });
    if (!isObj(row)) continue;
    row.points = num(row.points, num(row.goals, 0)) - penalty;
    row.goalDiff = num(row.goalDiff, 0) - penalty;
    row.lastBallDemiPenalty = num(row.lastBallDemiPenalty, 0) + penalty;
  }
}

function hasAlreadyAppliedDemiPenalty(events: any[]) {
  return events.some((event) => event?.t === "demi" && num(event?.lastBallPenalty, 0) > 0);
}

function isLimitedBallsLike(record: any, events: any[]) {
  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  const scoreMode = String(root?.scoreMode ?? summary?.scoreMode ?? root?.scoremode ?? summary?.scoremode ?? "").toLowerCase();
  if (scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11") return true;
  const maxBalls = num(root?.maxBalls ?? summary?.maxBalls ?? root?.maxballs ?? summary?.maxballs, 0);
  if (maxBalls > 0 && events.filter(isPlayableBallEvent).length >= maxBalls) return true;

  // Legacy exports created before scoreMode/maxBalls was persisted.  A final DEMI at
  // the exact finish timestamp, with playable actions equal to target (5/10/11), is
  // the signature of a limited-balls match.
  const target = num(root?.target ?? summary?.target, 0);
  const playableCount = events.filter(isPlayableBallEvent).length;
  const finish = [...events].reverse().find((event) => event?.t === "finish");
  const lastPlayable = [...events].reverse().find(isPlayableBallEvent);
  const sameFinishTick = !!finish && !!lastPlayable && num(finish.at, 0) === num(lastPlayable.at, 0);
  return (target === 5 || target === 10 || target === 11) && playableCount >= target && sameFinishTick;
}

export function applyBabyFootImportRules<T = any>(input: T): T {
  const record: any = cloneJson(input as any);
  const events = firstEvents(record);
  if (!Array.isArray(events) || events.length === 0) return record as T;
  if (hasAlreadyAppliedDemiPenalty(events)) {
    const preferred = preferredImportedScorePair(record);
    if (preferred) setScorePair(record, preferred.scoreA, preferred.scoreB);
    return record as T;
  }
  if (!isLimitedBallsLike(record, events)) {
    const preferred = preferredImportedScorePair(record);
    if (preferred) setScorePair(record, preferred.scoreA, preferred.scoreB);
    return record as T;
  }

  const playable = events.filter(isPlayableBallEvent);
  const lastPlayable = playable[playable.length - 1];
  if (!lastPlayable || lastPlayable.t !== "demi") return record as T;

  const team = String(lastPlayable.team || "").toUpperCase() === "B" ? "B" : "A";
  const pendingBefore = Math.max(0, num(lastPlayable.pendingBefore, 0));
  const penalty = Math.max(2, pendingBefore + 2);
  const scoreA = getScore(record, "A");
  const scoreB = getScore(record, "B");
  const nextScoreA = Math.max(0, scoreA - (team === "A" ? penalty : 0));
  const nextScoreB = Math.max(0, scoreB - (team === "B" ? penalty : 0));

  const nextEvents = events.map((event) => event === lastPlayable ? {
    ...event,
    counted: true,
    pendingBefore,
    lastBallPenalty: penalty,
    scoreDeltaA: team === "A" ? -penalty : 0,
    scoreDeltaB: team === "B" ? -penalty : 0,
  } : event);

  setEvents(record, nextEvents);
  setScorePair(record, nextScoreA, nextScoreB);
  patchPlayerPenalty(record, lastPlayable.scorerId ?? lastPlayable.scorerid, team, penalty);

  const root = getPayloadRoot(record);
  const summary = getSummary(root);
  for (const obj of [record, root, summary]) {
    if (!isObj(obj)) continue;
    obj.scoreMode = obj.scoreMode || (num(obj.target, 0) === 5 ? "balls5" : num(obj.target, 0) === 11 ? "balls11" : "balls10");
    obj.maxBalls = obj.maxBalls || num(obj.target, 10);
    obj.babyFootImportRulesAppliedV1 = true;
  }

  return record as T;
}

export function isBabyFootShareLike(value: any) {
  const root = getPayloadRoot(value);
  const sport = String(value?.kind ?? value?.sport ?? root?.kind ?? root?.sport ?? root?.game?.mode ?? root?.summary?.mode ?? "").toLowerCase();
  const mode = String(root?.game?.mode ?? root?.mode ?? root?.summary?.mode ?? value?.summary?.title ?? "").toLowerCase();
  return sport.includes("babyfoot") || sport.includes("baby-foot") || ["1v1", "2v2", "2v1"].includes(mode);
}
