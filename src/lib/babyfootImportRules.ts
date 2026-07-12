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

  const apply = (obj: any) => {
    if (!isObj(obj)) return;
    obj.scoreA = scoreA;
    obj.scoreB = scoreB;
    obj.scorea = scoreA;
    obj.scoreb = scoreB;
  };
  apply(record);
  apply(root);
  apply(summary);

  const teamA = str(summary?.teamA ?? summary?.teama ?? root?.teamA ?? root?.teama ?? record?.teamA ?? "Équipe A");
  const teamB = str(summary?.teamB ?? summary?.teamb ?? root?.teamB ?? root?.teamb ?? record?.teamB ?? "Équipe B");
  const scoreLine = `${teamA} : ${scoreA} • ${teamB} : ${scoreB}`;

  if (topSummary) {
    topSummary.scoreLine = scoreLine;
    topSummary.scoreline = scoreLine;
  }
  if (summary) {
    summary.scoreLine = scoreLine;
    summary.scoreline = scoreLine;
  }
  if (isObj(root)) {
    root.scoreLine = scoreLine;
    root.scoreline = scoreLine;
  }
  if (isObj(record)) {
    record.scoreLine = scoreLine;
    record.scoreline = scoreLine;
  }

  const winnerTeam = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
  const winnerName = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : "Match nul";
  for (const obj of [record, root, summary, topSummary]) {
    if (!isObj(obj)) continue;
    obj.winnerTeam = winnerTeam;
    obj.winnerteam = winnerTeam;
    obj.winnerName = winnerName;
    obj.winnername = winnerName;
    obj.teamWinnerName = winnerName;
    obj.teamwinnername = winnerName;
  }

  const maybeStats = [root?.stats, summary?.stats, record?.stats, topSummary?.stats].filter(isObj);
  for (const stats of maybeStats) {
    const a = isObj(stats.teamA) ? stats.teamA : isObj(stats.teama) ? stats.teama : null;
    const b = isObj(stats.teamB) ? stats.teamB : isObj(stats.teamb) ? stats.teamb : null;
    if (a && b) {
      a.score = scoreA;
      b.score = scoreB;
      a.goalsConceded = scoreB;
      b.goalsConceded = scoreA;
      a.goalDiff = scoreA - scoreB;
      b.goalDiff = scoreB - scoreA;
      const legs = Math.max(1, num(stats.totalLegs, 1));
      a.avgGoalsPerLeg = Math.round((scoreA / legs) * 10) / 10;
      b.avgGoalsPerLeg = Math.round((scoreB / legs) * 10) / 10;
      stats.totalGoals = scoreA + scoreB;
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
  if (hasAlreadyAppliedDemiPenalty(events)) return record as T;
  if (!isLimitedBallsLike(record, events)) return record as T;

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
