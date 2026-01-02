// =============================================================
// src/pages/X01OnlinePlayV3.tsx
// X01 V3 ONLINE — même UI que X01PlayV3, moteur enveloppé online
// - Utilise useX01OnlineV3 (moteur + réseau)
// - Connexion WebSocket vers le Worker Cloudflare /room/:code
// - Envoie les commandes "throw/undo/next/snapshot" au serveur
// - Reçoit les commandes / snapshots / lifecycle depuis le serveur
// =============================================================

import React from "react";

import type { X01ConfigV3, X01PlayerId } from "../types/x01v3";
import { useX01OnlineV3 } from "../hooks/useX01OnlineV3";

import Keypad from "../components/Keypad";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../components/x01v3/X01LegOverlayV3";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type {
  X01DartInputV3,
} from "../lib/x01v3/x01LogicV3";

import type {
  X01OnlineCommandEnvelope,
  X01OnlineLifecycleCommand,
} from "../lib/x01v3/x01OnlineProtocolV3";

type OnlineWsStatus = "idle" | "connecting" | "open" | "closed" | "error";

type Props = {
  config: X01ConfigV3;
  /** Code de salon / room (ex: "AB7F") → utilisé côté Worker */
  lobbyCode: string;
  /** Identifiant de match (peut être un uuid généré côté client pour l’instant) */
  matchId: string;
  /** Rôle de ce client dans le salon */
  role: "host" | "guest";
};

type ServerWsMessage =
  | { kind: "welcome"; roomId: string }
  | { kind: "pong" }
  | { kind: "command"; data: X01OnlineCommandEnvelope }
  | { kind: "snapshot"; data: { seq: number; state: any } }
  | { kind: "lifecycle"; data: X01OnlineLifecycleCommand }
  | { kind: "error"; code: string; message: string }
  | { kind: "info"; message: string };

type ClientWsMessage =
  | {
      kind: "join";
      role: "host" | "guest";
      lobbyCode: string;
      matchId: string;
      playerId: X01PlayerId | null;
    }
  | { kind: "ping" }
  | { kind: "command"; data: X01OnlineCommandEnvelope }
  | { kind: "snapshot"; data: { seq: number; state: any } }
  | { kind: "lifecycle"; data: X01OnlineLifecycleCommand };

function buildWsUrl(lobbyCode: string): string | null {
  const base =
  import.meta.env.VITE_ONLINE_WS_BASE_URL ||
  "wss://dc-online-v3.perrin-alexandre38530.workers.dev";

  if (!base) {
    console.warn(
      "[X01OnlinePlayV3] VITE_ONLINE_WS_BASE_URL non défini dans .env.local"
    );
    return null;
  }

  const trimmedBase = base.replace(/\/+$/, ""); // supprime trailing /
  const code = (lobbyCode || "").toUpperCase();
  return `${trimmedBase}/room/${encodeURIComponent(code)}`;
}

export default function X01OnlinePlayV3({
  config,
  lobbyCode,
  matchId,
  role,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // ===========================
  // 1. WebSocket client
  // ===========================
  const wsRef = React.useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = React.useState<OnlineWsStatus>("idle");
  const [wsError, setWsError] = React.useState<string | null>(null);

  // Ces callbacks sont donnés au hook online pour qu’il envoie les commandes
  const sendWsCommand = React.useCallback((env: X01OnlineCommandEnvelope) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msg: ClientWsMessage = { kind: "command", data: env };
    ws.send(JSON.stringify(msg));
  }, []);

  const sendWsSnapshot = React.useCallback(
    (payload: { seq: number; state: any }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const msg: ClientWsMessage = { kind: "snapshot", data: payload };
      ws.send(JSON.stringify(msg));
    },
    []
  );

  // ===========================
  // 2. Moteur ONLINE (hook V3)
  // ===========================
  const online = useX01OnlineV3({
    role,
    meta: {
      lobbyId: lobbyCode, // on réutilise le code salon comme identifiant logique
      matchId,
      createdAt: Date.now(),
      hostId: "", // à brancher plus tard avec le vrai userId online
    },
    config,
    onSendCommand: sendWsCommand,
    onSendSnapshot: sendWsSnapshot,
  });

  const {
    engine,
  } = online;

  const {
    state,
    liveStatsByPlayer,
    activePlayerId,
    scores,
    status,
    startNextLeg,
  } = engine;

  const activePlayer = config.players.find((p) => p.id === activePlayerId);
  const currentVisit = state.visit;

  // ===========================
  // 3. Connexion WebSocket
  // ===========================
  React.useEffect(() => {
    const url = buildWsUrl(lobbyCode);
    if (!url) {
      setWsStatus("error");
      setWsError(
        "URL WebSocket non configurée. Vérifie VITE_ONLINE_WS_BASE_URL dans .env.local."
      );
      return;
    }

    setWsError(null);
    setWsStatus("connecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      // On envoie un JOIN avec quelques métadonnées
      const joinMsg: ClientWsMessage = {
        kind: "join",
        role,
        lobbyCode,
        matchId,
        playerId: online.getLocalPlayerId(),
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onclose = () => {
      setWsStatus("closed");
    };

    ws.onerror = () => {
      setWsStatus("error");
      setWsError("Erreur de connexion WebSocket.");
    };

    ws.onmessage = (event) => {
      let data: ServerWsMessage | undefined;
      try {
        data = JSON.parse(String(event.data));
      } catch (e) {
        console.warn("[X01OnlinePlayV3] Message WS invalide", e);
        return;
      }
      if (!data) return;

      switch (data.kind) {
        case "welcome":
        case "pong":
        case "info":
          // Pour debug pour l’instant
          console.log("[X01OnlinePlayV3] WS info:", data);
          break;

        case "error":
          console.warn("[X01OnlinePlayV3] WS error:", data);
          setWsError(data.message || "Erreur serveur online.");
          break;

        case "command":
          // Commande reçue → on la passe au hook online
          online.applyRemoteCommand(data.data);
          break;

        case "snapshot":
          // Snapshot complet reçu (souvent depuis l’host)
          online.applyRemoteSnapshot(data.data.seq, data.data.state);
          break;

        case "lifecycle":
          // Join / leave / ready / start, etc.
          online.applyLifecycle(data.data);
          break;

        default:
          console.log("[X01OnlinePlayV3] WS message ignoré:", data);
          break;
      }
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyCode, matchId, role]);

  // ===========================
  // 4. Helpers UI (identiques à X01PlayV3)
  // ===========================

  function formatCheckout() {
    const suggestion = currentVisit.checkoutSuggestion;
    if (!suggestion) return "";

    return suggestion.darts
      .map((d) => {
        const seg = d.segment === 25 ? "BULL" : String(d.segment);
        if (d.multiplier === 1) return seg;
        if (d.multiplier === 2) return `D${seg}`;
        if (d.multiplier === 3) return `T${seg}`;
        return seg;
      })
      .join(" • ");
  }

  function computeAvg3For(playerId: X01PlayerId): number {
    const live = liveStatsByPlayer[playerId];
    if (!live || live.dartsThrown === 0) return 0;
    const perDart = live.totalScore / live.dartsThrown;
    return perDart * 3;
  }

  const miniRanking = React.useMemo(() => {
    return config.players
      .map((p) => {
        const avg3 = computeAvg3For(p.id);
        return {
          id: p.id,
          name: p.name,
          score: scores[p.id] ?? config.startScore,
          legsWon: state.legsWon[p.id] ?? 0,
          setsWon: state.setsWon[p.id] ?? 0,
          avg3,
        };
      })
      .sort((a, b) => {
        if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
        if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
        return a.score - b.score;
      });
  }, [config.players, scores, state.legsWon, state.setsWon, config.startScore]);

  // Keypad → moteur online (local throw + envoi réseau via hook)
  function handleKeypadDart(input: X01DartInputV3) {
    online.sendLocalThrow(input);
  }

  // ===========================
  // 5. RENDER
  // ===========================

  return (
    <div className={`x01-play-v3-page theme-${theme.id}`}>
      {/* Header (même style que X01PlayV3) */}
      <header className="x01-header">
        <DuelHeaderCompact
          // @ts-expect-error: adapter aux props réels
          players={config.players}
          scores={scores}
          currentSet={state.currentSet}
          currentLeg={state.currentLeg}
          activePlayerId={activePlayerId}
        />

        {/* Petit badge de statut ONLINE / WS */}
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            opacity: 0.8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  wsStatus === "open"
                    ? "#7fe2a9"
                    : wsStatus === "connecting"
                    ? "#ffcf57"
                    : "#ff8a8a",
                boxShadow:
                  wsStatus === "open"
                    ? "0 0 6px rgba(127,226,169,.9)"
                    : wsStatus === "connecting"
                    ? "0 0 6px rgba(255,207,87,.8)"
                    : "0 0 6px rgba(255,138,138,.8)",
              }}
            />
            <span>
              {wsStatus === "open"
                ? `Online • salon ${lobbyCode.toUpperCase()}`
                : wsStatus === "connecting"
                ? "Connexion serveur online…"
                : wsStatus === "error"
                ? "Erreur serveur online"
                : "Serveur online déconnecté"}
            </span>
          </span>
        </div>

        {wsError && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#ff8a8a",
            }}
          >
            {wsError}
          </div>
        )}
      </header>

      <main className="x01-main">
        {/* Joueur actif + score + checkout + mini stats */}
        <section className="x01-active-player-block">
          {activePlayer && (
            <>
              <div className="x01-active-name">{activePlayer.name}</div>
              <div className="x01-active-score">
                {scores[activePlayer.id] ?? config.startScore}
              </div>

              <div className="x01-checkout-hint">
                {currentVisit.checkoutSuggestion ? (
                  <>
                    <span className="x01-checkout-label">
                      {t("x01.checkout", "Check-out")}
                    </span>
                    <span className="x01-checkout-value">
                      {formatCheckout()}
                    </span>
                  </>
                ) : (
                  <span className="x01-checkout-none">
                    {t("x01.no_checkout", "Pas de check-out direct")}
                  </span>
                )}
              </div>

              <div className="x01-active-mini-stats">
                {(() => {
                  const live = liveStatsByPlayer[activePlayer.id];
                  const avg3 = computeAvg3For(activePlayer.id);
                  const darts = live?.dartsThrown ?? 0;
                  const bestVisit = live?.bestVisit ?? 0;
                  return (
                    <>
                      <div className="x01-mini-stat">
                        <span className="label">
                          {t("x01.avg3", "Moy. 3")}
                        </span>
                        <span className="value">{avg3.toFixed(1)}</span>
                      </div>
                      <div className="x01-mini-stat">
                        <span className="label">
                          {t("x01.darts", "Fléchettes")}
                        </span>
                        <span className="value">{darts}</span>
                      </div>
                      <div className="x01-mini-stat">
                        <span className="label">
                          {t("x01.best_visit", "Meilleure volée")}
                        </span>
                        <span className="value">{bestVisit}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </section>

        {/* Mini classement sous le score */}
        <section className="x01-mini-ranking">
          {miniRanking.map((row) => (
            <div
              key={row.id}
              className={`x01-mini-ranking-row ${
                row.id === activePlayerId ? "is-active" : ""
              }`}
            >
              <div className="x01-mini-ranking-left">
                <span className="x01-mini-ranking-name">{row.name}</span>
              </div>
              <div className="x01-mini-ranking-right">
                <div className="pill">
                  <span className="label">Sets</span>
                  <span className="value">{row.setsWon}</span>
                </div>
                <div className="pill">
                  <span className="label">Legs</span>
                  <span className="value">{row.legsWon}</span>
                </div>
                <div className="pill">
                  <span className="label">Score</span>
                  <span className="value">{row.score}</span>
                </div>
                <div className="pill">
                  <span className="label">Moy. 3</span>
                  <span className="value">{row.avg3.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Keypad en bas */}
      <footer className="x01-keypad-footer">
        <Keypad
          // @ts-expect-error: adapter aux props réels du Keypad
          onDart={(segment: number | 25, multiplier: 0 | 1 | 2 | 3) =>
            handleKeypadDart({ segment, multiplier })
          }
        />
      </footer>

      {/* Mini overlay fin de manche / set */}
      <X01LegOverlayV3
        open={status === "leg_end" || status === "set_end"}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
      />
    </div>
  );
}
