// =========================================================
// src/online/client/useOnlineCamera.ts
// Fondation caméra ONLINE v23.1
// - Permissions caméra / micro
// - Activation / désactivation locale par joueur
// - Préparation WebRTC légère (RTCPeerConnection sans échange forcé)
// - Synchronisation d'état via callback WS optionnel
// =========================================================

import React from "react";
import type { PlayerId } from "../shared/types";

export type OnlineCameraStatus = "idle" | "requesting" | "ready" | "blocked" | "error";

export type OnlineCameraPlayerState = {
  playerId: PlayerId;
  cameraEnabled: boolean;
  micEnabled: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  updatedAt: number;
};

export type UseOnlineCameraOptions = {
  playerId: PlayerId;
  initialCameraEnabled?: boolean;
  initialMicEnabled?: boolean;
  onStateChange?: (state: OnlineCameraPlayerState) => void;
};

export type UseOnlineCameraValue = {
  status: OnlineCameraStatus;
  error: string | null;
  localStream: MediaStream | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  requestPermissions: () => Promise<void>;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  setMicEnabled: (enabled: boolean) => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  stop: () => void;
  createPeerConnection: () => RTCPeerConnection | null;
};

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
}

function setTrackKindEnabled(stream: MediaStream | null, kind: "audio" | "video", enabled: boolean) {
  if (!stream) return;
  const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
  for (const track of tracks) track.enabled = enabled;
}

function hasMediaDevices() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function useOnlineCamera(options: UseOnlineCameraOptions): UseOnlineCameraValue {
  const { playerId, initialCameraEnabled = false, initialMicEnabled = false, onStateChange } = options;

  const [status, setStatus] = React.useState<OnlineCameraStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabledState] = React.useState(initialCameraEnabled);
  const [micEnabled, setMicEnabledState] = React.useState(initialMicEnabled);

  const hasVideo = !!localStream?.getVideoTracks().length;
  const hasAudio = !!localStream?.getAudioTracks().length;

  const publishState = React.useCallback(
    (next?: Partial<OnlineCameraPlayerState>) => {
      const stream = localStreamRef.current;
      const computedCameraEnabled = next?.cameraEnabled ?? cameraEnabled;
      const computedMicEnabled = next?.micEnabled ?? micEnabled;
      onStateChange?.({
        playerId,
        cameraEnabled: computedCameraEnabled,
        micEnabled: computedMicEnabled,
        hasVideo: next?.hasVideo ?? !!stream?.getVideoTracks().length,
        hasAudio: next?.hasAudio ?? !!stream?.getAudioTracks().length,
        updatedAt: Date.now(),
        ...next,
      });
    },
    [cameraEnabled, micEnabled, onStateChange, playerId]
  );

  const openStream = React.useCallback(
    async (nextCameraEnabled: boolean, nextMicEnabled: boolean) => {
      if (!hasMediaDevices()) {
        setStatus("error");
        setError("Caméra/micro indisponibles sur ce navigateur.");
        publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
        return null;
      }

      setStatus("requesting");
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stopStream(localStreamRef.current);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setTrackKindEnabled(stream, "video", nextCameraEnabled);
        setTrackKindEnabled(stream, "audio", nextMicEnabled);
        setStatus("ready");
        publishState({
          cameraEnabled: nextCameraEnabled,
          micEnabled: nextMicEnabled,
          hasVideo: stream.getVideoTracks().length > 0,
          hasAudio: stream.getAudioTracks().length > 0,
        });
        return stream;
      } catch (e: any) {
        const name = String(e?.name || "");
        const blocked = name === "NotAllowedError" || name === "PermissionDeniedError";
        setStatus(blocked ? "blocked" : "error");
        setError(blocked ? "Permission caméra/micro refusée." : e?.message || "Impossible d’ouvrir caméra/micro.");
        publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
        return null;
      }
    },
    [publishState]
  );

  React.useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  React.useEffect(() => {
    publishState();
  }, [publishState]);

  React.useEffect(() => {
    return () => stopStream(localStreamRef.current);
  }, []);

  const requestPermissions = React.useCallback(async () => {
    const stream = localStreamRef.current;
    if (stream) {
      setStatus("ready");
      publishState();
      return;
    }
    await openStream(cameraEnabled, micEnabled);
  }, [cameraEnabled, micEnabled, openStream, publishState]);

  const setCameraEnabled = React.useCallback(
    async (enabled: boolean) => {
      const nextMicEnabled = micEnabled;
      setCameraEnabledState(enabled);
      let stream = localStreamRef.current;
      if (enabled && !stream) stream = await openStream(true, nextMicEnabled);
      setTrackKindEnabled(stream, "video", enabled);
      publishState({ cameraEnabled: enabled, micEnabled: nextMicEnabled });
    },
    [micEnabled, openStream, publishState]
  );

  const setMicEnabled = React.useCallback(
    async (enabled: boolean) => {
      const nextCameraEnabled = cameraEnabled;
      setMicEnabledState(enabled);
      let stream = localStreamRef.current;
      if (enabled && !stream) stream = await openStream(nextCameraEnabled, true);
      setTrackKindEnabled(stream, "audio", enabled);
      publishState({ cameraEnabled: nextCameraEnabled, micEnabled: enabled });
    },
    [cameraEnabled, openStream, publishState]
  );

  const toggleCamera = React.useCallback(async () => {
    await setCameraEnabled(!cameraEnabled);
  }, [cameraEnabled, setCameraEnabled]);

  const toggleMic = React.useCallback(async () => {
    await setMicEnabled(!micEnabled);
  }, [micEnabled, setMicEnabled]);

  const stop = React.useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setCameraEnabledState(false);
    setMicEnabledState(false);
    setStatus("idle");
    publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
  }, [publishState]);

  const createPeerConnection = React.useCallback(() => {
    if (typeof RTCPeerConnection === "undefined") return null;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          pc.addTrack(track, stream);
        } catch {
          // ignore duplicate tracks
        }
      }
    }
    return pc;
  }, []);

  return {
    status,
    error,
    localStream,
    cameraEnabled,
    micEnabled,
    hasVideo,
    hasAudio,
    requestPermissions,
    setCameraEnabled,
    setMicEnabled,
    toggleCamera,
    toggleMic,
    stop,
    createPeerConnection,
  };
}
