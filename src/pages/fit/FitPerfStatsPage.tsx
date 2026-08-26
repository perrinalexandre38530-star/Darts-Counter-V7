import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import BackDot from "../../components/BackDot";
import {
  buildFitProfileSummary,
  buildFitRecords,
  completedSets,
  fitSessionsForProfile,
  formatDuration,
  formatKg,
  formatVolume,
  loadFitSessions,
  sessionDurationMs,
  sessionVolume,
  sessionsSince,
  weekStart,
} from "../../fit/fitStore";
import { FitGlassCard, FitIcon, FitIconTabs, FitMetric, FitMiniBars, FitPill, FitProgress, FitRing, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };
type Tab = "overview" | "volume" | "strength" | "frequency" | "history";

export default function FitPerfStatsPage({ go, params, store }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeProfile = profiles.find((p: any) => String(p?.id || "") === String(params?.playerId || params?.initialPlayerId || store?.activeProfileId || "")) || profiles[0] || null;
  const [sessions, setSessions] = React.useState(() => loadFitSessions());
  const [tab, setTab] = React.useState<Tab>(() => params?.fitView === "history" ? "history" : params?.fitView === "progress" ? "volume" : "overview");

  React.useEffect(() => {
    const refresh = () => setSessions(loadFitSessions());
    window.addEventListener("dc:fit-session-saved", refresh as EventListener);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("dc:fit-session-saved", refresh as EventListener); window.removeEventListener("focus", refresh); };
  }, []);

  const scoped = fitSessionsForProfile(sessions, activeProfile?.id);
  const summary = buildFitProfileSummary(sessions, activeProfile?.id);
  const week = sessionsSince(scoped, weekStart());
  const month = sessionsSince(scoped, Date.now() - 28 * 86400000);
  const records = buildFitRecords(scoped);
  const monthVolume = month.reduce((sum, session) => sum + sessionVolume(session), 0);
  const monthSets = month.reduce((sum, session) => sum + completedSets(session), 0);
  const monthDuration = month.reduce((sum, session) => sum + sessionDurationMs(session, session.endedAt || session.startedAt), 0);
  const weeklyBars = Array.from({ length: 8 }, (_, offset) => {
    const start = weekStart(Date.now() - (7 - offset) * 7 * 86400000);
    const end = start + 7 * 86400000;
    return scoped.filter((session) => { const ts = session.endedAt || session.startedAt; return ts >= start && ts < end; }).reduce((sum, session) => sum + sessionVolume(session), 0);
  });
  const frequencyBars = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - offset));
    const start = date.getTime(), end = start + 86400000;
    return scoped.filter((s) => { const ts = s.endedAt || s.startedAt; return ts >= start && ts < end; }).length;
  });

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <style>{fitUiCss}</style>
      <div style={{ position: "relative", borderRadius: 26, padding: 17, background: "linear-gradient(145deg,rgba(8,11,17,.98),rgba(16,19,29,.97))", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 18px 40px rgba(0,0,0,.55)" }}>
        <div style={{ position: "absolute", left: 10, top: 10 }}><BackDot onClick={() => go("stats")}/></div>
        <div style={{ textAlign: "center" }}><FitPill accent={accent}>FIT PERF · STATS</FitPill><div style={{ marginTop: 10, fontSize: 27, fontWeight: 1000, letterSpacing: -.8 }}>{t("Centre de performance", "Performance center", "Centro de rendimiento")}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 9.5 }}>{activeProfile?.name || t("Profil actif", "Active profile", "Perfil activo")}</div></div>
      </div>

      <div style={{ marginTop: 10 }}><FitIconTabs<Tab> value={tab} onChange={setTab} accent={accent} items={[
        { id: "overview", label: t("Vue", "Overview", "Vista"), icon: "home" },
        { id: "volume", label: t("Volume", "Volume", "Volumen"), icon: "volume" },
        { id: "strength", label: t("Force", "Strength", "Fuerza"), icon: "strength" },
        { id: "frequency", label: t("Fréquence", "Frequency", "Frecuencia"), icon: "today" },
        { id: "history", label: t("Historique", "History", "Historial"), icon: "history", badge: scoped.length || undefined },
      ]}/></div>

      {tab === "overview" ? <>
        <FitSectionTitle eyebrow={t("28 DERNIERS JOURS", "LAST 28 DAYS", "ÚLTIMOS 28 DÍAS")} title={t("Tableau de bord", "Dashboard", "Panel")}/>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 9, alignItems: "stretch" }}><FitGlassCard accent={accent} style={{ padding: 8, display: "grid", placeItems: "center" }}><FitRing value={summary.score} label="FIT SCORE" accent={accent} size={82}/></FitGlassCard><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><FitMetric label={t("Séances", "Sessions", "Sesiones")} value={month.length} sub={`${week.length} ${t("cette semaine", "this week", "esta semana")}`} accent={accent}/><FitMetric label={t("Volume", "Volume", "Volumen")} value={formatVolume(monthVolume)} accent="#72def4"/><FitMetric label={t("Séries", "Sets", "Series")} value={monthSets} accent="#75ed9a"/><FitMetric label={t("Temps", "Time", "Tiempo")} value={formatDuration(monthDuration)} accent="#b59cff"/></div></div>
        <FitSectionTitle eyebrow={t("RECORDS", "RECORDS", "RÉCORDS")} title={t("Meilleures performances", "Best performances", "Mejores rendimientos")}/>
        <div style={{ display: "grid", gap: 7 }}>{records.slice(0, 5).map((r, i) => <FitGlassCard key={r.exerciseId} accent={i === 0 ? accent : "#b59cff"} style={{ padding: 11, display: "grid", gridTemplateColumns: "38px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}12` }}><FitIcon name="records" size={19}/></div><div><div style={{ fontSize: 11, fontWeight: 950 }}>{r.exerciseName}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{formatKg(r.weightKg)} × {r.reps}</div></div><b style={{ color: "#b59cff", fontSize: 10.5 }}>1RM {formatKg(r.oneRm)}</b></FitGlassCard>)}</div>
      </> : null}

      {tab === "volume" ? <><FitSectionTitle eyebrow={t("8 SEMAINES", "8 WEEKS", "8 SEMANAS")} title={t("Évolution du volume", "Volume evolution", "Evolución del volumen")}/><FitGlassCard accent="#72def4" style={{ padding: 14 }}><FitMiniBars values={weeklyBars} accent="#72def4" height={130}/><div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 8.5 }}><span>S-7</span><span>{t("Cette semaine", "This week", "Esta semana")}</span></div></FitGlassCard><FitSectionTitle eyebrow={t("TOTAL", "TOTAL", "TOTAL")} title={t("Charge déplacée", "Load moved", "Carga movida")}/><FitGlassCard accent="#72def4" style={{ padding: 16 }}><div style={{ color: "#72def4", fontSize: 30, fontWeight: 1000 }}>{formatVolume(summary.volumeKg)}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 9.5 }}>{summary.sessions} {t("séances enregistrées", "saved workouts", "sesiones guardadas")}</div></FitGlassCard></> : null}

      {tab === "strength" ? <><FitSectionTitle eyebrow="1RM" title={t("Force estimée par exercice", "Estimated strength per exercise", "Fuerza estimada por ejercicio")}/><div style={{ display: "grid", gap: 8 }}>{records.map((r) => <FitGlassCard key={r.exerciseId} accent="#b59cff" style={{ padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{r.exerciseName}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{formatKg(r.weightKg)} × {r.reps}</div></div><div style={{ textAlign: "right" }}><div style={{ color: "#b59cff", fontSize: 16, fontWeight: 1000 }}>{formatKg(r.oneRm)}</div><div style={{ color: textSoft, fontSize: 7.5 }}>1RM EST.</div></div></div></FitGlassCard>)}{!records.length ? <FitGlassCard accent="#b59cff" style={{ padding: 22, textAlign: "center", color: textSoft }}>{t("Aucun record de force pour le moment.", "No strength record yet.", "Aún no hay récord de fuerza.")}</FitGlassCard> : null}</div></> : null}

      {tab === "frequency" ? <><FitSectionTitle eyebrow={t("7 JOURS", "7 DAYS", "7 DÍAS")} title={t("Fréquence d’entraînement", "Training frequency", "Frecuencia de entrenamiento")}/><FitGlassCard accent="#75ed9a" style={{ padding: 14 }}><FitMiniBars values={frequencyBars} accent="#75ed9a" height={110}/><div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 8.5 }}><span>J-6</span><span>{t("Aujourd'hui", "Today", "Hoy")}</span></div></FitGlassCard><FitSectionTitle eyebrow={t("OBJECTIF", "GOAL", "OBJETIVO")} title={t("Régularité hebdomadaire", "Weekly consistency", "Regularidad semanal")}/><FitGlassCard accent={accent} style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><b style={{ fontSize: 17 }}>{summary.weekSessions}/3</b><div style={{ marginTop: 4, color: textSoft, fontSize: 9 }}>{t("séances cette semaine", "sessions this week", "sesiones esta semana")}</div></div><FitRing value={Math.min(100, summary.weekSessions / 3 * 100)} label="GOAL" accent={accent} size={72}/></div></FitGlassCard></> : null}

      {tab === "history" ? <><FitSectionTitle eyebrow={t("SÉANCES", "WORKOUTS", "SESIONES")} title={t("Historique FIT PERF", "FIT PERF history", "Historial FIT PERF")}/><div style={{ display: "grid", gap: 8 }}>{scoped.map((s) => <FitGlassCard key={s.id} accent={accent} style={{ padding: 12, display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 9, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}12` }}><FitIcon name="history" size={19}/></div><div><div style={{ fontSize: 11, fontWeight: 950 }}>{s.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.2 }}>{new Date(s.endedAt || s.startedAt).toLocaleString()} · {completedSets(s)} {t("séries", "sets", "series")}</div></div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 10.5, fontWeight: 1000 }}>{formatVolume(sessionVolume(s))}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 7.5 }}>{formatDuration(sessionDurationMs(s, s.endedAt || s.startedAt))}</div></div></FitGlassCard>)}{!scoped.length ? <FitGlassCard accent={accent} style={{ padding: 24, textAlign: "center", color: textSoft }}>{t("Aucune séance enregistrée.", "No saved workout.", "No hay sesiones guardadas.")}</FitGlassCard> : null}</div></> : null}
    </FitShell>
  </div>;
}
