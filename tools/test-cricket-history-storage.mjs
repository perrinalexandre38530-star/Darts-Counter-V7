#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const history = read("src/lib/history.ts");
const historyPage = read("src/pages/HistoryPage.tsx");
const statsCricket = read("src/pages/StatsCricket.tsx");
const backups = read("src/lib/matchAutoBackup.ts");
const app = read("src/App.tsx");

assert.match(history, /withStores\(\[STORE_HEADERS, STORE_DETAILS\], "readonly"/,
  "History.upsert doit relire header + detail avant un upsert partiel");
assert.match(history, /light_metadata_merged_payload_preserved/,
  "Un MATCH_SAVED cloud léger doit conserver le payload local");
assert.match(history, /withStoreName\(STORE_DETAILS, "readonly"/,
  "payloadCompressed doit être relu depuis STORE_DETAILS");
assert.match(history, /protectFinishedHistoryPayload/,
  "Toutes les parties terminées doivent passer par le garde-fou non destructif");

assert.match(historyPage, /go\("cricket_match_detail"/,
  "Historique > Voir stats Cricket doit ouvrir le détail du match");
assert.match(app, /case "cricket_match_detail"/,
  "La route cricket_match_detail doit être déclarée dans App");

assert.match(statsCricket, /History as any\)\.listFinished/,
  "La page Cricket doit lire les parties terminées de l'Historique");
assert.match(statsCricket, /History as any\)\.get/,
  "La page Cricket doit hydrater le détail du match depuis History.get");

assert.match(backups, /MAX_LOCAL_REVISIONS_PER_MATCH = 5/,
  "Chaque match doit conserver cinq révisions locales maximum");
assert.match(backups, /backups\/matches_v2/,
  "Les sauvegardes R2 par match doivent utiliser des objets versionnés immuables");
assert.match(backups, /payloadFingerprint/,
  "Les révisions doivent être dédupliquées par empreinte de payload");

console.log("✅ Cricket history + non-destructive storage contract OK");
