import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { listActivities } from "../../activity/activityStore";
import { buildRunningStats } from "../../activity/runningInsights";
import type { ActivityRecord } from "../../activity/activityTypes";
import type { RunningPlanSession, RunningPlanState } from "../../activity/runningTraining";
import RunningGoalView from "./RunningGoalView";
import RunningPlanView from "./RunningPlanView";
import RunningRaceCalendarView from "./RunningRaceCalendarView";
import { RunningGlyph, RunningHubCard, RunningSurface } from "./RunningUi";
import OutdoorActivitySelector from "./OutdoorActivitySelector";
import OutdoorActivityPlanPanel from "./OutdoorActivityPlanPanel";
import { loadOutdoorPerformanceSport, outdoorSportLabel, saveOutdoorPerformanceSport, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";

type Props = { go: (route: any, params?: any) => void };
type PlanTab = "hub" | "goal" | "program" | "races";

export default function RunningPlanCenter({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const locale = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const [activitySport, setActivitySport] = React.useState<OutdoorPerformanceSport>(() => loadOutdoorPerformanceSport());
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [tab, setTab] = React.useState<PlanTab>("hub");

  React.useEffect(() => { saveOutdoorPerformanceSport(activitySport); void listActivities(activitySport).then(setActivities); }, [activitySport]);

  const stats = React.useMemo(() => buildRunningStats(activities, Date.now(), locale), [activities, locale]);
  const copy = lang === "fr"
    ? { title: "PLAN & OBJECTIFS", sub: "Un écran clair pour préparer ta progression", info: "Objectif, programme et calendrier sont séparés en onglets pour garder une lecture simple et éviter les longues pages.", goal: "OBJECTIF", program: "PROGRAMME", races: "COURSES", goalHint: "Ta cible principale", programHint: "Ta progression semaine après semaine", racesHint: "Tes prochaines échéances" }
    : lang === "es"
      ? { title: "PLAN Y OBJETIVOS", sub: "Una pantalla clara para preparar tu progreso", info: "Objetivo, plan y calendario están separados en pestañas para mantener una lectura simple.", goal: "OBJETIVO", program: "PLAN", races: "CARRERAS", goalHint: "Tu objetivo principal", programHint: "Tu progresión semana a semana", racesHint: "Tus próximas fechas" }
      : { title: "PLAN & GOALS", sub: "A clearer place to prepare your progress", info: "Goal, training plan and race calendar are separated into tabs to keep the page focused.", goal: "GOAL", program: "PROGRAM", races: "RACES", goalHint: "Your main target", programHint: "Your week-by-week progression", racesHint: "Your upcoming events" };

  const startPlanSession = React.useCallback((plan: RunningPlanState, session: RunningPlanSession) => {
    go("games", {
      runningPresetId: session.customWorkout ? "custom" : session.presetId,
      runningTargetM: session.targetDistanceM || undefined,
      runningTargetDurationMs: session.targetDurationMs || undefined,
      runningPlanId: plan.id,
      runningPlanSessionId: session.id,
      runningPlanSessionTitle: session.title,
      runningCustomWorkout: session.customWorkout || undefined,
    });
  }, [go]);



  const pageTitle = tab === "goal" ? copy.goal : tab === "program" ? copy.program : tab === "races" ? copy.races : copy.title;
  const pageSubtitle = tab === "hub" ? `${outdoorSportLabel(activitySport, String(lang || "fr"))} · ${copy.sub}` : outdoorSportLabel(activitySport, String(lang || "fr"));

  return (
    <div className="container" style={{ maxWidth: 620, paddingBottom: 92 }}>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        left={<BackDot onClick={() => tab === "hub" ? go("home") : setTab("hub")} />}
        right={<InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.55 }}>{copy.info}</div>} />}
      />

      {tab === "hub" ? <>
        <OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={String(lang || "fr")} accent={accent} compact />
        {activitySport === "running" ? <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
          <RunningHubCard title={copy.goal} subtitle={copy.goalHint} icon={<RunningGlyph name="goal" size={20}/>} accent={accent} onClick={() => setTab("goal")}/>
          <RunningHubCard title={copy.program} subtitle={copy.programHint} icon={<RunningGlyph name="training" size={20}/>} accent={accent} onClick={() => setTab("program")}/>
          <RunningHubCard title={copy.races} subtitle={copy.racesHint} icon={<RunningGlyph name="history" size={20}/>} accent={accent} onClick={() => setTab("races")}/>
        </div> : <OutdoorActivityPlanPanel sport={activitySport} activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} onStart={(presetId) => go("games", { runningPresetId: presetId, runningActivitySport: activitySport })} />}
      </> : null}

      {activitySport === "running" && tab === "goal" ? (
        <RunningSurface accent={accent} active>
          <div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .7, marginBottom: 8 }}>{copy.goalHint}</div>
          <RunningGoalView stats={stats} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
        </RunningSurface>
      ) : null}

      {activitySport === "running" && tab === "program" ? (
        <RunningSurface accent={accent} active style={{ background: "linear-gradient(180deg,rgba(8,10,16,.985),rgba(4,6,11,.975))" }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .7, marginBottom: 8 }}>{copy.programHint}</div>
          <RunningPlanView
            activities={activities}
            lang={String(lang || "fr")}
            accent={accent}
            textSoft={textSoft}
            onStart={startPlanSession}
          />
        </RunningSurface>
      ) : null}

      {activitySport === "running" && tab === "races" ? (
        <RunningSurface accent={accent} active style={{ background: "linear-gradient(180deg,rgba(8,10,16,.985),rgba(4,6,11,.975))" }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .7, marginBottom: 8 }}>{copy.racesHint}</div>
          <RunningRaceCalendarView lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
        </RunningSurface>
      ) : null}

    </div>
  );
}
