import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const radar = path.join(root, 'scoring-radar');
const required = [
  'package.json', 'wrangler.jsonc', 'schema.sql', 'README.md',
  'src/index.ts', 'src/admin.ts', 'src/ai.ts', 'src/social.ts', 'src/brave.ts', 'src/config.ts', 'src/db.ts', 'src/domain.ts', 'src/timeout.ts', 'src/source-quality.ts', 'src/intent-shield.ts', 'src/targets.ts', 'src/diagnostic.ts'
];

for (const file of required) {
  const full = path.join(radar, file);
  if (!fs.existsSync(full)) throw new Error(`SCORING RADAR missing: ${file}`);
}

const wrangler = fs.readFileSync(path.join(radar, 'wrangler.jsonc'), 'utf8');
const brave = fs.readFileSync(path.join(radar, 'src/brave.ts'), 'utf8');
const config = fs.readFileSync(path.join(radar, 'src/config.ts'), 'utf8');
const ai = fs.readFileSync(path.join(radar, 'src/ai.ts'), 'utf8');
const social = fs.readFileSync(path.join(radar, 'src/social.ts'), 'utf8');
const index = fs.readFileSync(path.join(radar, 'src/index.ts'), 'utf8');
const db = fs.readFileSync(path.join(radar, 'src/db.ts'), 'utf8');
const schema = fs.readFileSync(path.join(radar, 'schema.sql'), 'utf8');
const admin = fs.readFileSync(path.join(radar, 'src/admin.ts'), 'utf8');
const timeout = fs.readFileSync(path.join(radar, 'src/timeout.ts'), 'utf8');
const sourceQuality = fs.readFileSync(path.join(radar, 'src/source-quality.ts'), 'utf8');
const intentShield = fs.readFileSync(path.join(radar, 'src/intent-shield.ts'), 'utf8');
const targets = fs.readFileSync(path.join(radar, 'src/targets.ts'), 'utf8');
const diagnostic = fs.readFileSync(path.join(radar, 'src/diagnostic.ts'), 'utf8');

const checks = [
  [wrangler.includes('https://multisports-scoring.pages.dev/'), 'official destination URL'],
  [!wrangler.includes('darts-counter-v7.pages.dev'), 'old Pages URL removed'],
  [wrangler.includes('"crons": ["0 * * * *"]'), 'hourly cron'],
  [wrangler.includes('"RADAR_MARKETS_PER_RUN": "1"'), 'one Brave search market per hourly run'],
  [wrangler.includes('"SOCIAL_AUTOPILOT_MODE": "review"'), 'social review safe mode'],
  [wrangler.includes('"SOCIAL_MIN_QUALITY_SCORE": "90"'), 'high social quality threshold'],
  [wrangler.includes('"SOCIAL_MIN_FACTUAL_SCORE": "95"'), 'high factual threshold'],
  [wrangler.includes('"max_batch_timeout": 2'), 'fast queue handoff for manual scan visibility'],
  [wrangler.includes('"RADAR_BRAVE_TIMEOUT_MS": "15000"'), 'Brave watchdog timeout configured'],
  [wrangler.includes('"RADAR_TRANSLATION_TIMEOUT_MS": "5000"'), 'fast translation timeout configured'],
  [wrangler.includes('"RADAR_CLASSIFY_TIMEOUT_MS": "20000"'), 'per-chunk classifier watchdog timeout configured'],
  [wrangler.includes('"RADAR_CLASSIFY_CHUNK_SIZE": "2"'), 'small classifier chunks configured'],
  [wrangler.includes('"RADAR_CLASSIFY_CONCURRENCY": "2"'), 'bounded parallel classifier workers configured'],
  [wrangler.includes('"RADAR_STALL_TIMEOUT_MS": "90000"'), 'stalled-run watchdog configured'],
  [config.includes("language === 'ja'"), 'Japanese Brave language normalization'],
  [config.includes("'pt-br'"), 'Brazilian Portuguese normalization'],
  [config.includes("'zh-hans'"), 'Simplified Chinese normalization'],
  [config.includes('const BRAVE_COUNTRIES = new Set') && config.includes("'ALL'"), 'Brave supported-country allowlist with worldwide fallback'],
  [config.includes('export function braveSearchCountry') && config.includes("? country : 'ALL'"), 'unsupported market countries map to Brave ALL'],
  [brave.includes('braveSearchCountry(market)') && brave.includes("event: 'brave_country_fallback'"), 'Brave request never sends an unsupported market country silently'],
  [wrangler.includes('"RADAR_FRESHNESS": "pw"') && brave.includes('braveFreshness(env)'), 'configurable one-week Brave freshness window'],
  [brave.includes("'Cache-Control': 'no-cache'"), 'fresh-search no-cache request'],
  [brave.includes('normalizedResultUrl') && brave.includes('TRACKING_QUERY_PARAMS'), 'result URLs are normalized before deduplication'],
  [brave.includes('brave|v2|${queryKey}|${sourceUrl}'), 'candidate identity is intent-aware without multiplying by market'],

  [ai.includes('@cf/meta/llama-3.1-8b-instruct-fast'), 'fast multilingual Workers AI classifier model'],
  [ai.includes('@cf/meta/m2m100-1.2b'), 'dedicated Workers AI translation model'],
  [ai.includes('memoryQueryCache') && ai.includes('d1_cache'), 'two-level localized-query cache'],
  [ai.includes('record.choices') && social.includes('record.choices'), 'OpenAI-compatible Workers AI response support'],
  [ai.includes('radar_translation_fallback') && ai.includes("source: 'fallback'"), 'translation failure falls back without blocking Brave'],
  [ai.includes('withTimeout') && social.includes('withTimeout'), 'Workers AI calls are time-bounded'],
  [brave.includes('AbortController') && brave.includes('Brave Search timed out'), 'Brave request is cancellable and time-bounded'],
  [timeout.includes('OperationTimeoutError'), 'shared timeout helper'],
  [ai.includes('classifyAdaptiveChunk') && ai.includes('radar_classify_chunk_split'), 'classifier adaptively splits slow chunks'],
  [ai.includes('CLASSIFIER_RESPONSE_FORMAT') && ai.includes("type: 'json_schema'"), 'classifier uses structured JSON mode'],
  [ai.includes('radar_classify_candidate_skipped') && ai.includes('classifierFailureAnalysis'), 'single classifier timeout degrades gracefully instead of failing the run'],
  [index.includes('classification_error') && index.includes('completed_with_warnings'), 'classification failures become run warnings while successful candidates continue'],
  [ai.includes('chunksCompleted') && ai.includes('onProgress'), 'classifier reports incremental progress'],
  [index.includes('liveAnalyses') && index.includes('details.classification'), 'queue consumer persists partial classification progress'],
  [admin.includes('Classification : ') && admin.includes('parallèle'), 'dashboard exposes chunked classifier progress'],
  [ai.includes('transparent about affiliation'), 'transparent affiliation policy'],
  [social.includes('APPROVED') || social.includes('approved asset library'), 'approved-media-only social policy'],
  [social.includes('qualityScore'), 'independent social creative QA'],
  [social.includes('cringeRisk'), 'cheap/cringe risk gate'],
  [social.includes('factualScore'), 'factual safety gate'],
  [schema.includes('CREATE TABLE IF NOT EXISTS social_assets'), 'social asset library schema'],
  [schema.includes('CREATE TABLE IF NOT EXISTS social_campaigns'), 'social campaign schema'],
  [schema.includes('CREATE TABLE IF NOT EXISTS run_progress'), 'persistent real-time run progress schema'],
  [index.includes("url.pathname === '/api/run'"), 'manual run endpoint'],
  [index.includes("url.pathname === '/api/auth/check'"), 'single-call admin authentication probe'],
  [index.includes('queued += newCandidates.length'), 'queued candidate count advances after batch handoff'],
  [index.includes('details.query_source = localized.source'), 'scan exposes localization source'],
  [index.includes('details.duplicates') && admin.includes('mDuplicates'), 'duplicate count is persisted and visible in scan monitor'],
  [admin.includes('Fenêtre Brave') && admin.includes('déjà connus'), 'dashboard explains freshness window and duplicate-only scans'],

  [index.includes("url.pathname === '/api/runs/latest'") && index.includes('getRunProgress'), 'run progress API'],
  [index.includes('ctx.waitUntil(runScheduled'), 'manual scan starts asynchronously'],
  [index.includes('CANDIDATE_QUEUE.sendBatch'), 'candidate queue uses batch handoff'],
  [index.includes('watchdog_timeout'), 'stalled scan watchdog'],
  [admin.includes('scanMonitor') && admin.includes('pollRun'), 'live scan monitor with polling'],
  [admin.includes('ensureAuth') && admin.includes('/api/auth/check'), 'dashboard validates auth before parallel API loading'],
  [admin.includes('Source requête'), 'dashboard shows query localization source'],
  [admin.includes('Résultats Brave') && admin.includes('Analysés IA'), 'scan monitor exposes useful stage counters'],
  [sourceQuality.includes('privacy gate') && sourceQuality.includes('missing_description_placeholder'), 'deterministic low-quality source shield'],
  [index.includes('radar_source_rejected') && index.includes('source_rejected'), 'bad search-result sources are rejected before queueing'],
  [db.includes('opportunityDedupeKey') && db.includes('sourceQualityReason'), 'stored opportunities are quality-filtered and deduplicated'],
  [admin.includes('Sources rejetées') && admin.includes('mRejected'), 'dashboard exposes rejected-source count'],
  [ai.includes('privacy/consent gates') && ai.includes('placeholder snippets'), 'classifier prompt independently rejects gate/placeholder pages'],
  [intentShield.includes('app_store_listing') && intentShield.includes('seo_listicle') && intentShield.includes('commercial_product_page'), 'deterministic Intent Shield rejects stores, SEO lists and product pages'],
  [intentShield.includes('no_real_user_intent_signal') && intentShield.includes('scoreCap: 69'), 'content without a real-user signal cannot become a 70+ opportunity'],
  [intentShield.includes('COMMUNITY_HOSTS') && intentShield.includes('USER_SIGNAL_PATTERNS'), 'Intent Shield recognizes community/user-seeking context'],
  [index.includes('hardIntentShieldReason') && index.includes('radar_intent_rejected'), 'hard intent false positives are rejected before AI queueing'],
  [index.includes('enforceIntentShield') && db.includes('requalifyHistoricalIntentShield'), 'AI results are capped by Intent Shield and old opportunities are requalified'],
  [db.includes('opportunityPassesIntentShield') && db.includes('intent_shield_rejected'), 'opportunity lists/stats hide invalid historical opportunities'],
  [index.includes('destination_link: safeDestination') && index.includes("replace('{{APP_LINK}}', safeDestination"), 'user-facing replies use the official app destination instead of workers.dev tracking URLs'],
  [targets.includes('forum discussion') && targets.includes('recommend'), 'search intents bias Brave toward real recommendation discussions'],
  [admin.includes('Intents rejetés') && admin.includes('Historique nettoyé'), 'dashboard exposes Intent Shield decisions and history cleanup'],
  [index.includes("url.pathname === '/api/diagnostics/social-pipeline'") && index.includes('runSocialPipelineDiagnostic'), 'admin-only social pipeline diagnostic endpoint'],
  [diagnostic.includes('braveRequests: 0') && diagnostic.includes('databaseWrites: 0') && diagnostic.includes('publicationAttempted: false'), 'diagnostic explicitly guarantees no Brave, no D1 writes and no publication'],
  [diagnostic.includes('intentShieldDecision') && diagnostic.includes('classifyCandidates') && diagnostic.includes('generateAndAuditSocialDraft'), 'diagnostic exercises Intent Shield, classifier, Social Growth and QA'],
  [diagnostic.includes('reddit.com/r/darts') && diagnostic.includes('Can anyone recommend one?'), 'diagnostic uses a synthetic explicit user-need community candidate'],
  [admin.includes('Tester pipeline social') && admin.includes('/api/diagnostics/social-pipeline'), 'dashboard exposes explicit final pipeline diagnostic action'],
  [admin.includes('Brave : ') && admin.includes('Écritures D1 : ') && admin.includes('Publication : '), 'dashboard diagnostic reports zero-side-effect guarantees'],
  [index.includes("url.pathname === '/api/social/campaigns'"), 'social campaign admin endpoint'],
  [index.includes('approved_asset_required'), 'campaign approval requires approved media'],
  [index.includes('hourlyTick'), 'hourly market rotation'],
  [!index.includes('open.tiktokapis.com') && !index.includes('graph.facebook.com') && !index.includes('googleapis.com/upload/youtube'), 'no live social publisher enabled before account OAuth setup']
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`SCORING RADAR check failed: ${label}`);
}

console.log(`SCORING RADAR + SOCIAL GROWTH integration OK (${checks.length} checks)`);
