import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Android post-build only: do not change source WAV files or web deployment.
// This is a conservative pass for WAVs whose *compiled* references can be rewritten.
const TEXT_PATTERN = /\.(?:html|js|mjs|cjs|css|json|webmanifest|svg|xml|map)$/i;
const LIVE_PATTERN = /\.(?:html|js|mjs|cjs|css|json|webmanifest|svg|xml)$/i;

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const p = stack.pop();
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  return files;
}

export function convertAndroidReferencedWav({
  dist,
  minBytes = 256 * 1024,
  bitrate = '128k',
  minSavingFraction = 0.5,
} = {}) {
  if (!dist || !fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error('Android WAV packaging: dist/index.html introuvable');
  }
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status !== 0) {
    console.warn('[android-wav] ffmpeg indisponible : aucun WAV modifié');
    return { eligible: 0, converted: 0, savedBytes: 0, missingFfmpeg: true };
  }
  const files = listFiles(dist);
  const texts = files.filter((f) => TEXT_PATTERN.test(f))
    .map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
  const activeTexts = texts.filter((entry) => LIVE_PATTERN.test(entry.file));
  const wavs = files.filter((f) => f.toLowerCase().endsWith('.wav') &&
    fs.statSync(f).size >= minBytes);
  const conversions = [];
  let untouched = 0;

  for (const file of wavs) {
    const relative = path.relative(dist, file).split(path.sep).join('/');
    const mp3Path = file.replace(/\.wav$/i, '.mp3');
    const mp3Relative = relative.replace(/\.wav$/i, '.mp3');
    if (fs.existsSync(mp3Path) || !activeTexts.some(({ text }) => text.includes(relative))) {
      untouched++;
      continue;
    }
    const before = fs.statSync(file).size;
    const temp = mp3Path + '.mss-tmp.mp3';
    try {
      if (fs.existsSync(temp)) fs.rmSync(temp);
      const proc = spawnSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', file,
        '-vn', '-map_metadata', '-1', '-c:a', 'libmp3lame',
        '-b:a', bitrate, '-write_xing', '1', temp,
      ], { encoding: 'utf8', timeout: 60000 });
      if (proc.status !== 0 || !fs.existsSync(temp)) {
        console.warn('[android-wav] SKIP ffmpeg: ' + relative + ' ' + (proc.stderr || ''));
        untouched++;
        continue;
      }
      const after = fs.statSync(temp).size;
      if (after <= 0 || after > before * (1 - minSavingFraction)) {
        untouched++;
        continue;
      }
      // Verify that ffprobe can read the generated MP3 before publishing it.
      const valid = spawnSync('ffprobe', [
        '-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1', temp,
      ], { encoding: 'utf8', timeout: 30000 });
      if (valid.status !== 0 || valid.stdout.trim() !== 'mp3') {
        untouched++;
        continue;
      }
      fs.renameSync(temp, mp3Path);
      conversions.push({ file, mp3Path, relative, mp3Relative, saved: before - after });
    } finally {
      if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
    }
  }

  // A compiled reference must point to a real offline MP3 before the WAV is removed.
  const staged = texts.map((entry) => {
    let next = entry.text;
    for (const c of conversions) next = next.split(c.relative).join(c.mp3Relative);
    return { ...entry, next };
  });
  for (const entry of staged) {
    if (entry.next !== entry.text) fs.writeFileSync(entry.file, entry.next);
  }
  for (const entry of staged) {
    const written = fs.readFileSync(entry.file, 'utf8');
    for (const c of conversions) {
      if (written.includes(c.relative)) {
        throw new Error('Référence WAV résiduelle : ' + c.relative);
      }
    }
  }
  for (const c of conversions) {
    if (!fs.existsSync(c.mp3Path)) throw new Error('MP3 introuvable : ' + c.mp3Relative);
    fs.rmSync(c.file);
  }
  const savedBytes = conversions.reduce((sum, item) => sum + item.saved, 0);
  console.log('[android-wav] ' + conversions.length + '/' + wavs.length +
    ' fichiers WAV convertis en MP3; ' + (savedBytes / 1048576).toFixed(2) +
    ' Mo économisés ; ' + untouched + ' conservés.');
  return { eligible: wavs.length, converted: conversions.length, savedBytes, untouched };
}
