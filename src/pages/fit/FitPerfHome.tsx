import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import ProfileAvatar from "../../components/ProfileAvatar";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import { InlineAdBanner } from "../../monetization/AdSlot";
import {
  buildFitProfileSummary,
  buildFitRecords,
  completedSets,
  exerciseById,
  fitSessionsForProfile,
  formatDuration,
  formatKg,
  formatVolume,
  loadFitSessions,
  sessionDurationMs,
  sessionVolume,
  sessionsSince,
  weekStart,
  type FitSession,
} from "../../fit/fitStore";
import { FitIcon, FitMiniBars, FitProgress, FitRing, fitUiCss, type FitIconName } from "./FitPerfUi";
import fitPerfLogo from "../../assets/games/logo-fit-performance.webp";

type Props = { store?: any; go: (route: any, params?: any) => void };
type HomeTab = "overview" | "today" | "progress" | "records" | "goals" | "profile";

function activeProfile(store: any) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = String(store?.activeProfileId || "");
  return profiles.find((item: any) => String(item?.id || "") === activeId) || profiles[0] || null;
}

function profileDisplayName(profile: any, fallback: string) {
  return String(
    profile?.privateInfo?.nickname ||
      profile?.name ||
      profile?.surname ||
      profile?.displayName ||
      fallback,
  ).trim() || fallback;
}

function weeklyVolumes(sessions: FitSession[]) {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const start = date.getTime();
    const end = start + 86400000;
    return sessions
      .filter((session) => {
        const ts = session.endedAt || session.startedAt;
        return ts >= start && ts < end;
      })
      .reduce((sum, session) => sum + sessionVolume(session), 0);
  });
}

function muscleSummary(sessions: FitSession[]) {
  const counts = new Map<string, number>();
  for (const session of sessions.slice(0, 20)) {
    for (const row of session.exercises) {
      counts.set(row.exerciseId, (counts.get(row.exerciseId) || 0) + row.sets.filter((set) => set.completed).length);
    }
  }

  const groups = [
    { label: "PUSH", ids: ["bench", "incline-db", "cable-fly", "ohp", "lateral-raise", "triceps-push"], accent: "#f6c256" },
    { label: "PULL", ids: ["pullup", "row", "lat-pulldown", "curl", "rdl"], accent: "#72def4" },
    { label: "LEGS", ids: ["squat", "leg-press", "rdl", "hip-thrust", "calf", "goblet"], accent: "#74ef9b" },
  ];
  const raw = groups.map((group) => ({ ...group, value: group.ids.reduce((sum, id) => sum + (counts.get(id) || 0), 0) }));
  const max = Math.max(1, ...raw.map((item) => item.value));
  return raw.map((item) => ({ ...item, pct: Math.round((item.value / max) * 100) }));
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="fit-home-kpi">
      <div className="fit-home-kpi-label">{label}</div>
      <div className="fit-home-kpi-line" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div className="fit-home-kpi-value" style={{ color: accent, textShadow: `0 0 12px ${accent}66` }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="fit-home-mini-stat">
      <span>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
  );
}

export default function FitPerfHome({ store, go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ea4af";
  const profile = activeProfile(store);
  const [sessions, setSessions] = React.useState<FitSession[]>(() => loadFitSessions());
  const [tab, setTab] = React.useState<HomeTab>("profile");
  const [tickerIndex, setTickerIndex] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => setSessions(loadFitSessions());
    window.addEventListener("focus", refresh);
    window.addEventListener("dc:fit-session-saved", refresh as EventListener);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("dc:fit-session-saved", refresh as EventListener);
    };
  }, []);

  const scoped = fitSessionsForProfile(sessions, profile?.id);
  const summary = buildFitProfileSummary(sessions, profile?.id);
  const week = sessionsSince(scoped, weekStart());
  const records = buildFitRecords(scoped);
  const recent = scoped[0];
  const bars = weeklyVolumes(scoped);
  const muscles = muscleSummary(scoped);
  const weeklyGoal = 3;
  const goalPct = Math.min(100, (summary.weekSessions / weeklyGoal) * 100);
  const weekSets = week.reduce((sum, session) => sum + completedSets(session), 0);
  const profileName = profileDisplayName(profile, t("Joueur", "Player", "Jugador"));

  const tickerItems = React.useMemo<ArcadeTickerItem[]>(() => {
    const lastSessionLabel = recent
      ? new Date(recent.endedAt || recent.startedAt).toLocaleDateString()
      : t("Aucune séance", "No workout", "Sin sesión");

    return [
      {
        id: "fit-score",
        title: "FIT SCORE",
        text: summary.sessions
          ? t(
              `Ton score de performance est de ${summary.score}/99.`,
              `Your performance score is ${summary.score}/99.`,
              `Tu puntuación de rendimiento es ${summary.score}/99.`,
            )
          : t(
              "Démarre ta première séance pour lancer ton FIT SCORE.",
              "Start your first workout to activate your FIT SCORE.",
              "Inicia tu primera sesión para activar tu FIT SCORE.",
            ),
        detail: t(
          `${summary.sessions} séances · ${summary.records} records · ${formatVolume(summary.volumeKg)}`,
          `${summary.sessions} workouts · ${summary.records} records · ${formatVolume(summary.volumeKg)}`,
          `${summary.sessions} sesiones · ${summary.records} récords · ${formatVolume(summary.volumeKg)}`,
        ),
        accentColor: accent,
      },
      {
        id: "fit-week",
        title: t("CETTE SEMAINE", "THIS WEEK", "ESTA SEMANA"),
        text: t(
          `${summary.weekSessions}/${weeklyGoal} séances réalisées · ${formatVolume(summary.weekVolumeKg)} de volume.`,
          `${summary.weekSessions}/${weeklyGoal} workouts completed · ${formatVolume(summary.weekVolumeKg)} volume.`,
          `${summary.weekSessions}/${weeklyGoal} sesiones completadas · ${formatVolume(summary.weekVolumeKg)} de volumen.`,
        ),
        detail: t(
          `${weekSets} séries terminées cette semaine.`,
          `${weekSets} completed sets this week.`,
          `${weekSets} series completadas esta semana.`,
        ),
        accentColor: "#72def4",
      },
      {
        id: "fit-records",
        title: t("RECORDS", "RECORDS", "RÉCORDS"),
        text: records.length
          ? t(
              `${records.length} records suivis automatiquement dans FIT PERF.`,
              `${records.length} records tracked automatically in FIT PERF.`,
              `${records.length} récords seguidos automáticamente en FIT PERF.`,
            )
          : t(
              "Tes premiers records apparaîtront ici dès tes prochaines séries.",
              "Your first records will appear here after your next sets.",
              "Tus primeros récords aparecerán aquí tras tus próximas series.",
            ),
        detail: t(
          `Meilleur 1RM estimé : ${formatKg(summary.bestOneRm)}`,
          `Best estimated 1RM: ${formatKg(summary.bestOneRm)}`,
          `Mejor 1RM estimado: ${formatKg(summary.bestOneRm)}`,
        ),
        accentColor: "#b59cff",
      },
      {
        id: "fit-activity",
        title: t("ACTIVITÉ", "ACTIVITY", "ACTIVIDAD"),
        text: t(
          `Dernière séance : ${lastSessionLabel}.`,
          `Last workout: ${lastSessionLabel}.`,
          `Última sesión: ${lastSessionLabel}.`,
        ),
        detail: t(
          `${summary.sets} séries · ${formatDuration(summary.totalDurationMs)} d'entraînement cumulé`,
          `${summary.sets} sets · ${formatDuration(summary.totalDurationMs)} total training`,
          `${summary.sets} series · ${formatDuration(summary.totalDurationMs)} de entrenamiento total`,
        ),
        accentColor: "#74ef9b",
      },
      {
        id: "fit-goal",
        title: t("OBJECTIF HEBDO", "WEEKLY GOAL", "OBJETIVO SEMANAL"),
        text: goalPct >= 100
          ? t(
              "Objectif hebdomadaire atteint. Maintiens le rythme.",
              "Weekly goal completed. Keep the rhythm.",
              "Objetivo semanal completado. Mantén el ritmo.",
            )
          : t(
              `Encore ${Math.max(0, weeklyGoal - summary.weekSessions)} séance(s) pour atteindre l'objectif.`,
              `${Math.max(0, weeklyGoal - summary.weekSessions)} workout(s) left to reach the goal.`,
              `Faltan ${Math.max(0, weeklyGoal - summary.weekSessions)} sesión(es) para alcanzar el objetivo.`,
            ),
        detail: `${Math.round(goalPct)}%`,
        accentColor: "#f6c256",
      },
    ];
  }, [
    accent,
    goalPct,
    recent,
    records.length,
    summary.bestOneRm,
    summary.records,
    summary.score,
    summary.sessions,
    summary.sets,
    summary.totalDurationMs,
    summary.volumeKg,
    summary.weekSessions,
    summary.weekVolumeKg,
    t,
    weekSets,
  ]);

  React.useEffect(() => {
    if (!tickerItems.length) {
      setTickerIndex(0);
      return;
    }
    setTickerIndex((current) => Math.min(current, tickerItems.length - 1));
  }, [tickerItems.length]);

  const currentTicker = tickerItems[Math.min(tickerIndex, Math.max(0, tickerItems.length - 1))] || null;

  const tickerDetail = React.useMemo(() => {
    switch (currentTicker?.id) {
      case "fit-week":
        return {
          leftLabel: t("VOLUME SEMAINE", "WEEK VOLUME", "VOLUMEN SEMANAL"),
          leftValue: formatVolume(summary.weekVolumeKg),
          rightLabel: t("SÉRIES", "SETS", "SERIES"),
          rightValue: String(weekSets),
          note: goalPct >= 100
            ? t("Objectif atteint : garde cette régularité.", "Goal reached: keep this consistency.", "Objetivo alcanzado: mantén esta constancia.")
            : t("La régularité fait progresser le FIT SCORE.", "Consistency improves your FIT SCORE.", "La constancia mejora tu FIT SCORE."),
        };
      case "fit-records":
        return {
          leftLabel: "1RM",
          leftValue: formatKg(summary.bestOneRm),
          rightLabel: t("RECORDS", "RECORDS", "RÉCORDS"),
          rightValue: String(summary.records),
          note: t("Chaque série validée peut mettre à jour automatiquement un PR.", "Every completed set can automatically update a PR.", "Cada serie completada puede actualizar automáticamente un récord."),
        };
      case "fit-activity":
        return {
          leftLabel: t("SÉANCES", "WORKOUTS", "SESIONES"),
          leftValue: String(summary.sessions),
          rightLabel: t("SÉRIES", "SETS", "SERIES"),
          rightValue: String(summary.sets),
          note: t("Volume, durée et fréquence alimentent ton historique FIT PERF.", "Volume, duration and frequency feed your FIT PERF history.", "Volumen, duración y frecuencia alimentan tu historial FIT PERF."),
        };
      case "fit-goal":
        return {
          leftLabel: t("OBJECTIF", "GOAL", "OBJETIVO"),
          leftValue: `${Math.round(goalPct)}%`,
          rightLabel: t("RESTANT", "LEFT", "RESTANTE"),
          rightValue: String(Math.max(0, weeklyGoal - summary.weekSessions)),
          note: t("Objectif actuel : 3 séances par semaine.", "Current goal: 3 workouts per week.", "Objetivo actual: 3 sesiones por semana."),
        };
      default:
        return {
          leftLabel: "FIT SCORE",
          leftValue: `${summary.score}/99`,
          rightLabel: t("VOLUME", "VOLUME", "VOLUMEN"),
          rightValue: formatVolume(summary.volumeKg),
          note: t("Fréquence, records et activité récente composent ton score.", "Frequency, records and recent activity build your score.", "Frecuencia, récords y actividad reciente forman tu puntuación."),
        };
    }
  }, [
    currentTicker?.id,
    goalPct,
    summary.bestOneRm,
    summary.records,
    summary.score,
    summary.sessions,
    summary.sets,
    summary.volumeKg,
    summary.weekSessions,
    summary.weekVolumeKg,
    t,
    weekSets,
  ]);

  const tabs: Array<{ id: HomeTab; label: string; icon: FitIconName }> = [
    { id: "profile", label: t("PROFIL", "PROFILE", "PERFIL"), icon: "profile" },
    { id: "overview", label: t("VUE", "VIEW", "VISTA"), icon: "home" },
    { id: "today", label: t("AUJOURD'HUI", "TODAY", "HOY"), icon: "today" },
    { id: "progress", label: t("PROGRESSION", "PROGRESS", "PROGRESO"), icon: "progress" },
    { id: "records", label: t("RECORDS", "RECORDS", "RÉCORDS"), icon: "records" },
    { id: "goals", label: t("OBJECTIFS", "GOALS", "OBJETIVOS"), icon: "goals" },
  ];

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setTab((current) => {
        const index = tabs.findIndex((item) => item.id === current);
        return tabs[(index + 1 + tabs.length) % tabs.length]?.id || "profile";
      });
    }, 3800);
    return () => window.clearInterval(timer);
  }, [lang]);

  const panelTitle =
    tab === "overview" ? t("VUE GLOBALE", "OVERVIEW", "VISTA GLOBAL") :
    tab === "today" ? t("AUJOURD'HUI", "TODAY", "HOY") :
    tab === "progress" ? t("PROGRESSION", "PROGRESS", "PROGRESO") :
    tab === "records" ? t("RECORDS", "RECORDS", "RÉCORDS") :
    tab === "goals" ? t("OBJECTIFS", "GOALS", "OBJETIVOS") :
    t("PROFIL JOUEUR", "PLAYER PROFILE", "PERFIL DEL JUGADOR");

  return (
    <div
      style={{
        height: "calc(100dvh - 88px)",
        minHeight: 0,
        overflow: "hidden",
        background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060c",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <style>{fitUiCss}</style>
      <style>{`
        .fit-home-shell{height:100%;width:100%;max-width:520px;margin:0 auto;padding:12px 12px 8px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;overflow:hidden}
        .fit-home-header{position:relative;overflow:hidden;isolation:isolate;flex:0 0 auto;border-radius:25px;padding:12px 16px;background:linear-gradient(135deg,rgba(8,10,20,.99),rgba(14,18,34,.985));border:1px solid rgba(255,255,255,.10);box-shadow:0 20px 40px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center}.fit-home-header>*:not(.fit-home-logo-watermark){position:relative;z-index:2}.fit-home-logo-watermark{position:absolute;z-index:0;left:-52px;top:50%;width:190px;height:190px;transform:translateY(-50%) scale(1.25);object-fit:contain;opacity:.14;filter:grayscale(1) saturate(0) brightness(.78) contrast(1.18);pointer-events:none}
        .fit-home-panel{flex:0 0 clamp(205px,28vh,260px);min-height:0;border-radius:22px;padding:11px 12px;background:radial-gradient(circle at top,rgba(255,255,255,.045),rgba(0,0,0,.95));border:1px solid rgba(255,255,255,.10);box-shadow:0 0 24px rgba(0,0,0,.8),0 0 30px ${accent}26;display:flex;flex-direction:column;overflow:hidden}
        .fit-home-panel-title{font-size:13px;font-weight:950;letter-spacing:1.15px;text-transform:uppercase;text-align:center;color:${accent};text-shadow:0 0 12px ${accent}55;flex:0 0 auto}
        .fit-home-panel-body{flex:1 1 auto;min-height:0;margin-top:7px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
        .fit-home-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .fit-home-kpi{border-radius:14px;padding:7px 8px 9px;background:radial-gradient(circle at 0 0,rgba(255,255,255,.06),rgba(5,7,16,.96));border:1px solid rgba(255,255,255,.13);box-shadow:0 10px 22px rgba(0,0,0,.55);text-align:center;min-width:0}
        .fit-home-kpi-label{font-size:9px;letter-spacing:.45px;opacity:.76;text-transform:lowercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-kpi-line{height:2px;width:32px;border-radius:999;margin:4px auto}
        .fit-home-kpi-value{font-size:19px;font-weight:1000;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-mini-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
        .fit-home-mini-stat{min-width:0;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);padding:8px;text-align:center;display:flex;flex-direction:column;gap:3px}
        .fit-home-mini-stat span{font-size:7.5px;font-weight:900;letter-spacing:.55px;text-transform:uppercase;opacity:.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-mini-stat strong{font-size:13px;line-height:1;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-cta{margin-top:9px;min-height:38px;border-radius:12px;border:1px solid ${accent}66;background:linear-gradient(135deg,${accent}1e,rgba(255,255,255,.055));color:${accent};font-weight:1000;letter-spacing:.65px;text-transform:uppercase;cursor:pointer;box-shadow:0 0 18px ${accent}12}
        .fit-home-tabs{flex:0 0 auto;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:5px;border-radius:18px;border:1px solid rgba(255,255,255,.07);background:rgba(3,5,10,.76);box-shadow:0 12px 30px rgba(0,0,0,.42)}
        .fit-home-tab{min-width:0;height:45px;border-radius:13px;border:1px solid transparent;background:transparent;color:rgba(255,255,255,.58);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0 2px;cursor:pointer}
        .fit-home-tab span{display:block;width:100%;font-size:6.7px;font-weight:1000;letter-spacing:.35px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
        .fit-home-tab.is-active{border-color:${accent}68;background:linear-gradient(135deg,${accent}1c,rgba(255,255,255,.055));color:${accent};box-shadow:0 0 16px ${accent}16,inset 0 0 0 1px ${accent}0d}
        .fit-home-profile-grid{display:grid;grid-template-columns:112px minmax(0,1fr);gap:10px;height:100%;min-height:0}
        .fit-home-profile-card{border-radius:20px;padding:10px;background:radial-gradient(circle at 0 0,${accent}22,rgba(5,7,16,.96));border:1px solid ${accent}77;box-shadow:0 0 26px ${accent}38;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0}
        .fit-home-profile-name{margin-top:7px;max-width:100%;font-size:19px;font-weight:1000;color:${accent};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 12px ${accent}66}
        .fit-home-record-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;align-items:center;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);padding:8px 9px;margin-top:6px;min-width:0}
        .fit-home-record-rank{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:${accent}14;border:1px solid ${accent}34;color:${accent};font-size:10px;font-weight:1000}
        .fit-home-record-name{min-width:0;font-size:10.5px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-record-value{font-size:10px;font-weight:1000;color:${accent};white-space:nowrap}
        .fit-home-ticker-wrap{flex:0 0 auto;min-height:0}
        .fit-home-ticker-wrap>div:first-child{margin-top:0!important}
        .fit-home-ticker-details{margin-top:6px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:6px}
        .fit-home-ticker-card{min-width:0;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at top,rgba(255,255,255,.05),rgba(4,6,12,.96));padding:7px 8px;box-shadow:0 10px 20px rgba(0,0,0,.35);overflow:hidden}
        .fit-home-ticker-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
        .fit-home-ticker-kpi{min-width:0;text-align:center;border-radius:10px;border:1px solid ${accent}22;background:${accent}0a;padding:5px}
        .fit-home-ticker-kpi span{display:block;font-size:6.5px;font-weight:950;letter-spacing:.5px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-ticker-kpi strong{display:block;margin-top:2px;color:${accent};font-size:11px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fit-home-ticker-note{font-size:8.5px;line-height:1.35;color:${textSoft}}
        .fit-home-ticker-in{animation:fitHomeTickerIn .34s ease both}
        @keyframes fitHomeTickerIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @media(max-height:720px){
          .fit-home-shell{padding-top:7px;gap:5px}.fit-home-header{padding:8px 12px;border-radius:21px}.fit-home-panel{flex-basis:185px;padding:8px 9px}.fit-home-panel-body{margin-top:5px}.fit-home-tabs{gap:3px;padding:3px}.fit-home-tab{height:39px}.fit-home-tab span{font-size:6px}.fit-home-kpi{padding:4px 5px 6px}.fit-home-kpi-value{font-size:15px}.fit-home-mini-row{margin-top:5px}.fit-home-mini-stat{padding:5px}.fit-home-cta{margin-top:5px;min-height:30px}.fit-home-ticker-details{margin-top:4px}.fit-home-ticker-card{padding:5px 6px}.fit-home-ticker-note{font-size:7.8px}
        }
      `}</style>

      <div className="fit-home-shell">
        {/* Même en-tête que la HOME DARTS SCORING : BIENVENUE + titre, sans logo. */}
        <div className="fit-home-header">
          <img className="fit-home-logo-watermark" src={fitPerfLogo} alt="" aria-hidden="true" />
          <div
            style={{
              display: "inline-flex",
              padding: "5px 18px",
              borderRadius: 999,
              border: `1px solid ${accent}`,
              background: "linear-gradient(135deg,rgba(0,0,0,.9),rgba(255,255,255,.06))",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: accent }}>
              {t("Bienvenue", "Welcome", "Bienvenido")}
            </span>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 3,
              textAlign: "center",
              textTransform: "uppercase",
              backgroundImage: `linear-gradient(120deg,${accent},#fff,${accent})`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              color: "transparent",
              animation: "fitTitlePulse 3.6s ease-in-out infinite,fitTitleShimmer 7s linear infinite",
            }}
          >
            FIT PERF
          </div>
        </div>

        {/* PUB 1 — même placement que la HOME DARTS SCORING. */}
        <InlineAdBanner
          placement="home"
          slotKey="fit-home-top"
          offset={0}
          compact
          style={{ margin: 0 }}
        />

        {/* Bloc central volontairement plus bas : le contenu change avec l'onglet. */}
        <section className="fit-home-panel" aria-live="polite">
          <div className="fit-home-panel-title">FIT PERF · {panelTitle}</div>
          <div className="fit-home-panel-body">
            {tab === "overview" && (
              <>
                <div className="fit-home-kpi-grid">
                  <Kpi label={t("score", "score", "puntuación")} value={summary.score} accent={accent} />
                  <Kpi label={t("séances", "sessions", "sesiones")} value={summary.sessions} accent="#72def4" />
                  <Kpi label={t("volume", "volume", "volumen")} value={formatVolume(summary.volumeKg)} accent="#74ef9b" />
                  <Kpi label={t("records", "records", "récords")} value={summary.records} accent="#b59cff" />
                </div>
                <div className="fit-home-mini-row">
                  <MiniStat label={t("cette semaine", "this week", "esta semana")} value={`${summary.weekSessions}/${weeklyGoal}`} accent={accent} />
                  <MiniStat label={t("séries", "sets", "series")} value={weekSets} accent="#72def4" />
                  <MiniStat label="1RM" value={formatKg(summary.bestOneRm)} accent="#b59cff" />
                </div>
              </>
            )}

            {tab === "today" && (
              recent ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: accent, fontSize: 16, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{recent.title}</div>
                      <div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{new Date(recent.endedAt || recent.startedAt).toLocaleDateString()} · {formatDuration(sessionDurationMs(recent, recent.endedAt || recent.startedAt))}</div>
                    </div>
                    <FitRing value={Math.min(100, completedSets(recent) * 10)} label={t("SÉRIES", "SETS", "SERIES")} accent={accent} size={72} />
                  </div>
                  <div className="fit-home-mini-row">
                    <MiniStat label={t("volume", "volume", "volumen")} value={formatVolume(sessionVolume(recent))} accent="#74ef9b" />
                    <MiniStat label={t("séries", "sets", "series")} value={completedSets(recent)} accent={accent} />
                    <MiniStat label={t("exercices", "exercises", "ejercicios")} value={recent.exercises.length} accent="#72def4" />
                  </div>
                  <div style={{ marginTop: 9, display: "grid", gap: 6 }}>
                    {recent.exercises.slice(0, 3).map((row) => {
                      const ex = exerciseById(row.exerciseId);
                      return (
                        <div key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 9px", borderRadius: 11, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)", fontSize: 9.5 }}>
                          <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex?.name || t("Exercice", "Exercise", "Ejercicio")}</strong>
                          <span style={{ color: textSoft, whiteSpace: "nowrap" }}>{row.sets.filter((set) => set.completed).length} {t("séries", "sets", "series")}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <FitIcon name="today" size={42} />
                  <div style={{ marginTop: 9, fontSize: 18, fontWeight: 1000 }}>{t("Aucune séance aujourd'hui", "No workout today", "Sin sesión hoy")}</div>
                  <div style={{ marginTop: 5, color: textSoft, fontSize: 10 }}>{t("Lance une séance pour alimenter ce tableau.", "Start a workout to fill this dashboard.", "Inicia una sesión para completar este panel.")}</div>
                  <button className="fit-home-cta" type="button" onClick={() => go("games", { fitTemplateId: "free" })}>{t("Démarrer maintenant", "Start now", "Empezar ahora")}</button>
                </div>
              )
            )}

            {tab === "progress" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,.7fr)", gap: 10, alignItems: "stretch" }}>
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 11 }}>
                    <div style={{ fontSize: 8.5, color: textSoft, fontWeight: 900, letterSpacing: .7 }}>{t("VOLUME · 7 JOURS", "VOLUME · 7 DAYS", "VOLUMEN · 7 DÍAS")}</div>
                    <div style={{ marginTop: 7 }}><FitMiniBars values={bars} accent="#72def4" height={86} /></div>
                  </div>
                  <div style={{ display: "grid", gap: 7 }}>
                    <MiniStat label={t("semaine", "week", "semana")} value={formatVolume(summary.weekVolumeKg)} accent="#72def4" />
                    <MiniStat label={t("séances", "sessions", "sesiones")} value={summary.weekSessions} accent={accent} />
                    <MiniStat label={t("séries", "sets", "series")} value={weekSets} accent="#74ef9b" />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {muscles.map((item) => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 950 }}><span style={{ color: item.accent }}>{item.label}</span><span>{item.value}</span></div>
                      <div style={{ marginTop: 4 }}><FitProgress value={item.pct} accent={item.accent} height={6} /></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "records" && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
                {records.length ? records.slice(0, 4).map((record, index) => (
                  <div key={record.exerciseId} className="fit-home-record-row">
                    <div className="fit-home-record-rank">#{index + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="fit-home-record-name">{record.exerciseName}</div>
                      <div style={{ marginTop: 2, color: textSoft, fontSize: 8.3 }}>{formatKg(record.weightKg)} × {record.reps}</div>
                    </div>
                    <div className="fit-home-record-value">1RM {formatKg(record.oneRm)}</div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: textSoft }}>
                    <FitIcon name="records" size={42} />
                    <div style={{ marginTop: 9, color: "#fff", fontSize: 17, fontWeight: 1000 }}>{t("Aucun record", "No records yet", "Sin récords")}</div>
                    <div style={{ marginTop: 5, fontSize: 10 }}>{t("Tes PR apparaîtront ici automatiquement.", "Your PRs will appear here automatically.", "Tus récords aparecerán aquí automáticamente.")}</div>
                  </div>
                )}
              </div>
            )}

            {tab === "goals" && (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 108px", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 1000 }}>{summary.weekSessions}/{weeklyGoal} {t("séances", "sessions", "sesiones")}</div>
                  <div style={{ marginTop: 5, color: textSoft, fontSize: 10 }}>{goalPct >= 100 ? t("Objectif hebdomadaire atteint 🔥", "Weekly goal completed 🔥", "Objetivo semanal cumplido 🔥") : t("Objectif principal : régularité.", "Main goal: consistency.", "Objetivo principal: constancia.")}</div>
                  <div style={{ marginTop: 12 }}><FitProgress value={goalPct} accent={accent} height={8} /></div>
                  <div className="fit-home-mini-row">
                    <MiniStat label={t("reste", "remaining", "restan")} value={Math.max(0, weeklyGoal - summary.weekSessions)} accent={accent} />
                    <MiniStat label={t("volume semaine", "week volume", "vol. semana")} value={formatVolume(summary.weekVolumeKg)} accent="#72def4" />
                    <MiniStat label={t("score", "score", "puntuación")} value={summary.score} accent="#b59cff" />
                  </div>
                </div>
                <FitRing value={goalPct} label={t("OBJECTIF", "GOAL", "OBJETIVO")} accent={accent} size={100} />
              </div>
            )}

            {tab === "profile" && (
              profile ? (
                <div className="fit-home-profile-grid">
                  <div className="fit-home-profile-card">
                    <ProfileAvatar size={86} profile={profile as any} ringColor={accent} showStars={false} />
                    <div className="fit-home-profile-name">{profileName}</div>
                    <div style={{ marginTop: 4, color: textSoft, fontSize: 8.5, fontWeight: 800 }}>{t("PROFIL FIT PERF", "FIT PERF PROFILE", "PERFIL FIT PERF")}</div>
                  </div>
                  <div style={{ borderRadius: 18, padding: 11, background: `linear-gradient(135deg,${accent}18,rgba(0,0,0,.98))`, border: `1px solid ${accent}88`, boxShadow: `0 0 24px ${accent}30`, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                    <div className="fit-home-kpi-grid">
                      <Kpi label={t("score", "score", "puntuación")} value={summary.score} accent={accent} />
                      <Kpi label={t("séances", "sessions", "sesiones")} value={summary.sessions} accent="#72def4" />
                      <Kpi label={t("volume", "volume", "volumen")} value={formatVolume(summary.volumeKg)} accent="#74ef9b" />
                      <Kpi label={t("records", "records", "récords")} value={summary.records} accent="#b59cff" />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: textSoft }}>
                  <FitIcon name="profile" size={42} />
                  <div style={{ marginTop: 8, color: "#fff", fontWeight: 1000 }}>{t("Aucun profil actif", "No active profile", "Sin perfil activo")}</div>
                </div>
              )
            )}
          </div>
        </section>

        <nav className="fit-home-tabs" aria-label={t("Navigation accueil FIT PERF", "FIT PERF home navigation", "Navegación de inicio FIT PERF")}>
          {tabs.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                className={`fit-home-tab${selected ? " is-active" : ""}`}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                <FitIcon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* PUB 2 — sous les onglets, comme le second bandeau de DARTS SCORING. */}
        <InlineAdBanner
          placement="home_secondary"
          slotKey="fit-home-player"
          offset={2}
          compact
          style={{ margin: 0 }}
        />

        {/* Ticker FIT PERF : rotation automatique + swipe, même mécanique que HOME DARTS SCORING. */}
        <div className="fit-home-ticker-wrap">
          <ArcadeTicker
            items={tickerItems}
            activeIndex={tickerIndex}
            intervalMs={7000}
            onIndexChange={(index) => setTickerIndex(index)}
            onActiveIndexChange={(index) => setTickerIndex(index)}
          />

          {currentTicker && (
            <div key={currentTicker.id} className="fit-home-ticker-details fit-home-ticker-in">
              <div className="fit-home-ticker-card">
                <div className="fit-home-ticker-kpis">
                  <div className="fit-home-ticker-kpi">
                    <span>{tickerDetail.leftLabel}</span>
                    <strong>{tickerDetail.leftValue}</strong>
                  </div>
                  <div className="fit-home-ticker-kpi">
                    <span>{tickerDetail.rightLabel}</span>
                    <strong>{tickerDetail.rightValue}</strong>
                  </div>
                </div>
              </div>
              <div className="fit-home-ticker-card" style={{ borderColor: `${currentTicker.accentColor || accent}44` }}>
                <div style={{ fontSize: 7, fontWeight: 1000, letterSpacing: .7, color: currentTicker.accentColor || accent, textTransform: "uppercase", marginBottom: 3 }}>
                  {t("INFO FIT PERF", "FIT PERF INFO", "INFO FIT PERF")}
                </div>
                <div className="fit-home-ticker-note">{tickerDetail.note}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
