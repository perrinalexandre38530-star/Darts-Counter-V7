// =========================================================
// src/online/client/useOnlineCamera.ts
// Fondation caméra ONLINE v23
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

export function useOnlineCamera(options: UseOnlineCameraOptions): UseOnlineCameraValue {
  const { playerId, initialCameraEnabled = false, initialMicEnabled = false, onStateChange } = options;

  const [status, setStatus] = React.useState<OnlineCameraStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabledState] = React.useState(initialCameraEnabled);
  const [micEnabled, setMicEnabledState] = React.useState(initialMicEnabled);

  const hasVideo = !!localStream?.getVideoTracks().length;
  const hasAudio = !!localStream?.getAudioTracks().length;

  const publishState = React.useCallback(
    (next?: Partial<OnlineCameraPlayerState>) => {
      onStateChange?.({
        playerId,
        cameraEnabled,
        micEnabled,
        hasVideo,
        hasAudio,
        updatedAt: Date.now(),
        ...next,
      });
    },
    [cameraEnabled, hasAudio, hasVideo, micEnabled, onStateChange, playerId]
  );

  React.useEffect(() => {
    publishState();
  }, [publishState]);

  const requestPermissions = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Caméra/micro indisponibles sur ce navigateur.");
      publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stopStream(localStream);
      setLocalStream(stream);
      setTrackKindEnabled(stream, "video", cameraEnabled);
      setTrackKindEnabled(stream, "audio", micEnabled);
      setStatus("ready");
      publishState({
        cameraEnabled,
        micEnabled,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0,
      });
    } catch (e: any) {
      const name = String(e?.name || "");
      const blocked = name === "NotAllowedError" || name === "PermissionDeniedError";
      setStatus(blocked ? "blocked" : "error");
      setError(blocked ? "Permission caméra/micro refusée." : e?.message || "Impossible d’ouvrir caméra/micro.");
      publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
    }
  }, [cameraEnabled, localStream, micEnabled, publishState]);

  const ensureStream = React.useCallback(async () => {
    if (localStream) return localStream;
    await requestPermissions();
    return null;
  }, [localStream, requestPermissions]);

  const setCameraEnabled = React.useCallback(
    async (enabled: boolean) => {
      setCameraEnabledState(enabled);
      if (enabled && !localStream) await ensureStream();
      setTrackKindEnabled(localStream, "video", enabled);
      publishState({ cameraEnabled: enabled });
    },
    [ensureStream, localStream, publishState]
  );

  const setMicEnabled = React.useCallback(
    async (enabled: boolean) => {
      setMicEnabledState(enabled);
      if (enabled && !localStream) await ensureStream();
      setTrackKindEnabled(localStream, "audio", enabled);
      publishState({ micEnabled: enabled });
    },
    [ensureStream, localStream, publishState]
  );

  const toggleCamera = React.useCallback(async () => {
    await setCameraEnabled(!cameraEnabled);
  }, [cameraEnabled, setCameraEnabled]);

  const toggleMic = React.useCallback(async () => {
    await setMicEnabled(!micEnabled);
  }, [micEnabled, setMicEnabled]);

  const stop = React.useCallback(() => {
    stopStream(localStream);
    setLocalStream(null);
    setCameraEnabledState(false);
    setMicEnabledState(false);
    setStatus("idle");
    publishState({ cameraEnabled: false, micEnabled: false, hasVideo: false, hasAudio: false });
  }, [localStream, publishState]);

  const createPeerConnection = React.useCallback(() => {
    if (typeof RTCPeerConnection === "undefined") return null;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    if (localStream) {
      for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
    }
    return pc;
  }, [localStream]);

  React.useEffect(() => stop, [stop]);

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
