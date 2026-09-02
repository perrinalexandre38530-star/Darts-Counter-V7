/**
 * Shared low-level helpers for RUNNING PERF / outdoor routing.
 * Keep this file dependency-free so UI, routing and analytics code can reuse it
 * without creating import cycles.
 */
export function clampRunningNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function pickRunningText(lang: string, fr: string, en: string, es: string): string {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

export function runningCoordKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}


export function loadRunningArrayCache<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function saveRunningLocalJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function runningPointElapsedMs(points: Array<{ elapsedMs?: number | null; timestamp?: number | null }>, index: number): number | null {
  const point = points[index];
  if (Number.isFinite(point?.elapsedMs)) return Math.max(0, Number(point?.elapsedMs));
  const first = Number(points[0]?.timestamp || 0);
  const current = Number(point?.timestamp || 0);
  return first > 0 && current >= first ? current - first : null;
}

export function runningLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isStandardRunningRaceDistance(value: unknown): value is 5000 | 10000 | 21097 | 42195 {
  return [5000, 10000, 21097, 42195].includes(Number(value));
}

export function looksMissingRunningRpc(error: any): boolean {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("pgrst202") || message.includes("could not find the function") || message.includes("does not exist") || message.includes("schema cache");
}

export function outdoorWaypointIcon(kind: string): string {
  if (kind === "water") return "💧";
  if (kind === "food") return "🥪";
  if (kind === "shelter") return "🏕️";
  if (kind === "summit") return "⛰️";
  if (kind === "danger") return "⚠️";
  return "📍";
}

export function runningMercatorPixel(lat: number, lon: number, zoom: number) {
  const safeLat = clampRunningNumber(lat, -85.05112878, 85.05112878);
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin(safeLat * Math.PI / 180);
  return { x: (lon + 180) / 360 * scale, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

export function runningMercatorLatLon(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const lon = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  return { lat: 180 / Math.PI * Math.atan(Math.sinh(n)), lon };
}
