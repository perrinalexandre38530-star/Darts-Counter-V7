import { localeForLang, pickLegacyBilingualText, pickLegacyLocalizedText, pickLegacyLocalizedValue } from "../../i18n/legacyLocalizedText";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import { listActivities } from "../../activity/activityStore";
import { buildRunningStats } from "../../activity/runningInsights";
import { formatDistance, formatDuration, formatPace, routeDistanceMeters } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import { activePlanWeekIndex, buildTrainingStatus, loadRunningPlan, nextPlanSession, planCompletionPct, planDurationWeeks } from "../../activity/runningTraining";
import { buildRunningRaceGoalSnapshot, distanceGoalLabel, loadRunningRaceGoal } from "../../activity/runningGoals";
import OutdoorActivitySelector from "./OutdoorActivitySelector";
import { RunningActionTile, RunningGlyph, RunningSectionHeading, RunningStatusChip, RunningSurface } from "./RunningUi";
import "./runningResponsive.css";
import { loadRunningActiveSessions, runningActiveElapsedMs, subscribeRunningActiveSessions, upsertRunningActiveSession, type RunningActiveSession } from "../../activity/runningActiveSessions";
import { OUTDOOR_SPORT_PROFILES, canonicalOutdoorPerformanceSport, loadOutdoorPerformanceSport, outdoorAverageMetricLabel, outdoorAverageMetricValue, outdoorAverageSpeedKmh, outdoorSportLabel, outdoorUsesSpeedMetric, saveOutdoorPerformanceSport, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import SportWelcomeWatermark from "../../components/home/SportWelcomeWatermark";
import { InlineAdBanner } from "../../monetization/AdSlot";
import { listRecoverableRunningSessionDrafts } from "../../activity/runningSessionDrafts";
const PAGE_MAX_WIDTH = 620;
const sectionWrap: React.CSSProperties = { width: "100%", boxSizing: "border-box" };
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
        hero: ["PERFORMANCE", "BOUGE.", "PROGRESSE.", "GO"],
        coach: ["COACH", "UN PLAN.", "UNE MISSION.", "GO"],
        pacer: ["PACER", "GARDE TON", "RYTHME CIBLE", "±"],
        records: ["RECORDS", "CHAQUE KM", "PEUT COMPTER", "PR"],
    }[kind];
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360"><defs><radialGradient id="b" cx="72%" cy="28%" r="86%"><stop offset="0" stop-color="${accent}" stop-opacity=".24"/><stop offset=".46" stop-color="#111722"/><stop offset="1" stop-color="#05070d"/></radialGradient></defs><rect width="1200" height="360" fill="url(#b)"/><path d="M0 300 C160 240 320 330 500 265 C700 192 824 110 1200 206" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="4"/><circle cx="930" cy="180" r="112" fill="none" stroke="${accent}" stroke-opacity=".32" stroke-width="3"/><text x="930" y="202" text-anchor="middle" font-family="Arial" font-size="72" font-weight="900" fill="${accent}">${c[3]}</text><text x="70" y="92" font-family="Arial" font-size="24" font-weight="900" letter-spacing="5" fill="${accent}">${c[0]}</text><text x="70" y="170" font-family="Arial" font-size="57" font-weight="900" fill="#fff">${c[1]}</text><text x="70" y="232" font-family="Arial" font-size="48" font-weight="900" fill="#fff" opacity=".82">${c[2]}</text></svg>`);
}
function presetParams(presetId: string, targetM?: number | null, sport?: OutdoorPerformanceSport) { return { runningPresetId: presetId, runningTargetM: targetM ?? null, runningActivitySport: sport }; }
export default function RunningHome({ store, go }: Props) {
    const { theme } = useTheme();
    const langApi = useLang() as any;
    const lang = String(langApi?.lang || "fr").toLowerCase();
    const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
    const textSoft = (theme as any)?.textSoft || "#a8a8b3";
    const [activitySport, setActivitySport] = useState<OutdoorPerformanceSport>(() => loadOutdoorPerformanceSport());
    const [activities, setActivities] = useState<ActivityRecord[]>([]);
    const [tickerIndex, setTickerIndex] = useState(0);
    const [activeSessions, setActiveSessions] = useState<RunningActiveSession[]>(() => loadRunningActiveSessions());
    const [activePlan] = useState(() => loadRunningPlan());
    const [raceGoal] = useState(() => loadRunningRaceGoal());
    const [weeklyGoalKm, setWeeklyGoalKm] = useState(() => {
        const n = Number(localStorage.getItem(GOAL_KEY));
        return Number.isFinite(n) && n >= 5 ? n : 15;
    });
    React.useEffect(() => { saveOutdoorPerformanceSport(activitySport); let live = true; void listActivities(activitySport).then((r) => live && setActivities(r)); return () => { live = false; }; }, [activitySport]);
    React.useEffect(() => subscribeRunningActiveSessions(setActiveSessions), []);
    React.useEffect(() => {
        let cancelled = false;
        void (async () => {
            const active = loadRunningActiveSessions();
            const drafts = await listRecoverableRunningSessionDrafts(active.map((session) => session.id));
            if (cancelled || !drafts.length) return;
            for (const draft of drafts) {
                const current = loadRunningActiveSessions();
                if (current.length >= 3) break;
                const sport = canonicalOutdoorPerformanceSport(draft.sport);
                const lastPoint = draft.route[draft.route.length - 1];
                const elapsedFromRoute = Number(lastPoint?.elapsedMs || 0);
                const fallbackElapsed = draft.startedAt ? Math.max(0, draft.updatedAt - draft.startedAt - Number(draft.pausedTotalMs || 0)) : 0;
                upsertRunningActiveSession({
                    id: draft.sessionId,
                    activityId: draft.activityId,
                    sport,
                    title: draft.title || `${outdoorSportLabel(sport, lang)} · ${pickLegacyLocalizedText(lang, "Sortie récupérée", "Recovered activity", "Salida recuperada")}`,
                    presetId: draft.presetId || "goal-free",
                    workoutType: draft.workoutType,
                    startedAt: Number(draft.startedAt || draft.updatedAt || Date.now()),
                    paused: true,
                    pausedAt: Date.now(),
                    pausedTotalMs: Number(draft.pausedTotalMs || 0),
                    status: "paused",
                    mode: draft.mode || "web-gps",
                    targetDistanceM: draft.targetDistanceM,
                    targetDurationMs: draft.targetDurationMs,
                    targetPaceSecPerKm: draft.targetPaceSecPerKm,
                    routeReferenceId: draft.routeReferenceId,
                    shoeId: draft.shoeId,
                    lastDistanceM: draft.route.length > 1 ? routeDistanceMeters(draft.route) : Number(draft.treadmillDistanceM || 0),
                    lastElapsedMs: Math.max(elapsedFromRoute, fallbackElapsed),
                    lastDraftAt: draft.updatedAt,
                    recoveredAt: Date.now(),
                    lastUpdatedAt: Date.now(),
                });
            }
            if (!cancelled) setActiveSessions(loadRunningActiveSessions());
        })();
        return () => { cancelled = true; };
    }, [lang]);
    const stats = useMemo(() => buildRunningStats(activities, Date.now(), localeForLang(lang)), [activities, lang]);
    const canonicalSport = canonicalOutdoorPerformanceSport(activitySport);
    const speedPrimary = outdoorUsesSpeedMetric(canonicalSport);
    const bestAverageSpeedKmh = activities.reduce((best, activity) => Math.max(best, outdoorAverageSpeedKmh(activity)), 0);
    const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
    const { wrapRef, textRef, scale } = useAutoFitTitle([accent, lang]);
    const copy = pickLegacyLocalizedValue(lang, {
        welcome: "Bienvenue", title: "RUNNING PERF", overview: "Vue globale", distance: "Distance", sessions: "Sorties", best: "Meilleure allure", climb: "D+ cumulé", longest: "Plus longue", time: "Temps total",
        start: "LANCE TA SORTIE", free: "SORTIE LIBRE", freeSub: "GPS · carte · stats · tours", easy: "EASY RUN", easySub: "30 min faciles · endurance", intervals: "INTERVALLES", intervalsSub: "6 × 1 min rapide / 1 min récup", pacer: "PACER", pacerSub: "Objectif d’allure · avance / retard", five: "5 KM", fiveSub: "Objectif distance · meilleur effort",
        coach: "COACH SPORT", weekGoal: "OBJECTIF HEBDO", thisWeek: "Cette semaine", previous: "vs semaine précédente", streak: "Série active", weeks: "semaines", days: "jours", plan: "RECOMMANDATION", open: "OUVRIR",
        trend: "RYTHME DES 7 DERNIERS JOURS", month: "VOLUME SUR 4 SEMAINES", records: "MEILLEURS EFFORTS", recent: "DERNIÈRES SORTIES", allRuns: "VOIR TOUT", challenges: "CHALLENGES", threeRuns: "3 sorties dans la semaine", goalChallenge: "Atteindre l’objectif distance", devices: "MONTRES & CAPTEURS", devicesSub: "BLE cardio/cadence/FTMS · GPS Android natif · Synchro Health Connect", soon: "BIENTÔT", trainingStatus: "ÉTAT D’ENTRAÎNEMENT", freshness: "Fraîcheur estimée", load7: "Charge 7 jours", load28: "Base hebdo 28 j", balanced: "ÉQUILIBRÉE", high: "ÉLEVÉE", low: "FAIBLE", indicative: "Indicateur basé sur tes sorties et ton ressenti, pas une mesure médicale.", program: "PROGRAMME ACTIF", noProgram: "Aucun programme actif", createProgram: "CRÉER UN PLAN", nextWorkout: "Prochaine séance", zones: "ZONES D’ALLURE", predictions: "PRÉDICTIONS DE COURSE", basedOn: "Basé sur tes meilleurs efforts GPS",
    }, {
        welcome: "Welcome", title: "RUNNING PERF", overview: "Overview", distance: "Distance", sessions: "Runs", best: "Best pace", climb: "Total climb", longest: "Longest", time: "Total time",
        start: "START ACTIVITY", free: "FREE ACTIVITY", freeSub: "GPS · map · stats · laps", easy: "EASY RUN", easySub: "30 easy min · aerobic base", intervals: "INTERVALS", intervalsSub: "6 × 1 min fast / 1 min easy", pacer: "PACER", pacerSub: "Target pace · ahead / behind", five: "5 KM", fiveSub: "Distance goal · best effort",
        coach: "SPORT COACH", weekGoal: "WEEKLY GOAL", thisWeek: "This week", previous: "vs previous week", streak: "Active streak", weeks: "weeks", days: "days", plan: "RECOMMENDATION", open: "OPEN",
        trend: "LAST 7 DAYS", month: "4-WEEK VOLUME", records: "BEST EFFORTS", recent: "RECENT RUNS", allRuns: "VIEW ALL", challenges: "CHALLENGES", threeRuns: "3 runs this week", goalChallenge: "Complete distance goal", devices: "WATCHES & SENSORS", devicesSub: "BLE HR/cadence/FTMS · native Android GPS · Health Connect sync", soon: "SOON", trainingStatus: "TRAINING STATUS", freshness: "Estimated freshness", load7: "7-day load", load28: "28-day weekly base", balanced: "BALANCED", high: "HIGH", low: "LOW", indicative: "Indicator based on your runs and feedback, not a medical measurement.", program: "ACTIVE PLAN", noProgram: "No active plan", createProgram: "CREATE PLAN", nextWorkout: "Next workout", zones: "PACE ZONES", predictions: "RACE PREDICTIONS", basedOn: "Based on your GPS best efforts",
    }, {
        welcome: "Bienvenido", title: "RUNNING PERF", overview: "Vista global", distance: "Distancia", sessions: "Carreras", best: "Mejor ritmo", climb: "D+ total", longest: "Más larga", time: "Tiempo total",
        start: "INICIA TU SALIDA", free: "SALIDA LIBRE", freeSub: "GPS · mapa · estadísticas · vueltas", easy: "EASY RUN", easySub: "30 min suaves · resistencia", intervals: "INTERVALOS", intervalsSub: "6 × 1 min rápido / 1 min suave", pacer: "PACER", pacerSub: "Ritmo objetivo · adelanto / retraso", five: "5 KM", fiveSub: "Objetivo de distancia · mejor esfuerzo",
        coach: "COACH SPORT", weekGoal: "OBJETIVO SEMANAL", thisWeek: "Esta semana", previous: "vs semana anterior", streak: "Racha activa", weeks: "semanas", days: "días", plan: "RECOMENDACIÓN", open: "ABRIR",
        trend: "RITMO DE LOS ÚLTIMOS 7 DÍAS", month: "VOLUMEN EN 4 SEMANAS", records: "MEJORES ESFUERZOS", recent: "ÚLTIMAS CARRERAS", allRuns: "VER TODO", challenges: "RETOS", threeRuns: "3 carreras esta semana", goalChallenge: "Completar el objetivo de distancia", devices: "RELOJES Y SENSORES", devicesSub: "BLE cardio/cadencia/FTMS · GPS Android nativo · Sincronización Health Connect", soon: "PRONTO", trainingStatus: "ESTADO DE ENTRENAMIENTO", freshness: "Frescura estimada", load7: "Carga 7 días", load28: "Base semanal 28 d", balanced: "EQUILIBRADA", high: "ALTA", low: "BAJA", indicative: "Indicador basado en tus carreras y sensaciones, no es una medida médica.", program: "PLAN ACTIVO", noProgram: "Sin plan activo", createProgram: "CREAR PLAN", nextWorkout: "Próxima sesión", zones: "ZONAS DE RITMO", predictions: "PREDICCIONES DE CARRERA", basedOn: "Basado en tus mejores esfuerzos GPS",
    });
    const recommendation = useMemo(() => {
        if (activitySport === "trail") return stats.weekSessions >= 2 ? { id: "long", icon: "⛰️", title: pickLegacyLocalizedText(lang, "SORTIE TRAIL LONGUE", "LONG TRAIL", "TRAIL LARGO"), text: pickLegacyLocalizedText(lang, "Endurance et D+ sur terrain naturel.", "Endurance and elevation on natural terrain.", "Resistencia y desnivel en terreno natural.") } : { id: "hills", icon: "⛰️", title: pickLegacyLocalizedText(lang, "CÔTES / TRAIL", "HILLS / TRAIL", "CUESTAS / TRAIL"), text: pickLegacyLocalizedText(lang, "Travaille la montée, la relance et la technique.", "Build climbing, turnover and trail technique.", "Trabaja subida, reactividad y técnica.") };
        if (activitySport === "hiking") return { id: stats.weekSessions ? "long" : "easy", icon: "🥾", title: pickLegacyLocalizedText(lang, "RANDONNÉE ENDURANCE", "ENDURANCE HIKE", "SENDERISMO DE RESISTENCIA"), text: pickLegacyLocalizedText(lang, "Privilégie le temps de mouvement et le dénivelé.", "Focus on moving time and elevation.", "Prioriza tiempo en movimiento y desnivel.") };
        if (activitySport === "walking") return { id: "easy", icon: "🚶", title: pickLegacyLocalizedText(lang, "MARCHE ACTIVE", "ACTIVE WALK", "CAMINATA ACTIVA"), text: pickLegacyLocalizedText(lang, "30 à 45 min régulières en aisance.", "30–45 steady comfortable minutes.", "30 a 45 min regulares y cómodos.") };
        if (activitySport === "treadmill") return stats.weekSessions >= 2 ? { id: "intervals", icon: "⚡", title: pickLegacyLocalizedText(lang, "INTERVALLES TAPIS", "TREADMILL INTERVALS", "INTERVALOS EN CINTA"), text: pickLegacyLocalizedText(lang, "Alterne vitesse et récupération sans dépendre du GPS.", "Alternate speed and recovery without GPS.", "Alterna velocidad y recuperación sin GPS.") } : { id: "easy", icon: "🏃‍♂️", title: pickLegacyLocalizedText(lang, "ENDURANCE TAPIS", "TREADMILL ENDURANCE", "RESISTENCIA EN CINTA"), text: pickLegacyLocalizedText(lang, "30 à 45 min régulières, mesure FTMS/footpod ou vitesse manuelle.", "30–45 steady minutes using FTMS, footpod or manual speed.", "30–45 min regulares con FTMS, footpod o velocidad manual.") };
        if (!stats.sessions)
            return { id: "easy", icon: "🌱", title: copy.easy, text: copy.easySub };
        const hours = stats.lastRun ? (Date.now() - stats.lastRun.startedAt) / 3600000 : 999;
        if (hours < 28)
            return { id: "easy", icon: "🫧", title: pickLegacyLocalizedText(lang, "RÉCUPÉRATION", "RECOVERY", "RECUPERACIÓN"), text: pickLegacyLocalizedText(lang, "20 min très faciles pour relancer sans charger.", "20 very easy minutes to recover.", "20 min muy suaves para recuperar.") };
        if (stats.weekSessions >= 3)
            return { id: "long", icon: "🛣️", title: pickLegacyLocalizedText(lang, "SORTIE LONGUE", "LONG RUN", "CARRERA LARGA"), text: pickLegacyLocalizedText(lang, "60 min en aisance pour développer l’endurance.", "60 easy minutes to build endurance.", "60 min suaves para desarrollar resistencia.") };
        return { id: "intervals", icon: "⚡", title: copy.intervals, text: copy.intervalsSub };
    }, [activitySport, copy.easy, copy.easySub, copy.intervals, copy.intervalsSub, lang, stats.lastRun, stats.sessions, stats.weekSessions]);
    const trainingStatus = useMemo(() => buildTrainingStatus(activities), [activities]);
    const raceGoalSnapshot = useMemo(() => raceGoal ? buildRunningRaceGoalSnapshot(raceGoal, stats) : null, [raceGoal, stats]);
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
    const tickers: ArcadeTickerItem[] = useMemo(() => {
        const rows: ArcadeTickerItem[] = [
            { id: "hero", title: `${outdoorSportLabel(canonicalSport, lang)} Performance`, text: `${(stats.weekDistanceM / 1000).toFixed(1)} km · ${stats.weekSessions} ${copy.sessions.toLowerCase()} · ${levelXp}/1000 XP`, detail: `${copy.streak}: ${stats.activeWeekStreak} ${copy.weeks}`, backgroundImage: tickerSvg("hero", accent), accentColor: accent },
            { id: "coach", title: `${copy.coach} · ${outdoorSportLabel(canonicalSport, lang).toUpperCase()}`, text: `${recommendation.title} — ${recommendation.text}`, detail: copy.plan, backgroundImage: tickerSvg("coach", accent), accentColor: accent },
        ];
        if (OUTDOOR_SPORT_PROFILES[canonicalSport].supportsPacer) rows.push({ id: "pacer", title: copy.pacer, text: copy.pacerSub, detail: pickLegacyLocalizedText(lang, "Rythme cible · projection · delta live", "Target pace · projection · live delta", "Ritmo objetivo · proyección · delta live"), backgroundImage: tickerSvg("pacer", accent), accentColor: accent });
        rows.push(speedPrimary
            ? { id: "records", title: copy.records, text: `${pickLegacyLocalizedText(lang, "Vitesse moyenne max", "Best average speed", "Mejor velocidad media")}: ${bestAverageSpeedKmh > 0 ? `${bestAverageSpeedKmh.toFixed(1)} km/h` : "—"} · ${copy.longest}: ${formatDistance(stats.longestM)}`, detail: pickLegacyLocalizedText(lang, "Repères adaptés à la discipline sélectionnée", "Metrics adapted to the selected sport", "Métricas adaptadas al deporte seleccionado"), backgroundImage: tickerSvg("records", accent), accentColor: accent }
            : { id: "records", title: copy.records, text: `1K ${stats.best1k ? formatDuration(stats.best1k.elapsedMs) : "—"} · 5K ${stats.best5k ? formatDuration(stats.best5k.elapsedMs) : "—"} · 10K ${stats.best10k ? formatDuration(stats.best10k.elapsedMs) : "—"}`, detail: pickLegacyLocalizedText(lang, "Meilleurs efforts calculés sur tous les tracés", "Best efforts across all routes", "Mejores esfuerzos calculados en todas las rutas"), backgroundImage: tickerSvg("records", accent), accentColor: accent });
        return rows;
    }, [accent, activitySport, bestAverageSpeedKmh, canonicalSport, copy.coach, copy.longest, copy.pacer, copy.pacerSub, copy.plan, copy.records, copy.sessions, copy.streak, copy.weeks, lang, levelXp, recommendation.text, recommendation.title, speedPrimary, stats.activeWeekStreak, stats.best10k, stats.best1k, stats.best5k, stats.longestM, stats.weekDistanceM, stats.weekSessions]);
    const profileSlides = [{ id: "running-records", title: `${outdoorSportLabel(canonicalSport, lang)} · ${copy.records}`, rows: speedPrimary ? [
                { label: pickLegacyLocalizedText(lang, "VITESSE MOY. MAX", "BEST AVG SPEED", "MEJOR VEL. MEDIA"), value: bestAverageSpeedKmh > 0 ? `${bestAverageSpeedKmh.toFixed(1)} km/h` : "—" },
                { label: copy.longest, value: formatDistance(stats.longestM) },
                { label: copy.time, value: formatDuration(stats.totalElapsedMs) },
                { label: copy.streak, value: `${stats.activeWeekStreak} ${copy.weeks}` },
            ] : [
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
    const currentSession = activeSessions.find((session) => !session.paused) || activeSessions[0] || null;
    const mainActionTitle = currentSession
        ? pickLegacyLocalizedText(lang, "REPRENDRE LA SESSION", "RESUME SESSION", "REANUDAR SESIÓN")
        : recommendation.title;
    const mainActionSub = currentSession
        ? `${currentSession.title} · ${formatDuration(runningActiveElapsedMs(currentSession))} · ${formatDistance(Number(currentSession.lastDistanceM || 0))}`
        : recommendation.text;
    const mainAction = () => currentSession
        ? go("games", { runningResumeSessionId: currentSession.id, runningActivitySport: currentSession.sport })
        : go("games", presetParams(recommendation.id, null, activitySport));
    const weekLabel = `${(stats.weekDistanceM / 1000).toFixed(1)} / ${weeklyGoalKm} km`;
    const bestMetricLabel = speedPrimary ? pickLegacyLocalizedText(lang, "Meilleure vitesse", "Best speed", "Mejor velocidad") : copy.best;
    const bestMetricValue = speedPrimary ? (bestAverageSpeedKmh > 0 ? `${bestAverageSpeedKmh.toFixed(1)} km/h` : "—") : `${formatPace(stats.bestPaceSecPerKm)} /km`;
    return <div className="running-page" style={{ minHeight: "100%", background: (theme as any).pageBackground || (theme as any).bg || "#05060C", color: "#FFFFFF", display: "flex", justifyContent: "center", padding: "16px 12px 96px", boxSizing: "border-box" }}>
    <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH }}>
      <style>{`@keyframes dcTitlePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}@keyframes dcTitleShimmer{0%{background-position:0% 0%}100%{background-position:200% 0%}}`}</style>

      <div style={{ borderRadius: 28, padding: 18, marginBottom: 14, background: "linear-gradient(135deg,rgba(8,10,20,.985),rgba(14,18,34,.985))", border: `1px solid ${(theme as any).borderSoft ?? "rgba(255,255,255,.10)"}`, boxShadow: "0 20px 40px rgba(0,0,0,.68)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <SportWelcomeWatermark sport="running" opacity={0.12} size={205} />
        <div style={{ position: "relative", zIndex: 2, display: "inline-flex", padding: "5px 18px", borderRadius: 999, border: `1px solid ${accent}`, background: "linear-gradient(135deg,rgba(0,0,0,.92),rgba(255,255,255,.055))", marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: accent }}>{copy.welcome}</span></div>
        <div ref={wrapRef} style={{ position: "relative", zIndex: 2, width: "100%", overflow: "hidden" }}><div ref={textRef} style={{ width: "fit-content", marginInline: "auto", fontSize: 32, fontWeight: 900, letterSpacing: 3, textAlign: "center", textTransform: "uppercase", whiteSpace: "nowrap", backgroundImage: `linear-gradient(120deg,${accent},#fff,${accent})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", color: "transparent", animation: "dcTitlePulse 3.6s ease-in-out infinite,dcTitleShimmer 7s linear infinite", transform: `scale(${scale})`, transformOrigin: "center" }}>{copy.title}</div></div>
      </div>

      {/* PUB 1 — même logique inline/scroll que DARTS SCORING. */}
      <InlineAdBanner
        placement="home"
        slotKey="home-top"
        offset={0}
        compact
        style={{ marginBottom: 16 }}
      />

      <div style={sectionWrap}><OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={lang} accent={accent}/></div>

      <div style={sectionWrap}>{activeProfile ? <ActiveProfileCard hideStatus hideStarRing profile={activeProfile as any} stats={{} as any} suppressDefaultStatsSlides customSlides={profileSlides as any} globalTitle={`${outdoorSportLabel(activitySport, lang)} · ${copy.overview}`} globalKpis={[
        { label: copy.distance, value: formatDistance(stats.totalDistanceM) }, { label: copy.sessions, value: stats.sessions }, { label: bestMetricLabel, value: bestMetricValue }, { label: copy.climb, value: `+${Math.round(stats.totalElevationM)} m` }, { label: copy.longest, value: formatDistance(stats.longestM) }, { label: copy.time, value: formatDuration(stats.totalElapsedMs) },
      ]}/> : null}</div>

      {/* PUB 2 — suit le bloc profil et se recale avec le scroll comme sur DARTS. */}
      {activeProfile ? (
        <InlineAdBanner
          placement="home_secondary"
          slotKey="home-player"
          offset={2}
          compact
          style={{ marginTop: 12, marginBottom: 14 }}
        />
      ) : null}

      <div style={{ ...sectionWrap, marginTop: 12 }}>
        <RunningActionTile
          featured
          accent={accent}
          onClick={mainAction}
          icon={<RunningGlyph name={currentSession ? "recover" : activitySport === "trail" ? "sport-trail" : activitySport === "hiking" ? "sport-hiking" : activitySport === "walking" ? "sport-walking" : activitySport === "treadmill" ? "sport-treadmill" : "sport-running"} size={24}/>}
          title={mainActionTitle}
          subtitle={mainActionSub}
          meta={currentSession ? <span style={{ padding: "4px 7px", borderRadius: 999, border: "1px solid rgba(109,255,157,.30)", color: "#6dff9d", fontSize: 7, fontWeight: 1000 }}>{currentSession.paused ? "PAUSE" : "EN COURS"}</span> : <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${accent}30`, color: accent, fontSize: 7, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "AUJOURD'HUI", "TODAY", "HOY")}</span>}
        />
      </div>

      {activities[0] ? <div style={{ ...sectionWrap, marginTop: 10 }}><button type="button" onClick={() => go("games", { runningActivityId: activities[0].id, runningActivitySport: canonicalOutdoorPerformanceSport(activities[0].sport) })} style={{ width: "100%", display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: 11, borderRadius: 17, border: `1px solid ${accent}42`, background: `linear-gradient(135deg,${accent}12,rgba(5,8,13,.88))`, color: "#fff", textAlign: "left", cursor: "pointer", boxShadow: `0 12px 28px ${accent}0d` }}><span style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}35`, color: accent }}><RunningGlyph name="history" size={20}/></span><span style={{ minWidth: 0 }}><small style={{ display: "block", color: accent, fontSize: 7.3, fontWeight: 1000, letterSpacing: .8 }}>{pickLegacyLocalizedText(lang, "DERNIÈRE SORTIE", "LAST ACTIVITY", "ÚLTIMA SALIDA")}</small><b style={{ display: "block", marginTop: 2, fontSize: 11.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{outdoorSportLabel(canonicalOutdoorPerformanceSport(activities[0].sport), lang)} · {formatDistance(activities[0].distanceM)}</b><small style={{ display: "block", marginTop: 2, color: textSoft, fontSize: 8.2 }}>{new Date(activities[0].startedAt).toLocaleDateString(localeForLang(lang))} · {formatDuration(activities[0].elapsedMs)} · {outdoorAverageMetricValue(activities[0], canonicalOutdoorPerformanceSport(activities[0].sport))}</small></span><span style={{ color: accent, fontSize: 21 }}>›</span></button></div> : null}

      <div style={{ ...sectionWrap, marginTop: 10 }}><RunningSurface accent={accent} padding={12}>
        <RunningSectionHeading eyebrow={pickLegacyLocalizedText(lang, "CETTE SEMAINE", "THIS WEEK", "ESTA SEMANA")} title={pickLegacyLocalizedText(lang, "Ton rythme en un coup d'œil", "Your week at a glance", "Tu semana de un vistazo")} action={<button className="btn" onClick={() => go("stats")} style={{ minHeight: 30, padding: "4px 8px", fontSize: 7.8, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "DÉTAILS", "DETAILS", "DETALLES")}</button>}/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
          <RunningStatusChip icon={<RunningGlyph name="distance" size={12}/>} label={pickLegacyLocalizedText(lang, "OBJECTIF", "GOAL", "OBJETIVO")} value={weekLabel} accent={accent}/>
          <RunningStatusChip icon={<RunningGlyph name="spark" size={12}/>} label={pickLegacyLocalizedText(lang, "PRÉPARATION", "READINESS", "PREPARACIÓN")} value={`${trainingStatus.freshnessScore}%`} accent={trainingStatus.freshnessScore >= 70 ? "#71ff9a" : trainingStatus.freshnessScore >= 45 ? accent : "#ff8a67"}/>
          <RunningStatusChip icon={<RunningGlyph name="history" size={12}/>} label={copy.streak} value={`${stats.activeWeekStreak} ${copy.weeks}`} accent={stats.activeWeekStreak ? "#71ff9a" : accent}/>
        </div>
        <Progress value={goalPct} accent={accent}/>
      </RunningSurface></div>

      <div style={{ ...sectionWrap, marginTop: 12 }}>
        <RunningSectionHeading eyebrow={pickLegacyLocalizedText(lang, "ACCÈS RAPIDE", "QUICK ACCESS", "ACCESO RÁPIDO")} title={pickLegacyLocalizedText(lang, "Choisis ton prochain geste", "Choose your next step", "Elige tu siguiente paso")}/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <RunningActionTile accent={accent} onClick={() => go("games", presetParams("goal-free", null, activitySport))} icon={<RunningGlyph name="play" size={20}/>} title={pickLegacyLocalizedText(lang, "DÉMARRER", "START", "INICIAR")} subtitle={pickLegacyLocalizedText(lang, "Libre · objectif au choix", "Free · choose a goal", "Libre · elige un objetivo")}/>
          <RunningActionTile accent={accent} onClick={() => go("running_plan")} icon={<RunningGlyph name="training" size={20}/>} title={pickLegacyLocalizedText(lang, "PLAN", "PLAN", "PLAN")} subtitle={activePlan ? `${pickLegacyLocalizedText(lang, "Progression", "Progress", "Progreso")} ${planCompletion}%` : pickLegacyLocalizedText(lang, "Créer un programme", "Create a plan", "Crear un plan")}/>
          <RunningActionTile accent={accent} onClick={() => go("stats", { runningStatsTab: "history" })} icon={<RunningGlyph name="history" size={20}/>} title={pickLegacyLocalizedText(lang, "JOURNAL", "JOURNAL", "DIARIO")} subtitle={activities.length ? `${activities.length} ${copy.sessions.toLowerCase()}` : pickLegacyLocalizedText(lang, "Aucune sortie", "No activity yet", "Sin actividad")}/>
          <RunningActionTile accent={accent} onClick={() => go("stats")} icon={<RunningGlyph name="chart" size={20}/>} title={pickLegacyLocalizedText(lang, "ANALYSE", "ANALYSIS", "ANÁLISIS")} subtitle={pickLegacyLocalizedText(lang, "Records · forme · terrain", "Records · fitness · terrain", "Récords · forma · terreno")}/>
        </div>
      </div>

      {activitySport === "running" ? <div style={{ ...sectionWrap, marginTop: 12 }}><RunningSurface accent={accent} padding={12}>
        <RunningSectionHeading eyebrow={pickLegacyLocalizedText(lang, "OBJECTIF", "GOAL", "OBJETIVO")} title={raceGoalSnapshot ? `${distanceGoalLabel(raceGoalSnapshot.goal.distanceM)} · J−${raceGoalSnapshot.daysLeft}` : pickLegacyLocalizedText(lang, "Donne une date à ta progression", "Give your progress a date", "Pon fecha a tu progreso")} action={<button className="btn" onClick={() => go("running_plan", { focus: "goal" })} style={{ minHeight: 30, padding: "4px 8px", fontSize: 7.8, fontWeight: 1000 }}>{raceGoalSnapshot ? pickLegacyLocalizedText(lang, "GÉRER", "MANAGE", "GESTIONAR") : pickLegacyLocalizedText(lang, "CRÉER", "CREATE", "CREAR")}</button>}/>
        {raceGoalSnapshot ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><RunningStatusChip label={pickLegacyLocalizedText(lang, "CHRONO", "TIME", "TIEMPO")} value={formatDuration(raceGoalSnapshot.goal.targetTimeMs)} accent={accent}/><RunningStatusChip label={pickLegacyLocalizedText(lang, "ALLURE", "PACE", "RITMO")} value={`${formatPace(raceGoalSnapshot.targetPaceSecPerKm)}/km`} accent={accent}/><RunningStatusChip label={pickLegacyLocalizedText(lang, "PRÊT", "READY", "LISTO")} value={`${raceGoalSnapshot.readinessPct ?? 0}%`} accent={accent}/></div> : <div style={{ fontSize: 8.8, color: textSoft, lineHeight: 1.5 }}>{pickLegacyLocalizedText(lang, "5K · 10K · Semi · Marathon avec date et chrono cible.", "5K · 10K · Half · Marathon with date and target time.", "5K · 10K · Media · Maratón con fecha y tiempo objetivo.")}</div>}
      </RunningSurface></div> : null}

      <div style={{ ...sectionWrap, marginTop: 12 }}><ArcadeTicker items={tickers} activeIndex={tickerIndex} onIndexChange={setTickerIndex} intervalMs={7000}/></div>

      {activities.length ? <div style={{ ...sectionWrap, marginTop: 12 }}><RunningSurface accent={accent} padding={12}><RunningSectionHeading eyebrow={pickLegacyLocalizedText(lang, "JOURNAL", "JOURNAL", "DIARIO")} title={copy.recent} action={<button className="btn" style={{ minHeight: 30, fontSize: 8 }} onClick={() => go("stats", { runningStatsTab: "history" })}>{copy.allRuns}</button>}/><div style={{ display: "grid", gap: 7 }}>{activities.slice(0, 2).map((a) => <RecentRun key={a.id} activity={a} accent={accent} textSoft={textSoft} lang={lang} onClick={() => go("games", { runningActivityId: a.id, runningActivitySport: canonicalOutdoorPerformanceSport(a.sport) })}/>)}</div></RunningSurface></div> : null}
    </div>
  </div>;
}

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
function TrainingKpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", textAlign: "center" }}><div style={{ fontSize: 8.2, opacity: .58, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000, color: accent }}>{value}</div></div>; }
function RecentRun({ activity, accent, textSoft, lang, onClick }: {
    activity: ActivityRecord;
    accent: string;
    textSoft: string;
    lang: string;
    onClick: () => void;
}) {
    const sport = canonicalOutdoorPerformanceSport(activity.sport);
    const glyph = sport === "trail" ? "sport-trail" : sport === "hiking" ? "sport-hiking" : sport === "walking" ? "sport-walking" : sport === "treadmill" ? "sport-treadmill" : "sport-running";
    return <button type="button" onClick={onClick} style={{ width: "100%", display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center", padding: 9, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", color: "#fff", textAlign: "left", cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}2e` }}><RunningGlyph name={glyph as any} size={18}/></div>
        <div><div style={{ color: accent, fontSize: 7.5, fontWeight: 1000 }}>{outdoorSportLabel(sport, lang).toUpperCase()}</div><b style={{ fontSize: 10.5 }}>{formatDistance(activity.distanceM)}</b><div style={{ color: textSoft, fontSize: 9, marginTop: 2 }}>{new Date(activity.startedAt).toLocaleDateString()} · {formatDuration(activity.elapsedMs)}</div></div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 1000, textAlign: "right" }}>{outdoorAverageMetricValue(activity, sport)}<small style={{ display: "block", fontSize: 7 }}>{outdoorAverageMetricLabel(sport, lang)}</small><span style={{ display: "block", marginTop: 4, fontSize: 15 }}>›</span></div>
    </button>;
}

function PerformanceRing({ value, accent, label }: { value: number; accent: string; label: string }) { return <div style={{ width: 88, height: 88, borderRadius: 999, display: "grid", placeItems: "center", background: `conic-gradient(${accent} ${Math.max(0, Math.min(100, value))}%,rgba(255,255,255,.07) 0)`, boxShadow: `0 0 25px ${accent}20` }}><div style={{ width: 70, height: 70, borderRadius: 999, display: "grid", placeItems: "center", alignContent: "center", background: "rgba(5,7,12,.96)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><b style={{ color: accent, fontSize: 21, lineHeight: 1 }}>{value}</b><span style={{ marginTop: 3, fontSize: 7, opacity: .55, fontWeight: 1000 }}>{label}</span></div></div>; }
function PulseKpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ minWidth: 0, padding: "8px 7px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 7, opacity: .52, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000, color: accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }
const goalBtn: React.CSSProperties = { width: 30, minWidth: 30, minHeight: 30, padding: 0, borderRadius: 9, fontWeight: 1000 };
