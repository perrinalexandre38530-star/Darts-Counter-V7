import React from "react";
import { haversineMeters } from "../../activity/activityMath";
import { formatOfflinePackSize, getOutdoorOfflineRoutePack, prepareOutdoorOfflineRoutePack, removeOutdoorOfflineRoutePack, type OutdoorOfflineRoutePack } from "../../activity/outdoorOfflineCache";
import { loadOutdoorLongDistancePrefs } from "../../activity/outdoorLongDistance";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import type { GeoPoint } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";
import "./runningResponsive.css";

type Props = { route: RunningRouteTemplate; sport: OutdoorPerformanceSport; extras: OutdoorRouteExtras; lang: string; accent: string; textSoft: string; onChange?: () => void };

function routePointAtDistance(points: GeoPoint[], targetM: number): GeoPoint | null {
  if (!points.length) return null;
  if (targetM <= 0) return points[0];
  let cumulative = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segment = haversineMeters(points[index - 1], points[index]);
    if (cumulative + segment >= targetM) return points[index];
    cumulative += segment;
  }
  return points[points.length - 1];
}

function MiniOfflineMap({ route, extras, accent }: { route: RunningRouteTemplate; extras: OutdoorRouteExtras; accent: string }) {
  const points = route.route || [];
  if (points.length < 2) return null;
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const width = Math.max(0.000001, maxLon - minLon), height = Math.max(0.000001, maxLat - minLat);
  const xy = (p: GeoPoint) => ({ x: 8 + ((p.lon - minLon) / width) * 84, y: 92 - ((p.lat - minLat) / height) * 84 });
  const path = points.map((p, i) => { const q = xy(p); return `${i ? "L" : "M"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`; }).join(" ");
  const waypointDots = extras.waypoints.map((wp) => ({ wp, point: routePointAtDistance(points, wp.distanceM) })).filter((item) => item.point);
  return <div style={{ marginTop: 8, borderRadius: 14, overflow: "hidden", border: `1px solid ${accent}28`, background: "linear-gradient(160deg,rgba(255,255,255,.03),rgba(2,5,10,.88))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 12px 26px rgba(0,0,0,.26)" }}>
    <svg viewBox="0 0 100 100" width="100%" height="150" preserveAspectRatio="none" aria-label="offline route map">
      <defs><pattern id={`grid-${route.id.replace(/[^a-z0-9]/gi, "")}`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth=".35"/></pattern><filter id={`glow-${route.id.replace(/[^a-z0-9]/gi, "")}`}><feGaussianBlur stdDeviation="1.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect width="100" height="100" fill={`url(#grid-${route.id.replace(/[^a-z0-9]/gi, "")})`}/>
      <path d={path} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={path} fill="none" stroke={accent} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${route.id.replace(/[^a-z0-9]/gi, "")})`}/>
      {waypointDots.map(({ wp, point }) => { const q = xy(point!); return <g key={wp.id}><circle cx={q.x} cy={q.y} r="2.2" fill="#080a0f" stroke={accent} strokeWidth=".9"/><circle cx={q.x} cy={q.y} r=".85" fill={accent}/></g>; })}
    </svg>
  </div>;
}

export default function OutdoorOfflineRoutePanel({ route, sport, extras, lang, accent, textSoft, onChange }: Props) {
  const [pack, setPack] = React.useState<OutdoorOfflineRoutePack | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { let active = true; void getOutdoorOfflineRoutePack(route.id).then((value) => active && setPack(value)); return () => { active = false; }; }, [route.id]);

  const copy = lang.startsWith("fr") ? {
    title: "PACK HORS-LIGNE", ready: "PRÊT HORS-LIGNE", prepare: "PRÉPARER HORS-LIGNE", update: "METTRE À JOUR", remove: "RETIRER", sub: "Conserve la trace, le relief, les checkpoints et le roadbook sur l’appareil. Aucun fond cartographique externe n’est téléchargé.", trace: "TRACE", points: "POINTS", waypoints: "REPÈRES", size: "TAILLE",
  } : lang.startsWith("es") ? {
    title: "PAQUETE SIN CONEXIÓN", ready: "LISTO SIN CONEXIÓN", prepare: "PREPARAR SIN CONEXIÓN", update: "ACTUALIZAR", remove: "ELIMINAR", sub: "Guarda la ruta, relieve, puntos y roadbook en el dispositivo. No descarga mapas base externos.", trace: "RUTA", points: "PUNTOS", waypoints: "MARCAS", size: "TAMAÑO",
  } : {
    title: "OFFLINE ROUTE PACK", ready: "OFFLINE READY", prepare: "PREPARE OFFLINE", update: "UPDATE", remove: "REMOVE", sub: "Keeps the route trace, elevation, checkpoints and roadbook on the device. No external basemap tiles are downloaded.", trace: "TRACE", points: "POINTS", waypoints: "WAYPOINTS", size: "SIZE",
  };

  const prepare = async () => {
    setBusy(true);
    try {
      const prefs = loadOutdoorLongDistancePrefs(route.id);
      setPack(await prepareOutdoorOfflineRoutePack(route, sport, extras, prefs));
      onChange?.();
    } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await removeOutdoorOfflineRoutePack(route.id); setPack(null); onChange?.(); } finally { setBusy(false); } };
  const shownRoute = pack?.route || route;
  const shownExtras = pack?.extras || extras;

  return <RunningSurface accent={pack ? "#71ff9a" : accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: pack ? "#71ff9a" : accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>⬇ {copy.title}</div>{pack ? <span style={{ padding: "3px 7px", borderRadius: 999, border: "1px solid rgba(113,255,154,.35)", color: "#71ff9a", fontSize: 7, fontWeight: 1000 }}>{copy.ready}</span> : null}</div>
    <div style={{ marginTop: 4, color: textSoft, fontSize: 7.8, lineHeight: 1.4 }}>{copy.sub}</div>
    <MiniOfflineMap route={shownRoute} extras={shownExtras} accent={accent}/>
    <div className="running-metrics-4" style={{ marginTop: 7 }}>
      <Mini label={copy.trace} value={`${(shownRoute.distanceM / 1000).toFixed(1)} km`} accent={accent}/><Mini label={copy.points} value={String(shownRoute.route.length)} accent={accent}/><Mini label={copy.waypoints} value={String(shownExtras.waypoints.length)} accent={accent}/><Mini label={copy.size} value={pack ? formatOfflinePackSize(pack.approxBytes) : "—"} accent={accent}/>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: pack ? "1fr auto" : "1fr", gap: 6, marginTop: 8 }}><button className="btn" disabled={busy} onClick={prepare} style={{ minHeight: 36, color: accent, borderColor: `${accent}55`, fontSize: 8, fontWeight: 1000 }}>{busy ? "…" : pack ? copy.update : copy.prepare}</button>{pack ? <button className="btn" disabled={busy} onClick={remove} style={{ minHeight: 36, padding: "4px 10px", fontSize: 8, fontWeight: 1000 }}>{copy.remove}</button> : null}</div>
  </RunningSurface>;
}

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "7px 6px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.022)" }}><div style={{ fontSize: 6.8, opacity: .52, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, fontSize: 9.2, fontWeight: 1000, color: accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}
