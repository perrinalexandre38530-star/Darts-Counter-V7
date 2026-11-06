/** Balanced distribution for a 1–250 stamp printable drink card. */
export function stampRowLengths(total: number): number[] {
  if (!Number.isInteger(total) || total < 1) return [];
  const limit = total <= 12 ? 4 : total <= 30 ? 6 : total <= 80 ? 8 : total <= 150 ? 11 : 13;
  const nRows = Math.ceil(total / limit);
  const base = Math.floor(total / nRows), extras = total % nRows;
  return Array.from({ length: nRows }, (_, index) => base + (index < extras ? 1 : 0));
}

