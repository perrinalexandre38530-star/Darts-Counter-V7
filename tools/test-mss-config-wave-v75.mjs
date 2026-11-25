/**
 * Régressions de surface (sans navigateur) du lot CONFIG MSS V75.
 * Cette vérification ne remplace pas un test réel dans StackBlitz/Android.
 * Exécution : node tools/test-mss-config-wave-v75.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(resolve(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }

const root = process.cwd();
function source(file) {
  const path = resolve(root, file);
  const content = readFileSync(path, 'utf8');
  const parsed = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} : JSX/TS syntaxique invalide`);
  return { text: content, ast: parsed };
}
function hasAll(text, patterns, name) {
  for (const needle of patterns) assert.ok(text.includes(needle), `${name} : manque ${needle}`);
}

const quick = source('src/pages/QuickPartyModeConfig.tsx').text;
const knockout = source('src/pages/KnockoutConfig.tsx').text;
const simple = source('src/pages/SimpleRoundsConfig.tsx').text;
source('src/components/config/MssQuickClassicControls.tsx');
source('src/components/config/MssClassicConfigFlow.tsx');

// Un seul tirage des avatars par session : prévisualisation et payload identiques.
hasAll(quick, [
  'const [quickSessionId]',
  'buildTempPlayers(names, playerCount, quickSessionId)',
  'quickPartyAvatar(i, quickSessionId)',
  'MssParticipantModeIcon', 'MssQuickPanel', 'MssQuickRecap', 'MssQuickStart',
  'teamGoldLogo', 'teamPinkLogo',
], 'parties rapides');
for (const id of ['cricket','killer','five_lives','shanghai','halve_it','shooter','bowling','baseball','president']) {
  assert.ok(quick.includes(`${id}: {`), `${id} absent du registre des parties rapides`);
}
for (const route of ['killer_play','five_lives_play','shanghai_play','shooter_play','bowling_play','baseball_play','president_play','halve_it_play']) {
  assert.ok(quick.includes(`route: "${route}"`), `route ${route} perdue`);
}
hasAll(quick, ['quickTeamMode: layout === "teams"', 'teamMembers: players.slice(index * 2, index * 2 + 2)', 'config,', 'temporaryParticipants: true'], 'contrat équipes/bots');

// Les configurations Arcade conservent leurs champs métier et leurs sélecteurs IA.
hasAll(knockout, ['MssClassicConfigFlow', 'MssClassicRecap', 'botsEnabled', 'botLevel', 'rounds', 'objective', '"knockout_play"'], 'KNOCKOUT');
hasAll(simple, ['MssClassicConfigFlow', 'MssClassicRecap', 'SIMPLE_ROUND_VARIANTS', 'humansCount: safeHumansCount', 'rounds, objective', 'setTab?.(playTab, { config: payload })'], 'jeux à manches');
console.log('OK · MSS Config Wave V75 : 3 TSX analysés, 9 routes rapides, 2 familles Arcade, avatars cohérents.');
