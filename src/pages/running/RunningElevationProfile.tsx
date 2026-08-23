import React from "react";
import { analyzeRunningTerrain } from "../../activity/runningElevation";
import type { GeoPoint } from "../../activity/activityTypes";

type Props = { points: GeoPoint[]; accent: string; textSoft?: string; height?: number };

export default function RunningElevationProfile({ points, accent, textSoft = "#a8a8b3", height = 150 }: Props) {
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
  return <svg viewBox="0 0 320 140" style={{ width: "100%", height, display: "block", borderRadius: 13, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
    <defs><linearGradient id="runElevFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".42"/><stop offset="1" stopColor={accent} stopOpacity=".02"/></linearGradient></defs>
    {[.25,.5,.75].map((ratio) => <line key={ratio} x1="12" x2="308" y1={28 + ratio * 76} y2={28 + ratio * 76} stroke="rgba(255,255,255,.055)" strokeWidth="1"/>)}
    {analysis.hills.map((hill) => <rect key={hill.id} x={x(hill.startDistanceM)} y="12" width={Math.max(2, x(hill.endDistanceM) - x(hill.startDistanceM))} height="110" fill="#ff985f" opacity=".08" rx="3"/>)}
    <path d={area} fill="url(#runElevFill)"/><path d={line} fill="none" stroke={accent} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>
    <text x="14" y="16" fontSize="7" fill={textSoft}>{Math.round(maxAlt)} m</text><text x="14" y="132" fontSize="7" fill={textSoft}>{Math.round(minAlt)} m</text>
    <text x="306" y="132" textAnchor="end" fontSize="7" fill={textSoft}>{(maxDistance / 1000).toFixed(1)} km</text>
  </svg>;
}
