import { localeForLang, pickLegacyBilingualText, pickLegacyLocalizedText, pickLegacyLocalizedValue } from "../../i18n/legacyLocalizedText";
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import RunningPlanView from "./RunningPlanView";
import RunningGoalView from "./RunningGoalView";
import RunningRunAnalysisPanel from "./RunningRunAnalysisPanel";
import RunningElevationProfile from "./RunningElevationProfile";
import OutdoorActivitySelector from "./OutdoorActivitySelector";
import RunningConnectionsPanel from "./RunningConnectionsPanel";
import OutdoorRouteNavigationPanel from "./OutdoorRouteNavigationPanel";
import OutdoorRoutePlannerPanel from "./OutdoorRoutePlannerPanel";
import { RunningSurface, RunningTabs } from "./RunningUi";
import { useAwenaOptional } from "../../awena/AwenaProvider";
import { awenaVoice } from "../../awena/AwenaVoice";
import { RUNNING_AUDIO_COACH_KEY, type RunningCustomWorkoutSpec, type RunningPlanSession, type RunningPlanState } from "../../activity/runningTraining";
import { averagePaceSecPerKm, averageSpeedMps, buildKilometerSplits, elevationGainMeters, formatDistance, formatDuration, formatPace, movingTimeMs, rollingPaceSecPerKm, routeDistanceMeters, shouldAcceptRunningPoint, } from "../../activity/activityMath";
import { buildRunningStats, bestEffortMs, hasNegativeSplit, projectedFinishMs, splitConsistencyScore, targetPaceDeltaMs } from "../../activity/runningInsights";
import { favoriteRouteFromActivity, ghostMatch as runningGhostMatch, loadRunningRoutes, removeRunningRoute, routeTemplateFromActivity, upsertRunningRoute, type RunningRouteTemplate } from "../../activity/runningRoutes";
import { loadRunningShoes, type RunningShoe } from "../../activity/runningGear";
import { adaptiveMilestoneCoach, adaptiveSplitCoach } from "../../activity/runningCoach";
import { analyzeRunningTerrain, terrainAdvice, terrainLabel } from "../../activity/runningElevation";
import { OUTDOOR_SPORT_PROFILES, loadOutdoorPerformanceSport, outdoorPresetIds, outdoorSportLabel, saveOutdoorPerformanceSport, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { loadOutdoorRouteExtras, type OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import { outdoorRouteProgress } from "../../activity/outdoorNavigation";
import { getRunningSensorSnapshot, subscribeRunningSensors, type RunningSensorSnapshot } from "../../activity/runningSensors";
import { sensorSummaryForActivity } from "../../activity/activitySensorInsights";
import { buildTreadmillSplits, treadmillDistanceSource, averageTreadmillIncline } from "../../activity/treadmillPerformance";
import { addNativeTrackingListener, getNativeTrack, isNativeActivityTrackingAvailable, pauseNativeTracking, requestNativeTrackingPermissions, resumeNativeTracking, startNativeTracking, stopNativeTracking } from "../../activity/nativeActivityTracking";
import { deleteActivity, listActivities, saveActivity } from "../../activity/activityStore";
import type { ActivityLap, ActivityRecord, ActivitySensorSample, GeoPoint } from "../../activity/activityTypes";
type View = "setup" | "record" | "history" | "detail" | "records" | "plan" | "goal";
type SetupTab = "quick" | "training" | "pacer" | "custom";
type SetupPanel = "workout" | "route" | "ready";
type WorkoutType = NonNullable<ActivityRecord["workoutType"]>;
type WorkoutStep = {
    id: string;
    durationMs: number;
    fr: string;
    en: string;
    es: string;
    tone: "easy" | "hard" | "steady";
};
type Preset = {
    id: string;
    type: WorkoutType;
    icon: string;
    fr: string;
    en: string;
    es: string;
    subFr: string;
    subEn: string;
    subEs: string;
    targetDistanceM?: number | null;
    targetDurationMs?: number | null;
    targetPaceSecPerKm?: number | null;
    steps?: WorkoutStep[];
};
type Props = {
    go: (route: any, params?: any) => void;
    store?: any;
    params?: any;
};
const PAGE_MAX_WIDTH = 620;
const PACE_OPTIONS = [270, 300, 330, 360, 390, 420];
const PACER_DISTANCES = [5000, 10000, 21097, 42195];
const PRESETS: Preset[] = [
    { id: "free", type: "free", icon: "🏃", fr: "COURSE LIBRE", en: "FREE RUN", es: "CARRERA LIBRE", subFr: "Cours sans contrainte. GPS, carte, splits et tours.", subEn: "Run without constraints. GPS, map, splits and laps.", subEs: "Corre sin límites. GPS, mapa, splits y vueltas.", targetDistanceM: null },
    { id: "distance-1k", type: "distance", icon: "⚡", fr: "1 KM", en: "1 KM", es: "1 KM", subFr: "Effort court, rapide et chronométré.", subEn: "Short, fast, fully timed effort.", subEs: "Esfuerzo corto, rápido y cronometrado.", targetDistanceM: 1000 },
    { id: "distance-5k", type: "distance", icon: "🎯", fr: "5 KM", en: "5 KM", es: "5 KM", subFr: "Le format référence pour mesurer ta progression.", subEn: "The reference distance to measure progress.", subEs: "La distancia de referencia para medir tu progreso.", targetDistanceM: 5000 },
    { id: "distance-10k", type: "distance", icon: "🔥", fr: "10 KM", en: "10 KM", es: "10 KM", subFr: "Endurance et gestion régulière de l’allure.", subEn: "Endurance and steady pace management.", subEs: "Resistencia y gestión regular del ritmo.", targetDistanceM: 10000 },
    { id: "easy", type: "easy", icon: "🌱", fr: "EASY RUN · 30 MIN", en: "EASY RUN · 30 MIN", es: "EASY RUN · 30 MIN", subFr: "Une sortie facile pour construire l’endurance.", subEn: "An easy run to build aerobic endurance.", subEs: "Una carrera suave para construir resistencia.", targetDurationMs: 30 * 60000 },
    { id: "tempo", type: "tempo", icon: "🔥", fr: "TEMPO · 35 MIN", en: "TEMPO · 35 MIN", es: "TEMPO · 35 MIN", subFr: "10 min facile · 20 min soutenu · 5 min retour au calme.", subEn: "10 easy · 20 steady-hard · 5 cool down.", subEs: "10 suave · 20 sostenido · 5 vuelta a la calma.", targetDurationMs: 35 * 60000, steps: [
            { id: "warm", durationMs: 10 * 60000, fr: "ÉCHAUFFEMENT", en: "WARM UP", es: "CALENTAMIENTO", tone: "easy" },
            { id: "tempo", durationMs: 20 * 60000, fr: "TEMPO SOUTENU", en: "TEMPO", es: "TEMPO", tone: "hard" },
            { id: "cool", durationMs: 5 * 60000, fr: "RETOUR AU CALME", en: "COOL DOWN", es: "VUELTA A LA CALMA", tone: "easy" },
        ] },
    { id: "intervals", type: "intervals", icon: "⚡", fr: "6 × 1 MIN / 1 MIN", en: "6 × 1 MIN / 1 MIN", es: "6 × 1 MIN / 1 MIN", subFr: "5 min facile · 6 répétitions rapide/récup · 5 min facile.", subEn: "5 easy · 6 fast/easy reps · 5 easy.", subEs: "5 suave · 6 repeticiones rápido/suave · 5 suave.", targetDurationMs: 22 * 60000, steps: buildIntervalSteps() },
    { id: "long", type: "long", icon: "🛣️", fr: "SORTIE LONGUE · 60 MIN", en: "LONG RUN · 60 MIN", es: "CARRERA LARGA · 60 MIN", subFr: "60 minutes en aisance pour développer l’endurance.", subEn: "60 easy minutes to build endurance.", subEs: "60 minutos suaves para desarrollar resistencia.", targetDurationMs: 60 * 60000 },
    { id: "hills", type: "hills", icon: "⛰️", fr: "CÔTES · 35 MIN", en: "HILLS · 35 MIN", es: "CUESTAS · 35 MIN", subFr: "10 min facile · 8 × 45 s en montée / retour souple · 9 min facile.", subEn: "10 easy · 8 × 45 s uphill / easy return · 9 easy.", subEs: "10 suave · 8 × 45 s cuesta arriba / vuelta suave · 9 suave.", targetDurationMs: 35 * 60000, steps: buildHillSteps() },
    { id: "recovery", type: "easy", icon: "🫧", fr: "RÉCUPÉRATION · 20 MIN", en: "RECOVERY · 20 MIN", es: "RECUPERACIÓN · 20 MIN", subFr: "Très facile après une séance récente.", subEn: "Very easy after a recent workout.", subEs: "Muy suave después de un entrenamiento reciente.", targetDurationMs: 20 * 60000 },
];
function buildIntervalSteps(): WorkoutStep[] {
    const out: WorkoutStep[] = [{ id: "warm", durationMs: 5 * 60000, fr: "ÉCHAUFFEMENT", en: "WARM UP", es: "CALENTAMIENTO", tone: "easy" }];
    for (let i = 1; i <= 6; i += 1) {
        out.push({ id: `hard-${i}`, durationMs: 60000, fr: `RAPIDE ${i}/6`, en: `FAST ${i}/6`, es: `RÁPIDO ${i}/6`, tone: "hard" });
        out.push({ id: `easy-${i}`, durationMs: 60000, fr: `RÉCUP ${i}/6`, en: `RECOVERY ${i}/6`, es: `RECUP ${i}/6`, tone: "easy" });
    }
    out.push({ id: "cool", durationMs: 5 * 60000, fr: "RETOUR AU CALME", en: "COOL DOWN", es: "VUELTA A LA CALMA", tone: "easy" });
    return out;
}

function buildHillSteps(): WorkoutStep[] {
    const out: WorkoutStep[] = [{ id: "hill-warm", durationMs: 10 * 60000, fr: "ÉCHAUFFEMENT", en: "WARM UP", es: "CALENTAMIENTO", tone: "easy" }];
    for (let i = 1; i <= 8; i += 1) {
        out.push({ id: `hill-hard-${i}`, durationMs: 45_000, fr: `CÔTE ${i}/8`, en: `HILL ${i}/8`, es: `CUESTA ${i}/8`, tone: "hard" });
        out.push({ id: `hill-easy-${i}`, durationMs: 75_000, fr: `RETOUR ${i}/8`, en: `RECOVERY ${i}/8`, es: `RECUP ${i}/8`, tone: "easy" });
    }
    out.push({ id: "hill-cool", durationMs: 9 * 60000, fr: "RETOUR AU CALME", en: "COOL DOWN", es: "VUELTA A LA CALMA", tone: "easy" });
    return out;
}
function customWorkoutSteps(spec: RunningCustomWorkoutSpec): WorkoutStep[] {
    const out: WorkoutStep[] = [];
    if (spec.warmupMin > 0) out.push({ id: "custom-warm", durationMs: spec.warmupMin * 60000, fr: "ÉCHAUFFEMENT", en: "WARM UP", es: "CALENTAMIENTO", tone: "easy" });
    for (let i = 1; i <= spec.reps; i += 1) {
        out.push({ id: `custom-work-${i}`, durationMs: spec.workMin * 60000, fr: `EFFORT ${i}/${spec.reps}`, en: `WORK ${i}/${spec.reps}`, es: `ESFUERZO ${i}/${spec.reps}`, tone: "hard" });
        if (spec.recoveryMin > 0 && i < spec.reps + 1) out.push({ id: `custom-recovery-${i}`, durationMs: spec.recoveryMin * 60000, fr: `RÉCUP ${i}/${spec.reps}`, en: `RECOVERY ${i}/${spec.reps}`, es: `RECUP ${i}/${spec.reps}`, tone: "easy" });
    }
    if (spec.cooldownMin > 0) out.push({ id: "custom-cool", durationMs: spec.cooldownMin * 60000, fr: "RETOUR AU CALME", en: "COOL DOWN", es: "VUELTA A LA CALMA", tone: "easy" });
    return out;
}
function customWorkoutPreset(spec: RunningCustomWorkoutSpec): Preset {
    const steps = customWorkoutSteps(spec);
    const targetDurationMs = steps.reduce((sum, step) => sum + step.durationMs, 0);
    return { id: "custom", type: "intervals", icon: "🧩", fr: spec.title || "SÉANCE PERSONNALISÉE", en: spec.title || "CUSTOM WORKOUT", es: spec.title || "SESIÓN PERSONALIZADA", subFr: `${spec.reps} × ${spec.workMin} min effort / ${spec.recoveryMin} min récup`, subEn: `${spec.reps} × ${spec.workMin} min work / ${spec.recoveryMin} min recovery`, subEs: `${spec.reps} × ${spec.workMin} min esfuerzo / ${spec.recoveryMin} min recuperación`, targetDurationMs, steps };
}
function makeId() { try {
    return crypto.randomUUID();
}
catch {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
} }
function activityDate(ts: number, lang: string) { try {
    return new Intl.DateTimeFormat(localeForLang(lang), { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}
catch {
    return new Date(ts).toLocaleString();
} }
function presetLabel(p: Preset | undefined, lang: string) { if (!p)
    return "Running"; return pickLegacyLocalizedText(lang, p.fr, p.en, p.es); }
function presetSub(p: Preset, lang: string) { return pickLegacyLocalizedText(lang, p.subFr, p.subEn, p.subEs); }
function formatSignedDuration(ms: number | null) { if (ms == null || !Number.isFinite(ms))
    return "—"; const sign = ms > 0 ? "+" : "−"; return `${sign}${formatDuration(Math.abs(ms))}`; }
function distanceLabel(m: number | null | undefined) { if (!m)
    return "—"; if (Math.abs(m - 21097) < 5)
    return "21.1 KM"; if (Math.abs(m - 42195) < 5)
    return "42.2 KM"; return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} KM` : `${m} M`; }
function getPhase(preset: Preset | undefined, elapsedMs: number, lang: string) {
    if (!preset?.steps?.length)
        return null;
    let cursor = 0;
    for (let i = 0; i < preset.steps.length; i += 1) {
        const step = preset.steps[i];
        if (elapsedMs < cursor + step.durationMs)
            return { index: i, step, elapsedInStep: elapsedMs - cursor, remainingMs: cursor + step.durationMs - elapsedMs, progress: Math.max(0, Math.min(100, (elapsedMs - cursor) / step.durationMs * 100)), label: pickLegacyLocalizedText(lang, step.fr, step.en, step.es) };
        cursor += step.durationMs;
    }
    const last = preset.steps[preset.steps.length - 1];
    return { index: preset.steps.length - 1, step: last, elapsedInStep: last.durationMs, remainingMs: 0, progress: 100, label: pickLegacyLocalizedText(lang, last.fr, last.en, last.es) };
}
export default function RunningModule({ go, params }: Props) {
    const { theme } = useTheme();
    const langApi = useLang() as any;
    const awena = useAwenaOptional();
    const lang = String(langApi?.lang || "fr").toLowerCase();
    const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
    const textSoft = (theme as any)?.textSoft || "#a8a8b3";
    const initialView: View = params?.runningView === "history" ? "history" : params?.runningView === "records" ? "records" : params?.runningView === "plan" ? "plan" : params?.runningView === "goal" ? "goal" : "setup";
    const initialPreset = String(params?.runningPresetId || (params?.runningTargetM ? "distance" : "free"));
    const [view, setView] = React.useState<View>(initialView);
    const [setupTab, setSetupTab] = React.useState<SetupTab>(initialPreset === "pacer" ? "pacer" : initialPreset === "custom" ? "custom" : ["easy", "tempo", "intervals", "hills", "long", "recovery"].includes(initialPreset) ? "training" : "quick");
    const [setupPanel, setSetupPanel] = React.useState<SetupPanel>("workout");
    const [activitySport, setActivitySport] = React.useState<OutdoorPerformanceSport>(() => { const raw = String(params?.runningActivitySport || ""); return (["running","trail","hiking","walking","nordic-walking","treadmill"] as string[]).includes(raw) ? raw as OutdoorPerformanceSport : loadOutdoorPerformanceSport(); });
    const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
    const [selected, setSelected] = React.useState<ActivityRecord | null>(null);
    const [selectedPresetId, setSelectedPresetId] = React.useState(() => {
        if (initialPreset === "distance") {
            const m = Number(params?.runningTargetM || 5000);
            return m === 1000 ? "distance-1k" : m === 10000 ? "distance-10k" : "distance-5k";
        }
        return PRESETS.some((p) => p.id === initialPreset) ? initialPreset : "free";
    });
    const [pacerDistanceM, setPacerDistanceM] = React.useState(() => Number(params?.runningTargetM || 5000));
    const [pacerPace, setPacerPace] = React.useState(330);
    const [points, setPoints] = React.useState<GeoPoint[]>([]);
    const [manualLaps, setManualLaps] = React.useState<ActivityLap[]>([]);
    const [isRecording, setIsRecording] = React.useState(false);
    const [paused, setPaused] = React.useState(false);
    const [now, setNow] = React.useState(Date.now());
    const [accuracy, setAccuracy] = React.useState<number | null>(null);
    const [gpsMessage, setGpsMessage] = React.useState("");
    const [gpsChecked, setGpsChecked] = React.useState(false);
    const [countdown, setCountdown] = React.useState<number | null>(null);
    const [splitToast, setSplitToast] = React.useState<string | null>(null);
    const [finishBadges, setFinishBadges] = React.useState<string[]>([]);
    const [historyFilter, setHistoryFilter] = React.useState<"all" | "free" | "training" | "pacer">("all");
    const [customWorkout, setCustomWorkout] = React.useState<RunningCustomWorkoutSpec>(() => params?.runningCustomWorkout ? { ...params.runningCustomWorkout } : ({ warmupMin: 8, workMin: 2, recoveryMin: 1, reps: 6, cooldownMin: 6, title: "SÉANCE PERSONNALISÉE" }));
    const [planId, setPlanId] = React.useState<string | undefined>(() => params?.runningPlanId ? String(params.runningPlanId) : undefined);
    const [planSessionId, setPlanSessionId] = React.useState<string | undefined>(() => params?.runningPlanSessionId ? String(params.runningPlanSessionId) : undefined);
    const [presetOverrideTitle, setPresetOverrideTitle] = React.useState<string | null>(() => params?.runningPlanSessionTitle ? String(params.runningPlanSessionTitle) : null);
    const [presetOverrideDurationMs, setPresetOverrideDurationMs] = React.useState<number | null>(() => Number.isFinite(Number(params?.runningTargetDurationMs)) ? Number(params.runningTargetDurationMs) : null);
    const [audioCoach, setAudioCoach] = React.useState(() => { try { const raw = localStorage.getItem(RUNNING_AUDIO_COACH_KEY); return raw == null ? true : raw === "1"; } catch { return true; } });
    const [savedRoutes, setSavedRoutes] = React.useState<RunningRouteTemplate[]>(() => loadRunningRoutes());
    const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
    const [routeExtras, setRouteExtras] = React.useState<OutdoorRouteExtras | null>(null);
    const [ghostEnabled, setGhostEnabled] = React.useState(false);
    const [shoes] = React.useState<RunningShoe[]>(() => loadRunningShoes());
    const [selectedShoeId, setSelectedShoeId] = React.useState<string>(() => loadRunningShoes().find((shoe) => !shoe.retired)?.id || "");
    const [sensorSnapshot, setSensorSnapshot] = React.useState<RunningSensorSnapshot>(() => getRunningSensorSnapshot());
    const [manualTreadmillSpeedKmh, setManualTreadmillSpeedKmh] = React.useState(8);
    const [manualTreadmillIncline, setManualTreadmillIncline] = React.useState(0);
    const [treadmillDistanceM, setTreadmillDistanceM] = React.useState(0);
    const treadmillDistanceRef = React.useRef(0);
    const treadmillFtmsLastRawRef = React.useRef<number | null>(null);
    const treadmillTickRef = React.useRef(0);
    const nativeTrackingActiveRef = React.useRef(false);
    const sensorSamplesRef = React.useRef<ActivitySensorSample[]>([]);
    const lastSensorSampleAtRef = React.useRef(0);
    const watchIdRef = React.useRef<number | null>(null);
    const pointsRef = React.useRef<GeoPoint[]>([]);
    const startedAtRef = React.useRef(0);
    const pauseStartedRef = React.useRef(0);
    const pausedTotalRef = React.useRef(0);
    const pausedRef = React.useRef(false);
    const lastLapElapsedRef = React.useRef(0);
    const lastLapDistanceRef = React.useRef(0);
    const splitCountRef = React.useRef(0);
    const phaseIndexRef = React.useRef<number | null>(null);
    const milestoneRef = React.useRef<Set<number>>(new Set());
    const offRouteAlertRef = React.useRef(false);
    const checkpointAnnouncedRef = React.useRef<Set<string>>(new Set());
    const copy = pickLegacyLocalizedValue(lang, {
        title: "RUNNING PERFORMANCE", setupSub: "Prépare ta séance avant le départ", recordSub: "Session GPS en cours", history: "MES SORTIES", records: "MES RECORDS", setup: "COURIR", quick: "RAPIDE", training: "ENTRAÎNEMENT", pacer: "PACER", selected: "SÉANCE SÉLECTIONNÉE", start: "DÉMARRER", gps: "GPS", gpsCheck: "TESTER LE GPS", gpsReady: "GPS PRÊT", gpsUnknown: "GPS À VÉRIFIER", gpsPoor: "SIGNAL FAIBLE", gpsDenied: "LOCALISATION REFUSÉE", gpsHint: "Teste le GPS avant le départ pour éviter une sortie sans tracé.", local: "BETA WEB / PWA — RUNNING N'EST PAS ENCORE PUBLIÉ SUR ANDROID", watches: "MONTRES & CAPTEURS", soon: "BIENTÔT", targetPace: "ALLURE CIBLE", targetDistance: "DISTANCE CIBLE", expected: "TEMPS CIBLE", countdown: "PRÊT ?", go: "GO !",
        distance: "DISTANCE", time: "TEMPS", avgPace: "ALLURE MOY.", livePace: "ALLURE LIVE", speed: "VITESSE", elevation: "DÉNIVELÉ +", accuracy: "PRÉCISION", moving: "TEMPS MOUV.", target: "OBJECTIF", ahead: "EN AVANCE", behind: "EN RETARD", projected: "ARRIVÉE PROJETÉE", phase: "BLOC EN COURS", remaining: "RESTANT", route: "PARCOURS", waiting: "En attente du premier point GPS…", pause: "PAUSE", resume: "REPRENDRE", finish: "TERMINER", cancel: "ANNULER", lap: "TOUR", splits: "SPLITS KM", laps: "TOURS MANUELS", targetReached: "OBJECTIF ATTEINT", insufficient: "Il faut au moins deux points GPS pour enregistrer la sortie.", complete: "SORTIE TERMINÉE", verified: "GPS VÉRIFIÉ", delete: "SUPPRIMER LA SORTIE", empty: "Aucune sortie enregistrée.", noRecord: "Pas encore de record", longestLabel: "PLUS LONGUE", bestEfforts: "MEILLEURS EFFORTS", consistency: "RÉGULARITÉ", negative: "NEGATIVE SPLIT", achievements: "PERFORMANCES DÉBLOQUÉES", firstRun: "PREMIÈRE SORTIE", longestBadge: "PLUS LONGUE SORTIE", personalBest: "NOUVEAU RECORD", filters: ["TOUTES", "LIBRES", "SÉANCES", "PACER"], plan: "PLAN", custom: "SUR MESURE", audioCoach: "COACH VOCAL AWENA", audioCoachSub: "Annonce les blocs, splits et repères de séance pendant la course.", feedback: "RESSENTI APRÈS LA SORTIE", effort: "EFFORT PERÇU", feeling: "SENSATIONS", notes: "NOTES", save: "ENREGISTRER", info: "RUNNING PERFORMANCE regroupe Running, Trail, Randonnée, Marche, Marche nordique et Tapis roulant. Le GPS natif Android écran éteint est désormais câblé pour les tests internes, tandis que le module reste masqué de la Store V1.",
    }, {
        title: "RUNNING PERFORMANCE", setupSub: "Prepare your workout before the start", recordSub: "GPS session in progress", history: "MY RUNS", records: "MY RECORDS", setup: "RUN", quick: "QUICK", training: "TRAINING", pacer: "PACER", selected: "SELECTED WORKOUT", start: "START", gps: "GPS", gpsCheck: "CHECK GPS", gpsReady: "GPS READY", gpsUnknown: "GPS NOT CHECKED", gpsPoor: "WEAK SIGNAL", gpsDenied: "LOCATION DENIED", gpsHint: "Check GPS before the start to avoid a run without a route.", local: "WEB / PWA BETA — RUNNING IS NOT RELEASED ON ANDROID YET", watches: "WATCHES & SENSORS", soon: "SOON", targetPace: "TARGET PACE", targetDistance: "TARGET DISTANCE", expected: "TARGET TIME", countdown: "READY?", go: "GO!",
        distance: "DISTANCE", time: "TIME", avgPace: "AVG PACE", livePace: "LIVE PACE", speed: "SPEED", elevation: "ELEVATION +", accuracy: "ACCURACY", moving: "MOVING TIME", target: "TARGET", ahead: "AHEAD", behind: "BEHIND", projected: "PROJECTED FINISH", phase: "CURRENT BLOCK", remaining: "REMAINING", route: "ROUTE", waiting: "Waiting for the first GPS point…", pause: "PAUSE", resume: "RESUME", finish: "FINISH", cancel: "CANCEL", lap: "LAP", splits: "KM SPLITS", laps: "MANUAL LAPS", targetReached: "TARGET REACHED", insufficient: "At least two GPS points are required to save the run.", complete: "RUN COMPLETE", verified: "GPS VERIFIED", delete: "DELETE RUN", empty: "No runs saved yet.", noRecord: "No record yet", longestLabel: "LONGEST", bestEfforts: "BEST EFFORTS", consistency: "CONSISTENCY", negative: "NEGATIVE SPLIT", achievements: "UNLOCKED ACHIEVEMENTS", firstRun: "FIRST RUN", longestBadge: "LONGEST RUN", personalBest: "NEW PERSONAL BEST", filters: ["ALL", "FREE", "WORKOUTS", "PACER"], plan: "PLAN", custom: "CUSTOM", audioCoach: "AWENA VOICE COACH", audioCoachSub: "Announces workout blocks, splits and session cues while you run.", feedback: "POST-RUN FEEDBACK", effort: "PERCEIVED EFFORT", feeling: "FEELING", notes: "NOTES", save: "SAVE", info: "RUNNING PERFORMANCE brings together Running, Trail, Hiking, Walking, Nordic walking and Treadmill. Native Android screen-off GPS tracking is wired for internal tests while the module remains hidden from Store V1.",
    }, {
        title: "RUNNING PERFORMANCE", setupSub: "Prepara tu sesión antes de salir", recordSub: "Sesión GPS en curso", history: "MIS CARRERAS", records: "MIS RÉCORDS", setup: "CORRER", quick: "RÁPIDO", training: "ENTRENAMIENTO", pacer: "PACER", selected: "SESIÓN SELECCIONADA", start: "INICIAR", gps: "GPS", gpsCheck: "PROBAR GPS", gpsReady: "GPS LISTO", gpsUnknown: "GPS SIN PROBAR", gpsPoor: "SEÑAL DÉBIL", gpsDenied: "UBICACIÓN DENEGADA", gpsHint: "Prueba el GPS antes de salir para evitar una carrera sin ruta.", local: "BETA WEB / PWA — RUNNING AÚN NO ESTÁ PUBLICADO EN ANDROID", watches: "RELOJES Y SENSORES", soon: "PRONTO", targetPace: "RITMO OBJETIVO", targetDistance: "DISTANCIA OBJETIVO", expected: "TIEMPO OBJETIVO", countdown: "¿LISTO?", go: "¡YA!",
        distance: "DISTANCIA", time: "TIEMPO", avgPace: "RITMO MEDIO", livePace: "RITMO LIVE", speed: "VELOCIDAD", elevation: "DESNIVEL +", accuracy: "PRECISIÓN", moving: "TIEMPO MOV.", target: "OBJETIVO", ahead: "ADELANTADO", behind: "RETRASADO", projected: "LLEGADA PROYECTADA", phase: "BLOQUE ACTUAL", remaining: "RESTANTE", route: "RUTA", waiting: "Esperando el primer punto GPS…", pause: "PAUSA", resume: "REANUDAR", finish: "TERMINAR", cancel: "CANCELAR", lap: "VUELTA", splits: "SPLITS KM", laps: "VUELTAS MANUALES", targetReached: "OBJETIVO CUMPLIDO", insufficient: "Se necesitan al menos dos puntos GPS para guardar la carrera.", complete: "CARRERA TERMINADA", verified: "GPS VERIFICADO", delete: "ELIMINAR CARRERA", empty: "No hay carreras guardadas.", noRecord: "Sin récord todavía", longestLabel: "MÁS LARGA", bestEfforts: "MEJORES ESFUERZOS", consistency: "REGULARIDAD", negative: "NEGATIVE SPLIT", achievements: "LOGROS DESBLOQUEADOS", firstRun: "PRIMERA CARRERA", longestBadge: "CARRERA MÁS LARGA", personalBest: "NUEVO RÉCORD", filters: ["TODAS", "LIBRES", "SESIONES", "PACER"], plan: "PLAN", custom: "A MEDIDA", audioCoach: "COACH VOCAL AWENA", audioCoachSub: "Anuncia bloques, splits y referencias de entrenamiento durante la carrera.", feedback: "SENSACIONES DESPUÉS DE CORRER", effort: "ESFUERZO PERCIBIDO", feeling: "SENSACIONES", notes: "NOTAS", save: "GUARDAR", info: "RUNNING PERFORMANCE reúne Running, Trail, Senderismo, Caminata, Marcha nórdica y Cinta de correr. El seguimiento GPS nativo Android con pantalla apagada ya está preparado para pruebas internas, pero el módulo sigue oculto en Store V1.",
    });
    const sportProfile = OUTDOOR_SPORT_PROFILES[activitySport];
    const allowedPresetIds = React.useMemo(() => outdoorPresetIds(activitySport), [activitySport]);
    React.useEffect(() => {
        saveOutdoorPerformanceSport(activitySport);
        if ((!allowedPresetIds.has(selectedPresetId) && selectedPresetId !== "pacer" && selectedPresetId !== "custom") || (selectedPresetId === "pacer" && !sportProfile.supportsPacer) || (selectedPresetId === "custom" && !sportProfile.supportsIntervals)) {
            setSelectedPresetId("free");
            setSetupTab("quick");
        }
        if (!sportProfile.supportsPacer && setupTab === "pacer") setSetupTab("quick");
        if (!sportProfile.supportsIntervals && setupTab === "custom") setSetupTab("quick");
        setSelectedRouteId(null);
        setGhostEnabled(false);
        if (activitySport === "treadmill" && setupPanel === "route") setSetupPanel("workout");
    }, [activitySport, allowedPresetIds, selectedPresetId, setupTab, sportProfile.supportsIntervals, sportProfile.supportsPacer]);
    const selectedPreset = React.useMemo(() => PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0], [selectedPresetId]);
    const effectivePreset: Preset = React.useMemo(() => {
        let base: Preset = selectedPresetId === "pacer"
            ? { id: "pacer", type: "pacer", icon: "⏱️", fr: "PACER", en: "PACER", es: "PACER", subFr: "Tiens ton allure cible et suis ton avance en direct.", subEn: "Hold target pace and track live time delta.", subEs: "Mantén el ritmo objetivo y sigue tu diferencia en directo.", targetDistanceM: pacerDistanceM, targetPaceSecPerKm: pacerPace }
            : selectedPresetId === "custom" ? customWorkoutPreset(customWorkout) : selectedPreset;
        if (presetOverrideDurationMs && presetOverrideDurationMs > 0) base = { ...base, targetDurationMs: presetOverrideDurationMs };
        if (presetOverrideTitle) base = { ...base, fr: presetOverrideTitle, en: presetOverrideTitle, es: presetOverrideTitle };
        return base;
    }, [customWorkout, pacerDistanceM, pacerPace, presetOverrideDurationMs, presetOverrideTitle, selectedPreset, selectedPresetId]);
    const routeOptions = React.useMemo(() => {
        const savedSourceIds = new Set(savedRoutes.map((route) => route.sourceActivityId).filter(Boolean));
        const recent = activities
            .filter((activity) => Array.isArray(activity.route) && activity.route.length >= 2 && activity.distanceM >= 300 && !savedSourceIds.has(activity.id))
            .slice(0, 6)
            .map((activity) => routeTemplateFromActivity(activity));
        const savedForSport = savedRoutes.filter((route) => !route.sport ? activitySport === "running" : route.sport === activitySport);
        return [...savedForSport, ...recent].slice(0, 10);
    }, [activities, activitySport, savedRoutes]);
    const selectedRoute = React.useMemo(() => routeOptions.find((route) => route.id === selectedRouteId) || null, [routeOptions, selectedRouteId]);
    React.useEffect(() => { setRouteExtras(selectedRoute ? loadOutdoorRouteExtras(selectedRoute.id) : null); offRouteAlertRef.current = false; }, [selectedRoute?.id]);
    const selectedTerrain = React.useMemo(() => selectedRoute ? analyzeRunningTerrain(selectedRoute.route) : null, [selectedRoute]);
    const selectedTerrainAdvice = React.useMemo(() => selectedTerrain ? terrainAdvice(selectedTerrain, lang) : null, [lang, selectedTerrain]);
    const selectedRouteHasReference = !!selectedRoute && Number(selectedRoute.referenceElapsedMs || 0) > 0;
    React.useEffect(() => { if (!selectedRouteHasReference && ghostEnabled) setGhostEnabled(false); }, [ghostEnabled, selectedRouteHasReference]);
    const favoriteSourceIds = React.useMemo(() => new Set(savedRoutes.map((route) => route.sourceActivityId).filter(Boolean)), [savedRoutes]);
    const targetDistanceM = selectedRoute && effectivePreset.type === "free" ? selectedRoute.distanceM : effectivePreset.targetDistanceM ?? null;
    const targetDurationMs = effectivePreset.targetDurationMs ?? null;
    const targetPaceSecPerKm = effectivePreset.type === "pacer" ? pacerPace : null;
    React.useEffect(() => { try { localStorage.setItem(RUNNING_AUDIO_COACH_KEY, audioCoach ? "1" : "0"); } catch {} }, [audioCoach]);
    const speakCoach = React.useCallback((text: string) => {
        if (!audioCoach || !awena?.settings) return;
        void awenaVoice.speak(text, awena.settings, lang).catch(() => {});
    }, [audioCoach, awena?.settings, lang]);
    const refreshActivities = React.useCallback(async () => setActivities(await listActivities(activitySport)), [activitySport]);
    React.useEffect(() => { void refreshActivities(); }, [refreshActivities]);
    React.useEffect(() => { if (!isRecording)
        return; const id = window.setInterval(() => setNow(Date.now()), 400); return () => window.clearInterval(id); }, [isRecording]);
    React.useEffect(() => () => { if (watchIdRef.current != null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchIdRef.current); }, []);
    const activeElapsedAt = React.useCallback((ts: number) => {
        if (!startedAtRef.current)
            return 0;
        const currentPause = pausedRef.current && pauseStartedRef.current ? Math.max(0, ts - pauseStartedRef.current) : 0;
        return Math.max(0, ts - startedAtRef.current - pausedTotalRef.current - currentPause);
    }, []);
    React.useEffect(() => subscribeRunningSensors((value) => {
        setSensorSnapshot(value);
        if (!isRecording || pausedRef.current || !value.updatedAt) return;
        if (value.updatedAt - lastSensorSampleAtRef.current < 2500) return;
        const sample: ActivitySensorSample = {
            timestamp: value.updatedAt,
            elapsedMs: activeElapsedAt(value.updatedAt),
            heartRateBpm: value.heartRateBpm ?? undefined,
            cadenceSpm: value.cadenceSpm ?? undefined,
            sensorSpeedMps: value.sensorSpeedMps ?? undefined,
            strideLengthM: value.strideLengthM ?? undefined,
            inclinePercent: value.inclinePercent ?? (activitySport === "treadmill" ? manualTreadmillIncline : undefined),
            treadmillDistanceM: activitySport === "treadmill" ? treadmillDistanceRef.current : undefined,
        };
        if (sample.heartRateBpm == null && sample.cadenceSpm == null && sample.sensorSpeedMps == null && sample.treadmillDistanceM == null) return;
        sensorSamplesRef.current.push(sample);
        if (sensorSamplesRef.current.length > 1200) sensorSamplesRef.current = sensorSamplesRef.current.slice(-1200);
        lastSensorSampleAtRef.current = value.updatedAt;
    }), [activeElapsedAt, activitySport, isRecording, manualTreadmillIncline]);
    React.useEffect(() => {
        if (!isRecording || activitySport !== "treadmill") return;
        treadmillTickRef.current = Date.now();
        const id = window.setInterval(() => {
            const tick = Date.now();
            const previousTick = treadmillTickRef.current || tick;
            treadmillTickRef.current = tick;
            const ftmsDistance = sensorSnapshot.treadmillDistanceM;
            let next = treadmillDistanceRef.current;
            if (Number.isFinite(ftmsDistance)) {
                const rawDistance = Number(ftmsDistance);
                const previousRaw = treadmillFtmsLastRawRef.current;
                treadmillFtmsLastRawRef.current = rawDistance;
                if (!pausedRef.current && previousRaw != null && rawDistance >= previousRaw) {
                    next = Math.max(0, next + (rawDistance - previousRaw));
                }
            } else if (!pausedRef.current) {
                const speedMps = sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? (manualTreadmillSpeedKmh / 3.6);
                next = Math.max(0, next + Math.max(0, Number(speedMps || 0)) * Math.max(0, tick - previousTick) / 1000);
            }
            if (pausedRef.current) return;
            treadmillDistanceRef.current = next;
            setTreadmillDistanceM(next);
            if (tick - lastSensorSampleAtRef.current >= 2500) {
                sensorSamplesRef.current.push({ timestamp: tick, elapsedMs: activeElapsedAt(tick), heartRateBpm: sensorSnapshot.heartRateBpm ?? undefined, cadenceSpm: sensorSnapshot.cadenceSpm ?? undefined, sensorSpeedMps: sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? manualTreadmillSpeedKmh / 3.6, inclinePercent: sensorSnapshot.inclinePercent ?? manualTreadmillIncline, treadmillDistanceM: next });
                if (sensorSamplesRef.current.length > 1200) sensorSamplesRef.current = sensorSamplesRef.current.slice(-1200);
                lastSensorSampleAtRef.current = tick;
            }
        }, 500);
        return () => window.clearInterval(id);
    }, [activeElapsedAt, activitySport, isRecording, manualTreadmillIncline, manualTreadmillSpeedKmh, sensorSnapshot.cadenceSpm, sensorSnapshot.heartRateBpm, sensorSnapshot.inclinePercent, sensorSnapshot.sensorSpeedMps, sensorSnapshot.treadmillDistanceM, sensorSnapshot.treadmillSpeedMps]);

    React.useEffect(() => addNativeTrackingListener((snapshot) => {
        if (!nativeTrackingActiveRef.current || activitySport === "treadmill") return;
        const point = snapshot.lastPoint;
        if (!point) return;
        const previous = pointsRef.current[pointsRef.current.length - 1];
        if (previous && previous.timestamp === point.timestamp) return;
        if (!shouldAcceptRunningPoint(previous, point)) return;
        pointsRef.current = [...pointsRef.current, point];
        setPoints(pointsRef.current);
        setAccuracy(Number.isFinite(point.accuracy) ? Number(point.accuracy) : null);
        setGpsMessage(Number(point.accuracy || 0) > 45 ? copy.gpsPoor : copy.gpsReady);
    }), [activitySport, copy.gpsPoor, copy.gpsReady]);

    React.useEffect(() => {
        if (!isRecording || !nativeTrackingActiveRef.current || activitySport === "treadmill") return;
        const id = window.setInterval(() => { void getNativeTrack().then((snapshot) => {
            if (!snapshot?.route?.length) return;
            pointsRef.current = snapshot.route;
            setPoints(snapshot.route);
        }); }, 4000);
        return () => window.clearInterval(id);
    }, [activitySport, isRecording]);
    const elapsedMs = React.useMemo(() => activeElapsedAt(now), [activeElapsedAt, now, paused]);
    const liveDistance = React.useMemo(() => activitySport === "treadmill" ? treadmillDistanceM : routeDistanceMeters(points), [activitySport, points, treadmillDistanceM]);
    const livePace = React.useMemo(() => averagePaceSecPerKm(liveDistance, elapsedMs), [liveDistance, elapsedMs]);
    const rollingPace = React.useMemo(() => activitySport === "treadmill" ? ((sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? manualTreadmillSpeedKmh / 3.6) > 0 ? 1000 / Number(sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? manualTreadmillSpeedKmh / 3.6) : null) : rollingPaceSecPerKm(points), [activitySport, manualTreadmillSpeedKmh, points, sensorSnapshot.sensorSpeedMps, sensorSnapshot.treadmillSpeedMps]);
    const liveSpeed = React.useMemo(() => averageSpeedMps(liveDistance, elapsedMs) * 3.6, [liveDistance, elapsedMs]);
    const liveElevation = React.useMemo(() => activitySport === "treadmill" ? 0 : elevationGainMeters(points), [activitySport, points]);
    const liveMoving = React.useMemo(() => activitySport === "treadmill" ? elapsedMs : movingTimeMs(points), [activitySport, elapsedMs, points]);
    const liveSplits = React.useMemo(() => activitySport === "treadmill" ? buildTreadmillSplits(sensorSamplesRef.current) : buildKilometerSplits(points, startedAtRef.current || Date.now()), [activitySport, now, points]);
    const stats = React.useMemo(() => buildRunningStats(activities, Date.now(), localeForLang(lang)), [activities, lang]);
    const phase = React.useMemo(() => getPhase(effectivePreset, elapsedMs, lang), [effectivePreset, elapsedMs, lang]);
    const distanceProgress = targetDistanceM ? Math.min(100, liveDistance / targetDistanceM * 100) : null;
    const durationProgress = !targetDistanceM && targetDurationMs ? Math.min(100, elapsedMs / targetDurationMs * 100) : null;
    const progress = distanceProgress ?? durationProgress;
    const paceDelta = targetPaceSecPerKm ? targetPaceDeltaMs(liveDistance, elapsedMs, targetPaceSecPerKm) : null;
    const projected = targetDistanceM ? projectedFinishMs(liveDistance, elapsedMs, targetDistanceM) : null;
    const liveGhostMatch = React.useMemo(() => activitySport !== "treadmill" && ghostEnabled ? runningGhostMatch(selectedRoute, points[points.length - 1], liveDistance, elapsedMs) : null, [activitySport, elapsedMs, ghostEnabled, liveDistance, points, selectedRoute]);
    const liveOutdoorProgress = React.useMemo(() => selectedRoute && routeExtras && ["trail", "hiking", "walking", "nordic-walking"].includes(activitySport) ? outdoorRouteProgress(selectedRoute, activitySport, liveDistance, elapsedMs, points[points.length - 1] || null, liveElevation, routeExtras.waypoints, routeExtras.offRouteAlertM) : null, [activitySport, elapsedMs, liveDistance, liveElevation, points, routeExtras, selectedRoute]);
    React.useEffect(() => {
        if (!isRecording || !routeExtras?.alertsEnabled || !liveOutdoorProgress) { offRouteAlertRef.current = false; return; }
        if (liveOutdoorProgress.offRouteAlert && !offRouteAlertRef.current) {
            offRouteAlertRef.current = true;
            try { navigator.vibrate?.([120, 80, 120]); } catch {}
            speakCoach(pickLegacyLocalizedText(lang, `Attention, tu es à ${Math.round(liveOutdoorProgress.offRouteM || 0)} mètres du parcours.`, `Caution, you are ${Math.round(liveOutdoorProgress.offRouteM || 0)} metres off route.`, `Atención, estás a ${Math.round(liveOutdoorProgress.offRouteM || 0)} metros de la ruta.`));
        } else if (!liveOutdoorProgress.offRouteAlert && offRouteAlertRef.current && Number(liveOutdoorProgress.offRouteM || 0) < routeExtras.offRouteAlertM * 0.7) {
            offRouteAlertRef.current = false;
            speakCoach(pickLegacyLocalizedText(lang, "Tu es revenu sur le parcours.", "You are back on route.", "Has vuelto a la ruta."));
        }
        const checkpoint = liveOutdoorProgress.nextCheckpoint;
        if (checkpoint && liveOutdoorProgress.nextCheckpointDistanceM != null && liveOutdoorProgress.nextCheckpointDistanceM <= 180 && !checkpointAnnouncedRef.current.has(checkpoint.id)) {
            checkpointAnnouncedRef.current.add(checkpoint.id);
            const label = checkpoint.name || (checkpoint.kind === "finish" ? pickLegacyLocalizedText(lang, "arrivée", "finish", "llegada") : checkpoint.kind === "high-point" ? pickLegacyLocalizedText(lang, "point haut", "high point", "punto alto") : `${Math.round(checkpoint.distanceM / 1000)} km`);
            speakCoach(pickLegacyLocalizedText(lang, `${label} dans ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} mètres.`, `${label} in ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} metres.`, `${label} en ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} metros.`));
        }
    }, [isRecording, lang, liveOutdoorProgress?.nextCheckpoint?.id, liveOutdoorProgress?.nextCheckpointDistanceM, liveOutdoorProgress?.offRouteAlert, liveOutdoorProgress?.offRouteM, routeExtras?.alertsEnabled, routeExtras?.offRouteAlertM, speakCoach]);
    const liveGhostDelta = liveGhostMatch?.deltaMs ?? null;
    const targetReached = (targetDistanceM && liveDistance >= targetDistanceM) || (targetDurationMs && elapsedMs >= targetDurationMs);
    React.useEffect(() => {
        if (!isRecording || !phase) return;
        if (phaseIndexRef.current === phase.index) return;
        phaseIndexRef.current = phase.index;
        const phrase = pickLegacyLocalizedText(lang, `${phase.label}. ${Math.max(1, Math.ceil(phase.step.durationMs / 60000))} minutes.`, `${phase.label}. ${Math.max(1, Math.ceil(phase.step.durationMs / 60000))} minutes.`, `${phase.label}. ${Math.max(1, Math.ceil(phase.step.durationMs / 60000))} minutos.`);
        speakCoach(phrase);
    }, [isRecording, lang, phase?.index, speakCoach]);
    React.useEffect(() => {
        if (!isRecording || liveSplits.length <= splitCountRef.current)
            return;
        const split = liveSplits[liveSplits.length - 1];
        splitCountRef.current = liveSplits.length;
        setSplitToast(`KM ${split.index} · ${formatDuration(split.splitMs)} · ${formatPace(split.paceSecPerKm)}/km`);
        const splitVoice = adaptiveSplitCoach({
            split,
            previous: liveSplits.length > 1 ? liveSplits[liveSplits.length - 2] : undefined,
            targetPaceSecPerKm,
            ghostDeltaMs: liveGhostDelta,
            lang,
        });
        speakCoach(splitVoice);
        try {
            navigator.vibrate?.([80, 60, 80]);
        }
        catch { }
        const id = window.setTimeout(() => setSplitToast(null), 3500);
        return () => window.clearTimeout(id);
    }, [isRecording, lang, liveGhostDelta, liveSplits, speakCoach, targetPaceSecPerKm]);
    React.useEffect(() => {
        if (!isRecording || progress == null) return;
        for (const milestone of [25, 50, 75, 90]) {
            if (progress >= milestone && !milestoneRef.current.has(milestone)) {
                milestoneRef.current.add(milestone);
                speakCoach(adaptiveMilestoneCoach(milestone, lang));
                break;
            }
        }
    }, [isRecording, lang, progress, speakCoach]);
    const stopWatch = React.useCallback(() => { if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    } }, []);
    const checkGps = React.useCallback(() => {
        setGpsChecked(true);
        if (activitySport === "treadmill") { setGpsMessage(pickLegacyLocalizedText(lang, "MESURE INTÉRIEURE PRÊTE", "INDOOR MEASUREMENT READY", "MEDICIÓN INTERIOR LISTA")); return; }
        setGpsMessage(copy.gpsUnknown);
        if (isNativeActivityTrackingAvailable()) {
            void requestNativeTrackingPermissions().then((result: any) => setGpsMessage(result?.granted ? copy.gpsReady : copy.gpsDenied)).catch(() => setGpsMessage(copy.gpsDenied));
            return;
        }
        if (!navigator.geolocation) { setGpsMessage(copy.gpsDenied); return; }
        navigator.geolocation.getCurrentPosition((pos) => { const a = Number(pos.coords.accuracy || 999); setAccuracy(a); setGpsMessage(a <= 35 ? copy.gpsReady : copy.gpsPoor); }, () => setGpsMessage(copy.gpsDenied), { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 });
    }, [activitySport, copy.gpsDenied, copy.gpsPoor, copy.gpsReady, copy.gpsUnknown, lang]);
    const startGpsRun = React.useCallback(async () => {
        setPoints([]);
        pointsRef.current = [];
        setManualLaps([]);
        lastLapElapsedRef.current = 0;
        lastLapDistanceRef.current = 0;
        splitCountRef.current = 0;
        phaseIndexRef.current = null;
        milestoneRef.current = new Set();
        checkpointAnnouncedRef.current = new Set();
        offRouteAlertRef.current = false;
        setFinishBadges([]);
        sensorSamplesRef.current = [];
        lastSensorSampleAtRef.current = 0;
        setAccuracy(null);
        setGpsMessage(activitySport === "treadmill" ? (pickLegacyLocalizedText(lang, "MESURE INTÉRIEURE", "INDOOR MEASUREMENT", "MEDICIÓN INTERIOR")) : copy.gpsUnknown);
        treadmillDistanceRef.current = 0;
        treadmillFtmsLastRawRef.current = null;
        treadmillTickRef.current = Date.now();
        setTreadmillDistanceM(0);
        pausedRef.current = false;
        pausedTotalRef.current = 0;
        pauseStartedRef.current = 0;
        startedAtRef.current = Date.now();
        setNow(startedAtRef.current);
        setPaused(false);
        setIsRecording(true);
        setView("record");
        speakCoach(pickLegacyLocalizedText(lang, `Départ. ${presetLabel(effectivePreset, lang)}.`, `Start. ${presetLabel(effectivePreset, lang)}.`, `Salida. ${presetLabel(effectivePreset, lang)}.`));
        if (activitySport === "treadmill") {
            nativeTrackingActiveRef.current = false;
            return;
        }
        stopWatch();
        if (isNativeActivityTrackingAvailable()) {
            try {
                const permissions: any = await requestNativeTrackingPermissions();
                if (!permissions?.granted) throw new Error("location denied");
                await startNativeTracking(activitySport);
                nativeTrackingActiveRef.current = true;
                setGpsMessage(copy.gpsReady);
                return;
            } catch {
                nativeTrackingActiveRef.current = false;
                setGpsMessage(copy.gpsDenied);
                setIsRecording(false);
                return;
            }
        }
        if (!navigator.geolocation) { setGpsMessage(copy.gpsDenied); setIsRecording(false); return; }
        watchIdRef.current = navigator.geolocation.watchPosition((position) => {
            const ts = position.timestamp || Date.now();
            const coords = position.coords;
            const next: GeoPoint = { lat: coords.latitude, lon: coords.longitude, timestamp: ts, elapsedMs: activeElapsedAt(ts), accuracy: Number.isFinite(coords.accuracy) ? Number(coords.accuracy) : undefined, altitude: Number.isFinite(coords.altitude) ? Number(coords.altitude) : undefined, speed: Number.isFinite(coords.speed) ? Number(coords.speed) : undefined };
            setAccuracy(Number.isFinite(next.accuracy) ? Number(next.accuracy) : null);
            if (pausedRef.current) {
                setGpsMessage(copy.pause);
                return;
            }
            setGpsMessage(Number(next.accuracy || 0) > 45 ? copy.gpsPoor : copy.gpsReady);
            const previous = pointsRef.current[pointsRef.current.length - 1];
            if (!shouldAcceptRunningPoint(previous, next))
                return;
            pointsRef.current = [...pointsRef.current, next];
            setPoints(pointsRef.current);
        }, () => setGpsMessage(copy.gpsDenied), { enableHighAccuracy: true, maximumAge: 1500, timeout: 15000 });
    }, [activeElapsedAt, activitySport, copy.gpsDenied, copy.gpsPoor, copy.gpsReady, copy.gpsUnknown, copy.pause, effectivePreset, lang, speakCoach, stopWatch]);
    const startCountdown = React.useCallback(() => {
        if (countdown != null || isRecording)
            return;
        setCountdown(3);
        let n = 3;
        const id = window.setInterval(() => { n -= 1; if (n <= 0) {
            window.clearInterval(id);
            setCountdown(0);
            try {
                navigator.vibrate?.(120);
            }
            catch { }
            window.setTimeout(() => { setCountdown(null); void startGpsRun(); }, 500);
        }
        else {
            setCountdown(n);
            try {
                navigator.vibrate?.(45);
            }
            catch { }
        } }, 850);
    }, [countdown, isRecording, startGpsRun]);
    const togglePause = React.useCallback(() => {
        if (!isRecording)
            return;
        if (!pausedRef.current) {
            pausedRef.current = true;
            pauseStartedRef.current = Date.now();
            setPaused(true);
            if (nativeTrackingActiveRef.current) void pauseNativeTracking();
            return;
        }
        const resumed = Date.now();
        if (pauseStartedRef.current)
            pausedTotalRef.current += Math.max(0, resumed - pauseStartedRef.current);
        pauseStartedRef.current = 0;
        pausedRef.current = false;
        setPaused(false);
        if (nativeTrackingActiveRef.current) void resumeNativeTracking();
        setNow(resumed);
    }, [isRecording]);
    const addLap = React.useCallback(() => {
        if (!isRecording || paused)
            return;
        const currentElapsed = activeElapsedAt(Date.now());
        const distance = activitySport === "treadmill" ? treadmillDistanceRef.current : routeDistanceMeters(pointsRef.current);
        const lapMs = currentElapsed - lastLapElapsedRef.current;
        const lapDistanceM = distance - lastLapDistanceRef.current;
        if (lapMs < 1000)
            return;
        const lap: ActivityLap = { index: manualLaps.length + 1, elapsedMs: currentElapsed, lapMs, distanceM: distance, lapDistanceM, paceSecPerKm: averagePaceSecPerKm(lapDistanceM, lapMs) };
        setManualLaps((rows) => [...rows, lap]);
        lastLapElapsedRef.current = currentElapsed;
        lastLapDistanceRef.current = distance;
        setSplitToast(`${copy.lap} ${lap.index} · ${formatDuration(lapMs)} · ${formatPace(lap.paceSecPerKm)}/km`);
        try {
            navigator.vibrate?.(70);
        }
        catch { }
    }, [activeElapsedAt, activitySport, copy.lap, isRecording, manualLaps.length, paused]);
    const cancelRun = React.useCallback(() => { stopWatch(); if (nativeTrackingActiveRef.current) { void stopNativeTracking(); nativeTrackingActiveRef.current = false; } setIsRecording(false); setPaused(false); pausedRef.current = false; pointsRef.current = []; setPoints([]); setManualLaps([]); setGpsMessage(""); setView("setup"); }, [stopWatch]);
    const finishRun = React.useCallback(async () => {
        let routeForSave = pointsRef.current;
        if (nativeTrackingActiveRef.current && activitySport !== "treadmill") {
            const native = await stopNativeTracking();
            nativeTrackingActiveRef.current = false;
            if (native?.route?.length) { routeForSave = native.route; pointsRef.current = native.route; setPoints(native.route); }
        }
        const indoorDistance = treadmillDistanceRef.current;
        if (activitySport === "treadmill" ? indoorDistance < 10 : routeForSave.length < 2) { setGpsMessage(activitySport === "treadmill" ? (pickLegacyLocalizedText(lang, "Distance insuffisante pour enregistrer la séance.", "Not enough distance to save the workout.", "Distancia insuficiente para guardar la sesión.")) : copy.insufficient); return; }
        stopWatch();
        const endedAt = Date.now();
        let pauseTotal = pausedTotalRef.current;
        if (pausedRef.current && pauseStartedRef.current)
            pauseTotal += endedAt - pauseStartedRef.current;
        const elapsed = Math.max(1, endedAt - startedAtRef.current - pauseTotal);
        const route = activitySport === "treadmill" ? [] : routeForSave;
        const distanceM = activitySport === "treadmill" ? indoorDistance : routeDistanceMeters(route);
        const splits = activitySport === "treadmill" ? buildTreadmillSplits(sensorSamplesRef.current) : buildKilometerSplits(route, startedAtRef.current);
        const finalGhostDelta = activitySport !== "treadmill" && ghostEnabled ? runningGhostMatch(selectedRoute, route[route.length - 1], distanceM, elapsed)?.deltaMs ?? null : null;
        const record: ActivityRecord = { id: makeId(), sport: activitySport, source: activitySport === "treadmill" ? "manual" : "phone-gps", verification: activitySport === "treadmill" && sensorSnapshot.devices.some((device) => device.connected) ? "connected" : activitySport === "treadmill" ? "declared" : "gps", startedAt: startedAtRef.current, endedAt, elapsedMs: elapsed, movingMs: activitySport === "treadmill" ? elapsed : (movingTimeMs(route) || elapsed), distanceM, avgSpeedMps: averageSpeedMps(distanceM, elapsed), avgPaceSecPerKm: averagePaceSecPerKm(distanceM, elapsed), elevationGainM: activitySport === "treadmill" ? 0 : elevationGainMeters(route), route, splits, targetDistanceM, targetDurationMs, targetPaceSecPerKm, workoutType: effectivePreset.type, manualLaps, planId, planSessionId, title: `${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)}`, shoeId: selectedShoeId || undefined, routeReferenceId: selectedRoute?.id, ghostEnabled: activitySport !== "treadmill" && ghostEnabled && !!selectedRoute, ghostDeltaMs: finalGhostDelta, deviceName: activitySport === "treadmill" ? (sensorSnapshot.devices.find((device) => device.kind === "fitness-machine-treadmill" && device.connected)?.name || sensorSnapshot.devices.find((device) => device.kind === "running-speed-cadence" && device.connected)?.name || "Tapis roulant") : (wasNativeTracking ? "Android Native GPS" : "Phone GPS"), sensorSamples: sensorSamplesRef.current.length ? [...sensorSamplesRef.current] : undefined, sensorDevices: sensorSnapshot.devices.filter((device) => device.connected).map((device) => ({ kind: device.kind, name: device.name })), indoor: activitySport === "treadmill" || undefined, treadmill: activitySport === "treadmill" ? { distanceSource: treadmillDistanceSource(sensorSnapshot.devices.filter((device) => device.connected).map((device) => ({ kind: device.kind, name: device.name })), sensorSamplesRef.current, manualTreadmillSpeedKmh), manualSpeedKmh: manualTreadmillSpeedKmh, inclinePercent: averageTreadmillIncline(sensorSamplesRef.current) ?? manualTreadmillIncline } : undefined, createdAt: Date.now() };
        const prior = buildRunningStats(activities, Date.now(), localeForLang(lang));
        const badges: string[] = [];
        if (!activities.length)
            badges.push(copy.firstRun);
        if (distanceM > prior.longestM && prior.longestM > 0)
            badges.push(copy.longestBadge);
        if (activitySport !== "treadmill") for (const d of [1000, 5000, 10000]) {
            const current = bestEffortMs(route, d);
            const previous = d === 1000 ? prior.best1k : d === 5000 ? prior.best5k : prior.best10k;
            if (current && (!previous || current < previous.elapsedMs))
                badges.push(`${copy.personalBest} · ${d / 1000} KM`);
        }
        if (hasNegativeSplit(splits))
            badges.push(copy.negative);
        const consistency = splitConsistencyScore(splits);
        if (consistency != null && consistency >= 90)
            badges.push(`${copy.consistency} · ${consistency}%`);
        await saveActivity(record);
        setFinishBadges(badges);
        setIsRecording(false);
        setPaused(false);
        pausedRef.current = false;
        setSelected(record);
        await refreshActivities();
        setView("detail");
    }, [activities, activitySport, copy.consistency, copy.firstRun, copy.insufficient, copy.longestBadge, copy.negative, copy.personalBest, effectivePreset, ghostEnabled, lang, manualLaps, planId, planSessionId, refreshActivities, selectedRoute, selectedShoeId, sensorSnapshot.devices, stopWatch, targetDistanceM, targetDurationMs, targetPaceSecPerKm]);
    const removeSelected = React.useCallback(async () => { if (!selected)
        return; await deleteActivity(selected.id); setSelected(null); await refreshActivities(); setView("history"); }, [refreshActivities, selected]);
    const updateSelected = React.useCallback(async (patch: Partial<ActivityRecord>) => {
        if (!selected) return;
        const next = { ...selected, ...patch };
        setSelected(next);
        await saveActivity(next);
        await refreshActivities();
    }, [refreshActivities, selected]);
    const selectManualPreset = React.useCallback((id: string) => {
        setSelectedPresetId(id);
        setPlanId(undefined);
        setPlanSessionId(undefined);
        setPresetOverrideTitle(null);
        setPresetOverrideDurationMs(null);
    }, []);
    const selectRoute = React.useCallback((route: RunningRouteTemplate) => {
        setSelectedRouteId(route.id);
        setGhostEnabled(true);
        selectManualPreset("free");
        setSetupTab("quick");
    }, [selectManualPreset]);
    const applyTerrainRecommendation = React.useCallback(() => {
        if (!selectedTerrainAdvice) return;
        selectManualPreset(selectedTerrainAdvice.presetId);
        setSetupTab(selectedTerrainAdvice.presetId === "hills" || ["easy", "tempo", "intervals", "long", "recovery"].includes(selectedTerrainAdvice.presetId) ? "training" : "quick");
    }, [selectManualPreset, selectedTerrainAdvice]);
    const toggleFavoriteRoute = React.useCallback((route: RunningRouteTemplate) => {
        const saved = savedRoutes.find((item) => item.id === route.id || (!!route.sourceActivityId && item.sourceActivityId === route.sourceActivityId));
        if (saved) {
            const next = removeRunningRoute(saved.id);
            setSavedRoutes(next);
            if (selectedRouteId === saved.id) setSelectedRouteId(null);
            return;
        }
        const source = route.sourceActivityId ? activities.find((activity) => activity.id === route.sourceActivityId) : null;
        if (!source) return;
        const favorite = favoriteRouteFromActivity(source, route.name);
        const next = upsertRunningRoute(favorite);
        setSavedRoutes(next);
        if (selectedRouteId === route.id) setSelectedRouteId(favorite.id);
    }, [activities, savedRoutes, selectedRouteId]);
    const startPlanSession = React.useCallback((plan: RunningPlanState, session: RunningPlanSession) => {
        setPlanId(plan.id);
        setPlanSessionId(session.id);
        setPresetOverrideTitle(session.title);
        setPresetOverrideDurationMs(session.targetDurationMs || null);
        if (session.customWorkout) {
            setCustomWorkout({ ...session.customWorkout, title: session.title });
            setSelectedPresetId("custom");
            setSetupTab("custom");
        } else {
            setSelectedPresetId(session.presetId);
            setSetupTab(session.presetId === "pacer" ? "pacer" : ["easy", "tempo", "intervals", "long", "hills", "recovery"].includes(session.presetId) ? "training" : "quick");
        }
        setView("setup");
    }, []);
    const infoDot = <InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.6 }}>{copy.info}<br /><br /><b>{copy.local}</b></div>}/>;
    if (countdown != null)
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH, minHeight: "78vh", display: "grid", placeItems: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: textSoft, fontWeight: 1000, letterSpacing: 2 }}>{copy.countdown}</div><div style={{ marginTop: 8, fontSize: "clamp(88px,28vw,150px)", lineHeight: 1, fontWeight: 1000, color: accent, textShadow: `0 0 34px ${accent}77` }}>{countdown === 0 ? copy.go : countdown}</div><div style={{ marginTop: 14, fontWeight: 900 }}>{presetLabel(effectivePreset, lang)}</div></div></div>;
    if (view === "record") {
        const deltaGood = paceDelta != null && paceDelta <= 0;
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH, paddingBottom: 190 }}>
      <PageHeader title={copy.title} subtitle={`${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)} · ${paused ? copy.pause : copy.recordSub}`} left={<BackDot onClick={cancelRun}/>} right={infoDot}/>
      {splitToast ? <div style={{ position: "fixed", top: 88, left: "50%", transform: "translateX(-50%)", zIndex: 90, width: "min(92vw,440px)", padding: "10px 14px", borderRadius: 999, textAlign: "center", background: "rgba(5,8,13,.92)", border: `1px solid ${accent}66`, color: accent, fontWeight: 1000, fontSize: 11, boxShadow: "0 12px 36px rgba(0,0,0,.55)", backdropFilter: "blur(14px)" }}>{splitToast}</div> : null}

      <div className="card" style={{ padding: 15, textAlign: "center", borderColor: `${accent}40`, background: `radial-gradient(circle at 50% 0,${accent}18,rgba(8,10,16,.82) 58%)` }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}><StatusPill text={gpsMessage || copy.gpsUnknown} good={gpsMessage === copy.gpsReady} accent={accent}/><StatusPill text={paused ? copy.pause : copy.verified} good={!paused} accent={accent}/></div>
        <div style={{ marginTop: 13, fontSize: 10, color: textSoft, fontWeight: 1000, letterSpacing: 1 }}>{copy.distance}</div><div style={{ fontSize: "clamp(52px,15vw,78px)", lineHeight: 1.02, fontWeight: 1000, color: accent, textShadow: `0 0 28px ${accent}30` }}>{(liveDistance / 1000).toFixed(2)}<small style={{ fontSize: 17, marginLeft: 5 }}>KM</small></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 13 }}><HeroMetric label={copy.time} value={formatDuration(elapsedMs)}/><HeroMetric label={copy.avgPace} value={`${formatPace(livePace)}/km`}/><HeroMetric label={copy.livePace} value={`${formatPace(rollingPace)}/km`}/></div>
        {progress != null ? <div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: textSoft, fontWeight: 900 }}><span>{copy.target} · {targetDistanceM ? distanceLabel(targetDistanceM) : formatDuration(targetDurationMs || 0)}</span><span style={{ color: targetReached ? "#71ff9a" : accent }}>{targetReached ? copy.targetReached : `${Math.round(progress)}%`}</span></div><Progress value={progress} accent={targetReached ? "#71ff9a" : accent}/></div> : null}
      </div>

      {phase ? <div style={{ marginTop: 10 }}><Section title={copy.phase} right={<span style={{ color: phase.step.tone === "hard" ? "#ff8a67" : accent, fontSize: 10, fontWeight: 1000 }}>{phase.label}</span>}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}><div><div style={{ fontSize: 10, color: textSoft }}>{copy.remaining}</div><div style={{ fontSize: 26, fontWeight: 1000 }}>{formatDuration(phase.remainingMs)}</div></div><div style={{ fontSize: 10, color: textSoft }}>#{phase.index + 1}/{effectivePreset.steps?.length || 1}</div></div><Progress value={phase.progress} accent={phase.step.tone === "hard" ? "#ff8a67" : accent}/></Section></div> : null}

      {targetPaceSecPerKm ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 10 }}><Metric label={copy.targetPace} value={`${formatPace(targetPaceSecPerKm)}/km`} accent={accent}/><Metric label={deltaGood ? copy.ahead : copy.behind} value={formatSignedDuration(paceDelta)} accent={deltaGood ? "#71ff9a" : "#ff8a67"}/><Metric label={copy.projected} value={projected ? formatDuration(projected) : "—"} accent={accent}/></div> : null}

      {selectedRoute && selectedRouteHasReference && ghostEnabled ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "GHOST · SORTIE DE RÉFÉRENCE", "GHOST · REFERENCE RUN", "GHOST · CARRERA DE REFERENCIA")} right={<span style={{ color: liveGhostMatch?.matchedBy === "position" ? "#71ff9a" : accent, fontSize: 8.5, fontWeight: 1000 }}>{liveGhostMatch?.matchedBy === "position" ? (pickLegacyLocalizedText(lang, "SUR LE TRACÉ", "ON ROUTE", "EN RUTA")) : selectedRoute.name}</span>}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><MiniStat label={pickLegacyLocalizedText(lang, "RÉFÉRENCE", "REFERENCE", "REFERENCIA")} value={formatDuration(selectedRoute.referenceElapsedMs)} accent={accent}/><MiniStat label={liveGhostDelta != null && liveGhostDelta <= 0 ? copy.ahead : copy.behind} value={liveGhostDelta == null ? "—" : formatDuration(Math.abs(liveGhostDelta))} accent={liveGhostDelta != null && liveGhostDelta <= 0 ? "#71ff9a" : "#ff8a67"}/><MiniStat label={copy.targetDistance} value={formatDistance(selectedRoute.distanceM)} accent={accent}/></div></Section></div> : null}

      {selectedRoute && ["trail", "hiking", "walking", "nordic-walking"].includes(activitySport) ? <OutdoorRouteNavigationPanel route={selectedRoute} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft} mode="live" liveDistanceM={liveDistance} elapsedMs={elapsedMs} currentPoint={points[points.length - 1] || null} liveElevationGainM={liveElevation} extras={routeExtras}/> : null}

      {activitySport !== "treadmill" ? <div style={{ marginTop: 10 }}><Section title={copy.route} right={<span style={{ fontSize: 9.5, color: textSoft }}>{points.length} GPS</span>}><RouteMap points={points} accent={accent} waiting={copy.waiting}/></Section></div> : <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "TAPIS ROULANT · LIVE", "TREADMILL · LIVE", "CINTA · LIVE")}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><MiniStat label={copy.speed} value={`${((sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? manualTreadmillSpeedKmh / 3.6) * 3.6).toFixed(1)} km/h`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "INCLINAISON", "INCLINE", "INCLINACIÓN")} value={`${(sensorSnapshot.inclinePercent ?? manualTreadmillIncline).toFixed(1)}%`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "SOURCE", "SOURCE", "FUENTE")} value={sensorSnapshot.devices.some((d) => d.kind === "fitness-machine-treadmill" && d.connected) ? "FTMS" : sensorSnapshot.devices.some((d) => d.kind === "running-speed-cadence" && d.connected) ? "FOOTPOD" : "MANUEL"} accent={accent}/></div></Section></div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Metric label={copy.speed} value={`${liveSpeed.toFixed(1)} km/h`} accent={accent}/><Metric label={copy.elevation} value={`+${Math.round(liveElevation)} m`} accent={accent}/><Metric label={copy.accuracy} value={accuracy ? `±${Math.round(accuracy)} m` : "—"} accent={accent}/><Metric label={copy.moving} value={formatDuration(liveMoving || elapsedMs)} accent={accent}/></div>
      {(sensorSnapshot.heartRateBpm || sensorSnapshot.cadenceSpm || sensorSnapshot.sensorSpeedMps) ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 8 }}><Metric label="CARDIO" value={sensorSnapshot.heartRateBpm ? `${sensorSnapshot.heartRateBpm} bpm` : "—"} accent="#ff7b8b"/><Metric label="CADENCE" value={sensorSnapshot.cadenceSpm ? `${sensorSnapshot.cadenceSpm} spm` : "—"} accent={accent}/><Metric label="CAPTEUR" value={sensorSnapshot.sensorSpeedMps ? `${(sensorSnapshot.sensorSpeedMps * 3.6).toFixed(1)} km/h` : "—"} accent={accent}/></div> : null}
      {liveSplits.length ? <div style={{ marginTop: 10 }}><Section title={copy.splits}><SplitTable splits={liveSplits.slice(-4)} accent={accent}/></Section></div> : null}
      {manualLaps.length ? <div style={{ marginTop: 10 }}><Section title={copy.laps}><LapTable laps={manualLaps.slice(-4)} accent={accent}/></Section></div> : null}

      <div style={recordDock}><button className="btn" onClick={addLap} disabled={!isRecording || paused} style={{ minHeight: 52, fontWeight: 1000 }}>{copy.lap}</button><button className="btn" onClick={togglePause} disabled={!isRecording} style={{ minHeight: 52, fontWeight: 1000 }}>{paused ? `▶ ${copy.resume}` : `Ⅱ ${copy.pause}`}</button><button className="btn primary" onClick={() => void finishRun()} disabled={!isRecording} style={{ minHeight: 52, fontWeight: 1000, background: accent }}>■ {copy.finish}</button></div>
    </div>;
    }
    if (view === "history") {
        const filtered = activities.filter((a) => historyFilter === "all" || historyFilter === "free" && (!a.workoutType || a.workoutType === "free" || a.workoutType === "distance") || historyFilter === "pacer" && a.workoutType === "pacer" || historyFilter === "training" && ["easy", "tempo", "intervals", "hills", "long"].includes(String(a.workoutType)));
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={copy.history} subtitle={`${activities.length} ${pickLegacyLocalizedText(lang, "sorties", "runs", "carreras")}`} left={<BackDot onClick={() => go("stats")}/>} right={infoDot}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>{(["all", "free", "training", "pacer"] as const).map((key, i) => <button key={key} className="btn" onClick={() => setHistoryFilter(key)} style={{ minHeight: 34, padding: "5px 4px", fontSize: 8.5, fontWeight: 1000, borderColor: historyFilter === key ? `${accent}77` : undefined, color: historyFilter === key ? accent : undefined }}>{copy.filters[i]}</button>)}</div>
      {filtered.length ? <div style={{ display: "grid", gap: 9, marginTop: 11 }}>{filtered.map((a) => <HistoryCard key={a.id} activity={a} lang={lang} accent={accent} onClick={() => { setSelected(a); setFinishBadges([]); setView("detail"); }}/>)}</div> : <Empty text={copy.empty} accent={accent}/>}
    </div>;
    }
    if (view === "plan") {
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={copy.plan} subtitle={pickLegacyLocalizedText(lang, "Construis ta progression semaine après semaine", "Build progress week by week", "Construye tu progresión semana a semana")} left={<BackDot onClick={() => go("running_plan")}/>} right={infoDot}/><div style={{ marginTop: 10 }}><RunningPlanView activities={activities} lang={lang} accent={accent} textSoft={textSoft} onStart={startPlanSession}/></div></div>;
    }
    if (view === "goal") {
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={pickLegacyLocalizedText(lang, "OBJECTIF DE COURSE", "RACE GOAL", "OBJETIVO DE CARRERA")} subtitle={pickLegacyLocalizedText(lang, "Date · chrono cible · allure · prédiction", "Date · target time · pace · prediction", "Fecha · tiempo objetivo · ritmo · predicción")} left={<BackDot onClick={() => go("running_plan")}/>} right={infoDot}/><div style={{ marginTop: 10 }}><RunningGoalView stats={stats} lang={lang} accent={accent} textSoft={textSoft}/></div></div>;
    }

    if (view === "records") {
        const records = [{ label: "400 M", value: stats.best400m }, { label: "1 KM", value: stats.best1k }, { label: "1 MILE", value: stats.bestMile }, { label: "5 KM", value: stats.best5k }, { label: "10 KM", value: stats.best10k }, { label: "21.1 KM", value: stats.bestHalf }, { label: "42.2 KM", value: stats.bestMarathon }];
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={copy.records} subtitle={copy.bestEfforts} left={<BackDot onClick={() => go("stats")}/>} right={infoDot}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, margin: "12px 0" }}><MiniStat label={copy.distance} value={formatDistance(stats.totalDistanceM)} accent={accent}/><MiniStat label={copy.longestLabel} value={formatDistance(stats.longestM)} accent={accent}/><MiniStat label={copy.avgPace} value={`${formatPace(stats.bestPaceSecPerKm)}/km`} accent={accent}/></div>
      <div style={{ display: "grid", gap: 10 }}>{records.map((r) => <div className="card" key={r.label} style={{ padding: 14, display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, alignItems: "center" }}><div style={{ width: 54, height: 54, display: "grid", placeItems: "center", borderRadius: 17, background: `${accent}14`, border: `1px solid ${accent}35`, color: accent, fontWeight: 1000 }}>{r.label}</div><div><div style={{ fontSize: 9.5, color: textSoft, fontWeight: 1000 }}>{copy.personalBest}</div><div style={{ fontSize: 25, fontWeight: 1000, color: r.value ? accent : undefined, marginTop: 2 }}>{r.value ? formatDuration(r.value.elapsedMs) : copy.noRecord}</div></div>{r.value ? <div style={{ textAlign: "right", fontSize: 9.5, color: textSoft }}>{activityDate(r.value.startedAt, lang)}</div> : null}</div>)}</div>
      <div style={{ marginTop: 12 }}><Section title={pickLegacyLocalizedText(lang, "PROGRESSION 4 SEMAINES", "4-WEEK PROGRESS", "PROGRESO 4 SEMANAS")}><Bars rows={stats.fourWeeks.map((w) => ({ label: w.label, value: w.distanceM / 1000 }))} accent={accent}/></Section></div>
    </div>;
    }
    if (view === "detail" && selected) {
        const consistency = splitConsistencyScore(selected.splits);
        const neg = hasNegativeSplit(selected.splits);
        const e1 = bestEffortMs(selected.route, 1000), e5 = bestEffortMs(selected.route, 5000), e10 = bestEffortMs(selected.route, 10000);
        const selectedShoe = shoes.find((shoe) => shoe.id === selected.shoeId) || null;
        const savedRoute = savedRoutes.find((route) => route.sourceActivityId === selected.id) || null;
        const detailTerrain = analyzeRunningTerrain(selected.route || []);
        const detailSensors = sensorSummaryForActivity(selected);
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={copy.complete} subtitle={activityDate(selected.startedAt, lang)} left={<BackDot onClick={() => setView("history")}/>} right={infoDot}/>
      <div className="card" style={{ padding: "18px 14px", textAlign: "center", borderColor: `${accent}48`, background: `radial-gradient(circle at 50% 0,${accent}18,rgba(8,10,16,.84) 58%)` }}><div style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 999, border: `1px solid ${accent}55`, color: accent, fontSize: 9.5, fontWeight: 1000 }}>✓ {copy.verified}</div><div style={{ fontSize: "clamp(48px,14vw,72px)", fontWeight: 1000, color: accent, lineHeight: 1.05, marginTop: 12 }}>{formatDistance(selected.distanceM)}</div><div style={{ fontWeight: 1000, marginTop: 5 }}>{selected.title || String(selected.workoutType || "RUNNING").toUpperCase()}</div></div>
      {finishBadges.length ? <div style={{ marginTop: 10 }}><Section title={copy.achievements}><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{finishBadges.map((b) => <span key={b} style={{ padding: "7px 9px", borderRadius: 999, border: `1px solid ${accent}55`, background: `${accent}10`, color: accent, fontSize: 9.5, fontWeight: 1000 }}>🏆 {b}</span>)}</div></Section></div> : null}
      <div style={{ marginTop: 10 }}><Section title={copy.feedback}><div style={{ fontSize: 9, color: textSoft, fontWeight: 1000 }}>{copy.effort}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(10,minmax(0,1fr))", gap: 4, marginTop: 6 }}>{Array.from({ length: 10 }, (_, i) => i + 1).map((value) => <button key={value} className="btn" onClick={() => void updateSelected({ effortRating: value })} style={{ minWidth: 0, minHeight: 32, padding: 0, fontSize: 8.5, fontWeight: 1000, borderColor: selected.effortRating === value ? `${accent}88` : undefined, color: selected.effortRating === value ? accent : undefined }}>{value}</button>)}</div><div style={{ fontSize: 9, color: textSoft, fontWeight: 1000, marginTop: 10 }}>{copy.feeling}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5, marginTop: 6 }}>{([['great','😄'],['good','🙂'],['normal','😐'],['tired','😮‍💨'],['hard','🥵']] as const).map(([value, icon]) => <button key={value} className="btn" onClick={() => void updateSelected({ feeling: value })} style={{ minHeight: 38, padding: 3, fontSize: 17, borderColor: selected.feeling === value ? `${accent}88` : undefined, background: selected.feeling === value ? `${accent}10` : undefined }}>{icon}</button>)}</div><div style={{ fontSize: 9, color: textSoft, fontWeight: 1000, marginTop: 10 }}>{copy.notes}</div><textarea value={selected.notes || ""} onChange={(event) => setSelected({ ...selected, notes: event.target.value.slice(0, 500) })} onBlur={() => { if (selected) void saveActivity(selected).then(refreshActivities); }} placeholder={pickLegacyLocalizedText(lang, "Comment s’est passée la sortie ?", "How did the run feel?", "¿Cómo fue la carrera?")} style={{ width: "100%", minHeight: 72, marginTop: 6, resize: "vertical", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.16)", color: "inherit", padding: 10, font: "inherit", fontSize: 10, outline: "none" }}/></Section></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}><Metric label={copy.time} value={formatDuration(selected.elapsedMs)} accent={accent}/><Metric label={copy.moving} value={formatDuration(selected.movingMs)} accent={accent}/><Metric label={copy.avgPace} value={`${formatPace(selected.avgPaceSecPerKm)}/km`} accent={accent}/><Metric label={copy.speed} value={`${(selected.avgSpeedMps * 3.6).toFixed(1)} km/h`} accent={accent}/><Metric label={copy.elevation} value={`+${Math.round(selected.elevationGainM)} m`} accent={accent}/><Metric label={copy.consistency} value={consistency == null ? "—" : `${consistency}%`} accent={accent}/></div>
      {detailSensors.sampleCount ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "CAPTEURS & PHYSIO", "SENSORS & PHYSIO", "SENSORES Y FISIO")}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><MiniStat label={pickLegacyLocalizedText(lang, "FC MOY.", "AVG HR", "FC MEDIA")} value={detailSensors.avgHeartRateBpm == null ? "—" : `${Math.round(detailSensors.avgHeartRateBpm)} bpm`} accent={accent}/><MiniStat label={pickLegacyBilingualText(lang, "FC MAX", "MAX HR")} value={detailSensors.maxHeartRateBpm == null ? "—" : `${Math.round(detailSensors.maxHeartRateBpm)} bpm`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "CADENCE MOY.", "AVG CADENCE", "CADENCIA MEDIA")} value={detailSensors.avgCadenceSpm == null ? "—" : `${Math.round(detailSensors.avgCadenceSpm)} spm`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "VITESSE CAPTEUR", "SENSOR SPEED", "VELOCIDAD SENSOR")} value={detailSensors.avgSensorSpeedMps == null ? "—" : `${(detailSensors.avgSensorSpeedMps * 3.6).toFixed(1)} km/h`} accent={accent}/></div>{selected.sensorDevices?.length ? <div style={{ marginTop: 8, fontSize: 8.4, color: textSoft }}>{selected.sensorDevices.map((device) => device.name).join(" · ")}</div> : null}</Section></div> : null}
      {detailTerrain.hasElevation ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "RELIEF DE LA SORTIE", "RUN ELEVATION", "DESNIVEL DE LA CARRERA")}><RunningElevationProfile points={selected.route} accent={accent} textSoft={textSoft}/><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 8 }}><MiniStat label={pickLegacyLocalizedText(lang, "DIFFICULTÉ", "DIFFICULTY", "DIFICULTAD")} value={`${detailTerrain.difficultyScore}/100`} accent={accent}/><MiniStat label="D−" value={`−${Math.round(detailTerrain.lossM)} m`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "CÔTES", "HILLS", "CUESTAS")} value={String(detailTerrain.hills.length)} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "PENTE MAX", "MAX GRADE", "PEND. MAX")} value={`${detailTerrain.maxGradePct.toFixed(1)}%`} accent={accent}/></div></Section></div> : null}
      {(selected.ghostDeltaMs != null || selectedShoe) ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "COMPARAISON & ÉQUIPEMENT", "COMPARISON & GEAR", "COMPARACIÓN Y EQUIPO")}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{selected.ghostDeltaMs != null ? <MiniStat label={selected.ghostDeltaMs <= 0 ? copy.ahead : copy.behind} value={formatDuration(Math.abs(selected.ghostDeltaMs))} accent={selected.ghostDeltaMs <= 0 ? "#71ff9a" : "#ff8a67"}/> : null}{selectedShoe ? <MiniStat label={pickLegacyLocalizedText(lang, "CHAUSSURES", "SHOES", "ZAPATILLAS")} value={selectedShoe.name} accent={accent}/> : null}</div></Section></div> : null}
      <div style={{ marginTop: 10 }}><Section title={copy.bestEfforts}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><Effort label="1 KM" value={e1} accent={accent}/><Effort label="5 KM" value={e5} accent={accent}/><Effort label="10 KM" value={e10} accent={accent}/></div>{neg ? <div style={{ marginTop: 9, color: "#71ff9a", fontSize: 10, fontWeight: 1000 }}>✓ {copy.negative}</div> : null}</Section></div>
      {!selected.indoor ? <div style={{ marginTop: 10 }}><Section title={copy.route} right={<button className="btn" onClick={() => { if (savedRoute) { setSavedRoutes(removeRunningRoute(savedRoute.id)); } else { setSavedRoutes(upsertRunningRoute(favoriteRouteFromActivity(selected))); } }} style={{ minHeight: 30, padding: "4px 8px", fontSize: 8.5, color: savedRoute ? accent : undefined, borderColor: savedRoute ? `${accent}77` : undefined }}>{savedRoute ? "★ " : "☆ "}{pickLegacyLocalizedText(lang, "FAVORI", "FAVORITE", "FAVORITA")}</button>}><RouteMap points={selected.route} accent={accent} waiting={copy.waiting}/></Section></div> : null}
      <div style={{ marginTop: 10 }}><RunningRunAnalysisPanel activity={selected} lang={lang} accent={accent} textSoft={textSoft}/></div>
      <div style={{ marginTop: 10 }}><Section title={copy.splits}>{selected.splits.length ? <SplitTable splits={selected.splits} accent={accent}/> : <div style={{ color: textSoft, fontSize: 10 }}>—</div>}</Section></div>
      {selected.manualLaps?.length ? <div style={{ marginTop: 10 }}><Section title={copy.laps}><LapTable laps={selected.manualLaps} accent={accent}/></Section></div> : null}
      <button className="btn danger" style={{ width: "100%", marginTop: 2, fontWeight: 1000 }} onClick={() => void removeSelected()}>{copy.delete}</button>
    </div>;
    }
    return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={copy.title} subtitle={copy.setupSub} left={<BackDot onClick={() => go("home")}/>} right={infoDot}/>
    <OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={lang} accent={accent}/><div style={{ textAlign: "center", margin: "2px 0 9px" }}><span style={{ display: "inline-flex", padding: "5px 9px", borderRadius: 999, border: `1px solid ${accent}45`, background: `${accent}0e`, color: accent, fontSize: 8.8, fontWeight: 1000 }}>{copy.local}</span></div>
    <RunningTabs items={[{ id: "workout" as const, label: pickLegacyLocalizedText(lang, "SÉANCE", "WORKOUT", "SESIÓN"), icon: "🏃" }, ...(activitySport !== "treadmill" ? [{ id: "route" as const, label: pickLegacyLocalizedText(lang, "PARCOURS", "ROUTE", "RUTA"), icon: "🗺️", badge: routeOptions.length || null }] : []), { id: "ready" as const, label: pickLegacyLocalizedText(lang, "PRÉPA", "READY", "PREPARAR"), icon: "✓" }]} value={setupPanel} onChange={setSetupPanel} accent={accent} sticky />

    <div style={{ display: setupPanel === "workout" ? "block" : "none" }}>
    <RunningTabs items={[{ id: "quick" as const, label: copy.quick, icon: "⚡" }, { id: "training" as const, label: copy.training, icon: "📋" }, ...(sportProfile.supportsPacer ? [{ id: "pacer" as const, label: copy.pacer, icon: "⏱️" }] : []), ...(sportProfile.supportsIntervals ? [{ id: "custom" as const, label: copy.custom, icon: "✦" }] : [])]} value={setupTab} onChange={(key) => { setSetupTab(key); if (key === "pacer") selectManualPreset("pacer"); if (key === "custom") selectManualPreset("custom"); }} accent={accent} />

    {setupTab === "quick" ? <div style={{ marginTop: 10 }}><Section title={copy.quick}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>{PRESETS.filter((p) => ["free", "distance-1k", "distance-5k", "distance-10k"].includes(p.id) && allowedPresetIds.has(p.id)).map((p) => <PresetCard key={p.id} preset={p} lang={lang} selected={selectedPresetId === p.id} accent={accent} onClick={() => selectManualPreset(p.id)}/>)}</div></Section></div> : null}
    {setupTab === "training" ? <div style={{ marginTop: 10 }}><Section title={copy.training}><div style={{ display: "grid", gap: 8 }}>{PRESETS.filter((p) => ["easy", "tempo", "intervals", "hills", "long", "recovery"].includes(p.id) && allowedPresetIds.has(p.id)).map((p) => <TrainingCard key={p.id} preset={p} lang={lang} selected={selectedPresetId === p.id} accent={accent} onClick={() => selectManualPreset(p.id)}/>)}</div></Section></div> : null}
    {setupTab === "pacer" ? <div style={{ marginTop: 10 }}><Section title={copy.pacer}><div style={{ fontSize: 10, color: textSoft, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Choisis une distance et une allure. Pendant la course, le PACER affiche ton avance ou ton retard et projette ton temps d’arrivée.", "Choose a distance and pace. During the run, PACER shows live ahead/behind time and projected finish.", "Elige distancia y ritmo. Durante la carrera, PACER muestra tu adelanto o retraso y proyecta tu llegada.")}</div><div style={{ marginTop: 12, fontSize: 9.5, color: textSoft, fontWeight: 1000 }}>{copy.targetDistance}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{PACER_DISTANCES.map((m) => <Choice key={m} active={pacerDistanceM === m} accent={accent} onClick={() => { setPacerDistanceM(m); selectManualPreset("pacer"); }}>{distanceLabel(m)}</Choice>)}</div><div style={{ marginTop: 12, fontSize: 9.5, color: textSoft, fontWeight: 1000 }}>{copy.targetPace}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{PACE_OPTIONS.map((p) => <Choice key={p} active={pacerPace === p} accent={accent} onClick={() => { setPacerPace(p); selectManualPreset("pacer"); }}>{formatPace(p)}/km</Choice>)}</div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><MiniStat label={copy.targetDistance} value={distanceLabel(pacerDistanceM)} accent={accent}/><MiniStat label={copy.targetPace} value={`${formatPace(pacerPace)}/km`} accent={accent}/><MiniStat label={copy.expected} value={formatDuration(pacerPace * pacerDistanceM)} accent={accent}/></div></Section></div> : null}

    {setupTab === "custom" ? <div style={{ marginTop: 10 }}><Section title={copy.custom}><div style={{ color: textSoft, fontSize: 9.5, lineHeight: 1.45, marginBottom: 10 }}>{pickLegacyLocalizedText(lang, "Construis une séance d’intervalles instantanée. Les blocs s’enchaînent automatiquement et Awena peut les annoncer pendant la course.", "Build an instant interval workout. Blocks advance automatically and Awena can announce them while you run.", "Crea una sesión de intervalos instantánea. Los bloques avanzan automáticamente y Awena puede anunciarlos durante la carrera.")}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Adjuster label={pickLegacyLocalizedText(lang, "ÉCHAUFFEMENT", "WARM UP", "CALENTAMIENTO")} value={customWorkout.warmupMin} suffix="min" min={0} max={20} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, warmupMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RÉPÉTITIONS", "REPEATS", "REPETICIONES")} value={customWorkout.reps} suffix="×" min={2} max={12} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, reps: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "EFFORT", "WORK", "ESFUERZO")} value={customWorkout.workMin} suffix="min" min={1} max={10} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, workMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RÉCUPÉRATION", "RECOVERY", "RECUPERACIÓN")} value={customWorkout.recoveryMin} suffix="min" min={0} max={6} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, recoveryMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RETOUR AU CALME", "COOL DOWN", "VUELTA A LA CALMA")} value={customWorkout.cooldownMin} suffix="min" min={0} max={20} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, cooldownMin: value }))}/><MiniStat label={pickLegacyLocalizedText(lang, "DURÉE TOTALE", "TOTAL TIME", "DURACIÓN TOTAL")} value={formatDuration(customWorkoutPreset(customWorkout).targetDurationMs || 0)} accent={accent}/></div></Section></div> : null}

    </div>

    <RunningSurface accent={accent} active style={{ marginTop: 10 }}><div style={{ fontSize: 9.5, color: textSoft, fontWeight: 1000 }}>{copy.selected}</div><div style={{ display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 10, alignItems: "center", marginTop: 8 }}><div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 23 }}>{effectivePreset.icon}</div><div><div style={{ fontWeight: 1000, color: accent }}>{presetLabel(effectivePreset, lang)}</div><div style={{ color: textSoft, fontSize: 9.5, marginTop: 3, lineHeight: 1.35 }}>{presetSub(effectivePreset, lang)}</div></div>{targetDistanceM ? <b style={{ fontSize: 10 }}>{distanceLabel(targetDistanceM)}</b> : targetDurationMs ? <b style={{ fontSize: 10 }}>{formatDuration(targetDurationMs)}</b> : null}</div></RunningSurface>

    <div style={{ display: setupPanel === "route" ? "block" : "none" }}>
    {routeOptions.length ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "PARCOURS & GHOST", "ROUTES & GHOST", "RUTAS & GHOST")} right={selectedRoute ? <button className="btn" disabled={!selectedRouteHasReference} onClick={() => selectedRouteHasReference && setGhostEnabled((value) => !value)} style={{ minHeight: 30, padding: "4px 8px", fontSize: 8.5, fontWeight: 1000, opacity: selectedRouteHasReference ? 1 : .45, color: ghostEnabled ? accent : undefined, borderColor: ghostEnabled ? `${accent}77` : undefined }}>{selectedRouteHasReference ? `GHOST ${ghostEnabled ? "ON" : "OFF"}` : (pickLegacyLocalizedText(lang, "PARCOURS SEUL", "ROUTE ONLY", "SOLO RUTA"))}</button> : undefined}><div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.4, marginBottom: 8 }}>{pickLegacyLocalizedText(lang, "Rejoue un ancien parcours et compare ton temps au même endroit, en direct.", "Run a previous route again and compare your time at the same distance, live.", "Repite una ruta anterior y compara tu tiempo en el mismo punto, en directo.")}</div><div style={{ display: "grid", gap: 7 }}>{routeOptions.slice(0, 6).map((route) => { const active = selectedRouteId === route.id; const favorite = !!route.sourceActivityId && favoriteSourceIds.has(route.sourceActivityId); const routeTerrain = analyzeRunningTerrain(route.route); return <div key={route.id} className="card" style={{ padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center", borderRadius: 15, borderColor: active ? `${accent}66` : undefined, background: active ? `linear-gradient(145deg,${accent}16,rgba(4,6,10,.82))` : "linear-gradient(145deg,rgba(255,255,255,.038),rgba(4,6,10,.70))", boxShadow: active ? `0 14px 28px ${accent}10, inset 0 1px 0 ${accent}18` : "0 11px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)" }}><button type="button" onClick={() => selectRoute(route)} style={{ border: 0, background: "transparent", color: "inherit", padding: 0, textAlign: "left", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 1000, color: active ? accent : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.name}</div>{routeTerrain.hasElevation ? <span style={{ flex: "0 0 auto", padding: "2px 5px", borderRadius: 999, border: `1px solid ${accent}33`, color: accent, fontSize: 6.8, fontWeight: 1000 }}>{terrainLabel(routeTerrain.terrain, lang)} {routeTerrain.difficultyScore}</span> : null}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft }}>{formatDistance(route.distanceM)} · +{Math.round(routeTerrain.hasElevation ? routeTerrain.gainM : route.elevationGainM)} m · {routeTerrain.hasElevation ? `${routeTerrain.hills.length} ${pickLegacyLocalizedText(lang, "côtes", "hills", "cuestas")} · ` : ""}{route.referenceElapsedMs > 0 ? formatDuration(route.referenceElapsedMs) : (pickLegacyLocalizedText(lang, "sans chrono", "no timing", "sin tiempo"))}{route.source && route.source !== "activity" ? ` · ${route.source.toUpperCase()}` : ""}</div></button><button className="btn" onClick={() => toggleFavoriteRoute(route)} style={{ minWidth: 34, minHeight: 34, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}66` : undefined }}>{favorite ? "★" : "☆"}</button></div>; })}</div>{selectedRoute ? <div style={{ marginTop: 8 }}><RouteMap points={selectedRoute.route} accent={accent} waiting={copy.waiting}/>{selectedTerrain?.hasElevation ? <div style={{ marginTop: 8 }}><RunningElevationProfile points={selectedRoute.route} accent={accent} textSoft={textSoft}/><div className="card" style={{ marginTop: 7, padding: 10, borderColor: `${accent}33` }}><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><MiniStat label={pickLegacyLocalizedText(lang, "DIFFICULTÉ", "DIFFICULTY", "DIFICULTAD")} value={`${selectedTerrain.difficultyScore}/100`} accent={accent}/><MiniStat label="D+" value={`+${Math.round(selectedTerrain.gainM)} m`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "CÔTES", "HILLS", "CUESTAS")} value={String(selectedTerrain.hills.length)} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "PENTE MAX", "MAX GRADE", "PEND. MAX")} value={`${selectedTerrain.maxGradePct.toFixed(1)}%`} accent={accent}/></div><div style={{ marginTop: 8, fontSize: 9, lineHeight: 1.45, color: textSoft }}><b style={{ color: accent }}>{terrainLabel(selectedTerrain.terrain, lang)}</b> · {selectedTerrainAdvice?.text}</div>{selectedTerrainAdvice ? <button className="btn" onClick={applyTerrainRecommendation} style={{ width: "100%", minHeight: 38, marginTop: 8, fontSize: 8.5, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>{pickLegacyLocalizedText(lang, "APPLIQUER LA SÉANCE CONSEILLÉE", "APPLY RECOMMENDED WORKOUT", "APLICAR SESIÓN RECOMENDADA")}</button> : null}</div></div> : null}</div> : null}</Section></div> : null}

    {!routeOptions.length ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ textAlign: "center", color: textSoft, fontSize: 9.5, lineHeight: 1.5, padding: 12 }}>{pickLegacyLocalizedText(lang, "Aucun parcours enregistré pour le moment. Une sortie GPS ou un import GPX/TCX apparaîtra ici.", "No saved routes yet. A GPS run or GPX/TCX import will appear here.", "Todavía no hay rutas guardadas. Una carrera GPS o una importación GPX/TCX aparecerá aquí.")}</div></RunningSurface> : null}
    {selectedRoute && ["trail", "hiking", "walking", "nordic-walking"].includes(activitySport) ? <><OutdoorRouteNavigationPanel route={selectedRoute} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft} mode="preview" extras={routeExtras}/><OutdoorRoutePlannerPanel route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft} onChange={setRouteExtras}/></> : null}
    </div>

    <div style={{ display: setupPanel === "ready" ? "block" : "none" }}>
    <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "ÉQUIPEMENT", "GEAR", "EQUIPO")}>{shoes.length ? <><div style={{ color: textSoft, fontSize: 9.1, marginBottom: 8 }}>{pickLegacyLocalizedText(lang, "Associe une paire à cette sortie pour suivre son kilométrage dans Stats.", "Attach shoes to this run to track their mileage in Stats.", "Asocia unas zapatillas para seguir su kilometraje en Stats.")}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>{shoes.filter((shoe) => !shoe.retired).map((shoe) => <Choice key={shoe.id} active={selectedShoeId === shoe.id} accent={accent} onClick={() => setSelectedShoeId(selectedShoeId === shoe.id ? "" : shoe.id)}>👟 {shoe.name}</Choice>)}</div></> : <div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Aucune paire enregistrée. Ajoute tes chaussures depuis Stats > Équipement.", "No shoes saved yet. Add them from Stats > Gear.", "No hay zapatillas registradas. Añádelas desde Stats > Equipo.")}</div>}</Section></div>

    <div className="card" style={{ marginTop: 10, padding: 13, display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 10, alignItems: "center", borderRadius: 17, borderColor: audioCoach ? `${accent}48` : undefined, background: `linear-gradient(145deg,${audioCoach ? `${accent}10` : "rgba(255,255,255,.03)"},rgba(4,6,10,.78))`, boxShadow: "0 14px 28px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.035)" }}><div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 22 }}>🎙️</div><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{copy.audioCoach}</div><div style={{ marginTop: 3, fontSize: 8.7, color: textSoft, lineHeight: 1.35 }}>{copy.audioCoachSub}</div></div><button className="btn" onClick={() => setAudioCoach((value) => !value)} style={{ minWidth: 58, minHeight: 36, borderColor: audioCoach ? `${accent}77` : undefined, color: audioCoach ? accent : undefined, fontWeight: 1000 }}>{audioCoach ? "ON" : "OFF"}</button></div>

    {activitySport === "treadmill" ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, alignItems: "center" }}><div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 22 }}>🏃‍♂️</div><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "MESURE TAPIS ROULANT", "TREADMILL MEASUREMENT", "MEDICIÓN CINTA")}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Priorité : tapis FTMS → footpod → vitesse manuelle. Aucun GPS nécessaire.", "Priority: FTMS treadmill → footpod → manual speed. GPS is not required.", "Prioridad: cinta FTMS → footpod → velocidad manual. No necesita GPS.")}</div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}><TreadmillAdjuster label={pickLegacyLocalizedText(lang, "VITESSE MANUELLE", "MANUAL SPEED", "VELOCIDAD MANUAL")} value={manualTreadmillSpeedKmh} suffix="km/h" min={1} max={25} step={0.5} onChange={setManualTreadmillSpeedKmh}/><TreadmillAdjuster label={pickLegacyLocalizedText(lang, "INCLINAISON", "INCLINE", "INCLINACIÓN")} value={manualTreadmillIncline} suffix="%" min={0} max={20} step={0.5} onChange={setManualTreadmillIncline}/></div><div style={{ marginTop: 8, fontSize: 8.2, color: textSoft }}>{sensorSnapshot.devices.some((device) => device.kind === "fitness-machine-treadmill" && device.connected) ? (pickLegacyBilingualText(lang, "✓ Tapis FTMS connecté : vitesse/distance/inclinaison automatiques.", "✓ FTMS treadmill connected: automatic speed/distance/incline.")) : sensorSnapshot.devices.some((device) => device.kind === "running-speed-cadence" && device.connected) ? (pickLegacyBilingualText(lang, "✓ Footpod connecté : vitesse/cadence utilisées automatiquement.", "✓ Footpod connected: speed/cadence used automatically.")) : (pickLegacyBilingualText(lang, "Mode manuel actif tant qu’aucun capteur de vitesse n’est connecté.", "Manual mode is active until a speed sensor is connected."))}</div></RunningSurface> : <div className="card" style={{ marginTop: 10, padding: 13, display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 10, alignItems: "center", borderRadius: 17, background: "linear-gradient(145deg,rgba(255,255,255,.035),rgba(4,6,10,.78))", boxShadow: "0 14px 28px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.035)" }}><div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 22 }}>📍</div><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{copy.gps}</div><div style={{ marginTop: 2, fontSize: 9.5, color: gpsMessage === copy.gpsReady ? "#71ff9a" : textSoft }}>{gpsChecked ? gpsMessage : copy.gpsUnknown}{accuracy ? ` · ±${Math.round(accuracy)} m` : ""}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft }}>{isNativeActivityTrackingAvailable() ? (pickLegacyLocalizedText(lang, "Android natif : le suivi continue écran éteint via service premier plan.", "Native Android: tracking continues with the screen off via foreground service.", "Android nativo: el seguimiento continúa con la pantalla apagada.")) : copy.gpsHint}</div></div><button className="btn" onClick={checkGps} style={{ minHeight: 36, fontSize: 8.5, fontWeight: 1000 }}>{copy.gpsCheck}</button></div>}
    <button className="btn primary" onClick={startCountdown} style={{ width: "100%", minHeight: 58, marginTop: 10, background: accent, fontWeight: 1000, fontSize: 13 }}>▶ {copy.start} · {presetLabel(effectivePreset, lang)}</button>
    <div style={{ marginTop: 10 }}><Section title={copy.watches}><RunningConnectionsPanel lang={lang} accent={accent} textSoft={textSoft} compact /></Section></div>
    </div>
  </div>;
}
function PresetCard({ preset, lang, selected, accent, onClick }: {
    preset: Preset;
    lang: string;
    selected: boolean;
    accent: string;
    onClick: () => void;
}) { return <button onClick={onClick} style={{ minHeight: 112, borderRadius: 15, border: `1px solid ${selected ? `${accent}77` : "rgba(255,255,255,.08)"}`, background: selected ? `linear-gradient(145deg,${accent}1d,rgba(4,6,10,.88))` : "linear-gradient(145deg,rgba(255,255,255,.04),rgba(4,6,10,.72))", color: "#fff", padding: 11, textAlign: "left", cursor: "pointer", boxShadow: selected ? `0 15px 28px ${accent}10, inset 0 1px 0 ${accent}18` : "0 12px 24px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.025)" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 24 }}>{preset.icon}</span>{selected ? <span style={{ color: accent, fontWeight: 1000 }}>✓</span> : null}</div><div style={{ marginTop: 9, fontSize: 11, fontWeight: 1000, color: selected ? accent : undefined }}>{presetLabel(preset, lang)}</div><div style={{ marginTop: 4, fontSize: 9, lineHeight: 1.3, opacity: .58 }}>{presetSub(preset, lang)}</div></button>; }
function TrainingCard({ preset, lang, selected, accent, onClick }: {
    preset: Preset;
    lang: string;
    selected: boolean;
    accent: string;
    onClick: () => void;
}) { return <button onClick={onClick} style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center", borderRadius: 14, border: `1px solid ${selected ? `${accent}77` : "rgba(255,255,255,.08)"}`, background: selected ? `linear-gradient(145deg,${accent}18,rgba(4,6,10,.88))` : "linear-gradient(145deg,rgba(255,255,255,.04),rgba(4,6,10,.72))", color: "#fff", padding: 10, textAlign: "left", cursor: "pointer", boxShadow: selected ? `0 12px 24px ${accent}0e, inset 0 1px 0 ${accent}16` : "0 10px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)" }}><span style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 13, background: `${accent}12`, fontSize: 22 }}>{preset.icon}</span><span><b style={{ fontSize: 10.5, color: selected ? accent : undefined }}>{presetLabel(preset, lang)}</b><small style={{ display: "block", fontSize: 8.8, opacity: .58, marginTop: 3, lineHeight: 1.3 }}>{presetSub(preset, lang)}</small></span>{selected ? <b style={{ color: accent }}>✓</b> : <span style={{ opacity: .35 }}>›</span>}</button>; }

function TreadmillAdjuster({ label, value, suffix, min, max, step, onChange }: { label: string; value: number; suffix: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
    const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next / step) * step));
    return <div className="card" style={{ padding: 10 }}><div style={{ fontSize: 8.5, opacity: .62, fontWeight: 1000 }}>{label}</div><div style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", gap: 6, alignItems: "center", marginTop: 7 }}><button className="btn" onClick={() => onChange(clamp(value - step))} style={{ minWidth: 32, minHeight: 32, padding: 0, fontWeight: 1000 }}>−</button><div style={{ textAlign: "center", fontWeight: 1000, fontSize: 16 }}>{value.toFixed(step < 1 ? 1 : 0)}<small style={{ fontSize: 8.5, marginLeft: 3, opacity: .62 }}>{suffix}</small></div><button className="btn" onClick={() => onChange(clamp(value + step))} style={{ minWidth: 32, minHeight: 32, padding: 0, fontWeight: 1000 }}>+</button></div></div>;
}
function Adjuster({ label, value, suffix, min, max, onChange }: { label: string; value: number; suffix: string; min: number; max: number; onChange: (value: number) => void }) {
    return <div className="card" style={{ padding: 10 }}><div style={{ fontSize: 8.5, opacity: .62, fontWeight: 1000 }}>{label}</div><div style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", gap: 6, alignItems: "center", marginTop: 7 }}><button className="btn" onClick={() => onChange(Math.max(min, value - 1))} style={{ minWidth: 32, minHeight: 32, padding: 0, fontWeight: 1000 }}>−</button><div style={{ textAlign: "center", fontWeight: 1000, fontSize: 16 }}>{value}<small style={{ fontSize: 8.5, marginLeft: 3, opacity: .62 }}>{suffix}</small></div><button className="btn" onClick={() => onChange(Math.min(max, value + 1))} style={{ minWidth: 32, minHeight: 32, padding: 0, fontWeight: 1000 }}>+</button></div></div>;
}
function Choice({ active, accent, onClick, children }: {
    active: boolean;
    accent: string;
    onClick: () => void;
    children: React.ReactNode;
}) { return <button className="btn" onClick={onClick} style={{ minHeight: 36, padding: "6px 4px", fontSize: 8.8, fontWeight: 1000, borderColor: active ? `${accent}77` : undefined, color: active ? accent : undefined }}>{children}</button>; }
function HeroMetric({ label, value }: {
    label: string;
    value: string;
}) { return <div style={{ borderRadius: 12, padding: "8px 4px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 7.5, opacity: .54, fontWeight: 1000 }}>{label}</div><div style={{ fontSize: 15, fontWeight: 1000, marginTop: 3 }}>{value}</div></div>; }
function Metric({ label, value, accent }: {
    label: string;
    value: string;
    accent: string;
}) { return <div className="card" style={{ padding: 11 }}><div style={{ fontSize: 8.3, opacity: .58, fontWeight: 1000, letterSpacing: .5 }}>{label}</div><div style={{ marginTop: 4, fontSize: 17, fontWeight: 1000, color: accent }}>{value}</div></div>; }
function MiniStat({ label, value, accent }: {
    label: string;
    value: string;
    accent: string;
}) { return <div style={{ borderRadius: 12, padding: "9px 5px", textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ fontSize: 7.8, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ fontSize: 13, color: accent, fontWeight: 1000, marginTop: 3 }}>{value}</div></div>; }
function StatusPill({ text, good, accent }: {
    text: string;
    good: boolean;
    accent: string;
}) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, border: `1px solid ${good ? `${accent}55` : "rgba(255,255,255,.13)"}`, background: "rgba(0,0,0,.28)", color: good ? accent : "rgba(255,255,255,.7)", fontSize: 8.3, fontWeight: 1000 }}><i style={{ width: 6, height: 6, borderRadius: 999, background: good ? accent : "#ff9c61", boxShadow: good ? `0 0 9px ${accent}` : "none" }}/>{text}</span>; }
function Progress({ value, accent }: {
    value: number;
    accent: string;
}) { return <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 6 }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: accent, borderRadius: 999, boxShadow: `0 0 12px ${accent}55`, transition: "width .25s ease" }}/></div>; }
function SplitTable({ splits, accent }: {
    splits: ActivityRecord["splits"];
    accent: string;
}) { return <div style={{ display: "grid", gap: 5 }}>{splits.map((s) => <div key={s.index} style={{ display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 10, background: "rgba(255,255,255,.025)", fontSize: 9.5 }}><b style={{ color: accent }}>KM {s.index}</b><span>{formatDuration(s.splitMs)}</span><span style={{ opacity: .62 }}>{formatPace(s.paceSecPerKm)}/km</span></div>)}</div>; }
function LapTable({ laps, accent }: {
    laps: ActivityLap[];
    accent: string;
}) { return <div style={{ display: "grid", gap: 5 }}>{laps.map((l) => <div key={l.index} style={{ display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 10, background: "rgba(255,255,255,.025)", fontSize: 9.5 }}><b style={{ color: accent }}>LAP {l.index}</b><span>{formatDistance(l.lapDistanceM)} · {formatDuration(l.lapMs)}</span><span style={{ opacity: .62 }}>{formatPace(l.paceSecPerKm)}/km</span></div>)}</div>; }
function Effort({ label, value, accent }: {
    label: string;
    value: number | null;
    accent: string;
}) { return <div style={{ textAlign: "center", borderRadius: 12, padding: "9px 4px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 8, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ fontSize: 15, fontWeight: 1000, color: value ? accent : undefined, marginTop: 3 }}>{value ? formatDuration(value) : "—"}</div></div>; }
function HistoryCard({ activity, lang, accent, onClick }: {
    activity: ActivityRecord;
    lang: string;
    accent: string;
    onClick: () => void;
}) { return <button onClick={onClick} className="card" style={{ width: "100%", display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 10, alignItems: "center", padding: 11, color: "#fff", textAlign: "left", cursor: "pointer" }}><div style={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}30`, fontSize: 21 }}>{activity.workoutType === "intervals" ? "⚡" : activity.workoutType === "hills" ? "⛰️" : activity.workoutType === "pacer" ? "⏱️" : activity.workoutType === "long" ? "🛣️" : "🏃"}</div><div><b style={{ fontSize: 10.5 }}>{activity.title || String(activity.workoutType || "Running").toUpperCase()}</b><div style={{ fontSize: 9, opacity: .56, marginTop: 3 }}>{activityDate(activity.startedAt, lang)} · {formatDistance(activity.distanceM)} · {formatDuration(activity.elapsedMs)}</div></div><div style={{ textAlign: "right", color: accent, fontSize: 10, fontWeight: 1000 }}>{formatPace(activity.avgPaceSecPerKm)}<small style={{ fontSize: 7 }}>/km</small><div style={{ opacity: .5, color: "#fff", marginTop: 3 }}>›</div></div></button>; }
function Empty({ text, accent }: {
    text: string;
    accent: string;
}) { return <div style={{ marginTop: 12, padding: 30, textAlign: "center", borderRadius: 16, border: `1px dashed ${accent}38`, color: "rgba(255,255,255,.55)", fontSize: 10 }}>{text}</div>; }
function Bars({ rows, accent }: {
    rows: Array<{
        label: string;
        value: number;
    }>;
    accent: string;
}) { const max = Math.max(1, ...rows.map((r) => r.value)); return <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length},minmax(0,1fr))`, gap: 8, alignItems: "end", height: 118 }}>{rows.map((r) => <div key={r.label} style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 5, alignItems: "end", height: "100%", textAlign: "center" }}><div style={{ height: 88, display: "flex", alignItems: "end", borderRadius: 8, background: "rgba(255,255,255,.025)", overflow: "hidden" }}><div style={{ width: "100%", height: `${Math.max(r.value ? 8 : 2, r.value / max * 100)}%`, background: `linear-gradient(180deg,${accent},${accent}60)`, borderRadius: "7px 7px 2px 2px" }}/></div><div style={{ fontSize: 8 }}>{r.label}<br /><b>{r.value.toFixed(1)}</b></div></div>)}</div>; }
function RouteMap({ points, accent, waiting }: {
    points: GeoPoint[];
    accent: string;
    waiting: string;
}) { const layout = React.useMemo(() => buildMapLayout(points), [points]); return <div style={{ width: "100%", aspectRatio: "5/3", maxHeight: 340, minHeight: 190, position: "relative", overflow: "hidden", borderRadius: 15, background: "#101821", border: "1px solid rgba(255,255,255,.08)" }}>{layout ? <>{layout.tiles.map((tile) => <img key={`${tile.z}-${tile.x}-${tile.y}`} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", userSelect: "none" }}/>)}<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}><polyline points={layout.polyline} fill="none" stroke="rgba(0,0,0,.78)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><polyline points={layout.polyline} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>{layout.start ? <circle cx={layout.start.x} cy={layout.start.y} r="9" fill="#42ef7e" stroke="#fff" strokeWidth="3"/> : null}{layout.end ? <circle cx={layout.end.x} cy={layout.end.y} r="9" fill="#ff5668" stroke="#fff" strokeWidth="3"/> : null}</svg></> : <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "30px 30px", color: "rgba(255,255,255,.55)", fontSize: 10 }}>◎<br />{waiting}</div>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", right: 4, bottom: 3, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.68)", color: "#fff", fontSize: 7, textDecoration: "none", zIndex: 4 }}>© OpenStreetMap</a></div>; }
type MapLayout = {
    width: number;
    height: number;
    polyline: string;
    start: {
        x: number;
        y: number;
    } | null;
    end: {
        x: number;
        y: number;
    } | null;
    tiles: Array<{
        z: number;
        x: number;
        y: number;
        left: number;
        top: number;
        url: string;
    }>;
};
function buildMapLayout(points: GeoPoint[]): MapLayout | null { if (!points.length)
    return null; const width = 1000, height = 600, lats = points.map((p) => p.lat), lons = points.map((p) => p.lon), centerLat = (Math.min(...lats) + Math.max(...lats)) / 2, centerLon = (Math.min(...lons) + Math.max(...lons)) / 2; let zoom = 18; for (let z = 18; z >= 3; z -= 1) {
    const px = points.map((p) => mercatorPixel(p.lat, p.lon, z)), xs = px.map((p) => p.x), ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .78 && Math.max(...ys) - Math.min(...ys) <= height * .72) {
        zoom = z;
        break;
    }
} const center = mercatorPixel(centerLat, centerLon, zoom); const screen = points.map((p) => { const w = mercatorPixel(p.lat, p.lon, zoom); return { x: w.x - center.x + width / 2, y: w.y - center.y + height / 2 }; }); const minX = Math.floor((center.x - width / 2) / 256) - 1, maxX = Math.floor((center.x + width / 2) / 256) + 1, minY = Math.floor((center.y - height / 2) / 256) - 1, maxY = Math.floor((center.y + height / 2) / 256) + 1, count = 2 ** zoom; const tiles: MapLayout["tiles"] = []; for (let tx = minX; tx <= maxX; tx += 1)
    for (let ty = minY; ty <= maxY; ty += 1) {
        if (ty < 0 || ty >= count)
            continue;
        const wx = ((tx % count) + count) % count;
        tiles.push({ z: zoom, x: tx, y: ty, left: tx * 256 - center.x + width / 2, top: ty * 256 - center.y + height / 2, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png` });
    } return { width, height, tiles, polyline: screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), start: screen[0] || null, end: screen[screen.length - 1] || null }; }
function mercatorPixel(lat: number, lon: number, zoom: number) { const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat)), scale = 256 * 2 ** zoom, sin = Math.sin(clamped * Math.PI / 180); return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }; }
const recordDock: React.CSSProperties = { position: "fixed", left: "max(10px,env(safe-area-inset-left))", right: "max(10px,env(safe-area-inset-right))", bottom: "calc(82px + env(safe-area-inset-bottom))", zIndex: 45, maxWidth: 600, margin: "0 auto", display: "grid", gridTemplateColumns: ".75fr 1fr 1.25fr", gap: 7, padding: 8, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(8,9,14,.9)", backdropFilter: "blur(18px)", boxShadow: "0 16px 40px rgba(0,0,0,.58)" };
