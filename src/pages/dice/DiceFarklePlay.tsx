// @ts-nocheck
// =============================================================
// src/pages/dice/DiceFarklePlay.tsx
// FARKLE — Play (placeholder v1)
// =============================================================

import React from "react";
import DiceSoonPlay from "./DiceSoonPlay";

export default function DiceFarklePlay({ go, params }: any) {
  return (
    <DiceSoonPlay
      go={go}
      params={
        title: "FARKLE",
        subtitle: "PLAY à venir (bank/bust + combinaisons)",
        ...(params || {}),
      }
    />
  );
}
