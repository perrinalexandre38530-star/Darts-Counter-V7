import React from "react";
import { useTrainingProfileSummaryModes } from "../../hooks/useTrainingProfileSummaryModes";
import TrainingTierBadge from "./TrainingTierBadge";
import TrainingBadgesStrip from "./TrainingBadgesStrip";

export default function TrainingProfileCard() {
  const { summary, loading, error } = useTrainingProfileSummaryModes();

  if (loading) return <div style={{ opacity: 0.8 }}>Chargement profil Training…</div>;
  if (error) return <div style={{ color: "tomato" }}>Erreur profil Training</div>;
  if (!summary) return null;

  const t = summary.training || {};
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {summary.avatar_url ? (
            <img
              src={summary.avatar_url}
              alt="avatar"
              style={{ width: 42, height: 42, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
              }}
            />
          )}
          <div>
            <div style={{ fontWeight: 900 }}>{summary.public_name}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t.plays ?? 0} parties Training</div>
          </div>
        </div>

        <TrainingTierBadge tier={t.tier} />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
        <div>Best score: {t.best_score ?? "—"}</div>
        <div>Best time: {t.best_time_ms ? `${t.best_time_ms} ms` : "—"}</div>
        <div>Dernière: {t.last_played_at ? new Date(t.last_played_at).toLocaleString() : "—"}</div>
      </div>

      <div style={{ marginTop: 12 }}>
  <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.95 }}>Modes Training</div>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
    {(summary.modes || []).map((m: any) => (
      <div
        key={m.mode_id}
        style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.18)",
          padding: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontWeight: 900, textTransform: "capitalize" }}>{String(m.mode_id).replace(/_/g, " ")}</div>
          <TrainingTierBadge tier={m.tier} />
        </div>

        <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
          <div>Plays: {m.plays ?? 0}</div>
          <div>Best score: {m.best_score ?? "—"}</div>
          <div>Best time: {m.best_time_ms ? `${m.best_time_ms} ms` : "—"}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          {m.last_played_at ? `Dernière: ${new Date(m.last_played_at).toLocaleString()}` : "—"}
        </div>
      </div>
    ))}
  </div>
</div>

<div style={{ marginTop: 10 }}>
  <TrainingBadgesStrip badges={summary.badges || []} />
</div>
    </div>
  );
}
