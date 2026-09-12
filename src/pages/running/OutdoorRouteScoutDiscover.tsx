import React from "react";
import { pickRunningText as pickText, runningMercatorPixel as mercatorPixel } from "../../activity/runningShared";
import { loadRunningMapTheme, runningMapAttribution, runningMapRasterFilter, runningMapRasterTileUrl, RUNNING_SATELLITE_TILES, type RunningMapTheme } from "./runningMapTheme";
import { estimateOutdoorRouteDurationMs } from "../../activity/outdoorNavigation";
import { outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { analyzeRunningTerrain, terrainLabel } from "../../activity/runningElevation";
import type { GeoPoint } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { outdoorRouteDistanceBand, outdoorRouteDistanceFit, outdoorRouteSearchPolicy } from "../../activity/outdoorRouteSearchPolicy";

type SortMode = "recommended" | "nearby" | "distance" | "climb";
type DistanceMode = "all" | "short" | "medium" | "long";
type ViewMode = "map" | "cards";

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

function isFavorite(route: RunningRouteTemplate, saved: RunningRouteTemplate[]) {
  return saved.some((item) => item.id === route.id || (!!route.externalId && item.externalId === route.externalId) || (!!route.sourceActivityId && item.sourceActivityId === route.sourceActivityId));
}

function distanceModeFor(route: RunningRouteTemplate, sport: OutdoorPerformanceSport): Exclude<DistanceMode, "all"> {
  return outdoorRouteDistanceBand(Number(route.distanceM || 0), sport);
}

function cardTitle(route: RunningRouteTemplate, lang: string) {
  const raw = String(route.name || "").trim();
  if (raw && !/^parcours\s+osm/i.test(raw)) return raw;
  const km = Math.max(.1, Number(route.distanceM || 0) / 1000);
  return `${pickText(lang, "Parcours", "Route", "Ruta")} ${km < 10 ? km.toFixed(1) : km.toFixed(0)} km`;
}


function targetDistanceLabel(route: RunningRouteTemplate, targetDistanceKm: number, lang: string) {
  const targetM = Number(targetDistanceKm || 0) * 1000;
  if (!(targetM > 0)) return null;
  const deltaM = Number(route.distanceM || 0) - targetM;
  const absKm = Math.abs(deltaM) / 1000;
  const prefix = deltaM > 0 ? "+" : deltaM < 0 ? "−" : "±";
  const pct = Math.round(Math.abs(deltaM) / targetM * 100);
  const label = pickText(lang, "CIBLE", "TARGET", "OBJETIVO");
  return `${label} ${prefix}${absKm < 1 ? absKm.toFixed(1) : absKm.toFixed(absKm < 10 ? 1 : 0)} km · ${pct}%`;
}
function nearLabel(meters: number, lang: string) {
  if (!(meters > 0)) return pickText(lang, "AUTOUR DE TOI", "AROUND YOU", "CERCA DE TI");
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function routeSourceLabel(route: RunningRouteTemplate, lang: string) {
  const provider = String(route.catalog?.provider || "").toLowerCase();
  if (route.source === "generated") return pickText(lang, "SUR MESURE", "CUSTOM", "A MEDIDA");
  if (route.source === "community") return pickText(lang, "COMMUNAUTÉ", "COMMUNITY", "COMUNIDAD");
  if (provider === "outdooractive") return "OUTDOORACTIVE";
  if (provider === "gpx-import") return "GPX CATALOG";
  if (route.source === "catalog") return pickText(lang, "CATALOGUE", "CATALOG", "CATÁLOGO");
  return "OPENSTREETMAP";
}

function fitBadge(route: RunningRouteTemplate, sport: OutdoorPerformanceSport, targetDistanceKm: number, lang: string) {
  const fit = outdoorRouteDistanceFit(Number(route.distanceM || 0), sport, targetDistanceKm);
  if (fit.grade === "excellent") return pickText(lang, "DISTANCE IDÉALE", "IDEAL DISTANCE", "DISTANCIA IDEAL");
  if (fit.grade === "good") return pickText(lang, "TRÈS PROCHE", "VERY CLOSE", "MUY CERCA");
  if (fit.grade === "acceptable") return pickText(lang, "COMPATIBLE", "COMPATIBLE", "COMPATIBLE");
  if (fit.grade === "alternative") return pickText(lang, "ALTERNATIVE", "ALTERNATIVE", "ALTERNATIVA");
  return pickText(lang, "HORS CIBLE", "OFF TARGET", "FUERA OBJETIVO");
}

export default function OutdoorRouteScoutDiscover(props: Props) {
  const { routes, selectedRouteId, savedRoutes, sport, lang, accent, textSoft } = props;
  const searchPolicy = outdoorRouteSearchPolicy(sport);
  const [sortMode, setSortMode] = React.useState<SortMode>("recommended");
  const [distanceMode, setDistanceMode] = React.useState<DistanceMode>("all");
  const [loopOnly, setLoopOnly] = React.useState(false);
  const [minScore, setMinScore] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<ViewMode>("map");
  const [searchOpen, setSearchOpen] = React.useState(routes.length === 0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    if (routes.length) setSearchOpen(false);
  }, [routes.length]);

  const filtered = React.useMemo(() => {
    const rows = routes.filter((route) => {
      if (distanceMode !== "all" && distanceModeFor(route, sport) !== distanceMode) return false;
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
  }, [distanceMode, loopOnly, minScore, routes, sortMode, sport]);

  const selected = filtered.find((route) => route.id === selectedRouteId) || filtered[0] || null;
  const activeFilters = Number(distanceMode !== "all") + Number(loopOnly) + Number(minScore > 0) + Number(sortMode !== "recommended");
  const exactCount = React.useMemo(() => routes.filter((route) => outdoorRouteDistanceFit(Number(route.distanceM || 0), sport, props.targetDistanceKm).grade === "excellent").length, [props.targetDistanceKm, routes, sport]);
  const strongCount = React.useMemo(() => routes.filter((route) => Number(route.scout?.score || 0) >= 64).length, [routes]);
  const loopCount = React.useMemo(() => routes.filter((route) => !!route.scout?.loop).length, [routes]);

  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "linear-gradient(145deg,rgba(255,255,255,.052),rgba(4,7,11,.94))", border: `1px solid ${accent}30`, boxShadow: "0 24px 58px rgba(0,0,0,.34)" }}>
      <div style={{ padding: "13px 13px 11px", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <div style={{ color: accent, fontWeight: 1000, letterSpacing: .8, fontSize: 10 }}>✦ {pickText(lang, "SCOUT PARCOURS", "ROUTE SCOUT", "SCOUT DE RUTAS")}</div>
            <span style={{ padding: "3px 7px", borderRadius: 999, background: `${accent}10`, border: `1px solid ${accent}26`, color: accent, fontSize: 6.5, fontWeight: 1000 }}>{outdoorSportLabel(sport, lang).toUpperCase()}</span>
          </div>
          <div style={{ marginTop: 4, color: textSoft, fontSize: 7.8, lineHeight: 1.35 }}>{routes.length ? pickText(lang, "Choisis visuellement un tracé. Les réglages restent cachés tant que tu n’en as pas besoin.", "Choose a route visually. Search controls stay hidden until you need them.", "Elige una ruta de forma visual. Los ajustes permanecen ocultos hasta que los necesites.") : pickText(lang, "Trouve des parcours existants autour de toi, puis explore-les sur la carte.", "Find existing routes around you, then explore them on the map.", "Encuentra rutas existentes cerca de ti y explóralas en el mapa.")}</div>
        </div>
        <button className="btn" onClick={() => setSearchOpen((value) => !value)} style={{ minWidth: 42, minHeight: 42, padding: 0, borderRadius: 14, color: searchOpen ? accent : undefined, borderColor: searchOpen ? `${accent}66` : undefined, background: searchOpen ? `${accent}0f` : "rgba(255,255,255,.025)", fontSize: 15 }} title={pickText(lang, "Recherche", "Search", "Buscar")}>{searchOpen ? "×" : "⌕"}</button>
      </div>

      {searchOpen ? <div style={{ padding: "0 13px 13px" }}>
        <div style={{ padding: 11, borderRadius: 17, background: "rgba(255,255,255,.026)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ChoiceBlock label={pickText(lang, "RAYON", "RADIUS", "RADIO")} values={searchPolicy.radiusOptionsKm} value={props.radiusKm} suffix="KM" accent={accent} onChange={props.onRadiusChange}/>
            <ChoiceBlock label={pickText(lang, "DISTANCE", "DISTANCE", "DISTANCIA")} values={searchPolicy.distanceOptionsKm} value={props.targetDistanceKm} suffix="KM" accent={accent} onChange={props.onTargetDistanceChange}/>
          </div>
          <button className="btn" disabled={props.busy} onClick={props.onSearch} style={{ width: "100%", minHeight: 44, marginTop: 9, color: accent, borderColor: `${accent}70`, background: `${accent}0c`, fontWeight: 1000, fontSize: 8.5 }}>{props.busy ? pickText(lang, "✦ ANALYSE DE LA ZONE…", "✦ ANALYSING AREA…", "✦ ANALIZANDO LA ZONA…") : pickText(lang, "✦ TROUVER DES PARCOURS", "✦ FIND ROUTES", "✦ ENCONTRAR RUTAS")}</button>
          {props.message ? <div style={{ marginTop: 7, color: textSoft, fontSize: 7.6, lineHeight: 1.4 }}>{props.message}</div> : null}
        </div>
      </div> : props.message && props.busy ? <div style={{ padding: "0 13px 12px", color: textSoft, fontSize: 7.5 }}>{props.message}</div> : null}
    </section>

    {routes.length ? <>
      <div style={{ position: "sticky", top: 72, zIndex: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center", padding: 6, borderRadius: 16, background: "rgba(6,9,14,.88)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 13px 34px rgba(0,0,0,.26)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          <Segment active={viewMode === "map"} label={`⌖ ${pickText(lang,"CARTE","MAP","MAPA")}`} accent={accent} onClick={() => setViewMode("map")}/>
          <Segment active={viewMode === "cards"} label={`▦ ${pickText(lang,"PARCOURS","ROUTES","RUTAS")}`} accent={accent} onClick={() => setViewMode("cards")}/>
        </div>
        <button className="btn" onClick={() => setFiltersOpen((value) => !value)} style={{ minWidth: 39, minHeight: 34, padding: "3px 7px", fontSize: 10, color: filtersOpen || activeFilters ? accent : undefined, borderColor: filtersOpen || activeFilters ? `${accent}55` : undefined }}>≡{activeFilters ? <span style={{ marginLeft: 4, fontSize: 6.5, fontWeight: 1000 }}>{activeFilters}</span> : null}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        <ScoutStat label={pickText(lang,"PROPOSITIONS","PROPOSALS","PROPUESTAS")} value={String(routes.length)} accent={accent}/><ScoutStat label={pickText(lang,"IDÉALES","IDEAL","IDEALES")} value={String(exactCount)} accent={accent}/><ScoutStat label={pickText(lang,"SOLIDES","STRONG","SÓLIDAS")} value={String(strongCount)} accent={accent}/><ScoutStat label={pickText(lang,"BOUCLES","LOOPS","BUCLES")} value={String(loopCount)} accent={accent}/>
      </div>
      {props.busy ? <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 13, background: `${accent}0a`, border: `1px solid ${accent}22`, color: textSoft, fontSize: 7.2, lineHeight: 1.3 }}><span style={{ color: accent, fontWeight: 1000 }}>✦</span><span>{pickText(lang,"Le Scout continue à enrichir les résultats sans bloquer la sélection.","Scout keeps enriching results without blocking selection.","Scout sigue enriqueciendo los resultados sin bloquear la selección.")}</span></div> : null}

      {filtersOpen ? <div style={{ padding: 9, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.045),rgba(5,8,13,.86))", border: "1px solid rgba(255,255,255,.08)" }}>
        <FilterRail title={pickText(lang, "TRIER", "SORT", "ORDENAR")}>
          {([['recommended', pickText(lang, '✦ RECOMMANDÉS', '✦ RECOMMENDED', '✦ RECOMENDADAS')], ['nearby', pickText(lang, '📍 PROCHES', '📍 NEARBY', '📍 CERCANAS')], ['distance', pickText(lang, '↔ DISTANCE', '↔ DISTANCE', '↔ DISTANCIA')], ['climb', pickText(lang, '⛰️ D+', '⛰️ CLIMB', '⛰️ D+')]] as Array<[SortMode,string]>).map(([id,label]) => <Chip key={id} active={sortMode === id} label={label} accent={accent} onClick={() => setSortMode(id)}/>) }
        </FilterRail>
        <FilterRail title={pickText(lang, "FILTRER", "FILTER", "FILTRAR")}>
          {([['all', pickText(lang,'TOUTES','ALL','TODAS')], ['short',`< ${searchPolicy.distanceBandsKm.shortMax} KM`], ['medium',`${searchPolicy.distanceBandsKm.shortMax}–${searchPolicy.distanceBandsKm.mediumMax} KM`], ['long',`${searchPolicy.distanceBandsKm.mediumMax}+ KM`]] as Array<[DistanceMode,string]>).map(([id,label]) => <Chip key={id} active={distanceMode === id} label={label} accent={accent} onClick={() => setDistanceMode(id)}/>) }
          <Chip active={loopOnly} label={`↻ ${pickText(lang,"BOUCLES","LOOPS","BUCLES")}`} accent={accent} onClick={() => setLoopOnly((value) => !value)}/>
          <Chip active={minScore > 0} label={`✦ ${minScore ? `${minScore}+` : pickText(lang,"SCORE","SCORE","PUNT.")}`} accent={accent} onClick={() => setMinScore((value) => value >= 75 ? 0 : value >= 60 ? 75 : 60)}/>
        </FilterRail>
      </div> : null}

      {viewMode === "map" ? <div style={{ display: "grid", gap: 9 }}>
        <ScoutOverviewMap routes={filtered.slice(0, 10)} selectedRouteId={selected?.id || null} onSelect={props.onSelect} accent={accent} textSoft={textSoft} lang={lang}/>
        {selected ? <SelectedRouteStrip route={selected} favorite={isFavorite(selected, savedRoutes)} sport={sport} targetDistanceKm={props.targetDistanceKm} lang={lang} accent={accent} textSoft={textSoft} onDetails={() => props.onOpenDetails(selected)} onGuide={() => props.onGuide(selected)} onFavorite={() => props.onToggleFavorite(selected)} onMaps={() => props.onOpenMaps(selected)}/> : null}
      </div> : <div style={{ display: "grid", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}><div style={{ color: "#fff", fontSize: 9.3, fontWeight: 1000 }}>{filtered.length} {pickText(lang,"parcours","routes","rutas")}</div><div style={{ color: textSoft, fontSize: 7.1 }}>{pickText(lang,"Touchez une carte pour la sélectionner","Tap a card to select it","Toca una tarjeta para seleccionarla")}</div></div>
        {filtered.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))", gap: 11 }}>
          {filtered.slice(0, 18).map((route, index) => <ScoutRouteCard key={route.id} route={route} rank={index + 1} active={route.id === selected?.id} favorite={isFavorite(route, savedRoutes)} sport={sport} targetDistanceKm={props.targetDistanceKm} lang={lang} accent={accent} textSoft={textSoft} onSelect={() => props.onSelect(route)} onDetails={() => props.onOpenDetails(route)} onGuide={() => props.onGuide(route)} onFavorite={() => props.onToggleFavorite(route)} onMaps={() => props.onOpenMaps(route)}/>) }
        </div> : <EmptyFilters lang={lang} textSoft={textSoft}/>} 
      </div>}
    </> : <div style={{ padding: 20, textAlign: "center", color: textSoft, borderRadius: 20, border: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(145deg,rgba(255,255,255,.035),rgba(5,8,13,.72))", lineHeight: 1.5, fontSize: 8.4 }}><div style={{ fontSize: 25, marginBottom: 8 }}>⌖</div><b style={{ color: "#fff" }}>{pickText(lang,"Aucun parcours affiché","No routes yet","Todavía no hay rutas")}</b><div style={{ marginTop: 5 }}>{pickText(lang,"Lance le Scout pour remplir cette page avec de vrais tracés existants.","Run Scout to fill this page with real existing routes.","Lanza Scout para llenar esta página con rutas reales existentes.")}</div></div>}
  </div>;
}

function ChoiceBlock({ label, values, value, suffix, accent, onChange }: { label: string; values: number[]; value: number; suffix: string; accent: string; onChange: (value: number) => void }) {
  return <div style={{ minWidth: 0 }}><div style={{ color: "rgba(255,255,255,.5)", fontSize: 6.6, fontWeight: 1000, letterSpacing: .5 }}>{label}</div><div style={{ marginTop: 6, display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>{values.map((item) => <button key={item} className="btn" onClick={() => onChange(item)} style={{ flex: "0 0 auto", minWidth: 44, minHeight: 30, padding: "3px 6px", fontSize: 7.2, fontWeight: 1000, color: value === item ? accent : undefined, borderColor: value === item ? `${accent}66` : undefined, background: value === item ? `${accent}0d` : undefined }}>{item} {suffix}</button>)}</div></div>;
}

function Segment({ active, label, accent, onClick }: { active: boolean; label: string; accent: string; onClick: () => void }) {
  return <button className="btn" onClick={onClick} style={{ minHeight: 34, padding: "4px 8px", fontSize: 7.2, fontWeight: 1000, color: active ? accent : undefined, borderColor: active ? `${accent}55` : "transparent", background: active ? `${accent}0d` : "transparent" }}>{label}</button>;
}

function FilterRail({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 7, alignItems: "center", marginTop: 5 }}><div style={{ color: "rgba(255,255,255,.45)", fontSize: 6.3, fontWeight: 1000 }}>{title}</div><div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 1 }}>{children}</div></div>;
}

function Chip({ active, label, accent, onClick }: { active: boolean; label: string; accent: string; onClick: () => void }) {
  return <button className="btn" onClick={onClick} style={{ flex: "0 0 auto", minHeight: 29, padding: "3px 8px", borderRadius: 999, fontSize: 6.7, fontWeight: 1000, color: active ? accent : undefined, borderColor: active ? `${accent}55` : "rgba(255,255,255,.075)", background: active ? `${accent}0d` : "rgba(255,255,255,.018)" }}>{label}</button>;
}

function EmptyFilters({ lang, textSoft }: { lang: string; textSoft: string }) {
  return <div style={{ padding: 18, textAlign: "center", color: textSoft, borderRadius: 16, border: "1px solid rgba(255,255,255,.07)" }}>{pickText(lang,"Aucun parcours ne correspond à ces filtres.","No route matches these filters.","Ninguna ruta coincide con estos filtros.")}</div>;
}

function ScoutStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "7px 4px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.065)" }}><div style={{ color: "rgba(255,255,255,.42)", fontSize: 5.7, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 2, color: accent, fontSize: 8.4, fontWeight: 1000 }}>{value}</div></div>;
}

function routePreviewGeometry(route: RunningRouteTemplate) {
  const source = route.route || [];
  if (source.length < 2) return null;
  const step = Math.max(1, Math.ceil(source.length / 140));
  const sampled = source.filter((_, index) => index === 0 || index === source.length - 1 || index % step === 0);
  const projected = sampled.map((point) => mercatorPixel(point.lat, point.lon, 14));
  const xs = projected.map((point) => point.x), ys = projected.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const width = 360, height = 150, pad = 18;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  const coords = projected.map((point) => ({ x: offsetX + (point.x - minX) * scale, y: offsetY + (point.y - minY) * scale }));
  return {
    width,
    height,
    points: coords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    start: coords[0],
    end: coords[coords.length - 1],
  };
}

function ScoutRoutePreview({ route, accent, active = false }: { route: RunningRouteTemplate; accent: string; active?: boolean }) {
  const geometry = React.useMemo(() => routePreviewGeometry(route), [route.route]);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(circle at 72% 18%,rgba(255,255,255,.07),transparent 34%),linear-gradient(145deg,#17232d,#0a1017 62%,#080c11)" }}>
    <div aria-hidden style={{ position: "absolute", inset: 0, opacity: .22, backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)", backgroundSize: "24px 24px" }}/>
    {geometry ? <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <polyline points={geometry.points} fill="none" stroke="rgba(0,0,0,.78)" strokeWidth={active ? 12 : 10} strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={geometry.points} fill="none" stroke={accent} strokeWidth={active ? 5.5 : 4.4} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : .92}/>
      {geometry.start ? <circle cx={geometry.start.x} cy={geometry.start.y} r="5.2" fill="#fff" stroke={accent} strokeWidth="2.2"/> : null}
      {geometry.end ? <circle cx={geometry.end.x} cy={geometry.end.y} r="5.2" fill={accent} stroke="#fff" strokeWidth="2"/> : null}
    </svg> : null}
  </div>;
}

function SelectedRouteStrip({ route, favorite, sport, targetDistanceKm, lang, accent, textSoft, onDetails, onGuide, onFavorite, onMaps }: { route: RunningRouteTemplate; favorite: boolean; sport: OutdoorPerformanceSport; targetDistanceKm: number; lang: string; accent: string; textSoft: string; onDetails: () => void; onGuide: () => void; onFavorite: () => void; onMaps: () => void }) {
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const near = Number(route.scout?.distanceFromCenterM || 0);
  const score = Math.round(Number(route.scout?.score || 0));
  const targetDelta = targetDistanceLabel(route, targetDistanceKm, lang);
  return <div style={{ display: "grid", gap: 9, padding: 11, borderRadius: 18, background: "linear-gradient(145deg,rgba(255,255,255,.055),rgba(5,8,13,.92))", border: `1px solid ${accent}40`, boxShadow: "0 16px 36px rgba(0,0,0,.24)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 5 }}><Pill text={`✦ ${score}%`} accent={accent}/><Pill text={fitBadge(route, sport, targetDistanceKm, lang)} accent={accent} muted/><Pill text={routeSourceLabel(route, lang)} accent={accent} muted/></div>
        <div style={{ color: "#fff", fontSize: 10.2, fontWeight: 1000, lineHeight: 1.2 }}>{cardTitle(route, lang)}</div>
        <div style={{ marginTop: 4, color: textSoft, fontSize: 7.2 }}>{route.scout?.loop ? `↻ ${pickText(lang,"Boucle","Loop","Bucle")}` : `↔ ${pickText(lang,"Linéaire / aller-retour","Linear / out & back","Lineal / ida y vuelta")}`} · {terrainLabel(terrain.terrain, lang)}</div>
      </div>
      <button className="btn" onClick={onFavorite} style={{ minWidth: 38, minHeight: 38, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}55` : undefined }}>{favorite ? "★" : "☆"}</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><Metric label={pickText(lang,"DIST.","DIST.","DIST.")} value={formatDistance(route.distanceM)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE","TIME","TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/><Metric label={pickText(lang,"DÉPART","START","INICIO")} value={nearLabel(near, lang)} accent={accent}/></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, color: textSoft, fontSize: 6.9 }}>{targetDelta ? <span>{targetDelta}</span> : null}{route.scout?.reasons?.length ? <><span>·</span><span>{route.scout.reasons.slice(0, 3).join(" · ")}</span></> : null}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 38px", gap: 6 }}><button className="btn" onClick={onDetails} style={{ minHeight: 40, color: accent, borderColor: `${accent}55`, fontSize: 7.5, fontWeight: 1000 }}>{pickText(lang,"FICHE COMPLÈTE","FULL DETAILS","FICHA COMPLETA")}</button><button className="btn" onClick={onGuide} style={{ minHeight: 40, fontSize: 7.5, fontWeight: 1000 }}>{pickText(lang,"GUIDAGE","GUIDANCE","GUIADO")}</button><button className="btn" onClick={onMaps} style={{ minHeight: 40, padding: 0 }}>↗</button></div>
  </div>;
}

function ScoutRouteCard({ route, rank, active, favorite, sport, targetDistanceKm, lang, accent, textSoft, onSelect, onDetails, onGuide, onFavorite, onMaps }: { route: RunningRouteTemplate; rank: number; active: boolean; favorite: boolean; sport: OutdoorPerformanceSport; targetDistanceKm: number; lang: string; accent: string; textSoft: string; onSelect: () => void; onDetails: () => void; onGuide: () => void; onFavorite: () => void; onMaps: () => void }) {
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const score = Math.round(Number(route.scout?.score || 0));
  const near = Number(route.scout?.distanceFromCenterM || 0);
  const targetDelta = targetDistanceLabel(route, targetDistanceKm, lang);
  const source = routeSourceLabel(route, lang);
  const fit = fitBadge(route, sport, targetDistanceKm, lang);
  return <article style={{ overflow: "hidden", borderRadius: 20, background: "linear-gradient(145deg,rgba(255,255,255,.052),rgba(4,7,11,.95))", border: `1px solid ${active ? `${accent}78` : "rgba(255,255,255,.085)"}`, boxShadow: active ? `0 22px 48px ${accent}16` : "0 17px 38px rgba(0,0,0,.24)", transition: "border-color .18s ease, box-shadow .18s ease" }}>
    <button onClick={onSelect} style={{ display: "block", width: "100%", border: 0, padding: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
      <div style={{ height: 164, position: "relative", overflow: "hidden" }}>
        <ScoutRoutePreview route={route} accent={accent} active={active}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.04) 46%,rgba(0,0,0,.80))" }}/>
        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 5, flexWrap: "wrap", maxWidth: "78%" }}><Pill text={`#${rank}`} accent={accent}/><Pill text={fit} accent={accent} muted/><Pill text={source} accent={accent} muted/></div>
        <div style={{ position: "absolute", right: 10, top: 10, width: 43, height: 43, display: "grid", placeItems: "center", borderRadius: 999, background: "rgba(5,8,13,.86)", border: `1px solid ${accent}62`, color: accent, fontSize: 9.5, fontWeight: 1000, boxShadow: "0 5px 16px rgba(0,0,0,.35)" }}>{score}%</div>
        <div style={{ position: "absolute", left: 11, right: 11, bottom: 10 }}><div style={{ color: "#fff", fontSize: 10.7, fontWeight: 1000, lineHeight: 1.18, textShadow: "0 2px 12px rgba(0,0,0,.7)" }}>{cardTitle(route, lang)}</div><div style={{ marginTop: 4, color: "rgba(255,255,255,.78)", fontSize: 6.9, fontWeight: 850 }}>📍 {nearLabel(near, lang)} · {route.scout?.loop ? pickText(lang,"boucle","loop","bucle") : pickText(lang,"linéaire","linear","lineal")} · {terrainLabel(terrain.terrain, lang)}</div></div>
      </div>
      <div style={{ padding: 11, display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}><Metric label={pickText(lang,"DISTANCE","DISTANCE","DISTANCIA")} value={formatDistance(route.distanceM)} accent={accent}/><Metric label={pickText(lang,"DÉPART","START","INICIO")} value={nearLabel(near, lang)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE EST.","EST. TIME","TIEMPO EST.")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/></div>
        {targetDelta ? <div style={{ padding: "6px 8px", borderRadius: 11, background: `${accent}08`, border: `1px solid ${accent}20`, color: textSoft, fontSize: 6.9 }}><span style={{ color: accent, fontWeight: 1000 }}>{pickText(lang,"OBJECTIF","TARGET","OBJETIVO")}</span> · {targetDelta.replace(/^CIBLE\s*/i, "").replace(/^TARGET\s*/i, "").replace(/^OBJETIVO\s*/i, "")}</div> : null}
        <div style={{ color: textSoft, fontSize: 7.1, lineHeight: 1.35, minHeight: 19 }}>{route.scout?.reasons?.slice(0, 3).join(" · ") || terrainLabel(terrain.terrain, lang)}</div>
      </div>
    </button>
    <div style={{ padding: "0 11px 11px", display: "grid", gridTemplateColumns: "38px 1.35fr 1fr 38px", gap: 6 }}><button className="btn" onClick={onFavorite} style={{ minHeight: 39, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}55` : undefined }}>{favorite ? "★" : "☆"}</button><button className="btn" onClick={onDetails} style={{ minHeight: 39, fontSize: 7.2, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>{pickText(lang,"FICHE COMPLÈTE","FULL DETAILS","FICHA COMPLETA")}</button><button className="btn" onClick={onGuide} style={{ minHeight: 39, fontSize: 7.2, fontWeight: 1000 }}>{pickText(lang,"GUIDAGE","GUIDANCE","GUIADO")}</button><button className="btn" onClick={onMaps} style={{ minHeight: 39, padding: 0 }}>↗</button></div>
  </article>;
}

function Pill({ text, accent, muted = false }: { text: string; accent: string; muted?: boolean }) {
  return <span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(5,8,13,.80)", border: `1px solid ${muted ? "rgba(255,255,255,.14)" : `${accent}55`}`, color: muted ? "#fff" : accent, fontSize: 6.8, fontWeight: 1000, backdropFilter: "blur(10px)" }}>{text}</span>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "7px 5px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "rgba(255,255,255,.44)", fontSize: 5.8, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 7.7, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

type MapLayout = { width: number; height: number; zoom: number; center: { x: number; y: number }; tiles: Array<{ key: string; left: number; top: number; url: string }>; routes: Array<{ id: string; polyline: string; midpoint: { x: number; y: number } | null }> };

const SCOUT_MAPLIBRE_VERSION = "5.24.0";
const SCOUT_MAPLIBRE_SCRIPTS = [
  `https://unpkg.com/maplibre-gl@${SCOUT_MAPLIBRE_VERSION}/dist/maplibre-gl.js`,
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${SCOUT_MAPLIBRE_VERSION}/dist/maplibre-gl.js`,
];
const SCOUT_MAPLIBRE_CSS = [
  `https://unpkg.com/maplibre-gl@${SCOUT_MAPLIBRE_VERSION}/dist/maplibre-gl.css`,
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${SCOUT_MAPLIBRE_VERSION}/dist/maplibre-gl.css`,
];
let scoutMapLibrePromise: Promise<any> | null = null;

function ensureScoutMapLibreCss() {
  if (typeof document === "undefined" || document.querySelector(`link[data-mss-maplibre="${SCOUT_MAPLIBRE_VERSION}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = SCOUT_MAPLIBRE_CSS[0];
  link.dataset.mssMaplibre = SCOUT_MAPLIBRE_VERSION;
  link.addEventListener("error", () => { if (link.href !== SCOUT_MAPLIBRE_CSS[1]) link.href = SCOUT_MAPLIBRE_CSS[1]; }, { once: true });
  document.head.appendChild(link);
}

function loadScoutMapLibreScript(url: string, timeoutMs = 7000): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.maplibregl?.Map) { resolve(w.maplibregl); return; }
    const existing = document.querySelector(`script[data-mss-maplibre-src="${url}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("Map timeout")), timeoutMs);
    const finish = () => {
      window.clearTimeout(timer);
      if (w.maplibregl?.Map) resolve(w.maplibregl);
      else reject(new Error("MapLibre indisponible"));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("MapLibre CDN indisponible")); }, { once: true });
    if (!existing) {
      script.src = url;
      script.async = true;
      script.dataset.mssMaplibreSrc = url;
      document.head.appendChild(script);
    }
  });
}

async function loadScoutMapLibre(): Promise<any> {
  if (typeof window === "undefined") throw new Error("MapLibre indisponible");
  const w = window as any;
  if (w.maplibregl?.Map) return w.maplibregl;
  if (w.__mssMapLibrePromise) return w.__mssMapLibrePromise;
  if (scoutMapLibrePromise) return scoutMapLibrePromise;
  ensureScoutMapLibreCss();
  scoutMapLibrePromise = (async () => {
    let lastError: unknown = null;
    for (const url of SCOUT_MAPLIBRE_SCRIPTS) {
      try { return await loadScoutMapLibreScript(url); }
      catch (error) { lastError = error; }
    }
    throw lastError || new Error("MapLibre indisponible");
  })().finally(() => { if (!(window as any).maplibregl?.Map) scoutMapLibrePromise = null; });
  return scoutMapLibrePromise;
}

function scoutRasterTileTemplate(theme: RunningMapTheme): string {
  if (theme === "tourist") return "https://tile.opentopomap.org/{z}/{x}/{y}.png";
  if (theme === "satellite") return RUNNING_SATELLITE_TILES;
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}

function scoutRasterPaint(theme: RunningMapTheme): Record<string, unknown> {
  if (theme === "night") return { "raster-brightness-max": .68, "raster-brightness-min": .08, "raster-saturation": -.42, "raster-contrast": .25 };
  if (theme === "illustrated") return { "raster-saturation": .28, "raster-contrast": .08 };
  if (theme === "light") return { "raster-brightness-max": 1, "raster-brightness-min": .16, "raster-saturation": -.18, "raster-contrast": -.08 };
  if (theme === "satellite") return { "raster-saturation": .08, "raster-contrast": .05 };
  return { "raster-saturation": .10, "raster-contrast": .04 };
}

function scoutRouteGeoJson(routes: RunningRouteTemplate[], selectedRouteId: string | null) {
  return {
    type: "FeatureCollection",
    features: routes.filter((route) => (route.route || []).length > 1).map((route, index) => ({
      type: "Feature",
      properties: { routeId: route.id, order: index + 1, active: route.id === selectedRouteId },
      geometry: { type: "LineString", coordinates: (route.route || []).map((point) => [point.lon, point.lat]) },
    })),
  } as any;
}

function scoutRouteBounds(routes: RunningRouteTemplate[]): [[number, number], [number, number]] | null {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const route of routes) for (const point of route.route || []) {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lon)) continue;
    minLon = Math.min(minLon, point.lon); maxLon = Math.max(maxLon, point.lon);
    minLat = Math.min(minLat, point.lat); maxLat = Math.max(maxLat, point.lat);
  }
  return Number.isFinite(minLon) ? [[minLon, minLat], [maxLon, maxLat]] : null;
}

function routeMidpoint(route: RunningRouteTemplate): GeoPoint | null {
  const rows = route.route || [];
  return rows.length ? rows[Math.floor(rows.length / 2)] : null;
}

function ScoutOverviewMap({ routes, selectedRouteId, onSelect, accent, textSoft, lang }: { routes: RunningRouteTemplate[]; selectedRouteId: string | null; onSelect: (route: RunningRouteTemplate) => void; accent: string; textSoft: string; lang: string }) {
  const theme = React.useMemo<RunningMapTheme>(() => loadRunningMapTheme(), []);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const maplibreRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const routesRef = React.useRef(routes);
  const selectedRef = React.useRef(selectedRouteId);
  const expandedRef = React.useRef(false);
  const previousRoutesKeyRef = React.useRef("");
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = React.useState(false);
  routesRef.current = routes;
  selectedRef.current = selectedRouteId;
  expandedRef.current = expanded;

  const routesKey = React.useMemo(() => routes.map((route) => `${route.id}:${Math.round(Number(route.distanceM || 0))}`).join("|"), [routes]);

  const fitAll = React.useCallback((animate = true) => {
    const map = mapRef.current;
    const bounds = scoutRouteBounds(routesRef.current);
    if (!map || !bounds) return;
    try {
      map.stop?.();
      map.fitBounds(bounds, { padding: expandedRef.current ? 72 : 34, duration: animate ? 380 : 0, maxZoom: 15.5, bearing: 0, pitch: 0 });
    } catch {}
  }, []);

  const zoomBy = React.useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    try { map.stop?.(); map.easeTo({ zoom: Math.max(2, Math.min(19, Number(map.getZoom?.() || 10) + delta)), duration: 180 }); } catch {}
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let clickHandler: ((event: any) => void) | null = null;

    void loadScoutMapLibre().then((maplibregl) => {
      if (cancelled || !host) return;
      maplibreRef.current = maplibregl;
      const bounds = scoutRouteBounds(routesRef.current);
      const center: [number, number] = bounds ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2] : [0, 0];
      const map = new maplibregl.Map({
        container: host,
        style: {
          version: 8,
          sources: { basemap: { type: "raster", tiles: [scoutRasterTileTemplate(theme)], tileSize: 256, attribution: runningMapAttribution(theme) } },
          layers: [{ id: "basemap", type: "raster", source: "basemap", paint: scoutRasterPaint(theme) }],
        },
        center,
        zoom: 11,
        minZoom: 2,
        maxZoom: 19,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: false,
      });
      mapRef.current = map;
      try { map.touchZoomRotate?.disableRotation?.(); } catch {}
      try { map.keyboard?.enable?.(); } catch {}
      try { map.doubleClickZoom?.enable?.(); } catch {}
      try { map.scrollZoom?.enable?.(); } catch {}
      try { map.dragPan?.enable?.(); } catch {}

      map.on("load", () => {
        if (cancelled) return;
        try {
          map.addSource("scout-routes", { type: "geojson", data: scoutRouteGeoJson(routesRef.current, selectedRef.current), lineMetrics: false });
          map.addLayer({ id: "scout-route-shadow", type: "line", source: "scout-routes", paint: { "line-color": "rgba(0,0,0,.76)", "line-width": ["case", ["boolean", ["get", "active"], false], 10, 6], "line-opacity": .94 }, layout: { "line-cap": "round", "line-join": "round" } });
          map.addLayer({ id: "scout-route-line", type: "line", source: "scout-routes", paint: { "line-color": ["case", ["boolean", ["get", "active"], false], accent, "rgba(255,255,255,.82)"], "line-width": ["case", ["boolean", ["get", "active"], false], 5.5, 2.8], "line-opacity": ["case", ["boolean", ["get", "active"], false], 1, .7] }, layout: { "line-cap": "round", "line-join": "round" } });
          map.addLayer({ id: "scout-route-hit", type: "line", source: "scout-routes", paint: { "line-color": "rgba(0,0,0,0)", "line-width": 22 } });
          clickHandler = (event: any) => {
            const id = String(event?.features?.[0]?.properties?.routeId || "");
            const route = routesRef.current.find((item) => item.id === id);
            if (route) onSelect(route);
          };
          map.on("click", "scout-route-hit", clickHandler);
          map.on("mouseenter", "scout-route-hit", () => { try { map.getCanvas().style.cursor = "pointer"; } catch {} });
          map.on("mouseleave", "scout-route-hit", () => { try { map.getCanvas().style.cursor = ""; } catch {} });
        } catch {}
        setStatus("ready");
        previousRoutesKeyRef.current = routesKey;
        window.setTimeout(() => fitAll(false), 30);
      });
      map.on("error", (event: any) => {
        const message = String(event?.error?.message || "");
        if (!map.loaded?.() && /webgl|context|style|source/i.test(message)) setStatus("error");
      });
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => { window.requestAnimationFrame(() => { try { map.resize(); } catch {} }); });
        resizeObserver.observe(host);
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      for (const marker of markersRef.current) { try { marker.remove(); } catch {} }
      markersRef.current = [];
      const map = mapRef.current;
      if (map && clickHandler) { try { map.off("click", "scout-route-hit", clickHandler); } catch {} }
      if (map) { try { map.remove(); } catch {} }
      mapRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || status !== "ready") return;
    try { map.getSource("scout-routes")?.setData(scoutRouteGeoJson(routes, selectedRouteId)); } catch {}
    for (const marker of markersRef.current) { try { marker.remove(); } catch {} }
    markersRef.current = routes.map((route, index) => {
      const point = routeMidpoint(route);
      if (!point) return null;
      const active = route.id === selectedRouteId;
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = String(index + 1);
      el.title = cardTitle(route, lang);
      el.setAttribute("aria-label", `${index + 1}. ${cardTitle(route, lang)}`);
      Object.assign(el.style, { width: active ? "28px" : "23px", height: active ? "28px" : "23px", borderRadius: "999px", border: "2px solid #fff", background: active ? accent : "rgba(7,10,15,.94)", color: active ? "#071018" : "#fff", fontSize: active ? "10px" : "8px", fontWeight: "1000", display: "grid", placeItems: "center", padding: "0", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.45)" });
      el.addEventListener("click", (event) => { event.stopPropagation(); onSelect(route); });
      try { return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([point.lon, point.lat]).addTo(map); }
      catch { return null; }
    }).filter(Boolean);
    if (previousRoutesKeyRef.current && previousRoutesKeyRef.current !== routesKey) window.setTimeout(() => fitAll(true), 20);
    previousRoutesKeyRef.current = routesKey;
  }, [accent, fitAll, lang, routes, routesKey, selectedRouteId, status]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const timer = window.setTimeout(() => { try { map.resize(); } catch {}; }, 60);
    return () => window.clearTimeout(timer);
  }, [expanded, status]);

  React.useEffect(() => {
    if (!expanded || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  const selected = routes.find((route) => route.id === selectedRouteId) || null;
  const shellStyle: React.CSSProperties = expanded ? {
    position: "fixed", inset: 0, zIndex: 100000, width: "100%", height: "100%", overflow: "hidden", background: "#101821", borderRadius: 0,
  } : {
    position: "relative", width: "100%", aspectRatio: "4/3", minHeight: 300, maxHeight: 500, overflow: "hidden", borderRadius: 22, background: "#101821", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 22px 52px rgba(0,0,0,.30)",
  };

  return <div style={shellStyle}>
    <div ref={hostRef} style={{ position: "absolute", inset: 0, touchAction: "none" }}/>
    {status === "error" ? <ScoutOverviewFallback routes={routes} selectedRouteId={selectedRouteId} onSelect={onSelect} accent={accent} theme={theme}/> : null}
    {status === "loading" ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: accent, fontSize: 8, fontWeight: 1000, background: "rgba(6,10,16,.68)" }}>{pickText(lang,"CHARGEMENT DE LA CARTE…","LOADING MAP…","CARGANDO MAPA…")}</div> : null}

    <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 6, alignItems: "center", pointerEvents: "none" }}>
      <div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.84)", border: `1px solid ${accent}40`, color: accent, fontSize: 7, fontWeight: 1000, backdropFilter: "blur(12px)" }}>⌖ {pickText(lang,"CARTE DES PARCOURS","ROUTE MAP","MAPA DE RUTAS")}</div>
      <div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.78)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", fontSize: 7, fontWeight: 1000 }}>{routes.length}</div>
    </div>

    <div style={{ position: "absolute", right: 10, top: 10, display: "grid", gridTemplateColumns: "repeat(2,42px)", gap: 6 }}>
      <MapButton label="+" title={pickText(lang,"Zoom avant","Zoom in","Acercar")} onClick={() => zoomBy(1)}/>
      <MapButton label="−" title={pickText(lang,"Zoom arrière","Zoom out","Alejar")} onClick={() => zoomBy(-1)}/>
      <MapButton label="⌖" title={pickText(lang,"Recentrer tous les parcours","Fit all routes","Centrar todas las rutas")} onClick={() => fitAll(true)}/>
      <MapButton label={expanded ? "×" : "⛶"} title={expanded ? pickText(lang,"Réduire la carte","Close expanded map","Cerrar mapa ampliado") : pickText(lang,"Agrandir la carte","Expand map","Ampliar mapa")} onClick={() => setExpanded((value) => !value)}/>
    </div>

    <div style={{ position: "absolute", left: 10, right: 10, bottom: expanded ? 14 : 10, display: "grid", gap: 6, pointerEvents: "none" }}>
      {selected ? <div style={{ justifySelf: "center", maxWidth: "78%", padding: "6px 10px", borderRadius: 999, background: "rgba(5,8,13,.82)", border: `1px solid ${accent}42`, color: accent, fontSize: 7.2, fontWeight: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", backdropFilter: "blur(12px)" }}>{cardTitle(selected, lang)}</div> : null}
      <div style={{ justifySelf: "center", padding: "6px 10px", borderRadius: 999, background: "rgba(5,8,13,.76)", border: "1px solid rgba(255,255,255,.09)", color: textSoft, fontSize: 6.6, textAlign: "center", backdropFilter: "blur(12px)" }}>{pickText(lang,"1 doigt : déplacer · 2 doigts : zoomer · Touchez un tracé pour le sélectionner","1 finger: pan · 2 fingers: zoom · Tap a route to select it","1 dedo: mover · 2 dedos: zoom · Toca una ruta para seleccionarla")}</div>
    </div>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", left: 4, bottom: expanded ? 4 : 4, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.54)", color: "#fff", fontSize: 6, textDecoration: "none" }}>© OSM</a>
  </div>;
}

function MapButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return <button type="button" className="btn" aria-label={title} title={title} onClick={onClick} style={{ width: 42, height: 42, minHeight: 42, padding: 0, borderRadius: 13, background: "rgba(5,8,13,.86)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontSize: label === "⛶" ? 15 : 18, fontWeight: 1000, backdropFilter: "blur(12px)", boxShadow: "0 5px 16px rgba(0,0,0,.32)" }}>{label}</button>;
}

function ScoutOverviewFallback({ routes, selectedRouteId, onSelect, accent, theme }: { routes: RunningRouteTemplate[]; selectedRouteId: string | null; onSelect: (route: RunningRouteTemplate) => void; accent: string; theme: RunningMapTheme }) {
  const layout = React.useMemo(() => buildCollectionMap(routes, 1000, 720, theme), [routes, theme]);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#101821" }}>{layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover", filter: runningMapRasterFilter(theme), userSelect: "none" }}/>) }<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row, index) => { const active = row.id === selectedRouteId; const route = routes.find((item) => item.id === row.id); return <g key={row.id} onClick={() => route && onSelect(route)} style={{ cursor: "pointer" }}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.70)" strokeWidth={active ? 11 : 7} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={active ? accent : "rgba(255,255,255,.72)"} strokeWidth={active ? 5.8 : 3} opacity={active ? 1 : .66} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>{row.midpoint ? <g><circle cx={row.midpoint.x} cy={row.midpoint.y} r={active ? 14 : 10.5} fill={active ? accent : "rgba(7,10,15,.93)"} stroke="#fff" strokeWidth="2"/><text x={row.midpoint.x} y={row.midpoint.y+3} textAnchor="middle" fontSize={active ? 9 : 7} fontWeight="900" fill={active ? "#081018" : "#fff"}>{index+1}</text></g> : null}</g>;})}</svg></> : null}</div>;
}

function ScoutMiniMap({ route, accent }: { route: RunningRouteTemplate; accent: string }) {
  const theme = React.useMemo<RunningMapTheme>(() => loadRunningMapTheme(), []);
  const layout = React.useMemo(() => buildCollectionMap([route], 420, 190, theme), [route, theme]);
  return <div style={{ position: "absolute", inset: 0, background: "#111a23" }}>{layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover", filter: runningMapRasterFilter(theme) }}/>) }<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row) => <g key={row.id}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.72)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>)}</svg></> : null}</div>;
}

function buildCollectionMap(routes: RunningRouteTemplate[], width = 1000, height = 720, theme: RunningMapTheme = loadRunningMapTheme()): MapLayout | null {
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
  for (let tx=minX; tx<=maxX; tx += 1) for (let ty=minY; ty<=maxY; ty += 1) { if (ty<0 || ty>=count) continue; const wx=((tx%count)+count)%count; tiles.push({ key:`${zoom}-${tx}-${ty}`, left:tx*256-center.x+width/2, top:ty*256-center.y+height/2, url:runningMapRasterTileUrl(theme, zoom, wx, ty) }); }
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

