import type { ActivityRecord, GeoPoint } from "./activityTypes";
import { haversineMeters } from "./activityMath";
export type BestEffort = {
    distanceM: number;
    elapsedMs: number;
    activityId: string;
    startedAt: number;
};
export type RunningStats = {
    totalDistanceM: number;
    totalElapsedMs: number;
    totalElevationM: number;
    sessions: number;
    longestM: number;
    bestPaceSecPerKm: number | null;
    weekDistanceM: number;
    weekElapsedMs: number;
    weekSessions: number;
    previousWeekDistanceM: number;
    weekTrendPct: number | null;
    activeWeekStreak: number;
    activeDayStreak: number;
    lastRun: ActivityRecord | null;
    sevenDays: Array<{
        key: string;
        label: string;
        distanceM: number;
        sessions: number;
    }>;
    fourWeeks: Array<{
        key: string;
        label: string;
        distanceM: number;
        sessions: number;
    }>;
    best400m: BestEffort | null;
    best1k: BestEffort | null;
    bestMile: BestEffort | null;
    best5k: BestEffort | null;
    best10k: BestEffort | null;
    bestHalf: BestEffort | null;
    bestMarathon: BestEffort | null;
};
const DAY = 24 * 60 * 60 * 1000;
function dayKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfLocalDay(ts: number) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
function startOfWeek(ts: number) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.getTime();
}
function pointElapsed(point: GeoPoint, fallbackStart: number) {
    if (Number.isFinite(point.elapsedMs))
        return Math.max(0, Number(point.elapsedMs));
    return Math.max(0, Number(point.timestamp || 0) - fallbackStart);
}
export function bestEffortMs(points: GeoPoint[], targetDistanceM: number): number | null {
    if (points.length < 2 || targetDistanceM <= 0)
        return null;
    const cumulative = new Array<number>(points.length).fill(0);
    for (let i = 1; i < points.length; i += 1)
        cumulative[i] = cumulative[i - 1] + haversineMeters(points[i - 1], points[i]);
    if (cumulative[cumulative.length - 1] < targetDistanceM)
        return null;
    const fallbackStart = points[0].timestamp || 0;
    let best = Infinity;
    let end = 1;
    for (let start = 0; start < points.length - 1; start += 1) {
        const target = cumulative[start] + targetDistanceM;
        if (target > cumulative[cumulative.length - 1])
            break;
        if (end <= start)
            end = start + 1;
        while (end < points.length && cumulative[end] < target)
            end += 1;
        if (end >= points.length)
            break;
        const prevIndex = Math.max(start, end - 1);
        const segmentDistance = cumulative[end] - cumulative[prevIndex];
        const ratio = segmentDistance > 0 ? Math.min(1, Math.max(0, (target - cumulative[prevIndex]) / segmentDistance)) : 1;
        const prevElapsed = pointElapsed(points[prevIndex], fallbackStart);
        const endElapsed = pointElapsed(points[end], fallbackStart);
        const interpolatedEnd = prevElapsed + (endElapsed - prevElapsed) * ratio;
        const startElapsed = pointElapsed(points[start], fallbackStart);
        const duration = interpolatedEnd - startElapsed;
        if (duration > 0 && duration < best)
            best = duration;
    }
    return Number.isFinite(best) ? best : null;
}
export function splitConsistencyScore(splits: ActivityRecord["splits"]): number | null {
    const values = (splits || []).map((s) => Number(s.paceSecPerKm)).filter((v) => Number.isFinite(v) && v > 0);
    if (values.length < 2)
        return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
    const cv = Math.sqrt(variance) / avg;
    return Math.max(0, Math.min(100, Math.round(100 - cv * 220)));
}
export function hasNegativeSplit(splits: ActivityRecord["splits"]): boolean {
    const values = (splits || []).map((s) => Number(s.splitMs)).filter((v) => Number.isFinite(v) && v > 0);
    if (values.length < 4)
        return false;
    const half = Math.floor(values.length / 2);
    const first = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondRows = values.slice(values.length - half);
    const second = secondRows.reduce((a, b) => a + b, 0) / secondRows.length;
    return second < first;
}
export function buildRunningStats(activities: ActivityRecord[], now = Date.now(), locale = "fr-FR"): RunningStats {
    const rows = [...activities].sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
    const totalDistanceM = rows.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const totalElapsedMs = rows.reduce((sum, item) => sum + Number(item.elapsedMs || 0), 0);
    const totalElevationM = rows.reduce((sum, item) => sum + Number(item.elevationGainM || 0), 0);
    const longestM = rows.reduce((best, item) => Math.max(best, Number(item.distanceM || 0)), 0);
    const paces = rows.map((item) => item.avgPaceSecPerKm).filter((v): v is number => Number.isFinite(v) && Number(v) > 0);
    const currentWeekStart = startOfWeek(now);
    const previousWeekStart = currentWeekStart - 7 * DAY;
    const weekRows = rows.filter((item) => item.startedAt >= currentWeekStart);
    const previousWeekRows = rows.filter((item) => item.startedAt >= previousWeekStart && item.startedAt < currentWeekStart);
    const weekDistanceM = weekRows.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const previousWeekDistanceM = previousWeekRows.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const weekTrendPct = previousWeekDistanceM > 0 ? ((weekDistanceM - previousWeekDistanceM) / previousWeekDistanceM) * 100 : weekDistanceM > 0 ? 100 : null;
    const sevenDays = Array.from({ length: 7 }, (_, index) => {
        const ts = startOfLocalDay(now) - (6 - index) * DAY;
        const key = dayKey(ts);
        const dayRows = rows.filter((item) => dayKey(item.startedAt) === key);
        return {
            key,
            label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(ts)).replace(".", "").slice(0, 2).toUpperCase(),
            distanceM: dayRows.reduce((sum, item) => sum + Number(item.distanceM || 0), 0),
            sessions: dayRows.length,
        };
    });
    const thisWeek = startOfWeek(now);
    const fourWeeks = Array.from({ length: 4 }, (_, index) => {
        const ws = thisWeek - (3 - index) * 7 * DAY;
        const we = ws + 7 * DAY;
        const wr = rows.filter((item) => item.startedAt >= ws && item.startedAt < we);
        const prefix = locale.toLowerCase().startsWith("en") ? "W" : "S";
        return { key: String(ws), label: `${prefix}${index + 1}`, distanceM: wr.reduce((sum, item) => sum + Number(item.distanceM || 0), 0), sessions: wr.length };
    });
    const daySet = new Set(rows.map((item) => dayKey(item.startedAt)));
    let activeDayStreak = 0;
    for (let i = 0; i < 365; i += 1) {
        const key = dayKey(startOfLocalDay(now) - i * DAY);
        if (!daySet.has(key)) {
            if (i === 0)
                continue;
            break;
        }
        activeDayStreak += 1;
    }
    const weekSet = new Set(rows.map((item) => String(startOfWeek(item.startedAt))));
    let activeWeekStreak = 0;
    for (let i = 0; i < 52; i += 1) {
        if (!weekSet.has(String(thisWeek - i * 7 * DAY)))
            break;
        activeWeekStreak += 1;
    }
    const best = (distanceM: number): BestEffort | null => {
        let result: BestEffort | null = null;
        for (const item of rows) {
            if (Number(item.distanceM || 0) < distanceM * 0.995 || !Array.isArray(item.route) || item.route.length < 2)
                continue;
            const elapsedMs = bestEffortMs(item.route, distanceM);
            if (!elapsedMs)
                continue;
            if (!result || elapsedMs < result.elapsedMs)
                result = { distanceM, elapsedMs, activityId: item.id, startedAt: item.startedAt };
        }
        return result;
    };
    return {
        totalDistanceM,
        totalElapsedMs,
        totalElevationM,
        sessions: rows.length,
        longestM,
        bestPaceSecPerKm: paces.length ? Math.min(...paces) : null,
        weekDistanceM,
        weekElapsedMs: weekRows.reduce((sum, item) => sum + Number(item.elapsedMs || 0), 0),
        weekSessions: weekRows.length,
        previousWeekDistanceM,
        weekTrendPct,
        activeWeekStreak,
        activeDayStreak,
        lastRun: rows[0] || null,
        sevenDays,
        fourWeeks,
        best400m: best(400),
        best1k: best(1000),
        bestMile: best(1609),
        best5k: best(5000),
        best10k: best(10000),
        bestHalf: best(21097),
        bestMarathon: best(42195),
    };
}
export function projectedFinishMs(distanceDoneM: number, elapsedMs: number, targetDistanceM: number): number | null {
    if (distanceDoneM < 100 || elapsedMs <= 0 || targetDistanceM <= 0)
        return null;
    return elapsedMs * (targetDistanceM / distanceDoneM);
}
export function targetPaceDeltaMs(distanceM: number, elapsedMs: number, targetPaceSecPerKm: number): number | null {
    if (distanceM < 30 || elapsedMs <= 0 || targetPaceSecPerKm <= 0)
        return null;
    const expected = targetPaceSecPerKm * 1000 * (distanceM / 1000);
    return elapsedMs - expected;
}
