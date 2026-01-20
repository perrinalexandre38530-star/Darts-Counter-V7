// ============================================
// src/components/CameraAssistedCalibrationModal.tsx
// Modal calibration caméra assistée (tap-to-score)
// - 3 taps: centre (bull), bord extérieur, centre du 20
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  clearCameraCalibration,
  loadCameraCalibration,
  saveCameraCalibration,
  type CameraCalibrationV1,
} from "../lib/cameraCalibrationStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CameraAssistedCalibrationModal({ open, onClose }: Props) {
  const { theme, palette } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = (theme?.primary || palette?.primary || "#f7c85c") as string;

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [tap1, setTap1] = React.useState<{ x: number; y: number } | null>(null);
  const [tap2, setTap2] = React.useState<{ x: number; y: number } | null>(null);
  const [tap3, setTap3] = React.useState<{ x: number; y: number } | null>(null);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    // init depuis calibration existante
    const cal = loadCameraCalibration();
    if (cal) {
      setStep(3);
    } else {
      setStep(1);
    }
    setTap1(null);
    setTap2(null);
    setTap3(null);
  }, [open]);

  if (!open) return null;

  const onTap = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;

    if (step === 1) {
      setTap1({ x, y });
      setStep(2);
    } else if (step === 2) {
      setTap2({ x, y });
      setStep(3);
    } else {
      setTap3({ x, y });

      // calc calibration
      const c = tap1;
      const edge = tap2;
      if (!c || !edge) return;

      const dx = edge.x - c.x;
      const dy = edge.y - c.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      const dx20 = x - c.x;
      const dy20 = y - c.y;
      const a20 = Math.atan2(dy20, dx20);

      const cal: CameraCalibrationV1 = {
        v: 1,
        cx: c.x,
        cy: c.y,
        r: Math.max(0.0001, radius),
        a20,
        updatedAt: Date.now(),
      };
      saveCameraCalibration(cal);

      // close
      onClose();
    }
  };

  const hint =
    step === 1
      ? t("camera.cal.step1", "Tape le CENTRE (BULL)")
      : step === 2
      ? t("camera.cal.step2", "Tape le BORD EXTÉRIEUR (anneau double)")
      : t("camera.cal.step3", "Tape le CENTRE DU 20 (en haut)");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(10,12,24,0.96), rgba(6,7,14,0.98))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
          padding: 14,
          color: "#f2f2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 900, color: primary }}>
            {t("camera.cal.title", "Calibration caméra (assistée)")}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 10,
              padding: "6px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {t("common.close", "Fermer")}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#c8cbe4" }}>{hint}</div>

        <div
          ref={wrapRef}
          onClick={onTap}
          style={{
            marginTop: 10,
            height: 300,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.08), rgba(0,0,0,0.35))",
            position: "relative",
            overflow: "hidden",
            cursor: "crosshair",
          }}
        >
          {/* repères visuels */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.10)" }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.10)" }} />
          </div>

          {[tap1, tap2, tap3].filter(Boolean).map((p: any, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                transform: "translate(-50%,-50%)",
                width: 18,
                height: 18,
                borderRadius: 999,
                border: `2px solid ${primary}`,
                boxShadow: `0 0 18px ${primary}55`,
                background: "rgba(0,0,0,0.35)",
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              clearCameraCalibration();
              setStep(1);
              setTap1(null);
              setTap2(null);
              setTap3(null);
            }}
            style={{
              borderRadius: 12,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {t("camera.cal.reset", "Réinitialiser")}
          </button>

          <div style={{ fontSize: 11, color: "#aeb2d3", alignSelf: "center" }}>
            {t("camera.cal.note", "Astuce : place le téléphone fixe et garde la même distance.")}
          </div>
        </div>
      </div>
    </div>
  );
}
