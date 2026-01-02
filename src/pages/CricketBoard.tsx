import React from "react";
import type { Profile } from "../../lib/types";
import {
  CRICKET_TARGETS,
  type CricketTarget,
  type CricketState,
  type Multiplier,
} from "../../lib/cricketEngine";
import { DartIconColorizable, CricketMarkIcon } from "../../components/MaskIcon";

type Props = {
  T: any;
  ACCENTS: string[];
  CRICKET_UI_TARGETS: CricketTarget[];
  getTargetColor: (t: CricketTarget) => string;
  darkenColor: (hex: string, factor?: number) => string;

  state: CricketState;
  currentPlayer: any;
  isFinished: boolean;
  scoreMode: "points" | "no-points";

  hitMode: "S" | "D" | "T";
  setHitMode: (v: any) => void;

  showHelp: boolean;
  setShowHelp: (v: boolean) => void;

  showEnd: boolean;
  setShowEnd: (v: boolean) => void;

  profileById: Map<string, Profile>;

  handleUndo: () => void;
  handleBull: () => void;
  handleKeyPress: (value: number) => void;

  handleSaveAndQuit: () => void;
  handleSaveAndReplay: () => void;

  winnerName: string | null;
};

export default function CricketBoard(props: Props) {
  const {
    T,
    ACCENTS,
    CRICKET_UI_TARGETS,
    getTargetColor,
    darkenColor,
    state,
    currentPlayer,
    isFinished,
    scoreMode,
    hitMode,
    setHitMode,
    showHelp,
    setShowHelp,
    showEnd,
    setShowEnd,
    profileById,
    handleUndo,
    handleBull,
    handleKeyPress,
    handleSaveAndQuit,
    handleSaveAndReplay,
    winnerName,
  } = props;

  // ✅ ICI : TU COLLES TON JSX PLAY ACTUEL TEL QUEL
  // ----> prends exactement ton bloc `return ( ... )` de la phase PLAY
  // (tout ce que tu dis “parfait”) et colle-le ici.
  // Tu gardes exactement tes styles.

  // ⚠️ Remarque : `renderAvatarCircle` est dans CricketPlay : soit tu le dupliques ici,
  // soit tu le passes en prop. Pour préserver 100% le rendu, le mieux = le passer en prop.
  // Si tu veux, je te donne la version "renderAvatarCircle" en prop.

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`, color: T.text, padding: "12px 10px 80px", boxSizing: "border-box" }}>
      {/* 👉 COLLE ICI TOUT TON PLAY EXISTANT (header, tableau, keypad, modals, etc.) */}
      {/* Je ne le recopie pas ici car il est énorme, mais la règle = COPIER/COLLER STRICT. */}
      <div style={{ opacity: 0.8, fontSize: 12 }}>
        (CricketBoard : colle ici ton JSX PLAY actuel inchangé)
      </div>
    </div>
  );
}
