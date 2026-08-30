import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import type { GeoPoint } from "../../activity/activityTypes";
import {
  cumulativeOutdoorRouteDistances,
  outdoorBearingDegrees,
  outdoorDirectionalGuidance,
  outdoorRouteProgress,
  outdoorRouteRejoinPlan,
  type OutdoorTurnKind,
} from "../../activity/outdoorNavigation";
import { outdoorRerouteMatchedDistanceM, rerouteAsRunningRoute, type OutdoorRouteRerouteResult } from "../../activity/outdoorRouteRerouting";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import RunningTerrain3DMap from "./RunningTerrain3DMap";
import "./runningResponsive.css";

type Props = {
  route: RunningRouteTemplate;
  track: GeoPoint[];
  sport: OutdoorPerformanceSport;
  lang: string;
  accent: string;
  textSoft: string;
  liveDistanceM: number;
  elapsedMs: number;
  liveElevationGainM?: number;
  extras: OutdoorRouteExtras;
  reroute?: OutdoorRouteRerouteResult | null;
  rerouteBusy?: boolean;
  onClose: () => void;
};

type Layout = {
  width: number;
  height: number;
  zoom: number;
  center: { x: number; y: number };
  tiles: Array<{ z: number; x: number; y: number; left: number; top: number; url: string; routeOverlayUrl: string }>;
};

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function mercatorPixel(lat: number, lon: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin(clamped * Math.PI / 180);
  return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

function mercatorLatLon(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const lon = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
  return { lat, lon };
}
function pointerDistance(a: {x:number;y:number}, b: {x:number;y:number}) { return Math.hypot(a.x-b.x,a.y-b.y); }
function screenPoint(point: GeoPoint, layout: Layout) {
  const world = mercatorPixel(point.lat, point.lon, layout.zoom);
  return { x: world.x - layout.center.x + layout.width / 2, y: world.y - layout.center.y + layout.height / 2 };
}
function routePointAtDistance(route: RunningRouteTemplate, distanceM: number) {
  const points = route.route || [];
  const distances = cumulativeOutdoorRouteDistances(points);
  if (!points.length) return null;
  let index = distances.findIndex((distance) => distance >= distanceM);
  if (index < 0) index = points.length - 1;
  return points[index] || null;
}
function fitZoom(points: GeoPoint[], width: number, height: number) {
  if (!points.length) return 15;
  for (let zoom = 18; zoom >= 3; zoom -= 1) {
    const projected = points.map((point) => mercatorPixel(point.lat, point.lon, zoom));
    const xs = projected.map((point) => point.x), ys = projected.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .78 && Math.max(...ys) - Math.min(...ys) <= height * .68) return zoom;
  }
  return 3;
}
function buildLayout(centerPoint: GeoPoint, zoom: number, width = 1000, height = 1600): Layout {
  const center = mercatorPixel(centerPoint.lat, centerPoint.lon, zoom);
  const minX = Math.floor((center.x - width / 2) / 256) - 1;
  const maxX = Math.floor((center.x + width / 2) / 256) + 1;
  const minY = Math.floor((center.y - height / 2) / 256) - 1;
  const maxY = Math.floor((center.y + height / 2) / 256) + 1;
  const count = 2 ** zoom;
  const tiles: Layout["tiles"] = [];
  for (let tx = minX; tx <= maxX; tx += 1) {
    for (let ty = minY; ty <= maxY; ty += 1) {
      if (ty < 0 || ty >= count) continue;
      const wrappedX = ((tx % count) + count) % count;
      tiles.push({
        z: zoom,
        x: tx,
        y: ty,
        left: tx * 256 - center.x + width / 2,
        top: ty * 256 - center.y + height / 2,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
        routeOverlayUrl: `https://tile.waymarkedtrails.org/hiking/${zoom}/${wrappedX}/${ty}.png`,
      });
    }
  }
  return { width, height, zoom, center, tiles };
}
function turnIcon(kind: OutdoorTurnKind) {
  return kind === "left" ? "↰" : kind === "sharp-left" ? "↶" : kind === "slight-left" ? "↖" : kind === "right" ? "↱" : kind === "sharp-right" ? "↷" : kind === "slight-right" ? "↗" : kind === "u-turn" ? "↩" : kind === "finish" ? "🏁" : "↑";
}
function turnLabel(kind: OutdoorTurnKind, lang: string) {
  const fr: Record<OutdoorTurnKind, string> = { straight: "CONTINUE TOUT DROIT", "slight-left": "LÉGÈREMENT À GAUCHE", left: "TOURNE À GAUCHE", "sharp-left": "FORT À GAUCHE", "slight-right": "LÉGÈREMENT À DROITE", right: "TOURNE À DROITE", "sharp-right": "FORT À DROITE", "u-turn": "FAIS DEMI-TOUR", finish: "ARRIVÉE" };
  const en: Record<OutdoorTurnKind, string> = { straight: "KEEP STRAIGHT", "slight-left": "SLIGHT LEFT", left: "TURN LEFT", "sharp-left": "SHARP LEFT", "slight-right": "SLIGHT RIGHT", right: "TURN RIGHT", "sharp-right": "SHARP RIGHT", "u-turn": "U-TURN", finish: "FINISH" };
  const es: Record<OutdoorTurnKind, string> = { straight: "SIGUE RECTO", "slight-left": "LIGERO A LA IZQUIERDA", left: "GIRA A LA IZQUIERDA", "sharp-left": "GIRO FUERTE IZQUIERDA", "slight-right": "LIGERO A LA DERECHA", right: "GIRA A LA DERECHA", "sharp-right": "GIRO FUERTE DERECHA", "u-turn": "MEDIA VUELTA", finish: "LLEGADA" };
  return lang.startsWith("fr") ? fr[kind] : lang.startsWith("es") ? es[kind] : en[kind];
}
function checkpointText(kind: string | undefined, name: string | undefined, lang: string) {
  if (name) return name;
  if (kind === "finish") return lang.startsWith("fr") ? "ARRIVÉE" : lang.startsWith("es") ? "LLEGADA" : "FINISH";
  if (kind === "high-point") return lang.startsWith("fr") ? "POINT CULMINANT" : lang.startsWith("es") ? "PUNTO ALTO" : "HIGH POINT";
  return lang.startsWith("fr") ? "REPÈRE" : lang.startsWith("es") ? "PUNTO" : "CHECKPOINT";
}

export default function OutdoorRouteLiveMap({ route, track, sport, lang, accent, textSoft, liveDistanceM, elapsedMs, liveElevationGainM = 0, extras, reroute = null, rerouteBusy = false, onClose }: Props) {
  const [follow, setFollow] = React.useState(true);
  const [zoomDelta, setZoomDelta] = React.useState(0);
  const [mapMode, setMapMode] = React.useState<"2d" | "3d">("2d");
  const [manualCenter, setManualCenter] = React.useState<GeoPoint | null>(null);
  const mapGestureRef = React.useRef<HTMLDivElement | null>(null);
  const pointerRef = React.useRef(new Map<number,{x:number;y:number}>());
  const dragRef = React.useRef<{id:number;x:number;y:number;center:{x:number;y:number}} | null>(null);
  const pinchRef = React.useRef<{distance:number;zoomDelta:number} | null>(null);
  const currentPoint = track[track.length - 1] || route.route[0] || null;
  const previousPoint = track[track.length - 2] || null;
  const progress = React.useMemo(() => outdoorRouteProgress(route, sport, liveDistanceM, elapsedMs, currentPoint, liveElevationGainM, extras.waypoints, extras.offRouteAlertM), [currentPoint, elapsedMs, extras.offRouteAlertM, extras.waypoints, liveDistanceM, liveElevationGainM, route, sport]);
  const guidance = React.useMemo(() => outdoorDirectionalGuidance(route, progress.matchedDistanceM, currentPoint, previousPoint), [currentPoint, previousPoint, progress.matchedDistanceM, route]);
  const rejoin = React.useMemo(() => progress.offRouteAlert ? outdoorRouteRejoinPlan(route, currentPoint, progress.matchedDistanceM) : null, [currentPoint, progress.matchedDistanceM, progress.offRouteAlert, route]);
  const rerouteRoute = React.useMemo(() => reroute ? rerouteAsRunningRoute(reroute, sport) : null, [reroute, sport]);
  const rerouteMatchedM = React.useMemo(() => reroute ? outdoorRerouteMatchedDistanceM(reroute, currentPoint) : 0, [currentPoint, reroute]);
  const rerouteGuidance = React.useMemo(() => rerouteRoute && progress.offRouteAlert ? outdoorDirectionalGuidance(rerouteRoute, rerouteMatchedM, currentPoint, previousPoint) : null, [currentPoint, previousPoint, progress.offRouteAlert, rerouteMatchedM, rerouteRoute]);
  const activeGuidance = progress.offRouteAlert && rerouteGuidance ? rerouteGuidance : guidance;

  const overviewZoom = React.useMemo(() => fitZoom(reroute?.route?.length ? [...(route.route || []), ...reroute.route] : (route.route || []), 1000, 1600), [reroute?.route, route.route]);
  const mapAnchor = React.useMemo(() => {
    if (follow && currentPoint) return currentPoint;
    if (manualCenter) return manualCenter;
    const points = reroute?.route?.length ? [...(route.route || []), ...reroute.route] : (route.route || []);
    if (!points.length) return currentPoint;
    const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
    return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2, timestamp: Date.now() } as GeoPoint;
  }, [currentPoint, follow, manualCenter, reroute?.route, route.route]);
  const baseZoom = follow ? 16 : overviewZoom;
  const zoom = clamp(baseZoom + zoomDelta, 3, 19);
  const layout = React.useMemo(() => mapAnchor ? buildLayout(mapAnchor, zoom) : null, [mapAnchor, zoom]);
  const routeLine = React.useMemo(() => layout ? (route.route || []).map((point) => { const p = screenPoint(point, layout); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ") : "", [layout, route.route]);
  const trackLine = React.useMemo(() => layout ? track.map((point) => { const p = screenPoint(point, layout); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ") : "", [layout, track]);
  const rerouteLine = React.useMemo(() => layout && reroute ? reroute.route.map((point) => { const p = screenPoint(point, layout); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ") : "", [layout, reroute]);
  const turnPoint = React.useMemo(() => activeGuidance ? routePointAtDistance(progress.offRouteAlert && rerouteRoute ? rerouteRoute : route, activeGuidance.targetDistanceM) : null, [activeGuidance, progress.offRouteAlert, rerouteRoute, route]);
  const movementBearing = previousPoint && currentPoint ? outdoorBearingDegrees(previousPoint, currentPoint) : null;
  const isAlert = progress.offRouteAlert || !!activeGuidance?.wrongWay;
  const activeRouteIndex = React.useMemo(() => {
    const distances = cumulativeOutdoorRouteDistances(route.route || []);
    if (!distances.length) return 0;
    let index = distances.findIndex((distance) => distance >= progress.matchedDistanceM);
    return index < 0 ? distances.length - 1 : index;
  }, [progress.matchedDistanceM, route.route]);

  const beginManualPan = React.useCallback(() => {
    if (!follow) return;
    if (currentPoint) setManualCenter(currentPoint);
    setZoomDelta((value) => value + (16 - overviewZoom));
    setFollow(false);
  }, [currentPoint, follow, overviewZoom]);
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapMode !== "2d" || !layout) return;
    beginManualPan();
    const pt = { x: event.clientX, y: event.clientY };
    pointerRef.current.set(event.pointerId, pt);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    if (pointerRef.current.size === 1) dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, center: layout.center };
    else if (pointerRef.current.size === 2) { const rows = Array.from(pointerRef.current.values()); pinchRef.current = { distance: pointerDistance(rows[0], rows[1]), zoomDelta }; dragRef.current = null; }
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapMode !== "2d" || !layout || !pointerRef.current.has(event.pointerId)) return;
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerRef.current.size >= 2 && pinchRef.current) {
      const rows = Array.from(pointerRef.current.values()), d = pointerDistance(rows[0], rows[1]), ratio = d / Math.max(1, pinchRef.current.distance);
      if (ratio > 1.24) { setZoomDelta((value) => Math.min(8, value + 1)); pinchRef.current = { distance: d, zoomDelta: pinchRef.current.zoomDelta + 1 }; }
      else if (ratio < .80) { setZoomDelta((value) => Math.max(-8, value - 1)); pinchRef.current = { distance: d, zoomDelta: pinchRef.current.zoomDelta - 1 }; }
      return;
    }
    const drag = dragRef.current; if (!drag || drag.id !== event.pointerId) return;
    const rect = mapGestureRef.current?.getBoundingClientRect(); if (!rect?.width || !rect.height) return;
    const dx = (event.clientX - drag.x) / rect.width * layout.width, dy = (event.clientY - drag.y) / rect.height * layout.height;
    const geo = mercatorLatLon(drag.center.x - dx, drag.center.y - dy, layout.zoom);
    setManualCenter({ lat: geo.lat, lon: geo.lon, timestamp: Date.now() });
  };
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => { pointerRef.current.delete(event.pointerId); if (pointerRef.current.size < 2) pinchRef.current = null; if (!pointerRef.current.size) dragRef.current = null; };
  const wheelMap = (event: React.WheelEvent<HTMLDivElement>) => { if (mapMode !== "2d") return; event.preventDefault(); beginManualPan(); setZoomDelta((value) => clamp(value + (event.deltaY < 0 ? 1 : -1), -8, 8)); };

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") setZoomDelta((value) => Math.min(4, value + 1));
      if (event.key === "-") setZoomDelta((value) => Math.max(-5, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = lang.startsWith("fr") ? {
    nav: "NAVIGATION ACTIVE", close: "FERMER", follow: "SUIVRE", overview: "VUE GLOBALE", off: "HORS TRACÉ", on: "SUR LE TRACÉ", wrong: "MAUVAIS SENS", rejoin: "SUIS LE REROUTAGE", recalculated: "REROUTAGE OSM", calculating: "CALCUL DU CHEMIN…", local: "RECALCUL LOCAL", remaining: "RESTANT", eta: "ETA", next: "PROCHAIN", gap: "ÉCART", routeReturn: "pour rejoindre le tracé", then: "puis", ahead: "plus loin sur le parcours",
  } : lang.startsWith("es") ? {
    nav: "NAVEGACIÓN ACTIVA", close: "CERRAR", follow: "SEGUIR", overview: "VISTA GLOBAL", off: "FUERA DE RUTA", on: "EN RUTA", wrong: "SENTIDO INCORRECTO", rejoin: "SIGUE EL REROUTING", recalculated: "REROUTING OSM", calculating: "CALCULANDO CAMINO…", local: "RECÁLCULO LOCAL", remaining: "RESTANTE", eta: "ETA", next: "SIGUIENTE", gap: "DESVÍO", routeReturn: "para volver a la ruta", then: "después", ahead: "más adelante en la ruta",
  } : {
    nav: "ACTIVE NAVIGATION", close: "CLOSE", follow: "FOLLOW", overview: "OVERVIEW", off: "OFF ROUTE", on: "ON ROUTE", wrong: "WRONG WAY", rejoin: "FOLLOW REROUTE", recalculated: "OSM REROUTING", calculating: "CALCULATING PATH…", local: "LOCAL RECALC", remaining: "REMAINING", eta: "ETA", next: "NEXT", gap: "OFF ROUTE", routeReturn: "to rejoin route", then: "then", ahead: "ahead on route",
  };

  const instructionKind: OutdoorTurnKind = activeGuidance?.wrongWay ? "u-turn" : activeGuidance?.kind || "straight";
  const instruction = progress.offRouteAlert && reroute ? turnLabel(instructionKind, lang) : progress.offRouteAlert && rejoin ? copy.rejoin : turnLabel(instructionKind, lang);
  const instructionDistanceM = progress.offRouteAlert && reroute ? (activeGuidance?.distanceM ?? Math.max(0, reroute.distanceM - rerouteMatchedM)) : progress.offRouteAlert && rejoin ? rejoin.distanceToTargetM : (activeGuidance?.distanceM ?? progress.remainingM);

  if (!layout) return null;
  const currentScreen = currentPoint ? screenPoint(currentPoint, layout) : null;
  const turnScreen = turnPoint ? screenPoint(turnPoint, layout) : null;
  const rejoinScreen = rejoin ? screenPoint(rejoin.targetPoint, layout) : null;
  const startScreen = route.route[0] ? screenPoint(route.route[0], layout) : null;
  const finishScreen = route.route[route.route.length - 1] ? screenPoint(route.route[route.route.length - 1], layout) : null;

  return <div role="dialog" aria-label={copy.nav} style={{ position: "fixed", inset: 0, zIndex: 220, background: "#0b1218", overflow: "hidden" }}>
    {mapMode === "3d" ? <div style={{ position: "absolute", inset: 0 }}><RunningTerrain3DMap points={route.route} accent={accent} lang={lang} textSoft={textSoft} height="100%" fullscreen routeName={route.name} activePointIndex={activeRouteIndex} showReplay={false} onFallback2D={() => setMapMode("2d")}/></div> : <div ref={mapGestureRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheelMap} style={{ position: "absolute", inset: 0, touchAction: "none", userSelect: "none", cursor: "grab" }}>
      {layout.tiles.map((tile) => <React.Fragment key={`${tile.z}-${tile.x}-${tile.y}`}><img src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", userSelect: "none" }}/>{sport === "trail" || sport === "hiking" ? <img src={tile.routeOverlayUrl} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", pointerEvents: "none", userSelect: "none" }}/> : null}</React.Fragment>)}
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <polyline points={routeLine} fill="none" stroke="rgba(0,0,0,.78)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={routeLine} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        {trackLine ? <polyline points={trackLine} fill="none" stroke="rgba(255,255,255,.94)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/> : null}
        {rerouteLine ? <><polyline points={rerouteLine} fill="none" stroke="rgba(0,0,0,.82)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/><polyline points={rerouteLine} fill="none" stroke="#ffad4f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/></> : rejoin && currentScreen && rejoinScreen ? <><line x1={currentScreen.x} y1={currentScreen.y} x2={rejoinScreen.x} y2={rejoinScreen.y} stroke="#ff6b62" strokeWidth="7" strokeDasharray="16 11"/><circle cx={rejoinScreen.x} cy={rejoinScreen.y} r="10" fill="#ff6b62" stroke="#fff" strokeWidth="3"/></> : null}
        {startScreen ? <text x={startScreen.x} y={startScreen.y} textAnchor="middle" dominantBaseline="central" fontSize="25">🚩</text> : null}
        {finishScreen ? <text x={finishScreen.x} y={finishScreen.y} textAnchor="middle" dominantBaseline="central" fontSize="25">🏁</text> : null}
        {turnScreen ? <><circle cx={turnScreen.x} cy={turnScreen.y} r="12" fill="#0a0d12" stroke={progress.offRouteAlert && reroute ? "#ffad4f" : accent} strokeWidth="4"/><text x={turnScreen.x} y={turnScreen.y + 2} textAnchor="middle" dominantBaseline="central" fontSize="19" fill={progress.offRouteAlert && reroute ? "#ffad4f" : accent}>{turnIcon(activeGuidance?.kind || "straight")}</text></> : null}
      </svg>
      {currentScreen ? <div style={{ position: "absolute", left: `${currentScreen.x / layout.width * 100}%`, top: `${currentScreen.y / layout.height * 100}%`, transform: `translate(-50%,-50%) rotate(${movementBearing || 0}deg)`, width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", background: "#fff", color: "#0b1016", border: `4px solid ${isAlert ? "#ff6b62" : accent}`, boxShadow: `0 0 0 6px ${isAlert ? "rgba(255,107,98,.18)" : `${accent}2c`},0 7px 22px rgba(0,0,0,.48)`, zIndex: 6, fontSize: 18, fontWeight: 1000 }}>▲</div> : null}
    </div>}

    <div style={{ position: "absolute", left: 10, right: 10, top: "max(10px,env(safe-area-inset-top))", zIndex: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 16, background: "rgba(7,10,15,.91)", border: "1px solid rgba(255,255,255,.13)", backdropFilter: "blur(18px)", boxShadow: "0 12px 35px rgba(0,0,0,.38)" }}>
        <button className="btn" onClick={onClose} style={{ minWidth: 40, minHeight: 40, padding: 0, fontSize: 16 }}>×</button>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 7.5, color: isAlert ? "#ff9b94" : accent, fontWeight: 1000, letterSpacing: 1 }}>{copy.nav}</div><div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.name}</div></div>
        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}><div style={{ display: "flex", gap: 3, padding: 2, borderRadius: 10, background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.08)" }}><button className="btn" onClick={() => setMapMode("2d")} style={{ minWidth: 32, minHeight: 26, padding: "0 5px", fontSize: 7, color: mapMode === "2d" ? accent : undefined, borderColor: mapMode === "2d" ? `${accent}55` : "transparent" }}>2D</button><button className="btn" onClick={() => setMapMode("3d")} style={{ minWidth: 32, minHeight: 26, padding: "0 5px", fontSize: 7, color: mapMode === "3d" ? accent : undefined, borderColor: mapMode === "3d" ? `${accent}55` : "transparent" }}>3D</button></div><span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${isAlert ? "rgba(255,107,98,.55)" : `${accent}55`}`, color: isAlert ? "#ff9b94" : accent, fontSize: 6.8, fontWeight: 1000 }}>{activeGuidance?.wrongWay ? copy.wrong : progress.offRouteAlert ? `${copy.off} · ${Math.round(progress.offRouteM || 0)} m` : copy.on}</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "66px 1fr auto", gap: 10, alignItems: "center", padding: 10, borderRadius: 17, background: isAlert ? "rgba(42,8,8,.92)" : "rgba(7,10,15,.91)", border: `1px solid ${isAlert ? "rgba(255,107,98,.50)" : `${accent}42`}`, backdropFilter: "blur(18px)", boxShadow: "0 12px 35px rgba(0,0,0,.38)" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, display: "grid", placeItems: "center", background: isAlert ? "rgba(255,107,98,.13)" : `${accent}12`, border: `1px solid ${isAlert ? "rgba(255,107,98,.50)" : `${accent}48`}`, color: isAlert ? "#ff9b94" : accent, fontSize: 34, fontWeight: 1000 }}>{progress.offRouteAlert ? "↪" : turnIcon(instructionKind)}</div>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 7.3, color: isAlert ? "#ff9b94" : textSoft, fontWeight: 1000, letterSpacing: .7 }}>{progress.offRouteAlert ? (reroute ? copy.recalculated : copy.local) : activeGuidance?.wrongWay ? copy.wrong : copy.nav}</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 1000, color: isAlert ? "#ffb0aa" : "#fff", lineHeight: 1.12 }}>{instruction}</div></div>
        <div style={{ textAlign: "right", minWidth: 66, color: isAlert ? "#ff9b94" : accent, fontSize: 13, fontWeight: 1000 }}>{instructionDistanceM < 950 ? `${Math.max(0, Math.round(instructionDistanceM / 10) * 10)} m` : `${(instructionDistanceM / 1000).toFixed(1)} km`}</div>
      </div>
      {progress.offRouteAlert && rerouteBusy && !reroute ? <div style={{ padding: "8px 10px", borderRadius: 13, background: "rgba(39,25,5,.92)", border: "1px solid rgba(255,173,79,.42)", color: "#ffe0b5", fontSize: 8.2, lineHeight: 1.4, backdropFilter: "blur(14px)" }}><b style={{ color: "#ffbd68" }}>{copy.recalculated}</b> · {copy.calculating}</div> : null}
      {reroute && progress.offRouteAlert ? <div style={{ padding: "8px 10px", borderRadius: 13, background: "rgba(39,25,5,.92)", border: "1px solid rgba(255,173,79,.42)", color: "#ffe0b5", fontSize: 8.2, lineHeight: 1.4, backdropFilter: "blur(14px)" }}><b style={{ color: "#ffbd68" }}>{copy.recalculated}</b> · {formatDistance(Math.max(0, reroute.distanceM - rerouteMatchedM))} {copy.routeReturn} · {copy.then} {formatDistance(reroute.routeRemainingAfterRejoinM)} · {Math.round(reroute.forwardAdvanceM)} m {copy.ahead}.</div> : rejoin && progress.offRouteAlert ? <div style={{ padding: "8px 10px", borderRadius: 13, background: "rgba(55,8,8,.90)", border: "1px solid rgba(255,107,98,.45)", color: "#ffd0cc", fontSize: 8.2, lineHeight: 1.4, backdropFilter: "blur(14px)" }}><b style={{ color: "#ff9b94" }}>{copy.local}</b> · {formatDistance(rejoin.distanceToTargetM)} {copy.routeReturn} · {copy.then} {formatDistance(rejoin.routeRemainingAfterRejoinM)} · {Math.round(rejoin.forwardAdvanceM)} m {copy.ahead}.</div> : null}
    </div>

    {mapMode === "2d" ? <div style={{ position: "absolute", right: 10, top: "38%", zIndex: 12, display: "grid", gap: 7 }}>
      <button className="btn" onClick={() => { const next = !follow; setFollow(next); setManualCenter(null); setZoomDelta(0); }} style={{ width: 42, minHeight: 42, padding: 3, background: "rgba(7,10,15,.90)", color: follow ? accent : undefined, borderColor: follow ? `${accent}66` : undefined, fontSize: 7, fontWeight: 1000 }}>{follow ? "◎" : "▣"}<span style={{ display: "block", marginTop: 2, fontSize: 5.5 }}>{follow ? copy.follow : copy.overview}</span></button>
    </div> : null}

    <div style={{ position: "absolute", left: 10, right: 10, bottom: "max(12px,env(safe-area-inset-bottom))", zIndex: 12, padding: 10, borderRadius: 17, background: "rgba(7,10,15,.92)", border: "1px solid rgba(255,255,255,.13)", backdropFilter: "blur(18px)", boxShadow: "0 -12px 35px rgba(0,0,0,.28)" }}>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${progress.progressPct}%`, height: "100%", background: isAlert ? "#ff6b62" : accent, borderRadius: 999 }}/></div>
      <div className="running-metrics-4" style={{ marginTop: 8 }}>{[
        [copy.remaining, formatDistance(progress.remainingM)],
        [copy.eta, progress.etaMs != null ? formatDuration(progress.etaMs) : "—"],
        [copy.next, progress.nextCheckpoint ? checkpointText(progress.nextCheckpoint.kind, progress.nextCheckpoint.name, lang) : "—"],
        [copy.gap, progress.offRouteM == null ? "—" : `${Math.round(progress.offRouteM)} m`],
      ].map(([label, value]) => <div key={label} style={{ minWidth: 0, padding: "7px 5px", borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><div style={{ fontSize: 6.4, color: textSoft, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, fontSize: 10.2, fontWeight: 1000, color: label === copy.gap && isAlert ? "#ff9b94" : accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>)}</div>
    </div>

    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", left: 6, bottom: 2, zIndex: 13, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.68)", color: "#fff", fontSize: 6, textDecoration: "none" }}>© OpenStreetMap</a>
  </div>;
}
