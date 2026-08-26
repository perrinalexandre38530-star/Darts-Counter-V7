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
import OutdoorRouteNavigationPanel from "./OutdoorRouteNavigationPanel";
import OutdoorRouteLiveMap from "./OutdoorRouteLiveMap";
import OutdoorRoutePlannerPanel from "./OutdoorRoutePlannerPanel";
import OutdoorLongDistancePanel from "./OutdoorLongDistancePanel";
import OutdoorOfflineRoutePanel from "./OutdoorOfflineRoutePanel";
import OutdoorSafetyPanel from "./OutdoorSafetyPanel";
import OutdoorRoutePhotoGallery from "./OutdoorRoutePhotoGallery";
import OutdoorRouteCommunityPanel from "./OutdoorRouteCommunityPanel";
import OutdoorRoutePlaceInfoPanel from "./OutdoorRoutePlaceInfoPanel";
import OutdoorRouteSocialPanel from "./OutdoorRouteSocialPanel";
import { RunningGlyph, RunningHubCard, RunningSurface } from "./RunningUi";
import { useAwenaOptional } from "../../awena/AwenaProvider";
import { awenaVoice } from "../../awena/AwenaVoice";
import { RUNNING_AUDIO_COACH_KEY, type RunningCustomWorkoutSpec, type RunningPlanSession, type RunningPlanState } from "../../activity/runningTraining";
import { averagePaceSecPerKm, averageSpeedMps, buildKilometerSplits, elevationGainMeters, formatDistance, formatDuration, formatPace, movingTimeMs, rollingPaceSecPerKm, routeDistanceMeters, shouldAcceptRunningPoint, } from "../../activity/activityMath";
import { buildRunningStats, bestEffortMs, hasNegativeSplit, projectedFinishMs, splitConsistencyScore, targetPaceDeltaMs } from "../../activity/runningInsights";
import { favoriteRouteFromActivity, ghostMatch as runningGhostMatch, loadRunningRoutes, removeRunningRoute, routeTemplateFromActivity, upsertRunningRoute, type RunningRouteTemplate } from "../../activity/runningRoutes";
import { discoverOutdoorRoutes } from "../../activity/outdoorRouteDiscovery";
import { generateOutdoorRoutes, type OutdoorRouteGenerationProfile, type OutdoorRouteGenerationShape } from "../../activity/outdoorRouteGenerator";
import { enrichOutdoorRouteElevation, routeHasElevation } from "../../activity/outdoorRouteElevation";
import { syncOutdoorRouteAttempt } from "../../activity/outdoorRouteCommunity";
import { loadRunningShoes, type RunningShoe } from "../../activity/runningGear";
import { adaptiveMilestoneCoach, adaptiveSplitCoach } from "../../activity/runningCoach";
import { analyzeRunningTerrain, terrainAdvice, terrainLabel } from "../../activity/runningElevation";
import { OUTDOOR_SPORT_PROFILES, loadOutdoorPerformanceSport, outdoorDefaultGoal, outdoorGoalDistancesKm, outdoorGoalDurationsMin, outdoorPresetIds, outdoorSportLabel, outdoorTrainingPresetIds, saveOutdoorPerformanceSport, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { loadOutdoorRouteExtras, type OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import { estimateOutdoorRouteDurationMs, outdoorDirectionalGuidance, outdoorRouteProgress, outdoorRouteRejoinPlan } from "../../activity/outdoorNavigation";
import { outdoorRerouteMatchedDistanceM, rerouteAsRunningRoute, rerouteOutdoorToRoute, type OutdoorRouteRerouteResult } from "../../activity/outdoorRouteRerouting";
import { getRunningSensorSnapshot, subscribeRunningSensors, type RunningSensorSnapshot } from "../../activity/runningSensors";
import { sensorSummaryForActivity } from "../../activity/activitySensorInsights";
import { buildTreadmillSplits, treadmillDistanceSource, treadmillDistanceSourceLabel, averageTreadmillIncline } from "../../activity/treadmillPerformance";
import { addNativeTrackingListener, getNativeCurrentPosition, getNativeTrack, isNativeActivityTrackingAvailable, nativeTrackingStatus, openNativeAppLocationPermissionSettings, openNativeLocationSettings, pauseNativeTracking, requestNativeTrackingPermissions, resumeNativeTracking, startNativeTracking, stopNativeTracking } from "../../activity/nativeActivityTracking";
import { deleteActivity, listActivities, saveActivity } from "../../activity/activityStore";
import { clearNativeTrackingOwnerIf, getNativeTrackingOwnerSessionId, getRunningActiveSession, getRunningRecordingSession, loadRunningActiveSessions, patchRunningActiveSession, removeRunningActiveSession, resumedRunningSessionTiming, setNativeTrackingOwnerSessionId, upsertRunningActiveSession } from "../../activity/runningActiveSessions";
import { listOutdoorOfflineRoutePacks } from "../../activity/outdoorOfflineCache";
import { deleteRunningSessionDraft, loadRunningSessionDraft, mergeRunningDraftRoutes, saveRunningSessionDraft, type RunningSessionDraft } from "../../activity/runningSessionDrafts";
import type { ActivityLap, ActivityRecord, ActivitySensorSample, GeoPoint } from "../../activity/activityTypes";
type View = "setup" | "record" | "history" | "detail" | "records" | "plan" | "goal";
type SetupTab = "menu" | "goal" | "training" | "advanced";
type SimpleGoalMode = "free" | "distance" | "duration";
type SetupPanel = "menu" | "workout" | "route" | "ready";
type RoutePanelTab = "menu" | "choose" | "guide" | "offline";
type RouteChooseMode = "showcase" | "discover" | "generate" | "library";
type RouteDetailsTab = "details" | "performance" | "photos" | "community";
type LivePage = "cockpit" | "route" | "splits" | "details";
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
function adaptPresetForSport(preset: Preset, sport: OutdoorPerformanceSport): Preset {
    if (sport === "trail") {
        if (preset.id === "easy") return { ...preset, fr: "ENDURANCE TRAIL · 45 MIN", en: "TRAIL ENDURANCE · 45 MIN", es: "RESISTENCIA TRAIL · 45 MIN", subFr: "Allure facile, terrain varié, sans chercher la vitesse.", subEn: "Easy effort on varied terrain without chasing speed.", subEs: "Esfuerzo suave en terreno variado sin buscar velocidad.", targetDurationMs: 45 * 60000 };
        if (preset.id === "hills") return { ...preset, fr: "CÔTES TRAIL · 35 MIN", en: "TRAIL HILLS · 35 MIN", es: "CUESTAS TRAIL · 35 MIN", subFr: "Travail de montée court, récupération souple en descente ou retour.", subEn: "Short uphill work with easy downhill or return recovery.", subEs: "Trabajo corto en subida con recuperación suave." };
        if (preset.id === "long") return { ...preset, fr: "SORTIE LONGUE TRAIL · 90 MIN", en: "LONG TRAIL · 90 MIN", es: "TRAIL LARGO · 90 MIN", subFr: "Endurance, gestion du relief et régularité sur la durée.", subEn: "Endurance, terrain management and steady long effort.", subEs: "Resistencia, gestión del terreno y esfuerzo regular.", targetDurationMs: 90 * 60000 };
        if (preset.id === "recovery") return { ...preset, fr: "RÉCUP TRAIL · 25 MIN", en: "TRAIL RECOVERY · 25 MIN", es: "RECUP TRAIL · 25 MIN", targetDurationMs: 25 * 60000 };
    }
    if (sport === "nordic-walking") {
        if (preset.id === "easy") return { ...preset, fr: "ENDURANCE · 45 MIN", en: "ENDURANCE · 45 MIN", es: "RESISTENCIA · 45 MIN", subFr: "Marche fluide, technique propre et cadence régulière.", subEn: "Smooth walking, clean technique and steady cadence.", subEs: "Marcha fluida, técnica limpia y cadencia regular.", targetDurationMs: 45 * 60000 };
        if (preset.id === "tempo") return { ...preset, fr: "RYTHME SOUTENU · 35 MIN", en: "STEADY TEMPO · 35 MIN", es: "RITMO SOSTENIDO · 35 MIN", subFr: "Travail de cadence et d’engagement sans courir.", subEn: "Cadence and engagement work without running.", subEs: "Trabajo de cadencia e implicación sin correr." };
        if (preset.id === "hills") return { ...preset, fr: "CÔTES & TECHNIQUE · 35 MIN", en: "HILLS & TECHNIQUE · 35 MIN", es: "CUESTAS Y TÉCNICA · 35 MIN" };
    }
    if (sport === "treadmill") {
        const prefix = preset.id === "hills" ? "INCLINAISON" : preset.id === "intervals" ? "INTERVALLES" : preset.id === "long" ? "ENDURANCE LONGUE" : preset.id === "easy" ? "ENDURANCE" : preset.id === "recovery" ? "RÉCUPÉRATION" : "TEMPO";
        const enPrefix = preset.id === "hills" ? "INCLINE" : preset.id === "intervals" ? "INTERVALS" : preset.id === "long" ? "LONG ENDURANCE" : preset.id === "easy" ? "ENDURANCE" : preset.id === "recovery" ? "RECOVERY" : "TEMPO";
        const esPrefix = preset.id === "hills" ? "INCLINACIÓN" : preset.id === "intervals" ? "INTERVALOS" : preset.id === "long" ? "RESISTENCIA LARGA" : preset.id === "easy" ? "RESISTENCIA" : preset.id === "recovery" ? "RECUPERACIÓN" : "TEMPO";
        return { ...preset, fr: `${prefix} TAPIS · ${Math.round((preset.targetDurationMs || 0) / 60000)} MIN`, en: `${enPrefix} TREADMILL · ${Math.round((preset.targetDurationMs || 0) / 60000)} MIN`, es: `${esPrefix} CINTA · ${Math.round((preset.targetDurationMs || 0) / 60000)} MIN` };
    }
    return preset;
}
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
    const [setupTab, setSetupTab] = React.useState<SetupTab>(() => params?.runningPresetId ? (initialPreset === "pacer" || initialPreset === "custom" ? "advanced" : ["easy", "tempo", "intervals", "hills", "long", "recovery"].includes(initialPreset) ? "training" : "goal") : "menu");
    const [setupPanel, setSetupPanel] = React.useState<SetupPanel>(() => params?.runningPresetId ? "workout" : "menu");
    const [activitySport, setActivitySport] = React.useState<OutdoorPerformanceSport>(() => { const raw = String(params?.runningActivitySport || ""); return (["running","trail","hiking","walking","nordic-walking","treadmill"] as string[]).includes(raw) ? raw as OutdoorPerformanceSport : loadOutdoorPerformanceSport(); });
    const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
    const [selected, setSelected] = React.useState<ActivityRecord | null>(null);
    const [selectedPresetId, setSelectedPresetId] = React.useState(() => {
        if (initialPreset === "distance") return "goal-distance";
        return PRESETS.some((p) => p.id === initialPreset) ? initialPreset : "goal-free";
    });
    const initialGoalDefaults = outdoorDefaultGoal(activitySport);
    const [simpleGoalMode, setSimpleGoalMode] = React.useState<SimpleGoalMode>(() => initialPreset === "distance" ? "distance" : Number(params?.runningTargetDurationMs || 0) > 0 && initialPreset === "free" ? "duration" : "free");
    const [simpleDistanceKm, setSimpleDistanceKm] = React.useState(() => Math.max(1, Number(params?.runningTargetM || initialGoalDefaults.distanceKm * 1000) / 1000));
    const [simpleDurationMin, setSimpleDurationMin] = React.useState(() => Math.max(10, Math.round(Number(params?.runningTargetDurationMs || initialGoalDefaults.durationMin * 60000) / 60000)));
    const [pacerDistanceM, setPacerDistanceM] = React.useState(() => Number(params?.runningTargetM || 5000));
    const [pacerPace, setPacerPace] = React.useState(330);
    const [points, setPoints] = React.useState<GeoPoint[]>([]);
    const [manualLaps, setManualLaps] = React.useState<ActivityLap[]>([]);
    const [isRecording, setIsRecording] = React.useState(false);
    const [paused, setPaused] = React.useState(false);
    const [now, setNow] = React.useState(Date.now());
    const [accuracy, setAccuracy] = React.useState<number | null>(null);
    const [gpsMessage, setGpsMessage] = React.useState("");
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
    const [discoveredRoutes, setDiscoveredRoutes] = React.useState<RunningRouteTemplate[]>([]);
    const [routeDiscoveryCenter, setRouteDiscoveryCenter] = React.useState<GeoPoint | null>(null);
    const [routeDiscoveryRadiusKm, setRouteDiscoveryRadiusKm] = React.useState(10);
    const [routeDiscoveryBusy, setRouteDiscoveryBusy] = React.useState(false);
    const [routeDiscoveryMessage, setRouteDiscoveryMessage] = React.useState("");
    const [routeGenerationDistanceKm, setRouteGenerationDistanceKm] = React.useState(10);
    const [routeGenerationProfile, setRouteGenerationProfile] = React.useState<OutdoorRouteGenerationProfile>("balanced");
    const [routeGenerationShape, setRouteGenerationShape] = React.useState<OutdoorRouteGenerationShape>("loop");
    const [routeGenerationElevationEnabled, setRouteGenerationElevationEnabled] = React.useState(false);
    const [routeGenerationElevationMinM, setRouteGenerationElevationMinM] = React.useState(300);
    const [routeGenerationElevationMaxM, setRouteGenerationElevationMaxM] = React.useState(600);
    const [routeGenerationBusy, setRouteGenerationBusy] = React.useState(false);
    const [routeGenerationMessage, setRouteGenerationMessage] = React.useState("");
    const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
    const [routeExtras, setRouteExtras] = React.useState<OutdoorRouteExtras | null>(null);
    const [routePanelTab, setRoutePanelTab] = React.useState<RoutePanelTab>("menu");
    const [routeChooseMode, setRouteChooseMode] = React.useState<RouteChooseMode>("showcase");
    const [routeListOpen, setRouteListOpen] = React.useState(false);
    const [routeDetailsTab, setRouteDetailsTab] = React.useState<RouteDetailsTab>("details");
    const [routeElevationOverrides, setRouteElevationOverrides] = React.useState<Record<string, RunningRouteTemplate>>({});
    const [routeElevationMessage, setRouteElevationMessage] = React.useState("");
    const [livePage, setLivePage] = React.useState<LivePage>("cockpit");
    const [liveRouteMapFullscreen, setLiveRouteMapFullscreen] = React.useState(false);
    const [liveOutdoorReroute, setLiveOutdoorReroute] = React.useState<OutdoorRouteRerouteResult | null>(null);
    const [liveOutdoorRerouteBusy, setLiveOutdoorRerouteBusy] = React.useState(false);
    const [liveOutdoorRerouteError, setLiveOutdoorRerouteError] = React.useState("");
    const [offlineRoutes, setOfflineRoutes] = React.useState<RunningRouteTemplate[]>([]);
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
    const activeSessionIdRef = React.useRef<string | null>(null);
    const activeSessionRestoreRef = React.useRef(false);
    const lastGpsPointAtRef = React.useRef(0);
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
    const wrongWayAlertRef = React.useRef(false);
    const turnAnnouncedRef = React.useRef<Set<string>>(new Set());
    const checkpointAnnouncedRef = React.useRef<Set<string>>(new Set());
    const routeElevationTriedRef = React.useRef<Set<string>>(new Set());
    const routeSwipeStartXRef = React.useRef<number | null>(null);
    const rerouteAbortRef = React.useRef<AbortController | null>(null);
    const rerouteLastRequestedAtRef = React.useRef(0);
    const rerouteLastOriginRef = React.useRef<GeoPoint | null>(null);
    const rerouteAnnouncedAtRef = React.useRef(0);
    const rerouteResultRef = React.useRef<OutdoorRouteRerouteResult | null>(null);
    const rerouteBusyRef = React.useRef(false);
    const liveOutdoorProgressRef = React.useRef<any>(null);
    const copy = pickLegacyLocalizedValue(lang, {
        title: "RUNNING PERFORMANCE", setupSub: "Prépare ta séance avant le départ", recordSub: "Session GPS en cours", history: "MES SORTIES", records: "MES RECORDS", setup: "COURIR", quick: "RAPIDE", training: "ENTRAÎNEMENT", pacer: "PACER", selected: "SÉANCE SÉLECTIONNÉE", start: "DÉMARRER", gps: "GPS", gpsCheck: "TESTER LE GPS", gpsReady: "GPS PRÊT", gpsSearching: "RECHERCHE GPS…", gpsLost: "SIGNAL GPS PERDU", gpsUnknown: "GPS À VÉRIFIER", gpsPoor: "SIGNAL FAIBLE", gpsDenied: "LOCALISATION REFUSÉE", gpsHint: "Teste le GPS avant le départ pour éviter une sortie sans tracé.", local: "RUNNING PERFORMANCE — GPS · CARTE · CAPTEURS · HEALTH CONNECT", watches: "MONTRES & CAPTEURS", soon: "BIENTÔT", targetPace: "ALLURE CIBLE", targetDistance: "DISTANCE CIBLE", expected: "TEMPS CIBLE", countdown: "PRÊT ?", go: "GO !",
        distance: "DISTANCE", time: "TEMPS", avgPace: "ALLURE MOY.", livePace: "ALLURE LIVE", speed: "VITESSE", elevation: "DÉNIVELÉ +", accuracy: "PRÉCISION", moving: "TEMPS MOUV.", target: "OBJECTIF", ahead: "EN AVANCE", behind: "EN RETARD", projected: "ARRIVÉE PROJETÉE", phase: "BLOC EN COURS", remaining: "RESTANT", route: "PARCOURS", waiting: "En attente du premier point GPS…", pause: "PAUSE", resume: "REPRENDRE", finish: "TERMINER", cancel: "ANNULER", lap: "TOUR", splits: "SPLITS KM", laps: "TOURS MANUELS", targetReached: "OBJECTIF ATTEINT", insufficient: "Il faut au moins deux points GPS pour enregistrer la sortie.", complete: "SORTIE TERMINÉE", verified: "GPS VÉRIFIÉ", delete: "SUPPRIMER LA SORTIE", empty: "Aucune sortie enregistrée.", noRecord: "Pas encore de record", longestLabel: "PLUS LONGUE", bestEfforts: "MEILLEURS EFFORTS", consistency: "RÉGULARITÉ", negative: "NEGATIVE SPLIT", achievements: "PERFORMANCES DÉBLOQUÉES", firstRun: "PREMIÈRE SORTIE", longestBadge: "PLUS LONGUE SORTIE", personalBest: "NOUVEAU RECORD", filters: ["TOUTES", "LIBRES", "SÉANCES", "PACER"], plan: "PLAN", custom: "SUR MESURE", audioCoach: "COACH VOCAL AWENA", audioCoachSub: "Annonce les blocs, splits et repères de séance pendant la course.", feedback: "RESSENTI APRÈS LA SORTIE", effort: "EFFORT PERÇU", feeling: "SENSATIONS", notes: "NOTES", save: "ENREGISTRER", info: "RUNNING PERFORMANCE regroupe Running, Trail, Randonnée, Marche, Marche nordique et Tapis roulant. Le GPS natif Android écran éteint est désormais câblé pour les tests internes, tandis que le module reste masqué de la Store V1.",
    }, {
        title: "RUNNING PERFORMANCE", setupSub: "Prepare your workout before the start", recordSub: "GPS session in progress", history: "MY RUNS", records: "MY RECORDS", setup: "RUN", quick: "QUICK", training: "TRAINING", pacer: "PACER", selected: "SELECTED WORKOUT", start: "START", gps: "GPS", gpsCheck: "CHECK GPS", gpsReady: "GPS READY", gpsSearching: "SEARCHING GPS…", gpsLost: "GPS SIGNAL LOST", gpsUnknown: "GPS NOT CHECKED", gpsPoor: "WEAK SIGNAL", gpsDenied: "LOCATION DENIED", gpsHint: "Check GPS before the start to avoid a run without a route.", local: "RUNNING PERFORMANCE — GPS · MAP · SENSORS · HEALTH CONNECT", watches: "WATCHES & SENSORS", soon: "SOON", targetPace: "TARGET PACE", targetDistance: "TARGET DISTANCE", expected: "TARGET TIME", countdown: "READY?", go: "GO!",
        distance: "DISTANCE", time: "TIME", avgPace: "AVG PACE", livePace: "LIVE PACE", speed: "SPEED", elevation: "ELEVATION +", accuracy: "ACCURACY", moving: "MOVING TIME", target: "TARGET", ahead: "AHEAD", behind: "BEHIND", projected: "PROJECTED FINISH", phase: "CURRENT BLOCK", remaining: "REMAINING", route: "ROUTE", waiting: "Waiting for the first GPS point…", pause: "PAUSE", resume: "RESUME", finish: "FINISH", cancel: "CANCEL", lap: "LAP", splits: "KM SPLITS", laps: "MANUAL LAPS", targetReached: "TARGET REACHED", insufficient: "At least two GPS points are required to save the run.", complete: "RUN COMPLETE", verified: "GPS VERIFIED", delete: "DELETE RUN", empty: "No runs saved yet.", noRecord: "No record yet", longestLabel: "LONGEST", bestEfforts: "BEST EFFORTS", consistency: "CONSISTENCY", negative: "NEGATIVE SPLIT", achievements: "UNLOCKED ACHIEVEMENTS", firstRun: "FIRST RUN", longestBadge: "LONGEST RUN", personalBest: "NEW PERSONAL BEST", filters: ["ALL", "FREE", "WORKOUTS", "PACER"], plan: "PLAN", custom: "CUSTOM", audioCoach: "AWENA VOICE COACH", audioCoachSub: "Announces workout blocks, splits and session cues while you run.", feedback: "POST-RUN FEEDBACK", effort: "PERCEIVED EFFORT", feeling: "FEELING", notes: "NOTES", save: "SAVE", info: "RUNNING PERFORMANCE brings together Running, Trail, Hiking, Walking, Nordic walking and Treadmill. Native Android screen-off GPS tracking is wired for internal tests while the module remains hidden from Store V1.",
    }, {
        title: "RUNNING PERFORMANCE", setupSub: "Prepara tu sesión antes de salir", recordSub: "Sesión GPS en curso", history: "MIS CARRERAS", records: "MIS RÉCORDS", setup: "CORRER", quick: "RÁPIDO", training: "ENTRENAMIENTO", pacer: "PACER", selected: "SESIÓN SELECCIONADA", start: "INICIAR", gps: "GPS", gpsCheck: "PROBAR GPS", gpsReady: "GPS LISTO", gpsSearching: "BUSCANDO GPS…", gpsLost: "SEÑAL GPS PERDIDA", gpsUnknown: "GPS SIN PROBAR", gpsPoor: "SEÑAL DÉBIL", gpsDenied: "UBICACIÓN DENEGADA", gpsHint: "Prueba el GPS antes de salir para evitar una carrera sin ruta.", local: "RUNNING PERFORMANCE — GPS · MAPA · SENSORES · HEALTH CONNECT", watches: "RELOJES Y SENSORES", soon: "PRONTO", targetPace: "RITMO OBJETIVO", targetDistance: "DISTANCIA OBJETIVO", expected: "TIEMPO OBJETIVO", countdown: "¿LISTO?", go: "¡YA!",
        distance: "DISTANCIA", time: "TIEMPO", avgPace: "RITMO MEDIO", livePace: "RITMO LIVE", speed: "VELOCIDAD", elevation: "DESNIVEL +", accuracy: "PRECISIÓN", moving: "TIEMPO MOV.", target: "OBJETIVO", ahead: "ADELANTADO", behind: "RETRASADO", projected: "LLEGADA PROYECTADA", phase: "BLOQUE ACTUAL", remaining: "RESTANTE", route: "RUTA", waiting: "Esperando el primer punto GPS…", pause: "PAUSA", resume: "REANUDAR", finish: "TERMINAR", cancel: "CANCELAR", lap: "VUELTA", splits: "SPLITS KM", laps: "VUELTAS MANUALES", targetReached: "OBJETIVO CUMPLIDO", insufficient: "Se necesitan al menos dos puntos GPS para guardar la carrera.", complete: "CARRERA TERMINADA", verified: "GPS VERIFICADO", delete: "ELIMINAR CARRERA", empty: "No hay carreras guardadas.", noRecord: "Sin récord todavía", longestLabel: "MÁS LARGA", bestEfforts: "MEJORES ESFUERZOS", consistency: "REGULARIDAD", negative: "NEGATIVE SPLIT", achievements: "LOGROS DESBLOQUEADOS", firstRun: "PRIMERA CARRERA", longestBadge: "CARRERA MÁS LARGA", personalBest: "NUEVO RÉCORD", filters: ["TODAS", "LIBRES", "SESIONES", "PACER"], plan: "PLAN", custom: "A MEDIDA", audioCoach: "COACH VOCAL AWENA", audioCoachSub: "Anuncia bloques, splits y referencias de entrenamiento durante la carrera.", feedback: "SENSACIONES DESPUÉS DE CORRER", effort: "ESFUERZO PERCIBIDO", feeling: "SENSACIONES", notes: "NOTAS", save: "GUARDAR", info: "RUNNING PERFORMANCE reúne Running, Trail, Senderismo, Caminata, Marcha nórdica y Cinta de correr. El seguimiento GPS nativo Android con pantalla apagada ya está preparado para pruebas internas, pero el módulo sigue oculto en Store V1.",
    });
    const sportProfile = OUTDOOR_SPORT_PROFILES[activitySport];
    const allowedPresetIds = React.useMemo(() => outdoorPresetIds(activitySport), [activitySport]);
    const trainingPresetIds = React.useMemo(() => outdoorTrainingPresetIds(activitySport), [activitySport]);
    const goalDistanceOptions = React.useMemo(() => outdoorGoalDistancesKm(activitySport), [activitySport]);
    const goalDurationOptions = React.useMemo(() => outdoorGoalDurationsMin(activitySport), [activitySport]);
    React.useEffect(() => {
        saveOutdoorPerformanceSport(activitySport);
        const goalId = selectedPresetId.startsWith("goal-");
        if ((!goalId && !allowedPresetIds.has(selectedPresetId) && selectedPresetId !== "pacer" && selectedPresetId !== "custom") || (selectedPresetId === "pacer" && !sportProfile.supportsPacer) || (selectedPresetId === "custom" && !sportProfile.supportsIntervals)) {
            setSelectedPresetId("goal-free");
            setSimpleGoalMode("free");
            setSetupTab("goal");
        }
        if (setupTab === "training" && !trainingPresetIds.length) setSetupTab("goal");
        if (setupTab === "advanced" && !sportProfile.supportsPacer && !sportProfile.supportsIntervals) setSetupTab("goal");
        const defaults = outdoorDefaultGoal(activitySport);
        setSimpleDistanceKm(defaults.distanceKm);
        setSimpleDurationMin(defaults.durationMin);
        setSelectedRouteId(null);
        setGhostEnabled(false);
        if (activitySport === "treadmill" && setupPanel === "route") setSetupPanel("workout");
    }, [activitySport]);
    const selectedPreset = React.useMemo(() => PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0], [selectedPresetId]);
    const simpleGoalPreset = React.useMemo<Preset>(() => {
        const label = outdoorSportLabel(activitySport, lang).toUpperCase();
        if (simpleGoalMode === "distance") return { id: "goal-distance", type: "distance", icon: "", fr: `${label} · ${simpleDistanceKm.toFixed(simpleDistanceKm % 1 ? 1 : 0)} KM`, en: `${label} · ${simpleDistanceKm.toFixed(simpleDistanceKm % 1 ? 1 : 0)} KM`, es: `${label} · ${simpleDistanceKm.toFixed(simpleDistanceKm % 1 ? 1 : 0)} KM`, subFr: "Arrête le chrono quand la distance cible est atteinte.", subEn: "Track progress until the target distance is reached.", subEs: "Sigue el progreso hasta alcanzar la distancia objetivo.", targetDistanceM: simpleDistanceKm * 1000 };
        if (simpleGoalMode === "duration") return { id: "goal-duration", type: "free", icon: "", fr: `${label} · ${simpleDurationMin} MIN`, en: `${label} · ${simpleDurationMin} MIN`, es: `${label} · ${simpleDurationMin} MIN`, subFr: "Objectif de temps simple, sans séance imposée.", subEn: "Simple time goal with no imposed workout structure.", subEs: "Objetivo de tiempo simple sin estructura de entrenamiento impuesta.", targetDurationMs: simpleDurationMin * 60000 };
        return { id: "goal-free", type: "free", icon: "", fr: `${label} · LIBRE`, en: `${label} · FREE`, es: `${label} · LIBRE`, subFr: "Tu pars et tu t’arrêtes quand tu veux. Seules les mesures utiles sont suivies.", subEn: "Start and stop when you want. Only useful metrics are tracked.", subEs: "Empieza y termina cuando quieras. Solo se registran las métricas útiles.", targetDistanceM: null };
    }, [activitySport, lang, simpleDistanceKm, simpleDurationMin, simpleGoalMode]);
    const effectivePreset: Preset = React.useMemo(() => {
        let base: Preset = selectedPresetId.startsWith("goal-")
            ? simpleGoalPreset
            : selectedPresetId === "pacer"
            ? { id: "pacer", type: "pacer", icon: "", fr: "PACER", en: "PACER", es: "PACER", subFr: "Tiens ton allure cible et suis ton avance en direct.", subEn: "Hold target pace and track live time delta.", subEs: "Mantén el ritmo objetivo y sigue tu diferencia en directo.", targetDistanceM: pacerDistanceM, targetPaceSecPerKm: pacerPace }
            : selectedPresetId === "custom" ? customWorkoutPreset(customWorkout) : adaptPresetForSport(selectedPreset, activitySport);
        if (presetOverrideDurationMs && presetOverrideDurationMs > 0) base = { ...base, targetDurationMs: presetOverrideDurationMs };
        if (presetOverrideTitle) base = { ...base, fr: presetOverrideTitle, en: presetOverrideTitle, es: presetOverrideTitle };
        return base;
    }, [activitySport, customWorkout, pacerDistanceM, pacerPace, presetOverrideDurationMs, presetOverrideTitle, selectedPreset, selectedPresetId, simpleGoalPreset]);
    const refreshOfflineRoutes = React.useCallback(async () => {
        const packs = await listOutdoorOfflineRoutePacks();
        setOfflineRoutes(packs.filter((pack) => pack.sport === activitySport).map((pack) => ({ ...pack.route, name: pack.route.name.includes("OFFLINE") ? pack.route.name : `${pack.route.name} · OFFLINE` })));
    }, [activitySport]);
    React.useEffect(() => { void refreshOfflineRoutes(); }, [refreshOfflineRoutes]);
    React.useEffect(() => {
        setDiscoveredRoutes([]);
        setRouteDiscoveryCenter(null);
        setRouteDiscoveryMessage("");
        setRouteGenerationMessage("");
        setRouteGenerationProfile(activitySport === "trail" || activitySport === "hiking" ? "trails" : "balanced");
    }, [activitySport]);
    const routeOptions = React.useMemo(() => {
        const savedSourceIds = new Set(savedRoutes.map((route) => route.sourceActivityId).filter(Boolean));
        const recent = activities
            .filter((activity) => Array.isArray(activity.route) && activity.route.length >= 2 && activity.distanceM >= 300 && !savedSourceIds.has(activity.id))
            .slice(0, 6)
            .map((activity) => routeTemplateFromActivity(activity));
        const savedForSport = savedRoutes.filter((route) => !route.sport ? activitySport === "running" : route.sport === activitySport);
        const discoveredForSport = discoveredRoutes.filter((route) => !route.sport || route.sport === activitySport);
        const candidates = [...discoveredForSport, ...savedForSport, ...offlineRoutes, ...recent];
        const unique: RunningRouteTemplate[] = [];
        const seen = new Set<string>();
        for (const route of candidates) {
            const key = route.externalId || route.id;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(routeElevationOverrides[route.id] || route);
            if (unique.length >= 24) break;
        }
        return unique;
    }, [activities, activitySport, discoveredRoutes, offlineRoutes, routeElevationOverrides, savedRoutes]);
    const selectedRoute = React.useMemo(() => routeOptions.find((route) => route.id === selectedRouteId) || null, [routeOptions, selectedRouteId]);
    const selectedRouteIndex = React.useMemo(() => Math.max(0, routeOptions.findIndex((route) => route.id === selectedRouteId)), [routeOptions, selectedRouteId]);
    const selectedRouteAttempts = React.useMemo(() => {
        if (!selectedRoute)
            return [] as ActivityRecord[];
        return activities.filter((activity) => {
            if (activity.routeReferenceId === selectedRoute.id)
                return true;
            if (selectedRoute.sourceActivityId && activity.id === selectedRoute.sourceActivityId)
                return true;
            if (selectedRoute.sourceActivityId && activity.routeReferenceId === selectedRoute.sourceActivityId)
                return true;
            if (!activity.routeReferenceId && Math.abs(Number(activity.distanceM || 0) - Number(selectedRoute.distanceM || 0)) <= 120 && Array.isArray(activity.route) && activity.route.length > 2) {
                const startA = activity.route[0];
                const startB = selectedRoute.route[0];
                if (startA && startB) {
                    const startGap = Math.abs(startA.lat - startB.lat) + Math.abs(startA.lon - startB.lon);
                    return startGap <= 0.0045;
                }
            }
            return false;
        }).slice().sort((a, b) => Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0));
    }, [activities, selectedRoute]);
    React.useEffect(() => { setRouteExtras(selectedRoute ? loadOutdoorRouteExtras(selectedRoute.id) : null); offRouteAlertRef.current = false; wrongWayAlertRef.current = false; turnAnnouncedRef.current = new Set(); setRoutePanelTab("choose"); setRouteChooseMode(selectedRoute ? "showcase" : "discover"); setRouteDetailsTab("details"); setRouteElevationMessage(selectedRoute && routeHasElevation(selectedRoute) ? pickLegacyLocalizedText(lang, "Relief disponible.", "Elevation available.", "Relieve disponible.") : ""); }, [lang, selectedRoute?.id]);
    const selectedTerrain = React.useMemo(() => selectedRoute ? analyzeRunningTerrain(selectedRoute.route) : null, [selectedRoute]);
    const selectedTerrainAdvice = React.useMemo(() => selectedTerrain ? terrainAdvice(selectedTerrain, lang) : null, [lang, selectedTerrain]);
    const selectedSportRouteDetails = React.useMemo(() => selectedRoute ? buildSportRouteDetails(selectedRoute, selectedTerrain, activitySport, lang) : null, [activitySport, lang, selectedRoute, selectedTerrain]);
    React.useEffect(() => {
        if (!selectedRoute || activitySport === "treadmill" || routeHasElevation(selectedRoute) || routeElevationTriedRef.current.has(selectedRoute.id)) return;
        routeElevationTriedRef.current.add(selectedRoute.id);
        setRouteElevationMessage(pickLegacyLocalizedText(lang, "Calcul du relief…", "Loading elevation…", "Cargando relieve…"));
        void enrichOutdoorRouteElevation(selectedRoute).then((enriched) => {
            setRouteElevationOverrides((current) => ({ ...current, [selectedRoute.id]: enriched }));
            setRouteElevationMessage(pickLegacyLocalizedText(lang, "Relief calculé · D+, D− et point culminant disponibles.", "Elevation ready · gain, loss and high point available.", "Relieve listo · desnivel y punto más alto disponibles."));
        }).catch(() => setRouteElevationMessage(pickLegacyLocalizedText(lang, "Relief indisponible pour le moment.", "Elevation unavailable for now.", "Relieve no disponible por ahora.")));
    }, [activitySport, lang, selectedRoute]);
    const selectedRouteHasReference = !!selectedRoute && Number(selectedRoute.referenceElapsedMs || 0) > 0;
    React.useEffect(() => { if (!selectedRouteHasReference && ghostEnabled) setGhostEnabled(false); }, [ghostEnabled, selectedRouteHasReference]);
    const targetDistanceM = selectedRoute && selectedPresetId === "goal-free" ? selectedRoute.distanceM : effectivePreset.targetDistanceM ?? null;
    const targetDurationMs = effectivePreset.targetDurationMs ?? null;
    const targetPaceSecPerKm = effectivePreset.type === "pacer" ? pacerPace : null;
    const isTreadmillSport = activitySport === "treadmill";
    const isOutdoorAdventureSport = ["trail", "hiking", "walking", "nordic-walking"].includes(activitySport);
    const showShoeSelection = ["running", "trail", "treadmill"].includes(activitySport);
    const availableShoes = React.useMemo(() => shoes.filter((shoe) => !shoe.retired), [shoes]);
    const safeSensorDevices = Array.isArray(sensorSnapshot.devices) ? sensorSnapshot.devices : [];
    const connectedDeviceCount = safeSensorDevices.filter((device) => device.connected).length;
    const connectedTreadmillDevices = safeSensorDevices.filter((device) => device.connected).map((device) => ({ kind: device.kind, name: device.name }));
    const treadmillSource = treadmillDistanceSource(connectedTreadmillDevices, sensorSamplesRef.current, manualTreadmillSpeedKmh);
    const treadmillSourceLabel = treadmillDistanceSourceLabel(treadmillSource, lang);
    const treadmillUsesManualSpeed = treadmillSource === "manual-speed";
    const treadmillNeedsManualIncline = !Number.isFinite(sensorSnapshot.inclinePercent);
    const startFocus = React.useMemo(() => {
        switch (activitySport) {
            case "trail":
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ton trail", "Prepare your trail", "Prepara tu trail"),
                    hint: pickLegacyLocalizedText(lang, "Parcours, sécurité, GPS et autonomie avant de partir.", "Route, safety, GPS and battery before you go.", "Ruta, seguridad, GPS y autonomía antes de salir."),
                };
            case "hiking":
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ta randonnée", "Prepare your hike", "Prepara tu senderismo"),
                    hint: pickLegacyLocalizedText(lang, "Itinéraire, guidage hors-ligne et fiche sécurité.", "Route, offline guidance and safety sheet.", "Ruta, guía sin conexión y ficha de seguridad."),
                };
            case "walking":
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ta marche", "Prepare your walk", "Prepara tu caminata"),
                    hint: pickLegacyLocalizedText(lang, "Objectif simple, GPS et suivi de l'allure.", "Simple goal, GPS and pace tracking.", "Objetivo simple, GPS y control del ritmo."),
                };
            case "nordic-walking":
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ta marche nordique", "Prepare your nordic walk", "Prepara tu marcha nórdica"),
                    hint: pickLegacyLocalizedText(lang, "Parcours, GPS et capteurs de cadence si disponibles.", "Route, GPS and cadence sensors when available.", "Ruta, GPS y sensores de cadencia si están disponibles."),
                };
            case "treadmill":
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ta séance tapis", "Prepare your treadmill session", "Prepara tu sesión en cinta"),
                    hint: pickLegacyLocalizedText(lang, "Source de mesure, vitesse de secours et capteurs.", "Measurement source, fallback speed and sensors.", "Fuente de medición, velocidad de respaldo y sensores."),
                };
            default:
                return {
                    title: pickLegacyLocalizedText(lang, "Prépare ton running", "Prepare your run", "Prepara tu running"),
                    hint: pickLegacyLocalizedText(lang, "Objectif, GPS, chaussures et retours vocaux.", "Goal, GPS, shoes and voice feedback.", "Objetivo, GPS, zapatillas y retorno por voz."),
                };
        }
    }, [activitySport, lang]);
    React.useEffect(() => { try { localStorage.setItem(RUNNING_AUDIO_COACH_KEY, audioCoach ? "1" : "0"); } catch {} }, [audioCoach]);
    const speakCoach = React.useCallback((text: string) => {
        if (!audioCoach || !awena?.settings) return;
        void awenaVoice.speak(text, awena.settings, lang).catch(() => {});
    }, [audioCoach, awena?.settings, lang]);
    const selectAdjacentRoute = React.useCallback((direction: -1 | 1) => {
        if (!routeOptions.length)
            return;
        const nextIndex = (Math.max(0, selectedRouteIndex) + direction + routeOptions.length) % routeOptions.length;
        const nextRoute = routeOptions[nextIndex];
        if (nextRoute)
            selectRoute(nextRoute);
    }, [routeOptions, selectedRouteIndex]);
    const onRouteSwipeStart = React.useCallback((event: React.TouchEvent) => { routeSwipeStartXRef.current = event.touches[0]?.clientX ?? null; }, []);
    const onRouteSwipeEnd = React.useCallback((event: React.TouchEvent) => {
        const startX = routeSwipeStartXRef.current;
        routeSwipeStartXRef.current = null;
        if (startX == null) return;
        const endX = event.changedTouches[0]?.clientX ?? startX;
        const delta = endX - startX;
        if (Math.abs(delta) < 48) return;
        selectAdjacentRoute(delta < 0 ? 1 : -1);
    }, [selectAdjacentRoute]);
    const refreshActivities = React.useCallback(async () => setActivities(await listActivities(activitySport)), [activitySport]);
    React.useEffect(() => { void refreshActivities(); }, [refreshActivities]);
    React.useEffect(() => {
        if (activeSessionRestoreRef.current) return;
        activeSessionRestoreRef.current = true;
        if (params?.runningNewSession) return;
        const requestedId = params?.runningResumeSessionId ? String(params.runningResumeSessionId) : null;
        const session = getRunningActiveSession(requestedId);
        if (!session) return;
        const activityId = session.activityId || makeId();
        activeSessionIdRef.current = session.id;
        setActivitySport(session.sport as OutdoorPerformanceSport);
        setSelectedPresetId(session.presetId || "goal-free");
        setSelectedRouteId(session.routeReferenceId || null);
        setSelectedShoeId(session.shoeId || "");
        startedAtRef.current = Number(session.startedAt || Date.now());
        pausedTotalRef.current = Number(session.pausedTotalMs || 0);
        pauseStartedRef.current = session.paused ? Number(session.pausedAt || Date.now()) : 0;
        pausedRef.current = !!session.paused;
        setPaused(!!session.paused);
        setIsRecording(true);
        setLivePage("cockpit");
        setLiveRouteMapFullscreen(false);
        setView("record");
        setNow(Date.now());
        patchRunningActiveSession(session.id, { activityId, recoveredAt: Date.now() });

        void (async () => {
            const draft = await loadRunningSessionDraft(session.id);
            if (draft) {
                const restoredRoute = Array.isArray(draft.route) ? draft.route : [];
                if (restoredRoute.length) {
                    pointsRef.current = restoredRoute;
                    setPoints(restoredRoute);
                }
                sensorSamplesRef.current = Array.isArray(draft.sensorSamples) ? draft.sensorSamples : [];
                const restoredLaps = Array.isArray(draft.manualLaps) ? draft.manualLaps : [];
                setManualLaps(restoredLaps);
                lastLapElapsedRef.current = Number(draft.lastLapElapsedMs || 0);
                lastLapDistanceRef.current = Number(draft.lastLapDistanceM || 0);
                treadmillDistanceRef.current = Number(draft.treadmillDistanceM || 0);
                setTreadmillDistanceM(treadmillDistanceRef.current);
                if (Number.isFinite(draft.manualTreadmillSpeedKmh)) setManualTreadmillSpeedKmh(Number(draft.manualTreadmillSpeedKmh));
                if (Number.isFinite(draft.manualTreadmillIncline)) setManualTreadmillIncline(Number(draft.manualTreadmillIncline));
                pausedTotalRef.current = Math.max(pausedTotalRef.current, Number(draft.pausedTotalMs || 0));
                if (session.paused && draft.pauseStartedAt) pauseStartedRef.current = Number(draft.pauseStartedAt);
                patchRunningActiveSession(session.id, { activityId: draft.activityId || activityId, lastDraftAt: draft.updatedAt });
            }

            if (session.mode !== "native-gps") {
                // Web GPS / tapis ne peuvent pas continuer à collecter leurs données
                // quand le composant est démonté. Ils reviennent donc en pause,
                // mais leur brouillon complet est restauré.
                if (!session.paused) {
                    const pausedAt = Date.now();
                    pausedRef.current = true;
                    pauseStartedRef.current = pausedAt;
                    setPaused(true);
                    patchRunningActiveSession(session.id, { paused: true, pausedAt, status: "paused", activityId });
                }
                return;
            }

            let ownerId = getNativeTrackingOwnerSessionId();
            if (!ownerId) {
                const nativeRecording = loadRunningActiveSessions().filter((row) => row.mode === "native-gps" && !row.paused);
                if (nativeRecording.length <= 1) {
                    ownerId = session.id;
                    setNativeTrackingOwnerSessionId(session.id);
                }
            }
            if (ownerId !== session.id) {
                const pausedAt = Date.now();
                pausedRef.current = true;
                pauseStartedRef.current = pausedAt;
                setPaused(true);
                nativeTrackingActiveRef.current = false;
                patchRunningActiveSession(session.id, { paused: true, pausedAt, status: "paused", activityId });
                return;
            }

            try {
                const status = await nativeTrackingStatus();
                const track = await getNativeTrack();
                if (status?.running) {
                    nativeTrackingActiveRef.current = true;
                    const nativeRoute = Array.isArray(track?.route) ? track!.route! : [];
                    const mergedRoute = mergeRunningDraftRoutes(draft?.route, nativeRoute);
                    if (mergedRoute.length) {
                        pointsRef.current = mergedRoute;
                        setPoints(mergedRoute);
                    }
                    const nativePaused = !!status?.paused;
                    pausedRef.current = nativePaused;
                    setPaused(nativePaused);
                    if (nativePaused && !pauseStartedRef.current) pauseStartedRef.current = Date.now();
                    patchRunningActiveSession(session.id, {
                        activityId,
                        paused: nativePaused,
                        pausedAt: nativePaused ? (session.pausedAt || Date.now()) : undefined,
                        status: nativePaused ? "paused" : "recording",
                        lastElapsedMs: Number(status?.elapsedMs || session.lastElapsedMs || 0),
                        lastDistanceM: mergedRoute.length > 1 ? routeDistanceMeters(mergedRoute) : session.lastDistanceM,
                    });
                } else {
                    pausedRef.current = true;
                    setPaused(true);
                    nativeTrackingActiveRef.current = false;
                    const pausedAt = Date.now();
                    pauseStartedRef.current = pausedAt;
                    patchRunningActiveSession(session.id, { activityId, paused: true, pausedAt, status: "paused" });
                    clearNativeTrackingOwnerIf(session.id);
                }
            } catch {}
        })();
    // Restore only once when the Running module is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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
    const persistCurrentDraft = React.useCallback(async () => {
        const sessionId = activeSessionIdRef.current;
        if (!sessionId) return;
        const session = getRunningActiveSession(sessionId);
        if (!session) return;
        const activityId = session.activityId || makeId();
        if (!session.activityId) patchRunningActiveSession(sessionId, { activityId });
        const now = Date.now();
        const draft: RunningSessionDraft = {
            sessionId,
            activityId,
            sport: activitySport,
            title: session.title,
            presetId: session.presetId,
            workoutType: session.workoutType,
            startedAt: session.startedAt,
            mode: session.mode,
            targetDistanceM: session.targetDistanceM,
            targetDurationMs: session.targetDurationMs,
            targetPaceSecPerKm: session.targetPaceSecPerKm,
            routeReferenceId: session.routeReferenceId,
            shoeId: session.shoeId,
            paused: session.paused,
            pausedAt: session.pausedAt,
            route: [...pointsRef.current],
            manualLaps: [...manualLaps],
            sensorSamples: [...sensorSamplesRef.current],
            treadmillDistanceM: Number(treadmillDistanceRef.current || 0),
            manualTreadmillSpeedKmh,
            manualTreadmillIncline,
            lastLapElapsedMs: Number(lastLapElapsedRef.current || 0),
            lastLapDistanceM: Number(lastLapDistanceRef.current || 0),
            pausedTotalMs: Number(pausedTotalRef.current || 0),
            pauseStartedAt: pausedRef.current && pauseStartedRef.current ? pauseStartedRef.current : undefined,
            updatedAt: now,
        };
        await saveRunningSessionDraft(draft);
        patchRunningActiveSession(sessionId, {
            activityId,
            lastDraftAt: now,
            lastElapsedMs: activeElapsedAt(now),
            lastDistanceM: activitySport === "treadmill" ? treadmillDistanceRef.current : routeDistanceMeters(pointsRef.current),
        });
    }, [activeElapsedAt, activitySport, manualLaps, manualTreadmillIncline, manualTreadmillSpeedKmh]);

    React.useEffect(() => {
        if (!isRecording || !activeSessionIdRef.current) return;
        void persistCurrentDraft();
        const timer = window.setInterval(() => { void persistCurrentDraft(); }, 5000);
        const onVisibility = () => { if (document.visibilityState !== "visible") void persistCurrentDraft(); };
        window.addEventListener("pagehide", persistCurrentDraft as any);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("pagehide", persistCurrentDraft as any);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [isRecording, persistCurrentDraft]);

    React.useEffect(() => () => {
        const sessionId = activeSessionIdRef.current;
        if (!sessionId) return;
        const session = getRunningActiveSession(sessionId);
        if (!session || session.mode === "native-gps" || session.paused) return;
        const pausedAt = Date.now();
        patchRunningActiveSession(sessionId, { paused: true, pausedAt, status: "paused" });
    }, []);
    React.useEffect(() => {
        if (!isRecording || !activeSessionIdRef.current) return;
        const sync = () => {
            const elapsed = activeElapsedAt(Date.now());
            const distance = activitySport === "treadmill" ? treadmillDistanceRef.current : routeDistanceMeters(pointsRef.current);
            patchRunningActiveSession(activeSessionIdRef.current!, { lastElapsedMs: elapsed, lastDistanceM: distance, paused: pausedRef.current, status: pausedRef.current ? "paused" : "recording" });
        };
        sync();
        const timer = window.setInterval(sync, 3000);
        return () => window.clearInterval(timer);
    }, [activeElapsedAt, activitySport, isRecording]);
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
        if (previous && previous.timestamp === point.timestamp) {
            lastGpsPointAtRef.current = Date.now();
            return;
        }
        if (!shouldAcceptRunningPoint(previous, point)) return;
        pointsRef.current = [...pointsRef.current, point];
        lastGpsPointAtRef.current = Date.now();
        setPoints(pointsRef.current);
        setAccuracy(Number.isFinite(point.accuracy) ? Number(point.accuracy) : null);
        setGpsMessage(Number(point.accuracy || 0) > 45 ? copy.gpsPoor : copy.gpsReady);
    }), [activitySport, copy.gpsPoor, copy.gpsReady]);

    React.useEffect(() => {
        if (!isRecording || !nativeTrackingActiveRef.current || activitySport === "treadmill") return;
        const id = window.setInterval(() => { void getNativeTrack().then((snapshot) => {
            if (!snapshot?.route?.length) return;
            const mergedRoute = mergeRunningDraftRoutes(pointsRef.current, snapshot.route);
            pointsRef.current = mergedRoute;
            lastGpsPointAtRef.current = Date.now();
            setPoints(mergedRoute);
            const point = mergedRoute[mergedRoute.length - 1];
            if (point) {
                setAccuracy(Number.isFinite(point.accuracy) ? Number(point.accuracy) : null);
                setGpsMessage(Number(point.accuracy || 0) > 45 ? copy.gpsPoor : copy.gpsReady);
            }
        }); }, 4000);
        return () => window.clearInterval(id);
    }, [activitySport, copy.gpsPoor, copy.gpsReady, isRecording]);

    React.useEffect(() => {
        if (!isRecording || activitySport === "treadmill") return;
        const updateSignalState = () => {
            if (pausedRef.current || gpsMessage === copy.gpsDenied) return;
            if (!pointsRef.current.length) {
                setGpsMessage(copy.gpsSearching);
                return;
            }
            if (lastGpsPointAtRef.current && Date.now() - lastGpsPointAtRef.current > 15000) {
                setGpsMessage(copy.gpsLost);
            }
        };
        updateSignalState();
        const id = window.setInterval(updateSignalState, 3000);
        return () => window.clearInterval(id);
    }, [activitySport, copy.gpsDenied, copy.gpsLost, copy.gpsSearching, gpsMessage, isRecording]);
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
    const liveOutdoorProgress = React.useMemo(() => selectedRoute && routeExtras && activitySport !== "treadmill" ? outdoorRouteProgress(selectedRoute, activitySport, liveDistance, elapsedMs, points[points.length - 1] || null, liveElevation, routeExtras.waypoints, routeExtras.offRouteAlertM) : null, [activitySport, elapsedMs, liveDistance, liveElevation, points, routeExtras, selectedRoute]);
    const liveOutdoorDirection = React.useMemo(() => selectedRoute && liveOutdoorProgress ? outdoorDirectionalGuidance(selectedRoute, liveOutdoorProgress.matchedDistanceM, points[points.length - 1] || null, points[points.length - 2] || null) : null, [liveOutdoorProgress?.matchedDistanceM, points, selectedRoute]);
    const liveOutdoorRejoin = React.useMemo(() => selectedRoute && liveOutdoorProgress?.offRouteAlert ? outdoorRouteRejoinPlan(selectedRoute, points[points.length - 1] || null, liveOutdoorProgress.matchedDistanceM) : null, [liveOutdoorProgress?.matchedDistanceM, liveOutdoorProgress?.offRouteAlert, points, selectedRoute]);
    const liveOutdoorRerouteRoute = React.useMemo(() => liveOutdoorReroute ? rerouteAsRunningRoute(liveOutdoorReroute, activitySport) : null, [activitySport, liveOutdoorReroute]);
    const liveOutdoorRerouteMatchedM = React.useMemo(() => liveOutdoorReroute ? outdoorRerouteMatchedDistanceM(liveOutdoorReroute, points[points.length - 1] || null) : 0, [liveOutdoorReroute, points]);
    const liveOutdoorRerouteDirection = React.useMemo(() => liveOutdoorProgress?.offRouteAlert && liveOutdoorRerouteRoute ? outdoorDirectionalGuidance(liveOutdoorRerouteRoute, liveOutdoorRerouteMatchedM, points[points.length - 1] || null, points[points.length - 2] || null) : null, [liveOutdoorProgress?.offRouteAlert, liveOutdoorRerouteMatchedM, liveOutdoorRerouteRoute, points]);
    const liveOutdoorActiveDirection = liveOutdoorProgress?.offRouteAlert && liveOutdoorRerouteDirection ? liveOutdoorRerouteDirection : liveOutdoorDirection;
    liveOutdoorProgressRef.current = liveOutdoorProgress;
    rerouteResultRef.current = liveOutdoorReroute;
    rerouteBusyRef.current = liveOutdoorRerouteBusy;
    React.useEffect(() => {
        if (!isRecording || !selectedRoute || !liveOutdoorProgress?.offRouteAlert || activitySport === "treadmill") {
            rerouteAbortRef.current?.abort();
            rerouteAbortRef.current = null;
            rerouteResultRef.current = null;
            rerouteBusyRef.current = false;
            setLiveOutdoorReroute(null);
            setLiveOutdoorRerouteBusy(false);
            setLiveOutdoorRerouteError("");
            rerouteLastOriginRef.current = null;
            return;
        }

        let disposed = false;
        const attemptReroute = () => {
            if (disposed || rerouteBusyRef.current) return;
            const progressNow = liveOutdoorProgressRef.current;
            const currentPoint = pointsRef.current[pointsRef.current.length - 1] || null;
            if (!progressNow?.offRouteAlert || !currentPoint) return;

            const nowMs = Date.now();
            const movedSinceLast = rerouteLastOriginRef.current ? routeDistanceMeters([rerouteLastOriginRef.current, currentPoint]) : Number.POSITIVE_INFINITY;
            const currentReroute = rerouteResultRef.current;
            const rerouteStillUseful = currentReroute && currentReroute.routeId === selectedRoute.id && movedSinceLast < 90 && nowMs - rerouteLastRequestedAtRef.current < 45_000;
            if (rerouteStillUseful) return;

            rerouteAbortRef.current?.abort();
            const controller = new AbortController();
            rerouteAbortRef.current = controller;
            rerouteLastRequestedAtRef.current = nowMs;
            rerouteLastOriginRef.current = currentPoint;
            rerouteBusyRef.current = true;
            setLiveOutdoorRerouteBusy(true);
            setLiveOutdoorRerouteError("");

            void rerouteOutdoorToRoute({ route: selectedRoute, currentPoint, matchedDistanceM: progressNow.matchedDistanceM, sport: activitySport, signal: controller.signal })
                .then((result) => {
                    if (disposed || controller.signal.aborted) return;
                    rerouteResultRef.current = result;
                    rerouteBusyRef.current = false;
                    setLiveOutdoorReroute(result);
                    setLiveOutdoorRerouteBusy(false);
                    setLiveOutdoorRerouteError("");
                    const nowAnnouncement = Date.now();
                    if (nowAnnouncement - rerouteAnnouncedAtRef.current > 20_000) {
                        rerouteAnnouncedAtRef.current = nowAnnouncement;
                        speakCoach(pickLegacyLocalizedText(lang, `Nouveau chemin calculé. Suis le reroutage sur environ ${Math.max(20, Math.round(result.distanceM / 10) * 10)} mètres pour rejoindre le parcours.`, `New path calculated. Follow the reroute for about ${Math.max(20, Math.round(result.distanceM / 10) * 10)} metres to rejoin the route.`, `Nueva ruta calculada. Sigue el desvío unos ${Math.max(20, Math.round(result.distanceM / 10) * 10)} metros para volver al recorrido.`));
                    }
                })
                .catch((error) => {
                    if (disposed || controller.signal.aborted) return;
                    rerouteResultRef.current = null;
                    rerouteBusyRef.current = false;
                    setLiveOutdoorReroute(null);
                    setLiveOutdoorRerouteBusy(false);
                    setLiveOutdoorRerouteError(String((error as any)?.message || "REROUTE_UNAVAILABLE"));
                });
        };

        const initialTimer = window.setTimeout(attemptReroute, 700);
        const interval = window.setInterval(attemptReroute, 15_000);
        return () => {
            disposed = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(interval);
            rerouteAbortRef.current?.abort();
            rerouteAbortRef.current = null;
            rerouteBusyRef.current = false;
        };
    }, [activitySport, isRecording, lang, liveOutdoorProgress?.offRouteAlert, selectedRoute?.id, speakCoach]);
    React.useEffect(() => {
        if (!isRecording || !routeExtras?.alertsEnabled || !liveOutdoorProgress) { offRouteAlertRef.current = false; wrongWayAlertRef.current = false; return; }
        if (liveOutdoorProgress.offRouteAlert && !offRouteAlertRef.current) {
            offRouteAlertRef.current = true;
            try { navigator.vibrate?.([120, 80, 120]); } catch {}
            const rejoinDistance = liveOutdoorRejoin ? Math.max(20, Math.round(liveOutdoorRejoin.distanceToTargetM / 10) * 10) : null;
            speakCoach(pickLegacyLocalizedText(lang, rejoinDistance != null ? `Attention, tu es à ${Math.round(liveOutdoorProgress.offRouteM || 0)} mètres du parcours. Rejoins le tracé dans environ ${rejoinDistance} mètres.` : `Attention, tu es à ${Math.round(liveOutdoorProgress.offRouteM || 0)} mètres du parcours.`, rejoinDistance != null ? `Caution, you are ${Math.round(liveOutdoorProgress.offRouteM || 0)} metres off route. Rejoin the route in about ${rejoinDistance} metres.` : `Caution, you are ${Math.round(liveOutdoorProgress.offRouteM || 0)} metres off route.`, rejoinDistance != null ? `Atención, estás a ${Math.round(liveOutdoorProgress.offRouteM || 0)} metros de la ruta. Vuelve a la ruta en unos ${rejoinDistance} metros.` : `Atención, estás a ${Math.round(liveOutdoorProgress.offRouteM || 0)} metros de la ruta.`));
        } else if (!liveOutdoorProgress.offRouteAlert && offRouteAlertRef.current && Number(liveOutdoorProgress.offRouteM || 0) < routeExtras.offRouteAlertM * 0.7) {
            offRouteAlertRef.current = false;
            speakCoach(pickLegacyLocalizedText(lang, "Tu es revenu sur le parcours.", "You are back on route.", "Has vuelto a la ruta."));
        }
        if (liveOutdoorActiveDirection?.wrongWay && !wrongWayAlertRef.current) {
            wrongWayAlertRef.current = true;
            try { navigator.vibrate?.([180, 80, 180, 80, 180]); } catch {}
            speakCoach(pickLegacyLocalizedText(lang, "Mauvais sens. Vérifie le parcours et fais demi-tour si nécessaire.", "Wrong way. Check the route and turn back if needed.", "Sentido incorrecto. Comprueba la ruta y da la vuelta si es necesario."));
        } else if (!liveOutdoorActiveDirection?.wrongWay && wrongWayAlertRef.current) {
            wrongWayAlertRef.current = false;
        }
        const announceTurn = (thresholdM: number, bucket: string) => {
            if (!liveOutdoorActiveDirection || liveOutdoorActiveDirection.kind === "finish" || liveOutdoorActiveDirection.wrongWay || liveOutdoorActiveDirection.distanceM > thresholdM)
                return;
            const key = `${liveOutdoorProgress.offRouteAlert && liveOutdoorReroute ? "reroute:" : "route:"}${liveOutdoorActiveDirection.id}:${bucket}`;
            if (turnAnnouncedRef.current.has(key))
                return;
            turnAnnouncedRef.current.add(key);
            const direction = liveOutdoorActiveDirection.kind.includes("left")
                ? pickLegacyLocalizedText(lang, "tourne à gauche", "turn left", "gira a la izquierda")
                : liveOutdoorActiveDirection.kind.includes("right")
                    ? pickLegacyLocalizedText(lang, "tourne à droite", "turn right", "gira a la derecha")
                    : liveOutdoorActiveDirection.kind === "u-turn"
                        ? pickLegacyLocalizedText(lang, "fais demi-tour", "make a U-turn", "da la vuelta")
                        : pickLegacyLocalizedText(lang, "continue tout droit", "keep straight", "sigue recto");
            speakCoach(pickLegacyLocalizedText(lang, `${direction} dans ${Math.max(20, Math.round(liveOutdoorActiveDirection.distanceM / 10) * 10)} mètres.`, `${direction} in ${Math.max(20, Math.round(liveOutdoorActiveDirection.distanceM / 10) * 10)} metres.`, `${direction} en ${Math.max(20, Math.round(liveOutdoorActiveDirection.distanceM / 10) * 10)} metros.`));
        };
        announceTurn(260, "early");
        announceTurn(80, "near");
        const checkpoint = liveOutdoorProgress.nextCheckpoint;
        if (checkpoint && liveOutdoorProgress.nextCheckpointDistanceM != null && liveOutdoorProgress.nextCheckpointDistanceM <= 180 && !checkpointAnnouncedRef.current.has(checkpoint.id)) {
            checkpointAnnouncedRef.current.add(checkpoint.id);
            const label = checkpoint.name || (checkpoint.kind === "finish" ? pickLegacyLocalizedText(lang, "arrivée", "finish", "llegada") : checkpoint.kind === "high-point" ? pickLegacyLocalizedText(lang, "point haut", "high point", "punto alto") : `${Math.round(checkpoint.distanceM / 1000)} km`);
            speakCoach(pickLegacyLocalizedText(lang, `${label} dans ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} mètres.`, `${label} in ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} metres.`, `${label} en ${Math.max(30, Math.round(liveOutdoorProgress.nextCheckpointDistanceM / 10) * 10)} metros.`));
        }
    }, [isRecording, lang, liveOutdoorActiveDirection?.distanceM, liveOutdoorActiveDirection?.id, liveOutdoorActiveDirection?.kind, liveOutdoorActiveDirection?.wrongWay, liveOutdoorProgress?.nextCheckpoint?.id, liveOutdoorProgress?.nextCheckpointDistanceM, liveOutdoorProgress?.offRouteAlert, liveOutdoorProgress?.offRouteM, liveOutdoorRejoin?.distanceToTargetM, liveOutdoorReroute, routeExtras?.alertsEnabled, routeExtras?.offRouteAlertM, speakCoach]);
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
    const checkGps = React.useCallback(async () => {
        if (activitySport === "treadmill") {
            setGpsMessage(pickLegacyLocalizedText(lang, "MESURE INTÉRIEURE PRÊTE", "INDOOR MEASUREMENT READY", "MEDICIÓN INTERIOR LISTA"));
            return;
        }
        setAccuracy(null);
        setGpsMessage(copy.gpsSearching);
        if (isNativeActivityTrackingAvailable()) {
            try {
                const permissions: any = await requestNativeTrackingPermissions();
                if (!permissions?.granted || permissions?.precise === false) {
                    setGpsMessage(pickLegacyLocalizedText(lang, "ACTIVE LA LOCALISATION PRÉCISE POUR RUNNING PERFORMANCE…", "ENABLE PRECISE LOCATION FOR RUNNING PERFORMANCE…", "ACTIVA LA UBICACIÓN PRECISA PARA RUNNING PERFORMANCE…"));
                    await openNativeAppLocationPermissionSettings();
                    return;
                }
                const status = await nativeTrackingStatus();
                if (permissions?.locationServicesEnabled === false || status?.locationServicesEnabled === false) {
                    setGpsMessage(pickLegacyLocalizedText(lang, "ACTIVE LE GPS ANDROID…", "TURN ON ANDROID LOCATION…", "ACTIVA LA UBICACIÓN ANDROID…"));
                    await openNativeLocationSettings();
                    return;
                }
                const resolved = await getNativeCurrentPosition(15000);
                if (!resolved) {
                    setGpsMessage(copy.gpsLost);
                    return;
                }
                const nextAccuracy = Number.isFinite(resolved.accuracy) ? Number(resolved.accuracy) : null;
                setAccuracy(nextAccuracy);
                setGpsMessage(nextAccuracy != null && nextAccuracy > 45 ? copy.gpsPoor : copy.gpsReady);
            } catch {
                try { await stopNativeTracking(); } catch {}
                    setGpsMessage(copy.gpsLost);
            }
            return;
        }
        if (!navigator.geolocation) {
            setGpsMessage(copy.gpsDenied);
            return;
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            const a = Number(pos.coords.accuracy || 999);
            setAccuracy(a);
            setGpsMessage(a <= 35 ? copy.gpsReady : copy.gpsPoor);
        }, (error) => {
            setGpsMessage(error.code === 1 ? copy.gpsDenied : copy.gpsLost);
        }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
    }, [activitySport, copy.gpsDenied, copy.gpsLost, copy.gpsPoor, copy.gpsReady, copy.gpsSearching, lang]);
    const startGpsRun = React.useCallback(async () => {
        if (activitySport !== "treadmill" && isNativeActivityTrackingAvailable()) {
            try {
                const permissions: any = await requestNativeTrackingPermissions();
                if (!permissions?.granted || permissions?.precise === false) {
                    nativeTrackingActiveRef.current = false;
                    setGpsMessage(pickLegacyLocalizedText(lang, "ACTIVE LA LOCALISATION PRÉCISE POUR RUNNING PERFORMANCE…", "ENABLE PRECISE LOCATION FOR RUNNING PERFORMANCE…", "ACTIVA LA UBICACIÓN PRECISA PARA RUNNING PERFORMANCE…"));
                    await openNativeAppLocationPermissionSettings();
                    return;
                }
                const status = await nativeTrackingStatus();
                if (permissions?.locationServicesEnabled === false || status?.locationServicesEnabled === false) {
                    nativeTrackingActiveRef.current = false;
                    setGpsMessage(pickLegacyLocalizedText(lang, "ACTIVE LE GPS ANDROID…", "TURN ON ANDROID LOCATION…", "ACTIVA LA UBICACIÓN ANDROID…"));
                    await openNativeLocationSettings();
                    return;
                }
            } catch {
                nativeTrackingActiveRef.current = false;
                setGpsMessage(copy.gpsLost);
                return;
            }
        }

        setPoints([]);
        pointsRef.current = [];
        setManualLaps([]);
        lastLapElapsedRef.current = 0;
        lastLapDistanceRef.current = 0;
        splitCountRef.current = 0;
        phaseIndexRef.current = null;
        milestoneRef.current = new Set();
        checkpointAnnouncedRef.current = new Set();
        turnAnnouncedRef.current = new Set();
        offRouteAlertRef.current = false;
        wrongWayAlertRef.current = false;
        setFinishBadges([]);
        sensorSamplesRef.current = [];
        lastSensorSampleAtRef.current = 0;
        setAccuracy(null);
        lastGpsPointAtRef.current = 0;
        setGpsMessage(activitySport === "treadmill" ? (pickLegacyLocalizedText(lang, "MESURE INTÉRIEURE", "INDOOR MEASUREMENT", "MEDICIÓN INTERIOR")) : copy.gpsSearching);
        treadmillDistanceRef.current = 0;
        treadmillFtmsLastRawRef.current = null;
        treadmillTickRef.current = Date.now();
        setTreadmillDistanceM(0);
        pausedRef.current = false;
        pausedTotalRef.current = 0;
        pauseStartedRef.current = 0;
        startedAtRef.current = Date.now();
        const otherRecording = getRunningRecordingSession(activeSessionIdRef.current);
        if (otherRecording) {
            setGpsMessage(pickLegacyLocalizedText(lang, "UNE AUTRE ACTIVITÉ EST DÉJÀ EN COURS. METS-LA EN PAUSE AVANT D'EN DÉMARRER UNE AUTRE.", "ANOTHER ACTIVITY IS ALREADY RECORDING. PAUSE IT BEFORE STARTING ANOTHER.", "YA HAY OTRA ACTIVIDAD EN CURSO. PÁUSALA ANTES DE INICIAR OTRA."));
            return;
        }
        const liveSessionId = activeSessionIdRef.current || `running-live-${startedAtRef.current}-${Math.random().toString(36).slice(2, 7)}`;
        const sessionActivityId = makeId();
        const mode = activitySport === "treadmill" ? "treadmill" : isNativeActivityTrackingAvailable() ? "native-gps" : "web-gps";
        const activeRegistration = upsertRunningActiveSession({ id: liveSessionId, activityId: sessionActivityId, sport: activitySport, title: `${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)}`, presetId: effectivePreset.id, workoutType: effectivePreset.type, startedAt: startedAtRef.current, paused: false, pausedTotalMs: 0, status: "recording", mode, targetDistanceM, targetDurationMs, targetPaceSecPerKm, routeReferenceId: selectedRoute?.id, shoeId: selectedShoeId || undefined, lastDistanceM: 0, lastElapsedMs: 0, lastUpdatedAt: Date.now() });
        if (!activeRegistration.ok) {
            setGpsMessage(pickLegacyLocalizedText(lang, "3 ACTIVITÉS ACTIVES MAXIMUM. TERMINE OU ANNULE UNE SESSION AVANT D'EN CRÉER UNE AUTRE.", "MAXIMUM 3 ACTIVE ACTIVITIES. FINISH OR CANCEL ONE BEFORE CREATING ANOTHER.", "MÁXIMO 3 ACTIVIDADES ACTIVAS. TERMINA O CANCELA UNA ANTES DE CREAR OTRA."));
            return;
        }
        activeSessionIdRef.current = liveSessionId;
        await saveRunningSessionDraft({ sessionId: liveSessionId, activityId: sessionActivityId, sport: activitySport, title: `${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)}`, presetId: effectivePreset.id, workoutType: effectivePreset.type, startedAt: startedAtRef.current, mode: activitySport === "treadmill" ? "treadmill" : isNativeActivityTrackingAvailable() ? "native-gps" : "web-gps", targetDistanceM, targetDurationMs, targetPaceSecPerKm, routeReferenceId: selectedRoute?.id, shoeId: selectedShoeId || undefined, paused: false, route: [], manualLaps: [], sensorSamples: [], treadmillDistanceM: 0, manualTreadmillSpeedKmh, manualTreadmillIncline, lastLapElapsedMs: 0, lastLapDistanceM: 0, pausedTotalMs: 0, updatedAt: Date.now() });
        patchRunningActiveSession(liveSessionId, { lastDraftAt: Date.now() });
        setNow(startedAtRef.current);
        setPaused(false);
        setIsRecording(true);
        setLivePage("cockpit");
        setLiveRouteMapFullscreen(false);
        setView("record");
        speakCoach(pickLegacyLocalizedText(lang, `Départ. ${presetLabel(effectivePreset, lang)}.`, `Start. ${presetLabel(effectivePreset, lang)}.`, `Salida. ${presetLabel(effectivePreset, lang)}.`));
        if (activitySport === "treadmill") {
            nativeTrackingActiveRef.current = false;
            return;
        }
        stopWatch();
        if (isNativeActivityTrackingAvailable()) {
            try {
                const previousOwnerId = getNativeTrackingOwnerSessionId();
                if (previousOwnerId && previousOwnerId !== liveSessionId) {
                    const previousDraft = await loadRunningSessionDraft(previousOwnerId);
                    const previousTrack = await getNativeTrack();
                    const previousRoute = Array.isArray(previousTrack?.route) ? previousTrack!.route! : [];
                    if (previousDraft) {
                        const mergedPrevious = mergeRunningDraftRoutes(previousDraft.route, previousRoute);
                        await saveRunningSessionDraft({ ...previousDraft, route: mergedPrevious, updatedAt: Date.now() });
                        patchRunningActiveSession(previousOwnerId, { lastDraftAt: Date.now(), lastDistanceM: mergedPrevious.length > 1 ? routeDistanceMeters(mergedPrevious) : undefined });
                    }
                }
                await startNativeTracking(activitySport);
                setNativeTrackingOwnerSessionId(liveSessionId);
                nativeTrackingActiveRef.current = true;
                setGpsMessage(copy.gpsSearching);
                return;
            } catch {
                nativeTrackingActiveRef.current = false;
                setGpsMessage(copy.gpsLost);
                setIsRecording(false);
                if (activeSessionIdRef.current) {
                    const failedSessionId = activeSessionIdRef.current;
                    removeRunningActiveSession(failedSessionId);
                    clearNativeTrackingOwnerIf(failedSessionId);
                    void deleteRunningSessionDraft(failedSessionId);
                }
                activeSessionIdRef.current = null;
                setView("setup");
                return;
            }
        }
        if (!navigator.geolocation) {
            setGpsMessage(copy.gpsDenied);
            setIsRecording(false);
            if (activeSessionIdRef.current) {
                const failedSessionId = activeSessionIdRef.current;
                removeRunningActiveSession(failedSessionId);
                void deleteRunningSessionDraft(failedSessionId);
            }
            activeSessionIdRef.current = null;
            setView("setup");
            return;
        }
        setGpsMessage(copy.gpsSearching);
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
            if (!shouldAcceptRunningPoint(previous, next)) return;
            pointsRef.current = [...pointsRef.current, next];
            lastGpsPointAtRef.current = Date.now();
            setPoints(pointsRef.current);
        }, (error) => {
            setGpsMessage(error.code === 1 ? copy.gpsDenied : copy.gpsLost);
            if (error.code === 1) {
                setIsRecording(false);
                if (activeSessionIdRef.current) {
                    const failedSessionId = activeSessionIdRef.current;
                    removeRunningActiveSession(failedSessionId);
                    void deleteRunningSessionDraft(failedSessionId);
                    activeSessionIdRef.current = null;
                }
                setView("setup");
            }
        }, { enableHighAccuracy: true, maximumAge: 1500, timeout: 15000 });
    }, [activeElapsedAt, activitySport, copy.gpsDenied, copy.gpsLost, copy.gpsPoor, copy.gpsReady, copy.gpsSearching, copy.pause, effectivePreset, lang, speakCoach, stopWatch]);
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
    const togglePause = React.useCallback(async () => {
        if (!isRecording) return;
        const sessionId = activeSessionIdRef.current;
        const session = sessionId ? getRunningActiveSession(sessionId) : null;
        if (!pausedRef.current) {
            pausedRef.current = true;
            pauseStartedRef.current = Date.now();
            setPaused(true);
            if (sessionId) patchRunningActiveSession(sessionId, { paused: true, pausedAt: pauseStartedRef.current, status: "paused", pausedTotalMs: pausedTotalRef.current });
            if (nativeTrackingActiveRef.current) {
                await pauseNativeTracking();
                await persistCurrentDraft();
            }
            return;
        }

        const otherRecording = getRunningRecordingSession(sessionId);
        if (otherRecording) {
            setGpsMessage(pickLegacyLocalizedText(lang, "UNE AUTRE ACTIVITÉ UTILISE DÉJÀ LE TRACKING. METS-LA EN PAUSE D'ABORD.", "ANOTHER ACTIVITY IS ALREADY USING TRACKING. PAUSE IT FIRST.", "OTRA ACTIVIDAD YA ESTÁ USANDO EL SEGUIMIENTO. PÁUSALA PRIMERO."));
            return;
        }

        if (session?.mode === "native-gps" && !nativeTrackingActiveRef.current) {
            try {
                const previousOwnerId = getNativeTrackingOwnerSessionId();
                if (previousOwnerId && previousOwnerId !== sessionId) {
                    const previousDraft = await loadRunningSessionDraft(previousOwnerId);
                    const previousTrack = await getNativeTrack();
                    const previousRoute = Array.isArray(previousTrack?.route) ? previousTrack!.route! : [];
                    if (previousDraft) {
                        const mergedPrevious = mergeRunningDraftRoutes(previousDraft.route, previousRoute);
                        await saveRunningSessionDraft({ ...previousDraft, route: mergedPrevious, updatedAt: Date.now() });
                        patchRunningActiveSession(previousOwnerId, { lastDraftAt: Date.now(), lastDistanceM: mergedPrevious.length > 1 ? routeDistanceMeters(mergedPrevious) : undefined });
                    }
                }
                await startNativeTracking(activitySport);
                setNativeTrackingOwnerSessionId(sessionId!);
                nativeTrackingActiveRef.current = true;
            } catch {
                setGpsMessage(copy.gpsLost);
                return;
            }
        }

        const resumed = Date.now();
        if (pauseStartedRef.current) pausedTotalRef.current += Math.max(0, resumed - pauseStartedRef.current);
        pauseStartedRef.current = 0;
        pausedRef.current = false;
        setPaused(false);
        if (sessionId) patchRunningActiveSession(sessionId, { ...resumedRunningSessionTiming(session || ({ pausedAt: resumed, pausedTotalMs: pausedTotalRef.current } as any), resumed), pausedTotalMs: pausedTotalRef.current });
        if (nativeTrackingActiveRef.current) await resumeNativeTracking();
        setNow(resumed);
    }, [activitySport, copy.gpsLost, isRecording, lang, persistCurrentDraft]);
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
    const cancelRun = React.useCallback(() => {
        stopWatch();
        const sessionId = activeSessionIdRef.current;
        if (nativeTrackingActiveRef.current) { void stopNativeTracking(); nativeTrackingActiveRef.current = false; }
        if (sessionId) {
            removeRunningActiveSession(sessionId);
            clearNativeTrackingOwnerIf(sessionId);
            void deleteRunningSessionDraft(sessionId);
        }
        activeSessionIdRef.current = null;
        setIsRecording(false);
        setPaused(false);
        pausedRef.current = false;
        pointsRef.current = [];
        setPoints([]);
        setManualLaps([]);
        setGpsMessage("");
        setView("setup");
    }, [stopWatch]);
    const finishRun = React.useCallback(async () => {
        const sessionId = activeSessionIdRef.current;
        const activeSession = sessionId ? getRunningActiveSession(sessionId) : null;
        const draft = sessionId ? await loadRunningSessionDraft(sessionId) : null;
        let routeForSave = mergeRunningDraftRoutes(draft?.route, pointsRef.current);
        const wasNativeTracking = nativeTrackingActiveRef.current;
        if (nativeTrackingActiveRef.current && activitySport !== "treadmill") {
            const native = await stopNativeTracking();
            nativeTrackingActiveRef.current = false;
            if (sessionId) clearNativeTrackingOwnerIf(sessionId);
            routeForSave = mergeRunningDraftRoutes(routeForSave, native?.route);
            if (routeForSave.length) { pointsRef.current = routeForSave; setPoints(routeForSave); }
        }
        const indoorDistance = Math.max(Number(treadmillDistanceRef.current || 0), Number(draft?.treadmillDistanceM || 0));
        if (activitySport === "treadmill" ? indoorDistance < 10 : routeForSave.length < 2) {
            if (sessionId && draft) await saveRunningSessionDraft({ ...draft, route: routeForSave, treadmillDistanceM: indoorDistance, updatedAt: Date.now() });
            if (sessionId) {
                const pausedAt = Date.now();
                patchRunningActiveSession(sessionId, { paused: true, pausedAt, status: "paused", lastDraftAt: draft ? Date.now() : activeSession?.lastDraftAt });
                pausedRef.current = true;
                pauseStartedRef.current = pausedAt;
                setPaused(true);
            }
            setGpsMessage(activitySport === "treadmill" ? (pickLegacyLocalizedText(lang, "Distance insuffisante pour enregistrer la séance.", "Not enough distance to save the workout.", "Distancia insuficiente para guardar la sesión.")) : copy.insufficient);
            return;
        }
        stopWatch();
        const endedAt = Date.now();
        let pauseTotal = pausedTotalRef.current;
        if (pausedRef.current && pauseStartedRef.current) pauseTotal += endedAt - pauseStartedRef.current;
        const elapsed = Math.max(1, endedAt - startedAtRef.current - pauseTotal);
        const route = activitySport === "treadmill" ? [] : routeForSave;
        const distanceM = activitySport === "treadmill" ? indoorDistance : routeDistanceMeters(route);
        const finalSensorSamples = sensorSamplesRef.current.length ? [...sensorSamplesRef.current] : [...(draft?.sensorSamples || [])];
        const finalManualLaps = manualLaps.length ? manualLaps : [...(draft?.manualLaps || [])];
        const splits = activitySport === "treadmill" ? buildTreadmillSplits(finalSensorSamples) : buildKilometerSplits(route, startedAtRef.current);
        const finalGhostDelta = activitySport !== "treadmill" && ghostEnabled ? runningGhostMatch(selectedRoute, route[route.length - 1], distanceM, elapsed)?.deltaMs ?? null : null;
        const stableActivityId = activeSession?.activityId || draft?.activityId || makeId();
        const record: ActivityRecord = { id: stableActivityId, sport: activitySport, source: activitySport === "treadmill" ? "manual" : "phone-gps", verification: activitySport === "treadmill" && safeSensorDevices.some((device) => device.connected) ? "connected" : activitySport === "treadmill" ? "declared" : "gps", startedAt: startedAtRef.current, endedAt, elapsedMs: elapsed, movingMs: activitySport === "treadmill" ? elapsed : (movingTimeMs(route) || elapsed), distanceM, avgSpeedMps: averageSpeedMps(distanceM, elapsed), avgPaceSecPerKm: averagePaceSecPerKm(distanceM, elapsed), elevationGainM: activitySport === "treadmill" ? 0 : elevationGainMeters(route), route, splits, targetDistanceM, targetDurationMs, targetPaceSecPerKm, workoutType: effectivePreset.type, manualLaps: finalManualLaps, planId, planSessionId, title: `${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)}`, shoeId: selectedShoeId || undefined, routeReferenceId: selectedRoute?.id, ghostEnabled: activitySport !== "treadmill" && ghostEnabled && !!selectedRoute, ghostDeltaMs: finalGhostDelta, deviceName: activitySport === "treadmill" ? (safeSensorDevices.find((device) => device.kind === "fitness-machine-treadmill" && device.connected)?.name || safeSensorDevices.find((device) => device.kind === "running-speed-cadence" && device.connected)?.name || "Tapis roulant") : (wasNativeTracking || activeSession?.mode === "native-gps" ? "Android Native GPS" : "Phone GPS"), sensorSamples: finalSensorSamples.length ? finalSensorSamples : undefined, sensorDevices: safeSensorDevices.filter((device) => device.connected).map((device) => ({ kind: device.kind, name: device.name })), indoor: activitySport === "treadmill" || undefined, treadmill: activitySport === "treadmill" ? { distanceSource: treadmillDistanceSource(safeSensorDevices.filter((device) => device.connected).map((device) => ({ kind: device.kind, name: device.name })), finalSensorSamples, manualTreadmillSpeedKmh), manualSpeedKmh: manualTreadmillSpeedKmh, inclinePercent: averageTreadmillIncline(finalSensorSamples) ?? manualTreadmillIncline } : undefined, createdAt: Date.now() };
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
        if (selectedRoute) void syncOutdoorRouteAttempt(selectedRoute, record);
        if (sessionId) {
            removeRunningActiveSession(sessionId);
            clearNativeTrackingOwnerIf(sessionId);
            await deleteRunningSessionDraft(sessionId);
        }
        activeSessionIdRef.current = null;
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
        setGhostEnabled(Number(route.referenceElapsedMs || 0) > 0);
    }, []);
    const resolveRoutePosition = React.useCallback(async (): Promise<GeoPoint> => {
        let point: GeoPoint | null = null;
        if (isNativeActivityTrackingAvailable()) {
            const permissions: any = await requestNativeTrackingPermissions();
            if (!permissions?.granted || permissions?.precise === false) {
                await openNativeAppLocationPermissionSettings();
                throw new Error(pickLegacyLocalizedText(lang, "La localisation précise Android est nécessaire pour utiliser les parcours autour de toi.", "Android precise location is required to use routes around you.", "La ubicación precisa de Android es necesaria para usar rutas cercanas."));
            }
            const status = await nativeTrackingStatus();
            if (permissions?.locationServicesEnabled === false || status?.locationServicesEnabled === false) {
                await openNativeLocationSettings();
                throw new Error(pickLegacyLocalizedText(lang, "Active le GPS Android puis réessaie.", "Turn on Android location then try again.", "Activa la ubicación Android y vuelve a intentarlo."));
            }
            point = await getNativeCurrentPosition(15000);
        } else if (navigator.geolocation) {
            point = await new Promise<GeoPoint | null>((resolve) => navigator.geolocation.getCurrentPosition((position) => resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                timestamp: position.timestamp || Date.now(),
                accuracy: Number.isFinite(position.coords.accuracy) ? Number(position.coords.accuracy) : undefined,
                altitude: Number.isFinite(position.coords.altitude) ? Number(position.coords.altitude) : undefined,
            }), () => resolve(null), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }));
        }
        if (!point) throw new Error(pickLegacyLocalizedText(lang, "Impossible d'obtenir ta position GPS.", "Unable to get your GPS position.", "No se pudo obtener tu posición GPS."));
        setRouteDiscoveryCenter(point);
        setAccuracy(Number.isFinite(point.accuracy) ? Number(point.accuracy) : null);
        return point;
    }, [lang]);

    const discoverNearbyRoutes = React.useCallback(async () => {
        if (activitySport === "treadmill") return;
        setRouteDiscoveryBusy(true);
        setRouteDiscoveryMessage(pickLegacyLocalizedText(lang, "LOCALISATION ET RECHERCHE DES PARCOURS…", "LOCATING AND SEARCHING ROUTES…", "LOCALIZANDO Y BUSCANDO RUTAS…"));
        try {
            const point = await resolveRoutePosition();
            const result = await discoverOutdoorRoutes({ lat: point.lat, lon: point.lon }, activitySport, routeDiscoveryRadiusKm);
            setDiscoveredRoutes(result.routes);
            if (result.routes.length) {
                setRouteDiscoveryMessage(pickLegacyLocalizedText(lang, `${result.routes.length} parcours OpenStreetMap trouvés dans un rayon de ${result.radiusKm} km.`, `${result.routes.length} OpenStreetMap routes found within ${result.radiusKm} km.`, `${result.routes.length} rutas de OpenStreetMap encontradas en ${result.radiusKm} km.`));
                if (!selectedRouteId) selectRoute(result.routes[0]);
            } else {
                setRouteDiscoveryMessage(pickLegacyLocalizedText(lang, `Aucun itinéraire balisé trouvé dans ${result.radiusKm} km. Essaie un rayon plus grand ou importe un GPX.`, `No mapped route found within ${result.radiusKm} km. Try a larger radius or import a GPX.`, `No se encontró ninguna ruta señalizada en ${result.radiusKm} km. Prueba un radio mayor o importa un GPX.`));
            }
        } catch (error: any) {
            setRouteDiscoveryMessage(error?.message || pickLegacyLocalizedText(lang, "Recherche cartographique indisponible.", "Map route search unavailable.", "Búsqueda cartográfica no disponible."));
        } finally {
            setRouteDiscoveryBusy(false);
        }
    }, [activitySport, lang, resolveRoutePosition, routeDiscoveryRadiusKm, selectRoute, selectedRouteId]);
    const generateRoutes = React.useCallback(async () => {
        if (activitySport === "treadmill") return;
        setRouteGenerationBusy(true);
        setRouteGenerationMessage(pickLegacyLocalizedText(lang, "ANALYSE DES CHEMINS ET CRÉATION DE 3 PARCOURS…", "ANALYSING PATHS AND BUILDING 3 ROUTES…", "ANALIZANDO CAMINOS Y CREANDO 3 RUTAS…"));
        try {
            const point = await resolveRoutePosition();
            const result = await generateOutdoorRoutes({
                center: { lat: point.lat, lon: point.lon },
                sport: activitySport,
                distanceKm: routeGenerationDistanceKm,
                profile: routeGenerationProfile,
                shape: routeGenerationShape,
                count: 3,
                elevationGainMinM: routeGenerationElevationEnabled ? routeGenerationElevationMinM : null,
                elevationGainMaxM: routeGenerationElevationEnabled ? routeGenerationElevationMaxM : null,
            });
            setDiscoveredRoutes(result.routes);
            if (result.routes.length) {
                selectRoute(result.routes[0]);
                const best = result.routes[0];
                const generated = best.generation;
                const trailInfo = generated ? ` · ${generated.trailSharePct}% ${pickLegacyLocalizedText(lang, "sentiers", "trails", "senderos")}` : "";
                const elevationInfo = result.elevationTarget
                    ? result.elevationTarget.matchedCount > 0
                        ? ` · D+ ${Math.round(best.elevationGainM)} m ✓`
                        : ` · D+ ${Math.round(best.elevationGainM)} m (${pickLegacyLocalizedText(lang, "plus proche disponible", "closest available", "más cercano disponible")})`
                    : "";
                setRouteGenerationMessage(pickLegacyLocalizedText(lang, `${result.routes.length} parcours générés autour de toi. Le meilleur fait ${(best.distanceM / 1000).toFixed(1)} km${trailInfo}${elevationInfo}.`, `${result.routes.length} routes generated around you. Best match is ${(best.distanceM / 1000).toFixed(1)} km${trailInfo}${elevationInfo}.`, `${result.routes.length} rutas generadas a tu alrededor. La mejor hace ${(best.distanceM / 1000).toFixed(1)} km${trailInfo}${elevationInfo}.`));
            }
        } catch (error: any) {
            setRouteGenerationMessage(error?.message || pickLegacyLocalizedText(lang, "Impossible de générer un parcours ici.", "Unable to generate a route here.", "No se pudo generar una ruta aquí."));
        } finally {
            setRouteGenerationBusy(false);
        }
    }, [activitySport, lang, resolveRoutePosition, routeGenerationDistanceKm, routeGenerationElevationEnabled, routeGenerationElevationMaxM, routeGenerationElevationMinM, routeGenerationProfile, routeGenerationShape, selectRoute]);
    const applyTerrainRecommendation = React.useCallback(() => {
        if (!selectedTerrainAdvice) return;
        selectManualPreset(selectedTerrainAdvice.presetId);
        setSetupTab(["easy", "tempo", "intervals", "long", "hills", "recovery"].includes(selectedTerrainAdvice.presetId) ? "training" : "goal");
    }, [selectManualPreset, selectedTerrainAdvice]);
    const toggleFavoriteRoute = React.useCallback((route: RunningRouteTemplate) => {
        const saved = savedRoutes.find((item) => item.id === route.id || (!!route.externalId && item.externalId === route.externalId) || (!!route.sourceActivityId && item.sourceActivityId === route.sourceActivityId));
        if (saved) {
            const next = removeRunningRoute(saved.id);
            setSavedRoutes(next);
            if (selectedRouteId === saved.id && route.source === "activity") setSelectedRouteId(null);
            return;
        }
        const source = route.sourceActivityId ? activities.find((activity) => activity.id === route.sourceActivityId) : null;
        const favorite = source
            ? favoriteRouteFromActivity(source, route.name)
            : { ...route, createdAt: Date.now() };
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
            setSetupTab("advanced");
        } else {
            setSelectedPresetId(session.presetId);
            setSetupTab(session.presetId === "pacer" ? "advanced" : ["easy", "tempo", "intervals", "long", "hills", "recovery"].includes(session.presetId) ? "training" : "goal");
        }
        setView("setup");
    }, []);
    const infoDot = <InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.6 }}>{copy.info}<br /><br /><b>{copy.local}</b></div>}/>;
    if (countdown != null)
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH, minHeight: "78vh", display: "grid", placeItems: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: textSoft, fontWeight: 1000, letterSpacing: 2 }}>{copy.countdown}</div><div style={{ marginTop: 8, fontSize: "clamp(88px,28vw,150px)", lineHeight: 1, fontWeight: 1000, color: accent, textShadow: `0 0 34px ${accent}77` }}>{countdown === 0 ? copy.go : countdown}</div><div style={{ marginTop: 14, fontWeight: 900 }}>{presetLabel(effectivePreset, lang)}</div></div></div>;
    if (view === "record") {
        const deltaGood = paceDelta != null && paceDelta <= 0;
        const gpsFixVerified = activitySport === "treadmill" || (points.length > 0 && gpsMessage !== copy.gpsDenied && gpsMessage !== copy.gpsLost && gpsMessage !== copy.gpsSearching);
        const liveHr = sensorSnapshot.heartRateBpm ? `${sensorSnapshot.heartRateBpm} bpm` : "—";
        const liveCadence = sensorSnapshot.cadenceSpm ? `${sensorSnapshot.cadenceSpm} spm` : "—";
        const treadmillSpeed = (sensorSnapshot.treadmillSpeedMps ?? sensorSnapshot.sensorSpeedMps ?? manualTreadmillSpeedKmh / 3.6) * 3.6;
        const treadmillIncline = sensorSnapshot.inclinePercent ?? manualTreadmillIncline;
        const routeRemainingM = selectedRoute ? Math.max(0, selectedRoute.distanceM - liveDistance) : null;
        const liveTitle = livePage === "route" ? (activitySport === "treadmill" ? pickLegacyLocalizedText(lang, "SÉANCE LIVE", "LIVE WORKOUT", "SESIÓN LIVE") : pickLegacyLocalizedText(lang, "NAVIGATION", "NAVIGATION", "NAVEGACIÓN")) : livePage === "splits" ? pickLegacyLocalizedText(lang, "SPLITS & TOURS", "SPLITS & LAPS", "SPLITS Y VUELTAS") : livePage === "details" ? pickLegacyLocalizedText(lang, "DÉTAILS LIVE", "LIVE DETAILS", "DETALLES LIVE") : outdoorSportLabel(activitySport, lang).toUpperCase();
        return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH, paddingBottom: 190 }}>
      <PageHeader title={liveTitle} subtitle={`${presetLabel(effectivePreset, lang)} · ${paused ? copy.pause : copy.recordSub}`} left={<BackDot onClick={() => livePage === "cockpit" ? cancelRun() : setLivePage("cockpit")}/>} right={infoDot}/>
      {splitToast ? <div style={{ position: "fixed", top: 88, left: "50%", transform: "translateX(-50%)", zIndex: 90, width: "min(92vw,440px)", padding: "10px 14px", borderRadius: 999, textAlign: "center", background: "rgba(5,8,13,.96)", border: `1px solid ${accent}66`, color: accent, fontWeight: 1000, fontSize: 11, boxShadow: "0 12px 36px rgba(0,0,0,.55)", backdropFilter: "blur(14px)" }}>{splitToast}</div> : null}

      {livePage === "cockpit" ? <>
        <RunningSurface accent={accent} active padding={14}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}><StatusPill text={paused ? copy.pause : (gpsFixVerified ? copy.verified : (gpsMessage || copy.gpsSearching))} good={!paused && gpsFixVerified} accent={accent}/>{selectedRoute ? <StatusPill text={pickLegacyLocalizedText(lang, "PARCOURS ACTIF", "ROUTE ACTIVE", "RUTA ACTIVA")} good accent={accent}/> : null}</div>
          <div style={{ marginTop: 12, textAlign: "center" }}><div style={{ fontSize: 8.5, color: textSoft, fontWeight: 1000, letterSpacing: 1 }}>{copy.distance}</div><div style={{ fontSize: "clamp(52px,15vw,78px)", lineHeight: 1.02, fontWeight: 1000, color: accent, textShadow: `0 0 28px ${accent}30` }}>{(liveDistance / 1000).toFixed(2)}<small style={{ fontSize: 16, marginLeft: 5 }}>KM</small></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 12 }}>
            <HeroMetric label={copy.time} value={formatDuration(elapsedMs)}/>
            {activitySport === "treadmill" ? <HeroMetric label={copy.speed} value={`${treadmillSpeed.toFixed(1)} km/h`}/> : ["trail","hiking","walking","nordic-walking"].includes(activitySport) ? <HeroMetric label={copy.elevation} value={`+${Math.round(liveElevation)} m`}/> : <HeroMetric label={copy.livePace} value={`${formatPace(rollingPace)}/km`}/>} 
            {activitySport === "treadmill" ? <HeroMetric label={pickLegacyLocalizedText(lang, "INCLINAISON", "INCLINE", "INCLINACIÓN")} value={`${treadmillIncline.toFixed(1)}%`}/> : <HeroMetric label={copy.avgPace} value={`${formatPace(livePace)}/km`}/>} 
            {sensorSnapshot.heartRateBpm ? <HeroMetric label={pickLegacyLocalizedText(lang, "CARDIO", "HEART RATE", "CARDIO")} value={liveHr}/> : routeRemainingM != null ? <HeroMetric label={pickLegacyLocalizedText(lang, "RESTANT", "REMAINING", "RESTANTE")} value={formatDistance(routeRemainingM)}/> : <HeroMetric label={copy.speed} value={`${liveSpeed.toFixed(1)} km/h`}/>} 
          </div>
          {progress != null ? <div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.7, color: textSoft, fontWeight: 900 }}><span>{copy.target}</span><span style={{ color: targetReached ? "#71ff9a" : accent }}>{targetReached ? copy.targetReached : `${Math.round(progress)}%`}</span></div><Progress value={progress} accent={targetReached ? "#71ff9a" : accent}/></div> : null}
          {phase ? <div style={{ marginTop: 11, padding: "9px 10px", borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 8.3, color: textSoft }}><b style={{ color: phase.step.tone === "hard" ? "#ff8a67" : accent }}>{phase.label}</b><span>#{phase.index + 1}/{effectivePreset.steps?.length || 1}</span></div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>{formatDuration(phase.remainingMs)}</div><Progress value={phase.progress} accent={phase.step.tone === "hard" ? "#ff8a67" : accent}/></div> : null}
        </RunningSurface>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {activitySport !== "treadmill" ? <RunningHubCard title={selectedRoute ? pickLegacyLocalizedText(lang, "NAVIGATION", "NAVIGATION", "NAVEGACIÓN") : copy.route} subtitle={selectedRoute ? selectedRoute.name : pickLegacyLocalizedText(lang, "Carte et position en direct", "Live map and position", "Mapa y posición en directo")} icon={<RunningGlyph name="route-guide" size={19}/>} accent={accent} onClick={() => setLivePage("route")}/> : null}
          <RunningHubCard title={pickLegacyLocalizedText(lang, "SPLITS & TOURS", "SPLITS & LAPS", "SPLITS Y VUELTAS")} subtitle={liveSplits.length ? `${liveSplits.length} ${pickLegacyLocalizedText(lang, "splits enregistrés", "splits recorded", "splits registrados")}` : pickLegacyLocalizedText(lang, "Chronos intermédiaires et tours manuels", "Intermediate times and manual laps", "Tiempos intermedios y vueltas manuales")} icon={<RunningGlyph name="history" size={19}/>} accent={accent} onClick={() => setLivePage("splits")} badge={liveSplits.length || undefined}/>
          <RunningHubCard title={pickLegacyLocalizedText(lang, "DÉTAILS LIVE", "LIVE DETAILS", "DETALLES LIVE")} subtitle={sensorSnapshot.heartRateBpm || sensorSnapshot.cadenceSpm ? `${liveHr} · ${liveCadence}` : pickLegacyLocalizedText(lang, "Allure, objectif, Ghost et capteurs", "Pace, target, Ghost and sensors", "Ritmo, objetivo, Ghost y sensores")} icon={<RunningGlyph name="chart" size={19}/>} accent={accent} onClick={() => setLivePage("details")}/>
        </div>
      </> : null}

      {livePage === "route" ? <>
        {selectedRoute && activitySport !== "treadmill" ? <OutdoorRouteNavigationPanel route={selectedRoute} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft} mode="live" liveDistanceM={liveDistance} elapsedMs={elapsedMs} currentPoint={points[points.length - 1] || null} previousPoint={points[points.length - 2] || null} liveElevationGainM={liveElevation} extras={routeExtras} reroute={liveOutdoorReroute} rerouteBusy={liveOutdoorRerouteBusy} rerouteError={liveOutdoorRerouteError} onOpenMap={() => setLiveRouteMapFullscreen(true)}/> : null}
        <RunningSurface accent={accent} active style={{ marginTop: selectedRoute ? 8 : 0 }}><RouteMap points={points} accent={accent} waiting={copy.waiting} showRouteNetwork={activitySport !== "treadmill"}/></RunningSurface>
      </> : null}

      {livePage === "splits" ? <>
        <RunningSurface accent={accent} active><div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.splits}</div>{liveSplits.length ? <SplitTable splits={liveSplits} accent={accent}/> : <div style={{ padding: 18, textAlign: "center", color: textSoft, fontSize: 9 }}>{pickLegacyLocalizedText(lang, "Le premier split apparaîtra ici.", "Your first split will appear here.", "Tu primer split aparecerá aquí.")}</div>}</RunningSurface>
        {manualLaps.length ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.laps}</div><LapTable laps={manualLaps} accent={accent}/></RunningSurface> : null}
      </> : null}

      {livePage === "details" ? <>
        <RunningSurface accent={accent} active><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><MiniStat label={copy.avgPace} value={`${formatPace(livePace)}/km`} accent={accent}/><MiniStat label={copy.livePace} value={`${formatPace(rollingPace)}/km`} accent={accent}/><MiniStat label={copy.speed} value={`${liveSpeed.toFixed(1)} km/h`} accent={accent}/><MiniStat label={copy.elevation} value={`+${Math.round(liveElevation)} m`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "CARDIO", "HEART RATE", "CARDIO")} value={liveHr} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "CADENCE", "CADENCE", "CADENCIA")} value={liveCadence} accent={accent}/></div></RunningSurface>
        {targetPaceSecPerKm ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><MiniStat label={copy.targetPace} value={`${formatPace(targetPaceSecPerKm)}/km`} accent={accent}/><MiniStat label={deltaGood ? copy.ahead : copy.behind} value={formatSignedDuration(paceDelta)} accent={deltaGood ? "#71ff9a" : "#ff8a67"}/><MiniStat label={copy.projected} value={projected ? formatDuration(projected) : "—"} accent={accent}/></div></RunningSurface> : null}
        {selectedRoute && selectedRouteHasReference && ghostEnabled ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><MiniStat label={pickLegacyLocalizedText(lang, "GHOST", "GHOST", "GHOST")} value={liveGhostDelta == null ? "—" : formatDuration(Math.abs(liveGhostDelta))} accent={liveGhostDelta != null && liveGhostDelta <= 0 ? "#71ff9a" : "#ff8a67"}/><MiniStat label={liveGhostMatch?.matchedBy === "position" ? pickLegacyLocalizedText(lang, "SUR LE TRACÉ", "ON ROUTE", "EN RUTA") : copy.targetDistance} value={formatDistance(selectedRoute.distanceM)} accent={accent}/></div></RunningSurface> : null}
        {activitySport === "treadmill" ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><MiniStat label={copy.speed} value={`${treadmillSpeed.toFixed(1)} km/h`} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, "INCLINAISON", "INCLINE", "INCLINACIÓN")} value={`${treadmillIncline.toFixed(1)}%`} accent={accent}/></div></RunningSurface> : null}
      </> : null}

      {liveRouteMapFullscreen && selectedRoute && routeExtras && activitySport !== "treadmill" ? <OutdoorRouteLiveMap route={selectedRoute} track={points} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft} liveDistanceM={liveDistance} elapsedMs={elapsedMs} liveElevationGainM={liveElevation} extras={routeExtras} reroute={liveOutdoorReroute} rerouteBusy={liveOutdoorRerouteBusy} onClose={() => setLiveRouteMapFullscreen(false)}/> : null}
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
    const setupPageTitle = setupPanel === "workout" && setupTab !== "menu" ? (setupTab === "goal" ? pickLegacyLocalizedText(lang, "OBJECTIF", "GOAL", "OBJETIVO") : setupTab === "training" ? pickLegacyLocalizedText(lang, "SÉANCES", "WORKOUTS", "SESIONES") : pickLegacyLocalizedText(lang, "AVANCÉ", "ADVANCED", "AVANZADO")) : setupPanel === "route" && routePanelTab !== "menu" ? (routePanelTab === "choose" ? pickLegacyLocalizedText(lang, "CHOISIR UN PARCOURS", "CHOOSE A ROUTE", "ELEGIR UNA RUTA") : routePanelTab === "guide" ? pickLegacyLocalizedText(lang, "GUIDAGE", "GUIDANCE", "GUIADO") : pickLegacyLocalizedText(lang, "HORS-LIGNE", "OFFLINE", "SIN CONEXIÓN")) : setupPanel === "workout" ? pickLegacyLocalizedText(lang, "SÉANCE", "WORKOUT", "SESIÓN") : setupPanel === "route" ? pickLegacyLocalizedText(lang, "PARCOURS", "ROUTE", "RUTA") : setupPanel === "ready" ? pickLegacyLocalizedText(lang, "DÉPART", "START", "SALIDA") : copy.title;
    const setupPageSubtitle = setupPanel === "menu" ? copy.setupSub : `${outdoorSportLabel(activitySport, lang)} · ${presetLabel(effectivePreset, lang)}`;
    const backFromSetup = () => {
        if (setupPanel === "workout" && setupTab !== "menu") { setSetupTab("menu"); return; }
        if (setupPanel === "route" && routePanelTab !== "menu") { setRoutePanelTab("menu"); return; }
        if (setupPanel !== "menu") { setSetupPanel("menu"); return; }
        go("home");
    };
    return <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}><PageHeader title={setupPageTitle} subtitle={setupPageSubtitle} left={<BackDot onClick={backFromSetup}/>} right={infoDot}/>

    {setupPanel === "menu" ? <>
      <OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={lang} accent={accent}/>
      <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
        <RunningHubCard title={pickLegacyLocalizedText(lang, "SÉANCE", "WORKOUT", "SESIÓN")} subtitle={`${presetLabel(effectivePreset, lang)}${targetDistanceM ? ` · ${distanceLabel(targetDistanceM)}` : targetDurationMs ? ` · ${formatDuration(targetDurationMs)}` : ""}`} icon={<RunningGlyph name="step-workout" size={20}/>} accent={accent} onClick={() => { setSetupTab("menu"); setSetupPanel("workout"); }}/>
        {activitySport !== "treadmill" ? <RunningHubCard title={pickLegacyLocalizedText(lang, "PARCOURS", "ROUTE", "RUTA")} subtitle={selectedRoute ? selectedRoute.name : pickLegacyLocalizedText(lang, `${routeOptions.length} parcours disponibles`, `${routeOptions.length} routes available`, `${routeOptions.length} rutas disponibles`)} icon={<RunningGlyph name="step-route" size={20}/>} accent={accent} onClick={() => { setRoutePanelTab("menu"); setSetupPanel("route"); }} badge={selectedRoute ? "✓" : routeOptions.length || undefined}/> : null}
        <RunningHubCard title={pickLegacyLocalizedText(lang, "DÉPART", "START", "SALIDA")} subtitle={activitySport === "treadmill" ? treadmillSourceLabel : `${gpsMessage || copy.gpsUnknown}${connectedDeviceCount ? ` · ${connectedDeviceCount} capteur${connectedDeviceCount > 1 ? "s" : ""}` : ""}`} icon={<RunningGlyph name="step-ready" size={20}/>} accent={accent} onClick={() => setSetupPanel("ready")}/>
      </div>
    </> : null}

    <div style={{ display: setupPanel === "workout" ? "block" : "none" }}>
    {setupTab === "menu" ? <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
      <RunningHubCard title={pickLegacyLocalizedText(lang, "OBJECTIF SIMPLE", "SIMPLE GOAL", "OBJETIVO SIMPLE")} subtitle={pickLegacyLocalizedText(lang, "Libre, distance ou durée. Le plus rapide pour partir.", "Free, distance or duration. The fastest way to start.", "Libre, distancia o duración. La forma más rápida de salir.")} icon={<RunningGlyph name="goal" size={19}/>} accent={accent} onClick={() => { setSetupTab("goal"); selectManualPreset(`goal-${simpleGoalMode}`); }}/>
      {trainingPresetIds.length ? <RunningHubCard title={pickLegacyLocalizedText(lang, "SÉANCE STRUCTURÉE", "STRUCTURED WORKOUT", "SESIÓN ESTRUCTURADA")} subtitle={pickLegacyLocalizedText(lang, "Uniquement les séances utiles à cette discipline.", "Only workouts useful for this discipline.", "Solo sesiones útiles para esta disciplina.")} icon={<RunningGlyph name="training" size={19}/>} accent={accent} onClick={() => setSetupTab("training")}/> : null}
      {(sportProfile.supportsPacer || sportProfile.supportsIntervals) ? <RunningHubCard title={pickLegacyLocalizedText(lang, "AVANCÉ", "ADVANCED", "AVANZADO")} subtitle={pickLegacyLocalizedText(lang, "Pacer et séance personnalisée, seulement si nécessaire.", "Pacer and custom workout, only when needed.", "Pacer y sesión personalizada, solo si hace falta.")} icon={<RunningGlyph name="advanced" size={19}/>} accent={accent} onClick={() => setSetupTab("advanced")}/> : null}
    </div> : null}

    {setupTab === "goal" ? <div style={{ marginTop: 10 }}>
      <Section title={pickLegacyLocalizedText(lang, "QUE VEUX-TU FAIRE ?", "WHAT DO YOU WANT TO DO?", "¿QUÉ QUIERES HACER?")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          <GoalModeButton active={simpleGoalMode === "free"} accent={accent} icon={<RunningGlyph name="free" size={18} />} label={pickLegacyLocalizedText(lang, "LIBRE", "FREE", "LIBRE")} onClick={() => { setSimpleGoalMode("free"); selectManualPreset("goal-free"); }}/>
          <GoalModeButton active={simpleGoalMode === "distance"} accent={accent} icon={<RunningGlyph name="distance" size={18} />} label={pickLegacyLocalizedText(lang, "DISTANCE", "DISTANCE", "DISTANCIA")} onClick={() => { setSimpleGoalMode("distance"); selectManualPreset("goal-distance"); }}/>
          <GoalModeButton active={simpleGoalMode === "duration"} accent={accent} icon={<RunningGlyph name="time" size={18} />} label={pickLegacyLocalizedText(lang, "DURÉE", "DURATION", "DURACIÓN")} onClick={() => { setSimpleGoalMode("duration"); selectManualPreset("goal-duration"); }}/>
        </div>

        {simpleGoalMode === "free" ? <div style={{ marginTop: 10, padding: "10px 11px", borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", color: textSoft, fontSize: 9.1, lineHeight: 1.45 }}>{pickLegacyLocalizedText(lang, activitySport === "hiking" ? "Pars sans objectif imposé. Le temps, la distance, le D+ et le parcours restent suivis." : activitySport === "trail" ? "Pars librement. Allure, D+, parcours et navigation restent suivis." : activitySport === "walking" || activitySport === "nordic-walking" ? "Pars sans contrainte : durée, distance et rythme restent enregistrés." : activitySport === "treadmill" ? "Démarre sans cible. Tu arrêtes la séance quand tu veux." : "Démarre sans cible. GPS, allure et splits restent enregistrés.", activitySport === "hiking" ? "Start with no imposed goal. Time, distance, elevation and route are still tracked." : activitySport === "trail" ? "Go freely. Pace, elevation, route and navigation are still tracked." : activitySport === "walking" || activitySport === "nordic-walking" ? "Start with no constraint: duration, distance and pace are recorded." : activitySport === "treadmill" ? "Start with no target and stop whenever you want." : "Start with no target. GPS, pace and splits are still recorded.", "Empieza sin objetivo impuesto. Las métricas útiles siguen registrándose.")}</div> : null}

        {simpleGoalMode === "distance" ? <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 8.5, color: textSoft, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "DISTANCES UTILES", "USEFUL DISTANCES", "DISTANCIAS ÚTILES")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>{goalDistanceOptions.map((km) => <Choice key={km} active={Math.abs(simpleDistanceKm - km) < .01} accent={accent} onClick={() => { setSimpleDistanceKm(km); selectManualPreset("goal-distance"); }}>{km % 1 ? km.toFixed(1) : km} km</Choice>)}</div>
          <div style={{ maxWidth: 260, marginTop: 9 }}><TreadmillAdjuster label={pickLegacyLocalizedText(lang, "AJUSTER", "ADJUST", "AJUSTAR")} value={simpleDistanceKm} suffix="km" min={1} max={activitySport === "trail" || activitySport === "hiking" ? 100 : 50} step={1} onChange={(value) => { setSimpleDistanceKm(value); selectManualPreset("goal-distance"); }}/></div>
        </div> : null}

        {simpleGoalMode === "duration" ? <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 8.5, color: textSoft, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "DURÉES UTILES", "USEFUL DURATIONS", "DURACIONES ÚTILES")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>{goalDurationOptions.map((minutes) => <Choice key={minutes} active={simpleDurationMin === minutes} accent={accent} onClick={() => { setSimpleDurationMin(minutes); selectManualPreset("goal-duration"); }}>{minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`}</Choice>)}</div>
          <div style={{ maxWidth: 260, marginTop: 9 }}><TreadmillAdjuster label={pickLegacyLocalizedText(lang, "AJUSTER", "ADJUST", "AJUSTAR")} value={simpleDurationMin} suffix="min" min={10} max={activitySport === "hiking" || activitySport === "trail" ? 480 : 180} step={5} onChange={(value) => { setSimpleDurationMin(value); selectManualPreset("goal-duration"); }}/></div>
        </div> : null}
      </Section>
    </div> : null}

    {setupTab === "training" && trainingPresetIds.length ? <div style={{ marginTop: 10 }}>
      <Section title={pickLegacyLocalizedText(lang, activitySport === "trail" ? "SÉANCES TRAIL" : activitySport === "nordic-walking" ? "SÉANCES MARCHE NORDIQUE" : activitySport === "treadmill" ? "SÉANCES TAPIS" : "SÉANCES RUNNING", "WORKOUTS", "SESIONES")}>
        <div style={{ display: "grid", gap: 8 }}>{PRESETS.filter((p) => trainingPresetIds.includes(p.id)).map((p) => <TrainingCard key={p.id} preset={adaptPresetForSport(p, activitySport)} lang={lang} selected={selectedPresetId === p.id} accent={accent} onClick={() => selectManualPreset(p.id)}/>)}</div>
      </Section>
    </div> : null}

    {setupTab === "advanced" ? <div style={{ marginTop: 10 }}>
      <Section title={pickLegacyLocalizedText(lang, "OPTIONS AVANCÉES", "ADVANCED OPTIONS", "OPCIONES AVANZADAS")}>
        <div style={{ color: textSoft, fontSize: 9, lineHeight: 1.45, marginBottom: 9 }}>{pickLegacyLocalizedText(lang, "Ces réglages restent ici pour ne pas encombrer la préparation normale.", "These controls stay here so the normal setup remains simple.", "Estos ajustes se quedan aquí para no recargar la preparación normal.")}</div>
        <div style={{ display: "grid", gridTemplateColumns: sportProfile.supportsPacer && sportProfile.supportsIntervals ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 7 }}>
          {sportProfile.supportsPacer ? <GoalModeButton active={selectedPresetId === "pacer"} accent={accent} icon={<RunningGlyph name="pace" size={18} />} label="PACER" onClick={() => selectManualPreset("pacer")}/> : null}
          {sportProfile.supportsIntervals ? <GoalModeButton active={selectedPresetId === "custom"} accent={accent} icon={<RunningGlyph name="advanced" size={18} />} label={pickLegacyLocalizedText(lang, "INTERVALLES SUR MESURE", "CUSTOM INTERVALS", "INTERVALOS A MEDIDA")} onClick={() => selectManualPreset("custom")}/> : null}
        </div>

        {selectedPresetId === "pacer" && sportProfile.supportsPacer ? <div style={{ marginTop: 12 }}><div style={{ fontSize: 8.6, color: textSoft, fontWeight: 1000 }}>{copy.targetDistance}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{PACER_DISTANCES.map((m) => <Choice key={m} active={pacerDistanceM === m} accent={accent} onClick={() => { setPacerDistanceM(m); selectManualPreset("pacer"); }}>{distanceLabel(m)}</Choice>)}</div><div style={{ marginTop: 10, fontSize: 8.6, color: textSoft, fontWeight: 1000 }}>{copy.targetPace}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{PACE_OPTIONS.map((pace) => <Choice key={pace} active={pacerPace === pace} accent={accent} onClick={() => { setPacerPace(pace); selectManualPreset("pacer"); }}>{formatPace(pace)}/km</Choice>)}</div><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><MiniStat label={copy.targetDistance} value={distanceLabel(pacerDistanceM)} accent={accent}/><MiniStat label={copy.targetPace} value={`${formatPace(pacerPace)}/km`} accent={accent}/><MiniStat label={copy.expected} value={formatDuration(pacerPace * pacerDistanceM)} accent={accent}/></div></div> : null}

        {selectedPresetId === "custom" && sportProfile.supportsIntervals ? <div style={{ marginTop: 12 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Adjuster label={pickLegacyLocalizedText(lang, "ÉCHAUFFEMENT", "WARM UP", "CALENTAMIENTO")} value={customWorkout.warmupMin} suffix="min" min={0} max={20} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, warmupMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RÉPÉTITIONS", "REPEATS", "REPETICIONES")} value={customWorkout.reps} suffix="×" min={2} max={12} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, reps: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "EFFORT", "WORK", "ESFUERZO")} value={customWorkout.workMin} suffix="min" min={1} max={10} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, workMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RÉCUPÉRATION", "RECOVERY", "RECUPERACIÓN")} value={customWorkout.recoveryMin} suffix="min" min={0} max={6} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, recoveryMin: value }))}/><Adjuster label={pickLegacyLocalizedText(lang, "RETOUR AU CALME", "COOL DOWN", "VUELTA A LA CALMA")} value={customWorkout.cooldownMin} suffix="min" min={0} max={20} onChange={(value) => setCustomWorkout((prev) => ({ ...prev, cooldownMin: value }))}/><MiniStat label={pickLegacyLocalizedText(lang, "DURÉE TOTALE", "TOTAL TIME", "DURACIÓN TOTAL")} value={formatDuration(customWorkoutPreset(customWorkout).targetDurationMs || 0)} accent={accent}/></div></div> : null}
      </Section>
    </div> : null}

    </div>

    {setupPanel === "workout" && setupTab !== "menu" ? <RunningSurface accent={accent} active style={{ marginTop: 10 }}><div style={{ fontSize: 9.5, color: textSoft, fontWeight: 1000 }}>{copy.selected}</div><div style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center", marginTop: 8 }}><div style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}30`, color: accent }}><PresetGlyph preset={effectivePreset} size={19}/></div><div><div style={{ fontWeight: 1000, color: accent }}>{presetLabel(effectivePreset, lang)}</div><div style={{ color: textSoft, fontSize: 8.8, marginTop: 3, lineHeight: 1.35 }}>{presetSub(effectivePreset, lang)}</div></div>{targetDistanceM ? <b style={{ fontSize: 10 }}>{distanceLabel(targetDistanceM)}</b> : targetDurationMs ? <b style={{ fontSize: 10 }}>{formatDuration(targetDurationMs)}</b> : null}</div></RunningSurface> : null}

    <div style={{ display: setupPanel === "route" ? "block" : "none" }}>
      {routePanelTab === "menu" ? <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
        <RunningHubCard title={pickLegacyLocalizedText(lang, "CHOISIR UN PARCOURS", "CHOOSE A ROUTE", "ELEGIR UNA RUTA")} subtitle={selectedRoute ? selectedRoute.name : pickLegacyLocalizedText(lang, "Bibliothèque, favoris et découverte autour de toi.", "Library, favorites and discovery around you.", "Biblioteca, favoritos y descubrimiento cerca de ti.")} icon={<RunningGlyph name="route-choose" size={19}/>} accent={accent} onClick={() => setRoutePanelTab("choose")} badge={routeOptions.length || undefined}/>
        <RunningHubCard title={pickLegacyLocalizedText(lang, "GUIDAGE", "GUIDANCE", "GUIADO")} subtitle={selectedRoute ? pickLegacyLocalizedText(lang, "Navigation, checkpoints et préparation longue distance.", "Navigation, checkpoints and long-distance preparation.", "Navegación, checkpoints y preparación larga distancia.") : pickLegacyLocalizedText(lang, "Choisis d’abord un parcours.", "Choose a route first.", "Elige primero una ruta.")} icon={<RunningGlyph name="route-guide" size={19}/>} accent={accent} onClick={() => selectedRoute && setRoutePanelTab("guide")} disabled={!selectedRoute}/>
        <RunningHubCard title={pickLegacyLocalizedText(lang, "HORS-LIGNE", "OFFLINE", "SIN CONEXIÓN")} subtitle={selectedRoute ? pickLegacyLocalizedText(lang, "Prépare la trace et le roadbook pour une sortie sans réseau.", "Prepare route and roadbook for no-network use.", "Prepara la ruta y el roadbook para usar sin red.") : pickLegacyLocalizedText(lang, "Choisis d’abord un parcours.", "Choose a route first.", "Elige primero una ruta.")} icon={<RunningGlyph name="route-offline" size={19}/>} accent={accent} onClick={() => selectedRoute && setRoutePanelTab("offline")} disabled={!selectedRoute}/>
      </div> : null}

      {routePanelTab === "choose" ? <>
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <RunningSurface accent={accent} active>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ color: accent, fontSize: 9.5, fontWeight: 1000, letterSpacing: .6 }}>{pickLegacyLocalizedText(lang, "EXPLORER LES PARCOURS", "EXPLORE ROUTES", "EXPLORAR RUTAS")}</div>
                  <div style={{ marginTop: 3, color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Une interface plus visuelle : une grande carte, des blocs flottants et des onglets pour éviter de tout mélanger au même endroit.", "A more visual route UI: one large map, floating cards and tabs so everything is not mixed together.", "Una interfaz más visual: un gran mapa, bloques flotantes y pestañas para no mezclarlo todo en el mismo lugar.")}</div>
                </div>
                <div style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${accent}35`, background: `${accent}10`, color: accent, fontSize: 8, fontWeight: 1000 }}>{routeOptions.length} {pickLegacyLocalizedText(lang, "parcours", "routes", "rutas")}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
                {([['showcase', pickLegacyLocalizedText(lang, 'VITRINE', 'SHOWCASE', 'VITRINA')], ['discover', pickLegacyLocalizedText(lang, 'AUTOUR DE MOI', 'AROUND ME', 'CERCA DE MÍ')], ['generate', pickLegacyLocalizedText(lang, 'GÉNÉRER', 'GENERATE', 'GENERAR')], ['library', pickLegacyLocalizedText(lang, 'BIBLIOTHÈQUE', 'LIBRARY', 'BIBLIOTECA')]] as Array<[RouteChooseMode, string]>).map(([mode, label]) => <button key={mode} className="btn" onClick={() => setRouteChooseMode(mode)} style={{ minHeight: 34, padding: "4px 4px", fontSize: 7.3, fontWeight: 1000, color: routeChooseMode === mode ? accent : undefined, borderColor: routeChooseMode === mode ? `${accent}66` : undefined, background: routeChooseMode === mode ? `${accent}10` : undefined }}>{label}</button>)}
              </div>

              {routeChooseMode === "showcase" ? <div style={{ padding: 12, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.05),rgba(7,10,15,.84))", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontSize: 8.9, fontWeight: 1000, color: accent }}>{selectedRoute ? pickLegacyLocalizedText(lang, "PARCOURS MIS EN AVANT", "FEATURED ROUTE", "RUTA DESTACADA") : pickLegacyLocalizedText(lang, "PRÊT À AFFICHER TES PARCOURS", "READY TO SHOW YOUR ROUTES", "LISTO PARA MOSTRAR TUS RUTAS")}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.1, lineHeight: 1.45 }}>{selectedRoute ? pickLegacyLocalizedText(lang, "La grande carte sert maintenant de vitrine principale. Choisis un parcours dans le carrousel, puis navigue avec les onglets Détails, Performance, Photos et Communauté.", "The large map is now the main showcase. Pick a route in the carousel, then switch between Details, Performance, Photos and Community.", "El gran mapa es ahora la vitrina principal. Elige una ruta en el carrusel y luego cambia entre Detalles, Rendimiento, Fotos y Comunidad.") : pickLegacyLocalizedText(lang, "Commence par découvrir ou générer des parcours. Dès qu’un tracé est disponible, il apparaît ici dans une grande carte immersive.", "Start by discovering or generating routes. As soon as one route is available, it appears here inside a large immersive map.", "Empieza descubriendo o generando rutas. En cuanto haya un trazado disponible, aparecerá aquí en un gran mapa inmersivo.")}</div>
              </div> : null}

              {routeChooseMode === "discover" && activitySport !== "treadmill" ? <div style={{ padding: 12, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.05),rgba(7,10,15,.84))", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ color: accent, fontSize: 9.1, fontWeight: 1000, letterSpacing: .5 }}>{pickLegacyLocalizedText(lang, "PARCOURS AUTOUR DE MOI", "ROUTES AROUND ME", "RUTAS CERCA DE MÍ")}</div>
                    <div style={{ marginTop: 3, color: textSoft, fontSize: 8, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Recherche les itinéraires balisés OpenStreetMap autour de ta position, sans remplir tout l’écran de paramètres.", "Find OpenStreetMap mapped routes around your current position without filling the whole screen with controls.", "Busca rutas señalizadas de OpenStreetMap cerca de tu posición sin llenar toda la pantalla de controles.")}</div>
                  </div>
                  <RunningGlyph name="route-choose" size={20}/>
                </div>
                <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>{[5,10,20].map((radius) => <button key={radius} className="btn" onClick={() => setRouteDiscoveryRadiusKm(radius)} style={{ minHeight: 31, padding: "4px 6px", color: routeDiscoveryRadiusKm === radius ? accent : undefined, borderColor: routeDiscoveryRadiusKm === radius ? `${accent}66` : undefined, fontSize: 8.1, fontWeight: 1000 }}>{radius} KM</button>)}</div>
                <button className="btn" disabled={routeDiscoveryBusy} onClick={() => void discoverNearbyRoutes()} style={{ width: "100%", minHeight: 40, marginTop: 8, color: accent, borderColor: `${accent}66`, fontSize: 8.8, fontWeight: 1000 }}>{routeDiscoveryBusy ? pickLegacyLocalizedText(lang, "RECHERCHE…", "SEARCHING…", "BUSCANDO…") : pickLegacyLocalizedText(lang, "DÉCOUVRIR LES PARCOURS", "DISCOVER ROUTES", "DESCUBRIR RUTAS")}</button>
                {routeDiscoveryMessage ? <div style={{ marginTop: 7, color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{routeDiscoveryMessage}</div> : null}
              </div> : null}

              {routeChooseMode === "generate" && activitySport !== "treadmill" ? <div style={{ padding: 12, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.05),rgba(7,10,15,.84))", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ color: accent, fontSize: 9.1, fontWeight: 1000, letterSpacing: .5 }}>{pickLegacyLocalizedText(lang, "GÉNÉRER MON PARCOURS", "GENERATE MY ROUTE", "GENERAR MI RUTA")}</div>
                    <div style={{ marginTop: 3, color: textSoft, fontSize: 8, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Distance, forme, terrain, D+ : le moteur propose maintenant trois parcours dans une logique beaucoup plus visuelle ensuite.", "Distance, shape, terrain, elevation gain: the engine now returns three routes that feed a more visual browsing experience afterwards.", "Distancia, forma, terreno, desnivel: el motor devuelve ahora tres rutas que alimentan después una experiencia mucho más visual.")}</div>
                  </div>
                  <RunningGlyph name="route-guide" size={20}/>
                </div>
                <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>{[5,10,15,20].map((distance) => <button key={distance} className="btn" onClick={() => setRouteGenerationDistanceKm(distance)} style={{ minHeight: 31, padding: "4px 5px", color: routeGenerationDistanceKm === distance ? accent : undefined, borderColor: routeGenerationDistanceKm === distance ? `${accent}66` : undefined, fontSize: 8, fontWeight: 1000 }}>{distance} KM</button>)}</div>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{(["loop","out-back"] as OutdoorRouteGenerationShape[]).map((shape) => <button key={shape} className="btn" onClick={() => setRouteGenerationShape(shape)} style={{ minHeight: 33, padding: "4px 6px", color: routeGenerationShape === shape ? accent : undefined, borderColor: routeGenerationShape === shape ? `${accent}66` : undefined, fontSize: 7.8, fontWeight: 1000 }}>{shape === "loop" ? pickLegacyLocalizedText(lang, "↻ BOUCLE", "↻ LOOP", "↻ BUCLE") : pickLegacyLocalizedText(lang, "↔ ALLER-RETOUR", "↔ OUT & BACK", "↔ IDA Y VUELTA")}</button>)}</div>
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>{(["balanced","trails","easy"] as OutdoorRouteGenerationProfile[]).map((profile) => <button key={profile} className="btn" onClick={() => setRouteGenerationProfile(profile)} style={{ minHeight: 33, padding: "4px 5px", color: routeGenerationProfile === profile ? accent : undefined, borderColor: routeGenerationProfile === profile ? `${accent}66` : undefined, fontSize: 7.4, fontWeight: 1000 }}>{profile === "trails" ? pickLegacyLocalizedText(lang, "🥾 SENTIERS", "🥾 TRAILS", "🥾 SENDEROS") : profile === "easy" ? pickLegacyLocalizedText(lang, "◌ FACILE", "◌ EASY", "◌ FÁCIL") : pickLegacyLocalizedText(lang, "◎ ÉQUILIBRÉ", "◎ BALANCED", "◎ EQUILIBRADO")}</button>)}</div>
                <div style={{ marginTop: 8, padding: 9, borderRadius: 13, border: `1px solid ${routeGenerationElevationEnabled ? `${accent}55` : "rgba(255,255,255,.08)"}`, background: routeGenerationElevationEnabled ? `${accent}08` : "rgba(255,255,255,.02)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div><div style={{ fontSize: 8.4, fontWeight: 1000, color: routeGenerationElevationEnabled ? accent : undefined }}>⛰️ {pickLegacyLocalizedText(lang, "CIBLER LE DÉNIVELÉ POSITIF", "TARGET ELEVATION GAIN", "OBJETIVO DE DESNIVEL POSITIVO")}</div><div style={{ marginTop: 2, fontSize: 7.5, color: textSoft, lineHeight: 1.35 }}>{pickLegacyLocalizedText(lang, "Le moteur favorise les candidats compris dans la plage demandée.", "The engine prioritizes candidates inside your requested range.", "El motor prioriza las rutas candidatas dentro del rango solicitado.")}</div></div><button className="btn" onClick={() => setRouteGenerationElevationEnabled((value) => !value)} style={{ minWidth: 54, minHeight: 32, color: routeGenerationElevationEnabled ? accent : undefined, borderColor: routeGenerationElevationEnabled ? `${accent}66` : undefined, fontSize: 8, fontWeight: 1000 }}>{routeGenerationElevationEnabled ? "ON" : "OFF"}</button></div>
                  {routeGenerationElevationEnabled ? <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>{([[0,150],[150,350],[350,650],[650,1000]] as Array<[number, number]>).map(([min, max]) => <button key={`${min}-${max}`} className="btn" onClick={() => { setRouteGenerationElevationMinM(min); setRouteGenerationElevationMaxM(max); }} style={{ minHeight: 31, padding: "4px 3px", fontSize: 7.2, fontWeight: 1000, color: routeGenerationElevationMinM === min && routeGenerationElevationMaxM === max ? accent : undefined, borderColor: routeGenerationElevationMinM === min && routeGenerationElevationMaxM === max ? `${accent}66` : undefined }}>+{min}–{max} m</button>)}</div> : null}
                </div>
                <button className="btn" disabled={routeGenerationBusy} onClick={() => void generateRoutes()} style={{ width: "100%", minHeight: 42, marginTop: 8, color: accent, borderColor: `${accent}77`, fontSize: 8.8, fontWeight: 1000 }}>{routeGenerationBusy ? pickLegacyLocalizedText(lang, "GÉNÉRATION…", "GENERATING…", "GENERANDO…") : pickLegacyLocalizedText(lang, "✨ GÉNÉRER 3 PARCOURS", "✨ GENERATE 3 ROUTES", "✨ GENERAR 3 RUTAS")}</button>
                {routeGenerationMessage ? <div style={{ marginTop: 7, color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{routeGenerationMessage}</div> : null}
              </div> : null}

              {routeChooseMode === "library" ? <div style={{ padding: 12, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.05),rgba(7,10,15,.84))", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ color: accent, fontSize: 9.1, fontWeight: 1000, letterSpacing: .5 }}>{pickLegacyLocalizedText(lang, "TA BIBLIOTHÈQUE DE PARCOURS", "YOUR ROUTE LIBRARY", "TU BIBLIOTECA DE RUTAS")}</div>
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
                  <MiniStat label={pickLegacyLocalizedText(lang, "TOTAL", "TOTAL", "TOTAL")} value={String(routeOptions.length)} accent={accent}/>
                  <MiniStat label={pickLegacyLocalizedText(lang, "FAVORIS", "FAVORITES", "FAVORITOS")} value={String(savedRoutes.filter((route) => !route.sport ? activitySport === "running" : route.sport === activitySport).length)} accent={accent}/>
                  <MiniStat label={pickLegacyLocalizedText(lang, "OFFLINE", "OFFLINE", "SIN CONEXIÓN")} value={String(offlineRoutes.length)} accent={accent}/>
                </div>
                <div style={{ marginTop: 7, color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Tu carrousel principal est juste en dessous. Tu peux aussi afficher la liste détaillée si tu veux comparer plusieurs traces à la fois.", "Your main carousel is just below. You can also reveal the detailed list if you want to compare several routes at once.", "Tu carrusel principal está justo debajo. También puedes mostrar la lista detallada si quieres comparar varias rutas a la vez.")}</div>
                <button className="btn" onClick={() => { setRouteChooseMode("showcase"); setRouteListOpen((value) => !value); }} style={{ width: "100%", minHeight: 38, marginTop: 8, color: accent, borderColor: `${accent}66`, fontSize: 8.5, fontWeight: 1000 }}>{routeListOpen ? pickLegacyLocalizedText(lang, "REFERMER LA LISTE DÉTAILLÉE", "HIDE DETAILED LIST", "OCULTAR LISTA DETALLADA") : pickLegacyLocalizedText(lang, "AFFICHER LA LISTE DÉTAILLÉE", "SHOW DETAILED LIST", "MOSTRAR LISTA DETALLADA")}</button>
              </div> : null}
            </div>
          </RunningSurface>

          {routeOptions.length ? <RunningSurface accent={accent} active style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ color: accent, fontSize: 9.5, fontWeight: 1000, letterSpacing: .6 }}>{pickLegacyLocalizedText(lang, "BLOC CARTE & ITINÉRAIRE", "MAP & ROUTE BLOCK", "BLOQUE MAPA E ITINERARIO")}</div>
                  <div style={{ marginTop: 3, color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Le parcours sélectionné reste au centre. Les onglets n’affichent qu’une famille d’informations à la fois pour éviter l’effet “tout en vrac”.", "The selected route stays in the center. Tabs only reveal one family of information at a time to avoid the cluttered feeling.", "La ruta seleccionada permanece en el centro. Las pestañas solo muestran una familia de información a la vez para evitar la sensación de todo mezclado.")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button className="btn" onClick={() => setRouteListOpen((value) => !value)} style={{ minHeight: 31, padding: "4px 8px", fontSize: 8.1, fontWeight: 1000 }}>{routeListOpen ? pickLegacyLocalizedText(lang, "MASQUER LISTE", "HIDE LIST", "OCULTAR LISTA") : pickLegacyLocalizedText(lang, "VOIR LISTE", "VIEW LIST", "VER LISTA")}</button>
                  {selectedRoute ? <button className="btn" disabled={!selectedRouteHasReference} onClick={() => selectedRouteHasReference && setGhostEnabled((value) => !value)} style={{ minHeight: 31, padding: "4px 8px", fontSize: 8.1, fontWeight: 1000, opacity: selectedRouteHasReference ? 1 : .45, color: ghostEnabled ? accent : undefined, borderColor: ghostEnabled ? `${accent}77` : undefined }}>{selectedRouteHasReference ? `GHOST ${ghostEnabled ? "ON" : "OFF"}` : pickLegacyLocalizedText(lang, "PARCOURS SEUL", "ROUTE ONLY", "SOLO RUTA")}</button> : null}
                </div>
              </div>

              {selectedRoute ? <div style={{ display: "grid", gap: 10 }}>
                <div style={{ position: "relative", touchAction: "pan-y" }} onTouchStart={onRouteSwipeStart} onTouchEnd={onRouteSwipeEnd}>
                  <RouteMap points={selectedRoute.route} accent={accent} waiting={copy.waiting} showRouteNetwork zoomable route={selectedRoute} terrain={selectedTerrain}/>
                  <div style={{ position: "absolute", inset: 10, display: "grid", gridTemplateRows: "auto 1fr auto", pointerEvents: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <div style={{ padding: "5px 9px", borderRadius: 999, background: "rgba(7,10,15,.78)", border: `1px solid ${accent}35`, color: accent, fontSize: 7.3, fontWeight: 1000 }}>{selectedTerrain?.hasElevation ? terrainLabel(selectedTerrain.terrain, lang) : outdoorSportLabel(activitySport, lang)}</div>
                        <div style={{ padding: "5px 9px", borderRadius: 999, background: "rgba(7,10,15,.78)", border: "1px solid rgba(255,255,255,.10)", color: "#fff", fontSize: 7.3, fontWeight: 1000 }}>{selectedRouteIndex + 1}/{routeOptions.length}</div>
                        {routeGenerationMessage && routeChooseMode === "generate" ? <div style={{ padding: "5px 9px", borderRadius: 999, background: "rgba(7,10,15,.78)", border: `1px solid ${accent}25`, color: "#fff", fontSize: 7.1, fontWeight: 900, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pickLegacyLocalizedText(lang, "généré", "generated", "generado")}</div> : null}
                      </div>
                      <div style={{ display: "grid", gap: 6, pointerEvents: "auto" }}>
                        <button className="btn" onClick={() => toggleFavoriteRoute(selectedRoute)} style={{ minWidth: 36, minHeight: 36, padding: 0, background: "rgba(7,10,15,.82)", borderColor: `${accent}35`, color: savedRoutes.some((item) => item.id === selectedRoute.id || (!!selectedRoute.externalId && item.externalId === selectedRoute.externalId) || (!!selectedRoute.sourceActivityId && item.sourceActivityId === selectedRoute.sourceActivityId)) ? accent : undefined }}>{savedRoutes.some((item) => item.id === selectedRoute.id || (!!selectedRoute.externalId && item.externalId === selectedRoute.externalId) || (!!selectedRoute.sourceActivityId && item.sourceActivityId === selectedRoute.sourceActivityId)) ? "★" : "☆"}</button>
                        <button className="btn" onClick={() => openRouteGpsActions(selectedRoute)} style={{ minWidth: 36, minHeight: 36, padding: 0, background: "rgba(7,10,15,.82)", borderColor: `${accent}35`, fontSize: 12 }}>📍</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center" }}>
                      <div style={{ pointerEvents: "auto" }}><button className="btn" onClick={() => selectAdjacentRoute(-1)} style={{ minWidth: 40, minHeight: 40, padding: 0, background: "rgba(7,10,15,.82)", borderColor: `${accent}35`, fontSize: 16 }}>‹</button></div>
                      <div />
                      <div style={{ justifySelf: "end", pointerEvents: "auto" }}><button className="btn" onClick={() => selectAdjacentRoute(1)} style={{ minWidth: 40, minHeight: 40, padding: 0, background: "rgba(7,10,15,.82)", borderColor: `${accent}35`, fontSize: 16 }}>›</button></div>
                    </div>
                    <div style={{ alignSelf: "end", pointerEvents: "auto", padding: 12, borderRadius: 18, background: "rgba(6,9,14,.86)", backdropFilter: "blur(16px)", border: `1px solid ${accent}33`, boxShadow: "0 16px 34px rgba(0,0,0,.42)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: accent, fontSize: 10.1, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buildRouteDisplayName(selectedRoute, selectedTerrain, lang)}</div>
                          <div style={{ marginTop: 3, color: textSoft, fontSize: 7.9, lineHeight: 1.35 }}>{selectedTerrainAdvice ? selectedTerrainAdvice.text : pickLegacyLocalizedText(lang, "Balaye le carrousel pour comparer rapidement les tracés.", "Swipe the carousel to compare routes quickly.", "Desliza el carrusel para comparar las rutas rápidamente.")}</div>
                        </div>
                        <div style={{ flex: "0 0 auto", padding: "5px 8px", borderRadius: 999, border: `1px solid ${accent}30`, color: accent, fontSize: 7.1, fontWeight: 1000 }}>{formatDistance(selectedRoute.distanceM)}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                        <MiniStat label={pickLegacyLocalizedText(lang, "DIFFICULTÉ", "DIFFICULTY", "DIFICULTAD")} value={selectedTerrain?.hasElevation ? `${selectedTerrain.difficultyScore}/100` : "—"} accent={accent}/>
                        <MiniStat label="D+" value={selectedTerrain?.hasElevation ? `+${Math.round(selectedTerrain.gainM)} m` : `+${Math.round(selectedRoute.elevationGainM || 0)} m`} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, "SOMMET", "HIGH POINT", "CIMA")} value={selectedTerrain?.maxAltitudeM != null ? `${Math.round(selectedTerrain.maxAltitudeM)} m` : "—"} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, "DURÉE", "TIME", "TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(selectedRoute, activitySport))} accent={accent}/>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                        <button className="btn" onClick={() => setRouteDetailsTab("details")} style={{ minHeight: 34, padding: "4px 3px", fontSize: 7.1, fontWeight: 1000, color: routeDetailsTab === "details" ? accent : undefined, borderColor: routeDetailsTab === "details" ? `${accent}66` : undefined }}>{pickLegacyLocalizedText(lang, "APERÇU", "OVERVIEW", "RESUMEN")}</button>
                        <button className="btn" onClick={() => setRouteDetailsTab("photos")} style={{ minHeight: 34, padding: "4px 3px", fontSize: 7.1, fontWeight: 1000, color: routeDetailsTab === "photos" ? accent : undefined, borderColor: routeDetailsTab === "photos" ? `${accent}66` : undefined }}>{pickLegacyLocalizedText(lang, "PHOTOS", "PHOTOS", "FOTOS")}</button>
                        <button className="btn" onClick={() => setRoutePanelTab("guide")} style={{ minHeight: 34, padding: "4px 3px", fontSize: 7.1, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>{pickLegacyLocalizedText(lang, "GUIDER", "GUIDE", "GUIAR")}</button>
                        <button className="btn" onClick={() => setRoutePanelTab("offline")} style={{ minHeight: 34, padding: "4px 3px", fontSize: 7.1, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "OFFLINE", "OFFLINE", "OFFLINE")}</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x mandatory" }}>
                  {routeOptions.slice(0, 12).map((route, index) => {
                    const active = selectedRouteId === route.id;
                    const routeTerrain = analyzeRunningTerrain(route.route);
                    return <button key={route.id} className="card" onClick={() => selectRoute(route)} style={{ flex: "0 0 min(78vw,280px)", scrollSnapAlign: "start", padding: 10, textAlign: "left", borderRadius: 16, borderColor: active ? `${accent}66` : "rgba(255,255,255,.08)", background: active ? `linear-gradient(145deg,${accent}18,rgba(5,8,12,.84))` : "linear-gradient(145deg,rgba(255,255,255,.04),rgba(5,8,12,.72))" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ minWidth: 0, color: active ? accent : "#fff", fontSize: 8.9, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{index + 1}. {buildRouteDisplayName(route, routeTerrain, lang)}</div><div style={{ flex: "0 0 auto", fontSize: 7, color: textSoft }}>{routeTerrain.hasElevation ? terrainLabel(routeTerrain.terrain, lang) : "—"}</div></div>
                      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
                        <MiniStat label="KM" value={(route.distanceM / 1000).toFixed(1)} accent={accent}/>
                        <MiniStat label="D+" value={`+${Math.round(routeTerrain.hasElevation ? routeTerrain.gainM : route.elevationGainM || 0)} m`} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, "EST.", "EST.", "EST.")} value={formatDuration(estimateOutdoorRouteDurationMs(route, activitySport))} accent={accent}/>
                      </div>
                    </button>;
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ color: textSoft, fontSize: 7.8 }}>{pickLegacyLocalizedText(lang, "Balaye les cartes pour changer de parcours, puis ouvre les onglets pour le reste.", "Swipe cards to switch routes, then open tabs for the rest.", "Desliza las tarjetas para cambiar de ruta y luego abre las pestañas para el resto.")}</div>
                  <button className="btn" onClick={() => setRouteListOpen((value) => !value)} style={{ minHeight: 31, padding: "4px 8px", fontSize: 7.8, fontWeight: 1000 }}>{routeListOpen ? pickLegacyLocalizedText(lang, "LISTE COMPACTE", "COMPACT LIST", "LISTA COMPACTA") : pickLegacyLocalizedText(lang, "COMPARER EN LISTE", "COMPARE IN LIST", "COMPARAR EN LISTA")}</button>
                </div>

                {routeListOpen ? <div style={{ display: "grid", gap: 8 }}>
                  {routeOptions.slice(0, 12).map((route, index) => {
                    const active = selectedRouteId === route.id;
                    const favorite = savedRoutes.some((item) => item.id === route.id || (!!route.externalId && item.externalId === route.externalId) || (!!route.sourceActivityId && item.sourceActivityId === route.sourceActivityId));
                    const routeTerrain = analyzeRunningTerrain(route.route);
                    const highest = routeTerrain.maxAltitudeM != null ? Math.round(routeTerrain.maxAltitudeM) : null;
                    return <div key={route.id} className="card" style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", borderRadius: 15, borderColor: active ? `${accent}66` : undefined, background: active ? `linear-gradient(145deg,${accent}16,rgba(4,6,10,.82))` : "linear-gradient(145deg,rgba(255,255,255,.038),rgba(4,6,10,.70))" }}><button type="button" onClick={() => selectRoute(route)} style={{ border: 0, background: "transparent", color: "inherit", padding: 0, textAlign: "left", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><div style={{ fontSize: 10.2, fontWeight: 1000, color: active ? accent : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{index + 1}. {buildRouteDisplayName(route, routeTerrain, lang)}</div>{routeTerrain.hasElevation ? <span style={{ flex: "0 0 auto", padding: "2px 6px", borderRadius: 999, border: `1px solid ${accent}33`, color: accent, fontSize: 6.8, fontWeight: 1000 }}>{terrainLabel(routeTerrain.terrain, lang)} · {routeTerrain.difficultyScore}</span> : null}</div><div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 5, fontSize: 7.7, color: textSoft }}><span>📏 {formatDistance(route.distanceM)}</span><span>⛰️ +{Math.round(routeTerrain.hasElevation ? routeTerrain.gainM : route.elevationGainM)} m</span>{highest != null ? <span>🏔️ {highest} m</span> : null}<span>⏱️ {formatDuration(estimateOutdoorRouteDurationMs(route, activitySport))}</span></div></button><div style={{ display: "grid", gap: 6 }}><button className="btn" onClick={() => toggleFavoriteRoute(route)} style={{ minWidth: 34, minHeight: 34, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}66` : undefined }}>{favorite ? "★" : "☆"}</button><button className="btn" onClick={() => openRouteGpsActions(route)} style={{ minWidth: 34, minHeight: 34, padding: 0, fontSize: 12 }} title="GPS">📍</button></div></div>;
                  })}
                </div> : null}

                {routeElevationMessage ? <div style={{ color: selectedTerrain?.hasElevation ? accent : textSoft, fontSize: 7.6, lineHeight: 1.35 }}>⛰️ {routeElevationMessage}{routeElevationOverrides[selectedRoute.id] ? <span style={{ opacity: .65 }}> · Open-Meteo / Copernicus DEM</span> : null}</div> : null}

                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>{([['details', pickLegacyLocalizedText(lang, 'DÉTAILS', 'DETAILS', 'DETALLES')], ['performance', pickLegacyLocalizedText(lang, 'PERFORMANCE', 'PERFORMANCE', 'RENDIMIENTO')], ['photos', pickLegacyLocalizedText(lang, 'PHOTOS', 'PHOTOS', 'FOTOS')], ['community', pickLegacyLocalizedText(lang, 'COMMUNAUTÉ', 'COMMUNITY', 'COMUNIDAD')]] as Array<[RouteDetailsTab, string]>).map(([id, label]) => <button key={id} className="btn" onClick={() => setRouteDetailsTab(id)} style={{ flex: "1 0 auto", minHeight: 36, padding: '4px 10px', fontSize: 7.5, fontWeight: 1000, color: routeDetailsTab === id ? accent : undefined, borderColor: routeDetailsTab === id ? `${accent}66` : undefined, background: routeDetailsTab === id ? `${accent}10` : undefined }}>{label}</button>)}</div>

                {routeDetailsTab === 'details' ? <>
                  <RunningSurface accent={accent} style={{ marginTop: 0 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 7 }}>
                        <MiniStat label={pickLegacyLocalizedText(lang, 'DISTANCE', 'DISTANCE', 'DISTANCIA')} value={formatDistance(selectedRoute.distanceM)} accent={accent}/>
                        <MiniStat label='D−' value={selectedTerrain?.hasElevation ? `-${Math.round(selectedTerrain.lossM)} m` : '—'} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, 'ALT. MIN', 'MIN ALT', 'ALT. MIN')} value={selectedTerrain?.minAltitudeM != null ? `${Math.round(selectedTerrain.minAltitudeM)} m` : '—'} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, 'ALT. MAX', 'MAX ALT', 'ALT. MAX')} value={selectedTerrain?.maxAltitudeM != null ? `${Math.round(selectedTerrain.maxAltitudeM)} m` : '—'} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, 'PENTE MAX', 'MAX GRADE', 'PEND. MAX')} value={selectedTerrain?.hasElevation ? `${selectedTerrain.maxGradePct.toFixed(1)}%` : '—'} accent={accent}/>
                        <MiniStat label={pickLegacyLocalizedText(lang, 'TYPE', 'TYPE', 'TIPO')} value={selectedTerrain ? terrainLabel(selectedTerrain.terrain, lang) : outdoorSportLabel(activitySport, lang)} accent={accent}/>
                      </div>
                      <div>
                        <div style={{ color: accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .5 }}>{pickLegacyLocalizedText(lang, 'PROFIL ALTIMÉTRIQUE', 'ELEVATION PROFILE', 'PERFIL DE ELEVACIÓN')}</div>
                        <div style={{ marginTop: 6 }}><RunningElevationProfile points={selectedRoute.route} accent={accent} textSoft={textSoft} height={132}/></div>
                      </div>
                      {selectedSportRouteDetails ? <><div style={{ fontSize: 7.5, color: accent, fontWeight: 1000, letterSpacing: .5 }}>{selectedSportRouteDetails.title}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>{selectedSportRouteDetails.metrics.map((metric) => <MiniStat key={metric.label} label={metric.label} value={metric.value} accent={accent}/>)}</div><div style={{ color: textSoft, fontSize: 8.1, lineHeight: 1.45 }}>{selectedSportRouteDetails.note}</div></> : null}
                      <div style={{ color: textSoft, fontSize: 8.2, lineHeight: 1.45 }}>{selectedTerrainAdvice ? <><b style={{ color: accent }}>{terrainLabel(selectedTerrain.terrain, lang)}</b> · {selectedTerrainAdvice.text}</> : pickLegacyLocalizedText(lang, 'Départ, arrivée, dénivelé et point culminant sont regroupés ici pour mieux préparer la sortie.', 'Start, finish, elevation and high point are grouped here to better prepare the outing.', 'Salida, llegada, desnivel y punto más alto se agrupan aquí para preparar mejor la salida.')}</div>
                      {selectedTerrainAdvice ? <button className="btn" onClick={applyTerrainRecommendation} style={{ width: '100%', minHeight: 36, color: accent, borderColor: `${accent}55`, fontSize: 8, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, 'UTILISER LA SÉANCE CONSEILLÉE', 'USE RECOMMENDED WORKOUT', 'USAR SESIÓN RECOMENDADA')}</button> : null}
                    </div>
                  </RunningSurface>
                  <OutdoorRoutePlaceInfoPanel route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft}/>
                </> : null}
                {routeDetailsTab === 'performance' ? <><RunningSurface accent={accent} style={{ marginTop: 0 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .5 }}>{pickLegacyLocalizedText(lang, 'MES DONNÉES SUR CE PARCOURS', 'MY DATA ON THIS ROUTE', 'MIS DATOS EN ESTA RUTA')}</div><div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}><MiniStat label={pickLegacyLocalizedText(lang, 'TENTATIVES', 'ATTEMPTS', 'INTENTOS')} value={String(selectedRouteAttempts.length)} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, 'MEILLEUR TEMPS', 'BEST TIME', 'MEJOR TIEMPO')} value={selectedRouteAttempts[0] ? formatDuration(selectedRouteAttempts[0].elapsedMs) : '—'} accent={accent}/><MiniStat label={pickLegacyLocalizedText(lang, 'ALLURE MOY.', 'AVG PACE', 'RITMO MEDIO')} value={selectedRouteAttempts.length && selectedRouteAttempts.some((item) => item.avgPaceSecPerKm != null) ? `${formatPace(Math.round(selectedRouteAttempts.reduce((sum, item) => sum + Number(item.avgPaceSecPerKm || 0), 0) / Math.max(1, selectedRouteAttempts.filter((item) => item.avgPaceSecPerKm != null).length)))}/km` : '—'} accent={accent}/></div></RunningSurface><OutdoorRouteCommunityPanel route={selectedRoute} localAttempts={selectedRouteAttempts} lang={lang} accent={accent} textSoft={textSoft}/></> : null}
                {routeDetailsTab === 'photos' ? <><OutdoorRoutePlaceInfoPanel route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft} compact/><OutdoorRoutePhotoGallery route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft} onSearchImages={() => searchRouteImages(selectedRoute)}/><button className="btn" onClick={() => openRouteInMaps(selectedRoute)} style={{ width: '100%', minHeight: 38, marginTop: 0, fontSize: 8.1, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>🗺️ {pickLegacyLocalizedText(lang, 'OUVRIR LE DÉPART DANS MAPS', 'OPEN START IN MAPS', 'ABRIR SALIDA EN MAPS')}</button></> : null}
                {routeDetailsTab === 'community' ? <OutdoorRouteSocialPanel route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft}/> : null}
              </div> : <div style={{ textAlign: "center", color: textSoft, fontSize: 9.2, lineHeight: 1.5, padding: 12 }}>{pickLegacyLocalizedText(lang, "Sélectionne un parcours dans le carrousel pour afficher la grande carte et tous les onglets dédiés.", "Select a route in the carousel to display the large map and all dedicated tabs.", "Selecciona una ruta en el carrusel para mostrar el gran mapa y todas las pestañas dedicadas.")}</div>}
            </div>
          </RunningSurface> : <RunningSurface accent={accent} style={{ marginTop: 0 }}><div style={{ textAlign: "center", color: textSoft, fontSize: 9.5, lineHeight: 1.5, padding: 12 }}>{pickLegacyLocalizedText(lang, "Aucun parcours enregistré. Lance d’abord « Autour de moi » ou « Générer » pour obtenir de vraies cartes de parcours.", "No route saved yet. Start with “Around me” or “Generate” to get real route map cards.", "Todavía no hay rutas guardadas. Empieza con «Cerca de mí» o «Generar» para obtener verdaderas tarjetas de rutas con mapa.")}</div></RunningSurface>}
        </div>
      </> : null}

      {routePanelTab === "guide" && selectedRoute ? <>
        <OutdoorRouteNavigationPanel route={selectedRoute} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft} mode="preview" extras={routeExtras}/>
        {["trail", "hiking", "walking", "nordic-walking"].includes(activitySport) && routeExtras ? <><OutdoorRoutePlannerPanel route={selectedRoute} lang={lang} accent={accent} textSoft={textSoft} onChange={setRouteExtras}/><OutdoorLongDistancePanel route={selectedRoute} sport={activitySport} extras={routeExtras} lang={lang} accent={accent} textSoft={textSoft}/></> : null}
      </> : null}

      {routePanelTab === "offline" && selectedRoute && routeExtras ? <OutdoorOfflineRoutePanel route={selectedRoute} sport={activitySport} extras={routeExtras} lang={lang} accent={accent} textSoft={textSoft} onChange={() => void refreshOfflineRoutes()}/> : null}
    </div>

    <div style={{ display: setupPanel === "ready" ? "block" : "none" }}>
    <RunningSurface accent={accent} active style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: isTreadmillSport ? "1fr" : "1fr auto", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 8.8, fontWeight: 1000, color: textSoft }}>{pickLegacyLocalizedText(lang, "CHECKLIST DE DÉPART", "START CHECKLIST", "CHECKLIST DE SALIDA")}</div>
          <div style={{ marginTop: 4, fontSize: 12.4, fontWeight: 1000, color: accent }}>{startFocus.title}</div>
          <div style={{ marginTop: 4, fontSize: 8.8, color: textSoft, lineHeight: 1.45 }}>{startFocus.hint}</div>
        </div>
        {!isTreadmillSport ? <button className="btn" onClick={checkGps} style={{ minHeight: 36, fontSize: 8.5, fontWeight: 1000 }}>{copy.gpsCheck}</button> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}>
        <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 7.7, opacity: .56, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "SÉANCE", "WORKOUT", "SESIÓN")}</div>
          <div style={{ marginTop: 4, fontSize: 10.2, fontWeight: 1000, color: accent, lineHeight: 1.25 }}>{presetLabel(effectivePreset, lang)}</div>
        </div>
        <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 7.7, opacity: .56, fontWeight: 1000 }}>{isTreadmillSport ? pickLegacyLocalizedText(lang, "SOURCE", "SOURCE", "FUENTE") : copy.gps}</div>
          <div style={{ marginTop: 4, fontSize: 10.2, fontWeight: 1000, color: accent, lineHeight: 1.25 }}>{isTreadmillSport ? treadmillSourceLabel : `${gpsMessage || copy.gpsUnknown}${accuracy ? ` · ±${Math.round(accuracy)} m` : ""}`}</div>
        </div>
        <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 7.7, opacity: .56, fontWeight: 1000 }}>{isOutdoorAdventureSport ? copy.route : pickLegacyLocalizedText(lang, "CAPTEURS", "SENSORS", "SENSORES")}</div>
          <div style={{ marginTop: 4, fontSize: 10.2, fontWeight: 1000, color: accent, lineHeight: 1.25 }}>{isOutdoorAdventureSport ? (selectedRoute ? selectedRoute.name : pickLegacyLocalizedText(lang, "AUCUN PARCOURS", "NO ROUTE", "SIN RUTA")) : (connectedDeviceCount > 0 ? `${connectedDeviceCount} ${pickLegacyLocalizedText(lang, "connecté(s)", "connected", "conectado(s)")}` : pickLegacyLocalizedText(lang, "AUCUN", "NONE", "NINGUNO"))}</div>
        </div>
        <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 7.7, opacity: .56, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "ALERTES", "ALERTS", "ALERTAS")}</div>
          <div style={{ marginTop: 4, fontSize: 10.2, fontWeight: 1000, color: accent, lineHeight: 1.25 }}>{audioCoach ? pickLegacyLocalizedText(lang, "AWENA ACTIVÉE", "AWENA ENABLED", "AWENA ACTIVADA") : pickLegacyLocalizedText(lang, "AWENA DÉSACTIVÉE", "AWENA DISABLED", "AWENA DESACTIVADA")}</div>
        </div>
      </div>
    </RunningSurface>

    {showShoeSelection ? <div style={{ marginTop: 10 }}><Section title={pickLegacyLocalizedText(lang, "CHAUSSURES", "SHOES", "ZAPATILLAS")}>
      {availableShoes.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>{availableShoes.map((shoe) => <Choice key={shoe.id} active={selectedShoeId === shoe.id} accent={accent} onClick={() => setSelectedShoeId(selectedShoeId === shoe.id ? "" : shoe.id)}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RunningGlyph name="shoe" size={14} /> {shoe.name}</span></Choice>)}</div> : <div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.4 }}>{pickLegacyLocalizedText(lang, "Ajoute une paire dans Stats > Matériel pour suivre le kilométrage.", "Add shoes in Stats > Gear to track mileage.", "Añade unas zapatillas en Stats > Material para seguir el kilometraje.")}</div>}
    </Section></div> : null}

    {isOutdoorAdventureSport ? <OutdoorSafetyPanel route={selectedRoute} sport={activitySport} lang={lang} accent={accent} textSoft={textSoft}/> : null}

    <RunningSurface accent={accent} style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28` }}><RunningGlyph name="voice" size={18} /></div>
        <div>
          <div style={{ fontSize: 10.2, fontWeight: 1000 }}>{copy.audioCoach}</div>
          <div style={{ marginTop: 3, fontSize: 8.6, color: textSoft, lineHeight: 1.35 }}>{isOutdoorAdventureSport ? pickLegacyLocalizedText(lang, "Annonces guidage, repères et alertes utiles pendant la sortie.", "Guidance, cue and alert voice prompts during the activity.", "Anuncios de guiado, referencias y alertas durante la salida.") : isTreadmillSport ? pickLegacyLocalizedText(lang, "Annonces allure, blocs et repères sans dépendre du GPS.", "Announces pace, blocks and cues without relying on GPS.", "Anuncia ritmo, bloques y referencias sin depender del GPS.") : copy.audioCoachSub}</div>
        </div>
        <button className="btn" onClick={() => setAudioCoach((value) => !value)} style={{ minWidth: 58, minHeight: 36, borderColor: audioCoach ? `${accent}77` : undefined, color: audioCoach ? accent : undefined, fontWeight: 1000 }}>{audioCoach ? "ON" : "OFF"}</button>
      </div>
    </RunningSurface>

    {isTreadmillSport ? <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28` }}><RunningGlyph name="sport-treadmill" size={18} /></div><div><div style={{ fontSize: 10.2, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "MESURE TAPIS ROULANT", "TREADMILL MEASUREMENT", "MEDICIÓN CINTA")}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft, lineHeight: 1.4 }}>{treadmillSource === "ftms" ? pickLegacyLocalizedText(lang, "Vitesse, distance et inclinaison reçues automatiquement du tapis.", "Speed, distance and incline are read automatically from the treadmill.", "Velocidad, distancia e inclinación recibidas automáticamente de la cinta.") : treadmillSource === "footpod" ? pickLegacyLocalizedText(lang, "Vitesse et distance lues depuis le footpod. Inclinaison manuelle si besoin.", "Speed and distance come from the footpod. Set incline manually if needed.", "Velocidad y distancia desde el footpod. Inclinación manual si hace falta.") : pickLegacyLocalizedText(lang, "Aucun capteur de vitesse : utilise la vitesse et l'inclinaison du tapis.", "No speed sensor: use the treadmill speed and incline values.", "Sin sensor de velocidad: usa la velocidad e inclinación de la cinta.")}</div></div><span style={{ padding: "5px 8px", borderRadius: 999, border: `1px solid ${accent}44`, color: accent, fontSize: 7.8, fontWeight: 1000 }}>{treadmillSourceLabel}</span></div>{(treadmillUsesManualSpeed || treadmillNeedsManualIncline) ? <div style={{ display: "grid", gridTemplateColumns: treadmillUsesManualSpeed && treadmillNeedsManualIncline ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 8, marginTop: 10 }}>{treadmillUsesManualSpeed ? <TreadmillAdjuster label={pickLegacyLocalizedText(lang, "VITESSE TAPIS", "TREADMILL SPEED", "VELOCIDAD CINTA")} value={manualTreadmillSpeedKmh} suffix="km/h" min={1} max={25} step={0.5} onChange={setManualTreadmillSpeedKmh}/> : null}{treadmillNeedsManualIncline ? <TreadmillAdjuster label={pickLegacyLocalizedText(lang, "INCLINAISON", "INCLINE", "INCLINACIÓN")} value={manualTreadmillIncline} suffix="%" min={0} max={20} step={0.5} onChange={setManualTreadmillIncline}/> : null}</div> : null}</RunningSurface> : <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28` }}><RunningGlyph name="gps" size={18} /></div><div><div style={{ fontSize: 10.2, fontWeight: 1000 }}>{copy.gps}</div><div style={{ marginTop: 2, fontSize: 9.4, color: gpsMessage === copy.gpsReady ? "#71ff9a" : textSoft }}>{gpsMessage || copy.gpsUnknown}{accuracy ? ` · ±${Math.round(accuracy)} m` : ""}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft }}>{isNativeActivityTrackingAvailable() ? (pickLegacyLocalizedText(lang, "Suivi Android natif écran éteint via service premier plan.", "Native Android screen-off tracking via foreground service.", "Seguimiento Android nativo con pantalla apagada.")) : copy.gpsHint}</div></div><button className="btn" onClick={checkGps} style={{ minHeight: 36, fontSize: 8.5, fontWeight: 1000 }}>{copy.gpsCheck}</button></div></RunningSurface>}

    <button className="btn primary" onClick={startCountdown} style={{ width: "100%", minHeight: 58, marginTop: 10, background: accent, fontWeight: 1000, fontSize: 13 }}>▶ {copy.start} · {presetLabel(effectivePreset, lang)}</button>
    <RunningSurface accent={accent} style={{ marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}10`, color: accent }}><RunningGlyph name="sensor" size={18}/></div><div><div style={{ fontSize: 10.1, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "CAPTEURS", "SENSORS", "SENSORES")}</div><div style={{ marginTop: 3, fontSize: 8.6, color: textSoft }}>{connectedDeviceCount ? `${connectedDeviceCount} ${pickLegacyLocalizedText(lang, "connecté(s) · utilisés automatiquement", "connected · used automatically", "conectado(s) · usados automáticamente")}` : pickLegacyLocalizedText(lang, "Aucun capteur connecté · optionnel", "No sensor connected · optional", "Ningún sensor conectado · opcional")}</div></div><button className="btn" onClick={() => go("stats")} style={{ minHeight: 34, padding: "4px 9px", fontSize: 8.2, fontWeight: 1000 }}>{pickLegacyLocalizedText(lang, "GÉRER", "MANAGE", "GESTIONAR")}</button></div></RunningSurface>
    </div>
  </div>;
}
function presetGlyphName(preset: Preset): "free" | "distance" | "time" | "pace" | "training" | "sport-trail" {
    if (preset.id === "pacer") return "pace";
    if (preset.id === "custom" || preset.type === "intervals") return "training";
    if (preset.type === "hills") return "sport-trail";
    if (preset.targetDistanceM) return "distance";
    if (preset.targetDurationMs) return "time";
    return "free";
}
function PresetGlyph({ preset, size = 18 }: { preset: Preset; size?: number }) {
    return <RunningGlyph name={presetGlyphName(preset)} size={size}/>;
}
function GoalModeButton({ active, accent, icon, label, onClick }: { active: boolean; accent: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    return <button type="button" onClick={onClick} style={{ minHeight: 72, borderRadius: 15, border: `1px solid ${active ? `${accent}77` : "rgba(255,255,255,.08)"}`, background: active ? `linear-gradient(145deg,${accent}18,rgba(4,6,10,.88))` : "linear-gradient(145deg,rgba(255,255,255,.035),rgba(4,6,10,.72))", color: active ? accent : "rgba(255,255,255,.72)", display: "grid", placeItems: "center", alignContent: "center", gap: 7, padding: 8, cursor: "pointer", font: "inherit", boxShadow: active ? `0 12px 26px ${accent}0f,inset 0 1px 0 ${accent}18` : "inset 0 1px 0 rgba(255,255,255,.025)" }}><span style={{ width: 28, height: 28, display: "grid", placeItems: "center" }}>{icon}</span><span style={{ fontSize: 8.5, fontWeight: 1000, textAlign: "center", lineHeight: 1.15 }}>{label}</span></button>;
}
function TrainingCard({ preset, lang, selected, accent, onClick }: {
    preset: Preset;
    lang: string;
    selected: boolean;
    accent: string;
    onClick: () => void;
}) { return <button onClick={onClick} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", borderRadius: 14, border: `1px solid ${selected ? `${accent}77` : "rgba(255,255,255,.08)"}`, background: selected ? `linear-gradient(145deg,${accent}18,rgba(4,6,10,.88))` : "linear-gradient(145deg,rgba(255,255,255,.035),rgba(4,6,10,.72))", color: "#fff", padding: 9, textAlign: "left", cursor: "pointer", boxShadow: selected ? `0 12px 24px ${accent}0e, inset 0 1px 0 ${accent}16` : "0 10px 22px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.025)" }}><span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, background: `${accent}10`, color: selected ? accent : "rgba(255,255,255,.72)" }}><PresetGlyph preset={preset} size={18}/></span><span><b style={{ fontSize: 10.3, color: selected ? accent : undefined }}>{presetLabel(preset, lang)}</b><small style={{ display: "block", fontSize: 8.5, opacity: .55, marginTop: 3, lineHeight: 1.3 }}>{presetSub(preset, lang)}</small></span>{selected ? <RunningGlyph name="step-ready" size={16}/> : <span style={{ opacity: .28 }}>›</span>}</button>; }

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
function buildSportRouteDetails(route: RunningRouteTemplate, terrain: ReturnType<typeof analyzeRunningTerrain> | null, sport: OutdoorPerformanceSport, lang: string) {
    const gainPerKm = terrain?.hasElevation ? terrain.gainPerKm : 0;
    const estimated = formatDuration(estimateOutdoorRouteDurationMs(route, sport));
    const format = route.generation?.shape === "loop" ? pickLegacyLocalizedText(lang, "BOUCLE", "LOOP", "BUCLE") : pickLegacyLocalizedText(lang, "LINÉAIRE", "POINT TO POINT", "LINEAL");
    if (sport === "trail") return {
        title: pickLegacyLocalizedText(lang, "LECTURE TRAIL", "TRAIL READOUT", "LECTURA TRAIL"),
        metrics: [
            { label: pickLegacyLocalizedText(lang, "SENTIERS", "TRAILS", "SENDEROS"), value: route.generation ? `${Math.round(route.generation.trailSharePct)}%` : "—" },
            { label: "D+/KM", value: terrain?.hasElevation ? `${Math.round(gainPerKm)} m` : "—" },
            { label: pickLegacyLocalizedText(lang, "PENTE MAX", "MAX GRADE", "PEND. MAX"), value: terrain?.hasElevation ? `${terrain.maxGradePct.toFixed(1)}%` : "—" },
        ],
        note: pickLegacyLocalizedText(lang, `Trail ${format.toLowerCase()} · ${estimated} estimées. Surveille surtout D+/km et pente max pour doser l'effort.`, `${format.toLowerCase()} trail · ${estimated} estimated. Watch elevation per km and max grade to pace the effort.`, `Trail ${format.toLowerCase()} · ${estimated} estimadas. Vigila el desnivel/km y la pendiente máxima.`),
    };
    if (sport === "hiking") return {
        title: pickLegacyLocalizedText(lang, "LECTURE RANDONNÉE", "HIKING READOUT", "LECTURA SENDERISMO"),
        metrics: [
            { label: pickLegacyLocalizedText(lang, "DURÉE", "DURATION", "DURACIÓN"), value: estimated },
            { label: pickLegacyLocalizedText(lang, "ASCENSION", "ASCENT", "ASCENSO"), value: terrain?.hasElevation ? `+${Math.round(terrain.gainM)} m` : "—" },
            { label: pickLegacyLocalizedText(lang, "POINT HAUT", "HIGH POINT", "PUNTO ALTO"), value: terrain?.maxAltitudeM != null ? `${Math.round(terrain.maxAltitudeM)} m` : "—" },
        ],
        note: pickLegacyLocalizedText(lang, `Randonnée ${format.toLowerCase()} : durée, D+ et point culminant sont prioritaires pour préparer eau, équipement et horaire.`, `${format.toLowerCase()} hike: duration, ascent and high point are the key values for water, gear and timing.`, `Senderismo ${format.toLowerCase()}: duración, ascenso y punto más alto son clave para agua, material y horario.`),
    };
    if (sport === "walking" || sport === "nordic-walking") return {
        title: pickLegacyLocalizedText(lang, sport === "nordic-walking" ? "LECTURE MARCHE NORDIQUE" : "LECTURE MARCHE", sport === "nordic-walking" ? "NORDIC WALK READOUT" : "WALK READOUT", sport === "nordic-walking" ? "LECTURA MARCHA NÓRDICA" : "LECTURA MARCHA"),
        metrics: [
            { label: pickLegacyLocalizedText(lang, "DURÉE", "DURATION", "DURACIÓN"), value: estimated },
            { label: "D+", value: terrain?.hasElevation ? `+${Math.round(terrain.gainM)} m` : "—" },
            { label: pickLegacyLocalizedText(lang, "FORMAT", "FORMAT", "FORMATO"), value: format },
        ],
        note: pickLegacyLocalizedText(lang, "Pour la marche, la durée estimée et le relief donnent une meilleure idée de l'effort réel que la distance seule.", "For walking, estimated duration and elevation describe the real effort better than distance alone.", "Para caminar, la duración estimada y el relieve describen mejor el esfuerzo real que la distancia sola."),
    };
    return {
        title: pickLegacyLocalizedText(lang, "LECTURE RUNNING", "RUNNING READOUT", "LECTURA RUNNING"),
        metrics: [
            { label: pickLegacyLocalizedText(lang, "DURÉE EST.", "EST. TIME", "TIEMPO EST."), value: estimated },
            { label: "D+/KM", value: terrain?.hasElevation ? `${Math.round(gainPerKm)} m` : "—" },
            { label: pickLegacyLocalizedText(lang, "FORMAT", "FORMAT", "FORMATO"), value: format },
        ],
        note: pickLegacyLocalizedText(lang, "Pour la course, compare surtout distance, D+/km et profil général avant de choisir ton allure ou ta séance.", "For running, compare distance, elevation per km and the overall profile before choosing pace or workout.", "Para running, compara distancia, desnivel/km y perfil general antes de elegir ritmo o sesión."),
    };
}
function RouteMap({ points, accent, waiting, showRouteNetwork = false, zoomable = false, route, terrain }: {
    points: GeoPoint[];
    accent: string;
    waiting: string;
    showRouteNetwork?: boolean;
    zoomable?: boolean;
    route?: RunningRouteTemplate | null;
    terrain?: ReturnType<typeof analyzeRunningTerrain> | null;
}) {
    const [zoomDelta, setZoomDelta] = React.useState(0);
    React.useEffect(() => { setZoomDelta(0); }, [points]);
    const layout = React.useMemo(() => buildMapLayout(points, zoomDelta), [points, zoomDelta]);
    return <div style={{ width: "100%", aspectRatio: "5/3", maxHeight: 360, minHeight: 190, position: "relative", overflow: "hidden", borderRadius: 15, background: "#101821", border: "1px solid rgba(255,255,255,.08)" }}>{layout ? <>{layout.tiles.map((tile) => <React.Fragment key={`${tile.z}-${tile.x}-${tile.y}`}><img src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", userSelect: "none" }}/>{showRouteNetwork ? <img src={tile.routeOverlayUrl} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", userSelect: "none", pointerEvents: "none" }}/> : null}</React.Fragment>)}<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}><polyline points={layout.polyline} fill="none" stroke="rgba(0,0,0,.78)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><polyline points={layout.polyline} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>{layout.start ? <g><circle cx={layout.start.x} cy={layout.start.y} r="9" fill="#42ef7e" stroke="#fff" strokeWidth="3"/><text x={layout.start.x} y={layout.start.y - 12} textAnchor="middle" fontSize="18">🚩</text></g> : null}{layout.end ? <g><circle cx={layout.end.x} cy={layout.end.y} r="9" fill="#ff5668" stroke="#fff" strokeWidth="3"/><text x={layout.end.x} y={layout.end.y - 12} textAnchor="middle" fontSize="18">🏁</text></g> : null}{terrain?.maxAltitudeM != null ? (() => { const summit = highestPointOnRoute(points); if (!summit)
        return null; const summitScreen = mercatorScreen(summit, layout.center, layout.zoom, layout.width, layout.height); return <g><circle cx={summitScreen.x} cy={summitScreen.y} r="6" fill="#ffcf57" stroke="#fff" strokeWidth="2"/><text x={summitScreen.x} y={summitScreen.y - 10} textAnchor="middle" fontSize="16">⛰️</text></g>; })() : null}</svg></> : <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "30px 30px", color: "rgba(255,255,255,.55)", fontSize: 10 }}>◎<br />{waiting}</div>}{zoomable ? <div style={{ position: "absolute", right: 8, top: 8, display: "grid", gap: 6, zIndex: 4 }}><button className="btn" onClick={() => setZoomDelta((value) => Math.max(-3, value - 1))} style={{ minWidth: 34, minHeight: 34, padding: 0, background: "rgba(8,10,16,.88)" }}>−</button><button className="btn" onClick={() => setZoomDelta((value) => Math.min(4, value + 1))} style={{ minWidth: 34, minHeight: 34, padding: 0, background: "rgba(8,10,16,.88)" }}>+</button><button className="btn" onClick={() => route && openRouteInMaps(route)} style={{ minWidth: 34, minHeight: 34, padding: 0, background: "rgba(8,10,16,.88)" }}>↗</button></div> : null}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", right: 4, bottom: 3, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.68)", color: "#fff", fontSize: 7, textDecoration: "none", zIndex: 4 }}>© OpenStreetMap · routes Waymarked Trails</a></div>;
}
type MapLayout = {
    width: number;
    height: number;
    zoom: number;
    center: {
        x: number;
        y: number;
    };
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
        routeOverlayUrl: string;
    }>;
};
function buildMapLayout(points: GeoPoint[], zoomDelta = 0): MapLayout | null { if (!points.length)
    return null; const width = 1000, height = 600, lats = points.map((p) => p.lat), lons = points.map((p) => p.lon), centerLat = (Math.min(...lats) + Math.max(...lats)) / 2, centerLon = (Math.min(...lons) + Math.max(...lons)) / 2; let zoom = 18; for (let z = 18; z >= 3; z -= 1) {
    const px = points.map((p) => mercatorPixel(p.lat, p.lon, z)), xs = px.map((p) => p.x), ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .78 && Math.max(...ys) - Math.min(...ys) <= height * .72) {
        zoom = z;
        break;
    }
} zoom = Math.max(3, Math.min(19, zoom + zoomDelta)); const center = mercatorPixel(centerLat, centerLon, zoom); const screen = points.map((p) => { const w = mercatorPixel(p.lat, p.lon, zoom); return { x: w.x - center.x + width / 2, y: w.y - center.y + height / 2 }; }); const minX = Math.floor((center.x - width / 2) / 256) - 1, maxX = Math.floor((center.x + width / 2) / 256) + 1, minY = Math.floor((center.y - height / 2) / 256) - 1, maxY = Math.floor((center.y + height / 2) / 256) + 1, count = 2 ** zoom; const tiles: MapLayout["tiles"] = []; for (let tx = minX; tx <= maxX; tx += 1)
    for (let ty = minY; ty <= maxY; ty += 1) {
        if (ty < 0 || ty >= count)
            continue;
        const wx = ((tx % count) + count) % count;
        tiles.push({ z: zoom, x: tx, y: ty, left: tx * 256 - center.x + width / 2, top: ty * 256 - center.y + height / 2, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`, routeOverlayUrl: `https://tile.waymarkedtrails.org/hiking/${zoom}/${wx}/${ty}.png` });
    } return { width, height, zoom, center, tiles, polyline: screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), start: screen[0] || null, end: screen[screen.length - 1] || null }; }
function mercatorPixel(lat: number, lon: number, zoom: number) { const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat)), scale = 256 * 2 ** zoom, sin = Math.sin(clamped * Math.PI / 180); return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }; }
function mercatorScreen(point: GeoPoint, center: { x: number; y: number }, zoom: number, width: number, height: number) { const world = mercatorPixel(point.lat, point.lon, zoom); return { x: world.x - center.x + width / 2, y: world.y - center.y + height / 2 }; }
function highestPointOnRoute(points: GeoPoint[]) { const valid = points.filter((point) => Number.isFinite(point.altitude)); if (!valid.length)
    return null; return valid.reduce((best, point) => Number(point.altitude) > Number(best.altitude) ? point : best, valid[0]); }
function buildRouteDisplayName(route: RunningRouteTemplate, terrain: ReturnType<typeof analyzeRunningTerrain> | null, lang: string) { const raw = String(route.name || "").trim(); if (raw && !/^parcours\s+osm/i.test(raw))
    return raw; const distanceKm = Math.max(.2, Number(route.distanceM || 0) / 1000), type = route.generation?.shape === "loop" ? pickLegacyLocalizedText(lang, "Boucle", "Loop", "Bucle") : pickLegacyLocalizedText(lang, "Parcours", "Route", "Ruta"), terrainText = terrain?.hasElevation ? terrainLabel(terrain.terrain, lang).toLowerCase() : pickLegacyLocalizedText(lang, "découverte", "discovery", "descubrimiento"); return `${type} ${terrainText} ${distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0)} km`; }
function openRouteInMaps(route: RunningRouteTemplate) { const start = route.route?.[0]; if (!start)
    return; try {
        window.open(`https://www.google.com/maps/search/?api=1&query=${start.lat},${start.lon}`, "_blank", "noopener,noreferrer");
    }
    catch { }
}
function searchRouteImages(route: RunningRouteTemplate) { const start = route.route?.[0], label = encodeURIComponent(route.name || `${start?.lat?.toFixed?.(3) || ""},${start?.lon?.toFixed?.(3) || ""}`); try {
        window.open(`https://www.google.com/search?tbm=isch&q=${label}`, "_blank", "noopener,noreferrer");
    }
    catch { }
}
function openRouteGpsActions(route: RunningRouteTemplate) { const start = route.route?.[0]; if (!start)
    return; const coords = `${start.lat.toFixed(6)}, ${start.lon.toFixed(6)}`; try {
        navigator.clipboard?.writeText(coords);
    }
    catch { }
    openRouteInMaps(route);
}
const recordDock: React.CSSProperties = { position: "fixed", left: "max(10px,env(safe-area-inset-left))", right: "max(10px,env(safe-area-inset-right))", bottom: "calc(82px + env(safe-area-inset-bottom))", zIndex: 45, maxWidth: 600, margin: "0 auto", display: "grid", gridTemplateColumns: ".75fr 1fr 1.25fr", gap: 7, padding: 8, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(8,9,14,.9)", backdropFilter: "blur(18px)", boxShadow: "0 16px 40px rgba(0,0,0,.58)" };
