import { localeForLang, pickLegacyLocalizedText, pickLegacyLocalizedValue } from "../../i18n/legacyLocalizedText";
import React from "react";
import Section from "../../components/Section";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import {
  activePlanWeekIndex,
  buildRunningPlanWeeks,
  createRunningPlan,
  loadRunningPlan,
  nextPlanSession,
  planCompletionPct,
  planDurationWeeks,
  planSessionCompletion,
  saveRunningPlan,
  type RunningPlanGoal,
  type RunningPlanSession,
  type RunningPlanState,
} from "../../activity/runningTraining";

type Props = {
  activities: ActivityRecord[];
  lang: string;
  accent: string;
  textSoft: string;
  onStart: (plan: RunningPlanState, session: RunningPlanSession) => void;
  onPlanChange?: (plan: RunningPlanState | null) => void;
};

const GOALS: Array<{ id: RunningPlanGoal; icon: string; weeks: number; fr: string; en: string; es: string; subFr: string; subEn: string; subEs: string }> = [
  { id: "first-5k", icon: "🌱", weeks: 8, fr: "MON PREMIER 5K", en: "MY FIRST 5K", es: "MI PRIMER 5K", subFr: "Construire progressivement l’endurance et la confiance.", subEn: "Build endurance and confidence progressively.", subEs: "Construye resistencia y confianza progresivamente." },
  { id: "faster-5k", icon: "⚡", weeks: 8, fr: "5K PLUS RAPIDE", en: "FASTER 5K", es: "5K MÁS RÁPIDO", subFr: "Tempo, intervalles et endurance pour battre ton chrono.", subEn: "Tempo, intervals and endurance to improve your time.", subEs: "Tempo, intervalos y resistencia para mejorar tu tiempo." },
  { id: "10k", icon: "🎯", weeks: 10, fr: "OBJECTIF 10K", en: "10K GOAL", es: "OBJETIVO 10K", subFr: "Monter le volume et apprendre à tenir une allure solide.", subEn: "Build volume and learn to hold a strong pace.", subEs: "Aumenta volumen y aprende a mantener un ritmo sólido." },
  { id: "half", icon: "🛣️", weeks: 12, fr: "OBJECTIF SEMI", en: "HALF MARATHON", es: "MEDIA MARATÓN", subFr: "Développer l’endurance longue sans négliger la vitesse.", subEn: "Develop long endurance without losing speed.", subEs: "Desarrolla resistencia larga sin perder velocidad." },
];

function localeLabel(goal: (typeof GOALS)[number], lang: string) {
  return pickLegacyLocalizedText(lang, goal.fr, goal.en, goal.es);
}

function localeSub(goal: (typeof GOALS)[number], lang: string) {
  return pickLegacyLocalizedText(lang, goal.subFr, goal.subEn, goal.subEs);
}

function sessionDate(ts: number, lang: string) {
  try {
    return new Intl.DateTimeFormat(localeForLang(lang), { weekday: "short", day: "2-digit", month: "short" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function workoutTarget(session: RunningPlanSession) {
  if (session.targetDistanceM) return formatDistance(session.targetDistanceM);
  if (session.targetDurationMs) return formatDuration(session.targetDurationMs);
  if (session.customWorkout) {
    const total = session.customWorkout.warmupMin + session.customWorkout.cooldownMin + session.customWorkout.reps * (session.customWorkout.workMin + session.customWorkout.recoveryMin);
    return `${total} min`;
  }
  return "—";
}

export default function RunningPlanView({ activities, lang, accent, textSoft, onStart, onPlanChange }: Props) {
  const [plan, setPlan] = React.useState<RunningPlanState | null>(() => loadRunningPlan());
  const [draftGoal, setDraftGoal] = React.useState<RunningPlanGoal>("faster-5k");
  const [draftSessions, setDraftSessions] = React.useState<3 | 4>(3);
  const [weekIndex, setWeekIndex] = React.useState(() => plan ? activePlanWeekIndex(plan) : 0);

  React.useEffect(() => {
    if (plan) setWeekIndex(activePlanWeekIndex(plan));
  }, [plan?.id]);

  const copy = pickLegacyLocalizedValue(lang, {
    title: "PROGRAMME D’ENTRAÎNEMENT", choose: "CHOISIS TON OBJECTIF", frequency: "FRÉQUENCE", sessions: "sorties / semaine", create: "CRÉER LE PROGRAMME", active: "PROGRAMME ACTIF", progress: "Progression globale", next: "PROCHAINE SÉANCE", week: "SEMAINE", done: "FAIT", start: "LANCER", scheduled: "Planifié", reset: "CHANGER DE PROGRAMME", resetHint: "Le programme sera remplacé, mais tes sorties enregistrées restent intactes.", confirmReset: "REMPLACER", cancel: "ANNULER", today: "Aujourd’hui", planInfo: "Le calendrier reste flexible : tu peux lancer une séance même un autre jour. La progression est validée lorsqu’une sortie est enregistrée depuis cette séance.",
  }, {
    title: "TRAINING PLAN", choose: "CHOOSE YOUR GOAL", frequency: "FREQUENCY", sessions: "runs / week", create: "CREATE PLAN", active: "ACTIVE PLAN", progress: "Overall progress", next: "NEXT WORKOUT", week: "WEEK", done: "DONE", start: "START", scheduled: "Scheduled", reset: "CHANGE PLAN", resetHint: "The plan will be replaced, but saved runs stay untouched.", confirmReset: "REPLACE", cancel: "CANCEL", today: "Today", planInfo: "The calendar stays flexible: you can start a workout on another day. Progress is validated when a run is saved from that workout.",
  }, {
    title: "PLAN DE ENTRENAMIENTO", choose: "ELIGE TU OBJETIVO", frequency: "FRECUENCIA", sessions: "carreras / semana", create: "CREAR PLAN", active: "PLAN ACTIVO", progress: "Progreso global", next: "PRÓXIMA SESIÓN", week: "SEMANA", done: "HECHO", start: "INICIAR", scheduled: "Planificado", reset: "CAMBIAR PLAN", resetHint: "El plan se reemplazará, pero tus carreras guardadas permanecerán.", confirmReset: "REEMPLAZAR", cancel: "CANCELAR", today: "Hoy", planInfo: "El calendario es flexible: puedes iniciar una sesión otro día. El progreso se valida cuando una carrera se guarda desde esa sesión.",
  });

  const [confirmingReset, setConfirmingReset] = React.useState(false);

  const create = () => {
    const next = createRunningPlan(draftGoal, draftSessions);
    saveRunningPlan(next);
    setPlan(next);
    setWeekIndex(0);
    onPlanChange?.(next);
    setConfirmingReset(false);
  };

  if (!plan || confirmingReset) {
    return <div>
      <Section title={copy.choose}>
        <div style={{ display: "grid", gap: 8 }}>
          {GOALS.map((goal) => {
            const active = draftGoal === goal.id;
            return <button key={goal.id} className="btn" onClick={() => setDraftGoal(goal.id)} style={{ padding: 12, minHeight: 70, display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center", textAlign: "left", borderColor: active ? `${accent}88` : undefined, background: active ? `${accent}10` : undefined }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}32`, fontSize: 22 }}>{goal.icon}</span>
              <span><b style={{ color: active ? accent : undefined, fontSize: 10.5 }}>{localeLabel(goal, lang)}</b><small style={{ display: "block", color: textSoft, marginTop: 4, lineHeight: 1.35, fontSize: 9 }}>{localeSub(goal, lang)}</small></span>
              <span style={{ fontSize: 9, color: textSoft, fontWeight: 900 }}>{goal.weeks}W</span>
            </button>;
          })}
        </div>
      </Section>
      <div style={{ marginTop: 10 }}><Section title={copy.frequency}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[3, 4].map((count) => <button key={count} className="btn" onClick={() => setDraftSessions(count as 3 | 4)} style={{ minHeight: 48, borderColor: draftSessions === count ? `${accent}88` : undefined, color: draftSessions === count ? accent : undefined, fontWeight: 1000 }}>{count} {copy.sessions}</button>)}
        </div>
        {confirmingReset ? <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,170,0,.08)", border: "1px solid rgba(255,190,60,.2)", color: textSoft, fontSize: 9.5, lineHeight: 1.4 }}>{copy.resetHint}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: confirmingReset ? "1fr 1.4fr" : "1fr", gap: 8, marginTop: 10 }}>
          {confirmingReset ? <button className="btn" onClick={() => setConfirmingReset(false)}>{copy.cancel}</button> : null}
          <button className="btn primary" onClick={create} style={{ minHeight: 52, background: accent, fontWeight: 1000 }}>{confirmingReset ? copy.confirmReset : copy.create}</button>
        </div>
      </Section></div>
    </div>;
  }

  const weeks = buildRunningPlanWeeks(plan);
  const currentWeek = weeks[weekIndex] || weeks[0];
  const completion = planCompletionPct(plan, activities);
  const nextSession = nextPlanSession(plan, activities);
  const goal = GOALS.find((item) => item.id === plan.goal)!;
  const activeWeek = activePlanWeekIndex(plan);

  return <div>
    <div className="card" style={{ padding: 14, borderColor: `${accent}44`, background: `radial-gradient(circle at 80% 0,${accent}14,rgba(8,10,16,.78) 56%)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>{copy.active}</div><div style={{ fontWeight: 1000, fontSize: 18, marginTop: 4 }}>{goal.icon} {localeLabel(goal, lang)}</div><div style={{ color: textSoft, fontSize: 9.5, marginTop: 4 }}>{planDurationWeeks(plan.goal)} semaines · {plan.sessionsPerWeek} {copy.sessions}</div></div>
        <div style={{ minWidth: 58, textAlign: "right" }}><div style={{ color: accent, fontSize: 22, fontWeight: 1000 }}>{completion}%</div><div style={{ color: textSoft, fontSize: 8.5 }}>{copy.progress}</div></div>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 12 }}><div style={{ width: `${completion}%`, height: "100%", background: accent, borderRadius: 999 }}/></div>
    </div>

    {nextSession ? <div style={{ marginTop: 10 }}><Section title={copy.next}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
        <div><div style={{ fontWeight: 1000, color: accent }}>{nextSession.title}</div><div style={{ fontSize: 9.5, color: textSoft, marginTop: 3 }}>{nextSession.subtitle}</div><div style={{ fontSize: 9, color: textSoft, marginTop: 5 }}>{sessionDate(nextSession.scheduledAt, lang)} · {workoutTarget(nextSession)}</div></div>
        <button className="btn primary" onClick={() => onStart(plan, nextSession)} style={{ background: accent, minHeight: 42, fontWeight: 1000 }}>{copy.start}</button>
      </div>
    </Section></div> : null}

    <div style={{ marginTop: 10 }}><Section title={`${copy.week} ${weekIndex + 1} / ${weeks.length}`}>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6 }}>
        {weeks.map((week) => {
          const done = week.sessions.filter((session) => planSessionCompletion(session, activities)).length;
          const active = week.weekIndex === weekIndex;
          return <button key={week.weekIndex} className="btn" onClick={() => setWeekIndex(week.weekIndex)} style={{ minWidth: 50, minHeight: 38, padding: "6px 7px", borderColor: active ? `${accent}77` : undefined, color: active ? accent : undefined, position: "relative" }}>{week.weekIndex + 1}<small style={{ display: "block", fontSize: 7.5, marginTop: 2, color: done === week.sessions.length ? "#71ff9a" : textSoft }}>{done}/{week.sessions.length}</small>{week.weekIndex === activeWeek ? <span style={{ position: "absolute", top: 3, right: 4, width: 5, height: 5, borderRadius: 99, background: accent }}/> : null}</button>;
        })}
      </div>
      <div style={{ display: "grid", gap: 7, marginTop: 7 }}>
        {currentWeek.sessions.map((session) => {
          const completed = planSessionCompletion(session, activities);
          return <div key={session.id} className="card" style={{ padding: 11, display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 9, alignItems: "center", borderColor: completed ? "rgba(113,255,154,.28)" : undefined }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: completed ? "rgba(113,255,154,.1)" : `${accent}10`, border: `1px solid ${completed ? "rgba(113,255,154,.25)" : `${accent}28`}`, fontSize: 18 }}>{completed ? "✓" : session.presetId === "intervals" || session.presetId === "custom" ? "⚡" : session.presetId === "tempo" ? "🔥" : session.presetId === "long" ? "🛣️" : "🏃"}</div>
            <div><div style={{ fontSize: 10, fontWeight: 1000 }}>{session.title}</div><div style={{ fontSize: 8.8, color: textSoft, marginTop: 3 }}>{session.subtitle}</div><div style={{ fontSize: 8.5, color: textSoft, marginTop: 4 }}>{sessionDate(session.scheduledAt, lang)} · {workoutTarget(session)}</div></div>
            {completed ? <span style={{ color: "#71ff9a", fontWeight: 1000, fontSize: 8.5 }}>{copy.done}</span> : <button className="btn" onClick={() => onStart(plan, session)} style={{ minHeight: 34, fontSize: 8.5, fontWeight: 1000 }}>{copy.start}</button>}
          </div>;
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 8.8, color: textSoft, lineHeight: 1.45 }}>{copy.planInfo}</div>
    </Section></div>

    <button className="btn" onClick={() => { setDraftGoal(plan.goal); setDraftSessions(plan.sessionsPerWeek); setConfirmingReset(true); }} style={{ width: "100%", marginTop: 10, minHeight: 42, fontSize: 9, fontWeight: 1000 }}>{copy.reset}</button>
  </div>;
}
