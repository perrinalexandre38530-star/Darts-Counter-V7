import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import {
  buildFitRecords,
  completedSets,
  formatDuration,
  formatKg,
  formatVolume,
  loadFitSessions,
  sessionDurationMs,
  sessionVolume,
  sessionsSince,
  weekStart,
  type FitSession,
} from "../../fit/fitStore";
import { FitGlassCard, FitHeroMark, FitMetric, FitMiniBars, FitPill, FitPrimaryButton, FitProgress, FitRing, FitSectionTitle, FitShell } from "./FitPerfUi";

type Props = { store?: any; go: (route: any, params?: any) => void };

function activeProfileName(store: any) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = String(store?.activeProfileId || "");
  const profile = profiles.find((item: any) => String(item?.id || "") === activeId) || profiles[0];
  return String(profile?.name || profile?.displayName || profile?.pseudo || "ATHLÈTE");
}

function weeklyVolumes(sessions: FitSession[]) {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const start = date.getTime();
    const end = start + 86400000;
    return sessions.filter((session) => {
      const ts = session.endedAt || session.startedAt;
      return ts >= start && ts < end;
    }).reduce((sum, session) => sum + sessionVolume(session), 0);
  });
}

function muscleSummary(sessions: FitSession[]) {
  const counts = new Map<string, number>();
  for (const session of sessions.slice(0, 20)) {
    for (const exercise of session.exercises) {
      const done = exercise.sets.filter((set) => set.completed).length;
      if (!done) continue;
      const key = exercise.exerciseId;
      counts.set(key, (counts.get(key) || 0) + done);
    }
  }
  const groups = [
    { label: "PUSH", ids: ["bench", "incline-db", "cable-fly", "ohp", "lateral-raise", "triceps-push"], accent: "#f6c256" },
    { label: "PULL", ids: ["pullup", "row", "lat-pulldown", "curl", "rdl"], accent: "#72def4" },
    { label: "LEGS", ids: ["squat", "leg-press", "rdl", "hip-thrust", "calf", "goblet"], accent: "#74ef9b" },
  ];
  const raw = groups.map((group) => ({ ...group, value: group.ids.reduce((sum, id) => sum + (counts.get(id) || 0), 0) }));
  const max = Math.max(1, ...raw.map((item) => item.value));
  return raw.map((item) => ({ ...item, pct: Math.round((item.value / max) * 100) }));
}

export default function FitPerfHome({ store, go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ea4af";
  const [sessions, setSessions] = React.useState<FitSession[]>(() => loadFitSessions());

  React.useEffect(() => {
    const refresh = () => setSessions(loadFitSessions());
    window.addEventListener("focus", refresh);
    window.addEventListener("dc:fit-session-saved", refresh as EventListener);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("dc:fit-session-saved", refresh as EventListener);
    };
  }, []);

  const weekSessions = sessionsSince(sessions, weekStart());
  const weekVolume = weekSessions.reduce((sum, session) => sum + sessionVolume(session), 0);
  const weekSets = weekSessions.reduce((sum, session) => sum + completedSets(session), 0);
  const totalVolume = sessions.reduce((sum, session) => sum + sessionVolume(session), 0);
  const totalSets = sessions.reduce((sum, session) => sum + completedSets(session), 0);
  const records = buildFitRecords(sessions);
  const bestRecord = records[0];
  const weeklyGoal = 3;
  const goalPct = Math.min(100, (weekSessions.length / weeklyGoal) * 100);
  const consistency = Math.min(100, Math.round((sessionsSince(sessions, Date.now() - 28 * 86400000).length / 12) * 100));
  const performanceScore = sessions.length ? Math.min(99, Math.round(goalPct * .45 + consistency * .35 + Math.min(100, records.length * 7) * .2)) : 0;
  const bars = weeklyVolumes(sessions);
  const muscles = muscleSummary(sessions);
  const profileName = activeProfileName(store);
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);

  return (
    <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
      <FitShell>
        <style>{`@keyframes fitGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}} @keyframes fitRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <FitGlassCard accent={accent} style={{ marginTop: 8, padding: 18, borderRadius: 28, background: "linear-gradient(145deg, rgba(8,11,17,.98), rgba(15,18,27,.96))", animation: "fitRise .35s ease both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 14 }}>
            <FitHeroMark accent={accent} size={82} />
            <div style={{ minWidth: 0 }}>
              <FitPill accent={accent}>{t("NOUVEAU MODULE PERFORMANCE", "NEW PERFORMANCE MODULE", "NUEVO MÓDULO PERFORMANCE")}</FitPill>
              <div style={{ marginTop: 10, fontSize: "clamp(28px, 8vw, 42px)", fontWeight: 1000, lineHeight: .9, letterSpacing: -1.8, backgroundImage: `linear-gradient(120deg, ${accent}, #fff 48%, ${accent})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", color: "transparent", animation: "fitGlow 3.8s ease-in-out infinite" }}>FIT PERF</div>
              <div style={{ marginTop: 8, color: textSoft, fontSize: 11, lineHeight: 1.35 }}>{t("Musculation · séries · charges · records · progression", "Strength · sets · loads · records · progress", "Fuerza · series · cargas · récords · progreso")}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.2, color: textSoft }}>{t("PROFIL ACTIF", "ACTIVE PROFILE", "PERFIL ACTIVO")}</div>
              <div style={{ marginTop: 3, fontSize: 14, fontWeight: 950 }}>{profileName}</div>
            </div>
            <FitPill accent="#77ee9b">● {t("PRÊT À S'ENTRAÎNER", "READY TO TRAIN", "LISTO PARA ENTRENAR")}</FitPill>
          </div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("CENTRE DE PERFORMANCE", "PERFORMANCE CENTER", "CENTRO DE RENDIMIENTO")} title={t("Ta semaine en un coup d'œil", "Your week at a glance", "Tu semana de un vistazo")} />
        <FitGlassCard accent={accent} style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 14, alignItems: "center" }}>
            <FitRing value={performanceScore} label="FIT SCORE" accent={accent} size={90} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <FitMetric label={t("Séances", "Sessions", "Sesiones")} value={`${weekSessions.length}/${weeklyGoal}`} sub={t("cette semaine", "this week", "esta semana")} accent={accent} />
              <FitMetric label={t("Volume", "Volume", "Volumen")} value={formatVolume(weekVolume)} sub={t("cette semaine", "this week", "esta semana")} accent="#76e4f7" />
              <FitMetric label={t("Séries", "Sets", "Series")} value={weekSets} sub={t("validées", "completed", "completadas")} accent="#75ed9a" />
              <FitMetric label={t("Records", "Records", "Récords")} value={records.length} sub={t("exercices", "exercises", "ejercicios")} accent="#b59cff" />
            </div>
          </div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("ENTRAÎNEMENT", "TRAINING", "ENTRENAMIENTO")} title={t("Lance ta séance", "Start your workout", "Inicia tu sesión")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
          <QuickCard accent={accent} icon="＋" title={t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE")} sub={t("Construis ta séance au fil de l'entraînement", "Build your workout as you train", "Construye tu sesión al entrenar")} onClick={() => go("games", { fitTemplateId: "free" })} featured />
          <QuickCard accent="#f0b04e" icon="P" title="PUSH" sub={t("Pectoraux · épaules · triceps", "Chest · shoulders · triceps", "Pecho · hombros · tríceps")} onClick={() => go("games", { fitTemplateId: "push" })} />
          <QuickCard accent="#70def4" icon="R" title="PULL" sub={t("Dos · biceps · chaîne postérieure", "Back · biceps · posterior chain", "Espalda · bíceps · cadena posterior")} onClick={() => go("games", { fitTemplateId: "pull" })} />
          <QuickCard accent="#74ed99" icon="L" title="LEGS" sub={t("Quadriceps · ischios · fessiers", "Quads · hamstrings · glutes", "Cuádriceps · isquios · glúteos")} onClick={() => go("games", { fitTemplateId: "legs" })} />
        </div>
        <FitPrimaryButton onClick={() => go("games", { fitTemplateId: "free" })} accent={accent} style={{ width: "100%", marginTop: 10, minHeight: 58, fontSize: 13 }}>＋ {t("DÉMARRER UNE SÉANCE", "START A WORKOUT", "INICIAR UNA SESIÓN")}</FitPrimaryButton>

        <FitSectionTitle eyebrow={t("OBJECTIF", "GOAL", "OBJETIVO")} title={t("Régularité hebdomadaire", "Weekly consistency", "Regularidad semanal")} right={<FitPill accent={goalPct >= 100 ? "#74ed99" : accent}>{Math.round(goalPct)}%</FitPill>} />
        <FitGlassCard accent={goalPct >= 100 ? "#74ed99" : accent} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 1000, lineHeight: 1 }}>{weekSessions.length}<span style={{ fontSize: 13, color: textSoft }}> / {weeklyGoal} {t("séances", "sessions", "sesiones")}</span></div>
              <div style={{ marginTop: 6, fontSize: 10.5, color: textSoft }}>{goalPct >= 100 ? t("Objectif atteint. Continue sur cette dynamique.", "Goal reached. Keep the momentum.", "Objetivo alcanzado. Mantén el ritmo.") : t("Encore une séance et tu renforces ta régularité.", "One more workout reinforces your consistency.", "Una sesión más refuerza tu regularidad.")}</div>
            </div>
            <div style={{ fontSize: 30 }}>{goalPct >= 100 ? "✓" : "◎"}</div>
          </div>
          <div style={{ marginTop: 12 }}><FitProgress value={goalPct} accent={goalPct >= 100 ? "#74ed99" : accent} height={9} /></div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("CHARGE D'ENTRAÎNEMENT", "TRAINING LOAD", "CARGA DE ENTRENAMIENTO")} title={t("Volume des 7 derniers jours", "Last 7 days volume", "Volumen de los últimos 7 días")} />
        <FitGlassCard accent="#76e4f7" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div><div style={{ fontSize: 9.5, color: textSoft, fontWeight: 900, letterSpacing: 1 }}>{t("VOLUME TOTAL", "TOTAL VOLUME", "VOLUMEN TOTAL")}</div><div style={{ marginTop: 5, fontSize: 25, fontWeight: 1000 }}>{formatVolume(weekVolume)}</div></div>
            <FitPill accent="#76e4f7">{weekSets} {t("SÉRIES", "SETS", "SERIES")}</FitPill>
          </div>
          <div style={{ marginTop: 12 }}><FitMiniBars values={bars} accent="#76e4f7" height={82} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginTop: 5, color: textSoft, fontSize: 8, fontWeight: 900, textAlign: "center" }}>{["L","M","M","J","V","S","D"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("ÉQUILIBRE", "BALANCE", "EQUILIBRIO")} title={t("Répartition musculaire", "Muscle distribution", "Distribución muscular")} />
        <FitGlassCard accent="#74ed99" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 11 }}>
            {muscles.map((item) => <div key={item.label}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 10.5, marginBottom: 5 }}><b>{item.label}</b><span style={{ color: item.accent, fontWeight: 900 }}>{item.value} {t("séries", "sets", "series")}</span></div><FitProgress value={item.pct} accent={item.accent} /></div>)}
          </div>
          {!sessions.length ? <div style={{ marginTop: 10, color: textSoft, fontSize: 9.5 }}>{t("La répartition apparaîtra après tes premières séances.", "Distribution appears after your first workouts.", "La distribución aparecerá tras tus primeras sesiones.")}</div> : null}
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("RECORDS PERSONNELS", "PERSONAL RECORDS", "RÉCORDS PERSONALES")} title={t("Tes meilleures performances", "Your best performances", "Tus mejores rendimientos")} right={<button type="button" onClick={() => go("stats")} style={{ border: 0, background: "transparent", color: accent, fontSize: 10, fontWeight: 900, cursor: "pointer" }}>{t("VOIR TOUT ›", "VIEW ALL ›", "VER TODO ›")}</button>} />
        <FitGlassCard accent="#b59cff" style={{ padding: 14 }}>
          {records.length ? <div style={{ display: "grid", gap: 8 }}>{records.slice(0, 4).map((record, index) => <RecordRow key={record.exerciseId} index={index} name={record.exerciseName} detail={`${formatKg(record.weightKg)} × ${record.reps}`} oneRm={record.oneRm} accent={index === 0 ? accent : "#b59cff"} textSoft={textSoft} />)}</div> : <EmptyState icon="🏆" title={t("Aucun record pour l'instant", "No records yet", "Aún no hay récords")} text={t("Valide tes séries dans FIT PERF pour construire automatiquement tes PR et ton 1RM estimé.", "Complete sets in FIT PERF to build your PRs and estimated 1RM automatically.", "Completa series en FIT PERF para crear automáticamente tus PR y 1RM estimado.")} textSoft={textSoft} />}
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("HISTORIQUE", "HISTORY", "HISTORIAL")} title={t("Dernières séances", "Recent workouts", "Sesiones recientes")} />
        <FitGlassCard accent={accent} style={{ padding: 14 }}>
          {sessions.length ? <div style={{ display: "grid", gap: 8 }}>{sessions.slice(0, 3).map((session) => <SessionRow key={session.id} session={session} accent={accent} textSoft={textSoft} />)}</div> : <EmptyState icon="⌁" title={t("Ton historique est prêt", "Your history is ready", "Tu historial está listo")} text={t("Ta première séance terminée apparaîtra ici avec son volume, sa durée et ses séries.", "Your first completed workout will appear here with its volume, duration and sets.", "Tu primera sesión terminada aparecerá aquí con volumen, duración y series.")} textSoft={textSoft} />}
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("BILAN GLOBAL", "GLOBAL SUMMARY", "RESUMEN GLOBAL")} title={t("Depuis tes débuts", "Since you started", "Desde tus inicios")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <FitMetric label={t("Séances totales", "Total sessions", "Sesiones totales")} value={sessions.length} accent={accent} />
          <FitMetric label={t("Volume total", "Total volume", "Volumen total")} value={formatVolume(totalVolume)} accent="#76e4f7" />
          <FitMetric label={t("Séries totales", "Total sets", "Series totales")} value={totalSets} accent="#74ed99" />
          <FitMetric label={t("Meilleur 1RM", "Best 1RM", "Mejor 1RM")} value={bestRecord ? formatKg(bestRecord.oneRm) : "—"} sub={bestRecord?.exerciseName} accent="#b59cff" />
        </div>
      </FitShell>
    </div>
  );
}

function QuickCard({ icon, title, sub, accent, onClick, featured = false }: { icon: string; title: string; sub: string; accent: string; onClick: () => void; featured?: boolean }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 124, textAlign: "left", color: "#fff", padding: 13, borderRadius: 18, border: `1px solid ${featured ? accent + "70" : "rgba(255,255,255,.08)"}`, background: featured ? `linear-gradient(145deg, ${accent}20, rgba(255,255,255,.025))` : "linear-gradient(145deg, rgba(255,255,255,.05), rgba(255,255,255,.018))", boxShadow: featured ? `0 14px 32px ${accent}16` : "0 10px 28px rgba(0,0,0,.16)", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 9 }}><span style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", border: `1px solid ${accent}55`, color: accent, background: `${accent}12`, fontSize: 18, fontWeight: 1000 }}>{icon}</span><span><b style={{ display: "block", color: featured ? accent : "#fff", fontSize: 12.5, letterSpacing: .3 }}>{title}</b><small style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,.54)", fontSize: 9.5, lineHeight: 1.35 }}>{sub}</small></span></button>;
}

function RecordRow({ index, name, detail, oneRm, accent, textSoft }: { index: number; name: string; detail: string; oneRm: number; accent: string; textSoft: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}><div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}35`, fontWeight: 1000 }}>{index + 1}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 11.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9.5 }}>{detail}</div></div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 13, fontWeight: 1000 }}>{formatKg(oneRm)}</div><div style={{ color: textSoft, fontSize: 8.5 }}>1RM EST.</div></div></div>;
}

function SessionRow({ session, accent, textSoft }: { session: FitSession; accent: string; textSoft: string }) {
  const date = new Date(session.endedAt || session.startedAt);
  return <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}35`, fontSize: 17 }}>◆</div><div><div style={{ fontSize: 11.5, fontWeight: 900 }}>{session.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9.5 }}>{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {formatDuration(sessionDurationMs(session))} · {completedSets(session)} séries</div></div><b style={{ color: accent, fontSize: 11 }}>{formatVolume(sessionVolume(session))}</b></div>;
}

function EmptyState({ icon, title, text, textSoft }: { icon: string; title: string; text: string; textSoft: string }) {
  return <div style={{ padding: "18px 12px", textAlign: "center" }}><div style={{ fontSize: 28 }}>{icon}</div><div style={{ marginTop: 8, fontSize: 12, fontWeight: 950 }}>{title}</div><div style={{ margin: "6px auto 0", maxWidth: 420, color: textSoft, fontSize: 9.5, lineHeight: 1.5 }}>{text}</div></div>;
}
