// ============================================
// src/pages/TrainingModePage.tsx
// Shell Training "custom" — Config -> Play (fidèle au flow Config/Play)
// - App.tsx ouvre l'onglet "training_mode" avec params: { modeId }
// - Ici: on affiche d'abord la page Config, puis Play
// - Back en Config => onExit() (retour TrainingMenu)
// - Back en Play => retour Config (comme X01/Killer)
// ============================================

import React from "react";

import RepeatMasterConfig from "../training/modes/repeat/RepeatMasterConfig";
import RepeatMasterPlay from "../training/modes/repeat/RepeatMasterPlay";

import PrecisionConfig from "../training/modes/precision/PrecisionConfig";
import PrecisionGauntletPlay from "../training/modes/precision/PrecisionGauntletPlay";

import TimeAttackConfig from "../training/modes/timeattack/TimeAttackConfig";
import TimeAttackPlay from "../training/modes/timeattack/TimeAttackPlay";

import GhostConfig from "../training/modes/ghost/GhostConfig";
import GhostModePlay from "../training/modes/ghost/GhostModePlay";

import DoubleIOConfig from "../training/modes/double/DoubleIOConfig";
import DoubleInOutPlay from "../training/modes/double/DoubleInOutPlay";

import ChallengesConfig from "../training/modes/challenges/ChallengesConfig";
import ChallengesPlay from "../training/modes/challenges/ChallengesPlay";

import EvolutionConfig from "../training/modes/evolution/EvolutionConfig";
import EvolutionPlay from "../training/modes/evolution/EvolutionPlay";

import SuperBullConfig from "../training/modes/superbull/SuperBullConfig";
import SuperBullPlay from "../training/modes/superbull/SuperBullPlay";

type Props = {
  modeId: string;
  onExit: () => void; // retour TrainingMenu
};

function norm(id: string) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function resolveModeId(raw: string) {
  const id = norm(raw);

  // Alias tolérants
  if (id === "training_super_bull" || id === "training_superbull" || id === "super_bull")
    return "super_bull_training";

  if (id === "evolution") return "training_evolution";

  return id;
}

export default function TrainingModePage({ modeId, onExit }: Props) {
  const [config, setConfig] = React.useState<any | null>(null);

  const id = resolveModeId(modeId);

  // Back dans Play => retour config (fidèle aux configs X01/Killer)
  const exitToConfig = React.useCallback(() => {
    setConfig(null);
  }, []);

  // Back dans Config => retour TrainingMenu
  const exitToMenu = React.useCallback(() => {
    setConfig(null);
    onExit();
  }, [onExit]);

  if (id === "training_precision_gauntlet") {
    if (!config) return <PrecisionConfig onStart={setConfig} onExit={exitToMenu} />;
    return <PrecisionGauntletPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_time_attack") {
    if (!config) return <TimeAttackConfig onStart={setConfig} onExit={exitToMenu} />;
    return <TimeAttackPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_repeat_master") {
    if (!config) return <RepeatMasterConfig onStart={setConfig} onExit={exitToMenu} />;
    return <RepeatMasterPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_ghost") {
    if (!config) return <GhostConfig onStart={setConfig} onExit={exitToMenu} />;
    return <GhostModePlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_doubleio") {
    if (!config) return <DoubleIOConfig onStart={setConfig} onExit={exitToMenu} />;
    return <DoubleInOutPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_challenges") {
    if (!config) return <ChallengesConfig onStart={setConfig} onExit={exitToMenu} />;
    return <ChallengesPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "super_bull_training") {
    if (!config) return <SuperBullConfig onStart={setConfig} onExit={exitToMenu} />;
    return <SuperBullPlay config={config} onExit={exitToConfig} />;
  }

  if (id === "training_evolution") {
    if (!config) return <EvolutionConfig onStart={setConfig} onExit={exitToMenu} />;
    return <EvolutionPlay config={config} onExit={exitToConfig} />;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>Mode Training indisponible</div>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>ID : {modeId}</div>
      <button
        type="button"
        onClick={exitToMenu}
        style={{
          height: 40,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(0,0,0,0.45)",
          color: "rgba(255,255,255,0.92)",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Retour
      </button>
    </div>
  );
}
