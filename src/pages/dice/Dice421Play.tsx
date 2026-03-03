// @ts-nocheck
// =============================================================
// src/pages/dice/Dice421Play.tsx
// 421 — Play (placeholder v1)
// =============================================================

import React from "react";
import DiceSoonPlay from "./DiceSoonPlay";

export default function Dice421Play({ go, params }: any) {
  return (
    <DiceSoonPlay
      go={go}
      params={
        title: "421",
        subtitle: "PLAY à venir (combos + annonces)",
        ...(params || {}),
      }
    />
  );
}
