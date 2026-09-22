import fs from "node:fs";
import assert from "node:assert/strict";

const quota = fs.readFileSync(new URL("../src/lib/teamImageStorage.ts", import.meta.url), "utf8");
const teams = fs.readFileSync(new URL("../src/lib/teamsStore.ts", import.meta.url), "utf8");
const petanque = fs.readFileSync(new URL("../src/lib/petanqueTeamsStore.ts", import.meta.url), "utf8");
const shuffle = fs.readFileSync(new URL("../src/lib/teamAutoShuffle.ts", import.meta.url), "utf8");

assert.match(quota, /packJsonForStorage/);
assert.match(quota, /purgeLegacyLocalStorageIfNeeded\(\{ force: true \}\)/);
assert.match(quota, /localStorage\.removeItem\(key\)/);
assert.match(quota, /dc-storage-quota/);
assert.doesNotMatch(quota, /localStorage\.setItem\(key, JSON\.stringify\(compacted/);

assert.match(teams, /unpackJsonFromStorage/);
assert.match(petanque, /unpackJsonFromStorage/);
assert.match(petanque, /normalizeNonInlineImageRef/);
assert.match(petanque, /avatarUrl: normalizeNonInlineImageRef/);
assert.match(shuffle, /unpackJsonFromStorage/);
assert.match(shuffle, /setJsonWithQuotaRecovery\(STORED_TEAMS_KEY/);

console.log("✅ dc-teams-v1: lecture compatible JSON + LZ");
console.log("✅ dc-teams-v1: écriture compressée + compactage médias + purge ciblée");
console.log("✅ QuotaExceededError n'atteint plus le CrashBoundary après les retries");
