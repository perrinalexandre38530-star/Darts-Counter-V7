import { intFromEnv } from './config';
import type { Analysis, Candidate, RadarEnv, SocialDraft, SocialQa } from './domain';
import { withTimeout } from './timeout';

const SOCIAL_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast' as const;

const VERIFIED_PRODUCT_FACTS = [
  'The product name is MULTISPORTS SCORING.',
  'The application covers multiple sports and scoring/performance experiences.',
  'Darts scoring and statistics are core capabilities.',
  'RUNNING PERF covers outdoor/GPS/performance-oriented experiences.',
  'FIT PERF covers fitness/training-oriented experiences.',
  'The application can be discovered through the official application destination link supplied by the system.',
  'Do not claim user counts, ratings, awards, store rankings, medical benefits, guaranteed performance gains or features not explicitly listed here.'
].join('\n- ');


const SOCIAL_DRAFT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: {
      language: { type: 'string' },
      topic: { type: 'string' },
      angle: { type: 'string' },
      hook: { type: 'string' },
      callToAction: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      mediaType: { type: 'string', enum: ['image', 'video'] },
      mediaBrief: {
        type: 'object',
        properties: {
          objective: { type: 'string' },
          durationSeconds: { type: ['number', 'null'] },
          aspectRatio: { type: 'string', enum: ['9:16', '1:1', '4:5', '16:9'] },
          storyboard: { type: 'array', items: { type: 'string' } },
          requiredApprovedAssets: { type: 'array', items: { type: 'string' } },
          forbiddenElements: { type: 'array', items: { type: 'string' } }
        },
        required: ['objective', 'durationSeconds', 'aspectRatio', 'storyboard', 'requiredApprovedAssets', 'forbiddenElements']
      },
      platformCopies: {
        type: 'object',
        properties: {
          facebook_page: { type: 'string' },
          instagram_reel: { type: 'string' },
          youtube_short: { type: 'string' },
          tiktok: { type: 'string' }
        },
        required: ['facebook_page', 'instagram_reel', 'youtube_short', 'tiktok']
      }
    },
    required: ['language', 'topic', 'angle', 'hook', 'callToAction', 'hashtags', 'mediaType', 'mediaBrief', 'platformCopies']
  }
} as const;

const SOCIAL_QA_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: {
      qualityScore: { type: 'number' },
      factualScore: { type: 'number' },
      brandScore: { type: 'number' },
      usefulnessScore: { type: 'number' },
      visualScore: { type: 'number' },
      spamRisk: { type: 'number' },
      cringeRisk: { type: 'number' },
      decision: { type: 'string', enum: ['pass', 'reject'] },
      reason: { type: 'string' }
    },
    required: ['qualityScore', 'factualScore', 'brandScore', 'usefulnessScore', 'visualScore', 'spamRisk', 'cringeRisk', 'decision', 'reason']
  }
} as const;

/** Read common Workers AI envelopes without trusting arbitrary surrounding prose. */
function extractStructured(output: unknown): unknown {
  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>;
    if ('response' in record) {
      if (record.response && typeof record.response === 'object') return record.response;
      if (typeof record.response === 'string') return parseStructuredText(record.response);
    }
    if ('language' in record || 'qualityScore' in record) return record;
  }
  return parseStructuredText(extractText(output));
}

function parseStructuredText(raw: string): unknown {
  const cleaned = cleanJson(raw);
  const candidates = [cleaned];
  // Models sometimes prefix JSON with commentary or suffix it with an explanation.
  // Only extract a balanced JSON object; ignore braces occurring inside strings.
  const start = cleaned.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i += 1) {
      const char = cleaned[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(cleaned.slice(start, i + 1));
          break;
        }
      }
    }
  }
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as unknown; } catch { /* try another candidate */ }
    // Repair trailing commas only outside JSON strings.
    let quoted = false;
    let escaped = false;
    let noTrailingCommas = '';
    for (let i = 0; i < candidate.length; i += 1) {
      const char = candidate[i];
      if (quoted) {
        noTrailingCommas += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      if (char === ',' && /^[\s]*[}\]]/.test(candidate.slice(i + 1))) continue;
      noTrailingCommas += char;
    }
    if (noTrailingCommas !== candidate) {
      try { return JSON.parse(noTrailingCommas) as unknown; } catch { /* retry at model level */ }
    }
  }
  throw new Error('Social AI returned malformed JSON');
}

function isMalformedStructuredResponse(error: unknown): boolean {
  return error instanceof SyntaxError || (error instanceof Error && /malformed JSON|invalid JSON|unsupported response shape|empty or invalid response/.test(error.message));
}

async function readSocialStructured(
  env: RadarEnv,
  request: { messages: Array<{ role: 'system' | 'user'; content: string }> },
  responseFormat: typeof SOCIAL_DRAFT_RESPONSE_FORMAT | typeof SOCIAL_QA_RESPONSE_FORMAT,
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
  label: string
): Promise<unknown> {
  const run = (messages: Array<{ role: 'system' | 'user'; content: string }>, tokens: number) => withTimeout(env.AI.run(SOCIAL_MODEL, {
    messages,
    response_format: responseFormat,
    max_tokens: tokens,
    temperature
  }), timeoutMs, label);
  // `request` is the source of truth for the first prompt and for the controlled retry.
  const messages = request.messages;
  try {
    return extractStructured(await run(messages, maxTokens));
  } catch (error) {
    if (!isMalformedStructuredResponse(error)) throw error;
    console.warn(JSON.stringify({ event: 'social_json_retry', stage: label, reason: error instanceof Error ? error.message : String(error) }));
    const original = Array.isArray(messages) ? messages : [];
    const retryMessages = [
      ...original,
      { role: 'system' as const, content: 'The previous output could not be parsed. Return ONE complete valid JSON object matching the requested schema. No Markdown, surrounding explanation, trailing commas, or truncated strings. Keep every required key; shorten text if necessary.' }
    ];
    return extractStructured(await run(retryMessages, maxTokens));
  }
}

function extractText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (!output || typeof output !== 'object') {
    throw new Error('Workers AI returned an empty or invalid response');
  }

  const record = output as Record<string, unknown>;

  // Legacy Workers AI text-generation shape.
  if (typeof record.response === 'string') return record.response;

  // Some specialized Workers AI endpoints use a dedicated text field.
  if (typeof record.translated_text === 'string') return record.translated_text;

  // OpenAI-compatible chat-completion shape used by GLM-4.7-Flash.
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

function clamp(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseDraft(raw: unknown, fallbackLanguage: string): SocialDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Social generator returned invalid JSON');
  const row = raw as Record<string, unknown>;
  const media = row.mediaBrief && typeof row.mediaBrief === 'object'
    ? row.mediaBrief as Record<string, unknown>
    : {};
  const copies = row.platformCopies && typeof row.platformCopies === 'object'
    ? row.platformCopies as Record<string, unknown>
    : {};
  const mediaType = row.mediaType === 'image' ? 'image' : 'video';
  const aspectRatio = ['9:16', '1:1', '4:5', '16:9'].includes(String(media.aspectRatio))
    ? String(media.aspectRatio) as SocialDraft['mediaBrief']['aspectRatio']
    : '9:16';
  const durationRaw = Number(media.durationSeconds);

  return {
    language: text(row.language, 32) || fallbackLanguage || 'fr',
    topic: text(row.topic, 120),
    angle: text(row.angle, 240),
    hook: text(row.hook, 220),
    callToAction: text(row.callToAction, 220),
    hashtags: stringArray(row.hashtags, 12, 48),
    mediaType,
    mediaBrief: {
      objective: text(media.objective, 500),
      durationSeconds: Number.isFinite(durationRaw) ? Math.max(5, Math.min(60, Math.round(durationRaw))) : null,
      aspectRatio,
      storyboard: stringArray(media.storyboard, 10, 300),
      requiredApprovedAssets: stringArray(media.requiredApprovedAssets, 12, 140),
      forbiddenElements: stringArray(media.forbiddenElements, 12, 180)
    },
    platformCopies: {
      facebook_page: text(copies.facebook_page, 1800),
      instagram_reel: text(copies.instagram_reel, 1800),
      youtube_short: text(copies.youtube_short, 2400),
      tiktok: text(copies.tiktok, 1800)
    }
  };
}

function parseQa(raw: unknown): SocialQa {
  if (!raw || typeof raw !== 'object') throw new Error('Social QA returned invalid JSON');
  const row = raw as Record<string, unknown>;
  const required = ['qualityScore', 'factualScore', 'brandScore', 'usefulnessScore', 'visualScore', 'spamRisk', 'cringeRisk', 'decision', 'reason'];
  if (required.some((key) => !(key in row))) throw new Error('Social QA returned incomplete JSON');
  return {
    qualityScore: clamp(row.qualityScore),
    factualScore: clamp(row.factualScore),
    brandScore: clamp(row.brandScore),
    usefulnessScore: clamp(row.usefulnessScore),
    visualScore: clamp(row.visualScore),
    spamRisk: clamp(row.spamRisk),
    cringeRisk: clamp(row.cringeRisk),
    decision: row.decision === 'pass' ? 'pass' : 'reject',
    reason: text(row.reason, 900)
  };
}

export function socialQaPasses(env: RadarEnv, qa: SocialQa): boolean {
  const minQuality = intFromEnv(env.SOCIAL_MIN_QUALITY_SCORE, 90, 0, 100);
  const minFactual = intFromEnv(env.SOCIAL_MIN_FACTUAL_SCORE, 95, 0, 100);
  const minVisual = intFromEnv(env.SOCIAL_MIN_VISUAL_SCORE, 90, 0, 100);
  const maxSpam = intFromEnv(env.SOCIAL_MAX_SPAM_RISK, 10, 0, 100);
  const maxCringe = intFromEnv(env.SOCIAL_MAX_CRINGE_RISK, 10, 0, 100);

  return qa.decision === 'pass'
    && qa.qualityScore >= minQuality
    && qa.factualScore >= minFactual
    && qa.brandScore >= 90
    && qa.usefulnessScore >= 85
    && qa.visualScore >= minVisual
    && qa.spamRisk <= maxSpam
    && qa.cringeRisk <= maxCringe;
}

export async function generateAndAuditSocialDraft(
  env: RadarEnv,
  candidate: Candidate,
  analysis: Analysis
): Promise<{ draft: SocialDraft; qa: SocialQa; passes: boolean }> {
  const timeoutMs = intFromEnv(env.SOCIAL_AI_TIMEOUT_MS, 30_000, 5_000, 90_000);

  const generationStarted = Date.now();
  const generation = await readSocialStructured(env, {
    messages: [
      {
        role: 'system',
        content: `Create one concise, conversion-focused organic campaign for MULTISPORTS SCORING from the supplied HIGH-INTENT market need.

Rules:
- Never identify, quote or impersonate the source person.
- The campaign MUST be anchored to the concrete sport/use-case in source_need. Never turn a vague source into generic 'find a hobby', generic motivation or broad lifestyle content.
- If the source_need is not a concrete scoring/training/statistics/challenge/partner problem, make the creative explicitly product-led around the closest verified use-case; do not invent a different need.
- Use ONLY these verified facts:\n- ${VERIFIED_PRODUCT_FACTS}
- No hype, fake urgency, fake reviews, fake ratings, invented numbers or unsupported features.
- Media must use only a human-approved asset library: real app screenshots/screen recordings, approved Awena videos/visuals, approved logos or approved product footage.
- Never request fake UI, random AI people or fabricated testimonials.
- Prefer a 9:16 video of 12-30 seconds when suitable.
- facebook_page and youtube_short may use {{APP_LINK}}.
- instagram_reel and tiktok must use a natural CTA without inventing a clickable caption link or baked-in promotional watermark.
- Keep copy in the detected source language.
- Lead with the concrete pain point, show one relevant product benefit, then one clear CTA. Avoid generic slogans such as 'find a new hobby', 'level up your life', 'discover your passion' or equivalent.
- Keep each platform copy concise and adapted to its platform.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          source_need: {
            title: candidate.title,
            snippet: candidate.snippet,
            market: candidate.market
          },
          analysis: {
            language: analysis.language,
            category: analysis.category,
            intent: analysis.intent,
            score: analysis.score,
            reason: analysis.reason
          }
        })
      }
    ],
  }, SOCIAL_DRAFT_RESPONSE_FORMAT, 1100, 0.2, timeoutMs, 'Workers AI social draft generation');

  const draft = parseDraft(generation, analysis.language);
  console.log(JSON.stringify({
    event: 'social_draft_generated',
    model: SOCIAL_MODEL,
    elapsedMs: Date.now() - generationStarted,
    language: draft.language,
    mediaType: draft.mediaType
  }));

  const auditStarted = Date.now();
  const audit = await readSocialStructured(env, {
    messages: [
      {
        role: 'system',
        content: `Audit this MULTISPORTS SCORING campaign strictly for public use.

Reject cheap, generic, spammy, cringe, misleading, off-topic or visually impossible creative. Reject campaigns that are not clearly about the source sport/use-case or that use generic hobby/lifestyle hooks. Reject any claim not supported by these verified facts:\n- ${VERIFIED_PRODUCT_FACTS}

PASS only if:
qualityScore>=90, factualScore>=95, brandScore>=90, usefulnessScore>=85, visualScore>=90, spamRisk<=10, cringeRisk<=10.

The media brief must be executable only with approved real product assets. If uncertain, reject.`
      },
      { role: 'user', content: JSON.stringify(draft) }
    ],
  }, SOCIAL_QA_RESPONSE_FORMAT, 420, 0, timeoutMs, 'Workers AI social quality audit');

  const qa = parseQa(audit);
  console.log(JSON.stringify({
    event: 'social_qa_completed',
    model: SOCIAL_MODEL,
    elapsedMs: Date.now() - auditStarted,
    decision: qa.decision,
    qualityScore: qa.qualityScore,
    factualScore: qa.factualScore,
    visualScore: qa.visualScore
  }));

  return { draft, qa, passes: socialQaPasses(env, qa) };
}
