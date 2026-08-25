import type { Analysis, Candidate, Market, RadarEnv, SearchIntent } from './domain';
import { cacheQuery, getCachedQuery } from './db';
import { marketKey } from './config';

const AI_MODEL = '@cf/zai-org/glm-4.7-flash' as const;

function extractText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && 'response' in output) {
    const response = (output as { response?: unknown }).response;
    if (typeof response === 'string') return response;
  }
  throw new Error('Workers AI returned an unsupported response shape');
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

export async function localizeQuery(env: RadarEnv, market: Market, intent: SearchIntent): Promise<string> {
  if (market.language === 'en') return intent.canonicalQuery;
  const key = marketKey(market);
  const cached = await getCachedQuery(env, key, intent.key);
  if (cached) return cached;

  const output = await env.AI.run(AI_MODEL, {
    messages: [
      {
        role: 'system',
        content: 'Translate a search-engine query into the requested language. Keep product-neutral wording, sport names, and user-intent words. Return only the translated query, no quotes and no explanation.'
      },
      {
        role: 'user',
        content: `Language code: ${market.language}\nCountry: ${market.country}\nQuery: ${intent.canonicalQuery}`
      }
    ]
  });

  const translated = extractText(output).trim().replace(/^['"]|['"]$/g, '');
  const query = translated.slice(0, 380) || intent.canonicalQuery;
  await cacheQuery(env, key, intent.key, query);
  return query;
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

  const output = await env.AI.run(AI_MODEL, {
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
  });

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
