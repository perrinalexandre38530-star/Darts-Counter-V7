import { localeForLang, pickLegacyBilingualText, pickLegacyLocalizedText, pickLegacyLocalizedValue } from "../../i18n/legacyLocalizedText";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ActiveProfileCard, { type ActiveProfileStats } from "../../components/home/ActiveProfileCard";
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
import runningDisciplineAwenaImg from "../../assets/running/home_actions/running_discipline_awena.png";
import runningSessionTimerImg from "../../assets/running/home_actions/running_session_timer.png";
import runningRecommendationBadgeImg from "../../assets/running/home_actions/running_recommendation_badge.png";
import runningGoalTargetImg from "../../assets/running/home_actions/running_goal_target.png";
import runningRoutesMapImg from "../../assets/running/home_actions/running_routes_map.png";
import runningCoachTrainingImg from "../../assets/running/home_actions/running_coach_training.png";
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
function profileAvatarSrc(profile: any) {
    return profile?.avatarUrl || profile?.avatarUri || profile?.avatarDataUrl || profile?.photoUrl || profile?.imageUrl || "";
}
function profileInitials(profile: any) {
    const source = String(profile?.name || profile?.displayName || profile?.pseudo || profile?.username || "Joueur").trim();
    const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
    return (parts.map((part) => part[0]).join("") || "J").toUpperCase();
}
function RunningProfileBadge({ profile, accent, textSoft }: { profile: any; accent: string; textSoft: string }) {
    const name = String(profile?.name || profile?.displayName || profile?.pseudo || profile?.username || "Joueur actif");
    const avatar = profileAvatarSrc(profile);
    return <div style={{ display: "inline-grid", gridTemplateColumns: "auto 1fr", gap: 8, alignItems: "center", padding: "7px 10px", borderRadius: 15, background: "rgba(5,8,13,.74)", border: `1px solid ${accent}2f`, boxShadow: `0 10px 24px ${accent}14`, backdropFilter: "blur(10px)" }}>
      {avatar ? <img src={avatar} alt={name} style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover", border: `2px solid ${accent}7a`, background: "#0b1018" }}/> : <div style={{ width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", color: accent, fontSize: 12, fontWeight: 1000, border: `2px solid ${accent}7a`, background: `${accent}14` }}>{profileInitials(profile)}</div>}
      <div style={{ minWidth: 0 }}><div style={{ color: "rgba(255,255,255,.52)", fontSize: 6.7, fontWeight: 1000, letterSpacing: .8 }}>JOUEUR ACTIF</div><div style={{ color: "#fff", fontSize: 9.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{name}</div><div style={{ color: textSoft, fontSize: 7.2, whiteSpace: "nowrap" }}>MULTISPORTS SCORING</div></div>
    </div>;
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
type RunningTickerVisual = "hero" | "coach" | "goal" | "records" | "streak" | "load" | "plan" | "next" | "routes" | "gps" | "community" | "gear" | "pacer";

function runningStartTileSvg(kind: "discipline" | "session" | "recommendation" | "goal" | "routes" | "coach", accent: string) {
    const glyphs: Record<string, string> = {
        discipline: `<circle cx="74" cy="52" r="16"/><path d="M70 71l-18 25 24 13 17-18 21 7M76 80l28-14 18 11M54 96l-18 27M77 108l12 31"/>`,
        session: `<circle cx="80" cy="83" r="42"/><path d="M80 83V55M80 83l23 14M63 25h34M80 25v15"/>`,
        recommendation: `<path d="M84 20 49 83h29l-9 57 43-73H83z"/>`,
        goal: `<circle cx="80" cy="80" r="50"/><circle cx="80" cy="80" r="31"/><circle cx="80" cy="80" r="12"/><path d="m92 68 34-34M112 34h14v14"/>`,
        routes: `<path d="M35 126c20-50 31-68 54-50 18 14 10 31 31 24 12-4 14-18 6-31"/><circle cx="35" cy="126" r="8"/><path d="M126 29c-17 0-29 12-29 28 0 24 29 49 29 49s29-25 29-49c0-16-12-28-29-28z"/><circle cx="126" cy="57" r="9"/>`,
        coach: `<path d="M29 48h58l22 17-22 17H29zM109 65h18l21-15v30l-21-15M47 82v43M72 82l18 43"/>`,
    };
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="130" viewBox="0 0 180 150"><defs><radialGradient id="g" cx="78%" cy="22%" r="90%"><stop offset="0" stop-color="${accent}" stop-opacity=".34"/><stop offset="1" stop-color="#050811" stop-opacity=".98"/></radialGradient></defs><rect width="180" height="150" rx="20" fill="url(#g)"/><g fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".72">${glyphs[kind]}</g></svg>`);
}
function tickerSvg(kind: RunningTickerVisual, accent: string) {
    const c: Record<RunningTickerVisual, [string, string, string, string]> = {
        hero: ["PERFORMANCE", "BOUGE.", "PROGRESSE.", "KM"],
        coach: ["COACH", "UN PLAN.", "UNE MISSION.", "AI"],
        goal: ["OBJECTIF", "CETTE SEMAINE", "VA AU BOUT.", "%"],
        records: ["RECORDS", "CHAQUE KM", "PEUT COMPTER", "PR"],
        streak: ["REGULARITE", "ENCHAINE.", "GARDE LE CAP.", "7J"],
        load: ["RECUPERATION", "CHARGE.", "FRAICHEUR.", "REC"],
        plan: ["PROGRAMME", "PLANIFIE.", "PROGRESSE.", "PLAN"],
        next: ["PROCHAINE", "SEANCE.", "PREPARE-TOI.", "NEXT"],
        routes: ["PARCOURS", "CARTE 2D/3D", "RELIEF + D+.", "MAP"],
        gps: ["GPS", "TRACE FIABLE.", "SORTIE SAUVEE.", "GPS"],
        community: ["COMMUNAUTE", "COURS ENSEMBLE.", "PARTAGE.", "TEAM"],
        gear: ["CAPTEURS", "MONTRES.", "HEALTH CONNECT.", "SYNC"],
        pacer: ["PACER", "GARDE TON", "RYTHME CIBLE", "+/-"],
    };
    const row = c[kind];
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360"><defs><radialGradient id="b" cx="72%" cy="28%" r="86%"><stop offset="0" stop-color="${accent}" stop-opacity=".24"/><stop offset=".46" stop-color="#111722"/><stop offset="1" stop-color="#05070d"/></radialGradient></defs><rect width="1200" height="360" fill="url(#b)"/><path d="M0 300 C160 240 320 330 500 265 C700 192 824 110 1200 206" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="4"/><circle cx="930" cy="180" r="112" fill="none" stroke="${accent}" stroke-opacity=".32" stroke-width="3"/><text x="930" y="202" text-anchor="middle" font-family="Arial" font-size="58" font-weight="900" fill="${accent}">${row[3]}</text><text x="70" y="92" font-family="Arial" font-size="24" font-weight="900" letter-spacing="5" fill="${accent}">${row[0]}</text><text x="70" y="170" font-family="Arial" font-size="57" font-weight="900" fill="#fff">${row[1]}</text><text x="70" y="232" font-family="Arial" font-size="48" font-weight="900" fill="#fff" opacity=".82">${row[2]}</text></svg>`);
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
    const [homePage, setHomePage] = useState(0);
    const homePagerRef = useRef<HTMLDivElement | null>(null);
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
        const sportName = outdoorSportLabel(canonicalSport, lang);
        const weekKm = (stats.weekDistanceM / 1000).toFixed(1);
        const goalProgress = Math.round(Math.min(100, stats.weekDistanceM / Math.max(1, weeklyGoalKm * 1000) * 100));
        const loadRatio = trainingStatus.loadRatio == null ? "—" : trainingStatus.loadRatio.toFixed(2);
        const nextWorkoutText = nextWorkout
            ? `${nextWorkout.title} · ${new Date(nextWorkout.scheduledAt).toLocaleDateString(localeForLang(lang), { weekday: "short", day: "2-digit", month: "2-digit" })}`
            : activePlan
                ? pickLegacyLocalizedText(lang, "Prochaine séance à replanifier", "Next workout to reschedule", "Próxima sesión por reprogramar")
                : pickLegacyLocalizedText(lang, "Crée un plan adapté à ton objectif", "Create a plan for your goal", "Crea un plan para tu objetivo");
        const rows: ArcadeTickerItem[] = [
            {
                id: "running-performance",
                title: `${sportName} Performance`,
                text: `${weekKm} km · ${stats.weekSessions} ${copy.sessions.toLowerCase()} · ${levelXp}/1000 XP`,
                detail: `${copy.streak}: ${stats.activeWeekStreak} ${copy.weeks}`,
                backgroundImage: tickerSvg("hero", accent),
                accentColor: accent,
            },
            {
                id: "running-coach",
                title: `${copy.coach} · ${sportName.toUpperCase()}`,
                text: `${recommendation.title} — ${recommendation.text}`,
                detail: pickLegacyLocalizedText(lang, "Conseil adapté à ton activité récente", "Advice adapted to your recent activity", "Consejo adaptado a tu actividad reciente"),
                backgroundImage: tickerSvg("coach", accent),
                accentColor: accent,
            },
            {
                id: "running-week-goal",
                title: copy.weekGoal,
                text: `${weekKm} / ${weeklyGoalKm} km · ${goalProgress}% ${pickLegacyLocalizedText(lang, "de l'objectif", "of target", "del objetivo")}`,
                detail: goalProgress >= 100
                    ? pickLegacyLocalizedText(lang, "Objectif atteint — tu peux consolider ou augmenter progressivement.", "Goal reached — consolidate or increase progressively.", "Objetivo cumplido — consolida o aumenta progresivamente.")
                    : pickLegacyLocalizedText(lang, "Chaque sortie fait avancer la jauge hebdomadaire.", "Every activity moves the weekly gauge forward.", "Cada salida hace avanzar el objetivo semanal."),
                backgroundImage: tickerSvg("goal", accent),
                accentColor: accent,
            },
            {
                id: "running-records",
                title: copy.records,
                text: speedPrimary
                    ? `${pickLegacyLocalizedText(lang, "Vitesse moyenne max", "Best average speed", "Mejor velocidad media")}: ${bestAverageSpeedKmh > 0 ? `${bestAverageSpeedKmh.toFixed(1)} km/h` : "—"} · ${copy.longest}: ${formatDistance(stats.longestM)}`
                    : `1K ${stats.best1k ? formatDuration(stats.best1k.elapsedMs) : "—"} · 5K ${stats.best5k ? formatDuration(stats.best5k.elapsedMs) : "—"} · 10K ${stats.best10k ? formatDuration(stats.best10k.elapsedMs) : "—"}`,
                detail: pickLegacyLocalizedText(lang, "Tes meilleurs efforts sont recalculés automatiquement après chaque sortie.", "Your best efforts are recalculated after every activity.", "Tus mejores esfuerzos se recalculan tras cada salida."),
                backgroundImage: tickerSvg("records", accent),
                accentColor: accent,
            },
            {
                id: "running-streak",
                title: pickLegacyLocalizedText(lang, "RÉGULARITÉ", "CONSISTENCY", "REGULARIDAD"),
                text: `${stats.activeWeekStreak} ${copy.weeks} · ${stats.activeDayStreak} ${copy.days} ${pickLegacyLocalizedText(lang, "de série active", "active streak", "de racha activa")}`,
                detail: pickLegacyLocalizedText(lang, "La régularité compte davantage qu'une seule grosse séance.", "Consistency matters more than one huge workout.", "La regularidad importa más que una sola sesión enorme."),
                backgroundImage: tickerSvg("streak", accent),
                accentColor: accent,
            },
            {
                id: "running-recovery",
                title: copy.trainingStatus,
                text: `${copy.freshness}: ${trainingStatus.freshnessScore}% · ${copy.load7}: ${trainingStatus.acuteLoad7} · ratio ${loadRatio}`,
                detail: trainingStatus.loadLabel === "high"
                    ? pickLegacyLocalizedText(lang, "Charge élevée : privilégie une séance facile ou la récupération.", "High load: favor an easy workout or recovery.", "Carga alta: prioriza una sesión suave o recuperación.")
                    : trainingStatus.loadLabel === "low"
                        ? pickLegacyLocalizedText(lang, "Charge faible : bon moment pour reprendre progressivement.", "Low load: a good time to build back progressively.", "Carga baja: buen momento para retomar progresivamente.")
                        : pickLegacyLocalizedText(lang, "Charge équilibrée : continue sans augmenter brutalement le volume.", "Balanced load: keep going without sudden volume jumps.", "Carga equilibrada: continúa sin aumentar el volumen bruscamente."),
                backgroundImage: tickerSvg("load", accent),
                accentColor: accent,
            },
            {
                id: "running-plan",
                title: copy.program,
                text: activePlan
                    ? `${pickLegacyLocalizedText(lang, "Semaine", "Week", "Semana")} ${currentPlanWeek}/${planDurationWeeks(activePlan)} · ${planCompletion}% ${pickLegacyLocalizedText(lang, "terminé", "complete", "completado")}`
                    : copy.noProgram,
                detail: activePlan
                    ? pickLegacyLocalizedText(lang, "Le plan se recalcule à partir des séances réellement enregistrées.", "The plan follows the workouts you actually complete.", "El plan sigue las sesiones realmente completadas.")
                    : copy.createProgram,
                backgroundImage: tickerSvg("plan", accent),
                accentColor: accent,
            },
            {
                id: "running-next-workout",
                title: copy.nextWorkout,
                text: nextWorkoutText,
                detail: nextWorkout?.subtitle || pickLegacyLocalizedText(lang, "Prépare ta prochaine séance sans quitter RUNNING PERF.", "Prepare your next workout without leaving RUNNING PERF.", "Prepara tu próxima sesión sin salir de RUNNING PERF."),
                backgroundImage: tickerSvg("next", accent),
                accentColor: accent,
            },
            {
                id: "running-routes",
                title: pickLegacyLocalizedText(lang, "PARCOURS 2D / 3D", "2D / 3D ROUTES", "RUTAS 2D / 3D"),
                text: pickLegacyLocalizedText(lang, "Explore les tracés, le relief, le D+, l'altitude et les points d'intérêt avant de partir.", "Explore routes, terrain, elevation gain, altitude and POIs before you go.", "Explora rutas, relieve, desnivel, altitud y puntos de interés antes de salir."),
                detail: pickLegacyLocalizedText(lang, "Carte tactile · zoom · inclinaison · profil altimétrique", "Touch map · zoom · tilt · elevation profile", "Mapa táctil · zoom · inclinación · perfil de altitud"),
                backgroundImage: tickerSvg("routes", accent),
                accentColor: accent,
            },
            {
                id: "running-gps",
                title: pickLegacyLocalizedText(lang, "GPS & SAUVEGARDE", "GPS & SAVING", "GPS Y GUARDADO"),
                text: pickLegacyLocalizedText(lang, "Position précise, tracé progressif et récupération de session protègent ta sortie.", "Precise location, progressive route saving and session recovery protect your activity.", "Ubicación precisa, guardado progresivo y recuperación protegen tu salida."),
                detail: pickLegacyLocalizedText(lang, "Vérifie toujours le GPS avant le départ.", "Always check GPS before starting.", "Comprueba siempre el GPS antes de empezar."),
                backgroundImage: tickerSvg("gps", accent),
                accentColor: accent,
            },
            {
                id: "running-community",
                title: pickLegacyLocalizedText(lang, "COMMUNAUTÉ RUNNING", "RUNNING COMMUNITY", "COMUNIDAD RUNNING"),
                text: pickLegacyLocalizedText(lang, "Retrouve tes amis, partenaires de sortie et performances partagées dans l'écosystème MULTISPORTS SCORING.", "Find friends, activity partners and shared performances across MULTISPORTS SCORING.", "Encuentra amigos, compañeros de salida y rendimientos compartidos en MULTISPORTS SCORING."),
                detail: pickLegacyLocalizedText(lang, "Courir seul ou ensemble, tout reste lié à ton profil sportif.", "Run solo or together, everything stays linked to your sports profile.", "Corre solo o acompañado: todo queda vinculado a tu perfil deportivo."),
                backgroundImage: tickerSvg("community", accent),
                accentColor: accent,
            },
            {
                id: "running-devices",
                title: copy.devices,
                text: copy.devicesSub,
                detail: pickLegacyLocalizedText(lang, "Centralise progressivement tes données d'activité et capteurs.", "Gradually centralize activity and sensor data.", "Centraliza progresivamente tus datos de actividad y sensores."),
                backgroundImage: tickerSvg("gear", accent),
                accentColor: accent,
            },
        ];
        if (OUTDOOR_SPORT_PROFILES[canonicalSport].supportsPacer) {
            rows.splice(4, 0, {
                id: "running-pacer",
                title: copy.pacer,
                text: copy.pacerSub,
                detail: pickLegacyLocalizedText(lang, "Allure cible · projection d'arrivée · avance / retard en direct", "Target pace · projected finish · live ahead / behind", "Ritmo objetivo · llegada proyectada · adelanto / retraso en directo"),
                backgroundImage: tickerSvg("pacer", accent),
                accentColor: accent,
            });
        }
        return rows;
    }, [accent, activePlan, bestAverageSpeedKmh, canonicalSport, copy.coach, copy.createProgram, copy.days, copy.devices, copy.devicesSub, copy.freshness, copy.load7, copy.longest, copy.nextWorkout, copy.noProgram, copy.pacer, copy.pacerSub, copy.program, copy.records, copy.sessions, copy.streak, copy.trainingStatus, copy.weekGoal, copy.weeks, currentPlanWeek, lang, levelXp, nextWorkout, planCompletion, recommendation.text, recommendation.title, speedPrimary, stats.activeDayStreak, stats.activeWeekStreak, stats.best10k, stats.best1k, stats.best5k, stats.longestM, stats.weekDistanceM, stats.weekSessions, trainingStatus, weeklyGoalKm]);
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
    const runningGlobalKpis = [
        { label: copy.distance.toLowerCase(), value: `${(stats.totalDistanceM / 1000).toFixed(1)} km` },
        { label: copy.sessions.toLowerCase(), value: String(stats.sessions) },
        { label: bestMetricLabel.toLowerCase(), value: bestMetricValue },
        { label: copy.climb.toLowerCase(), value: `${Math.round(stats.totalElevationM)} m` },
        { label: copy.longest.toLowerCase(), value: formatDistance(stats.longestM) },
        { label: copy.time.toLowerCase(), value: formatDuration(stats.totalElapsedMs) },
    ];
    const nextWorkoutValue = nextWorkout
        ? `${nextWorkout.title || pickLegacyLocalizedText(lang, "Séance", "Workout", "Sesión")}`
        : activePlan
            ? pickLegacyLocalizedText(lang, "À planifier", "To schedule", "Por planificar")
            : pickLegacyLocalizedText(lang, "Aucun programme", "No plan", "Sin plan");
    const recentActivity = activities[0] || null;
    const openDisciplineSetup = () => go("games", { runningActivitySport: activitySport });
    const openSession = () => currentSession
        ? go("games", { runningResumeSessionId: currentSession.id, runningActivitySport: currentSession.sport })
        : go("games", { runningActivitySport: activitySport });
    const openRecommendation = () => mainAction();
    const openGoal = () => go("running_plan", { runningPlanTab: "goal", runningActivitySport: activitySport });
    const openRoutes = () => go("games", { runningActivitySport: activitySport, runningOpenRoutes: true });
    const openCoach = () => go("running_plan", { runningPlanTab: "program", runningActivitySport: activitySport });
    const runningSlides = [
        {
            id: "running-start",
            title: pickLegacyLocalizedText(lang, "DÉMARRER", "START", "EMPEZAR"),
            rows: [
                { label: pickLegacyLocalizedText(lang, "Discipline", "Sport", "Disciplina"), value: outdoorSportLabel(canonicalSport, lang), onClick: openDisciplineSetup, tileImage: runningDisciplineAwenaImg, ariaLabel: pickLegacyLocalizedText(lang, "Choisir la discipline", "Choose sport", "Elegir deporte") },
                { label: pickLegacyLocalizedText(lang, "Session", "Session", "Sesión"), value: currentSession ? (currentSession.paused ? pickLegacyLocalizedText(lang, "Reprendre la sortie", "Resume activity", "Reanudar salida") : pickLegacyLocalizedText(lang, "Sortie en cours", "Activity in progress", "Salida en curso")) : pickLegacyLocalizedText(lang, "Nouvelle sortie", "New activity", "Nueva salida"), onClick: openSession, tileImage: runningSessionTimerImg, ariaLabel: pickLegacyLocalizedText(lang, "Ouvrir la session", "Open session", "Abrir sesión") },
                { label: pickLegacyLocalizedText(lang, "Recommandation", "Recommendation", "Recomendación"), value: recommendation.title, onClick: openRecommendation, tileImage: runningRecommendationBadgeImg, ariaLabel: pickLegacyLocalizedText(lang, "Lancer la recommandation", "Start recommendation", "Iniciar recomendación") },
                { label: pickLegacyLocalizedText(lang, "Objectif", "Goal", "Objetivo"), value: weekLabel, onClick: openGoal, tileImage: runningGoalTargetImg, ariaLabel: pickLegacyLocalizedText(lang, "Ouvrir les objectifs", "Open goals", "Abrir objetivos") },
                { label: pickLegacyLocalizedText(lang, "Parcours", "Routes", "Rutas"), value: pickLegacyLocalizedText(lang, "Explorer les parcours", "Explore routes", "Explorar rutas"), onClick: openRoutes, tileImage: runningRoutesMapImg, ariaLabel: pickLegacyLocalizedText(lang, "Explorer les parcours", "Explore routes", "Explorar rutas") },
                { label: pickLegacyLocalizedText(lang, "Coach", "Coach", "Coach"), value: pickLegacyLocalizedText(lang, "Plans et conseils", "Plans and tips", "Planes y consejos"), onClick: openCoach, tileImage: runningCoachTrainingImg, ariaLabel: pickLegacyLocalizedText(lang, "Ouvrir le coach", "Open coach", "Abrir coach") },
            ],
        },
        {
            id: "running-progress",
            title: pickLegacyLocalizedText(lang, "PROGRESSION", "PROGRESS", "PROGRESO"),
            rows: [
                { label: copy.weekGoal.toLowerCase(), value: weekLabel },
                { label: pickLegacyLocalizedText(lang, "fraîcheur", "freshness", "frescura"), value: `${trainingStatus.freshnessScore}%` },
                { label: pickLegacyLocalizedText(lang, "charge 7 j", "7-day load", "carga 7 días"), value: String(trainingStatus.acuteLoad7) },
                { label: copy.streak.toLowerCase(), value: `${stats.activeWeekStreak} ${copy.weeks}` },
                { label: copy.program.toLowerCase(), value: activePlan ? `S${currentPlanWeek}/${planDurationWeeks(activePlan)}` : copy.noProgram },
                { label: copy.nextWorkout.toLowerCase(), value: nextWorkoutValue },
            ],
        },
        {
            id: "running-journal",
            title: pickLegacyLocalizedText(lang, "JOURNAL", "JOURNAL", "DIARIO"),
            rows: [
                { label: pickLegacyLocalizedText(lang, "dernière sortie", "last activity", "última salida"), value: recentActivity ? new Date(recentActivity.startedAt).toLocaleDateString() : "—" },
                { label: pickLegacyLocalizedText(lang, "distance", "distance", "distancia"), value: recentActivity ? formatDistance(recentActivity.distanceM) : "—" },
                { label: pickLegacyLocalizedText(lang, "durée", "duration", "duración"), value: recentActivity ? formatDuration(recentActivity.elapsedMs) : "—" },
                { label: pickLegacyLocalizedText(lang, "allure / vitesse", "pace / speed", "ritmo / velocidad"), value: recentActivity ? outdoorAverageMetricValue(recentActivity, canonicalOutdoorPerformanceSport(recentActivity.sport)) : "—" },
                { label: pickLegacyLocalizedText(lang, "sorties", "activities", "salidas"), value: String(activities.length) },
                { label: pickLegacyLocalizedText(lang, "sessions", "sessions", "sesiones"), value: String(activeSessions.length) },
            ],
        },
    ];
    const runningProfileStats: ActiveProfileStats = {
        ratingGlobal: 0,
        winrateGlobal: 0,
        avg3DGlobal: 0,
        sessionsGlobal: stats.sessions,
        recordBestVisitX01: 0,
        recordBestCOX01: 0,
    };
    const currentTicker = tickers.length ? tickers[Math.min(Math.max(tickerIndex, 0), tickers.length - 1)] : null;
    return <div className="running-page running-home-v2" style={{ minHeight: "100dvh", background: (theme as any).pageBackground || (theme as any).bg || "#05060C", color: "#FFFFFF", display: "flex", justifyContent: "center", padding: "10px 8px max(82px,calc(70px + env(safe-area-inset-bottom)))", boxSizing: "border-box", overflowX: "hidden" }}>
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, minWidth: 0 }}>
        <style>{`@keyframes dcTitlePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}@keyframes dcTitleShimmer{0%{background-position:0% 0%}100%{background-position:200% 0%}}`}</style>

        <div
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 10,
            background: "linear-gradient(135deg, rgba(8,10,20,0.98), rgba(14,18,34,0.98))",
            border: `1px solid ${(theme as any).borderSoft ?? `${accent}22`}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
            isolation: "isolate",
          }}
        >
          <SportWelcomeWatermark sport="running" opacity={0.12} size={205} />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "inline-flex",
              padding: "5px 18px",
              borderRadius: 999,
              border: `1px solid ${accent}`,
              background: "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.06))",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: accent }}>
              {copy.welcome}
            </span>
          </div>
          <div
            ref={wrapRef}
            style={{ position: "relative", zIndex: 2, width: "100%", overflow: "hidden", textAlign: "center" }}
          >
            <div
              ref={textRef}
              style={{
                width: "fit-content",
                maxWidth: "100%",
                margin: "0 auto",
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: 3,
                textAlign: "center",
                textTransform: "uppercase",
                backgroundImage: `linear-gradient(120deg, ${accent}, #ffffff, ${accent})`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
                transform: `scale(${scale})`,
                transformOrigin: "center center",
              }}
            >
              {copy.title}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={lang} accent={accent} />
        </div>

        <InlineAdBanner placement="home" slotKey="home-top" offset={0} compact style={{ marginBottom: 12 }} />

        {activeProfile && (
          <ActiveProfileCard
            profile={activeProfile as any}
            stats={runningProfileStats}
            globalTitle={copy.overview}
            globalKpis={runningGlobalKpis}
            customSlides={runningSlides}
            suppressDefaultStatsSlides
          />
        )}

        {!activeProfile && (
          <div style={{ padding: 16, borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(135deg, rgba(8,10,20,0.98), rgba(14,18,34,0.98))", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: accent }}>{pickLegacyLocalizedText(lang, "JOUEUR ACTIF", "ACTIVE PROFILE", "JUGADOR ACTIVO")}</div>
            <div style={{ marginTop: 6, color: textSoft, fontSize: 11 }}>{pickLegacyLocalizedText(lang, "Aucun profil actif pour le moment.", "No active profile yet.", "Aún no hay perfil activo.")}</div>
          </div>
        )}

        <InlineAdBanner placement="home_secondary" slotKey="home-player" offset={2} compact style={{ marginTop: 12, marginBottom: 14 }} />

        <ArcadeTicker items={tickers} activeIndex={tickerIndex} intervalMs={7000} onIndexChange={setTickerIndex} onActiveIndexChange={setTickerIndex} />

        {currentTicker ? <div style={{ marginTop: 10, marginBottom: 12, borderRadius: 22, border: `1px solid ${(theme as any).borderSoft ?? "rgba(255,255,255,0.12)"}`, boxShadow: "0 18px 40px rgba(0,0,0,0.85)", padding: 8, background: "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(3,4,10,1))" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0, borderRadius: 18, overflow: "hidden", position: "relative", minHeight: 112, backgroundColor: "#05060C", backgroundImage: currentTicker.backgroundImage ? `url("${currentTicker.backgroundImage}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.45))", pointerEvents: "none" }} />
              <div style={{ position: "relative", padding: "9px 10px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: currentTicker.accentColor || accent }}>{currentTicker.title}</div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: (theme as any).textSoft ?? "rgba(255,255,255,0.9)" }}>{currentTicker.text}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
                  <PulseKpi label={copy.weekGoal} value={weekLabel} accent={accent} />
                  <PulseKpi label={copy.streak} value={`${stats.activeWeekStreak} ${copy.weeks}`} accent={accent} />
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderRadius: 18, overflow: "hidden", position: "relative", minHeight: 112, background: "linear-gradient(160deg, rgba(12,18,30,0.98), rgba(4,7,15,0.98))", border: `1px solid ${accent}1f` }}>
              <div style={{ position: "relative", padding: "9px 10px 10px", display: "flex", flexDirection: "column", gap: 7, height: "100%" }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: accent }}>{pickLegacyLocalizedText(lang, "ACCÈS RAPIDES", "QUICK ACCESS", "ACCESOS RÁPIDOS")}</div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: textSoft }}>{mainActionSub}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginTop: "auto" }}>
                  <button className="btn" onClick={mainAction} style={{ minHeight: 34, fontSize: 7.6, color: accent, borderColor: `${accent}45` }}>{mainActionTitle}</button>
                  <button className="btn" onClick={() => go("games", { runningActivitySport: activitySport, runningOpenRoutes: true })} style={{ minHeight: 34, fontSize: 7.6 }}>{pickLegacyLocalizedText(lang, "PARCOURS", "ROUTES", "RUTAS")}</button>
                </div>
              </div>
            </div>
          </div>
        </div> : null}

        <div className="running-home-command-grid" style={{ marginTop: 6 }}>
          <RunningActionTile accent={accent} onClick={() => go("games", { runningActivitySport: activitySport, runningOpenRoutes: true })} icon={<RunningGlyph name="route-choose" size={20} />} title={pickLegacyLocalizedText(lang, "PARCOURS", "ROUTES", "RUTAS")} subtitle={pickLegacyLocalizedText(lang, "Explorer visuellement", "Visual discovery", "Explorar visualmente")} />
          <RunningActionTile accent={accent} onClick={() => go("stats", { runningStatsTab: "history" })} icon={<RunningGlyph name="history" size={20} />} title={pickLegacyLocalizedText(lang, "MES SORTIES", "MY ACTIVITIES", "MIS SALIDAS")} subtitle={`${activities.length} ${copy.sessions.toLowerCase()}`} />
          <RunningActionTile accent={accent} onClick={() => go("online", { tab: "nearby" })} icon={<RunningGlyph name="gps" size={20} />} title={pickLegacyLocalizedText(lang, "AMIS", "FRIENDS", "AMIGOS")} subtitle={pickLegacyLocalizedText(lang, "Liste d'amis · partenaires de sortie", "Friends list · activity partners", "Lista de amigos · compañeros de salida")} />
          <RunningActionTile accent={accent} onClick={() => go("running_plan")} icon={<RunningGlyph name="spark" size={20} />} title={pickLegacyLocalizedText(lang, "COACH", "COACH", "COACH")} subtitle={pickLegacyLocalizedText(lang, "Plans & objectifs", "Plans & goals", "Planes y objetivos")} />
        </div>
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
