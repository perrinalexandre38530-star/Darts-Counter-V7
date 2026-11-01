import fs from 'node:fs';
const p='src/pages/Wave61SharedPlay.tsx';
const s=fs.readFileSync(p,'utf8');
const checks=[
 ['BLACK VS WHITE live preview','data-black-white-live-preview="1"'],
 ['LES 3 COULEURS live preview','data-three-colors-live-preview="1"'],
 ['LA SUITE live preview','data-la-suite-live-preview="1"'],
 ['COLOR CALL live preview','data-color-call-live-preview="1"'],
 ['BlackWhite receives currentThrow','<BlackWhitePanel state={state} currentThrow={currentThrow} />'],
 ['ThreeColors receives currentThrow','<ThreeColorsPanel state={state} currentThrow={currentThrow} accent={accent} />'],
 ['LaSuite receives currentThrow','<LaSuitePanel state={state} currentThrow={currentThrow} accent={accent} />'],
 ['ColorCall receives currentThrow','<ColorCallPanel state={state} currentThrow={currentThrow} accent={accent} />'],
];
let fail=0; for(const [name,needle] of checks){const ok=s.includes(needle);console.log(ok?'✅':'❌',name);if(!ok)fail++;}
if(fail) process.exit(1);
console.log('V129 variant live projection contract OK');
