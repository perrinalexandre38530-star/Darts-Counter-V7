import type { Market, RadarEnv } from './domain';

const DEFAULT_MARKETS = 'fr:FR,en:US,en:GB,es:ES,de:DE,it:IT,pt:PT,pt:BR,nl:NL,pl:PL,tr:TR,ar:SA,hi:IN,id:ID,ja:JP,ko:KR,zh-hans:SG';

export function intFromEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function parseMarkets(env: RadarEnv): Market[] {
  const raw = env.RADAR_MARKETS?.trim() || DEFAULT_MARKETS;
  const seen = new Set<string>();
  const markets: Market[] = [];

  for (const part of raw.split(',')) {
    const [languageRaw, countryRaw] = part.trim().split(':');
    const language = languageRaw?.trim().toLowerCase();
    const country = countryRaw?.trim().toUpperCase();
    if (!language || !country || country.length !== 2) continue;
    const key = `${language}:${country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    markets.push({ language, country });
  }

  return markets.length > 0 ? markets : [{ language: 'en', country: 'US' }];
}

export function marketKey(market: Market): string {
  return `${market.language}:${market.country}`;
}
