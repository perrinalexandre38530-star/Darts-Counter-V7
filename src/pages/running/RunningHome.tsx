import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import runningLogo from "../../assets/games/logo-running-performance.png";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import { listActivities } from "../../activity/activityStore";
import { buildRunningStats } from "../../activity/runningInsights";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import { activePlanWeekIndex, buildTrainingStatus, loadRunningPlan, nextPlanSession, paceZonesFromStats, planCompletionPct, planDurationWeeks, racePredictions } from "../../activity/runningTraining";
import { buildRunningRaceGoalSnapshot, distanceGoalLabel, loadRunningRaceGoal } from "../../activity/runningGoals";
const PAGE_MAX_WIDTH = 620;
const sectionWrap: React.CSSProperties = { width: "100%", maxWidth: PAGE_MAX_WIDTH, paddingInline: 10 };
const GOAL_KEY = "mss-running-weekly-goal-km-v1";
type Props = {
    store?: any;
    go: (route: any, params?: any) => void;
};
function safeActiveProfile(store: any) {
    const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
    const activeId = String(store?.activeProfileId || "");
    return profiles.find((p: any) => String(p?.id || "") === activeId) || profiles[0] || null;
}
function useAutoFitTitle(deps: any[] = []) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);
    useLayoutEffect(() => {
        const measure = () => {
            const wrap = wrapRef.current, text = textRef.current;
            if (!wrap || !text)
                return;
            text.style.transform = "scale(1)";
            void text.offsetHeight;
            const wrapW = wrap.getBoundingClientRect().width, textW = text.getBoundingClientRect().width;
            if (wrapW && textW)
                setScale(textW > wrapW ? Math.max(.72, Math.min(1, wrapW / textW)) : 1);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return { wrapRef, textRef, scale };
}
function svgDataUri(svg: string) { return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`; }
function tickerSvg(kind: "hero" | "coach" | "pacer" | "records", accent: string) {
    const c = {
        hero: ["RUNNING", "COURS.", "PROGRESSE.", "RUN"],
        coach: ["COACH", "UN PLAN.", "UNE MISSION.", "GO"],
        pacer: ["PACER", "GARDE TON", "ALLURE CIBLE", "±"],
        records: ["RECORDS", "CHAQUE KM", "PEUT COMPTER", "PR"],
    }[kind];
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360"><defs><radialGradient id="b" cx="72%" cy="28%" r="86%"><stop offset="0" stop-color="${accent}" stop-opacity=".24"/><stop offset=".46" stop-color="#111722"/><stop offset="1" stop-color="#05070d"/></radialGradient></defs><rect width="1200" height="360" fill="url(#b)"/><path d="M0 300 C160 240 320 330 500 265 C700 192 824 110 1200 206" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="4"/><circle cx="930" cy="180" r="112" fill="none" stroke="${accent}" stroke-opacity=".32" stroke-width="3"/><text x="930" y="202" text-anchor="middle" font-family="Arial" font-size="72" font-weight="900" fill="${accent}">${c[3]}</text><text x="70" y="92" font-family="Arial" font-size="24" font-weight="900" letter-spacing="5" fill="${accent}">${c[0]}</text><text x="70" y="170" font-family="Arial" font-size="57" font-weight="900" fill="#fff">${c[1]}</text><text x="70" y="232" font-family="Arial" font-size="48" font-weight="900" fill="#fff" opacity=".82">${c[2]}</text></svg>`);
}
function presetParams(presetId: string, targetM?: number | null) { return { runningPresetId: presetId, runningTargetM: targetM ?? null }; }
export default function RunningHome({ store, go }: Props) {
    const { theme } = useTheme();
    const langApi = useLang() as any;
    const lang = String(langApi?.lang || "fr").toLowerCase();
    const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
    const textSoft = (theme as any)?.textSoft || "#a8a8b3";
    const [activities, setActivities] = useState<ActivityRecord[]>([]);
    const [tickerIndex, setTickerIndex] = useState(0);
    const [activePlan] = useState(() => loadRunningPlan());
    const [raceGoal] = useState(() => loadRunningRaceGoal());
    const [weeklyGoalKm, setWeeklyGoalKm] = useState(() => {
        const n = Number(localStorage.getItem(GOAL_KEY));
        return Number.isFinite(n) && n >= 5 ? n : 15;
    });
    React.useEffect(() => { let live = true; void listActivities("running").then((r) => live && setActivities(r)); return () => { live = false; }; }, []);
    const stats = useMemo(() => buildRunningStats(activities, Date.now(), lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB"), [activities, lang]);
    const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
    const { wrapRef, textRef, scale } = useAutoFitTitle([accent, lang]);
    const copy = lang === "fr" ? {
        welcome: "Bienvenue", title: "RUNNING PERFORMANCE", beta: "BETA WEB / PWA", overview: "Vue globale Running", distance: "Distance", sessions: "Sorties", best: "Meilleure allure", climb: "D+ cumulé", longest: "Plus longue", time: "Temps total",
        start: "LANCE TA SORTIE", free: "COURSE LIBRE", freeSub: "GPS · carte · splits · tours", easy: "EASY RUN", easySub: "30 min faciles · endurance", intervals: "INTERVALLES", intervalsSub: "6 × 1 min rapide / 1 min récup", pacer: "PACER", pacerSub: "Objectif d’allure · avance / retard", five: "5 KM", fiveSub: "Course objectif · meilleur effort",
        coach: "COACH RUNNING", weekGoal: "OBJECTIF HEBDO", thisWeek: "Cette semaine", previous: "vs semaine précédente", streak: "Série active", weeks: "semaines", days: "jours", plan: "RECOMMANDATION", open: "OUVRIR",
        trend: "RYTHME DES 7 DERNIERS JOURS", month: "VOLUME SUR 4 SEMAINES", records: "MEILLEURS EFFORTS", recent: "DERNIÈRES SORTIES", allRuns: "VOIR TOUT", challenges: "CHALLENGES", threeRuns: "3 sorties dans la semaine", goalChallenge: "Atteindre l’objectif distance", devices: "MONTRES & CAPTEURS", devicesSub: "Health Connect · Garmin · FIT / GPX / TCX — architecture prévue", soon: "BIENTÔT", trainingStatus: "ÉTAT D’ENTRAÎNEMENT", freshness: "Fraîcheur estimée", load7: "Charge 7 jours", load28: "Base hebdo 28 j", balanced: "ÉQUILIBRÉE", high: "ÉLEVÉE", low: "FAIBLE", indicative: "Indicateur basé sur tes sorties et ton ressenti, pas une mesure médicale.", program: "PROGRAMME ACTIF", noProgram: "Aucun programme actif", createProgram: "CRÉER UN PLAN", nextWorkout: "Prochaine séance", zones: "ZONES D’ALLURE", predictions: "PRÉDICTIONS DE COURSE", basedOn: "Basé sur tes meilleurs efforts GPS",
    } : lang === "es" ? {
        welcome: "Bienvenido", title: "RUNNING PERFORMANCE", beta: "BETA WEB / PWA", overview: "Vista global Running", distance: "Distancia", sessions: "Carreras", best: "Mejor ritmo", climb: "D+ total", longest: "Más larga", time: "Tiempo total",
        start: "INICIA TU CARRERA", free: "CARRERA LIBRE", freeSub: "GPS · mapa · splits · vueltas", easy: "EASY RUN", easySub: "30 min suaves · resistencia", intervals: "INTERVALOS", intervalsSub: "6 × 1 min rápido / 1 min suave", pacer: "PACER", pacerSub: "Ritmo objetivo · adelanto / retraso", five: "5 KM", fiveSub: "Carrera objetivo · mejor esfuerzo",
        coach: "COACH RUNNING", weekGoal: "OBJETIVO SEMANAL", thisWeek: "Esta semana", previous: "vs semana anterior", streak: "Racha activa", weeks: "semanas", days: "días", plan: "RECOMENDACIÓN", open: "ABRIR",
        trend: "RITMO DE LOS ÚLTIMOS 7 DÍAS", month: "VOLUMEN EN 4 SEMANAS", records: "MEJORES ESFUERZOS", recent: "ÚLTIMAS CARRERAS", allRuns: "VER TODO", challenges: "RETOS", threeRuns: "3 carreras esta semana", goalChallenge: "Completar el objetivo de distancia", devices: "RELOJES Y SENSORES", devicesSub: "Health Connect · Garmin · FIT / GPX / TCX — arquitectura prevista", soon: "PRONTO", trainingStatus: "ESTADO DE ENTRENAMIENTO", freshness: "Frescura estimada", load7: "Carga 7 días", load28: "Base semanal 28 d", balanced: "EQUILIBRADA", high: "ALTA", low: "BAJA", indicative: "Indicador basado en tus carreras y sensaciones, no es una medida médica.", program: "PLAN ACTIVO", noProgram: "Sin plan activo", createProgram: "CREAR PLAN", nextWorkout: "Próxima sesión", zones: "ZONAS DE RITMO", predictions: "PREDICCIONES DE CARRERA", basedOn: "Basado en tus mejores esfuerzos GPS",
    } : {
        welcome: "Welcome", title: "RUNNING PERFORMANCE", beta: "WEB / PWA BETA", overview: "Running overview", distance: "Distance", sessions: "Runs", best: "Best pace", climb: "Total climb", longest: "Longest", time: "Total time",
        start: "START YOUR RUN", free: "FREE RUN", freeSub: "GPS · map · splits · laps", easy: "EASY RUN", easySub: "30 easy min · aerobic base", intervals: "INTERVALS", intervalsSub: "6 × 1 min fast / 1 min easy", pacer: "PACER", pacerSub: "Target pace · ahead / behind", five: "5 KM", fiveSub: "Goal race · best effort",
        coach: "RUNNING COACH", weekGoal: "WEEKLY GOAL", thisWeek: "This week", previous: "vs previous week", streak: "Active streak", weeks: "weeks", days: "days", plan: "RECOMMENDATION", open: "OPEN",
        trend: "LAST 7 DAYS", month: "4-WEEK VOLUME", records: "BEST EFFORTS", recent: "RECENT RUNS", allRuns: "VIEW ALL", challenges: "CHALLENGES", threeRuns: "3 runs this week", goalChallenge: "Complete distance goal", devices: "WATCHES & SENSORS", devicesSub: "Health Connect · Garmin · FIT / GPX / TCX — planned architecture", soon: "SOON", trainingStatus: "TRAINING STATUS", freshness: "Estimated freshness", load7: "7-day load", load28: "28-day weekly base", balanced: "BALANCED", high: "HIGH", low: "LOW", indicative: "Indicator based on your runs and feedback, not a medical measurement.", program: "ACTIVE PLAN", noProgram: "No active plan", createProgram: "CREATE PLAN", nextWorkout: "Next workout", zones: "PACE ZONES", predictions: "RACE PREDICTIONS", basedOn: "Based on your GPS best efforts",
    };
    const recommendation = useMemo(() => {
        if (!stats.sessions)
            return { id: "easy", icon: "🌱", title: copy.easy, text: copy.easySub };
        const hours = stats.lastRun ? (Date.now() - stats.lastRun.startedAt) / 3600000 : 999;
        if (hours < 28)
            return { id: "easy", icon: "🫧", title: lang === "fr" ? "RÉCUPÉRATION" : lang === "es" ? "RECUPERACIÓN" : "RECOVERY", text: lang === "fr" ? "20 min très faciles pour relancer sans charger." : lang === "es" ? "20 min muy suaves para recuperar." : "20 very easy minutes to recover." };
        if (stats.weekSessions >= 3)
            return { id: "long", icon: "🛣️", title: lang === "fr" ? "SORTIE LONGUE" : lang === "es" ? "CARRERA LARGA" : "LONG RUN", text: lang === "fr" ? "60 min en aisance pour développer l’endurance." : lang === "es" ? "60 min suaves para desarrollar resistencia." : "60 easy minutes to build endurance." };
        return { id: "intervals", icon: "⚡", title: copy.intervals, text: copy.intervalsSub };
    }, [copy.easy, copy.easySub, copy.intervals, copy.intervalsSub, lang, stats.lastRun, stats.sessions, stats.weekSessions]);
    const trainingStatus = useMemo(() => buildTrainingStatus(activities), [activities]);
    const raceGoalSnapshot = useMemo(() => raceGoal ? buildRunningRaceGoalSnapshot(raceGoal, stats) : null, [raceGoal, stats]);
    const paceZones = useMemo(() => paceZonesFromStats(stats), [stats]);
    const predictions = useMemo(() => racePredictions(stats), [stats]);
    const planCompletion = activePlan ? planCompletionPct(activePlan, activities) : 0;
    const currentPlanWeek = activePlan ? activePlanWeekIndex(activePlan) + 1 : 0;
    const nextWorkout = activePlan ? nextPlanSession(activePlan, activities) : null;
    const goalPct = Math.min(100, stats.weekDistanceM / Math.max(1, weeklyGoalKm * 1000) * 100);
    const sessionsPct = Math.min(100, stats.weekSessions / 3 * 100);
    const performanceScore = Math.round(Math.max(0, Math.min(100, trainingStatus.freshnessScore * .45 + Math.min(100, goalPct) * .30 + Math.min(100, sessionsPct) * .15 + Math.min(100, stats.activeWeekStreak * 12) * .10)));
    const consistencyScore = Math.round(Math.max(0, Math.min(100, stats.activeWeekStreak * 18 + Math.min(46, stats.weekSessions * 14) + Math.min(18, stats.activeDayStreak * 4))));
    const xp = Math.round(stats.totalDistanceM / 10);
    const level = Math.floor(xp / 1000) + 1;
    const levelXp = xp % 1000;
    const tickers: ArcadeTickerItem[] = useMemo(() => [
        { id: "hero", title: "Running Performance", text: `${(stats.weekDistanceM / 1000).toFixed(1)} km · ${stats.weekSessions} ${copy.sessions.toLowerCase()} · ${levelXp}/1000 XP`, detail: `${copy.streak}: ${stats.activeWeekStreak} ${copy.weeks}`, backgroundImage: tickerSvg("hero", accent), accentColor: accent },
        { id: "coach", title: copy.coach, text: `${recommendation.title} — ${recommendation.text}`, detail: copy.plan, backgroundImage: tickerSvg("coach", accent), accentColor: accent },
        { id: "pacer", title: copy.pacer, text: copy.pacerSub, detail: lang === "fr" ? "Allure cible · projection · delta live" : lang === "es" ? "Ritmo objetivo · proyección · delta live" : "Target pace · projection · live delta", backgroundImage: tickerSvg("pacer", accent), accentColor: accent },
        { id: "records", title: copy.records, text: `1K ${stats.best1k ? formatDuration(stats.best1k.elapsedMs) : "—"} · 5K ${stats.best5k ? formatDuration(stats.best5k.elapsedMs) : "—"} · 10K ${stats.best10k ? formatDuration(stats.best10k.elapsedMs) : "—"}`, detail: lang === "fr" ? "Meilleurs efforts calculés sur tous les tracés" : lang === "es" ? "Mejores esfuerzos calculados en todas las rutas" : "Best efforts across all routes", backgroundImage: tickerSvg("records", accent), accentColor: accent },
    ], [accent, copy.coach, copy.pacer, copy.pacerSub, copy.plan, copy.records, copy.sessions, copy.streak, copy.weeks, lang, levelXp, recommendation.text, recommendation.title, stats.activeWeekStreak, stats.best10k, stats.best1k, stats.best5k, stats.weekDistanceM, stats.weekSessions]);
    const profileSlides = [{ id: "running-records", title: copy.records, rows: [
                { label: "1 KM", value: stats.best1k ? formatDuration(stats.best1k.elapsedMs) : "—" },
                { label: "5 KM", value: stats.best5k ? formatDuration(stats.best5k.elapsedMs) : "—" },
                { label: "10 KM", value: stats.best10k ? formatDuration(stats.best10k.elapsedMs) : "—" },
                { label: copy.streak, value: `${stats.activeWeekStreak} ${copy.weeks}` },
            ] }];
    const changeGoal = (delta: number) => {
        const next = Math.max(5, Math.min(100, weeklyGoalKm + delta));
        setWeeklyGoalKm(next);
        localStorage.setItem(GOAL_KEY, String(next));
    };
    return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 96 }}>
    <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 8 }}><div style={{ ...sectionWrap, borderRadius: 20, border: `1px solid ${(theme as any)?.cardSoft || "rgba(255,255,255,.14)"}`, background: `radial-gradient(circle at 50% -15%,${accent}18,rgba(0,0,0,.24) 45%,rgba(0,0,0,.28))`, boxShadow: "0 18px 70px rgba(0,0,0,.55)", padding: "11px 14px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(110deg,transparent 15%,${accent}08 48%,transparent 80%)` }}/><div style={{ position: "relative", display: "grid", justifyItems: "center" }}><img src={runningLogo} alt="Running Performance" style={{ width: 94, height: 94, objectFit: "contain", filter: `drop-shadow(0 0 18px ${accent}33)`, marginBottom: 2 }}/><div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", marginBottom: 7 }}><span style={pill(theme)}>👋 {copy.welcome}</span><span style={{ ...pill(theme), color: accent, borderColor: `${accent}66` }}>● {copy.beta}</span></div>
      <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}><div ref={textRef} style={{ transform: `scale(${scale})`, transformOrigin: "center", fontSize: "clamp(23px,7vw,31px)", fontWeight: 1000, letterSpacing: "clamp(.5px,.75vw,2.2px)", whiteSpace: "nowrap", backgroundImage: `linear-gradient(120deg,${accent},#fff,${accent})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", color: "transparent", animation: "dcTitlePulse 3.6s ease-in-out infinite,dcTitleShimmer 7s linear infinite" }}>{copy.title}</div></div></div>
    </div></div>

    <div style={sectionWrap}>{activeProfile ? <ActiveProfileCard hideStatus hideStarRing profile={activeProfile as any} stats={{} as any} suppressDefaultStatsSlides customSlides={profileSlides as any} globalTitle={copy.overview} globalKpis={[
                { label: copy.distance, value: formatDistance(stats.totalDistanceM) }, { label: copy.sessions, value: stats.sessions }, { label: copy.best, value: `${formatPace(stats.bestPaceSecPerKm)} /km` }, { label: copy.climb, value: `+${Math.round(stats.totalElevationM)} m` }, { label: copy.longest, value: formatDistance(stats.longestM) }, { label: copy.time, value: formatDuration(stats.totalElapsedMs) },
            ]}/> : null}</div>

    <div style={{ ...sectionWrap, marginTop: 11 }}><div className="card" style={{ padding: 13, borderColor: `${accent}38`, background: `linear-gradient(145deg,${accent}0d,rgba(255,255,255,.02))` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><SectionTitle text={lang === "fr" ? "PERFORMANCE CENTER" : lang === "es" ? "CENTRO DE RENDIMIENTO" : "PERFORMANCE CENTER"} accent={accent}/><span style={{ fontSize: 8.5, color: textSoft }}>{lang === "fr" ? "Synthèse de ta semaine" : lang === "es" ? "Resumen semanal" : "Weekly snapshot"}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "center" }}><PerformanceRing value={performanceScore} accent={accent} label={lang === "fr" ? "SCORE" : "SCORE"}/><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><PulseKpi label={lang === "fr" ? "PRÉPARATION" : lang === "es" ? "PREPARACIÓN" : "READINESS"} value={`${trainingStatus.freshnessScore}%`} accent={trainingStatus.freshnessScore >= 70 ? "#71ff9a" : trainingStatus.freshnessScore >= 45 ? accent : "#ff8a67"}/><PulseKpi label={lang === "fr" ? "RÉGULARITÉ" : lang === "es" ? "REGULARIDAD" : "CONSISTENCY"} value={`${consistencyScore}%`} accent={accent}/><PulseKpi label={lang === "fr" ? "OBJECTIF SEMAINE" : lang === "es" ? "OBJETIVO SEMANAL" : "WEEK GOAL"} value={`${Math.round(goalPct)}%`} accent={accent}/><PulseKpi label={copy.streak} value={`${stats.activeWeekStreak} ${copy.weeks}`} accent={stats.activeWeekStreak ? "#71ff9a" : textSoft}/></div></div>
    </div></div>

    <div style={sectionWrap}><ArcadeTicker items={tickers} activeIndex={tickerIndex} onIndexChange={setTickerIndex} intervalMs={7000}/></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><button type="button" onClick={() => go("games", { runningView: "goal" })} className="card" style={{ width: "100%", padding: 13, display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 11, alignItems: "center", color: "inherit", textAlign: "left", cursor: "pointer", borderColor: `${raceGoalSnapshot ? accent : textSoft}35`, background: raceGoalSnapshot ? `linear-gradient(135deg,${accent}12,rgba(255,255,255,.02))` : "rgba(255,255,255,.02)" }}><div style={{ width: 52, height: 52, borderRadius: 15, display: "grid", placeItems: "center", fontSize: 25, background: `${accent}12`, border: `1px solid ${accent}32` }}>🏁</div><div><div style={{ fontSize: 9, color: accent, fontWeight: 1000, letterSpacing: .8 }}>{lang === "fr" ? "OBJECTIF DE COURSE" : lang === "es" ? "OBJETIVO DE CARRERA" : "RACE GOAL"}</div>{raceGoalSnapshot ? <><div style={{ marginTop: 3, fontSize: 13, fontWeight: 1000 }}>{distanceGoalLabel(raceGoalSnapshot.goal.distanceM)} · J−{raceGoalSnapshot.daysLeft}</div><div style={{ marginTop: 3, fontSize: 9, color: textSoft }}>{lang === "fr" ? "Cible" : lang === "es" ? "Objetivo" : "Target"} {formatDuration(raceGoalSnapshot.goal.targetTimeMs)} · {formatPace(raceGoalSnapshot.targetPaceSecPerKm)}/km{raceGoalSnapshot.predictedMs ? ` · ${lang === "fr" ? "projection" : lang === "es" ? "predicción" : "prediction"} ${formatDuration(raceGoalSnapshot.predictedMs)}` : ""}</div></> : <><div style={{ marginTop: 3, fontSize: 12, fontWeight: 1000 }}>{lang === "fr" ? "DONNE UNE DATE À TA PROGRESSION" : lang === "es" ? "DA UNA FECHA A TU PROGRESO" : "GIVE YOUR PROGRESS A DATE"}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9.5 }}>{lang === "fr" ? "5K · 10K · Semi · Marathon · chrono cible" : lang === "es" ? "5K · 10K · Media · Maratón · tiempo objetivo" : "5K · 10K · Half · Marathon · target time"}</div></>}</div><div style={{ textAlign: "right" }}>{raceGoalSnapshot?.readinessPct != null ? <div style={{ color: accent, fontSize: 17, fontWeight: 1000 }}>{raceGoalSnapshot.readinessPct}%</div> : null}<div style={{ color: accent, fontSize: 18, fontWeight: 1000 }}>›</div></div></button></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14, borderColor: `${accent}34` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><SectionTitle text={copy.trainingStatus} accent={accent}/><span style={{ fontSize: 8.5, color: textSoft }}>{copy.indicative}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}><TrainingKpi label={copy.freshness} value={`${trainingStatus.freshnessScore}%`} accent={trainingStatus.freshnessScore >= 70 ? "#71ff9a" : trainingStatus.freshnessScore >= 45 ? accent : "#ff8a67"}/><TrainingKpi label={copy.load7} value={String(trainingStatus.acuteLoad7)} accent={accent}/><TrainingKpi label={copy.load28} value={String(trainingStatus.chronicWeeklyLoad28)} accent={accent}/></div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><span style={{ color: textSoft, fontSize: 9.5 }}>{lang === "fr" ? "Équilibre charge récente / base" : lang === "es" ? "Equilibrio carga reciente / base" : "Recent load / baseline balance"}</span><b style={{ color: trainingStatus.loadLabel === "high" ? "#ff8a67" : trainingStatus.loadLabel === "balanced" ? "#71ff9a" : accent, fontSize: 9.5 }}>{trainingStatus.loadLabel === "high" ? copy.high : trainingStatus.loadLabel === "balanced" ? copy.balanced : copy.low}{trainingStatus.loadRatio != null ? ` · ${trainingStatus.loadRatio.toFixed(2)}×` : ""}</b></div>
    </div></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14, background: `linear-gradient(145deg,${accent}10,rgba(255,255,255,.02))`, borderColor: `${accent}38` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SectionTitle text={copy.program} accent={accent}/><button className="btn" onClick={() => go("games", { runningView: "plan" })} style={{ minHeight: 34, fontSize: 9, fontWeight: 1000 }}>{activePlan ? copy.open : copy.createProgram}</button></div>
      {activePlan ? <><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}><div><div style={{ fontWeight: 1000, fontSize: 15 }}>{activePlan.goal === "first-5k" ? "🌱 FIRST 5K" : activePlan.goal === "faster-5k" ? "⚡ FASTER 5K" : activePlan.goal === "10k" ? "🎯 10K" : "🛣️ HALF MARATHON"}</div><div style={{ color: textSoft, fontSize: 9.5, marginTop: 4 }}>{copy.weekGoal ? `${lang === "fr" ? "Semaine" : lang === "es" ? "Semana" : "Week"} ${currentPlanWeek}/${planDurationWeeks(activePlan.goal)} · ${planCompletion}%` : ""}</div></div><div style={{ minWidth: 54, textAlign: "right", color: accent, fontWeight: 1000, fontSize: 20 }}>{planCompletion}%</div></div><Progress value={planCompletion} accent={accent}/>{nextWorkout ? <button type="button" onClick={() => go("games", { runningView: "plan" })} style={{ width: "100%", marginTop: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: "inherit", borderRadius: 13, padding: 10, display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 9, alignItems: "center", textAlign: "left", cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `${accent}12` }}>▶</span><span><small style={{ color: textSoft, fontSize: 8.5 }}>{copy.nextWorkout}</small><b style={{ display: "block", marginTop: 2, fontSize: 10.5 }}>{nextWorkout.title}</b><small style={{ display: "block", marginTop: 2, color: textSoft, fontSize: 8.5 }}>{nextWorkout.subtitle}</small></span><b style={{ color: accent }}>›</b></button> : null}</> : <div style={{ padding: "8px 0 2px", color: textSoft, fontSize: 10, lineHeight: 1.45 }}>{copy.noProgram}</div>}
    </div></div>

    <div style={{ ...sectionWrap, marginTop: 14 }}><div className="card" style={{ padding: 14 }}><SectionTitle text={copy.start} accent={accent}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        <RunAction icon="🏃" title={copy.free} subtitle={copy.freeSub} accent={accent} onClick={() => go("games", presetParams("free"))} featured/>
        <RunAction icon="🌱" title={copy.easy} subtitle={copy.easySub} accent={accent} onClick={() => go("games", presetParams("easy"))}/>
        <RunAction icon="⚡" title={copy.intervals} subtitle={copy.intervalsSub} accent={accent} onClick={() => go("games", presetParams("intervals"))}/>
        <RunAction icon="🎯" title={copy.five} subtitle={copy.fiveSub} accent={accent} onClick={() => go("games", presetParams("distance", 5000))}/>
      </div>
      <button type="button" onClick={() => go("games", presetParams("pacer", 5000))} style={{ width: "100%", marginTop: 9, display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", borderRadius: 14, border: `1px solid ${accent}48`, background: `linear-gradient(135deg,${accent}16,rgba(255,255,255,.025))`, color: "#fff", padding: "11px 12px", textAlign: "left", cursor: "pointer" }}><span style={{ fontSize: 23 }}>⏱️</span><span><b style={{ fontSize: 12 }}>{copy.pacer}</b><small style={{ display: "block", color: textSoft, marginTop: 3, lineHeight: 1.3 }}>{copy.pacerSub}</small></span><b style={{ color: accent }}>›</b></button>
    </div></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><SectionTitle text={copy.coach} accent={accent}/><span style={{ color: accent, fontWeight: 1000, fontSize: 11 }}>LVL {level}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 11, alignItems: "center", padding: 12, borderRadius: 15, border: `1px solid ${accent}32`, background: `${accent}0c` }}><div style={{ width: 48, height: 48, borderRadius: 15, display: "grid", placeItems: "center", fontSize: 24, background: `${accent}14`, border: `1px solid ${accent}34` }}>{recommendation.icon}</div><div><div style={{ fontSize: 11, color: textSoft, fontWeight: 900 }}>{copy.plan}</div><div style={{ fontWeight: 1000, marginTop: 2 }}>{recommendation.title}</div><div style={{ fontSize: 10.5, color: textSoft, marginTop: 3, lineHeight: 1.35 }}>{recommendation.text}</div></div><button className="btn" onClick={() => go("games", presetParams(recommendation.id))} style={{ minHeight: 36, paddingInline: 10, fontWeight: 950 }}>{copy.open}</button></div>
      <div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: textSoft }}><span>XP RUNNING</span><b style={{ color: accent }}>{levelXp}/1000</b></div><Progress value={levelXp / 10} accent={accent}/></div>
    </div></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><SectionTitle text={copy.weekGoal} accent={accent}/><div style={{ display: "flex", gap: 5 }}><button className="btn" onClick={() => changeGoal(-5)} style={goalBtn}>−</button><span style={{ minWidth: 54, textAlign: "center", fontWeight: 1000, color: accent }}>{weeklyGoalKm} km</span><button className="btn" onClick={() => changeGoal(5)} style={goalBtn}>+</button></div></div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ fontSize: 24, fontWeight: 1000 }}>{(stats.weekDistanceM / 1000).toFixed(1)} <small style={{ fontSize: 11, color: textSoft }}>km</small></div><div style={{ fontSize: 10, color: textSoft }}>{copy.thisWeek}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 14, fontWeight: 1000, color: stats.weekTrendPct != null && stats.weekTrendPct >= 0 ? accent : textSoft }}>{stats.weekTrendPct == null ? "—" : `${stats.weekTrendPct >= 0 ? "+" : ""}${Math.round(stats.weekTrendPct)}%`}</div><div style={{ fontSize: 9.5, color: textSoft }}>{copy.previous}</div></div></div><Progress value={goalPct} accent={accent}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}><Challenge label={copy.goalChallenge} value={`${Math.round(goalPct)}%`} progress={goalPct} accent={accent}/><Challenge label={copy.threeRuns} value={`${stats.weekSessions}/3`} progress={sessionsPct} accent={accent}/></div>
    </div></div>

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><SectionTitle text={copy.trend} accent={accent}/><Bars rows={stats.sevenDays.map((d) => ({ label: d.label, value: d.distanceM / 1000 }))} accent={accent} suffix="km"/></div></div>
    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><SectionTitle text={copy.month} accent={accent}/><Bars rows={stats.fourWeeks.map((d) => ({ label: d.label, value: d.distanceM / 1000 }))} accent={accent} suffix="km" tall/></div></div>

    {paceZones.length ? <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><SectionTitle text={copy.zones} accent={accent}/><div style={{ display: "grid", gap: 6 }}>{paceZones.map((zone) => <PaceZoneRow key={zone.id} zone={zone} accent={accent} textSoft={textSoft}/>)}</div></div></div> : null}

    {predictions.length ? <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><SectionTitle text={copy.predictions} accent={accent}/><span style={{ color: textSoft, fontSize: 8.5 }}>{copy.basedOn}</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{predictions.map((prediction) => <PredictionMini key={prediction.distanceM} distanceM={prediction.distanceM} predictedMs={prediction.predictedMs} accent={accent}/>)}</div></div></div> : null}

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SectionTitle text={copy.records} accent={accent}/><button className="btn" style={{ minHeight: 34, fontSize: 9.5 }} onClick={() => go("games", { runningView: "records" })}>{copy.open}</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 8 }}><RecordMini label="1 KM" value={stats.best1k ? formatDuration(stats.best1k.elapsedMs) : "—"} accent={accent}/><RecordMini label="5 KM" value={stats.best5k ? formatDuration(stats.best5k.elapsedMs) : "—"} accent={accent}/><RecordMini label="10 KM" value={stats.best10k ? formatDuration(stats.best10k.elapsedMs) : "—"} accent={accent}/></div></div></div>

    {activities.length ? <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SectionTitle text={copy.recent} accent={accent}/><button className="btn" style={{ minHeight: 34, fontSize: 9.5 }} onClick={() => go("games", { runningView: "history" })}>{copy.allRuns}</button></div><div style={{ display: "grid", gap: 7, marginTop: 8 }}>{activities.slice(0, 3).map((a) => <RecentRun key={a.id} activity={a} accent={accent} textSoft={textSoft}/>)}</div></div></div> : null}

    <div style={{ ...sectionWrap, marginTop: 12 }}><div className="card" style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center", padding: 13, opacity: .86 }}><div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: `${accent}16`, border: `1px solid ${accent}38`, fontSize: 22 }}>⌚</div><div><div style={{ fontWeight: 1000, fontSize: 11 }}>{copy.devices}</div><div style={{ fontSize: 10, color: textSoft, marginTop: 3, lineHeight: 1.35 }}>{copy.devicesSub}</div></div><span style={{ color: accent, fontSize: 9.5, fontWeight: 1000 }}>{copy.soon}</span></div></div>
  </div>;
}
function pill(theme: any): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1px solid ${theme?.cardSoft || "rgba(255,255,255,.13)"}`, background: "rgba(0,0,0,.25)", color: theme?.textSoft || "#ddd", fontSize: 10, fontWeight: 900 }; }
function SectionTitle({ text, accent }: {
    text: string;
    accent: string;
}) { return <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, color: accent, marginBottom: 9 }}>{text}</div>; }
function Progress({ value, accent }: {
    value: number;
    accent: string;
}) { return <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 7 }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: accent, borderRadius: 999, boxShadow: `0 0 14px ${accent}55`, transition: "width .3s ease" }}/></div>; }
function RunAction({ icon, title, subtitle, accent, onClick, featured = false }: {
    icon: string;
    title: string;
    subtitle: string;
    accent: string;
    onClick: () => void;
    featured?: boolean;
}) { return <button type="button" onClick={onClick} style={{ minHeight: 112, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between", gap: 7, padding: 11, borderRadius: 15, textAlign: "left", color: "#fff", cursor: "pointer", border: `1px solid ${featured ? `${accent}66` : "rgba(255,255,255,.09)"}`, background: featured ? `linear-gradient(145deg,${accent}20,rgba(255,255,255,.025))` : "rgba(255,255,255,.025)", boxShadow: featured ? `0 12px 30px ${accent}10` : "none" }}><span style={{ fontSize: 24 }}>{icon}</span><span><b style={{ fontSize: 11.5, color: featured ? accent : "#fff" }}>{title}</b><small style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.58)", fontSize: 9.5, lineHeight: 1.35 }}>{subtitle}</small></span></button>; }
function Challenge({ label, value, progress, accent }: {
    label: string;
    value: string;
    progress: number;
    accent: string;
}) { return <div style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 9.5 }}><span style={{ opacity: .72 }}>{label}</span><b style={{ color: accent }}>{value}</b></div><Progress value={progress} accent={accent}/></div>; }
function Bars({ rows, accent, suffix, tall = false }: {
    rows: Array<{
        label: string;
        value: number;
    }>;
    accent: string;
    suffix: string;
    tall?: boolean;
}) { const max = Math.max(1, ...rows.map((r) => r.value)); return <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length},minmax(0,1fr))`, gap: 7, alignItems: "end", minHeight: tall ? 122 : 104, paddingTop: 6 }}>{rows.map((r) => <div key={r.label} style={{ display: "grid", gridTemplateRows: "1fr auto auto", gap: 4, height: "100%", alignItems: "end", textAlign: "center" }}><div style={{ display: "flex", alignItems: "end", height: tall ? 80 : 64, borderRadius: 8, background: "rgba(255,255,255,.025)", overflow: "hidden" }}><div style={{ width: "100%", height: `${Math.max(r.value > 0 ? 8 : 2, r.value / max * 100)}%`, background: `linear-gradient(180deg,${accent},${accent}66)`, borderRadius: "7px 7px 3px 3px", boxShadow: r.value ? `0 0 14px ${accent}30` : "none" }}/></div><b style={{ fontSize: 8.5 }}>{r.value ? r.value.toFixed(1) : "—"}<small style={{ fontSize: 6.5, opacity: .55 }}> {r.value ? suffix : ""}</small></b><span style={{ fontSize: 8, opacity: .55 }}>{r.label}</span></div>)}</div>; }
function TrainingKpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", textAlign: "center" }}><div style={{ fontSize: 8.2, opacity: .58, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000, color: accent }}>{value}</div></div>; }
function PaceZoneRow({ zone, accent, textSoft }: { zone: { label: string; purpose: string; fastSecPerKm: number; slowSecPerKm: number }; accent: string; textSoft: string }) { return <div style={{ display: "grid", gridTemplateColumns: "78px 1fr auto", gap: 8, alignItems: "center", padding: "8px 9px", borderRadius: 11, background: "rgba(255,255,255,.022)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ color: accent, fontSize: 9 }}>{zone.label}</b><span style={{ color: textSoft, fontSize: 8.7 }}>{zone.purpose}</span><b style={{ fontSize: 9.5 }}>{formatPace(zone.fastSecPerKm)}–{formatPace(zone.slowSecPerKm)}<small style={{ fontSize: 7, opacity: .55 }}>/km</small></b></div>; }
function PredictionMini({ distanceM, predictedMs, accent }: { distanceM: number; predictedMs: number; accent: string }) { const label = Math.abs(distanceM - 21097) < 10 ? "21.1 KM" : Math.abs(distanceM - 42195) < 10 ? "42.2 KM" : `${distanceM / 1000} KM`; return <div style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><div style={{ fontSize: 8.5, opacity: .6, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 19, fontWeight: 1000 }}>{formatDuration(predictedMs)}</div></div>; }
function RecordMini({ label, value, accent }: {
    label: string;
    value: string;
    accent: string;
}) { return <div style={{ textAlign: "center", borderRadius: 13, padding: "10px 5px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ fontSize: 9, opacity: .58, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 4, fontSize: 17, fontWeight: 1000, color: value === "—" ? undefined : accent }}>{value}</div></div>; }
function RecentRun({ activity, accent, textSoft }: {
    activity: ActivityRecord;
    accent: string;
    textSoft: string;
}) { return <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center", padding: 9, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}2e` }}>🏃</div><div><b style={{ fontSize: 10.5 }}>{formatDistance(activity.distanceM)}</b><div style={{ color: textSoft, fontSize: 9, marginTop: 2 }}>{new Date(activity.startedAt).toLocaleDateString()} · {formatDuration(activity.elapsedMs)}</div></div><div style={{ color: accent, fontSize: 10, fontWeight: 1000 }}>{formatPace(activity.avgPaceSecPerKm)}<small style={{ fontSize: 7 }}>/km</small></div></div>; }
function PerformanceRing({ value, accent, label }: { value: number; accent: string; label: string }) { return <div style={{ width: 88, height: 88, borderRadius: 999, display: "grid", placeItems: "center", background: `conic-gradient(${accent} ${Math.max(0, Math.min(100, value))}%,rgba(255,255,255,.07) 0)`, boxShadow: `0 0 25px ${accent}20` }}><div style={{ width: 70, height: 70, borderRadius: 999, display: "grid", placeItems: "center", alignContent: "center", background: "rgba(5,7,12,.96)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><b style={{ color: accent, fontSize: 21, lineHeight: 1 }}>{value}</b><span style={{ marginTop: 3, fontSize: 7, opacity: .55, fontWeight: 1000 }}>{label}</span></div></div>; }
function PulseKpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ minWidth: 0, padding: "8px 7px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 7, opacity: .52, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000, color: accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }
const goalBtn: React.CSSProperties = { width: 30, minWidth: 30, minHeight: 30, padding: 0, borderRadius: 9, fontWeight: 1000 };
