import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("src/config/release-features.json", root), "utf8"));
const registrySource = readFileSync(new URL("src/games/dartsGameRegistry.ts", root), "utf8");
const gameSelectSource = readFileSync(new URL("src/pages/GameSelect.tsx", root), "utf8");

const validStatuses = new Set(["stable", "beta", "development", "disabled"]);
const validChannels = new Set(["dev", "beta", "store"]);
const errors = [];

for (const channel of validChannels) {
  if (!Array.isArray(config?.channels?.[channel])) {
    errors.push(`channel ${channel}: missing status list`);
    continue;
  }
  for (const status of config.channels[channel]) {
    if (!validStatuses.has(status)) errors.push(`channel ${channel}: invalid status ${status}`);
  }
}

for (const [id, status] of Object.entries(config?.sports || {})) {
  if (!validStatuses.has(status)) errors.push(`sports.${id}: invalid status ${status}`);
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`id:\\s*[\"']${escaped}[\"']`).test(gameSelectSource)) {
    errors.push(`sports.${id}: id not found in GameSelect.tsx`);
  }
}

for (const [id, status] of Object.entries(config?.darts || {})) {
  if (!validStatuses.has(status)) errors.push(`darts.${id}: invalid status ${status}`);
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`id:\\s*[\"']${escaped}[\"']`).test(registrySource)) {
    errors.push(`darts.${id}: id not found in dartsGameRegistry.ts`);
  }
}

for (const [id, status] of Object.entries(config?.platformFeatures || {})) {
  if (!validStatuses.has(status)) errors.push(`platformFeatures.${id}: invalid status ${status}`);
}

const expectedStableSports = ["darts", "babyfoot", "petanque"];
const expectedStableDarts = [
  "x01",
  "cricket",
  "killer",
  "shanghai",
  "training_x01",
  "tour_horloge",
  "five_lives",
  "golf",
  "departements",
  "capital",
  "loterie",
  "attrape_moi",
  "killer_progressive",
  "baseball",
];
const expectedStablePlatformFeatures = [
  "competitions",
  "online",
  "messages",
  "cast",
  "viewer",
];

const actualStableSports = Object.entries(config?.sports || {})
  .filter(([, status]) => status === "stable")
  .map(([id]) => id)
  .sort();
const actualStableDarts = Object.entries(config?.darts || {})
  .filter(([, status]) => status === "stable")
  .map(([id]) => id)
  .sort();
const actualStablePlatformFeatures = Object.entries(config?.platformFeatures || {})
  .filter(([, status]) => status === "stable")
  .map(([id]) => id)
  .sort();

const expectedSportsSorted = [...expectedStableSports].sort();
const expectedDartsSorted = [...expectedStableDarts].sort();
const expectedPlatformSorted = [...expectedStablePlatformFeatures].sort();

if (JSON.stringify(actualStableSports) !== JSON.stringify(expectedSportsSorted)) {
  errors.push(`stable sports mismatch: expected ${expectedSportsSorted.join(", ")} got ${actualStableSports.join(", ")}`);
}
if (JSON.stringify(actualStableDarts) !== JSON.stringify(expectedDartsSorted)) {
  errors.push(`stable darts mismatch: expected ${expectedDartsSorted.join(", ")} got ${actualStableDarts.join(", ")}`);
}
if (JSON.stringify(actualStablePlatformFeatures) !== JSON.stringify(expectedPlatformSorted)) {
  errors.push(`stable platform features mismatch: expected ${expectedPlatformSorted.join(", ")} got ${actualStablePlatformFeatures.join(", ")}`);
}

if (errors.length) {
  console.error("[release-features] FAILED");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

const countStatuses = (source) =>
  Object.values(source || {}).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

console.log("[release-features] OK", {
  sports: countStatuses(config.sports),
  darts: countStatuses(config.darts),
  platformFeatures: countStatuses(config.platformFeatures),
});
