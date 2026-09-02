import React from "react";
import { pickRunningText as pickText } from "../../activity/runningShared";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import { buildRunningActivityAnalytics, performanceBandLabel, RUNNING_PERFORMANCE_COLORS } from "../../activity/runningActivityAnalytics";
import { canonicalOutdoorPerformanceSport, outdoorUsesSpeedMetric } from "../../activity/outdoorPerformance";
import { RunningSurface } from "./RunningUi";

function fmt(value: number | null, digits = 1) { return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits); }

type Props = { activity: ActivityRecord; lang: string; accent: string; textSoft: string; activePointIndex?: number | null; onSegmentSelect?: (pointIndex: number) => void };

export default function RunningActivityPerformancePanel({ activity, lang, accent, textSoft, activePointIndex = null, onSegmentSelect }: Props) {
  const analytics = React.useMemo(() => buildRunningActivityAnalytics(activity), [activity]);
  const sport = canonicalOutdoorPerformanceSport(activity.sport);
  const speedSport = outdoorUsesSpeedMetric(sport);
  const segments = analytics.segments;
  const maxSpeed = analytics.maxSpeedKmh;
  const minSpeed = analytics.minMovingSpeedKmh;

  return <div style={{ display: "grid", gap: 10 }}>
    <RunningSurface accent={accent} active padding={12}>
      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: .8 }}>{pickText(lang,"STATISTIQUES AVANCÉES","ADVANCED STATS","ESTADÍSTICAS AVANZADAS")}</div>
      <div style={{ marginTop: 4, color: textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{pickText(lang,"Vitesses fiables, régularité, temps réellement en mouvement et qualité GPS calculés sur les points validés.","Reliable speed, consistency, true moving time and GPS quality from validated points.","Velocidad fiable, regularidad, tiempo real en movimiento y calidad GPS sobre puntos validados.")}</div>
      <div className="running-metrics-4" style={{ marginTop: 10 }}>
        <Kpi label={pickText(lang,"VITESSE MAX","MAX SPEED","VELOCIDAD MAX")} value={maxSpeed == null ? "—" : `${maxSpeed.toFixed(1)} km/h`} accent={accent}/>
        <Kpi label={pickText(lang,"VITESSE MIN MOUV.","MIN MOVING SPEED","VELOCIDAD MIN MOV.")} value={minSpeed == null ? "—" : `${minSpeed.toFixed(1)} km/h`} accent={accent}/>
        <Kpi label={pickText(lang,"VITESSE MÉDIANE","MEDIAN SPEED","VELOCIDAD MEDIANA")} value={analytics.medianSpeedKmh == null ? "—" : `${analytics.medianSpeedKmh.toFixed(1)} km/h`} accent={accent}/>
        <Kpi label={pickText(lang,"TEMPS EN MOUV.","MOVING RATIO","TIEMPO EN MOV.")} value={`${Math.round(analytics.movingRatioPct)}%`} accent={accent}/>
        <Kpi label={pickText(lang,"TEMPS ARRÊTÉ","STOPPED TIME","TIEMPO PARADO")} value={formatDuration(analytics.stoppedMs)} accent={accent}/>
        <Kpi label={pickText(lang,"VARIATION VITESSE","SPEED VARIATION","VARIACIÓN VELOC.")} value={analytics.speedVariabilityPct == null ? "—" : `${analytics.speedVariabilityPct.toFixed(0)}%`} accent={accent}/>
        <Kpi label={pickText(lang,"PRÉCISION GPS MOY.","AVG GPS ACCURACY","PRECISIÓN GPS MED.")} value={analytics.avgAccuracyM == null ? "—" : `±${analytics.avgAccuracyM.toFixed(1)} m`} accent={accent}/>
        <Kpi label={pickText(lang,"MEILLEUR FIX GPS","BEST GPS FIX","MEJOR FIJACIÓN GPS")} value={analytics.bestAccuracyM == null ? "—" : `±${analytics.bestAccuracyM.toFixed(1)} m`} accent={accent}/>
        <Kpi label={pickText(lang,"AMPLITUDE ALT.","ELEVATION RANGE","RANGO ALTITUD")} value={analytics.altitudeRangeM == null ? "—" : `${Math.round(analytics.altitudeRangeM)} m`} accent={accent}/>
        <Kpi label={pickText(lang,"PENTE + MAX","MAX UPHILL","PENDIENTE + MAX")} value={analytics.maxUphillGradePct == null ? "—" : `+${analytics.maxUphillGradePct.toFixed(1)}%`} accent={accent}/>
        <Kpi label={pickText(lang,"PENTE − MAX","MAX DOWNHILL","PENDIENTE − MAX")} value={analytics.maxDownhillGradePct == null ? "—" : `${analytics.maxDownhillGradePct.toFixed(1)}%`} accent={accent}/>
        <Kpi label={pickText(lang,"VITESSE ASCENSION","VERTICAL SPEED","VELOCIDAD ASCENSO")} value={analytics.verticalSpeedMph == null ? "—" : `${Math.round(analytics.verticalSpeedMph)} m/h`} accent={accent}/>
      </div>
    </RunningSurface>

    {segments.length ? <RunningSurface accent={accent} active padding={12}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "end", flexWrap: "wrap" }}><div><div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: .8 }}>{pickText(lang,"PERFORMANCE PAR TRONÇONS","SEGMENT PERFORMANCE","RENDIMIENTO POR TRAMOS")}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{pickText(lang,`Tronçons d'environ ${analytics.segmentLengthM} m · vert = le plus performant · rouge = le moins rapide.`,`About ${analytics.segmentLengthM} m per segment · green = strongest · red = slowest.`,`Tramos de unos ${analytics.segmentLengthM} m · verde = más fuerte · rojo = más lento.`)}</div></div><div style={{ fontSize: 7.5, color: textSoft }}>{segments.length} {pickText(lang,"tronçons","segments","tramos")}</div></div>
      <SegmentSpeedChart activity={activity} accent={accent} textSoft={textSoft}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 4, marginTop: 8 }}>{(["excellent","strong","steady","easy","slow"] as const).map((band) => <div key={band} style={{ minWidth: 0, padding: "6px 3px", borderRadius: 9, textAlign: "center", background: `${RUNNING_PERFORMANCE_COLORS[band]}12`, border: `1px solid ${RUNNING_PERFORMANCE_COLORS[band]}35` }}><div style={{ width: 8, height: 8, borderRadius: 999, margin: "0 auto 4px", background: RUNNING_PERFORMANCE_COLORS[band] }}/><div style={{ fontSize: 6.2, fontWeight: 1000, color: RUNNING_PERFORMANCE_COLORS[band], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{performanceBandLabel(band, lang)}</div><div style={{ marginTop: 2, fontSize: 7, color: textSoft }}>{formatDistance(analytics.zoneDistanceM[band])}</div></div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
        <SegmentHighlight label={pickText(lang,"TRONÇON LE + FORT","FASTEST SEGMENT","TRAMO MÁS FUERTE")} segment={analytics.fastestSegment} speedSport={speedSport} accent="#38f58a" lang={lang}/>
        <SegmentHighlight label={pickText(lang,"TRONÇON LE + CALME","SLOWEST SEGMENT","TRAMO MÁS LENTO")} segment={analytics.slowestSegment} speedSport={speedSport} accent="#ff7a68" lang={lang}/>
      </div>
      <div style={{ display: "grid", gap: 5, marginTop: 9 }}>{segments.map((segment) => { const active = activePointIndex != null && activePointIndex >= segment.startIndex && activePointIndex <= segment.endIndex; return <button type="button" onClick={() => onSegmentSelect?.(Math.round((segment.startIndex + segment.endIndex) / 2))} key={segment.index} style={{ width: "100%", display: "grid", gridTemplateColumns: "8px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 11, background: active ? `${segment.color}12` : "rgba(255,255,255,.025)", border: `1px solid ${active ? `${segment.color}60` : "rgba(255,255,255,.055)"}`, color: "#fff", textAlign: "left", cursor: onSegmentSelect ? "pointer" : "default" }}><div style={{ width: 8, alignSelf: "stretch", minHeight: 34, borderRadius: 999, background: segment.color }}/><div style={{ minWidth: 0 }}><div style={{ fontSize: 8.4, fontWeight: 1000 }}>{pickText(lang,"TRONÇON","SEGMENT","TRAMO")} {segment.index} · {(segment.startDistanceM/1000).toFixed(2)}–{(segment.endDistanceM/1000).toFixed(2)} km</div><div style={{ marginTop: 3, color: textSoft, fontSize: 7.5 }}>{formatDuration(segment.elapsedMs)} · D+ {Math.round(segment.gainM)} m · {segment.avgGradePct >= 0 ? "+" : ""}{segment.avgGradePct.toFixed(1)}%</div></div><div style={{ textAlign: "right" }}><div style={{ color: segment.color, fontSize: 9.5, fontWeight: 1000 }}>{speedSport ? `${segment.speedKmh.toFixed(1)} km/h` : segment.paceSecPerKm ? `${formatPace(segment.paceSecPerKm)}/km` : "—"}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 6.5 }}>{performanceBandLabel(segment.band, lang)} · {segment.score}/100</div></div></button>; })}</div>
    </RunningSurface> : null}
  </div>;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ minWidth: 0, padding: "8px 5px", borderRadius: 11, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 6.7, opacity: .55, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 11.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }

function SegmentHighlight({ label, segment, speedSport, accent, lang }: { label: string; segment: ReturnType<typeof buildRunningActivityAnalytics>["fastestSegment"]; speedSport: boolean; accent: string; lang: string }) {
  return <div style={{ padding: 9, borderRadius: 12, background: `${accent}0c`, border: `1px solid ${accent}30` }}><div style={{ color: accent, fontSize: 7, fontWeight: 1000 }}>{label}</div>{segment ? <><div style={{ marginTop: 4, fontSize: 13, fontWeight: 1000 }}>{speedSport ? `${segment.speedKmh.toFixed(1)} km/h` : segment.paceSecPerKm ? `${formatPace(segment.paceSecPerKm)}/km` : "—"}</div><div style={{ marginTop: 2, fontSize: 7.2, opacity: .58 }}>{(segment.startDistanceM / 1000).toFixed(2)}–{(segment.endDistanceM / 1000).toFixed(2)} km · {formatDuration(segment.elapsedMs)}</div></> : <div style={{ marginTop: 4 }}>—</div>}</div>;
}

function SegmentSpeedChart({ activity, accent, textSoft }: { activity: ActivityRecord; accent: string; textSoft: string }) {
  const analytics = React.useMemo(() => buildRunningActivityAnalytics(activity), [activity]);
  const rows = analytics.segments;
  if (rows.length < 2) return null;
  const min = Math.min(...rows.map((row) => row.speedKmh)), max = Math.max(...rows.map((row) => row.speedKmh));
  const x = (index: number) => 12 + index / Math.max(1, rows.length - 1) * 296;
  const y = (speed: number) => 105 - (speed - min) / Math.max(.1, max - min) * 78;
  return <svg viewBox="0 0 320 126" style={{ width: "100%", height: 138, display: "block", marginTop: 10, borderRadius: 13, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
    {[.25,.5,.75].map((r) => <line key={r} x1="12" x2="308" y1={22 + r*76} y2={22 + r*76} stroke="rgba(255,255,255,.055)"/>)}
    {rows.slice(1).map((row, index) => <line key={row.index} x1={x(index)} y1={y(rows[index].speedKmh)} x2={x(index+1)} y2={y(row.speedKmh)} stroke={row.color} strokeWidth="4" strokeLinecap="round"/>)}
    {rows.map((row, index) => <circle key={`p${row.index}`} cx={x(index)} cy={y(row.speedKmh)} r="3.5" fill={row.color} stroke="#071015" strokeWidth="1.2"/>)}
    <text x="12" y="13" fontSize="7" fill={textSoft}>{max.toFixed(1)} km/h</text><text x="12" y="118" fontSize="7" fill={textSoft}>{min.toFixed(1)} km/h</text><text x="308" y="118" textAnchor="end" fontSize="7" fill={accent}>{(activity.distanceM/1000).toFixed(2)} km</text>
  </svg>;
}
