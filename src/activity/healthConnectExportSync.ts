import { listActivities, saveActivity } from "./activityStore";
import { writeHealthConnectActivity } from "./healthConnectBridge";
import type { ActivityRecord } from "./activityTypes";

export type HealthConnectExportReport = {
  considered: number;
  exported: number;
  skipped: number;
  failed: number;
  lastExportAt: number;
  errors: string[];
};

const LAST_EXPORT_KEY = "mss-health-connect-last-export-v1";

export function getLastHealthConnectExportAt(): number | null {
  try { const value = Number(localStorage.getItem(LAST_EXPORT_KEY) || 0); return value > 0 ? value : null; } catch { return null; }
}

function eligible(activity: ActivityRecord, cutoff: number) {
  if (!activity || activity.startedAt < cutoff) return false;
  if (activity.source === "health-connect") return false;
  if (activity.healthConnectExport?.exportedAt) return false;
  if (activity.elapsedMs < 30_000 || activity.distanceM < 10) return false;
  return ["running", "trail", "hiking", "walking", "nordic-walking", "treadmill"].includes(activity.sport);
}

export async function exportLocalWorkoutsToHealthConnect(days = 30): Promise<HealthConnectExportReport> {
  const safeDays = Math.max(1, Math.min(30, Math.round(days || 30)));
  const cutoff = Date.now() - safeDays * 86_400_000;
  const all = await listActivities();
  const candidates = all.filter((activity) => eligible(activity, cutoff)).sort((a, b) => a.startedAt - b.startedAt);
  let exported = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const activity of candidates) {
    try {
      const result = await writeHealthConnectActivity(activity);
      await saveActivity({
        ...activity,
        healthConnectExport: {
          clientRecordId: result.clientRecordId,
          recordIds: result.recordIds,
          exportedAt: Date.now(),
        },
      });
      exported += 1;
    } catch (error: any) {
      failed += 1;
      errors.push(`${activity.title || activity.id}: ${error?.message || String(error)}`);
    }
  }

  skipped = all.filter((activity) => activity.startedAt >= cutoff).length - candidates.length;
  const lastExportAt = Date.now();
  try { localStorage.setItem(LAST_EXPORT_KEY, String(lastExportAt)); } catch {}
  return { considered: candidates.length, exported, skipped: Math.max(0, skipped), failed, lastExportAt, errors: errors.slice(0, 5) };
}
