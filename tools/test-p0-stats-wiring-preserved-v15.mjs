import fs from "node:fs";
import process from "node:process";

const checks = [
  ["src/pages/Home.tsx", ["getBasicProfileStatsAsync", "getCricketProfileStats", "History"]],
  ["src/pages/StatsHub.tsx", ["StatsPlayerDashboard", "getX01MultiLegsSetsForProfile", "getCricketProfileStats", "History"]],
  ["src/pages/Profiles.tsx", ["getBasicProfileStatsAsync", "buildDashboardFromNormalized", "History"]],
  ["src/lib/statsBridge.ts", ["buildStatsIndex", "getBasicProfileStatsAsync", "getX01ProfileStats", "History.get"]],
];

let failed = false;
for (const [file, tokens] of checks) {
  const text = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (!text.includes(token)) {
      console.error(`❌ ${file}: câblage Stats manquant: ${token}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("✅ V15 SAFE: affichages et câblages Stats présents.");
