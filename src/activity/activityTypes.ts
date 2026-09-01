export type ActivitySport = "running" | "trail" | "cycling" | "mtb" | "bmx" | "roller" | "walking" | "hiking" | "nordic-walking" | "treadmill";
export type ActivitySource = "phone-gps" | "manual" | "health-connect" | "apple-health" | "garmin" | "fit" | "gpx" | "tcx";
export type ActivityVerification = "declared" | "gps" | "connected" | "certified";
export type GeoPoint = {
    lat: number;
    lon: number;
    timestamp: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    /** Active elapsed time at this GPS point (pauses excluded when available). */
    elapsedMs?: number;
};
export type ActivitySensorSample = {
    timestamp: number;
    elapsedMs?: number;
    heartRateBpm?: number;
    cadenceSpm?: number;
    sensorSpeedMps?: number;
    strideLengthM?: number;
    inclinePercent?: number;
    treadmillDistanceM?: number;
};
export type ActivitySensorDevice = {
    kind: "heart-rate" | "running-speed-cadence" | "fitness-machine-treadmill";
    name: string;
};
export type ActivitySplit = {
    index: number;
    distanceM: number;
    elapsedMs: number;
    splitMs: number;
    paceSecPerKm: number;
};
export type ActivityPhoto = {
    id: string;
    dataUrl: string;
    createdAt: number;
    name?: string;
    width?: number;
    height?: number;
};
export type ActivityLap = {
    index: number;
    elapsedMs: number;
    lapMs: number;
    distanceM: number;
    lapDistanceM: number;
    paceSecPerKm: number | null;
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
    visibility?: "private" | "public";
    photos?: ActivityPhoto[];
    targetDistanceM?: number | null;
    targetDurationMs?: number | null;
    targetPaceSecPerKm?: number | null;
    workoutType?: "free" | "distance" | "easy" | "tempo" | "intervals" | "long" | "pacer" | "hills";
    manualLaps?: ActivityLap[];
    planId?: string;
    planSessionId?: string;
    effortRating?: number;
    feeling?: "great" | "good" | "normal" | "tired" | "hard";
    notes?: string;
    shoeId?: string;
    routeReferenceId?: string;
    ghostEnabled?: boolean;
    ghostDeltaMs?: number | null;
    deviceName?: string;
    sourceFileName?: string;
    importedAt?: number;
    sensorSamples?: ActivitySensorSample[];
    sensorDevices?: ActivitySensorDevice[];
    indoor?: boolean;
    treadmill?: {
        distanceSource: "ftms" | "footpod" | "manual-speed";
        manualSpeedKmh?: number;
        inclinePercent?: number;
    };
    healthConnect?: {
        recordId: string;
        clientRecordId?: string;
        originPackage?: string;
        routeStatus?: string;
        syncedAt?: number;
    };
    healthConnectExport?: {
        clientRecordId: string;
        recordIds: string[];
        exportedAt: number;
    };
    createdAt: number;
};
export const ACTIVITY_DB_NAME = "multisports-activity-v1";
export const ACTIVITY_DB_VERSION = 1;
export const ACTIVITY_STORE_NAME = "activities";
