// =======================================================
// src/lib/online/wsClient.ts
// Client WebSocket pour le mode ONLINE (Cloudflare Worker)
// - Connexion à /room/:code
// - Reconnexion simple
// - Callbacks onOpen / onClose / onError / onMessage
// =======================================================

export type WsEventHandler = (ev?: any) => void;
export type WsMessageHandler = (data: any) => void;

export type WsClientOptions = {
  baseUrl: string; // ex: "wss://darts-online.<compte>.workers.dev"
  roomCode: string; // code du salon
  onOpen?: WsEventHandler;
  onClose?: WsEventHandler;
  onError?: WsEventHandler;
  onMessage?: WsMessageHandler;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
};

export class OnlineWsClient {
  private opts: WsClientOptions;
  private socket: WebSocket | null = null;
  private closedByUser = false;
  private reconnectTimer: number | null = null;

  constructor(opts: WsClientOptions) {
    this.opts = {
      autoReconnect: true,
      reconnectDelayMs: 2000,
      ...opts,
    };
  }

  connect() {
    this.closedByUser = false;

    const url = `${this.opts.baseUrl.replace(/\/$/, "")}/room/${encodeURIComponent(
      this.opts.roomCode.toUpperCase()
    )}`;

    try {
      this.socket = new WebSocket(url);
    } catch (e) {
      console.warn("[OnlineWsClient] WebSocket error:", e);
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener("open", () => {
      this.opts.onOpen?.();
    });

    this.socket.addEventListener("message", (evt) => {
      if (typeof evt.data === "string") {
        try {
          const parsed = JSON.parse(evt.data);
          this.opts.onMessage?.(parsed);
        } catch {
          // ignore
        }
      }
    });

    this.socket.addEventListener("close", () => {
      this.opts.onClose?.();
      this.socket = null;
      if (!this.closedByUser) {
        this.scheduleReconnect();
      }
    });

    this.socket.addEventListener("error", (ev) => {
      this.opts.onError?.(ev);
    });
  }

  private scheduleReconnect() {
    if (!this.opts.autoReconnect) return;
    if (this.reconnectTimer !== null) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.opts.reconnectDelayMs);
  }

  send(msg: any) {
    const payload = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[OnlineWsClient] send() while socket not open");
      return;
    }
    this.socket.send(payload);
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.socket?.close();
    } catch {
      // ignore
    }
    this.socket = null;
  }
}
