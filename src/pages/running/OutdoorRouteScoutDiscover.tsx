import React from "react";
import { estimateOutdoorRouteDurationMs } from "../../activity/outdoorNavigation";
import { outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { analyzeRunningTerrain, terrainLabel } from "../../activity/runningElevation";
import { fetchOutdoorRouteCoverPhoto, type OutdoorRoutePhoto } from "../../activity/outdoorRouteMedia";
import type { GeoPoint } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { formatDistance, formatDuration } from "../../activity/activityMath";

type SortMode = "recommended" | "nearby" | "distance" | "climb";
type DistanceMode = "all" | "short" | "medium" | "long";

type Props = {
  routes: RunningRouteTemplate[];
  selectedRouteId: string | null;
  savedRoutes: RunningRouteTemplate[];
  sport: OutdoorPerformanceSport;
  lang: string;
  accent: string;
  textSoft: string;
  busy?: boolean;
  message?: string;
  radiusKm: number;
  targetDistanceKm: number;
  onRadiusChange: (value: number) => void;
  onTargetDistanceChange: (value: number) => void;
  onSearch: () => void;
  onSelect: (route: RunningRouteTemplate) => void;
  onOpenDetails: (route: RunningRouteTemplate) => void;
  onGuide: (route: RunningRouteTemplate) => void;
  onToggleFavorite: (route: RunningRouteTemplate) => void;
  onOpenMaps: (route: RunningRouteTemplate) => void;
};

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

function isFavorite(route: RunningRouteTemplate, saved: RunningRouteTemplate[]) {
  return saved.some((item) => item.id === route.id || (!!route.externalId && item.externalId === route.externalId) || (!!route.sourceActivityId && item.sourceActivityId === route.sourceActivityId));
}

function distanceModeFor(route: RunningRouteTemplate): Exclude<DistanceMode, "all"> {
  const km = Number(route.distanceM || 0) / 1000;
  if (km < 7) return "short";
  if (km <= 15) return "medium";
  return "long";
}

function cardTitle(route: RunningRouteTemplate, lang: string) {
  const raw = String(route.name || "").trim();
  if (raw && !/^parcours\s+osm/i.test(raw)) return raw;
  const km = Math.max(.1, Number(route.distanceM || 0) / 1000);
  return `${pickText(lang, "Parcours", "Route", "Ruta")} ${km < 10 ? km.toFixed(1) : km.toFixed(0)} km`;
}

export default function OutdoorRouteScoutDiscover(props: Props) {
  const { routes, selectedRouteId, savedRoutes, sport, lang, accent, textSoft } = props;
  const [sortMode, setSortMode] = React.useState<SortMode>("recommended");
  const [distanceMode, setDistanceMode] = React.useState<DistanceMode>("all");
  const [loopOnly, setLoopOnly] = React.useState(false);
  const [minScore, setMinScore] = React.useState(0);

  const filtered = React.useMemo(() => {
    const rows = routes.filter((route) => {
      if (distanceMode !== "all" && distanceModeFor(route) !== distanceMode) return false;
      if (loopOnly && !route.scout?.loop) return false;
      if (Number(route.scout?.score || 0) < minScore) return false;
      return true;
    });
    return rows.slice().sort((a, b) => {
      if (sortMode === "nearby") return Number(a.scout?.distanceFromCenterM || 1e12) - Number(b.scout?.distanceFromCenterM || 1e12);
      if (sortMode === "distance") return Number(a.distanceM || 0) - Number(b.distanceM || 0);
      if (sortMode === "climb") return Number(a.elevationGainM || 0) - Number(b.elevationGainM || 0);
      return Number(b.scout?.score || 0) - Number(a.scout?.score || 0);
    });
  }, [distanceMode, loopOnly, minScore, routes, sortMode]);

  const selected = filtered.find((route) => route.id === selectedRouteId) || filtered[0] || null;

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ borderRadius: 19, padding: 12, background: "linear-gradient(145deg,rgba(255,255,255,.055),rgba(5,8,13,.88))", border: `1px solid ${accent}2f`, boxShadow: "0 18px 45px rgba(0,0,0,.28)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <div style={{ color: accent, fontWeight: 1000, letterSpacing: .7, fontSize: 9.8 }}>✦ {pickText(lang, "DÉCOUVRIR · SCOUT IA", "DISCOVER · AI SCOUT", "DESCUBRIR · SCOUT IA")}</div>
          <div style={{ marginTop: 4, color: textSoft, fontSize: 8.1, lineHeight: 1.45 }}>{pickText(lang, "Le Scout cherche des parcours déjà existants, les classe, puis les présente comme un catalogue outdoor visuel.", "Scout searches existing routes, ranks them, then presents them as a visual outdoor catalogue.", "Scout busca rutas existentes, las clasifica y las presenta como un catálogo outdoor visual.")}</div>
        </div>
        <div style={{ minWidth: 60, textAlign: "center", padding: "7px 8px", borderRadius: 14, background: `${accent}10`, border: `1px solid ${accent}32` }}><div style={{ color: accent, fontWeight: 1000, fontSize: 13 }}>{routes.length}</div><div style={{ marginTop: 1, color: textSoft, fontSize: 6.6, fontWeight: 1000 }}>{pickText(lang, "TROUVÉS", "FOUND", "ENCONTRADAS")}</div></div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <div style={{ padding: 9, borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ color: textSoft, fontSize: 6.9, fontWeight: 1000 }}>{pickText(lang, "RAYON", "RADIUS", "RADIO")}</div>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4 }}>{[10,20,35].map((value) => <button key={value} className="btn" onClick={() => props.onRadiusChange(value)} style={{ minHeight: 29, padding: "3px 3px", fontSize: 7.2, fontWeight: 1000, color: props.radiusKm === value ? accent : undefined, borderColor: props.radiusKm === value ? `${accent}66` : undefined }}>{value} KM</button>)}</div>
        </div>
        <div style={{ padding: 9, borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ color: textSoft, fontSize: 6.9, fontWeight: 1000 }}>{pickText(lang, "DISTANCE CIBLE", "TARGET DISTANCE", "DISTANCIA OBJETIVO")}</div>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4 }}>{[5,10,20].map((value) => <button key={value} className="btn" onClick={() => props.onTargetDistanceChange(value)} style={{ minHeight: 29, padding: "3px 3px", fontSize: 7.2, fontWeight: 1000, color: props.targetDistanceKm === value ? accent : undefined, borderColor: props.targetDistanceKm === value ? `${accent}66` : undefined }}>{value} KM</button>)}</div>
        </div>
      </div>
      <button className="btn" disabled={props.busy} onClick={props.onSearch} style={{ width: "100%", minHeight: 43, marginTop: 8, color: accent, borderColor: `${accent}70`, background: `${accent}0c`, fontWeight: 1000, fontSize: 8.7 }}>{props.busy ? pickText(lang, "✦ ANALYSE DE LA ZONE…", "✦ ANALYSING AREA…", "✦ ANALIZANDO LA ZONA…") : pickText(lang, "✦ TROUVER DES PARCOURS EXISTANTS", "✦ FIND EXISTING ROUTES", "✦ ENCONTRAR RUTAS EXISTENTES")}</button>
      {props.message ? <div style={{ marginTop: 7, padding: "7px 9px", borderRadius: 11, background: "rgba(255,255,255,.024)", color: textSoft, fontSize: 7.8, lineHeight: 1.4 }}>{props.message}</div> : null}
    </div>

    {routes.length ? <>
      <div style={{ position: "sticky", top: 74, zIndex: 12, padding: 7, borderRadius: 15, background: "rgba(7,9,14,.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 12px 30px rgba(0,0,0,.24)" }}>
        <div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
          {([['recommended', pickText(lang, '✦ RECOMMANDÉS', '✦ RECOMMENDED', '✦ RECOMENDADAS')], ['nearby', pickText(lang, '📍 PROCHES', '📍 NEARBY', '📍 CERCANAS')], ['distance', pickText(lang, '↔ DISTANCE', '↔ DISTANCE', '↔ DISTANCIA')], ['climb', pickText(lang, '⛰️ D+', '⛰️ CLIMB', '⛰️ D+')]] as Array<[SortMode,string]>).map(([id,label]) => <button key={id} className="btn" onClick={() => setSortMode(id)} style={{ flex: "0 0 auto", minHeight: 30, padding: "4px 8px", fontSize: 6.9, fontWeight: 1000, color: sortMode === id ? accent : undefined, borderColor: sortMode === id ? `${accent}55` : undefined }}>{label}</button>)}
        </div>
        <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 5 }}>
          {([['all', pickText(lang,'TOUTES','ALL','TODAS')], ['short','< 7 KM'], ['medium','7–15 KM'], ['long','15+ KM']] as Array<[DistanceMode,string]>).map(([id,label]) => <button key={id} className="btn" onClick={() => setDistanceMode(id)} style={{ flex: "0 0 auto", minHeight: 28, padding: "3px 8px", fontSize: 6.7, fontWeight: 1000, color: distanceMode === id ? accent : undefined, borderColor: distanceMode === id ? `${accent}55` : undefined }}>{label}</button>)}
          <button className="btn" onClick={() => setLoopOnly((value) => !value)} style={{ flex: "0 0 auto", minHeight: 28, padding: "3px 8px", fontSize: 6.7, fontWeight: 1000, color: loopOnly ? accent : undefined, borderColor: loopOnly ? `${accent}55` : undefined }}>↻ {pickText(lang,"BOUCLES","LOOPS","BUCLES")}</button>
          <button className="btn" onClick={() => setMinScore((value) => value >= 75 ? 0 : value >= 60 ? 75 : 60)} style={{ flex: "0 0 auto", minHeight: 28, padding: "3px 8px", fontSize: 6.7, fontWeight: 1000, color: minScore ? accent : undefined, borderColor: minScore ? `${accent}55` : undefined }}>✦ {minScore ? `${minScore}+` : pickText(lang,"SCORE","SCORE","PUNT.")}</button>
        </div>
      </div>

      <ScoutOverviewMap routes={filtered.slice(0, 10)} selectedRouteId={selected?.id || null} onSelect={props.onSelect} accent={accent} textSoft={textSoft} lang={lang}/>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: "#fff", fontSize: 9.2, fontWeight: 1000 }}>{filtered.length} {pickText(lang,"parcours à explorer","routes to explore","rutas por explorar")}</div><div style={{ color: textSoft, fontSize: 7.2 }}>{outdoorSportLabel(sport, lang)}</div></div>

      {filtered.length ? <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 5 }}>
        {filtered.slice(0, 14).map((route, index) => <ScoutRouteCard key={route.id} route={route} rank={index + 1} active={route.id === selected?.id} favorite={isFavorite(route, savedRoutes)} sport={sport} lang={lang} accent={accent} textSoft={textSoft} onSelect={() => props.onSelect(route)} onDetails={() => props.onOpenDetails(route)} onGuide={() => props.onGuide(route)} onFavorite={() => props.onToggleFavorite(route)} onMaps={() => props.onOpenMaps(route)}/>) }
      </div> : <div style={{ padding: 18, textAlign: "center", color: textSoft, borderRadius: 16, border: "1px solid rgba(255,255,255,.07)" }}>{pickText(lang,"Aucun parcours ne correspond à ces filtres.","No route matches these filters.","Ninguna ruta coincide con estos filtros.")}</div>}
    </> : <div style={{ padding: 18, textAlign: "center", color: textSoft, borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", lineHeight: 1.5, fontSize: 8.4 }}>{pickText(lang,"Lance le Scout pour remplir cette page avec de vrais parcours existants, classés et illustrés.","Run Scout to fill this page with real existing routes, ranked and illustrated.","Lanza Scout para llenar esta página con rutas reales existentes, clasificadas e ilustradas.")}</div>}
  </div>;
}

function ScoutRouteCard({ route, rank, active, favorite, sport, lang, accent, textSoft, onSelect, onDetails, onGuide, onFavorite, onMaps }: { route: RunningRouteTemplate; rank: number; active: boolean; favorite: boolean; sport: OutdoorPerformanceSport; lang: string; accent: string; textSoft: string; onSelect: () => void; onDetails: () => void; onGuide: () => void; onFavorite: () => void; onMaps: () => void }) {
  const [photo, setPhoto] = React.useState<OutdoorRoutePhoto | null>(null);
  React.useEffect(() => { let alive = true; setPhoto(null); void fetchOutdoorRouteCoverPhoto(route, lang).then((value) => { if (alive) setPhoto(value); }).catch(() => {}); return () => { alive = false; }; }, [lang, route.id]);
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const score = Math.round(Number(route.scout?.score || 0));
  const near = Number(route.scout?.distanceFromCenterM || 0);
  return <article style={{ flex: "0 0 min(86vw,340px)", scrollSnapAlign: "start", overflow: "hidden", borderRadius: 20, background: "linear-gradient(145deg,rgba(255,255,255,.055),rgba(5,8,13,.92))", border: `1px solid ${active ? `${accent}72` : "rgba(255,255,255,.09)"}`, boxShadow: active ? `0 18px 45px ${accent}18` : "0 16px 34px rgba(0,0,0,.25)" }}>
    <button onClick={onSelect} style={{ display: "block", width: "100%", border: 0, padding: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
      <div style={{ height: 158, position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#17222c,#0d1219)" }}>
        {photo ? <img src={photo.thumbUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : <ScoutMiniMap route={route} accent={accent}/>} 
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.08) 42%,rgba(0,0,0,.72))" }}/>
        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 5, flexWrap: "wrap" }}><span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(5,8,13,.82)", border: `1px solid ${accent}55`, color: accent, fontSize: 7, fontWeight: 1000 }}>✦ {score}%</span>{route.scout?.loop ? <span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(5,8,13,.82)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", fontSize: 7, fontWeight: 1000 }}>↻ {pickText(lang,"BOUCLE","LOOP","BUCLE")}</span> : null}</div>
        <div style={{ position: "absolute", right: 10, top: 10, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 999, background: "rgba(5,8,13,.82)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", fontSize: 8, fontWeight: 1000 }}>#{rank}</div>
        {photo ? <div style={{ position: "absolute", left: 10, bottom: 8, right: 10, color: "rgba(255,255,255,.82)", fontSize: 6.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.placeName || photo.title}</div> : null}
      </div>
      <div style={{ padding: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><div style={{ color: active ? accent : "#fff", fontSize: 10, fontWeight: 1000, lineHeight: 1.2 }}>{cardTitle(route, lang)}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 7.3, lineHeight: 1.35 }}>{route.scout?.reasons?.slice(0,3).join(" · ") || terrainLabel(terrain.terrain, lang)}</div></div>{near > 0 ? <div style={{ flex: "0 0 auto", padding: "4px 7px", borderRadius: 999, border: "1px solid rgba(255,255,255,.10)", color: textSoft, fontSize: 6.7, fontWeight: 900 }}>📍 {near < 1000 ? `${Math.round(near)} m` : `${(near/1000).toFixed(1)} km`}</div> : null}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}><Metric label="DIST." value={formatDistance(route.distanceM)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE","TIME","TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/><Metric label={pickText(lang,"DIFF.","DIFF.","DIF.")} value={terrain.hasElevation ? `${terrain.difficultyScore}/100` : "—"} accent={accent}/></div>
      </div>
    </button>
    <div style={{ padding: "0 11px 11px", display: "grid", gridTemplateColumns: "38px 1fr 1fr 38px", gap: 6 }}><button className="btn" onClick={onFavorite} style={{ minHeight: 36, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}55` : undefined }}>{favorite ? "★" : "☆"}</button><button className="btn" onClick={onDetails} style={{ minHeight: 36, fontSize: 7.1, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>{pickText(lang,"VOIR LA FICHE","VIEW ROUTE","VER FICHA")}</button><button className="btn" onClick={onGuide} style={{ minHeight: 36, fontSize: 7.1, fontWeight: 1000 }}>{pickText(lang,"GUIDAGE","GUIDANCE","GUIADO")}</button><button className="btn" onClick={onMaps} style={{ minHeight: 36, padding: 0 }}>↗</button></div>
  </article>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "7px 5px", textAlign: "center", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.065)" }}><div style={{ color: "rgba(255,255,255,.5)", fontSize: 5.9, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 7.6, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

type MapLayout = { width: number; height: number; zoom: number; center: { x: number; y: number }; tiles: Array<{ key: string; left: number; top: number; url: string }>; routes: Array<{ id: string; polyline: string; midpoint: { x: number; y: number } | null }> };

function ScoutOverviewMap({ routes, selectedRouteId, onSelect, accent, textSoft, lang }: { routes: RunningRouteTemplate[]; selectedRouteId: string | null; onSelect: (route: RunningRouteTemplate) => void; accent: string; textSoft: string; lang: string }) {
  const layout = React.useMemo(() => buildCollectionMap(routes), [routes]);
  return <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", minHeight: 230, overflow: "hidden", borderRadius: 20, background: "#101821", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 18px 38px rgba(0,0,0,.25)" }}>
    {layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover", userSelect: "none" }}/>) }<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row, index) => { const active = row.id === selectedRouteId; const route = routes.find((item) => item.id === row.id); return <g key={row.id} onClick={() => route && onSelect(route)} style={{ cursor: "pointer" }}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.68)" strokeWidth={active ? 10 : 7} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={active ? accent : "rgba(255,255,255,.72)"} strokeWidth={active ? 5.5 : 3} opacity={active ? 1 : .72} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>{row.midpoint ? <g><circle cx={row.midpoint.x} cy={row.midpoint.y} r={active ? 13 : 10} fill={active ? accent : "rgba(7,10,15,.92)"} stroke="#fff" strokeWidth="2"/><text x={row.midpoint.x} y={row.midpoint.y+3} textAnchor="middle" fontSize={active ? 9 : 7} fontWeight="900" fill={active ? "#081018" : "#fff"}>{index+1}</text></g> : null}</g>;})}</svg></> : null}
    <div style={{ position: "absolute", left: 10, top: 10, padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.84)", border: `1px solid ${accent}40`, color: accent, fontSize: 7, fontWeight: 1000 }}>🗺️ {pickText(lang,"CARTE DES PARCOURS","ROUTE MAP","MAPA DE RUTAS")}</div>
    <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 14, background: "rgba(5,8,13,.82)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.10)" }}><div style={{ color: "#fff", fontSize: 7.7, fontWeight: 1000 }}>{routes.length} {pickText(lang,"tracés visibles","routes visible","rutas visibles")}</div><div style={{ color: textSoft, fontSize: 6.8 }}>{pickText(lang,"Touchez un tracé pour le sélectionner","Tap a route to select it","Toca una ruta para seleccionarla")}</div></div>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", right: 4, top: 4, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.58)", color: "#fff", fontSize: 6, textDecoration: "none" }}>© OSM</a>
  </div>;
}

function ScoutMiniMap({ route, accent }: { route: RunningRouteTemplate; accent: string }) {
  const layout = React.useMemo(() => buildCollectionMap([route], 420, 190), [route]);
  return <div style={{ position: "absolute", inset: 0, background: "#111a23" }}>{layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover" }}/>) }<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row) => <g key={row.id}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.72)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>)}</svg></> : null}</div>;
}

function buildCollectionMap(routes: RunningRouteTemplate[], width = 1000, height = 620): MapLayout | null {
  const points: GeoPoint[] = [];
  for (const route of routes) {
    const src = route.route || [];
    const step = Math.max(1, Math.floor(src.length / 180));
    for (let i = 0; i < src.length; i += step) points.push(src[i]);
    if (src.length) points.push(src[src.length - 1]);
  }
  if (!points.length) return null;
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2, centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 17;
  for (let z = 17; z >= 3; z -= 1) {
    const px = points.map((p) => mercatorPixel(p.lat, p.lon, z));
    const xs = px.map((p) => p.x), ys = px.map((p) => p.y);
    if (Math.max(...xs)-Math.min(...xs) <= width*.78 && Math.max(...ys)-Math.min(...ys) <= height*.72) { zoom = z; break; }
  }
  const center = mercatorPixel(centerLat, centerLon, zoom);
  const minX = Math.floor((center.x-width/2)/256)-1, maxX = Math.floor((center.x+width/2)/256)+1, minY = Math.floor((center.y-height/2)/256)-1, maxY = Math.floor((center.y+height/2)/256)+1, count = 2**zoom;
  const tiles: MapLayout["tiles"] = [];
  for (let tx=minX; tx<=maxX; tx += 1) for (let ty=minY; ty<=maxY; ty += 1) { if (ty<0 || ty>=count) continue; const wx=((tx%count)+count)%count; tiles.push({ key:`${zoom}-${tx}-${ty}`, left:tx*256-center.x+width/2, top:ty*256-center.y+height/2, url:`https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png` }); }
  const mapped = routes.map((route) => {
    const src = route.route || [];
    const step = Math.max(1, Math.floor(src.length / 260));
    const sampled = src.filter((_, index) => index % step === 0);
    if (src.length && sampled[sampled.length-1] !== src[src.length-1]) sampled.push(src[src.length-1]);
    const screen = sampled.map((point) => { const world = mercatorPixel(point.lat, point.lon, zoom); return { x: world.x-center.x+width/2, y:world.y-center.y+height/2 }; });
    const mid = screen.length ? screen[Math.floor(screen.length/2)] : null;
    return { id: route.id, polyline: screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "), midpoint: mid };
  });
  return { width, height, zoom, center, tiles, routes: mapped };
}

function mercatorPixel(lat: number, lon: number, zoom: number) { const clamped=Math.max(-85.05112878,Math.min(85.05112878,lat)), scale=256*2**zoom, sin=Math.sin(clamped*Math.PI/180); return { x:(lon+180)/360*scale, y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale }; }
