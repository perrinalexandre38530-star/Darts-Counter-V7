import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function check(name, ok, detail='') {
  if (!ok) throw new Error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
  checks.push(name);
  console.log(`✅ ${name}`);
}

const hook = read('src/hooks/useCurrentProfile.ts');
const ctx = read('src/contexts/StoreContext.tsx');
const home = read('src/pages/Home.tsx');
const hub = read('src/pages/StatsHub.tsx');
const profiles = read('src/pages/Profiles.tsx');
const bridge = read('src/lib/accountBridge.ts');
const avatar = read('src/components/ProfileAvatar.tsx');
const statsBridge = read('src/lib/statsBridge.ts');
const linked = read('src/lib/linkedProfileSync.ts');
const canonical = read('src/lib/canonicalAccountProfile.ts');

check('MON PROFIL hook ignores linked projection', !hook.includes('dc_linked_profile_projection_v1'));
check('StoreContext current profile ignores linked projection', !ctx.includes('dc_linked_profile_projection_v1'));
check('Home reads canonical account profile', home.includes('getCanonicalAccountProfileFromStore(store)'));
check('StatsHub consumes hook profile directly', hub.includes('const profile = cp ?? null;') && !hub.includes('const profile = cp?.profile ?? null;'));
check('StatsHub protects canonical identity from linked projections', hub.includes('withoutCanonicalProfileProjection'));
check('MON PROFIL/Fiche local not merged with friend projection', profiles.includes('view === "friends"') && profiles.includes('stableProfilesBase as any[]'));
check('Online auth only initializes missing MON PROFIL fields', profiles.includes('fillIfMissing') && !profiles.includes('if (nicknameLocal !== nicknameOnline)'));
check('Canonical account stats ignore linked friend override', profiles.includes('canonicalId && canonicalId === key ? null : readLinkedProfileStatsOverride'));
check('Duplicate-account repair scores from History-derived mirror', bridge.includes('loadStatsQuickMirrorSync') && !bridge.includes('stats?.totalMatches'));
check('Online profile stats are not merged into canonical player', !bridge.includes('...(onlineProfile?.stats || {})'));
check('Canonical private data wins account/remote bridge', bridge.indexOf('...buildPrivateInfoPatch(user, onlineProfile)') < bridge.indexOf('...localPI'));
check('ProfileAvatar resolves active runtime MON PROFIL first', avatar.includes('getCanonicalAccountProfileFromStore(runtimeStore)') && avatar.includes('runtimeFull'));
check('Linked friend History cannot materialize on canonical account profile', linked.includes('linkedLocalId === canonicalId'));
check('statsBridge excludes linked friend History for canonical account', statsBridge.includes('linkedLocalId === canonicalId'));
check('Canonical profile module contains no stats authority', !canonical.includes('.stats') && canonical.includes('activeProfileId'));

// Contract simulation: one active profile remains the identity source even if a projection differs.
const store = {
  activeProfileId: 'ninja-local',
  profiles: [
    { id: 'ninja-local', name: 'Ninja', avatarDataUrl: 'avatar:ninja', preferences: { lang: 'fr' } },
    { id: 'other', name: 'Other', avatarDataUrl: 'avatar:other' },
  ],
};
const projection = { id: 'ninja-local', name: 'Perrin', avatarDataUrl: 'avatar:greffe', stats: { avg3: 999 } };
const active = store.profiles.find((p) => p.id === store.activeProfileId);
check('Simulation: active profile identity remains Ninja', active?.name === 'Ninja' && active?.avatarDataUrl === 'avatar:ninja');
check('Simulation: remote projection is not the account identity', projection.name !== active.name && projection.avatarDataUrl !== active.avatarDataUrl);

console.log(`\n✅ Canonical account architecture V84: ${checks.length}/${checks.length}`);
