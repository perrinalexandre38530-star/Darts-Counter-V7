import React from "react";
import { getFinishDoPriority, getFinishDoWeek, compareFinishDoWeeks, buildFinishDoTrainingPlan, getFinishDoPlanStatus, type FinishDoProgress } from "./finishDoProgress";
import "./finishDoWeeklyPanel.css";

/** Read-only, profile-scoped training progress; never includes competitive X01 games. */
export default function FinishDoWeeklyPanel({ progress, onReview, onPractice, lessonValidated = false }: {
  progress: FinishDoProgress;
  onReview?: (double: string) => void;
  onPractice?: (double: string) => void;
  lessonValidated?: boolean;
}) {
  const week = getFinishDoWeek(progress);
  const priority = getFinishDoPriority(progress);
  const comparison = compareFinishDoWeeks(progress);
  const status = getFinishDoPlanStatus(progress, lessonValidated);
  const plan = status.plan;
  const targets = Object.values(progress.aims).filter(row => row.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts).slice(0, 4);
  return <section className="mss-finish-week" aria-label="Progression FINISH DO">
    <div className="mss-finish-week-head"><div><small>TRAINING • DOUBLE OUT</small><h3>Ma progression FINISH DO</h3></div><span>7 derniers jours</span></div>
    <div className="mss-finish-week-kpis">
      <div><small>Séances</small><strong>{week.sessions}<em> / 3</em></strong></div>
      <div><small>Fléchettes</small><strong>{week.darts}</strong></div>
      <div><small>Précision annoncée</small><strong>{week.attempts ? `${Math.round(100 * week.hits / week.attempts)}%` : "—"}</strong></div>
    </div>
    <div className="mss-finish-week-days" aria-label="Séances par jour">
      {week.days.map(day => <div key={day.date} title={`${day.date} : ${day.sessions} séance(s)`}>
        <span className={day.sessions ? "active" : ""} style={{ height: `${Math.max(5, Math.min(34, day.sessions * 11))}px` }} />
        <small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 2)}</small>
      </div>)}
    </div>
    <p className="mss-finish-week-note">Objectif conseillé : 3 séances sur 7 jours. La précision ne concerne que les doubles annoncés avant le lancer.</p>
    <div className="mss-finish-week-comparison">
      <strong>Comparaison sur 7 jours</strong>
      <div><span>Séances</span><b>{comparison.previous.sessions} → {comparison.current.sessions}</b></div>
      <div><span>Précision</span><b>{comparison.previousPrecision === null ? "—" : `${comparison.previousPrecision}%`} → {comparison.currentPrecision === null ? "—" : `${comparison.currentPrecision}%`}</b></div>
      <small>{comparison.deltaPoints === null ? "Comparaison de précision indisponible : il faut des doubles annoncés sur les deux périodes." : `${comparison.deltaPoints > 0 ? "+" : ""}${comparison.deltaPoints} points de précision par rapport aux 7 jours précédents.`}</small>
    </div>
    <details className="mss-finish-week-plan">
      <summary>Programme Awena · {plan.tierName} · {plan.focus}</summary>
      <div className="mss-finish-week-plan-body">
        <p>{plan.objective}</p>
        {plan.sampleSize < 3 && <small>Parcours de découverte : aucune faiblesse n'est déduite avec moins de 3 lancers annoncés.</small>}
        {plan.steps.map(step => {
          const complete = step.id === "placement" ? status.placementComplete : step.id === "precision" ? status.precisionComplete : status.checkoutComplete;
          return <div key={step.id} className="mss-finish-week-plan-step">
            <div className="mss-finish-week-plan-step-head"><strong>{step.title}</strong><small className={complete ? "is-done" : ""}>{complete ? "✓ Validé" : "À travailler"}</small></div>
            <span>{step.instruction}</span>
            {step.id === "precision" && <small>{status.attempts} lancers annoncés • {status.hits} touches • objectif {plan.tier === "discovery" ? "3 lancers" : `10 lancers et ${status.targetHits}/10 de précision`}</small>}
            {step.id === "checkout" && <small>{status.checkouts} checkout(s) terminé(s) sur {plan.focus} depuis l'activation du suivi.</small>}
            {step.id === "placement" && onReview && <button type="button" onClick={() => onReview(plan.focus)}>Apprendre et valider ›</button>}
            {step.id === "precision" && onPractice && <button type="button" onClick={() => onPractice(plan.focus)}>Lancer l’exercice pratique ›</button>}
            {step.id === "checkout" && onPractice && <button type="button" onClick={() => onPractice(plan.focus)}>S’entraîner au checkout ›</button>}
          </div>;
        })}
      </div>
    </details>
    {targets.length > 0 && <div className="mss-finish-week-targets">
      {targets.map(row => <div key={row.label}><span>{row.label}</span><div className="mss-finish-week-track"><i style={{ width: `${100 * row.hits / row.attempts}%` }} /></div><strong>{row.hits}/{row.attempts}</strong></div>)}
    </div>}
    {priority ? <div className="mss-finish-week-next">
      <div><small>PROCHAINE RÉVISION AWENA</small><strong>{priority.label} • {Math.round(100 * priority.hits / priority.attempts)}% sur {priority.attempts} essais</strong><p>Revois le plan B puis entraîne ce double sur une courte série.</p></div>
      {onReview && <button type="button" onClick={() => onReview(priority.label)}>Réviser ›</button>}
    </div> : <p className="mss-finish-week-note">Annonce un double avant au moins trois lancers pour débloquer une recommandation personnalisée.</p>}
    <small className="mss-finish-week-foot">Suivi local par profil. Les anciens totaux sont conservés ; le graphique quotidien débute avec les nouvelles séances.</small>
  </section>;
}
