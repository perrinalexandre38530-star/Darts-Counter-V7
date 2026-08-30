import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => { if (!ok) throw new Error(message); };

const migrationPath = "supabase/migrations/20260830_esports_public_network_v3.sql";
must(fs.existsSync(migrationPath), "Migration Supabase E-SPORTS V0.3 manquante.");
const migration = read(migrationPath);
for (const table of ["ms_esports_profiles", "ms_esports_lfg_posts", "ms_esports_teams"]) {
  must(migration.includes(`public.${table}`), `Table/RLS manquant: ${table}`);
}
for (const rpc of [
  "ms_esports_upsert_profile",
  "ms_esports_search_players",
  "ms_esports_publish_lfg",
  "ms_esports_list_lfg",
  "ms_esports_set_lfg_status",
  "ms_esports_create_team",
  "ms_esports_list_teams",
  "ms_esports_delete_team",
]) must(migration.includes(`function public.${rpc}`), `RPC manquant: ${rpc}`);
must(/enable row level security/i.test(migration), "RLS E-SPORTS manquante.");
must(/to authenticated/i.test(migration), "Accès E-SPORTS doit être réservé aux utilisateurs authentifiés.");

const publicNetwork = read("src/esports/publicNetwork.ts");
for (const fn of [
  "publishPublicEsportsProfile",
  "searchPublicEsportsPlayers",
  "publishPublicEsportsLfg",
  "listPublicEsportsLfg",
  "setPublicEsportsLfgStatus",
  "createPublicEsportsTeam",
  "listPublicEsportsTeams",
]) must(publicNetwork.includes(`function ${fn}`), `API TS manquante: ${fn}`);
must(publicNetwork.includes("esports_public_migration_required"), "Fallback migration-required manquant.");

const online = read("src/esports/online.ts");
must(online.includes("listPublicOnlineEsportsRooms"), "Découverte salons publics manquante.");
must(/visibility[^\n]+public/.test(online), "Filtre de visibilité publique des salons manquant.");

const community = read("src/esports/community.ts");
must(community.includes("loadIncomingEsportsRoomInvites"), "Lecture des invitations E-SPORTS reçues manquante.");
must(community.includes('kind || "") === "esports_room_invite"'), "Filtre metadata invitation E-SPORTS manquant.");

const hub = read("src/pages/esports/EsportsHub.tsx");
for (const feature of [
  "PublicRoomsAndInvitesPanel",
  "EsportsPublicPlayerDiscovery",
  "PUBLIC NETWORK V0.3",
  "GLOBAL LFG V0.3",
  "CLOUD V0.3",
  "publishPublicEsportsProfile",
  "listPublicEsportsLfg",
  "listPublicEsportsTeams",
]) must(hub.includes(feature), `UI/feature V0.3 manquante: ${feature}`);
must(/roomCode/.test(hub) && /REJOINDRE/.test(hub), "Action rejoindre depuis invitation manquante.");
must(/rankLabel/.test(hub) && /filterPlatform/.test(hub), "Filtres LFG niveau/plateforme manquants.");

const android = read("src/config/androidStoreV1.ts");
const whitelist = android.match(/ANDROID_STORE_V1_SPORT_IDS\s*=\s*\[([^\]]+)\]/)?.[1] || "";
must(!/esports/i.test(whitelist), "E-SPORTS ne doit toujours pas être visible dans la whitelist Android Store V1.");

console.log("✅ E-SPORTS PUBLIC NETWORK V0.3 CHECK OK");
console.log("   Public rooms + incoming JOIN invites");
console.log("   Global gamer discovery: game/platform/rank");
console.log("   Global LFG with 24h expiry + contact");
console.log("   Synced/public teams & clans");
console.log("   Gamer activity/presence payload");
console.log("   Android Store: still hidden by default");
