import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { FitIcon } from "./FitPerfUi";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

export default function FitExerciseMotion({ exercise, accent, compact = false }: { exercise: FitExercise; accent?: string; compact?: boolean }) {
  const color = accent || exercise.accent || "#f6c256";
  const [motionOk, setMotionOk] = React.useState(true);
  const motionSrc = `/fit/motions/awena/${exercise.id}.webp`;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: compact ? 12 : 16, minHeight: compact ? 78 : 142, border: `1px solid ${color}30`, background: `radial-gradient(circle at 50% 30%,${color}14,rgba(3,5,10,.96) 66%)`, boxShadow: `inset 0 0 24px ${color}09` }}>
      {motionOk ? (
        <img src={motionSrc} alt={`Mouvement ${exercise.name} avec Awena`} onError={() => setMotionOk(false)} draggable={false} style={{ width: "100%", height: compact ? 78 : 142, objectFit: "contain", display: "block" }}/>
      ) : (
        <div style={{ minHeight: compact ? 78 : 142, display: "grid", gridTemplateColumns: compact ? "48px 1fr auto" : "62px 1fr auto", gap: 9, alignItems: "center", padding: compact ? 8 : 11, boxSizing: "border-box" }}>
          <div style={{ width: compact ? 46 : 58, height: compact ? 46 : 58, borderRadius: "50%", border: `2px solid ${color}70`, boxShadow: `0 0 14px ${color}2b`, overflow: "hidden", background: "#07090d" }}>
            <img src={AWENA_AVATAR} alt="Awena Coach" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fitAwenaFloat 2.2s ease-in-out infinite" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color, fontSize: 7.6, fontWeight: 1000, letterSpacing: .9 }}><FitIcon name="coach" size={13}/> AWENA COACH</div>
            <div style={{ marginTop: 4, fontSize: compact ? 10 : 11.5, fontWeight: 1000, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div>
            {!compact ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.46)", fontSize: 8 }}>{exercise.muscle} · {exercise.equipment}</div> : null}
          </div>
          <div title="Animation AWENA" style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", color, background: `${color}0f`, border: `1px solid ${color}32` }}><FitIcon name="live" size={14}/></div>
        </div>
      )}
      <style>{`@keyframes fitAwenaFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.02)}}`}</style>
    </div>
  );
}
