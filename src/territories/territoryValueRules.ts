import type { Territory } from "./types";

export const MAX_PLAYABLE_TERRITORIES = 180;

const SINGLE_DART_SCORES = (() => {
  const scores = new Set<number>([0, 25, 50]);
  for (let value = 1; value <= 20; value += 1) {
    scores.add(value);
    scores.add(value * 2);
    scores.add(value * 3);
  }
  return [...scores];
})();

export const REACHABLE_VISIT_TOTALS = (() => {
  const totals = new Set<number>();
  for (const a of SINGLE_DART_SCORES) {
    for (const b of SINGLE_DART_SCORES) {
      for (const c of SINGLE_DART_SCORES) totals.add(a + b + c);
    }
  }
  return [...totals]
    .filter((total) => total >= 1 && total <= 180)
    .sort((left, right) => left - right);
})();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function selectEvenlySpaced(source: number[], count: number): number[] {
  if (count <= 0) return [];
  if (count >= source.length) return source.slice(0, count);
  if (count === 1) return [source[Math.floor((source.length - 1) / 2)]!];

  const result: number[] = [];
  let previousIndex = -1;
  for (let index = 0; index < count; index += 1) {
    const ideal = Math.round((index * (source.length - 1)) / (count - 1));
    const minIndex = previousIndex + 1;
    const maxIndex = source.length - (count - index);
    const sourceIndex = clamp(ideal, minIndex, maxIndex);
    result.push(source[sourceIndex]!);
    previousIndex = sourceIndex;
  }
  return result;
}

/**
 * Builds a strictly unique value list, sorted from the smallest territory to
 * the largest one.
 *
 * - Up to 171 territories, only totals reachable with one three-dart visit are
 *   used whenever possible.
 * - From 172 to 180 territories, uniqueness has priority and the full 1..180
 *   range is used.
 * - With exactly 180 playable territories, the result is exactly 1..180 as
 *   requested by the game rule.
 */
export function buildUniqueTerritoryValues(
  countRaw: number,
  minTargetRaw: number,
  maxTargetRaw: number,
): number[] {
  const count = clamp(Math.floor(Number(countRaw) || 0), 0, MAX_PLAYABLE_TERRITORIES);
  if (count <= 0) return [];
  if (count === MAX_PLAYABLE_TERRITORIES) {
    return Array.from({ length: MAX_PLAYABLE_TERRITORIES }, (_, index) => index + 1);
  }

  const source = count <= REACHABLE_VISIT_TOTALS.length
    ? REACHABLE_VISIT_TOTALS
    : Array.from({ length: MAX_PLAYABLE_TERRITORIES }, (_, index) => index + 1);

  let minTarget = clamp(Math.round(Number(minTargetRaw) || 1), 1, 180);
  let maxTarget = clamp(Math.round(Number(maxTargetRaw) || 180), 1, 180);
  if (minTarget > maxTarget) [minTarget, maxTarget] = [maxTarget, minTarget];

  let startIndex = source.findIndex((value) => value >= minTarget);
  if (startIndex < 0) startIndex = source.length - 1;

  let endIndex = source.length - 1;
  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (source[index]! <= maxTarget) {
      endIndex = index;
      break;
    }
  }
  if (endIndex < startIndex) {
    const center = (minTarget + maxTarget) / 2;
    const nearestIndex = source.reduce((best, value, index) => (
      Math.abs(value - center) < Math.abs(source[best]! - center) ? index : best
    ), 0);
    startIndex = nearestIndex;
    endIndex = nearestIndex;
  }

  while (endIndex - startIndex + 1 < count) {
    const canExpandLeft = startIndex > 0;
    const canExpandRight = endIndex < source.length - 1;
    if (!canExpandLeft && !canExpandRight) break;
    if (!canExpandLeft) {
      endIndex += 1;
      continue;
    }
    if (!canExpandRight) {
      startIndex -= 1;
      continue;
    }

    const leftPenalty = Math.max(0, minTarget - source[startIndex - 1]!);
    const rightPenalty = Math.max(0, source[endIndex + 1]! - maxTarget);
    if (leftPenalty <= rightPenalty) startIndex -= 1;
    else endIndex += 1;
  }

  const candidates = source.slice(startIndex, endIndex + 1);
  return selectEvenlySpaced(candidates, count);
}

export function selectPlayableTerritoryIds(
  territories: Territory[],
  areaByTerritoryId: Record<string, number>,
  limit: number = MAX_PLAYABLE_TERRITORIES,
): Set<string> {
  const maxPlayable = clamp(Math.floor(Number(limit) || MAX_PLAYABLE_TERRITORIES), 1, MAX_PLAYABLE_TERRITORIES);
  if (territories.length <= maxPlayable) return new Set(territories.map((territory) => territory.id));

  const selected = [...territories]
    .sort((left, right) => {
      const areaDifference = (areaByTerritoryId[right.id] || 0) - (areaByTerritoryId[left.id] || 0);
      if (Math.abs(areaDifference) > 0.000001) return areaDifference;
      return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
    })
    .slice(0, maxPlayable)
    .map((territory) => territory.id);

  return new Set(selected);
}
