// =======================================================
// src/hooks/useOnlineRoom.ts
// Hook React pour gérer un salon ONLINE temps réel
// - Connexion WS via OnlineWsClient
// - Etat du salon (players, roomCode)
// - Fonctions join / leave / sendX01Command
// =======================================================

import * as React from "react";
import { OnlineWsClient } from "../lib/online/wsClient";

export type OnlineRoomPlayer = {
  userId: string;
  nickname: string;
  isHost: boolean;
  lastSeen: number;
};

export type OnlineRoomState = {
  roomCode: string;
  players: OnlineRoomPlayer[];
};

export type UseOnlineRoomProps = {
  roomCode: string; // code du salon
  userId: string;
  nickname: string;
  isHost?: boolean;
};

export type UseOnlineRoomValue = {
  connected: boolean;
  room: OnlineRoomState | null;
  lastError: string | null;
  sendJoin: () => void;
  sendLeave: () => void;
  sendPing: () => void;
  sendX01Command: (payload: any) => void;
  sendCustom: (kind: string, payload: any) => void;
};

export function useOnlineRoom({
  roomCode,
  userId,
  nickname,
  isHost,
}: UseOnlineRoomProps): UseOnlineRoomValue {
  const [connected, setConnected] = React.useState(false);
  const [room, setRoom] = React.useState<OnlineRoomState | null>(null);
  const [lastError, setLastError] = React.useState<string | null>(null);

  const clientRef = React.useRef<OnlineWsClient | null>(null);

  const baseUrl =
    import.meta.env.VITE_ONLINE_WS_BASE_URL ||
    (window.location.protocol === "https:"
      ? "wss://darts-online.YOURACCOUNT.workers.dev"
      : "ws://127.0.0.1:8787");

  // Ouverture WS
  React.useEffect(() => {
    const client = new OnlineWsClient({
      baseUrl,
      roomCode,
      onOpen: () => {
        setConnected(true);
        setLastError(null);
        // on envoie join automatiquement
        client.send({
          type: "join",
          userId,
          nickname,
          isHost: !!isHost,
          lobbyCode: roomCode,
        });
      },
      onClose: () => {
        setConnected(false);
      },
      onError: () => {
        setLastError("WebSocket error");
      },
      onMessage: (msg) => {
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "welcome") {
          // rien de spécial à faire ici
          return;
        }

        if (msg.type === "room_state") {
          setRoom({
            roomCode: msg.roomCode,
            players: msg.players ?? [],
          });
          return;
        }

        if (msg.type === "player_joined") {
          setRoom((prev) => {
            if (!prev) {
              return {
                roomCode: roomCode,
                players: [msg.player],
              };
            }
            const exists = prev.players.some(
              (p) => p.userId === msg.player.userId
            );
            if (exists) return prev;
            return {
              ...prev,
              players: [...prev.players, msg.player],
            };
          });
          return;
        }

        if (msg.type === "player_left") {
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.filter(
                (p) => p.userId !== msg.userId
              ),
            };
          });
          return;
        }

        if (msg.type === "x01_cmd") {
          // ⚠️ Ce hook se contente de recevoir les commandes X01.
          // Tu peux ici déclencher un callback via un param, ou bien
          // stocker dans un state pour que X01OnlinePlay le consomme.
          // Pour l’instant on log simplement :
          console.log("[useOnlineRoom] x01_cmd reçu:", msg);
          return;
        }

        if (msg.type === "custom") {
          console.log("[useOnlineRoom] custom message:", msg);
          return;
        }
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId, nickname, isHost]);

  const sendJoin = React.useCallback(() => {
    clientRef.current?.send({
      type: "join",
      userId,
      nickname,
      isHost: !!isHost,
      lobbyCode: roomCode,
    });
  }, [userId, nickname, isHost, roomCode]);

  const sendLeave = React.useCallback(() => {
    clientRef.current?.send({ type: "leave" });
  }, []);

  const sendPing = React.useCallback(() => {
    clientRef.current?.send({ type: "ping" });
  }, []);

  const sendX01Command = React.useCallback((payload: any) => {
    clientRef.current?.send({
      type: "x01_cmd",
      payload,
    });
  }, []);

  const sendCustom = React.useCallback((kind: string, payload: any) => {
    clientRef.current?.send({
      type: "custom",
      kind,
      payload,
    });
  }, []);

  return {
    connected,
    room,
    lastError,
    sendJoin,
    sendLeave,
    sendPing,
    sendX01Command,
    sendCustom,
  };
}
