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
  embedded?: boolean;
};

export default function OnlineCameraPanel({
  selfId,
  activePlayerId,
  players,
  cameraStates = {},
  onCameraStateChange,
  compact = false,
  embedded = false,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const camera = useOnlineCamera({ playerId: selfId, onStateChange: onCameraStateChange });

  React.useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = camera.localStream;
  }, [camera.localStream]);

  const active = players.find((p) => String(p.id) === String(activePlayerId)) || players[0] || null;
  const activeState = active ? cameraStates[String(active.id)] : null;
  const selfIsActive = !!active && String(active.id) === String(selfId);
  const activeCameraEnabled = !!activeState?.cameraEnabled || (selfIsActive && camera.cameraEnabled);
  const canShowLocalPreview = selfIsActive && camera.cameraEnabled && camera.localStream;

  if (embedded) {
    return (
      <section
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          borderRadius: 15,
          padding: 5,
          border: activeCameraEnabled ? "1px solid rgba(127,226,169,.30)" : "1px solid rgba(255,255,255,.08)",
          background: activeCameraEnabled
            ? "linear-gradient(180deg, rgba(4,8,10,.82), rgba(0,0,0,.70))"
            : "linear-gradient(180deg, rgba(255,255,255,.045), rgba(0,0,0,.20))",
          boxShadow: activeCameraEnabled ? "0 10px 24px rgba(0,0,0,.38), 0 0 18px rgba(127,226,169,.14)" : "none",
          overflow: "hidden",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "100%",
            minHeight: 82,
            borderRadius: 12,
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
          <div
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              zIndex: 3,
              display: "flex",
              gap: 5,
            }}
          >
            <button type="button" onClick={() => camera.toggleCamera()} aria-label="Caméra online" style={iconButtonStyle(camera.cameraEnabled)}>
              📷
            </button>
            <button type="button" onClick={() => camera.toggleMic()} aria-label="Micro online" style={iconButtonStyle(camera.micEnabled)}>
              🎙️
            </button>
          </div>

          {canShowLocalPreview ? (
            <video ref={videoRef} muted playsInline autoPlay style={{ width: "100%", height: "100%", minHeight: 82, objectFit: "cover", transform: "scaleX(-1)" }} />
          ) : activeCameraEnabled ? (
            <div style={{ textAlign: "center", padding: "18px 8px 8px" }}>
              <div style={{ fontSize: 17, lineHeight: 1 }}>🎥</div>
              <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 950, color: "#fff" }}>
                {active ? active.name || "Joueur actif" : "Joueur actif"}
              </div>
              <div style={{ marginTop: 2, fontSize: 8.5, opacity: 0.66, fontWeight: 750 }}>
                Caméra joueur actif
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "18px 8px 8px", opacity: 0.72 }}>
              <div style={{ fontSize: 16, lineHeight: 1 }}>📷</div>
              <div style={{ marginTop: 3, fontSize: 9.5, fontWeight: 900 }}>Caméra OFF</div>
            </div>
          )}
        </div>

        {camera.error ? (
          <div style={{ position: "absolute", left: 8, right: 8, bottom: 6, fontSize: 8.5, color: "#ff9aa8", fontWeight: 800, textAlign: "center", textShadow: "0 1px 3px #000" }}>
            {camera.error}
          </div>
        ) : null}
      </section>
    );
  }

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
            const st = String(p.id) === String(selfId) ? { cameraEnabled: camera.cameraEnabled, micEnabled: camera.micEnabled } : cameraStates[String(p.id)];
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

function iconButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 24,
    borderRadius: 999,
    border: active ? "1px solid rgba(127,226,169,.82)" : "1px solid rgba(255,255,255,.22)",
    background: active ? "linear-gradient(180deg,#78f0ab,#24c46a)" : "linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.07))",
    color: active ? "#061006" : "#f7f7fb",
    boxShadow: active ? "0 0 13px rgba(57,255,140,.34), 0 6px 14px rgba(0,0,0,.35)" : "0 6px 14px rgba(0,0,0,.30)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };
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
