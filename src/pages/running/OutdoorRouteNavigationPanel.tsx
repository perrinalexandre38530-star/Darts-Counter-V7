import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { buildOutdoorRouteCheckpoints, estimateOutdoorRouteDurationMs, outdoorRouteProgress } from "../../activity/outdoorNavigation";
import type { GeoPoint } from "../../activity/activityTypes";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
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
};

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "8px 7px", borderRadius: 12, border: "1px solid rgba(255,255,255,.065)", background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)" }}><div style={{ fontSize: 7.3, opacity: .54, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000, color: accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function checkpointLabel(kind: "distance" | "high-point" | "finish", distanceM: number, lang: string) {
  if (kind === "finish") return lang.startsWith("fr") ? "ARRIVÉE" : lang.startsWith("es") ? "LLEGADA" : "FINISH";
  if (kind === "high-point") return lang.startsWith("fr") ? "POINT HAUT" : lang.startsWith("es") ? "PUNTO ALTO" : "HIGH POINT";
  return `${Math.round(distanceM / 1000)} KM`;
}

export default function OutdoorRouteNavigationPanel({ route, sport, lang, accent, textSoft, mode = "preview", liveDistanceM = 0, elapsedMs = 0, currentPoint = null, liveElevationGainM = 0 }: Props) {
  const checkpoints = React.useMemo(() => buildOutdoorRouteCheckpoints(route, sport), [route, sport]);
  const expectedMs = React.useMemo(() => estimateOutdoorRouteDurationMs(route, sport), [route, sport]);
  const live = React.useMemo(() => mode === "live" ? outdoorRouteProgress(route, sport, liveDistanceM, elapsedMs, currentPoint, liveElevationGainM) : null, [currentPoint, elapsedMs, liveDistanceM, liveElevationGainM, mode, route, sport]);
  const t = lang.startsWith("fr") ? {
    preview: "PRÉPARATION PARCOURS", live: "NAVIGATION PARCOURS", estimate: "DURÉE EST.", checkpoints: "REPÈRES", next: "PROCHAIN", remaining: "RESTANT", eta: "ETA", routeGap: "ÉCART TRACÉ", vertical: "VITESSE VERT.", progress: "PROGRESSION", estimateHint: "Estimation indicative selon la distance, le sport et le dénivelé.", onRoute: "SUR LE TRACÉ",
  } : lang.startsWith("es") ? {
    preview: "PREPARACIÓN DE RUTA", live: "NAVEGACIÓN DE RUTA", estimate: "DURACIÓN EST.", checkpoints: "PUNTOS", next: "SIGUIENTE", remaining: "RESTANTE", eta: "ETA", routeGap: "DESVÍO", vertical: "VEL. VERTICAL", progress: "PROGRESO", estimateHint: "Estimación orientativa según distancia, actividad y desnivel.", onRoute: "EN RUTA",
  } : {
    preview: "ROUTE PREPARATION", live: "ROUTE NAVIGATION", estimate: "EST. TIME", checkpoints: "CHECKPOINTS", next: "NEXT", remaining: "REMAINING", eta: "ETA", routeGap: "OFF ROUTE", vertical: "VERTICAL SPEED", progress: "PROGRESS", estimateHint: "Indicative estimate based on distance, activity and elevation.", onRoute: "ON ROUTE",
  };

  const next = live?.nextCheckpoint || checkpoints[0] || null;
  const offRoute = live?.offRouteM;
  const offRouteColor = offRoute != null && offRoute > 120 ? "#ff8a67" : accent;

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>{mode === "live" ? t.live : t.preview}</div>{live ? <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${offRouteColor}44`, color: offRouteColor, fontSize: 7.5, fontWeight: 1000 }}>{offRoute == null || offRoute <= 80 ? t.onRoute : `±${Math.round(offRoute)} m`}</span> : null}</div>

    {mode === "preview" ? <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 8 }}><Mini label={t.estimate} value={formatDuration(expectedMs)} accent={accent}/><Mini label={t.checkpoints} value={String(checkpoints.length)} accent={accent}/><Mini label="D+" value={`+${Math.round(route.elevationGainM || 0)} m`} accent={accent}/></div>
      <div style={{ marginTop: 8, color: textSoft, fontSize: 8.5, lineHeight: 1.4 }}>{t.estimateHint}</div>
      {checkpoints.length ? <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 8, scrollbarWidth: "none" }}>{checkpoints.map((checkpoint) => <span key={checkpoint.id} style={{ flex: "0 0 auto", padding: "5px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: checkpoint.kind === "finish" ? accent : textSoft, fontSize: 7.7, fontWeight: 1000 }}>{checkpointLabel(checkpoint.kind, checkpoint.distanceM, lang)}{checkpoint.altitudeM != null ? ` · ${Math.round(checkpoint.altitudeM)} m` : ""}</span>)}</div> : null}
    </> : <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 8 }}><Mini label={t.progress} value={`${Math.round(live?.progressPct || 0)}%`} accent={accent}/><Mini label={t.remaining} value={formatDistance(live?.remainingM || 0)} accent={accent}/><Mini label={t.eta} value={live?.etaMs != null ? formatDuration(live.etaMs) : "—"} accent={accent}/><Mini label={t.vertical} value={live?.verticalSpeedMPerHour != null ? `${Math.round(live.verticalSpeedMPerHour)} m/h` : "—"} accent={accent}/></div>
      <div style={{ height: 7, marginTop: 9, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, live?.progressPct || 0))}%`, height: "100%", borderRadius: 999, background: accent, boxShadow: `0 0 14px ${accent}55` }}/></div>
      {next ? <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginTop: 8, padding: "8px 9px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div><div style={{ fontSize: 7.5, color: textSoft, fontWeight: 1000 }}>{t.next}</div><div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 1000 }}>{checkpointLabel(next.kind, next.distanceM, lang)}{next.altitudeM != null ? ` · ${Math.round(next.altitudeM)} m` : ""}</div></div><div style={{ color: accent, fontWeight: 1000, fontSize: 10 }}>{formatDistance(Math.max(0, next.distanceM - (live?.matchedDistanceM || 0)))}</div></div> : null}
    </>}
  </RunningSurface>;
}
