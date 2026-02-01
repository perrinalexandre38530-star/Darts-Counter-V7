// ============================================
// TERRITORIES — MAP VIEW (REACT) — FIT + SAFE ZOOM/PAN
// Location: src/territories/TerritoriesMapView.tsx
//
// ✅ Keeps your working SVG injection (maps render OK)
// ✅ Adds: wheel zoom (desktop) + pinch zoom (touch) + pan (drag)
// ✅ Selection still works while zoomed (click/tap on territories)
// ✅ FR: regions are NOT overlaid by a separate SVG (mismatch risk).
//     Instead, departments are tagged with region codes and we render
//     region-colored strokes/tints directly on the departments map.
// ============================================

import React from "react";
import type { TerritoriesCountry, TerritoriesMap } from "./types";
import { getTerritoryIdFromSvgElement, getOverlaySvgForCountry, getBaseSvgForCountry } from "./map";

type OwnerColorIndex = Record<string, string>;

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

function buildTerritoryFillIndex(map: TerritoriesMap, ownerColors: OwnerColorIndex): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of map.territories) {
    if (!t.ownerId) continue;
    const c = ownerColors[t.ownerId];
    if (c) out[t.id] = c;
  }
  return out;
}

// Countries that benefit from "slice" (full-bleed) because their SVGs often have large margins
const SLICE_COUNTRIES: TerritoriesCountry[] = ["ES", "US", "CN", "RU", "WORLD"];

// ---- Color helpers ----
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = String(hex || "").trim().replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbToRgba(rgb: { r: number; g: number; b: number }, a: number) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp01(a)})`;
}

function rotateHue(hex: string, deg: number): string {
  const rgb = hexToRgb(hex) || { r: 82, g: 247, b: 255 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  const nh = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((nh / 60) % 2) - 1));
  const m = l - c / 2;

  let rr = 0, gg = 0, bb = 0;
  if (nh < 60) { rr = c; gg = x; bb = 0; }
  else if (nh < 120) { rr = x; gg = c; bb = 0; }
  else if (nh < 180) { rr = 0; gg = c; bb = x; }
  else if (nh < 240) { rr = 0; gg = x; bb = c; }
  else if (nh < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }

  const R = Math.round((rr + m) * 255);
  const G = Math.round((gg + m) * 255);
  const B = Math.round((bb + m) * 255);

  return `#${[R, G, B].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ---- FR: department -> region code (metropolitan) ----
// Region codes are simple labels (not official INSEE codes): e.g. "IDF", "NAQ", ...
// Used only for styling (stroke/tint).
const FR_DEP_TO_REGION: Record<string, string> = {
  // Auvergne-Rhône-Alpes
  "01": "ARA", "03": "ARA", "07": "ARA", "15": "ARA", "26": "ARA", "38": "ARA", "42": "ARA", "43": "ARA", "63": "ARA", "69": "ARA", "73": "ARA", "74": "ARA",
  // Bourgogne-Franche-Comté
  "21": "BFC", "25": "BFC", "39": "BFC", "58": "BFC", "70": "BFC", "71": "BFC", "89": "BFC", "90": "BFC",
  // Bretagne
  "22": "BRE", "29": "BRE", "35": "BRE", "56": "BRE",
  // Centre-Val de Loire
  "18": "CVL", "28": "CVL", "36": "CVL", "37": "CVL", "41": "CVL", "45": "CVL",
  // Corse
  "2A": "COR", "2B": "COR",
  // Grand Est
  "08": "GES", "10": "GES", "51": "GES", "52": "GES", "54": "GES", "55": "GES", "57": "GES", "67": "GES", "68": "GES", "88": "GES",
  // Hauts-de-France
  "02": "HDF", "59": "HDF", "60": "HDF", "62": "HDF", "80": "HDF",
  // Île-de-France
  "75": "IDF", "77": "IDF", "78": "IDF", "91": "IDF", "92": "IDF", "93": "IDF", "94": "IDF", "95": "IDF",
  // Normandie
  "14": "NOR", "27": "NOR", "50": "NOR", "61": "NOR", "76": "NOR",
  // Nouvelle-Aquitaine
  "16": "NAQ", "17": "NAQ", "19": "NAQ", "23": "NAQ", "24": "NAQ", "33": "NAQ", "40": "NAQ", "47": "NAQ", "64": "NAQ", "79": "NAQ", "86": "NAQ", "87": "NAQ",
  // Occitanie
  "09": "OCC", "11": "OCC", "12": "OCC", "30": "OCC", "31": "OCC", "32": "OCC", "34": "OCC", "46": "OCC", "48": "OCC", "65": "OCC", "66": "OCC", "81": "OCC", "82": "OCC",
  // Pays de la Loire
  "44": "PDL", "49": "PDL", "53": "PDL", "72": "PDL", "85": "PDL",
  // Provence-Alpes-Côte d'Azur
  "04": "PACA", "05": "PACA", "06": "PACA", "13": "PACA", "83": "PACA", "84": "PACA",
};

function prepareSvgRoot(svg: SVGSVGElement, viewBox: string, preserveAspect: string) {
  // Ensure viewBox (critical for scaling)
  if (!svg.getAttribute("viewBox") && viewBox) svg.setAttribute("viewBox", viewBox);

  // Remove hard sizing that breaks responsive layouts
  svg.removeAttribute("width");
  svg.removeAttribute("height");

  // Force responsive sizing
  svg.setAttribute("preserveAspectRatio", preserveAspect);
  svg.setAttribute("style", "width:100%;height:100%;display:block;");
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

  const preserveAspect = SLICE_COUNTRIES.includes(country) ? "xMidYMid slice" : "xMidYMid meet";

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;

  prepareSvgRoot(svg, map.svgViewBox, preserveAspect);

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");

  // FR region palette derived from themeColor (keeps your neon vibe but clearly different between regions)
  const regionCodes = Array.from(new Set(Object.values(FR_DEP_TO_REGION)));
  const regionColorByCode: Record<string, string> = {};
  regionCodes.forEach((code, idx) => {
    // Spread hues (idx * 32deg) around the theme hue
    regionColorByCode[code] = rotateHue(themeColor, idx * 32);
  });

  const regionCss = regionCodes
    .map((code) => {
      const c = regionColorByCode[code];
      return `
        .fr-region-${code} { stroke: ${c}; stroke-width: 1.25; vector-effect: non-scaling-stroke; opacity: 0.95; }
      `;
    })
    .join("\n");

  styleEl.textContent = `
    /* Responsive safety */
    svg { width: 100%; height: 100%; display: block; }

    /* Default neutral */
    path { cursor: pointer; }

    /* Base borders */
    path { stroke: rgba(255,255,255,0.65); stroke-width: 0.75; vector-effect: non-scaling-stroke; }

    /* Selected glow */
    .territory-selected {
      filter: drop-shadow(0 0 6px ${activeColor}) drop-shadow(0 0 14px ${activeColor});
      animation: territoryPulse 1.2s ease-in-out infinite;
    }
    @keyframes territoryPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }

    /* FR: materialize regions (by styling departments, not by overlay SVG) */
    ${regionCss}
  `;
  svg.insertBefore(styleEl, svg.firstChild);

  if (country === "FR") {
    const paths = Array.from(svg.querySelectorAll("path[data-numerodepartement]")) as SVGPathElement[];
    const themeRgb = hexToRgb(themeColor) || { r: 255, g: 210, b: 90 };

    for (const p of paths) {
      const dep = p.getAttribute("data-numerodepartement");
      if (!dep) continue;
      const tid = `FR-${dep}`;
      const ownerFill = fillByTerritoryId[tid];

      // Region tagging
      const regionCode = FR_DEP_TO_REGION[dep] || "UNK";
      if (regionCode !== "UNK") {
        p.classList.add(`fr-region-${regionCode}`);
        // If not owned, tint by region to visually "group" departments into regions
        if (!ownerFill) {
          const rc = regionColorByCode[regionCode] || themeColor;
          const rcRgb = hexToRgb(rc) || themeRgb;
          p.setAttribute("fill", rgbToRgba(rcRgb, 0.12));
        } else {
          p.setAttribute("fill", ownerFill);
        }
      } else {
        // Unknown (shouldn't happen) => neutral
        p.setAttribute("fill", ownerFill ? ownerFill : "rgba(120,120,120,0.22)");
      }

      if (selectedTerritoryId && selectedTerritoryId === tid) p.classList.add("territory-selected");
      else p.classList.remove("territory-selected");
    }
    return svg.outerHTML;
  }

  const allPaths = Array.from(svg.querySelectorAll("path[id]")) as SVGPathElement[];
  const byId = new Map<string, SVGPathElement>();
  for (const p of allPaths) if (p.id) byId.set(p.id, p);

  for (const t of map.territories) {
    const p = byId.get(t.svgPathId);
    if (!p) continue;

    const fill = fillByTerritoryId[t.id];
    p.setAttribute("fill", fill ? fill : "rgba(120,120,120,0.25)");

    if (selectedTerritoryId && selectedTerritoryId === t.id) p.classList.add("territory-selected");
    else p.classList.remove("territory-selected");
  }

  return svg.outerHTML;
}

function injectOverlayStyles(overlayRaw: string, themeColor: string, viewBox: string, country: TerritoriesCountry): string {
  const preserveAspect = SLICE_COUNTRIES.includes(country) ? "xMidYMid slice" : "xMidYMid meet";

  const parser = new DOMParser();
  const doc = parser.parseFromString(overlayRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;

  prepareSvgRoot(svg, viewBox, preserveAspect);

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    path { fill: none !important; stroke: ${themeColor}; stroke-width: 2.2; vector-effect: non-scaling-stroke; opacity: 0.9; }
    * { pointer-events: none; }
  `;
  svg.insertBefore(styleEl, svg.firstChild);

  return svg.outerHTML;
}

// ---------- Zoom/Pan (mouse + touch) ----------
const SCALE_MIN = 1;
const SCALE_MAX = 4;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

  const baseSvgRaw = React.useMemo(() => getBaseSvgForCountry(country), [country]);
  const overlayRaw = React.useMemo(() => getOverlaySvgForCountry(country), [country]);

  const fillIndex = React.useMemo(() => buildTerritoryFillIndex(map, ownerColors), [map, ownerColors]);

  const baseSvgHtml = React.useMemo(() => {
    if (typeof window === "undefined" || typeof DOMParser === "undefined") return baseSvgRaw;
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
    if (typeof window === "undefined" || typeof DOMParser === "undefined") return overlayRaw;
    return injectOverlayStyles(overlayRaw, themeColor, map.svgViewBox, country);
  }, [overlayRaw, themeColor, map.svgViewBox, country]);

  // -------- Zoom/Pan state --------
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);

  // Track panning & pinch
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDist = React.useRef<number | null>(null);
  const didPan = React.useRef(false);

  const resetView = React.useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const onWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.12 : 0.9), SCALE_MIN, SCALE_MAX);
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
    },
    [scale]
  );

  const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didPan.current = false;
  }, []);

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;

    const nextPt = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, nextPt);

    const pts = Array.from(pointers.current.values());

    // Pinch (2 fingers)
    if (pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      if (lastPinchDist.current != null) {
        const ratio = dist / lastPinchDist.current;
        const nextScale = clamp(scale * ratio, SCALE_MIN, SCALE_MAX);
        if (Math.abs(nextScale - scale) > 0.001) {
          setScale(nextScale);
          if (nextScale === 1) {
            setTx(0);
            setTy(0);
          }
        }
      }
      lastPinchDist.current = dist;
      didPan.current = true;
      return;
    }

    // Pan (drag) only when zoomed
    if (scale <= 1) return;

    const dx = nextPt.x - prev.x;
    const dy = nextPt.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) didPan.current = true;

    setTx((v) => v + dx);
    setTy((v) => v + dy);
  }, [scale]);

  const onPointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
  }, []);

  const showReset = scale !== 1 || tx !== 0 || ty !== 0;

  // Territory selection (still works while zoomed)
  const onClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;

      // If user just panned/pinched, don't treat it as a "click"
      if (didPan.current) {
        didPan.current = false;
        return;
      }

      const target = e.target as Element | null;
      if (!target) return;

      const pathEl = target.closest("path");
      if (!pathEl) return;

      const tid = getTerritoryIdFromSvgElement(country, pathEl);
      if (!tid) return;

      if (isSelectableTerritoryId && !isSelectableTerritoryId(tid)) return;

      onSelectTerritory?.(tid);
    },
    [interactive, onSelectTerritory, country, isSelectableTerritoryId]
  );

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...style,
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
    >
      {/* Zoom wrapper (non-destructive) */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              userSelect: "none",
              pointerEvents: interactive ? "auto" : "none",
            }}
            dangerouslySetInnerHTML={{ __html: baseSvgHtml }}
          />

          {overlaySvgHtml && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
              dangerouslySetInnerHTML={{ __html: overlaySvgHtml }}
            />
          )}
        </div>
      </div>

      {showReset && (
        <button
          type="button"
          onClick={resetView}
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            width: 38,
            height: 38,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "rgba(255,255,255,0.9)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 10px rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            cursor: "pointer",
            zIndex: 5,
          }}
          aria-label="Reset zoom"
          title="Reset"
        >
          ↺
        </button>
      )}
    </div>
  );
}
