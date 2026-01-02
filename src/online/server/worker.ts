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
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
