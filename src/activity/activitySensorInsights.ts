import type { ActivityRecord, ActivitySensorSample } from "./activityTypes";

export type ActivitySensorSummary = {
  sampleCount: number;
  activitiesWithSensors: number;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  avgCadenceSpm: number | null;
  maxCadenceSpm: number | null;
  avgSensorSpeedMps: number | null;
  maxSensorSpeedMps: number | null;
  avgStrideLengthM: number | null;
};

function finite(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => Number.isFinite(value));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values: number[]): number | null {
  return values.length ? Math.max(...values) : null;
}

export function summarizeSensorSamples(samples: ActivitySensorSample[]): ActivitySensorSummary {
  const hr = finite(samples.map((sample) => sample.heartRateBpm)).filter((value) => value >= 30 && value <= 240);
  const cadence = finite(samples.map((sample) => sample.cadenceSpm)).filter((value) => value >= 20 && value <= 260);
  const speed = finite(samples.map((sample) => sample.sensorSpeedMps)).filter((value) => value >= 0 && value <= 25);
  const stride = finite(samples.map((sample) => sample.strideLengthM)).filter((value) => value > 0 && value <= 4);
  return {
    sampleCount: samples.length,
    activitiesWithSensors: samples.length ? 1 : 0,
    avgHeartRateBpm: average(hr),
    maxHeartRateBpm: max(hr),
    avgCadenceSpm: average(cadence),
    maxCadenceSpm: max(cadence),
    avgSensorSpeedMps: average(speed),
    maxSensorSpeedMps: max(speed),
    avgStrideLengthM: average(stride),
  };
}

export function sensorSummaryForActivity(activity?: ActivityRecord | null): ActivitySensorSummary {
  return summarizeSensorSamples(activity?.sensorSamples || []);
}

export function buildSensorSummary(activities: ActivityRecord[]): ActivitySensorSummary {
  const samples = activities.flatMap((activity) => activity.sensorSamples || []);
  const summary = summarizeSensorSamples(samples);
  return {
    ...summary,
    activitiesWithSensors: activities.filter((activity) => (activity.sensorSamples?.length || 0) > 0).length,
  };
}
