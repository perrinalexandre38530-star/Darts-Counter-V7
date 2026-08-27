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

function nearLabel(meters: number, lang: string) {
  if (!(meters > 0)) return pickText(lang, "AUTOUR DE TOI", "AROUND YOU", "CERCA DE TI");
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function OutdoorRouteScoutDiscover(props: Props) {
  const { routes, selectedRouteId, savedRoutes, sport, lang, accent, textSoft } = props;
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
  const activeFilters = Number(distanceMode !== "all") + Number(loopOnly) + Number(minScore > 0) + Number(sortMode !== "recommended");

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
            <ChoiceBlock label={pickText(lang, "RAYON", "RADIUS", "RADIO")} values={[10, 20, 35]} value={props.radiusKm} suffix="KM" accent={accent} onChange={props.onRadiusChange}/>
            <ChoiceBlock label={pickText(lang, "DISTANCE", "DISTANCE", "DISTANCIA")} values={[5, 10, 20]} value={props.targetDistanceKm} suffix="KM" accent={accent} onChange={props.onTargetDistanceChange}/>
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

      {filtersOpen ? <div style={{ padding: 9, borderRadius: 16, background: "linear-gradient(145deg,rgba(255,255,255,.045),rgba(5,8,13,.86))", border: "1px solid rgba(255,255,255,.08)" }}>
        <FilterRail title={pickText(lang, "TRIER", "SORT", "ORDENAR")}>
          {([['recommended', pickText(lang, '✦ RECOMMANDÉS', '✦ RECOMMENDED', '✦ RECOMENDADAS')], ['nearby', pickText(lang, '📍 PROCHES', '📍 NEARBY', '📍 CERCANAS')], ['distance', pickText(lang, '↔ DISTANCE', '↔ DISTANCE', '↔ DISTANCIA')], ['climb', pickText(lang, '⛰️ D+', '⛰️ CLIMB', '⛰️ D+')]] as Array<[SortMode,string]>).map(([id,label]) => <Chip key={id} active={sortMode === id} label={label} accent={accent} onClick={() => setSortMode(id)}/>) }
        </FilterRail>
        <FilterRail title={pickText(lang, "FILTRER", "FILTER", "FILTRAR")}>
          {([['all', pickText(lang,'TOUTES','ALL','TODAS')], ['short','< 7 KM'], ['medium','7–15 KM'], ['long','15+ KM']] as Array<[DistanceMode,string]>).map(([id,label]) => <Chip key={id} active={distanceMode === id} label={label} accent={accent} onClick={() => setDistanceMode(id)}/>) }
          <Chip active={loopOnly} label={`↻ ${pickText(lang,"BOUCLES","LOOPS","BUCLES")}`} accent={accent} onClick={() => setLoopOnly((value) => !value)}/>
          <Chip active={minScore > 0} label={`✦ ${minScore ? `${minScore}+` : pickText(lang,"SCORE","SCORE","PUNT.")}`} accent={accent} onClick={() => setMinScore((value) => value >= 75 ? 0 : value >= 60 ? 75 : 60)}/>
        </FilterRail>
      </div> : null}

      {viewMode === "map" ? <div style={{ display: "grid", gap: 9 }}>
        <ScoutOverviewMap routes={filtered.slice(0, 10)} selectedRouteId={selected?.id || null} onSelect={props.onSelect} accent={accent} textSoft={textSoft} lang={lang}/>
        {selected ? <SelectedRouteStrip route={selected} favorite={isFavorite(selected, savedRoutes)} sport={sport} lang={lang} accent={accent} textSoft={textSoft} onDetails={() => props.onOpenDetails(selected)} onGuide={() => props.onGuide(selected)} onFavorite={() => props.onToggleFavorite(selected)} onMaps={() => props.onOpenMaps(selected)}/> : null}
      </div> : <div style={{ display: "grid", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}><div style={{ color: "#fff", fontSize: 9.3, fontWeight: 1000 }}>{filtered.length} {pickText(lang,"parcours","routes","rutas")}</div><div style={{ color: textSoft, fontSize: 7.1 }}>{pickText(lang,"Touchez une carte pour la sélectionner","Tap a card to select it","Toca una tarjeta para seleccionarla")}</div></div>
        {filtered.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))", gap: 11 }}>
          {filtered.slice(0, 12).map((route, index) => <ScoutRouteCard key={route.id} route={route} rank={index + 1} active={route.id === selected?.id} favorite={isFavorite(route, savedRoutes)} sport={sport} lang={lang} accent={accent} textSoft={textSoft} onSelect={() => props.onSelect(route)} onDetails={() => props.onOpenDetails(route)} onGuide={() => props.onGuide(route)} onFavorite={() => props.onToggleFavorite(route)} onMaps={() => props.onOpenMaps(route)}/>) }
        </div> : <EmptyFilters lang={lang} textSoft={textSoft}/>} 
      </div>}
    </> : <div style={{ padding: 20, textAlign: "center", color: textSoft, borderRadius: 20, border: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(145deg,rgba(255,255,255,.035),rgba(5,8,13,.72))", lineHeight: 1.5, fontSize: 8.4 }}><div style={{ fontSize: 25, marginBottom: 8 }}>⌖</div><b style={{ color: "#fff" }}>{pickText(lang,"Aucun parcours affiché","No routes yet","Todavía no hay rutas")}</b><div style={{ marginTop: 5 }}>{pickText(lang,"Lance le Scout pour remplir cette page avec de vrais tracés existants.","Run Scout to fill this page with real existing routes.","Lanza Scout para llenar esta página con rutas reales existentes.")}</div></div>}
  </div>;
}

function ChoiceBlock({ label, values, value, suffix, accent, onChange }: { label: string; values: number[]; value: number; suffix: string; accent: string; onChange: (value: number) => void }) {
  return <div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 6.6, fontWeight: 1000, letterSpacing: .5 }}>{label}</div><div style={{ marginTop: 6, display: "grid", gridTemplateColumns: `repeat(${values.length},minmax(0,1fr))`, gap: 4 }}>{values.map((item) => <button key={item} className="btn" onClick={() => onChange(item)} style={{ minHeight: 30, padding: "3px 3px", fontSize: 7.2, fontWeight: 1000, color: value === item ? accent : undefined, borderColor: value === item ? `${accent}66` : undefined, background: value === item ? `${accent}0d` : undefined }}>{item} {suffix}</button>)}</div></div>;
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

function SelectedRouteStrip({ route, favorite, sport, lang, accent, textSoft, onDetails, onGuide, onFavorite, onMaps }: { route: RunningRouteTemplate; favorite: boolean; sport: OutdoorPerformanceSport; lang: string; accent: string; textSoft: string; onDetails: () => void; onGuide: () => void; onFavorite: () => void; onMaps: () => void }) {
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const near = Number(route.scout?.distanceFromCenterM || 0);
  const score = Math.round(Number(route.scout?.score || 0));
  return <div style={{ display: "grid", gap: 9, padding: 11, borderRadius: 18, background: "linear-gradient(145deg,rgba(255,255,255,.052),rgba(5,8,13,.90))", border: `1px solid ${accent}38`, boxShadow: "0 16px 36px rgba(0,0,0,.24)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 9.8, fontWeight: 1000, lineHeight: 1.2 }}>{cardTitle(route, lang)}</div><div style={{ marginTop: 4, display: "flex", gap: 5, flexWrap: "wrap" }}><Pill text={`✦ ${score}%`} accent={accent}/><Pill text={`📍 ${nearLabel(near, lang)}`} accent={accent} muted/>{route.scout?.loop ? <Pill text={`↻ ${pickText(lang,"BOUCLE","LOOP","BUCLE")}`} accent={accent} muted/> : null}{terrain.hasElevation ? <Pill text={`◒ ${terrain.difficultyScore}/100`} accent={accent} muted/> : null}</div></div>
      <button className="btn" onClick={onFavorite} style={{ minWidth: 36, minHeight: 36, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}55` : undefined }}>{favorite ? "★" : "☆"}</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><Metric label={pickText(lang,"DISTANCE","DISTANCE","DISTANCIA")} value={formatDistance(route.distanceM)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE","TIME","TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/></div>
    <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 38px", gap: 6 }}><button className="btn" onClick={onDetails} style={{ minHeight: 38, color: accent, borderColor: `${accent}55`, fontSize: 7.4, fontWeight: 1000 }}>{pickText(lang,"VOIR LE PARCOURS","VIEW ROUTE","VER RUTA")}</button><button className="btn" onClick={onGuide} style={{ minHeight: 38, fontSize: 7.4, fontWeight: 1000 }}>{pickText(lang,"GUIDAGE","GUIDANCE","GUIADO")}</button><button className="btn" onClick={onMaps} style={{ minHeight: 38, padding: 0 }}>↗</button></div>
  </div>;
}

function ScoutRouteCard({ route, rank, active, favorite, sport, lang, accent, textSoft, onSelect, onDetails, onGuide, onFavorite, onMaps }: { route: RunningRouteTemplate; rank: number; active: boolean; favorite: boolean; sport: OutdoorPerformanceSport; lang: string; accent: string; textSoft: string; onSelect: () => void; onDetails: () => void; onGuide: () => void; onFavorite: () => void; onMaps: () => void }) {
  const [photo, setPhoto] = React.useState<OutdoorRoutePhoto | null>(null);
  React.useEffect(() => { let alive = true; setPhoto(null); void fetchOutdoorRouteCoverPhoto(route, lang).then((value) => { if (alive) setPhoto(value); }).catch(() => {}); return () => { alive = false; }; }, [lang, route.id]);
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const score = Math.round(Number(route.scout?.score || 0));
  const near = Number(route.scout?.distanceFromCenterM || 0);
  return <article style={{ overflow: "hidden", borderRadius: 21, background: "linear-gradient(145deg,rgba(255,255,255,.052),rgba(4,7,11,.94))", border: `1px solid ${active ? `${accent}70` : "rgba(255,255,255,.085)"}`, boxShadow: active ? `0 22px 48px ${accent}16` : "0 17px 38px rgba(0,0,0,.24)", transform: active ? "translateY(-2px)" : undefined, transition: "transform .18s ease, box-shadow .18s ease" }}>
    <button onClick={onSelect} style={{ display: "block", width: "100%", border: 0, padding: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
      <div style={{ height: 176, position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#17222c,#0d1219)" }}>
        {photo ? <img src={photo.thumbUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : <ScoutMiniMap route={route} accent={accent}/>} 
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.08) 45%,rgba(0,0,0,.76))" }}/>
        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 5, flexWrap: "wrap" }}><Pill text={`✦ ${score}%`} accent={accent}/>{route.scout?.loop ? <Pill text={`↻ ${pickText(lang,"BOUCLE","LOOP","BUCLE")}`} accent={accent} muted/> : null}{terrain.hasElevation ? <Pill text={`◒ ${terrain.difficultyScore}/100`} accent={accent} muted/> : null}</div>
        <div style={{ position: "absolute", right: 10, top: 10, width: 31, height: 31, display: "grid", placeItems: "center", borderRadius: 999, background: "rgba(5,8,13,.80)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", fontSize: 8, fontWeight: 1000 }}>#{rank}</div>
        <div style={{ position: "absolute", left: 11, right: 11, bottom: 10 }}><div style={{ color: "#fff", fontSize: 10.4, fontWeight: 1000, lineHeight: 1.18, textShadow: "0 2px 12px rgba(0,0,0,.7)" }}>{cardTitle(route, lang)}</div><div style={{ marginTop: 5, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: "rgba(255,255,255,.82)", fontSize: 6.8, fontWeight: 900 }}>📍 {nearLabel(near, lang)}</span>{photo?.placeName ? <><span style={{ color: "rgba(255,255,255,.42)" }}>·</span><span style={{ color: "rgba(255,255,255,.72)", fontSize: 6.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{photo.placeName}</span></> : null}</div></div>
      </div>
      <div style={{ padding: 11 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><Metric label={pickText(lang,"DIST.","DIST.","DIST.")} value={formatDistance(route.distanceM)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE","TIME","TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/></div>
        <div style={{ marginTop: 8, color: textSoft, fontSize: 7.2, lineHeight: 1.35, minHeight: 20 }}>{route.scout?.reasons?.slice(0, 2).join(" · ") || terrainLabel(terrain.terrain, lang)}</div>
      </div>
    </button>
    <div style={{ padding: "0 11px 11px", display: "grid", gridTemplateColumns: "38px 1.2fr 1fr 38px", gap: 6 }}><button className="btn" onClick={onFavorite} style={{ minHeight: 37, padding: 0, color: favorite ? accent : undefined, borderColor: favorite ? `${accent}55` : undefined }}>{favorite ? "★" : "☆"}</button><button className="btn" onClick={onDetails} style={{ minHeight: 37, fontSize: 7.1, fontWeight: 1000, color: accent, borderColor: `${accent}55` }}>{pickText(lang,"VOIR LA FICHE","VIEW ROUTE","VER FICHA")}</button><button className="btn" onClick={onGuide} style={{ minHeight: 37, fontSize: 7.1, fontWeight: 1000 }}>{pickText(lang,"GUIDAGE","GUIDANCE","GUIADO")}</button><button className="btn" onClick={onMaps} style={{ minHeight: 37, padding: 0 }}>↗</button></div>
  </article>;
}

function Pill({ text, accent, muted = false }: { text: string; accent: string; muted?: boolean }) {
  return <span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(5,8,13,.80)", border: `1px solid ${muted ? "rgba(255,255,255,.14)" : `${accent}55`}`, color: muted ? "#fff" : accent, fontSize: 6.8, fontWeight: 1000, backdropFilter: "blur(10px)" }}>{text}</span>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, padding: "7px 5px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "rgba(255,255,255,.44)", fontSize: 5.8, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 7.7, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

type MapLayout = { width: number; height: number; zoom: number; center: { x: number; y: number }; tiles: Array<{ key: string; left: number; top: number; url: string }>; routes: Array<{ id: string; polyline: string; midpoint: { x: number; y: number } | null }> };

function ScoutOverviewMap({ routes, selectedRouteId, onSelect, accent, textSoft, lang }: { routes: RunningRouteTemplate[]; selectedRouteId: string | null; onSelect: (route: RunningRouteTemplate) => void; accent: string; textSoft: string; lang: string }) {
  const layout = React.useMemo(() => buildCollectionMap(routes), [routes]);
  return <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", minHeight: 300, maxHeight: 500, overflow: "hidden", borderRadius: 22, background: "#101821", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 22px 52px rgba(0,0,0,.30)" }}>
    {layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover", userSelect: "none" }}/>) }<div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(3,7,11,.04),rgba(3,7,11,.12))" }}/><svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row, index) => { const active = row.id === selectedRouteId; const route = routes.find((item) => item.id === row.id); return <g key={row.id} onClick={() => route && onSelect(route)} style={{ cursor: "pointer" }}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.70)" strokeWidth={active ? 11 : 7} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={active ? accent : "rgba(255,255,255,.72)"} strokeWidth={active ? 5.8 : 3} opacity={active ? 1 : .66} strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>{row.midpoint ? <g><circle cx={row.midpoint.x} cy={row.midpoint.y} r={active ? 14 : 10.5} fill={active ? accent : "rgba(7,10,15,.93)"} stroke="#fff" strokeWidth="2"/><text x={row.midpoint.x} y={row.midpoint.y+3} textAnchor="middle" fontSize={active ? 9 : 7} fontWeight="900" fill={active ? "#081018" : "#fff"}>{index+1}</text></g> : null}</g>;})}</svg></> : null}
    <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 6, alignItems: "center" }}><div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.82)", border: `1px solid ${accent}40`, color: accent, fontSize: 7, fontWeight: 1000, backdropFilter: "blur(12px)" }}>⌖ {pickText(lang,"CARTE DES PARCOURS","ROUTE MAP","MAPA DE RUTAS")}</div><div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.76)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", fontSize: 7, fontWeight: 1000 }}>{routes.length}</div></div>
    <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, padding: "7px 10px", borderRadius: 13, background: "rgba(5,8,13,.74)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.09)", color: textSoft, fontSize: 6.8, textAlign: "center" }}>{pickText(lang,"Touchez un tracé pour le mettre en avant","Tap a route to bring it forward","Toca una ruta para destacarla")}</div>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: "absolute", right: 4, top: 4, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.54)", color: "#fff", fontSize: 6, textDecoration: "none" }}>© OSM</a>
  </div>;
}

function ScoutMiniMap({ route, accent }: { route: RunningRouteTemplate; accent: string }) {
  const layout = React.useMemo(() => buildCollectionMap([route], 420, 190), [route]);
  return <div style={{ position: "absolute", inset: 0, background: "#111a23" }}>{layout ? <>{layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left/layout.width*100}%`, top: `${tile.top/layout.height*100}%`, width: `${256/layout.width*100}%`, height: `${256/layout.height*100}%`, objectFit: "cover" }}/>) }<svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{layout.routes.map((row) => <g key={row.id}><polyline points={row.polyline} fill="none" stroke="rgba(0,0,0,.72)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/><polyline points={row.polyline} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>)}</svg></> : null}</div>;
}

function buildCollectionMap(routes: RunningRouteTemplate[], width = 1000, height = 720): MapLayout | null {
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
