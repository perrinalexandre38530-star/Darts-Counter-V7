import React from "react";
import Section from "../../components/Section";
import { formatPace } from "../../activity/activityMath";
import { analyseRunningActivity } from "../../activity/runningRunAnalysis";
import type { ActivityRecord } from "../../activity/activityTypes";

type Props = { activity: ActivityRecord; lang: string; accent: string; textSoft: string };

export default function RunningRunAnalysisPanel({ activity, lang, accent, textSoft }: Props) {
  const analysis = React.useMemo(() => analyseRunningActivity(activity), [activity]);
  const copy = lang === "fr" ? {
    title: "ANALYSE DE COURSE", consistency: "RÉGULARITÉ", fastest: "KM LE + RAPIDE", slowest: "KM LE + LENT", first: "1RE MOITIÉ", second: "2E MOITIÉ", stable: "Allure stable", progressive: "Finish progressif", fade: "Baisse en 2e partie", insufficient: "Pas assez de splits", faster: "plus rapide", slower: "plus lente",
  } : lang === "es" ? {
    title: "ANÁLISIS DE CARRERA", consistency: "REGULARIDAD", fastest: "KM MÁS RÁPIDO", slowest: "KM MÁS LENTO", first: "1ª MITAD", second: "2ª MITAD", stable: "Ritmo estable", progressive: "Final progresivo", fade: "Caída en la 2ª parte", insufficient: "No hay suficientes splits", faster: "más rápida", slower: "más lenta",
  } : {
    title: "RUN ANALYSIS", consistency: "CONSISTENCY", fastest: "FASTEST KM", slowest: "SLOWEST KM", first: "1ST HALF", second: "2ND HALF", stable: "Stable pacing", progressive: "Progressive finish", fade: "Second-half fade", insufficient: "Not enough splits", faster: "faster", slower: "slower",
  };

  const label = analysis.pacingLabel === "progressive" ? copy.progressive : analysis.pacingLabel === "fade" ? copy.fade : analysis.pacingLabel === "stable" ? copy.stable : copy.insufficient;
  const splitPaces = activity.splits.map((split) => split.paceSecPerKm).filter((value) => Number.isFinite(value) && value > 0);
  const min = Math.min(...splitPaces, 1);
  const max = Math.max(...splitPaces, min + 1);

  return <Section title={copy.title} right={<span style={{ color: analysis.pacingLabel === "fade" ? "#ff8a67" : accent, fontSize: 8.2, fontWeight: 1000 }}>{label}</span>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
      <Tile label={copy.consistency} value={analysis.consistencyScore == null ? "—" : `${analysis.consistencyScore}%`} accent={accent}/>
      <Tile label={copy.fastest} value={analysis.fastestSplit ? `KM ${analysis.fastestSplit.index} · ${formatPace(analysis.fastestSplit.paceSecPerKm)}` : "—"} accent={accent}/>
      <Tile label={copy.slowest} value={analysis.slowestSplit ? `KM ${analysis.slowestSplit.index} · ${formatPace(analysis.slowestSplit.paceSecPerKm)}` : "—"} accent={accent}/>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 7 }}>
      <Tile label={copy.first} value={formatPace(analysis.firstHalfPace)} accent={accent}/>
      <Tile label={copy.second} value={formatPace(analysis.secondHalfPace)} accent={analysis.negativeSplit ? "#71ff9a" : accent}/>
    </div>
    {analysis.secondHalfDeltaSecPerKm != null ? <div style={{ marginTop: 7, padding: 8, borderRadius: 10, background: "rgba(255,255,255,.025)", color: textSoft, fontSize: 8.5, textAlign: "center" }}>{Math.abs(analysis.secondHalfDeltaSecPerKm).toFixed(0)} s/km {analysis.secondHalfDeltaSecPerKm < 0 ? copy.faster : copy.slower}</div> : null}
    {activity.splits.length >= 2 ? <div style={{ display: "grid", gridTemplateColumns: `repeat(${activity.splits.length},minmax(0,1fr))`, gap: 4, alignItems: "end", minHeight: 96, marginTop: 10 }}>
      {activity.splits.map((split) => {
        const normalized = max > min ? 1 - (split.paceSecPerKm - min) / (max - min) : .5;
        const height = 25 + normalized * 55;
        return <div key={split.index} style={{ display: "grid", gap: 3, justifyItems: "center", alignSelf: "end" }}><div style={{ fontSize: 6.8, color: textSoft }}>{formatPace(split.paceSecPerKm)}</div><div style={{ width: "70%", minWidth: 7, height, borderRadius: "7px 7px 3px 3px", background: `linear-gradient(180deg,${accent},${accent}55)`, boxShadow: `0 0 9px ${accent}22` }}/><div style={{ fontSize: 6.8, color: textSoft }}>K{split.index}</div></div>;
      })}
    </div> : null}
  </Section>;
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="card" style={{ padding: 9, textAlign: "center" }}><div style={{ fontSize: 7.2, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 4, color: accent, fontSize: 11, fontWeight: 1000 }}>{value}</div></div>;
}
