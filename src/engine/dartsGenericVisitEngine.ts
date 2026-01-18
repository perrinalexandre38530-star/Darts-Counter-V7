export type Visit = number;

export function clampVisit(v: number) {
  if (v < 0) return 0;
  if (v > 180) return 180;
  return v;
}
