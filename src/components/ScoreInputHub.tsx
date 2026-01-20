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

  /** Autoriser l'onglet Presets (par défaut: auto si onDirectDart est fourni) */
  enablePresets?: boolean;

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

  /** Méthode initiale (issue de la config de match, si dispo) */
  initialMethod?: ScoreInputMethod;
  /** Callback : changement de méthode dans le hub */
  onMethodChange?: (m: ScoreInputMethod) => void;
  /** Force l'affichage de l'onglet AUTO */
  autoEnabled?: boolean;
  /** Force l'affichage de l'onglet IA */
  aiEnabled?: boolean;
  /** Ouvre l'overlay caméra (mode IA caméra assistée) */
  onAiOpen?: () => void;
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
  enablePresets = true,
  hidePreview,
  hideTotal,
  centerSlot,
  disabled = false,
  showPlaceholders = true,
  initialMethod,
  onMethodChange,
  autoEnabled,
  aiEnabled,
  onAiOpen,
}: Props) {
  const [method, setMethod] = React.useState<ScoreInputMethod>(() => {
    const m = initialMethod;
    if (m === "keypad" || m === "dartboard" || m === "presets" || m === "voice" || m === "auto" || m === "ai") {
      return m;
    }
    return safeReadMethod();
  });

  React.useEffect(() => {
    // si la page Play pousse une méthode (ex: au boot), on la respecte
    const m = initialMethod;
    if (!m) return;
    if (m === method) return;
    if (m === "keypad" || m === "dartboard" || m === "presets" || m === "voice" || m === "auto" || m === "ai") {
      setMethod(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMethod]);

  React.useEffect(() => {
    safeWriteMethod(method);
  }, [method]);

  React.useEffect(() => {
    try {
      onMethodChange?.(method);
    } catch {
      // ignore
    }
  }, [method, onMethodChange]);

  const allowPresets = !!onDirectDart && enablePresets;

  // Total de volée (best-effort) — utilisé pour l'UI CIBLE (dartboard)
  const throwTotal = React.useMemo(() => {
    try {
      if (!currentThrow || !Array.isArray(currentThrow)) return 0;
      return currentThrow.reduce((acc: number, d: any) => {
        // Compat: certains modes passent déjà un nombre ; d'autres un objet { n, m } / { base, mult } / { value }
        if (typeof d === "number") return acc + (Number.isFinite(d) ? d : 0);
        if (!d) return acc;
        if (typeof d.value === "number") return acc + (Number.isFinite(d.value) ? d.value : 0);
        const n = typeof d.n === "number" ? d.n : typeof d.base === "number" ? d.base : typeof d.num === "number" ? d.num : null;
        const m = typeof d.m === "number" ? d.m : typeof d.mult === "number" ? d.mult : typeof d.mul === "number" ? d.mul : 1;
        if (typeof n === "number" && Number.isFinite(n) && Number.isFinite(m)) return acc + n * m;
        return acc;
      }, 0);
    } catch {
      return 0;
    }
  }, [currentThrow]);

  return (
    <div>
      <MethodBar
        method={method}
        setMethod={(m) => {
          setMethod(m);
          if (m === "ai") {
            // UX : ouvrir direct l'overlay caméra si branché
            try { onAiOpen?.(); } catch {}
          }
        }}
        allowPresets={allowPresets}
        showPlaceholders={showPlaceholders}
        disabled={disabled}
        autoEnabled={!!autoEnabled}
        aiEnabled={!!aiEnabled}
      />

      {method === "dartboard" ? (
        <div style={{ paddingBottom: 10 }}>
          {/* Bouton RETOUR (réduit) */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => (onBackspace ? onBackspace() : onCancel())}
              disabled={disabled}
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              RETOUR
            </button>
          </div>
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

          {/* Bas de panneau — total volée (gauche) + ANNULER (droite) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 10,
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 14,
                fontWeight: 950,
                letterSpacing: 0.3,
                fontSize: 14,
                minWidth: 84,
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                color: "rgba(255,255,255,0.92)",
              }}
              aria-label="Total volée"
              title="Total volée"
            >
              {Number.isFinite(throwTotal) ? throwTotal : 0}
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                fontWeight: 950,
                letterSpacing: 0.3,
                fontSize: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,200,0,0.18)",
                color: "rgba(255,230,140,0.98)",
              }}
            >
              ANNULER
            </button>
          </div>
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
          {method === "voice" && showPlaceholders ? <PlaceholderCard method={method} /> : null}
          {method === "auto" && showPlaceholders ? <PlaceholderCard method={method} /> : null}
          {method === "ai" ? (
            <AiCameraCard
              enabled={!!aiEnabled || showPlaceholders}
              onOpen={() => {
                try { onAiOpen?.(); } catch {}
              }}
            />
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
  autoEnabled,
  aiEnabled,
}: {
  method: ScoreInputMethod;
  setMethod: (m: ScoreInputMethod) => void;
  allowPresets: boolean;
  showPlaceholders: boolean;
  disabled: boolean;
  autoEnabled: boolean;
  aiEnabled: boolean;
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
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 10,
        marginBottom: 10,
      }}
    >
      {btn("keypad", "KEYPAD")}
      {btn("dartboard", "CIBLE")}
      {btn("presets", "PRESETS", allowPresets)}
      {btn("voice", "VOICE", showPlaceholders)}
      {btn("auto", "AUTO", showPlaceholders || autoEnabled)}
      {btn("ai", "IA", showPlaceholders || aiEnabled)}
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

function AiCameraCard({
  enabled,
  onOpen,
}: {
  enabled: boolean;
  onOpen: () => void;
}) {
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
        IA / Caméra assistée
      </div>
      <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.72, fontWeight: 800 }}>
        Mode "dartsmind-like" (calibrage + tap-to-score). Le keypad reste disponible en fallback.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          type="button"
          disabled={!enabled}
          onClick={() => {
            if (!enabled) return;
            onOpen();
          }}
          style={{
            height: 36,
            borderRadius: 14,
            padding: "0 12px",
            border: "1px solid rgba(255,198,58,.55)",
            background: enabled
              ? "linear-gradient(180deg, rgba(255,198,58,.26), rgba(0,0,0,.28))"
              : "rgba(255,255,255,.06)",
            color: enabled ? "#ffc63a" : "rgba(255,255,255,.4)",
            fontWeight: 1000,
            cursor: enabled ? "pointer" : "not-allowed",
          }}
        >
          Ouvrir la caméra
        </button>
        <div style={{ alignSelf: "center", fontSize: 11.5, opacity: 0.6, fontWeight: 800 }}>
          Astuce: tu peux laisser l'overlay ouvert pendant la partie.
        </div>
      </div>
    </div>
  );
}