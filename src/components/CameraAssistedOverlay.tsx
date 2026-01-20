// @ts-nocheck
// =============================================================
// src/components/CameraAssistedOverlay.tsx
// Overlay vidéo + tap-to-score (caméra assistée)
// - Affiche la caméra (getUserMedia)
// - Tap => mapping via calibration -> (segment,multiplier)
// - Remonte via callback onDart
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadCameraCalibration } from "../lib/cameraCalibrationStore";
import { scoreTap } from "../lib/cameraScoringEngine";

type Props = {
  open: boolean;
  onClose: () => void;
  onDart: (d: { segment: number | 25; multiplier: 0 | 1 | 2 | 3 }) => void;
};

export default function CameraAssistedOverlay({ open, onClose, onDart }: Props) {
  const { theme, palette } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = (theme?.primary || palette?.primary || "#af7c85") as string;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Start/stop camera when opened
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setReady(false);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          // @ts-ignore
          v.srcObject = stream;
          try {
            await v.play();
          } catch {
            // ignore autoplay restrictions; user interaction will start playback
          }
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
      try {
        const s = streamRef.current;
        if (s) s.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
      setReady(false);
    };
  }, [open]);

  const close = React.useCallback(() => {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    setReady(false);
    onClose();
  }, [onClose]);

  const handleTap = React.useCallback(
    (ev: React.MouseEvent) => {
      if (!wrapRef.current) return;
      const calib = loadCameraCalibration();
      if (!calib) {
        setError(t?.("camera.noCalibration", "Calibration manquante : configure la caméra d’abord."));
        return;
      }

      const r = wrapRef.current.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;

      const hit = scoreTap({ x, y }, calib);
      if (!hit) return;

      onDart(hit);
    },
    [onDart, t]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <section style={{ flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6, color: "#e7e9ff" }}>
              {t?.("camera.title", "Caméra assistée")}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, color: "#aeb2d3" }}>
              {t?.("camera.subtitle", "Tape sur l’impact pour injecter la flèche")}
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 999,
              border: `1px solid rgba(255,255,255,0.16)`,
              background: "rgba(255,255,255,0.06)",
              color: "#e7e9ff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {t?.("common.close", "Fermer")}
          </button>
        </div>

        {/* Body */}
        <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}>
          <div
            ref={wrapRef}
            onClick={handleTap}
            style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* Crosshair / hint */}
            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                right: 12,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                color: "#e7e9ff",
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 900, color: primary, marginBottom: 4 }}>
                {t?.("camera.hintTitle", "Astuce")}
              </div>
              <div style={{ opacity: 0.9 }}>
                {t?.(
                  "camera.hint",
                  "Positionne le téléphone face à la cible. Tape précisément sur le point d’impact après chaque lancer."
                )}
              </div>
              {!ready && (
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  {t?.("camera.loading", "Ouverture caméra…")}
                </div>
              )}
              {error && (
                <div style={{ marginTop: 6, color: "#ff6b8b", fontWeight: 900 }}>
                  {t?.("camera.error", "Erreur")}: {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
