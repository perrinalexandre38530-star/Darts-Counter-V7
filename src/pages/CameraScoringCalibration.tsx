// ============================================
// src/pages/CameraScoringCalibration.tsx
// Camera scoring (assisté) — Calibration (V1)
// Steps:
//  1) Tap centre
//  2) Tap bord extérieur
//  3) Tap milieu du "20" (orientation)
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import type { CameraCalibrationV1 } from "../types/cameraScoring";
import { saveCameraCalibration, loadCameraCalibration } from "../lib/cameraCalibrationStore";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function CameraScoringCalibration({ go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme?.primary ?? "#f7c85c";
  const textMain = theme?.text ?? "#f5f5ff";

  const returnTab = params?.returnTab ?? "games";

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // étape: 0 centre, 1 bord, 2 orientation
  const [step, setStep] = React.useState<0 | 1 | 2>(() => 0);
  const [center, setCenter] = React.useState<{ x: number; y: number } | null>(null);
  const [radiusOuter, setRadiusOuter] = React.useState<number | null>(null);
  const [angleDeg20, setAngleDeg20] = React.useState<number | null>(null);

  React.useEffect(() => {
    const existing = loadCameraCalibration();
    if (existing) {
      setCenter(existing.center);
      setRadiusOuter(existing.radiusOuter);
      setAngleDeg20(existing.angleDeg20);
    }
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

  function toDeg(rad: number) {
    return (rad * 180) / Math.PI;
  }

  function normDeg(deg: number) {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  }

  function handleTap(e: React.MouseEvent) {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (step === 0) {
      setCenter({ x, y });
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!center) return;
      const dx = x - center.x;
      const dy = y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // dist normalisé -> rayon extérieur
      setRadiusOuter(dist);
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!center) return;
      const dx = x - center.x;
      const dy = y - center.y;
      const a = normDeg(toDeg(Math.atan2(dy, dx)));
      setAngleDeg20(a);
    }
  }

  const canSave = !!center && typeof radiusOuter === "number" && typeof angleDeg20 === "number";

  function save() {
    if (!canSave) return;
    const cal: CameraCalibrationV1 = {
      version: 1,
      center: center!,
      radiusOuter: radiusOuter!,
      angleDeg20: angleDeg20!,
      updatedAt: Date.now(),
    };
    saveCameraCalibration(cal);
    go(returnTab);
  }

  const stepText =
    step === 0
      ? t("cameraScoring.step0", "1/3 — Tape le centre (BULL)")
      : step === 1
      ? t("cameraScoring.step1", "2/3 — Tape le bord extérieur (autour du double)")
      : t("cameraScoring.step2", "3/3 — Tape le milieu du segment 20 (en haut de la cible)");

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <BackDot
          onClick={() => go("camera_scoring_setup", { returnTab })}
          title={t("common.back", "Retour")}
          size={36}
          color={primary}
          glow={`${primary}88`}
        />

        <div style={{ fontWeight: 900, color: primary, letterSpacing: 0.5 }}>
          {t("cameraScoring.calibration", "Calibration caméra")}
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* Video area */}
      <div style={{ position: "relative", flex: 1 }}>
        <div
          onClick={handleTap}
          style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* overlay guides */}
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: 12,
              padding: 12,
              borderRadius: 14,
              background: "rgba(0,0,0,0.65)",
              border: `1px solid ${primary}33`,
              boxShadow: `0 0 22px ${primary}1a`,
            }}
          >
            <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>{stepText}</div>
            <div style={{ fontSize: 12, color: "rgba(245,245,255,0.78)", lineHeight: 1.35 }}>
              {t(
                "cameraScoring.calHint",
                "Conseil : place le téléphone fixe (trépied), cible bien au centre, lumière stable. Tu peux recalibrer à tout moment."
              )}
            </div>
          </div>

          {err && (
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 90,
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
                bottom: 90,
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

          {/* points */}
          {center && (
            <div
              style={{
                position: "absolute",
                left: `calc(${center.x * 100}% - 8px)`,
                top: `calc(${center.y * 100}% - 8px)`,
                width: 16,
                height: 16,
                borderRadius: 999,
                border: `2px solid ${primary}`,
                boxShadow: `0 0 18px ${primary}55`,
                background: "rgba(0,0,0,0.25)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.25)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setCenter(null);
            setRadiusOuter(null);
            setAngleDeg20(null);
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {t("common.reset", "Recommencer")}
        </button>

        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: `1px solid ${primary}55`,
            background: canSave
              ? `linear-gradient(180deg, ${primary}33, rgba(255,255,255,0.06))`
              : "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: canSave ? "pointer" : "not-allowed",
            opacity: canSave ? 1 : 0.55,
          }}
        >
          {t("common.save", "Sauvegarder")}
        </button>
      </div>
    </div>
  );
}
