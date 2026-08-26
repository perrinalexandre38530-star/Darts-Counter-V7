import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const start = src.indexOf('function AuthCallbackRoute');
const end = src.indexOf('const isError = phase === "error";', start);
if (start < 0 || end < 0) throw new Error('AuthCallbackRoute introuvable');
const block = src.slice(start, end);

const checks = [
  ['navigation ref exists', /const goRef = React\.useRef\(go\)/.test(block)],
  ['navigation ref follows latest go', /goRef\.current = go/.test(block)],
  ['OAuth effect no longer depends on go identity', block.trim().endsWith('}, []);')],
  ['success exits to GameSelect through stable ref', /goRef\.current\("gameSelect"\)/.test(block)],
  ['online fallback also uses stable ref', /goRef\.current\("online"\)/.test(block)],
  ['success still reaches 100 percent', /setPhase\("success"\)[\s\S]*setProgress\(100\)/.test(block)],
  ['success URL still marked handled', /markOAuthCallbackHandled\("success"\)/.test(block)],
];

let ok = 0;
for (const [label, pass] of checks) {
  if (pass) { console.log(`✅ ${label}`); ok++; }
  else console.error(`❌ ${label}`);
}
if (ok !== checks.length) process.exit(1);
console.log(`\n${ok}/${checks.length} contrôles sortie callback V79 OK.`);
