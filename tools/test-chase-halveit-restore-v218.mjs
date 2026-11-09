/** V218 — restauration / identité / lecture History V4 sans migration. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(resolve(root, name), "utf8");
const dir = mkdtempSync(join(tmpdir(), "mss-family-restore-v218-"));
let stats;
try {
  writeFileSync(join(dir, "historyDartsVariants.ts"), read("src/lib/historyDartsVariants.ts"));
  writeFileSync(join(dir, "dartsFamilyStatsSource.ts"), read("src/lib/stats/dartsFamilyStatsSource.ts")
    .replace('from "../historyDartsVariants"', 'from "./historyDartsVariants.ts"'));
  stats = await import(pathToFileURL(join(dir, "dartsFamilyStatsSource.ts")).href);
} finally {
  rmSync(dir, { force: true, recursive: true });
}
const { dartsFamilyStatsMode, shouldHydrateFamilyHistoryForStats, dartsStatsRowMatchesProfile,
  halveItStatsRows, isDartsFamilyDraw } = stats;

// Le détail historique rétablit l'identifiant de variante sur l'ancienne famille.
const records = [
  { id: "old5", kind: "five_lives", payload: { summary: { variantId: "chase" } } },
  { id: "oldH", kind: "halve_it", payload: { config: { variantId: "split_score" } } },
  { id: "classicH", kind: "halve_it", payload: { stats: { players: {} } } },
  { id: "wrong", kind: "steeplechase", variantId: "chase" },
];
assert.deepEqual(records.map(dartsFamilyStatsMode), ["five_lives", "split_score", "halve_it", null]);
assert.equal(shouldHydrateFamilyHistoryForStats({ kind: "halve_it" }, "split_score"), true);
assert.equal(shouldHydrateFamilyHistoryForStats({ kind: "halve_it" }, "halve_it"), true);
assert.equal(shouldHydrateFamilyHistoryForStats({ kind: "five_lives" }, "five_lives"), true);
assert.equal(shouldHydrateFamilyHistoryForStats({ kind: "steeplechase" }, "five_lives"), false);
assert.equal(shouldHydrateFamilyHistoryForStats({ kind: "five_lives" }, "split_score"), false);
assert.equal(isDartsFamilyDraw({ payload: { summary: { tied: true } } }), true);

const idA = "b3517e84-41a1-4eb1-8f20-3e40e3875d38";
const idB = "e1117e84-41a1-4eb1-8f20-3e40e3875d38";
const oldMap = {
  [idA]: { name: "Ninja", validHits: 5, finalScore: 123 },
  [idB]: { name: "Ninja", validHits: 2, finalScore: 44 },
  "0": { name: "Bot", playerId: "bot_alpha", validHits: 1 },
};
const before = structuredClone(oldMap);
const rows = halveItStatsRows(oldMap);
assert.equal(rows.length, 3);
const ninjaA = rows.find((row) => row.playerId === idA);
const ninjaB = rows.find((row) => row.playerId === idB);
const bot = rows.find((row) => row.playerId === "bot_alpha");
assert.ok(ninjaA && ninjaB && bot);
assert.ok(dartsStatsRowMatchesProfile(ninjaA, idA, "Ninja"));
assert.ok(!dartsStatsRowMatchesProfile(ninjaB, idA, "Ninja"), "homonymes distincts");
assert.ok(dartsStatsRowMatchesProfile(bot, "bot_alpha", "Bot"));
assert.deepEqual(oldMap, before, "History V4 lecture-seule");
assert.deepEqual(halveItStatsRows([{ id: idA }]), [{ id: idA }], "tableaux récents inchangés");
assert.deepEqual(halveItStatsRows(null), []);
assert.equal(dartsStatsRowMatchesProfile({ name: "Ninja" }, idA, "Ninja"), true, "archive réellement anonyme");
assert.equal(dartsStatsRowMatchesProfile({ id: idB, name: "Ninja" }, idA, "Ninja"), false);

const hub = read("src/pages/StatsHub.tsx");
const statsComponent = read("src/components/stats/HalveItStatsTabFull.tsx");
const app = read("src/App.tsx");
const five = read("src/pages/FiveLivesPlay.tsx");
const halve = read("src/pages/HalveItPlay.tsx");
assert.match(hub, /latestReadToken = 0/);
assert.match(hub, /const readToken = \+\+latestReadToken/);
assert.match(hub, /if \(!mounted \|\| readToken !== latestReadToken\) return;/);
assert.match(hub, /window\.addEventListener\("dc-storage-restored", onUpd/);
assert.match(hub, /window\.removeEventListener\("dc-storage-restored", onUpd/);
assert.match(statsComponent, /\.map\(halveItStatsRows\)/);
assert.match(app, /return upsertPromise;/);
assert.match(app, /confirmPersistence === true/);
assert.match(five, /if \(finalMatch && !saveGateRef\.current\.isSaved\(/);
assert.match(halve, /saveGateRef\.current\.save\(id,/);
console.log("PASS V218 — 4 modes, hydratation après restauration, identités anciennes, maps joueurs, pas de double comptage, synchro UI à dernière lecture");
