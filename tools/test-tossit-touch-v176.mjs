import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { TOSSIT_MODES, applyTossitAction, newTossitGame, undoTossitAction } from "../src/pages/tossit/tossitEngine.ts";
import { decodeTossitDraft, encodeTossitDraft } from "../src/pages/tossit/tossitDraft.ts";

const supported = (mode) => TOSSIT_MODES.some(({ id }) => id === mode);
const players = [{ id: "one", name: "Joueur 1" }, { id: "two", name: "Joueur 2" }];
assert.equal(TOSSIT_MODES.length, 18, "all 18 modes preserved");
const base = newTossitGame("target", players, 3, 1000);
const once = applyTossitAction(base, { kind: "target", hits: [1, 2, 3] }, 1100);
const twice = applyTossitAction(once, { kind: "target", hits: [0, 1, 2] }, 1200);
const saved = JSON.parse(encodeTossitDraft(twice));
assert.equal(saved.events.length, 2);
assert.equal(saved.previous.events.length, 1);
assert.equal(saved.previous.previous, null, "no recursive snapshot graph in storage");
const resumed = decodeTossitDraft(JSON.stringify(saved), supported);
assert.ok(resumed?.previous, "one-step undo survives resume");
const undone = undoTossitAction(resumed);
assert.equal(undone.events.length, 1);
assert.deepEqual(undone.scores, once.scores);
assert.equal(undone.previous, null, "bounded snapshot after resume");
assert.equal(decodeTossitDraft(JSON.stringify({ ...saved, mode: "fake" }), supported), null, "unsupported mode rejected");
const maliciousPrevious = decodeTossitDraft(JSON.stringify({ ...saved, previous: { ...saved.previous, mode: "bottle" } }), supported);
assert.equal(maliciousPrevious.previous, null, "invalid undo snapshot dropped");
assert.equal(decodeTossitDraft(JSON.stringify({ ...saved, previous: null }), supported).previous, null, "old drafts remain readable");
assert.equal(decodeTossitDraft("not valid json", supported), null);
const instant = applyTossitAction(newTossitGame("sniper", players, 3, 2000), { kind: "sniper", outcome: "mega", playerId: "one" }, 2100);
assert.equal(encodeTossitDraft(instant), null, "finished matches are not saved as drafts");

const screen = readFileSync("src/pages/tossit/TossitScreens.tsx", "utf8");
const css = readFileSync("src/pages/tossit/tossitResponsive.css", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
for (const phrase of [
  "tossitProgress(state, tr)", "tossit-tictac-actions", 'aria-pressed={tictacSelection === index}',
  'disabled={tictacSelection === null}', 'setTictacSelection', 'kind: "tictac", cell: tictacSelection',
  'lastCommitAt.current < 550', 'disabled={!state.previous}', "encodeTossitDraft(state)",
  "decodeTossitDraft(", "tossit-touch-keypad", 'role="status"', "tossit-confirm-button",
]) assert.ok(screen.includes(phrase), `touch UI contract missing: ${phrase}`);
for (const phrase of [
  '.tossit-tictac-cell[aria-pressed="true"]', '.tossit-confirm-button',
  '.tossit-touch-key', 'min-height: 52px', 'orientation: landscape',
]) assert.ok(css.includes(phrase), `touch CSS contract missing: ${phrase}`);
assert.ok(screen.includes("safe-area-inset-bottom"), "safe area padding kept");
assert.ok(app.includes('<TossitHome') && app.includes('<TossitMenu'), "HOME and GAMES still distinct");
assert.ok(existsSync("src/assets/tossit/tossit_menu_decor.webp"), "decor intact");
console.log("TOSSIT V176: 18 modes, snapshot undo after reload, old drafts, mobile two-step confirmation and score progression OK");
