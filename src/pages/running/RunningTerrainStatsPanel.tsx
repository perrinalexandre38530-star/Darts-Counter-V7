import React from "react";
import Section from "../../components/Section";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import { analyzeRunningTerrain, bestHillEfforts, elevationPaceRows, terrainLabel } from "../../activity/runningElevation";
import type { ActivityRecord } from "../../activity/activityTypes";
import RunningElevationProfile from "./RunningElevationProfile";

type Props = { activities: ActivityRecord[]; lang: string; accent: string; textSoft: string };

export default function RunningTerrainStatsPanel({ activities, lang, accent, textSoft }: Props) {
  const usable = React.useMemo(() => activities.filter((row) => row.route?.some((point) => Number.isFinite(point.altitude))), [activities]);
  const [selectedId, setSelectedId] = React.useState(usable[0]?.id || "");
  React.useEffect(() => { if (!usable.find((row) => row.id === selectedId)) setSelectedId(usable[0]?.id || ""); }, [selectedId, usable]);
  const selected = usable.find((row) => row.id === selectedId) || usable[0] || null;
  const analysis = React.useMemo(() => selected ? analyzeRunningTerrain(selected.route) : null, [selected]);
  const records = React.useMemo(() => bestHillEfforts(usable), [usable]);
  const rows = React.useMemo(() => selected ? elevationPaceRows(selected) : [], [selected]);
  const copy = lang === "fr" ? { title: "RELIEF & CÔTES", no: "Aucune donnée d’altitude exploitable pour le moment.", route: "SORTIE ANALYSÉE", difficulty: "DIFFICULTÉ", gain: "D+", loss: "D−", maxGrade: "PENTE MAX", hills: "CÔTES", records: "RECORDS EN MONTÉE", biggest: "PLUS GROSSE MONTÉE", steepest: "PLUS RAIDE", vertical: "VITESSE ASCENSIONNELLE", pace: "ALLURE ↔ RELIEF", km: "KM", alt: "Δ ALT.", climb: "D+ KM" }
    : lang === "es" ? { title: "DESNIVEL Y CUESTAS", no: "Todavía no hay datos de altitud utilizables.", route: "CARRERA ANALIZADA", difficulty: "DIFICULTAD", gain: "D+", loss: "D−", maxGrade: "PENDIENTE MÁX.", hills: "CUESTAS", records: "RÉCORDS EN SUBIDA", biggest: "MAYOR SUBIDA", steepest: "MÁS EMPINADA", vertical: "VELOCIDAD ASCENSIONAL", pace: "RITMO ↔ DESNIVEL", km: "KM", alt: "Δ ALT.", climb: "D+ KM" }
    : { title: "ELEVATION & HILLS", no: "No usable elevation data yet.", route: "ANALYSED RUN", difficulty: "DIFFICULTY", gain: "ELEV +", loss: "ELEV −", maxGrade: "MAX GRADE", hills: "HILLS", records: "HILL RECORDS", biggest: "BIGGEST CLIMB", steepest: "STEEPEST", vertical: "VERTICAL SPEED", pace: "PACE ↔ ELEVATION", km: "KM", alt: "Δ ELEV.", climb: "KM CLIMB" };
  if (!selected || !analysis) return <div style={{ marginTop: 12 }}><Section title={copy.title}><div style={{ padding: 12, color: textSoft, fontSize: 9 }}>{copy.no}</div></Section></div>;

  return <div style={{ marginTop: 12 }}><Section title={copy.title}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}><div><div style={label}>{copy.route}</div><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} style={selectStyle}>{usable.map((row) => <option key={row.id} value={row.id}>{new Date(row.startedAt).toLocaleDateString()} · {formatDistance(row.distanceM)}</option>)}</select></div><span style={{ padding: "7px 9px", borderRadius: 999, border: `1px solid ${accent}44`, color: accent, fontSize: 8, fontWeight: 1000 }}>{terrainLabel(analysis.terrain, lang)} · {analysis.difficultyScore}/100</span></div>
    <div style={{ marginTop: 9 }}><RunningElevationProfile points={selected.route} accent={accent} textSoft={textSoft}/></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 8 }}><Mini label={copy.gain} value={`+${Math.round(analysis.gainM)} m`} accent={accent}/><Mini label={copy.loss} value={`−${Math.round(analysis.lossM)} m`} accent={accent}/><Mini label={copy.maxGrade} value={`${analysis.maxGradePct.toFixed(1)}%`} accent={accent}/><Mini label={copy.hills} value={String(analysis.hills.length)} accent={accent}/></div>

    {(records.biggestGain || records.steepest || records.fastestVertical) ? <div style={{ marginTop: 11 }}><div style={titleStyle(accent)}>{copy.records}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><RecordCard label={copy.biggest} value={records.biggestGain ? `+${Math.round(records.biggestGain.gainM)} m` : "—"} sub={records.biggestGain ? `${formatDistance(records.biggestGain.distanceM)} · ${records.biggestGain.avgGradePct.toFixed(1)}%` : ""} accent={accent}/><RecordCard label={copy.steepest} value={records.steepest ? `${records.steepest.avgGradePct.toFixed(1)}%` : "—"} sub={records.steepest?.elapsedMs ? formatDuration(records.steepest.elapsedMs) : ""} accent={accent}/><RecordCard label={copy.vertical} value={records.fastestVertical?.verticalSpeedMph ? `${Math.round(records.fastestVertical.verticalSpeedMph)} m/h` : "—"} sub={records.fastestVertical?.elapsedMs ? formatDuration(records.fastestVertical.elapsedMs) : ""} accent={accent}/></div></div> : null}

    {rows.length ? <div style={{ marginTop: 11 }}><div style={titleStyle(accent)}>{copy.pace}</div><div style={{ overflowX: "auto" }}><div style={{ minWidth: 350, display: "grid", gap: 4 }}>{rows.slice(0, 16).map((row) => <div key={row.km} style={{ display: "grid", gridTemplateColumns: "35px 1fr 72px 72px", gap: 6, padding: "6px 7px", borderRadius: 9, background: "rgba(255,255,255,.025)", fontSize: 8.3, color: textSoft }}><b style={{ color: accent }}>{row.km}</b><span>{formatPace(row.paceSecPerKm)}/km</span><span>{row.elevationDeltaM >= 0 ? "+" : ""}{Math.round(row.elevationDeltaM)} m</span><span>+{Math.round(row.gainM)} m</span></div>)}</div></div></div> : null}
  </Section></div>;
}

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) { return <div className="card" style={{ padding: 8, textAlign: "center" }}><div style={{ fontSize: 7.3, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, fontSize: 12.5, color: accent, fontWeight: 1000 }}>{value}</div></div>; }
function RecordCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) { return <div className="card" style={{ padding: 8 }}><div style={{ fontSize: 6.9, opacity: .52, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 11.5, fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 2, fontSize: 7, opacity: .5 }}>{sub}</div></div>; }
const label: React.CSSProperties = { fontSize: 7.5, fontWeight: 1000, opacity: .6, marginBottom: 4 };
const titleStyle = (accent: string): React.CSSProperties => ({ fontSize: 8, color: accent, fontWeight: 1000, letterSpacing: .5, marginBottom: 6 });
const selectStyle: React.CSSProperties = { minHeight: 38, width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.2)", color: "#fff", padding: "0 8px", fontSize: 9, colorScheme: "dark" };
