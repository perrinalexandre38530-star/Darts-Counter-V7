// =======================================================
// src/online/server/RoomDO.ts
// Durable Object "RoomDO" pour l’ONLINE temps réel
// - Chaque room = un DO (clé = code salon : "AB7F")
// - Le DO ne connaît PAS le moteur X01 : il relaie juste les messages
// - Protocole JSON:
//    Client → DO : { kind: "join" | "command" | "snapshot" | "lifecycle" | "ping", ... }
//    DO → Clients : { kind: "welcome" | "command" | "snapshot" | "lifecycle" | "error" | "info" | "pong" }
// - Env étendu pour inclure aussi le bucket R2 / IA (utilisés par le Worker)
// =======================================================

export type Env = {
  ROOMS: DurableObjectNamespace;
  AVATAR_CACHE: KVNamespace; // optionnel, mais dispo si besoin
  DC_SYNC: KVNamespace;      // ⬅️ KV utilisée par /api/sync/upload & download
  ALLOW_ORIGINS: string;

  // 🔽 Nouveaux bindings utilisés par le worker (scan fléchettes)
  DART_IMAGES_BUCKET: R2Bucket;
  PUBLIC_BASE_URL: string;
  AI: any;
};

type ClientWs = WebSocket;

type ClientWsMessage =
  | {
      kind: "join";
      role: "host" | "guest";
      lobbyCode: string;
      matchId: string;
      playerId: string | null;
    }
  | { kind: "ping" }
  | { kind: "command"; data: any }
  | { kind: "snapshot"; data: { seq: number; state: any } }
  | { kind: "lifecycle"; data: any };

type ServerWsMessage =
  | { kind: "welcome"; roomId: string }
  | { kind: "pong" }
  | { kind: "command"; data: any }
  | { kind: "snapshot"; data: { seq: number; state: any } }
  | { kind: "lifecycle"; data: any }
  | { kind: "info"; message: string }
  | { kind: "error"; code: string; message: string };

// Info minimale par socket (principalement pour debug)
type ClientInfo = {
  socket: ClientWs;
  role: "host" | "guest" | "unknown";
  playerId: string | null;
  lastSeen: number;
};

export class RoomDO {
  private state: DurableObjectState;
  private env: Env;

  private roomId: string;
  private clients: Set<ClientWs>;
  private clientMeta: Map<ClientWs, ClientInfo>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Nom logique de la room = name du DO (créé via idFromName(code))
    // (ex: "AB7F")
    // @ts-expect-error: Cloudflare ajoute .name sur id dans le runtime
    this.roomId = (state.id as any).name || state.id.toString();

    this.clients = new Set();
    this.clientMeta = new Map();
  }

  // ---------------------------------------------------
  // Helpers
  // ---------------------------------------------------

  private isOriginAllowed(origin: string | null): boolean {
    const raw = this.env.ALLOW_ORIGINS || "";
    const allowed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Liste vide = mode développement/app packagée : on accepte aussi les
    // WebSocket sans en-tête Origin (certains WebView/Tizen se comportent ainsi).
    if (allowed.length === 0) return true;
    if (!origin) return false;
    return allowed.includes(origin);
  }

  private safeSend(ws: ClientWs, msg: ServerWsMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private broadcast(msg: ServerWsMessage, except?: ClientWs) {
    const payload = JSON.stringify(msg);
    // getWebSockets() survit à l'hibernation du Durable Object, contrairement
    // au Set mémoire. On garde le Set comme fallback pour les runtimes anciens.
    let sockets: ClientWs[] = [];
    try {
      const durableSockets = (this.state as any).getWebSockets?.();
      if (Array.isArray(durableSockets) && durableSockets.length) sockets = durableSockets as ClientWs[];
    } catch {}
    if (!sockets.length) sockets = Array.from(this.clients);

    for (const sock of sockets) {
      if (except && sock === except) continue;
      try {
        sock.send(payload);
      } catch {
        // ignore erreurs individuelles
      }
    }
  }

  // ---------------------------------------------------
  // fetch : entrée WS pour ce DO
  // ---------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const origin = request.headers.get("Origin");
    if (!this.isOriginAllowed(origin)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);

    // On stocke ce socket dans le set
    this.clients.add(server);
    this.clientMeta.set(server, {
      socket: server,
      role: "unknown",
      playerId: null,
      lastSeen: Date.now(),
    });

    // Message de bienvenue immédiat
    this.safeSend(server, {
      kind: "welcome",
      roomId: this.roomId,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // ---------------------------------------------------
  // Gestion des WebSockets (Cloudflare DO)
  // ---------------------------------------------------

  async webSocketMessage(ws: ClientWs, raw: string | ArrayBuffer) {
    let text: string;
    if (typeof raw === "string") {
      text = raw;
    } else {
      text = new TextDecoder().decode(raw);
    }

    let msg: ClientWsMessage | undefined;
    try {
      msg = JSON.parse(text);
    } catch (e) {
      this.safeSend(ws, {
        kind: "error",
        code: "bad_json",
        message: "Message JSON invalide",
      });
      return;
    }
    if (!msg) return;

    // Mise à jour lastSeen
    const meta = this.clientMeta.get(ws);
    if (meta) {
      meta.lastSeen = Date.now();
      this.clientMeta.set(ws, meta);
    }

    switch (msg.kind) {
      // ----------------- PING → PONG -----------------
      case "ping": {
        this.safeSend(ws, { kind: "pong" });
        return;
      }

      // ----------------- JOIN -----------------
      case "join": {
        const info: ClientInfo = {
          socket: ws,
          role: msg.role || "unknown",
          playerId: msg.playerId || null,
          lastSeen: Date.now(),
        };
        this.clientMeta.set(ws, info);

        // petit message info au client
        this.safeSend(ws, {
          kind: "info",
          message: `Rejoint la room ${this.roomId} en tant que ${info.role}`,
        });

        // (optionnel) on pourrait aussi broadcast un lifecycle ici
        // mais pour l’instant, le client se contente de loguer
        this.broadcast(
          {
            kind: "lifecycle",
            data: {
              type: "join",
              roomId: this.roomId,
              role: info.role,
              playerId: info.playerId,
            },
          },
          ws
        );
        return;
      }

      // ----------------- COMMAND -----------------
      case "command": {
        // Relais brut vers tous les autres clients
        this.broadcast(
          {
            kind: "command",
            data: msg.data,
          },
          ws
        );
        return;
      }

      // ----------------- SNAPSHOT -----------------
      case "snapshot": {
        // Typiquement envoyé par l’hôte pour resynchroniser les autres
        this.broadcast(
          {
            kind: "snapshot",
            data: msg.data,
          },
          ws
        );
        return;
      }

      // ----------------- LIFECYCLE -----------------
      case "lifecycle": {
        // join/leave/ready/start… → on relaie simplement
        this.broadcast(
          {
            kind: "lifecycle",
            data: msg.data,
          },
          ws
        );
        return;
      }

      default: {
        this.safeSend(ws, {
          kind: "error",
          code: "unknown_kind",
          message: "Type de message inconnu",
        });
      }
    }
  }

  async webSocketClose(
    ws: ClientWs,
    code: number,
    reason: string,
    wasClean: boolean
  ) {
    this.clients.delete(ws);
    this.clientMeta.delete(ws);

    // Broadcast d'une info de leave (optionnel)
    this.broadcast({
      kind: "lifecycle",
      data: {
        type: "leave",
        roomId: this.roomId,
        code,
        wasClean,
      },
    });
  }

  async webSocketError(ws: ClientWs, error: any) {
    this.clients.delete(ws);
    this.clientMeta.delete(ws);
    // On ne renvoie rien, juste log server-side
    console.warn("[RoomDO] webSocketError", error);
  }
}
