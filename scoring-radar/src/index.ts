import { adminHtml } from './admin';
import { classifyCandidates, localizeQuery } from './ai';
import { searchBrave } from './brave';
import { intFromEnv, marketKey, parseMarkets } from './config';
import {
  applyAnalysis,
  finishRun,
  getOpportunity,
  getRadarStats,
  insertCandidate,
  listOpportunities,
  logClick,
  startRun
} from './db';
import type { Candidate, RadarEnv } from './domain';
import { sha256Hex } from './hash';
import { isAdminAuthorized, unauthorized } from './security';
import { SEARCH_INTENTS } from './targets';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

function chooseMarketBatch<T>(items: T[], count: number, tick: number): { selected: T[]; runsPerSweep: number } {
  if (items.length === 0 || count <= 0) return { selected: [], runsPerSweep: 1 };
  const take = Math.min(count, items.length);
  const runsPerSweep = Math.max(1, Math.ceil(items.length / take));
  const slot = Math.abs(tick) % runsPerSweep;
  const start = slot * take;
  return { selected: items.slice(start, start + take), runsPerSweep };
}

function safeDestination(base: string, row: { id: string; source: string; language: string | null; category: string | null; query_key: string }): string {
  const url = new URL(base);
  const language = (row.language ?? '').toLowerCase().split('-')[0];
  const category = (row.category ?? '').toLowerCase();

  if (language === 'fr') {
    url.pathname = category.includes('dart') ? '/fr/flechettes/' : category.includes('running') ? '/fr/running/' : '/fr/';
  } else if (language === 'en') {
    url.pathname = category.includes('dart') ? '/en/darts/' : category.includes('running') ? '/en/running/' : '/en/';
  } else if (language === 'es') {
    url.pathname = category.includes('dart') ? '/es/dardos/' : category.includes('running') ? '/es/running/' : '/es/';
  }

  url.searchParams.set('utm_source', row.source);
  url.searchParams.set('utm_medium', 'organic_referral');
  url.searchParams.set('utm_campaign', 'scoring_radar');
  url.searchParams.set('utm_content', row.id.slice(0, 16));
  if (row.query_key) url.searchParams.set('utm_term', row.query_key);
  return url.toString();
}

async function handleAdminApi(request: Request, env: RadarEnv, url: URL): Promise<Response> {
  if (!isAdminAuthorized(request, env)) return unauthorized();

  if (request.method === 'GET' && url.pathname === '/api/opportunities') {
    const minScore = intFromEnv(url.searchParams.get('minScore') ?? env.RADAR_MIN_SCORE, 70, 0, 100);
    const limit = intFromEnv(url.searchParams.get('limit') ?? undefined, 100, 1, 500);
    const rows = await listOpportunities(env, minScore, limit);
    const publicBase = `${url.protocol}//${url.host}`;
    return json({
      ok: true,
      opportunities: rows.map((row) => ({
        ...row,
        tracked_link: `${publicBase}/go/${row.id}`,
        reply_with_link: row.suggested_reply?.replace('{{APP_LINK}}', `${publicBase}/go/${row.id}`) ?? null
      }))
    });
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/opportunities/')) {
    const id = url.pathname.slice('/api/opportunities/'.length);
    const row = await getOpportunity(env, id);
    if (!row) return json({ ok: false, error: 'not_found' }, 404);
    const publicBase = `${url.protocol}//${url.host}`;
    return json({
      ok: true,
      opportunity: {
        ...row,
        tracked_link: `${publicBase}/go/${row.id}`,
        reply_with_link: row.suggested_reply?.replace('{{APP_LINK}}', `${publicBase}/go/${row.id}`) ?? null
      }
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/stats') {
    return json({ ok: true, stats: await getRadarStats(env) });
  }

  if (request.method === 'POST' && url.pathname === '/api/run') {
    const started = Date.now();
    await runScheduled(env, started);
    return json({ ok: true, triggered_at: new Date(started).toISOString() });
  }

  if (request.method === 'POST' && url.pathname === '/api/ingest') {
    const body = await request.json() as { candidates?: Partial<Candidate>[] };
    const rawCandidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 100) : [];
    let queued = 0;

    for (const raw of rawCandidates) {
      const sourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : '';
      if (!sourceUrl) continue;
      const source = typeof raw.source === 'string' && raw.source ? raw.source : 'external-ingest';
      const id = typeof raw.id === 'string' && raw.id ? raw.id : await sha256Hex(`${source}|${sourceUrl}`);
      const candidate: Candidate = {
        id,
        source,
        sourceUrl,
        title: typeof raw.title === 'string' ? raw.title.slice(0, 500) : '',
        snippet: typeof raw.snippet === 'string' ? raw.snippet.slice(0, 4000) : '',
        queryKey: typeof raw.queryKey === 'string' ? raw.queryKey.slice(0, 100) : 'external',
        queryText: typeof raw.queryText === 'string' ? raw.queryText.slice(0, 400) : '',
        market: typeof raw.market === 'string' ? raw.market.slice(0, 32) : '',
        languageHint: typeof raw.languageHint === 'string' ? raw.languageHint.slice(0, 32) : '',
        capturedAt: typeof raw.capturedAt === 'string' ? raw.capturedAt : new Date().toISOString()
      };
      if (await insertCandidate(env, candidate)) {
        await env.CANDIDATE_QUEUE.send(candidate);
        queued += 1;
      }
    }

    return json({ ok: true, queued });
  }

  return json({ ok: false, error: 'not_found' }, 404);
}

async function handleGo(request: Request, env: RadarEnv, url: URL): Promise<Response> {
  const id = url.pathname.slice('/go/'.length);
  if (!id) return json({ ok: false, error: 'missing_id' }, 400);
  const row = await getOpportunity(env, id);
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  const clickId = crypto.randomUUID();
  const cf = request.cf;
  await logClick(env, {
    id: clickId,
    sightingId: id,
    clickedAt: new Date().toISOString(),
    referer: request.headers.get('Referer'),
    country: typeof cf?.country === 'string' ? cf.country : null,
    userAgent: request.headers.get('User-Agent')
  });

  return Response.redirect(safeDestination(env.APP_DESTINATION_URL, row), 302);
}

async function runScheduled(env: RadarEnv, scheduledTime: number): Promise<void> {
  const startedAt = new Date(scheduledTime).toISOString();
  const runId = crypto.randomUUID();
  const markets = parseMarkets(env);
  const marketsPerRun = intFromEnv(env.RADAR_MARKETS_PER_RUN, 5, 1, 20);
  const resultsPerQuery = intFromEnv(env.RADAR_RESULTS_PER_QUERY, 10, 1, 20);
  const fiveMinuteTick = Math.floor(scheduledTime / 300_000);
  const { selected: selectedMarkets, runsPerSweep } = chooseMarketBatch(markets, marketsPerRun, fiveMinuteTick);
  const intentIndex = Math.floor(Math.abs(fiveMinuteTick) / runsPerSweep) % SEARCH_INTENTS.length;
  const selectedIntent = SEARCH_INTENTS[intentIndex]!;

  await startRun(env, runId, startedAt, selectedMarkets.map(marketKey).join(','));

  let queries = 0;
  let candidates = 0;
  let queued = 0;
  let error: string | undefined;

  try {
    for (const market of selectedMarkets) {
      const queryText = await localizeQuery(env, market, selectedIntent);
      const found = await searchBrave(env, selectedIntent.key, queryText, market, resultsPerQuery, startedAt);
      queries += 1;
      candidates += found.length;

      for (const candidate of found) {
        if (await insertCandidate(env, candidate)) {
          await env.CANDIDATE_QUEUE.send(candidate);
          queued += 1;
        }
      }
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    console.error(JSON.stringify({ event: 'radar_scheduled_error', runId, error }));
  } finally {
    await finishRun(env, runId, { queries, candidates, queued, error });
    console.log(JSON.stringify({ event: 'radar_run', runId, queries, candidates, queued, error: error ?? null }));
  }
}

export default {
  async fetch(request: Request, env: RadarEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'scoring-radar', version: '0.1.0' });
    }

    if (request.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
      return new Response(adminHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname.startsWith('/go/')) {
      return handleGo(request, env, url);
    }

    if (url.pathname.startsWith('/api/')) {
      return handleAdminApi(request, env, url);
    }

    return json({ ok: false, error: 'not_found' }, 404);
  },

  async scheduled(controller: ScheduledController, env: RadarEnv): Promise<void> {
    await runScheduled(env, controller.scheduledTime);
  },

  async queue(batch: MessageBatch<Candidate>, env: RadarEnv): Promise<void> {
    const candidates = batch.messages.map((message) => message.body);
    const analyses = await classifyCandidates(env, candidates);
    const byId = new Map(analyses.map((analysis) => [analysis.id, analysis]));

    for (const candidate of candidates) {
      const analysis = byId.get(candidate.id);
      if (!analysis) {
        throw new Error(`Missing classifier result for candidate ${candidate.id}`);
      }
      await applyAnalysis(env, analysis);
    }

    console.log(JSON.stringify({ event: 'radar_classified', count: candidates.length }));
  }
} satisfies ExportedHandler<RadarEnv, Candidate>;
