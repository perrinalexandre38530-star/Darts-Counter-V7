// ============================================
// TRAINING — Saisie 1 fléchette (Cible cliquable + MISS)
// - Ne dépend pas du Keypad (évite régressions)
// - Chaque hit déclenche onThrow immédiatement
// ============================================

import React from "react";
import DartboardClickable from "../../components/DartboardClickable";
import { useTheme } from "../../contexts/ThemeContext";
import type { TrainingTarget } from "../engine/trainingTypes";

type Props = {
  targetLabel?: string;
  disabled?: boolean;
  onThrow: (target: TrainingTarget | null, hit: boolean, score: number) => void;
};

export default function TrainingScoreInput({
  targetLabel,
  disabled = false,
  onThrow,
}: Props) {
  const { theme } = useTheme();

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.62)",
    border: `1px solid ${theme.borderSoft}`,
    boxShadow: `0 0 0 1px rgba(0,0,0,0.40) inset, 0 10px 22px rgba(0,0,0,0.30), 0 0 16px ${theme.primary}14`,
    color: theme.text,
    fontWeight: 900,
    letterSpacing: 0.2,
  };

  const btn: React.CSSProperties = {
    height: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.48)",
    color: theme.text,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 10px 22px rgba(0,0,0,0.45), 0 0 18px ${theme.primary}12`,
  };

  const btnGold: React.CSSProperties = {
    ...btn,
    border: "1px solid rgba(255,214,102,0.35)",
    background: "linear-gradient(180deg, rgba(255,214,102,0.95), rgba(255,168,0,0.88))",
    color: "#2b1a00",
    boxShadow: "0 10px 22px rgba(255,168,0,0.14)",
  };

  const emitHit = (seg: number, mul: 1 | 2 | 3) => {
    if (disabled) return;

    if (seg === 25) {
      // mul 1 = BULL, mul 2 = DBULL (selon DartboardClickable)
      const bullVal = mul === 2 ? "DBULL" : "BULL";
      const score = mul === 2 ? 50 : 25;
      onThrow({ label: bullVal, value: bullVal }, true, score);
      return;
    }

    const score = seg * mul;
    const label = mul === 3 ? `T${seg}` : mul === 2 ? `D${seg}` : String(seg);
    onThrow({ label, value: seg, multiplier: mul }, true, score);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {targetLabel ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={pill}>Cible : {targetLabel}</div>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <DartboardClickable
          size={240}
          multiplier={1}
          disabled={disabled}
          onHit={(seg: number, mul: 1 | 2 | 3) => emitHit(seg, mul)}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={btn}
          disabled={disabled}
          onClick={() => onThrow(null, false, 0)}
        >
          MISS
        </button>

        <button
          type="button"
          style={btnGold}
          disabled={disabled}
          onClick={() => onThrow({ label: "BULL", value: "BULL" }, true, 25)}
        >
          BULL
        </button>

        <button
          type="button"
          style={btnGold}
          disabled={disabled}
          onClick={() => onThrow({ label: "DBULL", value: "DBULL" }, true, 50)}
        >
          DBULL
        </button>
      </div>
    </div>
  );
}
