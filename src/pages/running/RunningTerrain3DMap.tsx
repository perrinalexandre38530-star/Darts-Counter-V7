import React from "react";
import { pickRunningText as pickText, runningPointElapsedMs as pointElapsedMs } from "../../activity/runningShared";
import { formatDuration, formatPace, haversineMeters } from "../../activity/activityMath";
import { analyzeRunningTerrain } from "../../activity/runningElevation";
import { buildRunningActivityAnalytics } from "../../activity/runningActivityAnalytics";
import type { GeoPoint } from "../../activity/activityTypes";
import { outdoorRoutePlaceIcon, type OutdoorRoutePlace } from "../../activity/outdoorRoutePlaces";
import { RUNNING_SATELLITE_TILES, loadRunningMapTheme, runningMapThemeIcon, runningMapThemeLabel, runningMapThemes, saveRunningMapTheme, type RunningMapTheme } from "./runningMapTheme";
import "./runningResponsive.css";

const MAPLIBRE_VERSION = "5.24.0";
const MAPLIBRE_SCRIPTS = [
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`,
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`,
];
const MAPLIBRE_CSS = [
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`,
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`,
];
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
// Mapterhorn publishes public 512px Terrarium DEM tiles directly.
const TERRAIN_TILES = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";

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
  preferCompat?: boolean;
  mapTheme?: RunningMapTheme;
  onMapThemeChange?: (theme: RunningMapTheme) => void;
  showStylePicker?: boolean;
};

function ensureMapLibreCss() {
  if (document.querySelector(`link[data-mss-maplibre="${MAPLIBRE_VERSION}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MAPLIBRE_CSS[0];
  link.dataset.mssMaplibre = MAPLIBRE_VERSION;
  link.addEventListener("error", () => {
    if (link.href !== MAPLIBRE_CSS[1]) link.href = MAPLIBRE_CSS[1];
  }, { once: true });
  document.head.appendChild(link);
}

function loadClassicScript(url: string, timeoutMs: number): Promise<MapLibreGlobal> {
  return new Promise((resolve, reject) => {
    if (window.maplibregl?.Map) { resolve(window.maplibregl); return; }
    const existing = document.querySelector(`script[data-mss-maplibre-src="${url}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error(`MapLibre script timeout: ${url}`)), timeoutMs);
    const finish = () => {
      window.clearTimeout(timer);
      if (window.maplibregl?.Map) resolve(window.maplibregl);
      else reject(new Error(`MapLibre global missing: ${url}`));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error(`MapLibre script failed: ${url}`)); }, { once: true });
    if (!existing) {
      script.src = url;
      script.async = true;
      // Intentionally no crossOrigin attribute: classic scripts do not require
      // CORS headers and this avoids the CDN failure seen on Pages/WebView.
      script.dataset.mssMaplibreSrc = url;
      document.head.appendChild(script);
    }
  });
}

async function loadMapLibre(): Promise<MapLibreGlobal> {
  if (typeof window === "undefined") throw new Error("MapLibre unavailable");
  if (window.maplibregl?.Map) return window.maplibregl;
  if (window.__mssMapLibrePromise) return window.__mssMapLibrePromise;
  ensureMapLibreCss();
  window.__mssMapLibrePromise = (async () => {
    let lastError: unknown = null;
    for (const url of MAPLIBRE_SCRIPTS) {
      try {
        const maplibregl = await loadClassicScript(url, 7000);
        try { maplibregl.setMaxParallelImageRequests?.(8); } catch {}
        return maplibregl;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("MapLibre unavailable");
  })().catch((error) => {
    window.__mssMapLibrePromise = undefined;
    throw error;
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


type PaintSnapshot = Map<string, Record<string, unknown>>;

const THEME_PAINT_PROPERTIES: Record<string, string[]> = {
  background: ["background-color", "background-opacity"],
  fill: ["fill-color", "fill-opacity", "fill-outline-color"],
  line: ["line-color", "line-opacity"],
  symbol: ["text-color", "text-halo-color", "text-halo-width", "text-opacity", "icon-opacity"],
  circle: ["circle-color", "circle-opacity", "circle-stroke-color", "circle-stroke-opacity"],
};

function isMssMapLayer(id: string) {
  return id.startsWith("mss-") || id === "terrain-hillshade";
}

function captureBasePaint(map: any): PaintSnapshot {
  const snapshot: PaintSnapshot = new Map();
  const layers = map.getStyle?.()?.layers || [];
  for (const layer of layers) {
    const id = String(layer?.id || "");
    const type = String(layer?.type || "");
    if (!id || isMssMapLayer(id)) continue;
    const props = THEME_PAINT_PROPERTIES[type];
    if (!props?.length) continue;
    const row: Record<string, unknown> = {};
    for (const prop of props) {
      try { row[prop] = map.getPaintProperty(id, prop); } catch {}
    }
    snapshot.set(id, row);
  }
  return snapshot;
}

function restoreBasePaint(map: any, snapshot: PaintSnapshot) {
  for (const [id, props] of snapshot.entries()) {
    if (!map.getLayer?.(id)) continue;
    for (const [prop, value] of Object.entries(props)) {
      try { map.setPaintProperty(id, prop, value == null ? null : value); } catch {}
    }
  }
}

function layerPalette(theme: Exclude<RunningMapTheme, "tourist" | "satellite">, layer: any) {
  const id = String(layer?.id || "").toLowerCase();
  const type = String(layer?.type || "");
  const water = /water|river|ocean|lake|stream/.test(id);
  const green = /park|wood|forest|grass|green|landuse|nature|vegetation/.test(id);
  const building = /building|house/.test(id);
  const road = /road|street|highway|motorway|trunk|primary|secondary|tertiary|path|track/.test(id);
  const boundary = /boundary|admin|border/.test(id);

  if (theme === "night") {
    if (type === "background") return { "background-color": "#07111b" };
    if (type === "fill") return { "fill-color": water ? "#071c2b" : green ? "#10251e" : building ? "#18202a" : "#0b141e", "fill-opacity": .93 };
    if (type === "line") return { "line-color": water ? "#28516b" : road ? "#536b80" : boundary ? "#685679" : "#334352", "line-opacity": road ? .9 : .72 };
    if (type === "symbol") return { "text-color": "#e8f0f8", "text-halo-color": "#07111b", "text-halo-width": 1.35, "text-opacity": .96, "icon-opacity": .88 };
    if (type === "circle") return { "circle-color": "#75c7dc", "circle-opacity": .82, "circle-stroke-color": "#07111b", "circle-stroke-opacity": .9 };
  }

  if (theme === "light") {
    if (type === "background") return { "background-color": "#f6f8fb" };
    if (type === "fill") return { "fill-color": water ? "#d9edf8" : green ? "#e3f0df" : building ? "#e6e8ec" : "#f4f5f7", "fill-opacity": .95 };
    if (type === "line") return { "line-color": water ? "#a8cfdf" : road ? "#b7bec8" : boundary ? "#aeb5bf" : "#c8cdd4", "line-opacity": road ? .94 : .7 };
    if (type === "symbol") return { "text-color": "#374151", "text-halo-color": "#ffffff", "text-halo-width": 1.4, "text-opacity": .98, "icon-opacity": .9 };
    if (type === "circle") return { "circle-color": "#60839a", "circle-opacity": .78, "circle-stroke-color": "#ffffff", "circle-stroke-opacity": .92 };
  }

  if (theme === "illustrated") {
    if (type === "background") return { "background-color": "#f1eadc" };
    if (type === "fill") return { "fill-color": water ? "#a8cee2" : green ? "#bfd0a9" : building ? "#d8c7b0" : "#eee4d4", "fill-opacity": .94 };
    if (type === "line") return { "line-color": water ? "#6fa7c2" : road ? "#81766d" : boundary ? "#9a86a5" : "#9f958a", "line-opacity": road ? .9 : .7 };
    if (type === "symbol") return { "text-color": "#413a34", "text-halo-color": "#f7f0e4", "text-halo-width": 1.3, "text-opacity": .96, "icon-opacity": .88 };
    if (type === "circle") return { "circle-color": "#7c6d62", "circle-opacity": .78, "circle-stroke-color": "#f7f0e4", "circle-stroke-opacity": .9 };
  }

  return {};
}

function ensureSatelliteLayer(map: any) {
  try {
    if (!map.getSource("mss-satellite-source")) {
      map.addSource("mss-satellite-source", {
        type: "raster",
        tiles: [RUNNING_SATELLITE_TILES],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: "Imagery © Esri",
      });
    }
    if (!map.getLayer("mss-satellite")) {
      const firstSymbol = map.getStyle?.()?.layers?.find((layer: any) => layer.type === "symbol")?.id;
      map.addLayer({
        id: "mss-satellite",
        type: "raster",
        source: "mss-satellite-source",
        layout: { visibility: "none" },
        paint: { "raster-opacity": .96, "raster-fade-duration": 0, "raster-resampling": "linear" },
      }, firstSymbol);
    }
  } catch {}
}

function applyRunningMapTheme(map: any, theme: RunningMapTheme, snapshot: PaintSnapshot) {
  if (!map || !snapshot.size) return;
  // Always restore the original OpenFreeMap paint first. This keeps switching
  // deterministic and avoids accumulating filters/overrides over time.
  restoreBasePaint(map, snapshot);

  if (theme === "satellite") ensureSatelliteLayer(map);
  try { if (map.getLayer?.("mss-satellite")) map.setLayoutProperty("mss-satellite", "visibility", theme === "satellite" ? "visible" : "none"); } catch {}

  if (theme !== "tourist" && theme !== "satellite") {
    const layers = map.getStyle?.()?.layers || [];
    for (const layer of layers) {
      const id = String(layer?.id || "");
      if (!id || isMssMapLayer(id)) continue;
      const palette = layerPalette(theme, layer);
      for (const [prop, value] of Object.entries(palette)) {
        try { map.setPaintProperty(id, prop, value); } catch {}
      }
    }
  }

  const hillshade = theme === "night"
    ? { exaggeration: .62, shadow: "#02060a", highlight: "#7eb8cf", accent: "#19384a" }
    : theme === "illustrated"
      ? { exaggeration: .38, shadow: "#574d42", highlight: "#fff7e7", accent: "#a8957e" }
      : theme === "light"
        ? { exaggeration: .32, shadow: "#7e8790", highlight: "#ffffff", accent: "#c8d0d6" }
        : theme === "satellite"
          ? { exaggeration: .30, shadow: "#0b1014", highlight: "#eef6f9", accent: "#52646f" }
          : { exaggeration: .48, shadow: "#0c1118", highlight: "#f5f7fb", accent: "#657482" };
  if (map.getLayer?.("terrain-hillshade")) {
    try { map.setPaintProperty("terrain-hillshade", "hillshade-exaggeration", hillshade.exaggeration); } catch {}
    try { map.setPaintProperty("terrain-hillshade", "hillshade-shadow-color", hillshade.shadow); } catch {}
    try { map.setPaintProperty("terrain-hillshade", "hillshade-highlight-color", hillshade.highlight); } catch {}
    try { map.setPaintProperty("terrain-hillshade", "hillshade-accent-color", hillshade.accent); } catch {}
  }
}


type ManualCameraCleanup = () => void;

type CameraPointer = { x: number; y: number };

function clampCameraPitch(value: number) {
  return Math.max(0, Math.min(85, value));
}

function pointerPairMetrics(rows: CameraPointer[]) {
  if (rows.length < 2) return null;
  const a = rows[0], b = rows[1];
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}

/**
 * MapLibre's native right-drag/touch camera gestures can be swallowed by the
 * app/browser shell on Pages/WebView. This local controller shields secondary
 * mouse buttons from global navigation and drives bearing/pitch/zoom directly.
 *
 * Desktop:
 *   - left drag: native MapLibre pan
 *   - right drag: free camera yaw + pitch
 *   - Ctrl/Meta + left drag: same free-camera gesture
 *   - wheel: native MapLibre zoom
 * Touch:
 *   - one finger: native MapLibre pan
 *   - two fingers: horizontal drag = yaw, vertical drag = pitch, pinch = zoom
 */
function bindManualCameraControls(map: any, host: HTMLElement): ManualCameraCleanup {
  let mouseOrbit: null | { pointerId: number; x: number; y: number; bearing: number; pitch: number } = null;
  const touches = new Map<number, CameraPointer>();
  let touchOrbit: null | { cx: number; cy: number; distance: number; bearing: number; pitch: number; zoom: number } = null;
  let dragPanSuspended = false;

  const stopMapAnimation = () => {
    try { map.stop?.(); } catch {}
  };

  const suspendDragPan = () => {
    if (dragPanSuspended) return;
    dragPanSuspended = true;
    try { map.dragPan?.disable?.(); } catch {}
  };

  const resumeDragPan = () => {
    if (!dragPanSuspended) return;
    dragPanSuspended = false;
    try { map.dragPan?.enable?.(); } catch {}
  };

  const beginTouchOrbitIfReady = () => {
    if (touches.size < 2) return;
    const metrics = pointerPairMetrics(Array.from(touches.values()).slice(0, 2));
    if (!metrics) return;
    stopMapAnimation();
    suspendDragPan();
    touchOrbit = {
      ...metrics,
      bearing: Number(map.getBearing?.() || 0),
      pitch: Number(map.getPitch?.() || 0),
      zoom: Number(map.getZoom?.() || 0),
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        event.preventDefault();
        event.stopPropagation();
        beginTouchOrbitIfReady();
      }
      return;
    }

    const secondary = event.button === 2 || event.button === 3 || event.button === 4;
    const modifiedPrimary = event.button === 0 && (event.ctrlKey || event.metaKey);
    if (!secondary && !modifiedPrimary) return;

    // Buttons 3/4 are browser back/forward on many mice. Swallow them inside
    // the map as well so a camera gesture can never kick the user to GameSelect.
    event.preventDefault();
    event.stopPropagation();
    stopMapAnimation();
    mouseOrbit = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      bearing: Number(map.getBearing?.() || 0),
      pitch: Number(map.getPitch?.() || 0),
    };
    host.style.cursor = "grabbing";
    try { host.setPointerCapture?.(event.pointerId); } catch {}
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      if (!touches.has(event.pointerId)) return;
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size < 2) return;
      if (!touchOrbit) beginTouchOrbitIfReady();
      if (!touchOrbit) return;
      event.preventDefault();
      event.stopPropagation();
      const metrics = pointerPairMetrics(Array.from(touches.values()).slice(0, 2));
      if (!metrics) return;
      const dx = metrics.cx - touchOrbit.cx;
      const dy = metrics.cy - touchOrbit.cy;
      const zoomDelta = Math.log2(metrics.distance / Math.max(1, touchOrbit.distance)) * 1.9;
      try {
        map.jumpTo({
          bearing: touchOrbit.bearing + dx * .34,
          pitch: clampCameraPitch(touchOrbit.pitch - dy * .24),
          zoom: Math.max(2, Math.min(20, touchOrbit.zoom + zoomDelta)),
        });
      } catch {}
      return;
    }

    if (!mouseOrbit || mouseOrbit.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - mouseOrbit.x;
    const dy = event.clientY - mouseOrbit.y;
    try {
      map.jumpTo({
        bearing: mouseOrbit.bearing + dx * .38,
        pitch: clampCameraPitch(mouseOrbit.pitch - dy * .28),
      });
    } catch {}
  };

  const finishPointer = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      const hadGesture = touches.size >= 2 || !!touchOrbit;
      touches.delete(event.pointerId);
      if (hadGesture) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (touches.size < 2) {
        touchOrbit = null;
        resumeDragPan();
      } else {
        beginTouchOrbitIfReady();
      }
      return;
    }

    if (!mouseOrbit || mouseOrbit.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    mouseOrbit = null;
    host.style.cursor = "";
    try { host.releasePointerCapture?.(event.pointerId); } catch {}
  };

  const blockContextMenu = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const blockSecondaryClick = (event: MouseEvent) => {
    if (event.button < 2) return;
    event.preventDefault();
    event.stopPropagation();
  };

  host.addEventListener("pointerdown", onPointerDown, { passive: false });
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", finishPointer, { passive: false });
  window.addEventListener("pointercancel", finishPointer, { passive: false });
  host.addEventListener("contextmenu", blockContextMenu, { capture: true });
  host.addEventListener("auxclick", blockSecondaryClick, { capture: true });
  host.addEventListener("mousedown", blockSecondaryClick, { capture: true });
  host.addEventListener("mouseup", blockSecondaryClick, { capture: true });

  return () => {
    host.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", finishPointer);
    window.removeEventListener("pointercancel", finishPointer);
    host.removeEventListener("contextmenu", blockContextMenu, true);
    host.removeEventListener("auxclick", blockSecondaryClick, true);
    host.removeEventListener("mousedown", blockSecondaryClick, true);
    host.removeEventListener("mouseup", blockSecondaryClick, true);
    resumeDragPan();
    host.style.cursor = "";
  };
}

export default function RunningTerrain3DMap({ points, accent, lang, textSoft = "#a8a8b3", height = "clamp(320px,58svh,620px)", fullscreen = false, routeName, places = [], activePointIndex = null, onActivePointChange, onPlaceSelect, onFallback2D, showReplay = true, preferCompat: _legacyPreferCompat = false, mapTheme, onMapThemeChange, showStylePicker = true }: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const maplibreRef = React.useRef<any>(null);
  const basePaintRef = React.useRef<PaintSnapshot>(new Map());
  const themeRef = React.useRef<RunningMapTheme>(mapTheme || loadRunningMapTheme());
  const activeMarkerRef = React.useRef<any>(null);
  const routeMarkersRef = React.useRef<any[]>([]);
  const placeMarkersRef = React.useRef<any[]>([]);
  const replayFrameRef = React.useRef<number | null>(null);
  const lastCameraAtRef = React.useRef(0);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState("");
  const [replaying, setReplaying] = React.useState(false);
  const replayingRef = React.useRef(false);
  const [replayIndex, setReplayIndex] = React.useState(0);
  const [localTheme, setLocalTheme] = React.useState<RunningMapTheme>(() => mapTheme || loadRunningMapTheme());
  const [styleMenu, setStyleMenu] = React.useState(false);
  const effectiveTheme = mapTheme || localTheme;
  React.useEffect(() => { replayingRef.current = replaying; }, [replaying]);
  React.useEffect(() => {
    themeRef.current = effectiveTheme;
    saveRunningMapTheme(effectiveTheme);
    const map = mapRef.current;
    if (map && basePaintRef.current.size) {
      try { applyRunningMapTheme(map, effectiveTheme, basePaintRef.current); } catch {}
    }
  }, [effectiveTheme]);
  const changeTheme = React.useCallback((theme: RunningMapTheme) => {
    saveRunningMapTheme(theme);
    if (onMapThemeChange) onMapThemeChange(theme);
    else setLocalTheme(theme);
    setStyleMenu(false);
  }, [onMapThemeChange]);

  const safePoints = React.useMemo(() => points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)), [points]);
  const distances = React.useMemo(() => cumulativeDistances(safePoints), [safePoints]);
  const totalDistanceM = distances[distances.length - 1] || 0;
  const terrain = React.useMemo(() => analyzeRunningTerrain(safePoints), [safePoints]);
  const activityAnalytics = React.useMemo(() => buildRunningActivityAnalytics({ route: safePoints, distanceM: totalDistanceM, movingMs: Number(safePoints[safePoints.length - 1]?.elapsedMs || 0), elapsedMs: Number(safePoints[safePoints.length - 1]?.elapsedMs || 0) } as any), [safePoints, totalDistanceM]);
  const hasPerformanceColors = activityAnalytics.routeEdges.some((edge) => edge.score != null);
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
    if (!host) return;
    let disposed = false;
    let readinessTimer: number | null = null;
    let compatPreviewTimer: number | null = null; // legacy watchdog name: now triggers a harmless resize, never fake 3D.
    let resizeObserver: ResizeObserver | null = null;
    let manualCameraCleanup: ManualCameraCleanup | null = null;
    if (safePoints.length < 2) { setStatus("error"); setError(pickText(lang, "Tracé insuffisant pour la 3D", "Not enough route points for 3D", "No hay suficientes puntos para 3D")); return; }
    setStatus("loading");
    setError("");
    compatPreviewTimer = window.setTimeout(() => { if (!disposed) { try { mapRef.current?.resize(); } catch {} } }, 1200);

    void loadMapLibre().then((maplibregl) => {
      if (disposed || !hostRef.current) return;
      maplibreRef.current = maplibregl;
      const first = safePoints[0];
      // Use OpenFreeMap's production vector style instead of hitting the public
      // OpenStreetMap raster tile server directly. This removes the 429 bursts
      // seen when the 3D camera loads many tiles at once.
      const map = new maplibregl.Map({
        container: hostRef.current,
        style: OPENFREEMAP_STYLE,
        center: [first.lon, first.lat],
        zoom: 13,
        pitch: 62,
        bearing: 0,
        maxPitch: 85,
        renderWorldCopies: false,
        attributionControl: false,
        cooperativeGestures: false,
        dragPan: true,
        dragRotate: true,
        scrollZoom: true,
        touchZoomRotate: true,
        touchPitch: true,
        keyboard: true,
        doubleClickZoom: true,
        pitchWithRotate: true,
        canvasContextAttributes: { antialias: true },
        refreshExpiredTiles: false,
        fadeDuration: 0,
        maxTileCacheSize: fullscreen ? 80 : 48,
      });
      mapRef.current = map;
      // Keep native pan/zoom, but own rotation/pitch gestures ourselves. This
      // avoids browser/app conflicts where right-click was interpreted as Back.
      try { map.dragPan?.enable?.(); } catch {}
      try { map.dragRotate?.disable?.(); } catch {}
      try { map.scrollZoom?.enable?.(); } catch {}
      try { map.touchZoomRotate?.disable?.(); } catch {}
      try { map.touchPitch?.disable?.(); } catch {}
      try { map.keyboard?.enable?.(); } catch {}
      try { map.doubleClickZoom?.enable?.(); } catch {}
      try { map.getCanvas().style.touchAction = "none"; } catch {}
      manualCameraCleanup = bindManualCameraControls(map, host);
      readinessTimer = window.setTimeout(() => {
        if (disposed || status === "ready") return;
        setError(pickText(lang, "Le moteur 3D ne répond pas. Revenez en 2D puis réessayez.", "3D engine is not responding. Return to 2D and try again.", "El motor 3D no responde. Vuelve a 2D e inténtalo de nuevo."));
        setStatus("error");
      }, 9000);

      try { map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: false }), "top-right"); } catch {}
      try { map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right"); } catch {}

      const stopFlyoverForManualCamera = (event: any) => {
        if (!event?.originalEvent || !replayingRef.current) return;
        replayingRef.current = false;
        setReplaying(false);
        if (replayFrameRef.current != null) cancelAnimationFrame(replayFrameRef.current);
        replayFrameRef.current = null;
      };
      map.on("dragstart", stopFlyoverForManualCamera);
      map.on("rotatestart", stopFlyoverForManualCamera);
      map.on("pitchstart", stopFlyoverForManualCamera);
      map.on("zoomstart", stopFlyoverForManualCamera);

      map.on("load", () => {
        if (disposed) return;
        if (readinessTimer != null) window.clearTimeout(readinessTimer);
        if (compatPreviewTimer != null) window.clearTimeout(compatPreviewTimer);
        basePaintRef.current = captureBasePaint(map);
        // Add the DEM only after the raster map is already alive. This is the
        // key difference from the old implementation that could stay forever
        // on “Chargement du relief 3D…”.
        try {
          if (!map.getSource("terrainSource")) map.addSource("terrainSource", { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 512, maxzoom: 14, attribution: "© Mapterhorn" });
          if (!map.getSource("hillshadeSource")) map.addSource("hillshadeSource", { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 512, maxzoom: 14, attribution: "© Mapterhorn" });
          if (!map.getLayer("terrain-hillshade")) {
            const firstSymbol = map.getStyle()?.layers?.find((layer: any) => layer.type === "symbol")?.id;
            map.addLayer({ id: "terrain-hillshade", type: "hillshade", source: "hillshadeSource", paint: { "hillshade-exaggeration": .48, "hillshade-shadow-color": "#0c1118", "hillshade-highlight-color": "#f5f7fb", "hillshade-accent-color": "#657482" } }, firstSymbol);
          }
          map.setTerrain({ source: "terrainSource", exaggeration: 1.35 });
        } catch (terrainError: any) {
          // Keep the real MapLibre map visible even if individual DEM tiles fail.
          setError(String(terrainError?.message || terrainError || "DEM unavailable"));
        }

        try {
          const features = hasPerformanceColors ? activityAnalytics.routeEdges.map((edge) => ({ type: "Feature", properties: { color: edge.color }, geometry: { type: "LineString", coordinates: [[safePoints[edge.startIndex].lon, safePoints[edge.startIndex].lat], [safePoints[edge.endIndex].lon, safePoints[edge.endIndex].lat]] } })) : [{ type: "Feature", properties: { color: accent }, geometry: { type: "LineString", coordinates: safePoints.map((point) => [point.lon, point.lat]) } }];
          map.addSource("mss-route", { type: "geojson", data: { type: "FeatureCollection", features } });
          map.addLayer({ id: "mss-route-shadow", type: "line", source: "mss-route", paint: { "line-color": "rgba(0,0,0,.86)", "line-width": 9.5, "line-opacity": .9 } });
          map.addLayer({ id: "mss-route-line", type: "line", source: "mss-route", paint: { "line-color": ["get", "color"], "line-width": 5.4, "line-opacity": 1 } });
        } catch {}

        routeMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
        routeMarkersRef.current = [];
        const startEl = markerElement("🚩", "#42ef7e", pickText(lang, "Départ", "Start", "Salida"), 32);
        const endEl = markerElement("🏁", "#ff5668", pickText(lang, "Arrivée", "Finish", "Llegada"), 32);
        routeMarkersRef.current.push(new maplibregl.Marker({ element: startEl }).setLngLat([safePoints[0].lon, safePoints[0].lat]).addTo(map));
        const last = safePoints[safePoints.length - 1];
        routeMarkersRef.current.push(new maplibregl.Marker({ element: endEl }).setLngLat([last.lon, last.lat]).addTo(map));

        for (let km = 1; km * 1000 < totalDistanceM; km += 1) {
          const index = indexAtDistance(distances, km * 1000);
          const point = safePoints[index];
          if (!point) continue;
          const el = markerElement(String(km), accent, `KM ${km}`, 24);
          routeMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([point.lon, point.lat]).addTo(map));
        }


        try { applyRunningMapTheme(map, themeRef.current, basePaintRef.current); } catch {}
        setStatus("ready");
        window.setTimeout(() => { try { map.resize(); } catch {}; fitRoute(64); }, 60);
      });

      map.on("error", (event: any) => {
        const message = String(event?.error?.message || "");
        if (/webgl|context lost|failed to initialize/i.test(message) && !disposed) {
          setError(message || "WebGL unavailable");
          setStatus("error");
          return;
        }
        // Once the style is alive, isolated vector/DEM tile errors are non-fatal.
        // Before first load, keep the watchdog responsible for the fallback UI.
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => { try { map.resize(); } catch {} });
        resizeObserver.observe(host);
      }
    }).catch((cause) => {
      if (disposed) return;
      if (readinessTimer != null) window.clearTimeout(readinessTimer);
      setStatus("error");
      setError(String(cause?.message || cause || "MapLibre unavailable"));
    });

    return () => {
      disposed = true;
      if (readinessTimer != null) window.clearTimeout(readinessTimer);
      if (compatPreviewTimer != null) window.clearTimeout(compatPreviewTimer);
      resizeObserver?.disconnect();
      manualCameraCleanup?.();
      manualCameraCleanup = null;
      if (replayFrameRef.current != null) cancelAnimationFrame(replayFrameRef.current);
      replayFrameRef.current = null;
      routeMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
      routeMarkersRef.current = [];
      placeMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
      placeMarkersRef.current = [];
      try { activeMarkerRef.current?.remove(); } catch {}
      activeMarkerRef.current = null;
      try { mapRef.current?.remove(); } catch {}
      mapRef.current = null;
    };
  }, [accent, fitRoute, fullscreen, hasPerformanceColors, lang, activityAnalytics.routeEdges, safePoints, distances, totalDistanceM]);

  React.useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    placeMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
    placeMarkersRef.current = [];
    if (!map || !maplibregl || status !== "ready") return;
    for (const place of places.slice(0, fullscreen ? 18 : 10)) {
      const el = markerElement(outdoorRoutePlaceIcon(place.category), "rgba(255,255,255,.86)", place.name, 30);
      el.style.cursor = "pointer";
      el.addEventListener("click", (event) => { event.stopPropagation(); onPlaceSelect?.(place); });
      try { placeMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([place.lon, place.lat]).addTo(map)); } catch {}
    }
    return () => {
      placeMarkersRef.current.forEach((marker) => { try { marker.remove(); } catch {} });
      placeMarkersRef.current = [];
    };
  }, [fullscreen, onPlaceSelect, places, status]);

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
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
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
  }, [distances, onActivePointChange, replaying, safePoints, totalDistanceM]);

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

  return <div className="running-map-shell" style={{ position: "relative", width: "100%", height: fullscreen ? "100%" : height, minHeight: fullscreen ? 0 : 300, overflow: "hidden", borderRadius: fullscreen ? 0 : 20, background: "#101821", border: fullscreen ? 0 : "1px solid rgba(255,255,255,.09)", boxShadow: fullscreen ? undefined : "0 22px 56px rgba(0,0,0,.30)" }}>
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}/>
    {status === "loading" ? <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", background: "linear-gradient(145deg,#101821,#070b10)", color: textSoft }}><div style={{ textAlign: "center", fontSize: 9 }}><div style={{ color: accent, fontSize: 20, marginBottom: 8 }}>⛰</div>{pickText(lang, "Chargement du relief 3D…", "Loading 3D terrain…", "Cargando relieve 3D…")}</div></div> : null}
    {status === "error" ? <div style={{ position: "absolute", inset: 0, zIndex: 22, display: "grid", placeItems: "center", padding: 20, background: "linear-gradient(145deg,#101821,#070b10)" }}><div style={{ width: "min(420px,100%)", padding: 16, borderRadius: 18, background: "rgba(5,8,13,.88)", border: "1px solid rgba(255,255,255,.12)", textAlign: "center", boxShadow: "0 18px 48px rgba(0,0,0,.35)" }}><div style={{ color: accent, fontSize: 26 }}>⛰</div><div style={{ marginTop: 7, color: "#fff", fontSize: 11, fontWeight: 1000 }}>{pickText(lang, "RELIEF 3D INDISPONIBLE", "3D TERRAIN UNAVAILABLE", "RELIEVE 3D NO DISPONIBLE")}</div><div style={{ marginTop: 6, color: textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{error || pickText(lang, "Le moteur WebGL/DEM n'a pas pu démarrer.", "The WebGL/DEM engine could not start.", "El motor WebGL/DEM no pudo iniciarse.")}</div>{onFallback2D ? <button className="btn" onClick={onFallback2D} style={{ marginTop: 12, minHeight: 38, color: accent, borderColor: `${accent}55`, background: `${accent}0d`, fontSize: 8.5, fontWeight: 1000 }}>{pickText(lang, "REVENIR EN 2D", "BACK TO 2D MAP", "VOLVER AL MAPA 2D")}</button> : null}</div></div> : null}

    {status === "ready" ? <>
      <div style={{ position: "absolute", left: 10, top: 10, zIndex: 15, display: "flex", gap: 6, pointerEvents: "auto" }}>
        <button className="btn" onClick={() => fitRoute(64)} style={controlStyle} title={pickText(lang,"Recentrer","Recenter","Centrar")}>◎</button>
        {showStylePicker ? <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setStyleMenu((value) => !value)} style={{ ...controlStyle, color: accent }} title={pickText(lang,"Style 3D","3D style","Estilo 3D")}>{runningMapThemeIcon(effectiveTheme)}</button>
          {styleMenu ? <div style={{ position: "absolute", left: 0, top: 44, width: 146, padding: 5, borderRadius: 13, background: "rgba(5,8,13,.96)", border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 14px 34px rgba(0,0,0,.42)", backdropFilter: "blur(16px)" }}>
            {runningMapThemes(lang).map(([id, label]) => <button key={id} className="btn" onClick={() => changeTheme(id)} style={{ width: "100%", minHeight: 33, margin: "2px 0", textAlign: "left", padding: "5px 8px", color: effectiveTheme === id ? accent : undefined, borderColor: effectiveTheme === id ? `${accent}55` : undefined, fontSize: 8 }}>{runningMapThemeIcon(id)} {label}</button>)}
          </div> : null}
        </div> : null}
        <div style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(5,8,13,.80)", border: `1px solid ${accent}38`, color: accent, fontSize: 8.4, fontWeight: 1000, backdropFilter: "blur(12px)" }}>3D · {runningMapThemeLabel(effectiveTheme, lang)}</div>
      </div>

      {showReplay ? <div className="running-3d-replay" style={{ position: "absolute", left: 10, bottom: fullscreen ? "max(18px,env(safe-area-inset-bottom))" : 12, zIndex: 16, maxWidth: "calc(100% - 20px)", pointerEvents: "auto" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
          <button className="btn" onClick={replaying ? stopReplay : startReplay} style={{ minHeight: 38, padding: "6px 10px", color: accent, borderColor: `${accent}55`, background: "rgba(5,8,13,.88)", backdropFilter: "blur(12px)", fontSize: 8.5, fontWeight: 1000 }}>{replaying ? "Ⅱ " : "▶ "}{replaying ? pickText(lang,"PAUSE","PAUSE","PAUSA") : pickText(lang,"SURVOL 3D","3D FLYOVER","VUELO 3D")}</button>
          {effectiveIndex != null ? <div className="running-3d-replay-metrics" style={{ display: "grid", gap: 4, padding: 5, borderRadius: 13, background: "rgba(5,8,13,.84)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(12px)" }}>
            <ReplayMetric label={pickText(lang,"DIST.","DIST.","DIST.")} value={`${((distances[currentIndex] || 0) / 1000).toFixed(2)} km`} accent={accent}/>
            <ReplayMetric label={pickText(lang,"TEMPS","TIME","TIEMPO")} value={elapsedMs == null ? "—" : formatDuration(elapsedMs)} accent={accent}/>
            <ReplayMetric label={pickText(lang,"ALT.","ELEV.","ALT.")} value={Number.isFinite(currentPoint?.altitude) ? `${Math.round(Number(currentPoint.altitude))} m` : currentTerrain ? `${Math.round(currentTerrain.altitudeM)} m` : "—"} accent={accent}/>
            <ReplayMetric label={pickText(lang,"PENTE","GRADE","PEND.")} value={currentTerrain ? `${currentTerrain.gradePct >= 0 ? "+" : ""}${currentTerrain.gradePct.toFixed(1)}%` : "—"} accent={accent}/>
            <ReplayMetric label={pickText(lang,"ALLURE","PACE","RITMO")} value={currentPace ? `${formatPace(currentPace)}/km` : "—"} accent={accent}/>
          </div> : null}
        </div>
      </div> : null}

      {routeName ? <div className="running-map-route-name" style={{ position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)", zIndex: 10, maxWidth: "52%", padding: "6px 10px", borderRadius: 999, background: "rgba(5,8,13,.70)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", fontSize: 7, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", backdropFilter: "blur(10px)" }}>{routeName}</div> : null}
      <div className="running-map-camera-help" style={{ position: "absolute", right: 10, bottom: fullscreen ? "max(18px,env(safe-area-inset-bottom))" : 12, zIndex: 14, maxWidth: "52%", padding: "5px 7px", borderRadius: 10, background: "rgba(5,8,13,.74)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.66)", fontSize: 6.6, fontWeight: 800, lineHeight: 1.25, pointerEvents: "none", backdropFilter: "blur(10px)", textAlign: "right" }}>
        {pickText(lang, "Souris : gauche = déplacer · clic droit + glisser = rotation 360° / inclinaison · molette = zoom · tactile : 1 doigt = déplacer · 2 doigts = tourner / incliner / zoomer", "Mouse: left-drag = pan · right-drag = 360° rotate / tilt · wheel = zoom · touch: 1 finger = pan · 2 fingers = rotate / tilt / zoom", "Ratón: izquierdo = mover · derecho + arrastrar = giro 360° / inclinación · rueda = zoom · táctil: 1 dedo = mover · 2 dedos = girar / inclinar / zoom") }
      </div>
    </> : null}
  </div>;
}

function ReplayMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="running-3d-replay-metric" style={{ padding: "5px 6px", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.48)", fontSize: 6.6, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, color: accent, fontSize: 8.2, fontWeight: 1000, whiteSpace: "nowrap" }}>{value}</div></div>;
}

const controlStyle: React.CSSProperties = { minWidth: 38, minHeight: 38, padding: 0, borderRadius: 13, background: "rgba(5,8,13,.86)", borderColor: "rgba(255,255,255,.14)", backdropFilter: "blur(12px)", fontSize: 13 };
