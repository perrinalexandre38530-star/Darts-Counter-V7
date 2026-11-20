import { readFileSync, statSync } from 'node:fs';

export const HANDLE = 'multisportsscor';
export const PROFILE_URL = `https://x.com/${HANDLE}`;

export function canonicalHandle(value) {
  if (!value || typeof value !== 'string') return '';
  let path = value;
  try { path = new URL(value, 'https://x.com').pathname; } catch {}
  const first = path.split('/').filter(Boolean)[0] || '';
  return first.replace(/^@/, '').toLowerCase();
}

export function assertCorrectAccount(href, expected = HANDLE) {
  const actual = canonicalHandle(href);
  if (actual !== expected.toLowerCase()) {
    throw new Error(`SÉCURITÉ : ce navigateur est connecté au compte @${actual || 'inconnu'}, et NON à @${expected}. Aucun fichier envoyé.`);
  }
  return true;
}

export function assertJpeg(file, maxBytes = 6 * 1024 * 1024) {
  const size = statSync(file).size;
  if (size < 100 || size > maxBytes) throw new Error(`Image refusée (${size} octets) : ${file}`);
  const header = readFileSync(file).subarray(0, 3);
  if (!(header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)) {
    throw new Error(`Le fichier n'est pas un JPEG valide : ${file}`);
  }
  return { size, path: file };
}

export const FILE_TARGETS = {
  banner: [
    'input[data-testid="ProfileHeaderInput"]',
    '[data-testid="ProfileHeaderInput"] input[type="file"]',
    '[data-testid="editProfileHeader"] input[type="file"]',
    '[data-testid="addBannerButton"] input[type="file"]'
  ],
  avatar: [
    'input[data-testid="ProfileAvatarInput"]',
    '[data-testid="ProfileAvatarInput"] input[type="file"]',
    '[data-testid="editProfileAvatar"] input[type="file"]',
    '[data-testid="addAvatarButton"] input[type="file"]'
  ]
};

export const CLICK_TARGETS = {
  banner: [
    '[data-testid="addBannerButton"]',
    '[data-testid="editProfileHeader"]',
    '[data-testid="ProfileHeaderInput"]'
  ],
  avatar: [
    '[data-testid="addAvatarButton"]',
    '[data-testid="editProfileAvatar"]',
    '[data-testid="ProfileAvatarInput"]'
  ]
};
