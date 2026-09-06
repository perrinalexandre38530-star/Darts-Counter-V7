import type { Analysis, Candidate, Market, RadarEnv, SearchIntent } from './domain';
import { cacheQuery, getCachedQuery } from './db';
import { intFromEnv, marketKey } from './config';
import { withTimeout } from './timeout';

const CLASSIFIER_MODEL = '@cf/zai-org/glm-4.7-flash' as const;
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

export async function classifyCandidates(env: RadarEnv, candidates: Candidate[]): Promise<Analysis[]> {
  if (candidates.length === 0) return [];

  const compact = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    url: candidate.sourceUrl,
    title: candidate.title,
    snippet: candidate.snippet,
    language_hint: candidate.languageHint,
    matched_query: candidate.queryText
  }));

  const timeoutMs = intFromEnv(env.RADAR_CLASSIFY_TIMEOUT_MS, 30_000, 5_000, 90_000);
  const output = await withTimeout(env.AI.run(CLASSIFIER_MODEL, {
    messages: [
      {
        role: 'system',
        content: `You are SCORING RADAR, an intent classifier for MULTISPORTS SCORING.
Analyze each public web result and decide whether a real person appears to be actively seeking a solution that the app could legitimately help with.
Supported themes include darts scoring and statistics, running/GPS/performance comparison, multisport scoring, petanque/boules, table tennis, foosball, molkky, sport challenges, social sport/partners, rankings, sessions, and wearable imports.

Rules:
- Score 0-100 for commercial/recommendation intent. 90+ = explicitly asking for an app/recommendation; 70-89 = strong problem/need; 40-69 = related discussion; below 40 = weak mention.
- eligible=true only if a useful, non-spammy response would make sense.
- Reject news articles, SEO pages, store listings, company pages, generic tutorials, and content with no user need.
- Detect the actual language from the text, not only the hint.
- suggestedReply must be in the same language as the source text, concise, useful first, and transparent about affiliation (for example: "Nous développons MULTISPORTS SCORING..."). Never pretend to be an unrelated satisfied customer.
- Do not auto-post. The reply is only a draft for manual review.
- Put the token {{APP_LINK}} where the tracked application link should go.
- Return strict JSON only: an array of objects with exactly these keys: id, language, category, intent, score, eligible, reason, suggestedReply.`
      },
      {
        role: 'user',
        content: JSON.stringify(compact)
      }
    ]
  }), timeoutMs, 'Workers AI candidate classification');

  const parsed = JSON.parse(cleanJson(extractText(output))) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Classifier did not return a JSON array');

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
