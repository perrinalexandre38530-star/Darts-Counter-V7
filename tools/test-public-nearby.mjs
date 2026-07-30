import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function expect(label, condition) {
  if (!condition) throw new Error(`❌ ${label}`);
  checks.push(`✅ ${label}`);
}
function has(text, needle) {
  return text.includes(needle);
}

const migration = read('supabase/migrations/20260727_public_online_nearby.sql');
const nearbyApi = read('src/lib/nearbyPlayersApi.ts');
const nearbyPanel = read('src/components/NearbyPlayersPanel.tsx');
const friendsPage = read('src/pages/FriendsPage.tsx');
const onlineApi = read('src/lib/onlineApi.ts');
const socialApi = read('src/lib/publicSocialApi.ts');
const settings = read('src/pages/Settings.tsx');

expect('Migration proximité versionnée dans le projet', migration.length > 5000);
expect('PostGIS est activé par la migration', /create\s+extension\s+if\s+not\s+exists\s+postgis/i.test(migration));
expect('Table réglages proximité présente', has(migration, 'ms_nearby_settings'));
expect('Table propositions proximité présente', has(migration, 'ms_nearby_game_requests'));
expect('RPC recherche proximité présente', has(migration, 'ms_find_nearby_players'));
expect('RPC réglages proximité présente', has(migration, 'ms_get_nearby_settings'));
expect('RPC proposition de partie présente', has(migration, 'ms_send_nearby_game_request'));
expect('Permissions authenticated présentes', /grant\s+execute[\s\S]+to\s+authenticated/i.test(migration));

expect('Recherche SQL utilise ST_DWithin pour le rayon réel', /ST_DWithin\s*\(/i.test(migration));
expect('La recherche respecte aussi le rayon déclaré du joueur trouvé', /least\s*\(\s*greatest\([\s\S]{0,220}n\.radius_km/i.test(migration));
expect('Distance renvoyée volontairement par paliers', /real_km<2[\s\S]{0,250}real_km<5[\s\S]{0,250}real_km<10[\s\S]{0,250}real_km<25[\s\S]{0,250}real_km<50/i.test(migration));
expect('Rayons UI 2/5/10/25/50 km présents', /const\s+RADII\s*=\s*\[\s*2\s*,\s*5\s*,\s*10\s*,\s*25\s*,\s*50\s*\]/.test(nearbyPanel));
expect('Filtre de niveau 1 à 5 présent dans UI', /const\s+LEVELS\s*=\s*\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/.test(nearbyPanel) && /skillFilter/.test(nearbyPanel));
expect('Filtre de niveau est appliqué aux résultats', /found\.filter\([\s\S]{0,180}player\.skillLevel/.test(nearbyPanel));

expect('API frontend appelle ms_get_nearby_settings', has(nearbyApi, 'ms_get_nearby_settings'));
expect('API frontend appelle ms_find_nearby_players', has(nearbyApi, 'ms_find_nearby_players'));
expect('API frontend appelle ms_send_nearby_game_request', has(nearbyApi, 'ms_send_nearby_game_request'));
expect('Coordonnées GPS ne font pas partie du type NearbyPlayer', !/type NearbyPlayer[\s\S]{0,900}\blatitude\b/i.test(nearbyApi) && !/type NearbyPlayer[\s\S]{0,900}\blongitude\b/i.test(nearbyApi));
expect('UI proximité intégrée à FriendsPage', has(friendsPage, '<NearbyPlayersPanel'));
expect('UI affiche la confidentialité de position', /aucune coordonnée|position exacte n.est jamais affichée/i.test(nearbyPanel));
expect('Géolocalisation navigateur câblée', has(nearbyPanel, 'navigator.geolocation.getCurrentPosition'));
expect('Mode JE CHERCHE UNE PARTIE câblé', has(nearbyPanel, 'JE CHERCHE UNE PARTIE'));
expect('Proposition de partie câblée', has(nearbyPanel, 'Proposer une partie'));
expect('Première activation locale guidée', has(nearbyPanel, 'ACTIVER LA RECHERCHE LOCALE'));
expect('Recherche locale directement actionnable', has(nearbyPanel, 'CHERCHER AUTOUR DE MOI'));
expect('Propositions envoyées visibles et annulables', has(nearbyPanel, 'MES PROPOSITIONS EN ATTENTE') && has(nearbyPanel, 'cancelled'));
expect('Onglet proximité possède une icône dédiée', has(friendsPage, 'id === "nearby"'));
expect('Hub Online expose un raccourci proximité', has(friendsPage, 'Trouver des joueurs proches'));

expect('ONLINE public n’utilise le NAS que lorsque le provider est explicitement NAS', /function useNasOnlineBackend\(\)[\s\S]{0,500}return isNasProviderEnabled\(\)/.test(onlineApi));
expect('Couche sociale publique Supabase présente', /supabase\.(rpc|from)/.test(socialApi));
expect('Bascule Cloud R2 présente dans Settings', has(settings, 'cloud_r2'));
expect('Bascule NAS fondateur présente dans Settings', has(settings, 'founder_nas'));

console.log(checks.join('\n'));
console.log('\n✅ PUBLIC ONLINE + NEARBY REGRESSION OK');
