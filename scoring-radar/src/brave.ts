import type { Candidate, Market, RadarEnv } from './domain';
import { sha256Hex } from './hash';

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
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
  url.searchParams.set('search_lang', market.language);
  url.searchParams.set('freshness', 'pd');
  url.searchParams.set('safesearch', 'moderate');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY
    }
  });

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
    candidates.push({
      id,
      source: 'brave-web',
      sourceUrl,
      title: result.title?.trim() ?? '',
      snippet: result.description?.trim() ?? '',
      queryKey,
      queryText,
      market: `${market.language}:${market.country}`,
      languageHint: market.language,
      capturedAt
    });
  }

  return candidates;
}
