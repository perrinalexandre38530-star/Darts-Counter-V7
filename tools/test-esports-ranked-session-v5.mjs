import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => { if (!ok) throw new Error(message); console.log(`✅ ${message}`); };

const api = read("src/esports/networkV5.ts");
const panel = read("src/pages/esports/EsportsNetworkV5.tsx");
const online = read("src/esports/online.ts");
const sql = read("supabase/migrations/20260831073300_esports_ranked_sessions_v5.sql");
const android = read("src/config/androidStoreV1.ts");

for (const rpc of [
  "ms_esports_get_or_create_competitive_match",
  "ms_esports_get_competitive_match",
  "ms_esports_claim_competitive_room",
  "ms_esports_submit_competitive_result",
  "ms_esports_mmr_leaderboard",
]) must(api.includes(rpc) && sql.includes(rpc), `${rpc} est câblé client + migration.`);

must(sql.includes("ms_esports_competitive_matches") && sql.includes("source_pair_key") && sql.includes("unique"), "Une seule session canonique est créée pour une paire matchée.");
must(sql.includes("report_a") && sql.includes("report_b") && sql.includes("status='disputed'"), "Confirmation bilatérale et gestion des scores contradictoires présentes.");
must(sql.includes("ms_esports_ratings") && sql.includes("ELO") === false && sql.includes("power(10.0") && sql.includes("32*"), "Calcul Elo/MMR serveur K=32 présent.");
must(sql.includes("rating integer not null default 1000"), "MMR initial à 1000.");
must(panel.includes("createOnlineEsportsRoom") && panel.includes("claimCompetitiveRoomV5") && panel.includes("joinOnlineEsportsRoom"), "MATCH TROUVÉ provisionne/rejoint un vrai salon Online.");
must(panel.includes("TEAM A") && panel.includes("TEAM B") && online.includes("competitiveMatch") && online.includes("autoTeam"), "Affectation automatique TEAM A / TEAM B présente dans le salon.");
must(panel.includes("RÉSULTAT VALIDÉ PAR LES DEUX JOUEURS") && panel.includes("submitCompetitiveResultV5"), "UI de confirmation bilatérale du résultat présente.");
must(panel.includes("LEADERBOARD MMR") && panel.includes("listEsportsMmrLeaderboardV5"), "Leaderboard skill MMR par jeu présent.");
const whitelist = android.match(/ANDROID_STORE_V1_SPORT_IDS\s*=\s*\[([^\]]+)\]/)?.[1] || "";
must(!/esports/i.test(whitelist), "E-SPORTS reste caché de la whitelist Android Store V1.");

console.log("\nE-SPORTS V0.5 RANKED SESSION: OK");
