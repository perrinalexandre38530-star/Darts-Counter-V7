import type { Candidate, Market, RadarEnv } from './domain';
import { braveSearchLanguage, intFromEnv } from './config';
import { sha256Hex } from './hash';

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  extra_snippets?: string[];
}

interface BraveResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export async function searchBrave(
  env: RadarEnv,
  queryKey: string,
  queryText: string,
  market: Market,
  count: number,
  capturedAt: string
): Promise<Candidate[]> {
  if (!env.BRAVE_SEARCH_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY is not configured');
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', queryText);
  url.searchParams.set('count', String(count));
  url.searchParams.set('country', market.country);
  const searchLanguage = braveSearchLanguage(market);
  if (searchLanguage) url.searchParams.set('search_lang', searchLanguage);
  url.searchParams.set('freshness', 'pd');
  url.searchParams.set('safesearch', 'moderate');
  url.searchParams.set('text_decorations', 'false');
  url.searchParams.set('extra_snippets', 'true');
  url.searchParams.set('result_filter', 'web');

  const timeoutMs = intFromEnv(env.RADAR_BRAVE_TIMEOUT_MS, 15_000, 2_000, 60_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY
      },
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Brave Search timed out after ${timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brave Search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as BraveResponse;
  const results = payload.web?.results ?? [];
  const candidates: Candidate[] = [];

  for (const result of results) {
    const sourceUrl = result.url?.trim();
    if (!sourceUrl) continue;
    const id = await sha256Hex(`brave|${sourceUrl}`);
    const snippets = [result.description, ...(result.extra_snippets ?? [])]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    candidates.push({
      id,
      source: 'brave-web',
      sourceUrl,
      title: result.title?.trim() ?? '',
      snippet: snippets.join('\n').slice(0, 4000),
      queryKey,
      queryText,
      market: `${market.language}:${market.country}`,
      languageHint: market.language,
      capturedAt
    });
  }

  return candidates;
}
