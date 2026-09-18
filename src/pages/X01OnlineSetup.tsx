// =============================================================
// src/pages/X01OnlineSetup.tsx
// Pré-salle X01 Online — source de vérité unique : Supabase.
// Joueurs, présence, READY, chat et démarrage de match utilisent le même salon public.
// =============================================================

import React from "react";
import type { Store } from "../lib/types";
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


  // ---------------------------------------------------------------------------
  // Salon public + chat : Supabase est la source de vérité unique.
  // ---------------------------------------------------------------------------
  const [cloudLobby, setCloudLobby] = React.useState<any>(null);
  const [lobbyLoading, setLobbyLoading] = React.useState(false);
  const [lobbyError, setLobbyError] = React.useState<string | null>(null);
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

  const refreshLobby = React.useCallback(async () => {
    if (!rawCode) return;
    setLobbyLoading(true);
    try {
      const next = await (onlineApi as any).getLobby(rawCode);
      setCloudLobby(next || null);
      setLobbyError(null);
    } catch (error: any) {
      setLobbyError(error?.message || "Impossible de lire le salon online.");
    } finally {
      setLobbyLoading(false);
    }
  }, [rawCode]);

  React.useEffect(() => {
    if (!rawCode) return;
    refreshLobby().catch(() => {});
  }, [rawCode, refreshLobby]);

  // Tout joueur connecté qui ouvre un code salon doit être inscrit dans la salle
  // d’attente online. Sinon il peut voir une page partielle mais ne sera pas reconnu
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
          setCloudLobby(joined);
          setLobbyError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          // On garde la lecture simple du salon si l’inscription échoue momentanément.
          setLobbyError(error?.message || "Impossible d’entrer dans le salon online.");
          refreshLobby().catch(() => {});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawCode, sessionUserId, activeUserId, activeProfile?.name, activeProfile?.displayName, activeProfile?.nickname, refreshLobby]);

  // Présence légère : permet de distinguer un joueur actif d’une ancienne entrée de salon.
  React.useEffect(() => {
    if (!rawCode) return;
    let stopped = false;
    const touch = () => {
      if (stopped) return;
      const presence = typeof document !== "undefined" && document.hidden ? "away" : "online";
      Promise.resolve((onlineApi as any).touchLobby?.(rawCode, presence)).catch(() => {});
    };
    touch();
    const timer = window.setInterval(touch, 30000);
    const onVisibility = () => touch();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rawCode]);

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
      lobbyId: cloudLobby?.id || params?.lobbyId || state?.lobbyId || null,
      players: Array.isArray(state?.players) ? state.players : Array.isArray(state?.playerProfiles) ? state.playerProfiles : connectedPlayers,
      config: cfg,
      x01ConfigV3: cfg,
      from: "x01_online_lobby_autostart",
    });
  }, [rawCode, go, cloudLobby?.id, params?.lobbyId]);

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
          setCloudLobby(lobby);
          setLobbyError(null);
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
    if (String(cloudLobby?.status || "").toLowerCase() !== "started") return;
    (async () => {
      try {
        const matchRow = await (onlineApi as any).fetchMatchByCode(rawCode);
        openStartedOnlineMatch(matchRow);
      } catch {}
    })();
  }, [rawCode, cloudLobby?.status, cloudLobby?.updatedAt, cloudLobby?.updated_at, openStartedOnlineMatch]);

    const lobbyPlayersRaw: any[] = Array.isArray(cloudLobby?.players) ? cloudLobby.players : [];
  const lobbyHostUserId = String(cloudLobby?.hostUserId || cloudLobby?.host_user_id || "").trim();
  const effectiveUserId = String(sessionUserId || activeUserId || activeProfileId || "").trim();

  const connectedPlayers = React.useMemo(() => {
    const fromCloud = lobbyPlayersRaw
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
          presenceStatus: p?.presenceStatus || p?.presence_status || "online",
          ready: isHostPlayer || status === "ready" || !!p?.ready,
          isHost: isHostPlayer || !!p?.isHost,
        };
      })
      .filter((p: any) => p.id || p.name);

    if (fromCloud.length) return fromCloud;

    return activeProfile
      ? [{
          id: String((activeProfile?.id as any) || "local"),
          userId: String((activeProfile?.id as any) || "local"),
          name: activeProfile?.name || "Joueur",
          avatarUrl: (activeProfile as any)?.avatarDataUrl || (activeProfile as any)?.avatarUrl || (activeProfile as any)?.avatar || null,
          role: "player",
          status: "online",
          presenceStatus: "online",
          ready: false,
          isHost: false,
        }]
      : [];
  }, [lobbyPlayersRaw, activeProfile, lobbyHostUserId]);

  const currentLobbyPlayer = connectedPlayers.find((p: any) => {
    const pid = String(p?.userId || p?.id || "").trim();
    return !!pid && pid === effectiveUserId;
  }) || null;
  const isHost = !!effectiveUserId && !!lobbyHostUserId && effectiveUserId === lobbyHostUserId;
  const nonHostPlayers = connectedPlayers.filter((p: any) => p?.role !== "spectator" && !p?.isHost);
  const notReadyPlayers = nonHostPlayers.filter((p: any) => !p?.ready);
  const allPlayersReady = nonHostPlayers.length > 0 && notReadyPlayers.length === 0;
  const readyCount = nonHostPlayers.length - notReadyPlayers.length;
  const isCurrentPlayerReady = !!currentLobbyPlayer?.ready;
  const lobbyAlreadyStarted = String(cloudLobby?.status || "waiting").toLowerCase() === "started";
  const canHostConfigure = isHost && !lobbyAlreadyStarted && nonHostPlayers.length > 0;

  const defaultOrder = connectedPlayers.map((p: any) => ({ id: p.id || p.name, name: p.name || "Joueur" }));

  function handleConfigureMatch() {
    setLobbyActionError(null);

    if (!isHost) {
      setLobbyActionError("Seul l’hôte du salon peut configurer et lancer la partie.");
      return;
    }

    // L’hôte peut préparer/modifier la configuration à tout moment.
    // Le démarrage réel reste bloqué côté serveur tant que tous les invités ne sont pas prêts.

    go("x01setup", {
      online: true,
      onlineMode: "x01",
      lobbyCode: rawCode || null,
      lobbyId: cloudLobby?.id || params?.lobbyId || null,
      onlineHostUserId: lobbyHostUserId,
      settings: {
        ...(cloudLobby?.settings || {}),
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
      if (nextLobby) setCloudLobby(nextLobby);
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

      {/* Liste des joueurs du salon public */}

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

        {lobbyLoading && !cloudLobby ? (
          <div style={{ opacity: 0.85 }}>Chargement du salon online…</div>
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
        {lobbyError ? <div style={{ color: "#ff8a8a", marginTop: 7 }}>{lobbyError}</div> : null}
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
            <div style={{ opacity: 0.78, fontSize: 11 }}>Code {effectiveCode} • Supabase Realtime</div>
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

      {/* Retour Friends / Home */}
      <button
        type="button"
        onClick={() => {
          if (rawCode && !lobbyAlreadyStarted) {
            Promise.resolve((onlineApi as any).leaveLobby?.(rawCode)).catch(() => {}).finally(() => go("friends"));
          } else {
            go("friends");
          }
        }}
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
        ⬅️ Quitter le salon
      </button>
    </div>
  );
}
