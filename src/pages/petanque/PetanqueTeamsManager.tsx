// @ts-nocheck
// ============================================
// PÉTANQUE — Teams Manager (GROS TOURNOIS)
// - 10 à 256 équipes
// - Sans profils
// - Import CSV / copier-coller
// - Génération auto A/B/C
// ============================================

import React from "react";

type Team = {
  id: string;
  name: string;
  players: string[];
};

type Props = {
  teamSize: 1 | 2 | 3 | 4;
  initialTeams?: Team[];
  onValidate: (teams: Team[]) => void;
  onBack: () => void;
};

function genTeamName(i: number) {
  return `Équipe ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ""}`;
}

export default function PetanqueTeamsManager({
  teamSize,
  initialTeams = [],
  onValidate,
  onBack,
}: Props) {
  const [teams, setTeams] = React.useState<Team[]>(() =>
    initialTeams.length
      ? initialTeams
      : Array.from({ length: 8 }).map((_, i) => ({
          id: crypto.randomUUID(),
          name: genTeamName(i),
          players: Array.from({ length: teamSize }).map((_, j) => `Joueur ${j + 1}`),
        }))
  );

  const updateTeam = (i: number, patch: Partial<Team>) => {
    setTeams((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const addTeams = (n: number) => {
    setTeams((t) => [
      ...t,
      ...Array.from({ length: n }).map((_, i) => ({
        id: crypto.randomUUID(),
        name: genTeamName(t.length + i),
        players: Array.from({ length: teamSize }).map((_, j) => `Joueur ${j + 1}`),
      })),
    ]);
  };

  const removeTeam = (i: number) => {
    setTeams((t) => t.filter((_, idx) => idx !== i));
  };

  // CSV: Team;P1;P2;P3;P4
  const importCSV = (txt: string) => {
    const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: Team[] = [];

    for (const l of lines) {
      const cols = l.split(/[;,]/).map((c) => c.trim());
      if (cols.length < 1 + teamSize) continue;

      parsed.push({
        id: crypto.randomUUID(),
        name: cols[0] || genTeamName(parsed.length),
        players: cols.slice(1, 1 + teamSize),
      });
    }

    if (parsed.length) setTeams(parsed);
  };

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onBack}>← Retour</button>
        <div style={{ fontWeight: 900 }}>
          Équipes ({teams.length}) — {teamSize} joueurs
        </div>
      </div>

      <textarea
        placeholder="Importer CSV : Équipe;J1;J2;J3..."
        rows={4}
        style={{ width: "100%", marginBottom: 8 }}
        onBlur={(e) => importCSV(e.target.value)}
      />

      <button onClick={() => addTeams(4)}>+ 4 équipes</button>
      <button onClick={() => addTeams(8)} style={{ marginLeft: 8 }}>
        + 8 équipes
      </button>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {teams.map((t, i) => (
          <div
            key={t.id}
            style={{
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={t.name}
                onChange={(e) => updateTeam(i, { name: e.target.value })}
                style={{ flex: 1 }}
              />
              <button onClick={() => removeTeam(i)}>✕</button>
            </div>

            {t.players.map((p, j) => (
              <input
                key={j}
                value={p}
                onChange={(e) => {
                  const next = [...t.players];
                  next[j] = e.target.value;
                  updateTeam(i, { players: next });
                }}
                style={{ marginTop: 4, width: "100%" }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 16, left: 16, right: 16 }}>
        <button
          style={{ width: "100%", padding: 14, fontWeight: 900 }}
          onClick={() => onValidate(teams)}
        >
          VALIDER LES ÉQUIPES
        </button>
      </div>
    </div>
  );
}
