CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  display_name TEXT,
  avatar TEXT,
  avatar_url TEXT,
  avatar_data_url TEXT,
  country TEXT,
  country_code TEXT,
  bio TEXT,
  surname TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  city TEXT,
  phone TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  private_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_store (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL DEFAULT 'main',
  payload JSONB,
  data JSONB,
  payload_text TEXT,
  data_text TEXT,
  payload_encoding TEXT,
  data_encoding TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_store_user_store ON user_store(user_id, store);


CREATE TABLE IF NOT EXISTS user_store_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL DEFAULT 'main',
  payload JSONB,
  data JSONB,
  payload_text TEXT,
  data_text TEXT,
  payload_encoding TEXT,
  data_encoding TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_store_snapshots_user_created
  ON user_store_snapshots(user_id, store, created_at DESC);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  sport TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stats (
  profile_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, sport)
);

CREATE TABLE IF NOT EXISTS auth_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- Online friends / partage social V1
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_status ON friend_requests(to_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_status ON friend_requests(from_user_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair
  ON friend_requests(from_user_id, to_user_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a_id <> user_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair ON friendships(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);

CREATE TABLE IF NOT EXISTS online_presence (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_items (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  sport TEXT,
  match_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_shared_items_target_created ON shared_items(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_items_owner_created ON shared_items(owner_user_id, created_at DESC);


-- -----------------------------------------------------------------------------
-- Avatar IA credits / purchases / generations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS avatar_ai_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  free_used BOOLEAN NOT NULL DEFAULT FALSE,
  credits INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_generated INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avatar_ai_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_avatar_ai_purchases_user ON avatar_ai_purchases(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS avatar_ai_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  style TEXT,
  used_free BOOLEAN NOT NULL DEFAULT FALSE,
  used_credit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_avatar_ai_generations_user ON avatar_ai_generations(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Online gameplay V10.1 SAFE : salons, joueurs, matchs et chat NAS
-- Ajout non-destructif. Ne supprime/modifie aucune table existante.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS online_lobbies (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'x01',
  max_players INTEGER NOT NULL DEFAULT 2,
  host_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  host_nickname TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS max_players INTEGER NOT NULL DEFAULT 2;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS host_user_id TEXT;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS host_nickname TEXT;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_lobbies_code_unique_safe ON online_lobbies(code);
CREATE INDEX IF NOT EXISTS idx_online_lobbies_status_created_safe ON online_lobbies(status, created_at DESC);

CREATE TABLE IF NOT EXISTS online_lobby_players (
  id TEXT PRIMARY KEY,
  lobby_id TEXT NOT NULL,
  lobby_code TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'online',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS lobby_id TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS lobby_code TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'online';
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_lobby_players_lobby_user_safe ON online_lobby_players(lobby_id, user_id);
CREATE INDEX IF NOT EXISTS idx_online_lobby_players_code_safe ON online_lobby_players(lobby_code);

CREATE TABLE IF NOT EXISTS online_matches (
  id TEXT PRIMARY KEY,
  lobby_code TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'x01',
  status TEXT NOT NULL DEFAULT 'started',
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_user TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS lobby_code TEXT;
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'started';
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS state_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS owner_user TEXT;
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_matches_lobby_code_safe ON online_matches(lobby_code);
CREATE INDEX IF NOT EXISTS idx_online_matches_updated_safe ON online_matches(updated_at DESC);

CREATE TABLE IF NOT EXISTS online_messages (
  id TEXT PRIMARY KEY,
  lobby_code TEXT NOT NULL,
  user_id TEXT,
  nickname TEXT,
  message JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS lobby_code TEXT;
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS message JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE online_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_online_messages_lobby_created_safe ON online_messages(lobby_code, created_at DESC);

-- -----------------------------------------------------------------------------
-- Online gameplay V11.2 : statut prêt des joueurs avant lancement
-- Ajout non-destructif. La colonne status existe déjà ; ready_at mémorise le moment.
-- -----------------------------------------------------------------------------
ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_online_lobby_players_ready_status_safe ON online_lobby_players(lobby_code, status);

-- ---------------------------------------------------------------------------
-- Baby-Foot Leagues ONLINE — NAS additive schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS babyfoot_leagues (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'infinite',
  scope TEXT NOT NULL DEFAULT 'solo',
  format TEXT NOT NULL DEFAULT 'single',
  visibility TEXT NOT NULL DEFAULT 'private',
  share_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  logo_data_url TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_babyfoot_leagues_owner ON babyfoot_leagues(owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_babyfoot_leagues_public ON babyfoot_leagues(visibility, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_leagues_share_code ON babyfoot_leagues(share_code);

ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS logo_data_url TEXT;
ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS babyfoot_league_members (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  participant_id TEXT,
  participant_name TEXT,
  participant_avatar_url TEXT,
  local_ref_id TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_league_members_participant ON babyfoot_league_members(league_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_babyfoot_league_members_user ON babyfoot_league_members(user_id, league_id);

ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS participant_name TEXT;
ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS participant_avatar_url TEXT;
ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS local_ref_id TEXT;
ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_league_members_league_user ON babyfoot_league_members(league_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS babyfoot_league_fixtures (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
  local_fixture_id TEXT,
  round INTEGER NOT NULL DEFAULT 1,
  home_participant_id TEXT,
  away_participant_id TEXT,
  score_home INTEGER,
  score_away INTEGER,
  played_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'calendar',
  status TEXT NOT NULL DEFAULT 'scheduled',
  lobby_code TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_league_fixtures_local ON babyfoot_league_fixtures(league_id, local_fixture_id);
CREATE INDEX IF NOT EXISTS idx_babyfoot_league_fixtures_status ON babyfoot_league_fixtures(league_id, status, round);

CREATE TABLE IF NOT EXISTS babyfoot_league_match_comments (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
  fixture_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  nickname TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_babyfoot_league_comments_fixture ON babyfoot_league_match_comments(league_id, fixture_id, created_at ASC);

CREATE TABLE IF NOT EXISTS babyfoot_league_forum_threads (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_babyfoot_league_forum_threads ON babyfoot_league_forum_threads(league_id, updated_at DESC);
ALTER TABLE babyfoot_league_forum_threads ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE TABLE IF NOT EXISTS babyfoot_league_forum_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES babyfoot_league_forum_threads(id) ON DELETE CASCADE,
  league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  nickname TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_babyfoot_league_forum_posts ON babyfoot_league_forum_posts(thread_id, created_at ASC);

ALTER TABLE shared_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_shared_items_target_status_created ON shared_items(target_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS local_profile_friend_links (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_profile_id TEXT NOT NULL,
  friend_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_profile_name TEXT,
  friend_display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, local_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_local_profile_friend_links_owner ON local_profile_friend_links(owner_user_id, updated_at DESC);



CREATE TABLE IF NOT EXISTS profile_friend_links (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_profile_id TEXT NOT NULL,
  local_profile_name TEXT,
  local_profile_avatar_url TEXT,
  friend_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_display_name TEXT,
  friend_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  refused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, local_profile_id)
);
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS local_profile_name TEXT;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS local_profile_avatar_url TEXT;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS friend_display_name TEXT;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS friend_avatar_url TEXT;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS stats_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_friend_links_owner_profile ON profile_friend_links(owner_user_id, local_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_friend_links_friend ON profile_friend_links(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_friend_links_friend_status ON profile_friend_links(friend_user_id, status, created_at DESC);

-- -----------------------------------------------------------------------------
-- Messaging center V1 — messages privés, centre de demandes et notifications
-- Additif : utilisé par la page Messagerie sans remplacer les tables existantes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS online_direct_messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  deleted_by_from_at TIMESTAMPTZ,
  deleted_by_to_at TIMESTAMPTZ
);
ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS deleted_by_from_at TIMESTAMPTZ;
ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS deleted_by_to_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_online_direct_messages_pair_created ON online_direct_messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_direct_messages_to_unread ON online_direct_messages(to_user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS system_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system';
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_system_notifications_user_created ON system_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_user_unread ON system_notifications(user_id, read_at, created_at DESC);



-- -----------------------------------------------------------------------------
-- Profile linked stats sync V1 — publication des mini-stats du profil local
-- vers le compte ami accepté. Additif/non destructif.
-- -----------------------------------------------------------------------------
ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS stats_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_profile_friend_links_owner_accepted_stats ON profile_friend_links(owner_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_friend_links_friend_accepted_stats ON profile_friend_links(friend_user_id, status, updated_at DESC);


-- -----------------------------------------------------------------------------
-- Online competitions — ligues / championnats / tournois multi-sports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS online_competitions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'darts',
  mode TEXT NOT NULL DEFAULT 'x01',
  kind TEXT NOT NULL DEFAULT 'tournament',
  status TEXT NOT NULL DEFAULT 'draft',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_online_competitions_owner_updated
  ON online_competitions(owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_competitions_sport_kind_status
  ON online_competitions(sport, kind, status, updated_at DESC);
