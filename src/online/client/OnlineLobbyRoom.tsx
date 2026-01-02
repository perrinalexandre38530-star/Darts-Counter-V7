// =======================================================
// src/online/client/OnlineLobbyRoom.tsx
// Salle d'attente ONLINE temps réel (X01)
// - Utilise useOnlineRoom (WebSocket vers Worker)
// - Affiche les joueurs présents dans la room
// - Bouton "Lancer la partie" (host seulement)
// =======================================================

import React from "react";
import { useOnlineRoom } from "./useOnlineRoom";
import type { OnlineLobby } from "../../lib/onlineApi";
import type { ServerEvent } from "../shared/types"; // si types différents → remplace par "any"
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  lobby: OnlineLobby;
  playerId: string;
  nickname: string;
  onMatchStarted?: (ev: ServerEvent | any) => void;
};

export default function OnlineLobbyRoom({
  lobby,
  playerId,
  nickname,
  onMatchStarted,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // On utilise le CODE de salon comme roomId WS (ex: "GFBB")
  const roomId = lobby.code.toUpperCase();

  const { connected, state, lastEvent, send } = useOnlineRoom({
    roomId,
    playerId,
    nickname,
  });

  const clients: { id: string; name: string }[] = state?.clients ?? [];
  const match = state?.match ?? null;

  // On considère le 1er joueur de la liste comme "host"
  const isHost = clients.length > 0 && clients[0].id === playerId;

  // Callback quand la partie démarre (match non nul)
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    if (!match || firedRef.current) return;
    firedRef.current = true;
    if (onMatchStarted) {
      onMatchStarted(
        lastEvent ??
          ({ t: "server_update", v: state?.v ?? 0, state } as any)
      );
    }
  }, [match, lastEvent, onMatchStarted, state]);

  function handleStartMatch() {
    if (!isHost) return;

    const order = clients.map((c) => c.id);

    // ⚠️ le champ dans OnlineLobbySettings s'appelle "start"
    const startScore = (lobby.settings?.start as number) || 501;

    send({
      t: "start_match",
      start: {
        game: "x01",
        startScore,
        order,
      },
    } as any);
  }

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background: "#111019",
        boxShadow:
          "0 22px 40px rgba(0,0,0,0.95), 0 0 22px rgba(0,0,0,0.8)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 14px ${theme.primary}88`,
            }}
          >
            {t("online.lobby.title", "Salle d’attente Online")}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11.5,
              opacity: 0.85,
              color: theme.textSoft,
            }}
          >
            {t(
              "online.lobby.subtitle",
              "Partage le code avec tes amis pour qu’ils rejoignent la salle."
            )}
          </div>
        </div>

        <div
          style={{
            minWidth: 80,
            textAlign: "right",
            fontSize: 11,
          }}
        >
          <div
            style={{
              borderRadius: 999,
              padding: "4px 10px",
              background: connected
                ? "linear-gradient(180deg,#32e87c,#13b45c)"
                : "#2b2b37",
              color: connected ? "#050607" : "#ddd",
              fontWeight: 700,
              boxShadow: connected
                ? `0 0 14px ${theme.primary}aa`
                : "none",
            }}
          >
            {connected
              ? t("online.lobby.connected", "Connecté")
              : t("online.lobby.disconnected", "Hors ligne")}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              opacity: 0.7,
            }}
          >
            {t("online.lobby.code", "Code")} :{" "}
            <span style={{ fontWeight: 800 }}>{roomId}</span>
          </div>
        </div>
      </div>

      {/* Liste joueurs */}
      <div
        style={{
          marginTop: 8,
          borderRadius: 16,
          padding: 10,
          background:
            "radial-gradient(circle at 0 0,#ffffff11,transparent 55%)",
        }}
      >
        {clients.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: theme.textSoft,
            }}
          >
            {t(
              "online.lobby.empty",
              "En attente de joueurs... Le salon est vide pour l’instant."
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {clients.map((c, idx) => {
              const isSelf = c.id === playerId;
              const hostBadge = idx === 0 ? " · Host" : "";
              return (
                <div
                  key={c.id}
                  style={{
                    borderRadius: 16,
                    padding: "6px 10px",
                    background:
                      "linear-gradient(180deg,#181822,#0a0a10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: idx === 0 ? theme.primary : "#2f3143",
                        color: idx === 0 ? "#111" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        boxShadow:
                          idx === 0
                            ? `0 0 14px ${theme.primary}aa`
                            : "0 0 8px rgba(0,0,0,0.6)",
                      }}
                    >
                      {c.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {c.name || "Player"}
                        {hostBadge && (
                          <span
                            style={{
                              marginLeft: 4,
                              fontSize: 10,
                              color: theme.primary,
                            }}
                          >
                            {hostBadge}
                          </span>
                        )}
                      </div>
                      {isSelf && (
                        <div
                          style={{
                            fontSize: 10,
                            color: theme.textSoft,
                          }}
                        >
                          {t("online.lobby.you", "C’est toi")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bouton lancer la partie */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          disabled={!isHost || clients.length < 1 || !!match}
          onClick={handleStartMatch}
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 999,
            padding: "10px 18px",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            cursor:
              !isHost || clients.length < 1 || !!match
                ? "default"
                : "pointer",
            background:
              !isHost || clients.length < 1
                ? "#2a2a36"
                : "linear-gradient(180deg,#41f57a,#17c456)",
            color:
              !isHost || clients.length < 1
                ? "#888"
                : "#050608",
            boxShadow:
              !isHost || clients.length < 1
                ? "none"
                : `0 0 18px ${theme.primary}aa`,
          }}
        >
          {match
            ? t("online.lobby.match_started", "Partie lancée")
            : isHost
            ? t("online.lobby.start_btn", "Lancer la partie")
            : t("online.lobby.wait_btn", "En attente de l’hôte")}
        </button>
      </div>
    </div>
  );
}
