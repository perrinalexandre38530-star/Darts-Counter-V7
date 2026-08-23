import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import { listActivities } from "../../activity/activityStore";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";

type Props = {
  go: (route: any, params?: any) => void;
};

export default function RunningHome({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);

  React.useEffect(() => {
    let alive = true;
    void listActivities("running").then((rows) => {
      if (alive) setActivities(rows);
    });
    return () => { alive = false; };
  }, []);

  const langCode = String(lang || "fr").toLowerCase();
  const copy = langCode === "fr" ? {
    title: "RUNNING SCORING", sub: "Cours. Progresse. Défie.", start: "COURIR", history: "MES SORTIES",
    total: "DISTANCE TOTALE", sessions: "SESSIONS", best: "MEILLEURE ALLURE", last: "DERNIÈRE SORTIE",
    empty: "Aucune sortie enregistrée pour le moment.", beta: "MODULE EN DÉVELOPPEMENT — WEB/PWA UNIQUEMENT POUR LE MOMENT",
  } : langCode === "es" ? {
    title: "RUNNING SCORING", sub: "Corre. Progresa. Compite.", start: "CORRER", history: "MIS CARRERAS",
    total: "DISTANCIA TOTAL", sessions: "SESIONES", best: "MEJOR RITMO", last: "ÚLTIMA CARRERA",
    empty: "Todavía no hay carreras registradas.", beta: "MÓDULO EN DESARROLLO — SOLO WEB/PWA POR AHORA",
  } : {
    title: "RUNNING SCORING", sub: "Run. Improve. Challenge.", start: "RUN", history: "MY RUNS",
    total: "TOTAL DISTANCE", sessions: "SESSIONS", best: "BEST PACE", last: "LAST RUN",
    empty: "No runs recorded yet.", beta: "MODULE IN DEVELOPMENT — WEB/PWA ONLY FOR NOW",
  };

  const themeAny = theme as any;
  const accent = themeAny?.accent || themeAny?.accent1 || "#74f7a5";
  const totalM = activities.reduce((sum, a) => sum + Number(a.distanceM || 0), 0);
  const paces = activities.map((a) => a.avgPaceSecPerKm).filter((v): v is number => Number.isFinite(v) && Number(v) > 0);
  const bestPace = paces.length ? Math.min(...paces) : null;
  const last = activities[0] || null;

  return (
    <main style={{ minHeight: "100vh", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 14px 100px", color: "#fff", background: themeAny?.pageBackground || themeAny?.bg || "#07090d", backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", marginBottom: 14 }}>
          <BackDot onClick={() => go("gameSelect")} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 24, color: accent, letterSpacing: 1.2 }}>{copy.title}</div>
            <div style={{ fontSize: 12, opacity: .7, marginTop: 3 }}>{copy.sub}</div>
          </div>
          <div />
        </div>

        <div style={{ border: `1px solid ${accent}44`, borderRadius: 16, padding: 10, fontSize: 10, fontWeight: 900, letterSpacing: .7, textAlign: "center", color: accent, background: "rgba(5,8,13,.7)" }}>{copy.beta}</div>

        <section style={{ marginTop: 12, border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, padding: 16, background: "rgba(5,8,13,.68)", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, textAlign: "center" }}>
            <Kpi label={copy.total} value={totalM >= 1000 ? `${(totalM / 1000).toFixed(1)} km` : `${Math.round(totalM)} m`} accent={accent} />
            <Kpi label={copy.sessions} value={String(activities.length)} accent={accent} />
            <Kpi label={copy.best} value={`${formatPace(bestPace)} /km`} accent={accent} />
          </div>
        </section>

        <button onClick={() => go("games")} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 16, padding: "15px 16px", fontWeight: 950, fontSize: 15, background: accent, color: "#06110b", cursor: "pointer" }}>▶ {copy.start}</button>

        <section style={{ marginTop: 12, border: "1px solid rgba(255,255,255,.10)", borderRadius: 18, padding: 14, background: "rgba(5,8,13,.68)" }}>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: 1, opacity: .7 }}>{copy.last}</div>
          {last ? (
            <button onClick={() => go("games")} style={{ width: "100%", border: 0, background: "transparent", color: "#fff", padding: "12px 0 0", textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontSize: 19, fontWeight: 950, color: accent }}>{formatDistance(last.distanceM)}</div>
              <div style={{ marginTop: 5, fontSize: 12, opacity: .7 }}>{formatDuration(last.elapsedMs)} · {formatPace(last.avgPaceSecPerKm)} /km · +{Math.round(last.elevationGainM)} m</div>
            </button>
          ) : <div style={{ paddingTop: 12, fontSize: 12, opacity: .6 }}>{copy.empty}</div>}
        </section>

        <button onClick={() => go("games")} style={{ width: "100%", marginTop: 10, borderRadius: 15, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "13px 14px", fontWeight: 900, cursor: "pointer" }}>📊 {copy.history}</button>
      </div>
    </main>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div><div style={{ fontSize: 18, fontWeight: 950, color: accent }}>{value}</div><div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, opacity: .58 }}>{label}</div></div>;
}
