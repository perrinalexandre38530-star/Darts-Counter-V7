import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
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

type View = "home" | "record" | "history" | "detail";
type TargetDistance = null | 1000 | 5000 | 10000;

type Props = {
  go: (route: any, params?: any) => void;
};

const TEXT = {
  fr: {
    sport: "RUNNING",
    subtitle: "Cours. Progresse. Défie.",
    backSports: "Sports",
    start: "DÉMARRER UNE COURSE",
    history: "HISTORIQUE",
    gpsReady: "GPS téléphone",
    gpsReadySub: "Enregistrement géolocalisé et tracé du parcours",
    devices: "APPAREILS CONNECTÉS",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — architecture prête",
    totalKm: "Distance totale",
    sessions: "Sessions",
    bestPace: "Meilleure allure",
    lastRun: "Dernière sortie",
    chooseGoal: "Objectif de la sortie",
    free: "Libre",
    oneK: "1 km",
    fiveK: "5 km",
    tenK: "10 km",
    acquiring: "Recherche GPS…",
    gpsGood: "GPS actif",
    gpsPaused: "En pause",
    distance: "DISTANCE",
    time: "TEMPS",
    pace: "ALLURE",
    speed: "VITESSE",
    elevation: "D+",
    accuracy: "PRÉCISION",
    pause: "PAUSE",
    resume: "REPRENDRE",
    finish: "TERMINER",
    cancel: "ANNULER",
    noGps: "La géolocalisation n'est pas disponible sur cet appareil.",
    gpsDenied: "Autorise la localisation pour enregistrer le parcours.",
    insufficient: "Pas encore assez de points GPS pour enregistrer cette sortie.",
    target: "Objectif",
    kmSplits: "SPLITS KM",
    noSplits: "Les splits apparaîtront après le premier kilomètre.",
    empty: "Aucune sortie enregistrée pour le moment.",
    verified: "GPS VÉRIFIÉ",
    localPrivacy: "V1 : le tracé reste stocké localement sur cet appareil.",
    delete: "SUPPRIMER",
    close: "RETOUR",
    live: "PARCOURS EN DIRECT",
    route: "TRACÉ DU PARCOURS",
    recent: "SORTIES RÉCENTES",
    stats: "MES STATS RUNNING",
  },
  en: {
    sport: "RUNNING",
    subtitle: "Run. Improve. Challenge.",
    backSports: "Sports",
    start: "START A RUN",
    history: "HISTORY",
    gpsReady: "Phone GPS",
    gpsReadySub: "Geolocated recording and route trace",
    devices: "CONNECTED DEVICES",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — architecture ready",
    totalKm: "Total distance",
    sessions: "Sessions",
    bestPace: "Best pace",
    lastRun: "Last run",
    chooseGoal: "Run goal",
    free: "Free",
    oneK: "1 km",
    fiveK: "5 km",
    tenK: "10 km",
    acquiring: "Acquiring GPS…",
    gpsGood: "GPS active",
    gpsPaused: "Paused",
    distance: "DISTANCE",
    time: "TIME",
    pace: "PACE",
    speed: "SPEED",
    elevation: "ELEVATION",
    accuracy: "ACCURACY",
    pause: "PAUSE",
    resume: "RESUME",
    finish: "FINISH",
    cancel: "CANCEL",
    noGps: "Geolocation is not available on this device.",
    gpsDenied: "Allow location access to record your route.",
    insufficient: "Not enough GPS points yet to save this run.",
    target: "Goal",
    kmSplits: "KM SPLITS",
    noSplits: "Splits will appear after the first kilometre.",
    empty: "No runs recorded yet.",
    verified: "GPS VERIFIED",
    localPrivacy: "V1: your route stays stored locally on this device.",
    delete: "DELETE",
    close: "BACK",
    live: "LIVE ROUTE",
    route: "ROUTE TRACE",
    recent: "RECENT RUNS",
    stats: "MY RUNNING STATS",
  },
  es: {
    sport: "RUNNING",
    subtitle: "Corre. Progresa. Compite.",
    backSports: "Deportes",
    start: "INICIAR CARRERA",
    history: "HISTORIAL",
    gpsReady: "GPS del teléfono",
    gpsReadySub: "Registro geolocalizado y trazado de la ruta",
    devices: "DISPOSITIVOS CONECTADOS",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — arquitectura preparada",
    totalKm: "Distancia total",
    sessions: "Sesiones",
    bestPace: "Mejor ritmo",
    lastRun: "Última carrera",
    chooseGoal: "Objetivo de la carrera",
    free: "Libre",
    oneK: "1 km",
    fiveK: "5 km",
    tenK: "10 km",
    acquiring: "Buscando GPS…",
    gpsGood: "GPS activo",
    gpsPaused: "En pausa",
    distance: "DISTANCIA",
    time: "TIEMPO",
    pace: "RITMO",
    speed: "VELOCIDAD",
    elevation: "D+",
    accuracy: "PRECISIÓN",
    pause: "PAUSA",
    resume: "REANUDAR",
    finish: "TERMINAR",
    cancel: "CANCELAR",
    noGps: "La geolocalización no está disponible en este dispositivo.",
    gpsDenied: "Autoriza la ubicación para registrar la ruta.",
    insufficient: "Aún no hay suficientes puntos GPS para guardar la carrera.",
    target: "Objetivo",
    kmSplits: "SPLITS KM",
    noSplits: "Los splits aparecerán después del primer kilómetro.",
    empty: "Todavía no hay carreras registradas.",
    verified: "GPS VERIFICADO",
    localPrivacy: "V1: la ruta queda guardada localmente en este dispositivo.",
    delete: "ELIMINAR",
    close: "VOLVER",
    live: "RUTA EN DIRECTO",
    route: "TRAZADO DE LA RUTA",
    recent: "CARRERAS RECIENTES",
    stats: "MIS ESTADÍSTICAS RUNNING",
  },
} as const;

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export default function RunningModule({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const t = lang === "fr" ? TEXT.fr : lang === "es" ? TEXT.es : TEXT.en;
  const accent = theme?.accent || theme?.accent1 || theme?.colors?.accent || "#74f7a5";

  const [view, setView] = React.useState<View>("home");
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [selected, setSelected] = React.useState<ActivityRecord | null>(null);
  const [targetDistance, setTargetDistance] = React.useState<TargetDistance>(null);
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

  const refreshActivities = React.useCallback(async () => {
    setActivities(await listActivities("running"));
  }, []);

  React.useEffect(() => {
    void refreshActivities();
  }, [refreshActivities]);

  React.useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [isRecording]);

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
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
    setGpsMessage(t.acquiring);
    pausedRef.current = false;
    pausedTotalRef.current = 0;
    pauseStartedRef.current = 0;
    startedAtRef.current = Date.now();
    setNow(startedAtRef.current);
    setPaused(false);
    setIsRecording(true);
    setView("record");

    if (!navigator.geolocation) {
      setGpsMessage(t.noGps);
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
          accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : undefined,
          altitude: Number.isFinite(coords.altitude) ? Number(coords.altitude) : undefined,
          speed: Number.isFinite(coords.speed) ? Number(coords.speed) : undefined,
        };
        setAccuracy(Number.isFinite(next.accuracy) ? Number(next.accuracy) : null);
        setGpsMessage(pausedRef.current ? t.gpsPaused : t.gpsGood);
        if (pausedRef.current) return;
        const previous = pointsRef.current[pointsRef.current.length - 1];
        if (!shouldAcceptRunningPoint(previous, next)) return;
        pointsRef.current = [...pointsRef.current, next];
        setPoints(pointsRef.current);
      },
      (error) => {
        setGpsMessage(error.code === 1 ? t.gpsDenied : `${t.acquiring} (${error.message})`);
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 }
    );
  }, [stopWatch, t]);

  const togglePause = React.useCallback(() => {
    if (!isRecording) return;
    if (!pausedRef.current) {
      pausedRef.current = true;
      pauseStartedRef.current = Date.now();
      setPaused(true);
      setGpsMessage(t.gpsPaused);
    } else {
      const resumedAt = Date.now();
      if (pauseStartedRef.current) pausedTotalRef.current += Math.max(0, resumedAt - pauseStartedRef.current);
      pauseStartedRef.current = 0;
      pausedRef.current = false;
      setPaused(false);
      setNow(resumedAt);
      setGpsMessage(t.gpsGood);
    }
  }, [isRecording, t.gpsGood, t.gpsPaused]);

  const cancelRun = React.useCallback(() => {
    stopWatch();
    setIsRecording(false);
    setPaused(false);
    pausedRef.current = false;
    pointsRef.current = [];
    setPoints([]);
    setGpsMessage("");
    setView("home");
  }, [stopWatch]);

  const finishRun = React.useCallback(async () => {
    if (pointsRef.current.length < 2) {
      setGpsMessage(t.insufficient);
      return;
    }
    stopWatch();
    const endedAt = Date.now();
    let pauseTotal = pausedTotalRef.current;
    if (pausedRef.current && pauseStartedRef.current) pauseTotal += endedAt - pauseStartedRef.current;
    const elapsed = Math.max(1, endedAt - startedAtRef.current - pauseTotal);
    const route = pointsRef.current;
    const distanceM = routeDistanceMeters(route);
    const pace = averagePaceSecPerKm(distanceM, elapsed);
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
      avgPaceSecPerKm: pace,
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
  }, [refreshActivities, stopWatch, t.insufficient, targetDistance]);

  const openActivity = React.useCallback((activity: ActivityRecord) => {
    setSelected(activity);
    setView("detail");
  }, []);

  const removeSelected = React.useCallback(async () => {
    if (!selected) return;
    await deleteActivity(selected.id);
    setSelected(null);
    await refreshActivities();
    setView("history");
  }, [refreshActivities, selected]);

  const totals = React.useMemo(() => {
    const totalM = activities.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const totalMs = activities.reduce((sum, item) => sum + Number(item.elapsedMs || 0), 0);
    const paces = activities.map((item) => item.avgPaceSecPerKm).filter((p): p is number => Number.isFinite(p) && Number(p) > 0);
    return {
      totalM,
      totalMs,
      bestPace: paces.length ? Math.min(...paces) : null,
      last: activities[0] || null,
    };
  }, [activities]);

  if (view === "record") {
    const progress = targetDistance ? Math.min(100, (liveDistance / targetDistance) * 100) : null;
    return (
      <Shell theme={theme}>
        <Header title={t.sport} subtitle={paused ? t.gpsPaused : gpsMessage || t.acquiring} accent={accent} onBack={cancelRun} backLabel={t.cancel} />
        <section style={sectionStyle(theme)}>
          <SectionTitle>{t.live}</SectionTitle>
          <RouteMap points={points} accent={accent} />
          {progress != null && (
            <div style={{ marginTop: 12 }}>
              <div style={miniRowStyle}><span>{t.target}: {(targetDistance! / 1000).toFixed(0)} km</span><strong>{Math.round(progress)}%</strong></div>
              <div style={progressTrack}><div style={{ ...progressFill, width: `${progress}%`, background: accent }} /></div>
            </div>
          )}
        </section>

        <div style={metricsGrid}>
          <Metric label={t.distance} value={formatDistance(liveDistance)} accent={accent} />
          <Metric label={t.time} value={formatDuration(elapsedMs)} accent={accent} />
          <Metric label={t.pace} value={`${formatPace(livePace)} /km`} accent={accent} />
          <Metric label={t.speed} value={`${liveSpeed.toFixed(1)} km/h`} accent={accent} />
          <Metric label={t.elevation} value={`+${Math.round(liveElevation)} m`} accent={accent} />
          <Metric label={t.accuracy} value={accuracy ? `±${Math.round(accuracy)} m` : "—"} accent={accent} />
        </div>

        {gpsMessage && gpsMessage !== t.gpsGood && gpsMessage !== t.gpsPaused && <div style={warningStyle}>{gpsMessage}</div>}

        <div style={recordActions}>
          <button style={secondaryButton(theme)} onClick={togglePause} disabled={!isRecording}>{paused ? t.resume : t.pause}</button>
          <button style={primaryButton(accent)} onClick={() => void finishRun()} disabled={!isRecording}>{t.finish}</button>
        </div>
      </Shell>
    );
  }

  if (view === "history") {
    return (
      <Shell theme={theme}>
        <Header title={t.history} subtitle={`${activities.length} ${t.sessions.toLowerCase()}`} accent={accent} onBack={() => setView("home")} backLabel={t.close} />
        {activities.length === 0 ? <EmptyState text={t.empty} /> : activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} accent={accent} onClick={() => openActivity(activity)} />
        ))}
      </Shell>
    );
  }

  if (view === "detail" && selected) {
    return (
      <Shell theme={theme}>
        <Header title={t.route} subtitle={new Date(selected.startedAt).toLocaleString()} accent={accent} onBack={() => setView("history")} backLabel={t.close} />
        <section style={sectionStyle(theme)}>
          <RouteMap points={selected.route} accent={accent} />
          <div style={{ ...verifiedPill, borderColor: `${accent}88`, color: accent }}>{t.verified}</div>
        </section>
        <div style={metricsGrid}>
          <Metric label={t.distance} value={formatDistance(selected.distanceM)} accent={accent} />
          <Metric label={t.time} value={formatDuration(selected.elapsedMs)} accent={accent} />
          <Metric label={t.pace} value={`${formatPace(selected.avgPaceSecPerKm)} /km`} accent={accent} />
          <Metric label={t.speed} value={`${(selected.avgSpeedMps * 3.6).toFixed(1)} km/h`} accent={accent} />
          <Metric label={t.elevation} value={`+${Math.round(selected.elevationGainM)} m`} accent={accent} />
          <Metric label={t.sessions} value={`${selected.route.length} GPS`} accent={accent} />
        </div>
        <section style={sectionStyle(theme)}>
          <SectionTitle>{t.kmSplits}</SectionTitle>
          {selected.splits.length === 0 ? <div style={mutedText}>{t.noSplits}</div> : selected.splits.map((split) => (
            <div key={split.index} style={splitRowStyle}>
              <strong>KM {split.index}</strong><span>{formatDuration(split.splitMs)}</span><span>{formatPace(split.paceSecPerKm)} /km</span>
            </div>
          ))}
        </section>
        <div style={privacyStyle}>{t.localPrivacy}</div>
        <button style={dangerButton} onClick={() => void removeSelected()}>{t.delete}</button>
      </Shell>
    );
  }

  const goalButtons: Array<{ value: TargetDistance; label: string }> = [
    { value: null, label: t.free },
    { value: 1000, label: t.oneK },
    { value: 5000, label: t.fiveK },
    { value: 10000, label: t.tenK },
  ];

  return (
    <Shell theme={theme}>
      <Header title={t.sport} subtitle={t.subtitle} accent={accent} onBack={() => go("gameSelect")} backLabel={t.backSports} />

      <section style={heroStyle(theme, accent)}>
        <div style={heroEyebrow}>{t.stats}</div>
        <div style={summaryGrid}>
          <Summary label={t.totalKm} value={(totals.totalM / 1000).toFixed(1)} suffix="km" />
          <Summary label={t.sessions} value={String(activities.length)} />
          <Summary label={t.bestPace} value={formatPace(totals.bestPace)} suffix="/km" />
        </div>
      </section>

      <section style={sectionStyle(theme)}>
        <SectionTitle>{t.chooseGoal}</SectionTitle>
        <div style={goalGrid}>
          {goalButtons.map((goal) => (
            <button key={String(goal.value)} style={goalButton(theme, accent)} onClick={() => beginRun(goal.value)}>{goal.label}</button>
          ))}
        </div>
        <button style={{ ...primaryButton(accent), width: "100%", marginTop: 12 }} onClick={() => beginRun(null)}>▶ {t.start}</button>
      </section>

      <button style={featureCard(theme)} onClick={() => beginRun(null)}>
        <span style={featureIcon}>📍</span><span><strong>{t.gpsReady}</strong><small>{t.gpsReadySub}</small></span><b>›</b>
      </button>
      <button style={featureCard(theme)} onClick={() => setView("history")}>
        <span style={featureIcon}>📊</span><span><strong>{t.history}</strong><small>{activities.length ? `${activities.length} ${t.sessions.toLowerCase()}` : t.empty}</small></span><b>›</b>
      </button>
      <div style={featureCard(theme)}>
        <span style={featureIcon}>⌚</span><span><strong>{t.devices}</strong><small>{t.devicesSub}</small></span><b style={{ opacity: 0.35 }}>›</b>
      </div>

      {totals.last && (
        <section style={sectionStyle(theme)}>
          <SectionTitle>{t.recent}</SectionTitle>
          {activities.slice(0, 3).map((activity) => <ActivityCard key={activity.id} activity={activity} accent={accent} onClick={() => openActivity(activity)} />)}
        </section>
      )}
    </Shell>
  );
}

function Shell({ theme, children }: { theme: any; children: React.ReactNode }) {
  return <main style={{ minHeight: "100vh", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 14px calc(env(safe-area-inset-bottom, 0px) + 28px)", background: theme?.pageBackground || theme?.bg || "#07090d", backgroundAttachment: "fixed", backgroundPosition: "center top", backgroundSize: "cover", color: "#fff", overflowX: "hidden" }}><div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>{children}</div></main>;
}

function Header({ title, subtitle, accent, onBack, backLabel }: { title: string; subtitle: string; accent: string; onBack: () => void; backLabel: string }) {
  return <header style={{ display: "grid", gridTemplateColumns: "76px 1fr 76px", alignItems: "center", gap: 8, marginBottom: 14 }}><button onClick={onBack} style={backButton}>← {backLabel}</button><div style={{ textAlign: "center" }}><div style={{ fontSize: 25, fontWeight: 950, letterSpacing: 1.4, color: accent }}>{title}</div><div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>{subtitle}</div></div><div /></header>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={metricCard}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, opacity: 0.62 }}>{label}</div><div style={{ marginTop: 5, fontSize: 21, fontWeight: 950, color: accent }}>{value}</div></div>;
}

function Summary({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <div><div style={{ fontSize: 22, fontWeight: 950 }}>{value}<small style={{ fontSize: 11, marginLeft: 4, opacity: 0.72 }}>{suffix}</small></div><div style={{ fontSize: 10, opacity: 0.62, marginTop: 3 }}>{label}</div></div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 1.1, opacity: 0.82, marginBottom: 10 }}>{children}</div>;
}

function ActivityCard({ activity, accent, onClick }: { activity: ActivityRecord; accent: string; onClick: () => void }) {
  return <button onClick={onClick} style={activityCardStyle}><div style={{ textAlign: "left" }}><div style={{ fontWeight: 900 }}>{new Date(activity.startedAt).toLocaleDateString()} · {formatDistance(activity.distanceM)}</div><div style={{ fontSize: 12, opacity: 0.66, marginTop: 4 }}>{formatDuration(activity.elapsedMs)} · {formatPace(activity.avgPaceSecPerKm)} /km · +{Math.round(activity.elevationGainM)} m</div></div><span style={{ color: accent, fontWeight: 950 }}>›</span></button>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: "center", opacity: 0.62 }}>{text}</div>;
}

function RouteMap({ points, accent }: { points: GeoPoint[]; accent: string }) {
  const layout = React.useMemo(() => buildMapLayout(points), [points]);
  return <div style={mapFrame}>
    {layout ? <>
      {layout.tiles.map((tile) => <img key={`${tile.z}-${tile.x}-${tile.y}`} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${(tile.left / layout.width) * 100}%`, top: `${(tile.top / layout.height) * 100}%`, width: `${(256 / layout.width) * 100}%`, height: `${(256 / layout.height) * 100}%`, objectFit: "cover", userSelect: "none" }} />)}
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <polyline points={layout.polyline} fill="none" stroke="rgba(0,0,0,0.72)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={layout.polyline} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {layout.start && <circle cx={layout.start.x} cy={layout.start.y} r="9" fill="#2ee66b" stroke="#fff" strokeWidth="3" />}
        {layout.end && <circle cx={layout.end.x} cy={layout.end.y} r="9" fill="#ff4d5f" stroke="#fff" strokeWidth="3" />}
      </svg>
    </> : <div style={mapPlaceholder}><span>GPS</span><small>Le tracé apparaîtra ici</small></div>}
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={attribution}>© OpenStreetMap</a>
  </div>;
}

type MapLayout = { width: number; height: number; polyline: string; start: { x: number; y: number } | null; end: { x: number; y: number } | null; tiles: Array<{ z: number; x: number; y: number; left: number; top: number; url: string }> };

function buildMapLayout(points: GeoPoint[]): MapLayout | null {
  if (!points.length) return null;
  const width = 1000;
  const height = 600;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 18;
  for (let z = 18; z >= 3; z -= 1) {
    const px = points.map((p) => mercatorPixel(p.lat, p.lon, z));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * 0.78 && Math.max(...ys) - Math.min(...ys) <= height * 0.72) { zoom = z; break; }
  }
  const center = mercatorPixel(centerLat, centerLon, zoom);
  const screen = points.map((p) => {
    const world = mercatorPixel(p.lat, p.lon, zoom);
    return { x: world.x - center.x + width / 2, y: world.y - center.y + height / 2 };
  });
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
  return { width, height, tiles, polyline: screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), start: screen[0] || null, end: screen[screen.length - 1] || null };
}

function mercatorPixel(lat: number, lon: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((clamped * Math.PI) / 180);
  return { x: ((lon + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

const backButton: React.CSSProperties = { border: "none", background: "transparent", color: "#fff", fontWeight: 800, fontSize: 11, padding: "9px 0", textAlign: "left", cursor: "pointer", opacity: 0.78 };
const metricsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9, margin: "10px 0" };
const metricCard: React.CSSProperties = { border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "13px 12px", background: "rgba(5,8,13,0.72)", backdropFilter: "blur(10px)" };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, textAlign: "center" };
const heroEyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 950, letterSpacing: 1, opacity: 0.68, marginBottom: 13, textAlign: "center" };
const goalGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 7 };
const recordActions: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginTop: 12 };
const warningStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, background: "rgba(255,170,0,0.13)", border: "1px solid rgba(255,190,50,0.25)", fontSize: 12, lineHeight: 1.4 };
const progressTrack: React.CSSProperties = { height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.10)" };
const progressFill: React.CSSProperties = { height: "100%", borderRadius: 999, transition: "width 220ms ease" };
const miniRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6, opacity: 0.8 };
const mutedText: React.CSSProperties = { fontSize: 12, opacity: 0.58, padding: "6px 0" };
const splitRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 0", fontSize: 12 };
const privacyStyle: React.CSSProperties = { margin: "10px 2px", padding: 10, borderRadius: 12, background: "rgba(80,160,255,0.08)", fontSize: 11, opacity: 0.72 };
const verifiedPill: React.CSSProperties = { display: "inline-flex", marginTop: 10, border: "1px solid", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 950, letterSpacing: 0.6 };
const dangerButton: React.CSSProperties = { width: "100%", marginTop: 8, borderRadius: 14, border: "1px solid rgba(255,70,85,0.35)", background: "rgba(255,70,85,0.12)", color: "#ff7180", fontWeight: 950, padding: "13px 16px", cursor: "pointer" };
const featureIcon: React.CSSProperties = { fontSize: 24, width: 34, textAlign: "center" };
const activityCardStyle: React.CSSProperties = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(5,8,13,0.62)", color: "#fff", borderRadius: 14, padding: "12px 13px", margin: "7px 0", cursor: "pointer" };
const mapFrame: React.CSSProperties = { width: "100%", aspectRatio: "5 / 3", maxHeight: 360, minHeight: 210, position: "relative", overflow: "hidden", borderRadius: 18, background: "#101821", border: "1px solid rgba(255,255,255,0.10)" };
const mapPlaceholder: React.CSSProperties = { position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "30px 30px" };
const attribution: React.CSSProperties = { position: "absolute", right: 5, bottom: 4, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 8, textDecoration: "none", zIndex: 4 };

function sectionStyle(theme: any): React.CSSProperties { return { border: "1px solid rgba(255,255,255,0.09)", background: theme?.cardBg || "rgba(5,8,13,0.68)", borderRadius: 18, padding: 13, margin: "10px 0", backdropFilter: "blur(12px)" }; }
function heroStyle(theme: any, accent: string): React.CSSProperties { return { ...sectionStyle(theme), padding: "17px 13px", boxShadow: `0 0 30px ${accent}18`, borderColor: `${accent}38` }; }
function primaryButton(accent: string): React.CSSProperties { return { border: "none", borderRadius: 14, padding: "14px 16px", background: accent, color: "#06110b", fontWeight: 950, letterSpacing: 0.4, cursor: "pointer" }; }
function secondaryButton(theme: any): React.CSSProperties { return { border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: "14px 16px", background: theme?.cardBg || "rgba(255,255,255,0.07)", color: "#fff", fontWeight: 900, cursor: "pointer" }; }
function goalButton(theme: any, accent: string): React.CSSProperties { return { border: `1px solid ${accent}44`, borderRadius: 12, padding: "10px 6px", background: theme?.cardBg || "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 850, fontSize: 12, cursor: "pointer" }; }
function featureCard(theme: any): React.CSSProperties { return { width: "100%", display: "grid", gridTemplateColumns: "42px 1fr 18px", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "13px 12px", margin: "8px 0", background: theme?.cardBg || "rgba(5,8,13,0.66)", color: "#fff", textAlign: "left", cursor: "pointer" }; }
