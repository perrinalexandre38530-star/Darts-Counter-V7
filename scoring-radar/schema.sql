CREATE TABLE IF NOT EXISTS sightings (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  snippet TEXT NOT NULL DEFAULT '',
  query_key TEXT NOT NULL DEFAULT '',
  query_text TEXT NOT NULL DEFAULT '',
  market TEXT NOT NULL DEFAULT '',
  language_hint TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  language TEXT,
  category TEXT,
  intent TEXT,
  score INTEGER,
  eligible INTEGER,
  reason TEXT,
  suggested_reply TEXT,
  analyzed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sightings_score ON sightings(score DESC, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_status ON sightings(status, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_source ON sightings(source, captured_at DESC);

CREATE TABLE IF NOT EXISTS query_cache (
  market TEXT NOT NULL,
  query_key TEXT NOT NULL,
  query_text TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (market, query_key)
);

CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  sighting_id TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  referer TEXT,
  country TEXT,
  user_agent TEXT,
  FOREIGN KEY (sighting_id) REFERENCES sightings(id)
);

CREATE INDEX IF NOT EXISTS idx_clicks_sighting ON clicks(sighting_id, clicked_at DESC);

CREATE TABLE IF NOT EXISTS run_log (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  markets TEXT NOT NULL DEFAULT '',
  queries INTEGER NOT NULL DEFAULT 0,
  candidates INTEGER NOT NULL DEFAULT 0,
  queued INTEGER NOT NULL DEFAULT 0,
  error TEXT
);



CREATE TABLE IF NOT EXISTS run_progress (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  stage TEXT NOT NULL DEFAULT 'starting',
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  queries INTEGER NOT NULL DEFAULT 0,
  brave_results INTEGER NOT NULL DEFAULT 0,
  new_candidates INTEGER NOT NULL DEFAULT 0,
  queued INTEGER NOT NULL DEFAULT 0,
  analyzed INTEGER NOT NULL DEFAULT 0,
  eligible INTEGER NOT NULL DEFAULT 0,
  high_intent INTEGER NOT NULL DEFAULT 0,
  social_campaigns INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (run_id) REFERENCES run_log(id)
);

CREATE INDEX IF NOT EXISTS idx_run_progress_status ON run_progress(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_progress_started ON run_progress(started_at DESC);

CREATE TABLE IF NOT EXISTS social_assets (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL,
  platforms_json TEXT NOT NULL DEFAULT '[]',
  quality_score INTEGER NOT NULL DEFAULT 0,
  technical_score INTEGER NOT NULL DEFAULT 0,
  brand_score INTEGER NOT NULL DEFAULT 0,
  human_approved INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_assets_approved ON social_assets(human_approved, quality_score DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS social_campaigns (
  id TEXT PRIMARY KEY,
  source_sighting_id TEXT UNIQUE,
  language TEXT NOT NULL DEFAULT 'fr',
  topic TEXT NOT NULL DEFAULT '',
  angle TEXT NOT NULL DEFAULT '',
  hook TEXT NOT NULL DEFAULT '',
  call_to_action TEXT NOT NULL DEFAULT '',
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  media_type TEXT NOT NULL DEFAULT 'video',
  media_brief_json TEXT NOT NULL DEFAULT '{}',
  platform_copy_json TEXT NOT NULL DEFAULT '{}',
  quality_score INTEGER NOT NULL DEFAULT 0,
  factual_score INTEGER NOT NULL DEFAULT 0,
  brand_score INTEGER NOT NULL DEFAULT 0,
  usefulness_score INTEGER NOT NULL DEFAULT 0,
  visual_score INTEGER NOT NULL DEFAULT 0,
  spam_risk INTEGER NOT NULL DEFAULT 100,
  cringe_risk INTEGER NOT NULL DEFAULT 100,
  qa_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  selected_asset_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  published_at TEXT,
  FOREIGN KEY (source_sighting_id) REFERENCES sightings(id),
  FOREIGN KEY (selected_asset_id) REFERENCES social_assets(id)
);

CREATE INDEX IF NOT EXISTS idx_social_campaigns_status ON social_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_quality ON social_campaigns(quality_score DESC, created_at DESC);
