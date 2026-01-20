// =============================================================
// src/components/CameraTapScorer.tsx
// Caméra assistée (tap-to-score)
// - Mode "calibrate" : 3 taps (bull, outer ring, 20) → calibration
// - Mode "score"     : tap → (segment,multiplier) via calibration
// - Best-effort : si getUserMedia échoue, l'overlay reste utilisable
// =============================================================

import React from "react";
import type { CameraCalibration } from "../lib/cameraCalibrationStore";
import { buildCalibrationFromTaps, mapTapToDart, type CameraDart, type CameraTap } from "../lib/cameraScoringEngine";
import { saveCameraCalibration } from "../lib/cameraCalibrationStore";

type Props = {
  mode: "calibrate" | "score";
  initialCalibration?: CameraCalibration;
  onCalibration?: (cal: CameraCalibration) => void;
  onDart?: (dart: CameraDart) => void;
  onCancel?: () => void;
};

export default function CameraTapScorer({
  mode,
  initialCalibration,
  onCalibration,
  onDart,
  onCancel,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cal, setCal] = React.useState<CameraCalibration | null>(initialCalibration ?? null);

  // Calibration steps (3 taps)
  const [calStep, setCalStep] = React.useState<1 | 2 | 3>(1);
  const [tapBull, setTapBull] = React.useState<CameraTap | null>(null);
  const [tapOuter, setTapOuter] = React.useState<CameraTap | null>(null);
  const [tapTop20, setTapTop20] = React.useState<CameraTap | null>(null);

  // ------------------------------------------------------------
  // Camera stream lifecycle
  // ------------------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setError(null);
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          setError("getUserMedia indisponible");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Safari/iOS peut exiger une interaction utilisateur
          }
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Accès caméra refusé");
      }
    }

    start();

    return () => {
      cancelled = true;
      try {
        const s = streamRef.current;
        if (s) s.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const getTapNorm = React.useCallback((clientX: number, clientY: number): CameraTap | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    return { x, y };
  }, []);

  const resetCalibrationFlow = React.useCallback(() => {
    setCalStep(1);
    setTapBull(null);
    setTapOuter(null);
    setTapTop20(null);
  }, []);

  const commitCalibration = React.useCallback(
    (bull: CameraTap, outer: CameraTap, top20: CameraTap) => {
      const next = buildCalibrationFromTaps(bull, outer, top20);
      setCal(next);
      try {
        saveCameraCalibration(next);
      } catch {}
      if (onCalibration) onCalibration(next);
    },
    [onCalibration]
  );

  // ------------------------------------------------------------
  // Tap handler
  // ------------------------------------------------------------
  const onTap = React.useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = "touches" in e ? (e.touches?.[0] ?? null) : (e as any);
      if (!point) return;
      const tap = getTapNorm(point.clientX, point.clientY);
      if (!tap) return;

      if (mode === "calibrate") {
        if (calStep === 1) {
          setTapBull(tap);
          setCalStep(2);
          return;
        }
        if (calStep === 2) {
          setTapOuter(tap);
          setCalStep(3);
          return;
        }
        // step 3
        setTapTop20(tap);
        if (tapBull && tapOuter) {
          commitCalibration(tapBull, tapOuter, tap);
        }
        // loop possible (si l'utilisateur veut refaire)
        setCalStep(1);
        return;
      }

      // mode score
      const dart = mapTapToDart(cal, tap);
      if (dart && onDart) onDart(dart);
    },
    [mode, calStep, cal, tapBull, tapOuter, commitCalibration, onDart, getTapNorm]
  );

  const title = mode === "calibrate" ? "Calibration" : "Caméra";

  return (
    <div
      ref={wrapRef}
      onClick={onTap as any}
      onTouchStart={onTap as any}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.25)",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          filter: "contrast(1.05) saturate(1.1)",
        }}
      />

      {/* Overlay UI */}
      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          top: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "none",
            padding: "6px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.4,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
          {mode === "score" ? (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                resetCalibrationFlow();
                // bascule en pseudo-calibration via calStep (toujours en mode score)
                // l'utilisateur peut recalibrer : on l'invite à passer par X01 Config
              }}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Réinitialiser le flux"
            >
              Reset
            </button>
          ) : null}

          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              if (onCancel) onCancel();
            }}
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Hint */}
      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {error ? (
            <span>{error}</span>
          ) : mode === "calibrate" ? (
            <span>
              <b>Tap {calStep}/3</b> — {calStep === 1 ? "Centre du Bull" : calStep === 2 ? "Anneau extérieur" : "Milieu du 20"}
            </span>
          ) : (
            <span>
              Tap pour scorer — {cal ? "calibration OK" : "calibration manquante"}
            </span>
          )}
        </div>

        {/* Simple crosshair overlay */}
        <div
          style={{
            alignSelf: "center",
            width: 68,
            height: 68,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(0,0,0,0.12)",
          }}
        />
      </div>
    </div>
  );
}
