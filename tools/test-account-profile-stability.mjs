import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const auth = read('hooks/useAuthOnline.tsx');
const bridge = read('lib/accountBridge.ts');
const avatar = read('components/ProfileAvatar.tsx');

const checks = [
  ['auth uses stable Supabase scope', auth.includes('stablePublicUserIdFromSession') && auth.includes('supabase_user_id')],
  ['NAS pseudo session exposes Supabase user id', auth.includes('const uid = supabaseUserId || canonicalNasUserId')],
  ['account/profile binding is locked', bridge.includes('dc_account_profile_bindings_v1') && bridge.includes('writeLockedAccountProfileId')],
  ['duplicate bindings prefer gameplay profile', bridge.includes('profileGameplayScore') && bridge.includes('hasOnlineBindingToAny')],
  ['profile media beats avatar cache', avatar.indexOf('if (avatarDataUrl) return avatarDataUrl;') < avatar.indexOf('if (size <= 180 && cachedThumb) return cachedThumb;')],
  ['loaded canonical avatar repairs cache', avatar.includes('Auto-réparation du cache') && avatar.includes('setAvatarCache({')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`✅ Account/profile stability invariants: ${checks.length}/${checks.length}`);
