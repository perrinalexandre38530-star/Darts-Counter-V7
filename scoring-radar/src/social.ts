import { intFromEnv } from './config';
import type { Analysis, Candidate, RadarEnv, SocialDraft, SocialQa } from './domain';
import { withTimeout } from './timeout';

const AI_MODEL = '@cf/zai-org/glm-4.7-flash' as const;

const VERIFIED_PRODUCT_FACTS = [
  'The product name is MULTISPORTS SCORING.',
  'The application covers multiple sports and scoring/performance experiences.',
  'Darts scoring and statistics are core capabilities.',
  'RUNNING PERF covers outdoor/GPS/performance-oriented experiences.',
  'FIT PERF covers fitness/training-oriented experiences.',
  'The application can be discovered through the official application destination link supplied by the system.',
  'Do not claim user counts, ratings, awards, store rankings, medical benefits, guaranteed performance gains or features not explicitly listed here.'
].join('\n- ');

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
  const generation = await withTimeout(env.AI.run(AI_MODEL, {
    messages: [
      {
        role: 'system',
        content: `You are SOCIAL GROWTH IA for MULTISPORTS SCORING. Create one premium organic social campaign inspired by a market need, never by copying or identifying the source person.

The campaign must look like professional product marketing, not generic AI spam. It must be concise, credible, visually executable and useful. Avoid hype, clickbait, fake urgency, fake testimonials and unverifiable claims.

VERIFIED PRODUCT FACTS ONLY:\n- ${VERIFIED_PRODUCT_FACTS}

MEDIA SAFETY POLICY:
- The media will NOT be generated and auto-published blindly.
- Build a media brief that can be fulfilled only from a human-approved asset library: real app screen recordings, clean screenshots, already validated Awena videos/visuals, approved logos or approved product footage.
- Never request random AI people, fake screenshots, fake UI, fake ratings or fake reviews.
- Default to 9:16 video between 12 and 30 seconds when a short video is appropriate.
- TikTok media must not require a baked-in promotional watermark, URL, logo overlay or promotional text overlay. Keep TikTok promotion in the caption/creative concept rather than a prohibited watermark-style treatment.

PLATFORM COPY:
- facebook_page may use {{APP_LINK}}.
- youtube_short may use {{APP_LINK}} in its description.
- instagram_reel should use a natural CTA without inventing a clickable-caption link.
- tiktok should use a natural CTA without embedding a URL in the media.
- Same language as the detected source language unless there is a compelling reason not to.

Return strict JSON only with exactly these top-level keys:
language, topic, angle, hook, callToAction, hashtags, mediaType, mediaBrief, platformCopies.
mediaBrief keys: objective, durationSeconds, aspectRatio, storyboard, requiredApprovedAssets, forbiddenElements.
platformCopies keys: facebook_page, instagram_reel, youtube_short, tiktok.`
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
    ]
  }), timeoutMs, 'Workers AI social draft generation');

  const draft = parseDraft(JSON.parse(cleanJson(extractText(generation))), analysis.language);

  const audit = await withTimeout(env.AI.run(AI_MODEL, {
    messages: [
      {
        role: 'system',
        content: `You are an independent senior creative director and brand-safety reviewer. Audit a proposed MULTISPORTS SCORING social campaign ruthlessly.

Reject anything that feels cheap, generic, cringe, spammy, misleading, visually incoherent or dependent on fake/generated product UI. Reject unsupported product claims. Reject media concepts that cannot be made from an approved asset library. A merely acceptable campaign is not enough: PASS is reserved for work that is strong enough to represent a real consumer app publicly.

Score 0-100:
- qualityScore: overall professional creative quality
- factualScore: confidence every product statement is supported by the verified facts
- brandScore: consistency and credibility
- usefulnessScore: gives audience a clear reason to care
- visualScore: media brief can produce a clean, premium result from approved assets
- spamRisk: higher is worse
- cringeRisk: higher is worse

PASS only if quality>=90, factual>=95, brand>=90, usefulness>=85, visual>=90, spamRisk<=10, cringeRisk<=10.

VERIFIED PRODUCT FACTS:\n- ${VERIFIED_PRODUCT_FACTS}

Return strict JSON only with exactly: qualityScore, factualScore, brandScore, usefulnessScore, visualScore, spamRisk, cringeRisk, decision, reason.`
      },
      { role: 'user', content: JSON.stringify(draft) }
    ]
  }), timeoutMs, 'Workers AI social quality audit');

  const qa = parseQa(JSON.parse(cleanJson(extractText(audit))));
  return { draft, qa, passes: socialQaPasses(env, qa) };
}
