import type { ActivitySensorDevice, ActivitySensorSample, ActivitySplit } from "./activityTypes";

export function buildTreadmillSplits(samples: ActivitySensorSample[]): ActivitySplit[] {
  const rows = samples
    .filter((sample) => Number.isFinite(sample.treadmillDistanceM) && Number.isFinite(sample.elapsedMs))
    .sort((a, b) => Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0));
  if (rows.length < 2) return [];
  const out: ActivitySplit[] = [];
  let targetM = 1000;
  let previousElapsed = 0;
  for (const sample of rows) {
    const distanceM = Number(sample.treadmillDistanceM || 0);
    if (distanceM < targetM) continue;
    const elapsedMs = Number(sample.elapsedMs || 0);
    const splitMs = Math.max(1, elapsedMs - previousElapsed);
    out.push({ index: out.length + 1, distanceM: targetM, elapsedMs, splitMs, paceSecPerKm: splitMs / 1000 });
    previousElapsed = elapsedMs;
    targetM += 1000;
  }
  return out;
}

export function treadmillDistanceSource(devices: ActivitySensorDevice[], samples: ActivitySensorSample[], manualSpeedKmh: number): "ftms" | "footpod" | "manual-speed" {
  if (devices.some((device) => device.kind === "fitness-machine-treadmill")) return "ftms";
  if (devices.some((device) => device.kind === "running-speed-cadence")) return "footpod";
  if (samples.some((sample) => Number.isFinite(sample.sensorSpeedMps) && sample.sensorSpeedMps! > 0)) return "footpod";
  return manualSpeedKmh > 0 ? "manual-speed" : "manual-speed";
}

export function averageTreadmillIncline(samples: ActivitySensorSample[]) {
  const values = samples.map((sample) => sample.inclinePercent).filter((value): value is number => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
