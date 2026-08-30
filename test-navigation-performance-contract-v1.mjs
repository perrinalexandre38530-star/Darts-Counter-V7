import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`[navigation-performance] FAIL: ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`[navigation-performance] OK: ${message}`);

const app = read('src/App.tsx');
const lang = read('src/contexts/LangContext.tsx');
const awena = read('src/awena/AwenaProvider.tsx');

const staticPageImports = [...app.matchAll(/^import\s+[A-Za-z_$][\w$]*\s+from\s+["']\.\/pages\//gm)].length;
const lazyPageImports = [...app.matchAll(/React\.lazy\(\(\)\s*=>\s*import\(["']\.\/pages\//g)].length;

if (staticPageImports > 10) fail(`too many static page imports in App.tsx (${staticPageImports} > 10)`);
else ok(`static App page imports bounded (${staticPageImports})`);

if (lazyPageImports < 150) fail(`route code splitting regressed (${lazyPageImports} lazy pages < 150)`);
else ok(`route code splitting active (${lazyPageImports} lazy pages)`);

if (!lang.includes('lang === "fr" && !literalSafetyHasRunRef.current')) {
  fail('French DOM translation safety-net no longer skips the initial global scan');
} else if (!lang.includes('window.requestAnimationFrame(flushMutations)')) {
  fail('DOM literal MutationObserver is no longer frame-batched');
} else {
  ok('global UI literal observer is disabled for normal FR navigation and batched otherwise');
}

for (const heavyImport of [
  'import { buildAwenaReply } from "./AwenaCore"',
  'import { findAwenaMode } from "./AwenaKnowledge"',
  'import { buildAwenaRecordsReply, warmAwenaRecordsCache } from "./AwenaRecords"',
]) {
  if (awena.includes(heavyImport)) fail(`Awena heavy engine became static again: ${heavyImport}`);
}
if (!process.exitCode) ok('Awena heavy knowledge/records engine remains demand-loaded');

if (!app.includes('document.documentElement.dataset.mscNavigating = "1"')) {
  fail('route transition GPU pause marker missing');
} else {
  ok('route transition performance marker present');
}

if (!process.exitCode) {
  console.log('[navigation-performance] PASS');
}
