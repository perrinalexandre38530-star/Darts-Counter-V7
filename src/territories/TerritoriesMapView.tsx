// ============================================
// TERRITORIES — MAP VIEW (REACT) — FIT + ZOOM/PAN (SAFE)
// Location: src/territories/TerritoriesMapView.tsx
//
// ✅ Fix: themeColor was referenced without being in scope (crash)
// ✅ Keeps your working SVG render/injection logic
// ✅ Adds minimal zoom/pan wrapper (wheel + drag) without breaking clicks
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

const PRESERVE_ASPECT = "xMidYMid meet"; // keep whole map visible

function prepareSvgRoot(svg: SVGSVGElement, viewBox: string) {
  // Ensure viewBox (critical for scaling)
  if (!svg.getAttribute("viewBox") && viewBox) svg.setAttribute("viewBox", viewBox);

  // Remove hard sizing that breaks responsive layouts
  svg.removeAttribute("width");
  svg.removeAttribute("height");

  // Force responsive sizing
  svg.setAttribute("preserveAspectRatio", PRESERVE_ASPECT);
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
  // ✅ IMPORTANT: include themeColor in destructuring (fix crash)
  const { svgRaw, country, map, fillByTerritoryId, selectedTerritoryId, activeColor, themeColor } = params;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;

  prepareSvgRoot(svg, map.svgViewBox);

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    /* Responsive safety */
    svg { width: 100%; height: 100%; display: block; }

    /* Default neutral */
    path { cursor: pointer; }

    /* France departments often have class 'departement' */
    .departement, .departement * { stroke: rgba(255,255,255,0.85); stroke-width: 0.9; vector-effect: non-scaling-stroke; }
    /* Fallback */
    path { stroke: rgba(255,255,255,0.65); stroke-width: 0.7; vector-effect: non-scaling-stroke; }

    /* Selected glow */
    .territory-selected {
      filter: drop-shadow(0 0 6px ${activeColor}) drop-shadow(0 0 14px ${activeColor});
      animation: territoryPulse 1.2s ease-in-out infinite;
    }
    @keyframes territoryPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }

    /* Optional: theme stroke hint for non-FR packs */
    .territory-theme-stroke { stroke: ${themeColor}; }
  `;
  svg.insertBefore(styleEl, svg.firstChild);

  if (country === "FR") {
    const paths = Array.from(svg.querySelectorAll("path[data-numerodepartement]")) as SVGPathElement[];
    for (const p of paths) {
      const dep = p.getAttribute("data-numerodepartement");
      if (!dep) continue;
      const tid = `FR-${dep}`;
      const fill = fillByTerritoryId[tid];
      p.setAttribute("fill", fill ? fill : "rgba(120,120,120,0.25)");

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

function injectOverlayStyles(overlayRaw: string, themeColor: string, viewBox: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(overlayRaw, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;

  prepareSvgRoot(svg, viewBox);

  // IMPORTANT: scope styles to overlay only, so it never "bleeds" to base map
  svg.classList.add("territories-overlay");

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    .territories-overlay path { fill: none !important; stroke: ${themeColor}; stroke-width: 2.0; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; opacity: 0.85; }
    .territories-overlay * { pointer-events: none; }
  `;
  svg.insertBefore(styleEl, svg.firstChild);

  return svg.outerHTML;
}

// ---------- Zoom/Pan helpers ----------
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
    return injectOverlayStyles(overlayRaw, themeColor, map.svgViewBox);
  }, [overlayRaw, themeColor, map.svgViewBox]);

  const onClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
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

  // -------- Zoom/Pan state (minimal) --------
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const lastPoint = React.useRef<{ x: number; y: number } | null>(null);

  const resetView = React.useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const onWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.1 : 0.9), SCALE_MIN, SCALE_MAX);
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
    },
    [scale]
  );

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scale <= 1) return;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    },
    [scale]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scale <= 1) return;
      if (!lastPoint.current) return;

      const dx = e.clientX - lastPoint.current.x;
      const dy = e.clientY - lastPoint.current.y;
      setTx((v) => v + dx);
      setTy((v) => v + dy);
      lastPoint.current = { x: e.clientX, y: e.clientY };
    },
    [scale]
  );

  const onPointerUp = React.useCallback(() => {
    lastPoint.current = null;
  }, []);

  const showReset = scale !== 1 || tx !== 0 || ty !== 0;

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
      {/* ZOOM WRAPPER */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform",
          display: "grid",
          placeItems: "center",
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
