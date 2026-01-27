// =============================================================
// src/components/stats/StatsTrainingModesLocal.tsx
// LOT 10 — Stats locales pour les trainings "custom" (TimeAttack, Ghost…)
// - Source: trainingStatsHub (localStorage dc_training_stats_v1)
// - UI néon, cartes compactes
// =============================================================

import React from "react";
import StatsTrainingPublicLeaderboard from "./StatsTrainingPublicLeaderboard";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { getTrainingStats } from "../../training/stats/trainingStatsHub";

type Row = { id: string; label: string };

const MODES: Row[] = [
  { id: "training_time_attack", label: "Time Attack" },
  { id: "training_precision_gauntlet", label: "Precision" },
  { id: "training_repeat_master", label: "Repeat Master" },
  { id: "training_super_bull", label: "Super Bull" },
  { id: "training_ghost", label: "Ghost" },
  { id: "training_doubleio", label: "Double In/Out" },
  { id: "training_challenges", label: "Challenges" },
  { id: "training_evolution", label: "Evolution" },
];

function fmtInt(n: number) {
  return Number.isFinite(n) ? String(Math.round(n)) : "0";
}
function fmt1(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export default function StatsTrainingModesLocal() {
  const { theme } = useTheme();
  const { t } = useLang();

  const [globalOpenMode, setGlobalOpenMode] = React.useState<string | null>(null);

  const [store, setStore] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    setStore((getTrainingStats() as any) || {});
    const onStorage = () => setStore((getTrainingStats() as any) || {});
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const card = (active = false): React.CSSProperties => ({
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${active ? theme.primary + "88" : "rgba(255,255,255,0.12)"}`,
    background: "rgba(0,0,0,0.40)",
    boxShadow: active ? `0 0 26px ${theme.primary}33` : "0 12px 26px rgba(0,0,0,0.35)",
  });

  const headerStyle: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.primary,
    marginBottom: 10,
  };

  let totalSessions = 0;
  let totalDarts = 0;
  let totalPoints = 0;

  for (const k of Object.keys(store || {})) {
    const s = store[k];
    if (!s) continue;
    totalSessions += Number(s.sessions || 0);
    totalDarts += Number(s.darts || 0);
    totalPoints += Number(s.points || 0);
  }

  const ppd = totalDarts > 0 ? totalPoints / totalDarts : 0;
  const ppm = totalDarts > 0 ? (totalPoints / totalDarts) * 3 : 0;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={headerStyle}>
        {t("stats.training.custom.title", "Training — autres modes")}
      </div>

      <div style={card(true)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>
            {t("stats.training.custom.global", "Global")}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {fmtInt(totalSessions)} session(s)
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Darts</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{fmtInt(totalDarts)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Points</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{fmtInt(totalPoints)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.75 }}>PPM</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{fmt1(ppm)}</div>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75, textAlign: "center" }}>
          PPD: {fmt1(ppd)} • PPM: {fmt1(ppm)}
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {MODES.map((m) => {
          const s = (store && (store as any)[m.id]) || { sessions: 0, darts: 0, points: 0 };
          const sessions = Number(s.sessions || 0);
          const darts = Number(s.darts || 0);
          const points = Number(s.points || 0);
          const modePpm = darts > 0 ? (points / darts) * 3 : 0;

          return (
            <div key={m.id} style={card(false)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 12 }}>{m.label}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{fmtInt(sessions)}</div>
              </div>

              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>Darts</div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{fmtInt(darts)}</div>
              </div>

              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>Points</div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{fmtInt(points)}</div>
              </div>

              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>PPM</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.primary }}>
                  {fmt1(modePpm)}
                </div>
              </div>
            
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() =>
                    setGlobalOpenMode((prev) => (prev === modeId ? null : modeId))
                  }
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "inherit",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {globalOpenMode === modeId ? "▲" : "▼"}{" "}
                  {t("stats.training.global.btn", "Global")}
                </button>
              </div>

              {globalOpenMode === modeId && (
                <div style={{ marginTop: 8 }}>
                  <StatsTrainingPublicLeaderboard modeId={modeId} modeLabel={title} />
                </div>
              )}

</div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
        {t(
          "stats.training.custom.note",
          "Note: ces stats sont locales pour le moment (sync online possible plus tard)."
        )}
      </div>
    </div>
  );
}
