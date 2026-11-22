#!/usr/bin/env node
/* Lightweight static guard. Does not claim screenshot or runtime compliance. */
import { readFileSync, existsSync } from 'node:fs';
const required = [
  'docs/design-system/MSS_UI_CHARTER_V1.md',
  'src/styles/mss-ui-contract.css',
  'src/components/mss/MssSectionTabs.tsx',
  'src/lib/mssVisualCharter.ts',
  'src/components/PageHeader.tsx',
  'src/components/BottomNav.tsx',
  'src/training/ui/TrainingPlayLayout.tsx',
  'src/training/ui/TrainingHeader.tsx',
  'src/components/ShoveActivePlayerCard.tsx',
  'src/components/ShoveFloatingHeader.tsx',
];
const missing = required.filter(file => !existsSync(file));
const content = missing.length ? '' : readFileSync('src/components/mss/MssSectionTabs.tsx', 'utf8');
const checks = [
  ['tab bar uses BottomNavIcon', content.includes('BottomNavIcon')],
  ['tab switch is event-driven', content.includes('onClick={() => onChange(tab.id)}')],
  ['tab has selected state', content.includes('aria-selected={active === tab.id}')],
  ['colors centralized in MSS_HIT', existsSync('src/lib/mssVisualCharter.ts') && readFileSync('src/lib/mssVisualCharter.ts','utf8').includes('export const MSS_HIT')],
];
// Pilot contract: FINISH DO is the first screen expected to use the shared training UI.
const finishFile = 'src/training/modes/finish/FinishDoTraining.tsx';
const finishCss = 'src/training/modes/finish/finishDoTraining.css';
const finish = existsSync(finishFile) ? readFileSync(finishFile, 'utf8') : '';
const finishStyles = existsSync(finishCss) ? readFileSync(finishCss, 'utf8') : '';
checks.push(
  ['FINISH DO uses shared TrainingHeader', finish.includes('<TrainingHeader')],
  ['FINISH DO uses shared MssSectionTabs', finish.includes('<MssSectionTabs')],
  ['FINISH DO colors come from MSS_HIT', finish.includes('MSS_HIT.simple') && finish.includes('MSS_HIT.double') && finish.includes('MSS_HIT.triple') && finish.includes('MSS_HIT.miss') && finish.includes('MSS_HIT.bull') && finish.includes('MSS_HIT.dbull')],
  ['FINISH DO uses SVG darts', finish.includes('cricketDartSvg') && !finish.includes('>🎯</span>')],
  ['FINISH DO starts play after selection', finish.includes('setActiveTab("input");\n    reset(value);')],
  ['FINISH DO has compact play layout', finishStyles.includes('.mss-finish-hero-grid') && finishStyles.includes('.mss-finish-game-panel')],
);
for (const f of missing) console.error(`MISSING ${f}`);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (missing.length || checks.some(([, ok]) => !ok)) process.exitCode = 1;
else console.log('MSS UI contract: core files, tab API and FINISH DO pilot contract present. Manual responsive/visual audit remains mandatory.');
