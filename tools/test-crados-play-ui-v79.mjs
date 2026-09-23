import assert from "node:assert/strict";
import fs from "node:fs";

const tsx = fs.readFileSync(new URL("../src/pages/CradosPlay.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/pages/CradosPlay.css", import.meta.url), "utf8");

const colors = tsx.match(/const PLAYER_COLORS = \[(.*?)\];/s)?.[1]?.match(/#[0-9a-fA-F]{6}/g) || [];
assert.equal(colors.length, 10, "CRADOS Play doit disposer de 10 couleurs joueurs distinctes");
assert.equal(new Set(colors).size, 10, "Les 10 couleurs joueurs doivent être uniques");
assert.match(tsx, /seededPalette\(/, "La palette doit être mélangée de façon stable pour la partie");
assert.match(tsx, /slice\(0, 10\)/, "Le Play CRADOS doit limiter l'affichage à 10 joueurs maximum");
assert.match(tsx, /function CradosTacticalBoard/, "La carte tactique de cible doit être présente");
assert.match(tsx, /ZONE ADVERSE · VOL/, "Le coût tactique du mode VOL doit être visible");
assert.match(tsx, /S = −1 couche · \+1 crasse/, "Le coût VOL simple doit refléter le moteur");
assert.match(tsx, /D = −2 couches · \+1 crasse/, "Le coût VOL double doit refléter le moteur");
assert.match(tsx, /T = −3 couches · \+1 crasse/, "Le coût VOL triple doit refléter le moteur");
assert.match(tsx, /ZONE ADVERSE · BLOCAGE/, "Le coût tactique du mode BLOCAGE doit être visible");
assert.match(tsx, /function TurnStrip/, "Le bandeau d'ordre de jeu doit être présent");
assert.match(tsx, /function ActivePlayerCard/, "Le bloc joueur actif doit être présent");
assert.match(tsx, /function PlayersModal/, "Le panneau flottant joueurs doit être présent");
assert.match(tsx, /lockBodyScroll: true/, "Le Play CRADOS doit verrouiller le scroll de page");
assert.match(tsx, /isCradosTeamMode\(config\)/, "Le mode équipes V79 doit être conservé");
assert.match(tsx, /cradosSideIdForPlayer/, "Les jauges et secteurs doivent utiliser les side IDs V79");
assert.match(tsx, /winnerTeamId: isTeams \? s\.winnerId/, "L'historique doit conserver winnerTeamId en équipes");
assert.match(tsx, /profiles=\{teamMode \? sideProfiles : profiles\}/, "L'écran de fin doit afficher les équipes en mode teams");
assert.match(css, /height:\s*100dvh/, "Le Play CRADOS doit tenir dans le viewport");
assert.match(css, /\.crados-play\s*\{[\s\S]*?overflow:\s*hidden/, "Le long scroll global doit être supprimé");
assert.match(css, /@media \(orientation: landscape\)[\s\S]*?grid-template-columns:/, "Une mise en page paysage dédiée doit être présente");
assert.match(css, /\.crados-players-modal__list[\s\S]*?overflow-y:\s*auto/, "Seul le panneau joueurs doit pouvoir défiler localement");

console.log("✅ CRADOS Play UI V79 regression OK: viewport compact, cible tactique, 10 couleurs, panneau joueurs et mode équipes préservé.");
