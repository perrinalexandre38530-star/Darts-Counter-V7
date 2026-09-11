import type { Candidate, OpportunityRow } from './domain';

const LOW_QUALITY_SOURCE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bprivacy gate\b/i, reason: 'privacy_gate' },
  { pattern: /\bdpg media privacy gate\b/i, reason: 'privacy_gate' },
  { pattern: /\bwe cannot provide a description for this page right now\b/i, reason: 'missing_description_placeholder' },
  { pattern: /\baccess denied\b/i, reason: 'access_denied' },
  { pattern: /\bchecking your browser\b/i, reason: 'browser_challenge' },
  { pattern: /\bverify (?:that )?you are human\b/i, reason: 'human_verification' },
  { pattern: /\benable javascript (?:and|&) cookies\b/i, reason: 'javascript_cookie_gate' },
  { pattern: /\bcaptcha\b/i, reason: 'captcha' },
  { pattern: /\bconsent required\b/i, reason: 'consent_gate' }
];

function combinedSourceText(value: { title?: string | null; snippet?: string | null }): string {
  return `${value.title ?? ''}\n${value.snippet ?? ''}`.trim();
}

export function sourceQualityReason(
  value: Pick<Candidate, 'title' | 'snippet' | 'sourceUrl'> | Pick<OpportunityRow, 'title' | 'snippet' | 'source_url'>
): string | null {
  const text = combinedSourceText(value);
  for (const rule of LOW_QUALITY_SOURCE_PATTERNS) {
    if (rule.pattern.test(text)) return rule.reason;
  }
  return null;
}

function normalizedUrlKey(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    const tracking = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','msclkid'];
    for (const key of tracking) url.searchParams.delete(key);
    url.searchParams.sort();
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}${url.search}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function opportunityDedupeKey(row: Pick<OpportunityRow, 'source_url' | 'title'>): string {
  const urlKey = normalizedUrlKey(row.source_url || '');
  if (urlKey) return `url:${urlKey}`;
  return `title:${(row.title || '').trim().toLowerCase()}`;
}
