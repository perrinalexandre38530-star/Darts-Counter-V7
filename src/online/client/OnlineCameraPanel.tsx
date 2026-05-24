// =========================================================
// src/online/client/OnlineCameraPanel.tsx
// ONLINE caméra X01 — WebRTC persistant / non bloquant
// - Connexions peer-to-peer gardées pendant toute la présence dans le salon
// - Aucun close/recreate lors des changements de tour
// - Le tour actif change uniquement le flux affiché
// - Négociation sérialisée par peer : les réponses WebRTC périmées sont ignorées
// - La caméra reste optionnelle : aucune validation de score n'attend WebRTC
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

type PeerEntry = {
  pc: RTCPeerConnection;
  peerId: string;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  remoteStream: MediaStream;
  queuedIce: RTCIceCandidateInit[];
  lastOfferAt: number;
  operation: Promise<void>;
  pendingRenegotiate: boolean;
};

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const NEGOTIATION_THROTTLE_MS = 2500;

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

function normalizeIncomingCameraState(raw: any): OnlineCameraPlayerState | null {
  const data = raw?.kind === "command" ? raw?.data : raw?.data || raw;
  const state = data?.type === "x01_camera_state" ? data.state : data?.cameraState || null;
  if (!state || typeof state !== "object" || !state.playerId) return null;
  return {
    playerId: String(state.playerId),
    cameraEnabled: !!state.cameraEnabled,
    micEnabled: !!state.micEnabled,
    hasVideo: !!state.hasVideo,
    hasAudio: !!state.hasAudio,
    updatedAt: Number(state.updatedAt || Date.now()),
  } as OnlineCameraPlayerState;
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

function closePeer(entry: PeerEntry | null | undefined) {
  if (!entry) return;
  try { entry.pc.onicecandidate = null; } catch {}
  try { entry.pc.ontrack = null; } catch {}
  try { entry.pc.onnegotiationneeded = null; } catch {}
  try { entry.pc.onconnectionstatechange = null; } catch {}
  try { entry.pc.close(); } catch {}
}

function makeRemoteStreamFromTrack(event: RTCTrackEvent) {
  return event.streams?.[0] || new MediaStream([event.track]);
}

function addOrReplaceLocalTracks(pc: RTCPeerConnection, stream: MediaStream | null) {
  if (!stream) return;
  const senders = pc.getSenders();
  for (const track of stream.getTracks()) {
    const existing = senders.find((sender) => sender.track?.kind === track.kind);
    try {
      if (existing) {
        if (existing.track !== track) void existing.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    } catch {
      // Une piste absente/neuve ne doit jamais casser la boucle de jeu.
    }
  }
}

function ensureRecvTransceivers(pc: RTCPeerConnection) {
  const transceivers = pc.getTransceivers?.() || [];
  const hasVideo = transceivers.some((t) => t.receiver?.track?.kind === "video" || t.sender?.track?.kind === "video");
  const hasAudio = transceivers.some((t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio");
  try { if (!hasVideo) pc.addTransceiver("video", { direction: "recvonly" }); } catch {}
  try { if (!hasAudio) pc.addTransceiver("audio", { direction: "recvonly" }); } catch {}
}

function enqueuePeerTask(
  entry: PeerEntry,
  task: () => Promise<void>,
  onError?: (error: any) => void
) {
  const run = entry.operation.catch(() => undefined).then(task);
  entry.operation = run.catch(() => undefined);
  run.catch((error) => onError?.(error));
  return run;
}

function isPeerConnectionOpen(pc: RTCPeerConnection) {
  return pc.signalingState !== "closed" && pc.connectionState !== "closed";
}

function toSessionDescription(payload: any): RTCSessionDescriptionInit | null {
  const raw = payload?.description || payload;
  if (!raw || typeof raw !== "object") return null;
  if ((raw.type === "offer" || raw.type === "answer") && typeof raw.sdp === "string") {
    return { type: raw.type, sdp: raw.sdp };
  }
  return null;
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
  const selfIsActive = !!activeId && activeId === self;

  const [remoteStreams, setRemoteStreams] = React.useState<Record<string, MediaStream>>({});
  const [webrtcStatus, setWebrtcStatus] = React.useState<"idle" | "connecting" | "live" | "waiting" | "error">("idle");
  const [webrtcError, setWebrtcError] = React.useState<string | null>(null);
  const [liveCameraStates, setLiveCameraStates] = React.useState<Record<string, OnlineCameraPlayerState>>({});

  const mergedCameraStates = React.useMemo(() => {
    const now = Date.now();
    const next: Record<string, OnlineCameraPlayerState> = { ...(cameraStates || {}) };
    for (const [id, st] of Object.entries(liveCameraStates || {})) {
      if (!st) continue;
      if (Number(st.updatedAt || 0) && now - Number(st.updatedAt || 0) > 120000) continue;
      next[id] = st;
    }
    next[self] = {
      playerId: self as any,
      cameraEnabled: camera.cameraEnabled,
      micEnabled: camera.micEnabled,
      hasVideo: camera.hasVideo,
      hasAudio: camera.hasAudio,
      updatedAt: Date.now(),
    };
    return next;
  }, [cameraStates, liveCameraStates, self, camera.cameraEnabled, camera.micEnabled, camera.hasVideo, camera.hasAudio]);
  const activeState = active ? mergedCameraStates[String(active.id)] : null;
  const activeCameraEnabled = !!activeState?.cameraEnabled || (selfIsActive && camera.cameraEnabled);

  const peersRef = React.useRef<Record<string, PeerEntry>>({});
  const processedSignalsRef = React.useRef<Set<string>>(new Set());
  const wsRef = React.useRef<WebSocket | null>(null);
  const wsQueueRef = React.useRef<OnlineCameraSignal[]>([]);
  const [liveSignals, setLiveSignals] = React.useState<OnlineCameraSignal[]>([]);
  const cameraRef = React.useRef(camera);
  React.useEffect(() => { cameraRef.current = camera; }, [camera]);

  const playerIds = React.useMemo(
    () => players.map((p) => String(p.id || "")).filter((id) => id && id !== self),
    [players, self]
  );
  const playerIdsKey = React.useMemo(() => playerIds.slice().sort().join("|"), [playerIds]);

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
          try {
            ws.send(JSON.stringify({
              kind: "command",
              data: {
                type: "x01_camera_state",
                state: {
                  playerId: self,
                  cameraEnabled: cameraRef.current.cameraEnabled,
                  micEnabled: cameraRef.current.micEnabled,
                  hasVideo: cameraRef.current.hasVideo,
                  hasAudio: cameraRef.current.hasAudio,
                  updatedAt: Date.now(),
                },
              },
            }));
          } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const raw = typeof event.data === "string" ? JSON.parse(event.data) : JSON.parse(new TextDecoder().decode(event.data as ArrayBuffer));
            const cameraState = normalizeIncomingCameraState(raw);
            if (cameraState) {
              setLiveCameraStates((prev) => ({ ...prev, [String(cameraState.playerId)]: cameraState }));
              return;
            }
            const signal = normalizeIncomingSignal(raw);
            if (!signal) return;
            if (signal.to && String(signal.to) !== self) return;
            setLiveSignals((prev) => {
              const cutoff = Date.now() - 90000;
              const byId = new Map<string, OnlineCameraSignal>();
              [...prev, signal].forEach((sig: any) => {
                if (!sig?.id) return;
                if (Number(sig.createdAt || 0) < cutoff) return;
                byId.set(String(sig.id), sig as OnlineCameraSignal);
              });
              return Array.from(byId.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)).slice(-320);
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
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ kind: "command", data: { type: "x01_camera_signal", signal } }));
      } catch {
        wsQueueRef.current.push(signal);
      }
    } else {
      wsQueueRef.current.push(signal);
      if (wsQueueRef.current.length > 100) wsQueueRef.current = wsQueueRef.current.slice(-100);
    }

    onCameraSignalSend?.(signal);
  }, [onCameraSignalSend]);

  const publishCameraStateOverWs = React.useCallback((state: OnlineCameraPlayerState) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ kind: "command", data: { type: "x01_camera_state", state } }));
    } catch {
      // L'état caméra est informatif : jamais bloquant pour le gameplay.
    }
  }, []);

  React.useEffect(() => {
    const state: OnlineCameraPlayerState = {
      playerId: self as any,
      cameraEnabled: camera.cameraEnabled,
      micEnabled: camera.micEnabled,
      hasVideo: camera.hasVideo,
      hasAudio: camera.hasAudio,
      updatedAt: Date.now(),
    };
    setLiveCameraStates((prev) => ({ ...prev, [self]: state }));
    publishCameraStateOverWs(state);
  }, [self, camera.cameraEnabled, camera.micEnabled, camera.hasVideo, camera.hasAudio, publishCameraStateOverWs]);

  const sendSignal = React.useCallback((to: string, type: OnlineCameraSignalType, payload?: any) => {
    if (!to || !self) return;
    publishSignal({
      id: makeSignalId(self, to, type),
      roomId,
      from: self,
      to,
      // Gardé pour compat backend, mais la connexion n'est plus liée au tour.
      activePlayerId: activeId || self,
      type,
      payload: safeSignalPayload(payload),
      createdAt: Date.now(),
    });
  }, [activeId, publishSignal, roomId, self]);

  const negotiate = React.useCallback((peerId: string, reason = "sync") => {
    const entry = peersRef.current[peerId];
    if (!entry || !isPeerConnectionOpen(entry.pc)) return Promise.resolve();

    return enqueuePeerTask(
      entry,
      async () => {
        const pc = entry.pc;
        if (!isPeerConnectionOpen(pc)) return;

        const now = Date.now();
        if (now - entry.lastOfferAt < NEGOTIATION_THROTTLE_MS && reason !== "initial") {
          entry.pendingRenegotiate = true;
          return;
        }

        // Un offer ne doit jamais partir pendant une réponse/rollback en cours :
        // c'est la cause typique du "setRemoteDescription(answer) in wrong state: stable" sur mobile.
        if (entry.makingOffer || pc.signalingState !== "stable") {
          entry.pendingRenegotiate = true;
          return;
        }

        try {
          entry.makingOffer = true;
          entry.pendingRenegotiate = false;
          entry.lastOfferAt = now;
          addOrReplaceLocalTracks(pc, cameraRef.current.localStream);
          ensureRecvTransceivers(pc);
          const offer = await pc.createOffer();
          if (!isPeerConnectionOpen(pc) || pc.signalingState !== "stable") {
            entry.pendingRenegotiate = true;
            return;
          }
          await pc.setLocalDescription(offer);
          sendSignal(peerId, "viewer_offer", pc.localDescription);
          setWebrtcStatus((prev) => (prev === "live" ? prev : "connecting"));
          setWebrtcError(null);
        } finally {
          entry.makingOffer = false;
        }
      },
      (error) => {
        setWebrtcStatus("error");
        setWebrtcError(error?.message || "Négociation WebRTC impossible.");
      }
    );
  }, [sendSignal]);

  const ensurePeer = React.useCallback((peerId: string) => {
    if (!peerId || peerId === self || typeof RTCPeerConnection === "undefined") return null;
    const existing = peersRef.current[peerId];
    if (existing && existing.pc.signalingState !== "closed") return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remoteStream = new MediaStream();
    const entry: PeerEntry = {
      pc,
      peerId,
      polite: self.localeCompare(peerId) > 0,
      makingOffer: false,
      ignoreOffer: false,
      remoteStream,
      queuedIce: [],
      lastOfferAt: 0,
      operation: Promise.resolve(),
      pendingRenegotiate: false,
    };
    peersRef.current[peerId] = entry;

    ensureRecvTransceivers(pc);
    addOrReplaceLocalTracks(pc, cameraRef.current.localStream);

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal(peerId, "ice", event.candidate.toJSON());
    };

    pc.ontrack = (event) => {
      const stream = makeRemoteStreamFromTrack(event);
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      setWebrtcStatus("live");
      setWebrtcError(null);
    };

    pc.onnegotiationneeded = () => {
      // Best-effort uniquement : ne jamais bloquer l'UI/le gameplay.
      void negotiate(peerId, "needed");
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        setWebrtcStatus("live");
        setWebrtcError(null);
      }
      if (st === "failed") {
        setWebrtcStatus("error");
        setWebrtcError("Connexion caméra instable. Le score reste utilisable.");
        try { pc.restartIce?.(); } catch {}
        void negotiate(peerId, "restart");
      }
      if (st === "closed") {
        if (peersRef.current[peerId] === entry) delete peersRef.current[peerId];
      }
    };

    return entry;
  }, [negotiate, self, sendSignal]);

  React.useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    video.srcObject = camera.localStream;
    if (camera.localStream) void video.play?.().catch(() => undefined);
  }, [camera.localStream]);

  const displayedRemoteStream = !selfIsActive && activeId ? remoteStreams[activeId] || null : null;
  React.useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = displayedRemoteStream;
    // Android/Chrome bloque souvent l'autoplay si un flux distant contient une piste audio.
    // La prévisualisation anti-triche doit rester vidéo-first, donc on force lecture muted.
    if (displayedRemoteStream) void video.play?.().catch(() => undefined);
  }, [displayedRemoteStream]);

  React.useEffect(() => {
    if (typeof RTCPeerConnection === "undefined") {
      setWebrtcStatus("error");
      setWebrtcError("WebRTC indisponible sur ce navigateur.");
      return;
    }
    for (const peerId of playerIds) {
      ensurePeer(peerId);
    }
    const known = new Set(playerIds);
    for (const [peerId, entry] of Object.entries(peersRef.current)) {
      if (!known.has(peerId)) {
        closePeer(entry);
        delete peersRef.current[peerId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    }
  }, [ensurePeer, playerIds, playerIdsKey]);

  // Quand la caméra locale est activée ou que ses pistes changent, on réutilise les connexions existantes.
  React.useEffect(() => {
    for (const [peerId, entry] of Object.entries(peersRef.current)) {
      addOrReplaceLocalTracks(entry.pc, camera.localStream);
      if (camera.localStream && camera.cameraEnabled) void negotiate(peerId, "local-stream");
    }
  }, [camera.localStream, camera.cameraEnabled, negotiate]);

  // Premier handshake persistant : une fois les joueurs connus, chaque client ouvre une connexion durable vers chaque autre client.
  React.useEffect(() => {
    for (const peerId of playerIds) {
      ensurePeer(peerId);
      void negotiate(peerId, "initial");
    }
  }, [ensurePeer, negotiate, playerIdsKey]);

  React.useEffect(() => () => {
    const peers = peersRef.current;
    peersRef.current = {};
    Object.values(peers).forEach(closePeer);
  }, []);

  React.useEffect(() => {
    const allSignals = [...(Array.isArray(cameraSignals) ? cameraSignals : []), ...liveSignals];
    if (!allSignals.length) return;

    const now = Date.now();
    for (const signal of allSignals) {
      if (!signal?.id || processedSignalsRef.current.has(signal.id)) continue;
      if (signal.to && String(signal.to) !== self) continue;
      if (signal.createdAt && now - Number(signal.createdAt) > 90000) {
        processedSignalsRef.current.add(signal.id);
        continue;
      }
      processedSignalsRef.current.add(signal.id);
      if (processedSignalsRef.current.size > 800) {
        processedSignalsRef.current = new Set(Array.from(processedSignalsRef.current).slice(-400));
      }

      const from = String(signal.from || "");
      if (!from || from === self) continue;
      const entry = ensurePeer(from);
      if (!entry) continue;

      if (signal.type === "viewer_offer" || signal.type === "active_answer") {
        void enqueuePeerTask(
          entry,
          async () => {
            const pc = entry.pc;
            if (!isPeerConnectionOpen(pc)) return;

            const description = toSessionDescription(signal.payload);
            if (!description) return;

            // Très important : une ANSWER n'est valable que si on attend vraiment une réponse.
            // Sur Android/Chrome, une réponse arrivée en retard ou en double fait planter avec :
            // "Failed to set remote answer sdp: Called in wrong state: stable".
            // On l'ignore donc proprement au lieu d'afficher une erreur et de casser la caméra.
            if (description.type === "answer" && pc.signalingState !== "have-local-offer") {
              return;
            }

            const offerCollision = description.type === "offer" && (entry.makingOffer || pc.signalingState !== "stable");
            entry.ignoreOffer = !entry.polite && offerCollision;
            if (entry.ignoreOffer) return;

            if (description.type === "offer" && offerCollision && pc.signalingState !== "stable") {
              try {
                await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
              } catch {
                // Certains navigateurs gèrent le rollback implicitement, d'autres non.
              }
            }

            addOrReplaceLocalTracks(pc, cameraRef.current.localStream);
            await pc.setRemoteDescription(description);

            while (entry.queuedIce.length) {
              const ice = entry.queuedIce.shift();
              if (!ice) continue;
              try { await pc.addIceCandidate(new RTCIceCandidate(ice)); } catch {}
            }

            if (description.type === "offer") {
              addOrReplaceLocalTracks(pc, cameraRef.current.localStream);
              await pc.setLocalDescription(await pc.createAnswer());
              sendSignal(from, "active_answer", pc.localDescription);
            }

            if (entry.pendingRenegotiate && pc.signalingState === "stable") {
              entry.pendingRenegotiate = false;
              window.setTimeout(() => void negotiate(from, "pending"), 120);
            }
          },
          (error) => {
            setWebrtcStatus("error");
            setWebrtcError(error?.message || "Signal caméra invalide. Le match continue.");
          }
        );
        continue;
      }

      if (signal.type === "ice") {
        void enqueuePeerTask(entry, async () => {
          try {
            if (!signal.payload || entry.ignoreOffer || !isPeerConnectionOpen(entry.pc)) return;
            if (!entry.pc.remoteDescription) {
              entry.queuedIce.push(signal.payload);
              if (entry.queuedIce.length > 40) entry.queuedIce = entry.queuedIce.slice(-40);
              return;
            }
            await entry.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch {
            // ICE tardif/obsolète : ignore, surtout ne pas casser l'UI.
          }
        });
        continue;
      }

      if (signal.type === "hangup") {
        closePeer(entry);
        delete peersRef.current[from];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[from];
          return next;
        });
      }
    }
  }, [cameraSignals, ensurePeer, liveSignals, negotiate, self, sendSignal]);

  React.useEffect(() => {
    if (selfIsActive) {
      setWebrtcStatus(camera.cameraEnabled && camera.localStream ? "live" : "waiting");
      return;
    }
    if (displayedRemoteStream) {
      setWebrtcStatus("live");
      return;
    }
    setWebrtcStatus(activeCameraEnabled ? "waiting" : "idle");
  }, [activeCameraEnabled, camera.cameraEnabled, camera.localStream, displayedRemoteStream, selfIsActive]);

  const canShowLocalPreview = selfIsActive && camera.cameraEnabled && camera.localStream;
  const canShowRemote = !selfIsActive && !!displayedRemoteStream;
  const showVideo = canShowLocalPreview || canShowRemote;
  const statusLabel = selfIsActive
    ? camera.cameraEnabled
      ? "Caméra locale prête"
      : "Tour actif — caméra optionnelle"
    : webrtcStatus === "live"
      ? `Caméra de ${active?.name || "joueur actif"}`
      : activeCameraEnabled
        ? "Flux prêt dès connexion"
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
        <button type="button" onClick={() => void camera.toggleCamera()} aria-label="Caméra online" style={iconButtonStyle(camera.cameraEnabled)}>📷</button>
        <button type="button" onClick={() => void camera.toggleMic()} aria-label="Micro online" style={iconButtonStyle(camera.micEnabled)}>🎙️</button>
      </div>

      {canShowLocalPreview ? (
        <video ref={localVideoRef} muted playsInline autoPlay style={videoStyle(true, embedded, compact)} />
      ) : canShowRemote ? (
        <video ref={remoteVideoRef} muted playsInline autoPlay style={videoStyle(false, embedded, compact)} />
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
          <span style={liveBadgeStyle(webrtcStatus === "live" || selfIsActive)}>{selfIsActive ? "LOCAL" : webrtcStatus === "live" ? "LIVE" : "SYNC"}</span>
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
          {!compact && <div style={{ fontSize: 10.5, opacity: 0.72, marginTop: 2 }}>Flux persistant — affichage du joueur actif</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => void camera.toggleCamera()} style={pillStyle(camera.cameraEnabled)}>📷</button>
          <button type="button" onClick={() => void camera.toggleMic()} style={pillStyle(camera.micEnabled)}>🎙️</button>
        </div>
      </div>
      {(camera.error || webrtcError) && <div style={{ marginTop: 8, fontSize: 11, color: "#ff9a9a", fontWeight: 800 }}>{camera.error || webrtcError}</div>}
      <div style={{ marginTop: 8 }}>{videoBox}</div>
      {!compact && players.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {players.map((p) => {
            const st = String(p.id) === self ? { cameraEnabled: camera.cameraEnabled, micEnabled: camera.micEnabled } : mergedCameraStates[String(p.id)];
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
