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
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { onlineApi } from "../lib/onlineApi";
import { fetchMessages, postMessage, subscribeMessages } from "../lib/chatApi";

type StartScore = 301 | 501 | 701 | 901;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function X01OnlineSetup({ store, go, params }: Props) {
  const currentProfile = useCurrentProfile() as any;
  // Profil actif (ou premier profil en fallback)
  const activeProfile =
    currentProfile ||
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  const activeProfileId = String((activeProfile as any)?.id || (activeProfile as any)?.profileId || "").trim();
  const activeUserId = String((activeProfile as any)?.userId || activeProfileId || "").trim();

  // Code salon reçu via params.lobbyCode
  const rawCode = (params?.lobbyCode || "").toString().trim().toUpperCase();
  const effectiveCode = rawCode || "----";

  // --------------------------------------------
  // Defaults start / double-out
  // --------------------------------------------
  const allowedStarts: StartScore[] = [301, 501, 701, 901];

  const prefs: any = { ...((activeProfile as any)?.preferences || {}), ...((activeProfile as any)?.privateInfo || {}) };
  const startRaw: number =
    (params?.start as number | undefined) ??
    (Number(prefs?.favX01) as number | undefined) ??
    (store.settings?.defaultX01 as number | undefined) ??
    501;

  const startScore: StartScore = allowedStarts.includes(startRaw as any)
    ? (startRaw as StartScore)
    : 501;

  const defaultDoubleOut: boolean =
    (params?.doubleOut as boolean | undefined) ??
    (typeof prefs?.favDoubleOut === "string"
      ? prefs.favDoubleOut.toLowerCase() === "true"
      : (prefs?.favDoubleOut as boolean | undefined)) ??
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

  const [showDebug, setShowDebug] = React.useState(false);

  // ---------------------------------------------------------------------------
  // NAS lobby + chat salon
  // Le salon ONLINE V7/V8/V9 est maintenant porté par le backend NAS.
  // Le Worker Cloudflare historique reste disponible uniquement en debug, mais
  // l'écran d'attente utilise en priorité les joueurs/messages persistants NAS.
  // ---------------------------------------------------------------------------
  const [nasLobby, setNasLobby] = React.useState<any>(null);
  const [nasLobbyLoading, setNasLobbyLoading] = React.useState(false);
  const [nasLobbyError, setNasLobbyError] = React.useState<string | null>(null);
  const [chatMessages, setChatMessages] = React.useState<any[]>([]);
  const [chatText, setChatText] = React.useState("");
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [chatSending, setChatSending] = React.useState(false);
  const [readySending, setReadySending] = React.useState(false);
  const [lobbyActionError, setLobbyActionError] = React.useState<string | null>(null);
  const autoLaunchRef = React.useRef<string | null>(null);
  const joinOnceRef = React.useRef<string | null>(null);
  const [sessionUserId, setSessionUserId] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await (onlineApi as any).getCurrentSession?.();
        const uid = String(session?.user?.id || session?.userId || "").trim();
        if (!cancelled) setSessionUserId(uid);
      } catch {
        if (!cancelled) setSessionUserId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshNasLobby = React.useCallback(async () => {
    if (!rawCode) return;
    setNasLobbyLoading(true);
    try {
      const next = await (onlineApi as any).getLobby(rawCode);
      setNasLobby(next || null);
      setNasLobbyError(null);
    } catch (error: any) {
      setNasLobbyError(error?.message || "Impossible de lire le salon NAS.");
    } finally {
      setNasLobbyLoading(false);
    }
  }, [rawCode]);

  React.useEffect(() => {
    if (!rawCode) return;
    refreshNasLobby().catch(() => {});
    const timer = window.setInterval(() => refreshNasLobby().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [rawCode, refreshNasLobby]);

  // Tout joueur connecté qui ouvre un code salon doit être inscrit dans la salle
  // d’attente NAS. Sinon il peut voir une page partielle mais ne sera pas reconnu
  // pour le chat, le statut prêt et le lancement synchronisé.
  React.useEffect(() => {
    if (!rawCode) return;
    const joinKey = `${rawCode}:${sessionUserId || activeUserId || "local"}`;
    if (joinOnceRef.current === joinKey) return;
    joinOnceRef.current = joinKey;

    let cancelled = false;
    (async () => {
      try {
        const joined = await (onlineApi as any).joinLobby({
          code: rawCode,
          nickname: activeProfile?.name || activeProfile?.displayName || activeProfile?.nickname || "Joueur",
          role: "player",
        });
        if (!cancelled && joined) {
          setNasLobby(joined);
          setNasLobbyError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          // On garde la lecture simple du salon si l’inscription échoue momentanément.
          setNasLobbyError(error?.message || "Impossible d’entrer dans le salon NAS.");
          refreshNasLobby().catch(() => {});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawCode, sessionUserId, activeUserId, activeProfile?.name, activeProfile?.displayName, activeProfile?.nickname, refreshNasLobby]);

  React.useEffect(() => {
    if (!rawCode) return;
    let cancelled = false;
    let unsubscribe: any = null;

    (async () => {
      try {
        const initial = await fetchMessages(rawCode, 80);
        if (!cancelled) {
          setChatMessages(Array.isArray(initial) ? initial : []);
          setChatError(null);
        }
      } catch (error: any) {
        if (!cancelled) setChatError(error?.message || "Impossible de charger le chat du salon.");
      }

      try {
        unsubscribe = subscribeMessages(rawCode, (message: any) => {
          if (cancelled || !message) return;
          const id = String(message?.id || `${message?.createdAt || message?.created_at || ""}:${message?.text || message?.message?.text || ""}`);
          setChatMessages((prev) => {
            if (id && prev.some((m) => String(m?.id || "") === id)) return prev;
            return [...prev, message].slice(-100);
          });
        });
      } catch {}
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) Promise.resolve(unsubscribe()).catch(() => {});
    };
  }, [rawCode]);


  const openStartedOnlineMatch = React.useCallback((matchRow: any) => {
    if (!matchRow) return;
    const status = String(matchRow?.status || matchRow?.match?.status || "").toLowerCase();
    if (status !== "started") return;

    const state =
      (matchRow?.state_json && typeof matchRow.state_json === "object" ? matchRow.state_json : null) ||
      (matchRow?.state && typeof matchRow.state === "object" ? matchRow.state : null) ||
      (matchRow?.match?.state_json && typeof matchRow.match.state_json === "object" ? matchRow.match.state_json : null) ||
      (matchRow?.match?.state && typeof matchRow.match.state === "object" ? matchRow.match.state : null) ||
      {};
    const cfg =
      state?.x01ConfigV3 ||
      state?.config ||
      state?.initialState?.x01ConfigV3 ||
      state?.initialState?.config ||
      state?.payload?.x01ConfigV3 ||
      state?.payload?.config ||
      null;
    if (!cfg) return;

    const launchKey = String(matchRow?.id || matchRow?.match?.id || `${rawCode}:${matchRow?.updated_at || matchRow?.updatedAt || matchRow?.match?.updated_at || matchRow?.match?.updatedAt || "started"}`);
    if (autoLaunchRef.current === launchKey) return;
    autoLaunchRef.current = launchKey;

    go("x01_play_v3", {
      resumeId: null,
      fresh: Date.now(),
      online: true,
      onlineMode: "x01",
      lobbyCode: rawCode || state?.lobbyCode || null,
      lobbyId: nasLobby?.id || params?.lobbyId || state?.lobbyId || null,
      players: Array.isArray(state?.players) ? state.players : Array.isArray(state?.playerProfiles) ? state.playerProfiles : connectedPlayers,
      config: cfg,
      x01ConfigV3: cfg,
      from: "x01_online_lobby_autostart",
    });
  }, [rawCode, go, nasLobby?.id, params?.lobbyId]);

  React.useEffect(() => {
    if (!rawCode) return;
    let cancelled = false;
    let streamOpened = false;

    const tick = async () => {
      try {
        const matchRow = await (onlineApi as any).fetchMatchByCode(rawCode);
        if (!cancelled) openStartedOnlineMatch(matchRow);
      } catch {
        // silencieux : le salon reste utilisable même si le match live n'existe pas encore
      }
    };

    const unsubscribe = (onlineApi as any).subscribeOnlineStream?.(rawCode, {
      onOpen: () => { streamOpened = true; },
      onError: () => { streamOpened = false; },
      onLobby: (lobby: any) => {
        if (!cancelled && lobby) {
          setNasLobby(lobby);
          setNasLobbyError(null);
        }
      },
      onMessage: (message: any) => {
        if (cancelled || !message) return;
        const id = String(message?.id || `${message?.createdAt || message?.created_at || ""}:${message?.text || message?.message?.text || ""}`);
        setChatMessages((prev) => {
          if (id && prev.some((m) => String(m?.id || "") === id)) return prev;
          return [...prev, message].slice(-100);
        });
      },
      onMatch: (match: any) => {
        if (!cancelled) openStartedOnlineMatch(match);
      },
    });

    tick().catch(() => {});
    const timer = window.setInterval(() => {
      if (!streamOpened) tick().catch(() => {});
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [rawCode, openStartedOnlineMatch]);


  React.useEffect(() => {
    if (!rawCode) return;
    if (String(nasLobby?.status || "").toLowerCase() !== "started") return;
    (async () => {
      try {
        const matchRow = await (onlineApi as any).fetchMatchByCode(rawCode);
        openStartedOnlineMatch(matchRow);
      } catch {}
    })();
  }, [rawCode, nasLobby?.status, nasLobby?.updatedAt, nasLobby?.updated_at, openStartedOnlineMatch]);

    const lobbyPlayersRaw: any[] = Array.isArray(nasLobby?.players) ? nasLobby.players : [];
  const lobbyHostUserId = String(nasLobby?.hostUserId || nasLobby?.host_user_id || "").trim();
  const effectiveUserId = String(sessionUserId || activeUserId || activeProfileId || "").trim();

  const connectedPlayers = React.useMemo(() => {
    const fromNas = lobbyPlayersRaw
      .map((p: any) => {
        const id = String(p?.userId || p?.user_id || p?.id || "").trim();
        const status = String(p?.status || "online").trim().toLowerCase();
        const isHostPlayer = !!lobbyHostUserId && id === lobbyHostUserId;
        return {
          id,
          userId: id,
          name: String(p?.displayName || p?.nickname || p?.name || "Joueur").trim(),
          avatarUrl: p?.avatarUrl || p?.avatar_url || null,
          role: p?.role || "player",
          status,
          ready: isHostPlayer || status === "ready" || !!p?.ready,
          isHost: isHostPlayer || !!p?.isHost,
        };
      })
      .filter((p: any) => p.id || p.name);

    if (fromNas.length) return fromNas;

    const fromWorker = clients.map((c: any) => {
      const id = String(c?.id || "").trim();
      return {
        id,
        userId: id,
        name: String(c?.name || "Joueur").trim(),
        avatarUrl: null,
        role: "player",
        status: wsStatus === "connected" ? "online" : "offline",
        ready: false,
        isHost: false,
      };
    });

    if (fromWorker.length) return fromWorker;

    return [
      {
        id: String((activeProfile?.id as any) || "local"),
        userId: String((activeProfile?.id as any) || "local"),
        name: activeProfile?.name || "Joueur",
        avatarUrl: (activeProfile as any)?.avatarDataUrl || (activeProfile as any)?.avatarUrl || (activeProfile as any)?.avatar || null,
        role: "player",
        status: "online",
        ready: false,
        isHost: false,
      },
    ];
  }, [lobbyPlayersRaw, clients, wsStatus, activeProfile, lobbyHostUserId]);

  const currentLobbyPlayer = connectedPlayers.find((p: any) => {
    const pid = String(p?.userId || p?.id || "").trim();
    return !!pid && pid === effectiveUserId;
  }) || null;
  const isHost = !!effectiveUserId && !!lobbyHostUserId && effectiveUserId === lobbyHostUserId;
  const nonHostPlayers = connectedPlayers.filter((p: any) => p?.role !== "spectator" && !p?.isHost);
  const notReadyPlayers = nonHostPlayers.filter((p: any) => !p?.ready);
  const allPlayersReady = nonHostPlayers.length === 0 || notReadyPlayers.length === 0;
  const readyCount = nonHostPlayers.length - notReadyPlayers.length;
  const isCurrentPlayerReady = !!currentLobbyPlayer?.ready;
  const lobbyAlreadyStarted = String(nasLobby?.status || "waiting").toLowerCase() === "started";
  const canHostConfigure = isHost && !lobbyAlreadyStarted;

  const defaultOrder = connectedPlayers.map((p: any) => ({ id: p.id || p.name, name: p.name || "Joueur" }));

  function handleConfigureMatch() {
    setLobbyActionError(null);

    if (!isHost) {
      setLobbyActionError("Seul l’hôte du salon peut configurer et lancer la partie.");
      return;
    }

    // L’hôte peut préparer/modifier la configuration à tout moment.
    // Le démarrage réel reste bloqué côté NAS tant que tous les invités ne sont pas prêts.

    go("x01setup", {
      online: true,
      onlineMode: "x01",
      lobbyCode: rawCode || null,
      lobbyId: nasLobby?.id || params?.lobbyId || null,
      onlineHostUserId: lobbyHostUserId,
      settings: {
        ...(nasLobby?.settings || {}),
        start: startScore,
        doubleOut: defaultDoubleOut,
      },
      players: connectedPlayers,
      from: "x01_online_lobby",
      fresh: Date.now(),
    });
  }

  async function handleToggleReady() {
    if (!rawCode || isHost || readySending) return;
    setReadySending(true);
    setLobbyActionError(null);
    try {
      const nextLobby = await (onlineApi as any).setLobbyReady({
        code: rawCode,
        ready: !isCurrentPlayerReady,
        nickname: activeProfile?.name || "Joueur",
        role: "player",
      });
      if (nextLobby) setNasLobby(nextLobby);
    } catch (error: any) {
      setLobbyActionError(error?.message || "Impossible de changer le statut prêt.");
    } finally {
      setReadySending(false);
    }
  }

  async function handleSendChat() {
    const text = chatText.trim();
    if (!rawCode || !text || chatSending) return;
    setChatSending(true);
    setChatError(null);
    try {
      const sent = await postMessage(rawCode, {
        text,
        name: activeProfile?.name || "Joueur",
        playerId: (activeProfile?.id as any) || "local",
        type: "chat",
        at: new Date().toISOString(),
      });
      setChatMessages((prev) => [...prev, sent].slice(-100));
      setChatText("");
    } catch (error: any) {
      setChatError(error?.message || "Impossible d’envoyer le message.");
    } finally {
      setChatSending(false);
    }
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 950, margin: 0 }}>Salon X01</h2>
          <div style={{ fontSize: 12, opacity: 0.76, marginTop: 3 }}>Chat, joueurs, statut prêt et lancement synchronisé.</div>
        </div>
        <div style={{ borderRadius: 999, padding: "5px 9px", background: isHost ? "rgba(255,213,106,.14)" : "rgba(127,226,169,.12)", color: isHost ? "#ffd56a" : "#7fe2a9", border: "1px solid rgba(255,255,255,.12)", fontSize: 11, fontWeight: 950 }}>
          {isHost ? "HÔTE" : isCurrentPlayerReady ? "PRÊT" : "JOUEUR"}
        </div>
      </div>

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

      {/* Statut WebSocket - conservé en debug, masqué dans l'UI salon */}
      <div
        style={{
          display: showDebug ? "flex" : "none",
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(32,32,40,.95), rgba(10,10,14,.98))",
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
            Connexion temps réel Worker (debug)
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

      {/* Infos joueur local - masqué dans l'UI principale */}
      {showDebug && activeProfile && (
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>Joueurs ({connectedPlayers.length})</div>
          <div style={{ opacity: .72, fontSize: 11 }}>{allPlayersReady ? "Tout le monde est prêt" : "En attente"}</div>
        </div>

        {nasLobbyLoading && !nasLobby ? (
          <div style={{ opacity: 0.85 }}>Chargement du salon NAS…</div>
        ) : connectedPlayers.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Aucun joueur pour le moment. Demande à ton ami de rejoindre le même code de salon.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {connectedPlayers.map((c: any) => {
              const ready = !!c?.ready;
              const isPlayerHost = !!c?.isHost;
              return (
                <div
                  key={c.id || c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderRadius: 14,
                    padding: "9px 10px",
                    background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.025))",
                    border: ready || isPlayerHost ? "1px solid rgba(127,226,169,.24)" : "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{c.name}</span>
                  <span
                    style={{
                      opacity: 0.95,
                      fontSize: 11,
                      borderRadius: 999,
                      padding: "3px 7px",
                      background: isPlayerHost
                        ? "rgba(255,213,106,.14)"
                        : ready
                        ? "rgba(127,226,169,.14)"
                        : "rgba(255,255,255,.08)",
                      color: isPlayerHost ? "#ffd56a" : ready ? "#7fe2a9" : "rgba(255,255,255,.72)",
                      fontWeight: 900,
                    }}
                  >
                    {isPlayerHost ? "HÔTE" : ready ? "PRÊT" : "EN ATTENTE"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {nasLobbyError ? <div style={{ color: "#ff8a8a", marginTop: 7 }}>{nasLobbyError}</div> : null}
      </div>

      {/* Forum / chat du salon */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(127,226,169,.18)",
          background:
            "linear-gradient(180deg, rgba(16,28,24,.94), rgba(8,10,12,.98))",
          fontSize: 12,
          boxShadow: "0 0 20px rgba(127,226,169,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 950, color: "#7fe2a9", marginBottom: 2 }}>Chat du salon</div>
            <div style={{ opacity: 0.78, fontSize: 11 }}>Code {effectiveCode} • messages NAS</div>
          </div>
          <button
            type="button"
            onClick={() => fetchMessages(rawCode, 80).then((rows) => setChatMessages(Array.isArray(rows) ? rows : [])).catch((e: any) => setChatError(e?.message || "Refresh chat impossible."))}
            disabled={!rawCode}
            style={{
              borderRadius: 999,
              padding: "5px 9px",
              border: "1px solid rgba(127,226,169,.25)",
              background: "rgba(127,226,169,.10)",
              color: "#7fe2a9",
              fontWeight: 800,
              fontSize: 11,
              cursor: rawCode ? "pointer" : "default",
            }}
          >
            Rafraîchir
          </button>
        </div>

        <div
          style={{
            minHeight: 112,
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(0,0,0,.38)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {chatMessages.length === 0 ? (
            <div style={{ opacity: 0.74, lineHeight: 1.35 }}>
              Aucun message pour l’instant. Utilise ce chat pour te mettre d’accord avec les joueurs avant de configurer la partie.
            </div>
          ) : (
            chatMessages.map((m: any, idx: number) => {
              const payload = m?.message && typeof m.message === "object" ? m.message : m;
              const name = payload?.name || m?.nickname || m?.name || "Joueur";
              const text = payload?.text || payload?.message || m?.text || "";
              const at = payload?.at || m?.createdAt || m?.created_at || null;
              return (
                <div
                  key={String(m?.id || idx)}
                  style={{
                    borderRadius: 10,
                    padding: "7px 8px",
                    background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025))",
                    border: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                    <b style={{ color: "#ffd56a", fontSize: 11.5 }}>{name}</b>
                    {at ? <span style={{ opacity: 0.48, fontSize: 10 }}>{new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.3 }}>{text}</div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat().catch(() => {});
              }
            }}
            placeholder="Écrire un message avant la partie…"
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(0,0,0,.45)",
              color: "#f5f5f7",
              padding: "9px 12px",
              outline: "none",
              fontSize: 12,
            }}
          />
          <button
            type="button"
            onClick={() => handleSendChat().catch(() => {})}
            disabled={!chatText.trim() || chatSending || !rawCode}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "9px 13px",
              background: chatText.trim() && !chatSending && rawCode ? "linear-gradient(180deg,#7fe2a9,#35c86d)" : "linear-gradient(180deg,#444,#333)",
              color: chatText.trim() && !chatSending && rawCode ? "#03140a" : "rgba(255,255,255,.62)",
              fontWeight: 900,
              cursor: chatText.trim() && !chatSending && rawCode ? "pointer" : "default",
            }}
          >
            Envoyer
          </button>
        </div>
        {chatError ? <div style={{ color: "#ff8a8a", marginTop: 7, fontSize: 11 }}>{chatError}</div> : null}
      </div>

      {/* Bloc prêt / hôte / configuration */}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 900, marginBottom: 2 }}>
              {isHost ? "Commandes hôte" : "Statut joueur"}
            </div>
            <div style={{ opacity: 0.78, fontSize: 11 }}>
              Prêts : {readyCount}/{nonHostPlayers.length} joueur(s) requis
            </div>
          </div>
          <div
            style={{
              borderRadius: 999,
              padding: "4px 9px",
              border: "1px solid rgba(255,255,255,.12)",
              background: allPlayersReady ? "rgba(127,226,169,.14)" : "rgba(255,213,106,.12)",
              color: allPlayersReady ? "#7fe2a9" : "#ffd56a",
              fontWeight: 900,
              fontSize: 11,
            }}
          >
            {allPlayersReady ? "READY" : "ATTENTE"}
          </div>
        </div>

        {isHost ? (
          <>
            <button
              type="button"
              onClick={handleConfigureMatch}
              disabled={!canHostConfigure || !defaultOrder.length}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "9px 12px",
                border: "none",
                fontSize: 13,
                fontWeight: 900,
                background: canHostConfigure && defaultOrder.length
                  ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
                  : "linear-gradient(180deg,#444,#333)",
                color: canHostConfigure && defaultOrder.length ? "#1c1304" : "rgba(255,255,255,.62)",
                cursor: canHostConfigure && defaultOrder.length ? "pointer" : "default",
                opacity: canHostConfigure && defaultOrder.length ? 1 : 0.65,
                marginBottom: 6,
              }}
            >
              ⚙️ Configurer et préparer X01 ({startScore})
            </button>
            <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.35 }}>
              Seul l’hôte peut ouvrir la configuration et lancer la partie. Une fois lancée,
              l’écran de jeu s’ouvrira automatiquement chez tous les joueurs du salon.
              {!allPlayersReady && notReadyPlayers.length > 0 ? (
                <span style={{ display: "block", marginTop: 4, color: "#ffd56a" }}>
                  En attente : {notReadyPlayers.map((p: any) => p.name || "Joueur").join(", ")}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleToggleReady().catch(() => {})}
              disabled={readySending || !rawCode || lobbyAlreadyStarted}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "9px 12px",
                border: "none",
                fontSize: 13,
                fontWeight: 900,
                background: isCurrentPlayerReady
                  ? "linear-gradient(180deg,#7fe2a9,#35c86d)"
                  : "linear-gradient(180deg,#ffd56a,#e9a93d)",
                color: "#07120a",
                cursor: readySending || !rawCode || lobbyAlreadyStarted ? "default" : "pointer",
                opacity: readySending || !rawCode || lobbyAlreadyStarted ? 0.65 : 1,
                marginBottom: 6,
              }}
            >
              {readySending ? "Synchronisation…" : isCurrentPlayerReady ? "✅ Prêt" : "Je suis prêt"}
            </button>
            <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.35 }}>
              Quand tu es prêt, valide ton statut. L’hôte configurera la partie puis le jeu
              s’ouvrira automatiquement ici dès qu’il lance la manche.
            </div>
          </>
        )}

        {lobbyActionError ? (
          <div style={{ color: "#ff8a8a", marginTop: 8, fontSize: 11, fontWeight: 800 }}>
            {lobbyActionError}
          </div>
        ) : null}
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
