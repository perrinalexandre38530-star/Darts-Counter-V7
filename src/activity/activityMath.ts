import type { ActivitySplit, GeoPoint } from "./activityTypes";
const EARTH_RADIUS_M = 6371000;
function toRad(value: number) {
    return (value * Math.PI) / 180;
}
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLat = lat2 - lat1;
    const dLon = toRad(b.lon - a.lon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function routeDistanceMeters(points: GeoPoint[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        total += haversineMeters(points[i - 1], points[i]);
    }
    return total;
}
export function elevationGainMeters(points: GeoPoint[]): number {
    let gain = 0;
    for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1].altitude;
        const next = points[i].altitude;
        if (!Number.isFinite(prev) || !Number.isFinite(next))
            continue;
        const delta = Number(next) - Number(prev);
        if (delta >= 2)
            gain += delta;
    }
    return gain;
}
export function buildKilometerSplits(points: GeoPoint[], startedAt: number): ActivitySplit[] {
    if (points.length < 2)
        return [];
    const splits: ActivitySplit[] = [];
    let cumulative = 0;
    let lastBoundaryElapsed = 0;
    let nextBoundary = 1000;
    for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const segment = haversineMeters(a, b);
        if (segment <= 0)
            continue;
        const before = cumulative;
        cumulative += segment;
        while (cumulative >= nextBoundary) {
            const intoSegment = nextBoundary - before;
            const ratio = Math.min(1, Math.max(0, intoSegment / segment));
            const elapsedA = Number.isFinite(a.elapsedMs) ? Number(a.elapsedMs) : Math.max(0, a.timestamp - startedAt);
            const elapsedB = Number.isFinite(b.elapsedMs) ? Number(b.elapsedMs) : Math.max(0, b.timestamp - startedAt);
            const elapsedMs = Math.max(0, elapsedA + (elapsedB - elapsedA) * ratio);
            const splitMs = Math.max(0, elapsedMs - lastBoundaryElapsed);
            splits.push({
                index: splits.length + 1,
                distanceM: 1000,
                elapsedMs,
                splitMs,
                paceSecPerKm: splitMs / 1000,
            });
            lastBoundaryElapsed = elapsedMs;
            nextBoundary += 1000;
        }
    }
    return splits;
}
export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0)
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}
export function formatPace(secPerKm: number | null | undefined): string {
    if (!Number.isFinite(secPerKm) || Number(secPerKm) <= 0)
        return "--:--";
    const total = Math.max(0, Math.round(Number(secPerKm)));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}
export function formatDistance(distanceM: number): string {
    if (distanceM < 1000)
        return `${Math.round(distanceM)} m`;
    return `${(distanceM / 1000).toFixed(2)} km`;
}
export function averagePaceSecPerKm(distanceM: number, elapsedMs: number): number | null {
    if (distanceM < 1 || elapsedMs <= 0)
        return null;
    return elapsedMs / 1000 / (distanceM / 1000);
}
export function averageSpeedMps(distanceM: number, elapsedMs: number): number {
    if (distanceM <= 0 || elapsedMs <= 0)
        return 0;
    return distanceM / (elapsedMs / 1000);
}
export function shouldAcceptRunningPoint(previous: GeoPoint | undefined, next: GeoPoint, maxSpeedMps = 12): boolean {
    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon))
        return false;
    if (Number.isFinite(next.accuracy) && Number(next.accuracy) > 100)
        return false;
    if (!previous)
        return true;
    const dt = Math.max(0.001, (next.timestamp - previous.timestamp) / 1000);
    const distance = haversineMeters(previous, next);
    if (distance < 2 && dt < 5)
        return false;
    // Garde-fou anti-saut GPS. La limite est adaptée au sport par l'appelant.
    if (distance / dt > Math.max(1, maxSpeedMps))
        return false;
    return true;
}

export function filterRouteOutliers(points: GeoPoint[], maxSpeedMps = 12): GeoPoint[] {
    const accepted: GeoPoint[] = [];
    for (const point of points || []) {
        const previous = accepted[accepted.length - 1];
        if (shouldAcceptRunningPoint(previous, point, maxSpeedMps)) accepted.push(point);
    }
    return accepted;
}

export function movingTimeMs(points: GeoPoint[]): number {
    if (points.length < 2)
        return 0;
    let moving = 0;
    for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const elapsedA = Number.isFinite(a.elapsedMs) ? Number(a.elapsedMs) : a.timestamp;
        const elapsedB = Number.isFinite(b.elapsedMs) ? Number(b.elapsedMs) : b.timestamp;
        const dt = Math.max(0, elapsedB - elapsedA);
        if (!dt || dt > 60000)
            continue;
        const speed = haversineMeters(a, b) / (dt / 1000);
        if (speed >= 0.55 && speed <= 12)
            moving += dt;
    }
    return moving;
}
export function rollingPaceSecPerKm(points: GeoPoint[], samplePoints = 7): number | null {
    if (points.length < 2)
        return null;
    const start = Math.max(0, points.length - Math.max(2, samplePoints));
    const slice = points.slice(start);
    const distance = routeDistanceMeters(slice);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const firstElapsed = Number.isFinite(first.elapsedMs) ? Number(first.elapsedMs) : first.timestamp;
    const lastElapsed = Number.isFinite(last.elapsedMs) ? Number(last.elapsedMs) : last.timestamp;
    const elapsed = Math.max(0, lastElapsed - firstElapsed);
    if (distance < 15 || elapsed < 3000)
        return null;
    return averagePaceSecPerKm(distance, elapsed);
}
