import React from "react";
import Section from "../../components/Section";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import { buildRunningAchievements } from "../../activity/runningAchievements";
import { compareRunningActivities } from "../../activity/runningComparison";
import { createSegmentFromActivity, loadRunningSegments, removeRunningSegment, segmentImprovementMs, segmentLeaderboard, upsertRunningSegment, type RunningSegment } from "../../activity/runningSegments";
import RunningSegmentMap from "./RunningSegmentMap";
import type { ActivityRecord } from "../../activity/activityTypes";

type Props = { activities: ActivityRecord[]; lang: string; accent: string; textSoft: string };

export default function RunningPerformanceInsightsPanel({ activities, lang, accent, textSoft }: Props) {
  const [segments, setSegments] = React.useState<RunningSegment[]>(() => loadRunningSegments());
  const usable = activities.filter((row) => row.route?.length >= 2 && row.distanceM >= 500);
  const [sourceId, setSourceId] = React.useState(usable[0]?.id || "");
  const [segmentName, setSegmentName] = React.useState("");
  const [startKm, setStartKm] = React.useState(0);
  const [lengthM, setLengthM] = React.useState(1000);
  const [compareA, setCompareA] = React.useState(activities[0]?.id || "");
  const [compareB, setCompareB] = React.useState(activities[1]?.id || "");

  React.useEffect(() => { if (!compareA && activities[0]) setCompareA(activities[0].id); if (!compareB && activities[1]) setCompareB(activities[1].id); }, [activities, compareA, compareB]);
  const source = usable.find((row) => row.id === sourceId) || usable[0] || null;
  const a = activities.find((row) => row.id === compareA) || null;
  const b = activities.find((row) => row.id === compareB) || null;
  const comparison = a && b && a.id !== b.id ? compareRunningActivities(a, b) : null;
  const achievements = React.useMemo(() => buildRunningAchievements(activities, lang), [activities, lang]);

  const copy = lang === "fr" ? {
    segments: "SEGMENTS PERSONNELS", segSub: "Découpe un passage d’une sortie GPS et classe automatiquement tes meilleurs temps sur ce même tracé.", source: "SORTIE SOURCE", start: "DÉPART KM", length: "LONGUEUR", create: "CRÉER LE SEGMENT", noSegments: "Aucun segment personnel.", passages: "PASSAGES", best: "RECORD", improved: "GAIN", remove: "SUPPRIMER", compare: "COMPARER DEUX SORTIES", compareSub: "Compare chrono, allure, distance, D+ et évolution des splits kilométriques.", runA: "SORTIE A", runB: "SORTIE B", distance: "DISTANCE", time: "TEMPS", pace: "ALLURE", climb: "D+", splits: "COURBE DES SPLITS", trophies: "TROPHÉES RUNNING", trophiesSub: "Les trophées se débloquent automatiquement à partir de ton historique réel.", unlocked: "DÉBLOQUÉ", locked: "EN COURS",
  } : lang === "es" ? {
    segments: "SEGMENTOS PERSONALES", segSub: "Recorta un tramo de una salida GPS y clasifica automáticamente tus mejores tiempos en ese mismo recorrido.", source: "SALIDA ORIGEN", start: "INICIO KM", length: "LONGITUD", create: "CREAR SEGMENTO", noSegments: "No hay segmentos personales.", passages: "PASADAS", best: "RÉCORD", improved: "MEJORA", remove: "ELIMINAR", compare: "COMPARAR DOS CARRERAS", compareSub: "Compara tiempo, ritmo, distancia, desnivel y evolución de splits.", runA: "CARRERA A", runB: "CARRERA B", distance: "DISTANCIA", time: "TIEMPO", pace: "RITMO", climb: "D+", splits: "CURVA DE SPLITS", trophies: "TROFEOS RUNNING", trophiesSub: "Los trofeos se desbloquean automáticamente con tu historial real.", unlocked: "DESBLOQUEADO", locked: "EN PROGRESO",
  } : {
    segments: "PERSONAL SEGMENTS", segSub: "Cut a section from a GPS run and automatically rank your best times over the same route.", source: "SOURCE RUN", start: "START KM", length: "LENGTH", create: "CREATE SEGMENT", noSegments: "No personal segments yet.", passages: "EFFORTS", best: "RECORD", improved: "GAIN", remove: "DELETE", compare: "COMPARE TWO RUNS", compareSub: "Compare time, pace, distance, elevation and split evolution.", runA: "RUN A", runB: "RUN B", distance: "DISTANCE", time: "TIME", pace: "PACE", climb: "ELEVATION", splits: "SPLIT CURVE", trophies: "RUNNING TROPHIES", trophiesSub: "Trophies unlock automatically from your actual activity history.", unlocked: "UNLOCKED", locked: "IN PROGRESS",
  };

  const createSegment = () => {
    if (!source) return;
    const segment = createSegmentFromActivity(source, segmentName || `${(lengthM / 1000).toFixed(lengthM < 1000 ? 1 : 0)} KM`, startKm * 1000, lengthM);
    if (!segment) return;
    setSegments(upsertRunningSegment(segment)); setSegmentName("");
  };

  return <>
    <div style={{ marginTop: 12 }}><Section title={copy.segments}>
      <div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.45 }}>{copy.segSub}</div>
      {source ? <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
        <select value={source?.id || ""} onChange={(e) => setSourceId(e.target.value)} style={selectStyle}>{usable.map((row) => <option key={row.id} value={row.id}>{new Date(row.startedAt).toLocaleDateString()} · {formatDistance(row.distanceM)}</option>)}</select>
        <input value={segmentName} onChange={(e) => setSegmentName(e.target.value.slice(0, 64))} placeholder={lang === "fr" ? "Nom du segment…" : lang === "es" ? "Nombre del segmento…" : "Segment name…"} style={inputStyle}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}><Adjust label={copy.start} value={startKm} step={0.5} min={0} max={Math.max(0, Math.floor(source.distanceM / 500) / 2 - .5)} onChange={setStartKm}/><div><div style={labelStyle(accent)}>{copy.length}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>{[500, 1000, 2000, 5000].map((m) => <button key={m} className="btn" onClick={() => setLengthM(m)} style={{ minHeight: 37, padding: 2, fontSize: 7.8, color: lengthM === m ? accent : undefined, borderColor: lengthM === m ? `${accent}77` : undefined }}>{m < 1000 ? ".5K" : `${m / 1000}K`}</button>)}</div></div></div>
        <button className="btn primary" onClick={createSegment} style={{ minHeight: 42, background: accent, fontWeight: 1000 }}>{copy.create}</button>
      </div> : <div style={{ padding: 10, color: textSoft, fontSize: 9 }}>{copy.noSegments}</div>}
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{segments.length ? segments.map((seg) => { const board = segmentLeaderboard(seg, activities); const improvement = segmentImprovementMs(seg, activities); const sourceActivity = activities.find((row) => row.id === seg.sourceActivityId) || null; return <div key={seg.id} className="card" style={{ padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{seg.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{formatDistance(seg.endDistanceM - seg.startDistanceM)} · {copy.passages}: {board.length}</div></div><button className="btn" onClick={() => setSegments(removeRunningSegment(seg.id))} style={{ minHeight: 30, fontSize: 8, color: "#ff7c88" }}>{copy.remove}</button></div>{sourceActivity ? <div style={{ marginTop: 8 }}><RunningSegmentMap segment={seg} source={sourceActivity} accent={accent}/></div> : null}{board.length ? <><div style={{ display: "grid", gridTemplateColumns: improvement ? "1fr 1fr" : "1fr", gap: 6, marginTop: 8 }}><Delta label={copy.best} value={formatDuration(board[0].elapsedMs)} good accent={accent}/>{improvement ? <Delta label={copy.improved} value={`−${formatDuration(improvement)}`} good accent={accent}/> : null}</div><div style={{ marginTop: 8, display: "grid", gap: 4 }}>{board.slice(0, 5).map((effort, index) => <div key={`${effort.activityId}-${effort.startedAt}`} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 6, fontSize: 8.7, color: index === 0 ? accent : textSoft }}><b>#{index + 1}</b><span>{new Date(effort.startedAt).toLocaleDateString()}</span><b>{formatDuration(effort.elapsedMs)}</b></div>)}</div></> : null}</div>; }) : null}</div>
    </Section></div>

    <div style={{ marginTop: 12 }}><Section title={copy.compare}>
      <div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.45 }}>{copy.compareSub}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}><FieldSelect label={copy.runA} value={compareA} activities={activities} onChange={setCompareA}/><FieldSelect label={copy.runB} value={compareB} activities={activities} onChange={setCompareB}/></div>
      {comparison && a && b ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}><Delta label={copy.distance} value={signedDistance(comparison.distanceDeltaM)} good={comparison.distanceDeltaM >= 0} accent={accent}/><Delta label={copy.time} value={signedTime(comparison.elapsedDeltaMs)} good={comparison.elapsedDeltaMs <= 0} accent={accent}/><Delta label={copy.pace} value={comparison.paceDeltaSecPerKm == null ? "—" : `${comparison.paceDeltaSecPerKm > 0 ? "+" : "−"}${formatPace(Math.abs(comparison.paceDeltaSecPerKm))}/km`} good={(comparison.paceDeltaSecPerKm || 0) <= 0} accent={accent}/><Delta label={copy.climb} value={`${comparison.elevationDeltaM >= 0 ? "+" : "−"}${Math.abs(Math.round(comparison.elevationDeltaM))} m`} good={true} accent={accent}/></div><div style={{ marginTop: 9 }}><div style={labelStyle(accent)}>{copy.splits}</div><SplitChart rows={comparison.splitRows} accent={accent} textSoft={textSoft}/></div></> : null}
    </Section></div>

    <div style={{ marginTop: 12 }}><Section title={copy.trophies}>
      <div style={{ color: textSoft, fontSize: 9.2, lineHeight: 1.45, marginBottom: 9 }}>{copy.trophiesSub}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>{achievements.map((item) => <div key={item.id} className="card" style={{ padding: 10, opacity: item.unlocked ? 1 : .7, borderColor: item.unlocked ? `${accent}55` : undefined }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={{ fontSize: 24, filter: item.unlocked ? "none" : "grayscale(1)" }}>{item.icon}</div><div><div style={{ fontSize: 9.5, fontWeight: 1000, color: item.unlocked ? accent : undefined }}>{item.title}</div><div style={{ marginTop: 2, fontSize: 7.8, color: textSoft }}>{item.description}</div></div></div><div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", marginTop: 8 }}><div style={{ width: `${item.progressPct}%`, height: "100%", background: item.unlocked ? accent : `${accent}88`, borderRadius: 999 }}/></div><div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: textSoft }}><span>{item.unlocked ? copy.unlocked : copy.locked}</span><span>{Math.min(item.current, item.target).toFixed(item.target <= 10 ? 0 : 1)}/{item.target}</span></div></div>)}</div>
    </Section></div>
  </>;
}

function FieldSelect({ label, value, activities, onChange }: { label: string; value: string; activities: ActivityRecord[]; onChange: (value: string) => void }) { return <div><div style={{ ...baseLabel }}>{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>{activities.map((row) => <option key={row.id} value={row.id}>{new Date(row.startedAt).toLocaleDateString()} · {(row.distanceM / 1000).toFixed(1)} km</option>)}</select></div>; }
function Adjust({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) { return <div><div style={baseLabel}>{label}</div><div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", gap: 4 }}><button className="btn" onClick={() => onChange(Math.max(min, value - step))}>−</button><div style={{ ...inputStyle, display: "grid", placeItems: "center", fontWeight: 1000 }}>{value.toFixed(value % 1 ? 1 : 0)}</div><button className="btn" onClick={() => onChange(Math.min(max, value + step))}>+</button></div></div>; }
function Delta({ label, value, good, accent }: { label: string; value: string; good: boolean; accent: string }) { return <div className="card" style={{ padding: 9, textAlign: "center" }}><div style={{ fontSize: 7.5, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, fontSize: 14, fontWeight: 1000, color: good ? accent : "#ff8a72" }}>{value}</div></div>; }
function SplitChart({ rows, accent, textSoft }: { rows: Array<{ km: number; aPace: number | null; bPace: number | null }>; accent: string; textSoft: string }) { const valid = rows.filter((r) => r.aPace != null || r.bPace != null).slice(0, 12); if (!valid.length) return <div style={{ color: textSoft, fontSize: 8.5 }}>—</div>; const vals = valid.flatMap((r) => [r.aPace, r.bPace]).filter((v): v is number => v != null); const min = Math.min(...vals); const max = Math.max(...vals); const y = (v: number) => 82 - ((v - min) / Math.max(1, max - min)) * 66; const x = (i: number) => 10 + i * (280 / Math.max(1, valid.length - 1)); const path = (key: "aPace" | "bPace") => { const pts = valid.map((r, i) => r[key] == null ? null : { x: x(i), y: y(r[key] as number) }).filter((p): p is { x: number; y: number } => !!p); return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "); }; return <svg viewBox="0 0 300 100" style={{ width: "100%", height: 130, borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}><path d={path("aPace")} fill="none" stroke={accent} strokeWidth="3"/><path d={path("bPace")} fill="none" stroke="#8fa8ff" strokeWidth="3" strokeDasharray="5 4"/>{valid.map((r, i) => <text key={r.km} x={x(i)} y="96" textAnchor="middle" fontSize="7" fill={textSoft}>{r.km}</text>)}</svg>; }
function signedDistance(m: number) { return `${m >= 0 ? "+" : "−"}${formatDistance(Math.abs(m))}`; }
function signedTime(ms: number) { return `${ms >= 0 ? "+" : "−"}${formatDuration(Math.abs(ms))}`; }
const baseLabel: React.CSSProperties = { fontSize: 8, fontWeight: 1000, opacity: .65, marginBottom: 4 };
const labelStyle = (accent: string): React.CSSProperties => ({ ...baseLabel, color: accent, opacity: 1 });
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.2)", color: "#fff", padding: "7px 8px", boxSizing: "border-box", fontSize: 9.5, outline: "none" };
const selectStyle: React.CSSProperties = { ...inputStyle, colorScheme: "dark" };
