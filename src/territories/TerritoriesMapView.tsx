// ============================================
// TERRITORIES — MAP VIEW (REACT) — FIT / RESPONSIVE PATCH
// Location: src/territories/TerritoriesMapView.tsx
//
// Fixes:
// - Force SVG to fit its container (mobile-friendly)
// - Ensures viewBox exists, sets preserveAspectRatio
// - Removes fixed width/height attributes if present
// - Adds centered layout + safe overflow handling
//
// Notes:
// - "meet" keeps entire map visible (no crop).
// - If you later prefer "slice" (full-bleed crop), change PRESERVE_ASPECT.
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
  const { svgRaw, country, map, fillByTerritoryId, selectedTerritoryId, activeColor } = params;

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

  const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    path { fill: none !important; stroke: ${themeColor}; stroke-width: 2.2; vector-effect: non-scaling-stroke; opacity: 0.9; }
    * { pointer-events: none; }
  `;
  svg.insertBefore(styleEl, svg.firstChild);

  return svg.outerHTML;
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

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        ...style,
      }}
      onClick={onClick}
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
  );
}
