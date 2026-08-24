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
