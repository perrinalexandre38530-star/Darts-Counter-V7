import fs from "node:fs/promises";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";
import { AWENA_ROOT, AWENA_STATUS, ensureAwenaRegistryDirectories, quarantineLegacyPack, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

const refresh = process.argv.includes("--refresh");
const migrateLegacy = process.argv.includes("--migrate-legacy");
const catalog = await loadCatalog({ refresh, allowCache: true });
await ensureAwenaRegistryDirectories();

if (migrateLegacy) {
  const dirents = await fs.readdir(AWENA_ROOT, { withFileTypes: true });
  let migrated = 0;
  for (const entry of dirents) {
    if (!entry.isDirectory() || ["approved", "review", "rejected"].includes(entry.name)) continue;
    if (await quarantineLegacyPack(entry.name)) migrated++;
  }
  console.log(`Legacy AWENA quarantined to REVIEW: ${migrated}`);
}

const entries = [];
for (const exercise of catalog.exercises) {
  const key = assetKey(exercise);
  const state = await resolveAwenaRegistryState(exercise, key);
  entries.push({
    exerciseId: exercise.id,
    assetKey: key,
    name: exercise.name,
    source: exercise.source,
    status: state.status,
    origin: state.origin,
    manualKey: state.manualKey || null,
    videoUrl: state.videoUrl || null,
    posterUrl: state.posterUrl || null,
    stepImages: state.stepImages || [],
    coverage: state.coverage || {},
    reason: state.reason || null,
  });
}

const counts = Object.fromEntries(Object.values(AWENA_STATUS).map((status) => [status, entries.filter((entry) => entry.status === status).length]));
const registry = {
  version: 2,
  generatedAt: new Date().toISOString(),
  catalogCount: entries.length,
  counts,
  policy: {
    manualIsAuthoritative: true,
    generatedDefaultStatus: AWENA_STATUS.REVIEW,
    onlyApprovedGeneratedMediaIsRenderable: true,
    legacyGeneratedMediaStatus: AWENA_STATUS.REVIEW,
  },
  entries,
};
await fs.writeFile(path.join(AWENA_ROOT, "registry.json"), JSON.stringify(registry, null, 2));
console.log(JSON.stringify({ catalogCount: entries.length, ...counts }, null, 2));
console.log("Registry: public/fit/awena-library/registry.json");
