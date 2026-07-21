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

type Manifest = { version: 1; userId: string; updatedAt: string; backups: BackupRow[] };

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

async function readManifest(bucket: R2Bucket, userId: string): Promise<Manifest> {
  const object = await bucket.get(manifestKey(userId));
  if (!object) return { version: 1, userId, updatedAt: new Date(0).toISOString(), backups: [] };
  try {
    const parsed = JSON.parse(await object.text());
    return { version: 1, userId, updatedAt: String(parsed?.updatedAt || ""), backups: Array.isArray(parsed?.backups) ? parsed.backups : [] };
  } catch {
    return { version: 1, userId, updatedAt: new Date(0).toISOString(), backups: [] };
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

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
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

    if (method === "GET" && parts.length === 0) {
      const url = new URL(request.url);
      const includeDeleted = url.searchParams.get("includeDeleted") === "1";
      const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 30)));
      const backups = manifest.backups
        .filter((row) => includeDeleted || !row.deletedAt)
        .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
        .slice(0, limit);
      return json({ ok: true, backups, authMode: identity.authMode });
    }

    if (method === "POST" && parts.length === 0) {
      const body: any = await request.json();
      const snapshotJson = String(body?.snapshotJson || "");
      if (!snapshotJson) return json({ ok: false, error: "Snapshot vide." }, 400);
      try { JSON.parse(snapshotJson); } catch { return json({ ok: false, error: "Snapshot JSON invalide." }, 400); }
      const sizeBytes = new TextEncoder().encode(snapshotJson).byteLength;
      const maxUpload = Math.max(1024, Number(env.CLOUD_OBJECT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024));
      if (sizeBytes > maxUpload) return json({ ok: false, error: `Sauvegarde trop volumineuse (${sizeBytes} octets).` }, 413);

      const founders = founderSet(env);
      const quota = founders.has(identity.email)
        ? Number.MAX_SAFE_INTEGER
        : Math.max(1024, Number(env.FREE_CLOUD_QUOTA_BYTES || 100 * 1024 * 1024));
      const used = manifest.backups.filter((row) => !row.deletedAt).reduce((sum, row) => sum + Number(row.sizeBytes || 0), 0);
      if (used + sizeBytes > quota) return json({ ok: false, code: "quota_exceeded", error: "Quota Cloud R2 dépassé." }, 413);

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
        metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      };
      manifest.backups.unshift(row);
      manifest.backups = manifest.backups.slice(0, 120);
      await writeManifest(bucket, manifest);
      return json({ ok: true, backup: row, authMode: identity.authMode }, 201);
    }

    if (method === "DELETE" && parts.length === 1 && parts[0] === "trash") {
      const deleted = manifest.backups.filter((row) => !!row.deletedAt);
      await Promise.all(deleted.map((row) => bucket.delete(row.objectKey)));
      manifest.backups = manifest.backups.filter((row) => !row.deletedAt);
      await writeManifest(bucket, manifest);
      return json({ ok: true, purged: deleted.length });
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
