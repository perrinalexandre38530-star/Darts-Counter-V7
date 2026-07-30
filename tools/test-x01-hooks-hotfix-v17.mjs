import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const x01 = read('src/stats/X01MultiStatsTabFull.tsx');
const history = read('src/lib/history.ts');
const sw = read('public/sw.js');

const componentStart = x01.indexOf('export default function X01MultiStatsTabFull');
const firstAggregation = x01.indexOf('// --- AGRÉGATION RÉELLE DES MATCHS PAR TYPE ---', componentStart);
assert(componentStart >= 0 && firstAggregation > componentStart, 'Bornes composant X01 introuvables');

const hookCalls = [...x01.matchAll(/React\.use(?:State|Effect|Memo|Callback|Ref|Reducer|LayoutEffect)\s*\(/g)]
  .map((match) => match.index ?? -1)
  .filter((index) => index >= componentStart);
assert(hookCalls.length > 0, 'Aucun hook X01 détecté');
assert(hookCalls.every((index) => index < firstAggregation), 'Un hook React reste après le début des agrégations X01');
assert(x01.includes('buildX01DartsForStats(statsSessions)'), 'Reconstruction des darts X01 absente');
assert(!x01.slice(componentStart).includes('React.useMemo('), 'Un React.useMemo subsiste dans le composant X01');
assert(x01.includes('const x01DartsAll: UIDart[] = memoX01DartsForStats('), 'Mémoïsation pure X01 absente');
assert(x01.includes('const multiRanks = memoMultiRanks('), 'Mémoïsation pure des rangs X01 absente');
assert(!x01.includes('const [ticker, setTicker] = React.useState(0);\n  React.useEffect(() => {\n    if (!hasAnyKpi)'), 'Ancien hook ticker tardif encore présent');
assert(!x01.includes('[range, selectedSessions.length]'), 'Ancien hook pagination tardif encore présent');

assert(history.includes('const HISTORY_UI_CACHE_MAX_CHARS = 360_000;'), 'Cache Historique mobile encore trop volumineux');
assert(history.includes('if (/^data:image\\//i.test(value)) return undefined;'), 'Data URLs encore dupliquées dans le cache Historique');
assert(history.includes('__cachePersistenceDisabled = true;'), 'Protection anti-boucle QuotaExceeded absente');
assert(sw.includes('x01-hooks-hardfix-v18') || sw.includes('stats-hook-order-audit-v20'), 'Service worker hardfix V18/V20 absent');

console.log('OK — X01 hooks fixes sans useMemo React + cache Historique anti-quota V18');
