// @ts-nocheck
// Challenge Online — Cloudflare D1 (index) + R2 (détail meilleure partie).
// Supabase reste utilisé pour l'authentification et, pendant la transition,
// comme source de migration lazy des anciens classements/détails.

interface Env {
  CHALLENGE_DB?: D1Database;
  USER_DATA_BUCKET?: R2Bucket;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

type Identity = { userId: string; token: string };

type Objective = {
  target: string;
  rule: string;
  visits: number;
  setMode?: string | null;
  setTarget?: number | null;
  legMode?: string | null;
  legTarget?: number | null;
};

const MAX_LIMIT = 100;
const R2_PREFIX = 'challenge-online/v1';

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-max-age': '86400',
    ...extra,
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-multisports-challenge-route': 'cloudflare-d1-r2-v1',
    }),
  });
}

function clean(value: any, fallback = '') { return String(value ?? fallback).trim(); }
function lower(value: any, fallback = '') { return clean(value, fallback).toLowerCase(); }
function int(value: any, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : fallback; }
function num(value: any, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function safe(value: any) { return clean(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 220); }
function nowIso() { return new Date().toISOString(); }

function objectiveFrom(input: any): Objective {
  return {
    target: lower(input?.target, '20'),
    rule: lower(input?.rule, 'all'),
    visits: Math.max(1, int(input?.visits, 1)),
    setMode: lower(input?.setMode, 'none') || 'none',
    setTarget: Math.max(0, int(input?.setTarget, 0)),
    legMode: lower(input?.legMode, 'none') || 'none',
    legTarget: Math.max(0, int(input?.legTarget, 0)),
  };
}

function objectiveKey(input: Objective) {
  return `challenge:v3:${lower(input.target, '20')}:${lower(input.rule, 'all')}:${Math.max(1, int(input.visits, 1))}:${lower(input.setMode, 'none') || 'none'}:${Math.max(0, int(input.setTarget, 0))}:${lower(input.legMode, 'none') || 'none'}:${Math.max(0, int(input.legTarget, 0))}`;
}

function routeParts(params: any): string[] {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw).split('/').filter(Boolean);
}

async function resolveIdentity(request: Request, env: Env): Promise<Identity> {
  const auth = String(request.headers.get('authorization') || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) throw Object.assign(new Error('Session requise.'), { status: 401, code: 'session_required' });
  const base = clean(env.SUPABASE_URL).replace(/\/+$/, '');
  const anon = clean(env.SUPABASE_ANON_KEY);
  if (!base || !anon) throw Object.assign(new Error('Supabase Auth non configuré.'), { status: 503, code: 'supabase_auth_not_configured' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!response.ok) throw Object.assign(new Error('Session invalide.'), { status: 401, code: 'invalid_session' });
    const user: any = await response.json();
    if (!user?.id) throw Object.assign(new Error('Session invalide.'), { status: 401, code: 'invalid_session' });
    return { userId: String(user.id), token };
  } finally {
    clearTimeout(timer);
  }
}

async function supabaseRpc(env: Env, token: string, fn: string, body: any): Promise<any> {
  const base = clean(env.SUPABASE_URL).replace(/\/+$/, '');
  const anon = clean(env.SUPABASE_ANON_KEY);
  if (!base || !anon) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: anon,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function officialTeams(env: Env, identity: Identity): Promise<Array<{key:string;name:string}>> {
  const data = await supabaseRpc(env, identity.token, 'ms_challenge_official_team_scopes_v3', {});
  return (Array.isArray(data) ? data : [])
    .map((row: any) => ({
      key: clean(row?.teamKey || row?.team_key),
      name: clean(row?.teamName || row?.team_name, 'Équipe'),
    }))
    .filter((row: any) => row.key);
}

async function validateScope(env: Env, identity: Identity, scopeType: string, teamKey: string) {
  if (scopeType !== 'team') return { scopeKey: 'public', teamName: '' };
  const key = clean(teamKey);
  if (!key) throw Object.assign(new Error('Équipe officielle requise.'), { status: 400, code: 'team_required' });
  const teams = await officialTeams(env, identity);
  const team = teams.find((item) => item.key === key);
  if (!team) throw Object.assign(new Error('Classement privé réservé aux membres officiels de cette équipe.'), { status: 403, code: 'PRIVATE_TEAM' });
  return { scopeKey: `official:${key}`, teamName: team.name };
}

function better(next: any, current: any | null): boolean {
  if (!current) return true;
  if (Number(next.score) !== Number(current.score)) return Number(next.score) > Number(current.score);
  if (Number(next.accuracy) !== Number(current.accuracy)) return Number(next.accuracy) > Number(current.accuracy);
  if (Number(next.bestStreak) !== Number(current.best_streak)) return Number(next.bestStreak) > Number(current.best_streak);
  if (Number(next.darts) !== Number(current.darts)) return Number(next.darts) < Number(current.darts);
  return false;
}

function detailKey(scopeKey: string, objective: string, userId: string, matchId: string) {
  return `${R2_PREFIX}/${safe(scopeKey)}/${safe(objective)}/${safe(userId)}/${safe(matchId)}.json`;
}

async function putDetail(bucket: R2Bucket | undefined, key: string, payload: any) {
  if (!bucket) return false;
  await bucket.put(key, JSON.stringify(payload || {}), {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'private, max-age=0, no-store' },
    customMetadata: { kind: 'challenge-best-detail', version: '1' },
  });
  return true;
}

async function readDetail(bucket: R2Bucket | undefined, key: string | null): Promise<any | null> {
  if (!bucket || !key) return null;
  const object = await bucket.get(key);
  if (!object) return null;
  try { return await object.json(); } catch {
    try { return JSON.parse(await object.text()); } catch { return null; }
  }
}

async function queryBestRows(db: D1Database, objective: string, scopeKey: string, limit: number) {
  const result = await db.prepare(`
    SELECT objective_key, scope_key, user_id, display_name, avatar_url, country_code,
           target, rule, visits, score, darts, best_streak, accuracy, played_count,
           best_match_id, stats_key, detail_state, updated_at
    FROM challenge_best_scores
    WHERE objective_key = ?1 AND scope_key = ?2
    ORDER BY score DESC, accuracy DESC, best_streak DESC, darts ASC, updated_at ASC, user_id ASC
    LIMIT ?3
  `).bind(objective, scopeKey, Math.max(1, Math.min(MAX_LIMIT, limit))).all();
  return Array.isArray(result?.results) ? result.results : [];
}

function mapLeaderboard(rows: any[]) {
  return rows.map((row: any, index: number) => ({
    rank: index + 1,
    userId: clean(row.user_id),
    displayName: clean(row.display_name, 'Joueur'),
    avatarUrl: row.avatar_url || null,
    countryCode: row.country_code || null,
    score: Number(row.score || 0),
    darts: Number(row.darts || 0),
    bestStreak: Number(row.best_streak || 0),
    accuracy: Number(row.accuracy || 0),
    playedCount: Number(row.played_count || 1),
    updatedAt: row.updated_at || null,
    matchId: row.best_match_id || null,
    detailAvailable: row.detail_state === 'available' || Boolean(row.stats_key),
  }));
}

async function migrationMarked(db: D1Database, objective: string, scopeKey: string) {
  const row = await db.prepare('SELECT migrated_at FROM challenge_migration_marks WHERE objective_key=?1 AND scope_key=?2 LIMIT 1').bind(objective, scopeKey).first();
  return Boolean(row);
}

async function markMigration(db: D1Database, objective: string, scopeKey: string, imported: number) {
  await db.prepare(`
    INSERT INTO challenge_migration_marks(objective_key, scope_key, migrated_at, imported_rows, source)
    VALUES(?1, ?2, ?3, ?4, 'supabase-v3')
    ON CONFLICT(objective_key, scope_key) DO UPDATE SET migrated_at=excluded.migrated_at, imported_rows=excluded.imported_rows
  `).bind(objective, scopeKey, nowIso(), imported).run();
}

async function importLegacyLeaderboardIfNeeded(env: Env, db: D1Database, identity: Identity, objective: Objective, scopeKey: string) {
  const key = objectiveKey(objective);
  if (await migrationMarked(db, key, scopeKey)) return 0;

  const legacy = await supabaseRpc(env, identity.token, 'ms_challenge_leaderboard_v3', {
    p_objective_key: key,
    p_scope_key: scopeKey,
    p_limit: MAX_LIMIT,
  });
  // null = RPC absente / timeout / erreur transitoire : surtout ne pas créer le
  // marqueur de migration, sinon les anciens joueurs seraient perdus à jamais.
  if (!Array.isArray(legacy)) return 0;

  let imported = 0;
  for (const row of legacy) {
    const userId = clean(row?.userId || row?.user_id);
    if (!userId) continue;
    const candidate = {
      score: Math.max(0, int(row?.score, 0)),
      darts: Math.max(0, int(row?.darts, 0)),
      bestStreak: Math.max(0, int(row?.bestStreak || row?.best_streak, 0)),
      accuracy: Math.max(0, Math.min(100, num(row?.accuracy, 0))),
    };
    const current: any = await db.prepare(`SELECT * FROM challenge_best_scores WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3 LIMIT 1`)
      .bind(key, scopeKey, userId).first();
    const legacyPlayed = Math.max(1, int(row?.playedCount || row?.played_count, 1));
    const updatedAt = clean(row?.updatedAt || row?.updated_at, nowIso());
    const matchId = clean(row?.matchId || row?.match_id).slice(0, 160) || `legacy-${safe(userId)}-${safe(key)}`.slice(0, 160);

    if (!current) {
      await db.prepare(`
        INSERT INTO challenge_best_scores(
          objective_key, scope_key, user_id, display_name, avatar_url, country_code,
          target, rule, visits, score, darts, best_streak, accuracy, played_count,
          best_match_id, stats_key, detail_state, source, created_at, updated_at
        ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,NULL,'unchecked','supabase-import',?16,?16)
      `).bind(
        key, scopeKey, userId,
        clean(row?.displayName || row?.display_name, 'Joueur'),
        row?.avatarUrl || row?.avatar_url || null,
        row?.countryCode || row?.country_code || null,
        objective.target, objective.rule, objective.visits,
        candidate.score, candidate.darts, candidate.bestStreak, candidate.accuracy,
        legacyPlayed, matchId, updatedAt,
      ).run();
      imported += 1;
      continue;
    }

    const playedCount = Math.max(Number(current.played_count || 1), legacyPlayed);
    if (better(candidate, current)) {
      await db.prepare(`
        UPDATE challenge_best_scores SET
          display_name=?1, avatar_url=?2, country_code=?3,
          target=?4, rule=?5, visits=?6,
          score=?7, darts=?8, best_streak=?9, accuracy=?10, played_count=?11,
          best_match_id=?12, stats_key=NULL, detail_state='unchecked', source='supabase-import', updated_at=?13
        WHERE objective_key=?14 AND scope_key=?15 AND user_id=?16
      `).bind(
        clean(row?.displayName || row?.display_name, 'Joueur'),
        row?.avatarUrl || row?.avatar_url || null,
        row?.countryCode || row?.country_code || null,
        objective.target, objective.rule, objective.visits,
        candidate.score, candidate.darts, candidate.bestStreak, candidate.accuracy,
        playedCount, matchId, updatedAt,
        key, scopeKey, userId,
      ).run();
    } else if (playedCount !== Number(current.played_count || 1)) {
      await db.prepare(`UPDATE challenge_best_scores SET played_count=?1 WHERE objective_key=?2 AND scope_key=?3 AND user_id=?4`)
        .bind(playedCount, key, scopeKey, userId).run();
    }
    imported += 1;
  }
  await markMigration(db, key, scopeKey, imported);
  return imported;
}

async function migrateLegacyDetail(env: Env, db: D1Database, bucket: R2Bucket | undefined, identity: Identity, objective: Objective, scopeKey: string, row: any) {
  if (row?.detail_state === 'missing') return null;
  const data = await supabaseRpc(env, identity.token, 'ms_challenge_score_detail_v3', {
    p_objective_key: objectiveKey(objective),
    p_scope_key: scopeKey,
    p_user_id: clean(row?.user_id),
  });
  const detail = Array.isArray(data) ? data[0] : data;
  const stats = detail?.stats || detail?.statsPayload || detail?.stats_payload || {};
  const hasStats = stats && typeof stats === 'object' && Object.keys(stats).length > 0;
  if (!hasStats || !bucket) {
    await db.prepare(`UPDATE challenge_best_scores SET detail_state='missing' WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3`)
      .bind(objectiveKey(objective), scopeKey, clean(row?.user_id)).run();
    return null;
  }
  const matchId = clean(detail?.matchId || detail?.match_id || row?.best_match_id, row?.best_match_id || `legacy-${Date.now()}`);
  const key = detailKey(scopeKey, objectiveKey(objective), clean(row?.user_id), matchId);
  const payload = {
    version: 1,
    source: 'supabase-migration',
    objective: { ...objective, objectiveKey: objectiveKey(objective), scopeKey },
    performance: {
      userId: clean(row?.user_id),
      displayName: clean(detail?.displayName || detail?.display_name || row?.display_name, 'Joueur'),
      avatarUrl: detail?.avatarUrl || detail?.avatar_url || row?.avatar_url || null,
      countryCode: detail?.countryCode || detail?.country_code || row?.country_code || null,
      score: Number(detail?.score ?? row?.score ?? 0),
      darts: Number(detail?.darts ?? row?.darts ?? 0),
      bestStreak: Number(detail?.bestStreak || detail?.best_streak || row?.best_streak || 0),
      accuracy: Number(detail?.accuracy ?? row?.accuracy ?? 0),
      matchId,
      stats,
    },
    migratedAt: nowIso(),
  };
  await putDetail(bucket, key, payload);
  await db.prepare(`
    UPDATE challenge_best_scores
    SET stats_key=?1, detail_state='available', best_match_id=?2, updated_at=?3
    WHERE objective_key=?4 AND scope_key=?5 AND user_id=?6
  `).bind(key, matchId, nowIso(), objectiveKey(objective), scopeKey, clean(row?.user_id)).run();
  return payload;
}

async function submitScope(env: Env, db: D1Database, bucket: R2Bucket | undefined, identity: Identity, input: any, objective: Objective, scopeKey: string) {
  const key = objectiveKey(objective);
  const userId = identity.userId;
  const matchId = safe(clean(input?.matchId)).slice(0, 160);
  if (!matchId) throw Object.assign(new Error('matchId requis.'), { status: 400, code: 'match_id_required' });

  const receipt = await db.prepare(`SELECT 1 AS ok FROM challenge_submission_receipts WHERE user_id=?1 AND objective_key=?2 AND scope_key=?3 AND match_id=?4 LIMIT 1`)
    .bind(userId, key, scopeKey, matchId).first();
  const current = await db.prepare(`SELECT * FROM challenge_best_scores WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3 LIMIT 1`)
    .bind(key, scopeKey, userId).first();

  const candidate = {
    score: Math.max(0, int(input?.score, 0)),
    darts: Math.max(0, int(input?.darts, 0)),
    bestStreak: Math.max(0, int(input?.bestStreak, 0)),
    accuracy: Math.max(0, Math.min(100, num(input?.accuracy, 0))),
  };
  const improved = better(candidate, current);
  const timestamp = nowIso();
  const previousStatsKey = clean(current?.stats_key) || null;
  let statsKey = previousStatsKey;
  let detailState = clean(current?.detail_state, 'unchecked');

  if (improved) {
    if (bucket && input?.stats && typeof input.stats === 'object' && Object.keys(input.stats).length) {
      statsKey = detailKey(scopeKey, key, userId, matchId);
      await putDetail(bucket, statsKey, {
        version: 1,
        source: 'cloudflare',
        objective: { ...objective, objectiveKey: key, scopeKey },
        performance: {
          userId,
          displayName: clean(input?.displayName, 'Joueur'),
          avatarUrl: input?.avatarUrl || null,
          countryCode: input?.countryCode || null,
          score: candidate.score,
          darts: candidate.darts,
          bestStreak: candidate.bestStreak,
          accuracy: candidate.accuracy,
          matchId,
          stats: input.stats,
        },
        createdAt: timestamp,
      });
      detailState = 'available';
    } else {
      statsKey = null;
      detailState = 'missing';
    }
  }

  const playedCount = Math.max(1, Number(current?.played_count || 0) + (receipt ? 0 : 1));

  if (!current) {
    await db.prepare(`
      INSERT INTO challenge_best_scores(
        objective_key, scope_key, user_id, display_name, avatar_url, country_code,
        target, rule, visits, score, darts, best_streak, accuracy, played_count,
        best_match_id, stats_key, detail_state, source, created_at, updated_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,'cloudflare',?18,?18)
    `).bind(
      key, scopeKey, userId, clean(input?.displayName, 'Joueur'), input?.avatarUrl || null, input?.countryCode || null,
      objective.target, objective.rule, objective.visits,
      candidate.score, candidate.darts, candidate.bestStreak, candidate.accuracy, playedCount,
      matchId, statsKey, detailState, timestamp,
    ).run();
  } else if (improved) {
    await db.prepare(`
      UPDATE challenge_best_scores SET
        display_name=?1, avatar_url=?2, country_code=?3,
        target=?4, rule=?5, visits=?6,
        score=?7, darts=?8, best_streak=?9, accuracy=?10, played_count=?11,
        best_match_id=?12, stats_key=?13, detail_state=?14, source='cloudflare', updated_at=?15
      WHERE objective_key=?16 AND scope_key=?17 AND user_id=?18
    `).bind(
      clean(input?.displayName, 'Joueur'), input?.avatarUrl || null, input?.countryCode || null,
      objective.target, objective.rule, objective.visits,
      candidate.score, candidate.darts, candidate.bestStreak, candidate.accuracy, playedCount,
      matchId, statsKey, detailState, timestamp,
      key, scopeKey, userId,
    ).run();
  } else if (!receipt) {
    await db.prepare(`UPDATE challenge_best_scores SET played_count=?1, updated_at=?2 WHERE objective_key=?3 AND scope_key=?4 AND user_id=?5`)
      .bind(playedCount, timestamp, key, scopeKey, userId).run();
  }

  if (!receipt) {
    await db.prepare(`INSERT OR IGNORE INTO challenge_submission_receipts(user_id, objective_key, scope_key, match_id, submitted_at) VALUES(?1,?2,?3,?4,?5)`)
      .bind(userId, key, scopeKey, matchId, timestamp).run();
  }

  if (improved && previousStatsKey && previousStatsKey !== statsKey && bucket) {
    // Scope-specific keys: safe to delete the former best detail for this scope.
    await bucket.delete(previousStatsKey).catch(() => {});
  }

  return { improved, bestScore: improved ? candidate.score : Number(current?.score || candidate.score), playedCount };
}

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { status: 204, headers: corsHeaders() });

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const method = request.method.toUpperCase();
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    const parts = routeParts(params);

    if (method === 'GET' && parts[0] === 'status') {
      return json({
        ok: Boolean(env.CHALLENGE_DB && env.USER_DATA_BUCKET),
        backend: 'cloudflare-d1-r2-v1',
        d1Ready: Boolean(env.CHALLENGE_DB),
        r2Ready: Boolean(env.USER_DATA_BUCKET),
        authReady: Boolean(clean(env.SUPABASE_URL) && clean(env.SUPABASE_ANON_KEY)),
        d1Binding: 'CHALLENGE_DB',
        r2Binding: 'USER_DATA_BUCKET',
      }, env.CHALLENGE_DB ? 200 : 503);
    }

    if (!env.CHALLENGE_DB) return json({ ok: false, code: 'challenge_d1_not_configured', error: 'Binding D1 CHALLENGE_DB manquant.' }, 503);
    const db = env.CHALLENGE_DB;
    const identity = await resolveIdentity(request, env);

    if (method === 'POST' && parts[0] === 'submit') {
      if (!env.USER_DATA_BUCKET) return json({ ok: false, code: 'challenge_r2_not_configured', error: 'Binding R2 USER_DATA_BUCKET manquant.' }, 503);
      const body: any = await request.json().catch(() => ({}));
      const objective = objectiveFrom(body);
      const requestedTeams = (Array.isArray(body?.teams) ? body.teams : []).map((team: any) => clean(team?.key)).filter(Boolean);
      const scopes = [{ scopeKey: 'public', teamName: '' }];
      if (requestedTeams.length) {
        const allowed = await officialTeams(env, identity);
        for (const team of allowed) if (requestedTeams.includes(team.key)) scopes.push({ scopeKey: `official:${team.key}`, teamName: team.name });
      }
      const results = [];
      for (const scope of scopes) results.push({ scopeKey: scope.scopeKey, ...(await submitScope(env, db, env.USER_DATA_BUCKET, identity, body, objective, scope.scopeKey)) });
      const publicResult = results.find((item: any) => item.scopeKey === 'public') || results[0];
      return json({ ok: true, backend: 'cloudflare-d1-r2-v1', improved: Boolean(publicResult?.improved), bestScore: Number(publicResult?.bestScore || body?.score || 0), scopes: results });
    }

    if (method === 'GET' && parts[0] === 'detail') {
      if (!env.USER_DATA_BUCKET) return json({ ok: false, code: 'challenge_r2_not_configured', error: 'Binding R2 USER_DATA_BUCKET manquant.' }, 503);
      const url = new URL(request.url);
      const objective = objectiveFrom(Object.fromEntries(url.searchParams.entries()));
      const userId = clean(url.searchParams.get('userId'));
      if (!userId) return json({ ok: false, code: 'user_required', error: 'userId requis.' }, 400);
      const scope = await validateScope(env, identity, clean(url.searchParams.get('scope'), 'public'), clean(url.searchParams.get('teamKey')));
      const key = objectiveKey(objective);
      let row: any = await db.prepare(`SELECT * FROM challenge_best_scores WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3 LIMIT 1`).bind(key, scope.scopeKey, userId).first();
      if (!row) {
        await importLegacyLeaderboardIfNeeded(env, db, identity, objective, scope.scopeKey);
        row = await db.prepare(`SELECT * FROM challenge_best_scores WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3 LIMIT 1`).bind(key, scope.scopeKey, userId).first();
      }
      if (!row) return json({ ok: true, backend: 'cloudflare-d1-r2-v1', detail: null });

      let detailPayload = await readDetail(env.USER_DATA_BUCKET, clean(row.stats_key) || null);
      if (!detailPayload && clean(row.detail_state) !== 'missing') {
        detailPayload = await migrateLegacyDetail(env, db, env.USER_DATA_BUCKET, identity, objective, scope.scopeKey, row);
        if (detailPayload) row = await db.prepare(`SELECT * FROM challenge_best_scores WHERE objective_key=?1 AND scope_key=?2 AND user_id=?3 LIMIT 1`).bind(key, scope.scopeKey, userId).first();
      }
      const performance = detailPayload?.performance || {};
      return json({
        ok: true,
        backend: 'cloudflare-d1-r2-v1',
        detail: {
          userId: clean(row.user_id),
          displayName: clean(performance.displayName || row.display_name, 'Joueur'),
          avatarUrl: performance.avatarUrl || row.avatar_url || null,
          countryCode: performance.countryCode || row.country_code || null,
          score: Number(performance.score ?? row.score ?? 0),
          darts: Number(performance.darts ?? row.darts ?? 0),
          bestStreak: Number(performance.bestStreak ?? row.best_streak ?? 0),
          accuracy: Number(performance.accuracy ?? row.accuracy ?? 0),
          matchId: performance.matchId || row.best_match_id || null,
          target: clean(row.target, objective.target),
          rule: clean(row.rule, objective.rule),
          visits: Number(row.visits || objective.visits),
          updatedAt: row.updated_at || null,
          stats: performance.stats || {},
        },
      });
    }

    if (method === 'GET' && parts.length === 0) {
      const url = new URL(request.url);
      const objective = objectiveFrom(Object.fromEntries(url.searchParams.entries()));
      const limit = Math.max(1, Math.min(MAX_LIMIT, int(url.searchParams.get('limit'), MAX_LIMIT)));
      const scope = await validateScope(env, identity, clean(url.searchParams.get('scope'), 'public'), clean(url.searchParams.get('teamKey')));
      const key = objectiveKey(objective);
      // Une seule tentative de migration par configuration/scope, même si une
      // nouvelle ligne Cloudflare existe déjà. Cela empêche les anciens joueurs
      // Supabase de disparaître dès le premier nouveau score D1.
      await importLegacyLeaderboardIfNeeded(env, db, identity, objective, scope.scopeKey);
      const rows = await queryBestRows(db, key, scope.scopeKey, limit);
      return json({ ok: true, backend: 'cloudflare-d1-r2-v1', objectiveKey: key, scopeKey: scope.scopeKey, rows: mapLeaderboard(rows) });
    }

    return json({ ok: false, code: 'not_found', error: 'Route Challenge inconnue.' }, 404);
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return json({ ok: false, code: String(error?.code || 'challenge_cloud_error'), error: String(error?.message || 'Erreur Challenge Cloud.') }, status);
  }
};
