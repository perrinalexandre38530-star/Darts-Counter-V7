import fs from "node:fs/promises";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";
import { AWENA_COMPLETENESS, AWENA_ROOT, AWENA_STATUS, canonicalAwenaAssetKey, ensureAwenaRegistryDirectories, listGeneratedArtifactKeys, quarantineLegacyPack, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

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
  const canonicalKey = canonicalAwenaAssetKey(exercise, key);
  const state = await resolveAwenaRegistryState(exercise, key);
  entries.push({
    exerciseId: exercise.id,
    assetKey: key,
    canonicalAssetKey: canonicalKey,
    name: exercise.name,
    source: exercise.source,
    status: state.status,
    origin: state.origin,
    manualKey: state.manualKey || null,
    videoUrl: state.videoUrl || null,
    posterUrl: state.posterUrl || null,
    stepImages: state.stepImages || [],
    coverage: state.coverage || {},
    completeness: state.completeness || AWENA_COMPLETENESS.NONE,
    missingComponents: state.missingComponents || [],
    reason: state.reason || null,
  });
}

const counts = Object.fromEntries(Object.values(AWENA_STATUS).map((status) => [status, entries.filter((entry) => entry.status === status).length]));
const approvedEntries = entries.filter((entry) => entry.status === AWENA_STATUS.APPROVED);
const completenessCounts = {
  approvedComplete: approvedEntries.filter((entry) => entry.completeness === AWENA_COMPLETENESS.COMPLETE).length,
  approvedPartial: approvedEntries.filter((entry) => entry.completeness === AWENA_COMPLETENESS.PARTIAL).length,
  missingVideo: approvedEntries.filter((entry) => !entry.coverage?.video).length,
  missingPoster: approvedEntries.filter((entry) => !entry.coverage?.poster).length,
  missingSteps: approvedEntries.filter((entry) => Number(entry.coverage?.steps || 0) < 4).length,
};
const artifactCounts = {
  approvedGeneratedArtifacts: (await listGeneratedArtifactKeys(AWENA_STATUS.APPROVED)).length,
  reviewArtifacts: (await listGeneratedArtifactKeys(AWENA_STATUS.REVIEW)).length,
  rejectedArtifacts: (await listGeneratedArtifactKeys(AWENA_STATUS.REJECTED)).length,
};
const aliasMap = Object.fromEntries([...new Set(entries.map((entry) => entry.canonicalAssetKey))].map((canonicalKey) => [canonicalKey, entries.filter((entry) => entry.canonicalAssetKey === canonicalKey).map((entry) => ({ exerciseId: entry.exerciseId, assetKey: entry.assetKey, name: entry.name, source: entry.source }))]));
const registry = {
  version: 4,
  generatedAt: new Date().toISOString(),
  catalogCount: entries.length,
  counts: { ...counts, ...completenessCounts, ...artifactCounts },
  packAliases: aliasMap,
  policy: {
    canonicalPackAliases: true,
    manualIsAuthoritative: true,
    generatedDefaultStatus: AWENA_STATUS.REVIEW,
    onlyApprovedGeneratedMediaIsRenderable: true,
    legacyGeneratedMediaStatus: AWENA_STATUS.REVIEW,
    approvedCompleteNeverRegenerated: true,
    approvedPartialGeneratesMissingComponentsOnly: true,
    validatedComponentsNeverOverwrittenAutomatically: true,
  },
  entries,
};
await fs.writeFile(path.join(AWENA_ROOT, "registry.json"), JSON.stringify(registry, null, 2));
console.log(JSON.stringify({ catalogCount: entries.length, ...counts, ...completenessCounts, ...artifactCounts }, null, 2));
console.log("Registry: public/fit/awena-library/registry.json");
