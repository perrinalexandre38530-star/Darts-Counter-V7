/**
 * Regression of real Wave61 SHOVE engine, not just helper text.
 * Exercise the Chinatungsten rules in a bundled Node-compatible engine.
 */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const entry = fileURLToPath(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url));
const result = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", target: "node22", write: false, logLevel: "silent" });
const bundled = Buffer.from(result.outputFiles[0].contents).toString("base64");
const { createWave61State, playWave61Visit } = await import("data:text/javascript;base64," + bundled);

const players = [
  { id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }, { id: "p3", name: "Charlie" },
];
const dart = (bed, number) => number == null ? { bed } : { bed, number };
const start = (options = {}, count = 2) => createWave61State(players.slice(0, count), "shove_a_penny", {
  modeOptions: { marksPerBox: 3, overflowRule: 1, ...options },
  selectedIds: players.slice(0,count).map((p) => p.id), rounds: 60, randomOrder: false,
});
const hit = (state, ...darts) => playWave61Visit(state, darts);

let game = start();
assert.equal(game.config.modeOptions.ruleSet, "traditional", "new games default to Chinatungsten rules");
assert.equal(game.config.goal, 27);
assert.equal(Object.keys(game.special.shoveMarksByPlayer.p1).length, 9);
game = hit(game, dart("S", 8), dart("D", 6), dart("T", 2));
assert.equal(game.special.shoveMarksByPlayer.p1["8"], 1);
assert.equal(game.special.shoveMarksByPlayer.p1["6"], 2);
assert.equal(game.special.shoveMarksByPlayer.p1["2"], 3);
assert.equal(game.scores.p1, 0, "traditional mode has no virtual points");
assert.equal(game.progress.p1, 6);

game = hit(start(), dart("S", 1), dart("S", 1), dart("T", 1));
assert.equal(game.special.shoveMarksByPlayer.p1["1"], 3);
assert.equal(game.special.shoveMarksByPlayer.p2["1"], 2, "two excess marks gifted on same sector");
assert.equal(game.progress.p2, 2, "gift updates opponent progress");

game = hit(start(), dart("OB"), dart("IB"), dart("S", 20));
assert.equal(game.progress.p1, 0, "bull, dbull and 20 score no marks");

let most = start({ giftTargetRule: "most_needed" }, 3);
most.special.shoveMarksByPlayer.p1["5"] = 2;
most.special.shoveMarksByPlayer.p2["5"] = 2;
most.special.shoveMarksByPlayer.p3["5"] = 0;
most = hit(most, dart("T", 5));
assert.equal(most.special.shoveMarksByPlayer.p2["5"], 2, "recipient with fewer missing marks is skipped");
assert.equal(most.special.shoveMarksByPlayer.p3["5"], 2, "most needed gets both gifts");

let chosen = start({ giftTargetRule: "shooter_choice", giftRecipientId: "p3" }, 3);
chosen.special.shoveMarksByPlayer.p1["5"] = 2;
chosen = hit(chosen, dart("T", 5));
assert.equal(chosen.special.shoveMarksByPlayer.p2["5"], 0, "unselected opponent receives nothing");
assert.equal(chosen.special.shoveMarksByPlayer.p3["5"], 2, "selected opponent receives surplus");

let protectedGame = start();
for (let n=1; n<=9; n++) protectedGame.special.shoveMarksByPlayer.p2[String(n)] = 3;
protectedGame.special.shoveMarksByPlayer.p2["3"] = 2;
protectedGame.special.shoveMarksByPlayer.p1["3"] = 2;
protectedGame = hit(protectedGame, dart("T", 3));
assert.equal(protectedGame.special.shoveMarksByPlayer.p2["3"], 2, "last winning mark cannot be gifted");
assert.notEqual(protectedGame.winnerId, "p2", "the opponent cannot win from a gift");
// Winning player may close with one dart, even with darts left.
protectedGame.activePlayerIndex = 1;
protectedGame = hit(protectedGame, dart("S", 3));
assert.equal(protectedGame.winnerId, "p2", "own dart must supply final mark");

let electronic = start({ ruleSet: "electronic" });
assert.equal(electronic.config.goal, 21);
electronic = hit(electronic, dart("T", 16), dart("D", 15), dart("S", 15));
assert.equal(electronic.special.shoveMarksByPlayer.p1["16"], 0, "electronic mode is ordered");
assert.equal(electronic.special.shoveMarksByPlayer.p1["15"], 3);
console.log("✅ SHOVE v102 : ordre libre 1-9, surplus, 3 dons, fin personnelle, variante électronique.");
