export function mergeEvents(localEvents: any[], cloudEvents: any[]) {
  const map = new Map();
  [...localEvents, ...cloudEvents].forEach(e => map.set(e.id, e));
  return Array.from(map.values());
}