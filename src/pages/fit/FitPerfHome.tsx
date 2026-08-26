import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import ActiveProfileCard, { type SlideDef } from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import { InlineAdBanner } from "../../monetization/AdSlot";
import logoFitPerf from "../../assets/games/logo-fit-performance.webp";
import {
  buildFitProfileSummary,
  buildFitRecords,
  completedSets,
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
import {
  FitGlassCard,
  FitIcon,
  FitIconTabs,
  FitMetric,
  FitMiniBars,
  FitPill,
  FitPrimaryButton,
  FitProgress,
  FitRing,
  FitSectionTitle,
  FitShell,
  fitUiCss,
} from "./FitPerfUi";

type Props = { store?: any; go: (route: any, params?: any) => void };
type HomeTab = "overview" | "today" | "progress" | "records" | "goals";

function activeProfile(store: any) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = String(store?.activeProfileId || "");
  return profiles.find((item: any) => String(item?.id || "") === activeId) || profiles[0] || null;
}

function weeklyVolumes(sessions: FitSession[]) {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const start = date.getTime();
    const end = start + 86400000;
    return sessions.filter((session) => {
      const ts = session.endedAt || session.startedAt;
      return ts >= start && ts < end;
    }).reduce((sum, session) => sum + sessionVolume(session), 0);
  });
}

function muscleSummary(sessions: FitSession[]) {
  const counts = new Map<string, number>();
  for (const session of sessions.slice(0, 20)) {
    for (const row of session.exercises) counts.set(row.exerciseId, (counts.get(row.exerciseId) || 0) + row.sets.filter((set) => set.completed).length);
  }
  const groups = [
    { label: "PUSH", ids: ["bench", "incline-db", "cable-fly", "ohp", "lateral-raise", "triceps-push"], accent: "#f6c256" },
    { label: "PULL", ids: ["pullup", "row", "lat-pulldown", "curl", "rdl"], accent: "#72def4" },
    { label: "LEGS", ids: ["squat", "leg-press", "rdl", "hip-thrust", "calf", "goblet"], accent: "#74ef9b" },
  ];
  const raw = groups.map((group) => ({ ...group, value: group.ids.reduce((sum, id) => sum + (counts.get(id) || 0), 0) }));
  const max = Math.max(1, ...raw.map((item) => item.value));
  return raw.map((item) => ({ ...item, pct: Math.round(item.value / max * 100) }));
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
  const [tab, setTab] = React.useState<HomeTab>("overview");
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
  const goalPct = Math.min(100, summary.weekSessions / weeklyGoal * 100);

  const profileSlides: SlideDef[] = [
    { id: "fit-week", title: t("FIT PERF · SEMAINE", "FIT PERF · WEEK", "FIT PERF · SEMANA"), rows: [
      { label: t("Séances", "Sessions", "Sesiones"), value: `${summary.weekSessions}/${weeklyGoal}` },
      { label: t("Volume", "Volume", "Volumen"), value: formatVolume(summary.weekVolumeKg) },
      { label: t("Séries", "Sets", "Series"), value: String(week.reduce((sum, s) => sum + completedSets(s), 0)) },
    ] },
    { id: "fit-records", title: t("FIT PERF · RECORDS", "FIT PERF · RECORDS", "FIT PERF · RÉCORDS"), rows: records.slice(0, 3).map((r) => ({ label: r.exerciseName, value: `${formatKg(r.weightKg)} × ${r.reps}` })) },
  ].filter((slide) => slide.rows.length > 0);

  const tickerItems: ArcadeTickerItem[] = [
    { id: "fit-score", title: "FIT SCORE", text: summary.score ? `${summary.score}/100 · ${t("Régularité et progression", "Consistency and progress", "Regularidad y progreso")}` : t("Démarre ta première séance pour lancer ton score.", "Start your first workout to launch your score.", "Empieza tu primera sesión para activar tu puntuación."), detail: t("Basé sur la fréquence, les records et l’activité récente.", "Based on frequency, records and recent activity.", "Basado en frecuencia, récords y actividad reciente."), backgroundImage: logoFitPerf, accentColor: accent },
    { id: "week-volume", title: t("VOLUME SEMAINE", "WEEKLY VOLUME", "VOLUMEN SEMANAL"), text: formatVolume(summary.weekVolumeKg), detail: `${summary.weekSessions} ${t("séance(s)", "session(s)", "sesión(es)")} · ${week.reduce((sum, s) => sum + completedSets(s), 0)} ${t("séries", "sets", "series")}`, backgroundImage: logoFitPerf, accentColor: "#72def4" },
    { id: "best-pr", title: t("MEILLEUR RECORD", "TOP RECORD", "MEJOR RÉCORD"), text: records[0] ? records[0].exerciseName : t("Aucun record", "No record yet", "Sin récord"), detail: records[0] ? `${formatKg(records[0].weightKg)} × ${records[0].reps} · 1RM ≈ ${formatKg(records[0].oneRm)}` : t("Les PR apparaîtront ici automatiquement.", "PRs will appear here automatically.", "Los PR aparecerán aquí automáticamente."), backgroundImage: logoFitPerf, accentColor: "#b59cff" },
  ];

  return (
    <div style={{ minHeight: "100%", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060c", color: "#fff" }}>
      <FitShell>
        <style>{fitUiCss}</style>

        {/* Même langage visuel que la HOME DARTS COUNTER */}
        <div style={{ borderRadius: 28, padding: 18, marginBottom: 16, background: "linear-gradient(135deg,rgba(8,10,20,.98),rgba(14,18,34,.98))", border: `1px solid ${(theme as any)?.borderSoft || "rgba(255,255,255,.10)"}`, boxShadow: "0 20px 40px rgba(0,0,0,.7)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "inline-flex", padding: "5px 18px", borderRadius: 999, border: `1px solid ${accent}`, background: "linear-gradient(135deg,rgba(0,0,0,.9),rgba(255,255,255,.06))", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: accent }}>{t("Bienvenue", "Welcome", "Bienvenido")}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3, textAlign: "center", textTransform: "uppercase", backgroundImage: `linear-gradient(120deg,${accent},#fff,${accent})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", color: "transparent", animation: "fitTitlePulse 3.6s ease-in-out infinite,fitTitleShimmer 7s linear infinite" }}>FIT PERF</div>
        </div>

        <InlineAdBanner placement="home" slotKey="fit-home-top" offset={0} compact style={{ marginBottom: 16 }}/>

        {profile ? <ActiveProfileCard
          profile={profile}
          stats={{} as any}
          hideStatus
          starAvg3D={summary.score}
          suppressDefaultStatsSlides
          customSlides={profileSlides}
          globalTitle={t("VUE GLOBALE FIT PERF", "FIT PERF OVERVIEW", "VISTA GLOBAL FIT PERF")}
          globalKpis={[
            { label: t("Score", "Score", "Puntuación"), value: summary.score },
            { label: t("Séances", "Sessions", "Sesiones"), value: summary.sessions },
            { label: t("Volume", "Volume", "Volumen"), value: formatVolume(summary.volumeKg) },
            { label: t("Records", "Records", "Récords"), value: summary.records },
          ]}
        /> : null}

        {profile ? <InlineAdBanner placement="home_secondary" slotKey="fit-home-player" offset={2} compact style={{ marginTop: 12, marginBottom: 14 }}/> : null}

        <ArcadeTicker items={tickerItems} activeIndex={tickerIndex} intervalMs={6500} onIndexChange={setTickerIndex} onActiveIndexChange={setTickerIndex}/>

        <div style={{ marginTop: 12 }}>
          <FitIconTabs<HomeTab> accent={accent} value={tab} onChange={setTab} items={[
            { id: "overview", label: t("Vue", "Overview", "Vista"), icon: "home" },
            { id: "today", label: t("Aujourd'hui", "Today", "Hoy"), icon: "today" },
            { id: "progress", label: t("Progression", "Progress", "Progreso"), icon: "progress" },
            { id: "records", label: t("Records", "Records", "Récords"), icon: "records", badge: records.length || undefined },
            { id: "goals", label: t("Objectifs", "Goals", "Objetivos"), icon: "goals" },
          ]}/>
        </div>

        {tab === "overview" ? <>
          <FitSectionTitle eyebrow={t("ACTION RAPIDE", "QUICK ACTION", "ACCIÓN RÁPIDA")} title={t("Ta prochaine séance", "Your next workout", "Tu próxima sesión")}/>
          <div style={{ display: "grid", gridTemplateColumns: "1.35fr .9fr", gap: 9 }}>
            <FitGlassCard accent={accent} style={{ padding: 14, minHeight: 154, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div><FitPill accent={accent}><FitIcon name="workout" size={14}/> {t("SÉANCE", "WORKOUT", "SESIÓN")}</FitPill><div style={{ marginTop: 10, fontSize: 18, fontWeight: 1000 }}>{t("Prêt à t'entraîner ?", "Ready to train?", "¿Listo para entrenar?")}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{t("Lance une séance libre ou choisis un programme.", "Start a free workout or choose a program.", "Inicia una sesión libre o elige un programa.")}</div></div>
              <FitPrimaryButton accent={accent} onClick={() => go("games", { fitTemplateId: "free" })} style={{ width: "100%", minHeight: 43 }}><FitIcon name="plus" size={16}/> {t("DÉMARRER", "START", "EMPEZAR")}</FitPrimaryButton>
            </FitGlassCard>
            <FitGlassCard accent="#75ed9a" style={{ padding: 13, display: "grid", placeItems: "center", textAlign: "center" }}><FitRing value={summary.score} label="FIT SCORE" accent="#75ed9a" size={88}/><div style={{ marginTop: 8, color: textSoft, fontSize: 8.5 }}>{t("Indice personnel", "Personal index", "Índice personal")}</div></FitGlassCard>
          </div>
          <FitSectionTitle eyebrow={t("CETTE SEMAINE", "THIS WEEK", "ESTA SEMANA")} title={t("Performance en un coup d'œil", "Performance at a glance", "Rendimiento de un vistazo")}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            <FitMetric label={t("Séances", "Sessions", "Sesiones")} value={`${summary.weekSessions}/${weeklyGoal}`} sub={t("objectif hebdo", "weekly goal", "objetivo semanal")} accent={accent}/>
            <FitMetric label={t("Volume", "Volume", "Volumen")} value={formatVolume(summary.weekVolumeKg)} sub={t("charge cumulée", "total load", "carga acumulada")} accent="#72def4"/>
            <FitMetric label={t("Records", "Records", "Récords")} value={summary.records} sub={t("exercices suivis", "tracked exercises", "ejercicios seguidos")} accent="#b59cff"/>
            <FitMetric label={t("Temps", "Time", "Tiempo")} value={formatDuration(summary.totalDurationMs)} sub={t("entraînement cumulé", "training total", "entrenamiento total")} accent="#75ed9a"/>
          </div>
        </> : null}

        {tab === "today" ? <>
          <FitSectionTitle eyebrow={t("AUJOURD'HUI", "TODAY", "HOY")} title={recent ? t("Dernière séance", "Latest workout", "Última sesión") : t("Aucune séance récente", "No recent workout", "Sin sesión reciente")}/>
          {recent ? <FitGlassCard accent={accent} style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><FitPill accent={accent}>{recent.title}</FitPill><div style={{ marginTop: 9, fontSize: 16, fontWeight: 1000 }}>{new Date(recent.endedAt || recent.startedAt).toLocaleDateString()}</div></div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 18, fontWeight: 1000 }}>{formatVolume(sessionVolume(recent))}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{completedSets(recent)} {t("séries", "sets", "series")}</div></div></div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>{recent.exercises.slice(0,4).map((row) => <div key={row.id} style={{ padding: 9, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 9.5 }}>{row.sets.filter(s => s.completed).length} {t("séries validées", "sets completed", "series completadas")}</div>)}</div></FitGlassCard> : <FitGlassCard accent={accent} style={{ padding: 22, textAlign: "center" }}><FitIcon name="workout" size={34}/><div style={{ marginTop: 8, fontWeight: 950 }}>{t("Ta journée FIT PERF commence ici.", "Your FIT PERF day starts here.", "Tu día FIT PERF empieza aquí.")}</div><FitPrimaryButton onClick={() => go("games")} accent={accent} style={{ marginTop: 12 }}>{t("LANCER UNE SÉANCE", "START WORKOUT", "INICIAR SESIÓN")}</FitPrimaryButton></FitGlassCard>}
        </> : null}

        {tab === "progress" ? <>
          <FitSectionTitle eyebrow={t("7 DERNIERS JOURS", "LAST 7 DAYS", "ÚLTIMOS 7 DÍAS")} title={t("Courbe de volume", "Volume trend", "Tendencia de volumen")}/>
          <FitGlassCard accent="#72def4" style={{ padding: 14 }}><FitMiniBars values={bars} accent="#72def4" height={105}/><div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 8.5 }}><span>J-6</span><span>{t("Aujourd'hui", "Today", "Hoy")}</span></div></FitGlassCard>
          <FitSectionTitle eyebrow={t("RÉPARTITION", "DISTRIBUTION", "DISTRIBUCIÓN")} title={t("Groupes dominants", "Dominant groups", "Grupos dominantes")}/>
          <FitGlassCard accent="#75ed9a" style={{ padding: 14 }}>{muscles.map((item) => <div key={item.label} style={{ marginBottom: 11 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 900 }}><span style={{ color: item.accent }}>{item.label}</span><span>{item.value}</span></div><div style={{ marginTop: 5 }}><FitProgress value={item.pct} accent={item.accent} height={6}/></div></div>)}</FitGlassCard>
        </> : null}

        {tab === "records" ? <>
          <FitSectionTitle eyebrow="PR" title={t("Tes meilleurs records", "Your best records", "Tus mejores récords")}/>
          <div style={{ display: "grid", gap: 8 }}>{records.length ? records.slice(0,8).map((record, index) => <FitGlassCard key={record.exerciseId} accent={index === 0 ? accent : record.oneRm > 0 ? "#b59cff" : accent} style={{ padding: 12, display: "grid", gridTemplateColumns: "38px 1fr auto", alignItems: "center", gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, color: accent }}><FitIcon name="records" size={19}/></div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{record.exerciseName}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{formatKg(record.weightKg)} × {record.reps}</div></div><div style={{ color: "#b59cff", fontWeight: 1000, fontSize: 11 }}>1RM {formatKg(record.oneRm)}</div></FitGlassCard>) : <FitGlassCard accent={accent} style={{ padding: 22, textAlign: "center", color: textSoft }}>{t("Valide des séries pour créer automatiquement tes records.", "Complete sets to create records automatically.", "Completa series para crear récords automáticamente.")}</FitGlassCard>}</div>
        </> : null}

        {tab === "goals" ? <>
          <FitSectionTitle eyebrow={t("OBJECTIFS", "GOALS", "OBJETIVOS")} title={t("Régularité de la semaine", "Weekly consistency", "Regularidad semanal")}/>
          <FitGlassCard accent={accent} style={{ padding: 15 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={{ fontSize: 14, fontWeight: 1000 }}>{summary.weekSessions}/{weeklyGoal} {t("séances", "sessions", "sesiones")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{goalPct >= 100 ? t("Objectif atteint 🔥", "Goal completed 🔥", "Objetivo cumplido 🔥") : t("Encore un effort pour valider la semaine.", "Keep going to complete the week.", "Sigue para completar la semana.")}</div></div><FitRing value={goalPct} label="GOAL" accent={accent} size={76}/></div><div style={{ marginTop: 12 }}><FitProgress value={goalPct} accent={accent} height={8}/></div></FitGlassCard>
        </> : null}
      </FitShell>
    </div>
  );
}
