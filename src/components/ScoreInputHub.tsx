// ============================================
// src/components/ScoreInputHub.tsx
// Hub de saisie unifié
// - Keypad détail, Keypad score de volée et Cible restent les moteurs directs historiques.
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
  activity?: string;
  expectedIndex?: number;
  awaitingConfirm?: boolean;
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

  /** Valide directement un total de volée (mode Keypad score de volée / Dartsmind-like). */
  onSubmitVisitScore?: (score: number, opts?: { bust?: boolean; source?: "typed" | "quick" | "miss" | "bull25" | "bull50" | "next" }) => void;
  /** Mode score de volée : corrige la saisie en cours ou, si elle est vide, annule la dernière volée validée. */
  onCorrectVisitScore?: () => void;
  visitScoreFeedback?: React.ReactNode;

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
  onSubmitVisitScore,
  onCorrectVisitScore,
  visitScoreFeedback,
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
  const voiceActivity = String(voiceControl?.activity || "idle");
  const voiceRequesting = voicePhase === "REQUESTING_MIC" || voiceActivity === "requesting";
  const voiceAwaitingManualValidate =
    method === "voice" && !!voiceControl?.awaitingConfirm && safeCurrentThrow.length > 0;
  const voiceListening =
    !voiceAwaitingManualValidate &&
    (voicePhase.startsWith("LISTEN") ||
      voiceRequesting ||
      voiceActivity === "recording" ||
      voiceActivity === "speech");
  const voiceSupported = voiceControl?.supported !== false;
  const voiceCanStart = !disabled && !voiceAwaitingManualValidate && !!voiceControl?.onStart;
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
          if (voiceAwaitingManualValidate) return;
          if (voiceListening) voiceControl?.onStop?.();
          else voiceControl?.onStart?.();
        },
        disabled: voiceAwaitingManualValidate || (voiceListening ? !voiceCanStop : !voiceCanStart),
        active: voiceListening,
        title: voiceAwaitingManualValidate
          ? "Volée complète : clique sur VALIDER"
          : voiceListening
          ? "Arrêter la saisie vocale"
          : "Démarrer la saisie vocale",
        ariaLabel: voiceAwaitingManualValidate
          ? "Volée complète, valider avec le bouton Valider"
          : voiceListening
          ? "Arrêter la saisie vocale"
          : "Démarrer la saisie vocale",
      };
    }

    return null;
  }, [
    allowPresets,
    disabled,
    method,
    presetOpen,
    voiceAwaitingManualValidate,
    voiceCanStart,
    voiceCanStop,
    voiceControl,
    voiceListening,
  ]);

  const handleValidateFromKeypad = React.useCallback(() => {
    if (disabled) return;
    onValidate();

    // En mode vocal hit-par-hit, les 3 hits sont déjà injectés dans currentThrow.
    // La validation doit donc rester le bouton VALIDER du keypad, puis on nettoie
    // l’état vocal pour ne pas exiger un second clic micro.
    if (method === "voice" && voiceControl?.awaitingConfirm) {
      window.setTimeout(() => voiceControl?.onReset?.(), 0);
    }
  }, [disabled, method, onValidate, voiceControl]);

  const voiceNotice = method === "voice" ? (
    <VoiceInlineNotice
      enabled={!!voiceControl?.enabled}
      supported={voiceSupported}
      listening={voiceListening}
      phase={voicePhase}
      lastHeard={voiceControl?.lastHeard}
      dartsLabel={voiceControl?.dartsLabel}
      dartsTotal={voiceControl?.dartsTotal}
      permissionHint={voiceControl?.permissionHint}
      activity={voiceActivity}
      expectedIndex={voiceControl?.expectedIndex}
      awaitingConfirm={!!voiceControl?.awaitingConfirm}
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
      onValidate={handleValidateFromKeypad}
      hidePreview={hidePreview}
      hideTotal={hideTotal}
      centerSlot={centerSlot}
      auxAction={keypadAuxAction}
      noticeSlot={voiceNotice}
      validateAttention={voiceAwaitingManualValidate}
    />
  );

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes dcVoiceBlink{0%,100%{opacity:1;filter:brightness(1.1)}50%{opacity:.42;filter:brightness(1.85)}} @keyframes dcVoiceGlow{0%,100%{box-shadow:0 0 12px rgba(255,255,255,.26)}50%{box-shadow:0 0 26px rgba(255,255,255,.82)}}`}</style>
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

      {method === "visit_score" && onSubmitVisitScore ? (
        <VisitScoreKeypad
          disabled={disabled}
          feedback={visitScoreFeedback}
          onSubmit={onSubmitVisitScore}
          onCancel={onCancel}
          onCorrectEmpty={onCorrectVisitScore || onCancel}
          fitToParent={fitToParent}
          contentBoxStyle={contentBoxStyle}
          fitOuterRef={fitOuterRef}
          fitInnerRef={fitInnerRef}
          fitScale={fitScale}
        />
      ) : method === "dartboard" ? (
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


function VisitScoreKeypad({
  disabled,
  feedback,
  onSubmit,
  onCancel,
  onCorrectEmpty,
  fitToParent,
  contentBoxStyle,
  fitOuterRef,
  fitInnerRef,
  fitScale,
}: {
  disabled: boolean;
  feedback?: React.ReactNode;
  onSubmit: (score: number, opts?: { bust?: boolean; source?: "typed" | "quick" | "next" | "bust" }) => void;
  onCancel: () => void;
  onCorrectEmpty: () => void;
  fitToParent: boolean;
  contentBoxStyle: React.CSSProperties;
  fitOuterRef: React.MutableRefObject<HTMLDivElement | null>;
  fitInnerRef: React.MutableRefObject<HTMLDivElement | null>;
  fitScale: number;
}) {
  const [raw, setRaw] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);

  const parsed = raw.trim() ? Number(raw) : NaN;
  const canEnter = raw.trim().length > 0 && Number.isFinite(parsed) && parsed >= 0 && parsed <= 180;
  const quickScores = [26, 41, 45, 60, 81, 85, 95, 100, 121, 125, 140, 180];

  const compactFit = fitToParent;

  const wrapCard: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: compactFit ? 16 : 18,
    padding: compactFit ? 10 : 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    userSelect: "none",
  };
  const btnBase: React.CSSProperties = {
    height: compactFit ? "clamp(38px, 7.2vw, 48px)" : "clamp(42px, 8.2vw, 52px)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 0,
    opacity: disabled ? 0.55 : 1,
  };
  const btnGold: React.CSSProperties = {
    ...btnBase,
    background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
    color: "#1a1a1a",
    border: "1px solid rgba(255,180,0,.3)",
    boxShadow: "0 10px 22px rgba(255,170,0,.24)",
  };
  const btnDanger: React.CSSProperties = {
    ...btnBase,
    background: "linear-gradient(180deg, rgba(255,85,85,.25), rgba(100,0,0,.35))",
    color: "#ffb4b4",
    border: "1px solid rgba(255,90,90,.34)",
  };
    const btnPreset: React.CSSProperties = {
    ...btnBase,
    height: compactFit ? "clamp(30px, 5.8vw, 36px)" : "clamp(34px, 7vw, 42px)",
    borderRadius: compactFit ? 12 : 14,
    color: "#ffe7a8",
    background: "rgba(255,187,51,.10)",
    border: "1px solid rgba(255,187,51,.20)",
  };

  const pushDigit = (digit: number) => {
    if (disabled) return;
    setLocalError(null);
    setRaw((prev) => {
      const next = `${prev}${digit}`.replace(/^0+(?=\d)/, "").slice(0, 3);
      const n = Number(next || "0");
      if (n > 180) {
        setLocalError("Maximum 180 points par volée.");
        return prev;
      }
      return next;
    });
  };

  const clearOne = () => {
    if (disabled) return;
    setLocalError(null);
    setRaw((prev) => {
      if (prev.length > 0) return prev.slice(0, -1);
      window.setTimeout(() => onCorrectEmpty(), 0);
      return prev;
    });
  };

  const submit = (score: number, source: "typed" | "quick" | "next" | "bust" = "typed") => {
    if (disabled) return;
    const n = Math.max(0, Math.min(180, Math.floor(Number(score) || 0)));
    setLocalError(null);
    setRaw("");
    onSubmit(n, { source });
  };

  const submitTyped = (source: "typed" | "next" = "typed") => {
    if (raw.trim().length <= 0) {
      if (source === "next") submit(0, "next");
      else setLocalError("Saisis un score de volée ou choisis un raccourci.");
      return;
    }
    if (!canEnter) {
      setLocalError("Score invalide : entre un nombre entre 0 et 180.");
      return;
    }
    submit(parsed, source);
  };

  return (
    <div
      ref={fitToParent ? fitOuterRef : null}
      style={{
        paddingBottom: 6,
        ...contentBoxStyle,
        ...(fitToParent
          ? {
              flex: 1,
              minHeight: 0,
              overflowX: "hidden",
              overflowY: "auto",
              overscrollBehavior: "contain",
              paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
            }
          : {}),
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
        <div style={{ ...wrapCard, width: "100%", maxWidth: "100%", margin: "0 auto", paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: compactFit ? 8 : 10, marginBottom: compactFit ? 8 : 10 }}>
            <button type="button" style={btnDanger} disabled={disabled} onClick={() => { setLocalError(null); setRaw(""); onSubmit(0, { bust: true, source: "bust" }); }}>BUST</button>
            <div
              aria-live="polite"
              style={{
                minWidth: compactFit ? 84 : 92,
                minHeight: compactFit ? 42 : 48,
                borderRadius: compactFit ? 14 : 16,
                display: "grid",
                placeItems: "center",
                padding: compactFit ? "4px 12px" : "6px 14px",
                background: "rgba(0,0,0,.55)",
                border: "1px solid rgba(255,187,51,.42)",
                color: "#ffc63a",
                fontSize: compactFit ? 24 : 26,
                lineHeight: 1,
                fontWeight: 1000,
                boxShadow: "0 0 22px rgba(255,170,0,.16)",
              }}
            >
              {raw || "0"}
            </div>
            <button type="button" style={btnBase} disabled={disabled} onClick={clearOne}>CORRIGER</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: compactFit ? 6 : 7, marginBottom: compactFit ? 8 : 10 }}>
            {quickScores.map((score) => (
              <button key={score} type="button" style={btnPreset} disabled={disabled} onClick={() => submit(score, "quick")}>
                {score}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: compactFit ? 6 : 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button key={digit} type="button" style={btnBase} disabled={disabled} onClick={() => pushDigit(digit)}>
                {digit}
              </button>
            ))}
            <button type="button" style={btnBase} disabled={disabled} onClick={() => pushDigit(0)}>0</button>
            <button
              type="button"
              style={{ ...btnGold, gridColumn: "span 2" }}
              disabled={disabled}
              onClick={() => submitTyped("next")}
            >
              NEXT PLAYER
            </button>
          </div>

          {(localError || feedback) ? (
            <div style={{ marginTop: compactFit ? 8 : 10, borderRadius: 14, padding: compactFit ? "7px 9px" : "8px 10px", border: "1px solid rgba(255,204,102,.34)", background: "rgba(255,174,0,.08)", color: "#ffcc66", fontSize: compactFit ? 10.8 : 11.5, fontWeight: 850, lineHeight: 1.25 }}>
              {localError || feedback}
            </div>
          ) : (
            <div style={{ marginTop: compactFit ? 8 : 10, color: "rgba(255,255,255,.54)", fontSize: compactFit ? 10.8 : 11.5, fontWeight: 750, textAlign: "center" }}>
              Saisie rapide du total : aucune volée détaillée ne sera affichée pour cette partie.
            </div>
          )}
        </div>
      </div>
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
        ...(fitToParent
          ? {
              flex: 1,
              minHeight: 0,
              overflowX: "hidden",
              overflowY: "auto",
              overscrollBehavior: "contain",
              paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
            }
          : {}),
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
  enabled,
  supported,
  listening,
  phase,
  activity,
  lastHeard,
  dartsLabel,
  dartsTotal,
  permissionHint,
  expectedIndex,
  awaitingConfirm,
}: {
  enabled: boolean;
  supported: boolean;
  listening: boolean;
  phase: string;
  activity?: string;
  lastHeard?: string;
  dartsLabel?: string;
  dartsTotal?: number;
  permissionHint?: string | null;
  expectedIndex?: number;
  awaitingConfirm?: boolean;
}) {
  const rawHint = String(permissionHint || "");
  const hintLabel =
    rawHint === "autorisation_micro"
      ? "Autorisation micro…"
      : rawHint === "commande_vocale_inactive"
      ? "Commande vocale inactive pour ce tour"
      : rawHint === "speech_recognition_not_supported"
      ? "Reconnaissance vocale non supportée par ce navigateur"
      : rawHint === "not-allowed" || rawHint === "NotAllowedError"
      ? "Micro refusé par le navigateur"
      : rawHint === "no-speech"
      ? "Aucune voix détectée"
      : rawHint === "écoute_timeout" || rawHint === "ecoute_timeout"
      ? "Écoute terminée : recommence"
      : rawHint === "volée_incomprise"
      ? "Volée incomprise : recommence"
      : rawHint === "volée_prête_valider"
      ? "Volée prête : clique sur VALIDER"
      : rawHint === "confirmation_incomprise"
      ? "Confirmation inutile : clique sur VALIDER"
      : rawHint === "confirmation_timeout"
      ? "Validation vocale désactivée : clique sur VALIDER"
      : rawHint || "";

  const isRequesting = phase === "REQUESTING_MIC" || activity === "requesting";
  const isRecording = phase.startsWith("LISTEN_D") || activity === "recording" || activity === "speech";
  const isWaitingHit = phase.startsWith("WAIT_D");
  const isWaitingConfirm = awaitingConfirm || phase === "WAIT_CONFIRM";
  const isLive = listening || isRequesting || isRecording;
  const hasError = !!rawHint && rawHint !== "autorisation_micro";
  const hitNo = Math.max(1, Math.min(3, Number(expectedIndex ?? 0) + 1));

  const tone = !enabled || !supported || hasError ? "warn" : isLive ? "live" : isWaitingConfirm ? "confirm" : isWaitingHit ? "wait" : "idle";
  const title = !enabled
    ? "Commande vocale inactive pour ce tour"
    : !supported
    ? "Reconnaissance vocale non supportée par ce navigateur"
    : hasError && hintLabel
    ? hintLabel
    : isRequesting
    ? "Autorisation micro…"
    : isWaitingConfirm
    ? `VOLÉE PRÊTE — clique sur VALIDER${dartsLabel ? ` · ${dartsLabel} · ${dartsTotal ?? 0} pts` : ""}`
    : activity === "speech"
    ? "Voix détectée — continue"
    : isRecording
    ? `MICRO ACTIF — annonce le HIT ${hitNo} ou les 3 hits à la suite`
    : isWaitingHit
    ? `HIT ${hitNo} attendu — MICRO puis 1 hit ou les 3 hits`
    : "Appuie sur MICRO puis dicte 1 hit ou les 3 hits";

  const liveDotColor = tone === "warn" ? "#ffcc66" : tone === "live" ? "#b4ff1e" : tone === "confirm" ? "#ffffff" : "rgba(255,255,255,.42)";

  return (
    <div
      style={{
        borderRadius: 14,
        border:
          tone === "warn"
            ? "1px solid rgba(255,204,102,.38)"
            : tone === "live"
            ? "1px solid rgba(180,255,30,.46)"
            : tone === "confirm"
            ? "1px solid rgba(255,255,255,.92)"
            : "1px solid rgba(255,255,255,.09)",
        background:
          tone === "warn"
            ? "rgba(255,174,0,.08)"
            : tone === "live"
            ? "rgba(180,255,30,.11)"
            : tone === "confirm"
            ? "rgba(255,255,255,.14)"
            : "rgba(255,255,255,.045)",
        color: tone === "warn" ? "#ffcc66" : tone === "live" ? "#d8ff66" : tone === "confirm" ? "#ffffff" : "rgba(255,255,255,.68)",
        padding: "0 10px",
        minHeight: 34,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11.5,
        fontWeight: 900,
        lineHeight: 1.16,
        boxShadow: tone === "live" ? "0 0 18px rgba(180,255,30,.14)" : tone === "confirm" ? "0 0 22px rgba(255,255,255,.28)" : "none",
        animation: tone === "confirm" ? "dcVoiceGlow 1s ease-in-out infinite" : undefined,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: tone === "idle" ? 7 : 8,
          height: tone === "idle" ? 7 : 8,
          borderRadius: 999,
          flex: "0 0 auto",
          background: liveDotColor,
          boxShadow: tone === "live" ? "0 0 14px rgba(180,255,30,.75)" : tone === "confirm" ? "0 0 14px rgba(255,255,255,.85)" : "none",
          animation: tone === "live" || tone === "confirm" ? "dcVoiceBlink .9s ease-in-out infinite" : undefined,
        }}
      />
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", minHeight: 17 }}>
          <span>{isLive && tone === "live" ? "🎙️ " : ""}{title}</span>
        </div>
        {lastHeard ? (
          <div style={{ marginTop: 2, color: "rgba(255,255,255,.74)", minHeight: 15 }}>
            Entendu : <b>{lastHeard}</b>
          </div>
        ) : null}
        {dartsLabel ? (
          <div style={{ marginTop: 2, color: "rgba(255,255,255,.82)", minHeight: 15 }}>
            Volée reconnue : <b>{dartsLabel}</b> — Total <b>{dartsTotal ?? 0}</b>
          </div>
        ) : null}
      </div>
      {(isLive && tone === "live") || tone === "confirm" ? (
        <span
          style={{
            flex: "0 0 auto",
            borderRadius: 999,
            padding: "3px 7px",
            border: "1px solid rgba(180,255,30,.42)",
            background: "rgba(0,0,0,.24)",
            color: "#d8ff66",
            fontSize: 10,
            fontWeight: 1000,
            letterSpacing: 0.8,
          }}
        >
          {tone === "confirm" ? "VALIDER" : "REC"}
        </span>
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
      {btn("visit_score", "SCORE VOLÉE", true)}
      {btn("dartboard", "CIBLE", true)}
      {btn("presets", "PRESETS", allowPresets)}
      {btn("voice", "VOICE", true)}
    </div>
  );
}
