// @ts-nocheck
// Stockage de sauvegardes R2 direct, sans PostgreSQL ni NAS.

interface Env {
  USER_DATA_BUCKET?: R2Bucket;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  JWT_SECRET?: string;
  FOUNDER_EMAILS?: string;
  FREE_CLOUD_QUOTA_BYTES?: string;
  CLOUD_OBJECT_MAX_UPLOAD_BYTES?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET_STORAGE?: string;
  STRIPE_STORAGE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STORAGE_STARTER_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_STARTER_YEARLY?: string;
  STRIPE_PRICE_STORAGE_PLAYER_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_PLAYER_YEARLY?: string;
  STRIPE_PRICE_STORAGE_PLUS_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_PLUS_YEARLY?: string;
  STRIPE_PRICE_STORAGE_PRO_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_PRO_YEARLY?: string;
  STRIPE_PRICE_STORAGE_CLUB_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_CLUB_YEARLY?: string;
  STRIPE_PRICE_STORAGE_TITAN_MONTHLY?: string;
  STRIPE_PRICE_STORAGE_TITAN_YEARLY?: string;
}

type BackupRow = {
  id: string;
  objectKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sizeBytes: number;
  checksum: string;
  summary: Record<string, any>;
  metadata: Record<string, any>;
};

type Manifest = {
  version: 2;
  userId: string;
  updatedAt: string;
  backups: BackupRow[];
  /** Clés R2 à supprimer au prochain passage si un delete précédent a échoué. */
  cleanupKeys?: string[];
};

type StorageEntitlement = {
  version: 1;
  userId: string;
  planId: string;
  quotaBytes: number;
  baseUsedBytes?: number;
  billingStatus: string;
  billingExempt: boolean;
  storageProvider: string;
  updatedAt: string;
  currentPeriodEnd?: string | null;
};

const R2_BACKUP_RETENTION_TOTAL = 2; // courante + précédente
const DEFAULT_FREE_QUOTA_BYTES = 0;

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-multisports-storage-route": "cloudflare-pages-r2-direct",
    },
  });
}

function b64urlToBytes(input: string): Uint8Array {
  const raw = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJwtPart(input: string): any {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(input))); } catch { return null; }
}

function unverifiedJwtPayload(token: string): any {
  const parts = String(token || "").split(".");
  return parts.length === 3 ? decodeJwtPart(parts[1]) : null;
}

function looksLikeSupabaseJwt(token: string): boolean {
  const payload = unverifiedJwtPayload(token);
  const issuer = String(payload?.iss || "").toLowerCase();
  return !!payload?.sub && (issuer.includes("supabase.co/auth/v1") || String(payload?.role || "") === "authenticated");
}

async function verifyHs256Jwt(token: string, secret: string): Promise<any | null> {
  const parts = token.split(".");
  if (parts.length !== 3 || !secret) return null;
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || header.alg !== "HS256" || !payload?.sub) return null;
  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  return ok ? payload : null;
}

function authConfigStatus(env: Env) {
  return {
    supabaseAuthConfigured: !!(String(env.SUPABASE_URL || "").trim() && String(env.SUPABASE_ANON_KEY || "").trim()),
    nasJwtConfigured: !!String(env.JWT_SECRET || "").trim(),
    acceptedAuthModes: [
      ...(String(env.SUPABASE_URL || "").trim() && String(env.SUPABASE_ANON_KEY || "").trim() ? ["supabase"] : []),
      ...(String(env.JWT_SECRET || "").trim() ? ["nas-jwt"] : []),
    ],
  };
}

async function resolveIdentity(request: Request, env: Env): Promise<{ userId: string; email: string; authMode: "supabase" | "nas-jwt" }> {
  const raw = request.headers.get("authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!token) throw Object.assign(new Error("Session requise."), { status: 401, code: "session_required" });

  const tokenLooksSupabase = looksLikeSupabaseJwt(token);
  const jwtSecret = String(env.JWT_SECRET || "").trim();

  // JWT NAS : vérification locale immédiate, sans requête réseau et sans NAS.
  // On le tente en premier pour les tokens non-Supabase.
  if (!tokenLooksSupabase) {
    if (!jwtSecret) {
      throw Object.assign(new Error("JWT_SECRET absent dans Cloudflare Pages."), {
        status: 503,
        code: "nas_jwt_secret_missing",
      });
    }
    const payload = await verifyHs256Jwt(token, jwtSecret);
    if (payload?.sub) {
      return {
        userId: String(payload.sub),
        email: String(payload.email || "").trim().toLowerCase(),
        authMode: "nas-jwt",
      };
    }
  }

  // JWT Supabase : vérification auprès du projet Supabase, toujours sans NAS.
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(env.SUPABASE_ANON_KEY || "");
  if (supabaseUrl && anonKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4_000);
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, authorization: `Bearer ${token}` },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      const user: any = response.ok ? await response.json() : null;
      if (user?.id) {
        const meta = user.user_metadata || {};
        const userId = String(meta.canonical_user_id || meta.nas_user_id || meta.multisports_user_id || user.id).trim();
        return {
          userId,
          email: String(user.email || "").trim().toLowerCase(),
          authMode: "supabase",
        };
      }
    } catch {}
  } else if (tokenLooksSupabase) {
    throw Object.assign(new Error("Supabase Auth n'est pas configuré dans Cloudflare Pages."), {
      status: 503,
      code: "supabase_auth_not_configured",
    });
  }

  // Dernier essai HS256 : utile si le token ne porte pas de marqueur clair.
  if (jwtSecret) {
    const payload = await verifyHs256Jwt(token, jwtSecret);
    if (payload?.sub) {
      return {
        userId: String(payload.sub),
        email: String(payload.email || "").trim().toLowerCase(),
        authMode: "nas-jwt",
      };
    }
  }

  throw Object.assign(new Error("Session invalide."), { status: 401, code: "invalid_session" });
}

function safeId(value: string): string {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);
}

function manifestKey(userId: string): string {
  return `users/${safeId(userId)}/backups/manifest-v1.json`;
}

function backupKey(userId: string, id: string): string {
  return `users/${safeId(userId)}/backups/${safeId(id)}.json`;
}

function avatarFallbackKey(userId: string, profileId: string): string {
  return `users/${safeId(userId)}/avatars/${safeId(profileId)}.json`;
}

function mediaFallbackKey(userId: string, mediaKey: string): string {
  return `users/${safeId(userId)}/media-fallback/${safeId(mediaKey)}.json`;
}

function mediaFallbackManifestKey(userId: string): string {
  return `users/${safeId(userId)}/media-fallback/manifest-v2.json`;
}

function nasUserMirrorKey(userId: string): string {
  return `users/${safeId(userId)}/nas-mirror/user-v1.json`;
}

function entitlementKey(userId: string): string {
  return `users/${safeId(userId)}/billing/storage-entitlement-v1.json`;
}

type MediaMirrorManifest = {
  version: 2;
  userId: string;
  updatedAt: string;
  media: Record<string, { key: string; kind: string; sizeBytes: number; checksum: string; updatedAtMs: number; sourceUrl?: string | null }>;
};

async function readMediaMirrorManifest(bucket: R2Bucket, userId: string): Promise<MediaMirrorManifest> {
  const object = await bucket.get(mediaFallbackManifestKey(userId));
  if (!object) return { version: 2, userId, updatedAt: new Date(0).toISOString(), media: {} };
  try {
    const parsed: any = JSON.parse(await object.text());
    return {
      version: 2,
      userId,
      updatedAt: String(parsed?.updatedAt || ""),
      media: parsed?.media && typeof parsed.media === "object" ? parsed.media : {},
    };
  } catch {
    return { version: 2, userId, updatedAt: new Date(0).toISOString(), media: {} };
  }
}

async function writeMediaMirrorManifest(bucket: R2Bucket, manifest: MediaMirrorManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await bucket.put(mediaFallbackManifestKey(manifest.userId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
  });
}

async function readStorageEntitlement(bucket: R2Bucket, userId: string): Promise<StorageEntitlement | null> {
  const object = await bucket.get(entitlementKey(userId));
  if (!object) return null;
  try {
    const parsed: any = JSON.parse(await object.text());
    const quotaBytes = Number(parsed?.quotaBytes || 0);
    if (!parsed || !Number.isFinite(quotaBytes) || quotaBytes <= 0) return null;
    return {
      version: 1,
      userId: String(parsed.userId || userId),
      planId: String(parsed.planId || "free_test_100mb"),
      quotaBytes,
      baseUsedBytes: Math.max(0, Number(parsed?.baseUsedBytes || 0)),
      billingStatus: String(parsed.billingStatus || "free"),
      billingExempt: parsed.billingExempt === true,
      storageProvider: String(parsed.storageProvider || "cloud_r2"),
      updatedAt: String(parsed.updatedAt || ""),
      currentPeriodEnd: parsed.currentPeriodEnd == null ? null : String(parsed.currentPeriodEnd),
    };
  } catch {
    return null;
  }
}

function isEntitlementActive(entitlement: StorageEntitlement | null): boolean {
  if (!entitlement) return false;
  if (entitlement.billingExempt) return true;
  return ["active", "trialing"].includes(String(entitlement.billingStatus || "").toLowerCase());
}

async function resolveStoragePlan(bucket: R2Bucket, identity: { userId: string; email: string }, env: Env) {
  // R2 est une option PREMIUM pour tout le monde, y compris le compte fondateur.
  // Le statut fondateur donne accès au NAS privé, jamais un passe-droit R2 qui
  // pourrait générer une facture Cloudflare à l'insu de l'utilisateur.
  const entitlement = await readStorageEntitlement(bucket, identity.userId);
  if (isEntitlementActive(entitlement)) {
    return {
      planId: entitlement!.planId,
      quotaBytes: entitlement!.billingExempt ? Number.MAX_SAFE_INTEGER : entitlement!.quotaBytes,
      billingStatus: entitlement!.billingStatus,
      baseUsedBytes: Math.max(0, Number(entitlement!.baseUsedBytes || 0)),
      billingExempt: entitlement!.billingExempt,
      source: "entitlement" as const,
    };
  }
  return {
    planId: "free_test_100mb",
    quotaBytes: 0,
    billingStatus: "locked",
    baseUsedBytes: 0,
    billingExempt: false,
    source: "fallback_free" as const,
  };
}


const MB = 1024 * 1024;
const GB = 1024 * MB;
const TB = 1024 * GB;
const STORAGE_BILLING_PLANS: Record<string, { id: string; label: string; quotaBytes: number; monthlyEnv: keyof Env; yearlyEnv: keyof Env }> = {
  starter_500mb: { id: "starter_500mb", label: "Starter 500 Mo", quotaBytes: 500 * MB, monthlyEnv: "STRIPE_PRICE_STORAGE_STARTER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_STARTER_YEARLY" },
  player_5gb: { id: "player_5gb", label: "Player 5 Go", quotaBytes: 5 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_YEARLY" },
  plus_25gb: { id: "plus_25gb", label: "Plus 25 Go", quotaBytes: 25 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PLUS_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLUS_YEARLY" },
  pro_100gb: { id: "pro_100gb", label: "Pro 100 Go", quotaBytes: 100 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PRO_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PRO_YEARLY" },
  club_500gb: { id: "club_500gb", label: "Club 500 Go", quotaBytes: 500 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_CLUB_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_CLUB_YEARLY" },
  titan_2tb: { id: "titan_2tb", label: "Titan 2 To", quotaBytes: 2 * TB, monthlyEnv: "STRIPE_PRICE_STORAGE_TITAN_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_TITAN_YEARLY" },
};
const PAID_STORAGE_PLAN_IDS = new Set(Object.keys(STORAGE_BILLING_PLANS));

function canWritePaidR2(plan: any): boolean {
  return PAID_STORAGE_PLAN_IDS.has(String(plan?.planId || "")) && ["active", "trialing"].includes(String(plan?.billingStatus || "").toLowerCase());
}

async function writeStorageEntitlement(bucket: R2Bucket, args: {
  userId: string; planId: string; billingStatus: string; currentPeriodEnd?: string | null; billingExempt?: boolean;
}): Promise<StorageEntitlement> {
  const plan = STORAGE_BILLING_PLANS[String(args.planId || "")];
  if (!plan && !args.billingExempt) throw new Error("Plan stockage inconnu.");
  const entitlement: StorageEntitlement = {
    version: 1,
    userId: args.userId,
    planId: args.billingExempt ? "founder_nas" : plan.id,
    quotaBytes: args.billingExempt ? Number.MAX_SAFE_INTEGER : plan.quotaBytes,
    baseUsedBytes: 0,
    billingStatus: String(args.billingStatus || "locked"),
    billingExempt: args.billingExempt === true,
    storageProvider: "cloud_r2",
    updatedAt: new Date().toISOString(),
    currentPeriodEnd: args.currentPeriodEnd || null,
  };
  await bucket.put(entitlementKey(args.userId), JSON.stringify(entitlement), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { userId: args.userId, planId: entitlement.planId, billingStatus: entitlement.billingStatus },
  });
  return entitlement;
}

async function stripeRequest(env: Env, pathname: string, init?: { method?: string; form?: URLSearchParams }): Promise<any> {
  const secret = String(env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) throw Object.assign(new Error("STRIPE_SECRET_KEY absent dans Cloudflare Pages."), { status: 503, code: "stripe_secret_missing" });
  const response = await fetch(`https://api.stripe.com${pathname}`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(init?.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init?.form || undefined,
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const err: any = new Error(String(data?.error?.message || text || `Stripe HTTP ${response.status}`));
    err.status = 502;
    err.code = String(data?.error?.code || "stripe_request_failed");
    throw err;
  }
  return data;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeWebhook(rawBody: string, header: string, env: Env): Promise<boolean> {
  const secret = String(env.STRIPE_WEBHOOK_SECRET_STORAGE || env.STRIPE_STORAGE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header) return false;
  const fields = header.split(",").map((v) => v.trim());
  const timestamp = fields.find((v) => v.startsWith("t="))?.slice(2) || "";
  const signatures = fields.filter((v) => v.startsWith("v1=")).map((v) => v.slice(3));
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((sig) => timingSafeEqualHex(expected, sig));
}

async function activateEntitlementFromStripeSession(bucket: R2Bucket, session: any, env: Env, expectedUserId?: string): Promise<{ entitlement: StorageEntitlement; subscription?: any }> {
  const metadata = session?.metadata || {};
  const userId = String(metadata.userId || metadata.user_id || session?.client_reference_id || "").trim();
  const planId = String(metadata.planId || metadata.plan_id || "").trim();
  if (!userId || !STORAGE_BILLING_PLANS[planId]) throw Object.assign(new Error("Session Stripe sans utilisateur/plan stockage valide."), { status: 400, code: "stripe_session_metadata_invalid" });
  if (expectedUserId && userId !== expectedUserId) throw Object.assign(new Error("Cette session Stripe n'appartient pas au compte connecté."), { status: 403, code: "stripe_session_user_mismatch" });
  let subscription: any = null;
  const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id;
  if (subscriptionId) subscription = await stripeRequest(env, `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const billingStatus = String(subscription?.status || (session?.payment_status === "paid" ? "active" : "pending"));
  if (!["active", "trialing"].includes(billingStatus)) throw Object.assign(new Error(`Abonnement Stripe non actif (${billingStatus}).`), { status: 402, code: "premium_not_active" });
  const periodEnd = subscription?.current_period_end ? new Date(Number(subscription.current_period_end) * 1000).toISOString() : null;
  const entitlement = await writeStorageEntitlement(bucket, { userId, planId, billingStatus, currentPeriodEnd: periodEnd });
  return { entitlement, subscription };
}

async function syncEntitlementFromStripeSubscription(bucket: R2Bucket, subscription: any): Promise<StorageEntitlement | null> {
  const metadata = subscription?.metadata || {};
  const userId = String(metadata.userId || metadata.user_id || "").trim();
  const planId = String(metadata.planId || metadata.plan_id || "").trim();
  if (!userId || !STORAGE_BILLING_PLANS[planId]) return null;
  const billingStatus = String(subscription?.status || "canceled").toLowerCase();
  const periodEnd = subscription?.current_period_end
    ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
    : null;
  return writeStorageEntitlement(bucket, { userId, planId, billingStatus, currentPeriodEnd: periodEnd });
}

function sortBackupsNewestFirst(rows: BackupRow[]): BackupRow[] {
  return [...rows].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
}

function activeBackups(rows: BackupRow[]): BackupRow[] {
  return sortBackupsNewestFirst(rows.filter((row) => !row.deletedAt));
}

async function retryPendingCleanup(bucket: R2Bucket, manifest: Manifest): Promise<void> {
  const pending = Array.from(new Set((manifest.cleanupKeys || []).filter(Boolean)));
  if (!pending.length) return;

  // V7 : ne plus supprimer séquentiellement les anciens objets.
  // Sur mobile, plusieurs deletes R2 en série pouvaient rallonger chaque requête.
  const results = await Promise.allSettled(
    pending.map((key) => bucket.delete(key))
  );
  const failed = pending.filter((_, index) => results[index]?.status === "rejected");

  if (failed.length !== pending.length) {
    manifest.cleanupKeys = failed;
    await writeManifest(bucket, manifest);
  }
}

async function cleanupLegacyFullBackups(bucket: R2Bucket, userId: string): Promise<number> {
  // Nettoyage ciblé des anciens backups complets créés par l'ancien écran
  // "Cloud Sync V1". Ne touche PAS aux sauvegardes unitaires de parties
  // (backups/matches_v1) ni au snapshot auto_latest.
  const prefix = `users/${safeId(userId)}/backups/cloud_sync_v1/`;
  let cursor: string | undefined = undefined;
  let deleted = 0;
  for (let page = 0; page < 10; page += 1) {
    const listed: any = await bucket.list({ prefix, cursor, limit: 1000 });
    const keys = Array.isArray(listed?.objects) ? listed.objects.map((o: any) => String(o?.key || "")).filter(Boolean) : [];
    if (keys.length) {
      await Promise.all(keys.map(async (key: string) => {
        try { await bucket.delete(key); deleted += 1; } catch {}
      }));
    }
    if (!listed?.truncated || !listed?.cursor) break;
    cursor = String(listed.cursor);
  }
  return deleted;
}

function backupTimestampFromObjectKey(key: string): number {
  const match = String(key || "").match(/\/r2b_(\d{10,})_[a-zA-Z0-9]+\.json$/);
  const value = Number(match?.[1] || 0);
  return Number.isFinite(value) ? value : 0;
}

async function cleanupOrphanedGenerationalBackups(bucket: R2Bucket, userId: string): Promise<number> {
  // Filet de sécurité : d'anciens déploiements ou une interruption réseau peuvent
  // laisser des objets r2b_* qui ne figurent plus dans le manifeste. Ils consomment
  // alors du quota sans être restaurables. On les purge, mais uniquement s'ils sont
  // clairement plus anciens que la génération "précédente" du manifeste relu.
  // Cette borne temporelle évite qu'un waitUntil d'une sauvegarde A ne supprime une
  // sauvegarde B créée juste après en parallèle.
  const latestManifest = await readManifest(bucket, userId);
  const retained = activeBackups(latestManifest.backups).slice(0, R2_BACKUP_RETENTION_TOTAL);
  const retainedKeys = new Set(retained.map((row) => row.objectKey));
  const retainedTimes = retained
    .map((row) => Date.parse(row.updatedAt || row.createdAt || ""))
    .filter((value) => Number.isFinite(value) && value > 0);
  const safeCutoff = retainedTimes.length ? Math.min(...retainedTimes) : Date.now();
  const prefix = `users/${safeId(userId)}/backups/`;
  let cursor: string | undefined = undefined;
  let deleted = 0;

  for (let page = 0; page < 10; page += 1) {
    const listed: any = await bucket.list({ prefix, cursor, limit: 1000 });
    const candidates = (Array.isArray(listed?.objects) ? listed.objects : [])
      .map((object: any) => String(object?.key || ""))
      .filter((key: string) => key.startsWith(`${prefix}r2b_`) && key.endsWith(".json"))
      .filter((key: string) => !retainedKeys.has(key))
      .filter((key: string) => {
        const timestamp = backupTimestampFromObjectKey(key);
        return timestamp > 0 && timestamp < safeCutoff;
      });

    if (candidates.length) {
      const results = await Promise.allSettled(candidates.map((key: string) => bucket.delete(key)));
      deleted += results.filter((result) => result.status === "fulfilled").length;
    }
    if (!listed?.truncated || !listed?.cursor) break;
    cursor = String(listed.cursor);
  }
  return deleted;
}

function usagePayload(manifest: Manifest, plan: any) {
  const backupBytes = activeBackups(manifest.backups).reduce((sum, row) => sum + Number(row.sizeBytes || 0), 0);
  const baseUsedBytes = Math.max(0, Number(plan.baseUsedBytes || 0));
  const usedBytes = baseUsedBytes + backupBytes;
  const quotaBytes = Number(plan.quotaBytes || 0);
  return {
    usedBytes,
    backupBytes,
    baseUsedBytes,
    quotaBytes,
    remainingBytes: quotaBytes >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Math.max(0, quotaBytes - usedBytes),
    percentUsed: quotaBytes > 0 && quotaBytes < Number.MAX_SAFE_INTEGER ? Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100)) : 0,
    planId: String(plan.planId || "free_test_100mb"),
    billingStatus: String(plan.billingStatus || "free"),
    billingExempt: plan.billingExempt === true,
    writeAllowed: ["active", "trialing"].includes(String(plan.billingStatus || "").toLowerCase()) && PAID_STORAGE_PLAN_IDS.has(String(plan.planId || "")),
    premiumRequired: !(["active", "trialing"].includes(String(plan.billingStatus || "").toLowerCase()) && PAID_STORAGE_PLAN_IDS.has(String(plan.planId || ""))),
    planSource: String(plan.source || "unknown"),
    retainedBackups: activeBackups(manifest.backups).length,
    retentionTotal: R2_BACKUP_RETENTION_TOTAL,
  };
}

async function readManifest(bucket: R2Bucket, userId: string): Promise<Manifest> {
  const object = await bucket.get(manifestKey(userId));
  if (!object) return { version: 2, userId, updatedAt: new Date(0).toISOString(), backups: [], cleanupKeys: [] };
  try {
    const parsed = JSON.parse(await object.text());
    return {
      version: 2,
      userId,
      updatedAt: String(parsed?.updatedAt || ""),
      backups: Array.isArray(parsed?.backups) ? parsed.backups : [],
      cleanupKeys: Array.isArray(parsed?.cleanupKeys) ? parsed.cleanupKeys.filter(Boolean) : [],
    };
  } catch {
    return { version: 2, userId, updatedAt: new Date(0).toISOString(), backups: [], cleanupKeys: [] };
  }
}

async function writeManifest(bucket: R2Bucket, manifest: Manifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await bucket.put(manifestKey(manifest.userId), JSON.stringify(manifest), { httpMetadata: { contentType: "application/json" } });
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function routeParts(params: any): string[] {
  const raw = Array.isArray(params?.path) ? params.path.join("/") : String(params?.path || "");
  return raw.split("/").map((v) => v.trim()).filter(Boolean);
}


export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    const parts = routeParts(params);
    const method = request.method.toUpperCase();
    const bucket = env.USER_DATA_BUCKET;

    // Route de diagnostic publique : elle ne donne aucun secret, mais permet de
    // vérifier le binding et les deux modes d'authentification depuis le navigateur.
    if (method === "GET" && parts.length === 1 && parts[0] === "status") {
      const auth = authConfigStatus(env);
      return json({
        ok: !!bucket,
        route: "cloudflare-pages-r2-direct",
        binding: "USER_DATA_BUCKET",
        bucketReady: !!bucket,
        ...auth,
        retention: { current: 1, previous: 1, total: R2_BACKUP_RETENTION_TOTAL, autoCleanup: true },
        paidPlans: { supported: true, writePolicy: "premium_required", freeWriteQuotaBytes: 0, entitlementSource: "R2 private entitlement written after Stripe confirmation" },
        code: bucket ? undefined : "r2_binding_missing",
        message: bucket
          ? "Pages Function R2 prête."
          : "Le binding USER_DATA_BUCKET doit pointer vers multisports-user-data, puis le projet Pages doit être redéployé.",
      }, bucket ? 200 : 503);
    }

    if (!bucket) return json({
      ok: false,
      code: "r2_binding_missing",
      error: "Binding R2 USER_DATA_BUCKET manquant.",
      message: "Le projet Cloudflare Pages doit lier USER_DATA_BUCKET au bucket multisports-user-data puis être redéployé.",
    }, 503);

    // Stripe appelle ce webhook sans session utilisateur. La signature Stripe
    // est donc vérifiée AVANT toute résolution d'identité applicative.
    if (method === "POST" && parts.length === 2 && parts[0] === "billing" && parts[1] === "webhook") {
      const rawBody = await request.text();
      const signature = String(request.headers.get("stripe-signature") || "");
      const verified = await verifyStripeWebhook(rawBody, signature, env);
      if (!verified) return json({ ok: false, code: "stripe_webhook_signature_invalid", error: "Signature Stripe invalide." }, 400);

      let event: any = null;
      try { event = JSON.parse(rawBody); } catch { return json({ ok: false, code: "stripe_webhook_json_invalid", error: "Webhook Stripe illisible." }, 400); }
      const eventType = String(event?.type || "");
      const object = event?.data?.object || {};

      try {
        if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
          await activateEntitlementFromStripeSession(bucket, object, env).catch(async (error: any) => {
            // Une session peut être confirmée avant que l'abonnement soit actif.
            // On enregistre alors un état non-écrivable; un événement subscription.updated
            // activera automatiquement le droit R2 quelques instants plus tard.
            const metadata = object?.metadata || {};
            const userId = String(metadata.userId || object?.client_reference_id || "").trim();
            const planId = String(metadata.planId || "").trim();
            if (userId && STORAGE_BILLING_PLANS[planId]) {
              await writeStorageEntitlement(bucket, { userId, planId, billingStatus: "pending" });
              return;
            }
            throw error;
          });
        } else if (eventType === "customer.subscription.updated" || eventType === "customer.subscription.created" || eventType === "customer.subscription.deleted") {
          await syncEntitlementFromStripeSubscription(bucket, object);
        }
      } catch (error: any) {
        // Réponse 200 intentionnelle : l'état reste verrouillé si la synchro est
        // incomplète et on évite une tempête de retries Stripe coûteuse/inutile.
        return json({ ok: true, received: true, eventType, synchronized: false, warning: String(error?.message || error || "sync_failed") });
      }
      return json({ ok: true, received: true, eventType, synchronized: true });
    }

    const identity = await resolveIdentity(request, env);

    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "status" && method === "GET") {
      const allPriceEnv = Object.values(STORAGE_BILLING_PLANS).flatMap((plan) => [plan.monthlyEnv, plan.yearlyEnv]);
      const missingEnv = allPriceEnv.filter((key) => !String(env[key] || "").trim()).map(String);
      const secret = String(env.STRIPE_SECRET_KEY || "").trim();
      const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET_STORAGE || env.STRIPE_STORAGE_WEBHOOK_SECRET || "").trim();
      let verified = false;
      let verifyError = "";
      if (new URL(request.url).searchParams.get("verify") === "1" && secret) {
        try { await stripeRequest(env, "/v1/account"); verified = true; } catch (error: any) { verifyError = String(error?.message || error || "Stripe inaccessible"); }
      }
      return json({
        ok: true,
        configured: !!secret && missingEnv.length === 0,
        provider: "stripe",
        mode: secret.startsWith("sk_live_") ? "live" : secret.startsWith("sk_test_") ? "test" : secret ? "unknown" : "missing",
        secretKeyConfigured: !!secret,
        priceCount: allPriceEnv.length,
        configuredPriceCount: allPriceEnv.length - missingEnv.length,
        missingEnv,
        webhookStorageConfigured: !!webhookSecret,
        webhookSecretEnvName: env.STRIPE_WEBHOOK_SECRET_STORAGE ? "STRIPE_WEBHOOK_SECRET_STORAGE" : env.STRIPE_STORAGE_WEBHOOK_SECRET ? "STRIPE_STORAGE_WEBHOOK_SECRET" : null,
        webhookEndpoint: "/api/storage/backups/billing/webhook",
        checkoutEndpoint: "/api/storage/backups/billing/checkout",
        verified: new URL(request.url).searchParams.get("verify") === "1" ? verified : undefined,
        verifyError: verifyError || undefined,
      });
    }

    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "checkout" && method === "POST") {
      const body: any = await request.json().catch(() => ({}));
      const planId = String(body?.planId || "").trim();
      const interval = String(body?.interval || "monthly").trim() === "yearly" ? "yearly" : "monthly";
      const plan = STORAGE_BILLING_PLANS[planId];
      if (!plan) return json({ ok: false, code: "premium_plan_required", error: "Choisis une offre Cloud R2 PREMIUM." }, 400);
      const priceEnv = interval === "yearly" ? plan.yearlyEnv : plan.monthlyEnv;
      const priceId = String(env[priceEnv] || "").trim();
      if (!priceId) return json({ ok: false, code: "stripe_price_missing", missingEnv: String(priceEnv), error: `Prix Stripe non configuré (${String(priceEnv)}).` }, 503);

      const requestUrl = new URL(request.url);
      const origin = requestUrl.origin;
      const successUrl = String(body?.successUrl || `${origin}/#/settings?account=storage&storage_checkout=success&session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = String(body?.cancelUrl || `${origin}/#/settings?account=storage&storage_checkout=cancel`);
      const form = new URLSearchParams();
      form.set("mode", "subscription");
      form.set("success_url", successUrl);
      form.set("cancel_url", cancelUrl);
      form.set("line_items[0][price]", priceId);
      form.set("line_items[0][quantity]", "1");
      form.set("client_reference_id", identity.userId);
      form.set("allow_promotion_codes", "true");
      form.set("metadata[feature]", "storage_r2");
      form.set("metadata[userId]", identity.userId);
      form.set("metadata[planId]", planId);
      form.set("metadata[interval]", interval);
      form.set("subscription_data[metadata][feature]", "storage_r2");
      form.set("subscription_data[metadata][userId]", identity.userId);
      form.set("subscription_data[metadata][planId]", planId);
      if (identity.email) form.set("customer_email", identity.email);
      const session = await stripeRequest(env, "/v1/checkout/sessions", { method: "POST", form });
      await writeStorageEntitlement(bucket, { userId: identity.userId, planId, billingStatus: "pending" });
      return json({ ok: true, url: session?.url, sessionId: session?.id, planId, interval, stripeMode: String(env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test", priceId });
    }

    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "verify" && method === "GET") {
      const sessionId = String(new URL(request.url).searchParams.get("session_id") || "").trim();
      if (!sessionId) return json({ ok: false, code: "stripe_session_missing", error: "session_id Stripe manquant." }, 400);
      const session = await stripeRequest(env, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
      const activated = await activateEntitlementFromStripeSession(bucket, session, env, identity.userId);
      const manifest = await readManifest(bucket, identity.userId);
      const plan = await resolveStoragePlan(bucket, identity, env);
      return json({ ok: true, activated: true, entitlement: activated.entitlement, plan, usage: usagePayload(manifest, plan) });
    }

    // Miroir serveur NAS publié automatiquement par le backend Node.
    // Lecture indépendante du NAS/PostgreSQL : permet de restaurer profil + store
    // lorsque le QNAP est indisponible.
    if (method === "GET" && parts.length === 2 && parts[0] === "mirror" && parts[1] === "user") {
      const object = await bucket.get(nasUserMirrorKey(identity.userId));
      if (!object) return json({ ok: false, code: "nas_user_mirror_missing", error: "Miroir utilisateur R2 introuvable." }, 404);
      try {
        const mirror = JSON.parse(await object.text());
        return json({ ok: true, mirror, authMode: identity.authMode });
      } catch {
        return json({ ok: false, code: "nas_user_mirror_invalid", error: "Miroir utilisateur R2 illisible." }, 500);
      }
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "media-manifest") {
      const manifest = await readMediaMirrorManifest(bucket, identity.userId);
      const rows = Object.values(manifest.media || {});
      const totalBytes = rows.reduce((sum: number, row: any) => sum + Number(row?.sizeBytes || 0), 0);
      return json({
        ok: true,
        manifest,
        audit: { total: rows.length, totalBytes, updatedAt: manifest.updatedAt },
        authMode: identity.authMode,
      });
    }

    // -----------------------------------------------------------------------
    // MEDIA FAILOVER R2 GENERIQUE
    // Photos de sets, logos, couvertures et autres images créées/importées par
    // l'utilisateur. Un objet par clé stable, totalement indépendant du NAS.
    // -----------------------------------------------------------------------
    if (parts.length === 2 && parts[0] === "media") {
      const mediaKey = safeId(parts[1]);
      if (!mediaKey) return json({ ok: false, error: "Clé média invalide." }, 400);
      const key = mediaFallbackKey(identity.userId, mediaKey);

      if (method === "GET") {
        const object = await bucket.get(key);
        if (!object) return json({ ok: false, code: "media_fallback_missing", error: "Média R2 introuvable." }, 404);
        try {
          const payload: any = JSON.parse(await object.text());
          return json({ ok: true, media: payload, authMode: identity.authMode });
        } catch {
          return json({ ok: false, code: "media_fallback_invalid", error: "Média R2 illisible." }, 500);
        }
      }

      if (method === "POST") {
        const mediaPlan = await resolveStoragePlan(bucket, identity, env);
        if (!canWritePaidR2(mediaPlan)) return json({
          ok: false,
          code: "premium_required",
          error: "Cloud R2 verrouillé : une offre PREMIUM active est requise pour toute nouvelle écriture.",
          usage: usagePayload(await readManifest(bucket, identity.userId), mediaPlan),
        }, 402);
        const body: any = await request.json();
        const dataUrl = String(body?.dataUrl || "").trim();
        if (!/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(dataUrl)) {
          return json({ ok: false, error: "Image de secours invalide." }, 400);
        }
        const sizeBytes = new TextEncoder().encode(dataUrl).byteLength;
        // Le miroir doit conserver l'image originale, pas une miniature recompressée.
        // 32 MiB par défaut, ou la limite Cloud configurée si elle est supérieure.
        const configuredMax = Math.max(32 * 1024 * 1024, Number(env.CLOUD_OBJECT_MAX_UPLOAD_BYTES || 0));
        const maxBytes = configuredMax;
        if (sizeBytes > maxBytes) {
          return json({ ok: false, error: `Image miroir trop volumineuse (${sizeBytes} octets, max ${maxBytes}).` }, 413);
        }
        const checksum = await sha256Hex(dataUrl);
        const payload = {
          version: 2,
          key: mediaKey,
          kind: String(body?.kind || "user_image").slice(0, 80),
          dataUrl,
          sizeBytes,
          checksum,
          updatedAtMs: Number(body?.updatedAt || Date.now()) || Date.now(),
          sourceUrl: body?.sourceUrl ? String(body.sourceUrl).slice(0, 1600) : null,
          updatedAt: new Date().toISOString(),
        };
        await bucket.put(key, JSON.stringify(payload), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { userId: identity.userId, mediaKey, kind: payload.kind, checksum },
        });
        const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);
        mediaManifest.media[mediaKey] = {
          key: mediaKey,
          kind: payload.kind,
          sizeBytes,
          checksum,
          updatedAtMs: payload.updatedAtMs,
          sourceUrl: payload.sourceUrl,
        };
        await writeMediaMirrorManifest(bucket, mediaManifest);
        return json({ ok: true, media: payload, audit: { total: Object.keys(mediaManifest.media).length }, authMode: identity.authMode }, 201);
      }

      if (method === "DELETE") {
        await bucket.delete(key);
        const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);
        delete mediaManifest.media[mediaKey];
        await writeMediaMirrorManifest(bucket, mediaManifest);
        return json({ ok: true, deleted: true, audit: { total: Object.keys(mediaManifest.media).length } });
      }
    }

    // -----------------------------------------------------------------------
    // AVATAR FAILOVER R2
    // Stockage privé et léger d'une miniature par profil. Cette route reste
    // totalement indépendante du NAS/PostgreSQL et utilise la même auth que
    // les sauvegardes R2 directes.
    // -----------------------------------------------------------------------
    if (parts.length === 2 && parts[0] === "avatar") {
      const profileId = safeId(parts[1]);
      if (!profileId) return json({ ok: false, error: "Profil avatar invalide." }, 400);
      const key = avatarFallbackKey(identity.userId, profileId);

      if (method === "GET") {
        const object = await bucket.get(key);
        if (!object) return json({ ok: false, code: "avatar_fallback_missing", error: "Avatar R2 introuvable." }, 404);
        try {
          const payload: any = JSON.parse(await object.text());
          return json({ ok: true, avatar: payload, authMode: identity.authMode });
        } catch {
          return json({ ok: false, code: "avatar_fallback_invalid", error: "Avatar R2 illisible." }, 500);
        }
      }

      if (method === "POST") {
        const avatarPlan = await resolveStoragePlan(bucket, identity, env);
        if (!canWritePaidR2(avatarPlan)) return json({
          ok: false,
          code: "premium_required",
          error: "Cloud R2 verrouillé : une offre PREMIUM active est requise pour toute nouvelle écriture.",
          usage: usagePayload(await readManifest(bucket, identity.userId), avatarPlan),
        }, 402);
        const body: any = await request.json();
        const dataUrl = String(body?.dataUrl || "").trim();
        if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(dataUrl)) {
          return json({ ok: false, error: "Miniature avatar invalide." }, 400);
        }
        const sizeBytes = new TextEncoder().encode(dataUrl).byteLength;
        if (sizeBytes > 160_000) {
          return json({ ok: false, error: `Miniature avatar trop volumineuse (${sizeBytes} octets).` }, 413);
        }
        const payload = {
          version: 1,
          profileId,
          dataUrl,
          avatarUpdatedAt: Number(body?.avatarUpdatedAt || Date.now()) || Date.now(),
          avatarAssetId: body?.avatarAssetId ? String(body.avatarAssetId) : null,
          updatedAt: new Date().toISOString(),
        };
        await bucket.put(key, JSON.stringify(payload), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { userId: identity.userId, profileId, kind: "avatar-fallback-v1" },
        });
        return json({ ok: true, avatar: payload, authMode: identity.authMode }, 201);
      }

      if (method === "DELETE") {
        await bucket.delete(key);
        return json({ ok: true, deleted: true });
      }
    }

    const manifest = await readManifest(bucket, identity.userId);
    await retryPendingCleanup(bucket, manifest).catch(() => undefined);
    const plan = await resolveStoragePlan(bucket, identity, env);

    if (method === "GET" && parts.length === 1 && parts[0] === "usage") {
      return json({ ok: true, usage: usagePayload(manifest, plan), authMode: identity.authMode });
    }

    if (method === "GET" && parts.length === 0) {
      const url = new URL(request.url);
      const includeDeleted = url.searchParams.get("includeDeleted") === "1";
      const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 30)));
      const visible = manifest.backups
        .filter((row) => includeDeleted || !row.deletedAt)
        .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
        .slice(0, limit);
      let activeIndex = 0;
      const backups = visible.map((row) => {
        if (row.deletedAt) return row;
        const retentionRole = activeIndex === 0 ? "current" : activeIndex === 1 ? "previous" : "expired";
        activeIndex += 1;
        return { ...row, metadata: { ...(row.metadata || {}), retentionRole } };
      });
      return json({ ok: true, backups, usage: usagePayload(manifest, plan), authMode: identity.authMode });
    }

    if (method === "POST" && parts.length === 0) {
      if (!canWritePaidR2(plan)) return json({
        ok: false,
        code: "premium_required",
        error: "Cloud R2 verrouillé : une offre PREMIUM active est requise pour sauvegarder sur Cloudflare R2.",
        message: "Le stockage Local / fichier / USB / SD / cloud personnel reste gratuit. R2 n'écrit rien sans abonnement actif.",
        usage: usagePayload(manifest, plan),
      }, 402);
      const body: any = await request.json();
      const snapshotJson = String(body?.snapshotJson || "");
      if (!snapshotJson) return json({ ok: false, error: "Snapshot vide." }, 400);
      try { JSON.parse(snapshotJson); } catch { return json({ ok: false, error: "Snapshot JSON invalide." }, 400); }
      const sizeBytes = new TextEncoder().encode(snapshotJson).byteLength;
      const maxUpload = Math.max(1024, Number(env.CLOUD_OBJECT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024));
      if (sizeBytes > maxUpload) return json({ ok: false, error: `Sauvegarde trop volumineuse (${sizeBytes} octets).` }, 413);

      // Seules deux générations complètes sont conservées dans R2 :
      // la nouvelle sauvegarde + la sauvegarde immédiatement précédente.
      const previous = activeBackups(manifest.backups)[0] || null;
      const projectedUsed = Math.max(0, Number(plan.baseUsedBytes || 0)) + sizeBytes + Number(previous?.sizeBytes || 0);
      const quota = Number(plan.quotaBytes || 0);
      if (!plan.billingExempt && projectedUsed > quota) {
        return json({
          ok: false,
          code: "quota_exceeded",
          error: "Quota Cloud R2 dépassé.",
          message: `Le plan ${plan.planId} ne peut pas contenir la sauvegarde courante + la précédente (${projectedUsed} octets > ${quota}).`,
          usage: usagePayload(manifest, plan),
        }, 413);
      }

      const id = `r2b_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const objectKey = backupKey(identity.userId, id);
      const now = new Date().toISOString();
      const checksum = await sha256Hex(snapshotJson);
      await bucket.put(objectKey, snapshotJson, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { userId: identity.userId, backupId: id, checksum, authMode: identity.authMode },
      });
      const row: BackupRow = {
        id,
        objectKey,
        title: String(body?.title || `Sauvegarde Cloud R2 — ${new Date().toLocaleString("fr-FR")}`).slice(0, 180),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        sizeBytes,
        checksum,
        summary: body?.summary && typeof body.summary === "object" ? body.summary : {},
        metadata: {
          ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}),
          retentionPolicy: "current_plus_previous",
        },
      };

      const retained = [row, ...(previous ? [previous] : [])].slice(0, R2_BACKUP_RETENTION_TOTAL);
      const retainedKeys = new Set(retained.map((item) => item.objectKey));
      const cleanupKeys = Array.from(new Set([
        ...(manifest.cleanupKeys || []),
        ...manifest.backups.filter((item) => !retainedKeys.has(item.objectKey)).map((item) => item.objectKey),
      ].filter(Boolean)));

      // Le manifeste devient immédiatement minimal. Les suppressions physiques sont
      // ensuite tentées; les rares échecs restent dans cleanupKeys et seront retentés
      // automatiquement lors de la prochaine opération.
      manifest.backups = retained;
      manifest.cleanupKeys = cleanupKeys;
      await writeManifest(bucket, manifest);

      // V7 : le point critique est déjà validé ici :
      // - nouveau snapshot écrit dans R2
      // - manifeste écrit avec "courante + précédente"
      //
      // Les suppressions physiques d'anciens objets et le vieux nettoyage
      // cloud_sync_v1 ne doivent PLUS retarder la réponse envoyée au téléphone.
      // Cloudflare poursuivra ce ménage en arrière-plan.
      try {
        context.waitUntil((async () => {
          if (cleanupKeys.length) {
            await Promise.allSettled(cleanupKeys.map((key) => bucket.delete(key)));
          }
          // Garantie capacité : en plus des clés connues par l'ancien manifeste,
          // on supprime les éventuels r2b_* orphelins des générations plus vieilles.
          // Le manifeste relu dans le helper protège les sauvegardes concurrentes.
          await cleanupOrphanedGenerationalBackups(bucket, identity.userId).catch(() => 0);
          await cleanupLegacyFullBackups(bucket, identity.userId).catch(() => 0);
        })());
      } catch {
        // Si waitUntil n'est pas disponible pour une raison quelconque,
        // cleanupKeys reste dans le manifeste et retryPendingCleanup le fera
        // automatiquement lors de la prochaine opération.
      }

      return json({
        ok: true,
        backup: { ...row, metadata: { ...(row.metadata || {}), retentionRole: "current" } },
        previousBackup: previous ? { ...previous, metadata: { ...(previous.metadata || {}), retentionRole: "previous" } } : null,
        cleaned: 0,
        cleanupPending: cleanupKeys.length,
        legacyCleaned: 0,
        cleanupScheduled: true,
        retention: { current: 1, previous: 1, total: R2_BACKUP_RETENTION_TOTAL },
        usage: usagePayload(manifest, plan),
        plan: { planId: plan.planId, billingStatus: plan.billingStatus, billingExempt: plan.billingExempt },
        authMode: identity.authMode,
      }, 201);
    }

    if (method === "DELETE" && parts.length === 1 && parts[0] === "trash") {
      const deleted = manifest.backups.filter((row) => !!row.deletedAt);
      const keys = Array.from(new Set([...deleted.map((row) => row.objectKey), ...(manifest.cleanupKeys || [])]));
      await Promise.all(keys.map((key) => bucket.delete(key)));
      manifest.backups = manifest.backups.filter((row) => !row.deletedAt);
      manifest.cleanupKeys = [];
      await writeManifest(bucket, manifest);
      return json({ ok: true, purged: keys.length, usage: usagePayload(manifest, plan) });
    }

    const id = parts[0] || "";
    const index = manifest.backups.findIndex((row) => row.id === id);
    if (index < 0) return json({ ok: false, error: "Sauvegarde introuvable." }, 404);
    const row = manifest.backups[index];

    if (method === "GET" && parts.length === 1) {
      const object = await bucket.get(row.objectKey);
      if (!object) return json({ ok: false, error: "Fichier R2 introuvable." }, 404);
      return json({ ok: true, backup: row, snapshotJson: await object.text() });
    }

    if (method === "POST" && parts.length === 2 && parts[1] === "undelete") {
      row.deletedAt = null;
      row.updatedAt = new Date().toISOString();
      manifest.backups[index] = row;
      await writeManifest(bucket, manifest);
      return json({ ok: true, backup: row });
    }

    if (method === "DELETE" && parts.length === 1) {
      const force = new URL(request.url).searchParams.get("force") === "1";
      if (force) {
        await bucket.delete(row.objectKey);
        manifest.backups.splice(index, 1);
      } else {
        row.deletedAt = new Date().toISOString();
        row.updatedAt = row.deletedAt;
        manifest.backups[index] = row;
      }
      await writeManifest(bucket, manifest);
      return json({ ok: true, deleted: true, force });
    }

    return json({ ok: false, error: "Route stockage inconnue." }, 404);
  } catch (error: any) {
    return json({
      ok: false,
      code: String(error?.code || "storage_error"),
      error: String(error?.message || error || "Erreur stockage R2"),
    }, Number(error?.status || 500));
  }
};
