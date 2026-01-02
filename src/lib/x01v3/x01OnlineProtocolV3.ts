// =======================================================
// src/lib/x01v3/x01OnlineProtocolV3.ts
// Protocole ONLINE pour X01 V3
// - Messages échangés entre clients / serveur
// - Commandes (throw, undo, next, sync_state)
// - Snapshots de match
// =======================================================

import type {
    X01MatchStateV3,
    X01CommandV3,
  } from "../../types/x01v3";
  
  export type X01OnlineRoleV3 = "host" | "guest";
  
  export interface X01OnlinePlayerInfoV3 {
    playerId: string;   // id local (profil)
    displayName: string;
  }
  
  export interface X01OnlineMatchMetaV3 {
    lobbyId: string;
    matchId: string;
    createdAt: number;
    hostId: string;
  }
  
  /* -------------------------------------------------------
     Messages réseau de base
  ------------------------------------------------------- */
  export type X01OnlineMessageTypeV3 =
    | "hello"
    | "join"
    | "joined"
    | "command"
    | "snapshot"
    | "ping"
    | "pong"
    | "error";
  
  export interface X01OnlineMessageBaseV3 {
    type: X01OnlineMessageTypeV3;
    matchId: string;
    lobbyId: string;
    senderId: string;
    ts: number;
  }
  
  /* ------------------ HELLO / JOIN ---------------------- */
  
  export interface X01OnlineHelloMsgV3 extends X01OnlineMessageBaseV3 {
    type: "hello";
    role: X01OnlineRoleV3;
    player: X01OnlinePlayerInfoV3;
  }
  
  export interface X01OnlineJoinMsgV3 extends X01OnlineMessageBaseV3 {
    type: "join";
    player: X01OnlinePlayerInfoV3;
  }
  
  export interface X01OnlineJoinedMsgV3 extends X01OnlineMessageBaseV3 {
    type: "joined";
    players: X01OnlinePlayerInfoV3[];
  }
  
  /* ------------------ COMMANDES ------------------------- */
  
  export interface X01OnlineCommandMsgV3 extends X01OnlineMessageBaseV3 {
    type: "command";
    seq: number;            // numéro de commande (ordre total)
    command: X01CommandV3;  // { type: "throw" | "undo" | "next" | ... }
  }
  
  /* ------------------ SNAPSHOT COMPLET ------------------ */
  
  export interface X01OnlineSnapshotMsgV3 extends X01OnlineMessageBaseV3 {
    type: "snapshot";
    seq: number;
    state: X01MatchStateV3;
  }
  
  /* ------------------ PING / PONG ----------------------- */
  
  export interface X01OnlinePingMsgV3 extends X01OnlineMessageBaseV3 {
    type: "ping";
  }
  
  export interface X01OnlinePongMsgV3 extends X01OnlineMessageBaseV3 {
    type: "pong";
  }
  
  /* ------------------ ERREUR ---------------------------- */
  
  export interface X01OnlineErrorMsgV3 extends X01OnlineMessageBaseV3 {
    type: "error";
    code: string;
    message: string;
  }
  
  /* -------------------------------------------------------
     Union globale des messages ONLINE X01 V3
  ------------------------------------------------------- */
  export type X01OnlineMessageV3 =
    | X01OnlineHelloMsgV3
    | X01OnlineJoinMsgV3
    | X01OnlineJoinedMsgV3
    | X01OnlineCommandMsgV3
    | X01OnlineSnapshotMsgV3
    | X01OnlinePingMsgV3
    | X01OnlinePongMsgV3
    | X01OnlineErrorMsgV3;
  
  /* -------------------------------------------------------
     Helpers simples
  ------------------------------------------------------- */
  
  export function makeBaseMsg(
    partial: Partial<X01OnlineMessageBaseV3>
  ): X01OnlineMessageBaseV3 {
    return {
      type: "ping",
      matchId: partial.matchId || "",
      lobbyId: partial.lobbyId || "",
      senderId: partial.senderId || "",
      ts: partial.ts || Date.now(),
    };
  }
  