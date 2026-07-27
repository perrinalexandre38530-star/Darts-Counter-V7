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

const knownWorkInProgress = [
  "scram",
  "halve_it",
  "bobs_27",
  "shooter",
  "attrape_moi",
  "president",
  "loterie",
  "prisoner",
  "bowling",
  "mario_kart",
];

for (const id of knownWorkInProgress) {
  if (config?.darts?.[id] === "stable") errors.push(`${id}: known work-in-progress must not be stable`);
}

for (const requiredStable of ["x01", "cricket", "killer", "shanghai"]) {
  if (config?.darts?.[requiredStable] !== "stable") {
    errors.push(`${requiredStable}: core Store mode must remain stable`);
  }
}

for (const requiredSport of ["darts", "petanque", "pingpong"]) {
  if (config?.sports?.[requiredSport] !== "stable") {
    errors.push(`${requiredSport}: initial MULTISPORTS Store sport must remain stable until explicitly demoted`);
  }
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
});
