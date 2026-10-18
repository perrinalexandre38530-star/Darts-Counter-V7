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
  /** Remplace directement la volée complète (préféré : évite les rafales de setState). */
  onApplyPreset?: (darts: UIDart[]) => void;
  /** Permet au parent de valider automatiquement après 3 darts si souhaité */
  onAutoValidate?: () => void;
  /** Nombre de darts déjà saisies (0..3) */
  currentCount: number;
  /** Si true, on valide automatiquement quand on arrive à 3 */
  autoValidate?: boolean;
  themePrimary?: string;
  themeSecondary?: string;
};

const PRESETS: Preset[] = [
  { id: "p180", label: "180", darts: [{ v: 20, mult: 3 }, { v: 20, mult: 3 }, { v: 20, mult: 3 }], hint: "T20 T20 T20" },
  { id: "p140", label: "140", darts: [{ v: 20, mult: 3 }, { v: 20, mult: 3 }, { v: 20, mult: 1 }], hint: "T20 T20 S20" },
  { id: "p100", label: "100", darts: [{ v: 20, mult: 3 }, { v: 20, mult: 1 }, { v: 20, mult: 1 }], hint: "T20 S20 S20" },
  { id: "p81", label: "81", darts: [{ v: 19, mult: 3 }, { v: 12, mult: 2 }], hint: "T19 D12" },
  { id: "p60", label: "60", darts: [{ v: 20, mult: 3 }], hint: "T20" },
  { id: "p45", label: "45", darts: [{ v: 15, mult: 3 }], hint: "T15" },
  { id: "p41", label: "41", darts: [{ v: 9, mult: 3 }, { v: 14, mult: 1 }], hint: "T9 S14" },
  { id: "p26", label: "26", darts: [{ v: 20, mult: 1 }, { v: 5, mult: 1 }, { v: 1, mult: 1 }], hint: "S20 S5 S1" },
  { id: "pBull3", label: "BULL×3", darts: [{ v: 25, mult: 1 }, { v: 25, mult: 1 }, { v: 25, mult: 1 }], hint: "BULL BULL BULL" },
  { id: "pDBull", label: "DBULL", darts: [{ v: 25, mult: 2 }], hint: "DBULL" },
  { id: "pMiss3", label: "MISS×3", darts: [{ v: 0, mult: 1 }, { v: 0, mult: 1 }, { v: 0, mult: 1 }], hint: "MISS MISS MISS" },
];

export default function ScorePresetsBar({
  disabled = false,
  onPushDart,
  onApplyPreset,
  onAutoValidate,
  currentCount,
  autoValidate = false,
  themePrimary,
  themeSecondary,
}: Props) {
  const primary = String(themePrimary || "#55e6ff");
  const secondary = String(themeSecondary || primary);
  const lightBg = `linear-gradient(180deg, color-mix(in srgb, ${primary} 28%, white 72%), color-mix(in srgb, ${primary} 18%, white 82%))`;
  const darkBg = `linear-gradient(180deg, color-mix(in srgb, ${secondary} 40%, #0b1017 60%), color-mix(in srgb, ${secondary} 26%, #05080d 74%))`;
  const lightText = `color-mix(in srgb, ${secondary} 72%, #091018 28%)`;
  const darkText = `color-mix(in srgb, ${primary} 30%, white 70%)`;
  function applyPreset(p: Preset) {
    if (disabled) return;

    const dartsToUse = p.darts.slice(0, 3);

    // Nouvelle voie préférée : remplacer la volée en une seule opération.
    // Cela évite le bug mobile où les hits apparaissaient puis disparaissaient
    // à cause de 3 injections + validation automatique trop rapprochées.
    if (onApplyPreset) {
      onApplyPreset(dartsToUse);
      return;
    }

    let count = currentCount;
    const dartsToPush = dartsToUse.filter(() => {
      if (count >= 3) return false;
      count += 1;
      return true;
    });

    dartsToPush.forEach((d, idx) => {
      window.setTimeout(() => onPushDart(d), idx * 130);
    });

    if (autoValidate && count >= 3) {
      window.setTimeout(() => onAutoValidate?.(), dartsToPush.length * 130 + 180);
    }
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
      {PRESETS.map((p, index) => {
        const numericValue = Number.parseInt(String(p.label), 10);
        const useLight = Number.isFinite(numericValue) ? numericValue <= 85 : index % 2 === 0;
        const background = useLight ? lightBg : darkBg;
        const color = useLight ? lightText : darkText;
        const border = useLight
          ? `1px solid color-mix(in srgb, ${primary} 34%, white 66%)`
          : `1px solid color-mix(in srgb, ${primary} 42%, rgba(255,255,255,.22) 58%)`;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            title={p.hint || p.label}
            disabled={disabled}
            style={{
              height: 44,
              borderRadius: 14,
              border,
              background: disabled ? "rgba(255,255,255,.03)" : background,
              color: disabled ? "rgba(255,255,255,.35)" : color,
              fontWeight: 1000,
              letterSpacing: 0.2,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: disabled ? "none" : `0 10px 22px color-mix(in srgb, ${primary} 10%, transparent 90%)`,
              textShadow: useLight ? "none" : "0 1px 0 rgba(0,0,0,.24)",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
