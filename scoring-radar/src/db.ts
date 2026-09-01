import type { Analysis, Candidate, OpportunityRow, RadarEnv, RunProgressRow } from './domain';

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
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO run_log (id, started_at, markets) VALUES (?, ?, ?)'
    ).bind(id, startedAt, markets),
    env.DB.prepare(`
      INSERT INTO run_progress (
        run_id, status, stage, started_at, updated_at, details_json
      ) VALUES (?, 'running', 'starting', ?, ?, '{}')
    `).bind(id, startedAt, startedAt)
  ]);
}

export type RunProgressPatch = Partial<{
  status: string;
  stage: string;
  finishedAt: string | null;
  elapsedMs: number;
  queries: number;
  braveResults: number;
  newCandidates: number;
  queued: number;
  analyzed: number;
  eligible: number;
  highIntent: number;
  socialCampaigns: number;
  error: string | null;
  details: Record<string, unknown>;
}>;

export async function updateRunProgress(env: RadarEnv, id: string, patch: RunProgressPatch): Promise<void> {
  const setters: string[] = ['updated_at = ?'];
  const values: unknown[] = [new Date().toISOString()];
  const add = (column: string, value: unknown) => {
    setters.push(`${column} = ?`);
    values.push(value);
  };

  if (patch.status !== undefined) add('status', patch.status);
  if (patch.stage !== undefined) add('stage', patch.stage);
  if (patch.finishedAt !== undefined) add('finished_at', patch.finishedAt);
  if (patch.elapsedMs !== undefined) add('elapsed_ms', Math.max(0, Math.round(patch.elapsedMs)));
  if (patch.queries !== undefined) add('queries', patch.queries);
  if (patch.braveResults !== undefined) add('brave_results', patch.braveResults);
  if (patch.newCandidates !== undefined) add('new_candidates', patch.newCandidates);
  if (patch.queued !== undefined) add('queued', patch.queued);
  if (patch.analyzed !== undefined) add('analyzed', patch.analyzed);
  if (patch.eligible !== undefined) add('eligible', patch.eligible);
  if (patch.highIntent !== undefined) add('high_intent', patch.highIntent);
  if (patch.socialCampaigns !== undefined) add('social_campaigns', patch.socialCampaigns);
  if (patch.error !== undefined) add('error', patch.error);
  if (patch.details !== undefined) add('details_json', JSON.stringify(patch.details));

  values.push(id);
  await env.DB.prepare(`UPDATE run_progress SET ${setters.join(', ')} WHERE run_id = ?`).bind(...values).run();
}

export async function getRunProgress(env: RadarEnv, id: string): Promise<RunProgressRow | null> {
  return env.DB.prepare(`
    SELECT run_id, status, stage, started_at, updated_at, finished_at, elapsed_ms,
           queries, brave_results, new_candidates, queued, analyzed, eligible,
           high_intent, social_campaigns, error, details_json
    FROM run_progress WHERE run_id = ?
  `).bind(id).first<RunProgressRow>();
}

export async function getLatestRunProgress(env: RadarEnv): Promise<RunProgressRow | null> {
  return env.DB.prepare(`
    SELECT run_id, status, stage, started_at, updated_at, finished_at, elapsed_ms,
           queries, brave_results, new_candidates, queued, analyzed, eligible,
           high_intent, social_campaigns, error, details_json
    FROM run_progress ORDER BY started_at DESC LIMIT 1
  `).first<RunProgressRow>();
}

export async function getActiveRunProgress(env: RadarEnv): Promise<RunProgressRow | null> {
  return env.DB.prepare(`
    SELECT run_id, status, stage, started_at, updated_at, finished_at, elapsed_ms,
           queries, brave_results, new_candidates, queued, analyzed, eligible,
           high_intent, social_campaigns, error, details_json
    FROM run_progress
    WHERE status IN ('running', 'processing', 'queued')
    ORDER BY started_at DESC LIMIT 1
  `).first<RunProgressRow>();
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

export async function countSocialCampaignsSince(env: RadarEnv, sinceIso: string): Promise<number> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM social_campaigns WHERE created_at >= ?'
  ).bind(sinceIso).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function socialCampaignExistsForSighting(env: RadarEnv, sightingId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT id FROM social_campaigns WHERE source_sighting_id = ? LIMIT 1'
  ).bind(sightingId).first<{ id: string }>();
  return Boolean(row?.id);
}

export async function insertSocialCampaign(
  env: RadarEnv,
  campaign: {
    id: string;
    sourceSightingId: string;
    language: string;
    topic: string;
    angle: string;
    hook: string;
    callToAction: string;
    hashtagsJson: string;
    mediaType: string;
    mediaBriefJson: string;
    platformCopyJson: string;
    qualityScore: number;
    factualScore: number;
    brandScore: number;
    usefulnessScore: number;
    visualScore: number;
    spamRisk: number;
    cringeRisk: number;
    qaReason: string;
    status: string;
    createdAt: string;
  }
): Promise<boolean> {
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO social_campaigns (
      id, source_sighting_id, language, topic, angle, hook, call_to_action,
      hashtags_json, media_type, media_brief_json, platform_copy_json,
      quality_score, factual_score, brand_score, usefulness_score, visual_score,
      spam_risk, cringe_risk, qa_reason, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    campaign.id,
    campaign.sourceSightingId,
    campaign.language,
    campaign.topic,
    campaign.angle,
    campaign.hook,
    campaign.callToAction,
    campaign.hashtagsJson,
    campaign.mediaType,
    campaign.mediaBriefJson,
    campaign.platformCopyJson,
    campaign.qualityScore,
    campaign.factualScore,
    campaign.brandScore,
    campaign.usefulnessScore,
    campaign.visualScore,
    campaign.spamRisk,
    campaign.cringeRisk,
    campaign.qaReason,
    campaign.status,
    campaign.createdAt,
    campaign.createdAt
  ).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function listSocialCampaigns(env: RadarEnv, limit: number): Promise<import('./domain').SocialCampaignRow[]> {
  const result = await env.DB.prepare(`
    SELECT id, source_sighting_id, language, topic, angle, hook, call_to_action,
           hashtags_json, media_type, media_brief_json, platform_copy_json,
           quality_score, factual_score, brand_score, usefulness_score, visual_score,
           spam_risk, cringe_risk, qa_reason, status, selected_asset_id,
           created_at, updated_at, approved_at, published_at
    FROM social_campaigns
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all<import('./domain').SocialCampaignRow>();
  return result.results ?? [];
}

export async function getSocialCampaign(env: RadarEnv, id: string): Promise<import('./domain').SocialCampaignRow | null> {
  return env.DB.prepare(`
    SELECT id, source_sighting_id, language, topic, angle, hook, call_to_action,
           hashtags_json, media_type, media_brief_json, platform_copy_json,
           quality_score, factual_score, brand_score, usefulness_score, visual_score,
           spam_risk, cringe_risk, qa_reason, status, selected_asset_id,
           created_at, updated_at, approved_at, published_at
    FROM social_campaigns WHERE id = ?
  `).bind(id).first<import('./domain').SocialCampaignRow>();
}

export async function insertSocialAsset(
  env: RadarEnv,
  asset: {
    id: string;
    url: string;
    title: string;
    mediaType: string;
    platformsJson: string;
    qualityScore: number;
    technicalScore: number;
    brandScore: number;
    humanApproved: boolean;
    notes: string;
    createdAt: string;
  }
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO social_assets (
      id, url, title, media_type, platforms_json, quality_score, technical_score,
      brand_score, human_approved, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    asset.id,
    asset.url,
    asset.title,
    asset.mediaType,
    asset.platformsJson,
    asset.qualityScore,
    asset.technicalScore,
    asset.brandScore,
    asset.humanApproved ? 1 : 0,
    asset.notes,
    asset.createdAt,
    asset.createdAt
  ).run();
}

export async function listSocialAssets(env: RadarEnv, approvedOnly: boolean): Promise<import('./domain').SocialAssetRow[]> {
  const sql = `
    SELECT id, url, title, media_type, platforms_json, quality_score, technical_score,
           brand_score, human_approved, notes, created_at, updated_at
    FROM social_assets
    ${approvedOnly ? 'WHERE human_approved = 1' : ''}
    ORDER BY created_at DESC
    LIMIT 200
  `;
  const result = await env.DB.prepare(sql).all<import('./domain').SocialAssetRow>();
  return result.results ?? [];
}

export async function getSocialAsset(env: RadarEnv, id: string): Promise<import('./domain').SocialAssetRow | null> {
  return env.DB.prepare(`
    SELECT id, url, title, media_type, platforms_json, quality_score, technical_score,
           brand_score, human_approved, notes, created_at, updated_at
    FROM social_assets WHERE id = ?
  `).bind(id).first<import('./domain').SocialAssetRow>();
}

export async function attachSocialAsset(env: RadarEnv, campaignId: string, assetId: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE social_campaigns
    SET selected_asset_id = ?, updated_at = ?
    WHERE id = ?
  `).bind(assetId, new Date().toISOString(), campaignId).run();
}

export async function setSocialCampaignStatus(
  env: RadarEnv,
  campaignId: string,
  status: 'ready_for_review' | 'approved' | 'rejected_by_qa' | 'rejected' | 'published'
): Promise<void> {
  const now = new Date().toISOString();
  const approvedAt = status === 'approved' ? now : null;
  const publishedAt = status === 'published' ? now : null;
  await env.DB.prepare(`
    UPDATE social_campaigns
    SET status = ?, updated_at = ?,
        approved_at = CASE WHEN ? IS NOT NULL THEN ? ELSE approved_at END,
        published_at = CASE WHEN ? IS NOT NULL THEN ? ELSE published_at END
    WHERE id = ?
  `).bind(status, now, approvedAt, approvedAt, publishedAt, publishedAt, campaignId).run();
}

export async function getSocialStats(env: RadarEnv): Promise<{
  total: number;
  ready: number;
  approved: number;
  rejected: number;
  assets: number;
  approvedAssets: number;
}> {
  const campaigns = await env.DB.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'ready_for_review' THEN 1 ELSE 0 END) AS ready,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status IN ('rejected_by_qa','rejected') THEN 1 ELSE 0 END) AS rejected
    FROM social_campaigns
  `).first<{ total: number; ready: number | null; approved: number | null; rejected: number | null }>();
  const assets = await env.DB.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN human_approved = 1 THEN 1 ELSE 0 END) AS approved
    FROM social_assets
  `).first<{ total: number; approved: number | null }>();
  return {
    total: Number(campaigns?.total ?? 0),
    ready: Number(campaigns?.ready ?? 0),
    approved: Number(campaigns?.approved ?? 0),
    rejected: Number(campaigns?.rejected ?? 0),
    assets: Number(assets?.total ?? 0),
    approvedAssets: Number(assets?.approved ?? 0)
  };
}
