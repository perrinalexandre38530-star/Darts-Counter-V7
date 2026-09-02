import React from "react";
import Section from "../../components/Section";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";
import { runningLocalDateKey as keyOf } from "../../activity/runningShared";

type Props = { activities: ActivityRecord[]; lang: string; accent: string; textSoft: string };


function monthStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

function addMonths(ts: number, delta: number) {
  const d = new Date(ts);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d.getTime();
}

function locale(lang: string) { return lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB"; }

export default function RunningActivityCalendar({ activities, lang, accent, textSoft }: Props) {
  const [monthTs, setMonthTs] = React.useState(() => monthStart(Date.now()));
  const [selectedKey, setSelectedKey] = React.useState(() => keyOf(Date.now()));
  const loc = locale(lang);
  const copy = lang === "fr" ? {
    title: "CALENDRIER D’ACTIVITÉ", runs: "sorties", distance: "Distance", time: "Temps", empty: "Aucune sortie ce jour-là.", today: "AUJOURD’HUI",
  } : lang === "es" ? {
    title: "CALENDARIO DE ACTIVIDAD", runs: "carreras", distance: "Distancia", time: "Tiempo", empty: "No hay carreras ese día.", today: "HOY",
  } : {
    title: "ACTIVITY CALENDAR", runs: "runs", distance: "Distance", time: "Time", empty: "No runs on this day.", today: "TODAY",
  };

  const byDay = React.useMemo(() => {
    const map = new Map<string, ActivityRecord[]>();
    for (const activity of activities) {
      const key = keyOf(activity.startedAt);
      const rows = map.get(key) || [];
      rows.push(activity);
      map.set(key, rows);
    }
    return map;
  }, [activities]);

  const d = new Date(monthTs);
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((mondayOffset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - mondayOffset + 1;
    if (day < 1 || day > daysInMonth) return null;
    const ts = new Date(year, month, day).getTime();
    const key = keyOf(ts);
    const rows = byDay.get(key) || [];
    const distanceM = rows.reduce((sum, row) => sum + row.distanceM, 0);
    return { day, key, rows, distanceM };
  });

  const monthRows = activities.filter((activity) => {
    const row = new Date(activity.startedAt);
    return row.getFullYear() === year && row.getMonth() === month;
  });
  const monthDistance = monthRows.reduce((sum, row) => sum + row.distanceM, 0);
  const monthTime = monthRows.reduce((sum, row) => sum + row.elapsedMs, 0);
  const maxDayDistance = Math.max(1000, ...cells.filter(Boolean).map((cell) => cell!.distanceM));
  const selectedRows = byDay.get(selectedKey) || [];
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const base = new Date(2026, 7, 24 + i);
    return new Intl.DateTimeFormat(loc, { weekday: "short" }).format(base).slice(0, 2);
  });
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(monthTs));

  return <div style={{ borderRadius: 18, padding: 10, background: "rgba(7,9,14,.975)", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 14px 34px rgba(0,0,0,.4)" }}><Section title={copy.title} right={<button className="btn" onClick={() => { const now = monthStart(Date.now()); setMonthTs(now); setSelectedKey(keyOf(Date.now())); }} style={{ minHeight: 28, padding: "3px 7px", fontSize: 7.5 }}>{copy.today}</button>}>
    <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", alignItems: "center", gap: 7 }}>
      <button className="btn" onClick={() => setMonthTs((value) => addMonths(value, -1))} style={{ minWidth: 34, minHeight: 34, padding: 0 }}>‹</button>
      <div style={{ textAlign: "center", fontWeight: 1000, fontSize: 11, textTransform: "uppercase", color: accent }}>{monthLabel}</div>
      <button className="btn" onClick={() => setMonthTs((value) => addMonths(value, 1))} style={{ minWidth: 34, minHeight: 34, padding: 0 }}>›</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 9 }}>
      <Mini value={String(monthRows.length)} label={copy.runs} accent={accent}/>
      <Mini value={formatDistance(monthDistance)} label={copy.distance} accent={accent}/>
      <Mini value={formatDuration(monthTime)} label={copy.time} accent={accent}/>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 10 }}>
      {weekdays.map((label, index) => <div key={`${label}-${index}`} style={{ textAlign: "center", fontSize: 7.5, color: textSoft, fontWeight: 900, textTransform: "uppercase", paddingBottom: 2 }}>{label}</div>)}
      {cells.map((cell, index) => {
        if (!cell) return <div key={`empty-${index}`} style={{ minHeight: 48 }}/>
        const active = cell.key === selectedKey;
        const intensity = Math.min(1, cell.distanceM / maxDayDistance);
        return <button key={cell.key} type="button" onClick={() => setSelectedKey(cell.key)} style={{ minWidth: 0, minHeight: 48, borderRadius: 10, border: `1px solid ${active ? `${accent}88` : cell.rows.length ? `${accent}2f` : "rgba(255,255,255,.06)"}`, background: cell.rows.length ? `linear-gradient(180deg,${accent}${Math.round(22 + intensity * 30).toString(16).padStart(2, "0")},rgba(8,10,16,.96))` : "rgba(8,10,16,.94)", color: "inherit", padding: "5px 2px", display: "grid", alignContent: "space-between", cursor: "pointer", boxShadow: active ? `0 0 12px ${accent}22` : "none" }}>
          <span style={{ fontSize: 8.5, fontWeight: 1000, color: active ? accent : undefined }}>{cell.day}</span>
          <span style={{ fontSize: 6.7, color: cell.rows.length ? accent : textSoft, fontWeight: 900 }}>{cell.rows.length ? `${(cell.distanceM / 1000).toFixed(cell.distanceM >= 10000 ? 0 : 1)}K` : "·"}</span>
        </button>;
      })}
    </div>

    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
      {selectedRows.length ? selectedRows.map((row) => <div key={row.id} className="card" style={{ padding: 9, background: "rgba(8,10,16,.96)", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
        <div><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{row.title || "RUNNING"}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(new Date(row.startedAt))} · {formatDistance(row.distanceM)} · {formatDuration(row.elapsedMs)}</div></div>
        <div style={{ color: accent, fontSize: 9, fontWeight: 1000 }}>{formatPace(row.avgPaceSecPerKm)}/km</div>
      </div>) : <div style={{ color: textSoft, fontSize: 8.7, textAlign: "center", padding: 8 }}>{copy.empty}</div>}
    </div>
  </Section></div>;
}

function Mini({ value, label, accent }: { value: string; label: string; accent: string }) {
  return <div className="card" style={{ padding: "8px 5px", textAlign: "center" }}><div style={{ color: accent, fontSize: 13, fontWeight: 1000 }}>{value}</div><div style={{ opacity: .55, fontSize: 7.3, marginTop: 2 }}>{label}</div></div>;
}
