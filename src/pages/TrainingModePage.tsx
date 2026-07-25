import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { syncTrainingEvents } from "../training/sync/trainingSyncEngine";
import type { Profile } from "../lib/types";
import { getLastConfig, setLastConfig } from "../training/lib/trainingPersist";

import TimeAttackConfig from "../training/modes/timeattack/TimeAttackConfig";
import DoubleIOConfig from "../training/modes/double/DoubleIOConfig";
import PrecisionConfig from "../training/modes/precision/PrecisionConfig";
import SuperBullConfig from "../training/modes/superbull/SuperBullConfig";
import GhostConfig from "../training/modes/ghost/GhostConfig";
import RepeatMasterConfig from "../training/modes/repeat/RepeatMasterConfig";
import ChallengesConfig from "../training/modes/challenges/ChallengesConfig";
import EvolutionConfig from "../training/modes/evolution/EvolutionConfig";

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

function canonicalTrainingId(rawId: string) {
  const id = String(rawId || "").trim().toLowerCase();
  if (id === "super_bull_training") return "training_super_bull";
  return id;
}

export default function TrainingModePage({ modeId, onExit, profiles }: Props) {
  const { user, online } = useAuthOnline();
  const id = canonicalTrainingId(modeId);
  const [phase, setPhase] = React.useState<"config" | "play">("config");
  const [config, setConfig] = React.useState<any>(() => getLastConfig(id));

  React.useEffect(() => {
    setPhase("config");
    setConfig(getLastConfig(id));
  }, [id]);

  const exitAndSync = React.useCallback(() => {
    try {
      if (user?.id) {
        try {
          localStorage.setItem("dc_user_id", user.id);
        } catch {}
      }
      if (user?.id && online) {
        syncTrainingEvents(user.id).catch(() => {});
      }
    } catch {
      // Le Training reste entièrement jouable hors-ligne.
    } finally {
      onExit();
    }
  }, [onExit, online, user?.id]);

  const start = React.useCallback(
    (nextConfig: any) => {
      const next = {
        ...(nextConfig || {}),
        modeId: id,
        training: true,
        startedFrom: "training_hub",
      };
      setConfig(next);
      setLastConfig(id, next);
      setPhase("play");
    },
    [id]
  );

  const configProps = { profiles, onStart: start, onExit: exitAndSync };
  const playProps = { config, onExit: exitAndSync };

  if (phase === "config") {
    switch (id) {
      case "training_precision_gauntlet":
        return <PrecisionConfig {...configProps} />;
      case "training_time_attack":
        return <TimeAttackConfig {...configProps} />;
      case "training_repeat_master":
        return <RepeatMasterConfig {...configProps} />;
      case "training_ghost":
        return <GhostConfig {...configProps} />;
      case "training_doubleio":
        return <DoubleIOConfig {...configProps} />;
      case "training_challenges":
        return <ChallengesConfig {...configProps} />;
      case "training_super_bull":
        return <SuperBullConfig {...configProps} />;
      case "training_evolution":
        return <EvolutionConfig {...configProps} />;
      default:
        return (
          <div style={{ padding: 18 }}>
            <button type="button" onClick={exitAndSync}>
              ← Retour
            </button>
            <p>Mode Training inconnu : {id}</p>
          </div>
        );
    }
  }

  switch (id) {
    case "training_precision_gauntlet":
      return <PrecisionGauntletPlay {...playProps} />;
    case "training_time_attack":
      return <TimeAttackPlay {...playProps} />;
    case "training_repeat_master":
      return <RepeatMasterPlay {...playProps} />;
    case "training_ghost":
      return <GhostModePlay {...playProps} />;
    case "training_doubleio":
      return <DoubleInOutPlay {...playProps} />;
    case "training_challenges":
      return <ChallengesPlay {...playProps} />;
    case "training_super_bull":
      return <SuperBullPlay {...playProps} />;
    case "training_evolution":
      return <EvolutionPlay {...playProps} />;
    default:
      return (
        <div style={{ padding: 18 }}>
          <button type="button" onClick={exitAndSync}>
            ← Retour
          </button>
          <p>Mode Training inconnu : {id}</p>
        </div>
      );
  }
}
