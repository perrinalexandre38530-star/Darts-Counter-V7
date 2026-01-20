// ============================================
// src/components/ScorePresetsBar.tsx
// Presets "1 tap" -> renseigne 1..3 fléchettes (ex: 180)
// - Conçu comme une méthode de saisie complémentaire
// - Le parent reste source de vérité (currentThrow, validate, etc.)
// ============================================

import React from "react";
import type { Dart as UIDart } from "../lib/types";

type Preset = {
  id: string;
  label: string;
  darts: UIDart[]; // 1..3
  hint?: string;
};

type Props = {
  disabled?: boolean;
  /** Ajoute les fléchettes du preset via onPushDart (appelé N fois) */
  onPushDart: (d: UIDart) => void;
  /** Permet au parent de valider automatiquement après 3 darts si souhaité */
  onAutoValidate?: () => void;
  /** Nombre de darts déjà saisies (0..3) */
  currentCount: number;
  /** Si true, on valide automatiquement quand on arrive à 3 */
  autoValidate?: boolean;
};

const PRESETS: Preset[] = [
  {
    id: "p180",
    label: "180",
    darts: [
      { v: 20, mult: 3 },
      { v: 20, mult: 3 },
      { v: 20, mult: 3 },
    ],
    hint: "T20 T20 T20",
  },
  {
    id: "p140",
    label: "140",
    darts: [
      { v: 20, mult: 3 },
      { v: 20, mult: 3 },
      { v: 20, mult: 1 },
    ],
    hint: "T20 T20 S20",
  },
  {
    id: "p100",
    label: "100",
    darts: [
      { v: 20, mult: 3 },
      { v: 20, mult: 2 },
    ],
    hint: "T20 D20",
  },
  {
    id: "p81",
    label: "81",
    darts: [
      { v: 19, mult: 3 },
      { v: 12, mult: 2 },
    ],
    hint: "T19 D12",
  },
  {
    id: "pBull",
    label: "BULL×3",
    darts: [
      { v: 25, mult: 1 },
      { v: 25, mult: 1 },
      { v: 25, mult: 1 },
    ],
    hint: "25/25/25",
  },
  {
    id: "pDBull",
    label: "DBULL",
    darts: [{ v: 25, mult: 2 }],
    hint: "50",
  },
  {
    id: "pMISS",
    label: "MISS×3",
    darts: [
      { v: 0, mult: 1 },
      { v: 0, mult: 1 },
      { v: 0, mult: 1 },
    ],
  },
];

export default function ScorePresetsBar({
  disabled = false,
  onPushDart,
  onAutoValidate,
  currentCount,
  autoValidate = false,
}: Props) {
  function applyPreset(p: Preset) {
    if (disabled) return;
    // push jusqu'à 3 max
    let count = currentCount;
    for (const d of p.darts) {
      if (count >= 3) break;
      onPushDart(d);
      count += 1;
    }
    if (autoValidate && count >= 3) onAutoValidate?.();
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        marginBottom: 12,
      }}
    >
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => applyPreset(p)}
          title={p.hint || p.label}
          disabled={disabled}
          style={{
            height: 44,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.10)",
            background: disabled
              ? "rgba(255,255,255,.03)"
              : "linear-gradient(180deg, rgba(46,150,193,.20), rgba(0,0,0,.35))",
            color: disabled ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.92)",
            fontWeight: 1000,
            letterSpacing: 0.2,
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: disabled ? "none" : "0 10px 22px rgba(0,0,0,.28)",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
