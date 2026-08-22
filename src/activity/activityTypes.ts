export type ActivitySport =
  | "running"
  | "cycling"
  | "mtb"
  | "bmx"
  | "roller"
  | "walking"
  | "hiking";

export type ActivitySource =
  | "phone-gps"
  | "manual"
  | "health-connect"
  | "apple-health"
  | "garmin"
  | "fit"
  | "gpx"
  | "tcx";

export type ActivityVerification = "declared" | "gps" | "connected" | "certified";

export type GeoPoint = {
  lat: number;
  lon: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
};

export type ActivitySplit = {
  index: number;
  distanceM: number;
  elapsedMs: number;
  splitMs: number;
  paceSecPerKm: number;
};

export type ActivityRecord = {
  id: string;
  sport: ActivitySport;
  source: ActivitySource;
  verification: ActivityVerification;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  movingMs: number;
  distanceM: number;
  avgSpeedMps: number;
  avgPaceSecPerKm: number | null;
  elevationGainM: number;
  route: GeoPoint[];
  splits: ActivitySplit[];
  title?: string;
  targetDistanceM?: number | null;
  deviceName?: string;
  createdAt: number;
};

export const ACTIVITY_DB_NAME = "multisports-activity-v1";
export const ACTIVITY_DB_VERSION = 1;
export const ACTIVITY_STORE_NAME = "activities";
