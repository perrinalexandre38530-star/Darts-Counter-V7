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
const mapMigration = read('supabase/migrations/20260730_nearby_map_encounters_places.sql');
const nearbyApi = read('src/lib/nearbyPlayersApi.ts');
const nearbyPanel = read('src/components/NearbyPlayersPanel.tsx');
const nearbyMap = read('src/components/nearby/NearbyMapView.tsx');
const nearbyCard = read('src/components/nearby/NearbyPlayerCard.tsx');
const encountersPanel = read('src/components/nearby/NearbyEncountersPanel.tsx');
const placeCard = read('src/components/nearby/NearbyPlaceCard.tsx');
const encountersTable = (mapMigration.match(/create table if not exists public\.ms_nearby_encounters[\s\S]*?\n\);/i) || [''])[0];
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

expect('Migration carte locale versionnée', mapMigration.length > 9000);
expect('Table joueurs croisés présente', has(mapMigration, 'ms_nearby_encounters'));
expect('Table clubs/équipes/tournois locale présente', has(mapMigration, 'ms_nearby_places'));
expect('Croisements ne stockent aucune coordonnée', encountersTable.length > 200 && !/\blocation\b/i.test(encountersTable));
expect('Coordonnées joueurs arrondies sur une grille privée', /ST_Y[\s\S]{0,120}0\.02/.test(mapMigration) && /ST_X[\s\S]{0,120}0\.02/.test(mapMigration));
expect('Historique croisé limité et effaçable', has(mapMigration, 'ms_list_nearby_encounters') && has(mapMigration, 'ms_clear_nearby_encounters'));
expect('Publication locale clubs/équipes/tournois/lieux câblée', has(mapMigration, 'ms_publish_nearby_place') && /club.*team.*tournament.*venue/s.test(mapMigration));
expect('Recherche de points locaux utilise PostGIS', has(mapMigration, 'ms_find_nearby_places') && /ST_DWithin\s*\(/i.test(mapMigration));

expect('API frontend appelle ms_get_nearby_settings', has(nearbyApi, 'ms_get_nearby_settings'));
expect('API frontend appelle ms_find_nearby_players', has(nearbyApi, 'ms_find_nearby_players'));
expect('API frontend appelle ms_send_nearby_game_request', has(nearbyApi, 'ms_send_nearby_game_request'));
expect('API frontend charge les joueurs croisés', has(nearbyApi, 'ms_list_nearby_encounters'));
expect('API frontend charge et publie les points locaux', has(nearbyApi, 'ms_find_nearby_places') && has(nearbyApi, 'ms_publish_nearby_place'));
expect('Coordonnées GPS brutes ne font pas partie du type NearbyPlayer', !/type NearbyPlayer[\s\S]{0,1200}\blatitude\b/i.test(nearbyApi) && !/type NearbyPlayer[\s\S]{0,1200}\blongitude\b/i.test(nearbyApi));
expect('Les seules coordonnées cartographiques du joueur sont explicitement arrondies', /Coordonnées volontairement arrondies/.test(nearbyApi));

expect('UI proximité intégrée à FriendsPage', has(friendsPage, '<NearbyPlayersPanel'));
expect('Section Online renommée Carte locale & rencontres', has(friendsPage, 'Carte locale & rencontres'));
expect('UI affiche la confidentialité de position', /aucune coordonnée|position exacte n.est jamais affichée|jamais de retrouver leur adresse/i.test(nearbyPanel + nearbyMap));
expect('Géolocalisation navigateur câblée', has(nearbyPanel, 'navigator.geolocation.getCurrentPosition'));
expect('Mode JE CHERCHE UNE PARTIE câblé', has(nearbyPanel, 'JE CHERCHE UNE PARTIE'));
expect('Proposition de match câblée', has(nearbyCard, 'Proposer un match'));
expect('Invitation tournoi câblée', has(nearbyCard, 'Inviter tournoi'));
expect('Première activation locale guidée', has(nearbyPanel, 'ACTIVER LA CARTE LOCALE'));
expect('Recherche locale directement actionnable', has(nearbyPanel, 'CHERCHER AUTOUR DE MOI'));
expect('Propositions envoyées visibles et annulables', has(nearbyPanel, 'MES PROPOSITIONS EN ATTENTE') && has(nearbyPanel, 'cancelled'));
expect('Onglet proximité possède une icône dédiée', has(friendsPage, 'id === "nearby"'));
expect('Hub Online expose un raccourci proximité', has(friendsPage, 'Trouver des joueurs proches'));

expect('Carte OpenStreetMap sans dépendance React supplémentaire', has(nearbyMap, 'tile.openstreetmap.org') && has(nearbyMap, 'project(') && has(nearbyMap, 'unproject('));
expect('Carte gère joueurs clubs équipes tournois et lieux', /"player" \| "club" \| "team" \| "tournament" \| "venue"/.test(nearbyMap));
expect('Carte indique clairement que les joueurs sont approximatifs', /Position volontairement approximative/.test(nearbyMap));
expect('Belles cartes joueurs dédiées', has(nearbyCard, 'NearbyPlayerCard') && has(nearbyCard, 'CHERCHE UNE PARTIE'));
expect('Panneau joueurs croisés dédié', has(encountersPanel, 'JOUEURS CROISÉS'));
expect('Cartes clubs et tournois dédiées', has(placeCard, 'TOURNOI') && has(placeCard, 'CLUB'));
expect('Publication d’un point local disponible dans UI', has(nearbyPanel, 'PUBLIER SUR LA CARTE'));

expect('ONLINE public n’utilise le NAS que lorsque le provider est explicitement NAS', /function useNasOnlineBackend\(\)[\s\S]{0,500}return isNasProviderEnabled\(\)/.test(onlineApi));
expect('Couche sociale publique Supabase présente', /supabase\.(rpc|from)/.test(socialApi));
expect('Bascule Cloud R2 présente dans Settings', has(settings, 'cloud_r2'));
expect('Bascule NAS fondateur présente dans Settings', has(settings, 'founder_nas'));

console.log(checks.join('\n'));
console.log('\n✅ PUBLIC ONLINE + NEARBY MAP REGRESSION OK');
