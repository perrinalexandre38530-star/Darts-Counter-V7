import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { buildOutdoorRouteCheckpoints, estimateOutdoorRouteDurationMs, outdoorDirectionalGuidance, outdoorRouteProgress, outdoorRouteRejoinPlan, type OutdoorTurnKind } from "../../activity/outdoorNavigation";
import { outdoorRerouteMatchedDistanceM, rerouteAsRunningRoute, type OutdoorRouteRerouteResult } from "../../activity/outdoorRouteRerouting";
import type { GeoPoint } from "../../activity/activityTypes";
import { gpsIntervalSecForBatteryMode, type OutdoorLongDistancePrefs } from "../../activity/outdoorLongDistance";
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
  previousPoint?: GeoPoint | null;
  liveElevationGainM?: number;
  extras?: OutdoorRouteExtras | null;
  longDistancePrefs?: OutdoorLongDistancePrefs | null;
  onOpenMap?: () => void;
  reroute?: OutdoorRouteRerouteResult | null;
  rerouteBusy?: boolean;
  rerouteError?: string | null;
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

export default function OutdoorRouteNavigationPanel({ route, sport, lang, accent, textSoft, mode = "preview", liveDistanceM = 0, elapsedMs = 0, currentPoint = null, previousPoint = null, liveElevationGainM = 0, extras: extrasProp = null, longDistancePrefs = null, onOpenMap, reroute = null, rerouteBusy = false, rerouteError = null }: Props) {
  const extras = extrasProp || loadOutdoorRouteExtras(route.id);
  const checkpoints = React.useMemo(() => buildOutdoorRouteCheckpoints(route, sport, extras.waypoints), [extras.waypoints, route, sport]);
  const expectedMs = React.useMemo(() => estimateOutdoorRouteDurationMs(route, sport), [route, sport]);
  const live = React.useMemo(() => mode === "live" ? outdoorRouteProgress(route, sport, liveDistanceM, elapsedMs, currentPoint, liveElevationGainM, extras.waypoints, extras.offRouteAlertM) : null, [currentPoint, elapsedMs, extras.offRouteAlertM, extras.waypoints, liveDistanceM, liveElevationGainM, mode, route, sport]);
  const guidance = React.useMemo(() => outdoorDirectionalGuidance(route, live?.matchedDistanceM ?? 0, currentPoint, previousPoint), [currentPoint, live?.matchedDistanceM, previousPoint, route]);
  const rejoin = React.useMemo(() => live?.offRouteAlert ? outdoorRouteRejoinPlan(route, currentPoint, live.matchedDistanceM) : null, [currentPoint, live?.matchedDistanceM, live?.offRouteAlert, route]);
  const rerouteRoute = React.useMemo(() => reroute ? rerouteAsRunningRoute(reroute, sport) : null, [reroute, sport]);
  const rerouteMatchedM = React.useMemo(() => reroute ? outdoorRerouteMatchedDistanceM(reroute, currentPoint) : 0, [currentPoint, reroute]);
  const rerouteGuidance = React.useMemo(() => rerouteRoute && live?.offRouteAlert ? outdoorDirectionalGuidance(rerouteRoute, rerouteMatchedM, currentPoint, previousPoint) : null, [currentPoint, live?.offRouteAlert, previousPoint, rerouteMatchedM, rerouteRoute]);
  const activeGuidance = live?.offRouteAlert && rerouteGuidance ? rerouteGuidance : guidance;
  const rerouteRemainingM = reroute ? Math.max(0, reroute.distanceM - rerouteMatchedM) : null;
  const t = lang.startsWith("fr") ? {
    preview: "PRÉPARATION PARCOURS", live: "NAVIGATION PARCOURS", estimate: "DURÉE EST.", checkpoints: "REPÈRES", next: "PROCHAIN", remaining: "RESTANT", eta: "ETA", routeGap: "ÉCART TRACÉ", vertical: "VITESSE VERT.", progress: "PROGRESSION", estimateHint: "Estimation indicative selon la distance, le sport et le dénivelé.", onRoute: "SUR LE TRACÉ", alert: "HORS TRACÉ", ahead: "2 KM À VENIR", gain: "D+ À VENIR", grade: "PENTE MOY.", maxGrade: "PENTE MAX", wrongWay: "MAUVAIS SENS", direction: "GUIDAGE", map: "CARTE PLEIN ÉCRAN", recalc: "REROUTAGE OSM", localRecalc: "RECALCUL LOCAL", calculating: "RECHERCHE D'UN CHEMIN…", rejoin: "REJOINDRE LE TRACÉ", resume: "REPRISE",
  } : lang.startsWith("es") ? {
    preview: "PREPARACIÓN DE RUTA", live: "NAVEGACIÓN DE RUTA", estimate: "DURACIÓN EST.", checkpoints: "PUNTOS", next: "SIGUIENTE", remaining: "RESTANTE", eta: "ETA", routeGap: "DESVÍO", vertical: "VEL. VERTICAL", progress: "PROGRESO", estimateHint: "Estimación orientativa según distancia, actividad y desnivel.", onRoute: "EN RUTA", alert: "FUERA DE RUTA", ahead: "PRÓXIMOS 2 KM", gain: "D+ PRÓXIMO", grade: "PEND. MEDIA", maxGrade: "PEND. MAX", wrongWay: "SENTIDO INCORRECTO", direction: "GUIADO", map: "MAPA COMPLETO", recalc: "REROUTING OSM", localRecalc: "RECÁLCULO LOCAL", calculating: "BUSCANDO UN CAMINO…", rejoin: "VOLVER A LA RUTA", resume: "REINCORP.",
  } : {
    preview: "ROUTE PREPARATION", live: "ROUTE NAVIGATION", estimate: "EST. TIME", checkpoints: "CHECKPOINTS", next: "NEXT", remaining: "REMAINING", eta: "ETA", routeGap: "OFF ROUTE", vertical: "VERTICAL SPEED", progress: "PROGRESS", estimateHint: "Indicative estimate based on distance, activity and elevation.", onRoute: "ON ROUTE", alert: "OFF ROUTE", ahead: "NEXT 2 KM", gain: "GAIN AHEAD", grade: "AVG GRADE", maxGrade: "MAX GRADE", wrongWay: "WRONG WAY", direction: "GUIDANCE", map: "FULL MAP", recalc: "OSM REROUTING", localRecalc: "LOCAL RECALC", calculating: "FINDING A PATH…", rejoin: "REJOIN ROUTE", resume: "REJOIN",
  };

  const next = live?.nextCheckpoint || checkpoints[0] || null;
  const offRoute = live?.offRouteM;
  const offRouteColor = live?.offRouteAlert ? "#ff756d" : accent;
  const turnIcon = (kind: OutdoorTurnKind) => kind === "left" ? "↰" : kind === "sharp-left" ? "↶" : kind === "slight-left" ? "↖" : kind === "right" ? "↱" : kind === "sharp-right" ? "↷" : kind === "slight-right" ? "↗" : kind === "u-turn" ? "↩" : kind === "finish" ? "🏁" : "↑";
  const turnLabel = (kind: OutdoorTurnKind) => {
    const fr: Record<OutdoorTurnKind, string> = { "straight": "CONTINUE TOUT DROIT", "slight-left": "LÉGÈREMENT À GAUCHE", "left": "TOURNE À GAUCHE", "sharp-left": "FORT À GAUCHE", "slight-right": "LÉGÈREMENT À DROITE", "right": "TOURNE À DROITE", "sharp-right": "FORT À DROITE", "u-turn": "FAIS DEMI-TOUR", "finish": "ARRIVÉE" };
    const en: Record<OutdoorTurnKind, string> = { "straight": "KEEP STRAIGHT", "slight-left": "SLIGHT LEFT", "left": "TURN LEFT", "sharp-left": "SHARP LEFT", "slight-right": "SLIGHT RIGHT", "right": "TURN RIGHT", "sharp-right": "SHARP RIGHT", "u-turn": "U-TURN", "finish": "FINISH" };
    const es: Record<OutdoorTurnKind, string> = { "straight": "SIGUE RECTO", "slight-left": "LIGERO A LA IZQUIERDA", "left": "GIRA A LA IZQUIERDA", "sharp-left": "GIRO FUERTE IZQUIERDA", "slight-right": "LIGERO A LA DERECHA", "right": "GIRA A LA DERECHA", "sharp-right": "GIRO FUERTE DERECHA", "u-turn": "MEDIA VUELTA", "finish": "LLEGADA" };
    return lang.startsWith("fr") ? fr[kind] : lang.startsWith("es") ? es[kind] : en[kind];
  };

  return <RunningSurface accent={live?.offRouteAlert ? "#ff756d" : accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: live?.offRouteAlert ? "#ff9b94" : accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>{mode === "live" ? t.live : t.preview}</div><div style={{ display: "flex", gap: 5, alignItems: "center" }}>{mode === "live" && onOpenMap ? <button className="btn" onClick={onOpenMap} style={{ minHeight: 28, padding: "3px 7px", fontSize: 6.8, fontWeight: 1000, color: accent, borderColor: `${accent}44` }}>⛶ {t.map}</button> : null}{live ? <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${offRouteColor}48`, color: offRouteColor, fontSize: 7.2, fontWeight: 1000 }}>{live.offRouteAlert ? `${t.alert} · ${Math.round(offRoute || 0)} m` : t.onRoute}</span> : null}</div></div>

    {live ? <>
      {activeGuidance ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "68px 1fr auto", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, border: `1px solid ${activeGuidance.wrongWay ? "rgba(255,100,90,.48)" : `${accent}32`}`, background: activeGuidance.wrongWay ? "linear-gradient(145deg,rgba(255,80,70,.13),rgba(30,4,4,.55))" : `linear-gradient(145deg,${accent}10,rgba(4,6,10,.62))`, boxShadow: activeGuidance.wrongWay ? "0 12px 28px rgba(255,60,50,.10)" : `0 12px 28px ${accent}0b` }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, display: "grid", placeItems: "center", border: `1px solid ${activeGuidance.wrongWay ? "rgba(255,120,110,.55)" : `${accent}45`}`, background: activeGuidance.wrongWay ? "rgba(255,90,80,.12)" : `${accent}12`, color: activeGuidance.wrongWay ? "#ff9b94" : accent, fontSize: 36, fontWeight: 1000 }}>{activeGuidance.wrongWay ? "↩" : turnIcon(activeGuidance.kind)}</div>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 7.2, color: activeGuidance.wrongWay ? "#ff9b94" : textSoft, fontWeight: 1000, letterSpacing: .7 }}>{live.offRouteAlert && reroute ? t.recalc : activeGuidance.wrongWay ? t.wrongWay : t.direction}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000, color: activeGuidance.wrongWay ? "#ff9b94" : "inherit" }}>{activeGuidance.wrongWay ? turnLabel("u-turn") : turnLabel(activeGuidance.kind)}</div></div>
        <div style={{ textAlign: "right", color: activeGuidance.wrongWay ? "#ff9b94" : accent, fontSize: 12, fontWeight: 1000 }}>{activeGuidance.distanceM < 950 ? `${Math.max(0, Math.round(activeGuidance.distanceM / 10) * 10)} m` : `${(activeGuidance.distanceM / 1000).toFixed(1)} km`}</div>
      </div> : null}
      {live.offRouteAlert && rerouteBusy ? <div style={{ marginTop: 8, padding: 10, borderRadius: 14, border: `1px solid ${accent}38`, background: `${accent}0c`, color: textSoft, fontSize: 8.2 }}><b style={{ color: accent }}>{t.recalc}</b> · {t.calculating}</div> : null}
      {live.offRouteAlert && reroute ? <div style={{ marginTop: 8, padding: 10, borderRadius: 14, border: "1px solid rgba(255,169,70,.52)", background: "linear-gradient(145deg,rgba(255,157,54,.13),rgba(35,17,4,.62))" }}><div style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,169,70,.13)", border: "1px solid rgba(255,188,92,.45)", color: "#ffc26c", fontSize: 24 }}>↪</div><div><div style={{ fontSize: 7, color: "#ffc26c", fontWeight: 1000, letterSpacing: .7 }}>{t.recalc}</div><div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 1000 }}>{t.rejoin}</div><div style={{ marginTop: 2, fontSize: 7.4, color: textSoft }}>{t.resume} +{Math.round(reroute.forwardAdvanceM)} m · {formatDistance(reroute.routeRemainingAfterRejoinM)} {t.remaining.toLowerCase()}</div></div><div style={{ textAlign: "right", color: "#ffc26c", fontSize: 12, fontWeight: 1000 }}>{formatDistance(rerouteRemainingM ?? reroute.distanceM)}</div></div></div> : live.offRouteAlert && rejoin ? <div style={{ marginTop: 8, padding: 10, borderRadius: 14, border: "1px solid rgba(255,107,98,.48)", background: "linear-gradient(145deg,rgba(255,90,80,.13),rgba(35,4,4,.62))" }}><div style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,90,80,.13)", border: "1px solid rgba(255,120,110,.45)", color: "#ff9b94", fontSize: 24 }}>↪</div><div><div style={{ fontSize: 7, color: "#ff9b94", fontWeight: 1000, letterSpacing: .7 }}>{t.localRecalc}</div><div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 1000 }}>{t.rejoin}</div><div style={{ marginTop: 2, fontSize: 7.4, color: textSoft }}>{t.resume} +{Math.round(rejoin.forwardAdvanceM)} m · {formatDistance(rejoin.routeRemainingAfterRejoinM)} {t.remaining.toLowerCase()}</div></div><div style={{ textAlign: "right", color: "#ff9b94", fontSize: 12, fontWeight: 1000 }}>{formatDistance(rejoin.distanceToTargetM)}</div></div></div> : null}
      {live.offRouteAlert && rerouteError && !rerouteBusy && !reroute ? <div style={{ marginTop: 6, color: textSoft, fontSize: 7.3 }}>{t.localRecalc} · {rerouteError}</div> : null}
      <div style={{ marginTop: 9, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${live.progressPct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${accent},#fff)`, boxShadow: `0 0 14px ${accent}55` }}/></div>
      <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 7.4 }}><span>{t.progress} · {live.progressPct.toFixed(0)}%</span><span>{formatDistance(live.matchedDistanceM)} / {formatDistance(route.distanceM)}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 8 }}><Mini label={t.remaining} value={formatDistance(live.remainingM)} accent={accent}/><Mini label={t.eta} value={live.etaMs != null ? formatDuration(live.etaMs) : "—"} accent={accent}/><Mini label={t.next} value={next ? checkpointLabel(next, lang) : "—"} accent={accent}/><Mini label={t.routeGap} value={offRoute == null ? "—" : `${Math.round(offRoute)} m`} accent={offRouteColor}/></div>
      <div style={{ marginTop: 8, padding: 9, borderRadius: 12, border: `1px solid ${accent}22`, background: "linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.014))" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ color: accent, fontSize: 7.7, fontWeight: 1000 }}>{t.ahead}</div><div style={{ fontSize: 7.2, color: textSoft }}>{formatDistance(live.ahead.horizonM)}</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 6 }}><Mini label={t.gain} value={`+${Math.round(live.ahead.gainM)} m`} accent={accent}/><Mini label="D−" value={`-${Math.round(live.ahead.lossM)} m`} accent={accent}/><Mini label={t.grade} value={`${live.ahead.avgGradePct.toFixed(1)}%`} accent={accent}/><Mini label={t.maxGrade} value={`${live.ahead.maxGradePct.toFixed(1)}%`} accent={accent}/></div></div>
      {live.verticalSpeedMPerHour != null ? <div style={{ marginTop: 7, fontSize: 7.7, color: textSoft }}>{t.vertical} · <b style={{ color: accent }}>{Math.round(live.verticalSpeedMPerHour)} m/h</b>{live.nextCheckpointDistanceM != null && next ? ` · ${checkpointLabel(next, lang)} dans ${formatDistance(live.nextCheckpointDistanceM)}` : ""}</div> : null}
      {longDistancePrefs ? <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap" }}><span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${accent}2f`, background: `${accent}0b`, color: accent, fontSize: 6.9, fontWeight: 1000 }}>🔋 {longDistancePrefs.batteryMode.toUpperCase()} · GPS ~{gpsIntervalSecForBatteryMode(longDistancePrefs.batteryMode)} s</span>{longDistancePrefs.hydrationReminderMin ? <span style={{ padding: "4px 7px", borderRadius: 999, border: "1px solid rgba(96,200,255,.22)", color: "#8fd7ff", fontSize: 6.9, fontWeight: 1000 }}>💧 {longDistancePrefs.hydrationReminderMin} min</span> : null}{longDistancePrefs.fuelReminderMin ? <span style={{ padding: "4px 7px", borderRadius: 999, border: "1px solid rgba(255,198,86,.22)", color: "#ffd36d", fontSize: 6.9, fontWeight: 1000 }}>🥪 {longDistancePrefs.fuelReminderMin} min</span> : null}</div> : null}
    </> : <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}><Mini label={t.estimate} value={formatDuration(expectedMs)} accent={accent}/><Mini label="D+" value={`+${Math.round(route.elevationGainM || 0)} m`} accent={accent}/><Mini label={t.checkpoints} value={String(checkpoints.length)} accent={accent}/></div>
      <div style={{ marginTop: 7, color: textSoft, fontSize: 7.6, lineHeight: 1.4 }}>{t.estimateHint}</div>
      {checkpoints.length ? <div style={{ marginTop: 8, display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>{checkpoints.map((checkpoint) => <div key={checkpoint.id} style={{ flex: "0 0 auto", padding: "6px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", fontSize: 7.4, fontWeight: 900 }}><span style={{ color: checkpoint.kind === "custom" ? accent : undefined }}>{checkpointLabel(checkpoint, lang)}</span><span style={{ color: textSoft }}> · {formatDistance(checkpoint.distanceM)}</span></div>)}</div> : null}
    </>}
  </RunningSurface>;
}
