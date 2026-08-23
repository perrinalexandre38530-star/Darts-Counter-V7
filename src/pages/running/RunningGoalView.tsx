import React from "react";
import type { RunningStats } from "../../activity/runningInsights";
import {
  buildRunningRaceGoalSnapshot,
  defaultGoalTimeMs,
  distanceGoalLabel,
  loadRunningRaceGoal,
  saveRunningRaceGoal,
  type RunningRaceGoal,
  type RunningRaceGoalDistance,
} from "../../activity/runningGoals";
import { formatDuration, formatPace } from "../../activity/activityMath";

const DISTANCES: RunningRaceGoalDistance[] = [5000, 10000, 21097, 42195];

type Props = {
  stats: RunningStats;
  lang: string;
  accent: string;
  textSoft: string;
  onChanged?: (goal: RunningRaceGoal | null) => void;
};

function dateInputValue(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const out = new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0).getTime();
  return Number.isFinite(out) ? out : Date.now() + 8 * 7 * 86_400_000;
}

export default function RunningGoalView({ stats, lang, accent, textSoft, onChanged }: Props) {
  const current = React.useMemo(() => loadRunningRaceGoal(), []);
  const [distanceM, setDistanceM] = React.useState<RunningRaceGoalDistance>(current?.distanceM || 10000);
  const [targetDate, setTargetDate] = React.useState(current?.targetDate || Date.now() + 8 * 7 * 86_400_000);
  const [targetTimeMs, setTargetTimeMs] = React.useState(current?.targetTimeMs || defaultGoalTimeMs(current?.distanceM || 10000));

  const copy = lang === "fr" ? {
    title: "OBJECTIF DE COURSE", sub: "Fixe une date et un chrono cible pour transformer ton entraînement en mission.", distance: "DISTANCE", date: "DATE DE COURSE", time: "CHRONO CIBLE", pace: "ALLURE CIBLE", prediction: "PRÉDICTION ACTUELLE", gap: "ÉCART À COMBLER", save: "ENREGISTRER L’OBJECTIF", clear: "SUPPRIMER", saved: "OBJECTIF ACTIF", days: "jours", readiness: "PROXIMITÉ DE L’OBJECTIF", noPrediction: "Encore trop peu de données GPS pour estimer ton niveau sur cette distance.", ahead: "Tu es actuellement en avance sur l’objectif.", close: "Tu es très proche du chrono cible.", behind: "L’objectif est ambitieux : ton plan peut maintenant travailler cet écart.",
  } : lang === "es" ? {
    title: "OBJETIVO DE CARRERA", sub: "Define una fecha y un tiempo objetivo para convertir tu entrenamiento en una misión.", distance: "DISTANCIA", date: "FECHA", time: "TIEMPO OBJETIVO", pace: "RITMO OBJETIVO", prediction: "PREDICCIÓN ACTUAL", gap: "DIFERENCIA", save: "GUARDAR OBJETIVO", clear: "ELIMINAR", saved: "OBJETIVO ACTIVO", days: "días", readiness: "PROXIMIDAD AL OBJETIVO", noPrediction: "Aún faltan datos GPS para estimar tu nivel en esta distancia.", ahead: "Actualmente estás por delante del objetivo.", close: "Estás muy cerca del tiempo objetivo.", behind: "El objetivo es ambicioso: el plan ya puede trabajar esta diferencia.",
  } : {
    title: "RACE GOAL", sub: "Set a date and target time to turn training into a clear mission.", distance: "DISTANCE", date: "RACE DATE", time: "TARGET TIME", pace: "TARGET PACE", prediction: "CURRENT PREDICTION", gap: "GAP TO CLOSE", save: "SAVE RACE GOAL", clear: "DELETE", saved: "ACTIVE GOAL", days: "days", readiness: "GOAL PROXIMITY", noPrediction: "Not enough GPS data yet to estimate this race distance.", ahead: "You are currently ahead of the target.", close: "You are very close to the target time.", behind: "This is an ambitious target: your training can now work on the gap.",
  };

  const draft: RunningRaceGoal = { distanceM, targetDate, targetTimeMs, createdAt: current?.createdAt || Date.now() };
  const snapshot = buildRunningRaceGoalSnapshot(draft, stats);
  const deltaLabel = snapshot.deltaMs == null ? "—" : `${snapshot.deltaMs > 0 ? "+" : "−"}${formatDuration(Math.abs(snapshot.deltaMs))}`;
  const statusText = snapshot.status === "ahead" ? copy.ahead : snapshot.status === "close" ? copy.close : snapshot.status === "behind" ? copy.behind : copy.noPrediction;
  const statusColor = snapshot.status === "ahead" ? "#71ff9a" : snapshot.status === "close" ? accent : snapshot.status === "behind" ? "#ff9b6b" : textSoft;

  const adjustTime = (minutes: number) => setTargetTimeMs((value) => Math.max(5 * 60_000, value + minutes * 60_000));
  const chooseDistance = (value: RunningRaceGoalDistance) => {
    setDistanceM(value);
    if (!current || current.distanceM !== value) setTargetTimeMs(defaultGoalTimeMs(value));
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <div className="card" style={{ padding: 14, borderColor: `${accent}44`, background: `linear-gradient(145deg,${accent}12,rgba(255,255,255,.018))` }}>
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, color: accent }}>{copy.title}</div>
      <div style={{ marginTop: 5, color: textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{copy.sub}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 12 }}>
        {DISTANCES.map((value) => <button key={value} className="btn" onClick={() => chooseDistance(value)} style={{ minHeight: 44, padding: 4, fontSize: 8.5, fontWeight: 1000, borderColor: distanceM === value ? `${accent}88` : undefined, color: distanceM === value ? accent : undefined }}>{value === 21097 ? "21.1K" : value === 42195 ? "42.2K" : `${value / 1000}K`}</button>)}
      </div>
    </div>

    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <Field label={copy.date} accent={accent}><input type="date" value={dateInputValue(targetDate)} min={dateInputValue(Date.now())} onChange={(e) => setTargetDate(parseDate(e.target.value))} style={inputStyle}/></Field>
        <Field label={copy.time} accent={accent}><div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", gap: 5 }}><button className="btn" onClick={() => adjustTime(-5)} style={smallBtn}>−</button><div style={{ ...inputStyle, display: "grid", placeItems: "center", fontWeight: 1000, color: accent }}>{formatDuration(targetTimeMs)}</div><button className="btn" onClick={() => adjustTime(5)} style={smallBtn}>+</button></div></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 10 }}>
        <Metric label={copy.pace} value={`${formatPace(snapshot.targetPaceSecPerKm)}/km`} accent={accent}/>
        <Metric label={copy.prediction} value={snapshot.predictedMs ? formatDuration(snapshot.predictedMs) : "—"} accent={accent}/>
        <Metric label={copy.gap} value={deltaLabel} accent={statusColor}/>
      </div>
    </div>

    <div className="card" style={{ padding: 14, borderColor: `${statusColor}44` }}>
      <div style={{ display: "grid", gridTemplateColumns: "78px 1fr", gap: 12, alignItems: "center" }}>
        <div style={{ width: 74, height: 74, borderRadius: 999, display: "grid", placeItems: "center", background: `conic-gradient(${statusColor} ${snapshot.readinessPct || 0}%,rgba(255,255,255,.07) 0)`, boxShadow: `0 0 24px ${statusColor}20` }}><div style={{ width: 58, height: 58, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(5,7,12,.94)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><b style={{ fontSize: 17, color: statusColor }}>{snapshot.readinessPct == null ? "—" : `${snapshot.readinessPct}%`}</b></div></div>
        <div><div style={{ fontSize: 9, color: textSoft, fontWeight: 1000 }}>{copy.readiness}</div><div style={{ marginTop: 3, fontWeight: 1000, color: statusColor }}>{distanceGoalLabel(distanceM)} · J−{snapshot.daysLeft}</div><div style={{ marginTop: 5, fontSize: 9.5, lineHeight: 1.4, color: textSoft }}>{statusText}</div></div>
      </div>
    </div>

    <button className="btn primary" onClick={() => { saveRunningRaceGoal(draft); onChanged?.(draft); }} style={{ minHeight: 52, background: accent, fontWeight: 1000 }}>{copy.save}</button>
    {current ? <button className="btn" onClick={() => { saveRunningRaceGoal(null); onChanged?.(null); }} style={{ minHeight: 42, color: "#ff7c88", borderColor: "rgba(255,90,110,.35)" }}>{copy.clear}</button> : null}
  </div>;
}

function Field({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 8.5, fontWeight: 1000, color: accent, marginBottom: 5 }}>{label}</div>{children}</div>;
}
function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ borderRadius: 12, padding: 9, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.065)", textAlign: "center" }}><div style={{ fontSize: 7.5, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 4, fontSize: 14, fontWeight: 1000, color: accent }}>{value}</div></div>;
}
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.22)", color: "#fff", padding: "7px 8px", fontSize: 10, outline: "none", boxSizing: "border-box" };
const smallBtn: React.CSSProperties = { minWidth: 34, minHeight: 38, padding: 0, fontWeight: 1000 };
