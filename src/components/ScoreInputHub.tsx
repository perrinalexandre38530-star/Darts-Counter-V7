// ============================================
// src/components/ScoreInputHub.tsx
// Hub de saisie unifié (gros patch)
// - Permet de basculer entre plusieurs méthodes: Keypad, Cible cliquable, Presets
// - Les pages "Play" restent source de vérité (currentThrow, validate, undo, etc.)
// - Compatible drop-in avec l'API du Keypad existant + options.
// ============================================

import React from "react";
import Keypad from "./Keypad";
import DartboardClickable from "./DartboardClickable";
import ScorePresetsBar from "./ScorePresetsBar";
import type { Dart as UIDart } from "../lib/types";
import { SCORE_INPUT_LS_KEY, type ScoreInputMethod } from "../lib/scoreInput/types";

type Props = {
  /** Volée en cours (0..3 flèches) */
  currentThrow: UIDart[];
  /** Multiplicateur actif (1 par défaut, 2 = DOUBLE, 3 = TRIPLE) */
  multiplier: 1 | 2 | 3;

  // Actions (API Keypad)
  onSimple: () => void;
  onDouble: () => void;
  onTriple: () => void;
  onBackspace?: () => void;
  onCancel: () => void;
  onNumber: (n: number) => void;
  onBull: () => void;
  onValidate: () => void;

  /** ✅ NEW: injection directe d'une fléchette (pour presets / IA / voice) */
  onDirectDart?: (d: UIDart) => void;

  /** Masquer les 3 badges d’aperçu (si affichés ailleurs) */
  hidePreview?: boolean;
  /** Masquer le total */
  hideTotal?: boolean;
  /** Remplace le centre */
  centerSlot?: React.ReactNode;

  /** Désactive toutes les saisies */
  disabled?: boolean;
  /** Autorise l'UI voice/auto/ai (placeholders) */
  showPlaceholders?: boolean;
};

function safeReadMethod(): ScoreInputMethod {
  try {
    const v = (localStorage.getItem(SCORE_INPUT_LS_KEY) || "keypad") as ScoreInputMethod;
    if (
      v === "keypad" ||
      v === "dartboard" ||
      v === "presets" ||
      v === "voice" ||
      v === "auto" ||
      v === "ai"
    ) {
      return v;
    }
  } catch {
    // ignore
  }
  return "keypad";
}

function safeWriteMethod(m: ScoreInputMethod) {
  try {
    localStorage.setItem(SCORE_INPUT_LS_KEY, m);
  } catch {
    // ignore
  }
}

export default function ScoreInputHub({
  currentThrow,
  multiplier,
  onSimple,
  onDouble,
  onTriple,
  onBackspace,
  onCancel,
  onNumber,
  onBull,
  onValidate,
  onDirectDart,
  hidePreview,
  hideTotal,
  centerSlot,
  disabled = false,
  showPlaceholders = true,
}: Props) {
  const [method, setMethod] = React.useState<ScoreInputMethod>(safeReadMethod);

  React.useEffect(() => {
    safeWriteMethod(method);
  }, [method]);

  const allowPresets = !!onDirectDart;

  return (
    <div>
      <MethodBar
        method={method}
        setMethod={setMethod}
        allowPresets={allowPresets}
        showPlaceholders={showPlaceholders}
        disabled={disabled}
      />

      {method === "dartboard" ? (
        <div style={{ paddingBottom: 10 }}>
          <DartboardClickable
            multiplier={multiplier}
            disabled={disabled}
            onHit={(seg, mul) => {
              if (disabled) return;
              // On route vers le même pipeline que le keypad
              if (seg === 25) {
                // bull/dbull => direct dart si possible (sinon fallback bull)
                if (onDirectDart) onDirectDart({ v: 25, mult: mul });
                else onBull();
                return;
              }

              if (onDirectDart) {
                onDirectDart({ v: seg, mult: mul });
                return;
              }

              // Fallback: best-effort via toggles + onNumber
              // (moins fiable car state multiplier async, mais mieux que rien)
              if (mul === 3) onTriple();
              else if (mul === 2) onDouble();
              else onSimple();
              onNumber(seg);
            }}
          />
        </div>
      ) : null}

      {method === "presets" && allowPresets ? (
        <div style={{ paddingBottom: 2 }}>
          <ScorePresetsBar
            disabled={disabled}
            currentCount={(currentThrow || []).length}
            onPushDart={(d) => onDirectDart?.(d)}
            autoValidate
            onAutoValidate={onValidate}
          />
          <div
            style={{
              textAlign: "center",
              fontSize: 11.5,
              opacity: 0.72,
              marginBottom: 8,
              fontWeight: 800,
            }}
          >
            Presets = raccourcis (ils remplissent la volée et valident à 3 flèches).
          </div>
        </div>
      ) : null}

      {/* Méthode principale (Keypad) */}
      {method === "keypad" || method === "presets" || method === "voice" || method === "auto" || method === "ai" ? (
        <div>
          {(method === "voice" || method === "auto" || method === "ai") && showPlaceholders ? (
            <PlaceholderCard method={method} />
          ) : null}

          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={onSimple}
            onDouble={onDouble}
            onTriple={onTriple}
            onBackspace={onBackspace}
            onCancel={onCancel}
            onNumber={onNumber}
            onBull={onBull}
            onValidate={onValidate}
            hidePreview={hidePreview}
            hideTotal={hideTotal}
            centerSlot={centerSlot}
          />
        </div>
      ) : null}
    </div>
  );
}

function MethodBar({
  method,
  setMethod,
  allowPresets,
  showPlaceholders,
  disabled,
}: {
  method: ScoreInputMethod;
  setMethod: (m: ScoreInputMethod) => void;
  allowPresets: boolean;
  showPlaceholders: boolean;
  disabled: boolean;
}) {
  const btn = (id: ScoreInputMethod, label: string, enabled = true) => {
    const active = method === id;
    const isDisabled = disabled || !enabled;
    return (
      <button
        key={id}
        type="button"
        disabled={isDisabled}
        onClick={() => setMethod(id)}
        style={{
          height: 36,
          borderRadius: 14,
          border: active
            ? "1px solid rgba(255,198,58,.65)"
            : "1px solid rgba(255,255,255,.10)",
          background: active
            ? "linear-gradient(180deg, rgba(255,198,58,.30), rgba(0,0,0,.35))"
            : "rgba(255,255,255,.05)",
          color: isDisabled
            ? "rgba(255,255,255,.35)"
            : active
              ? "#ffc63a"
              : "rgba(255,255,255,.82)",
          fontWeight: 1000,
          letterSpacing: 0.2,
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
        title={enabled ? label : "Indisponible"}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        marginBottom: 10,
      }}
    >
      {btn("keypad", "KEYPAD")}
      {btn("dartboard", "CIBLE")}
      {btn("presets", "PRESETS", allowPresets)}
      {btn("voice", "VOICE", showPlaceholders)}
    </div>
  );
}

function PlaceholderCard({ method }: { method: ScoreInputMethod }) {
  const title =
    method === "voice"
      ? "Reconnaissance vocale"
      : method === "auto"
        ? "Auto-scoring"
        : "IA / Dartsmind-like";
  const subtitle =
    method === "voice"
      ? "Branchement en cours — le keypad reste disponible en fallback."
      : method === "auto"
        ? "Module léger — à valider et calibrer (fallback keypad)."
        : "Module avancé — à intégrer via onDirectDart (fallback keypad).";
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "linear-gradient(180deg, rgba(10,10,12,.92), rgba(6,6,8,.96))",
        boxShadow: "0 10px 24px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ fontWeight: 1000, letterSpacing: 0.2, color: "#e9d7ff" }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.72, fontWeight: 800 }}>
        {subtitle}
      </div>
    </div>
  );
}
