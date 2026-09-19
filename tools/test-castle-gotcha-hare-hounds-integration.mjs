import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const mustContain = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label}: missing ${needle}`);
};
const mustExist = (p) => {
  if (!fs.existsSync(path.join(root, p))) throw new Error(`Missing file: ${p}`);
};

const requiredFiles = [
  'src/pages/CastleConfig.tsx',
  'src/pages/GotchaConfig.tsx',
  'src/pages/HareHoundsConfig.tsx',
  'src/pages/CastlePlay.tsx',
  'src/pages/GotchaPlay.tsx',
  'src/pages/HareHoundsPlay.tsx',
  'src/pages/newModes/NewDartsModeConfig.tsx',
  'src/pages/newModes/newModePlayShared.tsx',
  'src/lib/gameEngines/castleEngine.ts',
  'src/lib/gameEngines/gotchaEngine.ts',
  'src/lib/gameEngines/hareHoundsEngine.ts',
  'src/assets/tickers/ticker_castle.webp',
  'src/assets/tickers/ticker_gotcha.webp',
  'src/assets/tickers/ticker_hare_hounds.webp',
];
requiredFiles.forEach(mustExist);

const app = read('src/App.tsx');
for (const route of ['castle_config','castle_play','gotcha_config','gotcha_play','hare_hounds_config','hare_hounds_play']) {
  mustContain(app, `case "${route}"`, 'App routes');
}
for (const route of ['"castle_play"','"gotcha_play"','"hare_hounds_play"']) {
  mustContain(app, route, 'fullscreen play routes');
}

const registry = read('src/games/dartsGameRegistry.ts');
for (const [id, tab] of [['castle','castle_config'],['gotcha','gotcha_config'],['hare_hounds','hare_hounds_config']]) {
  mustContain(registry, `id: "${id}"`, 'game registry');
  mustContain(registry, `tab: "${tab}"`, 'game registry');
}

const history = read('src/pages/HistoryPage.tsx');
for (const key of ['castle','gotcha','hare_hounds']) mustContain(history, key, 'history integration');
for (const route of ['castle_play','gotcha_play','hare_hounds_play']) mustContain(history, route, 'history resume routes');

const summaryPage = read('src/pages/DartsModeSummaryPage.tsx');
for (const key of ['\"castle\"','\"gotcha\"','\"hare_hounds\"']) mustContain(summaryPage, key.replaceAll('\\"','\"'), 'dedicated history summary mode');
for (const component of ['CastleSummaryTables','GotchaSummaryTables','HareHoundsSummaryTables']) mustContain(summaryPage, component, 'dedicated history summary component');

const sharedConfig = read('src/pages/newModes/NewDartsModeConfig.tsx');
for (const playRoute of ['castle_play','gotcha_play','hare_hounds_play']) {
  const configName = playRoute.replace('_play', '');
  if (!read(`src/pages/${configName === 'hare_hounds' ? 'HareHounds' : configName[0].toUpperCase()+configName.slice(1)}Config.tsx`).includes(playRoute)) {
    throw new Error(`Config does not launch ${playRoute}`);
  }
}
mustContain(sharedConfig, 'recordProfileUsageForMode', 'profile usage integration');
mustContain(sharedConfig, 'scoreInputMethod', 'score input integration');
const sharedPlay = read('src/pages/newModes/newModePlayShared.tsx');
mustContain(sharedPlay, 'maxDarts=3', 'shared input variable dart cap');
const castlePlay = read('src/pages/CastlePlay.tsx');
mustContain(castlePlay, 'maxDarts={state.phase === "assignment" ? 1 : 3}', 'castle assignment one-dart cap');

for (const page of ['CastlePlay.tsx','GotchaPlay.tsx','HareHoundsPlay.tsx']) {
  const text = read(`src/pages/${page}`);
  mustContain(text, 'History.upsert', `${page} autosave`);
  mustContain(text, 'onFinish', `${page} finished match integration`);
  mustContain(text, 'NewModeInput', `${page} score input`);
  mustContain(text, 'ModeEndPanel', `${page} end screen`);
  mustContain(text, 'UNDO', `${page} undo`);
}

console.log('CASTLE / GOTCHA / HARE & HOUNDS integration: OK');
