import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const historyPath = process.argv[2] || '/mnt/data/MULTISPORTS_SCORING_HISTORIQUE_COMPLET_2026-07-31_14-47-32.json';
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const lc = (v) => String(v ?? '').toLowerCase();
const recordTag = (r) => [
  r?.kind, r?.mode, r?.game?.mode, r?.game?.id,
  r?.summary?.kind, r?.summary?.mode,
  r?.payload?.kind, r?.payload?.mode, r?.payload?.stats?.mode,
].filter(Boolean).map(lc).join('|');

const dump = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
const rows = Object.values(dump?.history?.rows || {});
assert(rows.length === Number(dump?.matchCount || rows.length), 'Le nombre de parties exportées est incohérent.');

const onlineX01 = rows.filter((r) => recordTag(r).includes('x01') && Boolean(
  r?.online || r?.lobbyCode || r?.summary?.online || r?.summary?.lobbyCode || r?.payload?.online || r?.payload?.lobbyCode
));
assert(onlineX01.length >= 1, 'Aucune partie X01 ONLINE détectée dans le fichier fourni.');
assert(onlineX01.some((r) => r?.summary?.online === true), 'Le cas summary.online=true attendu n’est pas présent.');

const loterie = rows.filter((r) => recordTag(r).includes('loterie'));
assert(loterie.length === 3, `LOTERIE: 3 parties attendues, ${loterie.length} trouvées.`);
const richLoterieRows = loterie.flatMap((r) => Array.isArray(r?.summary?.perPlayer) ? r.summary.perPlayer : []);
assert(richLoterieRows.some((p) => Number(p?.visits || 0) > 0 && Number(p?.dartsThrown || 0) > 0), 'LOTERIE: summary.perPlayer ne contient pas les stats détaillées attendues.');

const fiveLives = rows.filter((r) => {
  const t = recordTag(r);
  return t.includes('five_lives') || t.includes('five lives') || t.includes('5 vies');
});
assert(fiveLives.length === 3, `LES 5 VIES: 3 parties attendues, ${fiveLives.length} trouvées.`);
const knownFiveLivesWinners = fiveLives.map((r) => String(r?.winnerId || '')).filter(Boolean);
assert(knownFiveLivesWinners.length === 2, `LES 5 VIES: 2 résultats explicites attendus, ${knownFiveLivesWinners.length} trouvés.`);
const detailedFiveLives = fiveLives.filter((r) => {
  const compact = r?.compact;
  return Array.isArray(compact?.d?.fe) && compact.d.fe.length > 0;
});
assert(detailedFiveLives.length === 0, 'Le fichier de référence ne devrait pas contenir de télémétrie Five Lives détaillée pour ces anciennes parties.');

const territories = rows.filter((r) => {
  const t = recordTag(r);
  return t.includes('territor') || t.includes('departement') || t.includes('department');
});
assert(territories.length === 0, `TERRITORIES: l’export de référence contient ${territories.length} partie(s), attendu 0.`);

const hub = read('src/pages/StatsHub.tsx');
assert(hub.includes('import StatsDartSetsSection from "../components/StatsDartSetsSection";'), 'MES FLÉCHETTES doit être importé en eager.');
assert(!hub.includes('const StatsDartSetsSection = lazyWithRetry'), 'MES FLÉCHETTES est encore lazy-loadé.');
assert(hub.includes('StatsTerritoriesTab embedded playerId={selectedPlayer?.id}'), 'TERRITORIES ne reçoit pas le profil sélectionné.');

const darts = read('src/components/StatsDartSetsSection.tsx');
assert(darts.includes('sessionStorage.setItem(quickKey, quick)'), 'Le cache rapide MES FLÉCHETTES n’est pas miroiré en sessionStorage.');
assert(darts.includes('const quick = readDartSetStatsQuickCache(pid);'), 'Le cache rapide MES FLÉCHETTES n’est pas prioritaire au rendu.');

const compare = read('src/pages/StatsX01Compare.tsx');
assert(compare.includes('summary?.online') && compare.includes('summary?.lobbyCode'), 'X01 Compare ne reconnaît pas les marqueurs ONLINE du summary.');
assert(compare.includes('directOnlineSamplesFromFullHistory'), 'Le fallback ONLINE direct depuis History manque.');
assert(compare.includes('return (await api.get(id)) || row'), 'X01 Compare jette encore les headers synchronisés non hydratés.');

const lotterySource = read('src/components/stats/LoterieStatsTabFull.tsx');
assert(lotterySource.indexOf('r?.summary?.perPlayer') < lotterySource.indexOf('r?.summary?.players'), 'LOTERIE: perPlayer doit être prioritaire à summary.players.');
assert(lotterySource.includes('loterieRowRichness'), 'LOTERIE: fusion des lignes statistiques absente.');

const fiveSource = read('src/stats/FiveLivesStatsTabFull.tsx');
assert(fiveSource.includes('resultKnown'), 'Five Lives: résultat inconnu non géré.');
assert(fiveSource.includes('rank === 1 && rankings.length > 0'), 'Five Lives: la première identité peut encore être prise pour une victoire.');

const territorySource = read('src/lib/territories/territoriesStats.ts');
assert(territorySource.includes('loadTerritoriesHistoryUnified'), 'TERRITORIES: source unifiée History + cache absente.');
assert(territorySource.includes('tag.includes("departement")'), 'TERRITORIES: alias departements absent.');

console.log('OK — Stats Center V33 regression');
console.log(`History: ${rows.length} matchs | X01 online: ${onlineX01.length} | Loterie: ${loterie.length} | Five Lives: ${fiveLives.length} | Territories: ${territories.length}`);
console.log('Mes fléchettes: eager + quick session cache OK');
console.log('X01 Compare: summary.online/lobby + History fallback OK');
console.log('Loterie: perPlayer riche prioritaire OK');
console.log('Five Lives: faux 100% neutralisé pour résultats inconnus OK');
console.log('Territories: lecture unifiée History/IndexedDB + local cache OK');
