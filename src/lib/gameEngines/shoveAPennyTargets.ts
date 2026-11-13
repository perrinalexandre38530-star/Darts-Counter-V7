/**
 * SHOVE HA'PENNY : deux variantes documentées.
 *
 * traditional = darts sur 1..9, ordre libre (référence jeu de pub)
 * electronic  = 15..20 puis bull, dans l'ordre (bornes électroniques)
 *
 * Sans ruleSet explicite, les helpers conservent electronic pour ne pas
 * réinterpréter les anciennes parties sauvegardées.
 */
export const SHOVE_TARGETS = [15, 16, 17, 18, 19, 20, 25] as const;
export const SHOVE_TRADITIONAL_TARGETS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type ShoveRuleSet = "traditional" | "electronic";

export type ShoveDart = {
  bed: "S" | "D" | "T" | "OB" | "IB" | "MISS";
  number?: number;
};

export type ShoveMarks = Record<string, number>;

export function shoveRuleSet(raw: unknown): ShoveRuleSet {
  return raw === "traditional" ? "traditional" : "electronic";
}

export function shoveTargets(rule: ShoveRuleSet = "electronic"): readonly number[] {
  return rule === "traditional" ? SHOVE_TRADITIONAL_TARGETS : SHOVE_TARGETS;
}

/** Number of completed sectors. 1 or 2 marks alone never form a closed sector. */
export function shoveClosedCases(
  marks: ShoveMarks | null | undefined,
  required = 3,
  rule: ShoveRuleSet = "electronic",
): number {
  const need = Math.max(1, Math.floor(Number(required) || 3));
  return shoveTargets(rule).filter((sector) => Number(marks?.[String(sector)] || 0) >= need).length;
}

/** Partial marks are retained for strategy, tie breaks and Cricket symbols. */
export function shoveTotalMarks(
  marks: ShoveMarks | null | undefined,
  rule: ShoveRuleSet = "electronic",
): number {
  return shoveTargets(rule).reduce((sum, sector) => sum + Math.max(0, Number(marks?.[String(sector)] || 0)), 0);
}

export function shoveNextTarget(
  marks: ShoveMarks | null | undefined,
  required = 3,
  rule: ShoveRuleSet = "electronic",
): number | null {
  const need = Math.max(1, Math.floor(Number(required) || 3));
  return shoveTargets(rule).find((target) => Number(marks?.[String(target)] || 0) < need) ?? null;
}

export function shoveMarkForDart(
  dart: ShoveDart | null | undefined,
  rule: ShoveRuleSet = "electronic",
): { key: string | null; marks: number } {
  if (!dart || dart.bed === "MISS") return { key: null, marks: 0 };
  if (dart.bed === "OB" || dart.bed === "IB") {
    if (rule === "traditional") return { key: null, marks: 0 };
    return { key: "25", marks: dart.bed === "IB" ? 2 : 1 };
  }
  const number = Number(dart.number || 0);
  if (!shoveTargets(rule).includes(number)) return { key: null, marks: 0 };
  return { key: String(number), marks: dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1 };
}

/** Prévisualise la progression individuelle, sans les surplus adverses. */
export function projectShoveMarks(
  baseline: ShoveMarks | null | undefined,
  darts: readonly ShoveDart[],
  required = 3,
  rule: ShoveRuleSet = "electronic",
): ShoveMarks {
  const need = Math.max(1, Math.floor(Number(required) || 3));
  const marks: ShoveMarks = { ...(baseline || {}) };
  for (const dart of darts) {
    if (shoveNextTarget(marks, need, rule) === null) break;
    const hit = shoveMarkForDart(dart, rule);
    if (!hit.key || hit.marks < 1) continue;
    if (rule === "electronic" && hit.key !== String(shoveNextTarget(marks, need, rule))) continue;
    marks[hit.key] = Math.min(need, Number(marks[hit.key] || 0) + hit.marks);
  }
  return marks;
}
