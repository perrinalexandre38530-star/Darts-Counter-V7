import React from "react";
import { getFinishDoPriority, getFinishDoWeek, compareFinishDoWeeks, loadFinishDoCycleJournal, syncFinishDoCycleStages, evaluateFinishDoCycle, advanceFinishDoCycle, finishDoLessonForAim, type FinishDoProgress } from "./finishDoProgress";
import "./finishDoWeeklyPanel.css";

/** Read-only, profile-scoped training progress; never includes competitive X01 games. */
export default function FinishDoWeeklyPanel({ progress, onReview, onPractice, academyProgress, participantId }: {
  progress: FinishDoProgress;
  onReview?: (double: string) => void;
  onPractice?: (double: string) => void;
  academyProgress?: Record<string, { latest?: number; updatedAt?: number }>;
  participantId?: string | null;
}) {
  const week = getFinishDoWeek(progress);
  const priority = getFinishDoPriority(progress);
  const comparison = compareFinishDoWeeks(progress);
  const [journal, setJournal] = React.useState(() => loadFinishDoCycleJournal(participantId, progress));
  const cycleLesson = academyProgress?.[finishDoLessonForAim(journal.active.focus)];
  React.useEffect(() => {
    setJournal(syncFinishDoCycleStages(participantId, progress, academyProgress?.[finishDoLessonForAim(loadFinishDoCycleJournal(participantId, progress).active.focus)]));
  }, [participantId, progress, cycleLesson?.updatedAt, cycleLesson?.latest]);
  const cycle = journal.active;
  const evidence = evaluateFinishDoCycle(cycle, progress, cycleLesson);
  const cycleScore = cycle.focus === "BULL50" ? 50 : Number(cycle.focus.slice(1)) * 2;
  const cycleSteps = [
    { id: "placement", title: "1 · Comprendre", instruction: `Revois la leçon de ${cycle.focus}, puis valide le quiz avec au moins 80/100.`, target: cycle.focus, score: cycleScore },
    { id: "precision", title: "2 · Répéter", instruction: `Annonce ${cycle.focus} avant chaque lancer : ${cycle.goalAttempts} lancers et ${cycle.goalHits} touches minimum après la leçon validée.`, target: cycle.focus, score: cycleScore },
    { id: "checkout", title: "3 · Finir", instruction: `Réussis un nouveau checkout sur ${cycle.focus} après les deux premières étapes.`, target: cycle.focus, score: cycleScore },
  ] as const;
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
      <summary>Programme Awena · {cycle.focus} · {evidence.complete ? "Cycle terminé" : `${Number(evidence.placementComplete) + Number(evidence.precisionComplete) + Number(evidence.checkoutComplete)}/3`}</summary>
      <div className="mss-finish-week-plan-body">
        <p>Cycle commencé le {new Date(cycle.startedAt).toLocaleDateString("fr-FR")} · niveau {cycle.tier} · cible {cycle.focus}. Chaque étape commence avec de nouveaux résultats : une leçon, puis des lancers, puis un checkout.</p>
        {cycleSteps.map((step, index) => {
          const complete = step.id === "placement" ? evidence.placementComplete : step.id === "precision" ? evidence.precisionComplete : evidence.checkoutComplete;
          const unlocked = index === 0 || (index === 1 ? evidence.placementComplete : evidence.placementComplete && evidence.precisionComplete);
          return <div key={step.id} className="mss-finish-week-plan-step">
            <div className="mss-finish-week-plan-step-head"><strong>{step.title}</strong><small className={complete ? "is-done" : ""}>{complete ? "✓ Validé" : unlocked ? "À travailler" : "Verrouillé"}</small></div>
            <span>{step.instruction}</span>
            {step.id === "precision" && <small>{evidence.attempts}/{cycle.goalAttempts} lancers annoncés • {evidence.hits} touches • objectif {cycle.goalHits} touches sur {cycle.goalAttempts}</small>}
            {step.id === "checkout" && <small>{evidence.checkouts} checkout(s) sur {cycle.focus} depuis le déblocage de cette étape.</small>}
            {step.id === "placement" && !complete && onReview && <button type="button" onClick={() => onReview(cycle.focus)}>Apprendre et valider ›</button>}
            {step.id === "precision" && unlocked && !complete && onPractice && <button type="button" onClick={() => onPractice(cycle.focus)}>Lancer l’exercice pratique ›</button>}
            {step.id === "checkout" && unlocked && !complete && onPractice && <button type="button" onClick={() => onPractice(cycle.focus)}>S’entraîner au checkout ›</button>}
          </div>;
        })}
        {evidence.complete && <button type="button" className="mss-finish-next-cycle" onClick={() => setJournal(advanceFinishDoCycle(participantId, progress, academyProgress?.[finishDoLessonForAim(cycle.focus)]))}>✓ Cycle validé · Passer au cycle suivant ›</button>}
        <small>{journal.completed.length} cycle(s) clôturé(s) sur cet appareil.</small>
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
