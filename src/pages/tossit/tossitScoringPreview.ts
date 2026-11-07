/** TOSSIT touch-entry previews. Pure, provisional calculations; History V4 is written only on confirmation. */
import type { ChoreThrow, ThiefCopCapture } from "./tossitEngine";

export type BorderEntry = { kind: "miss" | "wrong" | "valid"; cm: string };
export function previewBorderRound(
  players: ReadonlyArray<{ id: string }>,
  entries: Record<string, BorderEntry[]>,
  dartsPerPlayer: number,
) {
  const valid: Record<string, number[]> = {};
  const wrongSide: Record<string, number> = {};
  const gain: Record<string, number> = {};
  let error: "distance" | "throws" | null = null;
  for (const player of players) {
    const darts = entries[player.id] || [];
    valid[player.id] = [];
    wrongSide[player.id] = 0;
    gain[player.id] = 0;
    if (darts.length !== dartsPerPlayer) error = "throws";
    for (const dart of darts) {
      if (dart.kind === "wrong") wrongSide[player.id]++;
      if (dart.kind !== "valid") continue;
      const raw = dart.cm.trim();
      const distance = Number(raw.replace(",", "."));
      if (!raw || !Number.isFinite(distance) || distance < 0 || distance > 10000) {
        error = "distance";
        continue;
      }
      valid[player.id].push(distance);
    }
    if (valid[player.id].length + wrongSide[player.id] > dartsPerPlayer) error = "throws";
  }
  if (players.length === 2 && !error) {
    const [a, b] = players.map(p => p.id);
    const closestA = Math.min(Infinity, ...valid[a]);
    const closestB = Math.min(Infinity, ...valid[b]);
    gain[a] = (closestA < closestB ? valid[a].filter(cm => cm < closestB).length : 0) + wrongSide[b];
    gain[b] = (closestB < closestA ? valid[b].filter(cm => cm < closestA).length : 0) + wrongSide[a];
  }
  return { valid, wrongSide, gain, ready: players.length === 2 && error === null, error };
}

export function previewThiefRound(captures: ReadonlyArray<ThiefCopCapture>) {
  const cut = captures.indexOf("takedown");
  const selected = captures.slice(0, cut >= 0 ? cut + 1 : captures.length);
  const values: Record<ThiefCopCapture, number> = {
    miss: 0, close: 1, direct: 2, handcuff: 4, double_lock: 6, takedown: 0,
  };
  return {
    selected,
    points: selected.reduce((total, value) => total + values[value], 0),
    takedown: cut >= 0,
    stoppedAfter: cut,
  };
}

export function previewChoreRound(
  players: ReadonlyArray<{ id: string }>,
  current: Record<string, string[]>,
  throws: ReadonlyArray<ChoreThrow>,
  validChoreIds: ReadonlyArray<string>,
) {
  const pending: Record<string, string[]> = Object.fromEntries(players.map(p => [p.id, [...(current[p.id] || [])]]));
  const validIds = new Set(validChoreIds);
  let ready = true;
  for (const dart of throws) {
    if (dart.effect === "miss") continue;
    const queue = pending[dart.recipientId || ""];
    if (!queue) { ready = false; continue; }
    if ((dart.effect === "chore" || dart.effect === "jumpover") && !validIds.has(dart.chore || "")) { ready = false; continue; }
    switch (dart.effect) {
      case "chore": queue.push(dart.chore!); break;
      case "free_day": pending[dart.recipientId!] = []; break;
      case "kiss":
      case "double_trouble": queue.pop(); break;
      case "jumpover": queue.push(dart.chore!, dart.chore!); break;
    }
  }
  return { pending, ready, counts: Object.fromEntries(players.map(p => [p.id, pending[p.id].length])) };
}
