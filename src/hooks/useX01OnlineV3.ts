// =======================================================
// src/hooks/useX01OnlineV3.ts
// Couche ONLINE autour du moteur X01 V3
// - Multi-joueurs ONLINE (jusqu'à 10 joueurs)
// - Ordre ALEATOIRE imposé par l'hôte
// - Support complet Sets / Legs (moteur X01 V3)
// - Commands réseau ("throw", "undo", "next") + snapshots
// - Gestion HOST / GUEST
// - Gestion commandes JOIN / LEAVE / READY / START (préparée)
// - 🔌 Intégration WebSocket vers Cloudflare Worker /room/:code
//   (VITE_ONLINE_WS_BASE_URL = wss://darts-online.<ton-compte>.workers.dev)
// =======================================================

import * as React from "react";
import { useX01EngineV3 } from "./useX01EngineV3";

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01CommandV3,
  X01PlayerId,
} from "../types/x01v3";

import {
  scoreDartV3,
  type X01DartInputV3,
} from "../lib/x01v3/x01LogicV3";

import type {
  X01OnlineRoleV3,
  X01OnlineMatchMetaV3,
  X01OnlineCommandEnvelope,
  X01OnlineLifecycleCommand,
} from "../lib/x01v3/x01OnlineProtocolV3";

// =============================================================
// CONFIG WS
// =============================================================

const WS_BASE: string =
  (import.meta as any).env?.VITE_ONLINE_WS_BASE_URL ||
  "ws://localhost:8787";

/**
 * Construit l'URL WebSocket finale pour une room donnée.
 * VITE_ONLINE_WS_BASE_URL doit être du type :
 *   wss://darts-online.<ton-compte>.workers.dev
 */
function buildRoomWsUrl(roomCode: string): string {
  const base = WS_BASE.replace(/\/+$/, "");
  return `${base}/room/${encodeURIComponent(roomCode)}`;
}

// Format générique des messages qui transitent via le DO
type WireMessage =
  | {
      kind: "command";
      command: X01OnlineCommandEnvelope;
    }
  | {
      kind: "snapshot";
      seq: number;
      state: X01MatchStateV3;
    }
  | {
      kind: "lifecycle";
      cmd: X01OnlineLifecycleCommand;
    }
  | {
      kind: "ping";
    };

// =============================================================
// TYPES PUBLICS DU HOOK
// =============================================================

export interface UseX01OnlineV3Args {
  role: X01OnlineRoleV3; // "host" ou "guest"
  meta: X01OnlineMatchMetaV3; // lobbyId, matchId...
  config: X01ConfigV3;

  /**
   * callbacks réseau optionnels :
   * - si tu les fournis, le hook n’ouvrira PAS de WebSocket.
   * - si tu les laisses undefined, le hook ouvre lui-même le WS
   *   vers /room/:lobbyId.
   */
  onSendCommand?: (payload: X01OnlineCommandEnvelope) => void;
  onSendSnapshot?: (payload: { seq: number; state: X01MatchStateV3 }) => void;
}

export interface UseX01OnlineV3Value {
  engine: ReturnType<typeof useX01EngineV3>;
  role: X01OnlineRoleV3;
  meta: X01OnlineMatchMetaV3;
  seq: number;

  // Local player (index dans config)
  getLocalPlayerId: () => X01PlayerId | null;

  // --- COMMANDES LOCALES ---
  sendLocalThrow: (input: X01DartInputV3) => void;
  sendLocalUndo: () => void;
  sendForceNextPlayer: () => void;

  // --- SNAPSHOT / SYNC ---
  sendSnapshot: () => void;

  // --- COMMANDES REMOTES (depuis WS) ---
  applyRemoteCommand: (env: X01OnlineCommandEnvelope) => void;
  applyRemoteSnapshot: (seq: number, state: X01MatchStateV3) => void;

  // --- ÉVÉNEMENTS DE SALLE (join/ready/start) ---
  sendLifecycle: (cmd: X01OnlineLifecycleCommand) => void;
  applyLifecycle: (cmd: X01OnlineLifecycleCommand) => void;
}

// =============================================================
// HOOK PRINCIPAL
// =============================================================

export function useX01OnlineV3({
  role,
  meta,
  config,
  onSendCommand,
  onSendSnapshot,
}: UseX01OnlineV3Args): UseX01OnlineV3Value {
  // Identifiant séquentiel unique pour chaque commande
  const [seq, setSeq] = React.useState(0);

  // ====================
  // MOTEUR LOCAL
  // ====================
  const engine = useX01EngineV3({
    config,
  });

  // ====================
  // WEBSOCKET (auto) SI onSendCommand/onSendSnapshot NON fournis
  // ====================

  const roomCode = meta.lobbyId; // 👉 on utilise lobbyId comme code de room
  const wsRef = React.useRef<WebSocket | null>(null);
  const pendingQueueRef = React.useRef<WireMessage[]>([]);

  const usingInternalWs = !onSendCommand && !onSendSnapshot;

  const sendOverWs = React.useCallback((msg: WireMessage) => {
    if (!usingInternalWs) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingQueueRef.current.push(msg);
      return;
    }
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }, [usingInternalWs]);

  // ==================================================
  // FONCTIONS LOCALES (THROW, UNDO, NEXT PLAYER)
  // ==================================================

  const getLocalPlayerId = React.useCallback((): X01PlayerId | null => {
    return config.players[0]?.id ?? null;
  }, [config.players]);

  function localApplyThrow(dart: X01DartInputV3) {
    engine.throwDart(dart);
  }

  function localApplyUndo() {
    engine.undoLast();
  }

  function localApplyForceNext() {
    engine.forceNextPlayer();
  }

  // ==================================================
  // COMMANDES RÉSEAU → appliquer localement
  // ==================================================

  const applyRemoteCommand = React.useCallback(
    (env: X01OnlineCommandEnvelope) => {
      if (!env) return;

      // IMPORTANT : ne pas rejouer nos propres commandes
      if (env.origin === role) return;

      if (env.type === "throw") {
        const d = env.payload.dart;
        if (!d) return;
        localApplyThrow({
          segment: d.segment,
          multiplier: d.multiplier,
        });
      }

      if (env.type === "undo") {
        localApplyUndo();
      }

      if (env.type === "next_player") {
        localApplyForceNext();
      }
    },
    [role]
  );

  const applyRemoteSnapshot = React.useCallback(
    (remoteSeq: number, state: X01MatchStateV3) => {
      // TODO: plus tard -> engine.syncFromRemote(state)
      console.warn(
        "[useX01OnlineV3] applyRemoteSnapshot — TODO: synchronisation moteur",
        remoteSeq,
        state
      );
    },
    []
  );

  const applyLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      console.log("[Lifecycle] Remote:", cmd);
      // Plus tard :
      // - gestion ready
      // - synchro démarrage
      // - gestion join/leave au niveau de la salle
    },
    []
  );

  // ==================================================
  // OUVERTURE / GESTION DU WEBSOCKET (si mode auto)
  // ==================================================

  React.useEffect(() => {
    if (!usingInternalWs) return; // réseau géré par le parent
    if (!roomCode) return;

    const url = buildRoomWsUrl(roomCode);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Flush des messages en attente
      const queue = pendingQueueRef.current;
      pendingQueueRef.current = [];
      for (const msg of queue) {
        try {
          ws.send(JSON.stringify(msg));
        } catch {
          // ignore
        }
      }
    };

    ws.onmessage = (event) => {
      let parsed: any;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== "object") return;

      const msg = parsed as WireMessage;

      switch (msg.kind) {
        case "command":
          if (msg.command) {
            applyRemoteCommand(msg.command);
          }
          break;
        case "snapshot":
          if (msg.state) {
            applyRemoteSnapshot(msg.seq ?? 0, msg.state);
          }
          break;
        case "lifecycle":
          if (msg.cmd) {
            applyLifecycle(msg.cmd);
          }
          break;
        case "ping":
        default:
          break;
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    ws.onerror = () => {
      // Tu peux loguer un toast ici si tu veux
      console.warn("[useX01OnlineV3] WebSocket error");
    };

    return () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [roomCode, usingInternalWs, applyRemoteCommand, applyRemoteSnapshot, applyLifecycle]);

  // ==================================================
  // EMETTRE une commande LOCALE → réseau
  // ==================================================

  const sendLocalThrow = React.useCallback(
    (input: X01DartInputV3) => {
      const dartScore = scoreDartV3(input);

      setSeq((prev) => {
        const nextSeq = prev + 1;

        // 1) appliquer en local
        engine.throwDart(input);

        // 2) envoyer au réseau
        const env: X01OnlineCommandEnvelope = {
          seq: nextSeq,
          type: "throw",
          origin: role,
          payload: {
            dart: {
              segment: input.segment,
              multiplier: input.multiplier,
              score: dartScore,
            },
          },
        };

        if (onSendCommand) {
          onSendCommand(env);
        } else {
          sendOverWs({ kind: "command", command: env });
        }

        return nextSeq;
      });
    },
    [engine, role, onSendCommand, sendOverWs]
  );

  const sendLocalUndo = React.useCallback(() => {
    setSeq((prev) => {
      const nextSeq = prev + 1;

      localApplyUndo();

      const env: X01OnlineCommandEnvelope = {
        seq: nextSeq,
        type: "undo",
        origin: role,
        payload: {},
      };

      if (onSendCommand) {
        onSendCommand(env);
      } else {
        sendOverWs({ kind: "command", command: env });
      }

      return nextSeq;
    });
  }, [role, onSendCommand, sendOverWs]);

  const sendForceNextPlayer = React.useCallback(() => {
    setSeq((prev) => {
      const nextSeq = prev + 1;

      localApplyForceNext();

      const env: X01OnlineCommandEnvelope = {
        seq: nextSeq,
        type: "next_player",
        origin: role,
        payload: {},
      };

      if (onSendCommand) {
        onSendCommand(env);
      } else {
        sendOverWs({ kind: "command", command: env });
      }

      return nextSeq;
    });
  }, [role, onSendCommand, sendOverWs]);

  // ==================================================
  // SNAPSHOT complet (host → réseau)
  // ==================================================

  const sendSnapshot = React.useCallback(() => {
    setSeq((prev) => {
      const nextSeq = prev + 1;

      const snapshotPayload = {
        seq: nextSeq,
        state: engine.state as X01MatchStateV3,
      };

      if (onSendSnapshot) {
        onSendSnapshot(snapshotPayload);
      } else {
        sendOverWs({
          kind: "snapshot",
          seq: nextSeq,
          state: engine.state as X01MatchStateV3,
        });
      }

      return nextSeq;
    });
  }, [engine.state, onSendSnapshot, sendOverWs]);

  // ==================================================
  // Commandes de SALLE : join / leave / ready / start
  // ==================================================

  const sendLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      setSeq((prev) => {
        const nextSeq = prev + 1;

        if (onSendCommand) {
          onSendCommand({
            seq: nextSeq,
            type: "lifecycle",
            origin: role,
            payload: cmd,
          });
        } else {
          sendOverWs({
            kind: "lifecycle",
            cmd,
          });
        }

        return nextSeq;
      });
    },
    [onSendCommand, role, sendOverWs]
  );

  // ==================================================
  // EXPORT
  // ==================================================

  return {
    engine,
    role,
    meta,
    seq,
    getLocalPlayerId,
    sendLocalThrow,
    sendLocalUndo,
    sendForceNextPlayer,
    sendSnapshot,
    applyRemoteCommand,
    applyRemoteSnapshot,
    sendLifecycle,
    applyLifecycle,
  };
}
