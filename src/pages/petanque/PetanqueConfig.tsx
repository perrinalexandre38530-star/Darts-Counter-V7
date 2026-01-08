// ============================================================
// src/pages/petanque/PetanqueConfig.tsx
// Configuration de partie Pétanque
// ============================================================

import React, { useEffect, useState } from "react";
import {
  PetanqueMode,
  PetanqueGameConfig,
  defaultConfigForMode,
  loadPetanqueConfig,
  savePetanqueConfig,
  slotsForMode,
} from "../../lib/petanqueConfigStore";

type Props = {
  go: (route: any, params?: any) => void;
  params?: { mode?: PetanqueMode };
};

// ------------------------------------------------------------
// ⚠️ PLACEHOLDER PlayerPicker
// À remplacer par ton vrai store profils plus tard
// ------------------------------------------------------------
const PlayerPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="ID joueur"
    style={{
      padding: 8,
      borderRadius: 8,
      border: "1px solid #444",
      background: "#111",
      color: "white",
    }}
  />
);

export default function PetanqueConfig({ go, params }: Props) {
  const mode = params?.mode ?? "simple";

  const [config, setConfig] = useState<PetanqueGameConfig>(
    () =>
      loadPetanqueConfig() ??
      defaultConfigForMode(mode)
  );

  // Re-sync si on arrive avec un autre mode
  useEffect(() => {
    setConfig(defaultConfigForMode(mode));
  }, [mode]);

  const slots = slotsForMode(config.mode);

  function updateTeam(
    team: "A" | "B",
    index: number,
    playerId: string
  ) {
    setConfig((c) => {
      const next = { ...c };
      const key =
        team === "A" ? "teamAPlayerIds" : "teamBPlayerIds";
      const arr = [...(next as any)[key]];
      arr[index] = playerId;
      (next as any)[key] = arr;
      return next;
    });
  }

  function startGame() {
    savePetanqueConfig(config);
    go("petanque.play");
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h2>Configuration</h2>

      <div>Mode : <strong>{config.mode}</strong></div>

      {/* Team A */}
      <div>
        <h4>Équipe A</h4>
        {Array.from({ length: slots }).map((_, i) => (
          <PlayerPicker
            key={i}
            value={config.teamAPlayerIds[i] ?? ""}
            onChange={(id) => updateTeam("A", i, id)}
          />
        ))}
      </div>

      {/* Team B */}
      {config.mode !== "training" && (
        <div>
          <h4>Équipe B</h4>
          {Array.from({ length: slots }).map((_, i) => (
            <PlayerPicker
              key={i}
              value={config.teamBPlayerIds[i] ?? ""}
              onChange={(id) => updateTeam("B", i, id)}
            />
          ))}
        </div>
      )}

      {/* Paramètres */}
      <div>
        <h4>Paramètres</h4>

        <label>
          Score cible :
          <select
            value={config.targetScore}
            onChange={(e) =>
              setConfig({
                ...config,
                targetScore: Number(e.target.value) as any,
              })
            }
          >
            <option value={13}>13</option>
            <option value={15}>15</option>
            <option value={21}>21</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.options.allowMeasurements ?? true}
            onChange={(e) =>
              setConfig({
                ...config,
                options: {
                  ...config.options,
                  allowMeasurements: e.target.checked,
                },
              })
            }
          />
          Mesurage autorisé
        </label>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: 14,
          borderRadius: 12,
          fontSize: 18,
        }}
      >
        ▶ Démarrer la partie
      </button>
    </div>
  );
}
