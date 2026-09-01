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
const VERSION = '2026.09.01.1';
const PACKS = ['fit-awena', 'navigation-music', 'collectible-cards'];

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

async function webpFile(src, dest, quality = 76) {
  ensureDir(path.dirname(dest));
  await sharp(src).webp({ quality, effort: 4, smartSubsample: true }).toFile(dest);
}

function encodeAudio(src, dest) {
  ensureDir(path.dirname(dest));
  return new Promise((resolve, reject) => {
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vn', '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-compression_level', '6', '-threads', '1', dest];
    const child = spawn('ffmpeg', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${src}`)));
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
      const outRel = rel.slice(0, -4) + '.webp';
      jobs.push({ src, rel: outRel, kind: 'webp', quality: 76 });
      continue;
    }
    if (ext === '.jpg' || ext === '.jpeg') {
      const outRel = rel.replace(/\.(jpe?g)$/i, '.webp');
      jobs.push({ src, rel: outRel, kind: 'webp', quality: 76 });
      continue;
    }
    if (ext === '.webp') { jobs.push({ src, rel, kind: 'webp', quality: 74 }); continue; }
    if (['.webm', '.mp4', '.bvh'].includes(ext)) jobs.push({ src, rel, kind: 'copy' });
  }
  await runPool(jobs, async (job) => {
    const dest = path.join(outRoot, job.rel);
    if (job.kind === 'webp') await webpFile(job.src, dest, job.quality);
    else await copyFile(job.src, dest);
  }, 6);
  return jobs.map((job) => job.rel);
}

async function prepareMusic() {
  const srcRoot = path.join(ROOT, 'src', 'assets', 'audio', 'navigation');
  const outRoot = path.join(OUT, 'navigation-music');
  const localFallbacks = new Set(['multisports_scoring_nav.m4a', 'msamstp_nav.m4a']);
  const inputs = walk(srcRoot).filter((f) => /\.(m4a|aac|mp3|wav)$/i.test(f) && !localFallbacks.has(path.basename(f)));
  const files = inputs.map((src) => `${path.basename(src, path.extname(src))}.webm`);
  const haveFfmpeg = ffmpegAvailable();
  if (!haveFfmpeg) throw new Error('FFmpeg est obligatoire pour compresser les musiques du content pack en Opus/WebM.');
  await runPool(inputs, async (src) => {
    const rel = `${path.basename(src, path.extname(src))}.webm`;
    const dest = path.join(outRoot, rel);
    await encodeAudio(src, dest);
  }, 6);
  return files;
}

async function prepareCards() {
  const srcRoot = path.join(ROOT, 'src', 'assets', 'collectible-cards');
  const outRoot = path.join(OUT, 'collectible-cards');
  const inputs = walk(srcRoot).filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
  const jobs = inputs.map((src) => ({ src, rel: `${path.basename(src).replace(/\.(png|jpe?g|webp)$/i, '')}.webp` }));
  await runPool(jobs, async (job) => webpFile(job.src, path.join(outRoot, job.rel), 72), 8);
  return jobs.map((job) => job.rel);
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

function mimeFor(rel) {
  const ext = path.extname(rel).toLowerCase();
  return ({
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bvh': 'text/plain',
  })[ext] || 'application/octet-stream';
}

function buildManifest(packId, relFiles) {
  const root = path.join(OUT, packId);
  const files = relFiles.sort().map((rel) => {
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
const fit = await prepareFit();
const music = await prepareMusic();
const cards = await prepareCards();
const manifests = {
  'fit-awena': buildManifest('fit-awena', fit),
  'navigation-music': buildManifest('navigation-music', music),
  'collectible-cards': buildManifest('collectible-cards', cards),
};
writeGeneratedCatalog(manifests);

console.log('\nMSS content packs prepared');
for (const id of PACKS) {
  const m = manifests[id];
  console.log(`${id.padEnd(20)} ${m.files.length.toString().padStart(3)} files  ${(m.totalBytes / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`Output: ${path.relative(ROOT, OUT)}`);
console.log(`Catalog: ${path.relative(ROOT, GENERATED_TS)}`);
