import React from "react";
import type { Profile } from "../../lib/types";

// ⚠️ On passe T et renderAvatarCircle depuis CricketPlay pour garder EXACTEMENT le rendu
type Props = {
  T: any;
  allProfiles: Profile[];
  selectedIds: string[];
  toggleProfile: (id: string) => void;

  scoreMode: "points" | "no-points";
  setScoreMode: (v: any) => void;

  maxRounds: number;
  setMaxRounds: (n: number) => void;

  rotateFirstPlayer: boolean;
  setRotateFirstPlayer: (v: any) => void;

  // ✅ NEW options (teams/bots/order)
  playMode: "ffa" | "teams";
  setPlayMode: (v: any) => void;

  startOrder: "chosen" | "random";
  setStartOrder: (v: any) => void;

  allowBots: boolean;
  setAllowBots: (v: any) => void;

  canStart: boolean;
  onStart: () => void;

  renderAvatarCircle: (
    prof: Profile | null,
    opts?: { selected?: boolean; size?: number; mode?: "setup" | "play" }
  ) => React.ReactNode;
};

export default function CricketSetup(props: Props) {
  const {
    T,
    allProfiles,
    selectedIds,
    toggleProfile,
    scoreMode,
    setScoreMode,
    maxRounds,
    setMaxRounds,
    rotateFirstPlayer,
    setRotateFirstPlayer,
    playMode,
    setPlayMode,
    startOrder,
    setStartOrder,
    allowBots,
    setAllowBots,
    canStart,
    onStart,
    renderAvatarCircle,
  } = props;

  // ✅ ICI : TU COLLES TON JSX SETUP ACTUEL TEL QUEL
  // ----> prends exactement ton bloc `if (phase === "setup") { return (...); }`
  // et colle uniquement l'intérieur du return ici (sans le if)

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "16px 12px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: T.gold,
            textShadow:
              "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.6)",
          }}
        >
          Cricket
        </div>
        <div style={{ fontSize: 13, marginTop: 4, color: T.textSoft }}>
          Sélectionne les joueurs et les options pour cette manche.
        </div>
      </div>

      {/* ✅ IMPORTANT : tu remets ici tes blocs actuels "JOUEURS / PARAMÈTRES / OPTIONS AVANCÉES / BOUTON LANCER"
          et tu AJOUTES tes 3 options (mode teams / bots / ordre) dans OPTIONS AVANCÉES
          SANS toucher au style existant.
      */}

      {/* ... COLLE TON CONTENU SETUP ICI ... */}

      {/* BOUTON LANCER */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 80, padding: "0 16px" }}>
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 999,
            border: "none",
            background: canStart
              ? "linear-gradient(135deg,#ffc63a,#ffaf00)"
              : "linear-gradient(135deg,#6b7280,#4b5563)",
            color: canStart ? "#211500" : "#e5e7eb",
            fontSize: 15,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 0 20px rgba(240,177,42,.35)" : "none",
          }}
        >
          Lancer la partie
        </button>
      </div>
    </div>
  );
}
