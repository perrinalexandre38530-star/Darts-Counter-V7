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

type Props = { go: (route: any, params?: any) => void };

export default function RunningPlanCenter({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const locale = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);

  React.useEffect(() => {
    void listActivities("running").then(setActivities);
  }, []);

  const stats = React.useMemo(() => buildRunningStats(activities, Date.now(), locale), [activities, locale]);
  const copy = lang === "fr"
    ? { title: "PLAN & OBJECTIFS", sub: "Programme d’entraînement · objectif de course", info: "Centralise ici ton objectif chronométrique et ton programme de progression. Les séances lancées depuis le plan sont enregistrées comme des sorties Running Performance." }
    : lang === "es"
      ? { title: "PLAN Y OBJETIVOS", sub: "Plan de entrenamiento · objetivo de carrera", info: "Centraliza aquí tu objetivo de tiempo y tu plan de progresión. Las sesiones iniciadas desde el plan se guardan como actividades de Running Performance." }
      : { title: "PLAN & GOALS", sub: "Training plan · race goal", info: "Keep your target race and training progression in one place. Workouts launched from the plan are saved as Running Performance activities." };

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

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <PageHeader
        title={copy.title}
        subtitle={copy.sub}
        left={<BackDot onClick={() => go("home")} />}
        right={<InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.55 }}>{copy.info}</div>} />}
      />

      <RunningGoalView stats={stats} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />

      <div style={{ marginTop: 14 }}>
        <RunningPlanView
          activities={activities}
          lang={String(lang || "fr")}
          accent={accent}
          textSoft={textSoft}
          onStart={startPlanSession}
        />
      </div>
    </div>
  );
}
