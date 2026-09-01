import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const REPORT = path.join(ROOT, 'android-local-media-report.json');
const MIN_IMAGE = Number(process.env.MSS_ANDROID_OPT_IMAGE_MIN_KB || 96) * 1024;
const MIN_AUDIO = Number(process.env.MSS_ANDROID_OPT_AUDIO_MIN_KB || 384) * 1024;
const MIN_VIDEO = Number(process.env.MSS_ANDROID_OPT_VIDEO_MIN_KB || 384) * 1024;
const FFMPEG = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

if (!fs.existsSync(DIST)) throw new Error('dist/ introuvable. Lance npm run build avant android:optimize-local-media.');

function walk(dir) {
  const out = []; const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name); const st = fs.statSync(full);
      st.isDirectory() ? stack.push(full) : out.push(full);
    }
  }
  return out;
}
function mb(n) { return (n / 1024 / 1024).toFixed(2); }
function tempName(file) { return `${file}.mss-opt.tmp${path.extname(file).toLowerCase()}`; }
function replaceIfSmaller(src, temp) {
  const before = fs.statSync(src).size; const after = fs.statSync(temp).size;
  if (after > 0 && after < before) { fs.renameSync(temp, src); return { before, after, saved: before - after }; }
  fs.rmSync(temp, { force: true }); return { before, after: before, saved: 0 };
}

async function optimizeImage(file) {
  const before = fs.statSync(file).size;
  if (before < MIN_IMAGE) return null;
  const ext = path.extname(file).toLowerCase();
  if (!['.webp', '.png', '.jpg', '.jpeg'].includes(ext)) return null;
  const meta = await sharp(file, { animated: true }).metadata();
  if ((meta.pages || 1) > 1) return { file, before, after: before, saved: 0, note: 'animated-skip' };
  const temp = tempName(file);
  let pipeline = sharp(file).rotate();
  if (ext === '.webp') pipeline = pipeline.webp({ quality: 76, effort: 5, smartSubsample: true });
  else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 8 });
  else pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true });
  await pipeline.toFile(temp);
  return { file, ...replaceIfSmaller(file, temp), note: ext.slice(1) };
}

function ffmpegOptimize(file, type) {
  const before = fs.statSync(file).size;
  if (!FFMPEG) return Promise.resolve({ file, before, after: before, saved: 0, note: 'ffmpeg-unavailable' });
  const ext = path.extname(file).toLowerCase();
  const temp = tempName(file);
  let args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-map_metadata', '-1'];
  if (type === 'audio') {
    args.push('-vn');
    if (ext === '.m4a' || ext === '.aac') args.push('-c:a', 'aac', '-b:a', '72k');
    else if (ext === '.mp3') args.push('-c:a', 'libmp3lame', '-b:a', '80k');
    else return Promise.resolve(null);
  } else {
    args.push('-an');
    if (ext === '.webm') args.push('-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-threads', '2');
    else if (ext === '.mp4') args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2');
    else return Promise.resolve(null);
  }
  args.push(temp);
  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: 'ignore' });
    child.on('error', () => resolve({ file, before, after: before, saved: 0, note: 'ffmpeg-error' }));
    child.on('exit', (code) => {
      if (code !== 0 || !fs.existsSync(temp)) {
        fs.rmSync(temp, { force: true });
        resolve({ file, before, after: before, saved: 0, note: 'ffmpeg-failed' });
        return;
      }
      resolve({ file, ...replaceIfSmaller(file, temp), note: type });
    });
  });
}

async function pool(items, worker, concurrency = 3) {
  let i = 0; const out = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, async () => {
    while (true) { const idx = i++; if (idx >= items.length) return; out[idx] = await worker(items[idx]); }
  }));
  return out.filter(Boolean);
}

const all = walk(DIST);
const images = all.filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
const audio = all.filter((f) => /\.(m4a|aac|mp3)$/i.test(f) && fs.statSync(f).size >= MIN_AUDIO);
const video = all.filter((f) => /\.(mp4|webm)$/i.test(f) && fs.statSync(f).size >= MIN_VIDEO);
const results = [
  ...(await pool(images, optimizeImage, 3)),
  ...(await pool(audio, (f) => ffmpegOptimize(f, 'audio'), 2)),
  ...(await pool(video, (f) => ffmpegOptimize(f, 'video'), 1)),
];
const saved = results.reduce((n, r) => n + (r.saved || 0), 0);
const before = results.reduce((n, r) => n + (r.before || 0), 0);
const after = results.reduce((n, r) => n + (r.after || 0), 0);
const compact = results.filter((r) => r.saved > 0).sort((a, b) => b.saved - a.saved).map((r) => ({
  file: path.relative(ROOT, r.file).split(path.sep).join('/'), before: r.before, after: r.after, saved: r.saved, note: r.note,
}));
fs.writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), ffmpeg: FFMPEG, before, after, saved, files: compact }, null, 2));
console.log(`Android local media optimizer: ${compact.length} fichiers allégés, ${mb(saved)} MB économisés.`);
for (const row of compact.slice(0, 20)) console.log(` - ${mb(row.saved)} MB  ${row.file}`);
console.log(`Rapport: ${path.relative(ROOT, REPORT)}`);
