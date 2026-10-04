import { supabase } from './supabaseClient';

const CHALLENGE_API_BASE = (() => {
  if (typeof window === 'undefined') return '/api/challenge/leaderboard';
  const host = String(window.location.hostname || '').toLowerCase();
  const protocol = String(window.location.protocol || '').toLowerCase();
  const native = host === 'localhost' || host === '127.0.0.1' || protocol === 'capacitor:';
  return native
    ? 'https://multisports-scoring.pages.dev/api/challenge/leaderboard'
    : '/api/challenge/leaderboard';
})();

const TIMEOUT_MS = 12_000;

export type ChallengeCloudResult<T> = {
  available: boolean;
  data: T | null;
  status: number;
  code?: string;
};

async function accessToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return String(data?.session?.access_token || '').trim();
  } catch {
    return '';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ChallengeCloudResult<T>> {
  const token = await accessToken();
  if (!token) return { available: false, data: null, status: 401, code: 'AUTH_REQUIRED' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${CHALLENGE_API_BASE}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    const payload: any = await response.json().catch(() => null);
    const code = String(payload?.code || '');
    const unavailable = response.status === 404
      || response.status === 503
      || code === 'challenge_d1_not_configured'
      || code === 'challenge_r2_not_configured'
      || code === 'challenge_cloud_not_ready';
    if (unavailable) return { available: false, data: null, status: response.status, code };
    if (!response.ok) {
      const error: any = new Error(String(payload?.error || payload?.message || `Challenge Cloud HTTP ${response.status}`));
      error.status = response.status;
      error.code = code;
      throw error;
    }
    return { available: true, data: payload as T, status: response.status, code };
  } catch (error: any) {
    if (error?.name === 'AbortError' || String(error?.message || '').includes('Failed to fetch')) {
      return { available: false, data: null, status: 0, code: 'challenge_cloud_unreachable' };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function query(input: any, scope: any, extra: Record<string, any> = {}) {
  const params = new URLSearchParams();
  params.set('target', String(input?.target || '20'));
  params.set('rule', String(input?.rule || 'all'));
  params.set('visits', String(Math.max(1, Number(input?.visits || 1))));
  if (input?.setMode) params.set('setMode', String(input.setMode));
  if (input?.setTarget) params.set('setTarget', String(input.setTarget));
  if (input?.legMode) params.set('legMode', String(input.legMode));
  if (input?.legTarget) params.set('legTarget', String(input.legTarget));
  if (scope?.type === 'team' && scope?.teamKey) {
    params.set('scope', 'team');
    params.set('teamKey', String(scope.teamKey));
  } else {
    params.set('scope', 'public');
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export async function submitChallengeScoreCloud(input: any): Promise<ChallengeCloudResult<any>> {
  return request('/submit', {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });
}

export async function syncChallengeIdentityCloud(input: { displayName?: string | null; avatarUrl?: string | null; countryCode?: string | null }): Promise<ChallengeCloudResult<any>> {
  return request('/profile', {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });
}

export async function fetchChallengeLeaderboardCloud(input: any, limit: number, scope: any): Promise<ChallengeCloudResult<any>> {
  return request(`?${query(input, scope, { limit })}`);
}

export async function fetchChallengeLeaderboardDetailCloud(input: any, userId: string, scope: any): Promise<ChallengeCloudResult<any>> {
  return request(`/detail?${query(input, scope, { userId })}`);
}
