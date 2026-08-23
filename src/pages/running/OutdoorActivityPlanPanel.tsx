import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { OUTDOOR_SPORT_PROFILES, outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { ActivityRecord } from "../../activity/activityTypes";
import { RunningMetricCard, RunningSurface } from "./RunningUi";

const KEY = "mss-outdoor-goals-v1";
type GoalState = Record<string, { distanceKm: number; elevationM: number; sessions: number }>;
function readGoals(): GoalState { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } }
function saveGoals(value: GoalState) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {} }

export default function OutdoorActivityPlanPanel({ sport, activities, lang, accent, textSoft, onStart }: { sport: OutdoorPerformanceSport; activities: ActivityRecord[]; lang: string; accent: string; textSoft: string; onStart: (presetId: string) => void }) {
  const profile = OUTDOOR_SPORT_PROFILES[sport];
  const [goals, setGoals] = React.useState<GoalState>(() => readGoals());
  const goal = goals[sport] || { distanceKm: profile.weeklyDistanceKm, elevationM: profile.weeklyElevationM, sessions: profile.weeklySessions };
  const now = Date.now();
  const weekStart = now - 7 * 86400000;
  const week = activities.filter((a) => a.startedAt >= weekStart);
  const distanceM = week.reduce((sum, a) => sum + Number(a.distanceM || 0), 0);
  const elevationM = week.reduce((sum, a) => sum + Number(a.elevationGainM || 0), 0);
  const timeMs = week.reduce((sum, a) => sum + Number(a.elapsedMs || 0), 0);
  const update = (patch: Partial<typeof goal>) => { const next = { ...goals, [sport]: { ...goal, ...patch } }; setGoals(next); saveGoals(next); };
  const t = lang === "fr" ? { title: `OBJECTIFS ${outdoorSportLabel(sport, lang).toUpperCase()}`, week: "7 derniers jours", dist: "DISTANCE", climb: "D+", sessions: "SORTIES", time: "TEMPS", target: "CIBLES HEBDO", suggested: "SEMAINE CONSEILLÉE", easy: sport === "hiking" ? "Rando facile" : "Sortie facile", hills: sport === "hiking" ? "Rando vallonnée" : "Travail de côtes", long: sport === "walking" ? "Marche longue" : "Sortie longue" } : lang === "es" ? { title: `OBJETIVOS ${outdoorSportLabel(sport, lang).toUpperCase()}`, week: "Últimos 7 días", dist: "DISTANCIA", climb: "D+", sessions: "SALIDAS", time: "TIEMPO", target: "OBJETIVOS SEMANALES", suggested: "SEMANA RECOMENDADA", easy: "Salida suave", hills: "Cuestas", long: "Salida larga" } : { title: `${outdoorSportLabel(sport, lang).toUpperCase()} GOALS`, week: "Last 7 days", dist: "DISTANCE", climb: "ELEVATION", sessions: "SESSIONS", time: "TIME", target: "WEEKLY TARGETS", suggested: "SUGGESTED WEEK", easy: "Easy outing", hills: "Hill session", long: "Long outing" };
  return <div>
    <RunningSurface accent={accent} active><div style={{ color: accent, fontSize: 9, fontWeight: 1000 }}>{t.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.2 }}>{t.week}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}><RunningMetricCard label={t.dist} value={formatDistance(distanceM)} accent={accent}/><RunningMetricCard label={t.climb} value={`+${Math.round(elevationM)} m`} accent={accent}/><RunningMetricCard label={t.sessions} value={String(week.length)} accent={accent}/><RunningMetricCard label={t.time} value={formatDuration(timeMs)} accent={accent}/></div></RunningSurface>
    <RunningSurface accent={accent} style={{ marginTop: 9 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000 }}>{t.target}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9 }}><GoalAdjust value={goal.distanceKm} suffix="km" onChange={(v) => update({ distanceKm: v })}/><GoalAdjust value={goal.elevationM} suffix="D+" step={100} onChange={(v) => update({ elevationM: v })}/><GoalAdjust value={goal.sessions} suffix="×" step={1} onChange={(v) => update({ sessions: v })}/></div></RunningSurface>
    <RunningSurface accent={accent} style={{ marginTop: 9 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{t.suggested}</div><div style={{ display: "grid", gap: 7 }}><PlanRow icon="🌿" title={t.easy} sub={sport === "hiking" ? "45–75 min · terrain facile" : "30–45 min · aisance"} accent={accent} onClick={() => onStart("easy")}/><PlanRow icon="⛰️" title={t.hills} sub="Relief · technique · D+" accent={accent} onClick={() => onStart("hills")}/><PlanRow icon="🛣️" title={t.long} sub="Endurance · temps de mouvement" accent={accent} onClick={() => onStart("long")}/></div></RunningSurface>
  </div>;
}
function GoalAdjust({ value, suffix, step = 5, onChange }: { value: number; suffix: string; step?: number; onChange: (value: number) => void }) { return <div style={{ padding: 8, borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 1000 }}>{value}<small style={{ fontSize: 7, opacity: .5, marginLeft: 2 }}>{suffix}</small></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 }}><button className="btn" onClick={() => onChange(Math.max(step, value - step))} style={{ minHeight: 28, padding: 0 }}>−</button><button className="btn" onClick={() => onChange(value + step)} style={{ minHeight: 28, padding: 0 }}>+</button></div></div>; }
function PlanRow({ icon, title, sub, accent, onClick }: { icon: string; title: string; sub: string; accent: string; onClick: () => void }) { return <button className="card" onClick={onClick} style={{ width: "100%", padding: 9, display: "grid", gridTemplateColumns: "38px 1fr auto", gap: 8, alignItems: "center", textAlign: "left", color: "inherit", cursor: "pointer", borderColor: `${accent}24` }}><span style={{ fontSize: 20 }}>{icon}</span><span><b style={{ fontSize: 9.5 }}>{title}</b><small style={{ display: "block", marginTop: 2, opacity: .5, fontSize: 8 }}>{sub}</small></span><b style={{ color: accent }}>›</b></button>; }
