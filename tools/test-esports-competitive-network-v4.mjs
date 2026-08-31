import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const must = (ok, message) => { if (!ok) { console.error(`❌ ${message}`); process.exitCode = 1; } else console.log(`✅ ${message}`); };

const api = read("src/esports/networkV4.ts");
const hub = read("src/pages/esports/EsportsHub.tsx");
const panel = read("src/pages/esports/EsportsNetworkV4.tsx");
const sql = read("supabase/migrations/20260830231400_esports_competitive_network_v4.sql");
const android = read("src/config/androidStoreV1.ts");

for (const fn of [
  "ms_esports_apply_lfg",
  "ms_esports_review_lfg_application",
  "ms_esports_request_team_join",
  "ms_esports_invite_team_member",
  "ms_esports_set_team_member_role",
  "ms_esports_join_matchmaking",
  "ms_esports_get_matchmaking",
  "ms_esports_list_notifications",
  "ms_esports_leaderboard",
]) must(api.includes(fn) && sql.includes(fn), `${fn} est câblé client + migration.`);

must(sql.includes("ms_esports_lfg_applications") && sql.includes("ms_esports_team_members"), "Candidatures LFG et adhésions de clan persistantes.");
must(sql.includes("ms_esports_notifications") && sql.includes("supabase_realtime"), "Notifications E-SPORTS temps réel prévues.");
must(sql.includes("ms_esports_matchmaking_queue") && sql.includes("for update skip locked"), "Matchmaking atomique avec verrouillage concurrent.");
must(sql.includes("ms_esports_seasons") && sql.includes("ms_esports_season_scores") && sql.includes("community_xp"), "Saisons + Community XP serveur présents.");
must(panel.includes("MATCHMAKING") && panel.includes("MATCH TROUVÉ") && panel.includes("Saison & leaderboard"), "UI matchmaking + résultat + leaderboard présente.");
must(panel.includes("Adhésions & rôles V0.4") && panel.includes("CAPTAIN") && panel.includes("OFFICER"), "UI de rôles et adhésions clan présente.");
must(panel.includes("Candidatures LFG V0.4") && hub.includes("Postuler"), "LFG utilise des candidatures accepter/refuser.");
must(hub.includes('tab === "network"') && hub.includes("EsportsCompetitiveNetworkV4"), "Onglet Réseau compétitif accessible dans le profil E-SPORTS.");
must(/id\s*===\s*["']esports["']/.test(android) || android.includes("isEsportsEnabledForCurrentRuntime"), "Protection Android E-SPORTS toujours présente.");

if (!process.exitCode) console.log("\nE-SPORTS V0.4 COMPETITIVE NETWORK: OK");
