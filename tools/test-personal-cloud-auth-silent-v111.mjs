import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/lib/apiClient.ts', import.meta.url), 'utf8');
function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}
assert(src.includes('PERSONAL CLOUD HARD LOCK V111'), 'Le verrou cloud personnel est installé');
assert(src.includes('isPersonalCloudRoute && publicSupabaseSession') && src.includes('? readAccountAccessToken()'), 'En session Supabase, personal-cloud utilise uniquement le jeton public');
assert(src.includes('await readFreshPublicSupabaseSession(false)'), 'Le jeton Supabase est rafraîchi avant les probes cloud');
assert(src.includes('code: "personal_cloud_auth_pending"'), 'Un probe automatique sans session fraîche est différé localement');
assert(!src.includes('console.warn("[apiClient] 401 backend sauvegarde — compte Supabase conservé"'), 'Le warning 401 sauvegarde redondant est supprimé');
console.log('\n✅ PERSONAL CLOUD AUTH SILENT V111 CONTRACT OK');
