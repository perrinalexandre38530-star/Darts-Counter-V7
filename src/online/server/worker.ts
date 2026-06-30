// =============================================================
// src/online/server/worker.ts
// Worker ONLINE + Cloud Sync + Dart Scanner (TypeScript autonome)
// - WebSocket /room/:code  (rooms en mémoire)
// - POST  /api/sync/upload   → KV DC_SYNC
// - GET   /api/sync/download → KV DC_SYNC
// - POST  /dart-scan         → R2 DART_IMAGES_BUCKET + PUBLIC_BASE_URL
// - CORS via ALLOW_ORIGINS (liste séparée par des virgules, ou vide = tout)
// =============================================================

// --------- Types minimalistes pour éviter d'ajouter workers-types ---------

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

interface R2Object {}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<R2Object | null>;
}

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

export interface Env {
  DC_SYNC: KVNamespace;
  DART_IMAGES_BUCKET: R2Bucket;
  PUBLIC_BASE_URL: string;
  ALLOW_ORIGINS?: string;
}

// --------- Rooms WebSocket en mémoire ---------

type ClientMeta = {
  playerId: string | null;
  role: "host" | "guest" | "unknown";
};

type Room = {
  clients: Set<WebSocket>;
  meta: Map<WebSocket, ClientMeta>;
};

// roomId → room
const rooms = new Map<string, Room>();


// --------- X01 device sessions (téléphone compagnon) en mémoire ---------
type X01DeviceSession = {
  code: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  seq: number;
  events: Array<{ id: number; seq: number; ts: number; payload: any }>;
  status: Record<string, any>;
};

const X01_DEVICE_TTL_MS = 8 * 60 * 60 * 1000;
const x01DeviceSessions = new Map<string, X01DeviceSession>();

function x01DeviceCleanCode(input: any): string {
  return String(input || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

function x01DeviceRandomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function x01DeviceCleanup() {
  const now = Date.now();
  for (const [code, session] of x01DeviceSessions.entries()) {
    if (!session || session.expiresAt <= now) x01DeviceSessions.delete(code);
  }
}

function x01DeviceGet(code: string): X01DeviceSession | null {
  x01DeviceCleanup();
  const clean = x01DeviceCleanCode(code);
  if (!clean) return null;
  const session = x01DeviceSessions.get(clean) || null;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    x01DeviceSessions.delete(clean);
    return null;
  }
  return session;
}

function x01DeviceStatus(session: X01DeviceSession) {
  const st = session.status || {};
  return {
    ok: true,
    sessionId: session.code,
    code: session.code,
    connected: !!st.connected,
    linked: !!st.linked,
    calibrated: !!st.calibrated,
    deviceLabel: st.deviceLabel || "",
    deviceKind: st.deviceKind || "",
    message: st.message || "",
    lastSeenAt: st.lastSeenAt || null,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
    eventSeq: session.seq || 0,
  };
}

async function handleX01DeviceCreate(request: Request): Promise<Response> {
  x01DeviceCleanup();
  let code = "";
  for (let i = 0; i < 20; i += 1) {
    const candidate = x01DeviceRandomCode(6);
    if (!x01DeviceSessions.has(candidate)) { code = candidate; break; }
  }
  if (!code) return jsonError("x01_device_session_create_failed", 500);
  let body: any = {};
  try { body = await request.json(); } catch {}
  const now = Date.now();
  const session: X01DeviceSession = {
    code,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + X01_DEVICE_TTL_MS,
    seq: 0,
    events: [],
    status: {
      linked: false,
      connected: false,
      calibrated: false,
      deviceLabel: "",
      deviceKind: String(body?.kind || "x01_device"),
      message: "Session créée",
      lastSeenAt: null,
    },
  };
  x01DeviceSessions.set(code, session);
  return jsonResponse({ ok: true, sessionId: code, code, expiresInSeconds: Math.floor(X01_DEVICE_TTL_MS / 1000), provider: "worker-memory" }, 201);
}

async function handleX01DeviceStatusGet(_request: Request, code: string): Promise<Response> {
  const session = x01DeviceGet(code);
  if (!session) return jsonError("Session téléphone introuvable", 404);
  return jsonResponse(x01DeviceStatus(session));
}

async function handleX01DeviceStatusPost(request: Request, code: string): Promise<Response> {
  const session = x01DeviceGet(code);
  if (!session) return jsonError("Session téléphone introuvable", 404);
  let body: any = {};
  try { body = await request.json(); } catch {}
  const now = Date.now();
  session.status = {
    ...(session.status || {}),
    linked: body.linked !== undefined ? !!body.linked : !!session.status?.linked,
    connected: body.connected !== undefined ? !!body.connected : !!session.status?.connected,
    calibrated: body.calibrated !== undefined ? !!body.calibrated : !!session.status?.calibrated,
    deviceLabel: String(body.deviceLabel || session.status?.deviceLabel || "").slice(0, 80),
    deviceKind: String(body.deviceKind || session.status?.deviceKind || "phone_camera").slice(0, 80),
    message: String(body.message || session.status?.message || "").slice(0, 180),
    lastSeenAt: Number(body.lastSeenAt || now) || now,
  };
  session.updatedAt = now;
  session.expiresAt = now + X01_DEVICE_TTL_MS;
  x01DeviceSessions.set(session.code, session);
  return jsonResponse(x01DeviceStatus(session));
}

async function handleX01DeviceEventPost(request: Request, code: string): Promise<Response> {
  const session = x01DeviceGet(code);
  if (!session) return jsonError("Session téléphone introuvable", 404);
  let body: any = {};
  try { body = await request.json(); } catch {}
  const now = Date.now();
  const id = Number(session.seq || 0) + 1;
  session.seq = id;
  session.updatedAt = now;
  session.expiresAt = now + X01_DEVICE_TTL_MS;
  session.status = { ...(session.status || {}), linked: true, connected: true, lastSeenAt: now, message: "Impact reçu" };
  session.events = [...(session.events || []), { id, seq: id, ts: now, payload: body }].slice(-80);
  x01DeviceSessions.set(session.code, session);
  return jsonResponse({ ok: true, id, seq: id }, 201);
}

async function handleX01DeviceEventsGet(request: Request, code: string): Promise<Response> {
  const session = x01DeviceGet(code);
  if (!session) return jsonError("Session téléphone introuvable", 404);
  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") || 0) || 0;
  const events = (session.events || []).filter((ev) => Number(ev.id || ev.seq || 0) > after);
  return jsonResponse({ ok: true, sessionId: session.code, code: session.code, rev: session.seq || 0, events });
}

async function handleX01DeviceDelete(_request: Request, code: string): Promise<Response> {
  const clean = x01DeviceCleanCode(code);
  if (clean) x01DeviceSessions.delete(clean);
  return jsonResponse({ ok: true });
}

// Envoi JSON sécurisé
function wsSend(ws: WebSocket, obj: any) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {
    // ignore
  }
}

// Broadcast dans une room (optionnellement en excluant un socket)
function broadcast(roomId: string, message: any, except?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const ws of room.clients) {
    if (except && ws === except) continue;
    try {
      ws.send(payload);
    } catch {
      // ignore
    }
  }
}

// Nettoyage régulier des rooms / sockets morts
function cleanupRooms() {
  for (const [roomId, room] of rooms) {
    for (const ws of room.clients) {
      if (ws.readyState !== ws.OPEN) {
        room.clients.delete(ws);
        room.meta.delete(ws);
      }
    }
    if (room.clients.size === 0) {
      rooms.delete(roomId);
    }
  }
}

// Gestion WebSocket sur /room/:code
function handleRoomWebSocket(roomId: string, _request: Request): Response {
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  const ws = server;
  ws.accept();

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      clients: new Set<WebSocket>(),
      meta: new Map<WebSocket, ClientMeta>(),
    });
  }
  const room = rooms.get(roomId)!;
  room.clients.add(ws);
  room.meta.set(ws, { playerId: null, role: "guest" });

  wsSend(ws, { kind: "welcome", roomId });

  ws.addEventListener("message", (event) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      wsSend(ws, {
        kind: "error",
        code: "bad_json",
        message: "Invalid JSON in WebSocket message",
      });
      return;
    }

    switch (msg.kind) {
      case "join": {
        const playerId: string | null = msg.playerId || null;
        const role: ClientMeta["role"] = msg.role || "guest";
        const lobbyCode: string | null = msg.lobbyCode || null;
        const matchId: string | null = msg.matchId || null;

        const meta = room.meta.get(ws);
        if (meta) {
          meta.playerId = playerId;
          meta.role = role;
        }

        broadcast(roomId, {
          kind: "lifecycle",
          data: {
            type: "player_join",
            playerId,
            role,
            lobbyCode,
            matchId,
          },
        });
        break;
      }

      case "command": {
        broadcast(roomId, { kind: "command", data: msg.data }, ws);
        break;
      }

      case "snapshot": {
        broadcast(roomId, { kind: "snapshot", data: msg.data }, ws);
        break;
      }

      case "lifecycle": {
        broadcast(roomId, { kind: "lifecycle", data: msg.data }, ws);
        break;
      }

      case "ping": {
        wsSend(ws, { kind: "pong" });
        break;
      }

      default: {
        wsSend(ws, {
          kind: "error",
          code: "unknown_kind",
          message: "Unsupported kind: " + msg.kind,
        });
      }
    }
  });

  ws.addEventListener("close", () => {
    const room = rooms.get(roomId);
    if (!room) return;

    const meta = room.meta.get(ws);
    room.clients.delete(ws);
    room.meta.delete(ws);

    broadcast(roomId, {
      kind: "lifecycle",
      data: {
        type: "player_leave",
        playerId: meta?.playerId ?? null,
      },
    });

    if (room.clients.size === 0) {
      rooms.delete(roomId);
    }
  });

  ws.addEventListener("error", () => {
    try {
      ws.close();
    } catch {
      // ignore
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// --------- Helpers CORS + JSON ---------

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOW_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isOriginAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins(env);
  if (allowed.length === 0) return true; // liste vide → tout accepté
  return allowed.includes(origin);
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function withCors(env: Env, request: Request, res: Response): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(res.headers);

  if (origin && isOriginAllowed(env, origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// --------- Cloud Sync upload / download ---------

function generateToken(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload || typeof payload !== "object") {
    return jsonError("Invalid payload", 400);
  }

  if (!payload.store) {
    return jsonError("Missing 'store' in payload", 400);
  }

  const token = generateToken();
  const key = `sync:${token}`;

  await env.DC_SYNC.put(key, JSON.stringify(payload), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 jours
  });

  return jsonResponse({ token }, 200);
}

async function handleDownload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (!token) {
    return jsonError("Missing 'token' query parameter", 400);
  }

  const key = `sync:${token}`;
  const raw = await env.DC_SYNC.get(key);

  if (!raw) {
    return jsonError("Snapshot not found", 404);
  }

  return jsonResponse(JSON.parse(raw), 200);
}


// --------- Viewer tablette live (snapshot léger temporaire) ---------

const VIEWER_TTL_SECONDS = 60 * 60 * 3; // 3 heures

function normalizeViewerId(input: string): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);
}

function viewerSessionKey(sessionId: string) {
  return `viewer:${sessionId}`;
}

function viewerSnapshotKey(sessionId: string) {
  return `viewer:${sessionId}:snapshot`;
}

async function handleViewerCreate(_request: Request, env: Env): Promise<Response> {
  let sessionId = "";
  for (let i = 0; i < 6; i++) {
    const candidate = generateToken(12);
    const existing = await env.DC_SYNC.get(viewerSessionKey(candidate));
    if (!existing) {
      sessionId = candidate;
      break;
    }
  }
  if (!sessionId) return jsonError("Unable to create viewer session", 500);

  const meta = {
    sessionId,
    code: sessionId,
    kind: "viewer_live_v1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rev: 0,
  };

  await env.DC_SYNC.put(viewerSessionKey(sessionId), JSON.stringify(meta), {
    expirationTtl: VIEWER_TTL_SECONDS,
  });

  const initialSnapshot = {
    v: 1,
    sessionId,
    rev: 0,
    updatedAt: Date.now(),
    sport: "darts",
    game: "unknown",
    phase: "lobby",
    title: "Multisports Scoring",
    players: [],
    meta: { text: "En attente du lancement de la partie" },
    source: "worker",
  };

  await env.DC_SYNC.put(viewerSnapshotKey(sessionId), JSON.stringify(initialSnapshot), {
    expirationTtl: VIEWER_TTL_SECONDS,
  });

  return jsonResponse({ sessionId, code: sessionId, expiresInSeconds: VIEWER_TTL_SECONDS }, 200);
}

async function handleViewerPostSnapshot(request: Request, env: Env, rawSessionId: string): Promise<Response> {
  const sessionId = normalizeViewerId(rawSessionId);
  if (!sessionId) return jsonError("Missing viewer session id", 400);

  const sessionRaw = await env.DC_SYNC.get(viewerSessionKey(sessionId));
  if (!sessionRaw) return jsonError("Viewer session not found", 404);

  let snapshot: any;
  try {
    snapshot = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.players)) {
    return jsonError("Invalid viewer snapshot", 400);
  }

  let meta: any = {};
  try {
    meta = JSON.parse(sessionRaw || "{}");
  } catch {}
  const rev = Number(meta.rev || 0) + 1;
  const payload = {
    ...snapshot,
    v: 1,
    sessionId,
    rev,
    updatedAt: Date.now(),
  };

  await env.DC_SYNC.put(viewerSnapshotKey(sessionId), JSON.stringify(payload), {
    expirationTtl: VIEWER_TTL_SECONDS,
  });
  await env.DC_SYNC.put(viewerSessionKey(sessionId), JSON.stringify({ ...meta, sessionId, code: sessionId, rev, updatedAt: new Date().toISOString() }), {
    expirationTtl: VIEWER_TTL_SECONDS,
  });

  return jsonResponse({ ok: true, sessionId, rev, updatedAt: payload.updatedAt }, 200);
}

async function handleViewerGetSnapshot(_request: Request, env: Env, rawSessionId: string): Promise<Response> {
  const sessionId = normalizeViewerId(rawSessionId);
  if (!sessionId) return jsonError("Missing viewer session id", 400);

  const raw = await env.DC_SYNC.get(viewerSnapshotKey(sessionId));
  if (!raw) return jsonError("Viewer snapshot not found", 404);

  try {
    return jsonResponse({ snapshot: JSON.parse(raw) }, 200);
  } catch {
    return jsonError("Corrupted viewer snapshot", 500);
  }
}

async function handleViewerDelete(_request: Request, env: Env, rawSessionId: string): Promise<Response> {
  const sessionId = normalizeViewerId(rawSessionId);
  if (!sessionId) return jsonError("Missing viewer session id", 400);

  await env.DC_SYNC.put(viewerSessionKey(sessionId), JSON.stringify({ sessionId, closedAt: new Date().toISOString(), status: "closed" }), {
    expirationTtl: 60,
  });
  await env.DC_SYNC.put(viewerSnapshotKey(sessionId), JSON.stringify({
    v: 1,
    sessionId,
    updatedAt: Date.now(),
    game: "unknown",
    phase: "finished",
    title: "Session viewer fermée",
    players: [],
    meta: { text: "Session fermée" },
  }), {
    expirationTtl: 60,
  });

  return jsonResponse({ ok: true }, 200);
}

// --------- Dart scanner /dart-scan (POST) ---------

export type DartScanOptions = {
  bgColor?: string;
  targetAngleDeg?: number;
  cartoonLevel?: number;
};

export type DartScanResult = {
  mainImageUrl: string;
  thumbImageUrl: string;
  bgColor?: string;
};

async function handleDartScan(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return jsonError("Missing image file", 400);
    }

    let options: DartScanOptions = {};
    const rawOptions = formData.get("options");
    if (typeof rawOptions === "string") {
      try {
        options = JSON.parse(rawOptions);
      } catch {
        return jsonError("Invalid options JSON", 400);
      }
    }

    const result = await processDartImage(file, options, env);

    return jsonResponse(
      {
        mainImageUrl: result.mainImageUrl,
        thumbImageUrl: result.thumbImageUrl,
        bgColor: result.bgColor,
      },
      200
    );
  } catch (err) {
    console.error("[/dart-scan] error", err);
    return jsonError("Internal error while scanning dart", 500);
  }
}

async function processDartImage(
  file: File,
  options: DartScanOptions,
  env: Env
): Promise<DartScanResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const bgColor = options.bgColor || "#101020";

  // 👉 Pour l'instant : on stocke l'image brute telle quelle.
  // Tu pourras brancher Workers AI ici plus tard.

  const mainKey = `dart-sets/main-${crypto.randomUUID()}.png`;
  const thumbKey = `dart-sets/thumb-${crypto.randomUUID()}.png`;

  await env.DART_IMAGES_BUCKET.put(mainKey, bytes, {
    httpMetadata: { contentType: "image/png" },
  });

  await env.DART_IMAGES_BUCKET.put(thumbKey, bytes, {
    httpMetadata: { contentType: "image/png" },
  });

  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const mainImageUrl = `${base}/${mainKey}`;
  const thumbImageUrl = `${base}/${thumbKey}`;

  return {
    mainImageUrl,
    thumbImageUrl,
    bgColor,
  };
}

// =============================================================
// Worker principal
// =============================================================

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Nettoyage rooms en arrière-plan
    ctx.waitUntil(Promise.resolve().then(cleanupRooms));

    // ------- Préflight CORS -------
    if (request.method === "OPTIONS") {
      const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      };
      if (origin && isOriginAllowed(env, origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }
      return new Response(null, { status: 204, headers });
    }

    // ------- Route scanner fléchettes -------
    if (url.pathname === "/dart-scan" && request.method === "POST") {
      const res = await handleDartScan(request, env);
      return withCors(env, request, res);
    }

    // ------- Routes Cloud Sync -------
    if (url.pathname === "/api/sync/upload" && request.method === "POST") {
      const res = await handleUpload(request, env);
      return withCors(env, request, res);
    }

    if (url.pathname === "/api/sync/download" && request.method === "GET") {
      const res = await handleDownload(request, env);
      return withCors(env, request, res);
    }


    // ------- X01 téléphone compagnon : /x01-device/session -------
    if ((url.pathname === "/x01-device/session" || url.pathname === "/api/x01-device/session") && request.method === "POST") {
      const res = await handleX01DeviceCreate(request);
      return withCors(env, request, res);
    }

    const x01DeviceMatch = url.pathname.match(/^\/(?:api\/)?x01-device\/session\/([^/]+)(?:\/(status|event|events))?$/);
    if (x01DeviceMatch) {
      const sessionId = x01DeviceMatch[1];
      const sub = x01DeviceMatch[2] || "";
      let res: Response;
      if (sub === "status" && request.method === "GET") res = await handleX01DeviceStatusGet(request, sessionId);
      else if (sub === "status" && request.method === "POST") res = await handleX01DeviceStatusPost(request, sessionId);
      else if (sub === "event" && request.method === "POST") res = await handleX01DeviceEventPost(request, sessionId);
      else if (sub === "events" && request.method === "GET") res = await handleX01DeviceEventsGet(request, sessionId);
      else if (!sub && request.method === "DELETE") res = await handleX01DeviceDelete(request, sessionId);
      else res = jsonError("Unsupported X01 device method", 405);
      return withCors(env, request, res);
    }

    // ------- Viewer tablette live : /viewer/session -------
    if ((url.pathname === "/viewer/session" || url.pathname === "/api/viewer/session") && request.method === "POST") {
      const res = await handleViewerCreate(request, env);
      return withCors(env, request, res);
    }

    const viewerMatch = url.pathname.match(/^\/(?:api\/)?viewer\/session\/([^/]+)(?:\/snapshot)?$/);
    if (viewerMatch) {
      const sessionId = viewerMatch[1];
      const isSnapshotRoute = url.pathname.endsWith("/snapshot");
      let res: Response;
      if (isSnapshotRoute && request.method === "GET") res = await handleViewerGetSnapshot(request, env, sessionId);
      else if (isSnapshotRoute && request.method === "POST") res = await handleViewerPostSnapshot(request, env, sessionId);
      else if (!isSnapshotRoute && request.method === "DELETE") res = await handleViewerDelete(request, env, sessionId);
      else res = jsonError("Unsupported viewer method", 405);
      return withCors(env, request, res);
    }

    // ------- WebSocket : /room/:code -------
    const match = url.pathname.match(/^\/room\/([A-Za-z0-9_-]+)$/);
    if (match && request.headers.get("Upgrade") === "websocket") {
      const roomId = match[1].toUpperCase();
      return handleRoomWebSocket(roomId, request); // pas de CORS sur upgrade
    }

    // ------- Healthcheck -------
    if (url.pathname === "/" || url.pathname === "/health") {
      const res = jsonResponse(
        {
          status: "ok",
          rooms: rooms.size,
        },
        200
      );
      return withCors(env, request, res);
    }

    // ------- 404 -------
    const res = jsonError("Not found", 404);
    return withCors(env, request, res);
  },
};

export default worker;
