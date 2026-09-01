import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

// IMPORTANT Windows : libvips/Sharp peut conserver des handles de fichiers en cache.
// On désactive ce cache et, pour les images, on travaille entièrement en mémoire.
sharp.cache(false);

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const REPORT = path.join(ROOT, 'android-local-media-report.json');
const MIN_IMAGE = Number(process.env.MSS_ANDROID_OPT_IMAGE_MIN_KB || 96) * 1024;
const MIN_AUDIO = Number(process.env.MSS_ANDROID_OPT_AUDIO_MIN_KB || 384) * 1024;
const MIN_VIDEO = Number(process.env.MSS_ANDROID_OPT_VIDEO_MIN_KB || 384) * 1024;
const FFMPEG = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

if (!fs.existsSync(DIST)) {
  throw new Error('dist/ introuvable. Lance npm run build avant android:optimize-local-media.');
}

function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const st = fs.statSync(full);
      st.isDirectory() ? stack.push(full) : out.push(full);
    }
  }
  return out;
}

function mb(n) {
  return (n / 1024 / 1024).toFixed(2);
}

function tempName(file) {
  return `${file}.mss-opt.tmp${path.extname(file).toLowerCase()}`;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function makeWritable(file) {
  try {
    fs.chmodSync(file, 0o666);
  } catch {
    // Best effort : utile surtout pour retirer un éventuel attribut read-only Windows.
  }
}

function safeRemove(file) {
  if (!fs.existsSync(file)) return true;
  makeWritable(file);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(file, { force: true });
      return true;
    } catch {
      sleepSync(40 * (attempt + 1));
    }
  }
  return false;
}

function writeBufferIfSmaller(src, output) {
  const before = fs.statSync(src).size;
  const after = output.length;

  if (!(after > 0 && after < before)) {
    return { before, after: before, saved: 0 };
  }

  makeWritable(src);

  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.writeFileSync(src, output);
      return { before, after, saved: before - after };
    } catch (error) {
      lastError = error;
      sleepSync(50 * (attempt + 1));
    }
  }

  console.warn(
    `[media-opt] SKIP écriture Windows: ${path.relative(ROOT, src)} (${lastError?.code || lastError?.message || 'UNKNOWN'})`
  );
  return { before, after: before, saved: 0, note: 'windows-write-skip' };
}

function replaceTempIfSmaller(src, temp) {
  const before = fs.statSync(src).size;
  const after = fs.statSync(temp).size;

  if (!(after > 0 && after < before)) {
    safeRemove(temp);
    return { before, after: before, saved: 0 };
  }

  // ffmpeg a déjà quitté : il ne garde normalement plus aucun handle ouvert.
  // On lit néanmoins le résultat en mémoire pour éviter rename/copy over existing sous Windows.
  try {
    const output = fs.readFileSync(temp);
    const result = writeBufferIfSmaller(src, output);
    safeRemove(temp);
    return result;
  } catch (error) {
    safeRemove(temp);
    console.warn(
      `[media-opt] SKIP média temporaire: ${path.relative(ROOT, src)} (${error?.code || error?.message || 'UNKNOWN'})`
    );
    return { before, after: before, saved: 0, note: 'temp-read-skip' };
  }
}

async function optimizeImage(file) {
  const before = fs.statSync(file).size;
  if (before < MIN_IMAGE) return null;

  const ext = path.extname(file).toLowerCase();
  if (!['.webp', '.png', '.jpg', '.jpeg'].includes(ext)) return null;

  try {
    // Lecture préalable en RAM = Sharp ne travaille plus directement sur le fichier source.
    // C'est la correction du verrouillage massif observé sous Windows.
    const input = fs.readFileSync(file);
    const meta = await sharp(input, { animated: true }).metadata();

    if ((meta.pages || 1) > 1) {
      return { file, before, after: before, saved: 0, note: 'animated-skip' };
    }

    let pipeline = sharp(input, { animated: false }).rotate();

    if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: 76, effort: 5, smartSubsample: true });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 8 });
    } else {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true });
    }

    const output = await pipeline.toBuffer();
    return { file, ...writeBufferIfSmaller(file, output), note: ext.slice(1) };
  } catch (error) {
    console.warn(
      `[media-opt] SKIP image: ${path.relative(ROOT, file)} (${error?.code || error?.message || 'UNKNOWN'})`
    );
    return { file, before, after: before, saved: 0, note: 'image-error-skip' };
  }
}

function ffmpegOptimize(file, type) {
  const before = fs.statSync(file).size;

  if (!FFMPEG) {
    return Promise.resolve({
      file,
      before,
      after: before,
      saved: 0,
      note: 'ffmpeg-unavailable',
    });
  }

  const ext = path.extname(file).toLowerCase();
  const temp = tempName(file);
  safeRemove(temp);

  let args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-map_metadata', '-1'];

  if (type === 'audio') {
    args.push('-vn');

    if (ext === '.m4a' || ext === '.aac') {
      args.push('-c:a', 'aac', '-b:a', '72k');
    } else if (ext === '.mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', '80k');
    } else {
      return Promise.resolve(null);
    }
  } else {
    args.push('-an');

    if (ext === '.webm') {
      args.push(
        '-c:v', 'libvpx-vp9',
        '-crf', '36',
        '-b:v', '0',
        '-row-mt', '1',
        '-threads', '2'
      );
    } else if (ext === '.mp4') {
      args.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '30',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-threads', '2'
      );
    } else {
      return Promise.resolve(null);
    }
  }

  args.push(temp);

  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: 'ignore' });

    child.on('error', () => {
      safeRemove(temp);
      resolve({ file, before, after: before, saved: 0, note: 'ffmpeg-error' });
    });

    child.on('exit', (code) => {
      if (code !== 0 || !fs.existsSync(temp)) {
        safeRemove(temp);
        resolve({ file, before, after: before, saved: 0, note: 'ffmpeg-failed' });
        return;
      }

      resolve({ file, ...replaceTempIfSmaller(file, temp), note: type });
    });
  });
}

async function pool(items, worker, concurrency = 3) {
  let i = 0;
  const out = [];

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      async () => {
        while (true) {
          const idx = i++;
          if (idx >= items.length) return;
          out[idx] = await worker(items[idx]);
        }
      }
    )
  );

  return out.filter(Boolean);
}

// Nettoyage des temporaires laissés par une exécution interrompue.
for (const stale of walk(DIST).filter((f) => f.includes('.mss-opt.tmp.'))) {
  safeRemove(stale);
}

const all = walk(DIST);
const images = all.filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
const audio = all.filter(
  (f) => /\.(m4a|aac|mp3)$/i.test(f) && fs.statSync(f).size >= MIN_AUDIO
);
const video = all.filter(
  (f) => /\.(mp4|webm)$/i.test(f) && fs.statSync(f).size >= MIN_VIDEO
);

console.log(
  `Android local media optimizer: ${images.length} images, ${audio.length} audios, ${video.length} vidéos à examiner.`
);

const results = [
  ...(await pool(images, optimizeImage, 2)),
  ...(await pool(audio, (f) => ffmpegOptimize(f, 'audio'), 2)),
  ...(await pool(video, (f) => ffmpegOptimize(f, 'video'), 1)),
];

const saved = results.reduce((n, r) => n + (r.saved || 0), 0);
const before = results.reduce((n, r) => n + (r.before || 0), 0);
const after = results.reduce((n, r) => n + (r.after || 0), 0);

const compact = results
  .filter((r) => r.saved > 0)
  .sort((a, b) => b.saved - a.saved)
  .map((r) => ({
    file: path.relative(ROOT, r.file).split(path.sep).join('/'),
    before: r.before,
    after: r.after,
    saved: r.saved,
    note: r.note,
  }));

const skipped = results
  .filter((r) => String(r.note || '').includes('skip') && !r.saved)
  .map((r) => ({
    file: path.relative(ROOT, r.file).split(path.sep).join('/'),
    note: r.note,
  }));

fs.writeFileSync(
  REPORT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ffmpeg: FFMPEG,
      before,
      after,
      saved,
      optimizedCount: compact.length,
      skippedCount: skipped.length,
      files: compact,
      skipped,
    },
    null,
    2
  )
);

console.log(
  `Android local media optimizer: ${compact.length} fichiers allégés, ${mb(saved)} MB économisés, ${skipped.length} ignorés.`
);

for (const row of compact.slice(0, 20)) {
  console.log(` - ${mb(row.saved)} MB  ${row.file}`);
}

console.log(`Rapport: ${path.relative(ROOT, REPORT)}`);
