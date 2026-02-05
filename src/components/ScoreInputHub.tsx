// ============================================
// src/components/ScoreInputHub.tsx
// Hub de saisie unifié (gros patch)
// - Permet de basculer entre plusieurs méthodes: Keypad, Cible cliquable, Presets
// - Les pages "Play" restent source de vérité (currentThrow, validate, undo, etc.)
// - Compatible drop-in avec l'API du Keypad existant + options.
// ============================================

import React from "react";
import RulesModal from "./RulesModal";
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

  /**
   * Affichage du sélecteur de méthode en match.
   * - "drawer" (défaut) : une petite flèche ouvre/ferme un bandeau (discret)
   * - "inline" : bandeau toujours visible
   * - "hidden" : aucun sélecteur (méthode figée par la config)
   */
  switcherMode?: "drawer" | "inline" | "hidden";

  /** Figer la hauteur (utile en paysage tablette) */
  lockContentHeight?: boolean;
  /**
   * Adapter automatiquement le contenu à la hauteur disponible (sans scroll)
   * en appliquant un scale (utile en paysage tablette pour ne rien couper).
   */
  fitToParent?: boolean;
  /** Afficher le sélecteur en overlay (n\'impacte pas la mise en page) */
  switcherOverlay?: boolean;
};

function safeReadDevModeEnabled(): boolean {
  try {
    return localStorage.getItem("dc:devmode:v1") === "1";
  } catch {
    return false;
  }
}

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
  switcherMode = "drawer",
  lockContentHeight = false,
  fitToParent = false,
  switcherOverlay = false,
}: Props) {
  const throwTotal = (currentThrow || []).reduce((a, d) => a + (d?.v || 0) * (d?.mult || 1), 0);

  // ✅ FIX demandé : même rendu visuel que le total du KEYPAD (couleur + glow + typo/taille)
  const totalPillStyle: React.CSSProperties = {
    minWidth: 56,
    height: 36,
    padding: "0 12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(255,214,102,0.42)",
    boxShadow:
      "0 0 0 1px rgba(0,0,0,0.40) inset, 0 10px 22px rgba(255,168,0,0.10), 0 0 16px rgba(255,214,102,0.12)",
    color: "#ffd666",
    fontWeight: 1000,
    fontSize: 18,
    letterSpacing: 0.2,
    lineHeight: 1,
  };

  const btnGoldSmall: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,214,102,0.95), rgba(255,168,0,0.88))",
    color: "#2b1a00",
    fontWeight: 900,
    border: "1px solid rgba(255,214,102,0.35)",
    boxShadow: "0 10px 22px rgba(255,168,0,0.14)",
  };

  const btnDarkSmall: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.45)",
    color: "rgba(255,255,255,0.9)",
    fontWeight: 900,
    border: "1px solid rgba(255,214,102,0.22)",
  };

  const devEnabled = safeReadDevModeEnabled();
  const [openMode, setOpenMode] = React.useState(false);
  const [method, setMethod] = React.useState<ScoreInputMethod>(safeReadMethod);

  // En prod: seules KEYPAD + CIBLE sont officiellement utilisables.
  // Les autres restent sélectionnables uniquement si le mode développeur est activé.
  React.useEffect(() => {
    if (devEnabled) return;
    if (method === "keypad" || method === "dartboard") return;
    setMethod("keypad");
  }, [devEnabled, method]);

  React.useEffect(() => {
    safeWriteMethod(method);
  }, [method]);

  // Presets / Voice / Auto / IA : visibles mais grisés (sauf mode dev)
  const allowPresets = devEnabled && !!onDirectDart && enablePresets;

  // ⚠️ UX: en gameplay on évite les menus repliables (ça fait perdre de la hauteur).
  // On traite "drawer" comme "inline" (toujours visible) et on garde "hidden" pour figer.

  // ✅ Unifier la hauteur visuelle du bloc de saisie :
  // on mesure la hauteur du rendu KEYPAD, puis on applique un minHeight identique aux autres méthodes.
  const contentMeasureRef = React.useRef<HTMLDivElement | null>(null);
  const [baseContentHeight, setBaseContentHeight] = React.useState<number>(0);

  // Auto-fit: scale le contenu pour qu'il tienne dans la hauteur disponible
  // (principalement pour l'affichage paysage tablette).
  const fitOuterRef = React.useRef<HTMLDivElement | null>(null);
  const fitInnerRef = React.useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = React.useState<number>(1);

  const setMeasureAndFitInnerRef = React.useCallback((el: HTMLDivElement | null) => {
    fitInnerRef.current = el;
    contentMeasureRef.current = el;
  }, []);

  React.useLayoutEffect(() => {
    // On prend la hauteur "référence" quand le Keypad est visible.
    if (method !== "keypad") return;
    const el = contentMeasureRef.current;
    if (!el) return;

    const h = el.getBoundingClientRect().height;
    if (h && Math.abs(h - baseContentHeight) > 2) setBaseContentHeight(Math.round(h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, currentThrow?.length, multiplier]);

  React.useLayoutEffect(() => {
    if (!fitToParent) {
      if (fitScale !== 1) setFitScale(1);
      return;
    }

    const compute = () => {
      const outer = fitOuterRef.current;
      const inner = fitInnerRef.current;
      if (!outer || !inner) return;

      const ob = outer.getBoundingClientRect();
      const ib = inner.getBoundingClientRect();

      const oh = ob.height;
      const ow = ob.width;

      // scrollHeight/scrollWidth pour prendre en compte le contenu non contraint
      const ih = Math.max(inner.scrollHeight, ib.height);
      const iw = Math.max(inner.scrollWidth, ib.width);

      if (!oh || !ow || !ih || !iw) return;

      const sH = oh / ih;
      const sW = ow / iw;
      const s = Math.min(1, sH, sW);
      // Descend plus bas sur petits écrans pour éviter le scroll.
      const rounded = Math.max(0.52, Math.round(s * 1000) / 1000);
      if (Math.abs(rounded - fitScale) > 0.01) setFitScale(rounded);
    };

    const raf = requestAnimationFrame(compute);

    // ResizeObserver = recalcul quand la hauteur dispo change (rotation, safe areas, etc.)
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => compute());
      if (fitOuterRef.current) ro.observe(fitOuterRef.current);
      if (fitInnerRef.current) ro.observe(fitInnerRef.current);
    } catch {
      // ignore
    }

    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToParent, method, currentThrow?.length, multiplier]);

  const contentBoxStyle: React.CSSProperties = {
    ...(lockContentHeight && baseContentHeight > 0 ? { minHeight: baseContentHeight } : null),
    ...(fitToParent ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : null),
  };

  return (
    <div style={{ position: "relative" }}>
      
{switcherMode === "hidden" && (
  <>
    <button
      type="button"
      onClick={() => setOpenMode(true)}
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 5,
        height: 30,
        padding: "0 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(0,0,0,0.46)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.4,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      disabled={disabled}
      aria-label="Choisir le mode de saisie"
    >
      MODE
      <span style={{ opacity: 0.75, fontWeight: 1000 }}>
        {method === "dartboard" ? "CIBLE" : "KEYPAD"}
      </span>
    </button>

    <RulesModal open={openMode} onClose={() => setOpenMode(false)} title="Mode de saisie">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 6 }}>
        <button
          type="button"
          onClick={() => {
            setMethod("keypad");
            setOpenMode(false);
          }}
          disabled={disabled}
          className="btn"
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: method === "keypad" ? "rgba(0,255,190,0.16)" : "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 900,
            letterSpacing: 0.3,
          }}
        >
          KEYPAD
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod("dartboard");
            setOpenMode(false);
          }}
          disabled={disabled}
          className="btn"
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: method === "dartboard" ? "rgba(0,255,190,0.16)" : "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 900,
            letterSpacing: 0.3,
          }}
        >
          CIBLE
        </button>
      </div>
    </RulesModal>
  </>
)}
{switcherMode !== "hidden" && (
        <div style={{ marginBottom: 8 }}>
          <MethodBar
            method={method}
            setMethod={setMethod}
            allowPresets={allowPresets}
            showPlaceholders={showPlaceholders}
            disabled={disabled}
            devEnabled={devEnabled}
          />
        </div>
      )}

      {/* CIBLE */}
      {method === "dartboard" ? (
        <div
          ref={fitToParent ? fitOuterRef : null}
          style={{
            paddingBottom: 6,
            ...contentBoxStyle,
            ...(fitToParent
              ? {
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                }
              : {}),
          }}
        >
          <div
            ref={fitToParent ? setMeasureAndFitInnerRef : contentMeasureRef}
            style={
              fitToParent
                ? {
                    transform: `scale(${fitScale})`,
                    transformOrigin: "top left",
                    width: fitScale < 1 ? `${100 / fitScale}%` : "100%",
                  }
                : undefined
            }
          >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <DartboardClickable
              size={230}
              multiplier={multiplier}
              disabled={disabled}
              onHit={(seg, mul) => {
                if (disabled) return;

                // Bull / DBull
                if (seg === 25) {
                  if (onDirectDart) onDirectDart({ v: 25, mult: mul });
                  else onBull(); // fallback: bull simple (DBull non géré par l'API keypad actuelle)
                  return;
                }

                // Injection directe (recommandé)
                if (onDirectDart) {
                  onDirectDart({ v: seg, mult: mul });
                  return;
                }

                // Fallback best-effort via toggles + onNumber (moins fiable, mais évite le "rien")
                if (mul === 3) onTriple();
                else if (mul === 2) onDouble();
                else onSimple();
                onNumber(seg);
              }}
            />
          </div>

          {/* Footer CIBLE — total à gauche + Annuler / Valider à droite (même langage visuel que le keypad) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "0 6px",
            }}
          >
            <div style={totalPillStyle}>{throwTotal}</div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={btnDarkSmall}
                disabled={disabled || (currentThrow || []).length === 0}
                onClick={onCancel}
                aria-label="Annuler la volée"
              >
                ANNULER
              </button>

              <button
                type="button"
                style={btnGoldSmall}
                disabled={disabled || (currentThrow || []).length === 0}
                onClick={onValidate}
                aria-label="Valider la volée"
              >
                VALIDER
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {/* PRESETS */}
      {method === "presets" && allowPresets ? (
        <div style={{ paddingBottom: 2, ...contentBoxStyle }}>
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

      {/* Méthode principale (Keypad + placeholders) */}
      {method === "keypad" || method === "presets" || method === "voice" || method === "auto" || method === "ai" ? (
        <div
          ref={fitToParent ? fitOuterRef : null}
          style={{
            ...contentBoxStyle,
            ...(fitToParent
              ? {
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                }
              : null),
          }}
        >
          <div
            ref={fitToParent ? setMeasureAndFitInnerRef : method === "keypad" ? contentMeasureRef : undefined}
            style={
              fitToParent
                ? {
                    transform: `scale(${fitScale})`,
                    transformOrigin: "top left",
                    width: fitScale < 1 ? `${100 / fitScale}%` : "100%",
                  }
                : undefined
            }
          >
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
  devEnabled,
}: {
  method: ScoreInputMethod;
  setMethod: (m: ScoreInputMethod) => void;
  allowPresets: boolean;
  showPlaceholders: boolean;
  disabled: boolean;
  devEnabled: boolean;
}) {
  const btn = (key: ScoreInputMethod, label: string, enabled: boolean) => {
    const active = method === key;
    const canClick = !disabled && (enabled || devEnabled);
    const visuallyDisabled = !enabled;

    return (
      <button
        key={key}
        onClick={() => {
          if (!canClick) return;
          setMethod(key);
        }}
        disabled={!canClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: active ? "rgba(0,255,190,0.16)" : "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          opacity: visuallyDisabled ? (devEnabled ? 0.55 : 0.38) : 1,
          cursor: canClick ? "pointer" : "not-allowed",
          userSelect: "none",
          whiteSpace: "nowrap",
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
        title={
          visuallyDisabled
            ? devEnabled
              ? "Feature en cours (dev mode : accessible)"
              : "Feature en cours (non disponible)"
            : undefined
        }
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: active ? "rgba(0,255,190,0.95)" : "rgba(255,255,255,0.25)",
            boxShadow: active ? "0 0 10px rgba(0,255,190,0.55)" : "none",
          }}
        />
        <span style={{ fontSize: 12 }}>{label}</span>
        {visuallyDisabled && devEnabled && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            DEV
          </span>
        )}
      </button>
    );
  };

  // Règle produit : seuls KEYPAD et CIBLE sont utilisables (pour l'instant).
  // Le reste est grisé, mais déverrouillable en mode développeur.
  const enableKeypad = true;
  const enableDartboard = true;
  const enablePresets = false;
  const enableVoice = false;
  const enableAuto = false;
  const enableAI = false;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        padding: "6px 2px 2px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {btn("keypad", "KEYPAD", enableKeypad)}
      {btn("dartboard", "CIBLE", enableDartboard)}

      {showPlaceholders && (
        <>
          {btn("presets", "PRESETS", enablePresets && allowPresets)}
          {btn("voice", "VOICE", enableVoice)}
          {btn("auto", "AUTO", enableAuto)}
          {btn("ai", "CAMERA/IA", enableAI)}
        </>
      )}
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
        background: "linear-gradient(180deg, rgba(10,10,12,.92), rgba(6,6,8,.96))",
        boxShadow: "0 10px 24px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ fontWeight: 1000, letterSpacing: 0.2, color: "#e9d7ff" }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.72, fontWeight: 800 }}>{subtitle}</div>
    </div>
  );
}
