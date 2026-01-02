// ============================================
// Cloudflare Worker — Sync backend
// Routes :
//   POST /api/sync/upload    → renvoie { token }
//   GET  /api/sync/download?token=XYZ → renvoie { store, createdAt, kind, app }
// Stockage : KV "DC_SYNC" (clé : token)
// ============================================

export interface Env {
    DC_SYNC: KVNamespace;
  }
  
  // Durée de vie des snapshots (en secondes) : 7 jours
  const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 7;
  
  // --------------------------------------------
  // Helpers
  // --------------------------------------------
  
  // Génère un token du style "7FQ9-L2KD-8ZP3"
  function generateToken(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // pas de 0/O ni 1/I
    function block(len: number) {
      let out = "";
      for (let i = 0; i < len; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      return out;
    }
    return `${block(4)}-${block(4)}-${block(4)}`;
  }
  
  function jsonResponse(data: any, init?: ResponseInit): Response {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(init && init.headers ? init.headers : {}),
      },
    });
  }
  
  // --------------------------------------------
  // Handlers
  // --------------------------------------------
  
  async function handleUpload(request: Request, env: Env): Promise<Response> {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "invalid_json", message: "Body must be valid JSON." },
        { status: 400 }
      );
    }
  
    // Validation minimale : on attend { kind, createdAt, app, store }
    if (!body || typeof body !== "object" || !body.store) {
      return jsonResponse(
        {
          error: "invalid_payload",
          message: "Payload must contain a 'store' field.",
        },
        { status: 400 }
      );
    }
  
    const payload = {
      kind: body.kind ?? "dc_cloud_snapshot_v1",
      createdAt: body.createdAt ?? new Date().toISOString(),
      app: body.app ?? "darts-counter-v5",
      store: body.store,
    };
  
    // On tente quelques tokens jusqu’à en trouver un libre
    let token = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateToken();
      const existing = await env.DC_SYNC.get(candidate);
      if (!existing) {
        token = candidate;
        break;
      }
    }
  
    if (!token) {
      return jsonResponse(
        {
          error: "token_generation_failed",
          message: "Unable to generate a unique token. Please retry.",
        },
        { status: 500 }
      );
    }
  
    // On stocke tout le payload en KV, avec expiration (TTL)
    await env.DC_SYNC.put(token, JSON.stringify(payload), {
      expirationTtl: SNAPSHOT_TTL_SECONDS,
    });
  
    return jsonResponse({
      token,
      expiresInSeconds: SNAPSHOT_TTL_SECONDS,
    });
  }
  
  async function handleDownload(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.trim();
  
    if (!token) {
      return jsonResponse(
        {
          error: "missing_token",
          message: "Query parameter 'token' is required.",
        },
        { status: 400 }
      );
    }
  
    const raw = await env.DC_SYNC.get(token);
    if (!raw) {
      return jsonResponse(
        {
          error: "not_found",
          message: "No snapshot found for this token (expired or invalid).",
        },
        { status: 404 }
      );
    }
  
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return jsonResponse(
        {
          error: "corrupted_payload",
          message: "Stored snapshot is invalid JSON.",
        },
        { status: 500 }
      );
    }
  
    // Optionnel : on pourrait delete après lecture (one-shot)
    // await env.DC_SYNC.delete(token);
  
    // IMPORTANT : le front attend { store: ... }
    return jsonResponse({
      store: payload.store,
      createdAt: payload.createdAt,
      kind: payload.kind,
      app: payload.app,
    });
  }
  
  // --------------------------------------------
  // CORS simple (si un jour tu tapes le Worker
  // depuis un domaine différent du front)
  // --------------------------------------------
  function withCors(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  
  // --------------------------------------------
  // Entrée principale du Worker
  // --------------------------------------------
  export default {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
  
      // Préflight CORS
      if (request.method === "OPTIONS") {
        return withCors(
          new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Max-Age": "86400",
            },
          })
        );
      }
  
      // Routing très simple
      if (url.pathname === "/api/sync/upload" && request.method === "POST") {
        return withCors(await handleUpload(request, env));
      }
  
      if (url.pathname === "/api/sync/download" && request.method === "GET") {
        return withCors(await handleDownload(request, env));
      }
  
      return new Response("Not found", { status: 404 });
    },
  };
  