import React from "react";
import { formatDistance } from "../../activity/activityMath";
import { fetchOutdoorPlacePhotos, type OutdoorRoutePhoto } from "../../activity/outdoorRouteMedia";
import { fetchOutdoorRoutePlaceContext, outdoorRoutePlaceIcon, type OutdoorRoutePlace, type OutdoorRoutePlaceContext } from "../../activity/outdoorRoutePlaces";
import type { GeoPoint } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

type Viewport = { lat: number; lon: number; zoom: number };
type Size = { width: number; height: number };
type ScreenPoint = { x: number; y: number };

type Props = {
  route: RunningRouteTemplate;
  accent: string;
  lang: string;
  textSoft: string;
  height?: string | number;
  fullscreen?: boolean;
  showPoi?: boolean;
  onFullscreen?: () => void;
  onCloseFullscreen?: () => void;
};

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

export default function OutdoorInteractiveRouteMap({ route, accent, lang, textSoft, height = "clamp(330px,54vh,620px)", fullscreen = false, showPoi = true, onFullscreen, onCloseFullscreen }: Props) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState<Size>({ width: 1000, height: 620 });
  const [viewport, setViewport] = React.useState<Viewport>(() => fitViewport(route.route, 1000, 620));
  const [context, setContext] = React.useState<OutdoorRoutePlaceContext | null>(null);
  const [selectedPlace, setSelectedPlace] = React.useState<OutdoorRoutePlace | null>(null);
  const [placePhotos, setPlacePhotos] = React.useState<OutdoorRoutePhoto[]>([]);
  const [placePhotoBusy, setPlacePhotoBusy] = React.useState(false);
  const pointerRef = React.useRef(new Map<number, ScreenPoint>());
  const dragRef = React.useRef<{ id: number; startX: number; startY: number; centerWorld: ScreenPoint; moved: boolean } | null>(null);
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null);

  React.useEffect(() => {
    setViewport(fitViewport(route.route, Math.max(320, size.width), Math.max(260, size.height)));
    setSelectedPlace(null);
  }, [route.id]);

  React.useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!showPoi) { setContext(null); return; }
    let alive = true;
    void fetchOutdoorRoutePlaceContext(route, lang).then((value) => { if (alive) setContext(value); }).catch(() => {});
    return () => { alive = false; };
  }, [lang, route.id, showPoi]);

  React.useEffect(() => {
    if (!selectedPlace) { setPlacePhotos([]); return; }
    let alive = true;
    setPlacePhotoBusy(true);
    setPlacePhotos([]);
    void fetchOutdoorPlacePhotos(route, selectedPlace, lang, 3).then((rows) => { if (alive) setPlacePhotos(rows); }).catch(() => {}).finally(() => { if (alive) setPlacePhotoBusy(false); });
    return () => { alive = false; };
  }, [lang, route.id, selectedPlace?.id]);

  const layout = React.useMemo(() => mapLayout(route.route, viewport, size), [route.route, size, viewport]);
  const visiblePlaces = React.useMemo(() => (context?.places || []).filter((place) => place.distanceToRouteM < 1200).slice(0, fullscreen ? 18 : 10), [context, fullscreen]);

  const setZoom = React.useCallback((nextZoom: number) => setViewport((current) => ({ ...current, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(nextZoom))) })), []);
  const recenter = React.useCallback(() => setViewport(fitViewport(route.route, Math.max(320, size.width), Math.max(260, size.height))), [route.route, size.height, size.width]);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    pointerRef.current.set(event.pointerId, point);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    if (pointerRef.current.size === 1) {
      dragRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, centerWorld: mercatorPixel(viewport.lat, viewport.lon, viewport.zoom), moved: false };
      pinchRef.current = null;
    } else if (pointerRef.current.size === 2) {
      const points = Array.from(pointerRef.current.values());
      pinchRef.current = { distance: pointDistance(points[0], points[1]), zoom: viewport.zoom };
      dragRef.current = null;
    }
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current.has(event.pointerId)) return;
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerRef.current.size >= 2 && pinchRef.current) {
      const points = Array.from(pointerRef.current.values());
      const distance = pointDistance(points[0], points[1]);
      const ratio = distance / Math.max(1, pinchRef.current.distance);
      if (ratio > 1.28) {
        setZoom(pinchRef.current.zoom + 1);
        pinchRef.current = { distance, zoom: Math.min(MAX_ZOOM, pinchRef.current.zoom + 1) };
      } else if (ratio < .78) {
        setZoom(pinchRef.current.zoom - 1);
        pinchRef.current = { distance, zoom: Math.max(MIN_ZOOM, pinchRef.current.zoom - 1) };
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    const center = { x: drag.centerWorld.x - dx, y: drag.centerWorld.y - dy };
    const geo = mercatorLatLon(center.x, center.y, viewport.zoom);
    setViewport((current) => ({ ...current, lat: geo.lat, lon: geo.lon }));
  };

  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const wasTap = !!drag && drag.id === event.pointerId && !drag.moved && pointerRef.current.size === 1;
    pointerRef.current.delete(event.pointerId);
    if (pointerRef.current.size < 2) pinchRef.current = null;
    if (pointerRef.current.size === 0) dragRef.current = null;
    if (wasTap && onFullscreen && !fullscreen) onFullscreen();
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom(viewport.zoom + (event.deltaY < 0 ? 1 : -1));
  };

  const openPlace = (event: React.MouseEvent, place: OutdoorRoutePlace) => {
    event.stopPropagation();
    setSelectedPlace(place);
  };

  return <div ref={wrapRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={onWheel} style={{ position: "relative", width: "100%", height: fullscreen ? "100dvh" : height, minHeight: fullscreen ? undefined : 300, overflow: "hidden", borderRadius: fullscreen ? 0 : 20, background: "#101821", border: fullscreen ? 0 : "1px solid rgba(255,255,255,.09)", touchAction: "none", userSelect: "none", cursor: "grab", boxShadow: fullscreen ? undefined : "0 22px 56px rgba(0,0,0,.30)" }}>
    {layout.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable={false} loading="eager" decoding="async" style={{ position: "absolute", left: tile.left, top: tile.top, width: TILE + 1, height: TILE + 1, objectFit: "cover", pointerEvents: "none" }}/>) }
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(3,7,11,.015),rgba(3,7,11,.08))", pointerEvents: "none" }}/>
    <svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <polyline points={layout.polyline} fill="none" stroke="rgba(0,0,0,.78)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={layout.polyline} fill="none" stroke={accent} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>

    {layout.start ? <MapMarker x={layout.start.x} y={layout.start.y} text="🚩" label={pickText(lang,"Départ","Start","Salida")} accent="#42ef7e"/> : null}
    {layout.finish ? <MapMarker x={layout.finish.x} y={layout.finish.y} text="🏁" label={pickText(lang,"Arrivée","Finish","Llegada")} accent="#ff5668"/> : null}
    {visiblePlaces.map((place) => {
      const screen = projectToScreen(place.lat, place.lon, viewport, size);
      if (screen.x < -30 || screen.x > size.width + 30 || screen.y < -30 || screen.y > size.height + 30) return null;
      return <button key={place.id} type="button" title={place.name} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openPlace(event, place)} style={{ position: "absolute", left: screen.x, top: screen.y, transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: selectedPlace?.id === place.id ? `2px solid ${accent}` : "1px solid rgba(255,255,255,.8)", background: selectedPlace?.id === place.id ? "rgba(6,10,15,.98)" : "rgba(6,10,15,.88)", color: "#fff", fontSize: 16, zIndex: selectedPlace?.id === place.id ? 14 : 9, boxShadow: "0 5px 16px rgba(0,0,0,.45)", cursor: "pointer" }}>{outdoorRoutePlaceIcon(place.category)}</button>;
    })}

    <div style={{ position: "absolute", left: 10, top: fullscreen ? "max(10px,env(safe-area-inset-top))" : 10, display: "flex", gap: 6, zIndex: 18, pointerEvents: "auto" }}>
      <button className="btn" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); recenter(); }} style={mapControlStyle}>◎</button>
      <div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.82)", border: `1px solid ${accent}38`, color: accent, fontSize: 7, fontWeight: 1000, backdropFilter: "blur(12px)" }}>{pickText(lang,"GLISSER · ZOOMER","DRAG · ZOOM","MOVER · ZOOM")}</div>
    </div>

    <div style={{ position: "absolute", right: 10, top: fullscreen ? "max(10px,env(safe-area-inset-top))" : 10, display: "grid", gap: 6, zIndex: 18, pointerEvents: "auto" }}>
      {fullscreen && onCloseFullscreen ? <button className="btn" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCloseFullscreen(); }} style={mapControlStyle}>×</button> : onFullscreen ? <button className="btn" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onFullscreen(); }} style={mapControlStyle}>⛶</button> : null}
      <button className="btn" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setZoom(viewport.zoom + 1); }} style={mapControlStyle}>＋</button>
      <button className="btn" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setZoom(viewport.zoom - 1); }} style={mapControlStyle}>−</button>
    </div>

    {selectedPlace ? <PlacePopup place={selectedPlace} photos={placePhotos} busy={placePhotoBusy} accent={accent} textSoft={textSoft} lang={lang} onClose={() => setSelectedPlace(null)}/> : null}

    {!selectedPlace && fullscreen ? <div style={{ position: "absolute", left: 12, right: 12, bottom: "max(12px,env(safe-area-inset-bottom))", zIndex: 8, display: "flex", justifyContent: "center", pointerEvents: "none" }}><div style={{ padding: "7px 11px", borderRadius: 999, background: "rgba(5,8,13,.74)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(12px)", color: textSoft, fontSize: 6.9 }}>{pickText(lang,"Touchez une icône pour voir le lieu · pincez ou utilisez la molette pour zoomer","Tap an icon for details · pinch or use mouse wheel to zoom","Toca un icono para ver detalles · pellizca o usa la rueda para hacer zoom")}</div></div> : null}
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()} style={{ position: "absolute", right: 4, bottom: 3, padding: "2px 4px", borderRadius: 4, background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 6, textDecoration: "none", zIndex: 20 }}>© OpenStreetMap</a>
  </div>;
}

function PlacePopup({ place, photos, busy, accent, textSoft, lang, onClose }: { place: OutdoorRoutePlace; photos: OutdoorRoutePhoto[]; busy: boolean; accent: string; textSoft: string; lang: string; onClose: () => void }) {
  return <div onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} style={{ position: "absolute", left: 10, right: 10, bottom: "max(12px,env(safe-area-inset-bottom))", zIndex: 24, padding: 10, borderRadius: 18, background: "rgba(6,9,14,.94)", border: `1px solid ${accent}35`, boxShadow: "0 18px 48px rgba(0,0,0,.55)", backdropFilter: "blur(18px)" }}>
    <div style={{ display: "grid", gridTemplateColumns: photos.length ? "minmax(105px,28%) 1fr auto" : "1fr auto", gap: 10, alignItems: "stretch" }}>
      {photos.length ? <div style={{ display: "grid", gridTemplateColumns: photos.length > 1 ? "1.4fr 1fr" : "1fr", gap: 3, minHeight: 92, maxHeight: 120, borderRadius: 12, overflow: "hidden", background: "#10151b" }}>{photos.slice(0, 3).map((photo, index) => <img key={photo.id} src={photo.thumbUrl} alt="" loading="eager" decoding="async" style={{ width: "100%", height: "100%", minHeight: index === 0 ? 92 : 44, objectFit: "cover", gridRow: index === 0 && photos.length > 2 ? "1 / span 2" : undefined }}/>)}</div> : null}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 19 }}>{outdoorRoutePlaceIcon(place.category)}</span><div style={{ minWidth: 0 }}><div style={{ color: "#fff", fontSize: 9.4, fontWeight: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{place.name}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 6.9 }}>{place.distanceToRouteM < 100 ? "<100 m" : formatDistance(place.distanceToRouteM)} {pickText(lang,"du parcours","from route","de la ruta")}{place.elevationM != null ? ` · ${Math.round(place.elevationM)} m` : ""}</div></div></div>
        <div style={{ marginTop: 7, color: textSoft, fontSize: 7.1, lineHeight: 1.4 }}>{busy ? pickText(lang,"Recherche des photos du lieu…","Finding place photos…","Buscando fotos del lugar…") : photos.length ? pickText(lang,"Photos publiques trouvées autour de ce point.","Public imagery found around this point.","Imágenes públicas encontradas alrededor de este punto.") : pickText(lang,"Aucune photo publique trouvée pour ce point.","No public photo found for this point.","No se encontró una foto pública de este punto.")}</div>
        <button className="btn" onClick={() => { try { window.open(`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`, "_blank", "noopener,noreferrer"); } catch {} }} style={{ minHeight: 32, marginTop: 7, padding: "4px 9px", color: accent, borderColor: `${accent}55`, fontSize: 6.8, fontWeight: 1000 }}>↗ MAPS</button>
      </div>
      <button className="btn" onClick={onClose} style={{ alignSelf: "start", minWidth: 32, minHeight: 32, padding: 0 }}>×</button>
    </div>
  </div>;
}

function MapMarker({ x, y, text, label, accent }: { x: number; y: number; text: string; label: string; accent: string }) {
  return <div title={label} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", zIndex: 7, width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", border: `2px solid ${accent}`, background: "rgba(6,10,15,.88)", fontSize: 15, boxShadow: "0 4px 15px rgba(0,0,0,.42)", pointerEvents: "none" }}>{text}</div>;
}

const mapControlStyle: React.CSSProperties = { minWidth: 38, minHeight: 38, padding: 0, borderRadius: 13, background: "rgba(5,8,13,.86)", borderColor: "rgba(255,255,255,.14)", backdropFilter: "blur(12px)", fontSize: 13 };

function mapLayout(points: GeoPoint[], viewport: Viewport, size: Size) {
  const center = mercatorPixel(viewport.lat, viewport.lon, viewport.zoom);
  const minX = Math.floor((center.x - size.width / 2) / TILE) - 1;
  const maxX = Math.floor((center.x + size.width / 2) / TILE) + 1;
  const minY = Math.floor((center.y - size.height / 2) / TILE) - 1;
  const maxY = Math.floor((center.y + size.height / 2) / TILE) + 1;
  const count = 2 ** viewport.zoom;
  const tiles: Array<{ key: string; left: number; top: number; url: string }> = [];
  for (let tx = minX; tx <= maxX; tx += 1) for (let ty = minY; ty <= maxY; ty += 1) {
    if (ty < 0 || ty >= count) continue;
    const wrappedX = ((tx % count) + count) % count;
    tiles.push({ key: `${viewport.zoom}-${tx}-${ty}`, left: tx * TILE - center.x + size.width / 2, top: ty * TILE - center.y + size.height / 2, url: `https://tile.openstreetmap.org/${viewport.zoom}/${wrappedX}/${ty}.png` });
  }
  const step = Math.max(1, Math.floor(points.length / 700));
  const sampled = points.filter((_, index) => index % step === 0);
  if (points.length && sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);
  const screen = sampled.map((point) => projectToScreen(point.lat, point.lon, viewport, size));
  return { tiles, polyline: screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "), start: points[0] ? projectToScreen(points[0].lat, points[0].lon, viewport, size) : null, finish: points.length ? projectToScreen(points[points.length - 1].lat, points[points.length - 1].lon, viewport, size) : null };
}

function fitViewport(points: GeoPoint[], width: number, height: number): Viewport {
  if (!points.length) return { lat: 0, lon: 0, zoom: 4 };
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 17;
  for (let z = 17; z >= MIN_ZOOM; z -= 1) {
    const px = points.map((point) => mercatorPixel(point.lat, point.lon, z));
    const xs = px.map((point) => point.x), ys = px.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .74 && Math.max(...ys) - Math.min(...ys) <= height * .68) { zoom = z; break; }
  }
  return { lat, lon, zoom };
}

function projectToScreen(lat: number, lon: number, viewport: Viewport, size: Size): ScreenPoint {
  const center = mercatorPixel(viewport.lat, viewport.lon, viewport.zoom);
  const world = mercatorPixel(lat, lon, viewport.zoom);
  return { x: world.x - center.x + size.width / 2, y: world.y - center.y + size.height / 2 };
}

function mercatorPixel(lat: number, lon: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin(clamped * Math.PI / 180);
  return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

function mercatorLatLon(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lon = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
  return { lat, lon };
}

function pointDistance(a: ScreenPoint, b: ScreenPoint) { return Math.hypot(a.x - b.x, a.y - b.y); }
