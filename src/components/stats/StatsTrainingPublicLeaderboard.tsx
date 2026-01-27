import React from "react";
import { useLang } from "../../contexts/LangContext";
import { useTrainingPublicLeaderboard } from "../../hooks/useTrainingPublicLeaderboard";

export default function StatsTrainingPublicLeaderboard({
  modeId,
  modeLabel,
}: {
  modeId: string;
  modeLabel?: string;
}) {
  const { t } = useLang();
  const { rows, loading, error } = useTrainingPublicLeaderboard(modeId, 20);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
        {t("stats.training.global.title", "Classement global")} —{" "}
        {modeLabel ?? modeId}
      </div>

      {loading && (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {t("common.loading", "Chargement…")}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {t("common.error", "Erreur")} : {error}
        </div>
      )}

      {!loading && !error && (!rows || rows.length === 0) && (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {t("stats.training.global.empty", "Aucune donnée pour le moment.")}
        </div>
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {rows.map((r, idx) => {
            const score =
              r.best_score != null
                ? `${r.best_score}`
                : r.best_time_ms != null
                ? `${Math.round(r.best_time_ms / 1000)}s`
                : "-";
            return (
              <li
                key={r.user_id + String(idx)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "4px 0",
                  fontSize: 12,
                }}
              >
                <span style={{ minWidth: 22, opacity: 0.65 }}>{idx + 1}.</span>
                <span style={{ fontWeight: 800 }}>{r.public_name}</span>
                <span style={{ marginLeft: "auto", fontWeight: 900 }}>
                  {score}
                </span>
                <span style={{ opacity: 0.6, fontSize: 11 }}>
                  ({r.plays}x)
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
        {t(
          "stats.training.global.note",
          "Classement global calculé via Supabase (agrégé, sans exposer les événements bruts)."
        )}
      </div>
    </div>
  );
}
