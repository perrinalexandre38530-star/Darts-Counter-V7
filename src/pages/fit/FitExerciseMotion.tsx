import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { FitIcon } from "./FitPerfUi";
import FitAwenaMotionStage, { hasFitAwenaMotion } from "./FitAwenaMotionStage";
import FitAwena3DStage, { hasFitAwena3DMotion } from "./FitAwena3DStage";
import { fitAwenaGeneratedMedia, fitAwenaKnownPoster, fitAwenaKnownVideo } from "../../fit/fitAwenaMedia";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";
import FitPremiumMotionPlayer from "./FitPremiumMotionPlayer";
import { getAwenaPremiumMotion, hasAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

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

/**
 * AWENA is the pedagogical media shown by FIT PERF. Hand-authored/manual AWENA
 * media is authoritative. Generated AWENA is read only from the /approved gate;
 * REVIEW and REJECTED generations can never leak into the application. Source
 * photos/videos remain fallback references while a missing exercise awaits AWENA.
 */
export default function FitExerciseMotion({ exercise, accent, compact = false, cleanBranding = false }: { exercise: FitExercise; accent?: string; compact?: boolean; cleanBranding?: boolean }) {
  const color = accent || exercise.accent || "#f6c256";
  const media = MEDIA_OVERRIDES[exercise.id];
  const mediaKind = detectMediaKind(media?.src || "", media?.kind);
  const [mediaOk, setMediaOk] = React.useState(Boolean(media?.src));
  const [threeDFailed, setThreeDFailed] = React.useState(false);
  const [premiumFailed, setPremiumFailed] = React.useState(false);
  const generatedMedia = React.useMemo(() => fitAwenaGeneratedMedia(exercise), [exercise.id, exercise.name]);
  const knownVideo = fitAwenaKnownVideo(exercise);
  const knownPoster = fitAwenaKnownPoster(exercise);
  const [generatedVideoOk, setGeneratedVideoOk] = React.useState(true);
  const [knownVideoOk, setKnownVideoOk] = React.useState(Boolean(knownVideo));
  const motionExerciseId = exercise.motionKey || exercise.id;
  const premiumMotion = getAwenaPremiumMotion(motionExerciseId);
  const premiumPoster = premiumMotion?.video?.poster || premiumMotion?.frameSequence?.poster || premiumMotion?.frameSequence?.frames?.[0] || null;
  const referenceVideo = exercise.videoUrls?.find(Boolean) || null;
  const referenceImage = freeExerciseImageUrl(exercise, 0);
  const [referenceVideoOk, setReferenceVideoOk] = React.useState(Boolean(referenceVideo));
  const [referenceImageOk, setReferenceImageOk] = React.useState(Boolean(referenceImage));

  React.useEffect(() => { setMediaOk(Boolean(media?.src)); }, [media?.src]);
  React.useEffect(() => {
    setThreeDFailed(false);
    setPremiumFailed(false);
    setGeneratedVideoOk(true);
    setKnownVideoOk(Boolean(knownVideo));
    setReferenceVideoOk(Boolean(referenceVideo));
    setReferenceImageOk(Boolean(referenceImage));
  }, [exercise.id, generatedMedia.videoUrl, knownVideo, referenceVideo, referenceImage]);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: compact ? 12 : 16, minHeight: compact ? 100 : 180, border: `1px solid ${color}30`, background: `radial-gradient(circle at 50% 30%,${color}14,rgba(3,5,10,.96) 66%)`, boxShadow: `inset 0 0 24px ${color}09` }}>
      {media?.src && mediaOk ? (
        mediaKind === "video" ? (
          <video src={media.src} poster={media.poster} muted loop autoPlay playsInline preload="metadata" onError={() => setMediaOk(false)} style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block", background: "transparent" }} />
        ) : (
          <img src={media.src} alt={`Mouvement ${exercise.name} avec Awena`} onError={() => setMediaOk(false)} draggable={false} style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block" }}/>
        )
      ) : knownVideo && knownVideoOk ? (
        <video
          src={knownVideo}
          poster={knownPoster || undefined}
          muted
          loop
          autoPlay
          playsInline
          preload={compact ? "metadata" : "auto"}
          onError={() => setKnownVideoOk(false)}
          style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block", background: "transparent" }}
        />
      ) : generatedVideoOk ? (
        <video
          src={generatedMedia.videoUrl}
          poster={generatedMedia.posterUrl}
          muted
          loop
          autoPlay
          playsInline
          preload={compact ? "metadata" : "auto"}
          onError={() => setGeneratedVideoOk(false)}
          style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block", background: "transparent" }}
        />
      ) : hasAwenaPremiumMotion(motionExerciseId) && premiumMotion && !premiumFailed ? (
        <FitPremiumMotionPlayer slot={premiumMotion} compact={compact} onFail={() => setPremiumFailed(true)} showBadge={!cleanBranding}/>
      ) : compact && premiumPoster ? (
        <div style={{ minHeight: 100, display: "grid", placeItems: "center", padding: 4, boxSizing: "border-box" }}>
          <img src={premiumPoster} alt={`Aperçu Awena ${exercise.name}`} loading="lazy" style={{ width: "100%", height: 122, objectFit: "contain", display: "block", borderRadius: 10 }}/>
        </div>
      ) : hasFitAwena3DMotion(exercise) && !threeDFailed ? (
        <FitAwena3DStage exercise={exercise} compact={compact} onFail={() => setThreeDFailed(true)}/>
      ) : hasFitAwenaMotion(exercise) ? (
        <FitAwenaMotionStage exercise={exercise} compact={compact}/>
      ) : referenceVideo && referenceVideoOk ? (
        <div style={{ position: "relative", minHeight: compact ? 100 : 180, display: "grid", placeItems: "center", padding: 4, boxSizing: "border-box" }}>
          <video src={referenceVideo} muted loop autoPlay playsInline preload="metadata" onError={() => setReferenceVideoOk(false)} style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block", borderRadius: 10 }} />
          {!cleanBranding ? <span style={{ position: "absolute", left: 7, bottom: 7, borderRadius: 999, padding: "3px 6px", background: "rgba(3,6,10,.82)", border: "1px solid rgba(255,255,255,.14)", color: "rgba(255,255,255,.72)", fontSize: 5.8, fontWeight: 1000, letterSpacing: .45 }}>SOURCE · AWENA EN COURS</span> : null}
        </div>
      ) : referenceImage && referenceImageOk ? (
        <div style={{ position: "relative", minHeight: compact ? 100 : 180, display: "grid", placeItems: "center", padding: 4, boxSizing: "border-box" }}>
          <img src={referenceImage} alt={`Référence ${exercise.name}`} loading="lazy" onError={() => setReferenceImageOk(false)} style={{ width: "100%", height: compact ? 100 : 180, objectFit: "contain", display: "block", borderRadius: 10 }} />
          {!cleanBranding ? <span style={{ position: "absolute", left: 7, bottom: 7, borderRadius: 999, padding: "3px 6px", background: "rgba(3,6,10,.82)", border: "1px solid rgba(255,255,255,.14)", color: "rgba(255,255,255,.72)", fontSize: 5.8, fontWeight: 1000, letterSpacing: .45 }}>SOURCE · AWENA EN COURS</span> : null}
        </div>
      ) : (
        <div style={{ minHeight: compact ? 100 : 180, display: "grid", gridTemplateColumns: compact ? "48px 1fr auto" : "62px 1fr auto", gap: 9, alignItems: "center", padding: compact ? 8 : 11, boxSizing: "border-box" }}>
          <div style={{ width: compact ? 46 : 58, height: compact ? 46 : 58, borderRadius: "50%", border: `2px solid ${color}70`, boxShadow: `0 0 14px ${color}2b`, overflow: "hidden", background: "#07090d" }}>
            <img src={AWENA_AVATAR} alt="Awena Coach" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fitAwenaFloat 2.2s ease-in-out infinite" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            {!cleanBranding ? <div style={{ display: "flex", alignItems: "center", gap: 5, color, fontSize: 7.6, fontWeight: 1000, letterSpacing: .9 }}><FitIcon name="coach" size={13}/> AWENA COACH</div> : null}
            <div style={{ marginTop: cleanBranding ? 0 : 4, fontSize: compact ? 10 : 11.5, fontWeight: 1000, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cleanBranding ? "" : exercise.name}</div>
            {!compact && !cleanBranding ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.46)", fontSize: 8 }}>{exercise.muscle} · {exercise.equipment}</div> : null}
          </div>
          <div title="Vidéo AWENA en attente de génération" style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", color, background: `${color}0f`, border: `1px solid ${color}32`, opacity: .85 }}><FitIcon name="live" size={14}/></div>
        </div>
      )}
      <style>{`@keyframes fitAwenaFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02)}}`}</style>
    </div>
  );
}
