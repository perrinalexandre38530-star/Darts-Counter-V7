/**
 * MSS — landscape room policy. Spread complete panels only when a measured
 * column has genuinely spare height and at least three distinct panels. Never scale a card or its children.
 * This pure predicate can be exercised without a browser or mode state.
 */
export function canDistributeLandscapePanels(
  availableHeight: number,
  panelHeights: readonly number[],
  gap = 0,
): boolean {
  if (!Number.isFinite(availableHeight) || availableHeight < 360) return false;
  if (panelHeights.length < 3 || panelHeights.length > 6) return false;
  if (!panelHeights.every((height) => Number.isFinite(height) && height >= 20 && height <= availableHeight * 0.65)) {
    return false;
  }
  const occupied = panelHeights.reduce((sum, height) => sum + height, 0)
    + Math.max(0, panelHeights.length - 1) * Math.max(0, Number.isFinite(gap) ? gap : 0);
  // Never distribute when scrolling is necessary or the remaining room is
  // too small: this keeps forms, short phones and keypads unchanged.
  return occupied >= 90 && availableHeight - occupied >= Math.max(110, availableHeight * 0.22);
}
