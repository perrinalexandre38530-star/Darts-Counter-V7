import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'content-packs-dist');
const GENERATED_TS = path.join(ROOT, 'src', 'lib', 'contentPackCatalog.generated.ts');
const VERSION = '2026.09.01.3';
const PACKS = [
  'fit-awena',
  'navigation-music',
  'collectible-cards',
  'theme-textures',
  'character-portraits',
];

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function rmrf(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
function posix(p) { return p.split(path.sep).join('/'); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function bytes(file) { return fs.statSync(file).size; }
function ffmpegAvailable() { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; }

async function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function webpFile(src, dest, quality = 74) {
  ensureDir(path.dirname(dest));
  const temp = `${dest}.tmp.webp`;
  await sharp(src)
    .rotate()
    .webp({ quality, effort: 5, smartSubsample: true })
    .toFile(temp);
  // Never make a pack heavier just because we recompressed it.
  if (path.extname(src).toLowerCase() === '.webp' && fs.statSync(temp).size >= fs.statSync(src).size) {
    fs.rmSync(temp, { force: true });
    fs.copyFileSync(src, dest);
  } else {
    fs.renameSync(temp, dest);
  }
}

function encodeAudio(src, dest) {
  ensureDir(path.dirname(dest));
  return new Promise((resolve, reject) => {
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vn',
      '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on',
      '-compression_level', '5', '-threads', '1', dest,
    ];
    const child = spawn('ffmpeg', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${src}`)));
  });
}

function encodeVideo(src, dest) {
  ensureDir(path.dirname(dest));
  const ext = path.extname(dest).toLowerCase();
  const temp = `${dest}.tmp${ext}`;
  const common = ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-map_metadata', '-1', '-an'];
  const args = ext === '.webm'
    ? [...common, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-threads', '2', temp]
    : [...common, '-c:v', 'libx264', '-preset', 'medium', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', temp];
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg video failed: ${src}`));
      try {
        if (fs.statSync(temp).size < fs.statSync(src).size) fs.renameSync(temp, dest);
        else { fs.rmSync(temp, { force: true }); fs.copyFileSync(src, dest); }
        resolve();
      } catch (error) { reject(error); }
    });
  });
}

async function runPool(items, worker, concurrency = 4) {
  let index = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) stack.push(full); else out.push(full);
    }
  }
  return out.sort();
}

async function prepareFit() {
  const srcRoot = path.join(ROOT, 'public', 'fit');
  const outRoot = path.join(OUT, 'fit-awena');
  const jobs = [];
  for (const src of walk(srcRoot)) {
    const rel = posix(path.relative(srcRoot, src));
    const ext = path.extname(src).toLowerCase();
    if (['.md', '.json'].includes(ext)) continue;
    if (ext === '.png') {
      const siblingWebp = src.slice(0, -4) + '.webp';
      if (fs.existsSync(siblingWebp)) continue;
      jobs.push({ src, rel: rel.slice(0, -4) + '.webp', kind: 'webp', quality: 74 });
      continue;
    }
    if (ext === '.jpg' || ext === '.jpeg') {
      jobs.push({ src, rel: rel.replace(/\.(jpe?g)$/i, '.webp'), kind: 'webp', quality: 74 });
      continue;
    }
    if (ext === '.webp') { jobs.push({ src, rel, kind: 'webp', quality: 72 }); continue; }
    if (['.webm', '.mp4'].includes(ext)) { jobs.push({ src, rel, kind: 'video' }); continue; }
    if (ext === '.bvh') jobs.push({ src, rel, kind: 'webp' });
  }
  await runPool(jobs, async (job) => {
    const dest = path.join(outRoot, job.rel);
    if (job.kind === 'webp') await webpFile(job.src, dest, job.quality);
    else if (job.kind === 'video') await encodeVideo(job.src, dest);
    else await copyFile(job.src, dest);
  }, 4);
  return jobs.map((job) => job.rel);
}

async function prepareMusic() {
  const srcRoot = path.join(ROOT, 'src', 'assets', 'audio', 'navigation');
  const outRoot = path.join(OUT, 'navigation-music');
  const localFallbacks = new Set(['multisports_scoring_nav.m4a', 'msamstp_nav.m4a']);
  const inputs = walk(srcRoot).filter((f) => /\.(m4a|aac|mp3|wav)$/i.test(f) && !localFallbacks.has(path.basename(f)));
  if (!ffmpegAvailable()) throw new Error('FFmpeg est obligatoire pour compresser les musiques du content pack en Opus/WebM.');
  const jobs = inputs.map((src) => ({ src, rel: `${path.basename(src, path.extname(src))}.webm` }));
  await runPool(jobs, async (job) => encodeAudio(job.src, path.join(outRoot, job.rel)), 4);
  return jobs.map((job) => job.rel);
}

async function prepareCards() {
  const srcRoot = path.join(ROOT, 'src', 'assets', 'collectible-cards');
  const outRoot = path.join(OUT, 'collectible-cards');
  const jobs = walk(srcRoot).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).map((src) => {
    const ext = path.extname(src).toLowerCase();
    const rel = `${path.basename(src).replace(/\.(png|jpe?g|webp)$/i, '')}.webp`;
    return { src, rel, kind: 'webp' };
  });
  await runPool(jobs, async (job) => {
    const dest = path.join(outRoot, job.rel);
    await webpFile(job.src, dest, 70);
  }, 4);
  return jobs.map((job) => job.rel);
}

async function prepareThemes() {
  const srcRoot = path.join(ROOT, 'public', 'theme-textures');
  const restoredRoot = path.join(ROOT, '.mss-theme-restore', 'theme-textures');
  const outRoot = path.join(OUT, 'theme-textures');
  const sources = [srcRoot, restoredRoot].filter((dir) => fs.existsSync(dir));
  const byRel = new Map();
  for (const root of sources) {
    for (const src of walk(root)) {
      const rel = posix(path.relative(root, src));
      if (!byRel.has(rel)) byRel.set(rel, src);
    }
  }

  // Bloque désormais la génération d'un pack incomplet : c'est précisément ce qui
  // avait supprimé 82 textures tout en laissant les thèmes les référencer.
  const themeSource = fs.readFileSync(path.join(ROOT, 'src', 'theme', 'themePresets.ts'), 'utf8');
  const required = [...new Set([...themeSource.matchAll(/\/theme-textures\/([^)'"\s,]+)/g)].map((m) => m[1]))].sort();
  const missing = required.filter((rel) => !byRel.has(rel));
  if (missing.length) {
    throw new Error(`Theme pack incomplet: ${missing.length} texture(s) manquante(s). Lance d'abord: npm run themes:restore\n${missing.join('\n')}`);
  }

  const jobs = [];
  for (const [rel, src] of byRel) {
    const ext = path.extname(src).toLowerCase();
    if (ext === '.webp') jobs.push({ src, rel, kind: 'copy' });
    else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') jobs.push({ src, rel: rel.replace(/\.(png|jpe?g)$/i, '.webp'), kind: 'webp' });
    else if (ext === '.svg') jobs.push({ src, rel, kind: 'copy' });
  }
  await runPool(jobs, async (job) => {
    const dest = path.join(outRoot, job.rel);
    if (job.kind === 'webp') await webpFile(job.src, dest, 68);
    else await copyFile(job.src, dest);
  }, 4);
  return jobs.map((job) => job.rel);
}

async function prepareCharacterPortraits() {
  const srcRoot = path.join(ROOT, 'src', 'assets', 'avatars');
  const outRoot = path.join(OUT, 'character-portraits');
  const allowedFolders = new Set(['killer-bots', 'loterie-bots', 'firefighter-bots']);
  const jobs = walk(srcRoot).filter((src) => {
    const rel = posix(path.relative(srcRoot, src));
    const top = rel.split('/')[0];
    return allowedFolders.has(top) && /\.(webp|png|jpe?g)$/i.test(src);
  }).map((src) => {
    const ext = path.extname(src).toLowerCase();
    const rel = posix(path.relative(srcRoot, src)).replace(/\.(png|jpe?g)$/i, '.webp');
    return { src, rel, kind: 'webp' };
  });
  await runPool(jobs, async (job) => {
    const dest = path.join(outRoot, job.rel);
    await webpFile(job.src, dest, 72);
  }, 4);
  return jobs.map((job) => job.rel);
}

function mimeFor(rel) {
  const ext = path.extname(rel).toLowerCase();
  return ({
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bvh': 'text/plain',
    '.svg': 'image/svg+xml', '.json': 'application/json',
  })[ext] || 'application/octet-stream';
}

function buildManifest(packId, relFiles) {
  const root = path.join(OUT, packId);
  const files = [...new Set(relFiles)].sort().map((rel) => {
    const full = path.join(root, rel);
    return { path: posix(rel), bytes: bytes(full), sha256: sha256(full), mime: mimeFor(rel) };
  });
  const manifest = { id: packId, version: VERSION, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) };
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function writeGeneratedCatalog(manifests) {
  const compact = Object.fromEntries(Object.entries(manifests).map(([id, m]) => [id, {
    version: m.version,
    totalBytes: m.totalBytes,
    files: m.files.map((f) => ({ path: f.path, bytes: f.bytes })),
  }]));
  const source = `/* AUTO-GENERATED by tools/prepare-content-packs.mjs. Do not edit manually. */\n` +
`export const CONTENT_PACK_CATALOG = ${JSON.stringify(compact, null, 2)} as const;\n` +
`export type GeneratedContentPackId = keyof typeof CONTENT_PACK_CATALOG;\n`;
  fs.writeFileSync(GENERATED_TS, source);
}

rmrf(OUT);
ensureDir(OUT);

const manifests = {
  'fit-awena': buildManifest('fit-awena', await prepareFit()),
  'navigation-music': buildManifest('navigation-music', await prepareMusic()),
  'collectible-cards': buildManifest('collectible-cards', await prepareCards()),
  'theme-textures': buildManifest('theme-textures', await prepareThemes()),
  'character-portraits': buildManifest('character-portraits', await prepareCharacterPortraits()),
};
writeGeneratedCatalog(manifests);

console.log('\nMSS content packs prepared');
for (const id of PACKS) {
  const m = manifests[id];
  console.log(`${id.padEnd(22)} ${m.files.length.toString().padStart(3)} files  ${(m.totalBytes / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`Output: ${path.relative(ROOT, OUT)}`);
console.log(`Catalog: ${path.relative(ROOT, GENERATED_TS)}`);
