// @ts-nocheck
// =============================================================
// src/pages/dice/DicePokerPlay.tsx
// POKER DICE — Play (placeholder v1)
// =============================================================

import React from "react";
import DiceSoonPlay from "./DiceSoonPlay";

export default function DicePokerPlay({ go, params }: any) {
  return (
    <DiceSoonPlay
      go={go}
      params={
        title: "POKER DICE",
        subtitle: "PLAY à venir (paires/brelans/suites)",
        ...(params || {}),
      }
    />
  );
}
