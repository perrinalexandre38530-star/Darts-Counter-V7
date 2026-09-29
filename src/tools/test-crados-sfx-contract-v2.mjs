import assert from 'node:assert/strict';
import fs from 'node:fs';

const sfx = fs.readFileSync('src/lib/cradosSfx.ts','utf8');
const play = fs.readFileSync('src/pages/CradosPlay.tsx','utf8');

assert.match(sfx, /ownerId && ownerId !== activeSideId/, 'DOUBLE/TRIPLE doivent identifier uniquement une zone adverse');
assert.match(sfx, /bed === "T" \|\| rawMult === 3\) && opponentSector/, 'TRIPLE handicap doit exiger une zone adverse');
assert.match(sfx, /bed === "D" \|\| rawMult === 2\) && opponentSector/, 'DOUBLE handicap doit exiger une zone adverse');
assert.match(sfx, /stateForDart\?: \(index: number, dart: any\) => any/, 'La séquence audio doit pouvoir recalculer l’état avant chaque dart');
assert.match(sfx, /context\.stateForDart\(index, dart\)/, 'La séquence audio doit réellement utiliser l’état par dart');
assert.doesNotMatch(sfx, /mood === "blowout"[\s\S]{0,300}playCradosSfx\("triple"/, 'Le TRIPLE handicap ne doit jamais servir de signature de victoire');
assert.match(play, /const nextState = playCradosVisit\(state, darts\)/, 'Les bots doivent pré-calculer la volée réellement jouée');
assert.match(play, /effectiveDarts = darts\.slice\(0, processedCount \|\| darts\.length\)/, 'Les bots ne doivent pas sonoriser les darts ignorées après fin de manche');
assert.match(play, /stateForDart: \(index: number\)/, 'Les bots doivent recalculer l’ownership avant chaque son D\/T');
assert.match(play, /requested\.map\(uiToGameDart\)/, 'La saisie humaine doit prévisualiser le moteur avant de jouer les sons');
assert.match(play, /eliminatedInLatestVisit/, 'Le SFX élimination doit survivre au reset immédiat d’une nouvelle manche');

console.log('✅ CRADOS SFX CONTRACT V2 OK');
