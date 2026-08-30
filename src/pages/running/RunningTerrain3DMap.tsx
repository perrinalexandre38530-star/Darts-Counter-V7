import React from "react";
import { formatDuration, formatPace, haversineMeters } from "../../activity/activityMath";
import { analyzeRunningTerrain } from "../../activity/runningElevation";
import type { GeoPoint } from "../../activity/activityTypes";
import { outdoorRoutePlaceIcon, type OutdoorRoutePlace } from "../../activity/outdoorRoutePlaces";

const MAPLIBRE_VERSION = "6.6.0";
const MAPLIBRE_MODULE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const TERRAIN_TILEJSON = "https://tiles.mapterhorn.com/tilejson.json";

type MapLibreGlobal = any;

declare global {
  interface Window {
    maplibregl?: MapLibreGlobal;
    __mssMapLibrePromise?: Promise<MapLibreGlobal>;
  }
}

type Props = {
  points: GeoPoint[];
  accent: string;
  lang: string;
  textSoft?: string;
  height?: string | number;
  fullscreen?: boolean;
  routeName?: string;
  places?: OutdoorRoutePlace[];
  activePointIndex?: number | null;
  onActivePointChange?: (index: number | null) => void;
  onPlaceSelect?: (place: OutdoorRoutePlace) => void;
  onFallback2D?: () => void;
  showReplay?: boolean;
};

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

function loadMapLibre(): Promise<MapLibreGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("MapLibre unavailable"));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (window.__mssMapLibrePromise) return window.__mssMapLibrePromise;

  if (!document.querySelector(`link[data-mss-maplibre="${MAPLIBRE_VERSION}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MAPLIBRE_CSS;
    link.dataset.mssMaplibre = MAPLIBRE_VERSION;
    document.head.appendChild(link);
  }

  window.__mssMapLibrePromise = import(/* @vite-ignore */ MAPLIBRE_MODULE).then((module) => {
    window.maplibregl = module;
    return module;
  });
  return window.__mssMapLibrePromise;
}

function routeBounds(points: GeoPoint[]) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    west = Math.min(west, point.lon); east = Math.max(east, point.lon);
    south = Math.min(south, point.lat); north = Math.max(north, point.lat);
  }
  return Number.isFinite(west) ? [[west, south], [east, north]] as [[number, number], [number, number]] : null;
}

function cumulativeDistances(points: GeoPoint[]) {
  const rows = new Array<number>(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) rows[index] = rows[index - 1] + haversineMeters(points[index - 1], points[index]);
  return rows;
}

function indexAtDistance(rows: number[], targetM: number) {
  if (!rows.length) return 0;
  let lo = 0, hi = rows.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (rows[mid] < targetM) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(rows[lo - 1] - targetM) < Math.abs(rows[lo] - targetM)) return lo - 1;
  return lo;
}

function bearingDegrees(a: GeoPoint, b: GeoPoint) {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function pointElapsedMs(points: GeoPoint[], index: number): number | null {
  const point = points[index];
  if (Number.isFinite(point?.elapsedMs)) return Math.max(0, Number(point.elapsedMs));
  const first = Number(points[0]?.timestamp || 0);
  const current = Number(point?.timestamp || 0);
  return first > 0 && current >= first ? current - first : null;
}

function paceAtIndex(points: GeoPoint[], distances: number[], index: number) {
  const point = points[index];
  if (Number.isFinite(point?.speed) && Number(point.speed) > .2) return 1000 / Number(point.speed);
  if (index <= 0) return null;
  const currentElapsed = pointElapsedMs(points, index);
  const previousElapsed = pointElapsedMs(points, index - 1);
  if (currentElapsed == null || previousElapsed == null) return null;
  const dt = Math.max(0, currentElapsed - previousElapsed);
  const dd = Math.max(0, distances[index] - distances[index - 1]);
  if (dt <= 0 || dd < 1) return null;
  const speed = dd / (dt / 1000);
  return speed > .2 ? 1000 / speed : null;
}

function markerElement(content: string, border: string, title: string, size = 30) {
  const el = document.createElement("div");
  el.title = title;
  el.textContent = content;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "999px";
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.background = "rgba(5,8,13,.90)";
  el.style.border = `2px solid ${border}`;
  el.style.boxShadow = "0 5px 16px rgba(0,0,0,.48)";
  el.style.fontSize = size <= 25 ? "9px" : "14px";
  el.style.fontWeight = "1000";
  el.style.color = "#fff";
  el.style.pointerEvents = "auto";
  return el;
}

export default function RunningTerrain3DMap({ points, accent, lang, textSoft = "#a8a8b3", height = "clamp(330px,54vh,620px)", fullscreen = false, routeName, places = [], activePointIndex = null, onActivePointChange, onPlaceSelect, onFallback2D, showReplay = true }: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const maplibreRef = React.useRef<any>(null);
  const activeMarkerRef = React.useRef<any>(null);
  const staticMarkersRef = React.useRef<any[]>([]);
  const replayFrameRef = React.useRef<number | null>(null);
  const lastCameraAtRef = React.useRef(0);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState("");
  const [replaying, setReplaying] = React.useState(false);
  const [replayIndex, setReplayIndex] = React.useState(0);

  const safePoints = React.useMemo(() => points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)), [points]);
  const distances = React.useMemo(() => cumulativeDistances(safePoints), [safePoints]);
  const totalDistanceM = distances[distances.length - 1] || 0;
  const terrain = React.useMemo(() => analyzeRunningTerrain(safePoints), [safePoints]);
  const terrainSampleByIndex = React.useMemo(() => {
    const map = new Map<number, { gradePct: number; altitudeM: number }>();
    for (const sample of terrain.samples) map.set(sample.index, { gradePct: sample.gradePct, altitudeM: sample.altitudeM });
    return map;
  }, [terrain.samples]);
  const effectiveIndex = replaying ? replayIndex : activePointIndex == null ? null : Math.max(0, Math.min(safePoints.length - 1, activePointIndex));

  const fitRoute = React.useCallback((pitch = 64) => {
    const map = mapRef.current;
    const bounds = routeBounds(safePoints);
    if (!map || !bounds) return;
    try {
      map.fitBounds(bounds, { padding: fullscreen ? 72 : 42, pitch, bearing: 0, duration: 650, maxZoom: 16.8 });
    } catch {}
  }, [fullscreen, safePoints]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || safePoints.length < 2) return;
    let disposed = false;
    setStatus("loading"); setError("");

    void loadMapLibre().then((maplibregl) => {
      if (disposed || !hostRef.current) return;
      maplibreRef.current = maplibregl;
      const first = safePoints[0];
      const style = {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" },
          terrainSource: { type: "raster-dem", url: TERRAIN_TILEJSON, tileSize: 256 },
          hillshadeSource: { type: "raster-dem", url: TERRAIN_TILEJSON, tileSize: 256 },
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          { id: "hillshade", type: "hillshade", source: "hillshadeSource", paint: { "hillshade-exaggeration": .42, "hillshade-shadow-color": "#10151b", "hillshade-highlight-color": "#ffffff", "hillshade-accent-color": "#59636d" } },
        ],
      } as any;

      const map = new maplibregl.Map({
        container: hostRef.current,
        style,
        center: [first.lon, first.lat],
        zoom: 13,
        pitch: 64,
        bearing: 0,
        maxPitch: 85,
        renderWorldCopies: false,
        attributionControl: false,
        cooperativeGestures: false,
      });
      mapRef.current = map;
      try { map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), "top-right"); } catch {}
      try { map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right"); } catch {}

      map.on("load", () => {
        if (disposed) return;
        try { map.setTerrain({ source: "terrainSource", exaggeration: 1.18 }); } catch {}
        try {
          map.addSource("mss-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: safePoints.map((point) => [point.lon, point.lat]) } } });
          map.addLayer({ id: "mss-route-shadow", type: "line", source: "mss-route", paint: { "line-color": "rgba(0,0,0,.82)", "line-width": 9, "line-opacity": .88 } });
          map.addLayer({ id: "mss-route-line", type: "line", source: "mss-route", paint: { "line-color": accent, "line-width": 5.2, "line-opacity": 1 } });
        } catch {}

        staticMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
        staticMarkersRef.current = [];
        const startEl = markerElement("🚩", "#42ef7e", pickText(lang, "Départ", "Start", "Salida"), 32);
        const endEl = markerElement("🏁", "#ff5668", pickText(lang, "Arrivée", "Finish", "Llegada"), 32);
        staticMarkersRef.current.push(new maplibregl.Marker({ element: startEl }).setLngLat([safePoints[0].lon, safePoints[0].lat]).addTo(map));
        const last = safePoints[safePoints.length - 1];
        staticMarkersRef.current.push(new maplibregl.Marker({ element: endEl }).setLngLat([last.lon, last.lat]).addTo(map));

        for (let km = 1; km * 1000 < totalDistanceM; km += 1) {
          const index = indexAtDistance(distances, km * 1000);
          const point = safePoints[index];
          if (!point) continue;
          const el = markerElement(String(km), accent, `KM ${km}`, 24);
          staticMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([point.lon, point.lat]).addTo(map));
        }

        for (const place of places.slice(0, fullscreen ? 18 : 10)) {
          const el = markerElement(outdoorRoutePlaceIcon(place.category), "rgba(255,255,255,.86)", place.name, 30);
          el.style.cursor = "pointer";
          el.addEventListener("click", (event) => { event.stopPropagation(); onPlaceSelect?.(place); });
          staticMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([place.lon, place.lat]).addTo(map));
        }

        setStatus("ready");
        window.setTimeout(() => fitRoute(64), 40);
      });
      map.on("error", (event: any) => {
        const message = String(event?.error?.message || "");
        if (/terrain|dem|tilejson|mapterhorn/i.test(message)) {
          // Keep the map usable if the DEM endpoint is temporarily unavailable.
          try { map.setTerrain(null); } catch {}
        }
      });
    }).catch((cause) => {
      if (disposed) return;
      setStatus("error");
      setError(String(cause?.message || cause || "MapLibre unavailable"));
    });

    return () => {
      disposed = true;
      if (replayFrameRef.current != null) cancelAnimationFrame(replayFrameRef.current);
      replayFrameRef.current = null;
      staticMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
      staticMarkersRef.current = [];
      try { activeMarkerRef.current?.remove(); } catch {}
      activeMarkerRef.current = null;
      try { mapRef.current?.remove(); } catch {}
      mapRef.current = null;
    };
  }, [accent, fitRoute, fullscreen, lang, onPlaceSelect, places, safePoints, distances, totalDistanceM]);

  React.useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || effectiveIndex == null || !safePoints[effectiveIndex]) {
      try { activeMarkerRef.current?.remove(); } catch {}
      activeMarkerRef.current = null;
      return;
    }
    const point = safePoints[effectiveIndex];
    if (!activeMarkerRef.current) {
      const el = markerElement("●", accent, pickText(lang, "Position sélectionnée", "Selected position", "Posición seleccionada"), 26);
      el.style.boxShadow = `0 0 0 6px ${accent}25,0 6px 18px rgba(0,0,0,.5)`;
      activeMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([point.lon, point.lat]).addTo(map);
    } else {
      try { activeMarkerRef.current.setLngLat([point.lon, point.lat]); } catch {}
    }
    if (!replaying) {
      try { map.easeTo({ center: [point.lon, point.lat], duration: 260 }); } catch {}
    }
  }, [accent, effectiveIndex, lang, replaying, safePoints]);

  React.useEffect(() => {
    if (!replaying || safePoints.length < 2) return;
    const startedAt = performance.now();
    const startIndex = replayIndex >= safePoints.length - 2 ? 0 : replayIndex;
    const startDistance = distances[startIndex] || 0;
    const remainingDistance = Math.max(1, totalDistanceM - startDistance);
    const durationMs = Math.max(14000, Math.min(38000, 12000 + (remainingDistance / 1000) * 420));
    lastCameraAtRef.current = 0;

    const step = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - startedAt) / durationMs));
      const targetDistance = startDistance + remainingDistance * progress;
      const index = indexAtDistance(distances, targetDistance);
      setReplayIndex(index);
      onActivePointChange?.(index);

      const map = mapRef.current;
      if (map && now - lastCameraAtRef.current > 120) {
        lastCameraAtRef.current = now;
        const point = safePoints[index];
        const ahead = safePoints[Math.min(safePoints.length - 1, index + Math.max(1, Math.floor(safePoints.length / 180)))];
        try {
          map.easeTo({
            center: [point.lon, point.lat],
            bearing: ahead ? bearingDegrees(point, ahead) : map.getBearing(),
            pitch: 70,
            zoom: Math.max(14.2, Math.min(16.7, map.getZoom())),
            duration: 180,
            easing: (value: number) => value,
          });
        } catch {}
      }

      if (progress < 1) replayFrameRef.current = requestAnimationFrame(step);
      else { setReplaying(false); replayFrameRef.current = null; }
    };
    replayFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (replayFrameRef.current != null) cancelAnimationFrame(replayFrameRef.current);
      replayFrameRef.current = null;
    };
  }, [distances, onActivePointChange, replayIndex, replaying, safePoints, totalDistanceM]);

  const currentIndex = effectiveIndex == null ? 0 : effectiveIndex;
  const currentPoint = safePoints[currentIndex] || safePoints[0];
  const currentTerrain = terrainSampleByIndex.get(currentIndex) || (terrain.samples.length ? (() => {
    const nearest = terrain.samples.reduce((best, sample) => Math.abs(sample.index - currentIndex) < Math.abs(best.index - currentIndex) ? sample : best, terrain.samples[0]);
    return { gradePct: nearest.gradePct, altitudeM: nearest.altitudeM };
  })() : null);
  const currentPace = paceAtIndex(safePoints, distances, currentIndex);
  const elapsedMs = pointElapsedMs(safePoints, currentIndex);

  const startReplay = () => {
    if (safePoints.length < 2) return;
    if (replayIndex >= safePoints.length - 2) { setReplayIndex(0); onActivePointChange?.(0); }
    try { mapRef.current?.easeTo({ pitch: 70, zoom: Math.max(14.2, Math.min(16.7, mapRef.current.getZoom())), duration: 500 }); } catch {}
    setReplaying(true);
  };

  const stopReplay = () => setReplaying(false);

  return <div style={{ position: "relative", width: "100%", height: fullscreen ? "100%" : height, minHeight: fullscreen ? 0 : 300, overflow: "hidden", borderRadius: fullscreen ? 0 : 20, background: "#101821", border: fullscreen ? 0 : "1px solid rgba(255,255,255,.09)", boxShadow: fullscreen ? undefined : "0 22px 56px rgba(0,0,0,.30)" }}>
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}/>
    {status === "loading" ? <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", background: "linear-gradient(145deg,#101821,#070b10)", color: textSoft }}><div style={{ textAlign: "center", fontSize: 9 }}><div style={{ color: accent, fontSize: 20, marginBottom: 8 }}>⛰</div>{pickText(lang, "Chargement du relief 3D…", "Loading 3D terrain…", "Cargando relieve 3D…")}</div></div> : null}
    {status === "error" ? <div style={{ position: "absolute", inset: 0, zIndex: 22, display: "grid", placeItems: "center", padding: 18, background: "linear-gradient(145deg,#101821,#070b10)" }}><div style={{ maxWidth: 360, textAlign: "center" }}><div style={{ color: "#ff9a92", fontSize: 22 }}>△</div><div style={{ marginTop: 6, fontSize: 10, fontWeight: 1000 }}>{pickText(lang, "3D indisponible", "3D unavailable", "3D no disponible")}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 7.5, lineHeight: 1.45 }}>{error}</div>{onFallback2D ? <button className="btn" onClick={onFallback2D} style={{ marginTop: 10, minHeight: 36, color: accent, borderColor: `${accent}55`, fontSize: 8, fontWeight: 1000 }}>{pickText(lang, "REVENIR EN 2D", "BACK TO 2D", "VOLVER A 2D")}</button> : null}</div></div> : null}

    {status === "ready" ? <>
      <div style={{ position: "absolute", left: 10, top: 10, zIndex: 15, display: "flex", gap: 6, pointerEvents: "auto" }}>
        <button className="btn" onClick={() => fitRoute(64)} style={controlStyle} title={pickText(lang,"Recentrer","Recenter","Centrar")}>◎</button>
        <div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.80)", border: `1px solid ${accent}38`, color: accent, fontSize: 7, fontWeight: 1000, backdropFilter: "blur(12px)" }}>3D · DEM</div>
      </div>

      {showReplay ? <div style={{ position: "absolute", left: 10, bottom: fullscreen ? "max(18px,env(safe-area-inset-bottom))" : 12, zIndex: 16, maxWidth: "calc(100% - 20px)", pointerEvents: "auto" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
          <button className="btn" onClick={replaying ? stopReplay : startReplay} style={{ minHeight: 38, padding: "6px 10px", color: accent, borderColor: `${accent}55`, background: "rgba(5,8,13,.88)", backdropFilter: "blur(12px)", fontSize: 7.4, fontWeight: 1000 }}>{replaying ? "Ⅱ " : "▶ "}{replaying ? pickText(lang,"PAUSE","PAUSE","PAUSA") : pickText(lang,"SURVOL 3D","3D FLYOVER","VUELO 3D")}</button>
          {effectiveIndex != null ? <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(54px,auto))", gap: 4, padding: 5, borderRadius: 13, background: "rgba(5,8,13,.84)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(12px)", overflowX: "auto", maxWidth: "min(680px,calc(100vw - 118px))" }}>
            <ReplayMetric label={pickText(lang,"DIST.","DIST.","DIST.")} value={`${((distances[currentIndex] || 0) / 1000).toFixed(2)} km`} accent={accent}/>
            <ReplayMetric label={pickText(lang,"TEMPS","TIME","TIEMPO")} value={elapsedMs == null ? "—" : formatDuration(elapsedMs)} accent={accent}/>
            <ReplayMetric label={pickText(lang,"ALT.","ELEV.","ALT.")} value={Number.isFinite(currentPoint?.altitude) ? `${Math.round(Number(currentPoint.altitude))} m` : currentTerrain ? `${Math.round(currentTerrain.altitudeM)} m` : "—"} accent={accent}/>
            <ReplayMetric label={pickText(lang,"PENTE","GRADE","PEND.")} value={currentTerrain ? `${currentTerrain.gradePct >= 0 ? "+" : ""}${currentTerrain.gradePct.toFixed(1)}%` : "—"} accent={accent}/>
            <ReplayMetric label={pickText(lang,"ALLURE","PACE","RITMO")} value={currentPace ? `${formatPace(currentPace)}/km` : "—"} accent={accent}/>
          </div> : null}
        </div>
      </div> : null}

      {routeName ? <div style={{ position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)", zIndex: 10, maxWidth: "52%", padding: "6px 10px", borderRadius: 999, background: "rgba(5,8,13,.70)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", fontSize: 7, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", backdropFilter: "blur(10px)" }}>{routeName}</div> : null}
    </> : null}
  </div>;
}

function ReplayMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 54, padding: "4px 6px", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.45)", fontSize: 5.8, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, color: accent, fontSize: 7.5, fontWeight: 1000, whiteSpace: "nowrap" }}>{value}</div></div>;
}

const controlStyle: React.CSSProperties = { minWidth: 38, minHeight: 38, padding: 0, borderRadius: 13, background: "rgba(5,8,13,.86)", borderColor: "rgba(255,255,255,.14)", backdropFilter: "blur(12px)", fontSize: 13 };
