import { supabase } from './supabaseClient';

export type ChallengeLeaderboardObjective = {
  target: string;
  rule: string;
  visits: number;
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

export function challengeObjectiveKey(input: ChallengeLeaderboardObjective): string {
  const target = String(input.target || '20').trim().toLowerCase();
  const rule = String(input.rule || 'all').trim().toLowerCase();
  const visits = Math.max(1, Number(input.visits || 1) || 1);
  return `challenge:v1:${target}:${rule}:${visits}`;
}

function isBackendMissing(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42883' || code === 'PGRST202' || message.includes('ms_submit_challenge_score') || message.includes('ms_challenge_leaderboard');
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

export async function submitChallengeBestScore(input: ChallengeLeaderboardSubmit): Promise<{ ok: boolean; improved?: boolean; bestScore?: number; skipped?: string }> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return { ok: false, skipped: 'AUTH_REQUIRED' };

  try {
    // Maintient le profil public à jour pour que le classement puisse afficher
    // le pseudo/avatar actuel de l'utilisateur.
    await supabase.rpc('ms_touch_public_profile', {
      p_display_name: input.displayName || null,
      p_avatar_url: input.avatarUrl || null,
      p_country_code: input.countryCode || null,
      p_city_label: null,
    });
  } catch {
    // Non bloquant : le score peut être enregistré même si ce rafraîchissement échoue.
  }

  const { data, error } = await supabase.rpc('ms_submit_challenge_score', {
    p_objective_key: challengeObjectiveKey(input),
    p_target: String(input.target || '20'),
    p_rule: String(input.rule || 'all'),
    p_visits: Math.max(1, Number(input.visits || 1) || 1),
    p_score: Math.max(0, Math.round(Number(input.score || 0))),
    p_darts: Math.max(0, Math.round(Number(input.darts || 0))),
    p_best_streak: Math.max(0, Math.round(Number(input.bestStreak || 0))),
    p_accuracy: Math.max(0, Math.min(100, Number(input.accuracy || 0))),
    p_match_id: String(input.matchId || '').slice(0, 160),
  });

  if (error) {
    if (isBackendMissing(error)) return { ok: false, skipped: 'BACKEND_NOT_INSTALLED' };
    throw error;
  }
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.ok ?? true),
    improved: Boolean(row?.improved),
    bestScore: Number(row?.bestScore ?? row?.best_score ?? input.score),
  };
}

export async function fetchChallengeLeaderboard(input: ChallengeLeaderboardObjective, limit = 100): Promise<ChallengeLeaderboardRow[]> {
  const userId = await getChallengeOnlineUserId();
  if (!userId) return [];

  const { data, error } = await supabase.rpc('ms_challenge_leaderboard', {
    p_objective_key: challengeObjectiveKey(input),
    p_limit: Math.max(1, Math.min(100, Math.round(limit || 100))),
  });
  if (error) {
    if (isBackendMissing(error)) return [];
    throw error;
  }

  return (Array.isArray(data) ? data : []).map((row: any) => ({
    rank: Number(row?.rank || 0),
    userId: String(row?.userId || row?.user_id || ''),
    displayName: String(row?.displayName || row?.display_name || 'Joueur'),
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
