// Node-only static contract test; run with Node 22+.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { TOSSIT_MODES } from '../src/pages/tossit/tossitEngine.ts';
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
const home = readFileSync('src/pages/tossit/TossitHome.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
assert.equal(TOSSIT_MODES.length, 18, '18 TOSSIT modes retained');
for (const mode of TOSSIT_MODES) assert(screen.includes(`mode === "${mode.id}"`) || screen.includes(`"${mode.id}"`), `${mode.id} still present`);
for (const key of ['tossit-menu-page','tossit-config-page','tossit-play-page','tossit-stats-page','tossit-play-grid','tossit-play-sidebar','tossit-play-main','tossit-mode-panel','tossit-mode-search']) assert(screen.includes(key), `missing ${key}`);
for (const key of ['@media (max-width: 520px)','orientation: landscape','grid-template-columns','overflow-y: auto','100dvh','safe-area','touch-action: manipulation','font-size: 16px','focus-visible','overscroll-behavior-y']) {
 assert((screen + css).includes(key), `missing mobile accessibility contract: ${key}`);
}
assert(screen.includes('filteredModes.map'), 'search must filter the visible modes');
assert(screen.includes('aria-live="polite"'), 'search results are screen-reader friendly');
assert(screen.includes('ScoreCards state={state}'), 'live score still displayed');
assert(screen.includes('applyTossitAction(state, action)'), 'engine dispatch unchanged');
assert(screen.includes('onFinish?.(match)') && screen.includes('History.list()'), 'history lifecycle retained');
assert(screen.includes('writeDraft(state)') && screen.includes('readDraft()'), 'interrupted match preserved');
assert(app.includes('<TossitHome') && app.includes('<TossitMenu'), 'HOME/GAMES routing retained');
assert(home.includes('SportHomeWelcomeHeader'), 'TOSSIT welcome HOME intact');
for (const path of ['src/assets/tossit/tossit_menu_decor.webp','src/assets/tickers/ticker_tossit_games.webp']) assert(existsSync(path), `${path} exists`);
console.log('TOSSIT V163 mobile contracts OK: 18 modes, portrait/landscape, tap targets, filter, HOME/GAMES, draft/history');
