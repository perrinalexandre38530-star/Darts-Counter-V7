import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { FitIcon } from "./FitPerfUi";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

export default function FitExerciseMotion({ exercise, accent, compact = false }: { exercise: FitExercise; accent?: string; compact?: boolean }) {
  const color = accent || exercise.accent || "#f6c256";
  const [motionOk, setMotionOk] = React.useState(true);
  const motionSrc = `/fit/motions/awena/${exercise.id}.webp`;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: compact ? 14 : 18, minHeight: compact ? 86 : 150, border: `1px solid ${color}35`, background: `radial-gradient(circle at 50% 30%,${color}18,rgba(3,5,10,.96) 64%)`, boxShadow: `inset 0 0 30px ${color}0d` }}>
      {motionOk ? (
        <img src={motionSrc} alt={`Mouvement ${exercise.name} avec Awena`} onError={() => setMotionOk(false)} draggable={false} style={{ width: "100%", height: compact ? 86 : 150, objectFit: "contain", display: "block" }}/>
      ) : (
        <div style={{ minHeight: compact ? 86 : 150, display: "grid", gridTemplateColumns: compact ? "58px 1fr" : "74px 1fr", gap: 10, alignItems: "center", padding: compact ? 8 : 12, boxSizing: "border-box" }}>
          <div style={{ position: "relative", width: compact ? 54 : 70, height: compact ? 54 : 70, borderRadius: "50%", border: `2px solid ${color}88`, boxShadow: `0 0 18px ${color}35`, overflow: "hidden", background: "#07090d" }}>
            <img src={AWENA_AVATAR} alt="Awena Coach" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fitAwenaFloat 2.2s ease-in-out infinite" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, fontSize: 8.5, fontWeight: 1000, letterSpacing: 1.1 }}><FitIcon name="coach" size={15}/> AWENA COACH</div>
            <div style={{ marginTop: 5, fontSize: compact ? 10.5 : 12, fontWeight: 950, lineHeight: 1.2 }}>{exercise.name}</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.52)", fontSize: 8.5, lineHeight: 1.35 }}>Animation WebP prête à être branchée dans ce bloc.</div>
            {!compact ? <div style={{ marginTop: 8, height: 5, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: "58%", height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${color},#fff)`, animation: "fitMotionSweep 1.8s ease-in-out infinite alternate" }}/></div> : null}
          </div>
        </div>
      )}
      <style>{`@keyframes fitAwenaFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.025)}}@keyframes fitMotionSweep{from{width:18%}to{width:92%}}`}</style>
    </div>
  );
}
