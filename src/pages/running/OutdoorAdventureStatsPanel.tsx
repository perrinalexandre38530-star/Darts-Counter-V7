import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import { analyzeRunningTerrain, bestHillEfforts } from "../../activity/runningElevation";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { RunningMetricCard, RunningSurface } from "./RunningUi";

function hours(ms: number) { return ms > 0 ? ms / 3_600_000 : 0; }

export default function OutdoorAdventureStatsPanel({ activities, sport, lang, accent, textSoft }: { activities: ActivityRecord[]; sport: OutdoorPerformanceSport; lang: string; accent: string; textSoft: string }) {
  if (!["trail", "hiking", "walking", "nordic-walking"].includes(sport)) return null;
  const copy = lang.startsWith("fr") ? {
    title: "ENDURANCE OUTDOOR", long: "SORTIES > 2 H", vertical: "D+ / HEURE", hardest: "PLUS DIFFICILE", maxGain: "PLUS GROS D+", longest: "PLUS LONGUE", totalTime: "TEMPS CUMULÉ", hill: "MEILLEURE MONTÉE", noData: "Les statistiques spécifiques Trail/Randonnée apparaîtront après quelques sorties avec relief.",
  } : lang.startsWith("es") ? {
    title: "RESISTENCIA OUTDOOR", long: "SALIDAS > 2 H", vertical: "D+ / HORA", hardest: "MÁS DIFÍCIL", maxGain: "MAYOR D+", longest: "MÁS LARGA", totalTime: "TIEMPO TOTAL", hill: "MEJOR SUBIDA", noData: "Las estadísticas Trail/Senderismo aparecerán tras algunas salidas con desnivel.",
  } : {
    title: "OUTDOOR ENDURANCE", long: "OUTINGS > 2 H", vertical: "GAIN / HOUR", hardest: "HARDEST", maxGain: "BIGGEST GAIN", longest: "LONGEST", totalTime: "TOTAL TIME", hill: "BEST CLIMB", noData: "Trail/Hiking specific stats will appear after a few outings with elevation.",
  };

  const totalElapsedMs = activities.reduce((sum, activity) => sum + Math.max(0, Number(activity.elapsedMs || 0)), 0);
  const totalGainM = activities.reduce((sum, activity) => sum + Math.max(0, Number(activity.elevationGainM || 0)), 0);
  const longCount = activities.filter((activity) => Number(activity.elapsedMs || 0) >= 2 * 3_600_000).length;
  const longest = activities.slice().sort((a, b) => Number(b.distanceM || 0) - Number(a.distanceM || 0))[0] || null;
  const biggestGain = activities.slice().sort((a, b) => Number(b.elevationGainM || 0) - Number(a.elevationGainM || 0))[0] || null;
  const terrainRows = activities.map((activity) => ({ activity, terrain: analyzeRunningTerrain(activity.route || []) })).filter((row) => row.terrain.hasElevation);
  const hardest = terrainRows.slice().sort((a, b) => b.terrain.difficultyScore - a.terrain.difficultyScore)[0] || null;
  const hills = bestHillEfforts(activities);
  const verticalPerHour = totalElapsedMs > 0 ? totalGainM / hours(totalElapsedMs) : 0;

  return <RunningSurface accent={accent} style={{ marginTop: 10 }}>
    <div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .75 }}>{copy.title}</div>
    {activities.length ? <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
        <RunningMetricCard label={copy.long} value={String(longCount)} accent={accent} icon="🧭" />
        <RunningMetricCard label={copy.vertical} value={`${Math.round(verticalPerHour)} m/h`} accent={accent} icon="▲" />
        <RunningMetricCard label={copy.longest} value={longest ? formatDistance(longest.distanceM) : "—"} accent={accent} icon="↗" />
        <RunningMetricCard label={copy.totalTime} value={formatDuration(totalElapsedMs)} accent={accent} icon="◷" />
        <RunningMetricCard label={copy.maxGain} value={biggestGain ? `+${Math.round(biggestGain.elevationGainM)} m` : "—"} accent={accent} icon="⛰️" />
        <RunningMetricCard label={copy.hardest} value={hardest ? `${hardest.terrain.difficultyScore}/100` : "—"} accent={accent} icon="◆" sub={hardest?.activity?.title || undefined} />
      </div>
      {hills.fastestVertical ? <div style={{ marginTop: 8, padding: "9px 10px", borderRadius: 12, border: `1px solid ${accent}24`, background: `${accent}08`, fontSize: 8.2, color: textSoft }}><b style={{ color: accent }}>{copy.hill}</b> · +{Math.round(hills.fastestVertical.gainM)} m · {Math.round(Number(hills.fastestVertical.verticalSpeedMph || 0))} m/h · {(hills.fastestVertical.avgGradePct || 0).toFixed(1)}%</div> : null}
    </> : <div style={{ marginTop: 8, color: textSoft, fontSize: 8.2, lineHeight: 1.45 }}>{copy.noData}</div>}
  </RunningSurface>;
}
