import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { FitIcon } from "./FitPerfUi";
import FitAwenaMotionStage, { hasFitAwenaMotion } from "./FitAwenaMotionStage";
import FitAwena3DStage, { hasFitAwena3DMotion } from "./FitAwena3DStage";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

/**
 * FIT PERF motion renderer.
 *
 * Current exercises use the lightweight AWENA articulated renderer so no
 * missing-media request or placeholder flash occurs. A future photorealistic
 * WebP/video can be introduced exercise-by-exercise by adding it here as an
 * explicit media override, without changing FitPerfPlan or the exercise store.
 */
type MotionMediaOverride = {
  src: string;
  kind?: "image" | "video";
  poster?: string;
};

const MEDIA_OVERRIDES: Partial<Record<string, MotionMediaOverride>> = {};

function detectMediaKind(src: string, kind?: MotionMediaOverride["kind"]) {
  if (kind) return kind;
  return /\.(mp4|webm|mov)$/i.test(src) ? "video" : "image";
}

export default function FitExerciseMotion({ exercise, accent, compact = false }: { exercise: FitExercise; accent?: string; compact?: boolean }) {
  const color = accent || exercise.accent || "#f6c256";
  const media = MEDIA_OVERRIDES[exercise.id];
  const mediaKind = detectMediaKind(media?.src || "", media?.kind);
  const [mediaOk, setMediaOk] = React.useState(Boolean(media?.src));
  const [threeDFailed, setThreeDFailed] = React.useState(false);
  const freeReferenceImage = exercise.source === "free-exercise-db" ? freeExerciseImageUrl(exercise) : null;
  const [freeImageOk, setFreeImageOk] = React.useState(Boolean(freeReferenceImage));
  const mark3DFailed = React.useCallback(() => setThreeDFailed(true), []);

  React.useEffect(() => { setMediaOk(Boolean(media?.src)); }, [media?.src]);
  React.useEffect(() => { setThreeDFailed(false); }, [exercise.id]);
  React.useEffect(() => { setFreeImageOk(Boolean(freeReferenceImage)); }, [freeReferenceImage]);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: compact ? 12 : 16, minHeight: compact ? 82 : 154, border: `1px solid ${color}30`, background: `radial-gradient(circle at 50% 30%,${color}14,rgba(3,5,10,.96) 66%)`, boxShadow: `inset 0 0 24px ${color}09` }}>
      {media?.src && mediaOk ? (
        mediaKind === "video" ? (
          <video
            src={media.src}
            poster={media.poster}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setMediaOk(false)}
            style={{ width: "100%", height: compact ? 82 : 154, objectFit: "contain", display: "block" }}
          />
        ) : (
          <img src={media.src} alt={`Mouvement ${exercise.name} avec Awena`} onError={() => setMediaOk(false)} draggable={false} style={{ width: "100%", height: compact ? 82 : 154, objectFit: "contain", display: "block" }}/>
        )
      ) : hasFitAwena3DMotion(exercise) && !threeDFailed ? (
        <FitAwena3DStage exercise={exercise} compact={compact} onFail={mark3DFailed}/>
      ) : hasFitAwenaMotion(exercise) ? (
        <FitAwenaMotionStage exercise={exercise} compact={compact}/>
      ) : freeReferenceImage && freeImageOk ? (
        <div style={{ position: "relative", minHeight: compact ? 100 : 170, display: "grid", placeItems: "center", padding: 6, boxSizing: "border-box" }}>
          <img src={freeReferenceImage} alt={`Référence technique ${exercise.name}`} loading="lazy" onError={() => setFreeImageOk(false)} style={{ width: "100%", height: compact ? 96 : 166, objectFit: "contain", display: "block", borderRadius: 10 }}/>
          <div style={{ position: "absolute", left: 8, top: 8, padding: "3px 6px", borderRadius: 999, background: "rgba(3,5,10,.82)", border: "1px solid rgba(114,222,244,.28)", color: "#72def4", fontSize: 6.2, fontWeight: 1000, letterSpacing: .5 }}>OPEN DB · RÉFÉRENCE</div>
        </div>
      ) : (
        <div style={{ minHeight: compact ? 82 : 154, display: "grid", gridTemplateColumns: compact ? "48px 1fr auto" : "62px 1fr auto", gap: 9, alignItems: "center", padding: compact ? 8 : 11, boxSizing: "border-box" }}>
          <div style={{ width: compact ? 46 : 58, height: compact ? 46 : 58, borderRadius: "50%", border: `2px solid ${color}70`, boxShadow: `0 0 14px ${color}2b`, overflow: "hidden", background: "#07090d" }}>
            <img src={AWENA_AVATAR} alt="Awena Coach" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fitAwenaFloat 2.2s ease-in-out infinite" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color, fontSize: 7.6, fontWeight: 1000, letterSpacing: .9 }}><FitIcon name="coach" size={13}/> AWENA COACH</div>
            <div style={{ marginTop: 4, fontSize: compact ? 10 : 11.5, fontWeight: 1000, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div>
            {!compact ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.46)", fontSize: 8 }}>{exercise.muscle} · {exercise.equipment}</div> : null}
          </div>
          <div title="Animation AWENA à ajouter" style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", color, background: `${color}0f`, border: `1px solid ${color}32` }}><FitIcon name="live" size={14}/></div>
        </div>
      )}
      <style>{`@keyframes fitAwenaFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02)}}`}</style>
    </div>
  );
}
