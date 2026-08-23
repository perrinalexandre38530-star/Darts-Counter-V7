import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { buildOutdoorRouteCheckpoints, estimateOutdoorRouteDurationMs, outdoorRouteProgress } from "../../activity/outdoorNavigation";
import type { GeoPoint } from "../../activity/activityTypes";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { loadOutdoorRouteExtras, waypointIcon, type OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

type Props = {
  route: RunningRouteTemplate;
  sport: OutdoorPerformanceSport;
  lang: string;
  accent: string;
  textSoft: string;
  mode?: "preview" | "live";
  liveDistanceM?: number;
  elapsedMs?: number;
  currentPoint?: GeoPoint | null;
  liveElevationGainM?: number;
  extras?: OutdoorRouteExtras | null;
};

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "8px 7px", borderRadius: 12, border: "1px solid rgba(255,255,255,.065)", background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)" }}><div style={{ fontSize: 7.3, opacity: .54, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000, color: accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function checkpointLabel(checkpoint: ReturnType<typeof buildOutdoorRouteCheckpoints>[number], lang: string) {
  if (checkpoint.kind === "custom") return `${checkpoint.icon || (checkpoint.customKind ? waypointIcon(checkpoint.customKind) : "📍")} ${checkpoint.name || "POI"}`;
  if (checkpoint.kind === "finish") return lang.startsWith("fr") ? "ARRIVÉE" : lang.startsWith("es") ? "LLEGADA" : "FINISH";
  if (checkpoint.kind === "high-point") return lang.startsWith("fr") ? "POINT HAUT" : lang.startsWith("es") ? "PUNTO ALTO" : "HIGH POINT";
  return `${Math.round(checkpoint.distanceM / 1000)} KM`;
}

export default function OutdoorRouteNavigationPanel({ route, sport, lang, accent, textSoft, mode = "preview", liveDistanceM = 0, elapsedMs = 0, currentPoint = null, liveElevationGainM = 0, extras: extrasProp = null }: Props) {
  const extras = extrasProp || loadOutdoorRouteExtras(route.id);
  const checkpoints = React.useMemo(() => buildOutdoorRouteCheckpoints(route, sport, extras.waypoints), [extras.waypoints, route, sport]);
  const expectedMs = React.useMemo(() => estimateOutdoorRouteDurationMs(route, sport), [route, sport]);
  const live = React.useMemo(() => mode === "live" ? outdoorRouteProgress(route, sport, liveDistanceM, elapsedMs, currentPoint, liveElevationGainM, extras.waypoints, extras.offRouteAlertM) : null, [currentPoint, elapsedMs, extras.offRouteAlertM, extras.waypoints, liveDistanceM, liveElevationGainM, mode, route, sport]);
  const t = lang.startsWith("fr") ? {
    preview: "PRÉPARATION PARCOURS", live: "NAVIGATION PARCOURS", estimate: "DURÉE EST.", checkpoints: "REPÈRES", next: "PROCHAIN", remaining: "RESTANT", eta: "ETA", routeGap: "ÉCART TRACÉ", vertical: "VITESSE VERT.", progress: "PROGRESSION", estimateHint: "Estimation indicative selon la distance, le sport et le dénivelé.", onRoute: "SUR LE TRACÉ", alert: "HORS TRACÉ", ahead: "2 KM À VENIR", gain: "D+ À VENIR", grade: "PENTE MOY.", maxGrade: "PENTE MAX",
  } : lang.startsWith("es") ? {
    preview: "PREPARACIÓN DE RUTA", live: "NAVEGACIÓN DE RUTA", estimate: "DURACIÓN EST.", checkpoints: "PUNTOS", next: "SIGUIENTE", remaining: "RESTANTE", eta: "ETA", routeGap: "DESVÍO", vertical: "VEL. VERTICAL", progress: "PROGRESO", estimateHint: "Estimación orientativa según distancia, actividad y desnivel.", onRoute: "EN RUTA", alert: "FUERA DE RUTA", ahead: "PRÓXIMOS 2 KM", gain: "D+ PRÓXIMO", grade: "PEND. MEDIA", maxGrade: "PEND. MAX",
  } : {
    preview: "ROUTE PREPARATION", live: "ROUTE NAVIGATION", estimate: "EST. TIME", checkpoints: "CHECKPOINTS", next: "NEXT", remaining: "REMAINING", eta: "ETA", routeGap: "OFF ROUTE", vertical: "VERTICAL SPEED", progress: "PROGRESS", estimateHint: "Indicative estimate based on distance, activity and elevation.", onRoute: "ON ROUTE", alert: "OFF ROUTE", ahead: "NEXT 2 KM", gain: "GAIN AHEAD", grade: "AVG GRADE", maxGrade: "MAX GRADE",
  };

  const next = live?.nextCheckpoint || checkpoints[0] || null;
  const offRoute = live?.offRouteM;
  const offRouteColor = live?.offRouteAlert ? "#ff756d" : accent;

  return <RunningSurface accent={live?.offRouteAlert ? "#ff756d" : accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: live?.offRouteAlert ? "#ff9b94" : accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>{mode === "live" ? t.live : t.preview}</div>{live ? <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${offRouteColor}48`, color: offRouteColor, fontSize: 7.2, fontWeight: 1000 }}>{live.offRouteAlert ? `${t.alert} · ${Math.round(offRoute || 0)} m` : t.onRoute}</span> : null}</div>

    {live ? <>
      <div style={{ marginTop: 9, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${live.progressPct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${accent},#fff)`, boxShadow: `0 0 14px ${accent}55` }}/></div>
      <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 7.4 }}><span>{t.progress} · {live.progressPct.toFixed(0)}%</span><span>{formatDistance(live.matchedDistanceM)} / {formatDistance(route.distanceM)}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 8 }}><Mini label={t.remaining} value={formatDistance(live.remainingM)} accent={accent}/><Mini label={t.eta} value={live.etaMs != null ? formatDuration(live.etaMs) : "—"} accent={accent}/><Mini label={t.next} value={next ? checkpointLabel(next, lang) : "—"} accent={accent}/><Mini label={t.routeGap} value={offRoute == null ? "—" : `${Math.round(offRoute)} m`} accent={offRouteColor}/></div>
      <div style={{ marginTop: 8, padding: 9, borderRadius: 12, border: `1px solid ${accent}22`, background: "linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.014))" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ color: accent, fontSize: 7.7, fontWeight: 1000 }}>{t.ahead}</div><div style={{ fontSize: 7.2, color: textSoft }}>{formatDistance(live.ahead.horizonM)}</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 6 }}><Mini label={t.gain} value={`+${Math.round(live.ahead.gainM)} m`} accent={accent}/><Mini label="D−" value={`-${Math.round(live.ahead.lossM)} m`} accent={accent}/><Mini label={t.grade} value={`${live.ahead.avgGradePct.toFixed(1)}%`} accent={accent}/><Mini label={t.maxGrade} value={`${live.ahead.maxGradePct.toFixed(1)}%`} accent={accent}/></div></div>
      {live.verticalSpeedMPerHour != null ? <div style={{ marginTop: 7, fontSize: 7.7, color: textSoft }}>{t.vertical} · <b style={{ color: accent }}>{Math.round(live.verticalSpeedMPerHour)} m/h</b>{live.nextCheckpointDistanceM != null && next ? ` · ${checkpointLabel(next, lang)} dans ${formatDistance(live.nextCheckpointDistanceM)}` : ""}</div> : null}
    </> : <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}><Mini label={t.estimate} value={formatDuration(expectedMs)} accent={accent}/><Mini label="D+" value={`+${Math.round(route.elevationGainM || 0)} m`} accent={accent}/><Mini label={t.checkpoints} value={String(checkpoints.length)} accent={accent}/></div>
      <div style={{ marginTop: 7, color: textSoft, fontSize: 7.6, lineHeight: 1.4 }}>{t.estimateHint}</div>
      {checkpoints.length ? <div style={{ marginTop: 8, display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>{checkpoints.map((checkpoint) => <div key={checkpoint.id} style={{ flex: "0 0 auto", padding: "6px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", fontSize: 7.4, fontWeight: 900 }}><span style={{ color: checkpoint.kind === "custom" ? accent : undefined }}>{checkpointLabel(checkpoint, lang)}</span><span style={{ color: textSoft }}> · {formatDistance(checkpoint.distanceM)}</span></div>)}</div> : null}
    </>}
  </RunningSurface>;
}
