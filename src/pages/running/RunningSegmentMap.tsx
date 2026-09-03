import React from "react";
import { runningMercatorPixel as mercatorPixel } from "../../activity/runningShared";
import { segmentRoutePoints, type RunningSegment } from "../../activity/runningSegments";
import type { ActivityRecord, GeoPoint } from "../../activity/activityTypes";
import { loadRunningMapTheme, runningMapRasterFilter, runningMapRasterTileUrl, type RunningMapTheme } from "./runningMapTheme";

type Props = { segment: RunningSegment; source: ActivityRecord; accent: string };

type ScreenPoint = { x: number; y: number };

export default function RunningSegmentMap({ segment, source, accent }: Props) {
  const segmentPoints = React.useMemo(() => segmentRoutePoints(segment, source), [segment, source]);
  const theme = React.useMemo<RunningMapTheme>(() => loadRunningMapTheme(), []);
  const layout = React.useMemo(() => buildLayout(source.route || [], segmentPoints, theme), [source.route, segmentPoints, theme]);
  if (!layout) return null;
  return <div style={{ width: "100%", aspectRatio: "16/8", minHeight: 120, maxHeight: 190, position: "relative", overflow: "hidden", borderRadius: 12, background: "#101821", border: "1px solid rgba(255,255,255,.07)" }}>
    {layout.tiles.map((tile) => <img key={`${tile.z}-${tile.x}-${tile.y}`} src={tile.url} alt="" draggable={false} style={{ position: "absolute", left: `${tile.left / layout.width * 100}%`, top: `${tile.top / layout.height * 100}%`, width: `${256 / layout.width * 100}%`, height: `${256 / layout.height * 100}%`, objectFit: "cover", filter: runningMapRasterFilter(theme), userSelect: "none" }}/>) }
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <polyline points={layout.routeLine} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={layout.segmentLine} fill="none" stroke="rgba(0,0,0,.85)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={layout.segmentLine} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      {layout.segmentStart ? <circle cx={layout.segmentStart.x} cy={layout.segmentStart.y} r="8" fill="#71ff9a" stroke="#fff" strokeWidth="2"/> : null}
      {layout.segmentEnd ? <circle cx={layout.segmentEnd.x} cy={layout.segmentEnd.y} r="8" fill="#ff6577" stroke="#fff" strokeWidth="2"/> : null}
    </svg>
    <div style={{ position: "absolute", left: 5, top: 5, borderRadius: 999, background: "rgba(0,0,0,.7)", border: `1px solid ${accent}55`, color: accent, padding: "3px 6px", fontSize: 7, fontWeight: 1000 }}>SEGMENT</div>
  </div>;
}

function buildLayout(route: GeoPoint[], segment: GeoPoint[], theme: RunningMapTheme) {
  if (route.length < 2 || segment.length < 2) return null;
  const width = 1000, height = 500;
  const lats = route.map((point) => point.lat), lons = route.map((point) => point.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 18;
  for (let z = 18; z >= 3; z -= 1) {
    const px = route.map((point) => mercatorPixel(point.lat, point.lon, z));
    const xs = px.map((point) => point.x), ys = px.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .8 && Math.max(...ys) - Math.min(...ys) <= height * .75) { zoom = z; break; }
  }
  const center = mercatorPixel(centerLat, centerLon, zoom);
  const screen = (points: GeoPoint[]): ScreenPoint[] => points.map((point) => { const world = mercatorPixel(point.lat, point.lon, zoom); return { x: world.x - center.x + width / 2, y: world.y - center.y + height / 2 }; });
  const routeScreen = screen(route), segmentScreen = screen(segment);
  const minX = Math.floor((center.x - width / 2) / 256) - 1, maxX = Math.floor((center.x + width / 2) / 256) + 1;
  const minY = Math.floor((center.y - height / 2) / 256) - 1, maxY = Math.floor((center.y + height / 2) / 256) + 1;
  const count = 2 ** zoom;
  const tiles: Array<{ z: number; x: number; y: number; left: number; top: number; url: string }> = [];
  for (let tx = minX; tx <= maxX; tx += 1) for (let ty = minY; ty <= maxY; ty += 1) {
    if (ty < 0 || ty >= count) continue;
    const wx = ((tx % count) + count) % count;
    tiles.push({ z: zoom, x: tx, y: ty, left: tx * 256 - center.x + width / 2, top: ty * 256 - center.y + height / 2, url: runningMapRasterTileUrl(theme, zoom, wx, ty) });
  }
  return {
    width, height, tiles,
    routeLine: routeScreen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    segmentLine: segmentScreen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    segmentStart: segmentScreen[0] || null,
    segmentEnd: segmentScreen[segmentScreen.length - 1] || null,
  };
}

