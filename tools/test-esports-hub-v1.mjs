import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => { if (!ok) throw new Error(message); };

const android = read("src/config/androidStoreV1.ts");
const whitelist = android.match(/ANDROID_STORE_V1_SPORT_IDS\s*=\s*\[([^\]]+)\]/)?.[1] || "";
must(!/esports/i.test(whitelist), "E-SPORTS ne doit pas être dans la whitelist Android Store V1.");
must(/isEsportsEnabledForCurrentRuntime/.test(android), "Le feature flag E-SPORTS Android manque.");

const sport = read("src/contexts/SportContext.tsx");
must(/\|\s*"esports"/.test(sport), "SportContext doit connaître esports.");
must(/s === "esports"/.test(sport), "normalizeSport doit reconnaître esports.");

const select = read("src/pages/GameSelect.tsx");
must(/id:\s*"esports"/.test(select) && /E-SPORTS HUB/.test(select), "GameSelect doit exposer E-SPORTS hors Android.");

const app = read("src/App.tsx");
for (const route of ["esports_rooms", "esports_matches", "esports_tournaments", "esports_profile", "esports_stats"]) {
  must(app.includes(`case "${route}"`), `Route manquante: ${route}`);
}
must(app.includes('activeSport === "esports" && isEsportsEnabledForCurrentRuntime()'), "Les routes E-SPORTS doivent être runtime-gated.");

const bottom = read("src/components/BottomNav.tsx");
must(bottom.includes('sportLc === "esports"'), "BottomNav E-SPORTS manquante.");
for (const route of ["esports_rooms", "esports_matches", "esports_tournaments", "esports_profile"]) must(bottom.includes(route), `BottomNav route manquante: ${route}`);

const catalog = read("src/esports/catalog.ts");
const gameCount = (catalog.match(/\bid:\s*"[^"]+"/g) || []).length;
must(gameCount >= 25, `Catalogue trop petit (${gameCount}); attendu >= 25 jeux.`);
for (const game of ["rocket-league", "valorant", "counter-strike-2", "league-of-legends", "fortnite", "ea-sports-fc", "tekken-8"]) must(catalog.includes(`id: "${game}"`), `Jeu phare manquant: ${game}`);

const store = read("src/esports/store.ts");
for (const fn of ["createLocalEsportsRoom", "recordEsportsMatch", "createEsportsTournament", "saveGamerIdentity"]) must(store.includes(`function ${fn}`), `Store API manquante: ${fn}`);

const online = read("src/esports/online.ts");
for (const api of ["onlineApi.createLobby", "onlineApi.joinLobby", "onlineApi.startMatch", "onlineApi.subscribeOnlineStream"]) must(online.includes(api), `Bridge Online manquant: ${api}`);

const hub = read("src/pages/esports/EsportsHub.tsx");
for (const section of ["Overview", "GamesSection", "RoomsSection", "MatchesSection", "TournamentsSection", "ProfileSection", "StatsSection"]) must(hub.includes(section), `Section UI manquante: ${section}`);

console.log("✅ E-SPORTS HUB V0.1 CHECK OK");
console.log(`   Catalogue: ${gameCount} jeux génériques`);
console.log("   Android Store: caché par défaut");
console.log("   Web/PWA: hub + salons + matchs + tournois + profil + stats");
console.log("   Online: bridge create/join/realtime/start sur moteur existant");
