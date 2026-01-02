// ============================================
// src/pages/TrainingStatsPage.tsx
// Liste les sessions de training + % de réussite
// ============================================

import React from "react";
import { TrainingStore } from "../lib/TrainingStore";
import { useCurrentProfile } from "../hooks/useCurrentProfile";

export default function TrainingStatsPage() {
  const profile = useCurrentProfile();

  const [sessions, setSessions] = React.useState(() =>
    TrainingStore.getSessionsForProfile(profile ? profile.id : null)
  );

  // Recharge dès que le profil courant change
  React.useEffect(() => {
    setSessions(
      TrainingStore.getSessionsForProfile(profile ? profile.id : null)
    );
  }, [profile]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Évolution Training</h2>

      <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
        Historique des sessions et précision globale.
      </p>

      {sessions.length === 0 && (
        <p>Aucune session enregistrée pour le moment.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sessions.map((s) => {
          const d = new Date(s.createdAt);
          const dateStr = d.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const ratio =
            s.totalDarts > 0 ? (s.totalHits / s.totalDarts) * 100 : 0;

          return (
            <div
              key={s.id}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.1)",
                background:
                  "linear-gradient(180deg, rgba(25,25,28,.8), rgba(15,15,18,.9))",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                {dateStr}
              </div>

              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
                {s.mode}
                {s.target ? ` • Cible : ${s.target}` : ""}
              </div>

              <div style={{ fontSize: 14 }}>
                Darts : <strong>{s.totalDarts}</strong> • Hits :{" "}
                <strong>{s.totalHits}</strong> • Précision :{" "}
                <strong>{ratio.toFixed(1)}%</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
