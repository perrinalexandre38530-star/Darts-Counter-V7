import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("src/App.tsx", "utf8");
const five = readFileSync("src/pages/FiveLivesPlay.tsx", "utf8");
const halve = readFileSync("src/pages/HalveItPlay.tsx", "utf8");
assert.match(app, /const PublicLandingPage = React\.lazy\(/, "V113 lazy landing must be preserved");
assert.match(app, /const isTossitMatch =/, "V113 TOSSIT identification must be preserved");
assert.match(app, /const confirmBeforeMirror = isTossitMatch \|\| options\?\.confirmPersistence === true;/, "both save protocols coexist");
assert.match(app, /if \(!confirmBeforeMirror\) updateVisibleHistory\(\);/, "only other modes mirror optimistically");
assert.match(app, /if \(confirmBeforeMirror\) \{\s*void upsertPromise\.then\(\(committed\) => \{ if \(committed\) updateVisibleHistory\(\); \}\);/, "commit-before-mirror");
assert.match(app, /if \(!isTossitMatch && options\?\.suppressFailureAlert !== true\)/, "TOSSIT and V217 use independent retry UI");
assert.match(app, /return upsertPromise;/, "History commit result is awaitable");
for (const page of [five, halve]) {
  assert.match(page, /createConfirmedHistorySaveGate/);
  assert.match(page, /confirmPersistence: true/);
  assert.match(page, /suppressFailureAlert: true/);
}
console.log("PASS V113 REBASE — TOSSIT preserved; V217/V218 persistence merged; no optimistic V4 mirror for confirmed games");
