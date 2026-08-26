import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { buildFitRecords, completedSets, formatDuration, formatKg, formatVolume, loadFitSessions, sessionDurationMs, sessionVolume, sessionsSince, weekStart } from "../../fit/fitStore";
import { FitGlassCard, FitMetric, FitMiniBars, FitPill, FitSectionTitle, FitShell } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void; params?: any };

export default function FitPerfStatsPage({ go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [sessions, setSessions] = React.useState(() => loadFitSessions());
  React.useEffect(() => { const refresh = () => setSessions(loadFitSessions()); window.addEventListener("dc:fit-session-saved", refresh as EventListener); return () => window.removeEventListener("dc:fit-session-saved", refresh as EventListener); }, []);

  const week = sessionsSince(sessions, weekStart());
  const month = sessionsSince(sessions, Date.now() - 28 * 86400000);
  const records = buildFitRecords(sessions);
  const weekVolume = week.reduce((sum, session) => sum + sessionVolume(session), 0);
  const monthVolume = month.reduce((sum, session) => sum + sessionVolume(session), 0);
  const totalDuration = month.reduce((sum, session) => sum + sessionDurationMs(session), 0);
  const totalSetsMonth = month.reduce((sum, session) => sum + completedSets(session), 0);
  const weeklyHistory = Array.from({ length: 8 }, (_, offset) => {
    const start = weekStart(Date.now() - (7 - offset) * 7 * 86400000);
    const end = start + 7 * 86400000;
    return sessions.filter((session) => { const ts = session.endedAt || session.startedAt; return ts >= start && ts < end; }).reduce((sum, session) => sum + sessionVolume(session), 0);
  });

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <FitGlassCard accent={accent} style={{ marginTop: 8, padding: 18, borderRadius: 26, background: "linear-gradient(145deg,rgba(8,11,17,.98),rgba(16,19,29,.97))" }}>
        <FitPill accent={accent}>FIT PERF · STATS</FitPill>
        <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000, letterSpacing: -1 }}>{t("Analyse ta progression", "Analyze your progress", "Analiza tu progreso")}</div>
        <div style={{ marginTop: 6, color: textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{t("Volume, régularité, records et historique : tout est calculé à partir des séries réellement validées.", "Volume, consistency, records and history are calculated from completed sets.", "Volumen, regularidad, récords e historial se calculan a partir de las series completadas.")}</div>
      </FitGlassCard>

      <FitSectionTitle eyebrow={t("28 DERNIERS JOURS", "LAST 28 DAYS", "ÚLTIMOS 28 DÍAS")} title={t("Tableau de bord", "Dashboard", "Panel")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <FitMetric label={t("Séances", "Sessions", "Sesiones")} value={month.length} sub={`${week.length} ${t("cette semaine", "this week", "esta semana")}`} accent={accent}/>
        <FitMetric label={t("Volume", "Volume", "Volumen")} value={formatVolume(monthVolume)} sub={`${formatVolume(weekVolume)} ${t("cette semaine", "this week", "esta semana")}`} accent="#76e4f7"/>
        <FitMetric label={t("Séries", "Sets", "Series")} value={totalSetsMonth} sub={t("validées", "completed", "completadas")} accent="#75ed9a"/>
        <FitMetric label={t("Temps", "Time", "Tiempo")} value={formatDuration(totalDuration)} sub={t("d'entraînement", "training", "de entrenamiento")} accent="#b59cff"/>
      </div>

      <FitSectionTitle eyebrow={t("TENDANCE", "TREND", "TENDENCIA")} title={t("Volume sur 8 semaines", "8-week volume", "Volumen de 8 semanas")} />
      <FitGlassCard accent="#76e4f7" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={{ color: textSoft, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>VOLUME ACTUEL</div><div style={{ marginTop: 5, fontSize: 25, fontWeight: 1000 }}>{formatVolume(weeklyHistory[weeklyHistory.length - 1] || 0)}</div></div><FitPill accent="#76e4f7">8 SEM.</FitPill></div>
        <div style={{ marginTop: 13 }}><FitMiniBars values={weeklyHistory} accent="#76e4f7" height={100}/></div>
      </FitGlassCard>

      <FitSectionTitle eyebrow={t("RECORDS PERSONNELS", "PERSONAL RECORDS", "RÉCORDS PERSONALES")} title={t("Classement des 1RM estimés", "Estimated 1RM ranking", "Ranking 1RM estimado")} right={<FitPill accent="#b59cff">{records.length} PR</FitPill>} />
      <FitGlassCard accent="#b59cff" style={{ padding: 14 }}>
        {records.length ? <div style={{ display: "grid", gap: 7 }}>{records.map((record, index) => <div key={record.exerciseId} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", color: index < 3 ? accent : textSoft, background: index < 3 ? `${accent}10` : "rgba(255,255,255,.03)", border: `1px solid ${index < 3 ? accent + "30" : "rgba(255,255,255,.06)"}`, fontWeight: 1000 }}>{index + 1}</div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{record.exerciseName}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{formatKg(record.weightKg)} × {record.reps} reps</div></div><div style={{ textAlign: "right" }}><div style={{ color: "#b59cff", fontSize: 13, fontWeight: 1000 }}>{formatKg(record.oneRm)}</div><div style={{ color: textSoft, fontSize: 8 }}>1RM EST.</div></div></div>)}</div> : <div style={{ padding: "24px 12px", textAlign: "center", color: textSoft, fontSize: 10, lineHeight: 1.5 }}>{t("Aucun record enregistré. Termine une séance pour alimenter automatiquement cette section.", "No records yet. Finish a workout to populate this section automatically.", "Aún no hay récords. Termina una sesión para completar esta sección automáticamente.")}</div>}
      </FitGlassCard>

      <FitSectionTitle eyebrow={t("HISTORIQUE", "HISTORY", "HISTORIAL")} title={t("Toutes les séances", "All workouts", "Todas las sesiones")} />
      <FitGlassCard accent={accent} style={{ padding: 14 }}>
        {sessions.length ? <div style={{ display: "grid", gap: 8 }}>{sessions.map((session) => <button key={session.id} type="button" onClick={() => go("games", { fitView: "history", fitSessionId: session.id })} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, alignItems: "center", minHeight: 62, padding: "8px 10px", textAlign: "left", color: "#fff", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)", cursor: "pointer" }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}10`, border: `1px solid ${accent}32`, fontWeight: 1000 }}>◆</div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{session.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{new Date(session.endedAt || session.startedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} · {formatDuration(sessionDurationMs(session))} · {completedSets(session)} séries</div></div><b style={{ color: accent, fontSize: 10.5 }}>{formatVolume(sessionVolume(session))}</b></button>)}</div> : <div style={{ padding: "24px 12px", textAlign: "center", color: textSoft, fontSize: 10 }}>{t("Aucune séance enregistrée pour le moment.", "No workouts recorded yet.", "Aún no hay sesiones registradas.")}</div>}
      </FitGlassCard>
    </FitShell>
  </div>;
}
