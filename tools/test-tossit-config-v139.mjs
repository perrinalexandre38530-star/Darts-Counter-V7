/** V139 native MSS selectors / TOSSIT guided+complete setup regression. Node 22+ */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TOSSIT_MODES, newTossitGame } from '../src/pages/tossit/tossitEngine.ts';
import {
  tossitDartsOptions, tossitMaximumPlayers, tossitMinimumPlayers, tossitRequiresTwoSides,
  tossitSelectionError, tossitSetupPreset, tossitSupportsTeams, tossitTargetOptions,
} from '../src/pages/tossit/tossitConfigPreset.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
assert.equal(TOSSIT_MODES.length, 18);
let presetsChecked = 0;
for (const { id } of TOSSIT_MODES) {
  for (const style of ['quick', 'arcade']) {
    const preset = tossitSetupPreset(id, style);
    assert.ok(tossitDartsOptions(id).includes(preset.darts), `${id} ${style}: legal dart count`);
    assert.ok(tossitTargetOptions(id).includes(preset.victoryTarget), `${id} ${style}: legal match target`);
    assert.ok([4, 5].includes(preset.gridSize));
    assert.ok(newTossitGame(id, players, preset.darts, Date.now(), preset.gridSize, preset.victoryTarget), `${id} ${style} accepted by engine`);
    presetsChecked++;
  }
  assert.ok(tossitMinimumPlayers(id) <= tossitMaximumPlayers(id));
  if (tossitRequiresTwoSides(id)) {
    assert.equal(tossitMaximumPlayers(id), 2);
    assert.equal(tossitSelectionError(id, ['p1'], 'players'), 'missing-players');
    assert.equal(tossitSelectionError(id, ['p1', 'p2', 'p3'], 'players'), 'too-many-players');
  }
  if (!tossitSupportsTeams(id)) assert.equal(tossitSelectionError(id, ['t1', 't2'], 'teams', [['p1'], ['p2']]), 'teams-not-supported');
}
assert.equal(presetsChecked, 36);
assert.equal(tossitSelectionError('conquest', ['t1'], 'teams', [['p1']]), 'two-teams-required');
assert.equal(tossitSelectionError('conquest', ['t1', 't2'], 'teams', [[], ['p2']]), 'missing-team-members');
assert.equal(tossitSelectionError('conquest', ['t1', 't2'], 'teams', [['p1','p2'], ['p2','p3']]), 'member-in-both-teams');
assert.equal(tossitSelectionError('conquest', ['t1', 't2'], 'teams', [['p1','p2'], ['p3','p4']]), null);
assert.equal(tossitSelectionError('classic', ['p1', 'p1'], 'players'), 'duplicate-participants');
const view = readFileSync('src/pages/tossit/TossitConfigV2.tsx', 'utf8');
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
for (const name of ['PlayerPagedSelector', 'TeamSelectorV2', 'ConfigTickerHeader', 'BackDot', 'useAwenaOptional', 'loadTeamsBySport("tossit")', 'tossitSetupPreset', 'newTossitGame', 'memberIds: playerIds.slice()', 'onModeChange', 'setupStyle', 'selectedTeamIds', 'selectedProfileIds']) {
  assert.ok(view.includes(name), `${name} wired in new config`);
}
for (const name of ['"guided"', '"complete"', '"quick"', '"arcade"', 'tossit-v2-steps', 'tossit-v2-start-bar', 'aria-pressed', 'modeTopic: "config"', 'setRuntime({ sport: "tossit"']) assert.ok(view.includes(name), `setup UI ${name}`);
for (const name of ['modePicker: true', 'setupStyle: "quick"', 'setupStyle: "arcade"', 'TossitConfigV2', 'tossit_config']) assert.ok(screen.includes(name), `games entry ${name}`);
for (const name of ['@media (max-width: 530px)', 'tossit-v2-steps', 'tossit-awena-dot', 'safe-area-inset-bottom', 'orientation: landscape', 'tossit-games-entrypaths']) assert.ok(css.includes(name), `responsive ${name}`);
for (const file of ['src/pages/tossit/TossitScreens.tsx','src/pages/tossit/TossitConfigV2.tsx','src/pages/tossit/tossitConfigPreset.ts']) {
  const result = ts.transpileModule(readFileSync(file,'utf8'), { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length || 0, 0, `${file} syntax`);
}
console.log(`TOSSIT V139 config native MSS contract OK: ${presetsChecked} presets, 18 modes, 2 selectors, team validation, Awena, responsive menus.`);
