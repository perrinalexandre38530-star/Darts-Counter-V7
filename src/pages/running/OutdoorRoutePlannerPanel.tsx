import React from "react";
import { formatDistance } from "../../activity/activityMath";
import { addOutdoorWaypoint, loadOutdoorRouteExtras, removeOutdoorWaypoint, updateOutdoorRouteAlertPrefs, waypointIcon, type OutdoorRouteExtras, type OutdoorWaypointKind } from "../../activity/outdoorRouteExtras";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

type Props = { route: RunningRouteTemplate; lang: string; accent: string; textSoft: string; onChange?: (extras: OutdoorRouteExtras) => void };

const KINDS: OutdoorWaypointKind[] = ["water", "food", "shelter", "summit", "danger", "poi"];

function kindLabel(kind: OutdoorWaypointKind, lang: string) {
  const fr: Record<OutdoorWaypointKind, string> = { water: "EAU", food: "RAVITO", shelter: "REFUGE", summit: "SOMMET", danger: "DANGER", poi: "REPÈRE" };
  const en: Record<OutdoorWaypointKind, string> = { water: "WATER", food: "FOOD", shelter: "SHELTER", summit: "SUMMIT", danger: "DANGER", poi: "WAYPOINT" };
  const es: Record<OutdoorWaypointKind, string> = { water: "AGUA", food: "AVITU.", shelter: "REFUGIO", summit: "CIMA", danger: "PELIGRO", poi: "PUNTO" };
  return lang.startsWith("fr") ? fr[kind] : lang.startsWith("es") ? es[kind] : en[kind];
}

export default function OutdoorRoutePlannerPanel({ route, lang, accent, textSoft, onChange }: Props) {
  const [extras, setExtras] = React.useState<OutdoorRouteExtras>(() => loadOutdoorRouteExtras(route.id));
  const [kind, setKind] = React.useState<OutdoorWaypointKind>("water");
  const [name, setName] = React.useState("");
  const [distanceKm, setDistanceKm] = React.useState(() => Math.min(5, Math.max(0.5, Number(route.distanceM || 0) / 2000)));

  React.useEffect(() => {
    const next = loadOutdoorRouteExtras(route.id);
    setExtras(next);
    setDistanceKm(Math.min(Math.max(0.5, Number(route.distanceM || 0) / 2000), Math.max(0.5, Number(route.distanceM || 0) / 1000)));
    onChange?.(next);
  }, [route.id]);

  const copy = lang.startsWith("fr") ? {
    title: "CHECKPOINTS & SÉCURITÉ", add: "AJOUTER", at: "KM", alerts: "ALERTE SORTIE DE TRACÉ", enabled: "ACTIVE", disabled: "COUPÉE", threshold: "SEUIL", empty: "Ajoute des points d’eau, ravitos, refuges ou zones de vigilance à ton parcours.", placeholder: "Nom du repère",
  } : lang.startsWith("es") ? {
    title: "PUNTOS Y SEGURIDAD", add: "AÑADIR", at: "KM", alerts: "ALERTA FUERA DE RUTA", enabled: "ACTIVA", disabled: "DESACT.", threshold: "UMBRAL", empty: "Añade agua, avituallamiento, refugios o zonas de atención a la ruta.", placeholder: "Nombre del punto",
  } : {
    title: "CHECKPOINTS & SAFETY", add: "ADD", at: "KM", alerts: "OFF-ROUTE ALERT", enabled: "ON", disabled: "OFF", threshold: "THRESHOLD", empty: "Add water, food, shelters or caution points to the route.", placeholder: "Waypoint name",
  };

  const commit = (next: OutdoorRouteExtras) => { setExtras(next); onChange?.(next); };
  const add = () => {
    const fallback = `${kindLabel(kind, lang)} ${distanceKm.toFixed(1)} km`;
    const next = addOutdoorWaypoint(route, { name: name.trim() || fallback, kind, distanceM: distanceKm * 1000 });
    setName("");
    commit(next);
  };

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>{copy.title}</div><button className="btn" onClick={() => commit(updateOutdoorRouteAlertPrefs(route.id, { alertsEnabled: !extras.alertsEnabled }))} style={{ minHeight: 29, padding: "3px 8px", fontSize: 7.5, fontWeight: 1000, color: extras.alertsEnabled ? accent : textSoft, borderColor: extras.alertsEnabled ? `${accent}66` : undefined }}>{extras.alertsEnabled ? copy.enabled : copy.disabled}</button></div>
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>{KINDS.map((item) => <button key={item} className="btn" onClick={() => setKind(item)} style={{ minHeight: 32, padding: 4, fontSize: 7.4, fontWeight: 1000, color: kind === item ? accent : undefined, borderColor: kind === item ? `${accent}66` : undefined }}>{waypointIcon(item)} {kindLabel(item, lang)}</button>)}</div>
    <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr 82px auto", gap: 6 }}><input value={name} onChange={(e) => setName(e.target.value.slice(0, 36))} placeholder={copy.placeholder} style={{ minWidth: 0, borderRadius: 10, border: "1px solid rgba(255,255,255,.11)", background: "rgba(0,0,0,.20)", color: "inherit", padding: "7px 8px", fontSize: 8.5 }}/><input type="number" min={0.1} max={Math.max(0.1, route.distanceM / 1000)} step={0.1} value={distanceKm} onChange={(e) => setDistanceKm(Math.max(0.1, Math.min(route.distanceM / 1000, Number(e.target.value || 0.1))))} style={{ minWidth: 0, borderRadius: 10, border: "1px solid rgba(255,255,255,.11)", background: "rgba(0,0,0,.20)", color: "inherit", padding: "7px", fontSize: 8.5 }}/><button className="btn" onClick={add} style={{ minHeight: 34, padding: "4px 8px", color: accent, borderColor: `${accent}55`, fontSize: 7.5, fontWeight: 1000 }}>{copy.add}</button></div>
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div><div style={{ fontSize: 7.3, fontWeight: 1000, color: textSoft }}>{copy.alerts}</div><div style={{ marginTop: 2, fontSize: 7.2, opacity: .55 }}>{copy.threshold} · {extras.offRouteAlertM} m</div></div><input type="range" min={60} max={300} step={20} value={extras.offRouteAlertM} onChange={(e) => commit(updateOutdoorRouteAlertPrefs(route.id, { offRouteAlertM: Number(e.target.value) }))}/></div>
    {extras.waypoints.length ? <div style={{ marginTop: 8, display: "grid", gap: 5 }}>{extras.waypoints.map((wp) => <div key={wp.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 7, alignItems: "center", padding: "7px 8px", borderRadius: 11, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}><div style={{ fontSize: 16 }}>{waypointIcon(wp.kind)}</div><div><div style={{ fontSize: 8.5, fontWeight: 1000 }}>{wp.name}</div><div style={{ fontSize: 7.2, color: textSoft }}>{formatDistance(wp.distanceM)}</div></div><button className="btn" onClick={() => commit(removeOutdoorWaypoint(route.id, wp.id))} style={{ minWidth: 28, minHeight: 28, padding: 0, fontSize: 10 }}>×</button></div>)}</div> : <div style={{ marginTop: 8, color: textSoft, fontSize: 7.8, lineHeight: 1.4 }}>{copy.empty}</div>}
  </RunningSurface>;
}
