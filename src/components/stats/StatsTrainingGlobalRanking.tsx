import React from "react";

export default function StatsTrainingGlobalRanking({ rows }: { rows: any[] }) {
  return (
    <div>
      <h3>Classement global Training</h3>
      <ol>
        {rows.map(r => (
          <li key={r.id}>
            {r.name} — {r.score}
          </li>
        ))}
      </ol>
    </div>
  );
}