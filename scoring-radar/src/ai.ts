import type { Analysis, Candidate, Market, RadarEnv, SearchIntent } from './domain';
import { cacheQuery, getCachedQuery } from './db';
import { intFromEnv, marketKey } from './config';
import { withTimeout } from './timeout';

const CLASSIFIER_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast' as const;
const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b' as const;
const memoryQueryCache = new Map<string, string>();

export type LocalizedQueryResult = {
  query: string;
  source: 'canonical_en' | 'memory_cache' | 'd1_cache' | 'm2m100' | 'fallback';
};

function extractText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (!output || typeof output !== 'object') {
    throw new Error('Workers AI returned an empty or invalid response');
  }

  const record = output as Record<string, unknown>;

  if (typeof record.response === 'string') return record.response;
  if (typeof record.translated_text === 'string') return record.translated_text;

  if (Array.isArray(record.choices) && record.choices.length > 0) {
    const firstChoice = record.choices[0];
    if (firstChoice && typeof firstChoice === 'object') {
      const choice = firstChoice as Record<string, unknown>;

      if (choice.message && typeof choice.message === 'object') {
        const message = choice.message as Record<string, unknown>;
        if (typeof message.content === 'string') return message.content;

        if (Array.isArray(message.content)) {
          const text = message.content
            .map((part) => {
              if (!part || typeof part !== 'object') return '';
              const item = part as Record<string, unknown>;
              return typeof item.text === 'string' ? item.text : '';
            })
            .filter(Boolean)
            .join('\n');
          if (text) return text;
        }
      }

      if (typeof choice.text === 'string') return choice.text;
    }
  }

  throw new Error(
    `Workers AI returned an unsupported response shape: ${Object.keys(record).join(', ') || 'no keys'}`
  );
}

function cleanJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function translationLanguageCode(market: Market): string {
  const language = market.language.toLowerCase();
  if (language === 'zh-hans' || language === 'zh-hant' || language === 'zh-cn' || language === 'zh-tw') return 'zh';
  if (language === 'en-gb') return 'en';
  return language;
}

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim();
}

function usefulLocalizedQuery(query: string, canonical: string): boolean {
  const normalized = normalizeForComparison(query);
  if (normalized.length < 4) return false;
  return normalized !== normalizeForComparison(canonical);
}

export async function localizeQuery(env: RadarEnv, market: Market, intent: SearchIntent): Promise<LocalizedQueryResult> {
  if (market.language === 'en') return { query: intent.canonicalQuery, source: 'canonical_en' };

  const key = marketKey(market);
  const memoryKey = `${key}|${intent.key}`;
  const memoryCached = memoryQueryCache.get(memoryKey);
  if (memoryCached && usefulLocalizedQuery(memoryCached, intent.canonicalQuery)) {
    return { query: memoryCached, source: 'memory_cache' };
  }

  const cached = await getCachedQuery(env, key, intent.key);
  if (cached && usefulLocalizedQuery(cached, intent.canonicalQuery)) {
    memoryQueryCache.set(memoryKey, cached);
    return { query: cached, source: 'd1_cache' };
  }

  try {
    const timeoutMs = intFromEnv(env.RADAR_TRANSLATION_TIMEOUT_MS, 5_000, 1_000, 20_000);
    const output = await withTimeout(env.AI.run(TRANSLATION_MODEL, {
      text: intent.canonicalQuery,
      source_lang: 'en',
      target_lang: translationLanguageCode(market)
    }), timeoutMs, 'Workers AI query localization');

    const translated = extractText(output).trim().replace(/^['"]|['"]$/g, '').slice(0, 380);
    if (!usefulLocalizedQuery(translated, intent.canonicalQuery)) {
      throw new Error('Translation model returned an unchanged or empty query');
    }

    memoryQueryCache.set(memoryKey, translated);
    await cacheQuery(env, key, intent.key, translated);
    return { query: translated, source: 'm2m100' };
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'radar_translation_fallback',
      market: key,
      model: TRANSLATION_MODEL,
      error: error instanceof Error ? error.message : String(error)
    }));

    // Localization improves recall, but it must never block the actual Brave search.
    return { query: intent.canonicalQuery, source: 'fallback' };
  }
}

export type ClassificationProgress = {
  completed: number;
  total: number;
  chunkSize: number;
  concurrency: number;
  chunksCompleted: number;
  chunksTotal: number;
  failed: number;
  model: string;
  analyses: Analysis[];
};

type ClassificationProgressCallback = (progress: ClassificationProgress) => void | Promise<void>;

const CLASSIFIER_SYSTEM_PROMPT = `Classify public web search results for MULTISPORTS SCORING.
Decide whether a real person is actively seeking a solution the app could legitimately help with.

Supported themes: darts scoring/statistics, running/GPS/performance, multisport scoring, petanque/boules, table tennis, foosball, molkky, sport challenges, finding sport partners, rankings/sessions, wearable imports.

Rules:
- score 0-100: 90+ only for an explicit first-person app/recommendation request from a real user; 70-89 strong user need; 40-69 related discussion; below 40 weak.
- A product page, store listing, competitor page, editorial article, SEO listicle, news page or generic web page WITHOUT a real user asking for help MUST score 69 or lower and eligible=false, even if its content closely matches the search query.
- eligible=true only when a useful, non-spammy reply to an actual user discussion/question would genuinely help.
- reject news, SEO pages, stores, company/product pages, generic tutorials and content with no user need.
- reject privacy/consent gates, cookie walls, access-denied pages, CAPTCHA/browser challenges, and placeholder snippets such as "We cannot provide a description for this page right now".
- detect the source language from the text.
- reason: max 18 words.
- suggestedReply: only when eligible=true, same language as source, max 45 words, useful first and transparent about affiliation. Otherwise return "".
- never impersonate a satisfied customer and never auto-post.
- use {{APP_LINK}} for the tracked application link.
- return exactly one result for every supplied id.`;

const CLASSIFIER_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            language: { type: 'string' },
            category: { type: 'string' },
            intent: { type: 'string' },
            score: { type: 'number' },
            eligible: { type: 'boolean' },
            reason: { type: 'string' },
            suggestedReply: { type: 'string' }
          },
          required: ['id', 'language', 'category', 'intent', 'score', 'eligible', 'reason', 'suggestedReply']
        }
      }
    },
    required: ['results']
  }
} as const;

function classifierFailureAnalysis(candidate: Candidate, error: unknown): Analysis {
  const raw = error instanceof Error ? error.message : String(error);
  const reason = `Classification IA indisponible: ${raw}`.slice(0, 600);
  return {
    id: candidate.id,
    language: candidate.languageHint || 'und',
    category: 'classification_error',
    intent: 'unclassified',
    score: 0,
    eligible: false,
    reason,
    suggestedReply: ''
  };
}

function isClassificationFailure(analysis: Analysis): boolean {
  return analysis.category === 'classification_error';
}

function candidateCompact(candidate: Candidate) {
  return {
    id: candidate.id,
    source: candidate.source,
    url: candidate.sourceUrl,
    title: candidate.title,
    snippet: candidate.snippet,
    language_hint: candidate.languageHint,
    matched_query: candidate.queryText
  };
}

function parseClassifierOutput(output: unknown, candidates: Candidate[]): Analysis[] {
  let parsed: unknown = output;

  if (parsed && typeof parsed === 'object' && 'response' in parsed) {
    parsed = (parsed as { response?: unknown }).response;
  }

  if (typeof parsed === 'string') {
    parsed = JSON.parse(cleanJson(parsed)) as unknown;
  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.results)) parsed = record.results;
  }

  if (!Array.isArray(parsed)) {
    // Backward compatibility for text-style model responses.
    const text = extractText(output);
    const decoded = JSON.parse(cleanJson(text)) as unknown;
    if (Array.isArray(decoded)) parsed = decoded;
    else if (decoded && typeof decoded === 'object' && Array.isArray((decoded as Record<string, unknown>).results)) {
      parsed = (decoded as Record<string, unknown>).results;
    }
  }

  if (!Array.isArray(parsed)) throw new Error('Classifier did not return a JSON result array');

  const allowedIds = new Set(candidates.map((candidate) => candidate.id));
  const analyses: Analysis[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    if (!allowedIds.has(id)) continue;
    analyses.push({
      id,
      language: typeof record.language === 'string' ? record.language.slice(0, 32) : 'und',
      category: typeof record.category === 'string' ? record.category.slice(0, 64) : 'other',
      intent: typeof record.intent === 'string' ? record.intent.slice(0, 64) : 'other',
      score: clampScore(record.score),
      eligible: record.eligible === true,
      reason: typeof record.reason === 'string' ? record.reason.slice(0, 600) : '',
      suggestedReply: typeof record.suggestedReply === 'string' ? record.suggestedReply.slice(0, 1200) : ''
    });
  }

  return analyses;
}

async function classifyChunk(env: RadarEnv, candidates: Candidate[]): Promise<Analysis[]> {
  const timeoutMs = intFromEnv(env.RADAR_CLASSIFY_TIMEOUT_MS, 20_000, 5_000, 90_000);
  const output = await withTimeout(env.AI.run(CLASSIFIER_MODEL, {
    messages: [
      { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(candidates.map(candidateCompact)) }
    ],
    response_format: CLASSIFIER_RESPONSE_FORMAT,
    max_tokens: Math.min(700, 180 + candidates.length * 220),
    temperature: 0
  }), timeoutMs, `Workers AI candidate classification (${candidates.length} candidates)`);

  const analyses = parseClassifierOutput(output, candidates);
  const returnedIds = new Set(analyses.map((analysis) => analysis.id));
  const missing = candidates.filter((candidate) => !returnedIds.has(candidate.id));
  if (missing.length > 0) {
    throw new Error(`Classifier omitted ${missing.length}/${candidates.length} candidate(s)`);
  }
  return analyses;
}

async function classifyAdaptiveChunk(env: RadarEnv, candidates: Candidate[]): Promise<Analysis[]> {
  try {
    return await classifyChunk(env, candidates);
  } catch (caught) {
    if (candidates.length <= 1) {
      const error = caught instanceof Error ? caught.message : String(caught);
      console.error(JSON.stringify({
        event: 'radar_classify_candidate_skipped',
        candidateId: candidates[0]?.id ?? null,
        model: CLASSIFIER_MODEL,
        error
      }));
      return candidates.map((candidate) => classifierFailureAnalysis(candidate, caught));
    }

    const error = caught instanceof Error ? caught.message : String(caught);
    console.warn(JSON.stringify({
      event: 'radar_classify_chunk_split',
      candidates: candidates.length,
      error
    }));

    const midpoint = Math.ceil(candidates.length / 2);
    const left = await classifyAdaptiveChunk(env, candidates.slice(0, midpoint));
    const right = await classifyAdaptiveChunk(env, candidates.slice(midpoint));
    return [...left, ...right];
  }
}

export async function classifyCandidates(
  env: RadarEnv,
  candidates: Candidate[],
  onProgress?: ClassificationProgressCallback
): Promise<Analysis[]> {
  if (candidates.length === 0) return [];

  const chunkSize = intFromEnv(env.RADAR_CLASSIFY_CHUNK_SIZE, 2, 1, 5);
  const concurrency = intFromEnv(env.RADAR_CLASSIFY_CONCURRENCY, 2, 1, 4);
  const chunks: Candidate[][] = [];
  for (let index = 0; index < candidates.length; index += chunkSize) {
    chunks.push(candidates.slice(index, index + chunkSize));
  }

  const byId = new Map<string, Analysis>();
  let cursor = 0;
  let completed = 0;
  let chunksCompleted = 0;

  async function worker(): Promise<void> {
    while (true) {
      const chunkIndex = cursor;
      cursor += 1;
      if (chunkIndex >= chunks.length) return;

      const chunk = chunks[chunkIndex];
      const analyses = await classifyAdaptiveChunk(env, chunk);
      for (const analysis of analyses) byId.set(analysis.id, analysis);
      completed += analyses.length;
      chunksCompleted += 1;

      if (onProgress) {
        await onProgress({
          completed,
          total: candidates.length,
          chunkSize,
          concurrency,
          chunksCompleted,
          chunksTotal: chunks.length,
          failed: [...byId.values()].filter(isClassificationFailure).length,
          model: CLASSIFIER_MODEL,
          analyses
        });
      }
    }
  }

  const workerCount = Math.min(concurrency, chunks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const missing = candidates.filter((candidate) => !byId.has(candidate.id));
  if (missing.length > 0) {
    throw new Error(`Classifier finished with ${missing.length} missing candidate result(s)`);
  }

  return candidates.map((candidate) => byId.get(candidate.id) as Analysis);
}
