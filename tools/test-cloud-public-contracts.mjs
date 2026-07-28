#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const checks = [];

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error(`❌ Fichier requis absent: ${rel}`);
  return fs.readFileSync(file, "utf8");
}
function expect(label, condition) {
  if (!condition) throw new Error(`❌ ${label}`);
  checks.push(`✅ ${label}`);
}

const serverConfig = read("src/lib/serverConfig.ts");
const onlineApi = read("src/lib/onlineApi.ts");
const nearbyApi = read("src/lib/nearbyPlayersApi.ts");
const socialApi = read("src/lib/publicSocialApi.ts");
const apiClient = read("src/lib/apiClient.ts");
const friendsApi = read("src/lib/friendsApi.ts");
const linkedProfileSync = read("src/lib/linkedProfileSync.ts");
const messageCenterNotify = read("src/lib/messageCenterNotify.ts");
const cloudHistoryImport = read("src/lib/sync/CloudHistoryImport.ts");
const settings = read("src/pages/Settings.tsx");
const friends = read("src/pages/FriendsPage.tsx");
const migration = read("supabase/migrations/20260727_public_online_nearby.sql");

expect(
  "Le provider NAS n'est actif que si VITE_ONLINE_PROVIDER=nas",
  /export function isNasProviderEnabled\(\)[\s\S]{0,180}return ONLINE_PROVIDER === ["']nas["']/.test(serverConfig),
);
expect(
  "Supabase reste actif en modes supabase et hybrid",
  /ONLINE_PROVIDER === ["']supabase["'][\s\S]{0,120}ONLINE_PROVIDER === ["']hybrid["']/.test(serverConfig),
);
expect(
  "L'ONLINE grand public n'est pas routé par VITE_NAS_DATA_SYNC",
  /function useNasOnlineBackend\(\)[\s\S]{0,500}return isNasProviderEnabled\(\)/.test(onlineApi),
);
expect(
  "La synchronisation NAS privée dépend de la destination founder_nas",
  /selectedDestination === ["']founder_nas["']/.test(onlineApi),
);
expect(
  "La bascule d'infrastructure de compte public/NAS existe",
  /switchAccountInfrastructure\(target: ["']public["'] \| ["']nas["']\)/.test(onlineApi),
);
expect(
  "Settings déclenche la bascule vers le NAS privé",
  /switchAccountInfrastructure\(["']nas["']\)/.test(settings),
);
expect(
  "Settings déclenche le retour vers l'infrastructure publique",
  /switchAccountInfrastructure\(["']public["']\)/.test(settings),
);
expect("Destination Cloudflare R2 présente", settings.includes('"cloud_r2"'));
expect("Destination NAS fondateur présente", settings.includes('"founder_nas"'));

expect(
  "L'API proximité utilise Supabase directement",
  /supabase\.rpc\(["']ms_find_nearby_players["']/.test(nearbyApi),
);
expect(
  "L'API sociale publique utilise Supabase directement",
  /supabase\.rpc\(["']ms_(search_players|list_friends|send_friend_request)["']/.test(socialApi),
);
expect(
  "Aucune URL NAS n'est codée dans l'API proximité",
  !/multisports-api\.fr|VITE_NAS_API_URL|\/online\//i.test(nearbyApi),
);
expect(
  "Aucune URL NAS n'est codée dans la couche sociale publique",
  !/multisports-api\.fr|VITE_NAS_API_URL/i.test(socialApi),
);
expect(
  "apiClient bloque les routes /online legacy NAS en public/hybride",
  /normalizedPath\.startsWith\(["']\/online\/["']\)[\s\S]{0,180}!canUseNasOnlineApi\(\)/.test(apiClient),
);
expect(
  "Les associations de profils n'appellent plus le NAS en public/hybride",
  /loadLinkedProfileProjection[\s\S]{0,500}!canUseNasOnlineApi\(\)[\s\S]{0,180}snapshots:\s*\[\]/.test(linkedProfileSync),
);
expect(
  "Les listes legacy sociales renvoient un fallback local en public/hybride",
  /listProfileFriendLinks[\s\S]{0,180}publicBackendActive\(\)[\s\S]{0,80}return \[\]/.test(friendsApi)
  && /listSharedMatches[\s\S]{0,180}publicBackendActive\(\)[\s\S]{0,80}return \[\]/.test(friendsApi)
  && /listMessengerGroups[\s\S]{0,180}publicBackendActive\(\)[\s\S]{0,80}return \[\]/.test(friendsApi),
);
expect(
  "Le centre de messages utilise Supabase en public/hybride",
  /canUseMessageCenterPolling[\s\S]{0,260}canUseNasOnlineApi\(\)/.test(messageCenterNotify)
  && /if \(canUseNasOnlineApi\(\)\)[\s\S]{0,220}online\/messages\/summary/.test(messageCenterNotify),
);
expect(
  "Le JWT Supabase n'est jamais recyclé comme JWT NAS",
  apiClient.includes('provider === "supabase"')
  && apiClient.includes('provider === "supabase_failover"')
  && apiClient.includes('volatileAccessToken = isNasProviderEnabled() ? token : ""'),
);
expect(
  "Une route ONLINE NAS exige un provider NAS et un vrai token NAS",
  /export function canUseNasOnlineApi\(\)[\s\S]{0,120}isNasProviderEnabled\(\)[\s\S]{0,120}readNasAccessToken\(\)/.test(apiClient),
);
expect(
  "Une session Supabase n'est pas considérée comme session NAS",
  /function isValidNasSession[\s\S]{0,260}provider !== ["']supabase["']/.test(onlineApi),
);

expect(
  "L'import historique utilise public.events avant le fallback stats_events",
  /from\(["']events["']\)[\s\S]{0,500}like\(["']type["'],\s*["']%:MATCH_SAVED["']\)/.test(cloudHistoryImport)
  && cloudHistoryImport.indexOf('.from("events")') < cloudHistoryImport.indexOf('.from("stats_events")'),
);
expect(
  "L'absence de stats_events legacy ne spamme plus la console",
  /if \(missingRelation\(legacyResult\.error\)\) return \{ rows: \[\] \}/.test(cloudHistoryImport),
);

expect("Le panneau Joueurs à proximité est monté dans FriendsPage", /<NearbyPlayersPanel\b/.test(friends));

expect("La migration active PostGIS", /create\s+extension\s+if\s+not\s+exists\s+postgis/i.test(migration));
expect("RLS activée sur les réglages de proximité", /alter table public\.ms_nearby_settings enable row level security/i.test(migration));
expect("RLS propriétaire sur les réglages de proximité", /ms_nearby_owner_select[\s\S]{0,220}user_id\s*=\s*auth\.uid\(\)/i.test(migration));
expect("RPC proximité réservées aux utilisateurs authentifiés", /grant execute on function public\.ms_find_nearby_players[\s\S]{0,150}to authenticated/i.test(migration));
expect("Recherche de proximité n'expose pas latitude/longitude", !/jsonb_build_object\([\s\S]{0,1200}["']latitude["']|jsonb_build_object\([\s\S]{0,1200}["']longitude["']/i.test(migration));
expect("La position vieille de plus de 7 jours est exclue", /location_updated_at\s*>\s*now\(\)-interval ["']7 days["']/i.test(migration));
expect("La proposition de partie expire automatiquement", /expires_at[\s\S]{0,220}interval ["']24 hours["']/i.test(migration));

console.log(checks.join("\n"));
console.log("\n✅ CLOUD PUBLIC / NAS PRIVATE CONTRACTS OK\n");
