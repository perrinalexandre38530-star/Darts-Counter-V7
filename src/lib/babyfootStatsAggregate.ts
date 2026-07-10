import { computeBabyFootRichStats } from "./babyfootRichStats";
import {
  extractBabyFootPlayerStatsRows,
  playerStatActivity,
  resolveBabyFootRecord,
  type BabyFootPlayerStatRow,
} from "./babyfootPlayerStats";

export type BabyFootModeFilter = "all" | "1v1" | "2v2" | "2v1";
export type BabyFootPeriodFilter = "J" | "S" | "M" | "A" | "ARV" | "7" | "30" | "90" | "all";

export type BabyFootNormalizedMatch = {
  id: string;
  date: number;
  record: any;
  data: any;
  mode: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winnerTeam: "A" | "B" | null;
  durationMs: number;
  teamAProfileIds: string[];
  teamBProfileIds: string[];
  playerRows: BabyFootPlayerStatRow[];
};

export type BabyFootProfileMatch = {
  id: string;
  date: number;
  mode: string;
  record: any;
  team: "A" | "B";
  teamName: string;
  opponentName: string;
  scoreFor: number;
  scoreAgainst: number;
  won: boolean;
  draw: boolean;
  durationMs: number;
  player: BabyFootPlayerStatRow | null;
  attributed: boolean;
};

export type BabyFootPlayerAggregate = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  ratio: number | null;
  winRate: number;
  cleanSheets: number;
  bestWinStreak: number;
  currentWinStreak: number;
  bestGoalsFor: number;
  bestGoalDiff: number;
  durationMs: number;
  avgDurationMs: number;
  attributedMatches: number;
  personalPoints: number;
  actualGoals: number;
  goalAv: number;
  goalDef: number;
  goalGb: number;
  goalMil: number;
  demi: number;
  demiBonus: number;
  gamelle: number;
  pecheOff: number;
  pecheDef: number;
  pissetteValid: number;
  pissetteRefused: number;
  csc: number;
  penalties: number;
  penaltyGoals: number;
  penaltyRate: number | null;
  form: Array<"W" | "D" | "L">;
  trend: Array<{ id: string; date: number; label: string; gf: number; ga: number; diff: number; result: "W" | "D" | "L" }>;
};

export type BabyFootTeamAggregate = {
  key: string;
  label: string;
  ids: string[];
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  ratio: number | null;
  winRate: number;
  cleanSheets: number;
  bestWinStreak: number;
  currentWinStreak: number;
};

export type BabyFootLeaderboardBundle = {
  matches: BabyFootNormalizedMatch[];
  players: BabyFootPlayerAggregate[];
  teams: BabyFootTeamAggregate[];
  topRanking: BabyFootPlayerAggregate[];
  topRatio: BabyFootPlayerAggregate[];
  topWinRate: BabyFootPlayerAggregate[];
  topGoalsPerMatch: BabyFootPlayerAggregate[];
  topDefense: BabyFootPlayerAggregate[];
  topCleanSheets: BabyFootPlayerAggregate[];
  topStreaks: BabyFootPlayerAggregate[];
  topPersonalScorers: BabyFootPlayerAggregate[];
  topGamelles: BabyFootPlayerAggregate[];
  topPissettes: BabyFootPlayerAggregate[];
  topDemis: BabyFootPlayerAggregate[];
  topCsc: BabyFootPlayerAggregate[];
  topPeche: BabyFootPlayerAggregate[];
  topRating: BabyFootPlayerAggregate[];
  topTeams: BabyFootTeamAggregate[];
  totals: {
    matches: number;
    goals: number;
    avgGoals: number;
    durationMs: number;
    avgDurationMs: number;
  };
};

const EMPTY_PROFILE_AGG: BabyFootPlayerAggregate = {
  id: "",
  name: "Joueur",
  avatarUrl: null,
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  avgGoalsFor: 0,
  avgGoalsAgainst: 0,
  ratio: null,
  winRate: 0,
  cleanSheets: 0,
  bestWinStreak: 0,
  currentWinStreak: 0,
  bestGoalsFor: 0,
  bestGoalDiff: 0,
  durationMs: 0,
  avgDurationMs: 0,
  attributedMatches: 0,
  personalPoints: 0,
  actualGoals: 0,
  goalAv: 0,
  goalDef: 0,
  goalGb: 0,
  goalMil: 0,
  demi: 0,
  demiBonus: 0,
  gamelle: 0,
  pecheOff: 0,
  pecheDef: 0,
  pissetteValid: 0,
  pissetteRefused: 0,
  csc: 0,
  penalties: 0,
  penaltyGoals: 0,
  penaltyRate: null,
  form: [],
  trend: [],
};

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function num(value: any, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: any, fallback = ""): string {
  const out = String(value ?? "").trim();
  return out || fallback;
}

function idOf(profile: any): string {
  return text(profile?.id || profile?.profileId || profile?.playerId || profile?._id);
}

function nameOf(profile: any, fallback = "Joueur"): string {
  return text(profile?.name || profile?.displayName || profile?.nickname || profile?.public_name, fallback);
}

function avatarOf(profile: any): string | null {
  return profile?.avatarUrl || profile?.avatar_url || profile?.avatar || profile?.avatarDataUrl || profile?.avatar_data_url || null;
}

function normalizeTimestamp(raw: any): number {
  const n = Number(raw);
  const value = Number.isFinite(n) && n > 0 ? n : (typeof raw === "string" ? Date.parse(raw) : 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value < 1e12 ? value * 1000 : value;
}

export function babyFootPlayedAt(record: any): number {
  const data = resolveBabyFootRecord(record);
  const candidates = [
    data.finishedAt,
    data.summary?.finishedAt,
    record?.finishedAt,
    record?.updatedAt,
    data.startedAt,
    data.createdAt,
    record?.createdAt,
    record?.ts,
  ];
  for (const candidate of candidates) {
    const value = normalizeTimestamp(candidate);
    if (value > 0) return value;
  }
  return 0;
}

export function babyFootCutoff(period: BabyFootPeriodFilter): number {
  const now = Date.now();
  if (period === "J") return now - 24 * 60 * 60 * 1000;
  if (period === "S" || period === "7") return now - 7 * 24 * 60 * 60 * 1000;
  if (period === "M" || period === "30") return now - 30 * 24 * 60 * 60 * 1000;
  if (period === "90") return now - 90 * 24 * 60 * 60 * 1000;
  if (period === "A") return now - 365 * 24 * 60 * 60 * 1000;
  return 0;
}

function modeOf(data: any): string {
  const mode = text(
    data?.mode
      ?? data?.game?.mode
      ?? data?.summary?.mode
      ?? data?.summary?.game?.mode
      ?? data?.meta?.mode
  ).toLowerCase();
  return mode || "babyfoot";
}

function isBabyFootRecord(record: any): boolean {
  const data = resolveBabyFootRecord(record);
  const values = [
    data?.sport,
    data?.kind,
    data?.game,
    data?.summary?.sport,
    data?.summary?.kind,
    record?.sport,
    record?.kind,
    record?.game,
    record?.summary?.sport,
    record?.summary?.kind,
  ].map((v) => text(v).toLowerCase());
  if (values.some((v) => v.includes("babyfoot") || v.includes("baby-foot") || v.includes("baby_foot"))) return true;
  const mode = modeOf(data);
  const hasBabyShape = (data?.teamAProfileIds || data?.teamBProfileIds || data?.scoreA != null || data?.scoreB != null)
    && (mode === "1v1" || mode === "2v2" || mode === "2v1")
    && (text(data?.teamA || data?.summary?.teamA) || text(data?.teamB || data?.summary?.teamB));
  return Boolean(hasBabyShape);
}

function winnerOf(data: any, scoreA: number, scoreB: number): "A" | "B" | null {
  const raw = text(data?.winnerTeam ?? data?.summary?.winnerTeam ?? data?.winner ?? data?.summary?.winner).toUpperCase();
  if (raw === "A" || raw === "B") return raw;
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? "A" : "B";
}

export function normalizeBabyFootMatch(record: any): BabyFootNormalizedMatch | null {
  if (!record || typeof record !== "object") return null;
  const data = resolveBabyFootRecord(record);
  if (!isBabyFootRecord(record)) return null;
  if (record?.status && record.status !== "finished") return null;
  const rich = computeBabyFootRichStats(data);
  const scoreA = num(data.scoreA ?? data.summary?.scoreA ?? rich.teamA?.score ?? rich.teamA?.goals, 0);
  const scoreB = num(data.scoreB ?? data.summary?.scoreB ?? rich.teamB?.score ?? rich.teamB?.goals, 0);
  const teamAProfileIds = arr(data.teamAProfileIds ?? data.summary?.teamAProfileIds).map(String).filter(Boolean);
  const teamBProfileIds = arr(data.teamBProfileIds ?? data.summary?.teamBProfileIds).map(String).filter(Boolean);
  const date = babyFootPlayedAt(record);
  const id = text(record?.id || record?.matchId || data?.id || data?.matchId || `${date}-${scoreA}-${scoreB}`);
  return {
    id,
    date,
    record,
    data,
    mode: modeOf(data),
    teamAName: text(data.teamA ?? data.summary?.teamA ?? rich.teamA?.name, "Équipe A"),
    teamBName: text(data.teamB ?? data.summary?.teamB ?? rich.teamB?.name, "Équipe B"),
    scoreA,
    scoreB,
    winnerTeam: winnerOf(data, scoreA, scoreB),
    durationMs: num(data.durationMs ?? data.summary?.durationMs, 0),
    teamAProfileIds,
    teamBProfileIds,
    playerRows: extractBabyFootPlayerStatsRows(data),
  };
}

export function normalizeBabyFootMatches(rows: any[], options?: { period?: BabyFootPeriodFilter; mode?: BabyFootModeFilter }): BabyFootNormalizedMatch[] {
  const cutoff = options?.period ? babyFootCutoff(options.period) : 0;
  const mode = String(options?.mode || "all").toLowerCase();
  const byId = new Map<string, BabyFootNormalizedMatch>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const match = normalizeBabyFootMatch(row);
    if (!match) continue;
    if (cutoff && match.date && match.date < cutoff) continue;
    if (mode !== "all" && match.mode !== mode) continue;
    const previous = byId.get(match.id);
    const quality = (m: BabyFootNormalizedMatch) => m.playerRows.length * 5 + arr(m.data?.events).length * 3 + (m.record?.payload ? 6 : 0);
    if (!previous || quality(match) >= quality(previous)) byId.set(match.id, match);
  }
  return Array.from(byId.values()).sort((a, b) => b.date - a.date);
}

function finalizePlayer(input: BabyFootPlayerAggregate): BabyFootPlayerAggregate {
  const matches = Math.max(0, input.matches);
  const goalsAgainst = Math.max(0, input.goalsAgainst);
  const penalties = Math.max(0, input.penalties);
  return {
    ...input,
    losses: Math.max(0, input.matches - input.wins - input.draws),
    goalDiff: input.goalsFor - input.goalsAgainst,
    avgGoalsFor: matches ? input.goalsFor / matches : 0,
    avgGoalsAgainst: matches ? input.goalsAgainst / matches : 0,
    ratio: matches ? (goalsAgainst > 0 ? input.goalsFor / goalsAgainst : (input.goalsFor > 0 ? Infinity : null)) : null,
    winRate: matches ? input.wins / matches : 0,
    avgDurationMs: matches ? input.durationMs / matches : 0,
    penaltyRate: penalties ? input.penaltyGoals / penalties : null,
    form: input.trend.slice(-8).map((row) => row.result),
  };
}

function finalizeTeam(input: BabyFootTeamAggregate): BabyFootTeamAggregate {
  const matches = Math.max(0, input.matches);
  const goalsAgainst = Math.max(0, input.goalsAgainst);
  return {
    ...input,
    losses: Math.max(0, input.matches - input.wins - input.draws),
    goalDiff: input.goalsFor - input.goalsAgainst,
    avgGoalsFor: matches ? input.goalsFor / matches : 0,
    avgGoalsAgainst: matches ? input.goalsAgainst / matches : 0,
    ratio: matches ? (goalsAgainst > 0 ? input.goalsFor / goalsAgainst : (input.goalsFor > 0 ? Infinity : null)) : null,
    winRate: matches ? input.wins / matches : 0,
  };
}

function makeProfileAggregate(profileId: string, profilesById: Record<string, any>): BabyFootPlayerAggregate {
  const profile = profilesById[profileId] || {};
  return {
    ...EMPTY_PROFILE_AGG,
    id: profileId,
    name: nameOf(profile, profileId ? profileId.slice(0, 8) : "Joueur"),
    avatarUrl: avatarOf(profile),
    form: [],
    trend: [],
  };
}

export function profileMatchesFromBabyFootMatches(matches: BabyFootNormalizedMatch[], profileId: string): BabyFootProfileMatch[] {
  const pid = text(profileId);
  if (!pid) return [];
  const out: BabyFootProfileMatch[] = [];
  for (const match of matches) {
    const inA = match.teamAProfileIds.includes(pid);
    const inB = match.teamBProfileIds.includes(pid);
    if (!inA && !inB) continue;
    const team = inA ? "A" : "B";
    const scoreFor = team === "A" ? match.scoreA : match.scoreB;
    const scoreAgainst = team === "A" ? match.scoreB : match.scoreA;
    const player = match.playerRows.find((row) => row.id === pid || row.playerId === pid || row.profileId === pid) || null;
    out.push({
      id: match.id,
      date: match.date,
      mode: match.mode,
      record: match.record,
      team,
      teamName: team === "A" ? match.teamAName : match.teamBName,
      opponentName: team === "A" ? match.teamBName : match.teamAName,
      scoreFor,
      scoreAgainst,
      won: scoreFor > scoreAgainst,
      draw: scoreFor === scoreAgainst,
      durationMs: match.durationMs,
      player,
      attributed: !!player && playerStatActivity(player) > 0,
    });
  }
  return out.sort((a, b) => b.date - a.date);
}

export function computeBabyFootProfileAggregate(
  matches: BabyFootNormalizedMatch[],
  profiles: any[],
  profileId: string,
): BabyFootPlayerAggregate {
  const pid = text(profileId);
  if (!pid) return { ...EMPTY_PROFILE_AGG, form: [], trend: [] };
  const profilesById: Record<string, any> = {};
  for (const p of arr(profiles)) {
    const id = idOf(p);
    if (id) profilesById[id] = p;
  }
  const agg = makeProfileAggregate(pid, profilesById);
  let streak = 0;
  const chronological = [...profileMatchesFromBabyFootMatches(matches, pid)].sort((a, b) => a.date - b.date);
  for (const match of chronological) {
    const result: "W" | "D" | "L" = match.won ? "W" : match.draw ? "D" : "L";
    agg.matches += 1;
    agg.goalsFor += match.scoreFor;
    agg.goalsAgainst += match.scoreAgainst;
    agg.durationMs += match.durationMs;
    agg.bestGoalsFor = Math.max(agg.bestGoalsFor, match.scoreFor);
    agg.bestGoalDiff = Math.max(agg.bestGoalDiff, match.scoreFor - match.scoreAgainst);
    if (match.scoreAgainst === 0) agg.cleanSheets += 1;
    if (match.won) {
      agg.wins += 1;
      agg.points += 3;
      streak += 1;
      agg.bestWinStreak = Math.max(agg.bestWinStreak, streak);
    } else if (match.draw) {
      agg.draws += 1;
      agg.points += 1;
      streak = 0;
    } else {
      streak = 0;
    }
    agg.currentWinStreak = streak;
    agg.trend.push({
      id: match.id,
      date: match.date,
      label: match.mode.toUpperCase(),
      gf: match.scoreFor,
      ga: match.scoreAgainst,
      diff: match.scoreFor - match.scoreAgainst,
      result,
    });
    const row = match.player;
    if (row && match.attributed) {
      agg.attributedMatches += 1;
      agg.personalPoints += num(row.points, num(row.goals, 0));
      agg.actualGoals += num(row.goals, 0);
      agg.goalAv += num(row.goalAv, 0);
      agg.goalDef += num(row.goalDef, 0);
      agg.goalGb += num(row.goalGb, 0);
      agg.goalMil += num(row.goalMil, 0);
      agg.demi += num(row.demi, 0);
      agg.demiBonus += num(row.demiBonus, 0);
      agg.gamelle += num(row.gamelle, 0);
      agg.pecheOff += num(row.pecheOff, 0);
      agg.pecheDef += num(row.pecheDef, 0);
      agg.pissetteValid += num(row.pissetteValid, 0);
      agg.pissetteRefused += num(row.pissetteRefused, 0);
      agg.csc += num(row.csc, 0);
      agg.penalties += num(row.penalties, 0);
      agg.penaltyGoals += num(row.penaltyGoals, 0);
    }
  }
  return finalizePlayer(agg);
}

function teamAggKey(ids: string[]) {
  const list = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean).sort();
  return list.join("|") || "—";
}

function teamAggLabel(ids: string[], fallback: string, profilesById: Record<string, any>) {
  const names = ids.map((id) => nameOf(profilesById[id], id.slice(0, 6))).filter(Boolean);
  return names.length ? names.join(" + ") : fallback;
}

export function computeBabyFootLeaderboards(matches: BabyFootNormalizedMatch[], profiles: any[]): BabyFootLeaderboardBundle {
  const profilesById: Record<string, any> = {};
  for (const p of arr(profiles)) {
    const id = idOf(p);
    if (id) profilesById[id] = p;
  }

  const byPlayer = new Map<string, BabyFootPlayerAggregate>();
  const byTeam = new Map<string, BabyFootTeamAggregate>();
  const ensurePlayer = (id: string) => {
    const pid = text(id);
    if (!pid) return null;
    let row = byPlayer.get(pid);
    if (!row) {
      row = makeProfileAggregate(pid, profilesById);
      byPlayer.set(pid, row);
    }
    return row;
  };
  const ensureTeam = (ids: string[], fallback: string) => {
    const cleanIds = ids.map(String).filter(Boolean).sort();
    const key = teamAggKey(cleanIds);
    let row = byTeam.get(key);
    if (!row) {
      row = {
        key,
        label: teamAggLabel(cleanIds, fallback, profilesById),
        ids: cleanIds,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        avgGoalsFor: 0,
        avgGoalsAgainst: 0,
        ratio: null,
        winRate: 0,
        cleanSheets: 0,
        bestWinStreak: 0,
        currentWinStreak: 0,
      };
      byTeam.set(key, row);
    }
    return row;
  };

  const chronological = [...matches].sort((a, b) => a.date - b.date);
  let durationMs = 0;
  let goals = 0;

  const bumpSide = (target: BabyFootPlayerAggregate | BabyFootTeamAggregate, gf: number, ga: number, won: boolean, draw: boolean) => {
    target.matches += 1;
    target.goalsFor += gf;
    target.goalsAgainst += ga;
    if (ga === 0) target.cleanSheets += 1;
    if (won) {
      target.wins += 1;
      target.points += 3;
      target.currentWinStreak += 1;
      target.bestWinStreak = Math.max(target.bestWinStreak, target.currentWinStreak);
    } else {
      if (draw) {
        target.draws += 1;
        target.points += 1;
      }
      target.currentWinStreak = 0;
    }
  };

  for (const match of chronological) {
    durationMs += Math.max(0, match.durationMs);
    goals += Math.max(0, match.scoreA) + Math.max(0, match.scoreB);

    const tA = ensureTeam(match.teamAProfileIds, match.teamAName);
    const tB = ensureTeam(match.teamBProfileIds, match.teamBName);
    bumpSide(tA, match.scoreA, match.scoreB, match.scoreA > match.scoreB, match.scoreA === match.scoreB);
    bumpSide(tB, match.scoreB, match.scoreA, match.scoreB > match.scoreA, match.scoreA === match.scoreB);

    for (const id of match.teamAProfileIds) {
      const p = ensurePlayer(id);
      if (!p) continue;
      bumpSide(p, match.scoreA, match.scoreB, match.scoreA > match.scoreB, match.scoreA === match.scoreB);
      p.durationMs += match.durationMs;
      p.bestGoalsFor = Math.max(p.bestGoalsFor, match.scoreA);
      p.bestGoalDiff = Math.max(p.bestGoalDiff, match.scoreA - match.scoreB);
      p.trend.push({ id: match.id, date: match.date, label: match.mode.toUpperCase(), gf: match.scoreA, ga: match.scoreB, diff: match.scoreA - match.scoreB, result: match.scoreA > match.scoreB ? "W" : match.scoreA === match.scoreB ? "D" : "L" });
    }
    for (const id of match.teamBProfileIds) {
      const p = ensurePlayer(id);
      if (!p) continue;
      bumpSide(p, match.scoreB, match.scoreA, match.scoreB > match.scoreA, match.scoreA === match.scoreB);
      p.durationMs += match.durationMs;
      p.bestGoalsFor = Math.max(p.bestGoalsFor, match.scoreB);
      p.bestGoalDiff = Math.max(p.bestGoalDiff, match.scoreB - match.scoreA);
      p.trend.push({ id: match.id, date: match.date, label: match.mode.toUpperCase(), gf: match.scoreB, ga: match.scoreA, diff: match.scoreB - match.scoreA, result: match.scoreB > match.scoreA ? "W" : match.scoreA === match.scoreB ? "D" : "L" });
    }

    for (const row of match.playerRows) {
      if (!row || row.collective) continue;
      const p = ensurePlayer(row.id || row.playerId || row.profileId);
      if (!p || playerStatActivity(row) <= 0) continue;
      p.attributedMatches += 1;
      p.personalPoints += num(row.points, num(row.goals, 0));
      p.actualGoals += num(row.goals, 0);
      p.goalAv += num(row.goalAv, 0);
      p.goalDef += num(row.goalDef, 0);
      p.goalGb += num(row.goalGb, 0);
      p.goalMil += num(row.goalMil, 0);
      p.demi += num(row.demi, 0);
      p.demiBonus += num(row.demiBonus, 0);
      p.gamelle += num(row.gamelle, 0);
      p.pecheOff += num(row.pecheOff, 0);
      p.pecheDef += num(row.pecheDef, 0);
      p.pissetteValid += num(row.pissetteValid, 0);
      p.pissetteRefused += num(row.pissetteRefused, 0);
      p.csc += num(row.csc, 0);
      p.penalties += num(row.penalties, 0);
      p.penaltyGoals += num(row.penaltyGoals, 0);
    }
  }

  const players = Array.from(byPlayer.values()).map(finalizePlayer);
  const teams = Array.from(byTeam.values()).map(finalizeTeam);
  const minForRates = (p: BabyFootPlayerAggregate) => p.matches >= Math.min(3, Math.max(1, Math.floor(matches.length / 6)));
  const byRanking = (a: BabyFootPlayerAggregate, b: BabyFootPlayerAggregate) =>
    b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.avgGoalsAgainst - b.avgGoalsAgainst || a.name.localeCompare(b.name, "fr");

  return {
    matches: [...matches].sort((a, b) => b.date - a.date),
    players,
    teams,
    topRanking: [...players].sort(byRanking).slice(0, 20),
    topRatio: [...players].filter((p) => minForRates(p) && p.ratio != null).sort((a, b) => (Number(b.ratio) || 0) - (Number(a.ratio) || 0)).slice(0, 10),
    topWinRate: [...players].filter(minForRates).sort((a, b) => b.winRate - a.winRate || b.matches - a.matches).slice(0, 10),
    topGoalsPerMatch: [...players].filter(minForRates).sort((a, b) => b.avgGoalsFor - a.avgGoalsFor || b.goalsFor - a.goalsFor).slice(0, 10),
    topDefense: [...players].filter(minForRates).sort((a, b) => a.avgGoalsAgainst - b.avgGoalsAgainst || b.cleanSheets - a.cleanSheets).slice(0, 10),
    topCleanSheets: [...players].filter((p) => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets || a.avgGoalsAgainst - b.avgGoalsAgainst).slice(0, 10),
    topStreaks: [...players].filter((p) => p.bestWinStreak > 0).sort((a, b) => b.bestWinStreak - a.bestWinStreak || b.currentWinStreak - a.currentWinStreak).slice(0, 10),
    topPersonalScorers: [...players].filter((p) => p.actualGoals > 0 || p.personalPoints > 0).sort((a, b) => b.personalPoints - a.personalPoints || b.actualGoals - a.actualGoals).slice(0, 10),
    topGamelles: [...players].filter((p) => p.gamelle > 0).sort((a, b) => b.gamelle - a.gamelle || b.matches - a.matches).slice(0, 10),
    topPissettes: [...players].filter((p) => p.pissetteValid > 0 || p.pissetteRefused > 0).sort((a, b) => (b.pissetteValid + b.pissetteRefused) - (a.pissetteValid + a.pissetteRefused) || b.pissetteValid - a.pissetteValid).slice(0, 10),
    topDemis: [...players].filter((p) => p.demi > 0 || p.demiBonus > 0).sort((a, b) => b.demi - a.demi || b.demiBonus - a.demiBonus).slice(0, 10),
    topCsc: [...players].filter((p) => p.csc > 0).sort((a, b) => b.csc - a.csc || a.name.localeCompare(b.name, "fr")).slice(0, 10),
    topPeche: [...players].filter((p) => p.pecheOff > 0 || p.pecheDef > 0).sort((a, b) => (b.pecheOff + b.pecheDef) - (a.pecheOff + a.pecheDef) || b.pecheOff - a.pecheOff).slice(0, 10),
    topRating: [...players].filter((p) => p.matches > 0).sort((a, b) => babyFootRating(b) - babyFootRating(a) || byRanking(a, b)).slice(0, 10),
    topTeams: [...teams].filter((t) => t.matches >= 1).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.winRate - a.winRate).slice(0, 12),
    totals: {
      matches: matches.length,
      goals,
      avgGoals: matches.length ? goals / matches.length : 0,
      durationMs,
      avgDurationMs: matches.length ? durationMs / matches.length : 0,
    },
  };
}

export function formatBabyFootRatio(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  if (value === Infinity || Number(value) > 999) return "∞";
  return Number(value).toFixed(2).replace(".00", "");
}

export function formatBabyFootPct01(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "0%";
  return `${Math.round(Math.max(0, Math.min(1, Number(value))) * 100)}%`;
}

const BABYFOOT_TARGET_GOALS_FOR_LEVEL = 10;
const BABYFOOT_LEVEL_STABILIZATION_MATCHES = 5;

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function babyFootLevelPercent(
  agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "avgGoalsFor" | "avgGoalsAgainst">,
): number {
  const matches = Math.max(0, Number(agg?.matches || 0));
  if (!matches) return 0;

  const winPct = clampPct(Number(agg.winRate || 0) * 100);
  const bpPct = clampPct((Math.max(0, Number(agg.avgGoalsFor || 0)) / BABYFOOT_TARGET_GOALS_FOR_LEVEL) * 100);
  const bcPenaltyPct = clampPct((Math.max(0, Number(agg.avgGoalsAgainst || 0)) / BABYFOOT_TARGET_GOALS_FOR_LEVEL) * 100);

  // Base Baby-Foot demandée : %WIN + %BP/match - %BC/match.
  // La formule brute va de -100 à 200, donc on la ramène proprement sur 0..100.
  const raw = winPct + bpPct - bcPenaltyPct;
  const normalized = clampPct(((raw + 100) / 300) * 100);

  // Petite stabilisation pour éviter qu'un seul match donne instantanément un niveau définitif.
  // 1 match = 70% de la valeur, 5 matchs et plus = valeur complète.
  const confidence = 0.7 + 0.3 * Math.min(1, matches / BABYFOOT_LEVEL_STABILIZATION_MATCHES);
  return Math.round(clampPct(normalized * confidence));
}

export function babyFootRating(agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "goalDiff" | "avgGoalsFor" | "avgGoalsAgainst" | "cleanSheets">): number {
  return babyFootLevelPercent(agg);
}
