// ============================================
// TRAINING — Registry des modes
// ============================================

import RepeatMasterPlay from "./modes/repeat/RepeatMasterPlay";
import SuperBullPlay from "./modes/superbull/SuperBullPlay";
import TimeAttackPlay from "./modes/timeattack/TimeAttackPlay";
import PrecisionGauntletPlay from "./modes/precision/PrecisionGauntletPlay";
import DoubleInOutPlay from "./modes/double/DoubleInOutPlay";
import GhostModePlay from "./modes/ghost/GhostModePlay";
import EvolutionPlay from "./modes/evolution/EvolutionPlay";
import ChallengesPlay from "./modes/challenges/ChallengesPlay";

export const TRAINING_MODES = [
  {
    id: "REPEAT",
    label: "Repeat Master",
    ticker: "ticker_repeat",
    component: RepeatMasterPlay,
  },
  {
    id: "SUPER_BULL",
    label: "Super Bull",
    ticker: "ticker_superbull",
    component: SuperBullPlay,
  },
  {
    id: "TIME_ATTACK",
    label: "Time Attack",
    ticker: "ticker_timeattack",
    component: TimeAttackPlay,
  },
  {
    id: "PRECISION",
    label: "Precision Gauntlet",
    ticker: "ticker_precision",
    component: PrecisionGauntletPlay,
  },
  {
    id: "DOUBLE",
    label: "Double In / Out",
    ticker: "ticker_double",
    component: DoubleInOutPlay,
  },
  {
    id: "GHOST",
    label: "Ghost Mode",
    ticker: "ticker_ghost",
    component: GhostModePlay,
  },
  {
    id: "EVOLUTION",
    label: "Evolution",
    ticker: "ticker_evolution",
    component: EvolutionPlay,
  },
  {
    id: "CHALLENGES",
    label: "Challenges",
    ticker: "ticker_challenges",
    component: ChallengesPlay,
  },
];
