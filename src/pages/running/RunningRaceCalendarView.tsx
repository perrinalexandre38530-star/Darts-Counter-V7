import React from "react";
import Section from "../../components/Section";
import { defaultGoalTimeMs, distanceGoalLabel, type RunningRaceGoalDistance } from "../../activity/runningGoals";
import { createRunningRace, loadRunningRaces, raceDaysLeft, removeRunningRace, setPrimaryRunningRace, upsertRunningRace, type RunningRaceEntry } from "../../activity/runningRaceCalendar";
import { formatDuration, formatPace } from "../../activity/activityMath";
import "./runningResponsive.css";

const DISTANCES: RunningRaceGoalDistance[] = [5000, 10000, 21097, 42195];

type Props = { lang: string; accent: string; textSoft: string };

function dateValue(ts: number) {
  const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(value: string) { const [y, m, d] = value.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0).getTime(); }

export default function RunningRaceCalendarView({ lang, accent, textSoft }: Props) {
  const [races, setRaces] = React.useState<RunningRaceEntry[]>(() => loadRunningRaces());
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [distanceM, setDistanceM] = React.useState<RunningRaceGoalDistance>(10000);
  const [date, setDate] = React.useState(Date.now() + 6 * 7 * 86_400_000);
  const [targetTimeMs, setTargetTimeMs] = React.useState(defaultGoalTimeMs(10000));

  const copy = lang === "fr" ? {
    title: "CALENDRIER DE COURSES", sub: "Prépare plusieurs échéances et choisis celle qui pilote ton objectif principal.", name: "NOM DE LA COURSE", location: "LIEU (OPTIONNEL)", date: "DATE", target: "CHRONO CIBLE", add: "AJOUTER AU CALENDRIER", empty: "Aucune course planifiée.", primary: "OBJECTIF PRINCIPAL", setPrimary: "DÉFINIR COMME OBJECTIF", remove: "SUPPRIMER", past: "PASSÉE", days: "JOURS", pace: "ALLURE",
  } : lang === "es" ? {
    title: "CALENDARIO DE CARRERAS", sub: "Prepara varias fechas y elige la que dirige tu objetivo principal.", name: "NOMBRE DE LA CARRERA", location: "LUGAR (OPCIONAL)", date: "FECHA", target: "TIEMPO OBJETIVO", add: "AÑADIR AL CALENDARIO", empty: "No hay carreras planificadas.", primary: "OBJETIVO PRINCIPAL", setPrimary: "DEFINIR COMO OBJETIVO", remove: "ELIMINAR", past: "PASADA", days: "DÍAS", pace: "RITMO",
  } : {
    title: "RACE CALENDAR", sub: "Plan multiple events and choose which one drives your primary goal.", name: "RACE NAME", location: "LOCATION (OPTIONAL)", date: "DATE", target: "TARGET TIME", add: "ADD TO CALENDAR", empty: "No races planned yet.", primary: "PRIMARY GOAL", setPrimary: "SET AS PRIMARY", remove: "DELETE", past: "PAST", days: "DAYS", pace: "PACE",
  };

  const chooseDistance = (value: RunningRaceGoalDistance) => { setDistanceM(value); setTargetTimeMs(defaultGoalTimeMs(value)); };
  const addRace = () => {
    const race = createRunningRace({ name: name.trim() || distanceGoalLabel(distanceM), date, distanceM, targetTimeMs, location: location.trim() || undefined });
    setRaces(upsertRunningRace(race)); setName(""); setLocation("");
  };

  return <Section title={copy.title}>
    <div style={{ color: textSoft, fontSize: 9.3, lineHeight: 1.45 }}>{copy.sub}</div>
    <div className="running-metrics-4" style={{ marginTop: 10 }}>
      {DISTANCES.map((value) => <button key={value} className="btn" onClick={() => chooseDistance(value)} style={{ minHeight: 40, padding: 4, fontSize: 8.5, fontWeight: 1000, color: distanceM === value ? accent : undefined, borderColor: distanceM === value ? `${accent}77` : undefined }}>{value === 21097 ? "21.1K" : value === 42195 ? "42.2K" : `${value / 1000}K`}</button>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
      <Field label={copy.name} accent={accent}><input value={name} onChange={(e) => setName(e.target.value.slice(0, 64))} placeholder={distanceGoalLabel(distanceM)} style={inputStyle}/></Field>
      <Field label={copy.location} accent={accent}><input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 80))} placeholder="—" style={inputStyle}/></Field>
      <Field label={copy.date} accent={accent}><input type="date" value={dateValue(date)} min={dateValue(Date.now())} onChange={(e) => setDate(parseDate(e.target.value))} style={inputStyle}/></Field>
      <Field label={copy.target} accent={accent}><div style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", gap: 4 }}><button className="btn" onClick={() => setTargetTimeMs((v) => Math.max(5 * 60_000, v - 5 * 60_000))} style={miniBtn}>−</button><div style={{ ...inputStyle, display: "grid", placeItems: "center", color: accent, fontWeight: 1000 }}>{formatDuration(targetTimeMs)}</div><button className="btn" onClick={() => setTargetTimeMs((v) => v + 5 * 60_000)} style={miniBtn}>+</button></div></Field>
    </div>
    <button className="btn primary" onClick={addRace} style={{ width: "100%", minHeight: 44, marginTop: 9, background: accent, fontWeight: 1000 }}>{copy.add}</button>

    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      {races.length ? races.map((race) => { const days = raceDaysLeft(race); const pace = race.targetTimeMs / 1000 / (race.distanceM / 1000); return <div key={race.id} className="card" style={{ padding: 10, borderColor: race.primary ? `${accent}66` : "rgba(255,255,255,.08)", background: "rgba(8,10,16,.97)", boxShadow: "0 10px 24px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.025)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><div style={{ fontSize: 10.5, fontWeight: 1000, color: race.primary ? accent : undefined }}>{race.name}</div><div style={{ marginTop: 3, fontSize: 8.6, color: textSoft }}>{distanceGoalLabel(race.distanceM)} · {new Date(race.date).toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB")}{race.location ? ` · ${race.location}` : ""}</div></div><div style={{ textAlign: "right" }}><div style={{ color: days >= 0 ? accent : textSoft, fontSize: 12, fontWeight: 1000 }}>{days >= 0 ? `J−${days}` : copy.past}</div><div style={{ marginTop: 2, fontSize: 8, color: textSoft }}>{formatDuration(race.targetTimeMs)}</div></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 8 }}><Mini label={copy.pace} value={`${formatPace(pace)}/km`} accent={accent}/><Mini label={copy.primary} value={race.primary ? "✓" : "—"} accent={race.primary ? accent : textSoft}/></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, marginTop: 8 }}><button className="btn" onClick={() => setRaces(setPrimaryRunningRace(race.id))} disabled={race.primary} style={{ minHeight: 34, fontSize: 8.5, fontWeight: 1000, color: race.primary ? accent : undefined }}>{race.primary ? copy.primary : copy.setPrimary}</button><button className="btn" onClick={() => setRaces(removeRunningRace(race.id))} style={{ minHeight: 34, fontSize: 8.5, color: "#ff7c88", borderColor: "rgba(255,90,110,.3)" }}>{copy.remove}</button></div>
      </div>; }) : <div style={{ padding: 12, textAlign: "center", color: textSoft, fontSize: 9 }}>{copy.empty}</div>}
    </div>
  </Section>;
}

function Field({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) { return <div><div style={{ fontSize: 8, fontWeight: 1000, color: accent, marginBottom: 4 }}>{label}</div>{children}</div>; }
function Mini({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ borderRadius: 10, padding: 7, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}><div style={{ fontSize: 7.4, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontWeight: 1000, fontSize: 12 }}>{value}</div></div>; }
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 37, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(4,6,10,.94)", color: "#fff", padding: "7px 8px", boxSizing: "border-box", fontSize: 9.5, outline: "none" };
const miniBtn: React.CSSProperties = { minWidth: 32, minHeight: 37, padding: 0, fontWeight: 1000 };
