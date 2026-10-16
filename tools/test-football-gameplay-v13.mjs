import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const play = read("src/pages/FootballPlay.tsx");
const css = read("src/styles/football-play.css");

for (const token of [
  "DARTS FOOTBALL V13",
  "footballTacticalRecommendation",
  "FootballRecommendation",
  "PLAN CONSEILLÉ",
  "SÉCURISE",
  "TENTE LE COUP",
  "JOUE ÉQUILIBRÉ",
  "footballInputProjection",
  "FootballProjectionStrip",
  "APERÇU SI TU VALIDES MAINTENANT",
  "REGARDE L’APERÇU",
  "tacticalRecommendation",
  "inputProjection",
  "recommendation={tacticalRecommendation}",
  "projection={inputProjection}",
]) assert.ok(play.includes(token), `gameplay V13 absent: ${token}`);

for (const token of [
  ".football-recommended-play",
  ".football-recommended-play__main",
  ".football-projection",
  ".football-projection__facts",
  ".football-pad-mode.is-recommended",
  ".football-pad-cell.is-recommended",
  ".football-pad-bull.is-recommended",
]) assert.ok(css.includes(token), `CSS V13 absent: ${token}`);

assert.ok(play.includes('preview = playFootballVisit(state, darts.map(uiToGameDart))'), "la projection doit utiliser le vrai moteur Football");
assert.ok(play.includes('scoreAfter: preview.sides.map'), "la projection du score est absente");
assert.ok(play.includes('possessionChanged:'), "la projection de possession est absente");
assert.ok(play.includes('ballAfter: preview.ballPosition'), "la projection du ballon est absente");
assert.ok(play.includes('recommendation?.target === number ? <small>PLAN</small>'), "le secteur tactique recommandé n’est pas marqué PLAN");
assert.ok(play.includes('recommendation?.multiplier === 3 ? "is-recommended"'), "le multiplicateur recommandé n’est pas signalé");

console.log("DARTS FOOTBALL V13 tactical recommendation/projection UX: OK");
