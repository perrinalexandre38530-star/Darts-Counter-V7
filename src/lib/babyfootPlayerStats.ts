import { computeBabyFootRichStats } from "./babyfootRichStats";

export type BabyFootTeamIdLike = "A" | "B";

export type BabyFootPlayerStatRow = {
  id: string;
  playerId: string;
  profileId: string;
  name: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  team: BabyFootTeamIdLike;
  collective?: boolean;
  matches: number;
  wins: number;
  losses: number;
  points: number;
  goals: number;
  goalsConceded: number;
  goalDiff: number;
  goalAv: number;
  goalDef: number;
  goalGb: number;
  goalMil: number;
  demi: number;
  demiBonus: number;
  gamelle: number;
  peche: number;
  pecheOff: number;
  pecheDef: number;
  pissette: number;
  pissetteValid: number;
  pissetteRefused: number;
  csc: number;
  ownGoals: number;
  parachute: number;
  penalties: number;
  penaltyGoals: number;
  penaltyMisses: number;
};

const ACTION_KEYS: Array<keyof BabyFootPlayerStatRow> = [
  "points", "goals", "goalAv", "goalDef", "goalGb", "goalMil", "demi", "demiBonus",
  "gamelle", "peche", "pecheOff", "pecheDef", "pissette", "pissetteValid",
  "pissetteRefused", "csc", "ownGoals", "parachute", "penalties", "penaltyGoals", "penaltyMisses",
];

function obj(v: any): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function idOf(p: any): string {
  return String(p?.id || p?.playerId || p?.profileId || p?._id || "").trim();
}

function nameOf(p: any, fallback = "Joueur"): string {
  return String(p?.name || p?.displayName || p?.nickname || p?.surname || fallback).trim() || fallback;
}

function avatarOf(p: any): string | null {
  return p?.avatarUrl || p?.avatar_url || p?.avatar || p?.avatarDataUrl || p?.avatar_data_url || null;
}


function firstObject(...values: any[]): Record<string, any> {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

function compactRootOf(...values: any[]): Record<string, any> {
  for (const value of values) {
    const direct = obj(value);
    if (direct.__compact === "match.v1") return direct;
    const nested = obj(direct.compact);
    if (nested.__compact === "match.v1") return nested;
  }
  return {};
}

function compactValue(source: any, camel: string, compact: string, fallback?: any): any {
  if (source && source[camel] !== undefined) return source[camel];
  if (source && source[compact] !== undefined) return source[compact];
  return fallback;
}

function normalizeCompactBabyFootEvent(raw: any): any {
  const ev = obj(raw);
  if (!Object.keys(ev).length) return raw;
  return {
    ...ev,
    t: compactValue(ev, "t", "t", compactValue(ev, "type", "type", "event")),
    at: num(compactValue(ev, "at", "at", compactValue(ev, "timestamp", "timestamp", 0)), 0),
    team: compactValue(ev, "team", "team", null),
    scorerId: compactValue(ev, "scorerId", "scorerid", compactValue(ev, "playerId", "playerid", null)),
    ownGoalById: compactValue(ev, "ownGoalById", "owngoalbyid", null),
    ownGoalTeam: compactValue(ev, "ownGoalTeam", "owngoalteam", null),
    phase: compactValue(ev, "phase", "phase", null),
    kind: compactValue(ev, "kind", "kind", null),
    points: num(compactValue(ev, "points", "pts", 1), 1),
    demiBonusApplied: num(compactValue(ev, "demiBonusApplied", "demibonusapplied", 0), 0),
    sourceLine: compactValue(ev, "sourceLine", "sourceline", null),
    counted: compactValue(ev, "counted", "counted", undefined),
    scoreDeltaA: num(compactValue(ev, "scoreDeltaA", "scoredeltaa", 0), 0),
    scoreDeltaB: num(compactValue(ev, "scoreDeltaB", "scoredeltab", 0), 0),
    scored: compactValue(ev, "scored", "scored", undefined),
    winner: compactValue(ev, "winner", "winner", null),
    reason: compactValue(ev, "reason", "reason", null),
  };
}

function normalizeCompactTeamStats(raw: any): any {
  const side = obj(raw);
  if (!Object.keys(side).length) return {};
  return {
    ...side,
    name: compactValue(side, "name", "name", ""),
    score: num(compactValue(side, "score", "sc", 0), 0),
    sets: num(compactValue(side, "sets", "sets", 0), 0),
    legs: num(compactValue(side, "legs", "legs", 0), 0),
    goals: num(compactValue(side, "goals", "goals", 0), 0),
    goalsConceded: num(compactValue(side, "goalsConceded", "goalsconceded", 0), 0),
    avgGoalsPerLeg: num(compactValue(side, "avgGoalsPerLeg", "avggoalsperleg", 0), 0),
    goalDiff: num(compactValue(side, "goalDiff", "goaldiff", 0), 0),
    gamelle: num(compactValue(side, "gamelle", "gamelle", 0), 0),
    peche: num(compactValue(side, "peche", "peche", 0), 0),
    pecheOff: num(compactValue(side, "pecheOff", "pecheoff", 0), 0),
    pecheDef: num(compactValue(side, "pecheDef", "pechedef", 0), 0),
    demi: num(compactValue(side, "demi", "demi", 0), 0),
    pissette: num(compactValue(side, "pissette", "pissette", 0), 0),
    pissetteValid: num(compactValue(side, "pissetteValid", "pissettevalid", 0), 0),
    pissetteRefused: num(compactValue(side, "pissetteRefused", "pissetterefused", 0), 0),
    csc: num(compactValue(side, "csc", "csc", 0), 0),
    demiBonus: num(compactValue(side, "demiBonus", "demibonus", 0), 0),
    goalAv: num(compactValue(side, "goalAv", "goalav", 0), 0),
    goalDef: num(compactValue(side, "goalDef", "goaldef", 0), 0),
    goalGb: num(compactValue(side, "goalGb", "goalgb", 0), 0),
    parachute: num(compactValue(side, "parachute", "parachute", 0), 0),
    penalties: num(compactValue(side, "penalties", "penalties", 0), 0),
    handicap: num(compactValue(side, "handicap", "handicap", 0), 0),
    goalsConcededAv: num(compactValue(side, "goalsConcededAv", "goalsconcededav", 0), 0),
    goalsConcededDef: num(compactValue(side, "goalsConcededDef", "goalsconcededdef", 0), 0),
    goalsConcededGb: num(compactValue(side, "goalsConcededGb", "goalsconcededgb", 0), 0),
    equalizations: num(compactValue(side, "equalizations", "equalizations", 0), 0),
    leadChanges: num(compactValue(side, "leadChanges", "leadchanges", 0), 0),
    longestRun: num(compactValue(side, "longestRun", "longestrun", 0), 0),
  };
}

function normalizeCompactSpecialStats(raw: any): any {
  const s = obj(raw);
  if (!Object.keys(s).length) return {};
  const keys = [
    ["demiA", "demia"], ["demiB", "demib"], ["gamelleA", "gamellea"], ["gamelleB", "gamelleb"],
    ["pissetteA", "pissettea"], ["pissetteB", "pissetteb"], ["pissetteValidA", "pissettevalida"], ["pissetteValidB", "pissettevalidb"],
    ["pissetteRefusedA", "pissetterefuseda"], ["pissetteRefusedB", "pissetterefusedb"], ["pecheOffA", "pecheoffa"], ["pecheOffB", "pecheoffb"],
    ["pecheDefA", "pechedefa"], ["pecheDefB", "pechedefb"], ["demiBonusAppliedA", "demibonusapplieda"], ["demiBonusAppliedB", "demibonusappliedb"],
    ["goalAvA", "goalava"], ["goalAvB", "goalavb"], ["goalDefA", "goaldefa"], ["goalDefB", "goaldefb"],
    ["goalGbA", "goalgba"], ["goalGbB", "goalgbb"], ["cscA", "csca"], ["cscB", "cscb"], ["parachuteA", "parachutea"], ["parachuteB", "parachuteb"],
  ];
  const out: any = { ...s };
  for (const [camel, compact] of keys) out[camel] = num(compactValue(s, camel, compact, 0), 0);
  return out;
}

function decodeCompactBabyFootSummary(compact: any): any {
  const root = obj(compact);
  const state = obj(root?.d?.s);
  if (!Object.keys(state).length) return {};
  const rawStats = obj(compactValue(state, "stats", "stats", {}));
  const teamAStats = normalizeCompactTeamStats(firstObject(rawStats.teamA, rawStats.teama));
  const teamBStats = normalizeCompactTeamStats(firstObject(rawStats.teamB, rawStats.teamb));
  return {
    ...state,
    teamA: compactValue(state, "teamA", "teama", "Équipe A"),
    teamB: compactValue(state, "teamB", "teamb", "Équipe B"),
    teamARefId: compactValue(state, "teamARefId", "teamarefid", null),
    teamBRefId: compactValue(state, "teamBRefId", "teambrefid", null),
    teamAProfileIds: arr(compactValue(state, "teamAProfileIds", "teamaprofileids", [])).map(String),
    teamBProfileIds: arr(compactValue(state, "teamBProfileIds", "teambprofileids", [])).map(String),
    scoreA: num(compactValue(state, "scoreA", "scorea", 0), 0),
    scoreB: num(compactValue(state, "scoreB", "scoreb", 0), 0),
    setsEnabled: Boolean(compactValue(state, "setsEnabled", "setsenabled", false)),
    setsA: num(compactValue(state, "setsA", "setsa", 0), 0),
    setsB: num(compactValue(state, "setsB", "setsb", 0), 0),
    penalties: compactValue(state, "penalties", "penalties", null),
    durationMs: num(compactValue(state, "durationMs", "dur", 0), 0),
    mode: compactValue(state, "mode", "mode", root?.o?.mode || "babyfoot"),
    target: num(compactValue(state, "target", "target", 0), 0),
    setTarget: num(compactValue(state, "setTarget", "settarget", 0), 0),
    setsBestOf: num(compactValue(state, "setsBestOf", "setsbestof", 0), 0),
    handicapA: num(compactValue(state, "handicapA", "handicapa", 0), 0),
    handicapB: num(compactValue(state, "handicapB", "handicapb", 0), 0),
    rulesPreset: compactValue(state, "rulesPreset", "rulespreset", null),
    demiRule: compactValue(state, "demiRule", "demirule", null),
    pissetteRule: compactValue(state, "pissetteRule", "pissetterule", null),
    gamelleRule: compactValue(state, "gamelleRule", "gamellerule", null),
    pecheOffRule: compactValue(state, "pecheOffRule", "pecheoffrule", null),
    pecheDefRule: compactValue(state, "pecheDefRule", "pechedefrule", null),
    specialStats: normalizeCompactSpecialStats(firstObject(state.specialStats, state.specialstats)),
    stats: {
      ...rawStats,
      ...(Object.keys(teamAStats).length ? { teamA: teamAStats } : {}),
      ...(Object.keys(teamBStats).length ? { teamB: teamBStats } : {}),
      setsEnabled: Boolean(compactValue(rawStats, "setsEnabled", "setsenabled", false)),
      totalLegs: num(compactValue(rawStats, "totalLegs", "totallegs", 0), 0),
      totalGoals: num(compactValue(rawStats, "totalGoals", "totalgoals", 0), 0),
      totalGamelle: num(compactValue(rawStats, "totalGamelle", "totalgamelle", 0), 0),
      totalPeche: num(compactValue(rawStats, "totalPeche", "totalpeche", 0), 0),
      totalDemi: num(compactValue(rawStats, "totalDemi", "totaldemi", 0), 0),
      totalPissette: num(compactValue(rawStats, "totalPissette", "totalpissette", 0), 0),
    },
  };
}

export function extractCompactBabyFootEvents(record: any): any[] {
  const outer = obj(record);
  const p0 = obj(outer.payload);
  const p1 = obj(p0.payload);
  const compact = compactRootOf(outer, p0, p1);
  const raw = arr(compact?.d?.e);
  return raw.map(normalizeCompactBabyFootEvent).filter((event) => event && typeof event === "object");
}

function firstArray(...values: any[]): any[] {
  for (const value of values) if (Array.isArray(value) && value.length) return value;
  return [];
}

export function resolveBabyFootRecord(record: any): any {
  const outer = obj(record);
  const p0 = obj(outer.payload);
  const p1 = obj(p0.payload);
  const payload = Object.keys(p1).length ? p1 : p0;
  const compact = compactRootOf(outer, p0, payload);
  const compactSummary = decodeCompactBabyFootSummary(compact);
  const summary = {
    ...compactSummary,
    ...obj(outer.summary),
    ...obj(p0.summary),
    ...obj(payload.summary),
  };
  const players = firstArray(payload.players, p0.players, outer.players, summary.players);
  const compactEvents = extractCompactBabyFootEvents({ ...outer, payload: { ...p0, ...payload, compact } });
  const events = firstArray(payload.events, p0.events, summary.events, outer.events, compactEvents)
    .map(normalizeCompactBabyFootEvent)
    .filter((event) => event && typeof event === "object");

  const teamAIds = arr(payload.teamAProfileIds ?? p0.teamAProfileIds ?? outer.teamAProfileIds ?? summary.teamAProfileIds).map(String);
  const teamBIds = arr(payload.teamBProfileIds ?? p0.teamBProfileIds ?? outer.teamBProfileIds ?? summary.teamBProfileIds).map(String);
  const winnerRaw = String(payload.winnerTeam ?? p0.winnerTeam ?? outer.winnerTeam ?? summary.winnerTeam ?? summary.winner ?? "").toUpperCase();
  const winnerTeam = winnerRaw === "A" || winnerRaw === "B" ? winnerRaw as BabyFootTeamIdLike : null;

  const rawPlayerStats = mergePlayerStatsSources(
    outer.playerStats,
    outer?.summary?.playerStats,
    p0.playerStats,
    p0?.summary?.playerStats,
    payload.playerStats,
    payload?.summary?.playerStats,
  );
  const eventPlayerStats = buildBabyFootPlayerStatsMap({
    players,
    events,
    teamAIds,
    teamBIds,
    teamAName: payload.teamA ?? p0.teamA ?? outer.teamA ?? summary.teamA,
    teamBName: payload.teamB ?? p0.teamB ?? outer.teamB ?? summary.teamB,
    winnerTeam,
    pissetteRule: payload.pissetteRule ?? p0.pissetteRule ?? outer.pissetteRule ?? summary.pissetteRule,
  });
  const playerStats = mergePlayerStatsSources(rawPlayerStats, eventPlayerStats);

  return {
    ...outer,
    ...p0,
    ...payload,
    compact: Object.keys(compact).length ? compact : (payload.compact || p0.compact || outer.compact),
    summary: { ...summary, events, playerStats },
    players,
    events,
    playerStats,
    teamAProfileIds: teamAIds,
    teamBProfileIds: teamBIds,
    teamA: payload.teamA ?? p0.teamA ?? outer.teamA ?? summary.teamA,
    teamB: payload.teamB ?? p0.teamB ?? outer.teamB ?? summary.teamB,
    scoreA: payload.scoreA ?? p0.scoreA ?? outer.scoreA ?? summary.scoreA,
    scoreB: payload.scoreB ?? p0.scoreB ?? outer.scoreB ?? summary.scoreB,
    mode: payload.mode ?? payload?.game?.mode ?? p0.mode ?? p0?.game?.mode ?? outer.mode ?? outer?.game?.mode ?? summary.mode ?? summary?.game?.mode ?? compact?.o?.mode ?? compact?.m,
    durationMs: payload.durationMs ?? p0.durationMs ?? outer.durationMs ?? summary.durationMs,
    specialStats: payload.specialStats ?? p0.specialStats ?? outer.specialStats ?? summary.specialStats,
    stats: payload.stats ?? p0.stats ?? outer.stats ?? summary.stats,
  };
}

function statsEntries(source: any): Array<[string, any]> {
  if (Array.isArray(source)) {
    return source
      .map((row: any, index: number) => [idOf(row) || `row-${index}`, row] as [string, any])
      .filter(([id]) => !!id);
  }
  return Object.entries(obj(source));
}

function activityScore(row: any): number {
  return ACTION_KEYS.reduce((sum, key) => sum + Math.abs(num(row?.[key], 0)), 0);
}

export function mergePlayerStatsSources(...sources: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const source of sources) {
    for (const [rawId, rawRow] of statsEntries(source)) {
      const row = obj(rawRow);
      const id = String(idOf(row) || rawId || "").trim();
      if (!id) continue;
      const current = out[id];
      if (!current) {
        out[id] = { ...row, id, playerId: row.playerId || id, profileId: row.profileId || id };
        continue;
      }
      const currentScore = activityScore(current);
      const nextScore = activityScore(row);
      out[id] = nextScore >= currentScore
        ? { ...current, ...row, id, playerId: row.playerId || current.playerId || id, profileId: row.profileId || current.profileId || id }
        : { ...row, ...current, id, playerId: current.playerId || row.playerId || id, profileId: current.profileId || row.profileId || id };
    }
  }
  return out;
}

function makeBaseRow(input: {
  id: string;
  name: string;
  avatar?: string | null;
  team: BabyFootTeamIdLike;
  winnerTeam?: BabyFootTeamIdLike | null;
  collective?: boolean;
}): BabyFootPlayerStatRow {
  const won = !!input.winnerTeam && input.winnerTeam === input.team;
  const lost = !!input.winnerTeam && input.winnerTeam !== input.team;
  return {
    id: input.id,
    playerId: input.id,
    profileId: input.id,
    name: input.name,
    avatar: input.avatar || null,
    avatarUrl: input.avatar || null,
    team: input.team,
    collective: !!input.collective,
    matches: 1,
    wins: won ? 1 : 0,
    losses: lost ? 1 : 0,
    points: 0,
    goals: 0,
    goalsConceded: 0,
    goalDiff: 0,
    goalAv: 0,
    goalDef: 0,
    goalGb: 0,
    goalMil: 0,
    demi: 0,
    demiBonus: 0,
    gamelle: 0,
    peche: 0,
    pecheOff: 0,
    pecheDef: 0,
    pissette: 0,
    pissetteValid: 0,
    pissetteRefused: 0,
    csc: 0,
    ownGoals: 0,
    parachute: 0,
    penalties: 0,
    penaltyGoals: 0,
    penaltyMisses: 0,
  };
}

function normalizeRawRow(raw: any, base: BabyFootPlayerStatRow): BabyFootPlayerStatRow {
  const row = obj(raw);
  const points = num(row.points, num(row.goals, 0));
  const goals = num(row.goalsCount, num(row.actualGoals, num(row.goals, 0)));
  return {
    ...base,
    ...row,
    id: base.id,
    playerId: String(row.playerId || base.id),
    profileId: String(row.profileId || base.id),
    name: String(row.name || base.name),
    avatar: base.avatar || row.avatar || row.avatarUrl || null,
    avatarUrl: base.avatarUrl || row.avatarUrl || row.avatar || null,
    team: (String(row.team || base.team).toUpperCase() === "B" ? "B" : "A") as BabyFootTeamIdLike,
    collective: Boolean(row.collective ?? base.collective),
    matches: Math.max(1, num(row.matches, base.matches)),
    wins: num(row.wins, base.wins),
    losses: num(row.losses, base.losses),
    points,
    goals,
    goalsConceded: num(row.goalsConceded, 0),
    goalDiff: num(row.goalDiff, points - num(row.goalsConceded, 0)),
    goalAv: num(row.goalAv ?? row.av, 0),
    goalDef: num(row.goalDef ?? row.def, 0),
    goalGb: num(row.goalGb ?? row.gb, 0),
    goalMil: num(row.goalMil ?? row.mil, 0),
    demi: num(row.demi, 0),
    demiBonus: num(row.demiBonus ?? row.bonusDemi, 0),
    gamelle: num(row.gamelle, 0),
    peche: num(row.peche, num(row.pecheOff, 0) + num(row.pecheDef, 0)),
    pecheOff: num(row.pecheOff, 0),
    pecheDef: num(row.pecheDef, 0),
    pissette: num(row.pissette, num(row.pissetteValid, 0) + num(row.pissetteRefused, 0)),
    pissetteValid: num(row.pissetteValid, 0),
    pissetteRefused: num(row.pissetteRefused, 0),
    csc: num(row.csc, num(row.ownGoals, 0)),
    ownGoals: num(row.ownGoals, num(row.csc, 0)),
    parachute: num(row.parachute, 0),
    penalties: num(row.penalties, num(row.penaltyGoals, 0) + num(row.penaltyMisses, 0)),
    penaltyGoals: num(row.penaltyGoals, 0),
    penaltyMisses: num(row.penaltyMisses, 0),
  };
}

export function buildBabyFootPlayerStatsMap(input: {
  players?: any[];
  events?: any[];
  teamAIds?: string[];
  teamBIds?: string[];
  teamAName?: string;
  teamBName?: string;
  winnerTeam?: BabyFootTeamIdLike | null;
  pissetteRule?: string | null;
}): Record<string, BabyFootPlayerStatRow> {
  const players = arr(input.players);
  const teamAIds = arr(input.teamAIds).map(String);
  const teamBIds = arr(input.teamBIds).map(String);
  const byId: Record<string, BabyFootPlayerStatRow> = {};

  const teamFor = (id: string, fallback?: any): BabyFootTeamIdLike => {
    if (teamBIds.includes(id)) return "B";
    if (teamAIds.includes(id)) return "A";
    return String(fallback?.team || "A").toUpperCase() === "B" ? "B" : "A";
  };

  const ensure = (rawId: any, fallback?: any, forceTeam?: BabyFootTeamIdLike): BabyFootPlayerStatRow | null => {
    let id = String(rawId || "").trim();
    const team = forceTeam || teamFor(id, fallback);
    if (!id) {
      const ids = team === "A" ? teamAIds : teamBIds;
      if (ids.length === 1) id = ids[0];
      else id = `__collective_${team}`;
    }
    if (!byId[id]) {
      const p = players.find((row) => idOf(row) === id) || fallback || {};
      const collective = id.startsWith("__collective_");
      const teamName = team === "A" ? input.teamAName || "Équipe A" : input.teamBName || "Équipe B";
      byId[id] = makeBaseRow({
        id,
        name: collective ? `${teamName} · non attribué` : nameOf(p, id),
        avatar: collective ? null : avatarOf(p),
        team,
        winnerTeam: input.winnerTeam || null,
        collective,
      });
    }
    return byId[id];
  };

  for (const p of players) {
    const id = idOf(p);
    if (id) ensure(id, p);
  }
  for (const id of teamAIds) ensure(id, players.find((p) => idOf(p) === id), "A");
  for (const id of teamBIds) ensure(id, players.find((p) => idOf(p) === id), "B");

  const bumpLine = (row: BabyFootPlayerStatRow, line: any) => {
    const src = String(line || "AV").toUpperCase();
    if (src === "DEF") row.goalDef += 1;
    else if (src === "GB") row.goalGb += 1;
    else if (src === "MIL") row.goalMil += 1;
    else row.goalAv += 1;
  };

  for (const event of arr(input.events)) {
    const ev = obj(event);
    const team = String(ev.team || "A").toUpperCase() === "B" ? "B" : "A";
    if (ev.t === "goal") {
      const points = Math.max(1, num(ev.points, 1));
      const scorer = ensure(ev.scorerId, { team }, team);
      if (scorer) {
        scorer.points += points;
        scorer.goals += 1;
        scorer.demiBonus += Math.max(0, num(ev.demiBonusApplied, 0));
        bumpLine(scorer, ev.sourceLine);
        if (ev.kind === "gamelle") scorer.gamelle += 1;
        if (ev.kind === "peche") { scorer.peche += 1; scorer.pecheOff += 1; }
        if (ev.kind === "pissette") { scorer.pissette += 1; scorer.pissetteValid += 1; }
        if (ev.kind === "parachute") scorer.parachute += 1;
      }
      if (ev.ownGoalById || ev.ownGoalTeam || ev.kind === "csc") {
        const guiltyTeam = String(ev.ownGoalTeam || (team === "A" ? "B" : "A")).toUpperCase() === "B" ? "B" : "A";
        const own = ensure(ev.ownGoalById, { team: guiltyTeam }, guiltyTeam);
        if (own) { own.csc += 1; own.ownGoals += 1; }
      }
    } else if (ev.t === "demi") {
      const scorer = ensure(ev.scorerId, { team }, team);
      if (scorer) scorer.demi += 1;
    } else if (ev.t === "special") {
      const scorer = ensure(ev.scorerId, { team }, team);
      if (!scorer) continue;
      if (ev.kind === "gamelle") scorer.gamelle += 1;
      if (ev.kind === "peche_off") { scorer.peche += 1; scorer.pecheOff += 1; }
      if (ev.kind === "peche_def") { scorer.peche += 1; scorer.pecheDef += 1; }
      if (ev.kind === "pissette") {
        scorer.pissette += 1;
        const rule = String(input.pissetteRule || "").toLowerCase();
        const scoresPoint = rule === "point" || num(ev.scoreDeltaA, 0) !== 0 || num(ev.scoreDeltaB, 0) !== 0;
        if (scoresPoint) scorer.pissetteValid += 1;
        else scorer.pissetteRefused += 1;
      }
      if (ev.kind === "csc") { scorer.csc += 1; scorer.ownGoals += 1; }
      if (ev.kind === "parachute") scorer.parachute += 1;
      scorer.demiBonus += Math.max(0, num(ev.demiBonusApplied, 0));
    } else if (ev.t === "pen_shot" || ev.t === "penalty") {
      const scorer = ensure(ev.scorerId, { team }, team);
      if (scorer) {
        scorer.penalties += 1;
        if (ev.scored) scorer.penaltyGoals += 1;
        else scorer.penaltyMisses += 1;
      }
    }
  }

  const teamPoints = (team: BabyFootTeamIdLike) => Object.values(byId)
    .filter((row) => row.team === team)
    .reduce((sum, row) => sum + num(row.points, 0), 0);
  const pointsA = teamPoints("A");
  const pointsB = teamPoints("B");
  for (const row of Object.values(byId)) {
    row.goalsConceded = row.team === "A" ? pointsB : pointsA;
    row.goalDiff = row.points - row.goalsConceded;
  }
  return byId;
}

export function extractBabyFootPlayerStatsRows(record: any): BabyFootPlayerStatRow[] {
  const data = resolveBabyFootRecord(record);
  const players = arr(data.players);
  const teamAIds = arr(data.teamAProfileIds ?? data.summary?.teamAProfileIds).map(String);
  const teamBIds = arr(data.teamBProfileIds ?? data.summary?.teamBProfileIds).map(String);
  const winnerRaw = String(data.winnerTeam ?? data.summary?.winnerTeam ?? data.winner ?? "").toUpperCase();
  const winnerTeam = winnerRaw === "A" || winnerRaw === "B" ? winnerRaw as BabyFootTeamIdLike : null;
  const rawMap = mergePlayerStatsSources(data.playerStats, data.summary?.playerStats);
  const eventMap = buildBabyFootPlayerStatsMap({
    players,
    events: data.events,
    teamAIds,
    teamBIds,
    teamAName: data.teamA ?? data.summary?.teamA,
    teamBName: data.teamB ?? data.summary?.teamB,
    winnerTeam,
    pissetteRule: data.pissetteRule ?? data.summary?.pissetteRule,
  });

  const ids = new Set<string>([...Object.keys(rawMap), ...Object.keys(eventMap)]);
  for (const p of players) {
    const id = idOf(p);
    if (id) ids.add(id);
  }
  for (const id of teamAIds) ids.add(id);
  for (const id of teamBIds) ids.add(id);

  const rows: BabyFootPlayerStatRow[] = [];
  for (const id of ids) {
    const eventRow = eventMap[id];
    const player = players.find((p) => idOf(p) === id) || {};
    const team: BabyFootTeamIdLike = eventRow?.team || (teamBIds.includes(id) ? "B" : "A");
    const base = eventRow || makeBaseRow({
      id,
      name: id.startsWith("__collective_")
        ? `${team === "A" ? data.teamA || "Équipe A" : data.teamB || "Équipe B"} · non attribué`
        : nameOf(player, id),
      avatar: avatarOf(player),
      team,
      winnerTeam,
      collective: id.startsWith("__collective_"),
    });
    const rawRow = rawMap[id] ? normalizeRawRow(rawMap[id], base) : null;
    const derivedActivity = activityScore(eventRow);
    const rawActivity = activityScore(rawRow);
    let chosen = rawActivity > derivedActivity ? rawRow! : eventRow || rawRow || base;

    // Preserve identity from the profile while keeping the richest counters.
    chosen = {
      ...chosen,
      id,
      playerId: id,
      profileId: id,
      name: chosen.collective ? chosen.name : nameOf(player, chosen.name),
      avatar: chosen.collective ? null : avatarOf(player) || chosen.avatar || chosen.avatarUrl || null,
      avatarUrl: chosen.collective ? null : avatarOf(player) || chosen.avatarUrl || chosen.avatar || null,
      team,
    };
    rows.push(chosen);
  }

  // Legacy fallback: old saves sometimes only contain team totals.
  // In 1v1 the sole player can safely inherit the team totals. In 2v1/2v2,
  // attribution cannot be reconstructed: expose one explicit collective row instead
  // of misleading individual cards filled with zeroes.
  const hasAttributedActivity = rows.some((row) => !row.collective && activityScore(row) > 0);
  if (!hasAttributedActivity && arr(data.events).length === 0) {
    const rich = computeBabyFootRichStats(data);
    const applyLegacySide = (team: BabyFootTeamIdLike, side: any, idsForTeam: string[]) => {
      const activity = num(side?.score, 0) + num(side?.goals, 0) + num(side?.demi, 0) + num(side?.gamelle, 0) + num(side?.peche, 0) + num(side?.pissette, 0) + num(side?.penalties, 0);
      if (activity <= 0) return;
      const onlyId = idsForTeam.length === 1 ? idsForTeam[0] : "";
      const targetId = onlyId || `__collective_${team}`;
      const existing = rows.find((row) => row.id === targetId);
      const teamName = team === "A" ? data.teamA || data.summary?.teamA || "Équipe A" : data.teamB || data.summary?.teamB || "Équipe B";
      const base = existing || makeBaseRow({
        id: targetId,
        name: onlyId ? nameOf(players.find((p) => idOf(p) === onlyId), onlyId) : `${teamName} · ancienne partie non attribuée`,
        avatar: onlyId ? avatarOf(players.find((p) => idOf(p) === onlyId)) : null,
        team,
        winnerTeam,
        collective: !onlyId,
      });
      const patched: BabyFootPlayerStatRow = {
        ...base,
        collective: !onlyId,
        name: onlyId ? base.name : `${teamName} · ancienne partie non attribuée`,
        points: num(side?.score, num(side?.goals, 0)),
        goals: num(side?.goals, 0),
        goalsConceded: num(side?.goalsConceded, 0),
        goalDiff: num(side?.goalDiff, 0),
        goalAv: num(side?.goalAv, 0),
        goalDef: num(side?.goalDef, 0),
        goalGb: num(side?.goalGb, 0),
        demi: num(side?.demi, 0),
        demiBonus: num(side?.demiBonus, 0),
        gamelle: num(side?.gamelle, 0),
        peche: num(side?.peche, 0),
        pecheOff: num(side?.pecheOff, 0),
        pecheDef: num(side?.pecheDef, 0),
        pissette: num(side?.pissette, 0),
        pissetteValid: num(side?.pissetteValid, 0),
        pissetteRefused: num(side?.pissetteRefused, 0),
        csc: num(side?.csc, 0),
        ownGoals: num(side?.csc, 0),
        parachute: num(side?.parachute, 0),
        penalties: num(side?.penalties, 0),
      };
      const index = rows.findIndex((row) => row.id === targetId);
      if (index >= 0) rows[index] = patched;
      else rows.push(patched);
    };
    applyLegacySide("A", rich.teamA, teamAIds);
    applyLegacySide("B", rich.teamB, teamBIds);

    const hasCollectiveFallback = rows.some((row) => row.collective && activityScore(row) > 0);
    if (hasCollectiveFallback) {
      return rows
        .filter((row) => row.collective || activityScore(row) > 0)
        .sort((a, b) => a.team.localeCompare(b.team) || Number(a.collective) - Number(b.collective) || a.name.localeCompare(b.name, "fr"));
    }
  }

  return rows.sort((a, b) => a.team.localeCompare(b.team) || Number(a.collective) - Number(b.collective) || a.name.localeCompare(b.name, "fr"));
}

export function playerStatActivity(row: any): number {
  return activityScore(row);
}
