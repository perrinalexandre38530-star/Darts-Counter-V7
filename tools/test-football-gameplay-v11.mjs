import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const play = read("src/pages/FootballPlay.tsx");
const playCss = read("src/styles/football-play.css");
const config = read("src/pages/FootballConfig.tsx");
const configCss = read("src/styles/football-config.css");

for (const token of [
  "FootballFlow",
  "PLAN DE JEU",
  "À VISER MAINTENANT",
  "SI TU TOUCHES",
  "SI TU RATES",
  "actionMissHint",
  "football-field__objective",
  "football-input-zone",
  "CHOIX ACTUEL",
  "CIBLE",
]) assert.ok(play.includes(token), `gameplay V11 absent: ${token}`);

for (const token of [
  "football-flow",
  "football-mission-section-label",
  "football-miss-hint",
  "football-pad-choice",
  "football-field__zone.is-next",
]) assert.ok(playCss.includes(token), `CSS gameplay V11 absent: ${token}`);

assert.ok(config.includes('["Mode", "Style", "Participants", "Format", "Gameplay", "Saisie", "Résumé"]'), "7 étapes guidées absentes");
for (const token of ["7 · VÉRIFIE ET JOUE", "football-kickoff-card", "CONFIGURATION VALIDE", "ÉTAPE {index}/7"]) assert.ok(config.includes(token), `config V11 absente: ${token}`);
for (const token of ["football-kickoff-card", "football-config-ready-banner"]) assert.ok(configCss.includes(token), `CSS config V11 absent: ${token}`);

assert.ok(!play.includes('className="football-live-strip football-glass"'), "les stats live ne doivent plus couper le chemin de jeu principal");
assert.ok(play.includes('className="football-momentum football-glass" style={{ marginBottom: 9 }}'), "momentum doit rester accessible dans la feuille de match");

console.log("DARTS FOOTBALL V11 gameplay/config UX: OK");
