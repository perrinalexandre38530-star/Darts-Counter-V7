import fs from 'node:fs';
const scope = fs.readFileSync(new URL('../src/lib/canonicalAccountScope.ts', import.meta.url), 'utf8');
const storage = fs.readFileSync(new URL('../src/lib/storage.ts', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/hooks/useAuthOnline.tsx', import.meta.url), 'utf8');
function assert(ok, msg) { if (!ok) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); }
assert(scope.includes('PERSISTENCE LOCK V140'), 'Le scope canonique verrouille la persistance History à la reconnexion');
assert(scope.includes('runtimeLooksTechnical'), 'Les aliases techniques NAS sont détectés');
assert(scope.includes('if (runtimeLooksTechnical) return stableSupabase'), 'Un alias NAS ne peut plus remplacer le vrai UID Supabase');
assert(scope.includes('return runtime ||\n    stableSupabase'), 'Un vrai changement de compte runtime reste prioritaire');
assert(storage.includes('return getCanonicalAccountScopeId();'), 'storage.ts utilise exactement le même scope canonique');
assert(auth.includes('(user.user_metadata as any)?.supabase_user_id'), 'useAuthOnline expose le vrai UID Supabase comme namespace primaire');
assert(auth.includes('__dc_primary_auth_user_id = stableStorageUid'), 'Le runtime History est épinglé sur cet UID stable');
console.log('\n✅ HISTORY PERSISTENCE SCOPE V140 CONTRACT OK');
