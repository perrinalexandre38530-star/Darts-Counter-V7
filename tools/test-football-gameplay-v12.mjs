import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const play = read("src/pages/FootballPlay.tsx");
const css = read("src/styles/football-play.css");

for (const token of [
  'GUIDE_KEY = "mss:football:guide-v12"',
  "FootballTransition",
  "VOLÉE PRÉCÉDENTE",
  "MAINTENANT",
  "FootballGuide",
  "GUIDE EXPRESS",
  "LIS LE TERRAIN",
  "SUIS LE PLAN DE JEU",
  "VISE CE QUI EST INDIQUÉ",
  "VALIDE TA VOLÉE",
  "contextualCoachTip",
  "💡 CONSEIL",
  "uiDartIsUseful",
  "FLÉCHETTE",
  "football-match-readout",
]) assert.ok(play.includes(token), `gameplay V12 absent: ${token}`);

for (const token of [
  ".football-transition",
  ".football-coach-tip",
  ".football-pad-live-feedback",
  ".football-pad-preview-chip.is-useful",
  ".football-pad-preview-chip.is-off-target",
  ".football-guide-backdrop",
  ".football-guide__actions",
  ".football-match-readout",
]) assert.ok(css.includes(token), `CSS V12 absent: ${token}`);

assert.ok(!play.includes('className="football-match-ticker football-glass"'), "l'ancien ticker doit être remplacé par la transition pédagogique");
assert.ok(play.includes('onGuide={() => { setGuideStep(0); setShowGuide(true); }}'), "bouton de réouverture du guide absent");
assert.ok(play.includes('localStorage.setItem(GUIDE_KEY, "1")'), "mémorisation du guide absent");

console.log("DARTS FOOTBALL V12 learning/gameplay UX: OK");
