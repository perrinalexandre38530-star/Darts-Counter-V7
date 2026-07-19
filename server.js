require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const zlib = require("zlib");
const LZString = require("lz-string");
const { promisify } = require("util");

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = String(process.env.JWT_SECRET || "change-me-very-long-secret");
const JWT_EXPIRES_IN = String(process.env.JWT_EXPIRES_IN || "30d");
const MEDIA_ROOT = String(process.env.MEDIA_ROOT || path.join(process.cwd(), "media")).trim();
const JSON_LIMIT = String(process.env.JSON_LIMIT || "25mb").trim();
const PGCONNECT_TIMEOUT_MS = Number(process.env.PGCONNECT_TIMEOUT_MS || 8000);
const DB_INIT_ATTEMPTS = Number(process.env.DB_INIT_ATTEMPTS || 30);
let dbReady = false;
let lastDbError = null;

// -----------------------------------------------------------------------------
// CORS global ONLINE V8 — doit rester AVANT toutes les routes.
// Objectif : éviter les réponses sans Access-Control-Allow-Origin derrière
// Cloudflare/NAS, y compris OPTIONS, SSE et erreurs précoces.
// -----------------------------------------------------------------------------
const corsAllowedOrigins = [
  "https://darts-counter-v7.pages.dev",
  "http://localhost:5173",
  /\.pages\.dev$/i,
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = corsAllowedOrigins.some((entry) => {
      if (entry instanceof RegExp) return entry.test(origin);
      return String(entry).toLowerCase() === String(origin).toLowerCase();
    });
    return callback(null, allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  const allowed = !origin || corsAllowedOrigins.some((entry) => entry instanceof RegExp ? entry.test(origin) : String(entry).toLowerCase() === origin.toLowerCase());
  if (allowed && origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({
  limit: JSON_LIMIT,
  verify: (req, _res, buf) => {
    const url = String(req.originalUrl || req.url || "");
    if (url.startsWith("/avatar-ai/webhook") || url.startsWith("/avatar-ai/stripe-webhook")) {
      req.rawBody = Buffer.from(buf || "");
    }
  },
}));
app.use(express.urlencoded({ limit: JSON_LIMIT, extended: true }));

const pool = new Pool({
  host: process.env.PGHOST || "multisports-postgres",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "multisports",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  max: 12,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: PGCONNECT_TIMEOUT_MS,
});

pool.on("error", (error) => {
  lastDbError = error;
  dbReady = false;
  console.error("⚠️ PostgreSQL pool error:", error?.message || error);
});

process.on("uncaughtException", (error) => {
  console.error("💥 uncaughtException:", error?.stack || error?.message || error);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 unhandledRejection:", reason?.stack || reason?.message || reason);
});

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  const raw = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
  return `${prefix}_${raw.replace(/-/g, "")}`;
}

function ensureDirSync(dirPath) {
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch {}
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) return null;
  const mimeType = String(match[1] || "application/octet-stream").trim().toLowerCase();
  const payload = String(match[3] || "");
  const buffer = Buffer.from(payload, "base64");
  return { mimeType, buffer };
}

function decodeMediaPayload(body) {
  const dataUrl = body?.dataUrl || body?.dataURL || body?.base64 || body?.data || "";
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) return parseDataUrl(dataUrl);
  const rawBase64 = String(dataUrl || "").trim();
  if (!rawBase64) return null;
  const mimeType = String(body?.mimeType || body?.mime_type || "application/octet-stream").trim().toLowerCase();
  return { mimeType, buffer: Buffer.from(rawBase64.replace(/^base64,/, ""), "base64") };
}

function guessExtension(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}

function buildMediaRelativePath(userId, assetId, mimeType) {
  return path.join(String(userId || "anon"), `${assetId}.${guessExtension(mimeType)}`);
}

function buildAbsoluteMediaPath(relativePath) {
  return path.join(MEDIA_ROOT, relativePath);
}

function buildMediaPublicUrl(req, assetId) {
  const rel = `/media/${encodeURIComponent(String(assetId || ""))}`;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http");
  const host = String(req.headers["x-forwarded-host"] || req.get("host") || "");
  return host ? `${proto}://${host}${rel}` : rel;
}

async function saveMediaAssetRecord(client, opts) {
  const assetId = String(opts.id || uid("media"));
  const userId = String(opts.userId || "").trim();
  const kind = String(opts.kind || "generic_asset").trim() || "generic_asset";
  const ownerId = opts.ownerId == null ? null : String(opts.ownerId);
  const variant = opts.variant == null ? null : String(opts.variant);
  const mimeType = String(opts.mimeType || "application/octet-stream").trim().toLowerCase();
  const buffer = Buffer.isBuffer(opts.buffer) ? opts.buffer : Buffer.from(opts.buffer || "");
  const sha256 = sha256Buffer(buffer);
  const relativePath = buildMediaRelativePath(userId || "anon", assetId, mimeType);
  const absolutePath = buildAbsoluteMediaPath(relativePath);
  ensureDirSync(path.dirname(absolutePath));
  await fs.promises.writeFile(absolutePath, buffer);
  await client.query(`
    INSERT INTO media_assets (
      id, user_id, kind, owner_id, variant, mime_type, byte_size, sha256, relative_path, file_path, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      kind = EXCLUDED.kind,
      owner_id = EXCLUDED.owner_id,
      variant = EXCLUDED.variant,
      mime_type = EXCLUDED.mime_type,
      byte_size = EXCLUDED.byte_size,
      sha256 = EXCLUDED.sha256,
      relative_path = EXCLUDED.relative_path,
      file_path = EXCLUDED.file_path,
      updated_at = NOW()
  `, [assetId, userId || null, kind, ownerId, variant, mimeType, Number(buffer.length || 0), sha256, relativePath, absolutePath]);
  return { id: assetId, user_id: userId || null, kind, owner_id: ownerId, variant, mime_type: mimeType, byte_size: Number(buffer.length || 0), sha256, relative_path: relativePath, file_path: absolutePath };
}

async function loadMediaAssetById(assetId) {
  const result = await pool.query(`SELECT * FROM media_assets WHERE id = $1 LIMIT 1`, [assetId]);
  return result.rows[0] || null;
}

async function findExistingMediaAsset(client, opts) {
  const userId = String(opts?.userId || "").trim();
  const sha256 = String(opts?.sha256 || "").trim();
  if (!userId || !sha256) return null;
  const kind = opts?.kind == null ? null : String(opts.kind);
  const ownerId = opts?.ownerId == null ? null : String(opts.ownerId);
  const variant = opts?.variant == null ? null : String(opts.variant);
  const result = await client.query(`
    SELECT *
    FROM media_assets
    WHERE user_id = $1
      AND sha256 = $2
      AND ($3::text IS NULL OR kind = $3)
      AND ($4::text IS NULL OR owner_id = $4)
      AND ($5::text IS NULL OR variant = $5)
    ORDER BY updated_at DESC
    LIMIT 1
  `, [userId, sha256, kind, ownerId, variant]);
  return result.rows[0] || null;
}

function mapMediaAssetForResponse(req, row, extra = {}) {
  const publicUrl = buildMediaPublicUrl(req, row.id);
  return {
    ok: true,
    id: row.id,
    assetId: row.id,
    kind: row.kind,
    ownerId: row.owner_id,
    variant: row.variant,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    path: `/media/${row.id}`,
    publicUrl,
    url: publicUrl,
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || nowIso(),
    ...extra,
  };
}

function safeNickname(input, email) {
  const base = String(input || (email ? String(email).split("@")[0] : "Player"))
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 32);
  return base || "Player";
}

function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_data_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS surname TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS private_info JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_asset_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_thumb_asset_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_full_asset_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_cast_asset_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_version INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      owner_id TEXT,
      variant TEXT,
      mime_type TEXT,
      byte_size INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT,
      relative_path TEXT,
      file_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS owner_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS variant TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS mime_type TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS byte_size INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS sha256 TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS relative_path TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS file_path TEXT;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_user_kind_owner ON media_assets(user_id, kind, owner_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_store (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      store TEXT NOT NULL DEFAULT 'main',
      payload JSONB,
      data JSONB,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE user_store ADD COLUMN IF NOT EXISTS store TEXT NOT NULL DEFAULT 'main';`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_store_user_store ON user_store(user_id, store);`).catch(() => {});
  await pool.query(`ALTER TABLE user_store ADD COLUMN IF NOT EXISTS payload_text TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store ADD COLUMN IF NOT EXISTS data_text TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store ADD COLUMN IF NOT EXISTS payload_encoding TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store ADD COLUMN IF NOT EXISTS data_encoding TEXT;`).catch(() => {});

  await pool.query(`
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
  `).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS payload_text TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS data_text TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS payload_encoding TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS data_encoding TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS reason TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE user_store_snapshots ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_store_snapshots_user_created ON user_store_snapshots(user_id, store, created_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT,
      sport TEXT NOT NULL,
      players JSONB NOT NULL DEFAULT '[]'::jsonb,
      result JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS owner_user_id TEXT;`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats (
      profile_id TEXT NOT NULL,
      sport TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (profile_id, sport)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    );
  `);


  await pool.query(`
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
  `);
  await pool.query(`ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS message TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friend_requests_to_status ON friend_requests(to_user_id, status, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friend_requests_from_status ON friend_requests(from_user_id, status, created_at DESC);`).catch(() => {});
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair
    ON friend_requests(from_user_id, to_user_id)
    WHERE status = 'pending';
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (user_a_id <> user_b_id)
    );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair ON friendships(user_a_id, user_b_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_presence (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'offline',
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
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
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shared_items_target_created ON shared_items(target_user_id, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shared_items_owner_created ON shared_items(owner_user_id, created_at DESC);`).catch(() => {});
  await pool.query(`ALTER TABLE shared_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`).catch(() => {});
  await pool.query(`ALTER TABLE shared_items ADD COLUMN IF NOT EXISTS message TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE shared_items ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE shared_items ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE shared_items ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shared_items_target_status_created ON shared_items(target_user_id, status, created_at DESC);`).catch(() => {});


  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_friend_links (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      local_profile_id TEXT NOT NULL,
      local_profile_name TEXT,
      friend_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_display_name TEXT,
      friend_avatar_url TEXT,
      local_profile_avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      stats_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      accepted_at TIMESTAMPTZ,
      refused_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(owner_user_id, local_profile_id)
    );
  `);
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS local_profile_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS friend_display_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS friend_avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS local_profile_avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS stats_meta JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE profile_friend_links ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profile_friend_links_friend_status ON profile_friend_links(friend_user_id, status, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_friend_links_owner_profile ON profile_friend_links(owner_user_id, local_profile_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profile_friend_links_friend ON profile_friend_links(friend_user_id);`).catch(() => {});



  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_lobbies (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      mode TEXT NOT NULL DEFAULT 'x01',
      max_players INTEGER NOT NULL DEFAULT 2,
      host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      host_nickname TEXT,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ
    );
  `);
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS max_players INTEGER NOT NULL DEFAULT 2;`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS host_nickname TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting';`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_lobbies_status_created ON online_lobbies(status, created_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_lobby_players (
      id TEXT PRIMARY KEY,
      lobby_id TEXT NOT NULL REFERENCES online_lobbies(id) ON DELETE CASCADE,
      lobby_code TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT,
      display_name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'player',
      status TEXT NOT NULL DEFAULT 'online',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_online_lobby_players_lobby_user ON online_lobby_players(lobby_id, user_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_lobby_players_code ON online_lobby_players(lobby_code);`).catch(() => {});
  await pool.query(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_lobby_players_ready_status ON online_lobby_players(lobby_code, status);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_matches (
      id TEXT PRIMARY KEY,
      lobby_code TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'x01',
      status TEXT NOT NULL DEFAULT 'started',
      state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      owner_user TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );
  `);
  await pool.query(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_online_matches_lobby_code ON online_matches(lobby_code);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_matches_updated ON online_matches(updated_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_messages (
      id TEXT PRIMARY KEY,
      lobby_code TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      nickname TEXT,
      message JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_messages_lobby_created ON online_messages(lobby_code, created_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS avatar_ai_accounts (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      free_used BOOLEAN NOT NULL DEFAULT FALSE,
      credits INTEGER NOT NULL DEFAULT 0,
      total_purchased INTEGER NOT NULL DEFAULT 0,
      total_generated INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE avatar_ai_accounts ADD COLUMN IF NOT EXISTS free_used BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_accounts ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_accounts ADD COLUMN IF NOT EXISTS total_purchased INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_accounts ADD COLUMN IF NOT EXISTS total_generated INTEGER NOT NULL DEFAULT 0;`).catch(() => {});

  await pool.query(`
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
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_avatar_ai_purchases_user ON avatar_ai_purchases(user_id, created_at DESC);`).catch(() => {});

  await pool.query(`
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
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_avatar_ai_generations_user ON avatar_ai_generations(user_id, created_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS avatar_ai_gallery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'PLAYER',
      data_url TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'ia',
      style TEXT,
      medallion_color TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE avatar_ai_gallery ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ia';`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_gallery ADD COLUMN IF NOT EXISTS style TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_gallery ADD COLUMN IF NOT EXISTS medallion_color TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE avatar_ai_gallery ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_avatar_ai_gallery_user_created ON avatar_ai_gallery(user_id, created_at DESC);`).catch(() => {});
}

async function testDbConnection() {
  const result = await pool.query("SELECT NOW() AS now");
  return result.rows[0].now;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  const result = await pool.query(`SELECT * FROM users WHERE email_normalized = $1 LIMIT 1`, [normalized]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
}

async function loadProfileByUserId(userId) {
  const result = await pool.query(`SELECT * FROM profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return result.rows[0] || null;
}

function mapProfile(profileRow, userRow) {
  const p = profileRow || {};
  const u = userRow || {};
  const stats = p.stats || {};
  const resolvedDisplayName = p.display_name || p.surname || p.name || u.nickname || (u.email ? String(u.email).split("@")[0] : "Player");
  return {
    id: String(p.id || u.id || ""),
    userId: String(p.user_id || u.id || ""),
    displayName: resolvedDisplayName,
    nickname: resolvedDisplayName,
    avatarUrl: p.avatar_url || p.avatar || p.avatar_data_url || null,
    avatar_data_url: p.avatar_data_url || null,
    avatarAssetId: p.avatar_asset_id || null,
    avatarThumbAssetId: p.avatar_thumb_asset_id || null,
    avatarFullAssetId: p.avatar_full_asset_id || null,
    avatarCastAssetId: p.avatar_cast_asset_id || null,
    avatarVersion: Number(p.avatar_version || 0),
    avatarUpdatedAt: p.avatar_updated_at || null,
    country: p.country || null,
    countryCode: p.country_code || null,
    bio: p.bio || null,
    surname: p.surname || null,
    firstName: p.first_name || null,
    lastName: p.last_name || null,
    birthDate: p.birth_date || null,
    city: p.city || null,
    email: u.email || null,
    phone: p.phone || null,
    preferences: p.preferences || {},
    private_info: p.private_info || {},
    privateInfo: p.private_info || {},
    stats: {
      totalMatches: Number(stats.totalMatches || stats.total_matches || 0),
      totalLegs: Number(stats.totalLegs || stats.total_legs || 0),
      avg3: Number(stats.avg3 || stats.avg_3 || 0),
      bestVisit: Number(stats.bestVisit || stats.best_visit || 0),
      bestCheckout: Number(stats.bestCheckout || stats.best_checkout || 0),
    },
    updatedAt: p.updated_at ? Date.parse(p.updated_at) : Date.now(),
    updated_at: p.updated_at || null,
  };
}


function mapPublicUser(row) {
  if (!row) return null;
  const displayName = row.display_name || row.name || row.nickname || (row.email ? String(row.email).split("@")[0] : "Joueur");
  return {
    id: row.user_id || row.id,
    userId: row.user_id || row.id,
    nickname: row.nickname || displayName,
    displayName,
    avatarUrl: row.avatar_url || row.avatar || null,
    avatarAssetId: row.avatar_asset_id || null,
    country: row.country || null,
    countryCode: row.country_code || null,
    status: row.presence_status || "offline",
    lastSeenAt: row.last_seen_at || null,
  };
}

function normalizeFriendPair(a, b) {
  const aa = String(a || "").trim();
  const bb = String(b || "").trim();
  return aa < bb ? [aa, bb] : [bb, aa];
}

async function areFriends(userA, userB) {
  const [a, b] = normalizeFriendPair(userA, userB);
  const result = await pool.query(
    `SELECT id FROM friendships WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
    [a, b]
  );
  return !!result.rows[0];
}

async function loadPublicUserById(userId) {
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.nickname,
      p.user_id,
      p.name,
      p.display_name,
      p.avatar,
      p.avatar_url,
      p.avatar_asset_id,
      p.country,
      p.country_code,
      COALESCE(op.status, 'offline') AS presence_status,
      op.last_seen_at
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN online_presence op ON op.user_id = u.id
    WHERE u.id = $1
    LIMIT 1
  `, [userId]);
  return mapPublicUser(result.rows[0] || null);
}

async function searchPublicUsers(query, currentUserId) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const like = `%${q.toLowerCase()}%`;
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.nickname,
      p.user_id,
      p.name,
      p.display_name,
      p.avatar,
      p.avatar_url,
      p.avatar_asset_id,
      p.country,
      p.country_code,
      COALESCE(op.status, 'offline') AS presence_status,
      op.last_seen_at
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN online_presence op ON op.user_id = u.id
    WHERE u.id <> $1
      AND (
        LOWER(u.nickname) LIKE $2 OR
        LOWER(u.email) LIKE $2 OR
        LOWER(COALESCE(p.display_name, '')) LIKE $2 OR
        LOWER(COALESCE(p.name, '')) LIKE $2
      )
    ORDER BY COALESCE(p.display_name, u.nickname) ASC
    LIMIT 25
  `, [currentUserId, like]);
  return result.rows.map(mapPublicUser).filter(Boolean);
}

function generateOnlineLobbyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function sanitizeOnlineMode(mode) {
  const raw = String(mode || "x01").trim().toLowerCase();
  const allowed = new Set(["x01", "killer", "shanghai", "golf", "cricket", "warfare", "battle_royale", "territories", "capital", "batard", "scram", "five_lives", "clock", "babyfoot"]);
  return allowed.has(raw) ? raw : "x01";
}

function sanitizeLobbyCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function mapOnlineLobbyRow(row, players = []) {
  if (!row) return null;
  return {
    id: row.id,
    code: String(row.code || "").toUpperCase(),
    mode: row.mode || "x01",
    maxPlayers: Number(row.max_players || 2),
    hostUserId: row.host_user_id,
    hostNickname: row.host_nickname || "Hôte",
    settings: row.settings || {},
    status: row.status || "waiting",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at || null,
    closedAt: row.closed_at || null,
    players,
    playersCount: players.length,
    isFull: players.filter((p) => p.role !== "spectator").length >= Number(row.max_players || 2),
  };
}

function mapOnlineLobbyPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname || row.display_name || "Joueur",
    displayName: row.display_name || row.nickname || "Joueur",
    avatarUrl: row.avatar_url || null,
    role: row.role || "player",
    status: row.status || "online",
    ready: String(row.status || "online").toLowerCase() === "ready",
    readyAt: row.ready_at || null,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
  };
}

async function loadOnlineLobbyByCode(code) {
  const codeUpper = sanitizeLobbyCode(code);
  if (!codeUpper) return null;
  const lobbyResult = await pool.query(`SELECT * FROM online_lobbies WHERE code = $1 LIMIT 1`, [codeUpper]);
  const lobby = lobbyResult.rows[0] || null;
  if (!lobby) return null;
  const playersResult = await pool.query(`SELECT * FROM online_lobby_players WHERE lobby_id = $1 ORDER BY joined_at ASC`, [lobby.id]);
  return mapOnlineLobbyRow(lobby, playersResult.rows.map(mapOnlineLobbyPlayer).filter(Boolean));
}

async function upsertOnlineLobbyPlayer(client, lobbyRow, userRow, opts = {}) {
  const profile = await loadProfileByUserId(userRow.id).catch(() => null);
  const displayName = String(opts.nickname || profile?.display_name || profile?.name || userRow.nickname || "Joueur").trim();
  const role = String(opts.role || "player").trim() === "spectator" ? "spectator" : "player";
  await client.query(`
    INSERT INTO online_lobby_players (id, lobby_id, lobby_code, user_id, nickname, display_name, avatar_url, role, status, joined_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$5,$6,$7,'online',NOW(),NOW())
    ON CONFLICT (lobby_id, user_id)
    DO UPDATE SET nickname = EXCLUDED.nickname,
                  display_name = EXCLUDED.display_name,
                  avatar_url = EXCLUDED.avatar_url,
                  role = EXCLUDED.role,
                  status = 'online',
                  updated_at = NOW()
  `, [uid("olp"), lobbyRow.id, lobbyRow.code, userRow.id, displayName, profile?.avatar_url || profile?.avatar || null, role]);
}

function mapOnlineMatchRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    lobby_code: row.lobby_code,
    lobbyCode: row.lobby_code,
    mode: row.mode || row.state_json?.mode || row.state_json?.onlineMode || "x01",
    status: row.status,
    state_json: row.state_json || {},
    state: row.state_json || {},
    owner_user: row.owner_user || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    finished_at: row.finished_at || null,
  };
}

// -----------------------------------------------------------------------------
// ONLINE V8 realtime : cache mémoire + SSE + sauvegarde PostgreSQL différée.
// Le chemin chaud score -> autre appareil ne dépend plus d'une lecture DB.
// -----------------------------------------------------------------------------
const ONLINE_DB_SAVE_DEBOUNCE_MS = Math.max(250, Number(process.env.ONLINE_DB_SAVE_DEBOUNCE_MS || 800));
const ONLINE_CACHE_TTL_MS = Math.max(60_000, Number(process.env.ONLINE_CACHE_TTL_MS || 1000 * 60 * 60 * 6));
const onlineMatchCache = new Map();
const onlineLobbyCache = new Map();
const onlineStreamClients = new Map();
const onlineSaveTimers = new Map();

function onlineCacheKey(code) {
  return sanitizeLobbyCode(code);
}

function onlineCacheSet(map, code, value) {
  const key = onlineCacheKey(code);
  if (!key || value == null) return null;
  const entry = { value, updatedAt: Date.now() };
  map.set(key, entry);
  return entry;
}

function onlineCacheGet(map, code) {
  const key = onlineCacheKey(code);
  if (!key) return null;
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - Number(entry.updatedAt || 0) > ONLINE_CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return entry.value || null;
}

function onlineBroadcast(code, type, payload = {}) {
  const key = onlineCacheKey(code);
  if (!key) return;
  const clients = onlineStreamClients.get(key);
  if (!clients || clients.size <= 0) return;
  const packet = JSON.stringify({ ok: true, type, code: key, ts: nowIso(), ...payload });
  for (const client of Array.from(clients)) {
    try {
      client.write(`event: ${type}\n`);
      client.write(`data: ${packet}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

function onlineBroadcastMatch(match, type = "match:update") {
  const mapped = mapOnlineMatchRow(match);
  if (!mapped?.lobbyCode) return mapped;
  onlineCacheSet(onlineMatchCache, mapped.lobbyCode, mapped);
  onlineBroadcast(mapped.lobbyCode, type, { match: mapped });
  return mapped;
}

function onlineBroadcastLobby(lobby, type = "lobby:update") {
  if (!lobby?.code) return lobby;
  onlineCacheSet(onlineLobbyCache, lobby.code, lobby);
  onlineBroadcast(lobby.code, type, { lobby });
  return lobby;
}

function onlineScheduleMatchDbSave(match) {
  const mapped = mapOnlineMatchRow(match);
  const code = onlineCacheKey(mapped?.lobbyCode || mapped?.lobby_code);
  if (!code || !mapped) return;
  const oldTimer = onlineSaveTimers.get(code);
  if (oldTimer) clearTimeout(oldTimer);
  const timer = setTimeout(async () => {
    onlineSaveTimers.delete(code);
    try {
      const state = mapped.state_json || mapped.state || {};
      const mode = sanitizeOnlineMode(mapped.mode || state.mode || state.onlineMode || "x01");
      const status = String(mapped.status || "started") === "ended" ? "ended" : "started";
      const matchId = mapped.id || uid("om");
      await pool.query(`
        INSERT INTO online_matches (id, lobby_code, mode, status, state_json, owner_user, created_at, updated_at, finished_at)
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW(),NOW(),CASE WHEN $4 = 'ended' THEN NOW() ELSE NULL END)
        ON CONFLICT (lobby_code)
        DO UPDATE SET mode = EXCLUDED.mode,
                      status = EXCLUDED.status,
                      state_json = EXCLUDED.state_json,
                      owner_user = COALESCE(EXCLUDED.owner_user, online_matches.owner_user),
                      updated_at = NOW(),
                      finished_at = CASE WHEN EXCLUDED.status = 'ended' THEN NOW() ELSE online_matches.finished_at END
      `, [matchId, code, mode, status, JSON.stringify({ ...state, mode, onlineMode: mode, lobbyCode: code }), mapped.owner_user || null]);
      if (status === "ended") {
        await pool.query(`UPDATE online_lobbies SET status = 'closed', closed_at = COALESCE(closed_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]).catch(() => {});
      }
    } catch (error) {
      console.error("[online-v8] delayed DB save failed:", error?.message || error);
    }
  }, ONLINE_DB_SAVE_DEBOUNCE_MS);
  onlineSaveTimers.set(code, timer);
}

async function onlineLoadMatchCachedOrDb(code) {
  const key = onlineCacheKey(code);
  const cached = onlineCacheGet(onlineMatchCache, key);
  if (cached) return cached;
  const result = await pool.query(`SELECT * FROM online_matches WHERE lobby_code = $1 ORDER BY updated_at DESC LIMIT 1`, [key]);
  const mapped = mapOnlineMatchRow(result.rows[0] || null);
  if (mapped) onlineCacheSet(onlineMatchCache, key, mapped);
  return mapped;
}

async function resolveOnlineStreamUser(req) {
  const headerUser = await resolveUserFromAuthorizationHeader(req);
  if (headerUser) return headerUser;
  try {
    const token = String(req.query?.token || req.query?.access_token || "").trim();
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return await findUserById(decoded.sub);
  } catch {
    return null;
  }
}

app.get("/online/stream/:code", async (req, res) => {
  try {
    const user = await resolveOnlineStreamUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "Session invalide" });
    const code = onlineCacheKey(req.params.code);
    if (!code) return res.status(400).json({ ok: false, error: "Code salon manquant" });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let clients = onlineStreamClients.get(code);
    if (!clients) {
      clients = new Set();
      onlineStreamClients.set(code, clients);
    }
    clients.add(res);

    const hello = { ok: true, type: "connected", code, ts: nowIso(), userId: user.id };
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify(hello)}\n\n`);

    const cachedMatch = await onlineLoadMatchCachedOrDb(code).catch(() => null);
    if (cachedMatch) {
      res.write(`event: match:snapshot\n`);
      res.write(`data: ${JSON.stringify({ ok: true, type: "match:snapshot", code, ts: nowIso(), match: cachedMatch })}\n\n`);
    }
    const cachedLobby = onlineCacheGet(onlineLobbyCache, code);
    if (cachedLobby) {
      res.write(`event: lobby:snapshot\n`);
      res.write(`data: ${JSON.stringify({ ok: true, type: "lobby:snapshot", code, ts: nowIso(), lobby: cachedLobby })}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: ${JSON.stringify({ ok: true, type: "ping", code, ts: nowIso() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) onlineStreamClients.delete(code);
    });
  } catch (error) {
    console.error("GET /online/stream/:code error:", error);
    if (!res.headersSent) res.status(500).json({ ok: false, error: error.message || "Erreur stream online" });
  }
});

function buildSessionPayload(userRow, profileRow) {
  const profile = mapProfile(profileRow, userRow);
  const token = makeToken(userRow);
  const resolvedNickname = profile?.displayName || profile?.nickname || userRow.nickname;
  return {
    ok: true,
    token,
    refreshToken: "",
    user: {
      id: userRow.id,
      email: userRow.email,
      nickname: resolvedNickname,
      created_at: userRow.created_at,
      createdAt: userRow.created_at ? Date.parse(userRow.created_at) : Date.now(),
    },
    profile,
  };
}

async function ensureProfileForUser(client, userRow, nicknameFallback) {
  const existing = await client.query(`SELECT * FROM profiles WHERE user_id = $1 LIMIT 1`, [userRow.id]);
  if (existing.rows[0]) return existing.rows[0];

  const displayName = nicknameFallback || userRow.nickname || (userRow.email ? String(userRow.email).split("@")[0] : "Player");
  const inserted = await client.query(`
    INSERT INTO profiles (
      id, user_id, name, display_name, avatar, avatar_url, avatar_data_url, stats, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())
    RETURNING *
  `, [userRow.id, userRow.id, displayName, displayName, null, null, null, JSON.stringify({})]);
  return inserted.rows[0];
}

async function authRequired(req, res, next) {
  try {
    const raw = String(req.headers.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Token manquant" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.sub);
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
    req.auth = decoded;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Session invalide" });
  }
}


async function resolveUserFromAuthorizationHeader(req) {
  try {
    const raw = String(req.headers.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.sub);
    return user || null;
  } catch {
    return null;
  }
}

async function resolveBackupOwnerId(req) {
  const authUser = await resolveUserFromAuthorizationHeader(req);
  if (authUser?.id) return String(authUser.id);

  const bodyOwnerId = String(req.body?.ownerId || "").trim();
  if (bodyOwnerId) return bodyOwnerId;

  const queryOwnerId = String(req.query?.ownerId || "").trim();
  if (queryOwnerId) return queryOwnerId;

  return "";
}

function parsePossiblyJsonString(value) {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) {
    value = value.toString("utf8");
  }
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
}

function snapshotJsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  return value;
}

async function encodeSnapshotForTextStore(payload) {
  const json = JSON.stringify(payload ?? null, snapshotJsonReplacer);
  const gzipped = await gzipAsync(Buffer.from(json, "utf8"));
  return {
    text: gzipped.toString("base64"),
    encoding: "gzip-base64-json",
    rawBytes: Buffer.byteLength(json, "utf8"),
    storedBytes: gzipped.length,
  };
}

async function decodeSnapshotText(text, encoding) {
  if (text == null) return null;
  const raw = String(text || "");
  if (!raw) return null;
  const enc = String(encoding || "").trim().toLowerCase();

  if (enc === "gzip-base64-json" || enc === "gzip-base64") {
    const buffer = Buffer.from(raw, "base64");
    const json = (await gunzipAsync(buffer)).toString("utf8");
    return parsePossiblyJsonString(json);
  }

  if (enc === "base64-json" || enc === "base64") {
    const json = Buffer.from(raw, "base64").toString("utf8");
    return parsePossiblyJsonString(json);
  }

  return parsePossiblyJsonString(raw);
}

async function loadUserStoreSnapshot(userId) {
  const result = await pool.query(`
    SELECT payload, data, payload_text, data_text, payload_encoding, data_encoding, version, updated_at
    FROM user_store
    WHERE user_id = $1 AND store = 'main'
    LIMIT 1
  `, [userId]);

  const row = result.rows[0] || null;
  if (!row) return null;

  let payload = null;
  let data = null;

  try {
    payload = row.payload_text != null
      ? await decodeSnapshotText(row.payload_text, row.payload_encoding)
      : parsePossiblyJsonString(row.payload);
  } catch (error) {
    console.warn('[user_store] decode payload failed:', error?.message || error);
    payload = parsePossiblyJsonString(row.payload);
  }

  try {
    data = row.data_text != null
      ? await decodeSnapshotText(row.data_text, row.data_encoding)
      : parsePossiblyJsonString(row.data);
  } catch (error) {
    console.warn('[user_store] decode data failed:', error?.message || error);
    data = parsePossiblyJsonString(row.data);
  }

  return {
    ...row,
    payload,
    data,
  };
}


function summarizeSnapshotForVault(payload) {
  const seen = new WeakSet();
  const out = {
    bytes: 0,
    keys: 0,
    profiles: 0,
    teams: 0,
    competitions: 0,
    tournaments: 0,
    leagues: 0,
    matches: 0,
    historyRows: 0,
    statsBlocks: 0,
    mediaRefs: 0,
    dataImages: 0,
    sports: [],
    names: [],
    exportedAt: null,
    probableContent: [],
  };
  const probable = new Set();
  const push = (arr, value, max = 12) => {
    const raw = String(value || "").trim();
    if (raw && !arr.includes(raw) && arr.length < max) arr.push(raw.slice(0, 72));
  };
  const looksLikeMatch = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    const hasSport = typeof obj.sport === "string" || typeof obj.mode === "string" || typeof obj.gameMode === "string";
    const hasPlayers = Array.isArray(obj.players) || Array.isArray(obj.teams) || Array.isArray(obj.participants);
    const hasScore = obj.score != null || obj.result != null || obj.winner != null || obj.createdAt != null || obj.finishedAt != null;
    const hasId = obj.id != null || obj.matchId != null || obj.resumeId != null;
    return !!((hasSport && (hasPlayers || hasScore)) || (hasId && hasPlayers && hasScore));
  };
  const walk = (node, path = "") => {
    if (node == null) return;
    if (typeof node === "string") {
      if (node.startsWith("data:image/")) out.dataImages += 1;
      if (/\/media\//.test(node) || /media_/.test(node)) out.mediaRefs += 1;
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      const low = String(path || "").toLowerCase();
      if (/profile|player|joueur/.test(low)) out.profiles = Math.max(out.profiles, node.length);
      if (/team|équipe|equipe/.test(low)) { out.teams = Math.max(out.teams, node.length); probable.add("équipes"); }
      if (/tournament|tournoi/.test(low)) { out.tournaments = Math.max(out.tournaments, node.length); probable.add("tournois"); }
      if (/league|ligue|championship|championnat|competition/.test(low)) { out.competitions = Math.max(out.competitions, node.length); probable.add("compétitions"); }
      if (/history|match|matches|partie|saved/.test(low)) {
        const m = node.filter(looksLikeMatch).length;
        out.matches += m || node.length;
        probable.add("parties");
      }
      for (const item of node.slice(0, 350)) walk(item, path);
      return;
    }
    const keys = Object.keys(node);
    out.keys += keys.length;
    if (looksLikeMatch(node)) out.matches += 1;
    if (!out.exportedAt && typeof node.exportedAt === "string") out.exportedAt = node.exportedAt;
    if (typeof node.sport === "string") push(out.sports, node.sport);
    if (typeof node.mode === "string") push(out.sports, node.mode);
    if (typeof node.gameMode === "string") push(out.sports, node.gameMode);
    for (const k of ["name", "displayName", "nickname", "playerName", "teamName", "title"]) {
      if (typeof node[k] === "string") push(out.names, node[k], 16);
    }
    if (node.history && typeof node.history === "object" && node.history.rows && typeof node.history.rows === "object") {
      const c = Object.keys(node.history.rows).length;
      out.historyRows += c;
      out.matches += c;
      if (c) probable.add("historique");
    }
    for (const [key, value] of Object.entries(node)) {
      const low = String(key).toLowerCase();
      if (low.includes("profile") && Array.isArray(value)) out.profiles = Math.max(out.profiles, value.length);
      if ((low.includes("team") || low.includes("equipe")) && Array.isArray(value)) out.teams = Math.max(out.teams, value.length);
      if (low.includes("tournament") || low.includes("tournoi")) probable.add("tournois");
      if (low.includes("league") || low.includes("ligue") || low.includes("competition")) probable.add("compétitions");
      if (low.includes("stats") && value && typeof value === "object") out.statsBlocks += 1;
      if (/history|match|matches|partie|saved/.test(low) && Array.isArray(value)) probable.add("parties");
      walk(value, path ? `${path}.${key}` : key);
    }
  };
  try { out.bytes = Buffer.byteLength(JSON.stringify(payload ?? null, snapshotJsonReplacer), "utf8"); } catch { out.bytes = 0; }
  try { walk(payload); } catch {}
  if (out.profiles) probable.add("profils");
  if (out.matches || out.historyRows) probable.add("parties");
  if (out.statsBlocks) probable.add("stats");
  if (out.mediaRefs || out.dataImages) probable.add("médias");
  out.probableContent = Array.from(probable);
  return out;
}

async function insertUserStoreSnapshotSlot(userId, encoded, version = 2, payload = null, reason = "push") {
  const slotId = uid("uss");
  const summary = summarizeSnapshotForVault(payload);
  await pool.query(`
    INSERT INTO user_store_snapshots (
      id, user_id, store, payload, data, payload_text, data_text, payload_encoding, data_encoding, version, summary, reason, created_at
    ) VALUES ($1,$2,'main',NULL,NULL,$3,$3,$4,$4,$5,$6::jsonb,$7,NOW())
  `, [slotId, userId, encoded.text, encoded.encoding, version, JSON.stringify(summary || {}), reason]);

  await pool.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, store ORDER BY created_at DESC) AS rn
      FROM user_store_snapshots
      WHERE user_id = $1 AND store = 'main'
    )
    DELETE FROM user_store_snapshots
    WHERE id IN (SELECT id FROM ranked WHERE rn > 10)
  `, [userId]).catch(() => {});
  return slotId;
}

async function saveUserStoreSnapshot(userId, payload, version = 2, reason = "push") {
  const encoded = await encodeSnapshotForTextStore(payload);

  await pool.query(`
    INSERT INTO user_store (
      user_id,
      store,
      payload,
      data,
      payload_text,
      data_text,
      payload_encoding,
      data_encoding,
      version,
      updated_at
    )
    VALUES (
      $1,
      'main',
      NULL,
      NULL,
      $2,
      $2,
      $3,
      $3,
      $4,
      NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      payload = NULL,
      data = NULL,
      payload_text = EXCLUDED.payload_text,
      data_text = EXCLUDED.data_text,
      payload_encoding = EXCLUDED.payload_encoding,
      data_encoding = EXCLUDED.data_encoding,
      version = EXCLUDED.version,
      updated_at = NOW(),
      store = 'main'
  `, [userId, encoded.text, encoded.encoding, version]);

  const slotId = await insertUserStoreSnapshotSlot(userId, encoded, version, payload, reason).catch((error) => {
    console.warn('[user_store_snapshots] insert failed:', error?.message || error);
    return null;
  });
  return { slotId };
}

async function loadUserStoreSnapshotSlot(userId, slotId) {
  const result = await pool.query(`
    SELECT id, user_id, store, payload, data, payload_text, data_text, payload_encoding, data_encoding, version, summary, reason, promoted_at, created_at
    FROM user_store_snapshots
    WHERE user_id = $1 AND id = $2 AND store = 'main'
    LIMIT 1
  `, [userId, slotId]);
  const row = result.rows[0] || null;
  if (!row) return null;
  let payload = null;
  let data = null;
  try {
    payload = row.payload_text != null
      ? await decodeSnapshotText(row.payload_text, row.payload_encoding)
      : parsePossiblyJsonString(row.payload);
  } catch (error) {
    console.warn('[user_store_snapshots] decode payload failed:', error?.message || error);
    payload = parsePossiblyJsonString(row.payload);
  }
  try {
    data = row.data_text != null
      ? await decodeSnapshotText(row.data_text, row.data_encoding)
      : parsePossiblyJsonString(row.data);
  } catch {
    data = parsePossiblyJsonString(row.data);
  }
  return { ...row, payload, data };
}

const AVATAR_AI_PACKS = {
  pack10: { label: "Pack 10 avatars IA", credits: 10, amountCents: 199 },
  pack30: { label: "Pack 30 avatars IA", credits: 30, amountCents: 499 },
  pack100: { label: "Pack 100 avatars IA", credits: 100, amountCents: 999 },
};

function mapAvatarAiAccount(row) {
  const r = row || {};
  const freeUsed = Boolean(r.free_used);
  const credits = Math.max(0, Number(r.credits || 0));
  return {
    ok: true,
    freeUsed,
    credits,
    totalPurchased: Math.max(0, Number(r.total_purchased || 0)),
    totalGenerated: Math.max(0, Number(r.total_generated || 0)),
    canGenerate: !freeUsed || credits > 0,
    label: !freeUsed ? "1 avatar IA gratuit disponible" : credits > 0 ? `${credits} crédit${credits > 1 ? "s" : ""} avatar IA disponible${credits > 1 ? "s" : ""}` : "Aucun crédit avatar IA disponible",
    updatedAt: r.updated_at || nowIso(),
  };
}

async function ensureAvatarAiAccount(client, userId) {
  const result = await client.query(`
    INSERT INTO avatar_ai_accounts (user_id, free_used, credits, total_purchased, total_generated, updated_at)
    VALUES ($1, FALSE, 0, 0, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `, [userId]);
  return result.rows[0];
}

function normalizeAvatarGalleryRow(row) {
  return {
    id: String(row.id || ""),
    name: String(row.name || "PLAYER"),
    dataUrl: String(row.data_url || ""),
    source: row.source === "manual" ? "manual" : "ia",
    style: row.style || undefined,
    medallionColor: row.medallion_color || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso(),
  };
}

function sanitizeAvatarDataUrlForGallery(raw) {
  const dataUrl = String(raw || "").trim();
  if (!dataUrl.startsWith("data:image/")) return "";
  if (Buffer.byteLength(dataUrl, "utf8") > 512 * 1024) return "";
  return dataUrl;
}

async function stripePostForm(pathname, params) {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) throw new Error("STRIPE_SECRET_KEY manquant côté NAS.");
  const response = await fetch(`https://api.stripe.com${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error(json?.error?.message || text || `stripe_${response.status}`);
  return json;
}

async function stripeGet(pathname) {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) throw new Error("STRIPE_SECRET_KEY manquant côté NAS.");
  const response = await fetch(`https://api.stripe.com${pathname}`, { headers: { Authorization: `Bearer ${secret}` } });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error(json?.error?.message || text || `stripe_${response.status}`);
  return json;
}

function parseStripeSignatureHeader(header) {
  const out = {};
  String(header || "").split(",").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!out[key]) out[key] = [];
    out[key].push(value);
  });
  return out;
}

function verifyStripeWebhookSignature(rawBody, signatureHeader) {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) return { ok: true, skipped: true, reason: "STRIPE_WEBHOOK_SECRET_missing" };
  const parsed = parseStripeSignatureHeader(signatureHeader);
  const timestamp = parsed.t?.[0];
  const signatures = parsed.v1 || [];
  if (!timestamp || signatures.length === 0) return { ok: false, error: "stripe_signature_header_invalid" };
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((sig) => {
    try {
      const sigBuffer = Buffer.from(String(sig || ""), "hex");
      return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch { return false; }
  });
  return valid ? { ok: true } : { ok: false, error: "stripe_signature_mismatch" };
}

async function creditAvatarAiPurchaseFromStripeSession(session, source = "webhook") {
  const metadata = session?.metadata || {};
  const feature = String(metadata.feature || "").trim();
  const userId = String(metadata.userId || "").trim();
  const packId = String(metadata.packId || "").trim();
  const pack = AVATAR_AI_PACKS[packId];
  const sessionId = String(session?.id || "").trim();
  const paid = session?.payment_status === "paid" || session?.status === "complete";
  const credits = Math.max(0, Math.floor(Number(metadata.credits || pack?.credits || 0)));
  if (!sessionId || feature !== "avatar_ia" || !paid || !userId || !pack || credits <= 0) return { ok: false, ignored: true, reason: "session_not_creditable", sessionId };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(`SELECT * FROM avatar_ai_purchases WHERE stripe_session_id = $1 FOR UPDATE`, [sessionId]);
    const alreadyPaid = existing.rows[0]?.status === "paid";
    let accountRow = await ensureAvatarAiAccount(client, userId);
    await client.query(`
      INSERT INTO avatar_ai_purchases (id, user_id, stripe_session_id, pack_id, credits, amount_cents, currency, status, created_at, paid_at)
      VALUES ($1,$2,$3,$4,$5,$6,'eur',$7,NOW(),CASE WHEN $7 = 'paid' THEN NOW() ELSE NULL END)
      ON CONFLICT (stripe_session_id)
      DO UPDATE SET status = CASE WHEN avatar_ai_purchases.status = 'paid' THEN avatar_ai_purchases.status ELSE EXCLUDED.status END,
                    paid_at = CASE WHEN avatar_ai_purchases.status = 'paid' THEN avatar_ai_purchases.paid_at ELSE COALESCE(avatar_ai_purchases.paid_at, EXCLUDED.paid_at) END
    `, [uid("avpay"), userId, sessionId, packId, credits, pack.amountCents, paid ? "paid" : "created"]);
    if (!alreadyPaid) {
      const updated = await client.query(`
        UPDATE avatar_ai_accounts SET credits = credits + $2, total_purchased = total_purchased + $2, updated_at = NOW()
        WHERE user_id = $1 RETURNING *
      `, [userId, credits]);
      accountRow = updated.rows[0];
    }
    await client.query("COMMIT");
    return { ok: true, source, credited: !alreadyPaid, addedCredits: alreadyPaid ? 0 : credits, sessionId, packId, account: mapAvatarAiAccount(accountRow) };
  } catch (error) { try { await client.query("ROLLBACK"); } catch {} throw error; } finally { client.release(); }
}

app.get(["/avatar-ai/account", "/avatar-ai/credits"], authRequired, async (req, res) => {
  const client = await pool.connect();
  try { const row = await ensureAvatarAiAccount(client, req.user.id); res.json(mapAvatarAiAccount(row)); }
  catch (error) { console.error("GET /avatar-ai/account error:", error); res.status(500).json({ ok: false, error: "avatar_account_failed", message: error.message || String(error) }); }
  finally { client.release(); }
});

app.post("/avatar-ai/check", authRequired, async (req, res) => {
  const client = await pool.connect();
  try { const mapped = mapAvatarAiAccount(await ensureAvatarAiAccount(client, req.user.id)); if (!mapped.canGenerate) return res.status(402).json({ ...mapped, ok: false, error: "avatar_credit_required", message: "Crédit avatar IA requis." }); res.json(mapped); }
  catch (error) { console.error("POST /avatar-ai/check error:", error); res.status(500).json({ ok: false, error: "avatar_check_failed", message: error.message || String(error) }); }
  finally { client.release(); }
});

app.post("/avatar-ai/consume", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureAvatarAiAccount(client, req.user.id);
    const locked = await client.query(`SELECT * FROM avatar_ai_accounts WHERE user_id = $1 FOR UPDATE`, [req.user.id]);
    const row = locked.rows[0];
    const freeUsed = Boolean(row.free_used);
    const credits = Math.max(0, Number(row.credits || 0));
    if (freeUsed && credits <= 0) { await client.query("ROLLBACK"); return res.status(402).json({ ok: false, error: "avatar_credit_required", message: "Crédit avatar IA requis." }); }
    const useFree = !freeUsed;
    const nextCredits = useFree ? credits : Math.max(0, credits - 1);
    const updated = await client.query(`UPDATE avatar_ai_accounts SET free_used = TRUE, credits = $2, total_generated = total_generated + 1, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [req.user.id, nextCredits]);
    await client.query(`INSERT INTO avatar_ai_generations (id, user_id, provider, model, style, used_free, used_credit, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`, [uid("avgen"), req.user.id, req.body?.provider || null, req.body?.model || null, req.body?.style || null, useFree, !useFree]);
    await client.query("COMMIT");
    res.json({ ...mapAvatarAiAccount(updated.rows[0]), consumed: true, usedFree: useFree, usedCredit: !useFree });
  } catch (error) { try { await client.query("ROLLBACK"); } catch {} console.error("POST /avatar-ai/consume error:", error); res.status(500).json({ ok: false, error: "avatar_consume_failed", message: error.message || String(error) }); }
  finally { client.release(); }
});

app.post("/avatar-ai/checkout", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const packId = String(req.body?.packId || "").trim();
    const pack = AVATAR_AI_PACKS[packId];
    if (!pack) return res.status(400).json({ ok: false, error: "invalid_pack" });
    const rawSuccess = String(req.body?.successUrl || "").trim();
    const rawCancel = String(req.body?.cancelUrl || "").trim();
    if (!/^https?:\/\//i.test(rawSuccess) || !/^https?:\/\//i.test(rawCancel)) return res.status(400).json({ ok: false, error: "invalid_return_url" });
    const params = new URLSearchParams();
    params.set("mode", "payment"); params.set("success_url", rawSuccess); params.set("cancel_url", rawCancel); params.set("payment_method_types[]", "card"); params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "eur"); params.set("line_items[0][price_data][unit_amount]", String(pack.amountCents));
    params.set("line_items[0][price_data][product_data][name]", pack.label); params.set("line_items[0][price_data][product_data][description]", `${pack.credits} générations Avatar IA pour Multisports Scoring`);
    params.set("metadata[feature]", "avatar_ia"); params.set("metadata[userId]", req.user.id); params.set("metadata[packId]", packId); params.set("metadata[credits]", String(pack.credits));
    const session = await stripePostForm("/v1/checkout/sessions", params);
    await client.query(`INSERT INTO avatar_ai_purchases (id, user_id, stripe_session_id, pack_id, credits, amount_cents, currency, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,'eur','created',NOW()) ON CONFLICT (stripe_session_id) DO NOTHING`, [uid("avpay"), req.user.id, session.id, packId, pack.credits, pack.amountCents]);
    res.json({ ok: true, url: session.url, sessionId: session.id, packId, credits: pack.credits });
  } catch (error) { console.error("POST /avatar-ai/checkout error:", error); res.status(502).json({ ok: false, error: "stripe_checkout_failed", message: error.message || String(error) }); }
  finally { client.release(); }
});

app.get("/avatar-ai/checkout/verify", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const sessionId = String(req.query?.session_id || "").trim();
    if (!sessionId || !sessionId.startsWith("cs_")) return res.status(400).json({ ok: false, error: "missing_session_id" });
    const session = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const paid = session?.payment_status === "paid" || session?.status === "complete";
    const metadataUserId = String(session?.metadata?.userId || "").trim();
    const packId = String(session?.metadata?.packId || "").trim();
    const pack = AVATAR_AI_PACKS[packId];
    const credits = Math.max(0, Math.floor(Number(session?.metadata?.credits || pack?.credits || 0)));
    if (!paid || session?.metadata?.feature !== "avatar_ia" || !pack || credits <= 0) return res.status(400).json({ ok: false, error: "session_not_creditable" });
    if (metadataUserId !== req.user.id) return res.status(403).json({ ok: false, error: "session_user_mismatch" });
    await client.query("BEGIN");
    const existing = await client.query(`SELECT * FROM avatar_ai_purchases WHERE stripe_session_id = $1 FOR UPDATE`, [sessionId]);
    const alreadyPaid = existing.rows[0]?.status === "paid";
    let accountRow = await ensureAvatarAiAccount(client, req.user.id);
    if (!alreadyPaid) {
      await client.query(`INSERT INTO avatar_ai_purchases (id, user_id, stripe_session_id, pack_id, credits, amount_cents, currency, status, created_at, paid_at) VALUES ($1,$2,$3,$4,$5,$6,'eur','paid',NOW(),NOW()) ON CONFLICT (stripe_session_id) DO UPDATE SET status='paid', paid_at=COALESCE(avatar_ai_purchases.paid_at, NOW())`, [uid("avpay"), req.user.id, sessionId, packId, credits, pack.amountCents]);
      const updated = await client.query(`UPDATE avatar_ai_accounts SET credits = credits + $2, total_purchased = total_purchased + $2, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [req.user.id, credits]);
      accountRow = updated.rows[0];
    }
    await client.query("COMMIT");
    res.json({ ...mapAvatarAiAccount(accountRow), paid: true, credited: !alreadyPaid, addedCredits: alreadyPaid ? 0 : credits, sessionId, packId });
  } catch (error) { try { await client.query("ROLLBACK"); } catch {} console.error("GET /avatar-ai/checkout/verify error:", error); res.status(502).json({ ok: false, error: "stripe_verify_failed", message: error.message || String(error) }); }
  finally { client.release(); }
});

app.get("/avatar-ai/gallery", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM avatar_ai_gallery WHERE user_id = $1 ORDER BY created_at DESC LIMIT 48`, [req.user.id]);
    res.json({ ok: true, items: result.rows.map(normalizeAvatarGalleryRow) });
  } catch (error) { console.error("GET /avatar-ai/gallery error:", error); res.status(500).json({ ok: false, error: "avatar_gallery_list_failed", message: error.message || String(error) }); }
});

app.post("/avatar-ai/gallery", authRequired, async (req, res) => {
  try {
    const dataUrl = sanitizeAvatarDataUrlForGallery(req.body?.dataUrl || req.body?.data_url || req.body?.src);
    if (!dataUrl) return res.status(400).json({ ok: false, error: "invalid_avatar_data_url", message: "Avatar WebP/DataURL manquant ou trop lourd." });
    const id = String(req.body?.id || req.body?.galleryId || uid("avgallery")).trim().slice(0, 80);
    const name = String(req.body?.name || "PLAYER").trim().slice(0, 64) || "PLAYER";
    const source = req.body?.source === "manual" ? "manual" : "ia";
    const style = req.body?.style == null ? null : String(req.body.style).slice(0, 64);
    const medallionColor = req.body?.medallionColor == null ? null : String(req.body.medallionColor).slice(0, 40);
    const metadata = { byteSize: Buffer.byteLength(dataUrl, "utf8") };
    const result = await pool.query(`
      INSERT INTO avatar_ai_gallery (id, user_id, name, data_url, source, style, medallion_color, metadata, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, data_url=EXCLUDED.data_url, source=EXCLUDED.source, style=EXCLUDED.style, medallion_color=EXCLUDED.medallion_color, metadata=EXCLUDED.metadata, updated_at=NOW()
      RETURNING *
    `, [id, req.user.id, name, dataUrl, source, style, medallionColor, JSON.stringify(metadata)]);
    await pool.query(`DELETE FROM avatar_ai_gallery WHERE user_id = $1 AND id NOT IN (SELECT id FROM avatar_ai_gallery WHERE user_id = $1 ORDER BY created_at DESC LIMIT 48)`, [req.user.id]).catch(() => {});
    res.json({ ok: true, item: normalizeAvatarGalleryRow(result.rows[0]) });
  } catch (error) { console.error("POST /avatar-ai/gallery error:", error); res.status(500).json({ ok: false, error: "avatar_gallery_save_failed", message: error.message || String(error) }); }
});

app.delete("/avatar-ai/gallery/:id", authRequired, async (req, res) => {
  try { const result = await pool.query(`DELETE FROM avatar_ai_gallery WHERE user_id = $1 AND id = $2`, [req.user.id, String(req.params.id || "")]); res.json({ ok: true, deleted: Number(result.rowCount || 0) }); }
  catch (error) { console.error("DELETE /avatar-ai/gallery/:id error:", error); res.status(500).json({ ok: false, error: "avatar_gallery_delete_failed", message: error.message || String(error) }); }
});

app.post(["/avatar-ai/stripe-webhook", "/avatar-ai/webhook"], async (req, res) => {
  try {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");
    const sigCheck = verifyStripeWebhookSignature(rawBody, req.headers["stripe-signature"]);
    if (!sigCheck.ok) return res.status(400).json({ ok: false, error: sigCheck.error || "stripe_signature_invalid" });
    const event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "{}"));
    const type = String(event?.type || "");
    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      const result = await creditAvatarAiPurchaseFromStripeSession(event?.data?.object, "stripe_webhook");
      return res.json({ ok: true, received: true, type, ...result });
    }
    return res.json({ ok: true, received: true, ignored: true, type });
  } catch (error) { console.error("POST /avatar-ai webhook error:", error); res.status(500).json({ ok: false, error: "stripe_webhook_failed", message: error.message || String(error) }); }
});

app.get("/", (req, res) => {
  res.json({ status: "Multisports API running", provider: "nas" });
});

app.get("/health", async (req, res) => {
  try {
    const dbTime = await testDbConnection();
    dbReady = true;
    lastDbError = null;
    res.json({ ok: true, dbReady: true, dbTime, provider: "nas" });
  } catch (error) {
    lastDbError = error;
    dbReady = false;
    console.error("GET /health db error:", error?.message || error);
    res.status(503).json({ ok: false, dbReady: false, provider: "nas", error: error.message });
  }
});

app.get("/health/db", async (req, res) => {
  try {
    const dbTime = await testDbConnection();
    dbReady = true;
    lastDbError = null;
    res.json({ ok: true, dbReady: true, dbTime });
  } catch (error) {
    lastDbError = error;
    dbReady = false;
    console.error("GET /health/db error:", error?.message || error);
    res.status(503).json({ ok: false, dbReady: false, error: error.message });
  }
});

app.get("/media/health", async (req, res) => {
  try {
    ensureDirSync(MEDIA_ROOT);
    res.json({ ok: true, mediaRoot: MEDIA_ROOT });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || String(error) });
  }
});

app.post("/media/upload", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const decoded = decodeMediaPayload(req.body || {});
    if (!decoded || !decoded.buffer?.length) return res.status(400).json({ error: "Image manquante" });
    const kind = req.body?.kind || "generic_asset";
    const ownerId = req.body?.ownerId || null;
    const variant = req.body?.variant || null;
    const mimeType = req.body?.mimeType || decoded.mimeType;
    const sha256 = sha256Buffer(decoded.buffer);
    const existing = await findExistingMediaAsset(client, {
      userId: req.user.id,
      kind,
      ownerId,
      variant,
      sha256,
    });
    if (existing?.id && existing?.file_path && fs.existsSync(String(existing.file_path))) {
      return res.json(mapMediaAssetForResponse(req, existing, { deduped: true }));
    }
    const row = await saveMediaAssetRecord(client, {
      userId: req.user.id,
      kind,
      ownerId,
      variant,
      mimeType,
      buffer: decoded.buffer,
    });
    res.json(mapMediaAssetForResponse(req, row, { deduped: false }));
  } catch (error) {
    console.error("POST /media/upload error:", error);
    res.status(500).json({ error: error.message || "Erreur upload media" });
  } finally {
    client.release();
  }
});

app.post("/media/bulk-resolve", authRequired, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
    if (!ids.length) return res.json({ ok: true, assets: [] });
    const result = await pool.query(
      `SELECT * FROM media_assets WHERE user_id = $1 AND id = ANY($2::text[])`,
      [req.user.id, ids]
    );
    const assets = result.rows.map((row) => {
      const publicUrl = buildMediaPublicUrl(req, row.id);
      return {
        id: row.id,
        assetId: row.id,
        kind: row.kind,
        ownerId: row.owner_id,
        variant: row.variant,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        sha256: row.sha256,
        path: `/media/${row.id}`,
        publicUrl,
        url: publicUrl,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
    res.json({ ok: true, assets });
  } catch (error) {
    console.error("POST /media/bulk-resolve error:", error);
    res.status(500).json({ error: error.message || "Erreur resolve media" });
  }
});

app.get("/media/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const row = await loadMediaAssetById(id);
    if (!row?.file_path) return res.status(404).json({ error: "Media introuvable" });
    const filePath = String(row.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Fichier media introuvable" });
    if (row.mime_type) res.type(row.mime_type);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(filePath);
  } catch (error) {
    console.error("GET /media/:id error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture media" });
  }
});

app.post("/auth/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    const nicknameInput = req.body?.nickname;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Mot de passe trop court (6 minimum)" });
    }

    const normalizedEmail = normalizeEmail(email);
    const nickname = safeNickname(nicknameInput, email);

    await client.query("BEGIN");

    const existingEmail = await client.query(`SELECT id FROM users WHERE email_normalized = $1 LIMIT 1`, [normalizedEmail]);
    if (existingEmail.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    }

    const existingNick = await client.query(`SELECT id FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`, [nickname]);
    if (existingNick.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Pseudo déjà utilisé" });
    }

    const userId = uid("usr");
    const passwordHash = await bcrypt.hash(password, 12);
    const userInsert = await client.query(`
      INSERT INTO users (id, email, email_normalized, password_hash, nickname, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      RETURNING *
    `, [userId, email, normalizedEmail, passwordHash, nickname]);

    const userRow = userInsert.rows[0];
    const profileRow = await ensureProfileForUser(client, userRow, nickname);

    await client.query("COMMIT");
    return res.status(201).json(buildSessionPayload(userRow, profileRow));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /auth/register error:", error);
    return res.status(500).json({ error: error.message || "Erreur register" });
  } finally {
    client.release();
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const userRow = await findUserByEmail(email);
    if (!userRow) {
      return res.status(401).json({ error: "Compte introuvable" });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe invalide" });
    }

    const profileRow = await loadProfileByUserId(userRow.id) || await ensureProfileForUser(pool, userRow, userRow.nickname);
    return res.json(buildSessionPayload(userRow, profileRow));
  } catch (error) {
    console.error("POST /auth/login error:", error);
    return res.status(500).json({ error: error.message || "Erreur login" });
  }
});

app.get("/auth/me", authRequired, async (req, res) => {
  try {
    const profileRow = await loadProfileByUserId(req.user.id) || await ensureProfileForUser(pool, req.user, req.user.nickname);
    res.json(buildSessionPayload(req.user, profileRow));
  } catch (error) {
    console.error("GET /auth/me error:", error);
    res.status(500).json({ error: error.message || "Erreur me" });
  }
});

app.post("/auth/logout", authRequired, async (req, res) => {
  res.json({ ok: true });
});

app.post("/auth/request-password-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!email) return res.status(400).json({ error: "Email requis" });
    const userRow = await findUserByEmail(email);
    if (userRow) {
      const token = uid("reset");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
      await pool.query(`
        INSERT INTO auth_reset_tokens (id, user_id, token, created_at, expires_at)
        VALUES ($1,$2,$3,NOW(),$4)
      `, [uid("art"), userRow.id, token, expiresAt]);
    }
    res.json({ ok: true, message: "Demande enregistrée" });
  } catch (error) {
    console.error("POST /auth/request-password-reset error:", error);
    res.status(500).json({ error: error.message || "Erreur reset password" });
  }
});

app.put("/auth/email", authRequired, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!email) return res.status(400).json({ error: "Email requis" });
    const normalized = normalizeEmail(email);
    const clash = await pool.query(`SELECT id FROM users WHERE email_normalized = $1 AND id <> $2 LIMIT 1`, [normalized, req.user.id]);
    if (clash.rows[0]) return res.status(409).json({ error: "Email déjà utilisé" });
    const updated = await pool.query(`
      UPDATE users
      SET email = $2, email_normalized = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.user.id, email, normalized]);
    const profileRow = await loadProfileByUserId(req.user.id) || await ensureProfileForUser(pool, updated.rows[0], updated.rows[0].nickname);
    res.json(buildSessionPayload(updated.rows[0], profileRow));
  } catch (error) {
    console.error("PUT /auth/email error:", error);
    res.status(500).json({ error: error.message || "Erreur update email" });
  }
});

app.put("/auth/password", authRequired, async (req, res) => {
  try {
    const newPassword = String(req.body?.newPassword || req.body?.password || "").trim();
    if (!newPassword) return res.status(400).json({ error: "Nouveau mot de passe requis" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Mot de passe trop court (6 minimum)" });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(`
      UPDATE users
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1
    `, [req.user.id, passwordHash]);
    res.json({ ok: true });
  } catch (error) {
    console.error("PUT /auth/password error:", error);
    res.status(500).json({ error: error.message || "Erreur update password" });
  }
});

app.delete("/auth/account", authRequired, async (req, res) => {
  const client = await pool.connect();
  const userId = String(req.user?.id || "").trim();
  const mediaFilesToDelete = [];

  try {
    if (!userId) return res.status(401).json({ ok: false, error: "Utilisateur introuvable" });

    await client.query("BEGIN");

    const mediaRows = await client.query(
      `SELECT file_path FROM media_assets WHERE user_id = $1 AND file_path IS NOT NULL`,
      [userId]
    ).catch(() => ({ rows: [] }));
    for (const row of mediaRows.rows || []) {
      const filePath = String(row?.file_path || "").trim();
      if (filePath) mediaFilesToDelete.push(filePath);
    }

    // Tables sans contrainte FK stricte ou avec anciennes migrations : nettoyage explicite avant users.
    await client.query(`DELETE FROM online_messages WHERE user_id = $1`, [userId]).catch(() => {});
    await client.query(`DELETE FROM online_matches WHERE owner_user = $1`, [userId]).catch(() => {});
    await client.query(`DELETE FROM matches WHERE owner_user_id = $1`, [userId]).catch(() => {});
    await client.query(`DELETE FROM stats WHERE profile_id = $1`, [userId]).catch(() => {});
    await client.query(`DELETE FROM user_store WHERE user_id = $1`, [userId]).catch(() => {});
    await client.query(`DELETE FROM media_assets WHERE user_id = $1`, [userId]).catch(() => {});

    // Les autres tables liées au compte sont couvertes par ON DELETE CASCADE.
    const deleted = await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");

    for (const filePath of mediaFilesToDelete) {
      try {
        const normalizedRoot = path.resolve(MEDIA_ROOT);
        const normalizedFile = path.resolve(filePath);
        if (normalizedFile.startsWith(normalizedRoot) && fs.existsSync(normalizedFile)) {
          await fs.promises.unlink(normalizedFile);
        }
      } catch (unlinkError) {
        console.warn("DELETE /auth/account media unlink ignored:", unlinkError?.message || unlinkError);
      }
    }

    res.json({ ok: true, deleted: Number(deleted.rowCount || 0) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("DELETE /auth/account error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression compte" });
  } finally {
    client.release();
  }
});

app.get("/profiles/me", authRequired, async (req, res) => {
  try {
    const profileRow = await loadProfileByUserId(req.user.id) || await ensureProfileForUser(pool, req.user, req.user.nickname);
    res.json({ ok: true, user: { id: req.user.id, email: req.user.email, nickname: req.user.nickname }, profile: mapProfile(profileRow, req.user) });
  } catch (error) {
    console.error("GET /profiles/me error:", error);
    res.status(500).json({ error: error.message || "Erreur profile me" });
  }
});

app.put("/profiles/me", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const current = await ensureProfileForUser(client, req.user, req.user.nickname);
    const body = req.body || {};
    const displayName = body.displayName !== undefined ? String(body.displayName || "").trim() : current.display_name;
    const payload = {
      name: displayName || current.name || req.user.nickname,
      display_name: displayName || current.display_name || req.user.nickname,
      avatar_url: body.avatarUrl !== undefined ? (body.avatarUrl || null) : current.avatar_url,
      avatar_data_url: body.avatarDataUrl !== undefined ? (body.avatarDataUrl || null) : current.avatar_data_url,
      country: body.country !== undefined ? (body.country || null) : current.country,
      bio: body.bio !== undefined ? (body.bio || null) : current.bio,
      surname: body.surname !== undefined ? (body.surname || null) : current.surname,
      first_name: body.firstName !== undefined ? (body.firstName || null) : current.first_name,
      last_name: body.lastName !== undefined ? (body.lastName || null) : current.last_name,
      birth_date: body.birthDate !== undefined ? (body.birthDate || null) : current.birth_date,
      city: body.city !== undefined ? (body.city || null) : current.city,
      phone: body.phone !== undefined ? (body.phone || null) : current.phone,
      preferences: body.preferences !== undefined ? (body.preferences || {}) : (current.preferences || {}),
      private_info: body.privateInfo !== undefined ? (body.privateInfo || {}) : (current.private_info || {}),
    };

    const updated = await client.query(`
      UPDATE profiles
      SET
        name = $2,
        display_name = $3,
        avatar_url = $4,
        avatar_data_url = $5,
        country = $6,
        bio = $7,
        surname = $8,
        first_name = $9,
        last_name = $10,
        birth_date = $11,
        city = $12,
        phone = $13,
        preferences = $14::jsonb,
        private_info = $15::jsonb,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [
      req.user.id,
      payload.name,
      payload.display_name,
      payload.avatar_url,
      payload.avatar_data_url,
      payload.country,
      payload.bio,
      payload.surname,
      payload.first_name,
      payload.last_name,
      payload.birth_date,
      payload.city,
      payload.phone,
      JSON.stringify(payload.preferences || {}),
      JSON.stringify(payload.private_info || {}),
    ]);

    const nextNickname = String(payload.display_name || payload.surname || req.user.nickname || "").trim();
    let nextUser = req.user;
    if (nextNickname) {
      const userUpdate = await client.query(`
        UPDATE users
        SET nickname = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [req.user.id, nextNickname]);
      nextUser = userUpdate.rows[0] || req.user;
    }

    res.json({ ok: true, user: { id: nextUser.id, email: nextUser.email, nickname: nextUser.nickname }, profile: mapProfile(updated.rows[0], nextUser) });
  } catch (error) {
    console.error("PUT /profiles/me error:", error);
    res.status(500).json({ error: error.message || "Erreur update profile" });
  } finally {
    client.release();
  }
});

app.post("/profiles/avatar", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const decoded = decodeMediaPayload(req.body || {});
    if (!decoded || !decoded.buffer?.length || !String(decoded.mimeType || "").startsWith("image/")) {
      return res.status(400).json({ error: "Avatar image invalide" });
    }

    await ensureProfileForUser(client, req.user, req.user.nickname);
    const asset = await saveMediaAssetRecord(client, {
      userId: req.user.id,
      kind: "account_avatar",
      ownerId: req.user.id,
      variant: "full",
      mimeType: req.body?.mimeType || decoded.mimeType,
      buffer: decoded.buffer,
    });
    const publicUrl = buildMediaPublicUrl(req, asset.id);

    const updated = await client.query(`
      UPDATE profiles
      SET
        avatar = $2,
        avatar_url = $2,
        avatar_data_url = NULL,
        avatar_asset_id = $3,
        avatar_thumb_asset_id = COALESCE(avatar_thumb_asset_id, $3),
        avatar_full_asset_id = $3,
        avatar_cast_asset_id = COALESCE(avatar_cast_asset_id, $3),
        avatar_version = COALESCE(avatar_version, 0) + 1,
        avatar_updated_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [req.user.id, publicUrl, asset.id]);

    const row = updated.rows[0];
    res.json({
      ok: true,
      publicUrl,
      avatarUrl: publicUrl,
      path: `/media/${asset.id}`,
      assetId: asset.id,
      avatarAssetId: asset.id,
      avatarThumbAssetId: row?.avatar_thumb_asset_id || asset.id,
      avatarFullAssetId: asset.id,
      avatarCastAssetId: row?.avatar_cast_asset_id || asset.id,
      avatarVersion: Number(row?.avatar_version || 0),
      avatarUpdatedAt: row?.avatar_updated_at || nowIso(),
      profile: mapProfile(row, req.user),
    });
  } catch (error) {
    console.error("POST /profiles/avatar error:", error);
    res.status(500).json({ error: error.message || "Erreur avatar" });
  } finally {
    client.release();
  }
});

app.get("/sync/pull", authRequired, async (req, res) => {
  try {
    const row = await loadUserStoreSnapshot(req.user.id);
    if (!row) {
      return res.json({ status: "not_found", payload: null, version: null, updatedAt: null });
    }
    res.json({
      status: "ok",
      payload: row.payload ?? row.data ?? null,
      version: row.version,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error("GET /sync/pull error:", error);
    res.status(500).json({ error: error.message || "Erreur sync pull" });
  }
});

app.post("/sync/push", authRequired, async (req, res) => {
  try {
    const payload = req.body?.payload ?? null;
    const version = Number(req.body?.version || 8);
    const saved = await saveUserStoreSnapshot(req.user.id, payload, version, String(req.body?.reason || "push"));
    res.json({ ok: true, version, updatedAt: nowIso(), slotId: saved?.slotId || null });
  } catch (error) {
    console.error("POST /sync/push error:", error);
    res.status(500).json({ error: error.message || "Erreur sync push" });
  }
});

app.post("/sync/slots", authRequired, async (req, res) => {
  try {
    const body = req.body || {};
    const incomingPayload = body.payload ?? body.snapshot ?? body.data ?? null;
    const reason = String(body.reason || body.label || "manual-slot").trim().slice(0, 160) || "manual-slot";
    let payload = incomingPayload;
    let version = Number(body.version || 0);

    if (payload == null) {
      const latest = await loadUserStoreSnapshot(req.user.id);
      if (!latest) {
        return res.status(404).json({ ok: false, error: "Aucune sauvegarde NAS courante à copier. Lance d'abord une sauvegarde NAS." });
      }
      payload = latest.payload ?? latest.data ?? null;
      version = Number(version || latest.version || 8);
    }
    if (payload == null) return res.status(400).json({ ok: false, error: "Payload de sauvegarde manquant" });
    if (!Number.isFinite(version) || version <= 0) version = Number(payload?._v || payload?.v || 8) || 8;

    const encoded = await encodeSnapshotForTextStore(payload);
    const slotId = await insertUserStoreSnapshotSlot(req.user.id, encoded, version, payload, reason);
    const summary = summarizeSnapshotForVault(payload);
    const createdAt = nowIso();
    res.status(201).json({ ok: true, id: slotId, slotId, ownerId: req.user.id, version, summary, reason, createdAt, updatedAt: createdAt, latest: false });
  } catch (error) {
    console.error("POST /sync/slots error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur création slot NAS" });
  }
});

app.get("/sync/slots", authRequired, async (req, res) => {
  try {
    const latest = await loadUserStoreSnapshot(req.user.id).catch(() => null);
    const result = await pool.query(`
      SELECT id, user_id, store, version, summary, reason, promoted_at, created_at
      FROM user_store_snapshots
      WHERE user_id = $1 AND store = 'main'
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.user.id]);
    const slots = result.rows.map((row) => ({
      id: row.id,
      ownerId: row.user_id,
      version: row.version,
      summary: row.summary || {},
      reason: row.reason || null,
      promotedAt: row.promoted_at || null,
      createdAt: row.created_at,
      updatedAt: row.created_at,
      latest: false,
    }));
    if (latest) {
      slots.unshift({
        id: "latest",
        ownerId: req.user.id,
        version: latest.version,
        summary: summarizeSnapshotForVault(latest.payload ?? latest.data ?? null),
        reason: "current",
        promotedAt: null,
        createdAt: latest.updated_at,
        updatedAt: latest.updated_at,
        latest: true,
      });
    }
    res.json({ ok: true, slots });
  } catch (error) {
    console.error("GET /sync/slots error:", error);
    res.status(500).json({ error: error.message || "Erreur liste slots NAS" });
  }
});

app.get("/sync/slots/:id", authRequired, async (req, res) => {
  try {
    const slotId = String(req.params.id || "").trim();
    if (slotId === "latest") {
      const row = await loadUserStoreSnapshot(req.user.id);
      if (!row) return res.status(404).json({ error: "Aucun backup NAS disponible" });
      return res.json({ ok: true, id: "latest", ownerId: req.user.id, payload: row.payload ?? row.data ?? null, version: row.version, summary: summarizeSnapshotForVault(row.payload ?? row.data ?? null), createdAt: row.updated_at, updatedAt: row.updated_at, latest: true });
    }
    const row = await loadUserStoreSnapshotSlot(req.user.id, slotId);
    if (!row) return res.status(404).json({ error: "Slot NAS introuvable" });
    res.json({ ok: true, id: row.id, ownerId: row.user_id, payload: row.payload ?? row.data ?? null, version: row.version, summary: row.summary || summarizeSnapshotForVault(row.payload ?? row.data ?? null), reason: row.reason || null, promotedAt: row.promoted_at || null, createdAt: row.created_at, updatedAt: row.created_at, latest: false });
  } catch (error) {
    console.error("GET /sync/slots/:id error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture slot NAS" });
  }
});

app.post("/sync/slots/:id/restore", authRequired, async (req, res) => {
  try {
    const slotId = String(req.params.id || "").trim();
    const row = slotId === "latest" ? await loadUserStoreSnapshot(req.user.id) : await loadUserStoreSnapshotSlot(req.user.id, slotId);
    if (!row) return res.status(404).json({ error: "Slot NAS introuvable" });
    const payload = row.payload ?? row.data ?? null;
    const version = Number(row.version || req.body?.version || 8);
    const saved = await saveUserStoreSnapshot(req.user.id, payload, version, `restore:${slotId}`);
    if (slotId !== "latest") {
      await pool.query(`UPDATE user_store_snapshots SET promoted_at = NOW() WHERE user_id = $1 AND id = $2`, [req.user.id, slotId]).catch(() => {});
    }
    res.json({ ok: true, restoredFrom: slotId, version, updatedAt: nowIso(), slotId: saved?.slotId || null });
  } catch (error) {
    console.error("POST /sync/slots/:id/restore error:", error);
    res.status(500).json({ error: error.message || "Erreur restauration slot NAS" });
  }
});



// -----------------------------------------------------------------------------
// Shared matches V2 — partage interne de parties sauvegardées entre amis
// -----------------------------------------------------------------------------
function mapSharedMatchRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    sport: row.sport,
    matchId: row.match_id,
    status: row.status || "pending",
    message: row.message || null,
    payload: row.payload || {},
    createdAt: row.created_at,
    readAt: row.read_at || null,
    acceptedAt: row.accepted_at || null,
    refusedAt: row.refused_at || null,
    importedAt: row.imported_at || null,
    direction: row.owner_user_id === row.__current_user_id ? "outgoing" : "incoming",
    ownerUser: {
      id: row.owner_user_id,
      userId: row.owner_user_id,
      nickname: row.owner_nickname,
      displayName: row.owner_display_name || row.owner_nickname,
      avatarUrl: row.owner_avatar_url || null,
      email: row.owner_email || null,
    },
    targetUser: {
      id: row.target_user_id,
      userId: row.target_user_id,
      nickname: row.target_nickname,
      displayName: row.target_display_name || row.target_nickname,
      avatarUrl: row.target_avatar_url || null,
      email: row.target_email || null,
    },
  };
}

async function notifySharedMatchEmail({ sender, receiver, item }) {
  const url = String(process.env.SHARE_EMAIL_WEBHOOK_URL || "").trim();
  if (!url) return { ok: false, skipped: true, reason: "SHARE_EMAIL_WEBHOOK_URL missing" };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "match_shared",
        to: receiver?.email || null,
        receiver,
        sender,
        item,
      }),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.warn("[shared-match] email webhook failed:", error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
}

app.post("/online/share-match", authRequired, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId || req.body?.toUserId || "").trim();
    const title = String(req.body?.title || "Partie partagée").trim().slice(0, 160);
    const sport = String(req.body?.sport || "darts").trim().slice(0, 40);
    const matchId = String(req.body?.matchId || req.body?.id || "").trim() || null;
    const message = String(req.body?.message || "").trim().slice(0, 500) || null;
    const payload = req.body?.payload ?? req.body?.match ?? null;

    if (!targetUserId) return res.status(400).json({ ok: false, error: "Ami destinataire manquant" });
    if (!payload || typeof payload !== "object") return res.status(400).json({ ok: false, error: "Payload de partie manquant" });
    if (!(await areFriends(req.user.id, targetUserId))) {
      return res.status(403).json({ ok: false, error: "Partage autorisé uniquement avec un ami" });
    }

    const inserted = await pool.query(`
      INSERT INTO shared_items (
        id, owner_user_id, target_user_id, type, title, sport, match_id,
        payload, status, message, created_at
      )
      VALUES ($1,$2,$3,'match',$4,$5,$6,$7::jsonb,'pending',$8,NOW())
      RETURNING *
    `, [
      uid("shrmatch"),
      req.user.id,
      targetUserId,
      title,
      sport,
      matchId,
      JSON.stringify(payload),
      message,
    ]);

    const sender = await loadPublicUserById(req.user.id).catch(() => null);
    const receiver = await loadPublicUserById(targetUserId).catch(() => null);
    const item = inserted.rows[0];
    notifySharedMatchEmail({ sender, receiver, item }).catch(() => {});

    res.status(201).json({ ok: true, item });
  } catch (error) {
    console.error("POST /online/share-match error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur partage partie" });
  }
});

app.get("/online/shared-matches", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        $1::text AS __current_user_id,
        ou.email AS owner_email,
        ou.nickname AS owner_nickname,
        op.display_name AS owner_display_name,
        op.avatar_url AS owner_avatar_url,
        tu.email AS target_email,
        tu.nickname AS target_nickname,
        tp.display_name AS target_display_name,
        tp.avatar_url AS target_avatar_url
      FROM shared_items s
      JOIN users ou ON ou.id = s.owner_user_id
      JOIN users tu ON tu.id = s.target_user_id
      LEFT JOIN profiles op ON op.user_id = ou.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE (s.target_user_id = $1 OR s.owner_user_id = $1)
        AND s.type = 'match'
      ORDER BY s.created_at DESC
      LIMIT 100
    `, [req.user.id]);

    res.json({ ok: true, items: result.rows.map(mapSharedMatchRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/shared-matches error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture partages parties" });
  }
});

app.get("/online/shared-matches/count", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS pending
      FROM shared_items
      WHERE target_user_id = $1
        AND type = 'match'
        AND status = 'pending'
    `, [req.user.id]);

    res.json({ ok: true, pending: Number(result.rows[0]?.pending || 0) });
  } catch (error) {
    console.error("GET /online/shared-matches/count error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur compteur partages" });
  }
});

app.put("/online/shared-matches/:id/read", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE shared_items
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND target_user_id = $2
        AND type = 'match'
      RETURNING *
    `, [String(req.params.id || ""), req.user.id]);

    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Partage introuvable" });
    res.json({ ok: true, item: result.rows[0] });
  } catch (error) {
    console.error("PUT /online/shared-matches/:id/read error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture partage" });
  }
});

app.post("/online/shared-matches/:id/accept", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE shared_items
      SET status = 'accepted',
          read_at = COALESCE(read_at, NOW()),
          accepted_at = COALESCE(accepted_at, NOW())
      WHERE id = $1
        AND target_user_id = $2
        AND type = 'match'
        AND status IN ('pending','accepted')
      RETURNING *
    `, [String(req.params.id || ""), req.user.id]);

    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Partage introuvable ou déjà traité" });
    res.json({ ok: true, item: result.rows[0], payload: result.rows[0].payload || {} });
  } catch (error) {
    console.error("POST /online/shared-matches/:id/accept error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur acceptation partage" });
  }
});

app.post("/online/shared-matches/:id/import", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE shared_items
      SET status = 'imported',
          read_at = COALESCE(read_at, NOW()),
          accepted_at = COALESCE(accepted_at, NOW()),
          imported_at = COALESCE(imported_at, NOW())
      WHERE id = $1
        AND target_user_id = $2
        AND type = 'match'
        AND status IN ('pending','accepted','imported')
      RETURNING *
    `, [String(req.params.id || ""), req.user.id]);

    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Partage introuvable ou déjà refusé" });
    res.json({ ok: true, item: result.rows[0], payload: result.rows[0].payload || {} });
  } catch (error) {
    console.error("POST /online/shared-matches/:id/import error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur import partage" });
  }
});

app.post("/online/shared-matches/:id/refuse", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE shared_items
      SET status = 'refused',
          read_at = COALESCE(read_at, NOW()),
          refused_at = COALESCE(refused_at, NOW())
      WHERE id = $1
        AND target_user_id = $2
        AND type = 'match'
        AND status = 'pending'
      RETURNING *
    `, [String(req.params.id || ""), req.user.id]);

    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Partage introuvable ou déjà traité" });
    res.json({ ok: true, item: result.rows[0] });
  } catch (error) {
    console.error("POST /online/shared-matches/:id/refuse error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur refus partage" });
  }
});




// -----------------------------------------------------------------------------
// Online profile links V2 — demandes d'association profil local ↔ compte ami
// -----------------------------------------------------------------------------
function mapProfileLinkRequestRow(row) {
  if (!row) return null;
  const requesterName = row.requester_display_name || row.requester_nickname || row.owner_nickname || "Joueur";
  const targetName = row.target_display_name || row.target_nickname || row.friend_display_name || row.friend_nickname || "Ami";
  const status = row.status || "pending";
  const currentUserId = row.__current_user_id || null;
  return {
    id: row.id,
    status,
    localProfileId: row.local_profile_id,
    localProfileName: row.local_profile_name || null,
    localProfileAvatarUrl: row.local_profile_avatar_url || row.metadata?.localProfileAvatarUrl || null,
    statsMeta: row.stats_meta || row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at || null,
    refusedAt: row.refused_at || null,
    cancelledAt: row.cancelled_at || null,
    direction: row.owner_user_id === currentUserId ? "outgoing" : row.friend_user_id === currentUserId ? "incoming" : undefined,
    requesterUser: { id: row.owner_user_id, userId: row.owner_user_id, email: row.requester_email || null, nickname: row.requester_nickname || requesterName, displayName: requesterName, avatarUrl: row.requester_avatar_url || null },
    targetUser: { id: row.friend_user_id, userId: row.friend_user_id, email: row.target_email || null, nickname: row.target_nickname || targetName, displayName: targetName, avatarUrl: row.target_avatar_url || row.friend_avatar_url || null },
    friendUserId: row.friend_user_id,
    friendDisplayName: targetName,
    friendAvatarUrl: row.target_avatar_url || row.friend_avatar_url || null,
    statsShared: status === "accepted",
  };
}



// -----------------------------------------------------------------------------
// Profile linked stats resolver — fusion profil local distant -> compte ami associé
// Objectif : l'association ne doit pas seulement renvoyer l'avatar / stats_meta.
// Elle doit aussi reconstruire les stats et l'historique du profil local depuis
// le snapshot NAS du propriétaire du profil local, puis les exposer au compte ami.
// -----------------------------------------------------------------------------
function linkedStatsNormalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function linkedStatsIsPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function linkedStatsPickSnapshotPayload(storeRow) {
  const payload = storeRow?.payload ?? storeRow?.data ?? null;
  if (payload && typeof payload === "object") return payload;
  return null;
}

function linkedStatsExtractStoreLike(payload) {
  if (!payload || typeof payload !== "object") return {};
  const idb = linkedStatsIsPlainObject(payload.idb) ? payload.idb : {};
  const idbValues = Object.entries(idb)
    .filter(([key]) => {
      const k = String(key || "");
      return k === "dc-store-v1" || k.endsWith(":dc-store-v1") || k.includes("store");
    })
    .map(([, value]) => value)
    .filter(linkedStatsIsPlainObject);
  return (
    (linkedStatsIsPlainObject(payload.store) && payload.store) ||
    (linkedStatsIsPlainObject(payload.data?.store) && payload.data.store) ||
    (linkedStatsIsPlainObject(payload.data) && payload.data) ||
    (linkedStatsIsPlainObject(payload.payload?.store) && payload.payload.store) ||
    (linkedStatsIsPlainObject(payload.payload) && payload.payload) ||
    (linkedStatsIsPlainObject(payload.snapshot) && payload.snapshot) ||
    idbValues[0] ||
    payload
  );
}

function linkedStatsArr(value) {
  if (Array.isArray(value)) return value;
  if (linkedStatsIsPlainObject(value)) return Object.values(value);
  return [];
}

function linkedStatsDeepVisit(root, visitor, maxNodes = 30000) {
  const seen = new Set();
  let count = 0;
  function walk(value, path = "") {
    if (value == null || count >= maxNodes) return;
    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    count += 1;
    if (visitor(value, path) === false) return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length && count < maxNodes; i += 1) walk(value[i], `${path}[${i}]`);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (count >= maxNodes) break;
      walk(child, path ? `${path}.${key}` : key);
    }
  }
  walk(root, "");
}

function linkedStatsObjectContainsId(value, id) {
  const needle = String(id || "").trim();
  if (!needle || value == null) return false;
  try {
    return JSON.stringify(value).includes(needle);
  } catch {
    return false;
  }
}

function linkedStatsObjectContainsName(value, names = []) {
  const safeNames = names.map(linkedStatsNormalizeText).filter((v) => v.length >= 2);
  if (!safeNames.length || value == null) return false;
  try {
    const haystack = JSON.stringify(value).toLowerCase();
    return safeNames.some((name) => haystack.includes(name));
  } catch {
    return false;
  }
}

function linkedStatsPickProfileName(profile) {
  return String(profile?.displayName || profile?.name || profile?.nickname || profile?.playerName || profile?.label || "").trim();
}

function linkedStatsPickProfileAvatar(profile) {
  return profile?.avatarUrl || profile?.avatar_url || profile?.avatarDataUrl || profile?.avatar_data_url || profile?.avatar || profile?.photoURL || null;
}

function linkedStatsParseJsonObject(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function linkedStatsDecodeHistoryPayload(row) {
  if (linkedStatsIsPlainObject(row?.payload) || Array.isArray(row?.payload)) return row.payload;
  const packed = row?.payloadCompressed ?? row?.detail?.payloadCompressed ?? null;
  if (typeof packed !== "string" || !packed.length) return null;
  const direct = linkedStatsParseJsonObject(packed);
  if (direct) return direct;
  const attempts = [
    () => LZString.decompressFromUTF16(packed),
    () => LZString.decompress(packed),
    () => LZString.decompressFromBase64(packed),
  ];
  for (const attempt of attempts) {
    try {
      const parsed = linkedStatsParseJsonObject(attempt());
      if (parsed) return parsed;
    } catch {}
  }
  return null;
}

function linkedStatsHydrateHistoryRow(row) {
  if (!linkedStatsIsPlainObject(row)) return row;
  const payload = linkedStatsDecodeHistoryPayload(row);
  if (!linkedStatsIsPlainObject(payload)) return row;
  const payloadSummary = linkedStatsIsPlainObject(payload.summary) ? payload.summary : {};
  const rowSummary = linkedStatsIsPlainObject(row.summary) ? row.summary : {};
  const playersCandidates = [row.players, rowSummary.players, payload.players, payloadSummary.players, payload?.config?.players]
    .filter(Array.isArray)
    .sort((a, b) => b.length - a.length);
  const players = playersCandidates[0] || [];
  const summary = { ...rowSummary, ...payloadSummary, ...(players.length ? { players } : {}) };
  return {
    ...row,
    payload: { ...payload, ...(players.length ? { players } : {}), summary },
    summary,
    ...(players.length ? { players } : {}),
    winnerId: payloadSummary.winnerId ?? payload.winnerId ?? payload?.result?.winnerId ?? row.winnerId ?? null,
  };
}

function linkedStatsExtractProfiles(snapshot) {
  const st = linkedStatsExtractStoreLike(snapshot);
  const out = [
    ...linkedStatsArr(st.profiles),
    ...linkedStatsArr(st.localProfiles),
    ...linkedStatsArr(st.players),
    ...linkedStatsArr(st?.profiles?.list),
    ...linkedStatsArr(snapshot?.profiles),
    ...linkedStatsArr(snapshot?.data?.profiles),
  ].filter(linkedStatsIsPlainObject);
  const byKey = new Map();
  for (const p of out) {
    const key = String(p.id || p.profileId || p.playerId || linkedStatsPickProfileName(p) || JSON.stringify(p).slice(0, 80));
    if (!byKey.has(key)) byKey.set(key, p);
  }
  return Array.from(byKey.values());
}

function linkedStatsExtractHistory(snapshot) {
  const st = linkedStatsExtractStoreLike(snapshot);
  const histRows = linkedStatsIsPlainObject(snapshot?.history?.rows) ? Object.values(snapshot.history.rows) : [];
  const storeHistRows = linkedStatsIsPlainObject(st?.history?.rows) ? Object.values(st.history.rows) : [];
  const out = [
    ...linkedStatsArr(st.history),
    ...linkedStatsArr(st.matches),
    ...linkedStatsArr(st.savedMatches),
    ...linkedStatsArr(st.matchHistory),
    ...linkedStatsArr(st.finishedMatches),
    ...linkedStatsArr(st.inProgressMatches),
    ...linkedStatsArr(st.historyById),
    ...linkedStatsArr(st.matchesById),
    ...linkedStatsArr(snapshot?.history),
    ...linkedStatsArr(snapshot?.matches),
    ...linkedStatsArr(snapshot?.savedMatches),
    ...linkedStatsArr(snapshot?.matchHistory),
    ...linkedStatsArr(snapshot?.data?.history),
    ...linkedStatsArr(snapshot?.data?.matches),
    ...histRows,
    ...storeHistRows,
  ].filter(linkedStatsIsPlainObject);
  const byKey = new Map();
  for (const row of out) {
    const key = String(row.id || row.matchId || row.resumeId || row.createdAt || row.date || JSON.stringify(row).slice(0, 100));
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return Array.from(byKey.values());
}

function linkedStatsFindLocalProfile(snapshot, localProfileId, localProfileName) {
  const id = String(localProfileId || "").trim();
  const expectedName = linkedStatsNormalizeText(localProfileName);
  const profiles = linkedStatsExtractProfiles(snapshot);
  let best =
    profiles.find((p) => id && String(p.id || p.profileId || p.localProfileId || p.playerId || p.uuid || "").trim() === id) ||
    profiles.find((p) => expectedName && linkedStatsNormalizeText(linkedStatsPickProfileName(p)) === expectedName) ||
    null;
  if (best) return best;

  linkedStatsDeepVisit(snapshot, (value, path) => {
    if (!linkedStatsIsPlainObject(value)) return;
    const objectId = String(value.id || value.profileId || value.localProfileId || value.playerId || value.uuid || "").trim();
    const objectName = linkedStatsNormalizeText(linkedStatsPickProfileName(value));
    const pathLooksProfile = /profile|player|joueur/i.test(path || "");
    if (id && objectId === id) {
      best = value;
      return false;
    }
    if (!best && expectedName && objectName === expectedName && pathLooksProfile) best = value;
  });
  return linkedStatsIsPlainObject(best) ? best : null;
}

function linkedStatsCollectMatches(snapshot, localProfileId, localProfileName) {
  const names = [localProfileName].filter(Boolean);
  const direct = linkedStatsExtractHistory(snapshot);
  const matches = [];
  const seen = new Set();
  function maybePush(value, path = "") {
    if (!linkedStatsIsPlainObject(value)) return;
    // Les lignes du dump History sont séparées en header + payloadCompressed.
    // On inspecte la version hydratée pour retrouver aussi les participants qui
    // n'existent que dans le détail, mais on renvoie la ligne compressée afin de
    // ne pas multiplier le poids réseau du snapshot.
    const inspected = linkedStatsHydrateHistoryRow(value);
    const looksLikeMatch = (
      Array.isArray(inspected.players) ||
      Array.isArray(inspected.participants) ||
      Array.isArray(inspected.legs) ||
      Array.isArray(inspected.sets) ||
      linkedStatsIsPlainObject(inspected.result) ||
      linkedStatsIsPlainObject(inspected.summary) ||
      inspected.finalScore != null ||
      inspected.score != null ||
      inspected.sport != null ||
      inspected.game != null ||
      inspected.mode != null ||
      /history|match|matches|games|parties|results|saved/i.test(path || "")
    );
    if (!looksLikeMatch) return;
    const hasProfile = linkedStatsObjectContainsId(inspected, localProfileId) || linkedStatsObjectContainsName(inspected, names);
    if (!hasProfile) return;
    const key = String(value.id || value.matchId || value.resumeId || value.createdAt || value.date || path || JSON.stringify(value).slice(0, 100));
    if (seen.has(key)) return;
    seen.add(key);
    matches.push(value);
  }
  direct.forEach((row, idx) => maybePush(row, `direct[${idx}]`));
  if (!matches.length) {
    linkedStatsDeepVisit(snapshot, maybePush, 30000);
  }
  matches.sort((a, b) => {
    const da = Date.parse(a?.playedAt || a?.createdAt || a?.date || a?.timestamp || 0) || Number(a?.createdAt || a?.updatedAt || 0) || 0;
    const db = Date.parse(b?.playedAt || b?.createdAt || b?.date || b?.timestamp || 0) || Number(b?.createdAt || b?.updatedAt || 0) || 0;
    return db - da;
  });
  return matches.slice(0, 800);
}

function linkedStatsMergeNumericStats(target, source) {
  if (!linkedStatsIsPlainObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      if (target[key] == null || Number(target[key] || 0) === 0) target[key] = value;
    } else if (linkedStatsIsPlainObject(value)) {
      if (!linkedStatsIsPlainObject(target[key])) target[key] = {};
      linkedStatsMergeNumericStats(target[key], value);
    } else if (Array.isArray(value) && !target[key]) {
      target[key] = value;
    } else if ((typeof value === "string" || typeof value === "boolean") && target[key] == null) {
      target[key] = value;
    }
  }
  return target;
}

function linkedStatsCollectExplicitStats(snapshot, localProfileId, localProfileName) {
  const stats = {};
  const id = String(localProfileId || "").trim();
  const names = [localProfileName].filter(Boolean);
  linkedStatsDeepVisit(snapshot, (value, path) => {
    if (!linkedStatsIsPlainObject(value)) return;
    const lowerPath = String(path || "").toLowerCase();
    const isStatsPath = /stats|statistics|leader|rank|x01|cricket|killer|dashboard|profile/i.test(lowerPath);
    if (!isStatsPath) return;

    if (id && linkedStatsIsPlainObject(value[id])) linkedStatsMergeNumericStats(stats, value[id]);
    if (id && linkedStatsIsPlainObject(value.profiles?.[id])) linkedStatsMergeNumericStats(stats, value.profiles[id]);
    if (id && linkedStatsIsPlainObject(value.byProfile?.[id])) linkedStatsMergeNumericStats(stats, value.byProfile[id]);
    if (id && String(value.profileId || value.localProfileId || value.playerId || value.id || "") === id) linkedStatsMergeNumericStats(stats, value);
    if (!Object.keys(stats).length && linkedStatsObjectContainsId(value, id)) linkedStatsMergeNumericStats(stats, value);
    if (!Object.keys(stats).length && linkedStatsObjectContainsName(value, names)) linkedStatsMergeNumericStats(stats, value);
  }, 30000);
  return stats;
}

function linkedStatsNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function linkedStatsAggregateFromMatches(matches, localProfileId, localProfileName) {
  const id = String(localProfileId || "").trim();
  const wantedName = linkedStatsNormalizeText(localProfileName);
  let totalMatches = 0;
  let wins = 0;
  let bestVisit = 0;
  let bestCheckout = 0;
  let avg3Sum = 0;
  let avg3Count = 0;

  function playerMatches(player) {
    if (!player || typeof player !== "object") return false;
    const pid = String(player.id || player.profileId || player.localProfileId || player.playerId || player.userId || "").trim();
    const pname = linkedStatsNormalizeText(player.name || player.displayName || player.nickname || player.playerName || player.label);
    return (id && pid === id) || (!!wantedName && pname === wantedName);
  }

  for (const rawMatch of matches || []) {
    const match = linkedStatsHydrateHistoryRow(rawMatch);
    totalMatches += 1;
    const containers = [
      match,
      match?.result,
      match?.summary,
      match?.stats,
      match?.payload,
      match?.payload?.summary,
      match?.payload?.stats,
      match?.payload?.result,
      match?.payload?.session,
      match?.payload?.payload,
    ].filter(Boolean);
    let player = null;
    for (const c of containers) {
      const players = [
        ...linkedStatsArr(c?.players),
        ...linkedStatsArr(c?.participants),
        ...linkedStatsArr(c?.teams),
      ];
      player = players.find(playerMatches) || player;
      if (player) break;
    }
    if (player) {
      bestVisit = Math.max(bestVisit, linkedStatsNumber(player.bestVisit, player.best_visit, player.maxVisit, player.highScore, player.bestScore));
      bestCheckout = Math.max(bestCheckout, linkedStatsNumber(player.bestCheckout, player.bestCO, player.bestCheckoutValue, player.best_checkout));
      const avg3 = linkedStatsNumber(player.avg3, player.avg3d, player.average3, player.moy3d, player.moyenne3, player.avg_3);
      if (avg3 > 0) { avg3Sum += avg3; avg3Count += 1; }
      const rank = Number(player.rank || player.position || player.place || 0);
      if (rank === 1 || player.winner === true || player.isWinner === true) wins += 1;
    } else {
      bestVisit = Math.max(bestVisit, linkedStatsNumber(match.bestVisit, match.best_visit, match.result?.bestVisit, match.summary?.bestVisit));
      bestCheckout = Math.max(bestCheckout, linkedStatsNumber(match.bestCheckout, match.bestCO, match.result?.bestCheckout, match.summary?.bestCheckout));
    }

    const winnerBlob = match?.winner || match?.winnerProfile || match?.result?.winner || match?.result?.winnerProfile || match?.summary?.winner;
    if (!player && winnerBlob && (linkedStatsObjectContainsId(winnerBlob, id) || linkedStatsObjectContainsName(winnerBlob, [localProfileName]))) wins += 1;
  }

  const avg3 = avg3Count ? Math.round((avg3Sum / avg3Count) * 10) / 10 : 0;
  const winRate = totalMatches ? Math.round((wins / totalMatches) * 1000) / 10 : 0;
  return {
    totalMatches,
    total_matches: totalMatches,
    matches: totalMatches,
    games: totalMatches,
    sessions: totalMatches,
    wins,
    victories: wins,
    winRate,
    winPercent: winRate,
    winPct: winRate,
    avg3,
    avg_3: avg3,
    bestVisit,
    best_visit: bestVisit,
    bestCheckout,
    best_checkout: bestCheckout,
  };
}

function linkedStatsBuildLocalSnapshot(payload, localProfileId, localProfileName, fallbackStats = {}) {
  const snapshot = payload && typeof payload === "object" ? payload : null;
  if (!snapshot) {
    const fallback = fallbackStats && typeof fallbackStats === "object" ? fallbackStats : {};
    return { profile: null, stats: fallback, matches: [], history: [], foundInSnapshot: false };
  }
  const profile = linkedStatsFindLocalProfile(snapshot, localProfileId, localProfileName);
  const resolvedName = linkedStatsPickProfileName(profile) || localProfileName;
  const matches = linkedStatsCollectMatches(snapshot, localProfileId, resolvedName);
  const explicitStats = linkedStatsCollectExplicitStats(snapshot, localProfileId, resolvedName);
  const aggregateStats = linkedStatsAggregateFromMatches(matches, localProfileId, resolvedName);
  const stats = linkedStatsMergeNumericStats(linkedStatsMergeNumericStats({}, fallbackStats || {}), explicitStats || {});
  linkedStatsMergeNumericStats(stats, aggregateStats);
  return {
    profile,
    stats,
    matches,
    history: matches,
    foundInSnapshot: !!profile || matches.length > 0 || Object.keys(explicitStats || {}).length > 0,
  };
}

app.get("/online/profile-links", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, $1::text AS __current_user_id,
        ou.email AS requester_email, ou.nickname AS requester_nickname, op.display_name AS requester_display_name, op.avatar_url AS requester_avatar_url,
        tu.email AS target_email, tu.nickname AS target_nickname, tp.display_name AS target_display_name, tp.avatar_url AS target_avatar_url
      FROM profile_friend_links l
      JOIN users ou ON ou.id = l.owner_user_id
      JOIN users tu ON tu.id = l.friend_user_id
      LEFT JOIN profiles op ON op.user_id = ou.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE (l.owner_user_id = $1 OR l.friend_user_id = $1)
        AND COALESCE(l.status, 'pending') <> 'cancelled'
      ORDER BY l.created_at DESC
      LIMIT 200
    `, [req.user.id]);
    res.json({ ok: true, links: result.rows.map(mapProfileLinkRequestRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/profile-links error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture associations profils" });
  }
});

app.get("/online/profile-links/count", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int AS pending FROM profile_friend_links WHERE friend_user_id = $1 AND COALESCE(status, 'pending') = 'pending'`, [req.user.id]);
    res.json({ ok: true, pending: Number(result.rows[0]?.pending || 0) });
  } catch (error) {
    console.error("GET /online/profile-links/count error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur compteur associations profils" });
  }
});

app.post("/online/profile-links", authRequired, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId || req.body?.friendUserId || req.body?.userId || "").trim();
    const localProfileId = String(req.body?.localProfileId || req.body?.profileId || "").trim();
    const localProfileName = String(req.body?.localProfileName || req.body?.profileName || "Profil local").trim().slice(0, 160) || "Profil local";
    const localProfileAvatarUrl = String(req.body?.localProfileAvatarUrl || "").trim().slice(0, 2000) || null;
    const statsMeta = req.body?.statsMeta && typeof req.body.statsMeta === "object" ? req.body.statsMeta : {};
    if (!targetUserId) return res.status(400).json({ ok: false, error: "Ami destinataire manquant" });
    if (!localProfileId) return res.status(400).json({ ok: false, error: "Profil local manquant" });
    if (targetUserId === req.user.id) return res.status(400).json({ ok: false, error: "Impossible d'associer ton propre compte" });
    if (!(await areFriends(req.user.id, targetUserId))) return res.status(403).json({ ok: false, error: "Association autorisée uniquement avec un ami" });
    const target = await loadPublicUserById(targetUserId).catch(() => null);
    const result = await pool.query(`
      INSERT INTO profile_friend_links (id, owner_user_id, local_profile_id, local_profile_name, local_profile_avatar_url, friend_user_id, friend_display_name, friend_avatar_url, metadata, stats_meta, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,'pending',NOW(),NOW())
      ON CONFLICT (owner_user_id, local_profile_id)
      DO UPDATE SET local_profile_name = EXCLUDED.local_profile_name, local_profile_avatar_url = EXCLUDED.local_profile_avatar_url, friend_user_id = EXCLUDED.friend_user_id, friend_display_name = EXCLUDED.friend_display_name, friend_avatar_url = EXCLUDED.friend_avatar_url, metadata = EXCLUDED.metadata, stats_meta = EXCLUDED.stats_meta,
        status = CASE WHEN profile_friend_links.friend_user_id = EXCLUDED.friend_user_id AND profile_friend_links.status = 'accepted' THEN 'accepted' ELSE 'pending' END,
        accepted_at = CASE WHEN profile_friend_links.friend_user_id = EXCLUDED.friend_user_id AND profile_friend_links.status = 'accepted' THEN profile_friend_links.accepted_at ELSE NULL END,
        refused_at = NULL, cancelled_at = NULL, updated_at = NOW()
      RETURNING *
    `, [uid("pfl"), req.user.id, localProfileId, localProfileName, localProfileAvatarUrl, targetUserId, target?.displayName || target?.nickname || null, target?.avatarUrl || null, JSON.stringify({ ...(statsMeta || {}), localProfileAvatarUrl }), JSON.stringify(statsMeta || {})]);
    res.status(201).json({ ok: true, link: mapProfileLinkRequestRow({ ...result.rows[0], __current_user_id: req.user.id }) });
  } catch (error) {
    console.error("POST /online/profile-links error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur demande association profil" });
  }
});

app.post("/online/profile-links/:id/respond", authRequired, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const response = String(req.body?.status || req.body?.response || "").trim().toLowerCase();
    const accepted = response === "accepted" || response === "accept" || response === "ok";
    const refused = response === "refused" || response === "rejected" || response === "refuse" || response === "reject";
    if (!accepted && !refused) return res.status(400).json({ ok: false, error: "Réponse invalide" });
    const nextStatus = accepted ? "accepted" : "refused";
    const result = await pool.query(`
      UPDATE profile_friend_links SET status = $3,
        accepted_at = CASE WHEN $3 = 'accepted' THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
        refused_at = CASE WHEN $3 = 'refused' THEN COALESCE(refused_at, NOW()) ELSE refused_at END,
        updated_at = NOW()
      WHERE id = $1 AND friend_user_id = $2 AND COALESCE(status, 'pending') = 'pending'
      RETURNING *
    `, [id, req.user.id, nextStatus]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Demande introuvable ou déjà traitée" });
    res.json({ ok: true, link: mapProfileLinkRequestRow({ ...result.rows[0], __current_user_id: req.user.id }) });
  } catch (error) {
    console.error("POST /online/profile-links/:id/respond error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur réponse association profil" });
  }
});

app.put("/online/profile-links/:id/stats", authRequired, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const statsMeta = req.body?.statsMeta && typeof req.body.statsMeta === "object" ? req.body.statsMeta : {};
    if (!id) return res.status(400).json({ ok: false, error: "Association manquante" });

    // Route volontairement ultra-courte : les anciennes réponses renvoyaient toute la ligne
    // et pouvaient rester bloquées trop longtemps derrière NAS/Cloudflare. Ici on écrit
    // stats_meta puis on renvoie uniquement le strict nécessaire.
    const result = await pool.query(`
      UPDATE profile_friend_links
      SET stats_meta = $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object('lastStatsSyncAt', NOW(), 'lastStatsSyncSource', 'manual-profile-button'),
          updated_at = NOW()
      WHERE id = $1
        AND owner_user_id = $2
        AND COALESCE(status, 'pending') = 'accepted'
      RETURNING id, owner_user_id, local_profile_id, friend_user_id, status, stats_meta, updated_at, accepted_at
    `, [id, req.user.id, JSON.stringify(statsMeta || {})]);

    const row = result.rows[0] || null;
    if (!row) return res.status(404).json({ ok: false, error: "Association acceptée introuvable" });
    res.json({
      ok: true,
      link: {
        id: row.id,
        status: row.status || "accepted",
        direction: "outgoing",
        localProfileId: row.local_profile_id,
        friendUserId: row.friend_user_id,
        statsMeta: row.stats_meta || {},
        statsShared: true,
        acceptedAt: row.accepted_at || null,
        updatedAt: row.updated_at || nowIso(),
      },
    });
  } catch (error) {
    console.error("PUT /online/profile-links/:id/stats error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur synchro stats profil lié" });
  }
});

app.post("/online/profile-links/linked-snapshots", authRequired, async (req, res) => {
  try {
    const requestedLocalIds = Array.isArray(req.body?.localProfileIds)
      ? req.body.localProfileIds.map((v) => String(v || "").trim()).filter(Boolean)
      : [];

    const params = [req.user.id];
    let localFilter = "";
    if (requestedLocalIds.length) {
      params.push(requestedLocalIds);
      // CRITIQUE FUSION PROFIL AMI :
      // - Côté propriétaire du profil local, les ids envoyés sont bien ses local_profile_id.
      // - Côté compte ami associé, les ids envoyés sont les profils LOCAUX du compte ami
      //   et ne peuvent pas matcher l.local_profile_id, qui appartient au compte propriétaire.
      // Donc on filtre les local_profile_id uniquement pour owner_user_id ; pour friend_user_id
      // on laisse passer l'association acceptée afin de récupérer le snapshot distant à fusionner.
      localFilter = " AND (l.friend_user_id = $1 OR l.local_profile_id = ANY($2::text[]))";
    }

    const linksResult = await pool.query(`
      SELECT
        l.*,
        ou.email AS owner_email,
        ou.nickname AS owner_nickname,
        op.display_name AS owner_display_name,
        op.avatar_url AS owner_avatar_url,
        op.avatar AS owner_avatar,
        op.avatar_data_url AS owner_avatar_data_url,
        op.stats AS owner_profile_stats,
        op.updated_at AS owner_profile_updated_at,
        tu.email AS target_email,
        tu.nickname AS target_nickname,
        tp.display_name AS target_display_name,
        tp.avatar_url AS target_avatar_url,
        tp.avatar AS target_avatar,
        tp.avatar_data_url AS target_avatar_data_url,
        tp.stats AS target_profile_stats,
        tp.updated_at AS target_profile_updated_at
      FROM profile_friend_links l
      JOIN users ou ON ou.id = l.owner_user_id
      JOIN users tu ON tu.id = l.friend_user_id
      LEFT JOIN profiles op ON op.user_id = ou.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE (l.owner_user_id = $1 OR l.friend_user_id = $1)
        AND COALESCE(l.status, 'pending') = 'accepted'
        ${localFilter}
      ORDER BY l.updated_at DESC
      LIMIT 100
    `, params);

    const snapshots = [];
    for (const row of linksResult.rows || []) {
      const currentIsOwner = String(row.owner_user_id || "") === String(req.user.id || "");
      const snapshotUserId = row.owner_user_id; // la source des stats du profil local est toujours le propriétaire du profil local

      let storeRow = null;
      try {
        storeRow = await loadUserStoreSnapshot(snapshotUserId);
      } catch (error) {
        console.warn("POST /online/profile-links/linked-snapshots snapshot load failed:", error?.message || error);
      }

      const snapshotPayload = linkedStatsPickSnapshotPayload(storeRow);
      const linkedLocalData = linkedStatsBuildLocalSnapshot(
        snapshotPayload,
        row.local_profile_id,
        row.local_profile_name,
        row.stats_meta || {}
      );
      const linkedLocalProfileFromSnapshot = linkedLocalData.profile || {};
      const linkedLocalAvatarUrl = row.local_profile_avatar_url
        || linkedStatsPickProfileAvatar(linkedLocalProfileFromSnapshot)
        || row.friend_avatar_url
        || row.target_avatar_url
        || row.target_avatar
        || row.target_avatar_data_url
        || null;
      const linkedLocalName = linkedStatsPickProfileName(linkedLocalProfileFromSnapshot)
        || row.local_profile_name
        || row.friend_display_name
        || row.target_display_name
        || "Profil local lié";

      const sourceUser = currentIsOwner ? {
        id: row.friend_user_id,
        userId: row.friend_user_id,
        email: row.target_email || null,
        nickname: row.target_nickname || row.friend_display_name || null,
        displayName: row.target_display_name || row.friend_display_name || row.target_nickname || "Ami",
        avatarUrl: row.target_avatar_url || row.friend_avatar_url || row.target_avatar || row.target_avatar_data_url || null,
      } : {
        id: row.owner_user_id,
        userId: row.owner_user_id,
        email: row.owner_email || null,
        nickname: row.owner_nickname || null,
        displayName: row.owner_display_name || row.owner_nickname || "Ami",
        avatarUrl: row.owner_avatar_url || row.local_profile_avatar_url || row.owner_avatar || row.owner_avatar_data_url || null,
      };

      const linkedAccountProfile = {
        id: row.friend_user_id,
        userId: row.friend_user_id,
        profileId: row.friend_user_id,
        name: row.target_display_name || row.friend_display_name || row.target_nickname || "Ami",
        displayName: row.target_display_name || row.friend_display_name || row.target_nickname || "Ami",
        nickname: row.target_nickname || row.friend_display_name || null,
        avatarUrl: row.target_avatar_url || row.friend_avatar_url || row.target_avatar || row.target_avatar_data_url || null,
        avatar: row.target_avatar || row.target_avatar_url || row.target_avatar_data_url || null,
        avatarDataUrl: row.target_avatar_data_url || row.target_avatar_url || row.target_avatar || null,
        stats: row.target_profile_stats || {},
        updatedAt: row.target_profile_updated_at || null,
      };

      const linkedLocalProfile = {
        ...linkedLocalProfileFromSnapshot,
        id: row.local_profile_id,
        userId: row.owner_user_id,
        profileId: row.local_profile_id,
        localProfileId: row.local_profile_id,
        name: linkedLocalName,
        displayName: linkedLocalName,
        nickname: linkedLocalProfileFromSnapshot.nickname || linkedLocalName || null,
        avatarUrl: linkedLocalAvatarUrl,
        avatar: linkedLocalAvatarUrl,
        avatarDataUrl: linkedLocalAvatarUrl,
        stats: linkedLocalData.stats || row.stats_meta || {},
        statsMeta: linkedLocalData.stats || row.stats_meta || {},
        matches: linkedLocalData.matches || [],
        history: linkedLocalData.history || [],
        foundInSnapshot: Boolean(linkedLocalData.foundInSnapshot),
        updatedAt: storeRow?.updated_at || row.updated_at || null,
      };

      const link = mapProfileLinkRequestRow({ ...row, __current_user_id: req.user.id });
      snapshots.push({
        link,
        direction: currentIsOwner ? "outgoing-owner" : "incoming-linked-account",
        sourceUserId: snapshotUserId,
        sourceUser,
        friendUser: sourceUser,
        friendProfile: currentIsOwner ? linkedAccountProfile : linkedLocalProfile,
        linkedAccountProfile,
        linkedLocalProfile,
        localProfileId: row.local_profile_id,
        ownerUserId: row.owner_user_id,
        friendUserId: row.friend_user_id,
        statsMeta: linkedLocalData.stats || row.stats_meta || {},
        localProfile: linkedLocalProfile,
        localProfileStats: linkedLocalData.stats || row.stats_meta || {},
        localProfileMatches: linkedLocalData.matches || [],
        localProfileHistory: linkedLocalData.history || [],
        filtered: {
          localProfile: linkedLocalProfile,
          stats: linkedLocalData.stats || row.stats_meta || {},
          matches: linkedLocalData.matches || [],
          history: linkedLocalData.history || [],
          foundInSnapshot: Boolean(linkedLocalData.foundInSnapshot),
        },
        payload: snapshotPayload,
        version: storeRow?.version ?? null,
        updatedAt: storeRow?.updated_at || row.updated_at || null,
      });
    }

    res.json({ ok: true, snapshots });
  } catch (error) {
    console.error("POST /online/profile-links/linked-snapshots error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture snapshots profils liés" });
  }
});

app.delete("/online/profile-links/:id", authRequired, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const result = await pool.query(`
      UPDATE profile_friend_links SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW()
      WHERE id = $1 AND (owner_user_id = $2 OR friend_user_id = $2) AND COALESCE(status, 'pending') IN ('pending','accepted','refused')
      RETURNING *
    `, [id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Association introuvable" });
    res.json({ ok: true, link: mapProfileLinkRequestRow({ ...result.rows[0], __current_user_id: req.user.id }) });
  } catch (error) {
    console.error("DELETE /online/profile-links/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression association profil" });
  }
});

// -----------------------------------------------------------------------------
// Profile friend links V1 — association profil local ↔ compte ami NAS
// -----------------------------------------------------------------------------
function mapProfileFriendLinkRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    localProfileId: row.local_profile_id,
    localProfileName: row.local_profile_name || null,
    friendUserId: row.friend_user_id,
    friendDisplayName: row.friend_display_name || row.friend_nickname || null,
    friendAvatarUrl: row.friend_avatar_url || row.friend_profile_avatar_url || null,
    metadata: row.metadata || {},
    statsMeta: row.stats_meta || row.metadata || {},
    status: row.status || "pending",
    acceptedAt: row.accepted_at || null,
    refusedAt: row.refused_at || null,
    cancelledAt: row.cancelled_at || null,
    statsShared: String(row.status || "pending") === "accepted",
    direction: row.owner_user_id === row.__current_user_id ? "outgoing" : row.friend_user_id === row.__current_user_id ? "incoming" : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    friend: {
      id: row.friend_user_id,
      userId: row.friend_user_id,
      email: row.friend_email || null,
      nickname: row.friend_nickname || row.friend_display_name || null,
      displayName: row.friend_display_name || row.friend_nickname || null,
      avatarUrl: row.friend_avatar_url || row.friend_profile_avatar_url || null,
    },
  };
}

app.get("/online/profile-friend-links", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pfl.*,
        u.email AS friend_email,
        u.nickname AS friend_nickname,
        p.display_name AS friend_profile_display_name,
        p.avatar_url AS friend_profile_avatar_url
      FROM profile_friend_links pfl
      JOIN users u ON u.id = pfl.friend_user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE pfl.owner_user_id = $1
      ORDER BY pfl.updated_at DESC
      LIMIT 500
    `, [req.user.id]);

    const items = result.rows.map((row) => mapProfileFriendLinkRow({
      ...row,
      friend_display_name: row.friend_display_name || row.friend_profile_display_name || row.friend_nickname,
      friend_avatar_url: row.friend_avatar_url || row.friend_profile_avatar_url,
    })).filter(Boolean);

    res.json({ ok: true, items });
  } catch (error) {
    console.error("GET /online/profile-friend-links error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture associations profils/amis" });
  }
});

app.post("/online/profile-friend-links", authRequired, async (req, res) => {
  try {
    const localProfileId = String(req.body?.localProfileId || req.body?.profileId || "").trim();
    const localProfileName = String(req.body?.localProfileName || req.body?.profileName || "").trim().slice(0, 160) || null;
    const friendUserId = String(req.body?.friendUserId || req.body?.targetUserId || req.body?.userId || "").trim();
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

    if (!localProfileId) return res.status(400).json({ ok: false, error: "Profil local manquant" });
    if (!friendUserId) return res.status(400).json({ ok: false, error: "Compte ami manquant" });
    if (friendUserId === req.user.id) return res.status(400).json({ ok: false, error: "Impossible d'associer ton propre compte comme ami" });

    if (!(await areFriends(req.user.id, friendUserId))) {
      return res.status(403).json({ ok: false, error: "Association autorisée uniquement avec un ami" });
    }

    const friend = await loadPublicUserById(friendUserId).catch(() => null);
    const result = await pool.query(`
      INSERT INTO profile_friend_links (
        id,
        owner_user_id,
        local_profile_id,
        local_profile_name,
        friend_user_id,
        friend_display_name,
        friend_avatar_url,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())
      ON CONFLICT (owner_user_id, local_profile_id)
      DO UPDATE SET
        local_profile_name = EXCLUDED.local_profile_name,
        friend_user_id = EXCLUDED.friend_user_id,
        friend_display_name = EXCLUDED.friend_display_name,
        friend_avatar_url = EXCLUDED.friend_avatar_url,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `, [
      uid("pfl"),
      req.user.id,
      localProfileId,
      localProfileName,
      friendUserId,
      friend?.displayName || friend?.nickname || null,
      friend?.avatarUrl || null,
      JSON.stringify(metadata || {}),
    ]);

    res.json({ ok: true, item: mapProfileFriendLinkRow(result.rows[0]) });
  } catch (error) {
    console.error("POST /online/profile-friend-links error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur association profil/ami" });
  }
});

app.delete("/online/profile-friend-links/:localProfileId", authRequired, async (req, res) => {
  try {
    const localProfileId = String(req.params.localProfileId || "").trim();
    if (!localProfileId) return res.status(400).json({ ok: false, error: "Profil local manquant" });

    const result = await pool.query(`
      DELETE FROM profile_friend_links
      WHERE owner_user_id = $1
        AND local_profile_id = $2
      RETURNING *
    `, [req.user.id, localProfileId]);

    res.json({ ok: true, deleted: Number(result.rowCount || 0), item: mapProfileFriendLinkRow(result.rows[0] || null) });
  } catch (error) {
    console.error("DELETE /online/profile-friend-links/:localProfileId error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression association profil/ami" });
  }
});

app.post("/online/profile-friend-links/resolve", authRequired, async (req, res) => {
  try {
    const localProfileIds = Array.isArray(req.body?.localProfileIds)
      ? req.body.localProfileIds.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    if (!localProfileIds.length) return res.json({ ok: true, links: {}, items: [] });

    const result = await pool.query(`
      SELECT
        pfl.*,
        u.email AS friend_email,
        u.nickname AS friend_nickname,
        p.display_name AS friend_profile_display_name,
        p.avatar_url AS friend_profile_avatar_url
      FROM profile_friend_links pfl
      JOIN users u ON u.id = pfl.friend_user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE pfl.owner_user_id = $1
        AND pfl.local_profile_id = ANY($2::text[])
    `, [req.user.id, localProfileIds]);

    const items = result.rows.map((row) => mapProfileFriendLinkRow({
      ...row,
      friend_display_name: row.friend_display_name || row.friend_profile_display_name || row.friend_nickname,
      friend_avatar_url: row.friend_avatar_url || row.friend_profile_avatar_url,
    })).filter(Boolean);
    const links = {};
    for (const item of items) links[item.localProfileId] = item;

    res.json({ ok: true, links, items });
  } catch (error) {
    console.error("POST /online/profile-friend-links/resolve error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur résolution associations profils/amis" });
  }
});

app.post("/online/share-match-linked", authRequired, async (req, res) => {
  try {
    const localProfileId = String(req.body?.localProfileId || req.body?.profileId || "").trim();
    if (!localProfileId) return res.status(400).json({ ok: false, error: "Profil local lié manquant" });

    const linkResult = await pool.query(`
      SELECT *
      FROM profile_friend_links
      WHERE owner_user_id = $1
        AND local_profile_id = $2
        AND COALESCE(status, 'pending') = 'accepted'
      LIMIT 1
    `, [req.user.id, localProfileId]);

    const link = linkResult.rows[0] || null;
    if (!link?.friend_user_id) return res.status(404).json({ ok: false, error: "Aucun ami associé et validé pour ce profil local" });
    if (!(await areFriends(req.user.id, link.friend_user_id))) {
      return res.status(403).json({ ok: false, error: "L'ami associé n'est plus dans ta liste d'amis" });
    }

    req.body = {
      ...(req.body || {}),
      targetUserId: link.friend_user_id,
      linkedLocalProfileId: localProfileId,
    };

    const title = String(req.body?.title || "Partie partagée").trim().slice(0, 160);
    const sport = String(req.body?.sport || "darts").trim().slice(0, 40);
    const matchId = String(req.body?.matchId || req.body?.id || "").trim() || null;
    const message = String(req.body?.message || "").trim().slice(0, 500) || null;
    const payload = req.body?.payload ?? req.body?.match ?? null;

    if (!payload || typeof payload !== "object") return res.status(400).json({ ok: false, error: "Payload de partie manquant" });

    const enrichedPayload = {
      ...payload,
      linkedShare: {
        ...(payload.linkedShare || {}),
        senderUserId: req.user.id,
        senderLocalProfileId: localProfileId,
        targetUserId: link.friend_user_id,
        localProfileName: link.local_profile_name || null,
      },
    };

    const inserted = await pool.query(`
      INSERT INTO shared_items (
        id, owner_user_id, target_user_id, type, title, sport, match_id,
        payload, status, message, created_at
      )
      VALUES ($1,$2,$3,'match',$4,$5,$6,$7::jsonb,'pending',$8,NOW())
      RETURNING *
    `, [
      uid("shrmatch"),
      req.user.id,
      link.friend_user_id,
      title,
      sport,
      matchId,
      JSON.stringify(enrichedPayload),
      message,
    ]);

    const sender = await loadPublicUserById(req.user.id).catch(() => null);
    const receiver = await loadPublicUserById(link.friend_user_id).catch(() => null);
    const item = inserted.rows[0];
    notifySharedMatchEmail({ sender, receiver, item }).catch(() => {});

    res.status(201).json({ ok: true, item, link: mapProfileFriendLinkRow(link) });
  } catch (error) {
    console.error("POST /online/share-match-linked error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur partage partie via profil lié" });
  }
});



// -----------------------------------------------------------------------------
// Online friends / partage social V1 (NAS/PostgreSQL)
// -----------------------------------------------------------------------------
app.get("/online/users/search", authRequired, async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    const users = await searchPublicUsers(q, req.user.id);
    res.json({ ok: true, users });
  } catch (error) {
    console.error("GET /online/users/search error:", error);
    res.status(500).json({ error: error.message || "Erreur recherche utilisateurs" });
  }
});

app.get("/online/friends", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id AS friendship_id,
        f.created_at AS friendship_created_at,
        u.id,
        u.email,
        u.nickname,
        p.user_id,
        p.name,
        p.display_name,
        p.avatar,
        p.avatar_url,
        p.avatar_asset_id,
        p.country,
        p.country_code,
        COALESCE(op.status, 'offline') AS presence_status,
        op.last_seen_at
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN online_presence op ON op.user_id = u.id
      WHERE f.user_a_id = $1 OR f.user_b_id = $1
      ORDER BY COALESCE(op.last_seen_at, f.created_at) DESC
    `, [req.user.id]);
    const friends = result.rows.map((row) => ({
      friendshipId: row.friendship_id,
      createdAt: row.friendship_created_at,
      ...mapPublicUser(row),
    }));
    res.json({ ok: true, friends });
  } catch (error) {
    console.error("GET /online/friends error:", error);
    res.status(500).json({ error: error.message || "Erreur liste amis" });
  }
});

app.post("/online/friend-requests", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const toUserId = String(req.body?.toUserId || req.body?.to_user || "").trim();
    const message = String(req.body?.message || "").trim().slice(0, 240) || null;
    if (!toUserId) return res.status(400).json({ error: "Destinataire manquant" });
    if (toUserId === req.user.id) return res.status(400).json({ error: "Impossible de s’ajouter soi-même" });

    const target = await findUserById(toUserId);
    if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (await areFriends(req.user.id, toUserId)) return res.status(409).json({ error: "Cet utilisateur est déjà dans tes amis" });

    const reverse = await client.query(`
      SELECT * FROM friend_requests
      WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
      LIMIT 1
    `, [toUserId, req.user.id]);
    if (reverse.rows[0]) return res.status(409).json({ error: "Cet utilisateur t’a déjà envoyé une demande" });

    const inserted = await client.query(`
      INSERT INTO friend_requests (id, from_user_id, to_user_id, status, message, created_at, updated_at)
      VALUES ($1,$2,$3,'pending',$4,NOW(),NOW())
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [uid("frq"), req.user.id, toUserId, message]);

    if (!inserted.rows[0]) return res.status(409).json({ error: "Demande déjà envoyée" });
    res.status(201).json({ ok: true, request: inserted.rows[0], toUser: await loadPublicUserById(toUserId) });
  } catch (error) {
    console.error("POST /online/friend-requests error:", error);
    res.status(500).json({ error: error.message || "Erreur demande ami" });
  } finally {
    client.release();
  }
});

app.get("/online/friend-requests", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        fu.nickname AS from_nickname,
        tu.nickname AS to_nickname,
        fp.display_name AS from_display_name,
        tp.display_name AS to_display_name,
        fp.avatar_url AS from_avatar_url,
        tp.avatar_url AS to_avatar_url
      FROM friend_requests r
      JOIN users fu ON fu.id = r.from_user_id
      JOIN users tu ON tu.id = r.to_user_id
      LEFT JOIN profiles fp ON fp.user_id = fu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE r.from_user_id = $1 OR r.to_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 100
    `, [req.user.id]);
    const requests = result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      respondedAt: row.responded_at,
      direction: row.to_user_id === req.user.id ? "incoming" : "outgoing",
      fromUser: {
        id: row.from_user_id,
        userId: row.from_user_id,
        nickname: row.from_nickname,
        displayName: row.from_display_name || row.from_nickname,
        avatarUrl: row.from_avatar_url || null,
      },
      toUser: {
        id: row.to_user_id,
        userId: row.to_user_id,
        nickname: row.to_nickname,
        displayName: row.to_display_name || row.to_nickname,
        avatarUrl: row.to_avatar_url || null,
      },
    }));
    res.json({ ok: true, requests });
  } catch (error) {
    console.error("GET /online/friend-requests error:", error);
    res.status(500).json({ error: error.message || "Erreur demandes amis" });
  }
});

app.post("/online/friend-requests/:id/respond", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = String(req.params.id || "").trim();
    const status = String(req.body?.status || "").trim().toLowerCase();
    if (status !== "accepted" && status !== "rejected") return res.status(400).json({ error: "Réponse invalide" });

    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM friend_requests WHERE id = $1 FOR UPDATE`, [id]);
    const request = current.rows[0];
    if (!request) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Demande introuvable" });
    }
    if (request.to_user_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Seul le destinataire peut répondre" });
    }
    if (request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Demande déjà traitée" });
    }

    const updated = await client.query(`
      UPDATE friend_requests
      SET status = $2, updated_at = NOW(), responded_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, status]);

    let friendship = null;
    if (status === "accepted") {
      const [a, b] = normalizeFriendPair(request.from_user_id, request.to_user_id);
      const inserted = await client.query(`
        INSERT INTO friendships (id, user_a_id, user_b_id, created_at, updated_at)
        VALUES ($1,$2,$3,NOW(),NOW())
        ON CONFLICT (user_a_id, user_b_id)
        DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [uid("frd"), a, b]);
      friendship = inserted.rows[0] || null;
    }

    await client.query("COMMIT");
    res.json({ ok: true, request: updated.rows[0], friendship });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/friend-requests/:id/respond error:", error);
    res.status(500).json({ error: error.message || "Erreur réponse demande ami" });
  } finally {
    client.release();
  }
});

app.delete("/online/friends/:userId", authRequired, async (req, res) => {
  try {
    const otherId = String(req.params.userId || "").trim();
    const [a, b] = normalizeFriendPair(req.user.id, otherId);
    const result = await pool.query(`DELETE FROM friendships WHERE user_a_id = $1 AND user_b_id = $2`, [a, b]);
    res.json({ ok: true, deleted: Number(result.rowCount || 0) });
  } catch (error) {
    console.error("DELETE /online/friends/:userId error:", error);
    res.status(500).json({ error: error.message || "Erreur suppression ami" });
  }
});

app.put("/online/presence", authRequired, async (req, res) => {
  try {
    const rawStatus = String(req.body?.status || "online").trim().toLowerCase();
    const status = rawStatus === "away" || rawStatus === "offline" ? rawStatus : "online";
    await pool.query(`
      INSERT INTO online_presence (user_id, status, last_seen_at, updated_at)
      VALUES ($1,$2,NOW(),NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET status = EXCLUDED.status, last_seen_at = NOW(), updated_at = NOW()
    `, [req.user.id, status]);
    res.json({ ok: true, status, lastSeenAt: nowIso() });
  } catch (error) {
    console.error("PUT /online/presence error:", error);
    res.status(500).json({ error: error.message || "Erreur présence" });
  }
});

app.post("/online/share", authRequired, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId || req.body?.toUserId || "").trim();
    const type = String(req.body?.type || "stats").trim().toLowerCase();
    const title = String(req.body?.title || "").trim().slice(0, 160) || null;
    const sport = String(req.body?.sport || "").trim().slice(0, 40) || null;
    const matchId = String(req.body?.matchId || "").trim() || null;
    const payload = req.body?.payload ?? {};

    if (!targetUserId) return res.status(400).json({ error: "Ami destinataire manquant" });
    if (!(await areFriends(req.user.id, targetUserId))) return res.status(403).json({ error: "Partage autorisé uniquement avec un ami" });
    if (!["stats", "match", "score", "snapshot"].includes(type)) return res.status(400).json({ error: "Type de partage invalide" });

    const inserted = await pool.query(`
      INSERT INTO shared_items (id, owner_user_id, target_user_id, type, title, sport, match_id, payload, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
      RETURNING *
    `, [uid("shr"), req.user.id, targetUserId, type, title, sport, matchId, JSON.stringify(payload || {})]);
    res.status(201).json({ ok: true, item: inserted.rows[0] });
  } catch (error) {
    console.error("POST /online/share error:", error);
    res.status(500).json({ error: error.message || "Erreur partage" });
  }
});

app.get("/online/shared", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        u.nickname AS owner_nickname,
        p.display_name AS owner_display_name,
        p.avatar_url AS owner_avatar_url
      FROM shared_items s
      JOIN users u ON u.id = s.owner_user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.target_user_id = $1 OR s.owner_user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 100
    `, [req.user.id]);
    const items = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      sport: row.sport,
      matchId: row.match_id,
      payload: row.payload || {},
      createdAt: row.created_at,
      readAt: row.read_at,
      direction: row.owner_user_id === req.user.id ? "outgoing" : "incoming",
      ownerUser: {
        id: row.owner_user_id,
        userId: row.owner_user_id,
        nickname: row.owner_nickname,
        displayName: row.owner_display_name || row.owner_nickname,
        avatarUrl: row.owner_avatar_url || null,
      },
      targetUserId: row.target_user_id,
    }));
    res.json({ ok: true, items });
  } catch (error) {
    console.error("GET /online/shared error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture partages" });
  }
});

app.put("/online/shared/:id/read", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE shared_items
      SET read_at = NOW()
      WHERE id = $1 AND target_user_id = $2
      RETURNING *
    `, [String(req.params.id || ""), req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Partage introuvable" });
    res.json({ ok: true, item: result.rows[0] });
  } catch (error) {
    console.error("PUT /online/shared/:id/read error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture partage" });
  }
});


// -----------------------------------------------------------------------------
// Online gameplay V11.2 : hôte + statut prêt + lancement synchronisé
// Ajout additif : ne remplace pas les routes existantes, mais enregistre ces
// handlers avant les anciennes routes /start et /start-safe pour imposer les règles.
// -----------------------------------------------------------------------------
function onlineHttpError(status, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra || {});
  return error;
}

function normalizeOnlineReadyFlag(body) {
  const rawStatus = String(body?.status || "").trim().toLowerCase();
  if (rawStatus === "ready") return true;
  if (rawStatus === "not_ready" || rawStatus === "not-ready" || rawStatus === "online" || rawStatus === "waiting") return false;
  if (body?.ready === false) return false;
  return true;
}

async function ensureOnlineReadyStateSchema() {
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;`);
  await onlineSafeQuery(`CREATE INDEX IF NOT EXISTS idx_online_lobby_players_ready_status_safe ON online_lobby_players(lobby_code, status);`);
}

function onlineLobbyActivePlayers(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) => String(row?.role || "player") !== "spectator");
}

function onlineLobbyNotReadyPlayers(rows = [], hostUserId = "") {
  const host = String(hostUserId || "");
  return onlineLobbyActivePlayers(rows).filter((row) => {
    const userId = String(row?.user_id || "");
    if (!userId || userId === host) return false;
    return String(row?.status || "online").toLowerCase() !== "ready";
  });
}

async function loadOnlineLobbyRowsForReady(client, code) {
  const codeUpper = sanitizeLobbyCode(code);
  if (!codeUpper) throw onlineHttpError(400, "Code salon manquant");
  const lobbyResult = await client.query(`SELECT * FROM online_lobbies WHERE code = $1 FOR UPDATE`, [codeUpper]);
  const lobbyRow = lobbyResult.rows[0] || null;
  if (!lobbyRow) throw onlineHttpError(404, "Salon introuvable");
  const playersResult = await client.query(`SELECT * FROM online_lobby_players WHERE lobby_code = $1 ORDER BY joined_at ASC`, [codeUpper]);
  return { code: codeUpper, lobbyRow, playerRows: playersResult.rows || [] };
}

async function assertOnlineLobbyCanStart(client, code, userId) {
  const data = await loadOnlineLobbyRowsForReady(client, code);
  const status = String(data.lobbyRow.status || "waiting").toLowerCase();
  if (status === "closed") throw onlineHttpError(409, "Salon fermé");
  if (String(data.lobbyRow.host_user_id || "") !== String(userId || "")) {
    throw onlineHttpError(403, "Seul l’hôte du salon peut lancer la partie", {
      hostUserId: data.lobbyRow.host_user_id || null,
    });
  }
  const notReady = onlineLobbyNotReadyPlayers(data.playerRows, data.lobbyRow.host_user_id);
  if (notReady.length > 0) {
    throw onlineHttpError(409, "Tous les joueurs doivent être prêts avant le lancement", {
      notReady: notReady.map((row) => ({
        userId: row.user_id,
        nickname: row.nickname || row.display_name || "Joueur",
        status: row.status || "online",
      })),
    });
  }
  return data;
}

async function handleOnlineLobbyReady(req, res) {
  const client = await pool.connect();
  try {
    await ensureOnlineGameplaySafeSchema();
    await ensureOnlineReadyStateSchema();
    const code = sanitizeLobbyCode(req.params.code || req.body?.code);
    if (!code) return res.status(400).json({ ok: false, error: "Code salon manquant" });
    const ready = normalizeOnlineReadyFlag(req.body || {});
    const nextStatus = ready ? "ready" : "online";

    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM online_lobbies WHERE code = $1 FOR UPDATE`, [code]);
    const lobbyRow = current.rows[0] || null;
    if (!lobbyRow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Salon introuvable" });
    }
    if (String(lobbyRow.status || "waiting").toLowerCase() === "closed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, error: "Salon fermé" });
    }

    const existing = await client.query(`
      SELECT id
      FROM online_lobby_players
      WHERE lobby_code = $1 AND user_id = $2
      ORDER BY joined_at ASC
      LIMIT 1
    `, [code, req.user.id]);

    if (!existing.rows[0]?.id) {
      await onlineSafeUpsertLobbyPlayer(client, lobbyRow, req.user, { nickname: req.body?.nickname, role: req.body?.role });
    }

    await client.query(`
      UPDATE online_lobby_players
      SET status = $3,
          ready_at = CASE WHEN $3 = 'ready' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE lobby_code = $1 AND user_id = $2
    `, [code, req.user.id, nextStatus]);
    await client.query(`UPDATE online_lobbies SET updated_at = NOW() WHERE code = $1`, [code]);
    await client.query("COMMIT");

    const lobby = await onlineSafeLoadLobbyByCode(code);
    onlineBroadcastLobby(lobby, "lobby:ready");
    res.json({ ok: true, ready, status: nextStatus, lobby, safe: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST/PUT /online/lobbies/:code/ready-safe error:", error);
    res.status(error.status || 500).json({
      ok: false,
      error: error.message || "Erreur statut prêt salon",
      code: error.code || null,
      detail: error.detail || null,
      notReady: error.notReady || undefined,
      safe: true,
    });
  } finally {
    client.release();
  }
}

app.post(["/online/lobbies/:code/ready", "/online/lobbies/:code/ready-safe"], authRequired, handleOnlineLobbyReady);
app.put(["/online/lobbies/:code/ready", "/online/lobbies/:code/ready-safe"], authRequired, handleOnlineLobbyReady);

async function handleOnlineMatchStartWithHostReady(req, res) {
  const client = await pool.connect();
  try {
    await ensureOnlineGameplaySafeSchema();
    await ensureOnlineReadyStateSchema();
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ ok: false, error: "lobbyCode manquant" });

    await client.query("BEGIN");
    const { lobbyRow, playerRows } = await assertOnlineLobbyCanStart(client, code, req.user.id);
    const state = req.body?.initialState ?? {};
    const mode = sanitizeOnlineMode(state?.mode || state?.onlineMode || lobbyRow.mode || "x01");
    const matchId = await onlineSafeId("online_matches", "id", "om");
    const statePayload = {
      ...state,
      mode,
      onlineMode: mode,
      lobbyCode: code,
      lobbyId: lobbyRow.id,
      hostUserId: lobbyRow.host_user_id,
      startedByUserId: req.user.id,
      playersReady: onlineLobbyActivePlayers(playerRows).map((row) => ({
        userId: row.user_id,
        nickname: row.nickname || row.display_name || "Joueur",
        role: row.role || "player",
        status: row.status || "online",
      })),
    };

    const result = await client.query(`
      INSERT INTO online_matches (id, lobby_code, mode, status, state_json, owner_user, created_at, updated_at)
      VALUES ($1,$2,$3,'started',$4::jsonb,$5,NOW(),NOW())
      ON CONFLICT (lobby_code)
      DO UPDATE SET mode = EXCLUDED.mode,
                    status = 'started',
                    state_json = EXCLUDED.state_json,
                    owner_user = EXCLUDED.owner_user,
                    updated_at = NOW(),
                    finished_at = NULL
      RETURNING *
    `, [matchId, code, mode, JSON.stringify(statePayload), req.user.id]);
    await client.query(`UPDATE online_lobbies SET status = 'started', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]);
    await client.query("COMMIT");

    const match = onlineBroadcastMatch(result.rows[0], "match:start");
    res.status(201).json({ ok: true, match, safe: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/matches/start host-ready error:", error);
    res.status(error.status || 500).json({
      ok: false,
      error: error.message || "Erreur démarrage match online",
      code: error.code || null,
      detail: error.detail || null,
      hostUserId: error.hostUserId || null,
      notReady: error.notReady || undefined,
      safe: true,
    });
  } finally {
    client.release();
  }
}

app.post("/online/matches/start", authRequired, handleOnlineMatchStartWithHostReady);
app.post("/online/matches/start-safe", authRequired, handleOnlineMatchStartWithHostReady);

app.get("/online/matches/by-code-safe/:code", authRequired, async (req, res) => {
  try {
    await ensureOnlineGameplaySafeSchema();
    const code = sanitizeLobbyCode(req.params.code);
    const match = await onlineLoadMatchCachedOrDb(code);
    res.json({ ok: true, match, safe: true, cache: !!match });
  } catch (error) {
    console.error("GET /online/matches/by-code-safe/:code error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture match online", code: error.code || null, detail: error.detail || null, safe: true });
  }
});


// -----------------------------------------------------------------------------
// Online gameplay V9 : salons multi-modes + chat + état live léger
// -----------------------------------------------------------------------------
app.post("/online/lobbies", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const mode = sanitizeOnlineMode(req.body?.mode || req.body?.settings?.mode || "x01");
    const maxPlayersRaw = Number(req.body?.maxPlayers || req.body?.max_players || 2);
    const maxPlayers = Math.max(1, Math.min(16, Number.isFinite(maxPlayersRaw) ? maxPlayersRaw : 2));
    const settings = { ...(req.body?.settings || {}), mode };
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const hostNickname = String(profile?.display_name || profile?.name || req.user.nickname || "Hôte").trim();

    await client.query("BEGIN");
    let lobbyRow = null;
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateOnlineLobbyCode();
      try {
        const inserted = await client.query(`
          INSERT INTO online_lobbies (id, code, mode, max_players, host_user_id, host_nickname, settings, status, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'waiting',NOW(),NOW())
          RETURNING *
        `, [uid("olb"), code, mode, maxPlayers, req.user.id, hostNickname, JSON.stringify(settings)]);
        lobbyRow = inserted.rows[0];
        break;
      } catch (error) {
        lastError = error;
        if (String(error?.code || "") !== "23505") throw error;
      }
    }
    if (!lobbyRow) throw lastError || new Error("Impossible de créer un code salon unique");
    await upsertOnlineLobbyPlayer(client, lobbyRow, req.user, { nickname: hostNickname, role: "player" });
    await client.query("COMMIT");
    const lobby = await loadOnlineLobbyByCode(lobbyRow.code);
    onlineBroadcastLobby(lobby, "lobby:create");
    res.status(201).json({ ok: true, lobby });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/lobbies error:", error);
    res.status(500).json({ error: error.message || "Erreur création salon" });
  } finally {
    client.release();
  }
});

app.get("/online/lobbies", authRequired, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const result = await pool.query(`
      SELECT * FROM online_lobbies
      WHERE status IN ('waiting','started')
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $1
    `, [limit]);
    const lobbies = [];
    for (const row of result.rows) {
      const players = await pool.query(`SELECT * FROM online_lobby_players WHERE lobby_id = $1 ORDER BY joined_at ASC`, [row.id]);
      lobbies.push(mapOnlineLobbyRow(row, players.rows.map(mapOnlineLobbyPlayer).filter(Boolean)));
    }
    res.json({ ok: true, lobbies });
  } catch (error) {
    console.error("GET /online/lobbies error:", error);
    res.status(500).json({ error: error.message || "Erreur liste salons" });
  }
});

app.get("/online/lobbies/:code", authRequired, async (req, res) => {
  try {
    const lobby = await loadOnlineLobbyByCode(req.params.code);
    if (!lobby) return res.status(404).json({ error: "Salon introuvable" });
    res.json({ ok: true, lobby });
  } catch (error) {
    console.error("GET /online/lobbies/:code error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture salon" });
  }
});

app.post("/online/lobbies/:code/join", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const code = sanitizeLobbyCode(req.params.code || req.body?.code);
    if (!code) return res.status(400).json({ error: "Code salon manquant" });
    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM online_lobbies WHERE code = $1 FOR UPDATE`, [code]);
    const lobbyRow = current.rows[0];
    if (!lobbyRow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Salon introuvable" });
    }
    if (String(lobbyRow.status || "waiting") === "closed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Salon fermé" });
    }
    await upsertOnlineLobbyPlayer(client, lobbyRow, req.user, { nickname: req.body?.nickname, role: req.body?.role });
    await client.query(`UPDATE online_lobbies SET updated_at = NOW() WHERE id = $1`, [lobbyRow.id]);
    await client.query("COMMIT");
    const lobby = await loadOnlineLobbyByCode(code);
    onlineBroadcastLobby(lobby, "lobby:join");
    res.json({ ok: true, lobby });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/lobbies/:code/join error:", error);
    res.status(500).json({ error: error.message || "Erreur rejoindre salon" });
  } finally {
    client.release();
  }
});

app.get("/online/lobbies/:code/messages", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.params.code);
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const result = await pool.query(`
      SELECT * FROM online_messages
      WHERE lobby_code = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [code, limit]);
    const messages = result.rows.reverse().map((row) => {
      const payload = row.message && typeof row.message === "object" ? row.message : { text: String(row.message || "") };
      return {
        id: row.id,
        lobby_code: row.lobby_code,
        lobbyCode: row.lobby_code,
        user_id: row.user_id,
        userId: row.user_id,
        nickname: row.nickname || payload.name || "Joueur",
        name: payload.name || row.nickname || "Joueur",
        text: payload.text || String(payload.message || ""),
        message: payload,
        created_at: row.created_at,
        createdAt: row.created_at,
      };
    });
    res.json({ ok: true, messages });
  } catch (error) {
    console.error("GET /online/lobbies/:code/messages error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture messages" });
  }
});

app.post("/online/lobbies/:code/messages", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.params.code);
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const nickname = String(profile?.display_name || profile?.name || req.user.nickname || "Joueur").trim();
    const payload = req.body?.message ?? req.body ?? {};
    const inserted = await pool.query(`
      INSERT INTO online_messages (id, lobby_code, user_id, nickname, message, created_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
      RETURNING *
    `, [uid("msg"), code, req.user.id, nickname, JSON.stringify(payload || {})]);
    const row = inserted.rows[0];
    const messagePayload = row.message && typeof row.message === "object" ? row.message : { text: String(row.message || "") };
    const messageForClients = {
      id: row.id,
      lobby_code: row.lobby_code,
      lobbyCode: row.lobby_code,
      user_id: row.user_id,
      userId: row.user_id,
      nickname: row.nickname,
      name: messagePayload.name || row.nickname || "Joueur",
      text: messagePayload.text || String(messagePayload.message || ""),
      message: messagePayload,
      created_at: row.created_at,
      createdAt: row.created_at,
    };
    onlineBroadcast(code, "lobby:message", { message: messageForClients });
    res.status(201).json({
      ok: true,
      message: {
        id: row.id,
        lobby_code: row.lobby_code,
        lobbyCode: row.lobby_code,
        user_id: row.user_id,
        userId: row.user_id,
        nickname: row.nickname,
        name: messagePayload.name || row.nickname || "Joueur",
        text: messagePayload.text || String(messagePayload.message || ""),
        message: messagePayload,
        created_at: row.created_at,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error("POST /online/lobbies/:code/messages error:", error);
    res.status(500).json({ error: error.message || "Erreur envoi message" });
  }
});

app.post("/online/matches/start", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ error: "lobbyCode manquant" });
    const lobby = await loadOnlineLobbyByCode(code);
    if (!lobby) return res.status(404).json({ error: "Salon introuvable" });
    const state = req.body?.initialState ?? {};
    const mode = sanitizeOnlineMode(state?.mode || state?.onlineMode || lobby.mode || "x01");
    const result = await pool.query(`
      INSERT INTO online_matches (id, lobby_code, mode, status, state_json, owner_user, created_at, updated_at)
      VALUES ($1,$2,$3,'started',$4::jsonb,$5,NOW(),NOW())
      ON CONFLICT (lobby_code)
      DO UPDATE SET mode = EXCLUDED.mode, status = 'started', state_json = EXCLUDED.state_json, updated_at = NOW(), finished_at = NULL
      RETURNING *
    `, [uid("om"), code, mode, JSON.stringify({ ...state, mode, onlineMode: mode, lobbyCode: code }), req.user.id]);
    await pool.query(`UPDATE online_lobbies SET status = 'started', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]);
    res.status(201).json({ ok: true, match: mapOnlineMatchRow(result.rows[0]) });
  } catch (error) {
    console.error("POST /online/matches/start error:", error);
    res.status(500).json({ error: error.message || "Erreur démarrage match online" });
  }
});

app.post("/online/matches/state", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ error: "lobbyCode manquant" });
    const state = req.body?.state ?? {};
    const status = String(req.body?.status || "started") === "ended" ? "ended" : "started";
    const mode = sanitizeOnlineMode(state?.mode || state?.onlineMode || "x01");
    const previous = onlineCacheGet(onlineMatchCache, code) || {};
    const match = {
      id: previous.id || uid("om"),
      lobby_code: code,
      lobbyCode: code,
      mode,
      status,
      state_json: { ...state, mode, onlineMode: mode, lobbyCode: code },
      state: { ...state, mode, onlineMode: mode, lobbyCode: code },
      owner_user: req.user.id,
      created_at: previous.created_at || nowIso(),
      updated_at: nowIso(),
      finished_at: status === "ended" ? nowIso() : null,
    };
    const mapped = onlineBroadcastMatch(match, status === "ended" ? "match:end" : "match:update");
    onlineScheduleMatchDbSave(mapped);
    res.json({ ok: true, match: mapped, cache: true });
  } catch (error) {
    console.error("POST /online/matches/state error:", error);
    res.status(500).json({ error: error.message || "Erreur état match online" });
  }
});

app.post("/online/matches/end", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ error: "lobbyCode manquant" });
    const finalState = req.body?.finalState ?? {};
    const mode = sanitizeOnlineMode(finalState?.mode || finalState?.onlineMode || "x01");
    const previous = onlineCacheGet(onlineMatchCache, code) || {};
    const match = {
      id: previous.id || uid("om"),
      lobby_code: code,
      lobbyCode: code,
      mode,
      status: "ended",
      state_json: { ...finalState, mode, onlineMode: mode, lobbyCode: code },
      state: { ...finalState, mode, onlineMode: mode, lobbyCode: code },
      owner_user: req.user.id,
      created_at: previous.created_at || nowIso(),
      updated_at: nowIso(),
      finished_at: nowIso(),
    };
    const mapped = onlineBroadcastMatch(match, "match:end");
    onlineScheduleMatchDbSave(mapped);
    await pool.query(`UPDATE online_lobbies SET status = 'closed', closed_at = COALESCE(closed_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]).catch(() => {});
    res.json({ ok: true, match: mapped, cache: true });
  } catch (error) {
    console.error("POST /online/matches/end error:", error);
    res.status(500).json({ error: error.message || "Erreur fin match online" });
  }
});

app.get("/online/matches/by-code/:code", authRequired, async (req, res) => {
  try {
    const code = sanitizeLobbyCode(req.params.code);
    const match = await onlineLoadMatchCachedOrDb(code);
    res.json({ ok: true, match, cache: !!match });
  } catch (error) {
    console.error("GET /online/matches/by-code/:code error:", error);
    res.status(500).json({ error: error.message || "Erreur lecture match online" });
  }
});

app.get("/online/matches", authRequired, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const result = await pool.query(`
      SELECT * FROM online_matches
      WHERE owner_user = $1 OR lobby_code IN (SELECT lobby_code FROM online_lobby_players WHERE user_id = $1)
      ORDER BY updated_at DESC
      LIMIT $2
    `, [req.user.id, limit]);
    res.json({ ok: true, matches: result.rows.map(mapOnlineMatchRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/matches error:", error);
    res.status(500).json({ error: error.message || "Erreur liste matchs online" });
  }
});


// -----------------------------------------------------------------------------
// Online gameplay SAFE V10.2 — correctif additif création salon / UUID legacy
// -----------------------------------------------------------------------------
async function onlineSafeQuery(sql, params = []) {
  try {
    await pool.query(sql, params);
    return true;
  } catch (error) {
    console.warn("[online-safe-schema] ignored:", error?.message || error);
    return false;
  }
}

async function ensureOnlineGameplaySafeSchemaUncached() {
  await onlineSafeQuery(`
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
  `);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS code TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS max_players INTEGER NOT NULL DEFAULT 2;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS host_user_id TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS host_nickname TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting';`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;`);
  await onlineSafeQuery(`ALTER TABLE online_lobbies ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;`);
  await onlineSafeQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_online_lobbies_code_unique_safe ON online_lobbies(code);`);
  await onlineSafeQuery(`CREATE INDEX IF NOT EXISTS idx_online_lobbies_status_created_safe ON online_lobbies(status, created_at DESC);`);

  await onlineSafeQuery(`
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
  `);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS lobby_id TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS lobby_code TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS user_id TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS nickname TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS display_name TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'online';`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`ALTER TABLE online_lobby_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_online_lobby_players_lobby_user_safe ON online_lobby_players(lobby_id, user_id);`);
  await onlineSafeQuery(`CREATE INDEX IF NOT EXISTS idx_online_lobby_players_code_safe ON online_lobby_players(lobby_code);`);

  await onlineSafeQuery(`
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
  `);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS lobby_code TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'x01';`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'started';`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS state_json JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS owner_user TEXT;`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
  await onlineSafeQuery(`ALTER TABLE online_matches ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;`);
  await onlineSafeQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_online_matches_lobby_code_safe ON online_matches(lobby_code);`);
  await onlineSafeQuery(`CREATE INDEX IF NOT EXISTS idx_online_matches_updated_safe ON online_matches(updated_at DESC);`);
}


let __onlineGameplaySafeSchemaReadyAt = 0;
let __onlineGameplaySafeSchemaInFlight = null;
const ONLINE_SAFE_SCHEMA_TTL_MS = Math.max(30_000, Number(process.env.ONLINE_SAFE_SCHEMA_TTL_MS || 1000 * 60 * 10));

async function ensureOnlineGameplaySafeSchema() {
  const now = Date.now();
  if (__onlineGameplaySafeSchemaReadyAt && now - __onlineGameplaySafeSchemaReadyAt < ONLINE_SAFE_SCHEMA_TTL_MS) return true;
  if (__onlineGameplaySafeSchemaInFlight) return __onlineGameplaySafeSchemaInFlight;

  __onlineGameplaySafeSchemaInFlight = (async () => {
    await ensureOnlineGameplaySafeSchemaUncached();
    __onlineGameplaySafeSchemaReadyAt = Date.now();
    return true;
  })();

  try {
    return await __onlineGameplaySafeSchemaInFlight;
  } finally {
    __onlineGameplaySafeSchemaInFlight = null;
  }
}


async function onlineSafeColumnInfo(tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `, [String(tableName || ""), String(columnName || "")]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function onlineSafeId(tableName, columnName, prefix) {
  const info = await onlineSafeColumnInfo(tableName, columnName);
  const type = `${info?.data_type || ""} ${info?.udt_name || ""}`.toLowerCase();
  if (type.includes("uuid")) return crypto.randomUUID();
  return uid(prefix);
}

async function onlineSafeLoadLobbyByCode(code) {
  const codeUpper = sanitizeLobbyCode(code);
  if (!codeUpper) return null;
  const lobbyResult = await pool.query(`SELECT * FROM online_lobbies WHERE code = $1 LIMIT 1`, [codeUpper]);
  const lobby = lobbyResult.rows[0] || null;
  if (!lobby) return null;
  const playersResult = await pool.query(`SELECT * FROM online_lobby_players WHERE lobby_code = $1 ORDER BY joined_at ASC`, [codeUpper]);
  return mapOnlineLobbyRow(lobby, playersResult.rows.map(mapOnlineLobbyPlayer).filter(Boolean));
}

async function onlineSafeUpsertLobbyPlayer(client, lobbyRow, userRow, opts = {}) {
  const profile = await loadProfileByUserId(userRow.id).catch(() => null);
  const displayName = String(opts.nickname || profile?.display_name || profile?.name || userRow.nickname || "Joueur").trim() || "Joueur";
  const role = String(opts.role || "player").trim() === "spectator" ? "spectator" : "player";
  const avatarUrl = profile?.avatar_url || profile?.avatar || null;

  const existing = await client.query(`
    SELECT id
    FROM online_lobby_players
    WHERE lobby_code = $1 AND user_id = $2
    ORDER BY joined_at ASC
    LIMIT 1
  `, [lobbyRow.code, userRow.id]);

  if (existing.rows[0]?.id) {
    await client.query(`
      UPDATE online_lobby_players
      SET nickname = $2,
          display_name = $2,
          avatar_url = $3,
          role = $4,
          status = 'online',
          updated_at = NOW()
      WHERE id::text = $1
    `, [String(existing.rows[0].id), displayName, avatarUrl, role]);
    return;
  }

  const playerId = await onlineSafeId("online_lobby_players", "id", "olp");
  await client.query(`
    INSERT INTO online_lobby_players (id, lobby_id, lobby_code, user_id, nickname, display_name, avatar_url, role, status, joined_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$5,$6,$7,'online',NOW(),NOW())
  `, [playerId, lobbyRow.id, lobbyRow.code, userRow.id, displayName, avatarUrl, role]);
}

app.post("/online/lobbies/create-safe", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureOnlineGameplaySafeSchema();
    const mode = sanitizeOnlineMode(req.body?.mode || req.body?.settings?.mode || "x01");
    const maxPlayersRaw = Number(req.body?.maxPlayers || req.body?.max_players || 2);
    const maxPlayers = Math.max(1, Math.min(16, Number.isFinite(maxPlayersRaw) ? maxPlayersRaw : 2));
    const settings = { ...(req.body?.settings || {}), mode };
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const hostNickname = String(profile?.display_name || profile?.name || req.user.nickname || "Hôte").trim() || "Hôte";

    await client.query("BEGIN");
    let lobbyRow = null;
    let lastError = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateOnlineLobbyCode();
      const lobbyId = await onlineSafeId("online_lobbies", "id", "olb");
      try {
        const inserted = await client.query(`
          INSERT INTO online_lobbies (id, code, mode, max_players, host_user_id, host_nickname, settings, status, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'waiting',NOW(),NOW())
          ON CONFLICT (code) DO NOTHING
          RETURNING *
        `, [lobbyId, code, mode, maxPlayers, req.user.id, hostNickname, JSON.stringify(settings)]);
        lobbyRow = inserted.rows[0] || null;
        if (lobbyRow) break;
      } catch (error) {
        lastError = error;
        throw error;
      }
    }

    if (!lobbyRow) throw lastError || new Error("Impossible de créer un code salon unique");
    await onlineSafeUpsertLobbyPlayer(client, lobbyRow, req.user, { nickname: hostNickname, role: "player" });
    await client.query("COMMIT");

    const lobby = await onlineSafeLoadLobbyByCode(lobbyRow.code);
    onlineBroadcastLobby(lobby, "lobby:create");
    res.status(201).json({ ok: true, lobby, safe: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/lobbies/create-safe error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Erreur création salon",
      code: error.code || null,
      detail: error.detail || null,
      hint: error.hint || null,
      safe: true,
    });
  } finally {
    client.release();
  }
});

app.post("/online/lobbies/:code/join-safe", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureOnlineGameplaySafeSchema();
    const code = sanitizeLobbyCode(req.params.code || req.body?.code);
    if (!code) return res.status(400).json({ ok: false, error: "Code salon manquant" });

    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM online_lobbies WHERE code = $1 FOR UPDATE`, [code]);
    const lobbyRow = current.rows[0];
    if (!lobbyRow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Salon introuvable" });
    }
    if (String(lobbyRow.status || "waiting") === "closed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, error: "Salon fermé" });
    }

    await onlineSafeUpsertLobbyPlayer(client, lobbyRow, req.user, { nickname: req.body?.nickname, role: req.body?.role });
    await client.query(`UPDATE online_lobbies SET updated_at = NOW() WHERE code = $1`, [code]);
    await client.query("COMMIT");

    const lobby = await onlineSafeLoadLobbyByCode(code);
    onlineBroadcastLobby(lobby, "lobby:join");
    res.json({ ok: true, lobby, safe: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /online/lobbies/:code/join-safe error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur rejoindre salon", code: error.code || null, detail: error.detail || null, safe: true });
  } finally {
    client.release();
  }
});

app.post("/online/matches/start-safe", authRequired, async (req, res) => {
  try {
    await ensureOnlineGameplaySafeSchema();
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ ok: false, error: "lobbyCode manquant" });
    const lobby = await onlineSafeLoadLobbyByCode(code);
    if (!lobby) return res.status(404).json({ ok: false, error: "Salon introuvable" });
    const state = req.body?.initialState ?? {};
    const mode = sanitizeOnlineMode(state?.mode || state?.onlineMode || lobby.mode || "x01");
    const matchId = await onlineSafeId("online_matches", "id", "om");
    const result = await pool.query(`
      INSERT INTO online_matches (id, lobby_code, mode, status, state_json, owner_user, created_at, updated_at)
      VALUES ($1,$2,$3,'started',$4::jsonb,$5,NOW(),NOW())
      ON CONFLICT (lobby_code)
      DO UPDATE SET mode = EXCLUDED.mode, status = 'started', state_json = EXCLUDED.state_json, updated_at = NOW(), finished_at = NULL
      RETURNING *
    `, [matchId, code, mode, JSON.stringify({ ...state, mode, onlineMode: mode, lobbyCode: code }), req.user.id]);
    await pool.query(`UPDATE online_lobbies SET status = 'started', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]);
    res.status(201).json({ ok: true, match: mapOnlineMatchRow(result.rows[0]), safe: true });
  } catch (error) {
    console.error("POST /online/matches/start-safe error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur démarrage match online", code: error.code || null, detail: error.detail || null, safe: true });
  }
});

app.post("/online/matches/state-safe", authRequired, async (req, res) => {
  try {
    await ensureOnlineGameplaySafeSchema();
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ ok: false, error: "lobbyCode manquant" });
    const state = req.body?.state ?? {};
    const status = String(req.body?.status || "started") === "ended" ? "ended" : "started";
    const mode = sanitizeOnlineMode(state?.mode || state?.onlineMode || "x01");
    const previous = onlineCacheGet(onlineMatchCache, code) || {};
    const match = {
      id: previous.id || await onlineSafeId("online_matches", "id", "om"),
      lobby_code: code,
      lobbyCode: code,
      mode,
      status,
      state_json: { ...state, mode, onlineMode: mode, lobbyCode: code },
      state: { ...state, mode, onlineMode: mode, lobbyCode: code },
      owner_user: req.user.id,
      created_at: previous.created_at || nowIso(),
      updated_at: nowIso(),
      finished_at: status === "ended" ? nowIso() : null,
    };
    const mapped = onlineBroadcastMatch(match, status === "ended" ? "match:end" : "match:update");
    onlineScheduleMatchDbSave(mapped);
    res.json({ ok: true, match: mapped, safe: true, cache: true });
  } catch (error) {
    console.error("POST /online/matches/state-safe error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur état match online", code: error.code || null, detail: error.detail || null, safe: true });
  }
});

app.post("/online/matches/end-safe", authRequired, async (req, res) => {
  try {
    await ensureOnlineGameplaySafeSchema();
    const code = sanitizeLobbyCode(req.body?.lobbyCode || req.body?.lobby_code);
    if (!code) return res.status(400).json({ ok: false, error: "lobbyCode manquant" });
    const finalState = req.body?.finalState ?? {};
    const mode = sanitizeOnlineMode(finalState?.mode || finalState?.onlineMode || "x01");
    const previous = onlineCacheGet(onlineMatchCache, code) || {};
    const match = {
      id: previous.id || await onlineSafeId("online_matches", "id", "om"),
      lobby_code: code,
      lobbyCode: code,
      mode,
      status: "ended",
      state_json: { ...finalState, mode, onlineMode: mode, lobbyCode: code },
      state: { ...finalState, mode, onlineMode: mode, lobbyCode: code },
      owner_user: req.user.id,
      created_at: previous.created_at || nowIso(),
      updated_at: nowIso(),
      finished_at: nowIso(),
    };
    const mapped = onlineBroadcastMatch(match, "match:end");
    onlineScheduleMatchDbSave(mapped);
    await pool.query(`UPDATE online_lobbies SET status = 'closed', closed_at = COALESCE(closed_at, NOW()), updated_at = NOW() WHERE code = $1`, [code]).catch(() => {});
    res.json({ ok: true, match: mapped, safe: true, cache: true });
  } catch (error) {
    console.error("POST /online/matches/end-safe error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur fin match online", code: error.code || null, detail: error.detail || null, safe: true });
  }
});


// -----------------------------------------------------------------------------
// Online cleanup V12 — suppression définitive fiable des matchs tests/pourris.
// Ces routes correspondent aux appels du panneau développeur :
//   DELETE /online/matches/:id
//   POST   /online/matches/delete-safe | /online/matches/delete
//   DELETE /online/matches/by-code-safe/:code | /online/matches/by-code/:code
// Elles suppriment la source PostgreSQL + le cache mémoire realtime pour éviter
// que l'onglet ONLINE recharge aussitôt les sessions supprimées.
// -----------------------------------------------------------------------------
function normalizeOnlineDeleteIdentifiers(input = {}) {
  const out = [];
  const push = (value) => {
    const s = String(value || "").trim();
    if (!s || s === "undefined" || s === "null") return;
    if (!out.includes(s)) out.push(s);
  };
  push(input.id);
  push(input.matchId);
  push(input.match_id);
  push(input.onlineMatchId);
  push(input.sessionId);
  push(input.historyId);
  if (Array.isArray(input.ids)) input.ids.forEach(push);
  if (Array.isArray(input.matchIds)) input.matchIds.forEach(push);
  if (Array.isArray(input.keys)) input.keys.forEach(push);
  if (Array.isArray(input.identifiers)) input.identifiers.forEach(push);
  return out.slice(0, 80);
}

function normalizeOnlineDeleteCodes(input = {}) {
  const out = [];
  const push = (value) => {
    const code = sanitizeLobbyCode(value);
    if (!code || out.includes(code)) return;
    out.push(code);
  };
  push(input.code);
  push(input.lobbyCode);
  push(input.lobby_code);
  push(input.roomCode);
  push(input.roomId);
  if (Array.isArray(input.codes)) input.codes.forEach(push);
  if (Array.isArray(input.lobbyCodes)) input.lobbyCodes.forEach(push);
  return out.slice(0, 40);
}

async function canUserDeleteOnlineMatch(userId, matchRow) {
  const uid = String(userId || "").trim();
  if (!uid || !matchRow) return false;
  if (String(matchRow.owner_user || "") === uid) return true;
  const code = sanitizeLobbyCode(matchRow.lobby_code);
  if (!code) return false;
  const player = await pool.query(`
    SELECT id FROM online_lobby_players
    WHERE lobby_code = $1 AND user_id = $2
    LIMIT 1
  `, [code, uid]).catch(() => ({ rows: [] }));
  return !!player.rows?.[0];
}

async function deleteOnlineMatchesForUser(userId, opts = {}) {
  await ensureOnlineGameplaySafeSchema();

  const identifiers = normalizeOnlineDeleteIdentifiers(opts);
  const codes = normalizeOnlineDeleteCodes(opts);
  const rowsById = new Map();

  const safeRows = async (sql, params) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows || [];
    } catch (error) {
      console.warn("[online-cleanup] lookup ignored:", error?.message || error);
      return [];
    }
  };

  if (identifiers.length) {
    const directRows = await safeRows(`
      SELECT * FROM online_matches
      WHERE id = ANY($1::text[])
         OR lobby_code = ANY($1::text[])
         OR state_json->>'matchId' = ANY($1::text[])
         OR state_json->>'id' = ANY($1::text[])
         OR state_json->>'historyId' = ANY($1::text[])
         OR state_json->>'sessionId' = ANY($1::text[])
    `, [identifiers]);
    for (const row of directRows) rowsById.set(String(row.id), row);
  }

  if (codes.length) {
    const byCodeRows = await safeRows(`SELECT * FROM online_matches WHERE lobby_code = ANY($1::text[])`, [codes]);
    for (const row of byCodeRows) rowsById.set(String(row.id), row);
  }

  const allowed = [];
  for (const row of rowsById.values()) {
    if (await canUserDeleteOnlineMatch(userId, row).catch(() => false)) allowed.push(row);
  }

  const allowedIds = allowed.map((row) => String(row.id)).filter(Boolean);
  const allowedCodes = allowed.map((row) => sanitizeLobbyCode(row.lobby_code)).filter(Boolean);

  for (const code of codes) {
    const playerRows = await safeRows(`SELECT id FROM online_lobby_players WHERE lobby_code = $1 AND user_id = $2 LIMIT 1`, [code, userId]);
    const lobbyRows = await safeRows(`SELECT host_user_id FROM online_lobbies WHERE code = $1 LIMIT 1`, [code]);
    if (playerRows[0] || String(lobbyRows[0]?.host_user_id || "") === String(userId)) {
      if (!allowedCodes.includes(code)) allowedCodes.push(code);
    }
  }

  // Sécurité anti-500: un id local "online-..." peut ne pas exister côté NAS.
  // On renvoie un succès neutre au lieu de casser l'UI de nettoyage.
  if (!allowedIds.length && !allowedCodes.length) {
    return { ok: true, deleted: 0, deletedMatches: 0, deletedLobbies: 0, codes: [], ids: [], notFound: true };
  }

  const client = await pool.connect();
  const safeDelete = async (label, sql, params) => {
    try {
      const result = await client.query(sql, params);
      return Number(result.rowCount || 0);
    } catch (error) {
      console.warn(`[online-cleanup] ${label} ignored:`, error?.message || error);
      return 0;
    }
  };

  try {
    await client.query("BEGIN");

    let deletedMatches = 0;
    let deletedGenericMatches = 0;
    let deletedMessages = 0;
    let deletedPlayers = 0;
    let deletedLobbies = 0;

    if (allowedIds.length) {
      deletedMatches += await safeDelete("online_matches by ids", `DELETE FROM online_matches WHERE id = ANY($1::text[])`, [allowedIds]);
      deletedGenericMatches += await safeDelete("matches by ids", `
        DELETE FROM matches
        WHERE id = ANY($1::text[])
           OR result->>'onlineMatchId' = ANY($1::text[])
      `, [allowedIds]);
    }

    if (allowedCodes.length) {
      deletedMatches += await safeDelete("online_matches by codes", `DELETE FROM online_matches WHERE lobby_code = ANY($1::text[])`, [allowedCodes]);
      deletedGenericMatches += await safeDelete("matches by codes", `
        DELETE FROM matches
        WHERE result->>'lobbyCode' = ANY($1::text[])
           OR result->>'onlineLobbyCode' = ANY($1::text[])
           OR result->>'roomCode' = ANY($1::text[])
      `, [allowedCodes]);
      deletedMessages += await safeDelete("online_messages by codes", `DELETE FROM online_messages WHERE lobby_code = ANY($1::text[])`, [allowedCodes]);
      deletedPlayers += await safeDelete("online_lobby_players by codes", `DELETE FROM online_lobby_players WHERE lobby_code = ANY($1::text[])`, [allowedCodes]);
      deletedLobbies += await safeDelete("online_lobbies by codes", `DELETE FROM online_lobbies WHERE code = ANY($1::text[])`, [allowedCodes]);
    }

    await client.query("COMMIT");

    for (const code of allowedCodes) {
      try { onlineMatchCache.delete(code); } catch {}
      try { onlineLobbyCache.delete(code); } catch {}
      try { const timer = onlineSaveTimers.get(code); if (timer) clearTimeout(timer); onlineSaveTimers.delete(code); } catch {}
      try { onlineBroadcast(code, "match:delete", { deleted: true, lobbyCode: code }); } catch {}
    }

    return {
      ok: true,
      deleted: deletedMatches + deletedGenericMatches + deletedMessages + deletedPlayers + deletedLobbies,
      deletedMatches,
      deletedGenericMatches,
      deletedMessages,
      deletedPlayers,
      deletedLobbies,
      codes: allowedCodes,
      ids: allowedIds,
      notFound: false,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function handleOnlineMatchHardDelete(req, res) {
  try {
    const payload = { ...(req.body || {}), id: req.params?.id || req.body?.id, code: req.params?.code || req.body?.code };
    const result = await deleteOnlineMatchesForUser(req.user.id, payload);
    if (result.notFound) return res.json({ ok: true, error: null, ...result, safe: true });
    res.json({ ...result, safe: true });
  } catch (error) {
    console.error("DELETE online match cleanup error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression match online", code: error.code || null, detail: error.detail || null, safe: true });
  }
}

app.delete(["/online/matches/by-code-safe/:code", "/online/matches/by-code/:code"], authRequired, handleOnlineMatchHardDelete);
app.delete("/online/matches/:id", authRequired, handleOnlineMatchHardDelete);
app.post(["/online/matches/delete-safe", "/online/matches/delete"], authRequired, handleOnlineMatchHardDelete);

// Legacy NAS endpoints conservés pour compat scripts/outils existants
app.get("/profiles", async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, COALESCE(display_name, name) AS name, COALESCE(avatar_url, avatar, avatar_data_url) AS avatar, created_at FROM profiles ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /profiles error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/profiles/:id", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM profiles WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Profile not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /profiles/:id error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/profiles", async (req, res) => {
  try {
    const { id, name, avatar = null } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: "id and name are required" });
    const result = await pool.query(`
      INSERT INTO profiles (id, user_id, name, display_name, avatar, avatar_url, avatar_data_url, created_at, updated_at)
      VALUES ($1,$1,$2,$2,$3,$3,$3,NOW(),NOW())
      ON CONFLICT (id)
      DO UPDATE SET name = EXCLUDED.name, display_name = EXCLUDED.display_name, avatar = EXCLUDED.avatar, avatar_url = EXCLUDED.avatar_url, avatar_data_url = EXCLUDED.avatar_data_url, updated_at = NOW()
      RETURNING *
    `, [id, name, avatar]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /profiles error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/profiles/:id", async (req, res) => {
  try {
    const { name, avatar = null } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = await pool.query(`
      UPDATE profiles
      SET name = $2, display_name = $2, avatar = $3, avatar_url = $3, avatar_data_url = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id, name, avatar]);
    if (!result.rows.length) return res.status(404).json({ error: "Profile not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /profiles/:id error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/matches", async (req, res) => {
  try {
    const sport = req.query.sport || null;
    const result = sport
      ? await pool.query(`SELECT id, sport, players, result, created_at FROM matches WHERE sport = $1 ORDER BY created_at DESC`, [sport])
      : await pool.query(`SELECT id, sport, players, result, created_at FROM matches ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /matches error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/matches", async (req, res) => {
  try {
    const { id, sport, players = [], result = {}, ownerUserId = null } = req.body || {};
    if (!id || !sport) return res.status(400).json({ error: "id and sport are required" });
    const resultDb = await pool.query(`
      INSERT INTO matches (id, owner_user_id, sport, players, result, created_at)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, sport = EXCLUDED.sport, players = EXCLUDED.players, result = EXCLUDED.result
      RETURNING id, sport, players, result, created_at
    `, [id, ownerUserId, sport, JSON.stringify(players), JSON.stringify(result)]);
    res.status(201).json(resultDb.rows[0]);
  } catch (error) {
    console.error("POST /matches error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(`SELECT profile_id, sport, data, updated_at FROM stats ORDER BY updated_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error("GET /stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/stats/:profileId/:sport", async (req, res) => {
  try {
    const { profileId, sport } = req.params;
    const result = await pool.query(`SELECT profile_id, sport, data, updated_at FROM stats WHERE profile_id = $1 AND sport = $2 LIMIT 1`, [profileId, sport]);
    if (!result.rows.length) return res.status(404).json({ error: "Stats not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /stats/:profileId/:sport error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/stats/:profileId/:sport", async (req, res) => {
  try {
    const { profileId, sport } = req.params;
    const data = req.body || {};
    const result = await pool.query(`
      INSERT INTO stats (profile_id, sport, data, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (profile_id, sport)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      RETURNING profile_id, sport, data, updated_at
    `, [profileId, sport, JSON.stringify(data)]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /stats/:profileId/:sport error:", error);
    res.status(500).json({ error: error.message });
  }
});


// -----------------------------------------------------------------------------
// Legacy backup endpoints compatibilité front actuel
// -----------------------------------------------------------------------------
app.post("/backup/full", async (req, res) => {
  try {
    const ownerId = await resolveBackupOwnerId(req);
    if (!ownerId) {
      return res.status(400).json({ error: "ownerId manquant pour le backup NAS" });
    }

    const payload = req.body?.payload ?? null;
    if (!payload) {
      return res.status(400).json({ error: "payload manquant pour le backup NAS" });
    }

    const version = Number(req.body?.version || 2);
    const saved = await saveUserStoreSnapshot(ownerId, payload, version, String(req.body?.reason || "legacy-backup-full"));

    res.json({
      ok: true,
      id: String(req.body?.id || `main:${ownerId}`),
      ownerId,
      version,
      updatedAt: nowIso(),
      slotId: saved?.slotId || null,
    });
  } catch (error) {
    console.error("POST /backup/full error:", error);
    res.status(500).json({ error: error.message || "Erreur backup full" });
  }
});

app.get("/backup/full/latest", async (req, res) => {
  try {
    const ownerId = await resolveBackupOwnerId(req);
    if (!ownerId) {
      return res.status(400).json({ error: "ownerId manquant pour restore backup NAS" });
    }

    const row = await loadUserStoreSnapshot(ownerId);
    if (!row) {
      return res.status(404).json({ error: "Aucun backup NAS disponible" });
    }

    res.json({
      ok: true,
      id: `main:${ownerId}`,
      ownerId,
      payload: row.payload ?? row.data ?? null,
      version: row.version,
      createdAt: row.updated_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error("GET /backup/full/latest error:", error);
    res.status(500).json({ error: error.message || "Erreur restore backup" });
  }
});

app.get("/backup/list", async (req, res) => {
  try {
    const ownerId = await resolveBackupOwnerId(req);
    if (!ownerId) return res.json([]);

    const row = await loadUserStoreSnapshot(ownerId);
    if (!row) return res.json([]);

    res.json([
      {
        id: `main:${ownerId}`,
        ownerId,
        version: row.version,
        createdAt: row.updated_at,
        updatedAt: row.updated_at,
      },
    ]);
  } catch (error) {
    console.error("GET /backup/list error:", error);
    res.status(500).json({ error: error.message || "Erreur backup list" });
  }
});

app.post("/backup/deleteAll", async (req, res) => {
  try {
    const ownerId = await resolveBackupOwnerId(req);
    if (!ownerId) {
      return res.status(400).json({ error: "ownerId manquant pour suppression backup NAS" });
    }

    const result = await pool.query(`DELETE FROM user_store WHERE user_id = $1 AND store = 'main'`, [ownerId]);
    res.json({ ok: true, ownerId, deleted: Number(result.rowCount || 0) });
  } catch (error) {
    console.error("POST /backup/deleteAll error:", error);
    res.status(500).json({ error: error.message || "Erreur suppression backup NAS" });
  }
});



// -----------------------------------------------------------------------------
// Baby-Foot Ligues ONLINE V1 — public/private, résultats, forum, commentaires.
// Additif : ne remplace pas les ligues locales, ajoute une couche NAS.
// -----------------------------------------------------------------------------
function sanitizeBabyFootLeagueVisibility(value) {
  const raw = String(value || "private").trim().toLowerCase();
  return raw === "public" ? "public" : "private";
}

function sanitizeBabyFootLeagueKind(value) {
  return String(value || "season").trim().toLowerCase() === "infinite" ? "infinite" : "season";
}

function sanitizeBabyFootLeagueScope(value) {
  return String(value || "solo").trim().toLowerCase() === "team" ? "team" : "solo";
}

function sanitizeBabyFootLeagueFormat(value) {
  return String(value || "single").trim().toLowerCase() === "double" ? "double" : "single";
}

function makeBabyFootLeagueShareCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 7; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function ensureBabyFootLeagueOnlineSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS babyfoot_leagues (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'season',
      scope TEXT NOT NULL DEFAULT 'solo',
      format TEXT NOT NULL DEFAULT 'single',
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'active',
      share_code TEXT UNIQUE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS owner_user_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS share_code TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_leagues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_leagues_share_code ON babyfoot_leagues(share_code);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_leagues_owner_updated ON babyfoot_leagues(owner_user_id, updated_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_leagues_public_updated ON babyfoot_leagues(visibility, status, updated_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS babyfoot_league_members (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      participant_id TEXT,
      role TEXT NOT NULL DEFAULT 'player',
      display_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_league_members_league_user ON babyfoot_league_members(league_id, user_id) WHERE user_id IS NOT NULL;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_league_members_user ON babyfoot_league_members(user_id);`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS participant_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS participant_avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS local_ref_id TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS display_name TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE babyfoot_league_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`).catch(() => {});

  await pool.query(`
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
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_babyfoot_league_fixtures_local ON babyfoot_league_fixtures(league_id, local_fixture_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_league_fixtures_status ON babyfoot_league_fixtures(league_id, status, round);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS babyfoot_league_match_comments (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
      fixture_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      nickname TEXT,
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_league_comments_match ON babyfoot_league_match_comments(league_id, fixture_id, created_at ASC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS babyfoot_league_forum_threads (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      nickname TEXT,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_league_threads ON babyfoot_league_forum_threads(league_id, updated_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS babyfoot_league_forum_posts (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES babyfoot_league_forum_threads(id) ON DELETE CASCADE,
      league_id TEXT NOT NULL REFERENCES babyfoot_leagues(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      nickname TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_babyfoot_league_posts ON babyfoot_league_forum_posts(thread_id, created_at ASC);`).catch(() => {});
}

async function resolveOptionalUser(req) {
  return await resolveUserFromAuthorizationHeader(req).catch(() => null);
}

function clonePlain(value) {
  try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return value ?? null; }
}

function extractBabyFootLeaguePayload(body) {
  const source = body?.league && typeof body.league === "object" ? body.league : body;
  const payload = clonePlain(source || {});
  payload.id = String(payload.id || uid("bfl_local"));
  payload.name = String(payload.name || "Ligue Baby-Foot").trim() || "Ligue Baby-Foot";
  payload.kind = sanitizeBabyFootLeagueKind(payload.kind);
  payload.scope = sanitizeBabyFootLeagueScope(payload.scope);
  payload.format = sanitizeBabyFootLeagueFormat(payload.format);
  payload.participants = Array.isArray(payload.participants) ? payload.participants : [];
  payload.fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : [];
  return payload;
}

function mapBabyFootLeagueOnlineRow(row) {
  if (!row) return null;
  const payload = clonePlain(row.payload || {});
  payload.onlineId = row.id;
  payload.visibility = row.visibility || "private";
  payload.shareCode = row.share_code || null;
  payload.ownerUserId = row.owner_user_id || null;
  payload.onlineStatus = row.status || "active";
  payload.onlineUpdatedAt = row.updated_at || null;
  payload.onlineCreatedAt = row.created_at || null;
  payload.online = {
    id: row.id,
    visibility: row.visibility || "private",
    shareCode: row.share_code || null,
    ownerUserId: row.owner_user_id || null,
    status: row.status || "active",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
  return payload;
}

async function loadBabyFootLeagueOnlineRow(leagueIdOrCode) {
  const key = String(leagueIdOrCode || "").trim();
  if (!key) return null;
  const result = await pool.query(`
    SELECT *
    FROM babyfoot_leagues
    WHERE deleted_at IS NULL
      AND (id = $1 OR share_code = UPPER($1))
    LIMIT 1
  `, [key]);
  return result.rows[0] || null;
}

async function isBabyFootLeagueMember(leagueId, userId) {
  if (!leagueId || !userId) return false;
  const result = await pool.query(`SELECT id FROM babyfoot_league_members WHERE league_id = $1 AND user_id = $2 LIMIT 1`, [leagueId, userId]);
  return !!result.rows[0];
}

async function canReadBabyFootLeague(row, user) {
  if (!row) return false;
  if (String(row.visibility || "") === "public") return true;
  if (user?.id && String(row.owner_user_id || "") === String(user.id)) return true;
  if (user?.id && await isBabyFootLeagueMember(row.id, user.id)) return true;
  return false;
}

async function canWriteBabyFootLeague(row, user) {
  if (!row || !user?.id) return false;
  if (String(row.owner_user_id || "") === String(user.id)) return true;
  if (await isBabyFootLeagueMember(row.id, user.id)) return true;
  return false;
}

function applyBabyFootLeagueResult(payload, body) {
  const fixtureId = String(body?.fixtureId || body?.fixture_id || "").trim();
  const homeId = String(body?.homeId || body?.home_id || "").trim();
  const awayId = String(body?.awayId || body?.away_id || "").trim();
  const scoreHome = Math.max(0, Math.floor(Number(body?.scoreHome ?? body?.score_home ?? 0) || 0));
  const scoreAway = Math.max(0, Math.floor(Number(body?.scoreAway ?? body?.score_away ?? 0) || 0));
  const playedAt = Number(body?.playedAt || body?.played_at || Date.now()) || Date.now();
  const stats = body?.stats && typeof body.stats === "object" ? body.stats : null;
  const comments = Array.isArray(body?.comments) ? body.comments : [];
  payload.fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : [];
  let fixture = fixtureId ? payload.fixtures.find((f) => String(f?.id) === fixtureId) : null;
  if (!fixture) {
    fixture = {
      id: fixtureId || uid("bflfx"),
      leagueId: String(payload.id || ""),
      round: Math.max(1, Number(body?.round || payload.fixtures.length + 1) || 1),
      homeId,
      awayId,
      scoreHome: null,
      scoreAway: null,
      playedAt: null,
      source: body?.source === "calendar" ? "calendar" : "manual",
    };
    payload.fixtures.unshift(fixture);
  }
  if (homeId) fixture.homeId = homeId;
  if (awayId) fixture.awayId = awayId;
  fixture.scoreHome = scoreHome;
  fixture.scoreAway = scoreAway;
  fixture.playedAt = playedAt;
  fixture.source = fixture.source || (body?.source === "calendar" ? "calendar" : "manual");
  if (stats) fixture.stats = stats;
  if (comments.length) fixture.comments = comments;
  payload.updatedAt = Date.now();
  return fixture;
}

async function upsertBabyFootLeagueOwnerMember(client, leagueId, userRow) {
  if (!userRow?.id) return;
  const profile = await loadProfileByUserId(userRow.id).catch(() => null);
  const displayName = String(profile?.display_name || profile?.name || userRow.nickname || "Joueur").trim() || "Joueur";
  await client.query(`
    INSERT INTO babyfoot_league_members (id, league_id, user_id, participant_id, role, display_name, avatar_url, created_at, updated_at)
    VALUES ($1,$2,$3,NULL,'owner',$4,$5,NOW(),NOW())
    ON CONFLICT (league_id, user_id)
    DO UPDATE SET role = 'owner', display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
  `, [uid("bflm"), leagueId, userRow.id, displayName, profile?.avatar_url || profile?.avatar || null]);
}

app.get("/babyfoot/leagues/public", async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const result = await pool.query(`
      SELECT *
      FROM babyfoot_leagues
      WHERE deleted_at IS NULL AND status = 'active' AND visibility = 'public'
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]);
    res.json({ ok: true, leagues: result.rows.map(mapBabyFootLeagueOnlineRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /babyfoot/leagues/public error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur liste ligues publiques" });
  }
});

app.get("/babyfoot/leagues", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const result = await pool.query(`
      SELECT DISTINCT l.*
      FROM babyfoot_leagues l
      LEFT JOIN babyfoot_league_members m ON m.league_id = l.id
      WHERE l.deleted_at IS NULL
        AND (l.owner_user_id = $1 OR m.user_id = $1 OR l.visibility = 'public')
      ORDER BY l.updated_at DESC
      LIMIT 120
    `, [req.user.id]);
    res.json({ ok: true, leagues: result.rows.map(mapBabyFootLeagueOnlineRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /babyfoot/leagues error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur liste ligues online" });
  }
});

app.get("/babyfoot/leagues/:id", async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const user = await resolveOptionalUser(req);
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canReadBabyFootLeague(row, user))) return res.status(403).json({ ok: false, error: "Ligue privée" });
    res.json({ ok: true, league: mapBabyFootLeagueOnlineRow(row) });
  } catch (error) {
    console.error("GET /babyfoot/leagues/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture ligue" });
  }
});

app.post("/babyfoot/leagues", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const payload = extractBabyFootLeaguePayload(req.body || {});
    const visibility = sanitizeBabyFootLeagueVisibility(req.body?.visibility ?? payload.visibility);
    const leagueId = uid("bflon");
    let shareCode = "";
    for (let i = 0; i < 8 && !shareCode; i += 1) {
      const candidate = makeBabyFootLeagueShareCode();
      const clash = await client.query(`SELECT id FROM babyfoot_leagues WHERE share_code = $1 LIMIT 1`, [candidate]);
      if (!clash.rows[0]) shareCode = candidate;
    }
    if (!shareCode) shareCode = makeBabyFootLeagueShareCode();
    payload.onlineId = leagueId;
    payload.visibility = visibility;
    payload.shareCode = shareCode;
    await client.query("BEGIN");
    const inserted = await client.query(`
      INSERT INTO babyfoot_leagues (id, owner_user_id, name, kind, scope, format, visibility, status, share_code, payload, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9::jsonb,NOW(),NOW())
      RETURNING *
    `, [leagueId, req.user.id, payload.name, payload.kind, payload.scope, payload.format, visibility, shareCode, JSON.stringify(payload)]);
    await upsertBabyFootLeagueOwnerMember(client, leagueId, req.user);
    await client.query("COMMIT");
    res.status(201).json({ ok: true, league: mapBabyFootLeagueOnlineRow(inserted.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /babyfoot/leagues error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur création ligue online" });
  } finally {
    client.release();
  }
});

app.put("/babyfoot/leagues/:id", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (String(row.owner_user_id || "") !== String(req.user.id)) return res.status(403).json({ ok: false, error: "Seul le créateur peut modifier la ligue" });
    const payload = extractBabyFootLeaguePayload(req.body || {});
    const visibility = sanitizeBabyFootLeagueVisibility(req.body?.visibility ?? payload.visibility ?? row.visibility);
    payload.onlineId = row.id;
    payload.shareCode = row.share_code || null;
    payload.visibility = visibility;
    const updated = await pool.query(`
      UPDATE babyfoot_leagues
      SET name = $2,
          kind = $3,
          scope = $4,
          format = $5,
          visibility = $6,
          payload = $7::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [row.id, payload.name, payload.kind, payload.scope, payload.format, visibility, JSON.stringify(payload)]);
    res.json({ ok: true, league: mapBabyFootLeagueOnlineRow(updated.rows[0]) });
  } catch (error) {
    console.error("PUT /babyfoot/leagues/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur mise à jour ligue online" });
  }
});

app.delete("/babyfoot/leagues/:id", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (String(row.owner_user_id || "") !== String(req.user.id)) return res.status(403).json({ ok: false, error: "Seul le créateur peut supprimer la ligue" });
    await pool.query(`UPDATE babyfoot_leagues SET status = 'deleted', deleted_at = NOW(), updated_at = NOW() WHERE id = $1`, [row.id]);
    res.json({ ok: true, deleted: 1 });
  } catch (error) {
    console.error("DELETE /babyfoot/leagues/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression ligue online" });
  }
});

app.post("/babyfoot/leagues/:id/join", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (row.visibility !== "public" && String(row.share_code || "") !== String(req.body?.shareCode || req.query?.shareCode || "").trim().toUpperCase()) {
      return res.status(403).json({ ok: false, error: "Code ligue requis" });
    }
    await client.query("BEGIN");
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const displayName = String(profile?.display_name || profile?.name || req.user.nickname || "Joueur").trim() || "Joueur";
    const participantId = req.body?.participantId == null ? null : String(req.body.participantId);
    const inserted = await client.query(`
      INSERT INTO babyfoot_league_members (id, league_id, user_id, participant_id, role, display_name, avatar_url, created_at, updated_at)
      VALUES ($1,$2,$3,$4,'player',$5,$6,NOW(),NOW())
      ON CONFLICT (league_id, user_id)
      DO UPDATE SET participant_id = COALESCE(EXCLUDED.participant_id, babyfoot_league_members.participant_id),
                    display_name = EXCLUDED.display_name,
                    avatar_url = EXCLUDED.avatar_url,
                    updated_at = NOW()
      RETURNING *
    `, [uid("bflm"), row.id, req.user.id, participantId, displayName, profile?.avatar_url || profile?.avatar || null]);
    await client.query("COMMIT");
    res.json({ ok: true, member: inserted.rows[0], league: mapBabyFootLeagueOnlineRow(row) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /babyfoot/leagues/:id/join error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur rejoindre ligue" });
  } finally {
    client.release();
  }
});

app.post("/babyfoot/leagues/:id/results", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canWriteBabyFootLeague(row, req.user)) && row.visibility !== "public") return res.status(403).json({ ok: false, error: "Tu n’es pas membre de cette ligue" });
    const payload = clonePlain(row.payload || {});
    const fixture = applyBabyFootLeagueResult(payload, req.body || {});
    const updated = await pool.query(`
      UPDATE babyfoot_leagues
      SET payload = $2::jsonb, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [row.id, JSON.stringify(payload)]);
    res.json({ ok: true, fixture, league: mapBabyFootLeagueOnlineRow(updated.rows[0]) });
  } catch (error) {
    console.error("POST /babyfoot/leagues/:id/results error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur enregistrement résultat" });
  }
});


app.post("/babyfoot/leagues/:id/fixtures/:fixtureId/lobby", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canWriteBabyFootLeague(row, req.user)) && row.visibility !== "public") {
      return res.status(403).json({ ok: false, error: "Tu n’es pas membre de cette ligue" });
    }

    const payload = clonePlain(row.payload || {});
    const fixtureId = String(req.params.fixtureId || "").trim();
    const fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : [];
    const fixture = fixtures.find((f) => String(f?.id || f?.localFixtureId || "") === fixtureId) || null;
    if (!fixture) return res.status(404).json({ ok: false, error: "Match de ligue introuvable" });
    if (fixture.playedAt || fixture.scoreHome != null || fixture.scoreAway != null) {
      return res.status(409).json({ ok: false, error: "Ce match est déjà joué" });
    }

    const homeId = String(fixture.homeId || fixture.homeParticipantId || "");
    const awayId = String(fixture.awayId || fixture.awayParticipantId || "");
    const participants = Array.isArray(payload.participants) ? payload.participants : [];
    const home = participants.find((p) => String(p?.id || "") === homeId) || null;
    const away = participants.find((p) => String(p?.id || "") === awayId) || null;
    const maxPlayers = 2;
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const hostNickname = String(profile?.display_name || profile?.name || req.user.nickname || "Hôte").trim() || "Hôte";

    await client.query("BEGIN");
    let existingFixture = await client.query(
      `SELECT * FROM babyfoot_league_fixtures WHERE league_id = $1 AND local_fixture_id = $2 FOR UPDATE`,
      [row.id, fixtureId]
    );
    let lobbyCode = String(existingFixture.rows[0]?.lobby_code || fixture.lobbyCode || "").trim().toUpperCase();
    let lobbyRow = null;

    if (lobbyCode) {
      const currentLobby = await client.query(`SELECT * FROM online_lobbies WHERE code = $1 LIMIT 1`, [lobbyCode]);
      lobbyRow = currentLobby.rows[0] || null;
    }

    if (!lobbyRow) {
      for (let attempt = 0; attempt < 10 && !lobbyRow; attempt += 1) {
        const code = generateOnlineLobbyCode();
        const lobbyId = await onlineSafeId("online_lobbies", "id", "olb");
        const settings = {
          mode: "babyfoot",
          onlineMode: "babyfoot",
          source: "babyfoot_league",
          leagueId: row.id,
          localLeagueId: String(payload.id || ""),
          fixtureId,
          homeParticipantId: homeId,
          awayParticipantId: awayId,
          homeName: home?.name || fixture.homeName || "Équipe A",
          awayName: away?.name || fixture.awayName || "Équipe B",
          target: Number(payload.target || 10) || 10,
          rulesPreset: "competition",
        };
        const inserted = await client.query(`
          INSERT INTO online_lobbies (id, code, mode, max_players, host_user_id, host_nickname, settings, status, created_at, updated_at)
          VALUES ($1,$2,'babyfoot',$3,$4,$5,$6::jsonb,'waiting',NOW(),NOW())
          ON CONFLICT (code) DO NOTHING
          RETURNING *
        `, [lobbyId, code, maxPlayers, req.user.id, hostNickname, JSON.stringify(settings)]);
        lobbyRow = inserted.rows[0] || null;
      }
      if (!lobbyRow) throw new Error("Impossible de créer un salon Baby-Foot");
      lobbyCode = String(lobbyRow.code || "").toUpperCase();
      await onlineSafeUpsertLobbyPlayer(client, lobbyRow, req.user, { nickname: hostNickname, role: "player" });
    }

    await client.query(`
      INSERT INTO babyfoot_league_fixtures (id, league_id, local_fixture_id, round, home_participant_id, away_participant_id, source, status, lobby_code, stats, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'calendar','scheduled',$7,'{}'::jsonb,NOW(),NOW())
      ON CONFLICT (league_id, local_fixture_id)
      DO UPDATE SET lobby_code = EXCLUDED.lobby_code,
                    status = CASE WHEN babyfoot_league_fixtures.status = 'played' THEN babyfoot_league_fixtures.status ELSE 'scheduled' END,
                    updated_at = NOW()
    `, [uid("bflf"), row.id, fixtureId, Math.max(1, Number(fixture.round || 1) || 1), homeId || null, awayId || null, lobbyCode]);

    payload.fixtures = fixtures.map((f) => String(f?.id || f?.localFixtureId || "") === fixtureId ? { ...f, lobbyCode, onlineLobbyCode: lobbyCode } : f);
    payload.updatedAt = Date.now();
    const updatedLeague = await client.query(`UPDATE babyfoot_leagues SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`, [row.id, JSON.stringify(payload)]);
    await client.query("COMMIT");

    const lobby = await onlineSafeLoadLobbyByCode(lobbyCode).catch(() => null);
    onlineBroadcastLobby(lobby || mapOnlineLobbyRow(lobbyRow, []), "lobby:create");
    res.status(201).json({ ok: true, lobbyCode, lobby: lobby || mapOnlineLobbyRow(lobbyRow, []), league: mapBabyFootLeagueOnlineRow(updatedLeague.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /babyfoot/leagues/:id/fixtures/:fixtureId/lobby error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur salon ligue Baby-Foot" });
  } finally {
    client.release();
  }
});

app.get("/babyfoot/leagues/:id/matches/:fixtureId/comments", async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const user = await resolveOptionalUser(req);
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canReadBabyFootLeague(row, user))) return res.status(403).json({ ok: false, error: "Ligue privée" });
    const result = await pool.query(`
      SELECT *
      FROM babyfoot_league_match_comments
      WHERE league_id = $1 AND fixture_id = $2
      ORDER BY created_at ASC
      LIMIT 200
    `, [row.id, String(req.params.fixtureId || "")]);
    res.json({ ok: true, comments: result.rows });
  } catch (error) {
    console.error("GET /babyfoot/leagues/:id/matches/:fixtureId/comments error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture commentaires" });
  }
});

app.post("/babyfoot/leagues/:id/matches/:fixtureId/comments", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canWriteBabyFootLeague(row, req.user)) && row.visibility !== "public") return res.status(403).json({ ok: false, error: "Tu n’es pas membre de cette ligue" });
    const comment = String(req.body?.comment || req.body?.message || "").trim().slice(0, 1200);
    if (!comment) return res.status(400).json({ ok: false, error: "Commentaire vide" });
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const nickname = String(profile?.display_name || profile?.name || req.user.nickname || "Joueur").trim();
    const inserted = await pool.query(`
      INSERT INTO babyfoot_league_match_comments (id, league_id, fixture_id, user_id, nickname, comment, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
    `, [uid("bflc"), row.id, String(req.params.fixtureId || ""), req.user.id, nickname, comment]);
    res.status(201).json({ ok: true, comment: inserted.rows[0] });
  } catch (error) {
    console.error("POST /babyfoot/leagues/:id/matches/:fixtureId/comments error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur commentaire match" });
  }
});

app.get("/babyfoot/leagues/:id/forum", async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const user = await resolveOptionalUser(req);
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canReadBabyFootLeague(row, user))) return res.status(403).json({ ok: false, error: "Ligue privée" });
    const result = await pool.query(`
      SELECT t.*,
        COALESCE((SELECT COUNT(*)::int FROM babyfoot_league_forum_posts p WHERE p.thread_id = t.id), 0) AS posts_count
      FROM babyfoot_league_forum_threads t
      WHERE t.league_id = $1
      ORDER BY t.updated_at DESC
      LIMIT 100
    `, [row.id]);
    res.json({ ok: true, threads: result.rows });
  } catch (error) {
    console.error("GET /babyfoot/leagues/:id/forum error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur forum ligue" });
  }
});

app.post("/babyfoot/leagues/:id/forum", authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canWriteBabyFootLeague(row, req.user)) && row.visibility !== "public") return res.status(403).json({ ok: false, error: "Tu n’es pas membre de cette ligue" });
    const title = String(req.body?.title || "").trim().slice(0, 160) || "Discussion";
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    if (!message) return res.status(400).json({ ok: false, error: "Message vide" });
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const nickname = String(profile?.display_name || profile?.name || req.user.nickname || "Joueur").trim();
    const threadId = uid("bflth");
    await client.query("BEGIN");
    const thread = await client.query(`
      INSERT INTO babyfoot_league_forum_threads (id, league_id, user_id, nickname, title, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      RETURNING *
    `, [threadId, row.id, req.user.id, nickname, title]);
    const post = await client.query(`
      INSERT INTO babyfoot_league_forum_posts (id, thread_id, league_id, user_id, nickname, message, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
    `, [uid("bflp"), threadId, row.id, req.user.id, nickname, message]);
    await client.query("COMMIT");
    res.status(201).json({ ok: true, thread: thread.rows[0], post: post.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /babyfoot/leagues/:id/forum error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur création sujet forum" });
  } finally {
    client.release();
  }
});

app.get("/babyfoot/leagues/:id/forum/:threadId", async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const user = await resolveOptionalUser(req);
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canReadBabyFootLeague(row, user))) return res.status(403).json({ ok: false, error: "Ligue privée" });
    const posts = await pool.query(`
      SELECT *
      FROM babyfoot_league_forum_posts
      WHERE league_id = $1 AND thread_id = $2
      ORDER BY created_at ASC
      LIMIT 300
    `, [row.id, String(req.params.threadId || "")]);
    res.json({ ok: true, posts: posts.rows });
  } catch (error) {
    console.error("GET /babyfoot/leagues/:id/forum/:threadId error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture sujet forum" });
  }
});

app.post("/babyfoot/leagues/:id/forum/:threadId", authRequired, async (req, res) => {
  try {
    await ensureBabyFootLeagueOnlineSchema();
    const row = await loadBabyFootLeagueOnlineRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Ligue introuvable" });
    if (!(await canWriteBabyFootLeague(row, req.user)) && row.visibility !== "public") return res.status(403).json({ ok: false, error: "Tu n’es pas membre de cette ligue" });
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    if (!message) return res.status(400).json({ ok: false, error: "Message vide" });
    const profile = await loadProfileByUserId(req.user.id).catch(() => null);
    const nickname = String(profile?.display_name || profile?.name || req.user.nickname || "Joueur").trim();
    const inserted = await pool.query(`
      INSERT INTO babyfoot_league_forum_posts (id, thread_id, league_id, user_id, nickname, message, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
    `, [uid("bflp"), String(req.params.threadId || ""), row.id, req.user.id, nickname, message]);
    await pool.query(`UPDATE babyfoot_league_forum_threads SET updated_at = NOW() WHERE id = $1 AND league_id = $2`, [String(req.params.threadId || ""), row.id]).catch(() => {});
    res.status(201).json({ ok: true, post: inserted.rows[0] });
  } catch (error) {
    console.error("POST /babyfoot/leagues/:id/forum/:threadId error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur message forum" });
  }
});


// -----------------------------------------------------------------------------
// VIEWER TABLETTE LIVE — NAS fallback stable
// -----------------------------------------------------------------------------
// Le Viewer ne doit pas dépendre de Cloudflare Pages KV pour fonctionner.
// Ces routes publiques ne stockent qu'un mini snapshot temporaire de partie :
// aucun store global, aucun avatar base64 lourd, aucune donnée de compte.
const VIEWER_LIVE_TTL_MS = Math.max(60_000, Number(process.env.VIEWER_LIVE_TTL_MS || 1000 * 60 * 60 * 8));
const viewerLiveSessions = new Map();
const viewerLiveSnapshots = new Map();

function viewerCleanCode(input) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);
}

function viewerRandomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function viewerNow() {
  return Date.now();
}

function viewerSessionExpired(meta) {
  if (!meta) return true;
  return Number(meta.expiresAt || 0) > 0 && Number(meta.expiresAt || 0) < viewerNow();
}

function viewerCleanupExpired() {
  const now = viewerNow();
  for (const [sessionId, meta] of viewerLiveSessions.entries()) {
    if (Number(meta?.expiresAt || 0) > 0 && Number(meta.expiresAt) < now) {
      viewerLiveSessions.delete(sessionId);
      viewerLiveSnapshots.delete(sessionId);
    }
  }
}

function viewerBuildJoinUrl(req, sessionId) {
  const publicApp = String(process.env.PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  const origin = String(req.headers.origin || "").trim().replace(/\/+$/, "");
  const fallback = "https://darts-counter-v7.pages.dev";
  const base = publicApp || origin || fallback;
  return `${base}/#/viewer/${encodeURIComponent(sessionId)}`;
}

function viewerWaitingSnapshot(sessionId) {
  return {
    v: 1,
    sessionId,
    updatedAt: viewerNow(),
    sport: "darts",
    game: "unknown",
    phase: "lobby",
    title: "Multisports Scoring",
    screen: "waiting",
    activePlayerId: null,
    players: [],
    meta: { text: "En attente du lancement de la partie" },
    source: "viewer-nas",
  };
}

function viewerGetSession(sessionId) {
  const sid = viewerCleanCode(sessionId);
  if (!sid) return null;
  const meta = viewerLiveSessions.get(sid) || null;
  if (!meta) return null;
  if (viewerSessionExpired(meta)) {
    viewerLiveSessions.delete(sid);
    viewerLiveSnapshots.delete(sid);
    return null;
  }
  return meta;
}

async function handleViewerCreateSession(req, res) {
  try {
    viewerCleanupExpired();
    let sessionId = "";
    for (let i = 0; i < 12; i += 1) {
      const candidate = viewerRandomCode(6);
      if (!viewerLiveSessions.has(candidate)) {
        sessionId = candidate;
        break;
      }
    }
    if (!sessionId) return res.status(500).json({ ok: false, error: "viewer_session_create_failed" });

    const now = viewerNow();
    const meta = {
      ok: true,
      sessionId,
      code: sessionId,
      status: "active",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      expiresAt: now + VIEWER_LIVE_TTL_MS,
      rev: 0,
    };
    viewerLiveSessions.set(sessionId, meta);
    viewerLiveSnapshots.set(sessionId, viewerWaitingSnapshot(sessionId));

    return res.status(201).json({
      ok: true,
      sessionId,
      code: sessionId,
      expiresInSeconds: Math.floor(VIEWER_LIVE_TTL_MS / 1000),
      joinUrl: viewerBuildJoinUrl(req, sessionId),
      provider: "nas-memory",
    });
  } catch (error) {
    console.error("POST /viewer/session error:", error);
    return res.status(500).json({ ok: false, error: error.message || "Erreur création session viewer" });
  }
}

async function handleViewerGetSnapshot(req, res) {
  try {
    const sessionId = viewerCleanCode(req.params.sessionId);
    if (!sessionId) return res.status(400).json({ ok: false, error: "Code viewer manquant" });
    const meta = viewerGetSession(sessionId);
    if (!meta) return res.status(404).json({ ok: false, error: "Session viewer introuvable" });
    const snapshot = viewerLiveSnapshots.get(sessionId) || viewerWaitingSnapshot(sessionId);
    return res.json({ ok: true, sessionId, rev: Number(meta.rev || 0), snapshot });
  } catch (error) {
    console.error("GET /viewer/session/:sessionId/snapshot error:", error);
    return res.status(500).json({ ok: false, error: error.message || "Erreur lecture snapshot viewer" });
  }
}

async function handleViewerPostSnapshot(req, res) {
  try {
    const sessionId = viewerCleanCode(req.params.sessionId);
    if (!sessionId) return res.status(400).json({ ok: false, error: "Code viewer manquant" });
    const meta = viewerGetSession(sessionId);
    if (!meta) return res.status(404).json({ ok: false, error: "Session viewer introuvable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = viewerNow();
    const snapshot = {
      ...body,
      v: 1,
      sessionId,
      updatedAt: Number(body.updatedAt || now),
      players: Array.isArray(body.players) ? body.players : [],
      source: body.source || "viewer-nas",
    };
    const rev = Number(meta.rev || 0) + 1;
    const nextMeta = { ...meta, rev, updatedAt: new Date(now).toISOString(), expiresAt: now + VIEWER_LIVE_TTL_MS };
    viewerLiveSessions.set(sessionId, nextMeta);
    viewerLiveSnapshots.set(sessionId, snapshot);
    return res.json({ ok: true, sessionId, rev, provider: "nas-memory" });
  } catch (error) {
    console.error("POST /viewer/session/:sessionId/snapshot error:", error);
    return res.status(500).json({ ok: false, error: error.message || "Erreur publication snapshot viewer" });
  }
}

async function handleViewerCloseSession(req, res) {
  try {
    const sessionId = viewerCleanCode(req.params.sessionId);
    if (sessionId) {
      viewerLiveSessions.delete(sessionId);
      viewerLiveSnapshots.set(sessionId, {
        ...viewerWaitingSnapshot(sessionId),
        phase: "closed",
        screen: "closed",
        title: "Session viewer fermée",
        meta: { text: "Session fermée" },
      });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /viewer/session/:sessionId error:", error);
    return res.status(500).json({ ok: false, error: error.message || "Erreur fermeture session viewer" });
  }
}

app.post(["/viewer/session", "/api/viewer/session"], handleViewerCreateSession);
app.get(["/viewer/session/:sessionId/snapshot", "/api/viewer/session/:sessionId/snapshot"], handleViewerGetSnapshot);
app.post(["/viewer/session/:sessionId/snapshot", "/api/viewer/session/:sessionId/snapshot"], handleViewerPostSnapshot);
app.delete(["/viewer/session/:sessionId", "/api/viewer/session/:sessionId"], handleViewerCloseSession);



// -----------------------------------------------------------------------------
// Messaging center V1 — messages privés + compteur global Messagerie
// Additif : ne remplace pas Online/Friends/Partages existants.
// -----------------------------------------------------------------------------
const PRIVATE_MESSAGE_TTL_HOURS = Number(process.env.PRIVATE_MESSAGE_TTL_HOURS || 24);
let privateMessagesLastPurgeAt = 0;

async function purgeExpiredPrivateMessages(force = false) {
  const now = Date.now();
  if (!force && now - privateMessagesLastPurgeAt < 10 * 60 * 1000) return;
  privateMessagesLastPurgeAt = now;
  const hours = String(Math.max(1, Math.min(168, PRIVATE_MESSAGE_TTL_HOURS)));
  await pool.query(
    `DELETE FROM online_direct_messages
     WHERE created_at < NOW() - ($1::text || ' hours')::interval`,
    [hours]
  ).catch((error) => console.warn('[messages] purge 24h skipped:', error?.message || error));
}

async function ensureMessagingCenterSchema() {
  await ensureUserBlocksSchema().catch(() => {});
  await pool.query(`
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
  `);
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS deleted_by_from_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS deleted_by_to_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_pair_created ON online_direct_messages(from_user_id, to_user_id, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_to_unread ON online_direct_messages(to_user_id, read_at, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_expires ON online_direct_messages(expires_at);`).catch(() => {});
  await pool.query(`UPDATE online_direct_messages SET expires_at = created_at + ($1::text || ' hours')::interval WHERE expires_at IS NULL`, [String(Math.max(1, Math.min(168, PRIVATE_MESSAGE_TTL_HOURS)))]).catch(() => {});
  await purgeExpiredPrivateMessages(false);

  await pool.query(`
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
  `);
  await pool.query(`ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system';`).catch(() => {});
  await pool.query(`ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS title TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS body TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_system_notifications_user_created ON system_notifications(user_id, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_system_notifications_user_unread ON system_notifications(user_id, read_at, created_at DESC);`).catch(() => {});
}

function mapDirectMessageRow(row, currentUserId) {
  if (!row) return null;
  const mine = String(row.from_user_id || '') === String(currentUserId || '');
  const otherId = mine ? row.to_user_id : row.from_user_id;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    body: row.body || '',
    text: row.body || '',
    metadata: row.metadata || {},
    createdAt: row.created_at,
    readAt: row.read_at || null,
    mine,
    direction: mine ? 'outgoing' : 'incoming',
    otherUserId: otherId,
    fromUser: {
      id: row.from_user_id,
      userId: row.from_user_id,
      nickname: row.from_nickname || null,
      displayName: row.from_display_name || row.from_nickname || null,
      avatarUrl: row.from_avatar_url || null,
      email: row.from_email || null,
    },
    toUser: {
      id: row.to_user_id,
      userId: row.to_user_id,
      nickname: row.to_nickname || null,
      displayName: row.to_display_name || row.to_nickname || null,
      avatarUrl: row.to_avatar_url || null,
      email: row.to_email || null,
    },
  };
}

function mapSystemNotificationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type || 'system',
    title: row.title || null,
    body: row.body || null,
    payload: row.payload || {},
    createdAt: row.created_at,
    readAt: row.read_at || null,
    unread: !row.read_at,
  };
}


// -----------------------------------------------------------------------------
// Messaging realtime + blocage V3 — T'Chat Messenger instantané
// SSE par utilisateur pour que messages/photos/vocaux/appels arrivent sans reload.
// -----------------------------------------------------------------------------
const directMessageStreamClients = new Map();

function directMessageStreamKey(userId) {
  return String(userId || "").trim();
}

function directMessageBroadcastToUser(userId, type, payload = {}) {
  const key = directMessageStreamKey(userId);
  if (!key) return;
  const clients = directMessageStreamClients.get(key);
  if (!clients || clients.size <= 0) return;
  const packet = JSON.stringify({ ok: true, type, userId: key, ts: nowIso(), ...payload });
  for (const client of Array.from(clients)) {
    try {
      client.write(`event: ${type}\n`);
      client.write(`data: ${packet}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
  if (clients.size === 0) directMessageStreamClients.delete(key);
}

async function ensureUserBlocksSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (blocker_user_id, blocked_user_id),
      CHECK (blocker_user_id <> blocked_user_id)
    );
  `);
  await pool.query(`ALTER TABLE user_blocks ADD COLUMN IF NOT EXISTS reason TEXT;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id, blocker_user_id);`).catch(() => {});
}

async function getBlockBetweenUsers(userA, userB) {
  const a = String(userA || "").trim();
  const b = String(userB || "").trim();
  if (!a || !b) return null;
  await ensureUserBlocksSchema();
  const result = await pool.query(`
    SELECT *
    FROM user_blocks
    WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
       OR (blocker_user_id = $2 AND blocked_user_id = $1)
    LIMIT 1
  `, [a, b]);
  return result.rows[0] || null;
}

async function assertUsersCanMessage(userA, userB) {
  const block = await getBlockBetweenUsers(userA, userB);
  if (!block) return { ok: true };
  const blockedByMe = String(block.blocker_user_id || "") === String(userA || "");
  return {
    ok: false,
    error: blockedByMe
      ? "Tu as bloqué cet utilisateur. Débloque-le pour échanger avec lui."
      : "Cet utilisateur t'a bloqué. La messagerie et les appels sont indisponibles.",
  };
}

async function loadDirectMessageFull(messageId) {
  const result = await pool.query(`
    SELECT m.*,
      fu.email AS from_email, fu.nickname AS from_nickname, fp.display_name AS from_display_name, fp.avatar_url AS from_avatar_url,
      tu.email AS to_email, tu.nickname AS to_nickname, tp.display_name AS to_display_name, tp.avatar_url AS to_avatar_url
    FROM online_direct_messages m
    JOIN users fu ON fu.id = m.from_user_id
    JOIN users tu ON tu.id = m.to_user_id
    LEFT JOIN profiles fp ON fp.user_id = fu.id
    LEFT JOIN profiles tp ON tp.user_id = tu.id
    WHERE m.id = $1
    LIMIT 1
  `, [String(messageId || "")]);
  return result.rows[0] || null;
}

async function broadcastDirectMessageById(messageId, type = "message:created") {
  const row = await loadDirectMessageFull(messageId).catch(() => null);
  if (!row) return;
  const fromId = String(row.from_user_id || "");
  const toId = String(row.to_user_id || "");
  const senderMessage = mapDirectMessageRow(row, fromId);
  const receiverMessage = mapDirectMessageRow(row, toId);
  directMessageBroadcastToUser(fromId, type, { message: senderMessage, item: senderMessage });
  directMessageBroadcastToUser(toId, type, { message: receiverMessage, item: receiverMessage });
  directMessageBroadcastToUser(fromId, "messages:changed", { reason: type });
  directMessageBroadcastToUser(toId, "messages:changed", { reason: type });

  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (String(meta.kind || "") === "callInvite") {
    directMessageBroadcastToUser(toId, "call:incoming", {
      callId: meta.callId || null,
      callType: meta.callType || "audio",
      fromUserId: fromId,
      message: receiverMessage,
    });
  }
}

async function broadcastCallSessionToParticipants(callId, eventName = "call:update", extra = {}) {
  const row = await loadCallSessionRaw(callId).catch(() => null);
  if (!row) return;
  const callerId = String(row.caller_user_id || "");
  const calleeId = String(row.callee_user_id || "");
  const callerCall = mapCallSessionRow(row, callerId);
  const calleeCall = mapCallSessionRow(row, calleeId);
  if (eventName === "call:incoming") {
    // Une sonnerie entrante ne doit être poussée qu'au destinataire.
    // Le caller reçoit déjà son message sortant, sinon il peut créer une fausse alerte entrante chez lui.
    directMessageBroadcastToUser(calleeId, eventName, {
      call: calleeCall,
      callId: calleeCall?.id || callId,
      callType: calleeCall?.callType || row.call_type || "audio",
      fromUserId: callerId,
      ...extra,
    });
    return;
  }
  directMessageBroadcastToUser(callerId, eventName, { call: callerCall, ...extra });
  directMessageBroadcastToUser(calleeId, eventName, { call: calleeCall, ...extra });
}

app.get(["/online/private-messages/stream", "/online/messages/stream"], async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const user = await resolveOnlineStreamUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "Session invalide" });
    const userId = String(user.id || "");

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let clients = directMessageStreamClients.get(userId);
    if (!clients) {
      clients = new Set();
      directMessageStreamClients.set(userId, clients);
    }
    clients.add(res);

    const counters = await loadMessagingCounters(userId).catch(() => null);
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ ok: true, type: "connected", userId, ts: nowIso(), counters })}\n\n`);

    try {
      const recentResult = await pool.query(`
        SELECT m.*,
          fu.email AS from_email, fu.nickname AS from_nickname, fp.display_name AS from_display_name, fp.avatar_url AS from_avatar_url,
          tu.email AS to_email, tu.nickname AS to_nickname, tp.display_name AS to_display_name, tp.avatar_url AS to_avatar_url
        FROM online_direct_messages m
        JOIN users fu ON fu.id = m.from_user_id
        JOIN users tu ON tu.id = m.to_user_id
        LEFT JOIN profiles fp ON fp.user_id = fu.id
        LEFT JOIN profiles tp ON tp.user_id = tu.id
        WHERE ((m.from_user_id = $1 AND m.deleted_by_from_at IS NULL)
            OR (m.to_user_id = $1 AND m.deleted_by_to_at IS NULL))
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
        ORDER BY m.created_at DESC
        LIMIT 40
      `, [userId]);
      const messages = recentResult.rows.reverse().map((row) => mapDirectMessageRow(row, userId)).filter(Boolean);
      res.write(`event: messages:snapshot\n`);
      res.write(`data: ${JSON.stringify({ ok: true, type: "messages:snapshot", userId, ts: nowIso(), messages })}\n\n`);
      for (const message of messages) {
        const meta = message?.metadata && typeof message.metadata === "object" ? message.metadata : {};
        if (message.direction === "incoming" && String(meta.kind || "") === "callInvite") {
          const expiresAt = Date.parse(String(meta.expiresAt || ""));
          if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) {
            res.write(`event: call:incoming\n`);
            res.write(`data: ${JSON.stringify({ ok: true, type: "call:incoming", userId, ts: nowIso(), callId: meta.callId || null, callType: meta.callType || "audio", fromUserId: message.fromUserId || message.fromUser?.id || null, message })}\n\n`);
          }
        }
      }
    } catch (snapshotError) {
      console.warn("[messaging-stream] snapshot skipped:", snapshotError?.message || snapshotError);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: ${JSON.stringify({ ok: true, type: "ping", userId, ts: nowIso() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) directMessageStreamClients.delete(userId);
    });
  } catch (error) {
    console.error("GET /online/private-messages/stream error:", error);
    if (!res.headersSent) res.status(500).json({ ok: false, error: error.message || "Erreur stream messagerie" });
  }
});

app.get("/online/blocked-users", authRequired, async (req, res) => {
  try {
    await ensureUserBlocksSchema();
    const result = await pool.query(`
      SELECT b.*, u.email, u.nickname, p.display_name, p.avatar_url
      FROM user_blocks b
      JOIN users u ON u.id = b.blocked_user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE b.blocker_user_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    const users = result.rows.map((row) => ({
      id: row.blocked_user_id,
      userId: row.blocked_user_id,
      email: row.email || null,
      nickname: row.nickname || null,
      displayName: row.display_name || row.nickname || null,
      avatarUrl: row.avatar_url || null,
      blockedAt: row.created_at,
      reason: row.reason || null,
    }));
    res.json({ ok: true, users, blocked: users });
  } catch (error) {
    console.error("GET /online/blocked-users error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur liste blocages" });
  }
});

app.post("/online/users/:userId/block", authRequired, async (req, res) => {
  try {
    await ensureUserBlocksSchema();
    const blockedUserId = String(req.params.userId || req.body?.userId || "").trim();
    const reason = String(req.body?.reason || "").trim().slice(0, 240) || null;
    if (!blockedUserId) return res.status(400).json({ ok: false, error: "Utilisateur à bloquer manquant" });
    if (blockedUserId === req.user.id) return res.status(400).json({ ok: false, error: "Impossible de te bloquer toi-même" });
    const target = await findUserById(blockedUserId);
    if (!target) return res.status(404).json({ ok: false, error: "Utilisateur introuvable" });
    await pool.query(`
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id, reason, created_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (blocker_user_id, blocked_user_id)
      DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
    `, [req.user.id, blockedUserId, reason]);
    directMessageBroadcastToUser(blockedUserId, "user:blocked", { byUserId: req.user.id });
    directMessageBroadcastToUser(req.user.id, "messages:changed", { reason: "user-blocked" });
    res.json({ ok: true, blockedUserId });
  } catch (error) {
    console.error("POST /online/users/:userId/block error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur blocage utilisateur" });
  }
});

app.delete("/online/users/:userId/block", authRequired, async (req, res) => {
  try {
    await ensureUserBlocksSchema();
    const blockedUserId = String(req.params.userId || "").trim();
    if (!blockedUserId) return res.status(400).json({ ok: false, error: "Utilisateur à débloquer manquant" });
    const result = await pool.query(`DELETE FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2`, [req.user.id, blockedUserId]);
    directMessageBroadcastToUser(req.user.id, "messages:changed", { reason: "user-unblocked" });
    res.json({ ok: true, unblockedUserId: blockedUserId, deleted: Number(result.rowCount || 0) });
  } catch (error) {
    console.error("DELETE /online/users/:userId/block error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur déblocage utilisateur" });
  }
});

async function loadMessagingCounters(userId) {
  await ensureMessagingCenterSchema();
  const [messages, friendRequests, profileLinks, sharedMatches, system] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS c FROM online_direct_messages WHERE to_user_id = $1 AND read_at IS NULL AND deleted_by_to_at IS NULL`, [userId]).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM friend_requests WHERE to_user_id = $1 AND status = 'pending'`, [userId]).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM profile_friend_links WHERE friend_user_id = $1 AND COALESCE(status, 'pending') = 'pending'`, [userId]).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM shared_items WHERE target_user_id = $1 AND type = 'match' AND COALESCE(status, 'pending') = 'pending'`, [userId]).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM system_notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]).catch(() => ({ rows: [{ c: 0 }] })),
  ]);
  const counters = {
    privateMessages: Number(messages.rows?.[0]?.c || 0),
    friendRequests: Number(friendRequests.rows?.[0]?.c || 0),
    profileLinks: Number(profileLinks.rows?.[0]?.c || 0),
    sharedMatches: Number(sharedMatches.rows?.[0]?.c || 0),
    system: Number(system.rows?.[0]?.c || 0),
  };
  counters.total = Object.values(counters).reduce((sum, value) => sum + Number(value || 0), 0);
  return counters;
}

app.get('/online/messages/summary', authRequired, async (req, res) => {
  try {
    const counters = await loadMessagingCounters(req.user.id);
    res.json({ ok: true, counters });
  } catch (error) {
    console.error('GET /online/messages/summary error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur résumé messagerie' });
  }
});

app.get('/online/messages/count', authRequired, async (req, res) => {
  try {
    const counters = await loadMessagingCounters(req.user.id);
    res.json({ ok: true, pending: counters.total, unread: counters.privateMessages, counters });
  } catch (error) {
    console.error('GET /online/messages/count error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur compteur messagerie' });
  }
});

app.get('/online/messages/conversations', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const result = await pool.query(`
      WITH friends AS (
        SELECT u.id AS friend_user_id, u.email, u.nickname, p.display_name, p.avatar_url
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE f.user_a_id = $1 OR f.user_b_id = $1
      ), last_messages AS (
        SELECT DISTINCT ON (CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END)
          CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END AS friend_user_id,
          id, from_user_id, to_user_id, body, metadata, created_at, read_at
        FROM online_direct_messages
        WHERE (from_user_id = $1 AND deleted_by_from_at IS NULL)
           OR (to_user_id = $1 AND deleted_by_to_at IS NULL)
        ORDER BY CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END, created_at DESC
      ), unread AS (
        SELECT from_user_id AS friend_user_id, COUNT(*)::int AS unread_count
        FROM online_direct_messages
        WHERE to_user_id = $1 AND read_at IS NULL AND deleted_by_to_at IS NULL
        GROUP BY from_user_id
      )
      SELECT fr.*, lm.id AS last_id, lm.from_user_id AS last_from_user_id, lm.to_user_id AS last_to_user_id,
             lm.body AS last_body, lm.metadata AS last_metadata, lm.created_at AS last_created_at, lm.read_at AS last_read_at,
             COALESCE(un.unread_count, 0)::int AS unread_count
      FROM friends fr
      LEFT JOIN last_messages lm ON lm.friend_user_id = fr.friend_user_id
      LEFT JOIN unread un ON un.friend_user_id = fr.friend_user_id
      ORDER BY COALESCE(lm.created_at, NOW() - INTERVAL '100 years') DESC, COALESCE(fr.display_name, fr.nickname) ASC
      LIMIT 200
    `, [req.user.id]);

    const conversations = result.rows.map((row) => ({
      friend: {
        id: row.friend_user_id,
        userId: row.friend_user_id,
        email: row.email || null,
        nickname: row.nickname || null,
        displayName: row.display_name || row.nickname || null,
        avatarUrl: row.avatar_url || null,
      },
      unreadCount: Number(row.unread_count || 0),
      lastMessage: row.last_id ? {
        id: row.last_id,
        fromUserId: row.last_from_user_id,
        toUserId: row.last_to_user_id,
        body: row.last_body || '',
        text: row.last_body || '',
        metadata: row.last_metadata || {},
        createdAt: row.last_created_at,
        readAt: row.last_read_at || null,
        mine: String(row.last_from_user_id || '') === String(req.user.id || ''),
      } : null,
    }));
    res.json({ ok: true, conversations });
  } catch (error) {
    console.error('GET /online/messages/conversations error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur conversations messagerie' });
  }
});

app.get('/online/messages/:friendUserId', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const friendUserId = String(req.params.friendUserId || '').trim();
    if (!friendUserId) return res.status(400).json({ ok: false, error: 'Ami manquant' });
    if (!(await areFriends(req.user.id, friendUserId))) return res.status(403).json({ ok: false, error: 'Messagerie autorisée uniquement avec un ami' });
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 80)));
    const result = await pool.query(`
      SELECT m.*,
        fu.email AS from_email, fu.nickname AS from_nickname, fp.display_name AS from_display_name, fp.avatar_url AS from_avatar_url,
        tu.email AS to_email, tu.nickname AS to_nickname, tp.display_name AS to_display_name, tp.avatar_url AS to_avatar_url
      FROM online_direct_messages m
      JOIN users fu ON fu.id = m.from_user_id
      JOIN users tu ON tu.id = m.to_user_id
      LEFT JOIN profiles fp ON fp.user_id = fu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE ((m.from_user_id = $1 AND m.to_user_id = $2 AND m.deleted_by_from_at IS NULL)
          OR (m.from_user_id = $2 AND m.to_user_id = $1 AND m.deleted_by_to_at IS NULL))
      ORDER BY m.created_at DESC
      LIMIT $3
    `, [req.user.id, friendUserId, limit]);
    const messages = result.rows.reverse().map((row) => mapDirectMessageRow(row, req.user.id)).filter(Boolean);
    res.json({ ok: true, messages });
  } catch (error) {
    console.error('GET /online/messages/:friendUserId error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur lecture messages privés' });
  }
});

app.post('/online/messages/:friendUserId', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const friendUserId = String(req.params.friendUserId || req.body?.toUserId || '').trim();
    const body = String(req.body?.body || req.body?.text || req.body?.message || '').trim().slice(0, 4000);
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    if (!friendUserId) return res.status(400).json({ ok: false, error: 'Ami destinataire manquant' });
    if (!body) return res.status(400).json({ ok: false, error: 'Message vide' });
    if (!(await areFriends(req.user.id, friendUserId))) return res.status(403).json({ ok: false, error: 'Messagerie autorisée uniquement avec un ami' });
    const blockCheck = await assertUsersCanMessage(req.user.id, friendUserId);
    if (!blockCheck.ok) return res.status(403).json({ ok: false, error: blockCheck.error });
    const inserted = await pool.query(`
      INSERT INTO online_direct_messages (id, from_user_id, to_user_id, body, metadata, created_at, expires_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,NOW(),NOW() + ($6::text || ' hours')::interval)
      RETURNING *
    `, [uid('dm'), req.user.id, friendUserId, body, JSON.stringify(metadata || {}), String(Math.max(1, Math.min(168, PRIVATE_MESSAGE_TTL_HOURS)))]);
    const row = inserted.rows[0];
    broadcastDirectMessageById(row.id, "message:created").catch(() => {});
    res.status(201).json({ ok: true, message: mapDirectMessageRow(row, req.user.id) });
  } catch (error) {
    console.error('POST /online/messages/:friendUserId error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur envoi message privé' });
  }
});

app.post('/online/messages/:friendUserId/read', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const friendUserId = String(req.params.friendUserId || '').trim();
    if (!friendUserId) return res.status(400).json({ ok: false, error: 'Ami manquant' });
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE from_user_id = $2 AND to_user_id = $1 AND read_at IS NULL
    `, [req.user.id, friendUserId]);
    res.json({ ok: true, read: Number(result.rowCount || 0) });
  } catch (error) {
    console.error('POST /online/messages/:friendUserId/read error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur marquage messages lus' });
  }
});

app.get('/online/system-notifications', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const result = await pool.query(`SELECT * FROM system_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [req.user.id, limit]);
    res.json({ ok: true, notifications: result.rows.map(mapSystemNotificationRow).filter(Boolean) });
  } catch (error) {
    console.error('GET /online/system-notifications error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur notifications système' });
  }
});

app.post('/online/system-notifications/:id/read', authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    const id = String(req.params.id || '').trim();
    const result = await pool.query(`UPDATE system_notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 AND user_id = $2 RETURNING *`, [id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: 'Notification introuvable' });
    res.json({ ok: true, notification: mapSystemNotificationRow(result.rows[0]) });
  } catch (error) {
    console.error('POST /online/system-notifications/:id/read error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Erreur lecture notification système' });
  }
});


// -----------------------------------------------------------------------------
// WebRTC signaling bridge V1 — appels audio/visio T'Chat Messenger
// Additif strict : pont NAS HTTP/SSE pour offer/answer/ICE, sans WebSocket.
// -----------------------------------------------------------------------------
const ONLINE_CALL_TTL_MINUTES = Number(process.env.ONLINE_CALL_TTL_MINUTES || 120);
const ONLINE_CALL_RING_TTL_SECONDS = Number(process.env.ONLINE_CALL_RING_TTL_SECONDS || 60);
const callBridgeStreamClients = new Map();
let callBridgeLastPurgeAt = 0;

function normalizeCallType(value) {
  const raw = String(value || "audio").trim().toLowerCase();
  return raw === "video" || raw === "visio" ? "video" : "audio";
}

function normalizeCallStatus(value) {
  const raw = String(value || "ringing").trim().toLowerCase();
  if (["ringing", "accepted", "declined", "ended", "missed", "expired"].includes(raw)) return raw;
  return "ringing";
}

function callTtlMinutes() {
  return Math.max(1, Math.min(24 * 60, ONLINE_CALL_TTL_MINUTES));
}

function callRingTtlSeconds() {
  return Math.max(20, Math.min(180, ONLINE_CALL_RING_TTL_SECONDS));
}

async function purgeExpiredCallBridge(force = false) {
  const now = Date.now();
  if (!force && now - callBridgeLastPurgeAt < 10 * 60 * 1000) return;
  callBridgeLastPurgeAt = now;
  await pool.query(`
    UPDATE online_call_sessions
    SET status = 'expired', updated_at = NOW(), ended_at = COALESCE(ended_at, NOW())
    WHERE status IN ('ringing','accepted')
      AND expires_at < NOW()
  `).catch((error) => console.warn('[webrtc] expire sessions skipped:', error?.message || error));
  await pool.query(`
    DELETE FROM online_call_signals
    WHERE created_at < NOW() - ($1::text || ' minutes')::interval
  `, [String(callTtlMinutes())]).catch((error) => console.warn('[webrtc] purge signals skipped:', error?.message || error));
}

async function ensureCallBridgeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_call_sessions (
      id TEXT PRIMARY KEY,
      caller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      callee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      call_type TEXT NOT NULL DEFAULT 'audio',
      status TEXT NOT NULL DEFAULT 'ringing',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
    );
  `);
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS call_type TEXT NOT NULL DEFAULT 'audio';`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ringing';`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours');`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_call_sessions_callee_status ON online_call_sessions(callee_user_id, status, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_call_sessions_users ON online_call_sessions(caller_user_id, callee_user_id, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_call_sessions_expires ON online_call_sessions(expires_at);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_call_signals (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES online_call_sessions(id) ON DELETE CASCADE,
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signal_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE online_call_signals ADD COLUMN IF NOT EXISTS signal_type TEXT NOT NULL DEFAULT 'candidate';`).catch(() => {});
  await pool.query(`ALTER TABLE online_call_signals ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_call_signals_call_created ON online_call_signals(call_id, created_at ASC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_call_signals_to_created ON online_call_signals(to_user_id, created_at ASC);`).catch(() => {});
  await purgeExpiredCallBridge(false);
}

function mapCallSessionRow(row, currentUserId) {
  if (!row) return null;
  const mine = String(row.caller_user_id || "") === String(currentUserId || "");
  const friendUserId = mine ? row.callee_user_id : row.caller_user_id;
  return {
    id: row.id,
    callId: row.id,
    callType: normalizeCallType(row.call_type),
    type: normalizeCallType(row.call_type),
    status: normalizeCallStatus(row.status),
    callerUserId: row.caller_user_id,
    calleeUserId: row.callee_user_id,
    friendUserId,
    direction: mine ? "outgoing" : "incoming",
    mine,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at || null,
    endedAt: row.ended_at || null,
    expiresAt: row.expires_at || null,
    caller: {
      id: row.caller_user_id,
      userId: row.caller_user_id,
      nickname: row.caller_nickname || null,
      displayName: row.caller_display_name || row.caller_nickname || null,
      avatarUrl: row.caller_avatar_url || null,
      email: row.caller_email || null,
    },
    callee: {
      id: row.callee_user_id,
      userId: row.callee_user_id,
      nickname: row.callee_nickname || null,
      displayName: row.callee_display_name || row.callee_nickname || null,
      avatarUrl: row.callee_avatar_url || null,
      email: row.callee_email || null,
    },
  };
}

function mapCallSignalRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    signalId: row.id,
    callId: row.call_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    signalType: row.signal_type,
    type: row.signal_type,
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

async function loadCallSessionRaw(callId) {
  const result = await pool.query(`
    SELECT c.*,
      cu.email AS caller_email, cu.nickname AS caller_nickname, cp.display_name AS caller_display_name, cp.avatar_url AS caller_avatar_url,
      tu.email AS callee_email, tu.nickname AS callee_nickname, tp.display_name AS callee_display_name, tp.avatar_url AS callee_avatar_url
    FROM online_call_sessions c
    JOIN users cu ON cu.id = c.caller_user_id
    JOIN users tu ON tu.id = c.callee_user_id
    LEFT JOIN profiles cp ON cp.user_id = cu.id
    LEFT JOIN profiles tp ON tp.user_id = tu.id
    WHERE c.id = $1
    LIMIT 1
  `, [String(callId || "").trim()]);
  return result.rows[0] || null;
}

function isCallParticipant(row, userId) {
  return !!row && (String(row.caller_user_id || "") === String(userId || "") || String(row.callee_user_id || "") === String(userId || ""));
}

async function assertCallParticipant(callId, userId) {
  const row = await loadCallSessionRaw(callId);
  if (!row) return { errorStatus: 404, error: "Appel introuvable" };
  if (!isCallParticipant(row, userId)) return { errorStatus: 403, error: "Accès refusé à cet appel" };
  return { row };
}

function callBridgeBroadcast(callId, type, payload = {}) {
  const key = String(callId || "").trim();
  if (!key) return;
  const clients = callBridgeStreamClients.get(key);
  if (!clients || clients.size <= 0) return;
  const packet = JSON.stringify({ ok: true, type, callId: key, ts: nowIso(), ...payload });
  for (const client of Array.from(clients)) {
    try {
      client.write(`event: ${type}\n`);
      client.write(`data: ${packet}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

app.post(["/online/calls", "/online/calls/start", "/online/call/start"], authRequired, async (req, res) => {
  try {
    await ensureMessagingCenterSchema();
    await ensureCallBridgeSchema();
    const calleeUserId = String(req.body?.calleeUserId || req.body?.friendUserId || req.body?.toUserId || req.body?.targetUserId || "").trim();
    const callType = normalizeCallType(req.body?.callType || req.body?.type);
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
    if (!calleeUserId) return res.status(400).json({ ok: false, error: "Ami destinataire manquant" });
    if (calleeUserId === req.user.id) return res.status(400).json({ ok: false, error: "Impossible de s'appeler soi-même" });
    if (!(await areFriends(req.user.id, calleeUserId))) return res.status(403).json({ ok: false, error: "Appel autorisé uniquement avec un ami" });
    const blockCheck = await assertUsersCanMessage(req.user.id, calleeUserId);
    if (!blockCheck.ok) return res.status(403).json({ ok: false, error: blockCheck.error });

    const callId = uid("call");
    const ringTtl = String(callRingTtlSeconds());
    const insert = await pool.query(`
      INSERT INTO online_call_sessions (id, caller_user_id, callee_user_id, call_type, status, metadata, created_at, updated_at, expires_at)
      VALUES ($1,$2,$3,$4,'ringing',$5::jsonb,NOW(),NOW(),NOW() + ($6::text || ' seconds')::interval)
      RETURNING *
    `, [callId, req.user.id, calleeUserId, callType, JSON.stringify(metadata || {}), ringTtl]);

    const body = callType === "video" ? "📹 Demande de visio" : "📞 Demande d’appel audio";
    const messageMeta = {
      kind: "callInvite",
      callType,
      callId,
      status: "ringing",
      signaling: "nas-webrtc-v1",
      bridge: "online-call-signaling-v1",
      expiresAt: new Date(Date.now() + callRingTtlSeconds() * 1000).toISOString(),
      ttlHours: PRIVATE_MESSAGE_TTL_HOURS,
      ...(metadata?.messageMetadata && typeof metadata.messageMetadata === "object" ? metadata.messageMetadata : {}),
    };
    const msg = await pool.query(`
      INSERT INTO online_direct_messages (id, from_user_id, to_user_id, body, metadata, created_at, expires_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,NOW(),NOW() + ($6::text || ' hours')::interval)
      RETURNING *
    `, [uid("dm"), req.user.id, calleeUserId, body, JSON.stringify(messageMeta), String(Math.max(1, Math.min(168, PRIVATE_MESSAGE_TTL_HOURS)))]);

    const full = await loadCallSessionRaw(callId);
    const call = mapCallSessionRow(full || insert.rows[0], req.user.id);
    const message = mapDirectMessageRow(msg.rows[0], req.user.id);
    broadcastDirectMessageById(msg.rows[0].id, "message:created").catch(() => {});
    broadcastCallSessionToParticipants(callId, "call:incoming").catch(() => {});
    callBridgeBroadcast(callId, "call:ringing", { call });
    res.status(201).json({ ok: true, call, message });
  } catch (error) {
    console.error("POST /online/calls/start error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur création appel" });
  }
});



// -----------------------------------------------------------------------------
// Messenger groups V1 — groupes privés persistants NAS
// -----------------------------------------------------------------------------
async function ensureMessengerGroupsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_messenger_groups (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      avatar_url TEXT,
      cover_url TEXT,
      last_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE online_messenger_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE online_messenger_groups ADD COLUMN IF NOT EXISTS cover_url TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE online_messenger_groups ADD COLUMN IF NOT EXISTS last_message TEXT;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_messenger_groups_owner ON online_messenger_groups(owner_user_id, updated_at DESC);`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_messenger_group_members (
      group_id TEXT NOT NULL REFERENCES online_messenger_groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_messenger_group_members_user ON online_messenger_group_members(user_id, group_id);`).catch(() => {});
}

function normalizeGroupMemberIds(raw, currentUserId) {
  const current = String(currentUserId || "").trim();
  const ids = Array.isArray(raw) ? raw : [];
  return Array.from(new Set(ids.map((x) => String(x || "").trim()).filter((id) => id && id !== current))).slice(0, 50);
}

async function loadMessengerGroup(groupId, viewerUserId) {
  await ensureMessengerGroupsSchema();
  const groupResult = await pool.query(`
    SELECT g.*
    FROM online_messenger_groups g
    JOIN online_messenger_group_members gm ON gm.group_id = g.id AND gm.user_id = $2
    WHERE g.id = $1
    LIMIT 1
  `, [String(groupId || ""), String(viewerUserId || "")]);
  const group = groupResult.rows[0];
  if (!group) return null;
  const membersResult = await pool.query(`
    SELECT gm.role, gm.joined_at, u.id, u.email, u.nickname,
      p.user_id, p.name, p.display_name, p.avatar, p.avatar_url, p.avatar_asset_id, p.country, p.country_code,
      COALESCE(op.status, 'offline') AS presence_status, op.last_seen_at
    FROM online_messenger_group_members gm
    JOIN users u ON u.id = gm.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN online_presence op ON op.user_id = u.id
    WHERE gm.group_id = $1
    ORDER BY CASE WHEN gm.role = 'owner' THEN 0 ELSE 1 END, gm.joined_at ASC
  `, [group.id]);
  const members = membersResult.rows.map((row) => ({ role: row.role, joinedAt: row.joined_at, ...mapPublicUser(row) })).filter(Boolean);
  return {
    id: group.id,
    name: group.name,
    ownerId: group.owner_user_id,
    memberIds: members.map((m) => String(m.userId || m.id || "")).filter((id) => id && id !== String(viewerUserId || "")),
    members,
    avatarUrl: group.avatar_url || null,
    coverUrl: group.cover_url || null,
    lastMessage: group.last_message || null,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

async function broadcastMessengerGroupChanged(groupId, reason = "group:changed") {
  const rows = await pool.query(`SELECT user_id FROM online_messenger_group_members WHERE group_id = $1`, [String(groupId || "")]).catch(() => ({ rows: [] }));
  for (const row of rows.rows || []) {
    directMessageBroadcastToUser(String(row.user_id || ""), "groups:changed", { groupId, reason });
    directMessageBroadcastToUser(String(row.user_id || ""), "messages:changed", { reason });
  }
}

app.get(["/online/messenger-groups", "/online/chat-groups"], authRequired, async (req, res) => {
  try {
    await ensureMessengerGroupsSchema();
    const result = await pool.query(`
      SELECT g.id
      FROM online_messenger_groups g
      JOIN online_messenger_group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = $1
      ORDER BY g.updated_at DESC, g.created_at DESC
    `, [req.user.id]);
    const groups = [];
    for (const row of result.rows) {
      const group = await loadMessengerGroup(row.id, req.user.id);
      if (group) groups.push(group);
    }
    res.json({ ok: true, groups });
  } catch (error) {
    console.error("GET /online/messenger-groups error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur groupes Messenger" });
  }
});

app.post(["/online/messenger-groups", "/online/chat-groups"], authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureMessengerGroupsSchema();
    const name = String(req.body?.name || req.body?.title || "").trim().slice(0, 80) || "Groupe Messenger";
    const memberIds = normalizeGroupMemberIds(req.body?.memberIds || req.body?.members, req.user.id);
    if (memberIds.length < 2) return res.status(400).json({ ok: false, error: "Sélectionne au moins 2 amis pour créer un groupe." });
    const avatarUrl = typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl : null;
    const coverUrl = typeof req.body?.coverUrl === "string" ? req.body.coverUrl : null;
    const id = uid("grp");
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO online_messenger_groups (id, owner_user_id, name, avatar_url, cover_url, last_message, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [id, req.user.id, name, avatarUrl || null, coverUrl || null, "Groupe créé"]);
    await client.query(`INSERT INTO online_messenger_group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', NOW())`, [id, req.user.id]);
    for (const memberId of memberIds) {
      // On évite de créer des groupes avec des ids inexistants, mais on ne bloque pas tout si un profil ami est incomplet.
      const exists = await client.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [memberId]);
      if (exists.rows[0]) {
        await client.query(`
          INSERT INTO online_messenger_group_members (group_id, user_id, role, joined_at)
          VALUES ($1, $2, 'member', NOW())
          ON CONFLICT (group_id, user_id) DO NOTHING
        `, [id, memberId]);
      }
    }
    await client.query("COMMIT");
    const group = await loadMessengerGroup(id, req.user.id);
    broadcastMessengerGroupChanged(id, "group:created").catch(() => {});
    res.json({ ok: true, group });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("POST /online/messenger-groups error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur création groupe Messenger" });
  } finally {
    client.release();
  }
});

app.put(["/online/messenger-groups/:id", "/online/chat-groups/:id"], authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureMessengerGroupsSchema();
    const id = String(req.params.id || "").trim();
    const current = await client.query(`SELECT * FROM online_messenger_groups WHERE id = $1 LIMIT 1`, [id]);
    const group = current.rows[0];
    if (!group) return res.status(404).json({ ok: false, error: "Groupe introuvable" });
    if (String(group.owner_user_id || "") !== String(req.user.id || "")) return res.status(403).json({ ok: false, error: "Seul le créateur peut modifier ce groupe." });
    const name = req.body?.name !== undefined ? String(req.body.name || "").trim().slice(0, 80) : null;
    const avatarUrl = req.body?.avatarUrl !== undefined ? (String(req.body.avatarUrl || "") || null) : undefined;
    const coverUrl = req.body?.coverUrl !== undefined ? (String(req.body.coverUrl || "") || null) : undefined;
    await client.query("BEGIN");
    await client.query(`
      UPDATE online_messenger_groups
      SET name = COALESCE($2, name),
          avatar_url = CASE WHEN $3::boolean THEN $4 ELSE avatar_url END,
          cover_url = CASE WHEN $5::boolean THEN $6 ELSE cover_url END,
          updated_at = NOW()
      WHERE id = $1
    `, [id, name, avatarUrl !== undefined, avatarUrl || null, coverUrl !== undefined, coverUrl || null]);
    if (Array.isArray(req.body?.memberIds)) {
      const memberIds = normalizeGroupMemberIds(req.body.memberIds, req.user.id);
      await client.query(`DELETE FROM online_messenger_group_members WHERE group_id = $1 AND role <> 'owner'`, [id]);
      for (const memberId of memberIds) {
        const exists = await client.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [memberId]);
        if (exists.rows[0]) {
          await client.query(`
            INSERT INTO online_messenger_group_members (group_id, user_id, role, joined_at)
            VALUES ($1, $2, 'member', NOW())
            ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role
          `, [id, memberId]);
        }
      }
    }
    await client.query("COMMIT");
    const updated = await loadMessengerGroup(id, req.user.id);
    broadcastMessengerGroupChanged(id, "group:updated").catch(() => {});
    res.json({ ok: true, group: updated });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("PUT /online/messenger-groups/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur modification groupe Messenger" });
  } finally {
    client.release();
  }
});

app.delete(["/online/messenger-groups/:id", "/online/chat-groups/:id"], authRequired, async (req, res) => {
  try {
    await ensureMessengerGroupsSchema();
    const id = String(req.params.id || "").trim();
    const current = await pool.query(`SELECT * FROM online_messenger_groups WHERE id = $1 LIMIT 1`, [id]);
    const group = current.rows[0];
    if (!group) return res.status(404).json({ ok: false, error: "Groupe introuvable" });
    const isOwner = String(group.owner_user_id || "") === String(req.user.id || "");
    if (isOwner) {
      const members = await pool.query(`SELECT user_id FROM online_messenger_group_members WHERE group_id = $1`, [id]).catch(() => ({ rows: [] }));
      await pool.query(`DELETE FROM online_messenger_groups WHERE id = $1`, [id]);
      for (const row of members.rows || []) directMessageBroadcastToUser(String(row.user_id || ""), "groups:changed", { groupId: id, reason: "group:deleted" });
      return res.json({ ok: true, deleted: true, mode: "deleted" });
    }
    await pool.query(`DELETE FROM online_messenger_group_members WHERE group_id = $1 AND user_id = $2`, [id, req.user.id]);
    directMessageBroadcastToUser(req.user.id, "groups:changed", { groupId: id, reason: "group:left" });
    broadcastMessengerGroupChanged(id, "group:member-left").catch(() => {});
    res.json({ ok: true, deleted: true, mode: "left" });
  } catch (error) {
    console.error("DELETE /online/messenger-groups/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression groupe Messenger" });
  }
});

app.get("/online/calls/incoming", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const result = await pool.query(`
      SELECT c.*,
        cu.email AS caller_email, cu.nickname AS caller_nickname, cp.display_name AS caller_display_name, cp.avatar_url AS caller_avatar_url,
        tu.email AS callee_email, tu.nickname AS callee_nickname, tp.display_name AS callee_display_name, tp.avatar_url AS callee_avatar_url
      FROM online_call_sessions c
      JOIN users cu ON cu.id = c.caller_user_id
      JOIN users tu ON tu.id = c.callee_user_id
      LEFT JOIN profiles cp ON cp.user_id = cu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE c.callee_user_id = $1
        AND c.status = 'ringing'
        AND c.expires_at > NOW()
        AND c.created_at > NOW() - (GREATEST(20, LEAST(180, $2::int))::text || ' seconds')::interval
      ORDER BY c.created_at DESC
      LIMIT 20
    `, [req.user.id, callRingTtlSeconds()]);
    res.json({ ok: true, calls: result.rows.map((row) => mapCallSessionRow(row, req.user.id)).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/calls/incoming error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur appels entrants" });
  }
});

app.get("/online/calls/active", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const result = await pool.query(`
      SELECT c.*,
        cu.email AS caller_email, cu.nickname AS caller_nickname, cp.display_name AS caller_display_name, cp.avatar_url AS caller_avatar_url,
        tu.email AS callee_email, tu.nickname AS callee_nickname, tp.display_name AS callee_display_name, tp.avatar_url AS callee_avatar_url
      FROM online_call_sessions c
      JOIN users cu ON cu.id = c.caller_user_id
      JOIN users tu ON tu.id = c.callee_user_id
      LEFT JOIN profiles cp ON cp.user_id = cu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE (c.caller_user_id = $1 OR c.callee_user_id = $1)
        AND c.status IN ('ringing','accepted')
        AND c.expires_at > NOW()
      ORDER BY c.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    res.json({ ok: true, calls: result.rows.map((row) => mapCallSessionRow(row, req.user.id)).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/calls/active error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur appels actifs" });
  }
});

app.get("/online/calls/:callId", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    res.json({ ok: true, call: mapCallSessionRow(loaded.row, req.user.id) });
  } catch (error) {
    console.error("GET /online/calls/:callId error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture appel" });
  }
});

app.post("/online/calls/:callId/accept", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    if (String(loaded.row.callee_user_id || "") !== String(req.user.id || "")) return res.status(403).json({ ok: false, error: "Seul le destinataire peut décrocher" });
    const result = await pool.query(`
      UPDATE online_call_sessions
      SET status = 'accepted',
          accepted_at = COALESCE(accepted_at, NOW()),
          updated_at = NOW(),
          expires_at = NOW() + ($2::text || ' minutes')::interval
      WHERE id = $1 AND status IN ('ringing','accepted') AND expires_at > NOW()
      RETURNING *
    `, [String(req.params.callId || ""), String(callTtlMinutes())]);
    if (!result.rows[0]) return res.status(409).json({ ok: false, error: "Appel expiré ou déjà terminé" });
    const full = await loadCallSessionRaw(req.params.callId);
    const call = mapCallSessionRow(full || result.rows[0], req.user.id);
    callBridgeBroadcast(call.id, "call:accepted", { call });
    broadcastCallSessionToParticipants(call.id, "call:accepted").catch(() => {});
    res.json({ ok: true, call });
  } catch (error) {
    console.error("POST /online/calls/:callId/accept error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur acceptation appel" });
  }
});

app.post(["/online/calls/:callId/decline", "/online/calls/:callId/reject"], authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    const result = await pool.query(`
      UPDATE online_call_sessions
      SET status = 'declined', ended_at = COALESCE(ended_at, NOW()), updated_at = NOW()
      WHERE id = $1 AND status IN ('ringing','accepted')
      RETURNING *
    `, [String(req.params.callId || "")]);
    const full = await loadCallSessionRaw(req.params.callId);
    const call = mapCallSessionRow(full || result.rows[0] || loaded.row, req.user.id);
    callBridgeBroadcast(call.id, "call:declined", { call });
    broadcastCallSessionToParticipants(call.id, "call:declined").catch(() => {});
    res.json({ ok: true, call });
  } catch (error) {
    console.error("POST /online/calls/:callId/decline error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur refus appel" });
  }
});

app.post("/online/calls/:callId/end", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    const result = await pool.query(`
      UPDATE online_call_sessions
      SET status = 'ended', ended_at = COALESCE(ended_at, NOW()), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [String(req.params.callId || "")]);
    const full = await loadCallSessionRaw(req.params.callId);
    const call = mapCallSessionRow(full || result.rows[0] || loaded.row, req.user.id);
    callBridgeBroadcast(call.id, "call:ended", { call });
    broadcastCallSessionToParticipants(call.id, "call:ended").catch(() => {});
    res.json({ ok: true, call });
  } catch (error) {
    console.error("POST /online/calls/:callId/end error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur fin appel" });
  }
});

app.post("/online/calls/:callId/signal", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    const row = loaded.row;
    const toUserId = String(row.caller_user_id || "") === String(req.user.id || "") ? row.callee_user_id : row.caller_user_id;
    const rawType = String(req.body?.signalType || req.body?.type || req.body?.payload?.type || "candidate").trim().toLowerCase();
    const signalType = rawType === "ice" ? "candidate" : rawType;
    const allowed = new Set(["offer", "answer", "candidate", "renegotiate", "bye"]);
    if (!allowed.has(signalType)) return res.status(400).json({ ok: false, error: "Type de signal WebRTC invalide" });
    const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : req.body || {};
    const inserted = await pool.query(`
      INSERT INTO online_call_signals (id, call_id, from_user_id, to_user_id, signal_type, payload, created_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
      RETURNING *
    `, [uid("sig"), row.id, req.user.id, toUserId, signalType, JSON.stringify(payload)]);
    const signal = mapCallSignalRow(inserted.rows[0]);
    callBridgeBroadcast(row.id, "call:signal", { signal });
    broadcastCallSessionToParticipants(row.id, "call:signal", { signal }).catch(() => {});
    res.status(201).json({ ok: true, signal });
  } catch (error) {
    console.error("POST /online/calls/:callId/signal error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur signal WebRTC" });
  }
});

app.get("/online/calls/:callId/signals", authRequired, async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const loaded = await assertCallParticipant(req.params.callId, req.user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    const after = String(req.query?.after || "").trim();
    const afterDate = Number.isFinite(Date.parse(after)) ? new Date(after).toISOString() : "1970-01-01T00:00:00.000Z";
    const result = await pool.query(`
      SELECT *
      FROM online_call_signals
      WHERE call_id = $1
        AND to_user_id = $2
        AND created_at > $3::timestamptz
      ORDER BY created_at ASC
      LIMIT 100
    `, [String(req.params.callId || ""), req.user.id, afterDate]);
    res.json({ ok: true, signals: result.rows.map(mapCallSignalRow).filter(Boolean) });
  } catch (error) {
    console.error("GET /online/calls/:callId/signals error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture signaux WebRTC" });
  }
});

app.get("/online/calls/:callId/stream", async (req, res) => {
  try {
    await ensureCallBridgeSchema();
    const user = await resolveOnlineStreamUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "Session invalide" });
    const loaded = await assertCallParticipant(req.params.callId, user.id);
    if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
    const callId = String(req.params.callId || "").trim();

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let clients = callBridgeStreamClients.get(callId);
    if (!clients) {
      clients = new Set();
      callBridgeStreamClients.set(callId, clients);
    }
    clients.add(res);

    const call = mapCallSessionRow(loaded.row, user.id);
    res.write(`event: call:snapshot\n`);
    res.write(`data: ${JSON.stringify({ ok: true, type: "call:snapshot", callId, ts: nowIso(), call })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: ${JSON.stringify({ ok: true, type: "ping", callId, ts: nowIso() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) callBridgeStreamClients.delete(callId);
    });
  } catch (error) {
    console.error("GET /online/calls/:callId/stream error:", error);
    if (!res.headersSent) res.status(500).json({ ok: false, error: error.message || "Erreur stream appel" });
  }
});


// -----------------------------------------------------------------------------
// Compatibility aliases V1 — /online/private-messages
// Additif strict : conserve /online/messages/* et ajoute les endpoints appelés
// par la page Messagerie actuelle pour éviter les 404 côté front.
// -----------------------------------------------------------------------------
async function ensurePrivateMessagesCompatSchema() {
  if (typeof ensureMessagingCenterSchema === "function") {
    await ensureMessagingCenterSchema();
    return;
  }
  await pool.query(`
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
  `);
  await pool.query(`ALTER TABLE online_direct_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_pair_created ON online_direct_messages(from_user_id, to_user_id, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_to_unread ON online_direct_messages(to_user_id, read_at, created_at DESC);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_direct_messages_expires ON online_direct_messages(expires_at);`).catch(() => {});
  await purgeExpiredPrivateMessages(false);
}

function mapPrivateMessageCompatRow(row, currentUserId) {
  if (typeof mapDirectMessageRow === "function") return mapDirectMessageRow(row, currentUserId);
  const mine = String(row?.from_user_id || "") === String(currentUserId || "");
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    body: row.body || "",
    text: row.body || "",
    metadata: row.metadata || {},
    createdAt: row.created_at,
    readAt: row.read_at || null,
    mine,
    direction: mine ? "outgoing" : "incoming",
  };
}

app.get("/online/private-messages/count", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const result = await pool.query(`
      SELECT COUNT(*)::int AS unread
      FROM online_direct_messages
      WHERE to_user_id = $1
        AND read_at IS NULL
        AND deleted_by_to_at IS NULL
    `, [req.user.id]);
    const unread = Number(result.rows?.[0]?.unread || 0);
    res.json({ ok: true, unread, pending: unread });
  } catch (error) {
    console.error("GET /online/private-messages/count error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur compteur messages privés" });
  }
});

app.get("/online/private-messages", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const friendUserId = String(req.query?.friendUserId || req.query?.toUserId || req.query?.userId || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 80)));

    const params = friendUserId ? [req.user.id, friendUserId, limit] : [req.user.id, limit];
    const sql = friendUserId ? `
      SELECT m.*,
        fu.email AS from_email, fu.nickname AS from_nickname, fp.display_name AS from_display_name, fp.avatar_url AS from_avatar_url,
        tu.email AS to_email, tu.nickname AS to_nickname, tp.display_name AS to_display_name, tp.avatar_url AS to_avatar_url
      FROM online_direct_messages m
      JOIN users fu ON fu.id = m.from_user_id
      JOIN users tu ON tu.id = m.to_user_id
      LEFT JOIN profiles fp ON fp.user_id = fu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE ((m.from_user_id = $1 AND m.to_user_id = $2 AND m.deleted_by_from_at IS NULL)
          OR (m.from_user_id = $2 AND m.to_user_id = $1 AND m.deleted_by_to_at IS NULL))
      ORDER BY m.created_at DESC
      LIMIT $3
    ` : `
      SELECT m.*,
        fu.email AS from_email, fu.nickname AS from_nickname, fp.display_name AS from_display_name, fp.avatar_url AS from_avatar_url,
        tu.email AS to_email, tu.nickname AS to_nickname, tp.display_name AS to_display_name, tp.avatar_url AS to_avatar_url
      FROM online_direct_messages m
      JOIN users fu ON fu.id = m.from_user_id
      JOIN users tu ON tu.id = m.to_user_id
      LEFT JOIN profiles fp ON fp.user_id = fu.id
      LEFT JOIN profiles tp ON tp.user_id = tu.id
      WHERE (m.from_user_id = $1 AND m.deleted_by_from_at IS NULL)
         OR (m.to_user_id = $1 AND m.deleted_by_to_at IS NULL)
      ORDER BY m.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(sql, params);
    const messages = result.rows.reverse().map((row) => mapPrivateMessageCompatRow(row, req.user.id)).filter(Boolean);
    res.json({ ok: true, messages, items: messages });
  } catch (error) {
    console.error("GET /online/private-messages error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture messages privés" });
  }
});

app.post("/online/private-messages", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const targetUserId = String(req.body?.targetUserId || req.body?.toUserId || req.body?.friendUserId || req.body?.userId || "").trim();
    const body = String(req.body?.body || req.body?.text || req.body?.message || "").trim().slice(0, 4000);
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

    if (!targetUserId) return res.status(400).json({ ok: false, error: "Ami destinataire manquant" });
    if (!body) return res.status(400).json({ ok: false, error: "Message vide" });
    if (targetUserId === req.user.id) return res.status(400).json({ ok: false, error: "Impossible de s'envoyer un message à soi-même" });
    if (!(await areFriends(req.user.id, targetUserId))) {
      return res.status(403).json({ ok: false, error: "Messagerie autorisée uniquement avec un ami" });
    }
    const blockCheck = await assertUsersCanMessage(req.user.id, targetUserId);
    if (!blockCheck.ok) return res.status(403).json({ ok: false, error: blockCheck.error });

    const inserted = await pool.query(`
      INSERT INTO online_direct_messages (id, from_user_id, to_user_id, body, metadata, created_at, expires_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,NOW(),NOW() + ($6::text || ' hours')::interval)
      RETURNING *
    `, [uid("dm"), req.user.id, targetUserId, body, JSON.stringify(metadata || {}), String(Math.max(1, Math.min(168, PRIVATE_MESSAGE_TTL_HOURS)))]);

    const message = mapPrivateMessageCompatRow(inserted.rows[0], req.user.id);
    broadcastDirectMessageById(inserted.rows[0].id, "message:created").catch(() => {});
    res.status(201).json({ ok: true, message, item: message });
  } catch (error) {
    console.error("POST /online/private-messages error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur envoi message privé" });
  }
});

app.post("/online/private-messages/:id/read", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const id = String(req.params.id || "").trim();
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND to_user_id = $2
      RETURNING *
    `, [id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Message privé introuvable" });
    const message = mapPrivateMessageCompatRow(result.rows[0], req.user.id);
    res.json({ ok: true, message, item: message });
  } catch (error) {
    console.error("POST /online/private-messages/:id/read error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture message privé" });
  }
});


// Compat UI chat type Messenger : marquer tout un fil comme lu.
app.post("/online/private-messages/thread/:friendUserId/read", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const friendUserId = String(req.params.friendUserId || req.body?.friendUserId || req.body?.userId || "").trim();
    if (!friendUserId) return res.status(400).json({ ok: false, error: "Ami manquant" });
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE from_user_id = $1
        AND to_user_id = $2
        AND read_at IS NULL
        AND deleted_by_to_at IS NULL
      RETURNING *
    `, [friendUserId, req.user.id]);
    const messages = result.rows.map((row) => mapPrivateMessageCompatRow(row, req.user.id));
    res.json({ ok: true, updated: Number(result.rowCount || 0), messages, items: messages });
  } catch (error) {
    console.error("POST /online/private-messages/thread/:friendUserId/read error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture fil privé" });
  }
});

// Alias utilisé par certains clients frontend : PUT au lieu de POST.
app.put("/online/private-messages/:id/read", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const id = String(req.params.id || "").trim();
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND to_user_id = $2
      RETURNING *
    `, [id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: "Message privé introuvable" });
    const message = mapPrivateMessageCompatRow(result.rows[0], req.user.id);
    broadcastDirectMessageById(id, "message:read").catch(() => {});
    res.json({ ok: true, message, item: message });
  } catch (error) {
    console.error("PUT /online/private-messages/:id/read error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture message privé" });
  }
});

// Suppression locale Messenger-like : le message disparait uniquement pour l'utilisateur courant.
app.delete("/online/private-messages/:id", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "Message privé manquant" });
    const existing = await pool.query(`
      SELECT *
      FROM online_direct_messages
      WHERE id = $1
        AND (from_user_id = $2 OR to_user_id = $2)
      LIMIT 1
    `, [id, req.user.id]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ ok: false, error: "Message privé introuvable" });

    const mine = String(row.from_user_id || "") === String(req.user.id || "");
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET
        deleted_by_from_at = CASE WHEN $3::boolean THEN COALESCE(deleted_by_from_at, NOW()) ELSE deleted_by_from_at END,
        deleted_by_to_at = CASE WHEN $3::boolean THEN deleted_by_to_at ELSE COALESCE(deleted_by_to_at, NOW()) END
      WHERE id = $1
        AND (from_user_id = $2 OR to_user_id = $2)
      RETURNING *
    `, [id, req.user.id, mine]);
    const message = mapPrivateMessageCompatRow(result.rows[0], req.user.id);
    directMessageBroadcastToUser(String(row.from_user_id || ""), "messages:changed", { reason: "message:deleted", messageId: id });
    directMessageBroadcastToUser(String(row.to_user_id || ""), "messages:changed", { reason: "message:deleted", messageId: id });
    res.json({ ok: true, deleted: true, message, item: message });
  } catch (error) {
    console.error("DELETE /online/private-messages/:id error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression message privé" });
  }
});



// -----------------------------------------------------------------------------
// Messaging center V2 hardening — aliases fiables pour l'UI chat Messenger.
// Additif strict : aucune table supprimée, aucune route existante remplacée.
// -----------------------------------------------------------------------------
app.put("/online/private-messages/thread/:friendUserId/read", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const friendUserId = String(req.params.friendUserId || req.body?.friendUserId || req.body?.userId || "").trim();
    if (!friendUserId) return res.status(400).json({ ok: false, error: "Ami manquant" });
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE from_user_id = $1
        AND to_user_id = $2
        AND read_at IS NULL
        AND deleted_by_to_at IS NULL
      RETURNING *
    `, [friendUserId, req.user.id]);
    const messages = result.rows.map((row) => mapPrivateMessageCompatRow(row, req.user.id));
    res.json({ ok: true, read: Number(result.rowCount || 0), updated: Number(result.rowCount || 0), messages, items: messages });
  } catch (error) {
    console.error("PUT /online/private-messages/thread/:friendUserId/read error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture fil privé" });
  }
});

app.post("/online/private-messages/read-thread", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const friendUserId = String(req.body?.friendUserId || req.body?.userId || req.body?.toUserId || "").trim();
    if (!friendUserId) return res.status(400).json({ ok: false, error: "Ami manquant" });
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE from_user_id = $1
        AND to_user_id = $2
        AND read_at IS NULL
        AND deleted_by_to_at IS NULL
      RETURNING *
    `, [friendUserId, req.user.id]);
    const messages = result.rows.map((row) => mapPrivateMessageCompatRow(row, req.user.id));
    res.json({ ok: true, read: Number(result.rowCount || 0), updated: Number(result.rowCount || 0), messages, items: messages });
  } catch (error) {
    console.error("POST /online/private-messages/read-thread error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur lecture fil privé" });
  }
});

app.delete("/online/messages/:friendUserId/:messageId", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    const id = String(req.params.messageId || "").trim();
    const friendUserId = String(req.params.friendUserId || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "Message privé manquant" });
    const existing = await pool.query(`
      SELECT *
      FROM online_direct_messages
      WHERE id = $1
        AND ((from_user_id = $2 AND to_user_id = $3) OR (from_user_id = $3 AND to_user_id = $2))
      LIMIT 1
    `, [id, req.user.id, friendUserId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ ok: false, error: "Message privé introuvable" });
    const mine = String(row.from_user_id || "") === String(req.user.id || "");
    const result = await pool.query(`
      UPDATE online_direct_messages
      SET
        deleted_by_from_at = CASE WHEN $3::boolean THEN COALESCE(deleted_by_from_at, NOW()) ELSE deleted_by_from_at END,
        deleted_by_to_at = CASE WHEN $3::boolean THEN deleted_by_to_at ELSE COALESCE(deleted_by_to_at, NOW()) END
      WHERE id = $1
        AND (from_user_id = $2 OR to_user_id = $2)
      RETURNING *
    `, [id, req.user.id, mine]);
    const message = mapPrivateMessageCompatRow(result.rows[0], req.user.id);
    res.json({ ok: true, deleted: true, message, item: message });
  } catch (error) {
    console.error("DELETE /online/messages/:friendUserId/:messageId error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur suppression message privé" });
  }
});

app.get("/online/private-messages/conversations", authRequired, async (req, res) => {
  try {
    await ensurePrivateMessagesCompatSchema();
    // Réutilise la route NAS /online/messages/conversations au format attendu par les clients récents.
    const friendRows = await pool.query(`
      WITH friend_ids AS (
        SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS friend_user_id
        FROM friendships
        WHERE user_a_id = $1 OR user_b_id = $1
      ),
      last_messages AS (
        SELECT DISTINCT ON (
          CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END
        )
          CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END AS friend_user_id,
          m.*
        FROM online_direct_messages m
        WHERE ((m.from_user_id = $1 AND m.deleted_by_from_at IS NULL)
            OR (m.to_user_id = $1 AND m.deleted_by_to_at IS NULL))
        ORDER BY CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END, m.created_at DESC
      ),
      unread AS (
        SELECT from_user_id AS friend_user_id, COUNT(*)::int AS unread_count
        FROM online_direct_messages
        WHERE to_user_id = $1 AND read_at IS NULL AND deleted_by_to_at IS NULL
        GROUP BY from_user_id
      )
      SELECT f.friend_user_id,
             u.email, u.nickname, p.display_name, p.avatar_url,
             lm.id AS last_id, lm.body AS last_body, lm.created_at AS last_created_at, lm.read_at AS last_read_at,
             COALESCE(un.unread_count, 0)::int AS unread_count
      FROM friend_ids f
      JOIN users u ON u.id = f.friend_user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN last_messages lm ON lm.friend_user_id = f.friend_user_id
      LEFT JOIN unread un ON un.friend_user_id = f.friend_user_id
      ORDER BY COALESCE(lm.created_at, NOW() - INTERVAL '100 years') DESC, COALESCE(p.display_name, u.nickname) ASC
      LIMIT 200
    `, [req.user.id]);
    const conversations = friendRows.rows.map((row) => ({
      friend: {
        id: row.friend_user_id,
        userId: row.friend_user_id,
        email: row.email || null,
        nickname: row.nickname || null,
        displayName: row.display_name || row.nickname || null,
        avatarUrl: row.avatar_url || null,
      },
      unreadCount: Number(row.unread_count || 0),
      lastMessage: row.last_id ? {
        id: row.last_id,
        body: row.last_body || "",
        text: row.last_body || "",
        createdAt: row.last_created_at,
        readAt: row.last_read_at || null,
      } : null,
    }));
    res.json({ ok: true, conversations, items: conversations });
  } catch (error) {
    console.error("GET /online/private-messages/conversations error:", error);
    res.status(500).json({ ok: false, error: error.message || "Erreur conversations messages privés" });
  }
});


async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDbWithRetry() {
  for (let attempt = 1; attempt <= DB_INIT_ATTEMPTS; attempt += 1) {
    try {
      await initDb();
      await ensureBabyFootLeagueOnlineSchema();
      await ensureMessagingCenterSchema();
      await ensureCallBridgeSchema();
      const dbTime = await testDbConnection();
      dbReady = true;
      lastDbError = null;
      console.log(`✅ PostgreSQL connected ${dbTime}`);
      return true;
    } catch (error) {
      dbReady = false;
      lastDbError = error;
      console.error(`⚠️ DB init failed attempt ${attempt}/${DB_INIT_ATTEMPTS}:`, error?.message || error);
      await wait(Math.min(30000, 1000 * attempt));
    }
  }
  console.error("❌ DB init failed after all attempts. API stays alive for /health diagnostics.");
  return false;
}

async function start() {
  try {
    ensureDirSync(MEDIA_ROOT);
  } catch (error) {
    console.error("⚠️ MEDIA_ROOT init failed:", error?.message || error);
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Multisports NAS API listening on http://${HOST}:${PORT}`);
    console.log(`🗂️ MEDIA_ROOT=${MEDIA_ROOT}`);
    console.log(`🐘 PGHOST=${process.env.PGHOST || "multisports-postgres"}:${process.env.PGPORT || 5432} DB=${process.env.PGDATABASE || "multisports"} USER=${process.env.PGUSER || "postgres"}`);
  });

  initDbWithRetry().catch((error) => {
    lastDbError = error;
    dbReady = false;
    console.error("❌ initDbWithRetry fatal error:", error?.stack || error?.message || error);
  });
}

start();
