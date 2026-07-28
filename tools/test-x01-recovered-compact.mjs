#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/lib/x01StatsSource.ts", import.meta.url), "utf8");
const tab = fs.readFileSync(new URL("../src/stats/X01MultiStatsTabFull.tsx", import.meta.url), "utf8");
const rebuild = fs.readFileSync(new URL("../src/lib/stats/rebuildStatsFromHistory.ts", import.meta.url), "utf8");

const checks = [
  ["X01 source merges restored ranking pools", source.includes('"finalRanking"') && source.includes('"multiRanking"') && source.includes('"standings"')],
  ["X01 source reads avg3d from compact recovery summaries", source.includes('metricMapValueForPlayer') && source.includes('merged.avg3d')],
  ["X01 source recovers scored points from ranking rows", source.includes('num(merged.scored') && source.includes('num(merged.score)')],
  ["X01 aggregate keeps avg3 when dart count is absent", source.includes('avgWeightDarts') && source.includes('(sp * 3) / sa')],
  ["X01 Multi tab merges ranking row and avg3d", tab.includes('const rankingRow = collectX01RankingRows(match)') && tab.includes('row.avg3d')],
  ["Central stats rebuild understands recovered compact X01", rebuild.includes('payload?.summary?.finalRanking') && rebuild.includes('payload?.summary?.avg3d')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n✅ X01 recovered compact regression: ${checks.length}/${checks.length}`);
