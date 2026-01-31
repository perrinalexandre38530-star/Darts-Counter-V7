
export type OutMode = "simple" | "double" | "master";

type Dart = { segment: number; multiplier: number };

const FINISHES: Record<number, Dart[][]> = {
  170: [[{segment:20,multiplier:3},{segment:20,multiplier:3},{segment:25,multiplier:2}]],
  167: [[{segment:20,multiplier:3},{segment:19,multiplier:3},{segment:25,multiplier:2}]],
  164: [[{segment:20,multiplier:3},{segment:18,multiplier:3},{segment:25,multiplier:2}]],
  161: [[{segment:20,multiplier:3},{segment:17,multiplier:3},{segment:25,multiplier:2}]],
  160: [[{segment:20,multiplier:3},{segment:20,multiplier:3},{segment:20,multiplier:2}]],
};

function isValidOut(d: Dart, outMode: OutMode) {
  if (outMode === "simple") return true;
  if (outMode === "double") return d.multiplier === 2;
  if (outMode === "master") return d.multiplier >= 2;
  return false;
}

export function getCheckoutSuggestion(score: number, outMode: OutMode): Dart[] | null {
  if (score > 170 || score <= 1) return null;
  const list = FINISHES[score];
  if (!list) return null;

  for (const seq of list) {
    const last = seq[seq.length - 1];
    if (isValidOut(last, outMode)) return seq;
  }
  return null;
}
