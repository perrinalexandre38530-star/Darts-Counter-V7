// ============================================
// src/components/CameraTapScorer.tsx
// Camera scoring (assisté) — UI "tap sur la cible"
// - Utilise une calibration locale (center/radius/angle20)
// - Sur tap, map -> (segment,mult) et dispatch un évènement externe X01V3
// ============================================

import React from "react";
import { loadCameraCalibration } from "../lib/cameraCalibrationStore";
import { dispatchExternalDart, mapTapToDart } from "../lib/cameraScoringEngine";

type Props = {
  onClose: () => void;
  onOpenCalibration: () => void;
  theme?: {
    primary?: string;
    text?: string;
  };
};

export default function CameraTapScorer({ onClose, onOpenCalibration, theme }: Props) {
  const primary = theme?.primary ?? "#f7c85c";
  const textMain = theme?.text ?? "#f5f5ff";

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState<boolean>(false);
  const [cal, setCal] = React.useState(() => loadCameraCalibration());
  const [last, setLast] = React.useState<{ label: string; confidence: number } | null>(null);

  React.useEffect(() => {
    setCal(loadCameraCalibration());
  }, []);

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    const run = async () => {
      try {
        setErr(null);
        setReady(false);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (e: any) {
        setErr(e?.message || "Caméra indisponible");
      }
    };
    run();
    return () => {
      try {
        stream?.getTracks()?.forEach((t) => t.stop());
      } catch {}
    };
  }, []);

  function formatDartLabel(d: { segment: number; multiplier: number }) {
    if (d.segment === 0) return "MISS";
    if (d.segment === 25 && d.multiplier === 2) return "DBULL (50)";
    if (d.segment === 25 && d.multiplier === 1) return "BULL (25)";
    const prefix = d.multiplier === 1 ? "S" : d.multiplier === 2 ? "D" : "T";
    return `${prefix}${d.segment}`;
  }

  function onTap(e: React.MouseEvent) {
    if (!cal) {
      setLast({ label: "Calibration requise", confidence: 0 });
      return;
    }
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const res = mapTapToDart(cal, { x, y });
    if (!res) return;
    dispatchExternalDart(res.dart);
    setLast({ label: formatDartLabel(res.dart), confidence: res.confidence });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        flexDirection: "column",
        color: textMain,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>

        <div style={{ fontWeight: 900, color: primary, letterSpacing: 0.5 }}>
          Caméra — Tap scoring
        </div>

        <button
          onClick={() => {
            onOpenCalibration();
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${primary}55`,
            background: `linear-gradient(180deg, ${primary}22, rgba(255,255,255,0.06))`,
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: `0 0 18px ${primary}22`,
          }}
        >
          Calibrer
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", flex: 1 }} onClick={onTap}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: "contrast(1.05) saturate(1.05)",
            }}
          />

          {/* Overlay simple */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              border: cal ? `2px solid ${primary}44` : "2px solid rgba(255,255,255,0.10)",
              boxShadow: cal ? `0 0 30px ${primary}22 inset` : "0 0 22px rgba(0,0,0,0.55) inset",
            }}
          />

          {err && (
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,0,0,0.35)",
                color: "#ffd0d0",
                fontWeight: 800,
              }}
            >
              {err}
            </div>
          )}

          {!ready && !err && (
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f5f5ff",
                fontWeight: 800,
              }}
            >
              Initialisation caméra…
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(245,245,255,0.82)" }}>
            {cal ? "Tape sur l'impact (sur l'écran) pour envoyer le tir au match." : "Calibration requise : Calibrer"}
          </div>
          <div
            style={{
              minWidth: 140,
              textAlign: "right",
              fontWeight: 900,
              color: last ? primary : "rgba(255,255,255,0.55)",
            }}
          >
            {last ? `${last.label}  (${Math.round(last.confidence * 100)}%)` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
