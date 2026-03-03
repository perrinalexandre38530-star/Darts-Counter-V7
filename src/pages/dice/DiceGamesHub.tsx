
// ============================================
// src/pages/dice/DiceGamesHub.tsx
// ============================================

import React from "react";
import { useNavigate } from "react-router-dom";

export default function DiceGamesHub() {
  const nav = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h1>🎲 Dice Counter</h1>
      <button onClick={() => nav("/dice/duel/config")}>
        Dice Duel
      </button>
    </div>
  );
}
