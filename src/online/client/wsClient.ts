// =======================================================
// src/online/client/wsClient.ts
// Client WebSocket générique pour le Worker "darts-online"
// - Utilise VITE_ONLINE_WS_BASE_URL (wss://darts-online...workers.dev)
// - Envoie / reçoit des ClientEvent / ServerEvent
// =======================================================

import type { ClientEvent, ServerEvent } from "../shared/types";

export type RoomSocket = {
  send: (ev: ClientEvent) => void;
  close: () => void;
  isOpen: () => boolean;
};

export type RoomSocketHandlers = {
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  onMessage?: (ev: ServerEvent) => void;
};

// Petit helper pour construire l’URL WS à partir de la variable Vite
function buildWsUrl(roomId: string): string {
  const base =
    import.meta.env.VITE_ONLINE_WS_BASE_URL ||
    // fallback: même origine que la page, en remplaçant http -> ws
    window.location.origin.replace(/^http/, "ws");

  const trimmed = base.replace(/\/+$/, "");
  const code = encodeURIComponent(roomId.toUpperCase());

  return `${trimmed}/ws?roomId=${code}`;
}

/**
 * Ouvre un WebSocket vers la salle "roomId".
 * Ne gère PAS la reconnexion auto (on verra plus tard si besoin).
 */
export function connectRoomSocket(
  roomId: string,
  handlers: RoomSocketHandlers = {}
): RoomSocket {
  const url = buildWsUrl(roomId);
  const ws = new WebSocket(url);

  let opened = false;

  ws.onopen = () => {
    opened = true;
    handlers.onOpen?.();
  };

  ws.onclose = (ev) => {
    opened = false;
    handlers.onClose?.(ev);
  };

  ws.onerror = (ev) => {
    handlers.onError?.(ev);
  };

  ws.onmessage = (ev) => {
    try {
      const data = typeof ev.data === "string" ? ev.data : String(ev.data);
      const parsed: ServerEvent = JSON.parse(data);
      handlers.onMessage?.(parsed);
    } catch (err) {
      console.warn("[wsClient] unable to parse message", err);
    }
  };

  return {
    send(ev: ClientEvent) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(ev));
      } else {
        console.warn("[wsClient] send() called while socket not OPEN");
      }
    },
    close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
    isOpen() {
      return opened && ws.readyState === WebSocket.OPEN;
    },
  };
}
