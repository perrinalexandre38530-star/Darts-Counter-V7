// =============================================================
// src/pages/X01OnlineSetup.tsx
// Pré-salle X01 Online (FULLWEB)
// - Appelé depuis App.tsx comme :
//     <X01OnlineSetup store={store} go={go} params={routeParams} />
// - Lit le lobbyCode dans params.lobbyCode
// - Calcule les defaults à partir de store.settings
// - Se connecte au Worker Cloudflare via useOnlineRoom
// - Affiche le code, l'état de connexion et la liste des joueurs
// - Bouton "Démarrer X01" :
//     • envoie startX01Match au Worker (ordre des joueurs)
//     • fait go("x01", { online: true, lobbyCode, fresh: ... })
// - Bouton debug pour afficher l'état brut RoomState (JSON)
// =============================================================

import React from "react";
import type { Store } from "../lib/types";
import { useOnlineRoom } from "../online/client/useOnlineRoom";

type StartScore = 301 | 501 | 701 | 901;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function X01OnlineSetup({ store, go, params }: Props) {
  // Profil actif (ou premier profil en fallback)
  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  // Code salon reçu via params.lobbyCode
  const rawCode = (params?.lobbyCode || "").toString().trim().toUpperCase();
  const effectiveCode = rawCode || "----";

  // --------------------------------------------
  // Defaults start / double-out
  // --------------------------------------------
  const allowedStarts: StartScore[] = [301, 501, 701, 901];

  const startRaw: number =
    (params?.start as number | undefined) ??
    (store.settings?.defaultX01 as number | undefined) ??
    501;

  const startScore: StartScore = allowedStarts.includes(startRaw as any)
    ? (startRaw as StartScore)
    : 501;

  const defaultDoubleOut: boolean =
    (params?.doubleOut as boolean | undefined) ??
    (store.settings?.doubleOut ?? true);

  // Hook WebSocket temps réel
  const {
    roomState,
    wsStatus,
    lastError,
    reconnect,
    close,
    sendPing,
    joinRoom,
    leaveRoom,
    startX01Match,
    sendVisit,
    undoLast,
  } = useOnlineRoom({
    roomCode: rawCode || "default",
    playerId: (activeProfile?.id as any) || "local",
    playerName: activeProfile?.name || "Joueur",
    autoJoin: true,
  });

  // --------------------------------------------
  // Helpers d'affichage
  // --------------------------------------------

  const statusLabel =
    wsStatus === "idle"
      ? "En attente"
      : wsStatus === "connecting"
      ? "Connexion en cours…"
      : wsStatus === "connected"
      ? "Connecté"
      : "Déconnecté";

  const statusColor =
    wsStatus === "connected"
      ? "#7fe2a9"
      : wsStatus === "connecting"
      ? "#ffd56a"
      : "#ff8a8a";

  const clients = roomState?.clients || [];
  const match: any = roomState?.match || null; // gardé pour le debug futur

  // Exemple d'ordre par défaut pour démarrer une manche
  const defaultOrder =
    clients.length > 0
      ? clients.map((c) => ({ id: c.id, name: c.name }))
      : [
          {
            id: (activeProfile?.id as any) || "local",
            name: activeProfile?.name || "Joueur",
          },
        ];

  const [showDebug, setShowDebug] = React.useState(false);

  function handleStartMatch() {
    if (!defaultOrder.length) return;

    // 1) Démarre la manche côté Worker (ordre des joueurs)
    startX01Match({
      startScore,
      order: defaultOrder,
    });

    // 2) Lance le X01 local (X01Play) via App.tsx
    //    → App n'a plus besoin de onStart, il va créer la config
    //      en mode ONLINE quand on passe { online: true }.
    go("x01", {
      resumeId: null,
      fresh: Date.now(),
      online: true,
      lobbyCode: rawCode || null,
      from: "online_fullweb",
    });
  }

  function handleSendDemoVisit() {
    // Simple démo : visite T20, 20, miss
    sendVisit([
      { value: 20, mult: 3 },
      { value: 20, mult: 1 },
      { value: 0, mult: 1 },
    ]);
  }

  // --------------------------------------------
  // RENDER
  // --------------------------------------------

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        X01 Online — Salle d’attente
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Code de salon partagé entre les joueurs. Dès que tout le monde est
        connecté à la même room, tu peux lancer la manche X01.
      </p>

      {/* Code du salon */}
      <div
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,.16)",
          fontFamily: "monospace",
          letterSpacing: 3,
          fontSize: 18,
          fontWeight: 800,
          textAlign: "center",
          color: rawCode ? "#ffd56a" : "#888",
          boxShadow: rawCode
            ? "0 0 12px rgba(255,215,80,.25)"
            : "0 0 8px rgba(0,0,0,.6)",
        }}
      >
        {effectiveCode}
      </div>

      {/* Statut WebSocket */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(32,32,40,.95), rgba(10,10,14,.98))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Connexion temps réel
          </div>
          <div style={{ opacity: 0.9 }}>
            Statut :{" "}
            <span
              style={{
                fontWeight: 700,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          {lastError && (
            <div
              style={{
                marginTop: 4,
                color: "#ff8a8a",
              }}
            >
              Erreur WebSocket : {lastError}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={reconnect}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              background: "linear-gradient(180deg,#4fb4ff,#1c78d5)",
              color: "#04101f",
              cursor: "pointer",
            }}
          >
            Reconnecter
          </button>
          <button
            type="button"
            onClick={close}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Infos joueur local */}
      {activeProfile && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.10)",
            background:
              "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Joueur local
          </div>
          <div style={{ opacity: 0.9 }}>
            Tu es connecté en tant que{" "}
            <b>{activeProfile.name || "Joueur"}</b> (
            <code style={{ fontSize: 11 }}>{activeProfile.id}</code>).
          </div>
        </div>
      )}

      {/* Liste des clients dans la room */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(26,26,34,.96), rgba(8,8,12,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Joueurs connectés dans la room
        </div>

        {clients.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Aucun client pour le moment. Demande à ton ami de se connecter au
            même code de salon.
          </div>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
            }}
          >
            {clients.map((c) => (
              <li key={c.id} style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: 700 }}>{c.name}</span>{" "}
                <span
                  style={{
                    opacity: 0.8,
                    fontSize: 11,
                  }}
                >
                  (<code>{c.id}</code>)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloc "Lancer la manche X01" */}
      <div
        style={{
          marginBottom: 16,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(30,30,40,.96), rgba(10,10,14,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Lancer la manche X01
        </div>

        <button
          type="button"
          onClick={handleStartMatch}
          disabled={!defaultOrder.length}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "9px 12px",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            background: defaultOrder.length
              ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
              : "linear-gradient(180deg,#444,#333)",
            color: "#1c1304",
            cursor: defaultOrder.length ? "pointer" : "default",
            opacity: defaultOrder.length ? 1 : 0.5,
            marginBottom: 6,
          }}
        >
          ⭐ Démarrer X01 ({startScore})
        </button>

        <div
          style={{
            fontSize: 11,
            opacity: 0.85,
          }}
        >
          Pour l’instant, cette action démarre la manche côté Worker Cloudflare{" "}
          <b>ET</b> ouvre un écran X01 local (même paramètres) sur ton
          appareil. Plus tard, cet écran sera entièrement synchronisé avec le
          state envoyé par le Worker.
        </div>
      </div>

      {/* Bouton debug DO */}
      <button
        type="button"
        onClick={() => setShowDebug((v) => !v)}
        style={{
          marginBottom: 10,
          width: "100%",
          borderRadius: 999,
          padding: "8px 12px",
          border: "none",
          fontWeight: 700,
          fontSize: 12,
          background: "linear-gradient(180deg,#4fb4ff,#1c78d5)",
          color: "#04101f",
          cursor: "pointer",
        }}
      >
        {showDebug ? "Masquer le mode debug (DO)" : "Afficher le mode debug (DO)"}
      </button>

      {/* Affichage brut de l'état Room / Match (debug) */}
      {showDebug && (
        <div
          style={{
            fontSize: 11,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(0,0,0,0.8)",
            maxHeight: 260,
            overflow: "auto",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            État RoomState (debug)
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(roomState, null, 2)}
          </pre>

          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={sendPing}
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                background: "linear-gradient(180deg,#666,#444)",
                color: "#f5f5f7",
                cursor: "pointer",
              }}
            >
              Ping
            </button>

            <button
              type="button"
              onClick={joinRoom}
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                background: "linear-gradient(180deg,#35c86d,#23a958)",
                color: "#03140a",
                cursor: "pointer",
              }}
            >
              join_room
            </button>

            <button
              type="button"
              onClick={leaveRoom}
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                background: "linear-gradient(180deg,#ff8a5a,#e0491f)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              leave_room
            </button>

            <button
              type="button"
              onClick={handleSendDemoVisit}
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                background: "linear-gradient(180deg,#4fb4ff,#1c78d5)",
                color: "#04101f",
                cursor: "pointer",
              }}
            >
              Visite T20-20-miss
            </button>

            <button
              type="button"
              onClick={undoLast}
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                background: "linear-gradient(180deg,#888,#555)",
                color: "#f5f5f7",
                cursor: "pointer",
              }}
            >
              Undo last
            </button>
          </div>
        </div>
      )}

      {/* Retour Friends / Home */}
      <button
        type="button"
        onClick={() => go("friends")}
        style={{
          marginTop: 4,
          width: "100%",
          borderRadius: 999,
          padding: "8px 12px",
          border: "none",
          fontWeight: 800,
          fontSize: 13,
          background: "linear-gradient(180deg,#444,#262626)",
          color: "#f5f5f7",
          cursor: "pointer",
        }}
      >
        ⬅️ Retour Mode Online & Amis
      </button>
    </div>
  );
}
