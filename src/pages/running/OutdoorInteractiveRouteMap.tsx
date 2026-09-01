import React from "react";
import type { GeoPoint } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { fetchOutdoorRoutePlaceContext, outdoorRoutePlaceIcon, type OutdoorRoutePlace } from "../../activity/outdoorRoutePlaces";
import { fetchOutdoorPlacePhotos, type OutdoorRoutePhoto } from "../../activity/outdoorRouteMedia";
import RunningTerrain3DMap from "./RunningTerrain3DMap";
import "./runningResponsive.css";

type MapTheme = "tourist" | "illustrated" | "light" | "night";

type Props = {
  route: RunningRouteTemplate;
  accent: string;
  lang: string;
  textSoft?: string;
  height?: string | number;
  fullscreen?: boolean;
  activePointIndex?: number | null;
  onActivePointChange?: (index: number | null) => void;
  onFullscreen?: () => void;
  onCloseFullscreen?: () => void;
};

type Layout = {
  width: number;
  height: number;
  zoom: number;
  center: { x: number; y: number };
  screen: Array<{ x: number; y: number }>;
  tiles: Array<{ key: string; left: number; top: number; x: number; y: number; z: number; url: string; overlayUrl: string }>;
};

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function mercatorPixel(lat: number, lon: number, zoom: number) {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin(safeLat * Math.PI / 180);
  return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}
function mercatorLatLon(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const lon = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  return { lat: 180 / Math.PI * Math.atan(Math.sinh(n)), lon };
}
function pointerDistance(rows: Array<{ x: number; y: number }>) {
  return rows.length < 2 ? 0 : Math.hypot(rows[0].x - rows[1].x, rows[0].y - rows[1].y);
}
function fitZoom(points: GeoPoint[], width: number, height: number) {
  if (!points.length) return 14;
  const w = Math.max(280, width), h = Math.max(220, height);
  for (let zoom = 18; zoom >= 3; zoom -= 1) {
    const projected = points.map((point) => mercatorPixel(point.lat, point.lon, zoom));
    const xs = projected.map((point) => point.x), ys = projected.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= w * .76 && Math.max(...ys) - Math.min(...ys) <= h * .68) return zoom;
  }
  return 3;
}
function themeTile(theme: MapTheme, z: number, x: number, y: number) {
  if (theme === "tourist") return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}
function themeFilter(theme: MapTheme) {
  if (theme === "illustrated") return "sepia(.18) saturate(1.35) contrast(.93) brightness(1.08)";
  if (theme === "light") return "grayscale(.08) saturate(.72) contrast(.88) brightness(1.15)";
  if (theme === "night") return "invert(.88) hue-rotate(180deg) saturate(.55) brightness(.68) contrast(1.24)";
  return "saturate(1.12) contrast(1.03)";
}
function themeIcon(theme: MapTheme) { return theme === "tourist" ? "⛰" : theme === "illustrated" ? "✎" : theme === "light" ? "☀" : "☾"; }
function screenPoint(lat: number, lon: number, layout: Layout) {
  const world = mercatorPixel(lat, lon, layout.zoom);
  return { x: world.x - layout.center.x + layout.width / 2, y: world.y - layout.center.y + layout.height / 2 };
}
function buildLayout(points: GeoPoint[], width: number, height: number, zoomDelta: number, centerOverride: GeoPoint | null, theme: MapTheme): Layout | null {
  if (!points.length) return null;
  const safeWidth = Math.max(280, Math.round(width || 360));
  const safeHeight = Math.max(220, Math.round(height || 360));
  const lats = points.map((point) => point.lat), lons = points.map((point) => point.lon);
  const centerLat = centerOverride?.lat ?? (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = centerOverride?.lon ?? (Math.min(...lons) + Math.max(...lons)) / 2;
  const fitted = fitZoom(points, safeWidth, safeHeight);
  const zoom = clamp(fitted + zoomDelta, 3, 19);
  const center = mercatorPixel(centerLat, centerLon, zoom);
  const minX = Math.floor((center.x - safeWidth / 2) / 256) - 1;
  const maxX = Math.floor((center.x + safeWidth / 2) / 256) + 1;
  const minY = Math.floor((center.y - safeHeight / 2) / 256) - 1;
  const maxY = Math.floor((center.y + safeHeight / 2) / 256) + 1;
  const count = 2 ** zoom;
  const tiles: Layout["tiles"] = [];
  for (let tx = minX; tx <= maxX; tx += 1) for (let ty = minY; ty <= maxY; ty += 1) {
    if (ty < 0 || ty >= count) continue;
    const wrappedX = ((tx % count) + count) % count;
    tiles.push({
      key: `${zoom}-${tx}-${ty}`,
      left: tx * 256 - center.x + safeWidth / 2,
      top: ty * 256 - center.y + safeHeight / 2,
      x: wrappedX, y: ty, z: zoom,
      url: themeTile(theme, zoom, wrappedX, ty),
      overlayUrl: `https://tile.waymarkedtrails.org/hiking/${zoom}/${wrappedX}/${ty}.png`,
    });
  }
  return {
    width: safeWidth, height: safeHeight, zoom, center, tiles,
    screen: points.map((point) => { const world = mercatorPixel(point.lat, point.lon, zoom); return { x: world.x - center.x + safeWidth / 2, y: world.y - center.y + safeHeight / 2 }; }),
  };
}

export default function OutdoorInteractiveRouteMap({ route, accent, lang, textSoft = "#a8a8b3", height = "clamp(350px,58svh,680px)", fullscreen = false, activePointIndex = null, onActivePointChange, onFullscreen, onCloseFullscreen }: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const pointersRef = React.useRef(new Map<number, { x: number; y: number }>());
  const dragRef = React.useRef<{ id: number; x: number; y: number; centerWorld: { x: number; y: number }; moved: boolean } | null>(null);
  const pinchRef = React.useRef<{ distance: number; zoomDelta: number } | null>(null);
  const [mapMode, setMapMode] = React.useState<"2d" | "3d">("2d");
  const [theme, setTheme] = React.useState<MapTheme>("tourist");
  const [themeMenu, setThemeMenu] = React.useState(false);
  const [zoomDelta, setZoomDelta] = React.useState(0);
  const [manualCenter, setManualCenter] = React.useState<GeoPoint | null>(null);
  const [size, setSize] = React.useState({ width: 360, height: 420 });
  const [places, setPlaces] = React.useState<OutdoorRoutePlace[]>([]);
  const [selectedPlace, setSelectedPlace] = React.useState<OutdoorRoutePlace | null>(null);
  const [placePhotos, setPlacePhotos] = React.useState<OutdoorRoutePhoto[]>([]);
  const [placeLoading, setPlaceLoading] = React.useState(false);

  const safePoints = React.useMemo(() => (route.route || []).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)), [route.route]);
  const layout = React.useMemo(() => buildLayout(safePoints, size.width, size.height, zoomDelta, manualCenter, theme), [manualCenter, safePoints, size.height, size.width, theme, zoomDelta]);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) setSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [mapMode]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchOutdoorRoutePlaceContext(route, lang).then((context) => { if (!cancelled) setPlaces(context.places || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [lang, route]);

  React.useEffect(() => {
    if (!selectedPlace) { setPlacePhotos([]); return; }
    let cancelled = false;
    setPlaceLoading(true);
    setPlacePhotos([]);
    void fetchOutdoorPlacePhotos(route, selectedPlace, lang, 4).then((rows) => { if (!cancelled) setPlacePhotos(rows); }).catch(() => {}).finally(() => { if (!cancelled) setPlaceLoading(false); });
    return () => { cancelled = true; };
  }, [lang, route, selectedPlace]);

  const resetView = React.useCallback(() => { setZoomDelta(0); setManualCenter(null); }, []);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapMode !== "2d" || !layout) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    if (pointersRef.current.size === 1) {
      dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, centerWorld: { ...layout.center }, moved: false };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      pinchRef.current = { distance: pointerDistance(Array.from(pointersRef.current.values())), zoomDelta };
      dragRef.current = null;
    }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapMode !== "2d" || !layout || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const distance = pointerDistance(Array.from(pointersRef.current.values()));
      const ratio = distance / Math.max(1, pinchRef.current.distance);
      if (ratio > 1.18) { const next = clamp(pinchRef.current.zoomDelta + 1, -5, 7); setZoomDelta(next); pinchRef.current = { distance, zoomDelta: next }; }
      else if (ratio < .84) { const next = clamp(pinchRef.current.zoomDelta - 1, -5, 7); setZoomDelta(next); pinchRef.current = { distance, zoomDelta: next }; }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const rect = hostRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const x = drag.centerWorld.x - dx * (layout.width / rect.width);
    const y = drag.centerWorld.y - dy * (layout.height / rect.height);
    const geo = mercatorLatLon(x, y, layout.zoom);
    setManualCenter({ lat: geo.lat, lon: geo.lon, timestamp: Date.now() });
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!pointersRef.current.size) dragRef.current = null;
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (mapMode !== "2d") return;
    event.preventDefault(); event.stopPropagation();
    setZoomDelta((value) => clamp(value + (event.deltaY < 0 ? 1 : -1), -5, 7));
  };

  const selectNearestPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.moved || !layout || !onActivePointChange || mapMode !== "2d") return;
    const rect = hostRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width * layout.width;
    const y = (event.clientY - rect.top) / rect.height * layout.height;
    let best = -1, bestD = Number.POSITIVE_INFINITY;
    for (let index = 0; index < layout.screen.length; index += 1) {
      const point = layout.screen[index], distance = Math.hypot(point.x - x, point.y - y);
      if (distance < bestD) { bestD = distance; best = index; }
    }
    if (best >= 0 && bestD < 34) onActivePointChange(best);
  };

  const shellStyle: React.CSSProperties = { position: "relative", width: "100%", height: fullscreen ? "100%" : height, minHeight: fullscreen ? 0 : 320, overflow: "hidden", borderRadius: fullscreen ? 0 : 20, background: "#101821", border: fullscreen ? undefined : "1px solid rgba(255,255,255,.09)", boxShadow: fullscreen ? undefined : "0 20px 52px rgba(0,0,0,.28)" };

  if (mapMode === "3d") return <div className="running-map-shell" style={shellStyle}>
    <RunningTerrain3DMap points={safePoints} accent={accent} lang={lang} textSoft={textSoft} height="100%" fullscreen={fullscreen} routeName={route.name} places={places} activePointIndex={activePointIndex} onActivePointChange={onActivePointChange} onPlaceSelect={setSelectedPlace} onFallback2D={() => setMapMode("2d")}/>
    <MapToolbar accent={accent} lang={lang} mapMode={mapMode} theme={theme} themeMenu={themeMenu} setMapMode={setMapMode} setThemeMenu={setThemeMenu} setTheme={setTheme} resetView={resetView} onFullscreen={onFullscreen} onCloseFullscreen={onCloseFullscreen} fullscreen={fullscreen}/>
    {selectedPlace ? <PlacePopup place={selectedPlace} photos={placePhotos} loading={placeLoading} accent={accent} textSoft={textSoft} lang={lang} onClose={() => setSelectedPlace(null)}/> : null}
  </div>;

  return <div ref={hostRef} className="running-map-shell" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(event) => { selectNearestPoint(event); onPointerUp(event); }} onPointerCancel={onPointerUp} onWheel={onWheel} style={{ ...shellStyle, touchAction: "none", userSelect: "none", cursor: "grab" }}>
    {layout ? <>
      {layout.tiles.map((tile) => <React.Fragment key={tile.key}>
        <img src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: tile.left, top: tile.top, width: 256, height: 256, maxWidth: "none", objectFit: "cover", filter: themeFilter(theme), userSelect: "none", pointerEvents: "none" }}/>
        {theme === "tourist" ? <img src={tile.overlayUrl} alt="" draggable={false} style={{ position: "absolute", left: tile.left, top: tile.top, width: 256, height: 256, maxWidth: "none", objectFit: "cover", userSelect: "none", pointerEvents: "none", opacity: .72 }}/> : null}
      </React.Fragment>)}
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <polyline points={layout.screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} fill="none" stroke="rgba(0,0,0,.82)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={layout.screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        {layout.screen[0] ? <><circle cx={layout.screen[0].x} cy={layout.screen[0].y} r="9" fill="#42ef7e" stroke="#fff" strokeWidth="3"/><text x={layout.screen[0].x} y={layout.screen[0].y - 13} textAnchor="middle" fontSize="20">🚩</text></> : null}
        {layout.screen[layout.screen.length - 1] ? <><circle cx={layout.screen[layout.screen.length - 1].x} cy={layout.screen[layout.screen.length - 1].y} r="9" fill="#ff5668" stroke="#fff" strokeWidth="3"/><text x={layout.screen[layout.screen.length - 1].x} y={layout.screen[layout.screen.length - 1].y - 13} textAnchor="middle" fontSize="20">🏁</text></> : null}
        {activePointIndex != null && layout.screen[activePointIndex] ? <><circle cx={layout.screen[activePointIndex].x} cy={layout.screen[activePointIndex].y} r="12" fill="rgba(0,0,0,.7)" stroke="#fff" strokeWidth="2"/><circle cx={layout.screen[activePointIndex].x} cy={layout.screen[activePointIndex].y} r="6" fill={accent}/></> : null}
      </svg>
      {places.slice(0, fullscreen ? 18 : 10).map((place) => { const point = screenPoint(place.lat, place.lon, layout); if (point.x < -30 || point.y < -30 || point.x > layout.width + 30 || point.y > layout.height + 30) return null; return <button key={place.id} className="btn" title={place.name} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setSelectedPlace(place); }} style={{ position: "absolute", left: point.x, top: point.y, transform: "translate(-50%,-50%)", zIndex: 7, width: 31, height: 31, minWidth: 31, minHeight: 31, padding: 0, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(5,8,13,.9)", border: "2px solid rgba(255,255,255,.82)", boxShadow: "0 5px 16px rgba(0,0,0,.42)", fontSize: 14 }}>{outdoorRoutePlaceIcon(place.category)}</button>; })}
    </> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: textSoft }}>{pickText(lang, "Carte indisponible", "Map unavailable", "Mapa no disponible")}</div>}

    <MapToolbar accent={accent} lang={lang} mapMode={mapMode} theme={theme} themeMenu={themeMenu} setMapMode={setMapMode} setThemeMenu={setThemeMenu} setTheme={setTheme} resetView={resetView} onFullscreen={onFullscreen} onCloseFullscreen={onCloseFullscreen} fullscreen={fullscreen}/>
    <div className="running-map-hint" style={{ position: "absolute", left: 9, bottom: 8, zIndex: 8, padding: "5px 8px", borderRadius: 999, background: "rgba(5,8,13,.78)", border: "1px solid rgba(255,255,255,.09)", color: textSoft, fontSize: 7, pointerEvents: "none", backdropFilter: "blur(10px)" }}>{pickText(lang, "Glisser · pincer · molette", "Drag · pinch · wheel", "Mover · pellizcar · rueda")}</div>
    {selectedPlace ? <PlacePopup place={selectedPlace} photos={placePhotos} loading={placeLoading} accent={accent} textSoft={textSoft} lang={lang} onClose={() => setSelectedPlace(null)}/> : null}
  </div>;
}

function MapToolbar({ accent, lang, mapMode, theme, themeMenu, setMapMode, setThemeMenu, setTheme, resetView, onFullscreen, onCloseFullscreen, fullscreen }: {
  accent: string; lang: string; mapMode: "2d" | "3d"; theme: MapTheme; themeMenu: boolean;
  setMapMode: (mode: "2d" | "3d") => void; setThemeMenu: (value: boolean | ((value: boolean) => boolean)) => void; setTheme: (theme: MapTheme) => void; resetView: () => void;
  onFullscreen?: () => void; onCloseFullscreen?: () => void; fullscreen: boolean;
}) {
  const themes: Array<[MapTheme, string]> = [["tourist", pickText(lang,"Touristique","Tourist","Turístico")],["illustrated",pickText(lang,"Dessin","Illustrated","Dibujo")],["light",pickText(lang,"Clair","Light","Claro")],["night",pickText(lang,"Nuit","Night","Noche")]];
  return <div className="running-map-toolbar" style={{ position: "absolute", right: 9, top: 9, zIndex: 30, display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 5 }}>
    <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 12, background: "rgba(5,8,13,.88)", border: "1px solid rgba(255,255,255,.12)", backdropFilter: "blur(12px)" }}><button className="btn" onClick={() => setMapMode("2d")} style={toolButton(mapMode === "2d", accent)}>2D</button><button className="btn" onClick={() => setMapMode("3d")} style={toolButton(mapMode === "3d", accent)}>3D</button></div>
    {mapMode === "2d" ? <div style={{ position: "relative" }}><button className="btn" title={pickText(lang,"Style de carte","Map style","Estilo de mapa")} onClick={() => setThemeMenu((value) => !value)} style={{ ...iconButton, color: accent }}>{themeIcon(theme)}</button>{themeMenu ? <div style={{ position: "absolute", right: 0, top: 44, width: 150, padding: 5, borderRadius: 13, background: "rgba(5,8,13,.96)", border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 14px 34px rgba(0,0,0,.38)" }}>{themes.map(([id,label]) => <button key={id} className="btn" onClick={() => { setTheme(id); setThemeMenu(false); }} style={{ width: "100%", minHeight: 34, margin: "2px 0", textAlign: "left", padding: "5px 8px", color: theme === id ? accent : undefined, borderColor: theme === id ? `${accent}55` : undefined, fontSize: 8 }}>{themeIcon(id)} {label}</button>)}</div> : null}</div> : null}
    {mapMode === "2d" ? <button className="btn" title={pickText(lang,"Recentrer","Recenter","Centrar")} onClick={resetView} style={iconButton}>◎</button> : null}
    {!fullscreen && onFullscreen ? <button className="btn" title={pickText(lang,"Plein écran","Full screen","Pantalla completa")} onClick={onFullscreen} style={iconButton}>⛶</button> : null}
    {fullscreen && onCloseFullscreen ? <button className="btn" title={pickText(lang,"Fermer","Close","Cerrar")} onClick={onCloseFullscreen} style={iconButton}>✕</button> : null}
  </div>;
}

function PlacePopup({ place, photos, loading, accent, textSoft, lang, onClose }: { place: OutdoorRoutePlace; photos: OutdoorRoutePhoto[]; loading: boolean; accent: string; textSoft: string; lang: string; onClose: () => void }) {
  return <div className="running-map-popup" style={{ position: "absolute", left: 10, right: 10, bottom: 10, zIndex: 40, padding: 10, borderRadius: 17, background: "rgba(5,8,13,.94)", border: `1px solid ${accent}44`, boxShadow: "0 18px 44px rgba(0,0,0,.48)", backdropFilter: "blur(18px)" }}>
    <div className={`running-map-popup-grid ${photos.length ? "has-photos" : ""}`} style={{ display: "grid", gridTemplateColumns: photos.length ? "minmax(0,1fr) minmax(110px,34%)" : "1fr", gap: 9 }}>
      <div><div style={{ color: accent, fontSize: 7.3, fontWeight: 1000 }}>{outdoorRoutePlaceIcon(place.category)} {pickText(lang,"POINT D'INTÉRÊT","POINT OF INTEREST","PUNTO DE INTERÉS")}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 12, fontWeight: 1000, lineHeight: 1.15 }}>{place.name}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 8, lineHeight: 1.4 }}>{Math.round(place.distanceToRouteM)} m {pickText(lang,"du tracé","from route","de la ruta")}{Number.isFinite(place.elevationM) ? ` · ${Math.round(Number(place.elevationM))} m` : ""}</div>{place.website ? <a href={place.website} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 6, color: accent, fontSize: 7.5 }}>{pickText(lang,"SITE","WEBSITE","SITIO")} ↗</a> : null}</div>
      {photos.length ? <div className="running-map-popup-photos" style={{ display: "grid", gridTemplateColumns: photos.length > 1 ? "1fr 1fr" : "1fr", gap: 4, minHeight: 84 }}>{photos.slice(0,2).map((photo) => <img key={photo.id} src={photo.thumbUrl || photo.imageUrl} alt={photo.title} style={{ width: "100%", height: "100%", minHeight: 84, maxHeight: 116, objectFit: "cover", borderRadius: 10 }}/>)}</div> : loading ? <div style={{ display: "grid", placeItems: "center", color: textSoft, fontSize: 8 }}>{pickText(lang,"Photos…","Photos…","Fotos…")}</div> : null}
      <button className="btn running-map-popup-close" onClick={onClose} style={{ position: "absolute", right: 0, top: 0, minWidth: 30, minHeight: 30, padding: 0, borderRadius: 10 }}>✕</button>
    </div>
  </div>;
}

function toolButton(active: boolean, accent: string): React.CSSProperties { return { minWidth: 36, minHeight: 32, padding: "0 7px", fontSize: 8, fontWeight: 1000, color: active ? accent : undefined, borderColor: active ? `${accent}55` : "transparent", background: active ? `${accent}0d` : "transparent" }; }
const iconButton: React.CSSProperties = { minWidth: 40, minHeight: 40, padding: 0, borderRadius: 12, background: "rgba(5,8,13,.88)", borderColor: "rgba(255,255,255,.12)", backdropFilter: "blur(12px)", fontSize: 15 };
