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
const DEFAULT_FREE_QUOTA_BYTES = 100 * 1024 * 1024;

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

function entitlementKey(userId: string): string {
  return `users/${safeId(userId)}/billing/storage-entitlement-v1.json`;
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
  return ["free", "active", "trialing"].includes(String(entitlement.billingStatus || "").toLowerCase());
}

async function resolveStoragePlan(bucket: R2Bucket, identity: { userId: string; email: string }, env: Env) {
  const founders = founderSet(env);
  if (founders.has(identity.email)) {
    return {
      planId: "founder_nas",
      quotaBytes: Number.MAX_SAFE_INTEGER,
      billingStatus: "active",
      baseUsedBytes: 0,
      billingExempt: true,
      source: "founder" as const,
    };
  }
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
    quotaBytes: Math.max(1024, Number(env.FREE_CLOUD_QUOTA_BYTES || DEFAULT_FREE_QUOTA_BYTES)),
    billingStatus: "free",
    baseUsedBytes: 0,
    billingExempt: false,
    source: "fallback_free" as const,
  };
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

function founderSet(env: Env): Set<string> {
  return new Set(String(env.FOUNDER_EMAILS || "").split(/[;,\s]+/g).map((v) => v.trim().toLowerCase()).filter(Boolean));
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
        paidPlans: { supported: true, entitlementSource: "R2 private entitlement written after Stripe confirmation" },
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

    const identity = await resolveIdentity(request, env);
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
