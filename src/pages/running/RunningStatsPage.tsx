import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import { listActivities } from "../../activity/activityStore";
import { buildRunningStats } from "../../activity/runningInsights";
import { buildTrainingStatus, racePredictions } from "../../activity/runningTraining";
import { createRunningShoe, loadRunningShoes, saveRunningShoes, shoeDistanceM, shoeWearPct, type RunningShoe } from "../../activity/runningGear";
import type { ActivityRecord } from "../../activity/activityTypes";
import { canonicalOutdoorPerformanceSport, loadOutdoorPerformanceSport, outdoorAverageMetricLabel, outdoorAverageMetricValue, outdoorAverageSpeedKmh, outdoorSportLabel, outdoorUsesSpeedMetric, saveOutdoorPerformanceSport, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import RunningPerformanceInsightsPanel from "./RunningPerformanceInsightsPanel";
import RunningActivityCalendar from "./RunningActivityCalendar";
import RunningDataToolsPanel from "./RunningDataToolsPanel";
import RunningTerrainStatsPanel from "./RunningTerrainStatsPanel";
import OutdoorActivitySelector from "./OutdoorActivitySelector";
import RunningConnectionsPanel from "./RunningConnectionsPanel";
import OutdoorAdventureStatsPanel from "./OutdoorAdventureStatsPanel";
import { RunningGlyph, RunningHubCard, RunningMetricCard, RunningSubpageHeader, RunningSurface } from "./RunningUi";
import { buildSensorSummary } from "../../activity/activitySensorInsights";

type Props = { go: (route: any, params?: any) => void; params?: any };
type StatsTab = "hub" | "overview" | "performance" | "history" | "gear" | "sync";
type AnalysisTab = "hub" | "records" | "form" | "terrain";
type SyncTab = "hub" | "connections" | "files";

export default function RunningStatsPage({ go, params }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const locale = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
  const [activitySport, setActivitySport] = React.useState<OutdoorPerformanceSport>(() => loadOutdoorPerformanceSport());
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [showAll, setShowAll] = React.useState(false);
  const [shoes, setShoes] = React.useState<RunningShoe[]>(() => loadRunningShoes());
  const [newShoeName, setNewShoeName] = React.useState("");
  const [tab, setTab] = React.useState<StatsTab>(() => (["overview", "performance", "history", "gear", "sync"].includes(String(params?.runningStatsTab || "")) ? String(params.runningStatsTab) as StatsTab : "hub"));
  const [analysisTab, setAnalysisTab] = React.useState<AnalysisTab>("hub");
  const [syncTab, setSyncTab] = React.useState<SyncTab>("hub");

  const refreshActivities = React.useCallback(async () => setActivities(await listActivities(activitySport)), [activitySport]);
  React.useEffect(() => { saveOutdoorPerformanceSport(activitySport); void refreshActivities(); }, [activitySport, refreshActivities]);

  const stats = React.useMemo(() => buildRunningStats(activities, Date.now(), locale), [activities, locale]);
  const canonicalSport = canonicalOutdoorPerformanceSport(activitySport);
  const speedPrimary = outdoorUsesSpeedMetric(canonicalSport);
  const bestAverageSpeedKmh = activities.reduce((best, activity) => Math.max(best, outdoorAverageSpeedKmh(activity)), 0);
  const training = React.useMemo(() => buildTrainingStatus(activities), [activities]);
  const predictions = React.useMemo(() => racePredictions(stats), [stats]);
  const maxDay = Math.max(1000, ...stats.sevenDays.map((d) => d.distanceM));
  const sensorSummary = React.useMemo(() => buildSensorSummary(activities), [activities]);

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
    title: "STATS PERFORMANCE", sub: "Tes données outdoor, sans page interminable", total: "DISTANCE TOTALE", runs: "ACTIVITÉS", time: "TEMPS", climb: "D+", best: "MEILLEURE ALLURE", longest: "PLUS LONGUE", week: "7 DERNIERS JOURS", load: "CHARGE D’ENTRAÎNEMENT", freshness: "Préparation", acute: "Charge 7 j", ratio: "Ratio 7/28 j", records: "RECORDS PERSONNELS", predictions: "PRÉDICTIONS", gear: "ÉQUIPEMENT", addShoe: "AJOUTER UNE PAIRE", shoePlaceholder: "Nom de la paire…", mileage: "Kilométrage", wear: "Usure estimée", active: "ACTIVE", retired: "RETIRÉE", recent: "DERNIÈRES ACTIVITÉS", all: "VOIR TOUT", less: "RÉDUIRE", noRuns: "Aucune sortie enregistrée pour le moment.", info: "Organisation simplifiée : Aperçu pour la synthèse, Analyse pour les performances, Journal pour le calendrier et l’historique, Matériel pour l’équipement, Sync pour les capteurs et les échanges de données.", tabs: { overview: "APERÇU", performance: "ANALYSE", history: "JOURNAL", gear: "MATÉRIEL", sync: "SYNC" }
  } : lang === "es" ? {
    title: "STATS PERFORMANCE", sub: "Tus datos outdoor, sin una página interminable", total: "DISTANCIA TOTAL", runs: "ACTIVIDADES", time: "TIEMPO", climb: "D+", best: "MEJOR RITMO", longest: "MÁS LARGA", week: "ÚLTIMOS 7 DÍAS", load: "CARGA DE ENTRENAMIENTO", freshness: "Preparación", acute: "Carga 7 d", ratio: "Ratio 7/28 d", records: "RÉCORDS PERSONALES", predictions: "PREDICCIONES", gear: "EQUIPO", addShoe: "AÑADIR ZAPATILLAS", shoePlaceholder: "Nombre de las zapatillas…", mileage: "Kilometraje", wear: "Desgaste estimado", active: "ACTIVAS", retired: "RETIRADAS", recent: "ÚLTIMAS ACTIVIDADES", all: "VER TODO", less: "REDUCIR", noRuns: "Todavía no hay salidas guardadas.", info: "Organización simplificada: Resumen, Análisis, Diario, Material y Sync para sensores e intercambio de datos.", tabs: { overview: "RESUMEN", performance: "ANÁLISIS", history: "DIARIO", gear: "MATERIAL", sync: "SYNC" }
  } : {
    title: "PERFORMANCE STATS", sub: "Your outdoor data without an endless page", total: "TOTAL DISTANCE", runs: "ACTIVITIES", time: "TIME", climb: "ELEVATION", best: "BEST PACE", longest: "LONGEST", week: "LAST 7 DAYS", load: "TRAINING LOAD", freshness: "Readiness", acute: "7-day load", ratio: "7/28 ratio", records: "PERSONAL RECORDS", predictions: "PREDICTIONS", gear: "GEAR", addShoe: "ADD SHOES", shoePlaceholder: "Shoe name…", mileage: "Mileage", wear: "Estimated wear", active: "ACTIVE", retired: "RETIRED", recent: "RECENT ACTIVITIES", all: "VIEW ALL", less: "SHOW LESS", noRuns: "No activities saved yet.", info: "Simplified layout: Overview, Analysis, Journal, Gear and Sync for sensors and data exchange.", tabs: { overview: "OVERVIEW", performance: "ANALYSIS", history: "JOURNAL", gear: "GEAR", sync: "SYNC" }
  };
  const bestMetricLabel = speedPrimary ? (lang === "fr" ? "MEILLEURE VITESSE" : lang === "es" ? "MEJOR VELOCIDAD" : "BEST SPEED") : copy.best;
  const bestMetricValue = speedPrimary ? (bestAverageSpeedKmh > 0 ? `${bestAverageSpeedKmh.toFixed(1)} km/h` : "—") : `${formatPace(stats.bestPaceSecPerKm)}/km`;


  const pageTitle = tab === "overview" ? copy.tabs.overview : tab === "performance" ? copy.tabs.performance : tab === "history" ? copy.tabs.history : tab === "gear" ? copy.tabs.gear : tab === "sync" ? copy.tabs.sync : copy.title;
  const backFromPage = () => {
    if (tab === "performance" && analysisTab !== "hub") { setAnalysisTab("hub"); return; }
    if (tab === "sync" && syncTab !== "hub") { setSyncTab("hub"); return; }
    if (tab !== "hub") { setTab("hub"); return; }
    go("home");
  };

  return (
    <div className="container" style={{ maxWidth: 620, paddingBottom: 92 }}>
      <PageHeader title={pageTitle} subtitle={`${outdoorSportLabel(activitySport, String(lang || "fr"))}${tab === "hub" ? ` · ${copy.sub}` : ""}`} left={<BackDot onClick={backFromPage} />} right={<InfoDot title={copy.title} color={accent} glow={`${accent}88`} content={<div style={{ lineHeight: 1.55 }}>{copy.info}</div>} />} />
      {tab === "hub" ? <>
        <OutdoorActivitySelector value={activitySport} onChange={setActivitySport} lang={String(lang || "fr")} accent={accent} compact />
        <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
          <RunningHubCard title={copy.tabs.overview} subtitle={lang === "fr" ? "Synthèse, semaine et charge d’entraînement" : lang === "es" ? "Resumen, semana y carga de entrenamiento" : "Summary, week and training load"} icon={<RunningGlyph name="chart" size={20}/>} accent={accent} onClick={() => setTab("overview")}/>
          <RunningHubCard title={copy.tabs.performance} subtitle={lang === "fr" ? "Records, forme et terrain" : lang === "es" ? "Récords, forma y terreno" : "Records, fitness and terrain"} icon={<RunningGlyph name="spark" size={20}/>} accent={accent} onClick={() => { setAnalysisTab("hub"); setTab("performance"); }}/>
          <RunningHubCard title={copy.tabs.history} subtitle={lang === "fr" ? "Calendrier et dernières activités" : lang === "es" ? "Calendario y últimas actividades" : "Calendar and recent activities"} icon={<RunningGlyph name="history" size={20}/>} accent={accent} onClick={() => setTab("history")} badge={activities.length || undefined}/>
          <RunningHubCard title={copy.tabs.gear} subtitle={lang === "fr" ? "Chaussures et kilométrage" : lang === "es" ? "Zapatillas y kilometraje" : "Shoes and mileage"} icon={<RunningGlyph name="shoe" size={20}/>} accent={accent} onClick={() => setTab("gear")} badge={shoes.length || undefined}/>
          <RunningHubCard title={copy.tabs.sync} subtitle={lang === "fr" ? "Capteurs, Health Connect et fichiers" : lang === "es" ? "Sensores, Health Connect y archivos" : "Sensors, Health Connect and files"} icon={<RunningGlyph name="sensor" size={20}/>} accent={accent} onClick={() => { setSyncTab("hub"); setTab("sync"); }}/>
        </div>
      </> : null}

      {tab === "overview" ? <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <RunningMetricCard label={copy.total} value={formatDistance(stats.totalDistanceM)} accent={accent} icon="↗" />
          <RunningMetricCard label={copy.runs} value={String(stats.sessions)} accent={accent} icon="🏃" />
          <RunningMetricCard label={copy.time} value={formatDuration(stats.totalElapsedMs)} accent={accent} icon="◷" />
          <RunningMetricCard label={activitySport === "treadmill" ? (lang === "fr" ? "INCLINAISON MOY." : lang === "es" ? "INCLINACIÓN MEDIA" : "AVG INCLINE") : copy.climb} value={activitySport === "treadmill" ? (sensorSummary.avgInclinePercent == null ? "—" : `${sensorSummary.avgInclinePercent.toFixed(1)}%`) : `+${Math.round(stats.totalElevationM)} m`} accent={accent} icon={activitySport === "treadmill" ? "↗" : "▲"} />
          <RunningMetricCard label={bestMetricLabel} value={bestMetricValue} accent={accent} icon="⚡" />
          <RunningMetricCard label={copy.longest} value={formatDistance(stats.longestM)} accent={accent} icon="◎" />
        </div>

        <RunningSurface accent={accent} style={{ marginTop: 10 }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.week}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 6, alignItems: "end", minHeight: 112 }}>
            {stats.sevenDays.map((day) => {
              const h = Math.max(5, Math.round((day.distanceM / maxDay) * 74));
              return <div key={day.key} style={{ display: "grid", gap: 5, justifyItems: "center", alignSelf: "end" }}><div style={{ fontSize: 7.5, color: textSoft }}>{day.distanceM ? (day.distanceM / 1000).toFixed(1) : "·"}</div><div style={{ width: "72%", height: h, minHeight: 5, borderRadius: "8px 8px 4px 4px", background: `linear-gradient(180deg,${accent},${accent}45)`, boxShadow: day.distanceM ? `0 7px 16px ${accent}1c` : "none", border: day.distanceM ? `1px solid ${accent}25` : "none" }} /><div style={{ fontSize: 7.5, color: textSoft, textTransform: "uppercase" }}>{day.label.slice(0, 3)}</div></div>;
            })}
          </div>
        </RunningSurface>


        <RunningSurface accent={accent} style={{ marginTop: 10 }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.load}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            <Mini label={copy.freshness} value={`${training.freshnessScore}%`} accent={accent} />
            <Mini label={copy.acute} value={String(Math.round(training.acuteLoad7))} accent={accent} />
            <Mini label={copy.ratio} value={training.loadRatio == null ? "—" : training.loadRatio.toFixed(2)} accent={accent} />
          </div>
        </RunningSurface>
      </> : null}

      {tab === "performance" ? <>
        {analysisTab === "hub" ? <div style={{ display: "grid", gap: 9 }}>
          <RunningHubCard title={lang === "fr" ? "RECORDS" : lang === "es" ? "RÉCORDS" : "RECORDS"} subtitle={copy.predictions} icon={<RunningGlyph name="goal" size={19}/>} accent={accent} onClick={() => setAnalysisTab("records")}/>
          <RunningHubCard title={lang === "fr" ? "FORME" : lang === "es" ? "FORMA" : "FORM"} subtitle={lang === "fr" ? "Charge, capteurs et tendances" : lang === "es" ? "Carga, sensores y tendencias" : "Load, sensors and trends"} icon={<RunningGlyph name="heart" size={19}/>} accent={accent} onClick={() => setAnalysisTab("form")}/>
          <RunningHubCard title={lang === "fr" ? "TERRAIN" : lang === "es" ? "TERRENO" : "TERRAIN"} subtitle={lang === "fr" ? "Relief, côtes et endurance outdoor" : lang === "es" ? "Desnivel, cuestas y resistencia outdoor" : "Elevation, hills and outdoor endurance"} icon={<RunningGlyph name="sport-trail" size={19}/>} accent={accent} onClick={() => setAnalysisTab("terrain")}/>
        </div> : <RunningSubpageHeader title={analysisTab === "records" ? (lang === "fr" ? "RECORDS" : lang === "es" ? "RÉCORDS" : "RECORDS") : analysisTab === "form" ? (lang === "fr" ? "FORME" : lang === "es" ? "FORMA" : "FORM") : (lang === "fr" ? "TERRAIN" : lang === "es" ? "TERRENO" : "TERRAIN")} accent={accent} onBack={() => setAnalysisTab("hub")}/>} 

        {analysisTab === "records" ? <>
          <RunningSurface accent={accent} active>
            <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.records}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
              {recordRows.map(([label, row]) => <RunningMetricCard key={label} label={label} value={row ? formatDuration(row.elapsedMs) : "—"} accent={row ? accent : textSoft} icon="🏆" />)}
            </div>
          </RunningSurface>
          {predictions.length ? <RunningSurface accent={accent} style={{ marginTop: 10 }}>
            <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.predictions}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
              {predictions.map((p) => <RunningMetricCard key={p.distanceM} label={distanceName(p.distanceM)} value={formatDuration(p.predictedMs)} accent={accent} icon="◎" />)}
            </div>
          </RunningSurface> : null}
        </> : null}

        {analysisTab === "form" ? <>
          {sensorSummary.sampleCount ? <RunningSurface accent={accent} active>
            <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{lang === "fr" ? "CAPTEURS & PHYSIO" : lang === "es" ? "SENSORES Y FISIO" : "SENSORS & PHYSIO"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
              <RunningMetricCard label={lang === "fr" ? "FC MOY." : lang === "es" ? "FC MEDIA" : "AVG HR"} value={sensorSummary.avgHeartRateBpm == null ? "—" : `${Math.round(sensorSummary.avgHeartRateBpm)} bpm`} accent={accent} icon="❤️" />
              <RunningMetricCard label={lang === "fr" ? "FC MAX" : "MAX HR"} value={sensorSummary.maxHeartRateBpm == null ? "—" : `${Math.round(sensorSummary.maxHeartRateBpm)} bpm`} accent={accent} icon="♥" />
              <RunningMetricCard label={lang === "fr" ? "CADENCE MOY." : lang === "es" ? "CADENCIA MEDIA" : "AVG CADENCE"} value={sensorSummary.avgCadenceSpm == null ? "—" : `${Math.round(sensorSummary.avgCadenceSpm)} spm`} accent={accent} icon="🦶" />
              {activitySport === "treadmill" ? <RunningMetricCard label={lang === "fr" ? "INCLINAISON MOY." : lang === "es" ? "INCLINACIÓN MEDIA" : "AVG INCLINE"} value={sensorSummary.avgInclinePercent == null ? "—" : `${sensorSummary.avgInclinePercent.toFixed(1)}%`} accent={accent} icon="↗" /> : <RunningMetricCard label={lang === "fr" ? "ACTIVITÉS CAPTEUR" : lang === "es" ? "ACTIVIDADES SENSOR" : "SENSOR ACTIVITIES"} value={String(sensorSummary.activitiesWithSensors)} accent={accent} icon="⌚" />}
              {activitySport === "treadmill" ? <RunningMetricCard label={lang === "fr" ? "VITESSE CAPTEUR" : lang === "es" ? "VELOCIDAD SENSOR" : "SENSOR SPEED"} value={sensorSummary.avgSensorSpeedMps == null ? "—" : `${(sensorSummary.avgSensorSpeedMps * 3.6).toFixed(1)} km/h`} accent={accent} icon="⚡" /> : null}
            </div>
          </RunningSurface> : <RunningSurface accent={accent} active><div style={{ color: textSoft, fontSize: 9, lineHeight: 1.45 }}>{lang === "fr" ? "Les données de forme et capteurs apparaîtront ici dès qu’une activité contient du cardio, de la cadence ou des mesures connectées." : lang === "es" ? "Los datos de forma y sensores aparecerán aquí cuando una actividad contenga pulso, cadencia o medidas conectadas." : "Fitness and sensor data will appear here once an activity contains heart rate, cadence or connected measurements."}</div></RunningSurface>}
          <RunningPerformanceInsightsPanel activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
        </> : null}

        {analysisTab === "terrain" ? <>
          <RunningTerrainStatsPanel activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
          <OutdoorAdventureStatsPanel activities={activities} sport={activitySport} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
        </> : null}
      </> : null}

      {tab === "history" ? <>
        <RunningActivityCalendar activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} />
        <RunningSurface accent={accent} active style={{ marginTop: 10 }}>
        <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.recent}</div>
        {activities.length ? <div style={{ display: "grid", gap: 7 }}>
          {(showAll ? activities : activities.slice(0, 8)).map((a) => {
            const sport = canonicalOutdoorPerformanceSport(a.sport);
            const icon = sport === "trail" ? "⛰️" : sport === "hiking" ? "🥾" : sport === "walking" ? "🚶" : sport === "treadmill" ? "🏃‍♂️" : "🏃";
            return <button type="button" key={a.id} onClick={() => go("games", { runningView: "detail", runningActivityId: a.id, runningActivitySport: sport })} style={{ width: "100%", padding: 11, color: "inherit", textAlign: "left", cursor: "pointer", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(145deg,rgba(255,255,255,.035),rgba(0,0,0,.18))", boxShadow: "0 8px 18px rgba(0,0,0,.18)", display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, background: `${accent}12`, border: `1px solid ${accent}25`, fontSize: 18 }}>{icon}</div>
              <div><div style={{ color: accent, fontSize: 7.5, fontWeight: 1000 }}>{outdoorSportLabel(sport, String(lang || "fr")).toUpperCase()}</div><div style={{ fontSize: 10, fontWeight: 1000 }}>{a.title || runType(a)}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft }}>{new Date(a.startedAt).toLocaleDateString(locale)} · {formatDistance(a.distanceM)} · {formatDuration(a.elapsedMs)}{a.source === "health-connect" ? " · HEALTH CONNECT" : a.source === "garmin" ? " · GARMIN" : a.source === "fit" ? " · FIT" : a.source === "gpx" ? " · GPX" : a.source === "tcx" ? " · TCX" : ""}</div></div>
              <div style={{ color: accent, fontSize: 10, fontWeight: 1000, textAlign: "right" }}>{outdoorAverageMetricValue(a, sport)}<small style={{ display: "block", fontSize: 7 }}>{outdoorAverageMetricLabel(sport, String(lang || "fr"))}</small><div style={{ marginTop: 2, opacity: .55 }}>›</div></div>
            </button>;
          })}
          {activities.length > 8 ? <button className="btn" onClick={() => setShowAll((value) => !value)} style={{ width: "100%", minHeight: 42, marginTop: 2, fontWeight: 1000 }}>{showAll ? copy.less : copy.all}</button> : null}
        </div> : <div style={{ padding: 18, textAlign: "center", color: textSoft, fontSize: 10 }}>{copy.noRuns}</div>}
      </RunningSurface></> : null}

      {tab === "gear" ? <RunningSurface accent={accent} active>
        <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 8 }}>{copy.gear}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}>
          <input value={newShoeName} onChange={(event) => setNewShoeName(event.target.value.slice(0, 48))} onKeyDown={(event) => { if (event.key === "Enter") addShoe(); }} placeholder={copy.shoePlaceholder} style={{ minWidth: 0, minHeight: 42, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)", color: "inherit", padding: "0 11px", font: "inherit", fontSize: 10, outline: "none", boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" }} />
          <button className="btn" onClick={addShoe} disabled={!newShoeName.trim()} style={{ minHeight: 42, fontWeight: 1000, fontSize: 9 }}>{copy.addShoe}</button>
        </div>
        {shoes.length ? <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{shoes.map((shoe) => { const distanceM = shoeDistanceM(shoe.id, activities); const wearPct = shoeWearPct(shoe, activities); return <RunningSurface key={shoe.id} accent={accent} padding={10} style={{ opacity: shoe.retired ? .62 : 1 }}><div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 13, background: `${accent}12`, border: `1px solid ${accent}25`, fontSize: 20 }}>👟</div><div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{shoe.name}</div><div style={{ marginTop: 3, fontSize: 8.5, color: textSoft }}>{copy.mileage}: {formatDistance(distanceM)} · {copy.wear}: {Math.round(wearPct)}%</div></div><button className="btn" onClick={() => toggleRetired(shoe.id)} style={{ minHeight: 32, padding: "4px 7px", fontSize: 8, fontWeight: 1000, color: shoe.retired ? textSoft : accent, borderColor: shoe.retired ? undefined : `${accent}66` }}>{shoe.retired ? copy.retired : copy.active}</button></div><div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", marginTop: 8 }}><div style={{ height: "100%", width: `${wearPct}%`, borderRadius: 999, background: wearPct >= 90 ? "#ff716f" : wearPct >= 70 ? "#f6c256" : accent, transition: "width .25s ease", boxShadow: `0 0 12px ${accent}22` }}/></div></RunningSurface>; })}</div> : <div style={{ padding: "18px 2px 2px", textAlign: "center", color: textSoft, fontSize: 9.2 }}>{lang === "fr" ? "Ajoute ta première paire pour suivre son kilométrage sortie après sortie." : lang === "es" ? "Añade tus primeras zapatillas para seguir su kilometraje carrera tras carrera." : "Add your first pair to track mileage run after run."}</div>}
      </RunningSurface> : null}

      {tab === "sync" ? <>
        {syncTab === "hub" ? <div style={{ display: "grid", gap: 9 }}>
          <RunningHubCard title={lang === "fr" ? "CAPTEURS & APPLIS" : lang === "es" ? "SENSORES Y APPS" : "SENSORS & APPS"} subtitle={lang === "fr" ? "BLE, Health Connect, Garmin et connexions" : lang === "es" ? "BLE, Health Connect, Garmin y conexiones" : "BLE, Health Connect, Garmin and connections"} icon={<RunningGlyph name="sensor" size={19}/>} accent={accent} onClick={() => setSyncTab("connections")}/>
          <RunningHubCard title={lang === "fr" ? "FICHIERS" : lang === "es" ? "ARCHIVOS" : "FILES"} subtitle="FIT · GPX · TCX" icon={<RunningGlyph name="files" size={19}/>} accent={accent} onClick={() => setSyncTab("files")}/>
        </div> : <RunningSubpageHeader title={syncTab === "connections" ? (lang === "fr" ? "CAPTEURS & APPLIS" : lang === "es" ? "SENSORES Y APPS" : "SENSORS & APPS") : (lang === "fr" ? "FICHIERS" : lang === "es" ? "ARCHIVOS" : "FILES")} accent={accent} onBack={() => setSyncTab("hub")}/>} 
        {syncTab === "connections" ? <RunningSurface accent={accent} active><RunningConnectionsPanel lang={String(lang || "fr")} accent={accent} textSoft={textSoft} onActivitiesChanged={refreshActivities} /></RunningSurface> : null}
        {syncTab === "files" ? <RunningSurface accent={accent} active><RunningDataToolsPanel activities={activities} lang={String(lang || "fr")} accent={accent} textSoft={textSoft} onActivitiesChanged={refreshActivities} selectedSport={activitySport} /></RunningSurface> : null}
      </> : null}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ padding: 10, textAlign: "center", borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", boxShadow: "0 8px 16px rgba(0,0,0,.15)" }}><div style={{ color: accent, fontSize: 17, fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 3, fontSize: 8, opacity: .58 }}>{label}</div></div>; }
function distanceName(m: number) { if (Math.abs(m - 21097) < 100) return "SEMI"; if (Math.abs(m - 42195) < 100) return "MARATHON"; return `${Math.round(m / 1000)} KM`; }
function runType(a: ActivityRecord) { return a.workoutType === "intervals" ? "INTERVALLES" : a.workoutType === "hills" ? "CÔTES" : a.workoutType === "tempo" ? "TEMPO" : a.workoutType === "long" ? "SORTIE LONGUE" : a.workoutType === "pacer" ? "PACER" : "RUNNING"; }
