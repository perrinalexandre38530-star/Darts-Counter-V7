/** Shared, device-local preference for seasonal decorations across sport and club pages. */
export const SEASONAL_DECOR_PREFERENCE_KEY = "mss:seasonal:decorations:enabled:v1";
export const SEASONAL_DECOR_CHANGE_EVENT = "mss-seasonal-decorations-change";

export function getSeasonalDecorationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem(SEASONAL_DECOR_PREFERENCE_KEY) !== "off"; }
  catch { return true; }
}

export function setSeasonalDecorationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SEASONAL_DECOR_PREFERENCE_KEY, enabled ? "on" : "off"); }
  catch { /* Keep the existing preference if storage is unavailable. */ }
  window.dispatchEvent(new Event(SEASONAL_DECOR_CHANGE_EVENT));
}

export function subscribeSeasonalDecorations(listener: (enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const refresh = () => listener(getSeasonalDecorationsEnabled());
  window.addEventListener("storage", refresh);
  window.addEventListener(SEASONAL_DECOR_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", refresh);
    window.removeEventListener(SEASONAL_DECOR_CHANGE_EVENT, refresh);
  };
}
