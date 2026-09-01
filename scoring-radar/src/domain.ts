export type RadarSecrets = {
  BRAVE_SEARCH_API_KEY?: string;
  RADAR_ADMIN_TOKEN?: string;
  SOCIAL_AUTOPILOT_MODE?: string;
  SOCIAL_MIN_OPPORTUNITY_SCORE?: string;
  SOCIAL_MIN_QUALITY_SCORE?: string;
  SOCIAL_MIN_FACTUAL_SCORE?: string;
  SOCIAL_MIN_VISUAL_SCORE?: string;
  SOCIAL_MAX_SPAM_RISK?: string;
  SOCIAL_MAX_CRINGE_RISK?: string;
  SOCIAL_MAX_CAMPAIGNS_PER_DAY?: string;
  RADAR_TRANSLATION_TIMEOUT_MS?: string;
  RADAR_BRAVE_TIMEOUT_MS?: string;
  RADAR_CLASSIFY_TIMEOUT_MS?: string;
  RADAR_STALL_TIMEOUT_MS?: string;
  SOCIAL_AI_TIMEOUT_MS?: string;
};

export type RadarEnv = Env & RadarSecrets;

export type Market = {
  language: string;
  country: string;
};

export type SearchIntent = {
  key: string;
  canonicalQuery: string;
  description: string;
};

export type Candidate = {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  snippet: string;
  queryKey: string;
  queryText: string;
  market: string;
  languageHint: string;
  capturedAt: string;
  runId?: string;
};

export type Analysis = {
  id: string;
  language: string;
  category: string;
  intent: string;
  score: number;
  eligible: boolean;
  reason: string;
  suggestedReply: string;
};

export type OpportunityRow = {
  id: string;
  source: string;
  source_url: string;
  title: string;
  snippet: string;
  query_key: string;
  market: string;
  language: string | null;
  category: string | null;
  intent: string | null;
  score: number | null;
  eligible: number | null;
  reason: string | null;
  suggested_reply: string | null;
  captured_at: string;
  analyzed_at: string | null;
};

export type SocialPlatform = 'facebook_page' | 'instagram_reel' | 'youtube_short' | 'tiktok';

export type SocialPlatformCopies = Record<SocialPlatform, string>;

export type SocialDraft = {
  language: string;
  topic: string;
  angle: string;
  hook: string;
  callToAction: string;
  hashtags: string[];
  mediaType: 'image' | 'video';
  mediaBrief: {
    objective: string;
    durationSeconds: number | null;
    aspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
    storyboard: string[];
    requiredApprovedAssets: string[];
    forbiddenElements: string[];
  };
  platformCopies: SocialPlatformCopies;
};

export type SocialQa = {
  qualityScore: number;
  factualScore: number;
  brandScore: number;
  usefulnessScore: number;
  visualScore: number;
  spamRisk: number;
  cringeRisk: number;
  decision: 'pass' | 'reject';
  reason: string;
};

export type SocialCampaignRow = {
  id: string;
  source_sighting_id: string | null;
  language: string;
  topic: string;
  angle: string;
  hook: string;
  call_to_action: string;
  hashtags_json: string;
  media_type: string;
  media_brief_json: string;
  platform_copy_json: string;
  quality_score: number;
  factual_score: number;
  brand_score: number;
  usefulness_score: number;
  visual_score: number;
  spam_risk: number;
  cringe_risk: number;
  qa_reason: string;
  status: string;
  selected_asset_id: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  published_at: string | null;
};

export type SocialAssetRow = {
  id: string;
  url: string;
  title: string;
  media_type: string;
  platforms_json: string;
  quality_score: number;
  technical_score: number;
  brand_score: number;
  human_approved: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type RunProgressRow = {
  run_id: string;
  status: string;
  stage: string;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
  elapsed_ms: number;
  queries: number;
  brave_results: number;
  new_candidates: number;
  queued: number;
  analyzed: number;
  eligible: number;
  high_intent: number;
  social_campaigns: number;
  error: string | null;
  details_json: string;
};
