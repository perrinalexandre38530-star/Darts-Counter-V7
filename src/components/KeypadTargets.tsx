import React from "react";
import "./KeypadTargets.css";
import { mssHitColor } from "../lib/mssVisualCharter";

export type TargetedKeypadHit = { v: number; mult: 1 | 2 | 3 };

type Props = {
  /** Only these sectors are visible; pass one sector for an ordered objective. */
  allowedNumbers: readonly number[];
  showBull?: boolean;
  showDBull?: boolean;
  selectedMultiplier: 1 | 2 | 3;
  onMultiplierChange: (value: 1 | 2 | 3) => void;
  darts: readonly TargetedKeypadHit[];
  onDart: (dart: TargetedKeypadHit) => void;
  onBackspace: () => void;
  onUndoVisit?: () => void;
  canUndoVisit?: boolean;
  onValidate: () => void;
  maxDarts?: number;
  disabled?: boolean;
  accent?: string;
  title?: string;
  progressLabel?: string;
  validateLabel?: string;
};

function formatDart(dart: TargetedKeypadHit): string {
  if (!dart || dart.v === 0) return "MISS";
  if (dart.v === 25 || dart.v === 50) return dart.mult === 2 || dart.v === 50 ? "DBULL" : "BULL";
  return (dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S") + dart.v;
}

/**
 * Clavier autonome pour les jeux à objectif ciblé.
 * Réutilisable pour CHALLENGE et les variantes sans modifier KeypadX01.
 */
export default function KeypadTargets({
  allowedNumbers,
  showBull = false,
  showDBull = false,
  selectedMultiplier,
  onMultiplierChange,
  darts,
  onDart,
  onBackspace,
  onUndoVisit,
  canUndoVisit = false,
  onValidate,
  maxDarts = 3,
  disabled = false,
  accent = "#ffbe48",
  title = "CIBLE À FERMER",
  progressLabel = "",
  validateLabel = "VALIDER",
}: Props) {
  const capacity = Math.max(1, Math.min(3, maxDarts));
  const full = darts.length >= capacity;
  const noTarget = allowedNumbers.length === 0 && !showBull && !showDBull;
  const canThrow = !disabled && !full && !noTarget;
  const canValidate = !disabled && darts.length > 0;
  const isBullStage = (showBull || showDBull) && allowedNumbers.length === 0;
  const nextMultiplier = (value: 2 | 3) => {
    if (disabled || isBullStage) return;
    onMultiplierChange(selectedMultiplier === value ? 1 : value);
  };
  const push = (v: number, mult: 1 | 2 | 3) => {
    if (!canThrow) return;
    onDart({ v, mult });
    onMultiplierChange(1);
  };

  const isNine = allowedNumbers.length === 9;
  return (
    <div className="mss-targetpad" data-mss-targeted-keypad="1" data-targetpad-layout={isNine ? "nine" : "compact"} style={{ "--mss-target-accent": accent } as React.CSSProperties}>
      <div className="mss-targetpad-visits" aria-label="Fléchettes de la volée">
        {Array.from({ length: capacity }, (_, i) => {
          const dart = darts[i];
          const tone = mssHitColor(dart);
          return <div key={i} className={dart ? "mss-targetpad-visit is-hit" : "mss-targetpad-visit"} style={{ "--mss-dart-tone": tone } as React.CSSProperties}>
            <b>{dart ? formatDart(dart) : "—"}</b>
          </div>;
        })}
      </div>
      <div className="mss-targetpad-actions">
        <button type="button" className={selectedMultiplier === 2 && !isBullStage ? "double is-active" : "double"} onClick={() => nextMultiplier(2)} disabled={disabled || isBullStage || full} aria-pressed={selectedMultiplier === 2 && !isBullStage}>DOUBLE</button>
        <button type="button" className={selectedMultiplier === 3 && !isBullStage ? "triple is-active" : "triple"} onClick={() => nextMultiplier(3)} disabled={disabled || isBullStage || full} aria-pressed={selectedMultiplier === 3 && !isBullStage}>TRIPLE</button>
        <button type="button" className="miss" disabled={!canThrow} onClick={() => push(0, 1)}>MISS</button>
        <button type="button" className="undo" disabled={disabled || (darts.length === 0 && !canUndoVisit)} onClick={() => { if (darts.length) onBackspace(); else onUndoVisit?.(); onMultiplierChange(1); }}>ANNULER</button>
      </div>
      <div className={isNine ? "mss-targetpad-targets is-nine" : isBullStage ? "mss-targetpad-targets is-bull" : "mss-targetpad-targets is-compact"}>
        {allowedNumbers.map((number) => <button className="mss-targetpad-number" type="button" key={number} onClick={() => push(number, selectedMultiplier)} disabled={!canThrow}><strong>{number}</strong></button>)}
        {showBull ? <button className="mss-targetpad-bull" type="button" onClick={() => push(25, 1)} disabled={!canThrow}><strong>BULL</strong></button> : null}
        {showDBull ? <button className="mss-targetpad-dbull" type="button" onClick={() => push(25, 2)} disabled={!canThrow}><strong>DBULL</strong></button> : null}
        {noTarget ? <div className="mss-targetpad-complete">✓</div> : null}
      </div>
      <button type="button" className="mss-targetpad-validate" onClick={onValidate} disabled={!canValidate}>{validateLabel}</button>
    </div>
  );
}
