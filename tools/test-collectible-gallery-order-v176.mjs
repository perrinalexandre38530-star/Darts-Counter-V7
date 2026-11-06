import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "src/components/profile/CollectibleCardsPanel.tsx"), "utf8");

assert.match(source, /const cards = React\.useMemo\(\(\) => \{/);
assert.match(source, /const filtered = COLLECTIBLE_CARDS\.filter\(/);
assert.match(source, /return filtered\.sort\(/);
assert.match(source, /const startsGroup = index === 0/);
assert.match(source, /gridColumn:"1 \/ -1"/);
assert.match(source, /labels\.remaining/);
assert.match(source, /\[filter, unlocks\]/);

// Reprend le comparateur réellement présent dans le composant pour vérifier
// le tri, l'ordre stable et l'absence de mutation des définitions source.
const match = source.match(/return filtered\.sort\(\(a, b\) => (Number\(!!unlocks\[b\.id\]\) - Number\(!!unlocks\[a\.id\]\))\);/);
assert.ok(match, "Le comparateur débloquées d'abord doit être conservé");
const comparator = new Function("a", "b", "unlocks", `return ${match[1]};`);

const master = Object.freeze([
  Object.freeze({ id: "a", collection: "legends" }),
  Object.freeze({ id: "b", collection: "awena" }),
  Object.freeze({ id: "c", collection: "legends" }),
  Object.freeze({ id: "d", collection: "awena" }),
  Object.freeze({ id: "e", collection: "legends" }),
]);
const sort = (cards, unlocks) => cards.slice().sort((a, b) => comparator(a, b, unlocks));
const ids = (cards) => cards.map((card) => card.id);

assert.deepEqual(ids(sort(master, { c: true, b: true })), ["b", "c", "a", "d", "e"]);
assert.deepEqual(ids(sort(master, {})), ["a", "b", "c", "d", "e"]);
assert.deepEqual(ids(sort(master, { a: true, b: true, c: true, d: true, e: true })), ["a", "b", "c", "d", "e"]);
assert.deepEqual(ids(sort(master.filter((card) => card.collection === "legends"), { c: true })), ["c", "a", "e"]);
assert.deepEqual(ids(sort(master.filter((card) => card.collection === "awena"), { d: true })), ["d", "b"]);
assert.deepEqual(ids(sort(master, { d: true, e: true })), ["d", "e", "a", "b", "c"], "Un nouveau déblocage doit passer devant");
assert.deepEqual(ids(master), ["a", "b", "c", "d", "e"], "L'ordre des définitions ne doit pas changer");
console.log("✅ Galerie V176 : débloquées en premier, verrouillées après ; filtres, tri stable et définitions préservés.");
