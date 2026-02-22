// ============================================
// src/pages/CameraScoringSetup.tsx
// Camera scoring (assisté) — Setup
// - Point d'entrée depuis X01ConfigV3 (provider camera)
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadCameraCalibration, clearCameraCalibration } from "../lib/cameraCalibrationStore";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function CameraScoringSetup({ go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";

  const returnTab = params?.returnTab ?? "games";
  const [cal, setCal] = React.useState(() => loadCameraCalibration());

  function refresh() {
    setCal(loadCameraCalibration());
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        padding: "12px 12px 24px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <BackDot
          onClick={() => go(returnTab)}
          title={t("common.back", "Retour")}
          size={36}
          color={primary}
          glow={`${primary}88`}
        />

        <div style={{ fontWeight: 900, letterSpacing: 0.5, color: primary }}>
          {t("cameraScoring.title", "Comptage caméra (assisté)")}
        </div>

        <InfoDot
          onClick={() => {
            // Simple info : on reste lightweight (pas de modal lourde)
            alert(
              [
                "Mode assisté : tu tapes l'impact sur l'écran pour envoyer S/D/T au match.",
                "Calibration nécessaire : centre, rayon, orientation du 20.",
                "Objectif : UX type Dartsmind, sans promesse 100% auto.",
              ].join("\n\n")
            );
          }}
          title={t("common.rules", "Info")}
          size={36}
          color={primary}
          glow={`${primary}88`}
        />
      </header>

      {/* Card */}
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(10,12,24,0.92)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.50)",
          padding: 14,
        }}
      >
        <div style={{ fontSize: 13, color: "rgba(245,245,255,0.82)", lineHeight: 1.4 }}>
          {t(
            "cameraScoring.desc",
            "But : offrir une expérience proche de Dartsmind en mode assisté. Pendant le match, un bouton Caméra permet de viser la cible et de taper l'impact pour envoyer automatiquement le segment au moteur (X01 V3)."
          )}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: primary }}>{t("cameraScoring.calStatus", "Calibration")}</div>
            <div style={{ fontSize: 12, color: cal ? "#9ff0c2" : "#ffd0d0", fontWeight: 900 }}>
              {cal ? t("cameraScoring.calOk", "OK") : t("cameraScoring.calMissing", "Manquante")}
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(245,245,255,0.70)" }}>
            {cal
              ? t("cameraScoring.calUpdated", "Dernière mise à jour") + " : " + new Date(cal.updatedAt).toLocaleString()
              : t("cameraScoring.calNeeded", "Calibre une fois pour ce téléphone (distance/angle).")}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            onClick={() => go("camera_scoring_calibration", { returnTab })}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${primary}55`,
              background: `linear-gradient(180deg, ${primary}33, ${primarySoft})`,
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 0 22px ${primary}22`,
            }}
          >
            {cal ? t("cameraScoring.recalibrate", "Recalibrer") : t("cameraScoring.calibrate", "Calibrer")}
          </button>

          <button
            type="button"
            onClick={() => {
              clearCameraCalibration();
              refresh();
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
            {t("cameraScoring.clear", "Effacer")}
          </button>

          <button
            type="button"
            onClick={() => go(returnTab)}
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
            {t("common.done", "Terminé")}
          </button>
        </div>
      </div>
    </div>
  );
}
