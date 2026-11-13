import { shoveRuleSet, shoveTargets } from "./shoveAPennyTargets";

export type ShoveValidatedCell = {
  target: number;
  count: number;
  closed: boolean;
};

type ValidatedState = {
  config?: { modeOptions?: { ruleSet?: string; marksPerBox?: number } };
  special?: { shoveMarksByPlayer?: Record<string, Record<string, number>> };
};

/** Reads committed marks only. Pending darts are intentionally never included. */
export function getShoveValidatedCells(state: ValidatedState | null | undefined, playerId: string): ShoveValidatedCell[] {
  const ruleSet = shoveRuleSet(state?.config?.modeOptions?.ruleSet);
  const required = Math.max(2, Math.min(5, Number(state?.config?.modeOptions?.marksPerBox || 3)));
  const marks = state?.special?.shoveMarksByPlayer?.[playerId] || {};
  return shoveTargets(ruleSet).map((target) => {
    const recorded = Number(marks[String(target)] || 0);
    const count = Number.isFinite(recorded) ? Math.max(0, Math.min(required, recorded)) : 0;
    return { target, count, closed: count >= required };
  });
}
