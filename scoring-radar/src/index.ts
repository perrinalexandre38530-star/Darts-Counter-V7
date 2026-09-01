import { adminHtml } from './admin';
import { classifyCandidates, localizeQuery } from './ai';
import { searchBrave } from './brave';
import { intFromEnv, marketKey, parseMarkets } from './config';
import {
  applyAnalysis,
  attachSocialAsset,
  countSocialCampaignsSince,
  finishRun,
  getActiveRunProgress,
  getLatestRunProgress,
  getOpportunity,
  getRunProgress,
  getRadarStats,
  getSocialAsset,
  getSocialCampaign,
  getSocialStats,
  insertCandidate,
  insertSocialAsset,
  insertSocialCampaign,
  listSocialAssets,
  listSocialCampaigns,
  listOpportunities,
  logClick,
  setSocialCampaignStatus,
  socialCampaignExistsForSighting,
  startRun,
  updateRunProgress
} from './db';
import type { Candidate, RadarEnv, RunProgressRow, SocialCampaignRow } from './domain';
import { sha256Hex } from './hash';
import { isAdminAuthorized, unauthorized } from './security';
import { generateAndAuditSocialDraft, socialQaPasses } from './social';
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

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function socialCampaignPayload(row: SocialCampaignRow) {
  return {
    ...row,
    hashtags: parseJsonField<string[]>(row.hashtags_json, []),
    media_brief: parseJsonField<Record<string, unknown>>(row.media_brief_json, {}),
    platform_copy: parseJsonField<Record<string, string>>(row.platform_copy_json, {})
  };
}

function runProgressPayload(env: RadarEnv, row: RunProgressRow | null) {
  if (!row) return null;
  const now = Date.now();
  const updatedAt = Date.parse(row.updated_at);
  const startedAt = Date.parse(row.started_at);
  const stallTimeoutMs = intFromEnv(env.RADAR_STALL_TIMEOUT_MS, 60_000, 15_000, 300_000);
  const active = ['running', 'processing', 'queued'].includes(row.status);
  const staleForMs = Number.isFinite(updatedAt) ? Math.max(0, now - updatedAt) : 0;
  const liveElapsedMs = Number.isFinite(startedAt) && active ? Math.max(row.elapsed_ms, now - startedAt) : row.elapsed_ms;
  return {
    ...row,
    elapsed_ms: liveElapsedMs,
    details: parseJsonField<Record<string, unknown>>(row.details_json, {}),
    stalled: active && staleForMs > stallTimeoutMs,
    stale_for_ms: staleForMs,
    stall_timeout_ms: stallTimeoutMs
  };
}

function elapsedSince(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

async function maybeCreateSocialCampaign(
  env: RadarEnv,
  candidates: Candidate[],
  analyses: Awaited<ReturnType<typeof classifyCandidates>>
): Promise<{ created: boolean; sourceSightingId?: string; status?: string }> {
  const minOpportunityScore = intFromEnv(env.SOCIAL_MIN_OPPORTUNITY_SCORE, 85, 0, 100);
  const maxPerDay = intFromEnv(env.SOCIAL_MAX_CAMPAIGNS_PER_DAY, 2, 0, 24);
  if (maxPerDay <= 0) return { created: false };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (await countSocialCampaignsSince(env, since) >= maxPerDay) return { created: false };

  const best = analyses
    .filter((analysis) => analysis.eligible && analysis.score >= minOpportunityScore)
    .sort((a, b) => b.score - a.score)
    .find((analysis) => candidates.some((candidate) => candidate.id === analysis.id));
  if (!best) return { created: false };
  if (await socialCampaignExistsForSighting(env, best.id)) return { created: false };

  const candidate = candidates.find((item) => item.id === best.id);
  if (!candidate) return { created: false };

  const { draft, qa, passes } = await generateAndAuditSocialDraft(env, candidate, best);
  const createdAt = new Date().toISOString();
  const status = passes ? 'ready_for_review' : 'rejected_by_qa';
  const inserted = await insertSocialCampaign(env, {
    id: crypto.randomUUID(),
    sourceSightingId: candidate.id,
    language: draft.language,
    topic: draft.topic,
    angle: draft.angle,
    hook: draft.hook,
    callToAction: draft.callToAction,
    hashtagsJson: JSON.stringify(draft.hashtags),
    mediaType: draft.mediaType,
    mediaBriefJson: JSON.stringify(draft.mediaBrief),
    platformCopyJson: JSON.stringify(draft.platformCopies),
    qualityScore: qa.qualityScore,
    factualScore: qa.factualScore,
    brandScore: qa.brandScore,
    usefulnessScore: qa.usefulnessScore,
    visualScore: qa.visualScore,
    spamRisk: qa.spamRisk,
    cringeRisk: qa.cringeRisk,
    qaReason: qa.reason,
    status,
    createdAt
  });

  console.log(JSON.stringify({
    event: 'social_campaign_created',
    sourceSightingId: candidate.id,
    status,
    qualityScore: qa.qualityScore,
    factualScore: qa.factualScore,
    visualScore: qa.visualScore,
    spamRisk: qa.spamRisk,
    cringeRisk: qa.cringeRisk
  }));

  return { created: inserted, sourceSightingId: candidate.id, status };
}

async function handleAdminApi(request: Request, env: RadarEnv, url: URL, ctx: ExecutionContext): Promise<Response> {
  if (!isAdminAuthorized(request, env)) return unauthorized();

  if (request.method === 'GET' && url.pathname === '/api/runs/latest') {
    const run = await getLatestRunProgress(env);
    return json({ ok: true, run: runProgressPayload(env, run) });
  }

  const runProgressMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (request.method === 'GET' && runProgressMatch) {
    const run = await getRunProgress(env, runProgressMatch[1]!);
    if (!run) return json({ ok: false, error: 'run_not_found' }, 404);
    return json({ ok: true, run: runProgressPayload(env, run) });
  }

  if (request.method === 'GET' && url.pathname === '/api/social/stats') {
    return json({ ok: true, stats: await getSocialStats(env), mode: env.SOCIAL_AUTOPILOT_MODE || 'review' });
  }

  if (request.method === 'GET' && url.pathname === '/api/social/campaigns') {
    const limit = intFromEnv(url.searchParams.get('limit') ?? undefined, 100, 1, 300);
    const campaigns = await listSocialCampaigns(env, limit);
    return json({ ok: true, campaigns: campaigns.map((row) => socialCampaignPayload(row)) });
  }

  if (request.method === 'GET' && url.pathname === '/api/social/assets') {
    const approvedOnly = url.searchParams.get('approvedOnly') === '1';
    const assets = await listSocialAssets(env, approvedOnly);
    return json({
      ok: true,
      assets: assets.map((row) => ({ ...row, platforms: parseJsonField<string[]>(row.platforms_json, []) }))
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/social/assets') {
    const body = await request.json() as Record<string, unknown>;
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    let assetUrl: URL;
    try {
      assetUrl = new URL(rawUrl);
    } catch {
      return json({ ok: false, error: 'invalid_asset_url' }, 400);
    }
    if (assetUrl.protocol !== 'https:') return json({ ok: false, error: 'asset_url_must_be_https' }, 400);

    const mediaType = body.mediaType === 'image' ? 'image' : body.mediaType === 'video' ? 'video' : '';
    if (!mediaType) return json({ ok: false, error: 'invalid_media_type' }, 400);
    const qualityScore = intFromEnv(String(body.qualityScore ?? ''), 0, 0, 100);
    const technicalScore = intFromEnv(String(body.technicalScore ?? ''), 0, 0, 100);
    const brandScore = intFromEnv(String(body.brandScore ?? ''), 0, 0, 100);
    const humanApproved = body.humanApproved === true && qualityScore >= 90 && technicalScore >= 90 && brandScore >= 90;
    const platforms = Array.isArray(body.platforms)
      ? body.platforms.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [];
    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    await insertSocialAsset(env, {
      id,
      url: assetUrl.toString(),
      title: typeof body.title === 'string' ? body.title.slice(0, 180) : '',
      mediaType,
      platformsJson: JSON.stringify(platforms),
      qualityScore,
      technicalScore,
      brandScore,
      humanApproved,
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 800) : '',
      createdAt
    });
    return json({ ok: true, id, humanApproved });
  }

  const campaignActionMatch = url.pathname.match(/^\/api\/social\/campaigns\/([^/]+)\/(asset|approve|reject)$/);
  if (request.method === 'POST' && campaignActionMatch) {
    const campaignId = campaignActionMatch[1]!;
    const action = campaignActionMatch[2]!;
    const campaign = await getSocialCampaign(env, campaignId);
    if (!campaign) return json({ ok: false, error: 'campaign_not_found' }, 404);

    if (action === 'asset') {
      const body = await request.json() as { assetId?: string };
      const assetId = typeof body.assetId === 'string' ? body.assetId : '';
      const asset = assetId ? await getSocialAsset(env, assetId) : null;
      if (!asset) return json({ ok: false, error: 'asset_not_found' }, 404);
      if (asset.human_approved !== 1 || asset.quality_score < 90 || asset.technical_score < 90 || asset.brand_score < 90) {
        return json({ ok: false, error: 'asset_not_approved' }, 409);
      }
      if (asset.media_type !== campaign.media_type) {
        return json({ ok: false, error: 'asset_media_type_mismatch' }, 409);
      }
      await attachSocialAsset(env, campaignId, assetId);
      return json({ ok: true, campaignId, assetId });
    }

    if (action === 'reject') {
      await setSocialCampaignStatus(env, campaignId, 'rejected');
      return json({ ok: true, campaignId, status: 'rejected' });
    }

    if (campaign.status !== 'ready_for_review') {
      return json({ ok: false, error: 'campaign_not_ready_for_review' }, 409);
    }
    const qaPasses = socialQaPasses(env, {
      qualityScore: campaign.quality_score,
      factualScore: campaign.factual_score,
      brandScore: campaign.brand_score,
      usefulnessScore: campaign.usefulness_score,
      visualScore: campaign.visual_score,
      spamRisk: campaign.spam_risk,
      cringeRisk: campaign.cringe_risk,
      decision: 'pass',
      reason: campaign.qa_reason
    });
    if (!qaPasses) return json({ ok: false, error: 'campaign_failed_quality_gate' }, 409);
    if (!campaign.selected_asset_id) return json({ ok: false, error: 'approved_asset_required' }, 409);
    const asset = await getSocialAsset(env, campaign.selected_asset_id);
    if (!asset || asset.human_approved !== 1 || asset.quality_score < 90 || asset.technical_score < 90 || asset.brand_score < 90) {
      return json({ ok: false, error: 'approved_asset_required' }, 409);
    }
    await setSocialCampaignStatus(env, campaignId, 'approved');
    return json({
      ok: true,
      campaignId,
      status: 'approved',
      publish_mode: env.SOCIAL_AUTOPILOT_MODE || 'review',
      note: 'Publishing connectors are intentionally not enabled until social account OAuth/API credentials are configured.'
    });
  }

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
    const active = await getActiveRunProgress(env);
    if (active) {
      const updatedAt = Date.parse(active.updated_at);
      const stallTimeoutMs = intFromEnv(env.RADAR_STALL_TIMEOUT_MS, 60_000, 15_000, 300_000);
      const staleForMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;
      if (staleForMs <= stallTimeoutMs) {
        return json({
          ok: true,
          already_running: true,
          run_id: active.run_id,
          run: runProgressPayload(env, active)
        });
      }

      await updateRunProgress(env, active.run_id, {
        status: 'failed',
        stage: 'watchdog_timeout',
        finishedAt: new Date().toISOString(),
        error: `Watchdog: no progress update for ${Math.round(staleForMs / 1000)} s`
      });
    }

    const started = Date.now();
    const runId = crypto.randomUUID();
    ctx.waitUntil(runScheduled(env, started, runId));
    return json({
      ok: true,
      run_id: runId,
      status: 'starting',
      triggered_at: new Date(started).toISOString()
    }, 202);
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

async function runScheduled(env: RadarEnv, scheduledTime: number, runId = crypto.randomUUID()): Promise<void> {
  const startedAt = new Date(scheduledTime).toISOString();
  const startedMs = Date.now();
  const markets = parseMarkets(env);
  const marketsPerRun = intFromEnv(env.RADAR_MARKETS_PER_RUN, 5, 1, 20);
  const resultsPerQuery = intFromEnv(env.RADAR_RESULTS_PER_QUERY, 10, 1, 20);
  const hourlyTick = Math.floor(scheduledTime / 3_600_000);
  const { selected: selectedMarkets, runsPerSweep } = chooseMarketBatch(markets, marketsPerRun, hourlyTick);
  const intentIndex = Math.floor(Math.abs(hourlyTick) / runsPerSweep) % SEARCH_INTENTS.length;
  const selectedIntent = SEARCH_INTENTS[intentIndex]!;
  const timings: Record<string, number> = {};
  const details: Record<string, unknown> = {
    intent: selectedIntent.key,
    intent_description: selectedIntent.description,
    timings
  };

  await startRun(env, runId, startedAt, selectedMarkets.map(marketKey).join(','));
  await updateRunProgress(env, runId, {
    status: 'running',
    stage: 'starting',
    elapsedMs: elapsedSince(startedMs),
    details
  });

  let queries = 0;
  let candidates = 0;
  let newCandidatesTotal = 0;
  let queued = 0;
  let error: string | undefined;
  let currentStage = 'starting';

  try {
    if (selectedMarkets.length === 0) throw new Error('No radar market is configured');

    for (const market of selectedMarkets) {
      const marketLabel = marketKey(market);
      details.market = marketLabel;

      currentStage = 'localizing';
      await updateRunProgress(env, runId, {
        status: 'running',
        stage: currentStage,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: newCandidatesTotal,
        queued,
        details
      });
      const localizationStarted = Date.now();
      const queryText = await localizeQuery(env, market, selectedIntent);
      timings.localizing = (timings.localizing ?? 0) + (Date.now() - localizationStarted);
      details.query = queryText;

      currentStage = 'brave_search';
      await updateRunProgress(env, runId, {
        status: 'running',
        stage: currentStage,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: newCandidatesTotal,
        queued,
        details
      });
      const braveStarted = Date.now();
      const found = await searchBrave(env, selectedIntent.key, queryText, market, resultsPerQuery, startedAt);
      timings.brave_search = (timings.brave_search ?? 0) + (Date.now() - braveStarted);
      queries += 1;
      candidates += found.length;

      currentStage = 'deduplicating';
      await updateRunProgress(env, runId, {
        status: 'running',
        stage: currentStage,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: newCandidatesTotal,
        queued,
        details
      });
      const dedupeStarted = Date.now();
      const newCandidates: Candidate[] = [];
      for (const candidate of found) {
        const queueCandidate: Candidate = { ...candidate, runId };
        if (await insertCandidate(env, queueCandidate)) newCandidates.push(queueCandidate);
      }
      timings.deduplicating = (timings.deduplicating ?? 0) + (Date.now() - dedupeStarted);
      newCandidatesTotal += newCandidates.length;

      currentStage = newCandidates.length > 0 ? 'queueing' : 'deduplicating';
      await updateRunProgress(env, runId, {
        status: newCandidates.length > 0 ? 'queued' : 'running',
        stage: currentStage,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: newCandidatesTotal,
        queued,
        details
      });

      if (newCandidates.length > 0) {
        const queueStarted = Date.now();
        await env.CANDIDATE_QUEUE.sendBatch(newCandidates.map((body) => ({ body })));
        timings.queueing = (timings.queueing ?? 0) + (Date.now() - queueStarted);
      }
    }

    const searchFinishedAt = new Date().toISOString();
    if (queued > 0) {
      currentStage = 'awaiting_classification';
      await updateRunProgress(env, runId, {
        status: 'queued',
        stage: currentStage,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: newCandidatesTotal,
        queued,
        error: null,
        details
      });
    } else {
      await updateRunProgress(env, runId, {
        status: 'completed',
        stage: 'completed',
        finishedAt: searchFinishedAt,
        elapsedMs: elapsedSince(startedMs),
        queries,
        braveResults: candidates,
        newCandidates: 0,
        queued: 0,
        analyzed: 0,
        eligible: 0,
        highIntent: 0,
        socialCampaigns: 0,
        error: null,
        details
      });
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    await updateRunProgress(env, runId, {
      status: 'failed',
      stage: `${currentStage}_failed`,
      finishedAt: new Date().toISOString(),
      elapsedMs: elapsedSince(startedMs),
      queries,
      braveResults: candidates,
      newCandidates: newCandidatesTotal,
      queued,
      error,
      details
    });
    console.error(JSON.stringify({ event: 'radar_scheduled_error', runId, error }));
  } finally {
    await finishRun(env, runId, { queries, candidates, queued, error });
    console.log(JSON.stringify({ event: 'radar_run', runId, queries, candidates, queued, error: error ?? null }));
  }
}

export default {
  async fetch(request: Request, env: RadarEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'scoring-radar', version: '0.2.0' });
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
      return handleAdminApi(request, env, url, ctx);
    }

    return json({ ok: false, error: 'not_found' }, 404);
  },

  async scheduled(controller: ScheduledController, env: RadarEnv): Promise<void> {
    await runScheduled(env, controller.scheduledTime);
  },

  async queue(batch: MessageBatch<Candidate>, env: RadarEnv): Promise<void> {
    const candidates = batch.messages.map((message) => message.body);
    const runIds = [...new Set(candidates.map((candidate) => candidate.runId).filter((id): id is string => Boolean(id)))];
    const progressByRun = new Map<string, RunProgressRow>();
    const detailsByRun = new Map<string, Record<string, unknown>>();

    for (const runId of runIds) {
      const progress = await getRunProgress(env, runId);
      if (!progress) continue;
      progressByRun.set(runId, progress);
      const details = parseJsonField<Record<string, unknown>>(progress.details_json, {});
      detailsByRun.set(runId, details);
      await updateRunProgress(env, runId, {
        status: 'processing',
        stage: 'classifying',
        elapsedMs: Math.max(0, Date.now() - Date.parse(progress.started_at)),
        details
      });
    }

    const classifyStarted = Date.now();
    let analyses: Awaited<ReturnType<typeof classifyCandidates>>;
    try {
      analyses = await classifyCandidates(env, candidates);
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : String(caught);
      for (const runId of runIds) {
        const progress = progressByRun.get(runId);
        const details = detailsByRun.get(runId) ?? {};
        const timings = details.timings && typeof details.timings === 'object'
          ? details.timings as Record<string, number>
          : {};
        timings.classifying = Date.now() - classifyStarted;
        details.timings = timings;
        await updateRunProgress(env, runId, {
          status: 'failed',
          stage: 'classification_failed',
          finishedAt: new Date().toISOString(),
          elapsedMs: progress ? Math.max(0, Date.now() - Date.parse(progress.started_at)) : 0,
          error,
          details
        });
      }
      console.error(JSON.stringify({ event: 'radar_classification_error', runIds, error }));
      throw caught;
    }

    const classifyDuration = Date.now() - classifyStarted;
    const byId = new Map(analyses.map((analysis) => [analysis.id, analysis]));

    for (const candidate of candidates) {
      const analysis = byId.get(candidate.id);
      if (!analysis) {
        const error = `Missing classifier result for candidate ${candidate.id}`;
        if (candidate.runId) {
          const progress = progressByRun.get(candidate.runId);
          await updateRunProgress(env, candidate.runId, {
            status: 'failed',
            stage: 'classification_failed',
            finishedAt: new Date().toISOString(),
            elapsedMs: progress ? Math.max(0, Date.now() - Date.parse(progress.started_at)) : 0,
            error
          });
        }
        throw new Error(error);
      }
      await applyAnalysis(env, analysis);
    }

    for (const runId of runIds) {
      const progress = progressByRun.get(runId);
      const details = detailsByRun.get(runId) ?? {};
      const timings = details.timings && typeof details.timings === 'object'
        ? details.timings as Record<string, number>
        : {};
      timings.classifying = classifyDuration;
      details.timings = timings;
      const runCandidateIds = new Set(candidates.filter((candidate) => candidate.runId === runId).map((candidate) => candidate.id));
      const runAnalyses = analyses.filter((analysis) => runCandidateIds.has(analysis.id));
      await updateRunProgress(env, runId, {
        status: 'processing',
        stage: 'social_growth',
        elapsedMs: progress ? Math.max(0, Date.now() - Date.parse(progress.started_at)) : 0,
        analyzed: runAnalyses.length,
        eligible: runAnalyses.filter((analysis) => analysis.eligible).length,
        highIntent: runAnalyses.filter((analysis) => analysis.eligible && analysis.score >= 90).length,
        details
      });
    }

    const socialStarted = Date.now();
    let socialResult: Awaited<ReturnType<typeof maybeCreateSocialCampaign>> = { created: false };
    let socialError: string | null = null;
    try {
      socialResult = await maybeCreateSocialCampaign(env, candidates, analyses);
    } catch (caught) {
      socialError = caught instanceof Error ? caught.message : String(caught);
      console.error(JSON.stringify({ event: 'social_campaign_error', runIds, error: socialError }));
    }
    const socialDuration = Date.now() - socialStarted;
    const campaignRunId = socialResult.sourceSightingId
      ? candidates.find((candidate) => candidate.id === socialResult.sourceSightingId)?.runId
      : undefined;

    for (const runId of runIds) {
      const progress = progressByRun.get(runId);
      const details = detailsByRun.get(runId) ?? {};
      const timings = details.timings && typeof details.timings === 'object'
        ? details.timings as Record<string, number>
        : {};
      timings.social_growth = socialDuration;
      details.timings = timings;
      const runCandidateIds = new Set(candidates.filter((candidate) => candidate.runId === runId).map((candidate) => candidate.id));
      const runAnalyses = analyses.filter((analysis) => runCandidateIds.has(analysis.id));
      const finishedAt = new Date().toISOString();
      await updateRunProgress(env, runId, {
        status: socialError ? 'completed_with_warnings' : 'completed',
        stage: socialError ? 'social_growth_failed' : 'completed',
        finishedAt,
        elapsedMs: progress ? Math.max(0, Date.now() - Date.parse(progress.started_at)) : 0,
        analyzed: runAnalyses.length,
        eligible: runAnalyses.filter((analysis) => analysis.eligible).length,
        highIntent: runAnalyses.filter((analysis) => analysis.eligible && analysis.score >= 90).length,
        socialCampaigns: socialResult.created && campaignRunId === runId ? 1 : 0,
        error: socialError,
        details
      });
    }

    console.log(JSON.stringify({
      event: 'radar_classified',
      count: candidates.length,
      runIds,
      socialCampaignCreated: socialResult.created,
      socialError
    }));
  }
} satisfies ExportedHandler<RadarEnv, Candidate>;
