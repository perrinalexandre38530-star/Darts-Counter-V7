import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import { listActivities } from "../../activity/activityStore";
import { buildRunningStats } from "../../activity/runningInsights";
import { buildTrainingStatus, racePredictions } from "../../activity/runningTraining";
import { createRunningShoe, loadRunningShoes, saveRunningShoes, shoeDistanceM, shoeWearPct, type RunningShoe } from "../../activity/runningGear";
import type { ActivityRecord } from "../../activity/activityTypes";
import RunningPerformanceInsightsPanel from "./RunningPerformanceInsightsPanel";

type Props = { go: (route: any, params?: any) => void };

export default function RunningStatsPage({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const locale = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [showAll, setShowAll] = React.useState(false);
  const [shoes, setShoes] = React.useState<RunningShoe[]>(() => loadRunningShoes());
  const [newShoeName, setNewShoeName] = React.useState("");

  React.useEffect(() => { void listActivities("running").then(setActivities); }, []);

  const stats = React.useMemo(() => buildRunningStats(activities, Date.now(), locale), [activities, locale]);
  const training = React.useMemo(() => buildTrainingStatus(activities), [activities]);
  const predictions = React.useMemo(() => racePredictions(stats), [stats]);
  const maxDay = Math.max(1000, ...stats.sevenDays.map((d) => d.distanceM));

  const persistShoes = React.useCallback((next: RunningShoe[]) => {
    setShoes(next);
    saveRunningShoes(next);
  }, []);
  const addShoe = React.useCallback(() => {
    const name = newShoeName.trim();
    if (!name) return;
    persistShoes([createRunningShoe(name), ...shoes]);
    setNewShoeName("");
  }, [newShoeName, persistShoes, shoes]);
  const toggleRetired = React.useCallback((shoeId: string) => {
    persistShoes(shoes.map((shoe) => shoe.id === shoeId ? { ...shoe, retired: !shoe.retired } : shoe));
  }, [persistShoes, shoes]);

  const copy = lang === "fr" ? {
    title: "STATS RUNNING", sub: "Progression · segments · trophées · historique", total: "DISTANCE TOTALE", runs: "SORTIES", time: "TEMPS", climb: "D+", best: "MEILLEURE ALLURE", longest: "PLUS LONGUE", week: "7 DERNIERS JOURS", load: "CHARGE D’ENTRAÎNEMENT", freshness: "Préparation", acute: "Charge 7 j", ratio: "Ratio 7/28 j", records: "RECORDS PERSONNELS", predictions: "PRÉDICTIONS", gear: "ÉQUIPEMENT RUNNING", addShoe: "AJOUTER UNE PAIRE", shoePlaceholder: "Nom de la paire…", mileage: "Kilométrage", wear: "Usure estimée", active: "ACTIVE", retired: "RETIRÉE", recent: "DERNIÈRES SORTIES", all: "VOIR TOUT L’HISTORIQUE", less: "RÉDUIRE", noRuns: "Aucune sortie enregistrée pour le moment.", info: "Toutes les statistiques Running Performance sont regroupées ici. Les valeurs de charge et de préparation sont indicatives et ne constituent pas un avis médical."
  } : lang === "es" ? {
    title: "STATS RUNNING", sub: "Progreso · segmentos · trofeos · historial", total: "DISTANCIA TOTAL", runs: "CARRERAS", time: "TIEMPO", climb: "D+", best: "MEJOR RITMO", longest: "MÁS LARGA", week: "ÚLTIMOS 7 DÍAS", load: "CARGA DE ENTRENAMIENTO", freshness: "Preparación", acute: "Carga 7 d", ratio: "Ratio 7/28 d", records: "RÉCORDS PERSONALES", predictions: "PREDICCIONES", gear: "EQUIPO RUNNING", addShoe: "AÑADIR ZAPATILLAS", shoePlaceholder: "Nombre de las zapatillas…", mileage: "Kilometraje", wear: "Desgaste estimado", active: "ACTIVAS", retired: "RETIRADAS", recent: "ÚLTIMAS CARRERAS", all: "VER TODO EL HISTORIAL", less: "REDUCIR", noRuns: "Todavía no hay carreras guardadas.", info: "Todas las estadísticas de Running Performance se agrupan aquí. Las métricas de carga y preparación son orientativas y no son consejo médico."
  } : {
    title: "RUNNING STATS", sub: "Progress · segments · trophies · history", total: "TOTAL DISTANCE", runs: "RUNS", time: "TIME", climb: "ELEVATION", best: "BEST PACE", longest: "LONGEST", week: "LAST 7 DAYS", load: "TRAINING LOAD", freshness: "Readiness", acute: "7-day load", ratio: "7/28 ratio", records: "PERSONAL RECORDS", predictions: "PREDICTIONS", gear: "RUNNING GEAR", addShoe: "ADD SHOES", shoePlaceholder: "Shoe name…", mileage: "Mileage", wear: "Estimated wear", active: "ACTIVE", retired: "RETIRED", recent: "RECENT RUNS", all: "VIEW FULL HISTORY", less: "SHOW LESS", noRuns: "No runs saved yet.", info: "All Running Performance statistics live here. Training load and readiness metrics are indicative only and are not medical advice."
  };

  const recordRows = [
    ["400 M", stats.best400m], ["1 KM", stats.best1k], ["1 MILE", stats.bestMile], ["5 KM", stats.best5k], ["10 KM", stats.best10k], ["SEMI", stats.bestHalf], ["MARATHON", stats.bestMarathon],
  ] as const;

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <PageHeader title={copy.title} subtitle={copy.sub} left={<BackDot onClick={() => go("home")} />} right={<InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.55 }}>{copy.info}</div>} />} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label={copy.total} value={formatDistance(stats.totalDistanceM)} accent={accent} />
        <Kpi label={copy.runs} value={String(stats.sessions)} accent={accent} />
        <Kpi label={copy.time} value={formatDuration(stats.totalElapsedMs)} accent={accent} />
        <Kpi label={copy.climb} value={`+${Math.round(stats.totalElevationM)} m`} accent={accent} />
        <Kpi label={copy.best} value={`${formatPace(stats.bestPaceSecPerKm)}/km`} accent={accent} />
        <Kpi label={copy.longest} value={formatDistance(stats.longestM)} accent={accent} />
      </div>

      <div style={{ marginTop: 12 }}><Section title={copy.week}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 6, alignItems: "end", minHeight: 120 }}>
          {stats.sevenDays.map((day) => {
            const h = Math.max(5, Math.round((day.distanceM / maxDay) * 82));
            return <div key={day.key} style={{ display: "grid", gap: 5, justifyItems: "center", alignSelf: "end" }}><div style={{ fontSize: 8, color: textSoft }}>{day.distanceM ? (day.distanceM / 1000).toFixed(1) : "·"}</div><div style={{ width: "68%", height: h, minHeight: 5, borderRadius: 8, background: `linear-gradient(180deg,${accent},${accent}55)`, boxShadow: day.distanceM ? `0 0 12px ${accent}33` : "none" }} /><div style={{ fontSize: 8, color: textSoft, textTransform: "uppercase" }}>{day.label.slice(0, 3)}</div></div>;
          })}
        </div>
      </Section></div>

      <div style={{ marginTop: 12 }}><Section title={copy.load}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          <Mini label={copy.freshness} value={`${training.freshnessScore}%`} accent={accent} />
          <Mini label={copy.acute} value={String(Math.round(training.acuteLoad7))} accent={accent} />
          <Mini label={copy.ratio} value={training.loadRatio == null ? "—" : training.loadRatio.toFixed(2)} accent={accent} />
        </div>
      </Section></div>

      <div style={{ marginTop: 12 }}><Section title={copy.gear}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}>
          <input value={newShoeName} onChange={(event) => setNewShoeName(event.target.value.slice(0, 48))} onKeyDown={(event) => { if (event.key === "Enter") addShoe(); }} placeholder={copy.shoePlaceholder} style={{ minWidth: 0, minHeight: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.18)", color: "inherit", padding: "0 11px", font: "inherit", fontSize: 10, outline: "none" }} />
          <button className="btn" onClick={addShoe} disabled={!newShoeName.trim()} style={{ minHeight: 40, fontWeight: 1000, fontSize: 9 }}>{copy.addShoe}</button>
        </div>
        {shoes.length ? <div style={{ display: "grid", gap: 8, marginTop: 9 }}>{shoes.map((shoe) => { const distanceM = shoeDistanceM(shoe.id, activities); const wearPct = shoeWearPct(shoe, activities); return <div key={shoe.id} className="card" style={{ padding: 10, opacity: shoe.retired ? .6 : 1 }}><div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, background: `${accent}12`, border: `1px solid ${accent}30`, fontSize: 20 }}>👟</div><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{shoe.name}</div><div style={{ marginTop: 3, fontSize: 8.6, color: textSoft }}>{copy.mileage}: {formatDistance(distanceM)} · {copy.wear}: {Math.round(wearPct)}%</div></div><button className="btn" onClick={() => toggleRetired(shoe.id)} style={{ minHeight: 32, padding: "4px 7px", fontSize: 8, fontWeight: 1000, color: shoe.retired ? textSoft : accent, borderColor: shoe.retired ? undefined : `${accent}66` }}>{shoe.retired ? copy.retired : copy.active}</button></div><div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", marginTop: 8 }}><div style={{ height: "100%", width: `${wearPct}%`, borderRadius: 999, background: wearPct >= 90 ? "#ff716f" : wearPct >= 70 ? "#f6c256" : accent, transition: "width .25s ease" }}/></div><div style={{ marginTop: 5, fontSize: 7.8, color: textSoft }}>{lang === "fr" ? `Repère indicatif réglé à ${shoe.retireAtKm} km — l’usure réelle dépend de la paire et de l’usage.` : lang === "es" ? `Referencia orientativa de ${shoe.retireAtKm} km — el desgaste real depende del calzado y del uso.` : `Indicative ${shoe.retireAtKm} km reference — actual wear depends on the shoe and use.`}</div></div>; })}</div> : <div style={{ padding: "14px 2px 2px", textAlign: "center", color: textSoft, fontSize: 9.2 }}>{lang === "fr" ? "Ajoute ta première paire pour suivre son kilométrage sortie après sortie." : lang === "es" ? "Añade tus primeras zapatillas para seguir su kilometraje carrera tras carrera." : "Add your first pair to track mileage run after run."}</div>}
      </Section></div>

      <div style={{ marginTop: 12 }}><Section title={copy.records}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          {recordRows.map(([label, row]) => <div key={label} className="card" style={{ padding: 10 }}><div style={{ fontSize: 8.5, color: textSoft, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 4, color: row ? accent : textSoft, fontSize: 15, fontWeight: 1000 }}>{row ? formatDuration(row.elapsedMs) : "—"}</div></div>)}
        </div>
      </Section></div>

      {predictions.length ? <div style={{ marginTop: 12 }}><Section title={copy.predictions}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          {predictions.map((p) => <div key={p.distanceM} className="card" style={{ padding: 10 }}><div style={{ fontSize: 8.5, color: textSoft, fontWeight: 900 }}>{distanceName(p.distanceM)}</div><div style={{ marginTop: 4, color: accent, fontSize: 15, fontWeight: 1000 }}>{formatDuration(p.predictedMs)}</div></div>)}
        </div>
      </Section></div> : null}

      <RunningPerformanceInsightsPanel activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />

      <div style={{ marginTop: 12 }}><Section title={copy.recent}>
        {activities.length ? <div style={{ display: "grid", gap: 7 }}>
          {(showAll ? activities : activities.slice(0, 8)).map((a) => <div key={a.id} className="card" style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}><div><div style={{ fontSize: 10, fontWeight: 1000 }}>{a.title || runType(a)}</div><div style={{ marginTop: 3, fontSize: 8.8, color: textSoft }}>{new Date(a.startedAt).toLocaleDateString(locale)} · {formatDistance(a.distanceM)} · {formatDuration(a.elapsedMs)}</div></div><div style={{ color: accent, fontSize: 10, fontWeight: 1000 }}>{formatPace(a.avgPaceSecPerKm)}<small>/km</small></div></div>)}
          {activities.length > 8 ? <button className="btn" onClick={() => setShowAll((value) => !value)} style={{ width: "100%", minHeight: 42, marginTop: 2, fontWeight: 1000 }}>{showAll ? copy.less : copy.all}</button> : null}
        </div> : <div style={{ padding: 18, textAlign: "center", color: textSoft, fontSize: 10 }}>{copy.noRuns}</div>}
      </Section></div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) { return <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 8.5, opacity: .58, fontWeight: 950 }}>{label}</div><div style={{ marginTop: 5, color: accent, fontSize: 18, fontWeight: 1000 }}>{value}</div></div>; }
function Mini({ label, value, accent }: { label: string; value: string; accent: string }) { return <div className="card" style={{ padding: 10, textAlign: "center" }}><div style={{ color: accent, fontSize: 17, fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 3, fontSize: 8, opacity: .58 }}>{label}</div></div>; }
function distanceName(m: number) { if (Math.abs(m - 21097) < 100) return "SEMI"; if (Math.abs(m - 42195) < 100) return "MARATHON"; return `${Math.round(m / 1000)} KM`; }
function runType(a: ActivityRecord) { return a.workoutType === "intervals" ? "INTERVALLES" : a.workoutType === "tempo" ? "TEMPO" : a.workoutType === "long" ? "SORTIE LONGUE" : a.workoutType === "pacer" ? "PACER" : "RUNNING"; }
