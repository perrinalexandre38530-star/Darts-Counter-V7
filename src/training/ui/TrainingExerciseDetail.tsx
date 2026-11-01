import React from "react";
import type { TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";
import { TRAINING_FAMILY_META } from "../catalog/trainingExerciseCatalog";
import { buildTrainingExerciseDetail } from "../catalog/trainingExerciseDetails";
import type { TrainingExerciseProgression } from "../profile/trainingExerciseProgression";

type ExerciseSummary = {
  attempts: number;
  bestPerformance: number;
  lastPerformance: number;
  lastAccuracy: number;
  lastSuccess: boolean;
  lastMetricLabel: string;
  lastMetricValue: string;
  lastEndedAt: number;
} | null;

export default function TrainingExerciseDetail({ exercise, summary, progression, resumeAvailable = false, resumeLabel, isFavorite, onToggleFavorite, onBack, onStart, onResume, onRestart }: { exercise: TrainingExerciseDefinition; summary?: ExerciseSummary; progression?: TrainingExerciseProgression; resumeAvailable?: boolean; resumeLabel?: string; isFavorite: boolean; onToggleFavorite: () => void; onBack: () => void; onStart: () => void; onResume?: () => void; onRestart?: () => void }) {
  const detail = buildTrainingExerciseDetail(exercise);
  const hasHistory = !!summary && summary.attempts > 0;
  const lastWhen = hasHistory && summary?.lastEndedAt ? new Date(summary.lastEndedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—";

  return <div style={{ marginTop: 10 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={onBack} style={{ padding: "8px 11px", borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", color: "inherit", fontSize: 8.3, fontWeight: 950, cursor: "pointer" }}>← RETOUR AU CATALOGUE</button>
      <button type="button" onClick={onToggleFavorite} style={{ padding: "8px 11px", borderRadius: 10, border: isFavorite ? "1px solid rgba(255,216,107,.48)" : "1px solid rgba(255,255,255,.10)", background: isFavorite ? "rgba(255,216,107,.08)" : "rgba(255,255,255,.03)", color: "inherit", fontSize: 8.3, fontWeight: 950, cursor: "pointer" }}>{isFavorite ? "★ FAVORI" : "☆ AJOUTER AUX FAVORIS"}</button>
    </div>

    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 8, fontWeight: 950, letterSpacing: .9, color: "#27dcff" }}>{TRAINING_FAMILY_META[exercise.family].label.toUpperCase()} • DIFFICULTÉ {exercise.difficulty}/5</div><div style={{ marginTop: 4, fontSize: "clamp(18px,2.5vw,28px)", lineHeight: 1.04, fontWeight: 1000 }}>{exercise.title}</div><div style={{ marginTop: 5, maxWidth: 760, fontSize: 10.5, lineHeight: 1.45, opacity: .58 }}>{exercise.subtitle}</div></div>
      <div style={{ padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(39,220,255,.18)", background: "rgba(39,220,255,.05)", fontSize: 8.3, fontWeight: 950, whiteSpace: "nowrap" }}>{detail.format.toUpperCase()}</div>
    </div>

    <div className="training-exercise-detail-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.02fr) minmax(320px,.98fr)", gap: 12, marginTop: 14, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
        <section style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.085)", background: "rgba(255,255,255,.024)" }}>
          <div style={{ fontSize: 11, fontWeight: 950 }}>DESCRIPTION</div>
          <div style={{ marginTop: 10, fontSize: 10.6, lineHeight: 1.55, opacity: .72 }}>{detail.overview}</div>
          <div style={{ marginTop: 14, fontSize: 9, fontWeight: 950, letterSpacing: .8, color: "#8cffcb" }}>RÈGLES</div>
          <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
            {detail.rules.map((rule, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr)", gap: 8, alignItems: "start", fontSize: 10.2, lineHeight: 1.48 }}><span style={{ width: 22, height: 22, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(39,220,255,.07)", border: "1px solid rgba(39,220,255,.14)", color: "#27dcff", fontSize: 8, fontWeight: 950 }}>{index + 1}</span><span style={{ opacity: .72 }}>{rule}</span></div>)}
          </div>
          <div style={{ marginTop: 14, padding: 11, borderRadius: 12, border: "1px solid rgba(80,255,174,.14)", background: "rgba(80,255,174,.035)" }}><div style={{ fontSize: 8, fontWeight: 950, color: "#8cffcb" }}>OBJECTIF</div><div style={{ marginTop: 4, fontSize: 10.4, lineHeight: 1.4, fontWeight: 850 }}>{detail.objective}</div></div>
        </section>

        <section style={{ marginTop: 10, padding: 14, borderRadius: 15, border: "1px solid rgba(255,85,85,.18)", background: "rgba(120,10,15,.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><div style={{ fontSize: 8.5, fontWeight: 950, color: "#ff6f7a" }}>PROCHAIN OBJECTIF • NIVEAU {progression?.level ?? 0} → {Math.min(5, (progression?.level ?? 0) + 1)}</div><div style={{ fontSize: 7.5, opacity: .5 }}>NIVEAU PERSONNEL</div></div>
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950 }}>{progression?.nextObjective || detail.nextObjective}</div>
        </section>

        <section style={{ marginTop: 10, padding: 14, borderRadius: 15, border: hasHistory ? "1px solid rgba(39,220,255,.18)" : "1px solid rgba(255,255,255,.075)", background: hasHistory ? "linear-gradient(135deg,rgba(39,220,255,.045),rgba(140,90,255,.025))" : "rgba(255,255,255,.018)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 9, fontWeight: 950, letterSpacing: .8, color: hasHistory ? "#27dcff" : "inherit" }}>TON SUIVI</div>
            <div style={{ fontSize: 7.5, opacity: .42 }}>{hasHistory ? `DERNIÈRE • ${lastWhen}` : "AUCUNE TENTATIVE"}</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 10, border: progression?.mastered ? "1px solid rgba(80,255,174,.18)" : "1px solid rgba(39,220,255,.14)", background: progression?.mastered ? "rgba(80,255,174,.035)" : "rgba(39,220,255,.025)" }}><span style={{ fontSize: 8, fontWeight: 950 }}>{progression?.mastered ? "MAÎTRISE" : `NIVEAU PERSONNEL ${progression?.level ?? 0}/5`}</span><span style={{ fontSize: 7.3, opacity: .55 }}>{progression?.currentObjective || "Premier objectif à valider"}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
            {[
              ["TENTATIVES", summary?.attempts ?? 0],
              ["DERNIÈRE", hasHistory ? `${summary?.lastPerformance ?? 0}/100` : "—"],
              ["RECORD", hasHistory ? `${summary?.bestPerformance ?? 0}/100` : "—"],
              ["PRÉCISION", hasHistory ? `${summary?.lastAccuracy ?? 0}%` : "—"],
            ].map(([label, value]) => <div key={String(label)} style={{ padding: "9px 6px", borderRadius: 11, textAlign: "center", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ fontSize: 11.5 }}>{value}</b><div style={{ marginTop: 3, fontSize: 6.5, opacity: .42 }}>{label}</div></div>)}
          </div>
          {hasHistory && <div style={{ marginTop: 9, padding: 9, borderRadius: 10, border: summary?.lastSuccess ? "1px solid rgba(80,255,174,.18)" : "1px solid rgba(255,184,76,.18)", background: summary?.lastSuccess ? "rgba(80,255,174,.035)" : "rgba(255,184,76,.035)", fontSize: 8.8, lineHeight: 1.4 }}><b style={{ color: summary?.lastSuccess ? "#8cffcb" : "#ffd86b" }}>{summary?.lastSuccess ? "OBJECTIF ATTEINT" : "OBJECTIF À RETENTER"}</b>{summary?.lastMetricLabel && summary?.lastMetricValue !== "" ? <span style={{ opacity: .64 }}> • {summary.lastMetricLabel} : {summary.lastMetricValue}</span> : null}</div>}
        </section>
      </div>

      <div style={{ minWidth: 0, position: "sticky", top: 64 }}>
        <section style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.085)", background: "rgba(255,255,255,.024)" }}>
          <div style={{ fontSize: 11, fontWeight: 950 }}>APERÇU DE LA SÉANCE</div>
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.16)" }}>
            <div style={{ fontSize: 7.5, opacity: .4, textAlign: "center", letterSpacing: .8 }}>CIBLE / SITUATION</div>
            <div style={{ marginTop: 7, textAlign: "center", fontSize: "clamp(28px,5vw,52px)", lineHeight: 1, fontWeight: 1000, color: "#ff343f" }}>{detail.previewTitle}</div>
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 9, lineHeight: 1.35, opacity: .48 }}>{detail.previewHint}</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(2, Math.max(1, detail.previewActions.length))},minmax(0,1fr))`, gap: 7, marginTop: 14 }}>
              {detail.previewActions.map((label, index) => <div key={label} style={{ minHeight: 54, padding: "8px 6px", borderRadius: 11, display: "grid", placeItems: "center", textAlign: "center", border: index === 0 ? "1px solid rgba(255,95,95,.30)" : "1px solid rgba(80,255,174,.16)", background: index === 0 ? "rgba(255,60,70,.035)" : "rgba(80,255,174,.025)", fontSize: 8.5, fontWeight: 950 }}>{label}</div>)}
            </div>
          </div>
          {resumeAvailable && <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,216,107,.22)", background: "rgba(255,216,107,.045)" }}><div style={{ fontSize: 8, fontWeight: 950, color: "#ffd86b" }}>SÉANCE INTERROMPUE</div><div style={{ marginTop: 3, fontSize: 8.7, lineHeight: 1.35, opacity: .66 }}>{resumeLabel || "Une progression locale est disponible pour cet exercice."}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}><button type="button" onClick={onResume} style={{ minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,216,107,.32)", background: "rgba(255,216,107,.09)", color: "inherit", fontSize: 8.5, fontWeight: 1000, cursor: "pointer" }}>REPRENDRE</button><button type="button" onClick={onRestart || onStart} style={{ minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)", color: "inherit", fontSize: 8.2, fontWeight: 950, cursor: "pointer" }}>RECOMMENCER</button></div></div>}
          {!resumeAvailable && <button type="button" onClick={onStart} style={{ width: "100%", marginTop: 12, minHeight: 46, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(39,220,255,.36)", background: "linear-gradient(90deg,rgba(39,220,255,.18),rgba(140,90,255,.15))", color: "inherit", fontSize: 9.5, fontWeight: 1000, cursor: "pointer" }}>{hasHistory ? "REJOUER L'EXERCICE" : "LANCER L'EXERCICE"}</button>}
        </section>
      </div>
    </div>

    <style>{`@media (max-width: 760px){.training-exercise-detail-grid{grid-template-columns:1fr!important}.training-exercise-detail-grid>div:last-child{position:static!important}} @media (max-width:520px){.training-exercise-detail-grid section div[style*="repeat(4"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}`}</style>
  </div>;
}
