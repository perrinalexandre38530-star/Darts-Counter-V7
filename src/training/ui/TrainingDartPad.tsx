import React from "react";
import Keypad from "../../components/Keypad";
import type { Dart as UIDart } from "../../lib/types";
import { normalizeTrainingVisit, type TrainingDart } from "../lib/trainingDarts";

export default function TrainingDartPad({
  onVisit,
  disabled = false,
  notice,
  centerSlot,
  requireFullVisit = false,
}: {
  onVisit: (darts: TrainingDart[]) => void;
  disabled?: boolean;
  notice?: React.ReactNode;
  centerSlot?: React.ReactNode;
  requireFullVisit?: boolean;
}) {
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  React.useEffect(() => {
    if (!disabled) return;
    setCurrentThrow([]);
    setMultiplier(1);
  }, [disabled]);

  const append = React.useCallback(
    (dart: UIDart) => {
      if (disabled) return;
      setCurrentThrow((prev) => (prev.length >= 3 ? prev : [...prev, dart]));
      setMultiplier(1);
    },
    [disabled]
  );

  const validate = React.useCallback(() => {
    if (disabled || currentThrow.length === 0) return;
    if (requireFullVisit && currentThrow.length < 3) return;

    const darts = normalizeTrainingVisit(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
    onVisit(darts);
  }, [currentThrow, disabled, onVisit, requireFullVisit]);

  const validationHint =
    requireFullVisit && currentThrow.length > 0 && currentThrow.length < 3
      ? `Complète la volée : ${currentThrow.length}/3`
      : null;

  return (
    <div
      style={{
        width: "100%",
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <Keypad
        currentThrow={currentThrow}
        multiplier={multiplier}
        onSimple={() => setMultiplier(1)}
        onDouble={() => setMultiplier(2)}
        onTriple={() => setMultiplier(3)}
        onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
        onCancel={() => {
          setCurrentThrow([]);
          setMultiplier(1);
        }}
        onNumber={(n) => {
          const safeMult: 1 | 2 | 3 = n === 0 ? 1 : multiplier;
          append({ v: n, mult: safeMult } as UIDart);
        }}
        onBull={() => append({ v: 25, mult: multiplier === 2 ? 2 : 1 } as UIDart)}
        onValidate={validate}
        noticeSlot={
          validationHint ? (
            <div style={{ fontSize: 11, fontWeight: 900, textAlign: "center", opacity: 0.78 }}>
              {validationHint}
            </div>
          ) : (
            notice
          )
        }
        centerSlot={centerSlot}
        hideTotal={!!centerSlot}
        validateAttention={currentThrow.length > 0 && (!requireFullVisit || currentThrow.length === 3)}
      />
    </div>
  );
}
