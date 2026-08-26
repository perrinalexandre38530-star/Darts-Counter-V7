import type { RunningRouteTemplate } from "./runningRoutes";

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizedGeometry(route: RunningRouteTemplate) {
  const points = Array.isArray(route.route) ? route.route : [];
  if (!points.length) return "empty";
  const maxSamples = 24;
  const step = Math.max(1, Math.floor(points.length / maxSamples));
  const sampled = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0)
    .slice(0, maxSamples + 2)
    .map((point) => `${Number(point.lat).toFixed(4)},${Number(point.lon).toFixed(4)}`);
  const forward = sampled.join("|");
  const reverse = sampled.slice().reverse().join("|");
  return forward < reverse ? forward : reverse;
}

export function outdoorRouteKey(route: RunningRouteTemplate) {
  const external = String(route.externalId || "").trim().toLowerCase();
  if (external.startsWith("osm-relation:")) return `osm:${external.slice("osm-relation:".length)}`;
  const sport = String(route.sport || "outdoor").toLowerCase();
  const distanceBucket = Math.round(Number(route.distanceM || 0) / 25) * 25;
  return `geo:${sport}:${distanceBucket}:${fnv1a(normalizedGeometry(route))}`;
}
