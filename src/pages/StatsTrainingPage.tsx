// ============================================
// src/pages/StatsTrainingPage.tsx
// Statistiques Training (501 solo)
// ============================================

import React, { useEffect, useState } from "react";
import { TrainingStore } from "../lib/TrainingStore";

export default function StatsTrainingPage() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    TrainingStore.getAll().then(setSessions);
  }, []);

  if (!sessions.length) {
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        Aucune session Training enregistrée.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: "#fff" }}>
      <h1>Statistiques Training</h1>

      {sessions.map((s) => {
        const darts = s.visits.flatMap((v) => v.darts);
        const total = darts.reduce((a, b) => a + b.value, 0);
        const avg3 = darts.length ? (total / darts.length) * 3 : 0;
        const best = Math.max(...s.visits.map((v) => v.total), 0);

        return (
          <div
            key={s.id}
            style={{
              background: "rgba(255,255,255,0.05)",
              padding: 16,
              marginBottom: 16,
              borderRadius: 12,
            }}
          >
            <h2>Session du {new Date(s.createdAt).toLocaleString()}</h2>
            <p>Moyenne 3D : {avg3.toFixed(1)}</p>
            <p>Meilleure volée : {best}</p>
            <p>Nb fléchettes : {darts.length}</p>
            <p>Score final : {s.finalScore ?? "—"}</p>
          </div>
        );
      })}
    </div>
  );
}
