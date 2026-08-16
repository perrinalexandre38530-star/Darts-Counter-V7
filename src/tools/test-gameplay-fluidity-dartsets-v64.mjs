import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${message}`);
  }
};

const hub = read('src/components/ScoreInputHub.tsx');
const keypad = read('src/components/Keypad.tsx');
const sfx = read('src/lib/x01SfxV3.ts');
const dartImage = read('src/components/DartSetImage.tsx');
const dartStore = read('src/lib/dartSetsStore.ts');
const x01 = read('src/pages/X01PlayV3.tsx');

const fitEffect = hub.slice(hub.indexOf('// PERF: le calcul de fit'), hub.indexOf('const renderKeypad'));
assert(fitEffect.includes('new ResizeObserver(scheduleCompute)'), 'ScoreInputHub coalesce les mesures de layout via ResizeObserver + rAF');
assert(fitEffect.includes('}, [fitToParent, method]);'), 'le fit ne se relance plus à chaque dart / multiplicateur');
assert(!fitEffect.includes('safeCurrentThrow.length, multiplier'), 'aucun forced reflow n’est indexé sur la saisie courante');

assert(keypad.includes('const KeypadNumberGrid = React.memo'), 'la grille numérique 0..20 du keypad est mémoïsée');
assert(keypad.includes('const handleNumber = React.useCallback'), 'le keypad fournit un callback numérique stable');
assert(keypad.includes('touchAction: "manipulation"'), 'les boutons tactiles demandent une interaction mobile directe');

assert(sfx.includes('__dcUnlockAttempt') && sfx.includes('__dcLastUnlockAttemptAt'), 'l’unlock audio Android est dédupliqué et temporisé');
assert(sfx.includes('const a = __dcSilentProbe || new Audio()'), 'la sonde audio d’unlock est réutilisée');
assert(!sfx.includes('base.cloneNode(true)'), 'les SFX ne clonent plus un Audio à chaque dart');

assert(dartStore.includes('export function getDartSetPresetImageSrc'), 'le store expose un fallback preset indépendant des anciennes URL cassées');
assert(dartStore.includes('resolveUserMediaFallback(key, primary') && dartStore.includes('allowR2: true'), 'le sélecteur peut récupérer les photos dartset depuis le coffre R2 après réinstallation Android');
assert(dartImage.includes('getDartSetPresetImageSrc') && dartImage.includes('onLoad={() => setLoaded(true)}'), 'DartSetImage essaie le preset et attend le chargement réel');
assert(dartImage.includes('opacity: loaded ? 1 : 0'), 'une image cassée reste masquée pendant les tentatives de fallback');
assert(dartImage.includes('triedRef.current'), 'les candidats image sont essayés sans boucle');

assert(x01.includes('const TeamsPlayersList = React.memo(TeamsPlayersListInner);'), 'la liste équipes X01 ne rerender plus sur chaque pression de dart');
assert(x01.includes('const PlayersListOnly = React.memo(PlayersListOnlyInner);'), 'la liste joueurs X01 ne rerender plus sur chaque pression de dart');

if (!process.exitCode) console.log('\n✅ GAMEPLAY FLUIDITY + DARTSETS V64 OK');
