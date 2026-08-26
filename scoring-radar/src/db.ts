import type { Analysis, Candidate, OpportunityRow, RadarEnv } from './domain';

export async function insertCandidate(env: RadarEnv, candidate: Candidate): Promise<boolean> {
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO sightings (
      id, source, source_url, title, snippet, query_key, query_text,
      market, language_hint, captured_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).bind(
    candidate.id,
    candidate.source,
    candidate.sourceUrl,
    candidate.title,
    candidate.snippet,
    candidate.queryKey,
    candidate.queryText,
    candidate.market,
    candidate.languageHint,
    candidate.capturedAt
  ).run();

  return (result.meta.changes ?? 0) > 0;
}

export async function applyAnalysis(env: RadarEnv, analysis: Analysis): Promise<void> {
  await env.DB.prepare(`
    UPDATE sightings
    SET status = 'analyzed', language = ?, category = ?, intent = ?, score = ?,
        eligible = ?, reason = ?, suggested_reply = ?, analyzed_at = ?
    WHERE id = ?
  `).bind(
    analysis.language,
    analysis.category,
    analysis.intent,
    analysis.score,
    analysis.eligible ? 1 : 0,
    analysis.reason,
    analysis.suggestedReply,
    new Date().toISOString(),
    analysis.id
  ).run();
}

export async function getCachedQuery(env: RadarEnv, market: string, queryKey: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT query_text FROM query_cache WHERE market = ? AND query_key = ?'
  ).bind(market, queryKey).first<{ query_text: string }>();
  return row?.query_text ?? null;
}

export async function cacheQuery(env: RadarEnv, market: string, queryKey: string, queryText: string): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO query_cache (market, query_key, query_text, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(market, query_key) DO UPDATE SET query_text = excluded.query_text, updated_at = excluded.updated_at
  `).bind(market, queryKey, queryText, new Date().toISOString()).run();
}

export async function listOpportunities(env: RadarEnv, minScore: number, limit: number): Promise<OpportunityRow[]> {
  const result = await env.DB.prepare(`
    SELECT id, source, source_url, title, snippet, query_key, market, language, category, intent,
           score, eligible, reason, suggested_reply, captured_at, analyzed_at
    FROM sightings
    WHERE status = 'analyzed' AND eligible = 1 AND score >= ?
    ORDER BY score DESC, analyzed_at DESC
    LIMIT ?
  `).bind(minScore, limit).all<OpportunityRow>();
  return result.results ?? [];
}

export async function getOpportunity(env: RadarEnv, id: string): Promise<OpportunityRow | null> {
  return env.DB.prepare(`
    SELECT id, source, source_url, title, snippet, query_key, market, language, category, intent,
           score, eligible, reason, suggested_reply, captured_at, analyzed_at
    FROM sightings WHERE id = ?
  `).bind(id).first<OpportunityRow>();
}

export async function logClick(
  env: RadarEnv,
  click: { id: string; sightingId: string; clickedAt: string; referer: string | null; country: string | null; userAgent: string | null }
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO clicks (id, sighting_id, clicked_at, referer, country, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    click.id,
    click.sightingId,
    click.clickedAt,
    click.referer,
    click.country,
    click.userAgent
  ).run();
}

export async function startRun(env: RadarEnv, id: string, startedAt: string, markets: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO run_log (id, started_at, markets) VALUES (?, ?, ?)'
  ).bind(id, startedAt, markets).run();
}

export async function finishRun(
  env: RadarEnv,
  id: string,
  stats: { queries: number; candidates: number; queued: number; error?: string }
): Promise<void> {
  await env.DB.prepare(`
    UPDATE run_log SET finished_at = ?, queries = ?, candidates = ?, queued = ?, error = ? WHERE id = ?
  `).bind(
    new Date().toISOString(),
    stats.queries,
    stats.candidates,
    stats.queued,
    stats.error ?? null,
    id
  ).run();
}


export async function getRadarStats(env: RadarEnv): Promise<{
  sightings: number;
  analyzed: number;
  eligible: number;
  highIntent: number;
  clicks: number;
  latestRun: Record<string, unknown> | null;
}> {
  const counts = await env.DB.prepare(`
    SELECT
      COUNT(*) AS sightings,
      SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) AS analyzed,
      SUM(CASE WHEN eligible = 1 THEN 1 ELSE 0 END) AS eligible,
      SUM(CASE WHEN eligible = 1 AND score >= 90 THEN 1 ELSE 0 END) AS high_intent
    FROM sightings
  `).first<{ sightings: number; analyzed: number | null; eligible: number | null; high_intent: number | null }>();
  const clickRow = await env.DB.prepare('SELECT COUNT(*) AS clicks FROM clicks').first<{ clicks: number }>();
  const latestRun = await env.DB.prepare(`
    SELECT id, started_at, finished_at, markets, queries, candidates, queued, error
    FROM run_log ORDER BY started_at DESC LIMIT 1
  `).first<Record<string, unknown>>();

  return {
    sightings: Number(counts?.sightings ?? 0),
    analyzed: Number(counts?.analyzed ?? 0),
    eligible: Number(counts?.eligible ?? 0),
    highIntent: Number(counts?.high_intent ?? 0),
    clicks: Number(clickRow?.clicks ?? 0),
    latestRun: latestRun ?? null
  };
}
