import type { Analysis, Candidate, RadarEnv, SocialDraft } from './domain';
import { classifyCandidates } from './ai';
import { generateAndAuditSocialDraft } from './social';
import { enforceIntentShield, hardIntentShieldReason, intentShieldDecision } from './intent-shield';
import { sourceQualityReason } from './source-quality';
import { intFromEnv } from './config';

export type SocialPipelineDiagnosticResult = {
  ok: boolean;
  diagnostic: true;
  persisted: false;
  braveRequests: 0;
  databaseWrites: 0;
  publicationAttempted: false;
  elapsedMs: number;
  stage: string;
  error: string | null;
  timings: Record<string, number>;
  qualityShield: { passed: boolean; reason: string | null };
  intentShield: {
    passed: boolean;
    reason: string | null;
    userSignal: boolean;
    communitySignal: boolean;
    scoreCap: number;
  };
  classification: Analysis | null;
  social: {
    generated: boolean;
    qaPasses: boolean | null;
    draft: SocialDraft | null;
    qa: Awaited<ReturnType<typeof generateAndAuditSocialDraft>>['qa'] | null;
  };
};

function nowMs(): number {
  return Date.now();
}

function diagnosticCandidate(): Candidate {
  const capturedAt = new Date().toISOString();
  return {
    id: `diagnostic-${crypto.randomUUID()}`,
    source: 'diagnostic-community',
    sourceUrl: 'https://www.reddit.com/r/darts/comments/multisports_scoring_diagnostic/',
    title: 'What app do you use to keep darts scores and track X01 and cricket statistics?',
    snippet: "I'm looking for an app to score darts matches, keep X01 and cricket history, and track player statistics. Can anyone recommend one?",
    queryKey: 'diagnostic-darts-app',
    queryText: 'recommend an app for darts scoring and player statistics',
    market: 'en:US',
    languageHint: 'en',
    capturedAt
  };
}

export async function runSocialPipelineDiagnostic(env: RadarEnv): Promise<SocialPipelineDiagnosticResult> {
  const startedAt = nowMs();
  const timings: Record<string, number> = {};
  const candidate = diagnosticCandidate();

  const base: SocialPipelineDiagnosticResult = {
    ok: false,
    diagnostic: true,
    persisted: false,
    braveRequests: 0,
    databaseWrites: 0,
    publicationAttempted: false,
    elapsedMs: 0,
    stage: 'starting',
    error: null,
    timings,
    qualityShield: { passed: false, reason: null },
    intentShield: {
      passed: false,
      reason: null,
      userSignal: false,
      communitySignal: false,
      scoreCap: 0
    },
    classification: null,
    social: {
      generated: false,
      qaPasses: null,
      draft: null,
      qa: null
    }
  };

  try {
    let stageStarted = nowMs();
    const qualityReason = sourceQualityReason(candidate);
    timings.qualityShield = nowMs() - stageStarted;
    base.qualityShield = { passed: !qualityReason, reason: qualityReason };
    if (qualityReason) {
      return {
        ...base,
        elapsedMs: nowMs() - startedAt,
        stage: 'quality_shield_rejected',
        error: `Diagnostic candidate rejected by Quality Shield: ${qualityReason}`
      };
    }

    stageStarted = nowMs();
    const decision = intentShieldDecision(candidate);
    const hardReason = hardIntentShieldReason(candidate);
    timings.intentShield = nowMs() - stageStarted;
    base.intentShield = {
      passed: !hardReason && decision.scoreCap >= 70,
      reason: hardReason ?? decision.reason,
      userSignal: decision.userSignal,
      communitySignal: decision.communitySignal,
      scoreCap: decision.scoreCap
    };
    if (!base.intentShield.passed) {
      return {
        ...base,
        elapsedMs: nowMs() - startedAt,
        stage: 'intent_shield_rejected',
        error: `Diagnostic candidate rejected by Intent Shield: ${hardReason ?? decision.reason ?? 'unknown'}`
      };
    }

    stageStarted = nowMs();
    const classified = await classifyCandidates(env, [candidate]);
    timings.classification = nowMs() - stageStarted;
    const rawAnalysis = classified[0] ?? null;
    if (!rawAnalysis || rawAnalysis.category === 'classification_error') {
      return {
        ...base,
        classification: rawAnalysis,
        elapsedMs: nowMs() - startedAt,
        stage: 'classification_failed',
        error: rawAnalysis?.reason ?? 'Classifier returned no diagnostic result'
      };
    }

    const analysis = enforceIntentShield(candidate, rawAnalysis);
    base.classification = analysis;
    const minOpportunityScore = intFromEnv(env.SOCIAL_MIN_OPPORTUNITY_SCORE, 85, 0, 100);
    if (!analysis.eligible || analysis.score < minOpportunityScore) {
      return {
        ...base,
        elapsedMs: nowMs() - startedAt,
        stage: 'classification_rejected',
        error: `Diagnostic candidate did not clear the opportunity threshold (${analysis.score}/${minOpportunityScore})`
      };
    }

    stageStarted = nowMs();
    const social = await generateAndAuditSocialDraft(env, candidate, analysis);
    timings.socialGrowth = nowMs() - stageStarted;

    return {
      ...base,
      ok: true,
      elapsedMs: nowMs() - startedAt,
      stage: social.passes ? 'completed' : 'completed_qa_rejected',
      error: null,
      social: {
        generated: true,
        qaPasses: social.passes,
        draft: social.draft,
        qa: social.qa
      }
    };
  } catch (caught) {
    return {
      ...base,
      elapsedMs: nowMs() - startedAt,
      stage: 'diagnostic_failed',
      error: caught instanceof Error ? caught.message : String(caught)
    };
  }
}
