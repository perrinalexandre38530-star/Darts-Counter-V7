import React from "react";
import { analyzeRunningTerrain } from "../../activity/runningElevation";
import type { GeoPoint } from "../../activity/activityTypes";

type Props = {
  points: GeoPoint[];
  accent: string;
  textSoft?: string;
  height?: number;
  lang?: string;
  interactive?: boolean;
  activePointIndex?: number | null;
  onActivePointChange?: (index: number | null) => void;
};

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

export default function RunningElevationProfile({ points, accent, textSoft = "#a8a8b3", height = 150, lang = "fr", interactive = false, activePointIndex = null, onActivePointChange }: Props) {
  const analysis = React.useMemo(() => analyzeRunningTerrain(points), [points]);
  if (!analysis.hasElevation || analysis.samples.length < 2) return <div style={{ padding: 16, textAlign: "center", color: textSoft, fontSize: 9 }}>—</div>;
  const samples = analysis.samples;
  const minAlt = Math.min(...samples.map((row) => row.altitudeM));
  const maxAlt = Math.max(...samples.map((row) => row.altitudeM));
  const maxDistance = Math.max(1, samples[samples.length - 1].distanceM);
  const x = (distanceM: number) => 12 + (distanceM / maxDistance) * 296;
  const y = (altitudeM: number) => 112 - ((altitudeM - minAlt) / Math.max(1, maxAlt - minAlt)) * 88;
  const line = samples.map((row, index) => `${index ? "L" : "M"}${x(row.distanceM).toFixed(1)},${y(row.altitudeM).toFixed(1)}`).join(" ");
  const area = `${line} L308,122 L12,122 Z`;
  const activeSample = activePointIndex == null ? null : samples.reduce((best, row) => Math.abs(row.index - activePointIndex) < Math.abs(best.index - activePointIndex) ? row : best, samples[0]);

  const selectFromEvent = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onActivePointChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const local = Math.max(12, Math.min(308, ((event.clientX - rect.left) / rect.width) * 320));
    const distanceM = ((local - 12) / 296) * maxDistance;
    const nearest = samples.reduce((best, row) => Math.abs(row.distanceM - distanceM) < Math.abs(best.distanceM - distanceM) ? row : best, samples[0]);
    onActivePointChange(nearest.index);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };

  return <div style={{ position: "relative" }}>
    <svg
      viewBox="0 0 320 140"
      onPointerDown={selectFromEvent}
      onPointerMove={(event) => { if (interactive && (event.buttons === 1 || event.pointerType === "touch")) selectFromEvent(event); }}
      onPointerLeave={() => { if (interactive && onActivePointChange) onActivePointChange(null); }}
      style={{ width: "100%", height, display: "block", borderRadius: 13, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", cursor: interactive ? "crosshair" : undefined, touchAction: interactive ? "none" : undefined }}
    >
      <defs><linearGradient id="runElevFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".42"/><stop offset="1" stopColor={accent} stopOpacity=".02"/></linearGradient></defs>
      {[.25,.5,.75].map((ratio) => <line key={ratio} x1="12" x2="308" y1={28 + ratio * 76} y2={28 + ratio * 76} stroke="rgba(255,255,255,.055)" strokeWidth="1"/>)}
      {analysis.hills.map((hill) => <rect key={hill.id} x={x(hill.startDistanceM)} y="12" width={Math.max(2, x(hill.endDistanceM) - x(hill.startDistanceM))} height="110" fill="#ff985f" opacity=".08" rx="3"/>)}
      <path d={area} fill="url(#runElevFill)"/><path d={line} fill="none" stroke={accent} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>
      {activeSample ? <g pointerEvents="none"><line x1={x(activeSample.distanceM)} x2={x(activeSample.distanceM)} y1="10" y2="122" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3"/><circle cx={x(activeSample.distanceM)} cy={y(activeSample.altitudeM)} r="4.5" fill={accent} stroke="#fff" strokeWidth="1.5"/></g> : null}
      <text x="14" y="16" fontSize="7" fill={textSoft}>{Math.round(maxAlt)} m</text><text x="14" y="132" fontSize="7" fill={textSoft}>{Math.round(minAlt)} m</text>
      <text x="306" y="132" textAnchor="end" fontSize="7" fill={textSoft}>{(maxDistance / 1000).toFixed(1)} km</text>
    </svg>
    {interactive ? <div style={{ position: "absolute", left: 9, right: 9, top: 7, display: "flex", justifyContent: "center", pointerEvents: "none" }}>{activeSample ? <div style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(5,8,13,.86)", border: `1px solid ${accent}45`, color: "#fff", fontSize: 6.6, fontWeight: 900, backdropFilter: "blur(8px)" }}>{(activeSample.distanceM / 1000).toFixed(2)} km · {Math.round(activeSample.altitudeM)} m · {activeSample.gradePct >= 0 ? "+" : ""}{activeSample.gradePct.toFixed(1)}%</div> : <div style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(5,8,13,.72)", color: textSoft, fontSize: 6.3 }}>{pickText(lang,"Touchez le profil pour suivre le point sur la carte","Touch the profile to follow the point on the map","Toca el perfil para seguir el punto en el mapa")}</div>}</div> : null}
  </div>;
}
