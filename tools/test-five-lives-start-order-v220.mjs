/** Contrat de l'ordre de départ des 5 Vies / RELAIS / CHASE.
 * Le classement BULL repose sur le lancer réel des joueurs et sur un tri manuel
 * avant lancement : aucune distance fictive n'est générée par l'application. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = readFileSync('src/pages/FiveLivesConfig.tsx', 'utf8');
const play = readFileSync('src/pages/FiveLivesPlay.tsx', 'utf8');
assert.match(config, /\[\['random','ALÉATOIRE'\],\['alternate','SÉLECTION'\],\['manual','MANUEL'\],\['bull','BULL'\]\]/);
assert.match(config, /startOrderMode === "bull" \|\| startOrderMode === "manual"/, 'le tri doit être accessible en modes BULL et MANUEL');
assert.match(config, /moveSelectedPlayer\(index, -1\)/, 'monter un joueur');
assert.match(config, /moveSelectedPlayer\(index, 1\)/, 'descendre un joueur');
assert.match(config, /setSelectedIds\(\(prev\) => \{[\s\S]*?\[next\[index\], next\[swap\]\] = \[next\[swap\], next\[index\]\]/, 'le tri réordonne la liste de sélection');
assert.match(config, /const finalPlayers = randomStartOrder \? shuffleArray\(players\) : players/, 'ne pas mélanger après un tri manuel/BULL');
assert.match(config, /setRandomStartOrder\(mode === "random"\)/);
assert.match(config, /startOrderSource: startOrderMode === "bull" \? "bull"/);
assert.match(config, /startOrderMode,\s*allowEqualScore:/);
assert.match(config, /Au plus près de la Bull|au plus près de la Bull/, 'explication accessible du départ à la Bull');
assert.doesNotMatch(config, /bullOrder|setBullOrder/, 'ne pas garder un drapeau UI jamais activé');
assert.match(play, /allowEqualScore \? score >= Number\(target\) : score > Number\(target\)/);
console.log('PASS V220 — ordre de départ BULL/MANUEL visible et conservé, sélection/règles inchangées.');
