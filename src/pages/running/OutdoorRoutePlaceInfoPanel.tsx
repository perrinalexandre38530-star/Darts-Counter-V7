import React from "react";
import { formatDistance } from "../../activity/activityMath";
import { fetchOutdoorRoutePlaceContext, outdoorRoutePlaceIcon, type OutdoorRoutePlaceContext } from "../../activity/outdoorRoutePlaces";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

export default function OutdoorRoutePlaceInfoPanel({ route, lang, accent, textSoft, compact = false }: { route: RunningRouteTemplate; lang: string; accent: string; textSoft: string; compact?: boolean }) {
  const [context, setContext] = React.useState<OutdoorRoutePlaceContext | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setFailed(false); setContext(null);
    void fetchOutdoorRoutePlaceContext(route, lang).then((value) => { if (alive) setContext(value); }).catch(() => { if (alive) setFailed(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [route.id, lang]);

  const copy = lang.startsWith("fr") ? { title: "LE LIEU", near: "près du tracé", start: "du départ", loading: "Identification du secteur et des points utiles…", empty: "Aucun point d'intérêt cartographique trouvé près du tracé.", source: "Données OpenStreetMap", open: "VOIR" }
    : lang.startsWith("es") ? { title: "EL LUGAR", near: "cerca de la ruta", start: "desde la salida", loading: "Identificando la zona y puntos útiles…", empty: "No se encontraron puntos de interés cartográficos cerca de la ruta.", source: "Datos OpenStreetMap", open: "VER" }
    : { title: "THE PLACE", near: "from route", start: "from start", loading: "Identifying the area and useful places…", empty: "No mapped points of interest found near this route.", source: "OpenStreetMap data", open: "VIEW" };

  const placeTitle = context ? [context.locality, context.municipality && context.municipality !== context.locality ? context.municipality : null, context.region].filter(Boolean).slice(0, 3).join(" · ") : "";
  const visiblePlaces = context?.places?.slice(0, compact ? 4 : 10) || [];

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .5 }}>{copy.title}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.2 }}>{copy.source}</div></div>{context?.countryCode ? <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${accent}35`, color: accent, fontSize: 7.4, fontWeight: 1000 }}>{context.countryCode}</span> : null}</div>
    {loading ? <div style={{ marginTop: 8, color: textSoft, fontSize: 8.1 }}>{copy.loading}</div> : null}
    {placeTitle ? <div style={{ marginTop: 8, fontSize: compact ? 9.3 : 10.4, fontWeight: 1000, lineHeight: 1.3 }}>{placeTitle}</div> : null}
    {!compact && context?.displayName ? <div style={{ marginTop: 3, color: textSoft, fontSize: 7.2, lineHeight: 1.35 }}>{context.displayName}</div> : null}
    {!loading && !visiblePlaces.length ? <div style={{ marginTop: 8, color: textSoft, fontSize: 8, lineHeight: 1.4 }}>{failed ? copy.empty : copy.empty}</div> : null}
    {visiblePlaces.length ? <div style={{ marginTop: 8, display: compact ? "flex" : "grid", gridTemplateColumns: compact ? undefined : "repeat(2,minmax(0,1fr))", gap: 6, overflowX: compact ? "auto" : undefined, paddingBottom: compact ? 3 : 0 }}>{visiblePlaces.map((place) => <div key={place.id} style={{ flex: compact ? "0 0 76%" : undefined, minWidth: 0, padding: "8px 9px", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}><div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 6, alignItems: "center" }}><div style={{ fontSize: 17 }}>{outdoorRoutePlaceIcon(place.category)}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 8.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 6.8 }}>{place.distanceToRouteM < 100 ? `<100 m ${copy.near}` : `${formatDistance(place.distanceToRouteM)} ${copy.near}`}{place.elevationM != null ? ` · ${Math.round(place.elevationM)} m` : ""}</div></div><button className="btn" onClick={() => { try { window.open(`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`, "_blank", "noopener,noreferrer"); } catch {} }} style={{ minWidth: 31, minHeight: 29, padding: 0, fontSize: 6.5, fontWeight: 1000 }}>{copy.open}</button></div></div>)}</div> : null}
  </RunningSurface>;
}
