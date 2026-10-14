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
import { saveCameraCalibration, loadCameraCalibration, fitCameraBoardHomography, type CameraCalibrationV2 } from "../lib/cameraCalibrationStore";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { awenaProcedurePromptForRoute } from "../awena/AwenaProceduralAcademy";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function CameraScoringCalibration({ go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const awena = useAwenaOptional();

  const primary = theme?.primary ?? "#f7c85c";
  const textMain = theme?.text ?? "#f5f5ff";

  const returnTab = params?.returnTab ?? "games";

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Calibration compétition : centre + 4 points connus sur le bord extérieur du double.
  // D20 / D6 / D3 / D11 correspondent aux axes haut / droite / bas / gauche du board canonique.
  type CalPoint = { x:number; y:number };
  const [step, setStep] = React.useState<0 | 1 | 2 | 3 | 4>(() => 0);
  const [center, setCenter] = React.useState<CalPoint | null>(null);
  const [anchors, setAnchors] = React.useState<Record<string,CalPoint>>({});
  const [fitInfo, setFitInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const existing:any = loadCameraCalibration();
    if (existing) setCenter({ x: existing.cx, y: existing.cy });
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

  function viewToVideoNorm(e:React.MouseEvent){
    const el=e.currentTarget as HTMLDivElement, rect=el.getBoundingClientRect(), video=videoRef.current;
    if(!video?.videoWidth||!video.videoHeight) return null;
    const boxW=rect.width,boxH=rect.height,videoAspect=video.videoWidth/video.videoHeight,boxAspect=boxW/boxH;
    let drawW=boxW,drawH=boxH,offX=0,offY=0;
    if(videoAspect>boxAspect){ drawH=boxW/videoAspect; offY=(boxH-drawH)/2; }
    else { drawW=boxH*videoAspect; offX=(boxW-drawW)/2; }
    const px=e.clientX-rect.left-offX,py=e.clientY-rect.top-offY;
    if(px<0||py<0||px>drawW||py>drawH) return null;
    return {x:px/drawW,y:py/drawH};
  }

  function handleTap(e: React.MouseEvent) {
    const pt=viewToVideoNorm(e); if(!pt) return;
    if(step===0){ setCenter(pt); setStep(1); return; }
    const keys=["d20","d6","d3","d11"];
    const key=keys[step-1];
    const next={...anchors,[key]:pt}; setAnchors(next);
    if(step<4) setStep((step+1) as any);
    if(step===4 && center){
      const correspondences=[
        {x:center.x,y:center.y,bx:0,by:0},
        {x:next.d20.x,y:next.d20.y,bx:0,by:-1},
        {x:next.d6.x,y:next.d6.y,bx:1,by:0},
        {x:next.d3.x,y:next.d3.y,bx:0,by:1},
        {x:next.d11.x,y:next.d11.y,bx:-1,by:0},
      ];
      setFitInfo(fitCameraBoardHomography(correspondences));
    }
  }

  const canSave = !!center && !!anchors.d20 && !!anchors.d6 && !!anchors.d3 && !!anchors.d11 && !!fitInfo && fitInfo.confidence >= .55;

  function save() {
    if (!canSave || !center) return;
    const left=anchors.d11,right=anchors.d6,top=anchors.d20,bottom=anchors.d3;
    const rx=Math.max(.0001,(Math.hypot(right.x-center.x,right.y-center.y)+Math.hypot(left.x-center.x,left.y-center.y))/2);
    const ry=Math.max(.0001,(Math.hypot(top.x-center.x,top.y-center.y)+Math.hypot(bottom.x-center.x,bottom.y-center.y))/2);
    const cal: CameraCalibrationV2 = {
      v:2,cx:center.x,cy:center.y,rx,ry,r:(rx+ry)/2,a20:-Math.PI/2,phi:0,
      method:"manual-projective-5pt",confidence:fitInfo.confidence,zoneConfidence:fitInfo.confidence,
      homography:fitInfo.homography,projectiveConfidence:fitInfo.confidence,projectiveErrorMm:fitInfo.errorMm,
      updatedAt:Date.now(),
    };
    saveCameraCalibration(cal); go(returnTab);
  }

  const stepText = [
    "1/5 — Tape exactement le centre du DBULL",
    "2/5 — Tape le milieu du bord EXTÉRIEUR du DOUBLE 20",
    "3/5 — Tape le milieu du bord EXTÉRIEUR du DOUBLE 6",
    "4/5 — Tape le milieu du bord EXTÉRIEUR du DOUBLE 3",
    "5/5 — Tape le milieu du bord EXTÉRIEUR du DOUBLE 11",
  ][step];

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

        {awena ? (
          <button
            type="button"
            aria-label="Awena · Calibration caméra"
            title="Awena · Calibration caméra"
            onClick={() => {
              awena.setRuntime({
                route: "camera_scoring_calibration",
                mode: "settings-help",
                phase: "menu",
                inGame: false,
                screenLabel: "Calibration caméra",
              });
              awena.openPanel();
              void awena.ask(awenaProcedurePromptForRoute("camera_scoring_calibration"), { canonicalFrench: true });
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "none",
              padding: 3,
              background: "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)",
              boxShadow: "0 0 12px rgba(22,232,255,.38),0 0 20px rgba(255,56,199,.2),0 0 0 2px rgba(0,0,0,.42)",
              cursor: "pointer",
            }}
          >
            <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}>
              <img src="/awena/awena-avatar.webp" alt="Awena" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background:"#000" }} />
            </span>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
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
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background:"#000" }}
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
                "Mode précision : téléphone fixe. Tape exactement les 5 repères demandés sur le flux caméra complet. Les bandes noires éventuelles ne font pas partie de l’image et sont ignorées."
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

          {/* La calibration est stockée dans le repère natif du capteur. */}
          {fitInfo ? <div style={{position:"absolute",left:12,right:12,bottom:18,padding:10,borderRadius:12,background:"rgba(0,0,0,.72)",border:`1px solid ${fitInfo.confidence>=.75?"#39d98a":"#f7c85c"}66`,fontSize:12,fontWeight:800,pointerEvents:"none"}}>Rectification projective : {Math.round(fitInfo.confidence*100)} % · erreur estimée {Number(fitInfo.errorMm||0).toFixed(2)} mm</div> : null}
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
            setAnchors({});
            setFitInfo(null);
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
