import type { Analysis, Candidate, OpportunityRow } from './domain';
import { sourceQualityReason } from './source-quality';

type IntentShieldInput =
  | Pick<Candidate, 'title' | 'snippet' | 'sourceUrl'>
  | Pick<OpportunityRow, 'title' | 'snippet' | 'source_url'>;

export type IntentShieldDecision = {
  reject: boolean;
  reason: string | null;
  scoreCap: number;
  userSignal: boolean;
  communitySignal: boolean;
  commercialSignal: boolean;
};

const COMMUNITY_HOSTS = [
  'reddit.com', 'old.reddit.com', 'quora.com', 'stackexchange.com', 'stackoverflow.com',
  'lemmy.world', 'lemmy.ml', 'news.ycombinator.com', 'facebook.com', 'threads.net',
  'mastodon.social'
];

const COMMUNITY_PATH = /\/(?:forum|forums|thread|threads|discussion|discussions|question|questions|topic|topics|community|comments?)(?:\/|$)/i;

const STORE_HOSTS = new Set([
  'play.google.com', 'apps.apple.com', 'microsoft.com', 'www.microsoft.com', 'amazon.com', 'www.amazon.com'
]);

const STORE_PATH = /\/(?:store\/apps|app(?:s)?\/|microsoft-store|amazon-appstore)/i;

const LISTICLE_PATTERNS: RegExp[] = [
  /\b(?:top|best)\s+\d+\b/i,
  /\b\d+\s+(?:best|top|free)\b/i,
  /\bbest\s+(?:free\s+)?(?:sports?|fitness|running|darts?|club|team)?\s*(?:apps?|software|tools?)\b/i,
  /\bsoftware\s+picks?\b/i,
  /\b(?:meilleures?|top)\s+\d*\s*(?:applications?|logiciels?)\b/i,
  /\b(?:beste|top)\s+\d*\s*(?:apps?|software)\b/i,
  /\b(?:mejores|top)\s+\d*\s*(?:apps?|aplicaciones?)\b/i,
  /\b(?:melhores|top)\s+\d*\s*(?:apps?|aplicativos?)\b/i,
  /\bpilihan\s+aplikasi\b/i,
  /\b(?:migliori|top)\s+\d*\s*(?:app|software)\b/i
];

const PRODUCT_TITLE_PATTERNS: RegExp[] = [
  /\bgoogle play\b/i,
  /\bapp store\b/i,
  /\bofficial\s+app\b/i,
  /\bsports?\s+scores?,\s*news\s*&?\s*schedules?\b/i,
  /\bclub\s+management\s+software\b/i,
  /\bteam\s+management\s+(?:app|software)\b/i,
  /\blive\s+scores?\s*&?\s+(?:stats|statistics|results)\b/i,
  /\bfree\s+football\s*&?\s+player\s+stats\b/i
];

const COMMERCIAL_TEXT_PATTERNS: RegExp[] = [
  /\bdownload\s+(?:the\s+)?app\b/i,
  /\bavailable\s+on\s+(?:google\s+play|the\s+app\s+store)\b/i,
  /\bstart\s+(?:your\s+)?free\s+trial\b/i,
  /\bpricing\b/i,
  /\bsign\s+up\b/i,
  /\bmanage\s+your\s+team\b/i,
  /\breal[- ]time\s+(?:scores?|updates?)\b/i
];

const USER_SIGNAL_PATTERNS: RegExp[] = [
  /\b(?:i(?:'m| am)?\s+)?looking\s+for\b/i,
  /\b(?:can|could)\s+(?:anyone|someone)\s+(?:recommend|suggest)\b/i,
  /\b(?:what|which)\s+(?:app|application)\b/i,
  /\b(?:recommend|recommendation(?:s)?)\s+(?:for|an?\s+app)\b/i,
  /\bdoes\s+anyone\s+(?:know|use)\b/i,
  /\bwhat\s+do\s+you\s+use\b/i,
  /\bi\s+need\s+(?:an?\s+)?app\b/i,
  /\bje\s+cherche\b/i,
  /\bquelle?\s+(?:appli|application)\b/i,
  /\b(?:vous|tu)\s+(?:conseillez|recommandez)\b/i,
  /\bquelqu['’]un\s+(?:conna[iî]t|utilise)\b/i,
  /\bbusco\b/i,
  /\bqu[eé]\s+(?:app|aplicaci[oó]n)\b/i,
  /\b(?:recomiendan|recomend[aá]is)\b/i,
  /\balguien\s+conoce\b/i,
  /\bsuche\b/i,
  /\bwelche\s+app\b/i,
  /\b(?:empfehlt|empfehlen)\b/i,
  /\bkennt\s+jemand\b/i,
  /\bcerco\b/i,
  /\bquale\s+app\b/i,
  /\bconsigliate\b/i,
  /\bqualcuno\s+conosce\b/i,
  /\bprocuro\b/i,
  /\bqual\s+(?:app|aplicativo)\b/i,
  /\brecomendam\b/i,
  /\balgu[eé]m\s+conhece\b/i,
  /\bik\s+zoek\b/i,
  /\bwelke\s+app\b/i,
  /\baanbevelen\b/i,
  /\bkent\s+iemand\b/i,
  /\bmencari\s+aplikasi\b/i,
  /\baplikasi\s+apa\b/i,
  /\brekomendasi\b/i,
  /\bletar\s+efter\b/i,
  /\bvilken\s+app\b/i,
  /\brekommenderar\b/i,
  /\bleter\s+etter\b/i,
  /\bhvilken\s+app\b/i,
  /\banbefal(?:er|ing)\b/i
];

function readUrl(value: IntentShieldInput): string {
  return 'sourceUrl' in value ? value.sourceUrl : value.source_url;
}

function combinedText(value: IntentShieldInput): string {
  return `${value.title ?? ''}\n${value.snippet ?? ''}`.trim();
}

function hostAndPath(raw: string): { host: string; path: string } {
  try {
    const url = new URL(raw);
    return { host: url.hostname.toLowerCase().replace(/^www\./, ''), path: url.pathname || '/' };
  } catch {
    return { host: '', path: '' };
  }
}

function hostMatches(host: string, expected: string): boolean {
  const normalized = expected.replace(/^www\./, '');
  return host === normalized || host.endsWith(`.${normalized}`);
}

function isCommunitySource(host: string, path: string): boolean {
  return COMMUNITY_HOSTS.some((item) => hostMatches(host, item)) || COMMUNITY_PATH.test(path);
}

function isStoreListing(host: string, path: string): boolean {
  if (host === 'play.google.com' && /\/store\/apps\//i.test(path)) return true;
  if (host === 'apps.apple.com') return true;
  if (STORE_HOSTS.has(host) && STORE_PATH.test(path)) return true;
  return false;
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function intentShieldDecision(value: IntentShieldInput): IntentShieldDecision {
  const qualityReason = sourceQualityReason(value as never);
  if (qualityReason) {
    return {
      reject: true,
      reason: qualityReason,
      scoreCap: 0,
      userSignal: false,
      communitySignal: false,
      commercialSignal: false
    };
  }

  const text = combinedText(value);
  const { host, path } = hostAndPath(readUrl(value));
  const communitySignal = isCommunitySource(host, path);
  const userSignal = USER_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));

  if (isStoreListing(host, path)) {
    return { reject: true, reason: 'app_store_listing', scoreCap: 10, userSignal, communitySignal, commercialSignal: true };
  }

  if (!communitySignal && LISTICLE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { reject: true, reason: 'seo_listicle', scoreCap: 20, userSignal, communitySignal, commercialSignal: true };
  }

  const productSignals = countMatches(text, PRODUCT_TITLE_PATTERNS);
  const commercialSignals = countMatches(text, COMMERCIAL_TEXT_PATTERNS);
  const commercialSignal = productSignals > 0 || commercialSignals >= 2;
  if (!communitySignal && !userSignal && (productSignals >= 1 || commercialSignals >= 2)) {
    return { reject: true, reason: 'commercial_product_page', scoreCap: 25, userSignal, communitySignal, commercialSignal: true };
  }

  if (!communitySignal && !userSignal) {
    return {
      reject: false,
      reason: 'no_real_user_intent_signal',
      scoreCap: 69,
      userSignal: false,
      communitySignal: false,
      commercialSignal
    };
  }

  return {
    reject: false,
    reason: null,
    scoreCap: 100,
    userSignal,
    communitySignal,
    commercialSignal
  };
}

export function hardIntentShieldReason(value: IntentShieldInput): string | null {
  const decision = intentShieldDecision(value);
  return decision.reject ? decision.reason : null;
}

export function opportunityPassesIntentShield(value: IntentShieldInput): boolean {
  const decision = intentShieldDecision(value);
  return !decision.reject && decision.scoreCap >= 70;
}

export function enforceIntentShield(candidate: Candidate, analysis: Analysis): Analysis {
  const decision = intentShieldDecision(candidate);
  if (decision.reject) {
    return {
      ...analysis,
      category: 'intent_shield_rejected',
      intent: 'commercial_or_non_user_content',
      score: Math.min(analysis.score, decision.scoreCap),
      eligible: false,
      reason: `Intent Shield: ${decision.reason ?? 'rejected'}`,
      suggestedReply: ''
    };
  }

  if (decision.scoreCap < 70) {
    return {
      ...analysis,
      category: analysis.category === 'classification_error' ? analysis.category : 'intent_shield_no_user_signal',
      score: Math.min(analysis.score, decision.scoreCap),
      eligible: false,
      reason: analysis.category === 'classification_error'
        ? analysis.reason
        : 'Intent Shield: aucun signal clair d’un utilisateur réel cherchant une solution.',
      suggestedReply: ''
    };
  }

  return analysis;
}
