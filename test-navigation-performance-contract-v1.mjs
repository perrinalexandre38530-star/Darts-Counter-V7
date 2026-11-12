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

// Le garde-fou FR n'applique que les libellés BULL, tandis que la traduction
// générique reste dans la branche non-FR et les mutations sont groupées par frame.
const narrowFrenchBullObserver = /if \(lang === "fr"\) \{[\s\S]*?scanBullOnly\(body\)[\s\S]*?bullObserver\.observe\(body,[\s\S]*?return \(\) => \{[\s\S]*?\};\s*\}\s*scan\(body\);/.test(lang);
if (!narrowFrenchBullObserver || !lang.includes('if (/bull/i.test(current))')) {
  fail('French DOM literals must remain limited to BULL with a separate early-return observer');
} else if (!lang.includes('window.requestAnimationFrame(flushMutations)') || !lang.includes('window.requestAnimationFrame(flushBull)')) {
  fail('DOM literal MutationObservers must remain frame-batched');
} else {
  ok('FR BULL-only observer and non-FR translation observer remain frame-batched');
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
