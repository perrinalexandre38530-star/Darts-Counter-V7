// =========================================================
// src/online/client/OnlineCameraPanel.tsx
// UI légère caméra ONLINE : contrôles locaux + viewer actif
// =========================================================

import React from "react";
import { useOnlineCamera, type OnlineCameraPlayerState } from "./useOnlineCamera";
import type { PlayerId } from "../shared/types";

type PlayerLite = { id: PlayerId; name?: string | null };

type Props = {
  selfId: PlayerId;
  activePlayerId?: PlayerId | null;
  players: PlayerLite[];
  cameraStates?: Record<string, OnlineCameraPlayerState>;
  onCameraStateChange?: (state: OnlineCameraPlayerState) => void;
  compact?: boolean;
};

export default function OnlineCameraPanel({
  selfId,
  activePlayerId,
  players,
  cameraStates = {},
  onCameraStateChange,
  compact = false,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const camera = useOnlineCamera({ playerId: selfId, onStateChange: onCameraStateChange });

  React.useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = camera.localStream;
  }, [camera.localStream]);

  const active = players.find((p) => p.id === activePlayerId) || players[0] || null;
  const activeState = active ? cameraStates[active.id] : null;
  const selfIsActive = !!active && active.id === selfId;
  const canShowLocalPreview = selfIsActive && camera.cameraEnabled && camera.localStream;

  return (
    <section
      style={{
        borderRadius: 18,
        padding: compact ? 8 : 10,
        border: "1px solid rgba(255,255,255,.12)",
        background: "linear-gradient(180deg, rgba(20,20,28,.92), rgba(5,5,8,.96))",
        boxShadow: "0 10px 24px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#ffd56a" }}>
            Caméra online
          </div>
          {!compact && (
            <div style={{ fontSize: 10.5, opacity: 0.72, marginTop: 2 }}>
              Fondation WebRTC prête · flux activable par joueur
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => camera.toggleCamera()} style={pillStyle(camera.cameraEnabled)}>
            {camera.cameraEnabled ? "📷 ON" : "📷 OFF"}
          </button>
          <button type="button" onClick={() => camera.toggleMic()} style={pillStyle(camera.micEnabled)}>
            {camera.micEnabled ? "🎙️ ON" : "🎙️ OFF"}
          </button>
        </div>
      </div>

      {camera.error && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#ff9a9a", fontWeight: 800 }}>{camera.error}</div>
      )}

      <div
        style={{
          marginTop: 8,
          minHeight: compact ? 74 : 104,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.10)",
          background: "radial-gradient(circle at 50% 20%, rgba(255,213,106,.18), rgba(0,0,0,.92) 60%)",
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        {canShowLocalPreview ? (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{ width: "100%", height: compact ? 74 : 104, objectFit: "cover", transform: "scaleX(-1)" }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: compact ? 22 : 28, marginBottom: 3 }}>🎥</div>
            <div style={{ fontSize: 12, fontWeight: 900 }}>
              {active ? `Viewer joueur actif : ${active.name || "Joueur"}` : "Viewer joueur actif"}
            </div>
            <div style={{ marginTop: 3, fontSize: 10.5, opacity: 0.7 }}>
              {activeState?.cameraEnabled ? "Caméra distante signalée active" : "Placeholder caméra — WebRTC prêt"}
            </div>
          </div>
        )}
      </div>

      {!compact && players.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {players.map((p) => {
            const st = p.id === selfId ? { cameraEnabled: camera.cameraEnabled, micEnabled: camera.micEnabled } : cameraStates[p.id];
            return (
              <span key={p.id} style={badgeStyle(!!st?.cameraEnabled)}>
                {p.name || "Joueur"} · {st?.cameraEnabled ? "📷" : "—"}{st?.micEnabled ? " 🎙️" : ""}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    padding: "6px 9px",
    fontSize: 11,
    fontWeight: 900,
    color: active ? "#071006" : "#f5f5f7",
    background: active ? "linear-gradient(180deg,#7fe2a9,#35c86d)" : "rgba(255,255,255,.07)",
    boxShadow: active ? "0 0 12px rgba(127,226,169,.28)" : "none",
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
