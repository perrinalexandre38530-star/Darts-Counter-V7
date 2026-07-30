import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hub = read('src/pages/StatsHub.tsx');
const dartSets = read('src/components/StatsDartSetsSection.tsx');
const dartAgg = read('src/lib/statsByDartSet.ts');
const x01 = read('src/stats/X01MultiStatsTabFull.tsx');
const x01Source = read('src/lib/x01StatsSource.ts');
const app = read('src/App.tsx');
const sw = read('public/sw.js');

assert(hub.includes('dc_stats_render_profile_v4:'), 'Dashboard cache v4 absent');
assert(hub.includes('source: "history-canonical"'), 'Dashboard cache non marqué canonique');
assert(!hub.includes('sessions: Number((quick as any).matches'), 'Le quick index remplace encore le Dashboard');
assert(hub.includes('buildDashboardFromNormalized(pid, pname, nmEffective)'), 'Calcul canonique Dashboard absent');
assert(hub.includes('!["dartsets", "history", "leaderboards", "x01_multi"].includes(currentMode)'), 'Dashboard encore exclu du chargement History');
assert(hub.includes('const cap = 600;'), 'Hydratation X01 Dashboard réduite');

assert(dartSets.includes('dc_stats_dartsets_quick_v2:'), 'Mini-cache Mes fléchettes absent');
assert(dartSets.includes('DART_SET_STATS_QUICK_MAX_CHARS = 96_000'), 'Garde-fou mini-cache absent');
assert(dartSets.includes('.slice(0, 120);'), 'Mes fléchettes ne conserve pas la limite canonique antérieure');
assert(dartAgg.includes('.slice(0, 120);'), 'Agrégateur dartsets tronqué différemment sur mobile');
assert(!dartAgg.includes('? 72 :'), 'Agrégateur dartsets contient encore le plafond mobile 72');

assert(x01.includes('dc_x01_multi_sessions_v1:'), 'Cache X01 Multi absent');
assert(x01.includes('Promise.all(batch.map'), 'Hydratation X01 Multi non parallélisée');
assert(x01.includes('historyFingerprint(list)'), 'Invalidation X01 Multi par Historique absente');
assert(!x01.includes('console.log("X01Multi sample session"'), 'Log massif X01 Multi encore présent');
assert(x01Source.includes('buildX01SamplesForProfileFromRecords'), 'Réutilisation des matchs hydratés absente');
assert(app.includes('prewarmX01MultiSessions'), 'Préparation X01 Multi en arrière-plan absente');
assert(sw.includes('stats-canonical-fast-v16'), 'Version service worker non renouvelée');

console.log('OK — Stats canoniques + caches non destructifs V16');
