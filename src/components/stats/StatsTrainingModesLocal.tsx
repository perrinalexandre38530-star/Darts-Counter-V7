import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  getTrainingDetailedSessions,
  getTrainingGroupSessions,
  getTrainingStats,
  type TrainingDetailedSession,
  type TrainingGroupSession,
  type TrainingStatsRow,
} from "../../training/stats/trainingStatsHub";
import { trainingConfigSummary } from "../../training/lib/trainingConfigSummary";

type ModeDef = { id: string; label: string; short: string };

const MODES: ModeDef[] = [
  { id: "training_x01", label: "Training X01", short: "X01" },
  { id: "training_doubleio", label: "Double In / Double Out", short: "DI / DO" },
  { id: "training_challenges", label: "Challenges", short: "Défis" },
  { id: "training_ghost", label: "Ghost Mode", short: "Ghost" },
  { id: "training_precision_gauntlet", label: "Precision Gauntlet", short: "Precision" },
  { id: "training_repeat_master", label: "Repeat Master", short: "Repeat" },
  { id: "training_super_bull", label: "Super Bull", short: "Bull" },
  { id: "training_time_attack", label: "Time Attack", short: "Chrono" },
];

const EMPTY_ROW: TrainingStatsRow = {
  sessions: 0,
  darts: 0,
  points: 0,
  hits: 0,
  misses: 0,
  successes: 0,
  durationMs: 0,
  bestPoints: 0,
  bestPerformance: 0,
  bestAccuracyPct: 0,
  lastSessionAt: 0,
};

function int(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function one(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "—";
}

function formatDate(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return "Aucune session";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "Session enregistrée";
  }
}

function lastPerformance(session?: TrainingDetailedSession | null) {
  if (!session) return "—";
  const metrics: any = session.metrics || {};
  if (typeof metrics.avg3 === "number") return `${one(metrics.avg3)} moy./3`;
  if (typeof metrics.bestStreak === "number") return `série ${int(metrics.bestStreak)}`;
  if (typeof metrics.objectiveRatePct === "number") return `${int(metrics.objectiveRatePct)}% objectifs`;
  if (typeof metrics.completionPct === "number") return `${int(metrics.completionPct)}% parcours`;
  return `${int(session.points)} pts`;
}

export default function StatsTrainingModesLocal() {
  const { theme } = useTheme();
  const { t } = useLang();
  const accent = "#27dcff";

  const read = React.useCallback(() => {
    const stats = getTrainingStats();
    return {
      global: (stats?.global || EMPTY_ROW) as TrainingStatsRow,
      byMode: (stats?.byMode || {}) as Record<string, TrainingStatsRow>,
      recent: getTrainingDetailedSessions({ limit: 160 }),
      groups: getTrainingGroupSessions({ limit: 80 }),
    };
  }, []);

  const [data, setData] = React.useState(read);

  React.useEffect(() => {
    const refresh = () => setData(read());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("dc-training-stats-updated", refresh as EventListener);
    window.addEventListener("dc-training-history-updated", refresh as EventListener);
    window.addEventListener("dc-training-group-history-updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dc-training-stats-updated", refresh as EventListener);
      window.removeEventListener("dc-training-history-updated", refresh as EventListener);
      window.removeEventListener("dc-training-group-history-updated", refresh as EventListener);
    };
  }, [read]);

  const lastByMode = React.useMemo(() => {
    const map = new Map<string, TrainingDetailedSession>();
    for (const session of data.recent || []) {
      if (!session?.modeId || map.has(session.modeId)) continue;
      map.set(session.modeId, session);
    }
    return map;
  }, [data.recent]);

  const variants = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const session of data.recent || []) {
      const summary = trainingConfigSummary(session.modeId, session.config);
      const key = `${session.modeId}::${summary}`;
      const current = map.get(key) || {
        key,
        modeId: session.modeId,
        summary,
        sessions: 0,
        darts: 0,
        hits: 0,
        points: 0,
        successes: 0,
        lastAt: 0,
      };
      current.sessions += 1;
      current.darts += Number(session.darts || 0);
      current.hits += Number(session.hits || 0);
      current.points += Number(session.points || 0);
      current.successes += session.success ? 1 : 0;
      current.lastAt = Math.max(current.lastAt, Number(session.endedAt || 0));
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a: any, b: any) => b.lastAt - a.lastAt);
  }, [data.recent]);

  const global = data.global || EMPTY_ROW;
  const globalAccuracy = pct(int(global.hits), int(global.darts));
  const successRate = pct(int(global.successes), int(global.sessions));
  const avg3 = global.darts > 0 ? (Number(global.points || 0) / Number(global.darts || 1)) * 3 : 0;

  const shell: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(39,220,255,.28)",
    background: "linear-gradient(145deg,rgba(5,24,37,.88),rgba(2,11,20,.92))",
    boxShadow: "0 14px 34px rgba(0,0,0,.28)",
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontWeight: 950,
          letterSpacing: 0.9,
          textTransform: "uppercase",
          color: accent,
          marginBottom: 9,
        }}
      >
        {t("stats.training.custom.title", "Training — modes dédiés")}
      </div>

      <section style={{ ...shell, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>VUE GLOBALE TRAINING</div>
          <div style={{ fontSize: 11, opacity: 0.64 }}>{int(global.sessions)} session{int(global.sessions) > 1 ? "s" : ""}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 7,
            marginTop: 10,
          }}
        >
          {[
            ["FLÉCHETTES", int(global.darts)],
            ["MOY./3", one(avg3)],
            ["PRÉCISION", globalAccuracy],
            ["RÉUSSITE", successRate],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                minWidth: 0,
                borderRadius: 13,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.26)",
                padding: "8px 4px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 0.5, opacity: 0.55 }}>{label}</div>
              <div style={{ marginTop: 2, fontSize: 16, fontWeight: 950, color: accent }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))",
          gap: 9,
          marginTop: 9,
        }}
      >
        {MODES.map((mode) => {
          const row = data.byMode?.[mode.id] || EMPTY_ROW;
          const darts = int(row.darts);
          const hits = int(row.hits);
          const sessions = int(row.sessions);
          const successes = int(row.successes);
          const modeAvg3 = darts > 0 ? (Number(row.points || 0) / darts) * 3 : 0;
          const last = lastByMode.get(mode.id) || null;

          return (
            <section key={mode.id} style={{ ...shell, padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mode.label}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 9.5, opacity: 0.52 }}>{formatDate(Number(row.lastSessionAt || last?.endedAt || 0))}</div>
                </div>
                <div
                  style={{
                    flex: "0 0 auto",
                    borderRadius: 999,
                    border: "1px solid rgba(39,220,255,.28)",
                    background: "rgba(39,220,255,.08)",
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 950,
                    color: accent,
                  }}
                >
                  {sessions}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginTop: 9 }}>
                {[
                  ["Précision", pct(hits, darts)],
                  ["Réussite", pct(successes, sessions)],
                  ["Moy./3", one(modeAvg3)],
                  ["Best perf.", int(row.bestPerformance ?? row.bestPoints)],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ borderRadius: 11, background: "rgba(0,0,0,.24)", padding: "6px 7px" }}>
                    <div style={{ fontSize: 8.5, opacity: 0.5, fontWeight: 900 }}>{label}</div>
                    <div style={{ marginTop: 1, fontSize: 13, fontWeight: 950, color: accent }}>{value}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 7,
                  borderTop: "1px solid rgba(255,255,255,.07)",
                  paddingTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 9.5,
                  opacity: 0.62,
                }}
              >
                <span>{darts} fléchettes</span>
                <span>{lastPerformance(last)}</span>
              </div>
            </section>
          );
        })}
      </div>

      {variants.length ? (
        <section style={{ ...shell, marginTop: 10, padding: 11 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: accent, letterSpacing: 0.7, marginBottom: 7 }}>
            STATS PAR CONFIGURATION
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 7 }}>
            {variants.slice(0, 16).map((variant: any) => {
              const mode = MODES.find((item) => item.id === variant.modeId);
              const accuracy = variant.darts > 0 ? `${Math.round((variant.hits / variant.darts) * 100)}%` : "—";
              const avg3Variant = variant.darts > 0 ? (variant.points / variant.darts) * 3 : 0;
              return (
                <div key={variant.key} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.20)", padding: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 950 }}>{mode?.short || mode?.label || variant.modeId}</div>
                  <div style={{ marginTop: 2, fontSize: 9.2, color: "#9aa2bc", lineHeight: 1.3 }}>{variant.summary}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4, marginTop: 6 }}>
                    <div><div style={{ fontSize: 7.8, opacity: .45 }}>SESSIONS</div><b style={{ color: accent, fontSize: 11 }}>{variant.sessions}</b></div>
                    <div><div style={{ fontSize: 7.8, opacity: .45 }}>PRÉCISION</div><b style={{ color: accent, fontSize: 11 }}>{accuracy}</b></div>
                    <div><div style={{ fontSize: 7.8, opacity: .45 }}>MOY./3</div><b style={{ color: accent, fontSize: 11 }}>{one(avg3Variant)}</b></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {(data.groups || []).length ? (
        <section style={{ ...shell, marginTop: 10, padding: 11 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: accent, letterSpacing: 0.7, marginBottom: 7 }}>
            HISTORIQUE DES SESSIONS TRAINING
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {(data.groups || []).slice(0, 10).map((group: TrainingGroupSession) => {
              const mode = MODES.find((item) => item.id === group.modeId);
              const winner = Array.isArray(group.participants) ? group.participants[0] : null;
              return (
                <div
                  key={group.id}
                  style={{
                    borderRadius: 13,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(0,0,0,.22)",
                    padding: "8px 9px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <div style={{ minWidth: 0, fontSize: 11, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mode?.label || group.modeId}
                    </div>
                    <div style={{ flex: "0 0 auto", fontSize: 9, color: accent, fontWeight: 950 }}>
                      {group.participantMode === "teams" ? "ÉQUIPES" : (group.participants?.length || 0) > 1 ? "MULTI" : "SOLO"}
                    </div>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 9.5, color: "#9aa2bc", lineHeight: 1.35 }}>
                    {trainingConfigSummary(group.modeId, group.config)}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 8.8, opacity: .55 }}>
                    <span>{formatDate(group.endedAt)} • {group.participants?.length || 0} participant{(group.participants?.length || 0) > 1 ? "s" : ""}</span>
                    <span>{winner?.participantName ? `#1 ${winner.participantName}` : "Session enregistrée"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {(data.recent || []).length ? (
        <section style={{ ...shell, marginTop: 10, padding: 11 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: accent, letterSpacing: 0.7, marginBottom: 7 }}>
            DERNIÈRES SESSIONS TRAINING
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {(data.recent || []).slice(0, 8).map((session) => {
              const mode = MODES.find((item) => item.id === session.modeId);
              return (
                <div
                  key={session.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 8,
                    alignItems: "center",
                    borderRadius: 11,
                    border: "1px solid rgba(255,255,255,.07)",
                    background: "rgba(0,0,0,.20)",
                    padding: "7px 8px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mode?.short || mode?.label || session.modeId}
                    </div>
                    <div style={{ marginTop: 1, fontSize: 8.5, opacity: 0.48 }}>
                      {formatDate(session.endedAt)} • {trainingConfigSummary(session.modeId, session.config)} • {session.darts} fléchettes • précision {Math.round(session.accuracyPct || 0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 950, color: session.success ? accent : "#ff6d98" }}>
                      {session.success ? "RÉUSSI" : "TERMINÉ"}
                    </div>
                    <div style={{ marginTop: 1, fontSize: 8.5, opacity: 0.52 }}>{lastPerformance(session)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: 9, fontSize: 10.5, lineHeight: 1.4, opacity: 0.55 }}>
        {t(
          "stats.training.custom.note",
          "Ces données sont réservées au Training : elles ne sont pas mélangées aux statistiques de matchs classiques."
        )}
      </div>
    </div>
  );
}
