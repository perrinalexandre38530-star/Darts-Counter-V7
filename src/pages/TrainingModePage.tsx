// ============================================
// src/pages/TrainingModePage.tsx
// Training custom modes : Config -> Play (persist config)
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { getLastConfig, setLastConfig } from "../training/lib/trainingPersist";

// Configs
import TimeAttackConfig from "../training/modes/timeattack/TimeAttackConfig";
import DoubleIOConfig from "../training/modes/double/DoubleIOConfig";
import PrecisionConfig from "../training/modes/precision/PrecisionConfig";
import SuperBullConfig from "../training/modes/superbull/SuperBullConfig";
import GhostConfig from "../training/modes/ghost/GhostConfig";
import RepeatMasterConfig from "../training/modes/repeat/RepeatMasterConfig";
import ChallengesConfig from "../training/modes/challenges/ChallengesConfig";
import EvolutionConfig from "../training/modes/evolution/EvolutionConfig";

// Plays
import TimeAttackPlay from "../training/modes/timeattack/TimeAttackPlay";
import DoubleInOutPlay from "../training/modes/double/DoubleInOutPlay";
import PrecisionGauntletPlay from "../training/modes/precision/PrecisionGauntletPlay";
import SuperBullPlay from "../training/modes/superbull/SuperBullPlay";
import GhostModePlay from "../training/modes/ghost/GhostModePlay";
import RepeatMasterPlay from "../training/modes/repeat/RepeatMasterPlay";
import ChallengesPlay from "../training/modes/challenges/ChallengesPlay";
import EvolutionPlay from "../training/modes/evolution/EvolutionPlay";

type Props = {
  modeId: string;
  onExit: () => void;
  profiles?: Profile[];
};

export default function TrainingModePage({ modeId, onExit, profiles }: Props) {
  const id = String(modeId || "").trim().toLowerCase();

  const [phase, setPhase] = React.useState<"config" | "play">("config");
  const [cfg, setCfg] = React.useState<any>(() => getLastConfig(id));

  const start = (c: any) => {
    setCfg(c);
    setLastConfig(id, c);
    setPhase("play");
  };

  const isPrecision = id === "training_precision_gauntlet";
  const isTimeAttack = id === "training_time_attack";
  const isRepeat = id === "training_repeat_master";
  const isGhost = id === "training_ghost";
  const isDouble = id === "training_doubleio";
  const isChallenges = id === "training_challenges";
  const isEvolution = id === "training_evolution";
  const isSuperBull = id === "training_super_bull";

  if (phase === "config") {
    if (isPrecision) return <PrecisionConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isTimeAttack) return <TimeAttackConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isRepeat) return <RepeatMasterConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isGhost) return <GhostConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isDouble) return <DoubleIOConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isChallenges) return <ChallengesConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isEvolution) return <EvolutionConfig profiles={profiles} onStart={start} onExit={onExit} />;
    if (isSuperBull) return <SuperBullConfig profiles={profiles} onStart={start} onExit={onExit} />;
    return null;
  }

  if (isPrecision) return <PrecisionGauntletPlay config={cfg} onExit={onExit} />;
  if (isTimeAttack) return <TimeAttackPlay config={cfg} onExit={onExit} />;
  if (isRepeat) return <RepeatMasterPlay config={cfg} onExit={onExit} />;
  if (isGhost) return <GhostModePlay config={cfg} onExit={onExit} />;
  if (isDouble) return <DoubleInOutPlay config={cfg} onExit={onExit} />;
  if (isChallenges) return <ChallengesPlay config={cfg} onExit={onExit} />;
  if (isEvolution) return <EvolutionPlay config={cfg} onExit={onExit} />;
  if (isSuperBull) return <SuperBullPlay config={cfg} onExit={onExit} />;
  return null;
}
