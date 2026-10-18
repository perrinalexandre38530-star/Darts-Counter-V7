import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const supabaseClient = read('src/lib/supabaseClient.ts');
const accountSync = read('src/lib/accountOwnedSync.ts');
const auth = read('src/hooks/useAuthOnline.tsx');
const apiClient = read('src/lib/apiClient.ts');
const drive = read('src/lib/personalCloudApi.ts');
const orgs = read('src/organizations/organizationService.ts');
const server = read('server.js');

function check(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

check(supabaseClient.includes('SUPABASE_REST_MAX_CONCURRENCY = 4'), 'Supabase REST limite la concurrence au démarrage');
check(supabaseClient.includes('openSupabaseRestCircuit') && supabaseClient.includes('PGRST002'), 'PGRST002 ouvre un circuit de protection global');
check(supabaseClient.includes('global: { fetch: resilientSupabaseFetch as any }'), 'Le circuit protège toutes les requêtes PostgREST/RPC du client unique');
check(supabaseClient.includes('/rest\\/v1') && supabaseClient.includes('Auth reste disponible'), 'Le circuit ne coupe pas Supabase Auth');
check(accountSync.includes('remotePaused()') && accountSync.includes('isSupabaseTransientUnavailableError(error)'), 'La synchro compte se met en pause sur panne Supabase');
check(accountSync.includes('n\'est jamais execute pendant une panne Supabase globale'), 'Le fallback historique ne rejoue plus chaque ligne pendant un 503 global');
check(auth.includes('if (disposed || isSupabaseRestCircuitOpen()) return;'), 'Le polling profil ne martèle plus Supabase pendant le circuit ouvert');
check(auth.includes('if (!alive || isSupabaseRestCircuitOpen()) return;'), 'Le heartbeat communautaire est suspendu pendant la panne');
check(orgs.includes('if (!userId || !organizationId || isSupabaseRestCircuitOpen())'), 'Les groupes Organisation restent sur le cache local pendant la panne');
check(apiClient.includes('const publicAccountToken = readAccountAccessToken();') && apiClient.includes('if (publicAccountToken) return publicAccountToken;'), 'Drive/NAS peuvent utiliser directement la session compte Supabase fraîche');
check(drive.includes('apiGetBytes') && drive.includes('[0, 401, 404, 405, 408'), 'Le restore Drive compile avec apiGetBytes et le binaire retombe proprement après 401');
check(server.includes('legacy appData fallback remains active'), 'La liste Drive ne perd plus les anciennes sauvegardes si drive.file est absent');
check(server.includes('drive.file unavailable; using appDataFolder compatibility mode'), 'Une ancienne autorisation OAuth appData peut encore sauvegarder sans reconnexion');
check(server.includes('parents: ["appDataFolder"]'), 'Le backend sait créer une nouvelle sauvegarde dans appDataFolder');
check(server.includes('storageMode: visibleMode ? "drive.file" : "appDataFolder"'), 'Le mode de stockage Drive utilisé est diagnostiquable');
check((server.match(/let nasDecoded = null;/g) || []).length >= 2, 'Les middlewares Drive/NAS ne masquent plus une panne PostgreSQL en faux 401');

console.log('\n✅ SUPABASE OUTAGE + BACKUP V132 REGRESSION OK');
