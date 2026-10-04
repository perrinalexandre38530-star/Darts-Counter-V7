import { supabase } from './supabaseClient';
import { History } from './history';
import {
  fetchChallengeLeaderboardCloud,
  fetchChallengeLeaderboardDetailCloud,
  submitChallengeScoreCloud,
} from './challengeCloudflareApi';

export type ChallengeLeaderboardObjective = {
  target: string;
  rule: string;
  visits: number;
  // Conservé pour compatibilité des anciens appels, mais volontairement ignoré
  // dans la clé V3 : une performance individuelle reste comparable en solo/duo/multi.
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
  official?: boolean;
  organizationId?: string | null;
  organizationName?: string | null;
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
  stats?: any;
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
  matchId?: string | null;
  detailAvailable?: boolean;
};

export type ChallengeLeaderboardDetail = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  score: number;
  darts: number;
  bestStreak: number;
  accuracy: number;
  matchId?: string | null;
  target: string;
  rule: string;
  visits: number;
  updatedAt?: string | null;
  stats: any;
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

/**
 * V3 : seules les règles qui changent réellement la difficulté/quantité de tirs
 * entrent dans la clé. SOLO / DUO / MULTI n'y figurent plus : la performance
 * est individuelle et doit rester comparable entre ces formats.
 */
export function challengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  const target = lower(input.target, '20');
  const rule = lower(input.rule, 'all');
  const visits = Math.max(1, int(input.visits, 1));
  const setMode = lower(input.setMode, 'none') || 'none';
  const setTarget = Math.max(0, int(input.setTarget, 0));
  const legMode = lower(input.legMode, 'none') || 'none';
  const legTarget = Math.max(0, int(input.legTarget, 0));
  return `challenge:v3:${target}:${rule}:${visits}:${setMode}:${setTarget}:${legMode}:${legTarget}`;
}

function v2ChallengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  const target = lower(input.target, '20');
  const rule = lower(input.rule, 'all');
  const visits = Math.max(1, int(input.visits, 1));
  const matchMode = lower(input.matchMode, 'solo') || 'solo';
  const setMode = lower(input.setMode, 'none') || 'none';
  const setTarget = Math.max(0, int(input.setTarget, 0));
  const legMode = lower(input.legMode, 'none') || 'none';
  const legTarget = Math.max(0, int(input.legTarget, 0));
  return `challenge:v2:${target}:${rule}:${visits}:${matchMode}:${setMode}:${setTarget}:${legMode}:${legTarget}`;
}

function legacyChallengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  return `challenge:v1:${lower(input.target, '20')}:${lower(input.rule, 'all')}:${Math.max(1, int(input.visits, 1))}`;
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

function normalizeLeaderboardRows(rows: any[]): ChallengeLeaderboardRow[] {
  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
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
    matchId: row?.matchId || row?.match_id || null,
    detailAvailable: Boolean(row?.detailAvailable ?? row?.detail_available ?? row?.statsAvailable ?? row?.stats_available),
  })).filter((row) => row.userId);
}

function challengeRowIsBetter(next: ChallengeLeaderboardRow, current: ChallengeLeaderboardRow): boolean {
  if (next.score !== current.score) return next.score > current.score;
  if (next.accuracy !== current.accuracy) return next.accuracy > current.accuracy;
  if (next.bestStreak !== current.bestStreak) return next.bestStreak > current.bestStreak;
  if (next.darts !== current.darts) return next.darts < current.darts;
  if (Boolean(next.detailAvailable) !== Boolean(current.detailAvailable)) return Boolean(next.detailAvailable);
  return String(next.updatedAt || '') < String(current.updatedAt || '');
}

/**
 * Les migrations V1/V2 utilisaient des clés différentes. Après le passage à
 * la clé V3 (qui ne sépare plus SOLO/DUO/MULTI), les anciennes lignes ne
 * doivent surtout pas disparaître du classement. On fusionne donc les sources
 * par compte et on recalcule le rang à partir du meilleur score réellement
 * disponible.
 */
function mergeChallengeLeaderboardRows(groups: ChallengeLeaderboardRow[][], limit: number): ChallengeLeaderboardRow[] {
  const byUser = new Map<string, ChallengeLeaderboardRow>();
  for (const rows of groups) {
    for (const row of rows) {
      const previous = byUser.get(row.userId);
      if (!previous) {
        byUser.set(row.userId, { ...row });
        continue;
      }
      const playedCount = Math.max(previous.playedCount || 1, row.playedCount || 1);
      if (challengeRowIsBetter(row, previous)) byUser.set(row.userId, { ...row, playedCount });
      else byUser.set(row.userId, { ...previous, playedCount });
    }
  }
  return [...byUser.values()]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || b.bestStreak - a.bestStreak || a.darts - b.darts || String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
    .slice(0, Math.max(1, Math.min(100, int(limit, 100))))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getChallengeOnlineUserId(): Promise<string | null> {
  // Ne dépend pas d'un aller-retour réseau pour savoir si le compte EST connecté.
  // Le Worker Cloudflare revalide de toute façon le JWT côté serveur. Sur Android,
  // getUser() pouvait échouer transitoirement alors qu'une session locale valide
  // existait encore : la partie était alors silencieusement ignorée par ONLINE.
  try {
    const { data } = await supabase.auth.getSession();
    const sessionUid = clean(data?.session?.user?.id);
    if (sessionUid) return sessionUid;
  } catch {}

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return clean(data?.user?.id) || null;
  } catch {
    return null;
  }
}

function profileOnlineIdentityValues(profile: any): string[] {
  const pi = profile?.privateInfo || profile?.private_info || {};
  return [
    pi?.onlineUserId,
    pi?.online_user_id,
    pi?.userId,
    pi?.user_id,
    pi?.accountUserId,
    profile?.onlineUserId,
    profile?.online_user_id,
    profile?.userId,
    profile?.user_id,
    profile?.linkedUserId,
    profile?.linked_user_id,
    profile?.accountUserId,
    profile?.account_user_id,
  ].map((value) => clean(value)).filter(Boolean);
}

/**
 * V7 crée un profil compte dédié avec `profile.id === auth.user.id`.
 * Cette égalité est donc une preuve de liaison aussi forte que privateInfo.onlineUserId.
 * Elle ne doit pas être confondue avec un profil local arbitraire.
 */
export function isChallengeProfileLinkedToUser(profile: any, uid: string): boolean {
  const wanted = clean(uid);
  if (!wanted || !profile) return false;
  if (clean(profile?.id) === wanted) return true;
  return profileOnlineIdentityValues(profile).some((value) => value === wanted);
}

function linkedProfileIds(profiles: any[], uid: string): string[] {
  const wanted = clean(uid);
  const out = new Set<string>();
  for (const profile of (Array.isArray(profiles) ? profiles : [])) {
    if (!isChallengeProfileLinkedToUser(profile, wanted)) continue;
    for (const value of [profile?.id, profile?.profileId, profile?.playerId]) {
      const id = clean(value);
      if (id) out.add(id);
    }
  }
  // Les records récents peuvent déjà avoir été écrits directement avec le uid.
  if (wanted) out.add(wanted);
  return [...out];
}

function linkedProfile(profiles: any[], uid: string): any | null {
  return (Array.isArray(profiles) ? profiles : []).find((profile: any) => isChallengeProfileLinkedToUser(profile, uid)) || null;
}

/** Équipes locales : utiles pour le gameplay, mais NON officielles pour le classement privé sécurisé. */
export function challengeTeamsForProfile(profile: any, teams: any[]): ChallengeLeaderboardTeam[] {
  const profileId = clean(profile?.id);
  if (!profileId) return [];
  const out = (Array.isArray(teams) ? teams : [])
    .filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.map(String).includes(profileId))
    .map((team: any) => ({ key: challengeTeamKey(team), name: teamName(team), localId: clean(team?.id) || null, official: false }))
    .filter((team: ChallengeLeaderboardTeam) => team.key);
  const seen = new Set<string>();
  return out.filter((team) => !seen.has(team.key) && !!seen.add(team.key));
}

/**
 * Ancien mécanisme V2 gardé uniquement pour compatibilité serveur. En V3 les
 * classements privés utilisent exclusivement les affectations Organisation.
 */
export async function registerChallengeTeamMemberships(teams: ChallengeLeaderboardTeam[]): Promise<void> {
  const rows = (Array.isArray(teams) ? teams : []).filter((team) => clean(team?.key));
  if (!rows.length) return;
  const { error } = await supabase.rpc('ms_challenge_register_teams_v2', {
    p_teams: rows.map((team) => ({ key: clean(team.key), name: clean(team.name, 'Équipe') })),
  });
  if (error && !isBackendMissing(error, 'ms_challenge_register_teams_v2')) throw error;
}

/**
 * V3 retourne uniquement les équipes OFFICIELLES : groupe/équipe d'une
 * Organisation MSS + affectation active du compte dans Supabase.
 */
export async function listChallengeTeamScopes(): Promise<ChallengeLeaderboardTeam[]> {
  const v3 = await supabase.rpc('ms_challenge_official_team_scopes_v3');
  if (!v3.error) {
    return (Array.isArray(v3.data) ? v3.data : [])
      .map((row: any) => ({
        key: clean(row?.teamKey || row?.team_key),
        name: clean(row?.teamName || row?.team_name, 'Équipe'),
        official: true,
        organizationId: clean(row?.organizationId || row?.organization_id) || null,
        organizationName: clean(row?.organizationName || row?.organization_name) || null,
      }))
      .filter((row: ChallengeLeaderboardTeam) => row.key);
  }
  if (!isBackendMissing(v3.error, 'ms_challenge_official_team_scopes_v3')) throw v3.error;

  // Fallback V2 (anciens serveurs) : on marque explicitement ces scopes non officiels.
  const { data, error } = await supabase.rpc('ms_challenge_team_scopes_v2');
  if (error) {
    if (isBackendMissing(error, 'ms_challenge_team_scopes_v2')) return [];
    throw error;
  }
  return (Array.isArray(data) ? data : [])
    .map((row: any) => ({ key: clean(row?.teamKey || row?.team_key), name: clean(row?.teamName || row?.team_name, 'Équipe'), official: false }))
    .filter((row: ChallengeLeaderboardTeam) => row.key);
}

export async function submitChallengeBestScore(input: ChallengeLeaderboardSubmit): Promise<{ ok: boolean; improved?: boolean; bestScore?: number; skipped?: string }> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return { ok: false, skipped: 'AUTH_REQUIRED' };

  // Cloudflare D1/R2 devient la source principale. Tant que le binding D1 n'est
  // pas activé sur Pages, on retombe proprement sur l'ancien backend Supabase.
  try {
    const cloud = await submitChallengeScoreCloud(input);
    if (cloud.available && cloud.data?.ok) {
      return {
        ok: true,
        improved: Boolean(cloud.data?.improved),
        bestScore: Number(cloud.data?.bestScore ?? input.score),
      };
    }
  } catch (error) {
    console.warn('[challenge] Cloudflare submit failed, Supabase fallback enabled', error);
  }

  try {
    await supabase.rpc('ms_touch_public_profile', {
      p_display_name: input.displayName || null,
      p_avatar_url: input.avatarUrl || null,
      p_country_code: input.countryCode || null,
      p_city_label: null,
    });
  } catch {}

  const objectiveKey = challengeObjectiveKey(input);
  const v3 = await supabase.rpc('ms_submit_challenge_score_v3', {
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
    p_stats: input.stats && typeof input.stats === 'object' ? input.stats : {},
  });

  if (!v3.error) {
    const row: any = Array.isArray(v3.data) ? v3.data[0] : v3.data;
    return { ok: Boolean(row?.ok ?? true), improved: Boolean(row?.improved ?? true), bestScore: Number(row?.bestScore ?? row?.best_score ?? input.score) };
  }
  if (!isBackendMissing(v3.error, 'ms_submit_challenge_score_v3')) throw v3.error;

  // Fallback V2 : compatible tant que la migration V3 n'est pas installée.
  const teams = (input.teams || []).filter((team) => clean(team?.key));
  const { data, error } = await supabase.rpc('ms_submit_challenge_score_v2', {
    p_objective_key: v2ChallengeObjectiveKey(input),
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
  return { ok: Boolean(row?.ok ?? true), improved: Boolean(row?.improved ?? true), bestScore: Number(row?.bestScore ?? row?.best_score ?? input.score) };
}

export async function fetchChallengeLeaderboard(
  input: ChallengeLeaderboardObjective,
  limit = 100,
  scope: ChallengeLeaderboardScope = { type: 'public' },
): Promise<ChallengeLeaderboardRow[]> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return [];
  const scopeKey = scope.type === 'team' && clean(scope.teamKey) ? `official:${clean(scope.teamKey)}` : 'public';
  const groups: ChallengeLeaderboardRow[][] = [];

  let cloudAvailable = false;
  let cloudRows: ChallengeLeaderboardRow[] = [];
  try {
    const cloud = await fetchChallengeLeaderboardCloud(input, Math.max(1, Math.min(100, int(limit, 100))), scope);
    if (cloud.available) {
      cloudAvailable = true;
      const payload: any = cloud.data || {};
      cloudRows = normalizeLeaderboardRows(Array.isArray(payload?.rows) ? payload.rows : []);
      if (cloudRows.length) groups.push(cloudRows);
    }
  } catch (error) {
    console.warn('[challenge] Cloudflare leaderboard read failed, Supabase fallback enabled', error);
  }

  // D1 est la source principale. MAIS pendant la migration, une réponse D1 vide
  // ne doit jamais masquer un classement Supabase qui contenait déjà des joueurs.
  // Dès qu'au moins une ligne D1 existe pour cette configuration, on reste 100% D1.
  if (cloudAvailable && cloudRows.length > 0) return mergeChallengeLeaderboardRows(groups, limit);

  const v3 = await supabase.rpc('ms_challenge_leaderboard_v3', {
    p_objective_key: challengeObjectiveKey(input),
    p_scope_key: scopeKey,
    p_limit: Math.max(1, Math.min(100, int(limit, 100))),
  });

  if (!v3.error) groups.push(normalizeLeaderboardRows(Array.isArray(v3.data) ? v3.data : []));
  else if (!isBackendMissing(v3.error, 'ms_challenge_leaderboard_v3')) throw v3.error;

  if (scope.type === 'public') {
    // Compatibilité : V2 séparait encore SOLO / DUO / DUEL / MULTI. On lit les
    // quatre anciennes clés et on les refusionne dans le même classement
    // individuel, sinon les joueurs historiques disparaissent après migration V3.
    for (const matchMode of ['solo', 'duo', 'duel', 'multi']) {
      const v2 = await supabase.rpc('ms_challenge_leaderboard_v2', {
        p_objective_key: v2ChallengeObjectiveKey({ ...input, matchMode }),
        p_scope_key: 'public',
        p_limit: Math.max(1, Math.min(100, int(limit, 100))),
      });
      if (!v2.error) groups.push(normalizeLeaderboardRows(Array.isArray(v2.data) ? v2.data : []));
      else if (!isBackendMissing(v2.error, 'ms_challenge_leaderboard_v2')) console.warn('[challenge] legacy V2 leaderboard read failed', matchMode, v2.error);
    }

    const legacy = await supabase.rpc('ms_challenge_leaderboard', {
      p_objective_key: legacyChallengeObjectiveKey(input),
      p_limit: Math.max(1, Math.min(100, int(limit, 100))),
    });
    if (!legacy.error) groups.push(normalizeLeaderboardRows(Array.isArray(legacy.data) ? legacy.data : []));
    else if (!isBackendMissing(legacy.error, 'ms_challenge_leaderboard')) console.warn('[challenge] legacy V1 leaderboard read failed', legacy.error);
  } else if (v3.error && isBackendMissing(v3.error, 'ms_challenge_leaderboard_v3')) {
    // Ancien backend V2 : uniquement en secours. Les classements privés V3
    // restent prioritaires car ils valident l'appartenance Organisation côté serveur.
    const legacyScopeKey = clean(scope.teamKey) ? `team:${clean(scope.teamKey)}` : 'public';
    for (const matchMode of ['solo', 'duo', 'duel', 'multi']) {
      const v2 = await supabase.rpc('ms_challenge_leaderboard_v2', {
        p_objective_key: v2ChallengeObjectiveKey({ ...input, matchMode }),
        p_scope_key: legacyScopeKey,
        p_limit: Math.max(1, Math.min(100, int(limit, 100))),
      });
      if (!v2.error) groups.push(normalizeLeaderboardRows(Array.isArray(v2.data) ? v2.data : []));
    }
  }

  return mergeChallengeLeaderboardRows(groups, limit);
}

export async function fetchChallengeLeaderboardDetail(
  input: ChallengeLeaderboardObjective,
  userId: string,
  scope: ChallengeLeaderboardScope = { type: 'public' },
): Promise<ChallengeLeaderboardDetail | null> {
  if (!clean(userId)) return null;

  try {
    const cloud = await fetchChallengeLeaderboardDetailCloud(input, clean(userId), scope);
    if (cloud.available) {
      const payload: any = cloud.data || {};
      const row: any = payload?.detail || null;
      if (!row) return null;
      return {
        userId: clean(row?.userId || row?.user_id),
        displayName: clean(row?.displayName || row?.display_name, 'Joueur'),
        avatarUrl: row?.avatarUrl || row?.avatar_url || null,
        countryCode: row?.countryCode || row?.country_code || null,
        score: Number(row?.score || 0),
        darts: Number(row?.darts || 0),
        bestStreak: Number(row?.bestStreak || row?.best_streak || 0),
        accuracy: Number(row?.accuracy || 0),
        matchId: row?.matchId || row?.match_id || null,
        target: clean(row?.target, input.target),
        rule: clean(row?.rule, input.rule),
        visits: Math.max(1, int(row?.visits, input.visits)),
        updatedAt: row?.updatedAt || row?.updated_at || null,
        stats: row?.stats || row?.statsPayload || row?.stats_payload || {},
      };
    }
  } catch (error) {
    console.warn('[challenge] Cloudflare detail read failed, Supabase fallback enabled', error);
  }

  const scopeKey = scope.type === 'team' && clean(scope.teamKey) ? `official:${clean(scope.teamKey)}` : 'public';
  const { data, error } = await supabase.rpc('ms_challenge_score_detail_v3', {
    p_objective_key: challengeObjectiveKey(input),
    p_scope_key: scopeKey,
    p_user_id: clean(userId),
  });
  if (error) {
    if (isBackendMissing(error, 'ms_challenge_score_detail_v3')) return null;
    throw error;
  }
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    userId: clean(row?.userId || row?.user_id),
    displayName: clean(row?.displayName || row?.display_name, 'Joueur'),
    avatarUrl: row?.avatarUrl || row?.avatar_url || null,
    countryCode: row?.countryCode || row?.country_code || null,
    score: Number(row?.score || 0),
    darts: Number(row?.darts || 0),
    bestStreak: Number(row?.bestStreak || row?.best_streak || 0),
    accuracy: Number(row?.accuracy || 0),
    matchId: row?.matchId || row?.match_id || null,
    target: clean(row?.target, input.target),
    rule: clean(row?.rule, input.rule),
    visits: Math.max(1, int(row?.visits, input.visits)),
    updatedAt: row?.updatedAt || row?.updated_at || null,
    stats: row?.stats || row?.statsPayload || row?.stats_payload || {},
  };
}

function historyPlayerRows(record: any): any[] {
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const candidates = [record?.summary?.perPlayer, payload?.summary?.perPlayer, payload?.stats?.players, payload?.finalPlayers, payload?.players, record?.players];
  for (const rows of candidates) if (Array.isArray(rows) && rows.length) return rows;
  return [];
}

function historyRowIdentityValues(row: any): string[] {
  return [
    row?.id,
    row?.playerId,
    row?.player_id,
    row?.profileId,
    row?.profile_id,
    row?.userId,
    row?.user_id,
    row?.onlineUserId,
    row?.online_user_id,
    row?.linkedUserId,
    row?.linked_user_id,
    row?.accountUserId,
    row?.account_user_id,
  ].map((value) => clean(value)).filter(Boolean);
}

function historyRowId(row: any): string {
  return historyRowIdentityValues(row)[0] || '';
}

function historyRowMatchesProfileIds(row: any, profileIds: Set<string>): boolean {
  if (!profileIds.size) return false;
  return historyRowIdentityValues(row).some((value) => profileIds.has(value));
}

function historyConfig(record: any): ChallengeLeaderboardObjective {
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const config = payload?.config || record?.resume?.config || {};
  const game = record?.game || payload?.game || {};
  const summary = record?.summary || payload?.summary || {};
  const rawPlayers = historyPlayerRows(record);
  const playerCount = rawPlayers.length;
  const explicitVisits = int(config?.visits || game?.visits || summary?.visits, 0);
  const inferredDarts = rawPlayers.reduce((best: number, row: any) => Math.max(best, int(row?.darts ?? row?.dartsThrown ?? row?.hitSummary?.darts, 0)), 0);
  const inferredVisits = inferredDarts > 0 ? Math.max(1, Math.ceil(inferredDarts / 3)) : 0;
  const firstPlayer = rawPlayers[0] || {};
  const special = firstPlayer?.special || firstPlayer?.stats?.special || {};
  return {
    target: clean(config?.target || game?.target || summary?.target || firstPlayer?.target || special?.target, '20'),
    rule: clean(config?.rule || game?.rule || summary?.rule || firstPlayer?.rule || special?.rule, 'all'),
    visits: Math.max(1, explicitVisits || inferredVisits || 30),
    matchMode: clean(config?.matchMode || game?.matchMode || summary?.matchMode || (playerCount <= 1 ? 'solo' : playerCount === 2 ? 'duo' : 'multi'), 'solo'),
    setMode: clean(config?.setMode || game?.setMode || summary?.setMode) || null,
    setTarget: int(config?.setTarget || game?.setTarget || summary?.setTarget, 0) || null,
    legMode: clean(config?.legMode || game?.legMode || summary?.legMode) || null,
    legTarget: int(config?.legTarget || game?.legTarget || summary?.legTarget, 0) || null,
  };
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

const historyHitValue = (hit: string) => hit === 'S' ? 1 : hit === 'D' ? 2 : hit === 'T' ? 3 : hit === '25' ? 1 : hit === '50' ? 2 : 0;

function historyStatsPayload(record: any, row: any) {
  const hitSummary = row?.hitSummary || row?.stats?.hitSummary || {};
  const payload = record?.payload || record?.decoded || record?.resume?.livePayload || {};
  const state = payload?.state || payload?.snapshot || record?.resume?.state || {};
  const sourceEntries = Array.isArray(payload?.entries)
    ? payload.entries
    : Array.isArray(state?.entries)
      ? state.entries
      : Array.isArray(state?.log)
        ? state.log
        : Array.isArray(payload?.events)
          ? payload.events
          : Array.isArray(record?.entries)
            ? record.entries
            : [];
  const rowId = historyRowId(row);
  const rows = historyPlayerRows(record);
  const onePlayer = rows.length <= 1;
  const validHits = new Set(['S','D','T','25','50','MISS']);
  const entries = sourceEntries
    .filter((entry: any) => {
      if (!entry) return false;
      const hit = clean(entry?.hit).toUpperCase();
      if (!validHits.has(hit)) return false;
      if (onePlayer) return true;
      const entryId = clean(entry?.pid || entry?.playerId || entry?.profileId || entry?.userId || entry?.user_id);
      return !!rowId && entryId === rowId;
    })
    .map((entry: any) => ({ hit: clean(entry?.hit).toUpperCase(), pid: rowId || clean(entry?.pid || entry?.playerId || entry?.profileId) || 'player' }));

  const derivedHitCounts = { S: 0, D: 0, T: 0, '25': 0, '50': 0, MISS: 0 } as Record<string, number>;
  for (const entry of entries) derivedHitCounts[entry.hit] = (derivedHitCounts[entry.hit] || 0) + 1;

  let running = 0;
  let bestStreakDerived = 0;
  for (const entry of entries) {
    if (entry.hit !== 'MISS') {
      running += 1;
      bestStreakDerived = Math.max(bestStreakDerived, running);
    } else running = 0;
  }

  const visitScoresDerived: number[] = [];
  for (let i = 0; i < entries.length; i += 3) {
    visitScoresDerived.push(entries.slice(i, i + 3).reduce((sum: number, entry: any) => sum + historyHitValue(entry.hit), 0));
  }
  let cumulative = 0;
  const cumulativeScoresDerived = visitScoresDerived.map(value => (cumulative += value));
  const positionStatsDerived = [0,1,2].map(index => {
    const bucket = { position: index + 1, attempts: 0, successful: 0, accuracy: 0, S: 0, D: 0, T: 0, B25: 0, B50: 0, MISS: 0 };
    entries.forEach((entry: any, entryIndex: number) => {
      if (entryIndex % 3 !== index) return;
      bucket.attempts += 1;
      if (entry.hit !== 'MISS') bucket.successful += 1;
      if (entry.hit === 'S') bucket.S += 1;
      else if (entry.hit === 'D') bucket.D += 1;
      else if (entry.hit === 'T') bucket.T += 1;
      else if (entry.hit === '25') bucket.B25 += 1;
      else if (entry.hit === '50') bucket.B50 += 1;
      else bucket.MISS += 1;
    });
    bucket.accuracy = bucket.attempts ? Math.round((bucket.successful / bucket.attempts) * 1000) / 10 : 0;
    return bucket;
  });

  const storedCounts = {
    S: int(hitSummary?.S ?? hitSummary?.single, 0),
    D: int(hitSummary?.D ?? hitSummary?.double, 0),
    T: int(hitSummary?.T ?? hitSummary?.triple, 0),
    '25': int(hitSummary?.SBull ?? hitSummary?.['25'], 0),
    '50': int(hitSummary?.DBull ?? hitSummary?.['50'], 0),
    MISS: int(hitSummary?.MISS ?? hitSummary?.miss ?? row?.misses, 0),
  };
  const storedCountTotal = Object.values(storedCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const hitCounts = entries.length && storedCountTotal === 0 ? derivedHitCounts : storedCounts;
  const storedPositionStats = Array.isArray(row?.positionStats) ? row.positionStats : Array.isArray(row?.special?.positionStats) ? row.special.positionStats : [];
  const storedVisitScores = Array.isArray(row?.visitScores) ? row.visitScores : [];
  const storedCumulativeScores = Array.isArray(row?.cumulativeScores) ? row.cumulativeScores : [];
  const darts = Math.max(0, int(row?.darts ?? row?.dartsThrown ?? hitSummary?.darts, entries.length));
  const successfulDerived = entries.filter((entry: any) => entry.hit !== 'MISS').length;
  const accuracyDerived = entries.length ? Math.round((successfulDerived / entries.length) * 1000) / 10 : 0;
  const scoreStored = Math.max(0, int(row?.score ?? row?.points ?? row?.bestScore ?? row?.best, 0));
  const scoreDerived = entries.reduce((sum: number, entry: any) => sum + historyHitValue(entry.hit), 0);
  const bestVisitStored = num(row?.bestVisit ?? row?.special?.bestVisit ?? row?.stats?.bestVisit, 0);
  const avgVisitStored = num(row?.avgVisit ?? row?.special?.avgVisit ?? row?.stats?.avgVisit, 0);
  const bestStreakStored = Math.max(0, int(row?.bestStreak ?? row?.special?.bestStreak, 0));
  const accuracyStored = Math.max(0, Math.min(100, num(row?.successRate ?? row?.accuracy ?? row?.accuracyPct ?? row?.special?.successRate, 0)));

  const hitStreaks: Record<string, number> = { S: 0, D: 0, T: 0, '25': 0, '50': 0, MISS: 0 };
  for (const hit of ['S','D','T','25','50','MISS']) {
    let best = 0;
    let run = 0;
    for (const entry of entries) {
      if (entry.hit === hit) { run += 1; best = Math.max(best, run); }
      else run = 0;
    }
    hitStreaks[hit] = best;
  }
  let hitVisitStreak = 0;
  let visitRun = 0;
  for (let i = 0; i < entries.length; i += 3) {
    if (entries.slice(i, i + 3).some((entry: any) => entry.hit !== 'MISS')) { visitRun += 1; hitVisitStreak = Math.max(hitVisitStreak, visitRun); }
    else visitRun = 0;
  }
  const hitPct = Object.fromEntries(Object.entries(hitCounts).map(([hit, count]) => [hit, darts ? Number(count || 0) / darts * 100 : 0]));

  return {
    bestVisit: bestVisitStored || (visitScoresDerived.length ? Math.max(...visitScoresDerived) : 0),
    avgVisit: avgVisitStored || (visitScoresDerived.length ? scoreDerived / visitScoresDerived.length : 0),
    hitCounts,
    hitStreaks,
    hitVisitStreak,
    hitPct,
    firstNine: entries.slice(0, 9).reduce((sum: number, entry: any) => sum + historyHitValue(entry.hit), 0),
    positionStats: storedPositionStats.length ? storedPositionStats : positionStatsDerived,
    visitScores: storedVisitScores.length ? storedVisitScores : visitScoresDerived,
    cumulativeScores: storedCumulativeScores.length ? storedCumulativeScores : cumulativeScoresDerived,
    entries,
    score: scoreStored || scoreDerived,
    darts: darts || entries.length,
    bestStreak: bestStreakStored || bestStreakDerived,
    accuracy: accuracyStored || accuracyDerived,
  };
}

/**
 * Pour le compte connecté, tente de réhydrater une ancienne ligne Online avec
 * les fléchettes exactes encore présentes dans l'Historique local. Cela permet
 * d'ouvrir exactement le même panneau STATS DÉTAILLÉES que ChallengePlay,
 * même si l'ancien score Supabase ne contenait qu'un résumé.
 */
export async function enrichChallengeLeaderboardDetailFromHistory(
  detail: ChallengeLeaderboardDetail,
  profiles: any[],
): Promise<ChallengeLeaderboardDetail> {
  const uid = await getChallengeOnlineUserId();
  const wantedMatchId = clean(detail?.matchId);
  const wantedName = lower(detail?.displayName);
  const profileIds = new Set(uid ? linkedProfileIds(profiles, uid) : []);

  const history = await History.getAll();
  const matches = history
    .filter(historyIsFinishedChallenge)
    .filter((record: any) => {
      const recordMatchId = clean(record?.matchId || record?.id || record?.resumeId);
      if (wantedMatchId && recordMatchId === wantedMatchId) return true;
      const cfg = historyConfig(record);
      return clean(cfg.target) === clean(detail.target)
        && clean(cfg.rule) === clean(detail.rule)
        && int(cfg.visits) === int(detail.visits);
    })
    .map((record: any) => {
      const rows = historyPlayerRows(record);
      const recordMatchId = clean(record?.matchId || record?.id || record?.resumeId);
      let row = rows.find((candidate: any) => historyRowMatchesProfileIds(candidate, profileIds)) || null;

      if (!row && wantedMatchId && recordMatchId === wantedMatchId) {
        row = rows.find((candidate: any) => lower(candidate?.name || candidate?.displayName) === wantedName) || (rows.length === 1 ? rows[0] : null);
      }
      if (!row && wantedName) {
        row = rows.find((candidate: any) => lower(candidate?.name || candidate?.displayName) === wantedName) || null;
      }
      if (!row && rows.length === 1 && uid && clean(detail?.userId) === uid) row = rows[0];
      if (!row) return null;

      const score = Math.max(0, int(row?.score ?? row?.points ?? row?.bestScore ?? row?.best, 0));
      if (score !== int(detail.score)) return null;
      const stats = historyStatsPayload(record, row);
      return { record, row, stats, exactMatchId: recordMatchId === wantedMatchId };
    })
    .filter(Boolean) as Array<{record:any;row:any;stats:any;exactMatchId:boolean}>;

  if (!matches.length) return detail;
  matches.sort((a,b) => Number(b.exactMatchId)-Number(a.exactMatchId) || Number(b.stats?.entries?.length||0)-Number(a.stats?.entries?.length||0));
  const best = matches[0];
  return {
    ...detail,
    stats: {
      ...(detail.stats && typeof detail.stats === 'object' ? detail.stats : {}),
      ...best.stats,
    },
  };
}

/**
 * Retrouve la partie locale exacte correspondant à une performance Online du
 * compte connecté. Le but n'est pas de reconstruire une pseudo-fiche à partir
 * d'agrégats Supabase : quand la partie existe encore dans History, on réouvre
 * directement le même record que depuis la page Historique. ChallengePlay peut
 * alors afficher STRICTEMENT le même panneau STATS DÉTAILLÉES.
 */
export async function findChallengeHistoryRecordForLeaderboardDetail(
  detail: ChallengeLeaderboardDetail,
  profiles: any[],
): Promise<{ record: any; playerId: string } | null> {
  const uid = await getChallengeOnlineUserId();
  const profileIds = new Set(uid ? linkedProfileIds(profiles, uid) : []);
  const wantedMatchId = clean(detail?.matchId);
  const wantedName = lower(detail?.displayName);
  const history = await History.getAll();

  const candidates = history
    .filter(historyIsFinishedChallenge)
    .filter((record: any) => {
      const recordMatchId = clean(record?.matchId || record?.id || record?.resumeId);
      if (wantedMatchId && recordMatchId === wantedMatchId) return true;
      const cfg = historyConfig(record);
      return clean(cfg.target) === clean(detail.target)
        && clean(cfg.rule) === clean(detail.rule)
        && int(cfg.visits) === int(detail.visits);
    })
    .map((record: any) => {
      const rows = historyPlayerRows(record);
      const recordMatchId = clean(record?.matchId || record?.id || record?.resumeId);
      let row = rows.find((candidate: any) => historyRowMatchesProfileIds(candidate, profileIds)) || null;

      // Anciennes sauvegardes : le lien profil Online n'était pas toujours
      // présent. Un matchId exact reste un identifiant suffisamment fort pour
      // retrouver la ligne du joueur sans inventer de données.
      if (!row && wantedMatchId && recordMatchId === wantedMatchId) {
        row = rows.find((candidate: any) => lower(candidate?.name || candidate?.displayName) === wantedName) || (rows.length === 1 ? rows[0] : null);
      }
      if (!row && wantedName) {
        row = rows.find((candidate: any) => lower(candidate?.name || candidate?.displayName) === wantedName) || null;
      }
      if (!row && rows.length === 1 && uid && clean(detail?.userId) === uid) row = rows[0];
      if (!row && rows.length === 1 && lower(rows[0]?.name || rows[0]?.displayName) === wantedName) row = rows[0];
      if (!row) return null;

      const score = Math.max(0, int(row?.score ?? row?.points ?? row?.bestScore ?? row?.best, 0));
      if (score !== int(detail.score)) return null;
      const stats = historyStatsPayload(record, row);
      return {
        record,
        playerId: historyRowId(row),
        exactMatchId: Boolean(wantedMatchId && recordMatchId === wantedMatchId),
        entryCount: Array.isArray(stats?.entries) ? stats.entries.length : 0,
      };
    })
    .filter(Boolean) as Array<{record:any;playerId:string;exactMatchId:boolean;entryCount:number}>;

  if (!candidates.length) return null;
  candidates.sort((a, b) => Number(b.exactMatchId) - Number(a.exactMatchId) || b.entryCount - a.entryCount);
  const best = candidates[0];
  return best?.entryCount > 0 ? { record: best.record, playerId: best.playerId } : null;
}

/** Backfill des anciennes parties Challenge. V3 reclassera aussi les anciennes parties DUO/MULTI dans la même catégorie individuelle. */
export async function syncChallengeHistoricalScores(profiles: any[], _teams: any[] = []): Promise<ChallengeHistorySyncResult> {
  const uid = await getChallengeOnlineUserId();
  if (!uid) return { ok: false, submitted: 0, scanned: 0, skipped: 'AUTH_REQUIRED' };
  const profile = linkedProfile(profiles, uid);
  const profileIds = new Set(linkedProfileIds(profiles, uid));
  // Même si l'hydratation du store n'est pas encore terminée, un historique qui
  // porte déjà le uid du compte peut être resynchronisé sans autoriser un profil local.
  profileIds.add(uid);

  const history = await History.getAll();
  const challengeRows = history.filter(historyIsFinishedChallenge);
  let submitted = 0;
  for (const record of challengeRows) {
    const rows = historyPlayerRows(record);
    let row = rows.find((candidate: any) => historyRowMatchesProfileIds(candidate, profileIds));
    if (!row && rows.length === 1) {
      const headerPlayers = Array.isArray(record?.players) ? record.players : [];
      if (headerPlayers.some((candidate: any) => historyRowMatchesProfileIds(candidate, profileIds))) row = rows[0];
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
        displayName: clean(profile?.name || profile?.nickname || row?.name || row?.displayName, 'Joueur'),
        avatarUrl: avatarFromProfile(profile),
        countryCode: clean(profile?.countryCode || profile?.country || pi?.countryCode || pi?.country) || null,
        stats: historyStatsPayload(record, row),
      });
      if (result.ok) submitted += 1;
    } catch (error) {
      console.warn('[challenge] historical leaderboard backfill failed', matchId, error);
    }
  }
  return { ok: true, submitted, scanned: challengeRows.length };
}
