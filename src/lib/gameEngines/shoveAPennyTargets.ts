/**
 * SHOVE A PENNY — progression ordonnée, partagée par le moteur et l'interface.
 * Les marques sont créditées seulement sur la case actuellement ouverte.
 */
export const SHOVE_TARGETS = [15, 16, 17, 18, 19, 20, 25] as const;

export type ShoveDart = {
  bed: "S" | "D" | "T" | "OB" | "IB" | "MISS";
  number?: number;
};

export type ShoveMarks = Record<string, number>;

export function shoveNextTarget(marks: ShoveMarks | null | undefined, required = 3): number | null {
  const need = Math.max(1, Math.floor(Number(required) || 3));
  return SHOVE_TARGETS.find((target) => Number(marks?.[String(target)] || 0) < need) ?? null;
}

export function shoveMarkForDart(dart: ShoveDart | null | undefined): { key: string | null; marks: number } {
  if (!dart || dart.bed === "MISS") return { key: null, marks: 0 };
  if (dart.bed === "OB") return { key: "25", marks: 1 };
  if (dart.bed === "IB") return { key: "25", marks: 2 };
  const number = Number(dart.number || 0);
  if (!SHOVE_TARGETS.some((target) => target === number)) return { key: null, marks: 0 };
  return { key: String(number), marks: dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1 };
}

/**
 * Prévisualise les propres marques de la volée en cours.
 * Les surplus vers l'adversaire restent appliqués au moment de VALIDER.
 */
export function projectShoveMarks(
  baseline: ShoveMarks | null | undefined,
  darts: readonly ShoveDart[],
  required = 3,
): ShoveMarks {
  const need = Math.max(1, Math.floor(Number(required) || 3));
  const marks: ShoveMarks = { ...(baseline || {}) };
  for (const dart of darts) {
    const current = shoveNextTarget(marks, need);
    if (current === null) break;
    const hit = shoveMarkForDart(dart);
    if (hit.key !== String(current) || hit.marks < 1) continue;
    marks[hit.key] = Math.min(need, Number(marks[hit.key] || 0) + hit.marks);
  }
  return marks;
}
