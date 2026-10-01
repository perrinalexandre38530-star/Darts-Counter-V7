import { supabase } from './supabaseClient';
import { History } from './history';

export type ChallengeLeaderboardObjective = {
  target: string;
  rule: string;
  visits: number;
  matchMode?: string | null;
  setMode?: string | null;
  setTarget?: number | null;
  legMode?: string | null;
  legTarget?: number | null;
};

export type ChallengeLeaderboardTeam = {
  key: string;
  name: string;
  localId?: string | null;
};

export type ChallengeLeaderboardSubmit = ChallengeLeaderboardObjective & {
  score: number;
  darts: number;
  bestStreak: number;
  accuracy: number;
  matchId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  teams?: ChallengeLeaderboardTeam[];
};

export type ChallengeLeaderboardScope = {
  type: 'public' | 'team';
  teamKey?: string | null;
};

export type ChallengeLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  score: number;
  darts: number;
  bestStreak: number;
  accuracy: number;
  playedCount: number;
  updatedAt?: string | null;
};

export type ChallengeHistorySyncResult = {
  ok: boolean;
  submitted: number;
  scanned: number;
  skipped?: string;
};

const clean = (value: any, fallback = '') => String(value ?? fallback).trim();
const lower = (value: any, fallback = '') => clean(value, fallback).toLowerCase();
const int = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const num = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const unique = <T,>(items: T[]) => Array.from(new Set(items));

export function challengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  const target = lower(input.target, '20');
  const rule = lower(input.rule, 'all');
  const visits = Math.max(1, int(input.visits, 1));
  const matchMode = lower(input.matchMode, 'solo') || 'solo';
  // Ready for the future BO / FT Challenge format without invalidating the leaderboard contract.
  const setMode = lower(input.setMode, 'none') || 'none';
  const setTarget = Math.max(0, int(input.setTarget, 0));
  const legMode = lower(input.legMode, 'none') || 'none';
  const legTarget = Math.max(0, int(input.legTarget, 0));
  return `challenge:v2:${target}:${rule}:${visits}:${matchMode}:${setMode}:${setTarget}:${legMode}:${legTarget}`;
}

function legacyChallengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  const target = lower(input.target, '20');
  const rule = lower(input.rule, 'all');
  const visits = Math.max(1, int(input.visits, 1));
  return `challenge:v1:${target}:${rule}:${visits}`;
}

export function challengeTeamKey(team: any): string {
  return clean(team?.syncedClubTeamId || team?.clubTeamId || team?.onlineTeamId || team?.id);
}

function teamName(team: any): string {
  return clean(team?.name || team?.teamName || 'Équipe');
}

function isBackendMissing(error: any, marker = ''): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42883' || code === 'PGRST202' || (!!marker && message.includes(marker.toLowerCase()));
}

export async function getChallengeOnlineUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ? String(data.user.id) : null;
  } catch {
    return null;
  }
}

function linkedProfileIds(profiles: any[], uid: string): string[] {
  return (Array.isArray(profiles) ? profiles : [])
    .filter((profile: any) => {
      const pi = profile?.privateInfo || profile?.private_info || {};
      return [pi?.onlineUserId, pi?.online_user_id, pi?.userId, profile?.onlineUserId, profile?.online_user_id, profile?.userId]
        .some((value) => clean(value) === uid);
    })
    .map((profile: any) => clean(profile?.id))
    .filter(Boolean);
}

function linkedProfile(profiles: any[], uid: string): any | null {
  const ids = new Set(linkedProfileIds(profiles, uid));
  return (Array.isArray(profiles) ? profiles : []).find((p: any) => ids.has(clean(p?.id))) || null;
}

export function challengeTeamsForProfile(profile: any, teams: any[]): ChallengeLeaderboardTeam[] {
  const profileId = clean(profile?.id);
  if (!profileId) return [];
  const out = (Array.isArray(teams) ? teams : [])
    .filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.map(String).includes(profileId))
    .map((team: any) => ({ key: challengeTeamKey(team), name: teamName(team), localId: clean(team?.id) || null }))
    .filter((team: ChallengeLeaderboardTeam) => team.key);
  const seen = new Set<string>();
  return out.filter((team) => !seen.has(team.key) && !!seen.add(team.key));
}

export async function registerChallengeTeamMemberships(teams: ChallengeLeaderboardTeam[]): Promise<void> {
  const rows = (Array.isArray(teams) ? teams : []).filter((team) => clean(team?.key));
  if (!rows.length) return;
  const { error } = await supabase.rpc('ms_challenge_register_teams_v2', {
    p_teams: rows.map((team) => ({ key: clean(team.key), name: clean(team.name, 'Équipe') })),
  });
  if (error && !isBackendMissing(error, 'ms_challenge_register_teams_v2')) throw error;
}

export async function listChallengeTeamScopes(): Promise<ChallengeLeaderboardTeam[]> {
  const { data, error } = await supabase.rpc('ms_challenge_team_scopes_v2');
  if (error) {
    if (isBackendMissing(error, 'ms_challenge_team_scopes_v2')) return [];
    throw error;
  }
  return (Array.isArray(data) ? data : [])
    .map((row: any) => ({ key: clean(row?.teamKey || row?.team_key), name: clean(row?.teamName || row?.team_name, 'Équipe') }))
    .filter((row: ChallengeLeaderboardTeam) => row.key);
}

export async function submitChallengeBestScore(input: ChallengeLeaderboardSubmit): Promise<{ ok: boolean; improved?: boolean; bestScore?: number; skipped?: string }> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return { ok: false, skipped: 'AUTH_REQUIRED' };

  try {
    await supabase.rpc('ms_touch_public_profile', {
      p_display_name: input.displayName || null,
      p_avatar_url: input.avatarUrl || null,
      p_country_code: input.countryCode || null,
      p_city_label: null,
    });
  } catch {
    // Non bloquant.
  }

  const teams = (input.teams || []).filter((team) => clean(team?.key));
  const objectiveKey = challengeObjectiveKey(input);
  const { data, error } = await supabase.rpc('ms_submit_challenge_score_v2', {
    p_objective_key: objectiveKey,
    p_target: clean(input.target, '20'),
    p_rule: clean(input.rule, 'all'),
    p_visits: Math.max(1, int(input.visits, 1)),
    p_match_mode: lower(input.matchMode, 'solo') || 'solo',
    p_score: Math.max(0, int(input.score, 0)),
    p_darts: Math.max(0, int(input.darts, 0)),
    p_best_streak: Math.max(0, int(input.bestStreak, 0)),
    p_accuracy: Math.max(0, Math.min(100, num(input.accuracy, 0))),
    p_match_id: clean(input.matchId).slice(0, 160),
    p_teams: teams.map((team) => ({ key: clean(team.key), name: clean(team.name, 'Équipe') })),
  });

  if (error) {
    // Compatibilité tant que la migration V2 n'est pas encore installée.
    if (isBackendMissing(error, 'ms_submit_challenge_score_v2')) {
      const legacy = await supabase.rpc('ms_submit_challenge_score', {
        p_objective_key: legacyChallengeObjectiveKey(input),
        p_target: clean(input.target, '20'),
        p_rule: clean(input.rule, 'all'),
        p_visits: Math.max(1, int(input.visits, 1)),
        p_score: Math.max(0, int(input.score, 0)),
        p_darts: Math.max(0, int(input.darts, 0)),
        p_best_streak: Math.max(0, int(input.bestStreak, 0)),
        p_accuracy: Math.max(0, Math.min(100, num(input.accuracy, 0))),
        p_match_id: clean(input.matchId).slice(0, 160),
      });
      if (legacy.error) {
        if (isBackendMissing(legacy.error, 'ms_submit_challenge_score')) return { ok: false, skipped: 'BACKEND_NOT_INSTALLED' };
        throw legacy.error;
      }
      const legacyRow: any = Array.isArray(legacy.data) ? legacy.data[0] : legacy.data;
      return { ok: Boolean(legacyRow?.ok ?? true), improved: Boolean(legacyRow?.improved), bestScore: Number(legacyRow?.bestScore ?? legacyRow?.best_score ?? input.score) };
    }
    throw error;
  }

  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.ok ?? true),
    improved: Boolean(row?.improved ?? true),
    bestScore: Number(row?.bestScore ?? row?.best_score ?? input.score),
  };
}

export async function fetchChallengeLeaderboard(
  input: ChallengeLeaderboardObjective,
  limit = 100,
  scope: ChallengeLeaderboardScope = { type: 'public' },
): Promise<ChallengeLeaderboardRow[]> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return [];
  const scopeKey = scope.type === 'team' && clean(scope.teamKey) ? `team:${clean(scope.teamKey)}` : 'public';

  const { data, error } = await supabase.rpc('ms_challenge_leaderboard_v2', {
    p_objective_key: challengeObjectiveKey(input),
    p_scope_key: scopeKey,
    p_limit: Math.max(1, Math.min(100, int(limit, 100))),
  });

  let rows: any[] = [];
  if (error) {
    if (!isBackendMissing(error, 'ms_challenge_leaderboard_v2')) throw error;
    // V1 fallback = public uniquement, avant installation de V2.
    if (scope.type === 'team') return [];
    const legacy = await supabase.rpc('ms_challenge_leaderboard', {
      p_objective_key: legacyChallengeObjectiveKey(input),
      p_limit: Math.max(1, Math.min(100, int(limit, 100))),
    });
    if (legacy.error) {
      if (isBackendMissing(legacy.error, 'ms_challenge_leaderboard')) return [];
      throw legacy.error;
    }
    rows = Array.isArray(legacy.data) ? legacy.data : [];
  } else {
    rows = Array.isArray(data) ? data : [];
  }

  return rows.map((row: any) => ({
    rank: Number(row?.rank || 0),
    userId: clean(row?.userId || row?.user_id),
    displayName: clean(row?.displayName || row?.display_name, 'Joueur'),
    avatarUrl: row?.avatarUrl || row?.avatar_url || null,
    countryCode: row?.countryCode || row?.country_code || null,
    score: Number(row?.score || row?.bestScore || row?.best_score || 0),
    darts: Number(row?.darts || row?.bestDarts || row?.best_darts || 0),
    bestStreak: Number(row?.bestStreak || row?.best_streak || 0),
    accuracy: Number(row?.accuracy || row?.bestAccuracy || row?.best_accuracy || 0),
    playedCount: Number(row?.playedCount || row?.played_count || 1),
    updatedAt: row?.updatedAt || row?.updated_at || null,
  })).filter((row) => row.userId);
}

function historyConfig(record: any): ChallengeLeaderboardObjective {
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const config = payload?.config || record?.resume?.config || {};
  const game = record?.game || payload?.game || {};
  const summary = record?.summary || payload?.summary || {};
  const rawPlayers = summary?.perPlayer || payload?.stats?.players || payload?.finalPlayers || payload?.players || record?.players || [];
  const playerCount = Array.isArray(rawPlayers) ? rawPlayers.length : 0;
  const matchMode = clean(config?.matchMode || game?.matchMode || summary?.matchMode || (playerCount <= 1 ? 'solo' : playerCount === 2 ? 'duo' : 'multi'), 'solo');
  return {
    target: clean(config?.target || game?.target || summary?.target, '20'),
    rule: clean(config?.rule || game?.rule || summary?.rule, 'all'),
    visits: Math.max(1, int(config?.visits || game?.visits || summary?.visits, 30)),
    matchMode,
    setMode: clean(config?.setMode || game?.setMode || summary?.setMode) || null,
    setTarget: int(config?.setTarget || game?.setTarget || summary?.setTarget, 0) || null,
    legMode: clean(config?.legMode || game?.legMode || summary?.legMode) || null,
    legTarget: int(config?.legTarget || game?.legTarget || summary?.legTarget, 0) || null,
  };
}

function historyPlayerRows(record: any): any[] {
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const candidates = [
    record?.summary?.perPlayer,
    payload?.summary?.perPlayer,
    payload?.stats?.players,
    payload?.finalPlayers,
    payload?.players,
    record?.players,
  ];
  for (const rows of candidates) if (Array.isArray(rows) && rows.length) return rows;
  return [];
}

function historyRowId(row: any): string {
  return clean(row?.id || row?.playerId || row?.profileId || row?.userId || row?.user_id);
}

function historyIsFinishedChallenge(record: any): boolean {
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const kind = lower(record?.kind || record?.mode || record?.game?.mode || payload?.kind || payload?.mode || payload?.game?.mode);
  const finished = lower(record?.status) === 'finished' || record?.summary?.finished === true || payload?.summary?.finished === true || !!record?.finishedAt;
  return kind === 'challenge' && finished;
}

function avatarFromProfile(profile: any): string | null {
  return clean(profile?.avatarDataUrl || profile?.photoDataUrl || profile?.avatarUrl || profile?.photoUrl || profile?.avatar || profile?.imageUrl) || null;
}

/**
 * Backfills finished Challenge matches already present in local History.
 * This is what makes matches played BEFORE the leaderboard patch appear online.
 * Server V2 submissions are idempotent per match id, so reopening the ranking cannot duplicate a game.
 */
export async function syncChallengeHistoricalScores(profiles: any[], teams: any[]): Promise<ChallengeHistorySyncResult> {
  const uid = await getChallengeOnlineUserId();
  if (!uid) return { ok: false, submitted: 0, scanned: 0, skipped: 'AUTH_REQUIRED' };
  const profile = linkedProfile(profiles, uid);
  if (!profile) return { ok: false, submitted: 0, scanned: 0, skipped: 'NO_LINKED_PROFILE' };
  const profileIds = new Set(linkedProfileIds(profiles, uid));
  const myTeams = challengeTeamsForProfile(profile, teams);
  try { await registerChallengeTeamMemberships(myTeams); } catch {}

  const history = await History.getAll();
  const challengeRows = history.filter(historyIsFinishedChallenge);
  let submitted = 0;
  for (const record of challengeRows) {
    const rows = historyPlayerRows(record);
    let row = rows.find((candidate: any) => profileIds.has(historyRowId(candidate)));
    if (!row && rows.length === 1) {
      const headerPlayers = Array.isArray(record?.players) ? record.players : [];
      if (headerPlayers.some((candidate: any) => profileIds.has(historyRowId(candidate)))) row = rows[0];
    }
    if (!row) continue;
    const config = historyConfig(record);
    const matchId = clean(record?.matchId || record?.id || record?.resumeId);
    if (!matchId) continue;
    const score = Math.max(0, int(row?.score ?? row?.points ?? row?.bestScore ?? row?.best, 0));
    const darts = Math.max(0, int(row?.darts ?? row?.dartsThrown ?? row?.hitSummary?.darts, 0));
    const bestStreak = Math.max(0, int(row?.bestStreak ?? row?.special?.bestStreak, 0));
    const accuracy = Math.max(0, Math.min(100, num(row?.successRate ?? row?.accuracy ?? row?.accuracyPct ?? row?.special?.successRate, 0)));
    const pi = profile?.privateInfo || profile?.private_info || {};
    try {
      const result = await submitChallengeBestScore({
        ...config,
        score,
        darts,
        bestStreak,
        accuracy,
        matchId,
        displayName: clean(profile?.name || profile?.nickname || row?.name, 'Joueur'),
        avatarUrl: avatarFromProfile(profile),
        countryCode: clean(profile?.countryCode || profile?.country || pi?.countryCode || pi?.country) || null,
        teams: myTeams,
      });
      if (result.ok) submitted += 1;
    } catch (error) {
      console.warn('[challenge] historical leaderboard backfill failed', matchId, error);
    }
  }
  return { ok: true, submitted, scanned: challengeRows.length };
}
