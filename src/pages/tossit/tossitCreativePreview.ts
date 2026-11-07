/** TOSSIT V204 — Pure input previews for the last three touch-first modes.
 * These helpers intentionally do not mutate game state, history or the scoring engine.
 */
export type TossitCreativePattern = "ring" | "shape" | "stack";
export type TossitPreviewPlayer = { id: string };

export function previewReachTurn(
  stuck: number, heightInput: string, dartsPerPlayer: number,
  record: { bestCm: number; stuck: number } = { bestCm: 0, stuck: 0 },
) {
  const text = heightInput.trim().replace(",", ".");
  const validNumber = /^(?:\d{1,3})(?:\.\d)?$/.test(text);
  const cm = validNumber ? Number(text) : NaN;
  const ready = Number.isInteger(stuck) && stuck >= 0 && stuck <= dartsPerPlayer &&
    Number.isFinite(cm) && cm >= 0 && cm <= 350 &&
    ((stuck === 0 && cm === 0) || (stuck > 0 && cm > 0));
  return {
    ready, cm: ready ? cm : 0, stuck,
    recordCm: ready ? Math.max(record.bestCm, cm) : record.bestCm,
    totalStuck: ready ? record.stuck + stuck : record.stuck,
  };
}

export function previewRainbowTurn(
  pattern: TossitCreativePattern, colors: number, stackHeight: number,
  completed: boolean, dartsPerPlayer: number,
) {
  const patternValid = ["ring", "shape", "stack"].includes(pattern);
  const stack = pattern === "stack";
  const base = stack ? stackHeight : colors;
  const eligibleToComplete = stack ? stackHeight >= 2 : colors >= 3;
  const ready = patternValid && typeof completed === "boolean" &&
    Number.isInteger(colors) && colors >= 0 && colors <= 6 &&
    Number.isInteger(stackHeight) && stackHeight >= 0 && stackHeight <= dartsPerPlayer &&
    (stack ? colors === 0 : stackHeight === 0) && (!completed || eligibleToComplete);
  return { ready, eligibleToComplete, base, bonus: ready && completed ? 3 : 0,
    points: ready ? base + (completed ? 3 : 0) : 0 };
}

export function previewBottleRound(
  players: readonly TossitPreviewPlayer[], stuck: Readonly<Record<string, number>>,
  onBottle: Readonly<Record<string, number>>, closestPlayerId: string,
  dartsPerPlayer: number,
) {
  const validCounts = players.every(({ id }) => {
    const n = stuck[id] ?? 0;
    const on = onBottle[id] ?? 0;
    return Number.isInteger(n) && n >= 0 && n <= dartsPerPlayer &&
      Number.isInteger(on) && on >= 0 && on <= n;
  });
  const hasStuck = players.some(({ id }) => (stuck[id] ?? 0) > 0);
  const closestValid = hasStuck
    ? players.some(({ id }) => id === closestPlayerId && (stuck[id] ?? 0) > 0)
    : closestPlayerId === "";
  const ready = validCounts && closestValid && players.length > 0;
  const points = Object.fromEntries(players.map(({ id }) =>
    [id, (onBottle[id] ?? 0) * 3 + (id === closestPlayerId && hasStuck ? 1 : 0)]));
  return { ready, hasStuck, needsClosest: validCounts && hasStuck && !closestValid,
    points, closestPlayerId: ready ? closestPlayerId || undefined : undefined };
}
