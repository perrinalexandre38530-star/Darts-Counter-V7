export type RadarSecrets = {
  BRAVE_SEARCH_API_KEY?: string;
  RADAR_ADMIN_TOKEN?: string;
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
