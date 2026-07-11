import { getTeamAvatarUrl, type TeamSkin } from "../assets/teamAvatars";
import { computeBabyFootRichStats, type BabyFootRichSideStats } from "./babyfootRichStats";
import {
  formatBabyFootRatio,
  normalizeBabyFootMatches,
  type BabyFootModeFilter,
  type BabyFootNormalizedMatch,
  type BabyFootPeriodFilter,
} from "./babyfootStatsAggregate";
import { playerStatActivity, type BabyFootPlayerStatRow } from "./babyfootPlayerStats";

export type BabyFootTeamScopeMatch = {
  id: string;
  date: number;
  mode: string;
  record: any;
  teamKey: string;
  teamId?: string | null;
  teamName: string;
  opponentName: string;
  scoreFor: number;
  scoreAgainst: number;
  won: boolean;
  draw: boolean;
  durationMs: number;
  side: "A" | "B";
  playerIds: string[];
};

export type BabyFootTeamPlayerContribution = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  teamGoalsFor: number;
  teamGoalsAgainst: number;
  teamGoalDiff: number;
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
  parachute: number;
  penalties: number;
  penaltyGoals: number;
  avgPersonalPoints: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  contributionPct: number;
};

export type BabyFootTeamDetailedAggregate = {
  key: string;
  id?: string | null;
  label: string;
  logoUrl?: string | null;
  rosterIds: string[];
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
  goalAv: number;
  goalDef: number;
  goalGb: number;
  goalsConcededAv: number;
  goalsConcededDef: number;
  goalsConcededGb: number;
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
  parachute: number;
  penalties: number;
  handicap: number;
  equalizations: number;
  leadChanges: number;
  longestRun: number;
  form: Array<"W" | "D" | "L">;
  trend: Array<{ id: string; date: number; label: string; gf: number; ga: number; diff: number; result: "W" | "D" | "L" }>;
  players: BabyFootTeamPlayerContribution[];
  matchList: BabyFootTeamScopeMatch[];
};

export type BabyFootTeamStatsBundle = {
  matches: BabyFootNormalizedMatch[];
  teams: BabyFootTeamDetailedAggregate[];
  topTeams: BabyFootTeamDetailedAggregate[];
};

type CatalogTeam = {
  id?: string | null;
  name?: string | null;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  playerIds?: string[];
};


type DefaultBabyFootTeamMeta = { id: string; label: string; skin: TeamSkin };

const DEFAULT_BABYFOOT_TEAM_META: DefaultBabyFootTeamMeta[] = [
  { id: "bf-team-gold", label: "TEAM GOLD", skin: "gold" },
  { id: "bf-team-pink", label: "TEAM PINK", skin: "pink" },
  { id: "bf-team-green", label: "TEAM GREEN", skin: "green" },
  { id: "bf-team-blue", label: "TEAM BLUE", skin: "blue" },
];

const DEFAULT_BABYFOOT_TEAM_IDS = new Set(DEFAULT_BABYFOOT_TEAM_META.map((team) => team.id));

function defaultTeamMeta(id?: any, name?: any): DefaultBabyFootTeamMeta | null {
  const rawId = text(id);
  if (rawId) {
    const byId = DEFAULT_BABYFOOT_TEAM_META.find((team) => team.id === rawId);
    if (byId) return byId;
  }
  const normalized = normalizeName(name);
  if (!normalized) return null;
  return DEFAULT_BABYFOOT_TEAM_META.find((team) => normalizeName(team.label) === normalized) || null;
}

function defaultTeamLogo(id?: any, name?: any): string | null {
  const meta = defaultTeamMeta(id, name);
  return meta ? getTeamAvatarUrl(meta.skin) : null;
}

function distinctPlayerIds(ids: any[]): string[] {
  return Array.from(new Set(arr(ids).map((id) => text(id)).filter(Boolean)));
}

function isRealTeamRoster(ids: any[]): boolean {
  return distinctPlayerIds(ids).length >= 2;
}

function isDefaultBabyFootTeamRef(id?: any, name?: any): boolean {
  return Boolean(defaultTeamMeta(id, name));
}

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

function normalizeName(value: any): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function teamLogoOf(team: CatalogTeam | undefined): string | null {
  if (!team) return null;
  return team.logoDataUrl || team.logoUrl || team.avatarUrl || team.imageUrl || defaultTeamLogo(team.id, team.name);
}

function getAny(source: any, ...keys: string[]): any {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  }
  return undefined;
}

function sideRef(match: BabyFootNormalizedMatch, side: "A" | "B"): string | null {
  const d = match.data || {};
  const s = d.summary || {};
  return text(
    side === "A"
      ? getAny(d, "teamARefId", "teamARefID", "teamARefid", "teamarefid") ?? getAny(s, "teamARefId", "teamARefID", "teamARefid", "teamarefid")
      : getAny(d, "teamBRefId", "teamBRefID", "teamBRefid", "teambrefid") ?? getAny(s, "teamBRefId", "teamBRefID", "teamBRefid", "teambrefid"),
  ) || null;
}

function sideStats(match: BabyFootNormalizedMatch, side: "A" | "B"): BabyFootRichSideStats {
  const rich = computeBabyFootRichStats(match.data);
  return side === "A" ? rich.teamA : rich.teamB;
}

function isGenericTeamName(name: string): boolean {
  const n = normalizeName(name);
  return n === "team a" || n === "team b" || n === "equipe a" || n === "equipe b" || n === "a" || n === "b";
}

function compositionLabel(ids: string[], fallback: string, profilesById: Map<string, any>) {
  const names = ids.map((id) => nameOf(profilesById.get(id), id.slice(0, 7))).filter(Boolean);
  return names.length ? names.join(" + ") : fallback;
}

function makeEmptyTeam(key: string, label: string, input?: { id?: string | null; logoUrl?: string | null; rosterIds?: string[] }): BabyFootTeamDetailedAggregate {
  return {
    key,
    id: input?.id ?? null,
    label,
    logoUrl: input?.logoUrl ?? null,
    rosterIds: Array.from(new Set((input?.rosterIds || []).map(String).filter(Boolean))),
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
    goalAv: 0,
    goalDef: 0,
    goalGb: 0,
    goalsConcededAv: 0,
    goalsConcededDef: 0,
    goalsConcededGb: 0,
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
    parachute: 0,
    penalties: 0,
    handicap: 0,
    equalizations: 0,
    leadChanges: 0,
    longestRun: 0,
    form: [],
    trend: [],
    players: [],
    matchList: [],
  };
}

function finalizePlayerContribution(row: BabyFootTeamPlayerContribution): BabyFootTeamPlayerContribution {
  const matches = Math.max(0, row.matches);
  return {
    ...row,
    teamGoalDiff: row.teamGoalsFor - row.teamGoalsAgainst,
    avgPersonalPoints: matches ? row.actualGoals / matches : 0,
    avgGoalsFor: matches ? row.teamGoalsFor / matches : 0,
    avgGoalsAgainst: matches ? row.teamGoalsAgainst / matches : 0,
    contributionPct: row.teamGoalsFor > 0 ? Math.round((row.actualGoals / row.teamGoalsFor) * 100) : 0,
  };
}

function finalizeTeam(team: BabyFootTeamDetailedAggregate): BabyFootTeamDetailedAggregate {
  const matches = Math.max(0, team.matches);
  const players = team.players.map(finalizePlayerContribution).sort((a, b) =>
    b.matches - a.matches ||
    b.actualGoals - a.actualGoals ||
    b.teamGoalDiff - a.teamGoalDiff ||
    a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }),
  );
  return {
    ...team,
    players,
    matchList: [...team.matchList].sort((a, b) => b.date - a.date),
    goalDiff: team.goalsFor - team.goalsAgainst,
    avgGoalsFor: matches ? team.goalsFor / matches : 0,
    avgGoalsAgainst: matches ? team.goalsAgainst / matches : 0,
    avgDurationMs: matches ? team.durationMs / matches : 0,
    ratio: matches ? (team.goalsAgainst > 0 ? team.goalsFor / team.goalsAgainst : (team.goalsFor > 0 ? Infinity : null)) : null,
    winRate: matches ? team.wins / matches : 0,
    form: team.form.slice(-5),
    trend: team.trend.slice(-10),
  };
}

function bumpPlayer(
  map: Map<string, BabyFootTeamPlayerContribution>,
  playerId: string,
  profilesById: Map<string, any>,
  side: { gf: number; ga: number; won: boolean; draw: boolean },
  row?: BabyFootPlayerStatRow | null,
) {
  const pid = text(playerId);
  if (!pid) return;
  const profile = profilesById.get(pid);
  let out = map.get(pid);
  if (!out) {
    out = {
      id: pid,
      name: nameOf(profile, row?.name || pid.slice(0, 7)),
      avatarUrl: avatarOf(profile) || row?.avatarUrl || row?.avatar || null,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      teamGoalsFor: 0,
      teamGoalsAgainst: 0,
      teamGoalDiff: 0,
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
      parachute: 0,
      penalties: 0,
      penaltyGoals: 0,
      avgPersonalPoints: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0,
      contributionPct: 0,
    };
    map.set(pid, out);
  }
  out.matches += 1;
  out.teamGoalsFor += side.gf;
  out.teamGoalsAgainst += side.ga;
  if (side.won) out.wins += 1;
  else if (side.draw) out.draws += 1;
  else out.losses += 1;
  if (row && playerStatActivity(row) > 0) {
    out.personalPoints += num(row.points, num(row.goals, 0));
    out.actualGoals += num(row.goals, 0);
    out.goalAv += num(row.goalAv, 0);
    out.goalDef += num(row.goalDef, 0);
    out.goalGb += num(row.goalGb, 0);
    out.goalMil += num(row.goalMil, 0);
    out.demi += num(row.demi, 0);
    out.demiBonus += num(row.demiBonus, 0);
    out.gamelle += num(row.gamelle, 0);
    out.pecheOff += num(row.pecheOff, 0);
    out.pecheDef += num(row.pecheDef, 0);
    out.pissetteValid += num(row.pissetteValid, 0);
    out.pissetteRefused += num(row.pissetteRefused, 0);
    out.csc += num(row.csc, 0);
    out.parachute += num((row as any).parachute, 0);
    out.penalties += num(row.penalties, 0);
    out.penaltyGoals += num(row.penaltyGoals, 0);
  }
}

export function babyFootTeamRating(team: Pick<BabyFootTeamDetailedAggregate, "matches" | "winRate" | "goalDiff" | "avgGoalsFor" | "avgGoalsAgainst" | "cleanSheets">): number {
  if (!team.matches) return 0;
  const cleanBonus = (team.cleanSheets / Math.max(1, team.matches)) * 12;
  const attack = team.avgGoalsFor * 5;
  const defense = Math.max(0, 6 - team.avgGoalsAgainst) * 3;
  const diff = (team.goalDiff / Math.max(1, team.matches)) * 10;
  return Math.max(0, Math.round(team.winRate * 100 + attack + defense + diff + cleanBonus));
}

export function computeBabyFootTeamStatsBundle(
  rows: any[],
  profiles: any[],
  catalogTeams: CatalogTeam[],
  options?: { period?: BabyFootPeriodFilter; mode?: BabyFootModeFilter },
): BabyFootTeamStatsBundle {
  const matches = normalizeBabyFootMatches(rows, options);
  const profilesById = new Map<string, any>();
  for (const profile of arr(profiles)) {
    const id = idOf(profile);
    if (id) profilesById.set(id, profile);
  }

  const catalogById = new Map<string, CatalogTeam>();
  const catalogByName = new Map<string, CatalogTeam>();
  for (const team of arr(catalogTeams) as CatalogTeam[]) {
    const id = text(team?.id);
    const name = text(team?.name, "Équipe");
    if (id) catalogById.set(id, team);
    const normalized = normalizeName(name);
    if (normalized) catalogByName.set(normalized, team);
  }

  const teams = new Map<string, BabyFootTeamDetailedAggregate>();
  const playerMaps = new Map<string, Map<string, BabyFootTeamPlayerContribution>>();
  const ensureTeam = (key: string, label: string, input?: { id?: string | null; logoUrl?: string | null; rosterIds?: string[] }) => {
    let team = teams.get(key);
    if (!team) {
      team = makeEmptyTeam(key, label, input);
      teams.set(key, team);
      playerMaps.set(key, new Map());
    } else {
      if (!team.id && input?.id) team.id = input.id;
      if (!team.logoUrl && input?.logoUrl) team.logoUrl = input.logoUrl;
      if (input?.rosterIds?.length) team.rosterIds = Array.from(new Set([...team.rosterIds, ...input.rosterIds.map(String).filter(Boolean)]));
      if (label && !team.label) team.label = label;
    }
    return team;
  };

  for (const team of arr(catalogTeams) as CatalogTeam[]) {
    const id = text(team?.id);
    const label = text(team?.name, "Équipe");
    if (!id && !label) continue;
    const rosterIds = distinctPlayerIds(arr(team?.playerIds));
    const isDefault = isDefaultBabyFootTeamRef(id, label);
    if (!isDefault && !isRealTeamRoster(rosterIds)) continue;
    const meta = defaultTeamMeta(id, label);
    ensureTeam(id || `catalog-name:${normalizeName(label)}`, meta?.label || label, { id: id || null, logoUrl: teamLogoOf(team) || defaultTeamLogo(id, label), rosterIds });
  }

  const resolveKey = (match: BabyFootNormalizedMatch, side: "A" | "B") => {
    const ids = distinctPlayerIds(side === "A" ? match.teamAProfileIds : match.teamBProfileIds);
    if (!isRealTeamRoster(ids)) return null;

    const fallbackName = side === "A" ? match.teamAName : match.teamBName;
    const ref = sideRef(match, side);
    const meta = defaultTeamMeta(ref, fallbackName);
    const byRef = ref ? catalogById.get(ref) : undefined;
    const byName = !isGenericTeamName(fallbackName) ? catalogByName.get(normalizeName(fallbackName)) : undefined;
    const catalog = byRef || byName;

    if (catalog?.id || meta) {
      const id = text(catalog?.id || meta?.id || ref);
      const label = text(catalog?.name || meta?.label, fallbackName);
      const rosterIds = distinctPlayerIds(arr(catalog?.playerIds).length ? arr(catalog?.playerIds) : ids);
      return {
        key: id || `team-name:${normalizeName(label)}`,
        id: id || null,
        label,
        logoUrl: teamLogoOf(catalog) || defaultTeamLogo(id, label),
        rosterIds,
      };
    }

    if (ref) {
      return { key: ref, id: ref, label: fallbackName, logoUrl: defaultTeamLogo(ref, fallbackName), rosterIds: ids };
    }

    return {
      key: `composition:${ids.slice().sort().join("|")}`,
      id: null,
      label: compositionLabel(ids, fallbackName, profilesById),
      logoUrl: defaultTeamLogo(null, fallbackName),
      rosterIds: ids,
    };
  };

  for (const match of [...matches].sort((a, b) => a.date - b.date)) {
    for (const side of ["A", "B"] as const) {
      const resolved = resolveKey(match, side);
      if (!resolved) continue;
      const team = ensureTeam(resolved.key, resolved.label, resolved);
      const stats = sideStats(match, side);
      const playerIds = distinctPlayerIds(side === "A" ? match.teamAProfileIds : match.teamBProfileIds);
      const scoreFor = side === "A" ? match.scoreA : match.scoreB;
      const scoreAgainst = side === "A" ? match.scoreB : match.scoreA;
      const won = scoreFor > scoreAgainst;
      const draw = scoreFor === scoreAgainst;
      const result: "W" | "D" | "L" = won ? "W" : draw ? "D" : "L";
      team.matches += 1;
      team.goalsFor += scoreFor;
      team.goalsAgainst += scoreAgainst;
      team.durationMs += match.durationMs;
      team.bestGoalsFor = Math.max(team.bestGoalsFor, scoreFor);
      team.bestGoalDiff = Math.max(team.bestGoalDiff, scoreFor - scoreAgainst);
      if (scoreAgainst === 0) team.cleanSheets += 1;
      if (won) {
        team.wins += 1;
        team.points += 3;
        team.currentWinStreak += 1;
        team.bestWinStreak = Math.max(team.bestWinStreak, team.currentWinStreak);
      } else {
        if (draw) {
          team.draws += 1;
          team.points += 1;
        } else {
          team.losses += 1;
        }
        team.currentWinStreak = 0;
      }
      team.goalAv += num(stats.goalAv, 0);
      team.goalDef += num(stats.goalDef, 0);
      team.goalGb += num(stats.goalGb, 0);
      team.goalsConcededAv += num(stats.goalsConcededAv, 0);
      team.goalsConcededDef += num(stats.goalsConcededDef, 0);
      team.goalsConcededGb += num(stats.goalsConcededGb, 0);
      team.demi += num(stats.demi, 0);
      team.demiBonus += num(stats.demiBonus, 0);
      team.gamelle += num(stats.gamelle, 0);
      team.peche += num(stats.peche, 0);
      team.pecheOff += num(stats.pecheOff, 0);
      team.pecheDef += num(stats.pecheDef, 0);
      team.pissette += num(stats.pissette, 0);
      team.pissetteValid += num(stats.pissetteValid, 0);
      team.pissetteRefused += num(stats.pissetteRefused, 0);
      team.csc += num(stats.csc, 0);
      team.parachute += num((stats as any).parachute, 0);
      team.penalties += num(stats.penalties, 0);
      team.handicap += num(stats.handicap, 0);
      team.equalizations += num(stats.equalizations, 0);
      team.leadChanges += num(stats.leadChanges, 0);
      team.longestRun = Math.max(team.longestRun, num(stats.longestRun, 0));
      team.form.push(result);
      team.trend.push({ id: match.id, date: match.date, label: match.mode.toUpperCase(), gf: scoreFor, ga: scoreAgainst, diff: scoreFor - scoreAgainst, result });
      team.matchList.push({
        id: match.id,
        date: match.date,
        mode: match.mode,
        record: match.record,
        teamKey: resolved.key,
        teamId: resolved.id,
        teamName: resolved.label,
        opponentName: side === "A" ? match.teamBName : match.teamAName,
        scoreFor,
        scoreAgainst,
        won,
        draw,
        durationMs: match.durationMs,
        side,
        playerIds: playerIds.slice(),
      });
      team.rosterIds = Array.from(new Set([...team.rosterIds, ...playerIds.map(String).filter(Boolean)]));

      const pmap = playerMaps.get(resolved.key) || new Map<string, BabyFootTeamPlayerContribution>();
      playerMaps.set(resolved.key, pmap);
      for (const pid of playerIds) {
        const row = match.playerRows.find((r) => r && !r.collective && (r.id === pid || r.playerId === pid || r.profileId === pid) && String(r.team || "").toUpperCase() === side) ||
          match.playerRows.find((r) => r && !r.collective && (r.id === pid || r.playerId === pid || r.profileId === pid));
        bumpPlayer(pmap, pid, profilesById, { gf: scoreFor, ga: scoreAgainst, won, draw }, row || null);
      }
    }
  }

  for (const [key, team] of teams) {
    team.players = Array.from(playerMaps.get(key)?.values() || []);
  }

  const list = Array.from(teams.values())
    .filter((team) => isDefaultBabyFootTeamRef(team.id, team.label) || isRealTeamRoster(team.rosterIds) || team.matches > 0)
    .map(finalizeTeam);
  const topTeams = [...list].filter((t) => t.matches > 0).sort((a, b) =>
    b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.avgGoalsAgainst - b.avgGoalsAgainst || a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }),
  );
  return {
    matches,
    teams: list.sort((a, b) => b.matches - a.matches || b.points - a.points || a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true })),
    topTeams,
  };
}

export { formatBabyFootRatio };
