// ============================================
// TERRITORIES — MAP VIEW (REACT)
// FIT RÉEL + COULEURS FORCÉES + ZOOM/PAN BORNÉ + ROTATION
// Location: src/territories/TerritoriesMapView.tsx
// ============================================

import React from "react";
import type { TerritoriesCountry, TerritoriesMap } from "./types";
import { getTerritoryIdFromSvgElement, getOverlaySvgForCountry, getBaseSvgForCountry } from "./map";
import { getTerritoriesMapPresentationProfile } from "./mapPresentation";

type OwnerColorIndex = Record<string, string>;
type Point = { x: number; y: number };
type ViewportSize = { width: number; height: number };

export interface TerritoriesMapViewProps {
  country: TerritoriesCountry;
  map: TerritoriesMap;
  ownerColors: OwnerColorIndex;
  selectedTerritoryId?: string;
  activeColor: string;
  themeColor: string;
  interactive: boolean;
  onSelectTerritory?: (territoryId: string) => void;
  isSelectableTerritoryId?: (territoryId: string) => boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SCALE_MIN = 1;
const SCALE_MAX = 6;
const MAP_PADDING_RATIO = 0.035;
const MAP_PADDING_MIN = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildTerritoryFillIndex(map: TerritoriesMap, ownerColors: OwnerColorIndex): Record<string, string> {
  const out: Record<string, string> = {};
  for (const territory of map.territories) {
    if (!territory.ownerId) continue;
    const color = ownerColors[territory.ownerId];
    if (color) out[territory.id] = color;
  }
  return out;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = String(hex || "").trim().replace("#", "");
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

function rotateHue(hex: string, deg: number): string {
  const rgb = hexToRgb(hex) || { r: 82, g: 247, b: 255 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const nextHue = (hue + deg + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((nextHue / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (nextHue < 60) { rr = chroma; gg = x; }
  else if (nextHue < 120) { rr = x; gg = chroma; }
  else if (nextHue < 180) { gg = chroma; bb = x; }
  else if (nextHue < 240) { gg = x; bb = chroma; }
  else if (nextHue < 300) { rr = x; bb = chroma; }
  else { rr = chroma; bb = x; }

  const values = [rr, gg, bb].map((value) => Math.round((value + m) * 255));
  return `#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

// France : code département -> région visuelle.
const FR_DEP_TO_REGION: Record<string, string> = {
  "01": "ARA", "03": "ARA", "07": "ARA", "15": "ARA", "26": "ARA", "38": "ARA", "42": "ARA", "43": "ARA", "63": "ARA", "69": "ARA", "73": "ARA", "74": "ARA",
  "21": "BFC", "25": "BFC", "39": "BFC", "58": "BFC", "70": "BFC", "71": "BFC", "89": "BFC", "90": "BFC",
  "22": "BRE", "29": "BRE", "35": "BRE", "56": "BRE",
  "18": "CVL", "28": "CVL", "36": "CVL", "37": "CVL", "41": "CVL", "45": "CVL",
  "2A": "COR", "2B": "COR",
  "08": "GES", "10": "GES", "51": "GES", "52": "GES", "54": "GES", "55": "GES", "57": "GES", "67": "GES", "68": "GES", "88": "GES",
  "02": "HDF", "59": "HDF", "60": "HDF", "62": "HDF", "80": "HDF",
  "75": "IDF", "77": "IDF", "78": "IDF", "91": "IDF", "92": "IDF", "93": "IDF", "94": "IDF", "95": "IDF",
  "14": "NOR", "27": "NOR", "50": "NOR", "61": "NOR", "76": "NOR",
  "16": "NAQ", "17": "NAQ", "19": "NAQ", "23": "NAQ", "24": "NAQ", "33": "NAQ", "40": "NAQ", "47": "NAQ", "64": "NAQ", "79": "NAQ", "86": "NAQ", "87": "NAQ",
  "09": "OCC", "11": "OCC", "12": "OCC", "30": "OCC", "31": "OCC", "32": "OCC", "34": "OCC", "46": "OCC", "48": "OCC", "65": "OCC", "66": "OCC", "81": "OCC", "82": "OCC",
  "44": "PDL", "49": "PDL", "53": "PDL", "72": "PDL", "85": "PDL",
  "04": "PACA", "05": "PACA", "06": "PACA", "13": "PACA", "83": "PACA", "84": "PACA",
};

function prepareSvgRoot(svg: SVGSVGElement, fallbackViewBox: string) {
  if (!svg.getAttribute("viewBox") && fallbackViewBox) svg.setAttribute("viewBox", fallbackViewBox);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", "100%", "important");
  svg.style.setProperty("display", "block", "important");
  svg.style.setProperty("overflow", "visible", "important");
}

function applyPathVisual(path: SVGPathElement, fill: string | undefined, isSelected: boolean) {
  const finalFill = fill || "rgba(255,255,255,0.012)";

  // Les cartes amCharts possèdent souvent .land { fill:#ccc }. Un simple attribut
  // fill ne suffit donc pas : on force le style inline en !important.
  path.style.setProperty("fill", finalFill, "important");
  path.style.setProperty("fill-opacity", fill ? "0.96" : "1", "important");
  path.style.setProperty("stroke", "rgba(255,255,255,0.78)", "important");
  path.style.setProperty("stroke-width", "0.8", "important");
  path.style.setProperty("vector-effect", "non-scaling-stroke", "important");
  path.style.setProperty("pointer-events", "all", "important");
  path.style.setProperty("cursor", "pointer", "important");

  if (isSelected) path.classList.add("territory-selected");
  else path.classList.remove("territory-selected");
}

function injectStylesAndFills(params: {
  svgRaw: string;
  country: TerritoriesCountry;
  map: TerritoriesMap;
  fillByTerritoryId: Record<string, string>;
  selectedTerritoryId?: string;
  activeColor: string;
  themeColor: string;
}): string {
  const { svgRaw, country, map, fillByTerritoryId, selectedTerritoryId, activeColor, themeColor } = params;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;

  prepareSvgRoot(svg, map.svgViewBox);

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  const regionCodes = Array.from(new Set(Object.values(FR_DEP_TO_REGION)));
  const regionCss = regionCodes.map((code, index) => {
    const color = rotateHue(themeColor, index * 32);
    return `.fr-region-${code}{stroke:${color}!important;stroke-width:1.25!important;vector-effect:non-scaling-stroke;}`;
  }).join("\n");

  styleEl.textContent = `
    .territory-selected {
      filter: drop-shadow(0 0 6px ${activeColor}) drop-shadow(0 0 14px ${activeColor});
      animation: territoryPulse 1.2s ease-in-out infinite;
    }
    @keyframes territoryPulse {
      0%,100% { opacity:1; }
      50% { opacity:.82; }
    }
    ${regionCss}
  `;
  // Placé à la fin pour gagner aussi contre les styles internes du SVG.
  svg.appendChild(styleEl);

  if (country === "FR") {
    const paths = Array.from(svg.querySelectorAll("path[data-numerodepartement]")) as SVGPathElement[];
    for (const path of paths) {
      const department = path.getAttribute("data-numerodepartement");
      if (!department) continue;
      const territoryId = `FR-${department}`;
      const regionCode = FR_DEP_TO_REGION[department];
      if (regionCode) path.classList.add(`fr-region-${regionCode}`);
      path.setAttribute("data-territory-id", territoryId);
      applyPathVisual(path, fillByTerritoryId[territoryId], selectedTerritoryId === territoryId);
    }
    return svg.outerHTML;
  }

  const presentation = getTerritoriesMapPresentationProfile(country);
  const territoryByPathId = new Map(map.territories.map((territory) => [territory.svgPathId, territory]));
  const pathById = new Map<string, SVGPathElement>();

  for (const path of Array.from(svg.querySelectorAll("path[id]")) as SVGPathElement[]) {
    if (!path.id) continue;
    pathById.set(path.id, path);

    // Un path absent du moteur ne doit pas rester visible : il fausserait le
    // cadrage et pourrait donner l'impression d'être un territoire jouable.
    if (!territoryByPathId.has(path.id)) {
      path.style.setProperty("display", "none", "important");
      path.style.setProperty("pointer-events", "none", "important");
      path.setAttribute("aria-hidden", "true");
    }
  }

  for (const territory of map.territories) {
    const path = pathById.get(territory.svgPathId);
    if (!path) continue;
    path.setAttribute("data-territory-id", territory.id);

    const transform = presentation.pathTransforms?.[territory.id]
      ?? presentation.pathTransforms?.[territory.svgPathId];
    if (transform) {
      const existing = path.getAttribute("transform");
      path.setAttribute("transform", [existing, transform].filter(Boolean).join(" "));
    }

    applyPathVisual(path, fillByTerritoryId[territory.id], selectedTerritoryId === territory.id);
  }

  return svg.outerHTML;
}

function injectOverlayStyles(overlayRaw: string, themeColor: string, viewBox: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(overlayRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  prepareSvgRoot(svg, viewBox);

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    path { fill:none!important;stroke:${themeColor}!important;stroke-width:2.2!important;vector-effect:non-scaling-stroke;opacity:.9; }
    * { pointer-events:none!important; }
  `;
  svg.appendChild(styleEl);
  return svg.outerHTML;
}

function getRotatedStageSize(viewport: ViewportSize, rotation: number) {
  const quarterTurn = Math.abs(rotation % 180) === 90;
  if (!quarterTurn) return { width: viewport.width, height: viewport.height, fit: 1 };

  const fit = Math.min(
    viewport.width / Math.max(1, viewport.height),
    viewport.height / Math.max(1, viewport.width),
  );
  return {
    width: viewport.height * fit,
    height: viewport.width * fit,
    fit,
  };
}

function clampPan(point: Point, scale: number, rotation: number, viewport: ViewportSize): Point {
  const stage = getRotatedStageSize(viewport, rotation);
  const maxX = Math.max(0, (stage.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (stage.height * scale - viewport.height) / 2);
  return {
    x: clamp(point.x, -maxX, maxX),
    y: clamp(point.y, -maxY, maxY),
  };
}

function shouldAutoRotate(contentRatio: number, viewportRatio: number) {
  // On ne retourne automatiquement que les cartes EXTRÊMEMENT allongées.
  // Les cartes du monde/continents conservent ainsi le nord en haut.
  const extremelyLandscape = contentRatio >= 2.2 && viewportRatio <= 0.68;
  const extremelyPortrait = contentRatio <= 0.45 && viewportRatio >= 1.45;
  return extremelyLandscape || extremelyPortrait;
}

function IconButton(props: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={props.title}
      title={props.title}
      disabled={props.disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick();
      }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.48)",
        color: props.disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)",
        display: "grid",
        placeItems: "center",
        fontSize: 18,
        fontWeight: 950,
        boxShadow: "0 0 12px rgba(0,0,0,0.45)",
        backdropFilter: "blur(7px)",
        cursor: props.disabled ? "default" : "pointer",
      }}
    >
      {props.label}
    </button>
  );
}

export default function TerritoriesMapView(props: TerritoriesMapViewProps) {
  const {
    country,
    map,
    ownerColors,
    selectedTerritoryId,
    activeColor,
    themeColor,
    interactive,
    onSelectTerritory,
    isSelectableTerritoryId,
    className,
    style,
  } = props;

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const baseHostRef = React.useRef<HTMLDivElement | null>(null);
  const overlayHostRef = React.useRef<HTMLDivElement | null>(null);
  const pointersRef = React.useRef(new Map<number, Point>());
  const gestureMovedRef = React.useRef(false);
  const pinchRef = React.useRef<{ distance: number; scale: number; center: Point; pan: Point } | null>(null);
  const rotationWasManualRef = React.useRef(false);

  const [viewport, setViewport] = React.useState<ViewportSize>({ width: 1, height: 1 });
  const [scale, setScale] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState(0);

  const baseSvgRaw = React.useMemo(() => getBaseSvgForCountry(country), [country]);
  const overlayRaw = React.useMemo(() => getOverlaySvgForCountry(country), [country]);
  const fillIndex = React.useMemo(() => buildTerritoryFillIndex(map, ownerColors), [map, ownerColors]);

  const baseSvgHtml = React.useMemo(() => {
    if (typeof DOMParser === "undefined") return baseSvgRaw;
    return injectStylesAndFills({
      svgRaw: baseSvgRaw,
      country,
      map,
      fillByTerritoryId: fillIndex,
      selectedTerritoryId,
      activeColor,
      themeColor,
    });
  }, [baseSvgRaw, country, map, fillIndex, selectedTerritoryId, activeColor, themeColor]);

  const overlaySvgHtml = React.useMemo(() => {
    if (!overlayRaw) return null;
    if (typeof DOMParser === "undefined") return overlayRaw;
    return injectOverlayStyles(overlayRaw, themeColor, map.svgViewBox);
  }, [overlayRaw, themeColor, map.svgViewBox]);

  const resetView = React.useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mesure réellement le conteneur, y compris après rotation de l'appareil.
  React.useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setViewport({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    update();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Recalcule un viewBox serré depuis la géométrie RÉELLE des territoires.
  // C'est ce qui corrige North America / Europe / Asia / etc. qui n'ont pas de viewBox fiable.
  React.useLayoutEffect(() => {
    const host = baseHostRef.current;
    const svg = host?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    const presentation = getTerritoriesMapPresentationProfile(country);
    const territoryIds = new Set(map.territories.map((territory) => territory.id));
    const fitExcludedIds = new Set((presentation.fitExcludedTerritoryIds ?? []).map(String));
    const candidatePaths = Array.from(svg.querySelectorAll("path")) as SVGPathElement[];

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let measured = 0;

    for (const path of candidatePaths) {
      const territoryId = path.getAttribute("data-territory-id") || getTerritoryIdFromSvgElement(country, path);
      if (!territoryId || !territoryIds.has(territoryId) || fitExcludedIds.has(territoryId)) continue;
      try {
        const box = path.getBBox();
        if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || box.width <= 0 || box.height <= 0) continue;
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
        measured += 1;
      } catch {
        // Une path non rendable ne doit pas bloquer toute la carte.
      }
    }

    if (!measured || !Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const rawWidth = Math.max(1, maxX - minX);
    const rawHeight = Math.max(1, maxY - minY);
    const padding = Math.max(MAP_PADDING_MIN, Math.max(rawWidth, rawHeight) * MAP_PADDING_RATIO);
    const fittedViewBox = `${minX - padding} ${minY - padding} ${rawWidth + padding * 2} ${rawHeight + padding * 2}`;

    svg.setAttribute("viewBox", fittedViewBox);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const overlaySvg = overlayHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (overlaySvg) {
      overlaySvg.setAttribute("viewBox", fittedViewBox);
      overlaySvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    if (!rotationWasManualRef.current) {
      const contentRatio = rawWidth / rawHeight;
      const viewportRatio = viewport.width / viewport.height;
      setRotation(shouldAutoRotate(contentRatio, viewportRatio) ? 90 : 0);
    }
  }, [baseSvgHtml, country, map.territories, viewport.width, viewport.height]);

  React.useEffect(() => {
    rotationWasManualRef.current = false;
    setRotation(0);
    resetView();
  }, [country, resetView]);

  React.useEffect(() => {
    setPan((current) => clampPan(current, scale, rotation, viewport));
  }, [scale, rotation, viewport]);

  const setZoomAroundPoint = React.useCallback((nextScaleRaw: number, pointInViewport?: Point) => {
    const nextScale = clamp(nextScaleRaw, SCALE_MIN, SCALE_MAX);
    setScale((currentScale) => {
      if (Math.abs(nextScale - currentScale) < 0.0001) return currentScale;

      setPan((currentPan) => {
        if (nextScale === SCALE_MIN) return { x: 0, y: 0 };
        const focus = pointInViewport || { x: viewport.width / 2, y: viewport.height / 2 };
        const centered = { x: focus.x - viewport.width / 2, y: focus.y - viewport.height / 2 };
        const ratio = nextScale / currentScale;
        return clampPan({
          x: centered.x - (centered.x - currentPan.x) * ratio,
          y: centered.y - (centered.y - currentPan.y) * ratio,
        }, nextScale, rotation, viewport);
      });

      return nextScale;
    });
  }, [rotation, viewport]);

  const selectAtPoint = React.useCallback((clientX: number, clientY: number) => {
    if (!interactive) return;
    const element = document.elementFromPoint(clientX, clientY) as Element | null;
    const path = element?.closest?.("path") as SVGPathElement | null;
    if (!path) return;

    const territoryId = path.getAttribute("data-territory-id") || getTerritoryIdFromSvgElement(country, path);
    if (!territoryId) return;
    if (isSelectableTerritoryId && !isSelectableTerritoryId(territoryId)) return;
    onSelectTerritory?.(territoryId);
  }, [interactive, country, isSelectableTerritoryId, onSelectTerritory]);

  const onWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setZoomAroundPoint(scale * (event.deltaY < 0 ? 1.16 : 0.86), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, [scale, setZoomAroundPoint]);

  const onPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureMovedRef.current = false;

    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const first = points[0];
      const second = points[1];
      if (!first || !second) return;
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
        scale,
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        pan,
      };
    }
  }, [scale, pan]);

  const onPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) return;

    const nextPoint = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, nextPoint);
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2) {
      const first = points[0];
      const second = points[1];
      if (!first || !second) return;

      const distance = Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
      const centerClient = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const rect = event.currentTarget.getBoundingClientRect();
      const start = pinchRef.current;

      if (start) {
        const nextScale = clamp(start.scale * (distance / start.distance), SCALE_MIN, SCALE_MAX);
        const centerDelta = { x: centerClient.x - start.center.x, y: centerClient.y - start.center.y };
        const startFocus = { x: start.center.x - rect.left, y: start.center.y - rect.top };
        const centeredStart = { x: startFocus.x - viewport.width / 2, y: startFocus.y - viewport.height / 2 };
        const ratio = nextScale / start.scale;
        const zoomedPan = {
          x: centeredStart.x - (centeredStart.x - start.pan.x) * ratio + centerDelta.x,
          y: centeredStart.y - (centeredStart.y - start.pan.y) * ratio + centerDelta.y,
        };

        setScale(nextScale);
        setPan(clampPan(zoomedPan, nextScale, rotation, viewport));
        gestureMovedRef.current = true;
      } else {
        pinchRef.current = { distance, scale, center: centerClient, pan };
      }
      return;
    }

    if (scale <= SCALE_MIN) return;
    const dx = nextPoint.x - previous.x;
    const dy = nextPoint.y - previous.y;
    if (Math.abs(dx) + Math.abs(dy) >= 2) gestureMovedRef.current = true;
    setPan((current) => clampPan({ x: current.x + dx, y: current.y + dy }, scale, rotation, viewport));
  }, [scale, rotation, viewport, pan]);

  const onPointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const wasTap = !gestureMovedRef.current && pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Certains navigateurs libèrent automatiquement la capture.
    }

    if (wasTap) selectAtPoint(event.clientX, event.clientY);
    if (pointersRef.current.size === 0) gestureMovedRef.current = false;
  }, [selectAtPoint]);

  const stage = getRotatedStageSize(viewport, rotation);
  const showReset = scale !== 1 || pan.x !== 0 || pan.y !== 0;

  return (
    <div
      ref={viewportRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        overscrollBehavior: "contain",
        cursor: scale > 1 ? "grab" : "default",
        ...style,
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setZoomAroundPoint(scale > 1 ? 1 : 2, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale * stage.fit}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            willChange: "transform",
            pointerEvents: "auto",
          }}
        >
          <div
            ref={baseHostRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              userSelect: "none",
            }}
            dangerouslySetInnerHTML={{ __html: baseSvgHtml }}
          />

          {overlaySvgHtml && (
            <div
              ref={overlayHostRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                userSelect: "none",
              }}
              dangerouslySetInnerHTML={{ __html: overlaySvgHtml }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          zIndex: 8,
          display: "grid",
          gridTemplateColumns: "repeat(2, 38px)",
          gap: 7,
        }}
      >
        <IconButton label="+" title="Zoomer" onClick={() => setZoomAroundPoint(scale * 1.35)} disabled={scale >= SCALE_MAX} />
        <IconButton label="−" title="Dézoomer" onClick={() => setZoomAroundPoint(scale / 1.35)} disabled={scale <= SCALE_MIN} />
        <IconButton
          label="↻"
          title="Pivoter la carte de 90°"
          onClick={() => {
            rotationWasManualRef.current = true;
            setRotation((current) => (current + 90) % 360);
            resetView();
          }}
        />
        <IconButton label="⌂" title="Recentrer la carte" onClick={resetView} disabled={!showReset} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          zIndex: 7,
          maxWidth: "calc(100% - 112px)",
          padding: "6px 9px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.42)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.68)",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.25,
          pointerEvents: "none",
          backdropFilter: "blur(5px)",
        }}
      >
        Pincer ou utiliser +/− pour zoomer · faire glisser pour parcourir
      </div>
    </div>
  );
}
