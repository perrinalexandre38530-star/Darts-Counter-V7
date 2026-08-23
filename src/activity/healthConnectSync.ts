import { listActivities, saveActivity } from "./activityStore";
import { healthConnectSessionToActivity, readHealthConnectWorkoutSessions } from "./healthConnectBridge";
import type { ActivityRecord } from "./activityTypes";

const LAST_SYNC_KEY = "mss-health-connect-last-sync-v1";

export type HealthConnectSyncReport = {
  days: number;
  received: number;
  imported: number;
  updated: number;
  skipped: number;
  routesMissing: number;
  exerciseRoutesGranted: boolean;
  lastSyncAt: number;
};

export function getLastHealthConnectSyncAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function syncHealthConnectWorkouts(days = 30): Promise<HealthConnectSyncReport> {
  const response = await readHealthConnectWorkoutSessions(days);
  const existing = await listActivities();
  const existingById = new Map(existing.map((activity) => [activity.id, activity]));

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let routesMissing = 0;

  for (const session of response.sessions) {
    const activity = healthConnectSessionToActivity(session);
    if (!activity) {
      skipped += 1;
      continue;
    }

    if (
      activity.healthConnect?.routeStatus === "permission-required" ||
      activity.healthConnect?.routeStatus === "consent-required"
    ) {
      routesMissing += 1;
    }

    const previous = existingById.get(activity.id) as ActivityRecord | undefined;
    if (previous) {
      // Preserve local-only user enrichments when Health Connect refreshes the source record.
      activity.createdAt = previous.createdAt || activity.createdAt;
      activity.effortRating = previous.effortRating;
      activity.feeling = previous.feeling;
      activity.notes = previous.notes || activity.notes;
      activity.shoeId = previous.shoeId;
      updated += 1;
    } else {
      imported += 1;
    }

    await saveActivity(activity);
    existingById.set(activity.id, activity);
  }

  const lastSyncAt = Date.now();
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(lastSyncAt));
  } catch {}

  return {
    days: response.days,
    received: response.sessions.length,
    imported,
    updated,
    skipped,
    routesMissing,
    exerciseRoutesGranted: !!response.exerciseRoutesGranted,
    lastSyncAt,
  };
}
