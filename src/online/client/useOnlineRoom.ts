// =========================================================
// src/online/client/useOnlineRoom.ts
// Hook client WebSocket pour le mode X01 Online temps réel
// - Se connecte au Worker Cloudflare (/room/:code)
// - Envoie / reçoit les ClientEvent / ServerEvent
// - Expose RoomState + helpers (join, start, visit, undo…)
// =========================================================

import React from "react";
import type {
  ClientEvent,
  ServerEvent,
  RoomState,
  PlayerId,
  RoomId,
} from "../shared/types";

// ---------------------------------------------------------
// Config WS : base URL depuis Vite
// ---------------------------------------------------------
//
// Dans ton .env.local (front) tu dois avoir UNE ligne :
//   VITE_ONLINE_WS_BASE_URL=wss://darts-online.<ton-compte>.workers.dev
//
// En dev local, si tu fais `wrangler dev` sur le worker :
//   VITE_ONLINE_WS_BASE_URL=ws://127.0.0.1:8787
// ---------------------------------------------------------

const WS_BASE =
  import.meta.env.VITE_ONLINE_WS_BASE_URL ||
  (import.meta.env.DEV ? "ws://127.0.0.1:8787" : "");

type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type UseOnlineRoomOptions = {
  roomId: RoomId | string; // code salon ex: "4F9Q"
  playerId: PlayerId;      // id joueur côté app
  nickname: string;        // pseudo affiché dans la room
  autoJoin?: boolean;      // join_room auto à la connexion
};

type UseOnlineRoomReturn = {
  // état temps réel
  connected: boolean;
  status: WsStatus;
  state: RoomState | null;
  lastEvent: ServerEvent | null;
  error: string | null;

  // API générique
  send: (ev: ClientEvent) => void;
  reconnect: () => void;
  close: () => void;

  // Helpers X01 (optionnels mais pratiques)
  sendPing: () => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  startX01Match: (params: {
    startScore: number;
    order: { id: PlayerId; name: string }[];
  }) => void;
  sendVisit: (darts: { value: number; mult: 1 | 2 | 3 | 25 | 50 }[]) => void;
  undoLast: () => void;
};

// ---------------------------------------------------------
// Helper : construit l’URL WS -> /room/:code
// ---------------------------------------------------------

function buildWsUrl(roomCode: string): string {
  if (!WS_BASE) {
    console.warn(
      "[useOnlineRoom] VITE_ONLINE_WS_BASE_URL non défini. Ajoute-le dans .env.local."
    );
  }
  const base = (WS_BASE || "").replace(/\/+$/, "");
  const code = roomCode.trim().toUpperCase();
  return `${base}/room/${code}`;
}

// ---------------------------------------------------------
// Hook principal
// ---------------------------------------------------------

export function useOnlineRoom(opts: UseOnlineRoomOptions): UseOnlineRoomReturn {
  const { roomId, playerId, nickname, autoJoin = true } = opts;

  const [state, setState] = React.useState<RoomState | null>(null);
  const [status, setStatus] = React.useState<WsStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<ServerEvent | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTokenRef = React.useRef(0);

  // --------- Envoi sécurisé (API générique) ---------

  const send = React.useCallback((ev: ClientEvent) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[useOnlineRoom] WS non connecté, impossible d’envoyer", ev);
      return;
    }
    try {
      ws.send(JSON.stringify(ev));
    } catch (e) {
      console.warn("[useOnlineRoom] ws.send error", e);
    }
  }, []);

  // --------- Gestion des messages serveur ---------

  const handleServerEvent = React.useCallback((ev: ServerEvent) => {
    setLastEvent(ev);

    switch (ev.t) {
      case "pong": {
        // Ping/pong pour debug
        return;
      }

      case "error": {
        console.warn("[Room] server error", ev.code, ev.msg);
        setError(ev.msg || ev.code || "Erreur serveur");
        return;
      }

      case "server_update": {
        // État complet de la room : clients + match + version
        setState(ev.state);
        return;
      }

      default: {
        // Pour tout autre event custom si tu en ajoutes plus tard
        return;
      }
    }
  }, []);

  // --------- Connexion WS + auto-reconnect ---------

  const connect = React.useCallback(() => {
    const token = ++reconnectTokenRef.current;
    setError(null);

    if (!roomId) {
      setError("Code de salon manquant.");
      setStatus("error");
      return;
    }

    const url = buildWsUrl(String(roomId));
    if (!url) {
      setError(
        "URL WebSocket invalide. Vérifie VITE_ONLINE_WS_BASE_URL dans .env.local."
      );
      setStatus("error");
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        if (reconnectTokenRef.current !== token) {
          ws.close();
          return;
        }
        setStatus("connected");

        // Auto-join une fois connecté
        if (autoJoin) {
          send({
            t: "join_room",
            playerId,
            name: nickname || "Joueur",
          } as ClientEvent);
        }
      };

      ws.onerror = (ev) => {
        console.warn("[useOnlineRoom] ws.onerror", ev);
        // 🔴 Message propre (et plus "Erreur WebSocket : Erreur WebSocket…")
        setError(
          "Impossible de se connecter au serveur temps réel (WebSocket)."
        );
        setStatus("error");
      };

      ws.onclose = () => {
        if (reconnectTokenRef.current !== token) {
          return;
        }
        setStatus("disconnected");

        // Auto-reconnect "doux"
        setTimeout(() => {
          if (reconnectTokenRef.current === token) {
            connect();
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const raw =
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data as ArrayBuffer);
          const msg: ServerEvent = JSON.parse(raw);
          handleServerEvent(msg);
        } catch (e) {
          console.warn("[useOnlineRoom] message parse error", e);
        }
      };
    } catch (e: any) {
      console.error("[useOnlineRoom] WebSocket init error", e);
      setError(
        e?.message ||
          "Impossible d’ouvrir la connexion WebSocket (voir console)."
      );
      setStatus("error");
    }
  }, [roomId, nickname, playerId, autoJoin, handleServerEvent, send]);

  // Connexion au montage / changement de roomId
  React.useEffect(() => {
    connect();
    return () => {
      reconnectTokenRef.current++;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  // --------- API reconnect / close ---------

  const reconnect = React.useCallback(() => {
    reconnectTokenRef.current++;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setState(null);
    setStatus("idle");
    connect();
  }, [connect]);

  const close = React.useCallback(() => {
    reconnectTokenRef.current++;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  // --------- Helpers X01 (au-dessus de send) ---------

  const sendPing = React.useCallback(() => {
    send({ t: "ping" } as ClientEvent);
  }, [send]);

  const joinRoom = React.useCallback(() => {
    send({
      t: "join_room",
      playerId,
      name: nickname || "Joueur",
    } as ClientEvent);
  }, [send, playerId, nickname]);

  const leaveRoom = React.useCallback(() => {
    send({ t: "leave_room" } as ClientEvent);
  }, [send]);

  const startX01Match = React.useCallback(
    (params: { startScore: number; order: { id: PlayerId; name: string }[] }) => {
      send({
        t: "start_match",
        start: {
          game: "x01",
          startScore: params.startScore,
          order: params.order.map((p) => p.id),
        },
      } as ClientEvent);
    },
    [send]
  );

  const sendVisit = React.useCallback(
    (darts: { value: number; mult: 1 | 2 | 3 | 25 | 50 }[]) => {
      send({
        t: "throw_visit",
        darts,
      } as ClientEvent);
    },
    [send]
  );

  const undoLast = React.useCallback(() => {
    send({ t: "undo_last" } as ClientEvent);
  }, [send]);

  // --------- Retour hook ---------

  return {
    connected: status === "connected",
    status,
    state,
    lastEvent,
    error,
    send,
    reconnect,
    close,
    sendPing,
    joinRoom,
    leaveRoom,
    startX01Match,
    sendVisit,
    undoLast,
  };
}
