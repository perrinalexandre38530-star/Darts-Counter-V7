// ============================================================
// src/pages/petanque/PetanqueConfig.tsx
// Configuration de partie Pétanque (branchée sur store.profiles)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import type { Store, Profile } from "../../lib/types";
import {
  PetanqueMode,
  PetanqueGameConfig,
  defaultConfigForMode,
  loadPetanqueConfig,
  savePetanqueConfig,
  slotsForMode,
} from "../../lib/petanqueConfigStore";

import { loadPetanqueState, resetPetanque, setTeamNames, setTargetScore } from "../../lib/petanqueStore";

type Props = {
  go: (route: any, params?: any) => void;
  params?: { mode?: PetanqueMode };
  store: Store;
};

function getProfileName(p?: Profile | null) {
  if (!p) return "";
  return (p as any).name || (p as any).displayName || "Joueur";
}

function formatTeamName(players: Profile[]) {
  const names = players.map(getProfileName).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

function ensureSlots(arr: string[], slots: number) {
  const next = Array.isArray(arr) ? [...arr] : [];
  while (next.length < slots) next.push("");
  return next.slice(0, slots);
}

const PlayerSelect = ({
  label,
  value,
  onChange,
  profiles,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  profiles: Profile[];
}) => {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      <div style={{ opacity: 0.85, fontSize: 13 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          outline: "none",
        }}
      >
        <option value="">— Choisir un profil —</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {getProfileName(p)}
            {(p as any).isBot ? " (BOT)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
};

export default function PetanqueConfig({ go, params, store }: Props) {
  const mode = params?.mode ?? "simple";

  const profiles = useMemo(() => (store?.profiles ?? []) as Profile[], [store]);

  const [config, setConfig] = useState<PetanqueGameConfig>(() => {
    const fromLS = loadPetanqueConfig();
    return fromLS ?? defaultConfigForMode(mode);
  });

  // Re-sync mode (et resize slots)
  useEffect(() => {
    const base = defaultConfigForMode(mode);
    const slots = slotsForMode(mode);

    // Préremplissage intelligent: Team A slot 0 = activeProfile si dispo
    const activeId = store?.activeProfileId ?? "";
    base.teamAPlayerIds = ensureSlots(base.teamAPlayerIds, slots);
    base.teamBPlayerIds = mode === "training" ? [] : ensureSlots(base.teamBPlayerIds, slots);

    if (activeId && base.teamAPlayerIds[0] === "") base.teamAPlayerIds[0] = activeId;

    setConfig(base);
  }, [mode, store?.activeProfileId]);

  const slots = slotsForMode(config.mode);

  const byId = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  function updateTeam(team: "A" | "B", index: number, playerId: string) {
    setConfig((c) => {
      const next: PetanqueGameConfig = { ...c, options: { ...c.options } };
      if (team === "A") {
        next.teamAPlayerIds = ensureSlots(next.teamAPlayerIds, slots);
        next.teamAPlayerIds[index] = playerId;
      } else {
        next.teamBPlayerIds = ensureSlots(next.teamBPlayerIds, slots);
        next.teamBPlayerIds[index] = playerId;
      }
      return next;
    });
  }

  function validate(): string | null {
    // Training: uniquement team A slot0 requis
    if (config.mode === "training") {
      if (!config.teamAPlayerIds?.[0]) return "Choisis au moins 1 joueur (Entraînement).";
      return null;
    }

    // Match: tous les slots requis pour A et B
    const aOk = ensureSlots(config.teamAPlayerIds, slots).every((id) => !!id);
    const bOk = ensureSlots(config.teamBPlayerIds, slots).every((id) => !!id);
    if (!aOk || !bOk) return "Choisis tous les joueurs des deux équipes.";
    return null;
  }

  function startGame() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const aProfiles = ensureSlots(config.teamAPlayerIds, slots).map((id) => byId.get(id)).filter(Boolean) as Profile[];
    const bProfiles =
      config.mode === "training"
        ? []
        : ensureSlots(config.teamBPlayerIds, slots).map((id) => byId.get(id)).filter(Boolean) as Profile[];

    const teamAName = formatTeamName(aProfiles) || "Équipe A";
    const teamBName = config.mode === "training" ? "Entraînement" : formatTeamName(bProfiles) || "Équipe B";

    // 1) Sauvegarde config
    savePetanqueConfig(config);

    // 2) Applique config sur la partie (noms équipes + score cible) + reset game
    let st = loadPetanqueState();
    st = setTeamNames(st, teamAName, teamBName);
    st = setTargetScore(st, config.targetScore);
    st = resetPetanque(st);

    // 3) Go play
    go("petanque.play");
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Configuration</h2>

      <div style={{ opacity: 0.9 }}>
        Mode : <strong>{config.mode}</strong>
      </div>

      <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Joueurs</h4>

        <div style={{ marginBottom: 10, opacity: 0.9, fontWeight: 600 }}>Équipe A</div>
        {Array.from({ length: slots }).map((_, i) => (
          <PlayerSelect
            key={`A-${i}`}
            label={`Joueur A${i + 1}`}
            value={ensureSlots(config.teamAPlayerIds, slots)[i] ?? ""}
            onChange={(id) => updateTeam("A", i, id)}
            profiles={profiles}
          />
        ))}

        {config.mode !== "training" && (
          <>
            <div style={{ margin: "14px 0 10px", opacity: 0.9, fontWeight: 600 }}>Équipe B</div>
            {Array.from({ length: slots }).map((_, i) => (
              <PlayerSelect
                key={`B-${i}`}
                label={`Joueur B${i + 1}`}
                value={ensureSlots(config.teamBPlayerIds, slots)[i] ?? ""}
                onChange={(id) => updateTeam("B", i, id)}
                profiles={profiles}
              />
            ))}
          </>
        )}
      </div>

      <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Paramètres</h4>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          <div style={{ opacity: 0.85, fontSize: 13 }}>Score cible</div>
          <select
            value={config.targetScore}
            onChange={(e) => setConfig({ ...config, targetScore: Number(e.target.value) as any })}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          >
            <option value={13}>13</option>
            <option value={15}>15</option>
            <option value={21}>21</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={config.options.allowMeasurements ?? true}
            onChange={(e) => setConfig({ ...config, options: { ...config.options, allowMeasurements: e.target.checked } })}
          />
          <span>Mesurage autorisé</span>
        </label>
      </div>

      <button onClick={startGame} style={{ padding: 14, borderRadius: 14, fontSize: 18 }}>
        ▶ Démarrer la partie
      </button>

      <button onClick={() => go("games")} style={{ padding: 12, borderRadius: 14, opacity: 0.85 }}>
        ← Retour
      </button>
    </div>
  );
}
