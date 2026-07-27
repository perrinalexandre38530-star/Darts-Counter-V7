import releaseConfig from "./release-features.json";

export type ReleaseChannel = "dev" | "beta" | "store";
export type FeatureStatus = "stable" | "beta" | "development" | "disabled";
export type FeatureGroup = "sports" | "darts" | "platformFeatures";

type ReleaseConfig = {
  schemaVersion: number;
  application: string;
  channels: Record<ReleaseChannel, FeatureStatus[]>;
  sports: Record<string, FeatureStatus>;
  darts: Record<string, FeatureStatus>;
  platformFeatures: Record<string, FeatureStatus>;
};

const config = releaseConfig as ReleaseConfig;

function normalizeChannel(raw: unknown): ReleaseChannel {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "store") return "store";
  if (value === "beta") return "beta";
  return "dev";
}

export const RELEASE_CHANNEL: ReleaseChannel = normalizeChannel(import.meta.env.VITE_RELEASE_CHANNEL);
export const APP_NAME = config.application;

export function featureStatus(featureId: string, group: FeatureGroup = "platformFeatures"): FeatureStatus {
  const source = config[group] || {};
  return source[String(featureId || "")] || "development";
}

export function isStatusVisible(status: FeatureStatus, channel: ReleaseChannel = RELEASE_CHANNEL): boolean {
  if (status === "disabled") return false;
  return (config.channels[channel] || []).includes(status);
}

export function isSportVisible(sportId: string, channel: ReleaseChannel = RELEASE_CHANNEL): boolean {
  return isStatusVisible(featureStatus(sportId, "sports"), channel);
}

export function isDartsGameVisible(gameId: string, channel: ReleaseChannel = RELEASE_CHANNEL): boolean {
  return isStatusVisible(featureStatus(gameId, "darts"), channel);
}

export function isPlatformFeatureVisible(featureId: string, channel: ReleaseChannel = RELEASE_CHANNEL): boolean {
  return isStatusVisible(featureStatus(featureId, "platformFeatures"), channel);
}

export function visibleSportIds(channel: ReleaseChannel = RELEASE_CHANNEL): string[] {
  return Object.entries(config.sports)
    .filter(([, status]) => isStatusVisible(status, channel))
    .map(([id]) => id);
}

export function visibleDartsGameIds(channel: ReleaseChannel = RELEASE_CHANNEL): string[] {
  return Object.entries(config.darts)
    .filter(([, status]) => isStatusVisible(status, channel))
    .map(([id]) => id);
}

export const releaseFeatures = config;
