import type { Market, RadarEnv } from './domain';

const DEFAULT_MARKETS = [
  'fr:FR', 'en:US', 'en:GB', 'es:ES', 'de:DE', 'it:IT',
  'pt:PT', 'pt:BR', 'nl:NL', 'pl:PL', 'tr:TR', 'ar:SA',
  'hi:IN', 'id:ID', 'ja:JP', 'ko:KR', 'zh-hans:SG', 'zh-hant:TW',
  'ru:RU', 'uk:UA', 'sv:SE', 'da:DK', 'no:NO', 'fi:FI',
  'cs:CZ', 'ro:RO', 'el:GR', 'he:IL', 'th:TH', 'vi:VN',
  'hu:HU', 'bg:BG', 'hr:HR', 'sk:SK', 'sl:SI', 'et:EE',
  'lv:LV', 'lt:LT', 'sr:RS', 'ms:MY', 'bn:BD', 'ta:IN',
  'te:IN', 'gu:IN', 'mr:IN', 'pa:IN', 'kn:IN', 'ml:IN',
  'is:IS', 'ca:ES', 'eu:ES', 'gl:ES'
].join(',');

const BRAVE_LANGUAGES = new Set([
  'ar', 'eu', 'bn', 'bg', 'ca', 'zh-hans', 'zh-hant', 'hr', 'cs', 'da',
  'nl', 'en', 'en-gb', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'gu', 'he',
  'hi', 'hu', 'is', 'it', 'jp', 'kn', 'ko', 'lv', 'lt', 'ms', 'ml', 'mr',
  'nb', 'pl', 'pt-br', 'pt-pt', 'pa', 'ro', 'ru', 'sr', 'sk', 'sl', 'es',
  'sv', 'ta', 'te', 'th', 'tr', 'uk', 'vi'
]);

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

/**
 * Brave Search uses a few provider-specific language identifiers.
 * Returning null intentionally omits search_lang so the localized query itself
 * can still find results for languages not explicitly supported by Brave.
 */
export function braveSearchLanguage(market: Market): string | null {
  const language = market.language.toLowerCase();
  const country = market.country.toUpperCase();
  let normalized = language;

  if (language === 'ja') normalized = 'jp';
  else if (language === 'no') normalized = 'nb';
  else if (language === 'pt') normalized = country === 'BR' ? 'pt-br' : 'pt-pt';
  else if (language === 'en' && country === 'GB') normalized = 'en-gb';
  else if (language === 'zh' || language === 'zh-cn') normalized = 'zh-hans';
  else if (language === 'zh-tw' || language === 'zh-hk') normalized = 'zh-hant';

  return BRAVE_LANGUAGES.has(normalized) ? normalized : null;
}
