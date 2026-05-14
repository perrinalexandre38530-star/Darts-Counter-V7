// =========================================================
// src/online/client/OnlineCameraPanel.tsx
// ONLINE caméra X01
// - Contrôles locaux caméra/micro
// - Affichage caméra du joueur actif
// - Diffusion WebRTC légère active-player -> autres joueurs
// - Signalisation transport-agnostique via l'état online existant
// =========================================================

import React from "react";
import { useOnlineCamera, type OnlineCameraPlayerState } from "./useOnlineCamera";
import type { PlayerId } from "../shared/types";

type PlayerLite = { id: PlayerId; name?: string | null };

export type OnlineCameraSignalType = "viewer_offer" | "active_answer" | "ice" | "hangup";

export type OnlineCameraSignal = {
  id: string;
  roomId?: string | null;
  from: PlayerId;
  to: PlayerId;
  activePlayerId: PlayerId;
  type: OnlineCameraSignalType;
  payload?: any;
  createdAt: number;
};

type Props = {
  selfId: PlayerId;
  activePlayerId?: PlayerId | null;
  players: PlayerLite[];
  cameraStates?: Record<string, OnlineCameraPlayerState>;
  cameraSignals?: OnlineCameraSignal[];
  roomId?: string | null;
  onCameraStateChange?: (state: OnlineCameraPlayerState) => void;
  onCameraSignalSend?: (signal: OnlineCameraSignal) => void;
  compact?: boolean;
  embedded?: boolean;
};

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const WS_BASE: string =
  ((import.meta as any)?.env?.VITE_ONLINE_WS_BASE_URL as string | undefined) ||
  ((import.meta as any)?.env?.DEV ? "ws://127.0.0.1:8787" : "");

function buildCameraWsUrl(roomId?: string | null) {
  const code = String(roomId || "").trim();
  if (!code || !WS_BASE) return "";
  return `${WS_BASE.replace(/\/+$/, "")}/room/${encodeURIComponent(code)}`;
}

function normalizeIncomingSignal(raw: any): OnlineCameraSignal | null {
  const data = raw?.kind === "command" ? raw?.data : raw?.data || raw;
  const signal = data?.type === "x01_camera_signal" ? data.signal : data?.signal || data?.cameraSignal || null;
  if (!signal || typeof signal !== "object" || !signal.id || !signal.from || !signal.to || !signal.type) return null;
  return signal as OnlineCameraSignal;
}

function makeSignalId(from: string, to: string, type: string) {
  const rnd = Math.random().toString(36).slice(2, 9);
  return `cam_${Date.now().toString(36)}_${from}_${to}_${type}_${rnd}`;
}

function safeSignalPayload(payload: any) {
  try {
    return JSON.parse(JSON.stringify(payload || null));
  } catch {
    return null;
  }
}

function stopRemoteStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch {}
  }
}

export default function OnlineCameraPanel({
  selfId,
  activePlayerId,
  players,
  cameraStates = {},
  cameraSignals = [],
  roomId = null,
  onCameraStateChange,
  onCameraSignalSend,
  compact = false,
  embedded = false,
}: Props) {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const camera = useOnlineCamera({ playerId: selfId, onStateChange: onCameraStateChange });

  const active = players.find((p) => String(p.id) === String(activePlayerId)) || players[0] || null;
  const activeId = String(active?.id || activePlayerId || "");
  const self = String(selfId || "local");
  const activeState = active ? cameraStates[String(active.id)] : null;
  const selfIsActive = !!activeId && activeId === self;
  const activeCameraEnabled = !!activeState?.cameraEnabled || (selfIsActive && camera.cameraEnabled);

  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [webrtcStatus, setWebrtcStatus] = React.useState<"idle" | "connecting" | "live" | "waiting" | "error">("idle");
  const [webrtcError, setWebrtcError] = React.useState<string | null>(null);

  const viewerPcRef = React.useRef<RTCPeerConnection | null>(null);
  const activePeersRef = React.useRef<Record<string, RTCPeerConnection>>({});
  const processedSignalsRef = React.useRef<Set<string>>(new Set());
  const offerKeyRef = React.useRef<string>("");
  const wsRef = React.useRef<WebSocket | null>(null);
  const wsQueueRef = React.useRef<OnlineCameraSignal[]>([]);
  const [liveSignals, setLiveSignals] = React.useState<OnlineCameraSignal[]>([]);
  const pendingIceRef = React.useRef<Record<string, RTCIceCandidateInit[]>>({});
  const cameraRef = React.useRef(camera);
  React.useEffect(() => { cameraRef.current = camera; }, [camera]);

  React.useEffect(() => {
    const url = buildCameraWsUrl(roomId);
    if (!url || !self) return;

    let closed = false;
    let retryTimer: number | null = null;

    const connect = () => {
      if (closed) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          try {
            ws.send(JSON.stringify({
              kind: "join",
              role: "guest",
              lobbyCode: roomId,
              matchId: roomId,
              playerId: self,
            }));
          } catch {}
          const queued = wsQueueRef.current.splice(0);
          queued.forEach((signal) => {
            try { ws.send(JSON.stringify({ kind: "command", data: { type: "x01_camera_signal", signal } })); } catch {}
          });
        };

        ws.onmessage = (event) => {
          try {
            const raw = typeof event.data === "string" ? JSON.parse(event.data) : JSON.parse(new TextDecoder().decode(event.data as ArrayBuffer));
            const signal = normalizeIncomingSignal(raw);
            if (!signal) return;
            if (signal.to && String(signal.to) !== self) return;
            setLiveSignals((prev) => {
              const cutoff = Date.now() - 60000;
              const byId = new Map<string, OnlineCameraSignal>();
              [...prev, signal].forEach((sig: any) => {
                if (!sig?.id) return;
                if (Number(sig.createdAt || 0) < cutoff) return;
                byId.set(String(sig.id), sig as OnlineCameraSignal);
              });
              return Array.from(byId.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)).slice(-240);
            });
          } catch {}
        };

        ws.onclose = () => {
          if (wsRef.current === ws) wsRef.current = null;
          if (!closed) retryTimer = window.setTimeout(connect, 1200);
        };
        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch {
        if (!closed) retryTimer = window.setTimeout(connect, 1600);
      }
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      try { ws?.close(); } catch {}
    };
  }, [roomId, self]);

  const publishSignal = React.useCallback((signal: OnlineCameraSignal) => {
    // 1) Canal direct WebSocket pour WebRTC temps réel.
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ kind: "command", data: { type: "x01_camera_signal", signal } }));
      } catch {
        wsQueueRef.current.push(signal);
      }
    } else {
      wsQueueRef.current.push(signal);
      if (wsQueueRef.current.length > 80) wsQueueRef.current = wsQueueRef.current.slice(-80);
    }

    // 2) Fallback état online existant : garde la compat si le WS caméra est absent.
    onCameraSignalSend?.(signal);
  }, [onCameraSignalSend]);

  const sendSignal = React.useCallback((to: string, type: OnlineCameraSignalType, payload?: any) => {
    if (!to || !activeId || !self) return;
    publishSignal({
      id: makeSignalId(self, to, type),
      roomId,
      from: self,
      to,
      activePlayerId: activeId,
      type,
      payload: safeSignalPayload(payload),
      createdAt: Date.now(),
    });
  }, [activeId, publishSignal, roomId, self]);

  React.useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = camera.localStream;
  }, [camera.localStream]);

  React.useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const cleanupViewerPc = React.useCallback(() => {
    const pc = viewerPcRef.current;
    viewerPcRef.current = null;
    if (pc) {
      try { pc.onicecandidate = null; pc.ontrack = null; pc.close(); } catch {}
    }
    setRemoteStream((old) => {
      stopRemoteStream(old);
      return null;
    });
  }, []);

  const cleanupActivePeers = React.useCallback(() => {
    const peers = activePeersRef.current;
    activePeersRef.current = {};
    Object.values(peers).forEach((pc) => {
      try { pc.onicecandidate = null; pc.close(); } catch {}
    });
  }, []);

  React.useEffect(() => () => {
    cleanupViewerPc();
    cleanupActivePeers();
  }, [cleanupActivePeers, cleanupViewerPc]);

  // Quand le joueur actif change ou coupe sa caméra, on remet la session viewer à zéro.
  React.useEffect(() => {
    if (!activeCameraEnabled || !activeId) {
      offerKeyRef.current = "";
      cleanupViewerPc();
      cleanupActivePeers();
      setWebrtcStatus("idle");
      return;
    }
    if (selfIsActive) {
      cleanupViewerPc();
      setWebrtcStatus(camera.cameraEnabled && camera.localStream ? "live" : "waiting");
    } else {
      cleanupActivePeers();
    }
  }, [activeCameraEnabled, activeId, camera.cameraEnabled, camera.localStream, cleanupActivePeers, cleanupViewerPc, selfIsActive]);

  // VIEWER -> crée une offre recvonly vers le joueur actif.
  React.useEffect(() => {
    if (!activeCameraEnabled || selfIsActive || !activeId || !onCameraSignalSend) return;
    if (typeof RTCPeerConnection === "undefined") {
      setWebrtcStatus("error");
      setWebrtcError("WebRTC indisponible sur ce navigateur.");
      return;
    }

    const offerKey = `${roomId || "room"}:${self}->${activeId}:${activeState?.updatedAt || 0}:${activeState?.cameraEnabled ? 1 : 0}`;
    if (offerKeyRef.current === offerKey && viewerPcRef.current) return;
    offerKeyRef.current = offerKey;
    cleanupViewerPc();

    let stopped = false;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    viewerPcRef.current = pc;
    setWebrtcStatus("connecting");
    setWebrtcError(null);

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal(activeId, "ice", event.candidate.toJSON());
    };
    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      setRemoteStream(stream);
      setWebrtcStatus("live");
    };
    pc.onconnectionstatechange = () => {
      if (stopped) return;
      const st = pc.connectionState;
      if (st === "connected") setWebrtcStatus("live");
      if (st === "failed" || st === "disconnected" || st === "closed") {
        if (st === "failed") setWebrtcStatus("error");
      }
    };

    try {
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
    } catch {}

    (async () => {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true } as any);
        if (stopped) return;
        await pc.setLocalDescription(offer);
        if (stopped) return;
        sendSignal(activeId, "viewer_offer", offer);
      } catch (error: any) {
        if (stopped) return;
        setWebrtcStatus("error");
        setWebrtcError(error?.message || "Impossible de créer l'offre WebRTC.");
      }
    })();

    return () => {
      stopped = true;
    };
  }, [activeCameraEnabled, activeId, activeState?.cameraEnabled, activeState?.updatedAt, cleanupViewerPc, onCameraSignalSend, roomId, self, selfIsActive, sendSignal]);

  // ACTIVE -> répond aux offres des viewers avec son flux local.
  const ensureActivePeer = React.useCallback((viewerId: string) => {
    if (!viewerId || typeof RTCPeerConnection === "undefined") return null;
    const existing = activePeersRef.current[viewerId];
    if (existing && existing.signalingState !== "closed") return existing;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    activePeersRef.current[viewerId] = pc;
    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal(viewerId, "ice", event.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "failed" || st === "closed" || st === "disconnected") {
        try { pc.close(); } catch {}
        if (activePeersRef.current[viewerId] === pc) delete activePeersRef.current[viewerId];
      }
    };
    const stream = cameraRef.current.localStream;
    if (stream) {
      for (const track of stream.getTracks()) {
        try { pc.addTrack(track, stream); } catch {}
      }
    }
    return pc;
  }, [sendSignal]);

  React.useEffect(() => {
    const allSignals = [...(Array.isArray(cameraSignals) ? cameraSignals : []), ...liveSignals];
    if (!allSignals.length || !activeId) return;

    const now = Date.now();
    for (const signal of allSignals) {
      if (!signal?.id || processedSignalsRef.current.has(signal.id)) continue;
      if (signal.to && String(signal.to) !== self) continue;
      if (signal.activePlayerId && String(signal.activePlayerId) !== activeId) continue;
      if (signal.createdAt && now - Number(signal.createdAt) > 45000) {
        processedSignalsRef.current.add(signal.id);
        continue;
      }
      processedSignalsRef.current.add(signal.id);

      // Limite mémoire du Set.
      if (processedSignalsRef.current.size > 600) {
        processedSignalsRef.current = new Set(Array.from(processedSignalsRef.current).slice(-300));
      }

      const from = String(signal.from || "");
      if (!from) continue;

      if (selfIsActive && signal.type === "viewer_offer") {
        (async () => {
          try {
            if (!cameraRef.current.localStream) {
              await cameraRef.current.setCameraEnabled(true);
            }
            const pc = ensureActivePeer(from);
            if (!pc || !signal.payload) return;
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const queuedIce = pendingIceRef.current[from] || [];
            pendingIceRef.current[from] = [];
            for (const ice of queuedIce) {
              try { await pc.addIceCandidate(new RTCIceCandidate(ice)); } catch {}
            }
            const stream = cameraRef.current.localStream;
            if (stream && pc.getSenders().length === 0) {
              for (const track of stream.getTracks()) {
                try { pc.addTrack(track, stream); } catch {}
              }
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(from, "active_answer", answer);
            setWebrtcStatus("live");
          } catch (error: any) {
            setWebrtcStatus("error");
            setWebrtcError(error?.message || "Réponse WebRTC impossible.");
          }
        })();
        continue;
      }

      if (!selfIsActive && signal.type === "active_answer") {
        (async () => {
          try {
            const pc = viewerPcRef.current;
            if (!pc || !signal.payload) return;
            if (pc.signalingState === "stable") return;
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const queuedIce = pendingIceRef.current.viewer || [];
            pendingIceRef.current.viewer = [];
            for (const ice of queuedIce) {
              try { await pc.addIceCandidate(new RTCIceCandidate(ice)); } catch {}
            }
            setWebrtcStatus("connecting");
          } catch (error: any) {
            setWebrtcStatus("error");
            setWebrtcError(error?.message || "Réponse caméra distante invalide.");
          }
        })();
        continue;
      }

      if (signal.type === "ice") {
        (async () => {
          try {
            const pc = selfIsActive ? activePeersRef.current[from] : viewerPcRef.current;
            if (!pc || !signal.payload) return;
            const key = selfIsActive ? from : "viewer";
            if (!pc.remoteDescription) {
              pendingIceRef.current[key] = [...(pendingIceRef.current[key] || []), signal.payload];
              return;
            }
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch {
            // Les ICE qui arrivent trop tôt/trop tard ne doivent jamais casser la partie.
          }
        })();
      }

      if (signal.type === "hangup") {
        if (selfIsActive) {
          const pc = activePeersRef.current[from];
          if (pc) { try { pc.close(); } catch {} delete activePeersRef.current[from]; }
        } else {
          cleanupViewerPc();
        }
      }
    }
  }, [activeId, cameraSignals, liveSignals, cleanupViewerPc, ensureActivePeer, self, selfIsActive, sendSignal]);

  const canShowLocalPreview = selfIsActive && camera.cameraEnabled && camera.localStream;
  const canShowRemote = !selfIsActive && !!remoteStream;
  const showVideo = canShowLocalPreview || canShowRemote;
  const statusLabel = selfIsActive
    ? "Caméra locale diffusée"
    : webrtcStatus === "live"
      ? `Caméra de ${active?.name || "joueur actif"}`
      : webrtcStatus === "connecting"
        ? "Connexion caméra…"
        : activeCameraEnabled
          ? "Caméra active — attente flux"
          : "Caméra OFF";

  const videoBox = (
    <div
      style={{
        height: "100%",
        minHeight: embedded ? 82 : compact ? 74 : 104,
        borderRadius: embedded ? 12 : 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.10)",
        background: activeCameraEnabled
          ? "radial-gradient(circle at 50% 20%, rgba(127,226,169,.16), rgba(0,0,0,.88) 62%)"
          : "radial-gradient(circle at 50% 20%, rgba(255,255,255,.08), rgba(0,0,0,.88) 66%)",
        display: "grid",
        placeItems: "center",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", right: 6, top: 6, zIndex: 4, display: "flex", gap: 5 }}>
        <button type="button" onClick={() => camera.toggleCamera()} aria-label="Caméra online" style={iconButtonStyle(camera.cameraEnabled)}>📷</button>
        <button type="button" onClick={() => camera.toggleMic()} aria-label="Micro online" style={iconButtonStyle(camera.micEnabled)}>🎙️</button>
      </div>

      {canShowLocalPreview ? (
        <video ref={localVideoRef} muted playsInline autoPlay style={videoStyle(true, embedded, compact)} />
      ) : canShowRemote ? (
        <video ref={remoteVideoRef} playsInline autoPlay style={videoStyle(false, embedded, compact)} />
      ) : activeCameraEnabled ? (
        <div style={{ textAlign: "center", padding: "18px 8px 8px" }}>
          <div style={{ fontSize: embedded ? 17 : 24, lineHeight: 1 }}>🎥</div>
          <div style={{ marginTop: 3, fontSize: embedded ? 10.5 : 12, fontWeight: 950, color: "#fff" }}>{active?.name || "Joueur actif"}</div>
          <div style={{ marginTop: 2, fontSize: embedded ? 8.5 : 10, opacity: 0.66, fontWeight: 750 }}>{statusLabel}</div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "18px 8px 8px", opacity: 0.72 }}>
          <div style={{ fontSize: embedded ? 16 : 22, lineHeight: 1 }}>📷</div>
          <div style={{ marginTop: 3, fontSize: embedded ? 9.5 : 11, fontWeight: 900 }}>Caméra OFF</div>
        </div>
      )}

      {showVideo ? (
        <div style={{ position: "absolute", left: 7, bottom: 6, right: 7, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <span style={liveBadgeStyle(webrtcStatus === "live" || selfIsActive)}>{selfIsActive ? "LIVE LOCAL" : webrtcStatus === "live" ? "LIVE" : "SYNC"}</span>
          <span style={{ fontSize: 8.5, fontWeight: 900, color: "rgba(255,255,255,.78)", textShadow: "0 1px 4px #000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {active?.name || "Joueur actif"}
          </span>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <section style={embeddedShellStyle(activeCameraEnabled)}>
        {videoBox}
        {(camera.error || webrtcError) ? (
          <div style={{ position: "absolute", left: 8, right: 8, bottom: 6, fontSize: 8.5, color: "#ff9aa8", fontWeight: 800, textAlign: "center", textShadow: "0 1px 3px #000" }}>
            {camera.error || webrtcError}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section style={{ borderRadius: 18, padding: compact ? 8 : 10, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(180deg, rgba(20,20,28,.92), rgba(5,5,8,.96))", boxShadow: "0 10px 24px rgba(0,0,0,.45)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#ffd56a" }}>Caméra online</div>
          {!compact && <div style={{ fontSize: 10.5, opacity: 0.72, marginTop: 2 }}>Diffusion WebRTC du joueur actif</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => camera.toggleCamera()} style={pillStyle(camera.cameraEnabled)}>📷</button>
          <button type="button" onClick={() => camera.toggleMic()} style={pillStyle(camera.micEnabled)}>🎙️</button>
        </div>
      </div>
      {(camera.error || webrtcError) && <div style={{ marginTop: 8, fontSize: 11, color: "#ff9a9a", fontWeight: 800 }}>{camera.error || webrtcError}</div>}
      <div style={{ marginTop: 8 }}>{videoBox}</div>
      {!compact && players.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {players.map((p) => {
            const st = String(p.id) === self ? { cameraEnabled: camera.cameraEnabled, micEnabled: camera.micEnabled } : cameraStates[String(p.id)];
            return <span key={p.id} style={badgeStyle(!!st?.cameraEnabled)}>{p.name || "Joueur"} · {st?.cameraEnabled ? "📷" : "—"}{st?.micEnabled ? " 🎙️" : ""}</span>;
          })}
        </div>
      )}
    </section>
  );
}

function embeddedShellStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    minHeight: 0,
    borderRadius: 15,
    padding: 5,
    border: active ? "1px solid rgba(127,226,169,.30)" : "1px solid rgba(255,255,255,.08)",
    background: active ? "linear-gradient(180deg, rgba(4,8,10,.82), rgba(0,0,0,.70))" : "linear-gradient(180deg, rgba(255,255,255,.045), rgba(0,0,0,.20))",
    boxShadow: active ? "0 10px 24px rgba(0,0,0,.38), 0 0 18px rgba(127,226,169,.14)" : "none",
    overflow: "hidden",
    position: "relative",
    boxSizing: "border-box",
  };
}

function videoStyle(mirror: boolean, embedded: boolean, compact: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    minHeight: embedded ? 82 : compact ? 74 : 104,
    objectFit: "cover",
    transform: mirror ? "scaleX(-1)" : "none",
    background: "#000",
  };
}

function iconButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 22,
    borderRadius: 999,
    border: active ? "1px solid rgba(127,226,169,.82)" : "1px solid rgba(255,255,255,.22)",
    background: active ? "linear-gradient(180deg,#78f0ab,#24c46a)" : "linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.07))",
    color: active ? "#061006" : "#f7f7fb",
    boxShadow: active ? "0 0 13px rgba(57,255,140,.34), 0 6px 14px rgba(0,0,0,.35)" : "0 6px 14px rgba(0,0,0,.30)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 950,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    width: 34,
    height: 28,
    border: active ? "1px solid rgba(127,226,169,.82)" : "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    padding: 0,
    fontSize: 13,
    fontWeight: 900,
    color: active ? "#071006" : "#f5f5f7",
    background: active ? "linear-gradient(180deg,#7fe2a9,#35c86d)" : "rgba(255,255,255,.07)",
    boxShadow: active ? "0 0 12px rgba(127,226,169,.28)" : "none",
    cursor: "pointer",
  };
}

function liveBadgeStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "2px 6px",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: .4,
    color: active ? "#071006" : "rgba(255,255,255,.82)",
    background: active ? "rgba(127,226,169,.92)" : "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.16)",
    boxShadow: active ? "0 0 10px rgba(127,226,169,.30)" : "none",
  };
}

function badgeStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 10.5,
    fontWeight: 800,
    color: active ? "#071006" : "rgba(255,255,255,.76)",
    background: active ? "rgba(127,226,169,.88)" : "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.12)",
  };
}
