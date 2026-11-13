import React from "react";
import "./KeypadTargets.css";

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
  onValidate,
  maxDarts = 3,
  disabled = false,
  accent = "#ffbe48",
  title = "CIBLE À FERMER",
  progressLabel = "",
  validateLabel = "VALIDER LA VOLÉE",
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

  return (
    <div className="mss-targetpad" data-mss-targeted-keypad="1" style={{ "--mss-target-accent": accent } as React.CSSProperties}>
      <div className="mss-targetpad-heading">
        <span>{title}</span>
        {progressLabel ? <strong>{progressLabel}</strong> : null}
      </div>

      <div className="mss-targetpad-visits" aria-label="Fléchettes de la volée">
        {Array.from({ length: capacity }, (_, i) => (
          <div key={i} className={darts[i] ? "mss-targetpad-visit is-hit" : "mss-targetpad-visit"}>
            <small>{i + 1}</small><b>{darts[i] ? formatDart(darts[i]) : "—"}</b>
          </div>
        ))}
      </div>

      <div className="mss-targetpad-actions">
        <button type="button" className={selectedMultiplier === 2 && !isBullStage ? "double is-active" : "double"} onClick={() => nextMultiplier(2)} disabled={disabled || isBullStage || full} aria-pressed={selectedMultiplier === 2 && !isBullStage}>DOUBLE</button>
        <button type="button" className={selectedMultiplier === 3 && !isBullStage ? "triple is-active" : "triple"} onClick={() => nextMultiplier(3)} disabled={disabled || isBullStage || full} aria-pressed={selectedMultiplier === 3 && !isBullStage}>TRIPLE</button>
        <button type="button" className="miss" disabled={!canThrow} onClick={() => push(0, 1)}>MISS</button>
        <button type="button" className="undo" disabled={disabled || darts.length === 0} onClick={() => { onBackspace(); onMultiplierChange(1); }}>ANNULER</button>
      </div>

      <div className={isBullStage ? "mss-targetpad-targets is-bull" : "mss-targetpad-targets"}>
        {allowedNumbers.map((number) => (
          <button className="mss-targetpad-number" type="button" key={number} onClick={() => push(number, selectedMultiplier)} disabled={!canThrow}>
            <strong>{number}</strong><small>{selectedMultiplier === 3 ? "TRIPLE" : selectedMultiplier === 2 ? "DOUBLE" : "SIMPLE"}</small>
          </button>
        ))}
        {showBull ? <button className="mss-targetpad-bull" type="button" onClick={() => push(25, 1)} disabled={!canThrow}><strong>BULL</strong><small>25 · 1 MARQUE</small></button> : null}
        {showDBull ? <button className="mss-targetpad-dbull" type="button" onClick={() => push(25, 2)} disabled={!canThrow}><strong>DBULL</strong><small>50 · 2 MARQUES</small></button> : null}
        {noTarget ? <div className="mss-targetpad-complete">✓ TOUTES LES CASES FERMÉES</div> : null}
      </div>

      <button type="button" className="mss-targetpad-validate" onClick={onValidate} disabled={!canValidate}>
        {validateLabel}
      </button>
    </div>
  );
}
