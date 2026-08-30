import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => { if (!ok) throw new Error(message); };

const android = read("src/config/androidStoreV1.ts");
const whitelist = android.match(/ANDROID_STORE_V1_SPORT_IDS\s*=\s*\[([^\]]+)\]/)?.[1] || "";
must(!/esports/i.test(whitelist), "E-SPORTS doit rester absent de la whitelist Android Store V1.");
must(/VITE_ENABLE_ESPORTS_ANDROID_PREVIEW/.test(android), "Le flag preview Android E-SPORTS doit être conservé.");

const select = read("src/pages/GameSelect.tsx");
must(/logo-esports\.webp/.test(select), "GameSelect doit utiliser le logo E-SPORTS webp validé.");
must(fs.existsSync("src/assets/games/logo-esports.webp"), "Asset logo-esports.webp manquant.");

const types = read("src/esports/types.ts");
for (const token of ["version: 2", "EsportsTeam", "EsportsLfgPost", "EsportsRoomInvite", "tournamentMatchId"]) {
  must(types.includes(token), `Types E-SPORTS V0.2 incomplets: ${token}`);
}

const store = read("src/esports/store.ts");
for (const fn of ["createEsportsTeam", "createEsportsLfgPost", "recordEsportsRoomInvite", "recordEsportsTournamentMatchResult"]) {
  must(store.includes(`function ${fn}`), `Store V0.2 API manquante: ${fn}`);
}
must(store.includes('const LS_KEY = "ms-esports-hub-v1"'), "La migration V0.1 -> V0.2 doit conserver la clé locale existante.");

const community = read("src/esports/community.ts");
for (const token of ["listFriends", "searchUsers", "sendFriendRequest", "sendPrivateMessage", "fetchMessages", "postMessage", "subscribeMessages"]) {
  must(community.includes(token), `Bridge social existant non réutilisé: ${token}`);
}

const hub = read("src/pages/esports/EsportsHub.tsx");
for (const component of ["RoomSocialPanel", "TournamentMatchCard", "EsportsFriendsPanel", "EsportsTeamsPanel", "EsportsLfgPanel"]) {
  must(hub.includes(`function ${component}`), `Composant V0.2 manquant: ${component}`);
}
must(hub.includes("recordEsportsTournamentMatchResult"), "Le bracket doit permettre de saisir/propager les résultats.");
must(hub.includes("sendEsportsRoomInvite"), "Les salons Online doivent pouvoir inviter les amis.");
must(hub.includes("postEsportsRoomMessage"), "Le chat E-SPORTS doit utiliser le chat salon existant.");

const bottom = read("src/components/BottomNav.tsx");
must(/esports_profile[\s\S]{0,160}Communauté/.test(bottom), "Le tab E-SPORTS Profil doit devenir Communauté.");

console.log("✅ E-SPORTS COMMUNITY V0.2 CHECK OK");
console.log("   Social: amis + recherche + invitations privées + présence");
console.log("   Salons: chat Online + invitation ami + copie code");
console.log("   Communauté: équipes/clans + LFG local-first");
console.log("   Android public: toujours caché");
