// ============================================
// src/components/ScoreInputHub.tsx
// Hub de saisie unifié
// - Keypad et Cible restent les deux moteurs directs historiques.
// - PRESETS n'est plus affiché en gros bloc permanent : bouton intégré au keypad + feuille flottante.
// - VOICE est piloté par un bouton MICRO intégré au keypad.
// - AUTO / IA retirés volontairement des méthodes produit.
// ============================================

import React from "react";
import Keypad, { LightningMiniIcon, MicroMiniIcon } from "./Keypad";
import DartboardClickable from "./DartboardClickable";
import ScorePresetsBar from "./ScorePresetsBar";
import type { Dart as UIDart } from "../lib/types";
import { SCORE_INPUT_LS_KEY, sanitizeScoreInputMethod, type ScoreInputMethod } from "../lib/scoreInput/types";

type VoiceControl = {
  enabled?: boolean;
  supported?: boolean;
  phase?: string;
  lastHeard?: string;
  dartsLabel?: string;
  dartsTotal?: number;
  permissionHint?: string | null;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
};

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

  /** Injection directe d'une fléchette (cible / fallback presets) */
  onDirectDart?: (d: UIDart) => void;
  /** Remplace proprement la volée affichée (utilisé par PRESETS pour éviter le clignotement/auto-validation). */
  onSetVisitDarts?: (darts: UIDart[]) => void;

  /** Méthode choisie par l'écran de config. Prioritaire sur le localStorage. */
  preferredMethod?: ScoreInputMethod | string | null;

  /** Pilotage visuel de la commande vocale. Le hook reste dans la page Play. */
  voiceControl?: VoiceControl;

  /** Autoriser PRESETS (par défaut: auto si onDirectDart ou onSetVisitDarts est fourni) */
  enablePresets?: boolean;

  /** Masquer les 3 badges d’aperçu (si affichés ailleurs) */
  hidePreview?: boolean;
  /** Masquer le total */
  hideTotal?: boolean;
  /** Remplace le centre */
  centerSlot?: React.ReactNode;

  /** Désactive toutes les saisies */
  disabled?: boolean;
  /** Autorise les cartes d’aide pour les méthodes assistées. */
  showPlaceholders?: boolean;
  /** Ancien prop déjà utilisé par certaines pages : masque le sélecteur de méthode. */
  hideSwitcher?: boolean;
  hideTabs?: boolean;
  compact?: boolean;
  onMiss?: () => void;

  /** Affichage du sélecteur de méthode en match. */
  switcherMode?: "drawer" | "inline" | "hidden";

  /** Figer la hauteur (utile en paysage tablette) */
  lockContentHeight?: boolean;
  /** Adapter automatiquement le contenu à la hauteur disponible. */
  fitToParent?: boolean;
  /** Afficher le sélecteur en overlay (compat ancienne API). */
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
    const raw = localStorage.getItem(SCORE_INPUT_LS_KEY) || "keypad";
    const method = sanitizeScoreInputMethod(raw);
    if (method !== raw) localStorage.setItem(SCORE_INPUT_LS_KEY, method);
    return method;
  } catch {
    return "keypad";
  }
}

function safeWriteMethod(m: ScoreInputMethod) {
  try {
    localStorage.setItem(SCORE_INPUT_LS_KEY, m);
  } catch {
    // ignore
  }
}

function throwTotal(throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d: any) => {
    if (!d) return acc;
    const v = Number(d.v || 0);
    const m = Number(d.mult ?? 1);
    if (v === 0 || m === 0) return acc;
    if (v === 25) return acc + (m === 2 ? 50 : 25);
    return acc + v * m;
  }, 0);
}

function normalizePresetDarts(darts: UIDart[]): UIDart[] {
  return (Array.isArray(darts) ? darts : [])
    .slice(0, 3)
    .map((d: any) => {
      const v = Number(d?.v ?? 0);
      const rawMult = Number(d?.mult ?? 1);
      const mult = v === 25 ? (rawMult === 2 ? 2 : 1) : rawMult === 3 ? 3 : rawMult === 2 ? 2 : 1;
      return { v: Number.isFinite(v) ? v : 0, mult: mult as 1 | 2 | 3 } as UIDart;
    });
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
  onSetVisitDarts,
  preferredMethod,
  voiceControl,
  enablePresets = true,
  hidePreview,
  hideTotal,
  centerSlot,
  disabled = false,
  showPlaceholders: _showPlaceholders = true,
  switcherMode = "hidden",
  hideSwitcher = true,
  hideTabs = false,
  compact: _compact = false,
  onMiss: _onMiss,
  lockContentHeight = false,
  fitToParent = false,
  switcherOverlay: _switcherOverlay = false,
}: Props) {
  const devEnabled = safeReadDevModeEnabled();
  const configuredMethod = preferredMethod ? sanitizeScoreInputMethod(preferredMethod) : null;
  const [method, setMethod] = React.useState<ScoreInputMethod>(() => configuredMethod || safeReadMethod());
  const [presetOpen, setPresetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!preferredMethod) return;
    const next = sanitizeScoreInputMethod(preferredMethod);
    setMethod((prev) => (prev === next ? prev : next));
  }, [preferredMethod]);

  React.useEffect(() => {
    safeWriteMethod(method);
  }, [method]);

  const allowPresets = enablePresets && (!!onSetVisitDarts || !!onDirectDart);
  const showSwitcher = !hideSwitcher && !hideTabs && switcherMode !== "hidden";
  const safeCurrentThrow = Array.isArray(currentThrow) ? currentThrow : [];
  const currentTotal = throwTotal(safeCurrentThrow);

  const voicePhase = String(voiceControl?.phase || "OFF");
  const voiceListening = voicePhase.startsWith("LISTEN") || voicePhase === "RECAP_CONFIRM";
  const voiceSupported = voiceControl?.supported !== false;
  const voiceCanStart = !disabled && !!voiceControl?.enabled && voiceSupported && !!voiceControl?.onStart;
  const voiceCanStop = !disabled && voiceListening && !!voiceControl?.onStop;

  const fitOuterRef = React.useRef<HTMLDivElement | null>(null);
  const fitInnerRef = React.useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = React.useState(1);

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
      const oh = ob.height;
      const ow = ob.width;
      const ih = Math.max(inner.scrollHeight, inner.getBoundingClientRect().height);
      const iw = Math.max(inner.scrollWidth, inner.getBoundingClientRect().width);
      if (!oh || !ow || !ih || !iw) return;
      const next = Math.max(0.52, Math.min(1, Math.round(Math.min(oh / ih, ow / iw) * 1000) / 1000));
      if (Math.abs(next - fitScale) > 0.01) setFitScale(next);
    };
    const raf = requestAnimationFrame(compute);
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(compute);
      if (fitOuterRef.current) ro.observe(fitOuterRef.current);
      if (fitInnerRef.current) ro.observe(fitInnerRef.current);
    } catch {}
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
      ro?.disconnect?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToParent, method, safeCurrentThrow.length, multiplier]);

  const contentBoxStyle: React.CSSProperties = {
    ...(lockContentHeight ? { minHeight: 0 } : null),
    ...(fitToParent ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : null),
  };

  const applyPresetVisit = React.useCallback(
    (rawDarts: UIDart[]) => {
      if (disabled) return;
      const darts = normalizePresetDarts(rawDarts);
      if (!darts.length) return;

      // Correction du bug constaté : on ne pousse plus 3 hits + auto-validate en rafale.
      // On remplace la volée affichée, puis l'utilisateur valide lui-même.
      if (onSetVisitDarts) {
        onSetVisitDarts(darts);
      } else if (onDirectDart) {
        // Fallback pour les autres modes : injection espacée, sans validation automatique.
        darts.forEach((d, idx) => window.setTimeout(() => onDirectDart(d), idx * 130));
      }
      setPresetOpen(false);
    },
    [disabled, onDirectDart, onSetVisitDarts]
  );

  const keypadAuxAction = React.useMemo(() => {
    if (method === "presets" && allowPresets) {
      return {
        label: "PRESET",
        icon: <LightningMiniIcon />,
        onClick: () => setPresetOpen(true),
        disabled,
        active: presetOpen,
        title: "Ouvrir les presets de volée",
        ariaLabel: "Ouvrir les presets",
      };
    }

    if (method === "voice") {
      return {
        label: voiceListening ? "STOP" : "MICRO",
        icon: <MicroMiniIcon />,
        onClick: () => {
          if (voiceListening) voiceControl?.onStop?.();
          else voiceControl?.onStart?.();
        },
        disabled: voiceListening ? !voiceCanStop : !voiceCanStart,
        active: voiceListening,
        title: voiceListening ? "Arrêter la saisie vocale" : "Démarrer la saisie vocale",
        ariaLabel: voiceListening ? "Arrêter la saisie vocale" : "Démarrer la saisie vocale",
      };
    }

    return null;
  }, [allowPresets, disabled, method, presetOpen, voiceCanStart, voiceCanStop, voiceControl, voiceListening]);

  const voiceNotice = method === "voice" ? (
    <VoiceInlineNotice
      supported={voiceSupported}
      listening={voiceListening}
      phase={voicePhase}
      lastHeard={voiceControl?.lastHeard}
      dartsLabel={voiceControl?.dartsLabel}
      dartsTotal={voiceControl?.dartsTotal}
      permissionHint={voiceControl?.permissionHint}
    />
  ) : null;

  const renderKeypad = () => (
    <Keypad
      currentThrow={safeCurrentThrow}
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
      auxAction={keypadAuxAction}
      noticeSlot={voiceNotice}
    />
  );

  return (
    <div style={{ position: "relative" }}>
      {showSwitcher ? (
        <div style={{ marginBottom: 8 }}>
          <MethodBar
            method={method}
            setMethod={setMethod}
            allowPresets={allowPresets}
            disabled={disabled}
            devEnabled={devEnabled}
          />
        </div>
      ) : null}

      {method === "dartboard" ? (
        <DartboardInput
          disabled={disabled}
          multiplier={multiplier}
          currentThrow={safeCurrentThrow}
          currentTotal={currentTotal}
          onDirectDart={onDirectDart}
          onBull={onBull}
          onSimple={onSimple}
          onDouble={onDouble}
          onTriple={onTriple}
          onNumber={onNumber}
          onCancel={onCancel}
          onValidate={onValidate}
          fitToParent={fitToParent}
          contentBoxStyle={contentBoxStyle}
          fitOuterRef={fitOuterRef}
          fitInnerRef={fitInnerRef}
          fitScale={fitScale}
        />
      ) : (
        <div
          ref={fitToParent ? fitOuterRef : null}
          style={{
            ...contentBoxStyle,
            ...(fitToParent ? { flex: 1, minHeight: 0, overflow: "hidden" } : null),
          }}
        >
          <div
            ref={fitToParent ? fitInnerRef : null}
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
            {renderKeypad()}
          </div>
        </div>
      )}

      {presetOpen && allowPresets ? (
        <PresetSheet
          disabled={disabled}
          currentCount={safeCurrentThrow.length}
          onClose={() => setPresetOpen(false)}
          onApplyPreset={applyPresetVisit}
        />
      ) : null}
    </div>
  );
}

function DartboardInput({
  disabled,
  multiplier,
  currentThrow,
  currentTotal,
  onDirectDart,
  onBull,
  onSimple,
  onDouble,
  onTriple,
  onNumber,
  onCancel,
  onValidate,
  fitToParent,
  contentBoxStyle,
  fitOuterRef,
  fitInnerRef,
  fitScale,
}: {
  disabled: boolean;
  multiplier: 1 | 2 | 3;
  currentThrow: UIDart[];
  currentTotal: number;
  onDirectDart?: (d: UIDart) => void;
  onBull: () => void;
  onSimple: () => void;
  onDouble: () => void;
  onTriple: () => void;
  onNumber: (n: number) => void;
  onCancel: () => void;
  onValidate: () => void;
  fitToParent: boolean;
  contentBoxStyle: React.CSSProperties;
  fitOuterRef: React.MutableRefObject<HTMLDivElement | null>;
  fitInnerRef: React.MutableRefObject<HTMLDivElement | null>;
  fitScale: number;
}) {
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
    boxShadow: "0 0 0 1px rgba(0,0,0,0.40) inset, 0 10px 22px rgba(255,168,0,0.10), 0 0 16px rgba(255,214,102,0.12)",
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

  return (
    <div
      ref={fitToParent ? fitOuterRef : null}
      style={{
        paddingBottom: 6,
        ...contentBoxStyle,
        ...(fitToParent ? { flex: 1, minHeight: 0, overflow: "hidden" } : {}),
      }}
    >
      <div
        ref={fitToParent ? fitInnerRef : null}
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
              if (seg === 25) {
                if (onDirectDart) onDirectDart({ v: 25, mult: mul === 2 ? 2 : 1 } as UIDart);
                else onBull();
                return;
              }
              if (onDirectDart) {
                onDirectDart({ v: seg, mult: mul as 1 | 2 | 3 });
                return;
              }
              if (mul === 3) onTriple();
              else if (mul === 2) onDouble();
              else onSimple();
              onNumber(seg);
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 6px" }}>
          <div style={totalPillStyle}>{currentTotal}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={btnDarkSmall} disabled={disabled || currentThrow.length === 0} onClick={onCancel}>
              ANNULER
            </button>
            <button type="button" style={btnGoldSmall} disabled={disabled || currentThrow.length === 0} onClick={onValidate}>
              VALIDER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function VoiceInlineNotice({
  supported,
  listening,
  phase,
  lastHeard,
  dartsLabel,
  dartsTotal,
  permissionHint,
}: {
  supported: boolean;
  listening: boolean;
  phase: string;
  lastHeard?: string;
  dartsLabel?: string;
  dartsTotal?: number;
  permissionHint?: string | null;
}) {
  const tone = !supported || permissionHint ? "warn" : listening ? "live" : "idle";
  const title = !supported
    ? "Micro indisponible"
    : permissionHint
    ? `Micro : ${permissionHint}`
    : phase === "RECAP_CONFIRM"
    ? "Confirme : oui / non"
    : listening
    ? "Micro en écoute"
    : "Appuie sur MICRO puis dicte la volée";

  return (
    <div
      style={{
        borderRadius: 14,
        border:
          tone === "warn"
            ? "1px solid rgba(255,204,102,.38)"
            : tone === "live"
            ? "1px solid rgba(180,255,30,.36)"
            : "1px solid rgba(255,255,255,.09)",
        background:
          tone === "warn"
            ? "rgba(255,174,0,.08)"
            : tone === "live"
            ? "rgba(180,255,30,.10)"
            : "rgba(255,255,255,.045)",
        color: tone === "warn" ? "#ffcc66" : tone === "live" ? "#d8ff66" : "rgba(255,255,255,.68)",
        padding: "7px 9px",
        fontSize: 11.5,
        fontWeight: 900,
        lineHeight: 1.25,
      }}
    >
      <div>{title}</div>
      {lastHeard ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.74)" }}>Entendu : <b>{lastHeard}</b></div> : null}
      {dartsLabel ? (
        <div style={{ marginTop: 2, color: "rgba(255,255,255,.82)" }}>
          Saisie : <b>{dartsLabel}</b> — Total <b>{dartsTotal ?? 0}</b>
        </div>
      ) : null}
    </div>
  );
}

function PresetSheet({
  disabled,
  currentCount,
  onClose,
  onApplyPreset,
}: {
  disabled: boolean;
  currentCount: number;
  onClose: () => void;
  onApplyPreset: (darts: UIDart[]) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(0,0,0,.72)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "16px 12px calc(16px + var(--safe-bottom))",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          borderRadius: 24,
          border: "1px solid rgba(180,255,30,.26)",
          background: "linear-gradient(180deg, rgba(18,22,30,.98), rgba(5,7,10,.98))",
          boxShadow: "0 24px 70px rgba(0,0,0,.75), 0 0 38px rgba(180,255,30,.12)",
          padding: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ color: "#b9ff2a", fontWeight: 1000, letterSpacing: 1, fontSize: 15 }}>PRESETS</div>
            <div style={{ color: "rgba(255,255,255,.62)", fontWeight: 800, fontSize: 12 }}>
              Choisis une volée : elle remplit le keypad, puis tu valides.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.16)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              fontWeight: 1000,
            }}
          >
            ×
          </button>
        </div>

        <ScorePresetsBar
          disabled={disabled}
          currentCount={currentCount}
          onPushDart={() => {}}
          onApplyPreset={onApplyPreset}
          autoValidate={false}
        />
      </div>
    </div>
  );
}

function MethodBar({
  method,
  setMethod,
  allowPresets,
  disabled,
  devEnabled,
}: {
  method: ScoreInputMethod;
  setMethod: (m: ScoreInputMethod) => void;
  allowPresets: boolean;
  disabled: boolean;
  devEnabled: boolean;
}) {
  const btn = (key: ScoreInputMethod, label: string, enabled: boolean) => {
    const active = method === key;
    const canClick = !disabled && (enabled || devEnabled);
    return (
      <button
        key={key}
        type="button"
        onClick={() => canClick && setMethod(key)}
        disabled={!canClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: active ? "rgba(180,255,30,0.16)" : "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          opacity: enabled ? 1 : devEnabled ? 0.55 : 0.38,
          cursor: canClick ? "pointer" : "not-allowed",
          userSelect: "none",
          whiteSpace: "nowrap",
          fontWeight: 900,
          letterSpacing: 0.2,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: active ? "rgba(180,255,30,0.95)" : "rgba(255,255,255,0.25)",
            boxShadow: active ? "0 0 10px rgba(180,255,30,0.55)" : "none",
          }}
        />
        <span style={{ fontSize: 12 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "6px 2px 2px", WebkitOverflowScrolling: "touch" }}>
      {btn("keypad", "KEYPAD", true)}
      {btn("dartboard", "CIBLE", true)}
      {btn("presets", "PRESETS", allowPresets)}
      {btn("voice", "VOICE", true)}
    </div>
  );
}
