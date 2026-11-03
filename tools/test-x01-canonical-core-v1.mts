import fs from "node:fs";
import assert from "node:assert/strict";
import { buildCanonicalX01IndexV2 } from "../src/lib/x01CanonicalIndexV2.ts";

const backupPath = process.argv[2];
assert.ok(backupPath, "Usage: node --experimental-strip-types tools/test-x01-canonical-core-v1.mts <backup.json>");
const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const records = Object.values(backup?.history?.rows || {});
assert.equal(records.length, 107, "Le backup de référence doit contenir 107 parties");

const rawIndex = buildCanonicalX01IndexV2(records, {});
assert.equal(rawIndex.x01MatchCount, 67, "67 parties X01 attendues");

const matrix = new Map<string, number>();
for (const match of rawIndex.matches) {
  const key = `${match.startScore ?? "unknown"}|${match.inMode}|${match.outMode}`;
  matrix.set(key, (matrix.get(key) || 0) + 1);
}
assert.equal(matrix.get("301|unknown|unknown"), 47);
assert.equal(matrix.get("301|simple|simple"), 7);
assert.equal(matrix.get("501|simple|double"), 12);
assert.equal(matrix.get("501|unknown|unknown"), 1);

for (const match of rawIndex.matches) {
  const ids = match.participants.map((p) => p.historicalPlayerId).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size, `Participant historique dupliqué dans ${match.matchId}`);
}

const NINJA = "1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f";
const aliasMap = {
  "b3517e84-41a1-4eb1-8f20-3e40e3875d38": NINJA,
  "bbedd4b7-e181-4b8e-a794-c948a18e8404": NINJA,
  "usr_aba24e0b146a45f0b714fc1a717f6724": NINJA,
};
const resolved = buildCanonicalX01IndexV2(records, { aliasMap, knownProfileIds: [NINJA] });
const ninja = resolved.profiles[NINJA];
assert.ok(ninja, "Le profil canonique Ninja doit être résolu");
assert.equal(ninja.allMatches, 64, "64 X01 doivent être rattachables à Ninja via IDs explicites/alias/quickProfileLinks");
assert.equal(ninja.reference501DOMatches, 9, "9 parties 501 DO de Ninja sont actuellement exploitables comme référence");
assert.equal(ninja.current501DOMatches, 9, "Avec seulement 9 parties 501 DO, la fenêtre actuelle contient 9 matchs");

let directNinja = 0;
let quickLinkedAlex = 0;
for (const match of resolved.matches) {
  for (const player of match.participants) {
    if (player.canonicalProfileId !== NINJA) continue;
    if (player.name === "Ninja") directNinja += 1;
    if (player.name === "Alex" && player.resolutionSource === "quick_profile_link") quickLinkedAlex += 1;
  }
}
assert.equal(directNinja, 57);
assert.equal(quickLinkedAlex, 7);

console.log(JSON.stringify({
  ok: true,
  sourceHistoryCount: rawIndex.sourceHistoryCount,
  x01MatchCount: rawIndex.x01MatchCount,
  matrix: Object.fromEntries(matrix),
  ninja: {
    directNinja,
    quickLinkedAlex,
    totalResolvedX01: ninja.allMatches,
    reference501DOMatches: ninja.reference501DOMatches,
    lifetime501DOAvg3D: ninja.lifetime501DOAvg3D,
    current501DOAvg3D: ninja.current501DOAvg3D,
  },
}, null, 2));
