// ============================================
// src/pages/X01OnlineLobby.tsx
// Salle d’attente ONLINE (mock v1)
// - Jusqu’à 10 joueurs
// - Option B × C (avatars + halo + pseudo + drapeau)
// - Hôte = peut START
// - Guests = READY / UNREADY
// - Events locaux (réseau mock intégré à FriendsPage plus tard)
// ============================================

import React from "react";

export type LobbyPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  country?: string;
  isHost?: boolean;
  isReady?: boolean;
};

type Props = {
  lobbyCode: string;
  selfId: string;
  hostId: string;
  players: LobbyPlayer[];
  maxPlayers?: number; // par défaut 10
  onBack: () => void;

  // Events à remonter vers FriendsPage / onlineApi
  onReadyChange: (ready: boolean) => void;
  onStartMatch: () => void;
};

export default function X01OnlineLobby({
  lobbyCode,
  selfId,
  hostId,
  players,
  maxPlayers = 10,
  onBack,
  onReadyChange,
  onStartMatch,
}: Props) {
  const self = players.find((p) => p.id === selfId);
  const isHost = selfId === hostId;

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      {/* HEADER */}
      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: 16,
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(0,0,0,.65)",
          color: "#fff",
          fontSize: 13,
        }}
      >
        ← Retour
      </button>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 4,
          textShadow: "0 0 12px rgba(255,215,80,.4)",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        Salon X01 Online
      </h2>

      <div
        style={{
          fontSize: 12.5,
          opacity: 0.85,
          marginBottom: 12,
          marginTop: -2,
        }}
      >
        Code du salon :{" "}
        <b style={{ color: "#ffd56a", letterSpacing: 1 }}>{lobbyCode}</b>
      </div>

      {/* LISTE DES JOUEURS */}
      <div
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(26,26,32,.96), rgba(10,10,12,.98))",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            fontSize: 13,
          }}
        >
          Joueurs ({players.length}/{maxPlayers})
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 6,
          }}
        >
          {players.map((p) => (
            <LobbyPlayerRow
              key={p.id}
              player={p}
              isSelf={p.id === selfId}
              isHost={p.id === hostId}
            />
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <LobbyActions
        isHost={isHost}
        self={self!}
        players={players}
        onReadyChange={onReadyChange}
        onStartMatch={onStartMatch}
      />
    </div>
  );
}

/* ===========================================================
   Composant : Ligne joueur (OPTION B × C)
=========================================================== */
function LobbyPlayerRow({
  player,
  isSelf,
  isHost,
}: {
  player: LobbyPlayer;
  isSelf: boolean;
  isHost: boolean;
}) {
  const borderClr = player.isHost
    ? "rgba(255,215,80,.9)"
    : player.isReady
    ? "rgba(127,226,169,.9)"
    : "rgba(255,255,255,.1)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 8,
        borderRadius: 12,
        border: `1px solid ${borderClr}`,
        background: "rgba(0,0,0,0.45)",
        boxShadow: player.isHost
          ? "0 0 12px rgba(255,215,80,.3)"
          : player.isReady
          ? "0 0 10px rgba(127,226,169,.3)"
          : "none",
      }}
    >
      <Avatar
        name={player.name}
        dataUrl={player.avatarDataUrl || null}
        ready={player.isReady}
        host={player.isHost}
        country={player.country}
      />

      <div style={{ flex: 1, marginLeft: 10 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: player.isHost ? "#ffd56a" : "#fff",
            textShadow: player.isHost
              ? "0 0 10px rgba(255,215,80,.3)"
              : player.isReady
              ? "0 0 8px rgba(127,226,169,.3)"
              : "",
          }}
        >
          {player.name}
          {isSelf && (
            <span
              style={{
                fontSize: 11,
                opacity: 0.9,
                marginLeft: 6,
                fontWeight: 600,
              }}
            >
              (toi)
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            opacity: 0.75,
          }}
        >
          {player.isHost ? "Hôte" : player.isReady ? "Prêt" : "En attente…"}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   Avatar cercle avec halo + flag
=========================================================== */
function Avatar({
  name,
  dataUrl,
  ready,
  host,
  country,
}: {
  name: string;
  dataUrl?: string | null;
  ready?: boolean;
  host?: boolean;
  country?: string;
}) {
  const haloColor = host
    ? "#ffd56a"
    : ready
    ? "#7fe2a9"
    : "rgba(255,255,255,0.25)";

  const flag = getCountryFlag(country || "");

  return (
    <div
      style={{
        position: "relative",
        width: 48,
        height: 48,
        borderRadius: "50%",
        overflow: "hidden",
        border: `2px solid ${haloColor}`,
        boxShadow: `0 0 14px ${haloColor}55`,
        background: "#000",
        flexShrink: 0,
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: haloColor,
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* FLAG */}
      {flag && (
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid #000",
            background: "#111",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
          }}
        >
          {flag}
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   Boutons READY / START
=========================================================== */
function LobbyActions({
  isHost,
  self,
  players,
  onReadyChange,
  onStartMatch,
}: {
  isHost: boolean;
  self: LobbyPlayer;
  players: LobbyPlayer[];
  onReadyChange: (ready: boolean) => void;
  onStartMatch: () => void;
}) {
  const everyoneReady = players.every((p) => p.isHost || p.isReady);

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 14,
        background:
          "linear-gradient(180deg, rgba(26,26,32,.8), rgba(10,10,12,.96))",
        border: "1px solid rgba(255,255,255,.12)",
      }}
    >
      {!isHost ? (
        <>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              marginBottom: 10,
            }}
          >
            En attente du lancement par l’hôte…
          </div>

          <button
            type="button"
            onClick={() => onReadyChange(!self.isReady)}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              fontSize: 14,
              border: "none",
              background: self.isReady
                ? "linear-gradient(180deg,#ff5a5a,#e01f1f)"
                : "linear-gradient(180deg,#7fe2a9,#35c86d)",
              color: self.isReady ? "#fff" : "#04120a",
              boxShadow: "0 8px 20px rgba(0,0,0,.55)",
            }}
          >
            {self.isReady ? "Annuler" : "Prêt !"}
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              marginBottom: 10,
            }}
          >
            Tu es l’hôte. Lance la partie quand tout le monde est prêt.
          </div>

          <button
            type="button"
            disabled={!everyoneReady || players.length < 1}
            onClick={onStartMatch}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              fontSize: 14,
              border: "none",
              background:
                everyoneReady && players.length >= 1
                  ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
                  : "linear-gradient(180deg,#555,#333)",
              color:
                everyoneReady && players.length >= 1
                  ? "#1b1404"
                  : "rgba(255,255,255,.4)",
              boxShadow:
                everyoneReady && players.length >= 1
                  ? "0 8px 20px rgba(0,0,0,.55)"
                  : "none",
              cursor: everyoneReady ? "pointer" : "default",
            }}
          >
            Démarrer la partie
          </button>
        </>
      )}
    </div>
  );
}

/* ===========================================================
   Flag util
=========================================================== */
function getCountryFlag(country: string): string {
  if (!country) return "";

  const trimmed = country.trim();
  const cps = Array.from(trimmed);

  // Déjà un emoji ?
  if (cps.length === 2) {
    const cp0 = cps[0].codePointAt(0) ?? 0;
    const cp1 = cps[1].codePointAt(0) ?? 0;
    if (cp0 >= 0x1f1e6 && cp0 <= 0x1f1ff && cp1 >= 0x1f1e6 && cp1 <= 0x1f1ff) {
      return trimmed;
    }
  }

  return "";
}
