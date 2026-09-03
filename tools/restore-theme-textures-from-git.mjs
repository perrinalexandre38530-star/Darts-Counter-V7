import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const THEME_FILE = path.join(ROOT, 'src', 'theme', 'themePresets.ts');
const LOCAL_DIR = path.join(ROOT, 'public', 'theme-textures');
const CACHE_DIR = path.join(ROOT, '.mss-theme-restore', 'theme-textures');
const MIN_EXPECTED = 110;
const SENTINELS = [
  'street-acier-urbain.webp',
  'factory-atelier-grunge.webp',
  'pub-bois-violet.webp',
  'arcade-pixel-rose.webp',
  'prestige-quartz-dore.webp',
  'abstract-orange-rugged.webp',
];

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function referencedTextures() {
  const source = fs.readFileSync(THEME_FILE, 'utf8');
  const refs = [...new Set([...source.matchAll(/\/theme-textures\/([^)'"\s,]+)/g)].map((m) => m[1]))].sort();
  const parserMissing = SENTINELS.filter((file) => !refs.includes(file));
  if (parserMissing.length) throw new Error(`Analyse des textures invalide: ${parserMissing.join(', ')}`);
  if (refs.length < MIN_EXPECTED) throw new Error(`Analyse des textures incomplete: ${refs.length} detectee(s), minimum attendu ${MIN_EXPECTED}.`);
  return refs;
}
function validAsset(file, data) {
  const ext = path.extname(file).toLowerCase();
  if (!data || data.length < 16) return false;
  if (ext === '.webp') return data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  if (ext === '.svg') return data.toString('utf8', 0, Math.min(data.length, 1024)).includes('<svg');
  if (ext === '.png') return data.subarray(1, 4).toString('ascii') === 'PNG';
  if (ext === '.jpg' || ext === '.jpeg') return data[0] === 0xff && data[1] === 0xd8;
  return true;
}
function readFileIfValid(file) {
  try {
    const data = fs.readFileSync(file);
    return validAsset(file, data) ? data : null;
  } catch { return null; }
}
function git(args, options = {}) {
  return spawnSync('git', args, {
    cwd: ROOT,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}
function gitCommitsFor(rel) {
  const res = git(['log', '--all', '--format=%H', '--', rel], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  return String(res.stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
function gitRead(sha, rel) {
  const res = git(['show', `${sha}:${rel}`], { encoding: null });
  if (res.status !== 0 || !Buffer.isBuffer(res.stdout)) return null;
  return res.stdout;
}
function assertGitRepository() {
  const res = git(['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  if (res.status !== 0 || String(res.stdout || '').trim() !== 'true') {
    throw new Error('Ce script doit etre lance dans le depot Git complet Darts-Counter-V7-GIT.');
  }
}

assertGitRepository();
ensureDir(CACHE_DIR);
const refs = referencedTextures();
let restored = 0;
let already = 0;
const failed = [];

for (const file of refs) {
  const local = path.join(LOCAL_DIR, file);
  const cached = path.join(CACHE_DIR, file);
  if (readFileIfValid(local) || readFileIfValid(cached)) { already++; continue; }

  const rel = `public/theme-textures/${file}`;
  let found = gitRead('HEAD', rel);
  if (!validAsset(file, found)) found = null;

  if (!found) {
    for (const sha of gitCommitsFor(rel)) {
      const data = gitRead(sha, rel);
      if (validAsset(file, data)) { found = data; break; }
    }
  }

  if (!found) { failed.push(file); continue; }
  ensureDir(path.dirname(cached));
  fs.writeFileSync(cached, found);
  restored++;
  console.log(`RESTORE ${file}`);
}

const unresolved = refs.filter((file) => !readFileIfValid(path.join(LOCAL_DIR, file)) && !readFileIfValid(path.join(CACHE_DIR, file)));
if (unresolved.length) failed.push(...unresolved.filter((x) => !failed.includes(x)));

console.log(`\nTextures referencees : ${refs.length}`);
console.log(`Deja disponibles      : ${already}`);
console.log(`Restaurees depuis Git : ${restored}`);
if (failed.length) {
  console.error(`Introuvables (${failed.length}) :\n${failed.join('\n')}`);
  process.exit(1);
}
console.log('OK - toutes les textures requises ont une source reelle, sans reinjection dans public/.');
