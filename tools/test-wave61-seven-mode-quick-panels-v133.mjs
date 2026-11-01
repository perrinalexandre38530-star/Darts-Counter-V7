import fs from 'node:fs';
const p='src/pages/Wave61SharedPlay.tsx';
const s=fs.readFileSync(p,'utf8');
const checks=[
 ['quick meta helper', 'function quickModeMeta'],
 ['BIM objective', 'data-bim-objective-modal="1"'],
 ['Saute objective', 'data-saute-objective-modal="1"'],
 ['Troupeau objective', 'data-troupeau-objective-modal="1"'],
 ['mode ranking', 'data-seven-mode-ranking="1"'],
 ['mode stats', 'data-seven-mode-stats="1"'],
 ['mode players', 'data-seven-mode-players="1"'],
 ['BIM metrics', 'bimBamBoumCombosByPlayer'],
 ['Saute metrics', 'sauteMoutonsLeapfrogsByPlayer'],
 ['Troupeau metrics', 'troupeauWavesRepelledByPlayer'],
 ['La Suite metrics', 'laSuiteLongestStreakByPlayer'],
 ['Color Call metrics', 'colorCallHitsByPlayer'],
];
for (const [name,needle] of checks){ if(!s.includes(needle)){ console.error('❌',name); process.exit(1);} console.log('✅',name); }
console.log('V133 seven-mode quick panels contract OK');
