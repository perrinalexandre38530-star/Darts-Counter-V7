import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import {
  averagePaceSecPerKm,
  averageSpeedMps,
  buildKilometerSplits,
  elevationGainMeters,
  formatDistance,
  formatDuration,
  formatPace,
  routeDistanceMeters,
  shouldAcceptRunningPoint,
} from "../../activity/activityMath";
import { deleteActivity, listActivities, saveActivity } from "../../activity/activityStore";
import type { ActivityRecord, GeoPoint } from "../../activity/activityTypes";

type View = "setup" | "record" | "history" | "detail" | "records";
type TargetDistance = null | 1000 | 5000 | 10000;

type Props = {
  go: (route: any, params?: any) => void;
  store?: any;
  params?: any;
};

const TARGETS: Array<{ value: TargetDistance; icon: string; fr: string; en: string; es: string; subFr: string; subEn: string; subEs: string }> = [
  { value: null, icon: "🏃", fr: "COURSE LIBRE", en: "FREE RUN", es: "CARRERA LIBRE", subFr: "Aucune limite. Cours à ton rythme.", subEn: "No limit. Run at your own pace.", subEs: "Sin límite. Corre a tu ritmo." },
  { value: 1000, icon: "⚡", fr: "1 KM", en: "1 KM", es: "1 KM", subFr: "Rapide, explosif, chrono pur.", subEn: "Fast, explosive, pure timing.", subEs: "Rápido, explosivo, puro crono." },
  { value: 5000, icon: "🎯", fr: "5 KM", en: "5 KM", es: "5 KM", subFr: "Le format référence pour progresser.", subEn: "The reference distance to improve.", subEs: "La distancia de referencia para progresar." },
  { value: 10000, icon: "🔥", fr: "10 KM", en: "10 KM", es: "10 KM", subFr: "Endurance et gestion de l'allure.", subEn: "Endurance and pace management.", subEs: "Resistencia y gestión del ritmo." },
];

function makeId() {
  try { return crypto.randomUUID(); }
  catch { return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
}

function normalizeTarget(value: any): TargetDistance {
  const n = Number(value);
  if (n === 1000 || n === 5000 || n === 10000) return n;
  return null;
}

function targetLabel(target: TargetDistance, lang: string) {
  if (!target) return lang === "fr" ? "Course libre" : lang === "es" ? "Carrera libre" : "Free run";
  return `${target / 1000} KM`;
}

function activityDate(ts: number, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

export default function RunningModule({ go, params }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const cardSoft = (theme as any)?.cardSoft || "rgba(255,255,255,.12)";

  const initialView: View = params?.runningView === "history" ? "history" : params?.runningView === "records" ? "records" : "setup";
  const [view, setView] = React.useState<View>(initialView);
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [selected, setSelected] = React.useState<ActivityRecord | null>(null);
  const [targetDistance, setTargetDistance] = React.useState<TargetDistance>(() => normalizeTarget(params?.runningTargetM));
  const [points, setPoints] = React.useState<GeoPoint[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [gpsMessage, setGpsMessage] = React.useState<string>("");

  const watchIdRef = React.useRef<number | null>(null);
  const pointsRef = React.useRef<GeoPoint[]>([]);
  const startedAtRef = React.useRef(0);
  const pauseStartedRef = React.useRef(0);
  const pausedTotalRef = React.useRef(0);
  const pausedRef = React.useRef(false);
  const autoStartedRef = React.useRef(false);

  const copy = lang === "fr" ? {
    title: "RUNNING SCORING",
    setupSub: "Choisis ton objectif et lance ta sortie",
    recordSub: "Session GPS en cours",
    history: "MES SORTIES",
    records: "MES RECORDS",
    setup: "COURIR",
    select: "CHOISIS TON FORMAT",
    start: "DÉMARRER",
    gpsTitle: "GPS TÉLÉPHONE",
    gpsReady: "Prêt à enregistrer ton parcours",
    gpsHint: "La précision dépend du signal GPS de ton appareil. Cette version Web/PWA reste en phase de test.",
    local: "Données locales",
    localSub: "Tes sorties restent sur cet appareil pendant la phase bêta.",
    devices: "MONTRES & CAPTEURS",
    devicesSub: "Health Connect, Garmin et imports FIT/GPX/TCX seront branchés sur ce même moteur.",
    soon: "BIENTÔT",
    acquiring: "Recherche GPS…",
    active: "GPS ACTIF",
    paused: "EN PAUSE",
    poor: "SIGNAL GPS FAIBLE",
    denied: "Autorise la localisation pour enregistrer ton parcours.",
    unavailable: "La géolocalisation n'est pas disponible sur cet appareil.",
    distance: "DISTANCE",
    time: "TEMPS",
    pace: "ALLURE",
    speed: "VITESSE",
    elevation: "DÉNIVELÉ +",
    accuracy: "PRÉCISION",
    target: "OBJECTIF",
    route: "PARCOURS",
    waiting: "En attente du premier point GPS…",
    pause: "PAUSE",
    resume: "REPRENDRE",
    finish: "TERMINER",
    cancel: "ANNULER",
    insufficient: "Il faut au moins deux points GPS pour enregistrer la sortie.",
    complete: "SORTIE TERMINÉE",
    verified: "GPS VÉRIFIÉ",
    splits: "SPLITS KILOMÉTRIQUES",
    noSplits: "Le premier split apparaîtra après 1 km.",
    delete: "SUPPRIMER LA SORTIE",
    empty: "Aucune sortie enregistrée pour le moment.",
    back: "Retour",
    week: "7 DERNIERS JOURS",
    total: "TOTAL",
    longest: "PLUS LONGUE",
    bestPace: "MEILLEURE ALLURE",
    pr1: "RECORD 1 KM",
    pr5: "RECORD 5 KM",
    pr10: "RECORD 10 KM",
    noRecord: "Pas encore de record",
    infoTitle: "Running Scoring",
    info: "Running Scoring enregistre une activité GPS, calcule distance, durée, allure, vitesse, dénivelé et splits. Les données restent locales pour cette bêta Web/PWA. La version Android n'est pas encore activée.",
    beta: "BETA WEB / PWA — NON PUBLIÉ SUR ANDROID",
  } : lang === "es" ? {
    title: "RUNNING SCORING", setupSub: "Elige tu objetivo e inicia tu carrera", recordSub: "Sesión GPS en curso", history: "MIS CARRERAS", records: "MIS RÉCORDS", setup: "CORRER", select: "ELIGE TU FORMATO", start: "INICIAR", gpsTitle: "GPS DEL TELÉFONO", gpsReady: "Listo para registrar tu ruta", gpsHint: "La precisión depende de la señal GPS. Esta versión Web/PWA sigue en pruebas.", local: "Datos locales", localSub: "Tus carreras permanecen en este dispositivo durante la beta.", devices: "RELOJES Y SENSORES", devicesSub: "Health Connect, Garmin e importaciones FIT/GPX/TCX usarán este mismo motor.", soon: "PRONTO", acquiring: "Buscando GPS…", active: "GPS ACTIVO", paused: "EN PAUSA", poor: "SEÑAL GPS DÉBIL", denied: "Autoriza la ubicación para registrar la ruta.", unavailable: "La geolocalización no está disponible.", distance: "DISTANCIA", time: "TIEMPO", pace: "RITMO", speed: "VELOCIDAD", elevation: "DESNIVEL +", accuracy: "PRECISIÓN", target: "OBJETIVO", route: "RUTA", waiting: "Esperando el primer punto GPS…", pause: "PAUSA", resume: "REANUDAR", finish: "TERMINAR", cancel: "CANCELAR", insufficient: "Se necesitan al menos dos puntos GPS para guardar la carrera.", complete: "CARRERA TERMINADA", verified: "GPS VERIFICADO", splits: "SPLITS KILOMÉTRICOS", noSplits: "El primer split aparecerá después de 1 km.", delete: "ELIMINAR CARRERA", empty: "Todavía no hay carreras registradas.", back: "Volver", week: "ÚLTIMOS 7 DÍAS", total: "TOTAL", longest: "MÁS LARGA", bestPace: "MEJOR RITMO", pr1: "RÉCORD 1 KM", pr5: "RÉCORD 5 KM", pr10: "RÉCORD 10 KM", noRecord: "Sin récord todavía", infoTitle: "Running Scoring", info: "Running Scoring registra una actividad GPS y calcula distancia, duración, ritmo, velocidad, desnivel y splits. Los datos son locales durante esta beta Web/PWA. Android aún no está activado.", beta: "BETA WEB / PWA — NO PUBLICADO EN ANDROID",
  } : {
    title: "RUNNING SCORING", setupSub: "Choose your target and start your run", recordSub: "GPS session in progress", history: "MY RUNS", records: "MY RECORDS", setup: "RUN", select: "CHOOSE YOUR FORMAT", start: "START", gpsTitle: "PHONE GPS", gpsReady: "Ready to record your route", gpsHint: "Accuracy depends on your device GPS signal. This Web/PWA version is still being tested.", local: "Local data", localSub: "Your runs stay on this device during the beta.", devices: "WATCHES & SENSORS", devicesSub: "Health Connect, Garmin and FIT/GPX/TCX imports will use this same engine.", soon: "SOON", acquiring: "Acquiring GPS…", active: "GPS ACTIVE", paused: "PAUSED", poor: "WEAK GPS SIGNAL", denied: "Allow location access to record your route.", unavailable: "Geolocation is unavailable on this device.", distance: "DISTANCE", time: "TIME", pace: "PACE", speed: "SPEED", elevation: "ELEVATION +", accuracy: "ACCURACY", target: "TARGET", route: "ROUTE", waiting: "Waiting for the first GPS point…", pause: "PAUSE", resume: "RESUME", finish: "FINISH", cancel: "CANCEL", insufficient: "At least two GPS points are required to save the run.", complete: "RUN COMPLETE", verified: "GPS VERIFIED", splits: "KILOMETRE SPLITS", noSplits: "The first split appears after 1 km.", delete: "DELETE RUN", empty: "No runs recorded yet.", back: "Back", week: "LAST 7 DAYS", total: "TOTAL", longest: "LONGEST", bestPace: "BEST PACE", pr1: "1 KM RECORD", pr5: "5 KM RECORD", pr10: "10 KM RECORD", noRecord: "No record yet", infoTitle: "Running Scoring", info: "Running Scoring records a GPS activity and calculates distance, duration, pace, speed, elevation and splits. Data stays local during this Web/PWA beta. Android is not enabled yet.", beta: "WEB / PWA BETA — NOT RELEASED ON ANDROID",
  };

  const refreshActivities = React.useCallback(async () => {
    setActivities(await listActivities("running"));
  }, []);

  React.useEffect(() => { void refreshActivities(); }, [refreshActivities]);

  React.useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [isRecording]);

  React.useEffect(() => () => {
    if (watchIdRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  const elapsedMs = React.useMemo(() => {
    if (!startedAtRef.current) return 0;
    const currentPause = pausedRef.current && pauseStartedRef.current ? Math.max(0, now - pauseStartedRef.current) : 0;
    return Math.max(0, now - startedAtRef.current - pausedTotalRef.current - currentPause);
  }, [now, paused]);

  const liveDistance = React.useMemo(() => routeDistanceMeters(points), [points]);
  const livePace = React.useMemo(() => averagePaceSecPerKm(liveDistance, elapsedMs), [liveDistance, elapsedMs]);
  const liveSpeed = React.useMemo(() => averageSpeedMps(liveDistance, elapsedMs) * 3.6, [liveDistance, elapsedMs]);
  const liveElevation = React.useMemo(() => elevationGainMeters(points), [points]);
  const liveSplits = React.useMemo(() => buildKilometerSplits(points, startedAtRef.current || Date.now()), [points]);

  const stats = React.useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = activities.filter((item) => Number(item.startedAt || 0) >= weekAgo);
    const totalM = activities.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const longest = activities.reduce((best, item) => Math.max(best, Number(item.distanceM || 0)), 0);
    const paces = activities.map((item) => item.avgPaceSecPerKm).filter((value): value is number => Number.isFinite(value) && Number(value) > 0);
    const bestTarget = (targetM: number) => {
      const rows = activities.filter((item) => Number(item.targetDistanceM || 0) === targetM && Number(item.distanceM || 0) >= targetM * .92);
      if (!rows.length) return null;
      return rows.reduce((best, item) => Number(item.elapsedMs) < Number(best.elapsedMs) ? item : best, rows[0]);
    };
    return {
      totalM,
      longest,
      bestPace: paces.length ? Math.min(...paces) : null,
      weekM: week.reduce((sum, item) => sum + Number(item.distanceM || 0), 0),
      weekSessions: week.length,
      pr1: bestTarget(1000),
      pr5: bestTarget(5000),
      pr10: bestTarget(10000),
    };
  }, [activities]);

  const stopWatch = React.useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const beginRun = React.useCallback((target: TargetDistance) => {
    setTargetDistance(target);
    setPoints([]);
    pointsRef.current = [];
    setAccuracy(null);
    setGpsMessage(copy.acquiring);
    pausedRef.current = false;
    pausedTotalRef.current = 0;
    pauseStartedRef.current = 0;
    startedAtRef.current = Date.now();
    setNow(startedAtRef.current);
    setPaused(false);
    setIsRecording(true);
    setView("record");

    if (!navigator.geolocation) {
      setGpsMessage(copy.unavailable);
      setIsRecording(false);
      return;
    }

    stopWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        const next: GeoPoint = {
          lat: coords.latitude,
          lon: coords.longitude,
          timestamp: position.timestamp || Date.now(),
          accuracy: Number.isFinite(coords.accuracy) ? Number(coords.accuracy) : undefined,
          altitude: Number.isFinite(coords.altitude) ? Number(coords.altitude) : undefined,
          speed: Number.isFinite(coords.speed) ? Number(coords.speed) : undefined,
        };
        setAccuracy(Number.isFinite(next.accuracy) ? Number(next.accuracy) : null);
        if (pausedRef.current) {
          setGpsMessage(copy.paused);
          return;
        }
        setGpsMessage(Number(next.accuracy || 0) > 45 ? copy.poor : copy.active);
        const previous = pointsRef.current[pointsRef.current.length - 1];
        if (!shouldAcceptRunningPoint(previous, next)) return;
        pointsRef.current = [...pointsRef.current, next];
        setPoints(pointsRef.current);
      },
      (error) => setGpsMessage(error.code === 1 ? copy.denied : `${copy.acquiring} (${error.message})`),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }, [copy.acquiring, copy.active, copy.denied, copy.paused, copy.poor, copy.unavailable, stopWatch]);

  React.useEffect(() => {
    if (!params?.runningAutoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const id = window.setTimeout(() => beginRun(normalizeTarget(params?.runningTargetM)), 80);
    return () => window.clearTimeout(id);
  }, [beginRun, params?.runningAutoStart, params?.runningTargetM]);

  const togglePause = React.useCallback(() => {
    if (!isRecording) return;
    if (!pausedRef.current) {
      pausedRef.current = true;
      pauseStartedRef.current = Date.now();
      setPaused(true);
      setGpsMessage(copy.paused);
      return;
    }
    const resumedAt = Date.now();
    if (pauseStartedRef.current) pausedTotalRef.current += Math.max(0, resumedAt - pauseStartedRef.current);
    pauseStartedRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
    setNow(resumedAt);
    setGpsMessage(copy.active);
  }, [copy.active, copy.paused, isRecording]);

  const cancelRun = React.useCallback(() => {
    stopWatch();
    setIsRecording(false);
    setPaused(false);
    pausedRef.current = false;
    pointsRef.current = [];
    setPoints([]);
    setGpsMessage("");
    setView("setup");
  }, [stopWatch]);

  const finishRun = React.useCallback(async () => {
    if (pointsRef.current.length < 2) {
      setGpsMessage(copy.insufficient);
      return;
    }
    stopWatch();
    const endedAt = Date.now();
    let pauseTotal = pausedTotalRef.current;
    if (pausedRef.current && pauseStartedRef.current) pauseTotal += endedAt - pauseStartedRef.current;
    const elapsed = Math.max(1, endedAt - startedAtRef.current - pauseTotal);
    const route = pointsRef.current;
    const distanceM = routeDistanceMeters(route);
    const record: ActivityRecord = {
      id: makeId(),
      sport: "running",
      source: "phone-gps",
      verification: "gps",
      startedAt: startedAtRef.current,
      endedAt,
      elapsedMs: elapsed,
      movingMs: elapsed,
      distanceM,
      avgSpeedMps: averageSpeedMps(distanceM, elapsed),
      avgPaceSecPerKm: averagePaceSecPerKm(distanceM, elapsed),
      elevationGainM: elevationGainMeters(route),
      route,
      splits: buildKilometerSplits(route, startedAtRef.current),
      targetDistanceM: targetDistance,
      deviceName: "Phone GPS",
      createdAt: Date.now(),
    };
    await saveActivity(record);
    setIsRecording(false);
    setPaused(false);
    pausedRef.current = false;
    setSelected(record);
    await refreshActivities();
    setView("detail");
  }, [copy.insufficient, refreshActivities, stopWatch, targetDistance]);

  const openActivity = (activity: ActivityRecord) => {
    setSelected(activity);
    setView("detail");
  };

  const removeSelected = async () => {
    if (!selected) return;
    await deleteActivity(selected.id);
    setSelected(null);
    await refreshActivities();
    setView("history");
  };

  const infoDot = <InfoDot title={copy.infoTitle} disableAwenaTakeover content={<div style={{ fontSize: 13, lineHeight: 1.55 }}>{copy.info}</div>} />;

  if (view === "record") {
    const progress = targetDistance ? Math.min(100, (liveDistance / targetDistance) * 100) : null;
    const statusColor = paused ? "#ffbe45" : accuracy && accuracy > 45 ? "#ff8c5a" : accent;
    return (
      <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH, paddingBottom: 138 }}>
        <PageHeader
          title={copy.title}
          subtitle={copy.recordSub}
          left={<BackDot onClick={cancelRun} title={copy.cancel} />}
          right={infoDot}
        />

        <div style={{ display: "flex", justifyContent: "center", margin: "3px 0 12px" }}>
          <div style={{ ...statusPill, borderColor: `${statusColor}66`, color: statusColor }}><span style={{ ...statusDot, background: statusColor, boxShadow: `0 0 12px ${statusColor}` }} />{paused ? copy.paused : gpsMessage || copy.acquiring}</div>
        </div>

        <div className="card" style={{ padding: 14, borderColor: `${accent}38`, boxShadow: `0 18px 48px rgba(0,0,0,.38),0 0 34px ${accent}0c` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1.2, color: textSoft }}>{copy.distance}</div>
              <div style={{ marginTop: 3, fontSize: "clamp(42px,12vw,66px)", lineHeight: .95, fontWeight: 1000, letterSpacing: -2, color: accent }}>{liveDistance >= 1000 ? (liveDistance / 1000).toFixed(2) : Math.round(liveDistance)}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textSoft, marginTop: 5 }}>{liveDistance >= 1000 ? "KM" : "M"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1.1, color: textSoft }}>{copy.time}</div>
              <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 5 }}>{formatDuration(elapsedMs)}</div>
              <div style={{ fontSize: 10.5, color: accent, fontWeight: 900, marginTop: 6 }}>{targetLabel(targetDistance, lang)}</div>
            </div>
          </div>
          {progress != null ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 10.5, fontWeight: 900, color: textSoft }}><span>{copy.target} · {targetLabel(targetDistance, lang)}</span><span style={{ color: accent }}>{Math.round(progress)}%</span></div>
              <Progress value={progress} accent={accent} />
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 12 }}>
          <Section title={copy.route} right={<span style={{ fontSize: 10, color: textSoft }}>{points.length} GPS</span>}>
            <RouteMap points={points} accent={accent} waiting={copy.waiting} />
          </Section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginTop: -2 }}>
          <Metric icon="⏱" label={copy.pace} value={`${formatPace(livePace)} /km`} accent={accent} />
          <Metric icon="⚡" label={copy.speed} value={`${liveSpeed.toFixed(1)} km/h`} accent={accent} />
          <Metric icon="⛰" label={copy.elevation} value={`+${Math.round(liveElevation)} m`} accent={accent} />
          <Metric icon="◎" label={copy.accuracy} value={accuracy ? `±${Math.round(accuracy)} m` : "—"} accent={accent} />
        </div>

        {liveSplits.length ? (
          <div style={{ marginTop: 12 }}>
            <Section title={copy.splits}>
              <SplitTable splits={liveSplits.slice(-3)} accent={accent} />
            </Section>
          </div>
        ) : null}

        {gpsMessage && ![copy.active, copy.paused, copy.poor, copy.acquiring].includes(gpsMessage) ? <div style={warning}>{gpsMessage}</div> : null}

        <div style={recordDock}>
          <button type="button" className="btn" onClick={togglePause} disabled={!isRecording} style={{ minHeight: 54, fontWeight: 1000, borderColor: paused ? `${accent}66` : undefined }}>{paused ? `▶ ${copy.resume}` : `Ⅱ ${copy.pause}`}</button>
          <button type="button" className="btn primary" onClick={() => void finishRun()} disabled={!isRecording} style={{ minHeight: 54, fontWeight: 1000, background: accent }}>■ {copy.finish}</button>
        </div>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <PageHeader title={copy.history} subtitle={`${activities.length} ${lang === "fr" ? "sorties" : lang === "es" ? "carreras" : "runs"}`} left={<BackDot onClick={() => go("home")} />} right={infoDot} />
        <TabBar view={view} setView={setView} labels={{ setup: copy.setup, history: copy.history, records: copy.records }} accent={accent} />
        {activities.length === 0 ? <EmptyState text={copy.empty} accent={accent} /> : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {activities.map((activity, index) => <HistoryCard key={activity.id} activity={activity} index={index} lang={lang} accent={accent} onClick={() => openActivity(activity)} />)}
          </div>
        )}
      </div>
    );
  }

  if (view === "records") {
    const recordRows = [
      { icon: "⚡", title: copy.pr1, item: stats.pr1 },
      { icon: "🎯", title: copy.pr5, item: stats.pr5 },
      { icon: "🔥", title: copy.pr10, item: stats.pr10 },
    ];
    return (
      <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <PageHeader title={copy.records} subtitle={copy.title} left={<BackDot onClick={() => go("home")} />} right={infoDot} />
        <TabBar view={view} setView={setView} labels={{ setup: copy.setup, history: copy.history, records: copy.records }} accent={accent} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, margin: "12px 0" }}>
          <MiniStat label={copy.week} value={`${(stats.weekM / 1000).toFixed(1)} km`} accent={accent} />
          <MiniStat label={copy.longest} value={formatDistance(stats.longest)} accent={accent} />
          <MiniStat label={copy.bestPace} value={`${formatPace(stats.bestPace)} /km`} accent={accent} />
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {recordRows.map((row) => (
            <div className="card" key={row.title} style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 12, alignItems: "center", padding: 13 }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 23 }}>{row.icon}</div>
              <div><div style={{ fontSize: 10.5, letterSpacing: .8, fontWeight: 1000, color: textSoft }}>{row.title}</div><div style={{ fontSize: 23, fontWeight: 1000, color: row.item ? accent : undefined, marginTop: 3 }}>{row.item ? formatDuration(row.item.elapsedMs) : copy.noRecord}</div></div>
              {row.item ? <div style={{ fontSize: 10.5, textAlign: "right", color: textSoft }}>{formatPace(row.item.avgPaceSecPerKm)} /km<br />{activityDate(row.item.startedAt, lang)}</div> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "detail" && selected) {
    return (
      <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <PageHeader title={copy.complete} subtitle={activityDate(selected.startedAt, lang)} left={<BackDot onClick={() => setView("history")} />} right={infoDot} />
        <div className="card" style={{ textAlign: "center", borderColor: `${accent}44`, padding: "18px 14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 999, border: `1px solid ${accent}55`, color: accent, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>✓ {copy.verified}</div>
          <div style={{ fontSize: "clamp(42px,12vw,64px)", lineHeight: 1, fontWeight: 1000, color: accent, marginTop: 13 }}>{formatDistance(selected.distanceM)}</div>
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900 }}>{targetLabel(normalizeTarget(selected.targetDistanceM), lang)}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginTop: 10 }}>
          <Metric icon="⏱" label={copy.time} value={formatDuration(selected.elapsedMs)} accent={accent} />
          <Metric icon="🎯" label={copy.pace} value={`${formatPace(selected.avgPaceSecPerKm)} /km`} accent={accent} />
          <Metric icon="⚡" label={copy.speed} value={`${(selected.avgSpeedMps * 3.6).toFixed(1)} km/h`} accent={accent} />
          <Metric icon="⛰" label={copy.elevation} value={`+${Math.round(selected.elevationGainM)} m`} accent={accent} />
        </div>

        <div style={{ marginTop: 12 }}><Section title={copy.route}><RouteMap points={selected.route} accent={accent} waiting={copy.waiting} /></Section></div>
        <div style={{ marginTop: 12 }}><Section title={copy.splits}>{selected.splits.length ? <SplitTable splits={selected.splits} accent={accent} /> : <div style={{ fontSize: 12, color: textSoft }}>{copy.noSplits}</div>}</Section></div>
        <button type="button" className="btn danger" style={{ width: "100%", marginTop: 4, fontWeight: 950 }} onClick={() => void removeSelected()}>{copy.delete}</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: PAGE_MAX_WIDTH }}>
      <PageHeader title={copy.title} subtitle={copy.setupSub} left={<BackDot onClick={() => go("home")} />} right={infoDot} />
      <div style={{ textAlign: "center", margin: "2px 0 10px" }}><span style={{ display: "inline-flex", padding: "5px 9px", borderRadius: 999, border: `1px solid ${accent}45`, background: `${accent}0e`, color: accent, fontSize: 9.5, fontWeight: 1000, letterSpacing: .7 }}>{copy.beta}</span></div>
      <TabBar view={view} setView={setView} labels={{ setup: copy.setup, history: copy.history, records: copy.records }} accent={accent} />

      <div style={{ marginTop: 12 }}>
        <Section title={copy.select}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {TARGETS.map((target) => {
              const label = lang === "fr" ? target.fr : lang === "es" ? target.es : target.en;
              const subtitle = lang === "fr" ? target.subFr : lang === "es" ? target.subEs : target.subEn;
              return <TargetCard key={String(target.value)} icon={target.icon} label={label} subtitle={subtitle} accent={accent} onClick={() => beginRun(target.value)} />;
            })}
          </div>
        </Section>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 13, display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 12, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 22 }}>📍</div>
        <div><div style={{ fontWeight: 1000, fontSize: 12 }}>{copy.gpsTitle}</div><div style={{ color: textSoft, marginTop: 3, fontSize: 10.5, lineHeight: 1.35 }}>{copy.gpsReady}</div></div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 1000 }}>READY</div>
      </div>
      <div style={{ fontSize: 10.5, color: textSoft, lineHeight: 1.45, padding: "8px 4px 0" }}>{copy.gpsHint}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
        <InfoCard icon="🔒" title={copy.local} subtitle={copy.localSub} accent={accent} />
        <InfoCard icon="⌚" title={copy.devices} subtitle={copy.devicesSub} accent={accent} badge={copy.soon} />
      </div>
    </div>
  );
}

function TabBar({ view, setView, labels, accent }: { view: View; setView: (view: View) => void; labels: { setup: string; history: string; records: string }; accent: string }) {
  const items: Array<{ key: View; label: string; icon: string }> = [
    { key: "setup", label: labels.setup, icon: "🏃" },
    { key: "history", label: labels.history, icon: "📊" },
    { key: "records", label: labels.records, icon: "🏆" },
  ];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, padding: 6, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.18)" }}>{items.map((item) => { const active = view === item.key; return <button key={item.key} type="button" onClick={() => setView(item.key)} style={{ borderRadius: 12, border: `1px solid ${active ? `${accent}55` : "transparent"}`, background: active ? `${accent}14` : "transparent", color: active ? accent : "inherit", padding: "9px 6px", fontSize: 10.5, fontWeight: 1000, cursor: "pointer" }}><span style={{ marginRight: 5 }}>{item.icon}</span>{item.label}</button>; })}</div>;
}

function TargetCard({ icon, label, subtitle, accent, onClick }: { icon: string; label: string; subtitle: string; accent: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 132, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", color: "inherit", padding: 13, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 14, background: `${accent}14`, border: `1px solid ${accent}34`, fontSize: 20 }}>{icon}</div><span style={{ color: accent, fontWeight: 1000 }}>›</span></div><div><div style={{ fontSize: 13.5, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.4, opacity: .62 }}>{subtitle}</div></div></button>;
}

function InfoCard({ icon, title, subtitle, accent, badge }: { icon: string; title: string; subtitle: string; accent: string; badge?: string }) {
  return <div className="card" style={{ padding: 12, minHeight: 126, position: "relative" }}>{badge ? <div style={{ position: "absolute", top: 9, right: 9, color: accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .7 }}>{badge}</div> : null}<div style={{ fontSize: 22 }}>{icon}</div><div style={{ fontSize: 11.5, fontWeight: 1000, marginTop: 13 }}>{title}</div><div style={{ fontSize: 10, opacity: .6, lineHeight: 1.4, marginTop: 5 }}>{subtitle}</div></div>;
}

function Metric({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return <div className="card" style={{ padding: 12, minHeight: 88 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>{icon}</span><span style={{ fontSize: 9.5, fontWeight: 1000, letterSpacing: .8, opacity: .55 }}>{label}</span></div><div style={{ fontSize: 20, fontWeight: 1000, color: accent, marginTop: 10 }}>{value}</div></div>;
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="card" style={{ padding: 10, textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 1000, color: accent }}>{value}</div><div style={{ fontSize: 8.5, fontWeight: 950, opacity: .56, marginTop: 5 }}>{label}</div></div>;
}

function HistoryCard({ activity, index, lang, accent, onClick }: { activity: ActivityRecord; index: number; lang: string; accent: string; onClick: () => void }) {
  return <button type="button" className="card" onClick={onClick} style={{ width: "100%", color: "inherit", cursor: "pointer", textAlign: "left", display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center", padding: 12 }}><div style={{ width: 46, height: 46, borderRadius: 15, display: "grid", placeItems: "center", background: `${accent}${index === 0 ? "20" : "10"}`, border: `1px solid ${accent}${index === 0 ? "46" : "24"}`, fontSize: 20 }}>{index === 0 ? "🏃" : "↗"}</div><div><div style={{ fontSize: 14, fontWeight: 1000 }}>{formatDistance(activity.distanceM)} · {targetLabel(normalizeTarget(activity.targetDistanceM), lang)}</div><div style={{ fontSize: 10.5, opacity: .6, marginTop: 4 }}>{activityDate(activity.startedAt, lang)} · {formatDuration(activity.elapsedMs)}</div><div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 5, fontSize: 10.5 }}><span style={{ color: accent, fontWeight: 900 }}>{formatPace(activity.avgPaceSecPerKm)} /km</span><span>+{Math.round(activity.elevationGainM)} m</span></div></div><div style={{ color: accent, fontWeight: 1000, fontSize: 20 }}>›</div></button>;
}

function EmptyState({ text, accent }: { text: string; accent: string }) {
  return <div className="card" style={{ marginTop: 12, padding: 30, textAlign: "center" }}><div style={{ width: 62, height: 62, margin: "0 auto", borderRadius: 20, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}30`, fontSize: 28 }}>🏃</div><div style={{ marginTop: 13, fontSize: 12, opacity: .62 }}>{text}</div></div>;
}

function SplitTable({ splits, accent }: { splits: ActivityRecord["splits"]; accent: string }) {
  return <div style={{ display: "grid", gap: 2 }}>{splits.map((split) => <div key={`${split.index}-${split.elapsedMs}`} style={{ display: "grid", gridTemplateColumns: "58px 1fr auto", gap: 10, padding: "9px 2px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.065)" }}><div style={{ fontSize: 11, fontWeight: 1000, color: accent }}>KM {split.index}</div><div style={{ fontSize: 12, fontWeight: 900 }}>{formatDuration(split.splitMs)}</div><div style={{ fontSize: 10.5, opacity: .62 }}>{formatPace(split.paceSecPerKm)} /km</div></div>)}</div>;
}

function Progress({ value, accent }: { value: number; accent: string }) {
  const width = Math.max(0, Math.min(100, value));
  return <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 7 }}><div style={{ height: "100%", width: `${width}%`, borderRadius: 999, background: accent, boxShadow: `0 0 14px ${accent}66`, transition: "width .22s ease" }} /></div>;
}

function RouteMap({ points, accent, waiting }: { points: GeoPoint[]; accent: string; waiting: string }) {
  const layout = React.useMemo(() => buildMapLayout(points), [points]);
  return <div style={{ width: "100%", aspectRatio: "5 / 3", minHeight: 210, maxHeight: 350, position: "relative", overflow: "hidden", borderRadius: 16, background: "#0a0d14", border: "1px solid rgba(255,255,255,.08)" }}>
    {layout ? <>
      {layout.tiles.map((tile) => <img key={`${tile.z}-${tile.x}-${tile.y}`} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${(tile.left / layout.width) * 100}%`, top: `${(tile.top / layout.height) * 100}%`, width: `${(256 / layout.width) * 100}%`, height: `${(256 / layout.height) * 100}%`, objectFit: "cover", userSelect: "none", filter: "saturate(.72) brightness(.72) contrast(1.08)" }} />)}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(4,7,12,.04),rgba(4,7,12,.22))", pointerEvents: "none" }} />
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <polyline points={layout.polyline} fill="none" stroke="rgba(0,0,0,.82)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={layout.polyline} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {layout.start ? <circle cx={layout.start.x} cy={layout.start.y} r="10" fill="#1ed86e" stroke="#fff" strokeWidth="3" /> : null}
        {layout.end ? <circle cx={layout.end.x} cy={layout.end.y} r="10" fill="#ff5868" stroke="#fff" strokeWidth="3" /> : null}
      </svg>
    </> : <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)", backgroundSize: "28px 28px" }}><div style={{ width: 56, height: 56, margin: "0 auto 10px", borderRadius: 18, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}34`, fontSize: 24 }}>📍</div><div style={{ fontSize: 11, opacity: .62 }}>{waiting}</div></div>}
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", right: 5, bottom: 4, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.68)", color: "#fff", fontSize: 8, textDecoration: "none", zIndex: 4 }}>© OpenStreetMap</a>
  </div>;
}

type MapLayout = { width: number; height: number; polyline: string; start: { x: number; y: number } | null; end: { x: number; y: number } | null; tiles: Array<{ z: number; x: number; y: number; left: number; top: number; url: string }> };

function buildMapLayout(points: GeoPoint[]): MapLayout | null {
  if (!points.length) return null;
  const width = 1000;
  const height = 600;
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 18;
  for (let z = 18; z >= 3; z -= 1) {
    const pixels = points.map((point) => mercatorPixel(point.lat, point.lon, z));
    const xs = pixels.map((point) => point.x);
    const ys = pixels.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .78 && Math.max(...ys) - Math.min(...ys) <= height * .72) { zoom = z; break; }
  }
  const center = mercatorPixel(centerLat, centerLon, zoom);
  const screen = points.map((point) => { const world = mercatorPixel(point.lat, point.lon, zoom); return { x: world.x - center.x + width / 2, y: world.y - center.y + height / 2 }; });
  const minTileX = Math.floor((center.x - width / 2) / 256) - 1;
  const maxTileX = Math.floor((center.x + width / 2) / 256) + 1;
  const minTileY = Math.floor((center.y - height / 2) / 256) - 1;
  const maxTileY = Math.floor((center.y + height / 2) / 256) + 1;
  const tileCount = 2 ** zoom;
  const tiles: MapLayout["tiles"] = [];
  for (let tx = minTileX; tx <= maxTileX; tx += 1) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= tileCount) continue;
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
      tiles.push({ z: zoom, x: tx, y: ty, left: tx * 256 - center.x + width / 2, top: ty * 256 - center.y + height / 2, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png` });
    }
  }
  return { width, height, tiles, polyline: screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "), start: screen[0] || null, end: screen[screen.length - 1] || null };
}

function mercatorPixel(lat: number, lon: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((clamped * Math.PI) / 180);
  return { x: ((lon + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

const PAGE_MAX_WIDTH = 620;
const statusPill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 999, border: "1px solid", background: "rgba(0,0,0,.30)", fontSize: 10, fontWeight: 1000, letterSpacing: .8 };
const statusDot: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, flex: "0 0 auto" };
const warning: React.CSSProperties = { marginTop: 10, padding: "10px 12px", borderRadius: 13, background: "rgba(255,164,54,.10)", border: "1px solid rgba(255,177,64,.25)", color: "#ffd28f", fontSize: 11, lineHeight: 1.4 };
const recordDock: React.CSSProperties = { position: "fixed", left: "max(12px,env(safe-area-inset-left))", right: "max(12px,env(safe-area-inset-right))", bottom: "calc(82px + env(safe-area-inset-bottom))", zIndex: 45, maxWidth: 594, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 9, padding: 8, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(8,9,14,.88)", backdropFilter: "blur(16px)", boxShadow: "0 16px 40px rgba(0,0,0,.55)" };
