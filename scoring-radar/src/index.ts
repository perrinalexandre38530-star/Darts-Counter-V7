import { classifyCandidates, localizeQuery } from './ai';
import { searchBrave } from './brave';
import { intFromEnv, marketKey, parseMarkets } from './config';
import {
  applyAnalysis,
  finishRun,
  getOpportunity,
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

function chooseRotating<T>(items: T[], count: number, tick: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const take = Math.min(count, items.length);
  const start = Math.abs(tick) % items.length;
  return Array.from({ length: take }, (_, index) => items[(start + index) % items.length]!);
}

function safeDestination(base: string, sightingId: string, source: string): string {
  const url = new URL(base);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'organic_referral');
  url.searchParams.set('utm_campaign', 'scoring_radar');
  url.searchParams.set('utm_content', sightingId.slice(0, 16));
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

  return Response.redirect(safeDestination(env.APP_DESTINATION_URL, id, row.source), 302);
}

async function runScheduled(env: RadarEnv, scheduledTime: number): Promise<void> {
  const startedAt = new Date(scheduledTime).toISOString();
  const runId = crypto.randomUUID();
  const markets = parseMarkets(env);
  const marketsPerRun = intFromEnv(env.RADAR_MARKETS_PER_RUN, 3, 1, 20);
  const resultsPerQuery = intFromEnv(env.RADAR_RESULTS_PER_QUERY, 10, 1, 20);
  const fiveMinuteTick = Math.floor(scheduledTime / 300_000);
  const selectedMarkets = chooseRotating(markets, marketsPerRun, fiveMinuteTick);
  const selectedIntent = SEARCH_INTENTS[Math.abs(fiveMinuteTick) % SEARCH_INTENTS.length]!;

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
