-- MULTISPORTS SCORING — Challenge Online leaderboard (Cloudflare D1)
-- D1 = index léger / meilleur score. R2 = détail complet de la meilleure partie.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS challenge_best_scores (
  objective_key TEXT NOT NULL,
  scope_key TEXT NOT NULL DEFAULT 'public',
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Joueur',
  avatar_url TEXT,
  country_code TEXT,
  target TEXT NOT NULL,
  rule TEXT NOT NULL,
  visits INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  darts INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  played_count INTEGER NOT NULL DEFAULT 1,
  best_match_id TEXT NOT NULL,
  stats_key TEXT,
  detail_state TEXT NOT NULL DEFAULT 'unchecked',
  source TEXT NOT NULL DEFAULT 'cloudflare',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (objective_key, scope_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_best_rank
ON challenge_best_scores (
  objective_key,
  scope_key,
  score DESC,
  accuracy DESC,
  best_streak DESC,
  darts ASC,
  updated_at ASC
);

CREATE INDEX IF NOT EXISTS idx_challenge_best_user
ON challenge_best_scores (user_id, objective_key, scope_key);

CREATE TABLE IF NOT EXISTS challenge_submission_receipts (
  user_id TEXT NOT NULL,
  objective_key TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  match_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, objective_key, scope_key, match_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_receipts_date
ON challenge_submission_receipts (submitted_at);

CREATE TABLE IF NOT EXISTS challenge_migration_marks (
  objective_key TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'supabase-v3',
  PRIMARY KEY (objective_key, scope_key)
);
