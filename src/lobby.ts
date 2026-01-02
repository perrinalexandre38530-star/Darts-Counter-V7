import { json, randomLobbyCode, broadcast } from "./utils";

export interface LobbyState {
  code: string;
  players: Array<{
    id: string;
    name: string;
    avatar?: string | null;
    joinedAt: number;
  }>;
  hostId: string | null;
  status: "waiting" | "running" | "ended";
  engineState?: any; // snapshot moteur X01
}

export class LobbyRoom {
  state: DurableObjectState;
  env: any;

  private wsClients: WebSocket[] = [];
  private lobby: LobbyState = {
    code: "",
    players: [],
    hostId: null,
    status: "waiting",
    engineState: null
  };

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);

    await this.loadLobby();

    // ---- WebSocket upgrade ----
    if (path[0] === "ws") {
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleWS(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // ---- REST API ----
    if (req.method === "POST" && path[0] === "join") {
      const body = await req.json();
      return await this.join(body);
    }

    if (req.method === "POST" && path[0] === "leave") {
      const body = await req.json();
      return await this.leave(body.playerId);
    }

    if (req.method === "POST" && path[0] === "start") {
      return await this.startMatch();
    }

    if (req.method === "POST" && path[0] === "command") {
      const body = await req.json();
      return await this.onCommand(body);
    }

    if (req.method === "GET" && path[0] === "state") {
      return json(200, this.lobby);
    }

    return json(404, { error: "not_found" });
  }

  // =============== WEBSOCKET ===============
  async handleWS(ws: WebSocket) {
    ws.accept();
    this.wsClients.push(ws);

    ws.addEventListener("message", async (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "snapshot") {
          this.lobby.engineState = msg.state;
          await this.saveLobby();
          broadcast(this.wsClients, { type: "snapshot", state: msg.state });
        }
      } catch {}
    });

    ws.addEventListener("close", () => {
      this.wsClients = this.wsClients.filter((x) => x !== ws);
    });

    ws.send(JSON.stringify({ type: "hello", lobby: this.lobby }));
  }

  // =============== HELPERS ===============
  async loadLobby() {
    const stored = await this.state.storage.get<LobbyState>("lobby");
    if (stored) this.lobby = stored;
  }

  async saveLobby() {
    await this.state.storage.put("lobby", this.lobby);
  }

  // =============== REST ACTIONS ===============

  async join(body: any) {
    const { playerId, name, avatar } = body;
    if (!playerId) return json(400, { error: "missing_playerId" });

    const exists = this.lobby.players.find((p) => p.id === playerId);
    if (!exists) {
      this.lobby.players.push({
        id: playerId,
        name,
        avatar,
        joinedAt: Date.now()
      });
    }

    if (!this.lobby.hostId) {
      this.lobby.hostId = playerId;
    }

    await this.saveLobby();
    broadcast(this.wsClients, { type: "player_join", players: this.lobby.players });

    return json(200, this.lobby);
  }

  async leave(playerId: string) {
    this.lobby.players = this.lobby.players.filter((p) => p.id !== playerId);

    if (this.lobby.hostId === playerId) {
      this.lobby.hostId = this.lobby.players[0]?.id ?? null;
    }

    await this.saveLobby();
    broadcast(this.wsClients, { type: "player_leave", players: this.lobby.players });

    return json(200, this.lobby);
  }

  async startMatch() {
    this.lobby.status = "running";
    await this.saveLobby();
    broadcast(this.wsClients, { type: "start" });
    return json(200, { ok: true });
  }

  async onCommand(body: any) {
    // commande X01 venant d’un joueur
    broadcast(this.wsClients, { type: "cmd", cmd: body });
    return json(200, { ok: true });
  }
}
