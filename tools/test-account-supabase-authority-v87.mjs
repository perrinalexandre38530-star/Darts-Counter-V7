import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function check(label, ok) {
  if (!ok) throw new Error(`❌ ${label}`);
  checks.push(label);
  console.log(`✅ ${label}`);
}

const bridge = read('src/lib/accountBridge.ts');
const api = read('src/lib/onlineApi.ts');
const profiles = read('src/pages/Profiles.tsx');
const canonical = read('src/lib/canonicalAccountProfile.ts');
const homeCard = read('src/components/home/ActiveProfileCard.tsx');
const workspace = read('src/components/OrganizationWorkspaceSwitcher.tsx');

const nicknameBlock = bridge.slice(
  bridge.indexOf('function getOnlineNickname'),
  bridge.indexOf('function getOnlineAvatar'),
);
check('Supabase nickname/displayName precede private_info nickname',
  nicknameBlock.indexOf('onlineProfile?.nickname') >= 0 &&
  nicknameBlock.indexOf('onlineProfile?.nickname') < nicknameBlock.indexOf('onlineProfile?.privateInfo?.nickname'));
check('surname is never used as online nickname', !nicknameBlock.includes('onlineProfile?.surname'));

const avatarBlock = bridge.slice(
  bridge.indexOf('function getOnlineAvatar'),
  bridge.indexOf('function getRemoteCanonicalLocalProfileId'),
);
check('Supabase avatarUrl precedes legacy avatarDataUrl',
  avatarBlock.indexOf('onlineProfile?.avatarUrl') >= 0 &&
  avatarBlock.indexOf('onlineProfile?.avatarUrl') < avatarBlock.indexOf('onlineProfile?.avatarDataUrl'));
check('pending local avatar preview is protected during upload', bridge.includes('localPreviewPending') && bridge.includes('Date.now() - localAvatarTs < 2 * 60 * 1000'));
check('remote public avatar can replace old cache without legacy avatar timestamp', bridge.includes('onlineLooksCanonical') && bridge.includes('String(onlineAvatar) !== localAvatarUrl'));

check('NAS fallback identity is normalized behind Supabase primary profile',
  api.includes('const canonicalNickname = String((primary as any)?.nickname') &&
  api.includes('delete merged.avatarDataUrl') &&
  api.includes('nickname: canonicalNickname'));

check('MON PROFIL never maps surname to nickname',
  profiles.includes('fillIfMissing("nickname", remote?.nickname || remote?.displayName || remote?.display_name)') &&
  !profiles.includes('fillIfMissing("nickname", remote?.surname'));

const avatarCandidates = canonical.slice(canonical.indexOf('export function canonicalProfileAvatar'));
check('canonical account avatar prefers portable avatarUrl',
  avatarCandidates.indexOf('profile?.avatarUrl') < avatarCandidates.indexOf('profile?.avatarDataUrl'));

check('Home card prefers canonical profile name before legacy nickname/surname',
  homeCard.includes('(profile as any)?.name,\n      (profile as any)?.displayName,\n      (profile as any)?.privateInfo?.nickname'));
check('organization workspace prefers canonical profile name',
  workspace.includes('canonicalProfile?.name ||\n    canonicalProfile?.displayName ||\n    canonicalProfile?.privateInfo?.nickname'));

console.log(`\n✅ Supabase account authority V87: ${checks.length}/${checks.length}`);
