import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
sharp.cache(false);

// Exclusively Android's already-built dist/. Source assets and the web build stay unchanged.
// Vite-generated files end with a deterministic 8-character hash, e.g. panel-aBc123_X.png.
const HASHED_PNG = /-[a-zA-Z0-9_-]{8}\.png$/;
const TEXT_FILES = /\.(?:html|js|mjs|cjs|css|json|webmanifest|svg|xml|txt|map)$/i;
const LIVE_TEXT = /\.(?:html|js|mjs|cjs|css|json|webmanifest|svg|xml)$/i;

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const item = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(item);
      else if (entry.isFile()) files.push(item);
    }
  }
  return files;
}

function perceptualCheck(original, webp, minPsnrDb) {
  return Promise.all([
    sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]).then(([before, after]) => {
    if (before.info.width !== after.info.width ||
        before.info.height !== after.info.height ||
        before.info.channels !== 4 || after.info.channels !== 4) return false;

    const a = before.data;
    const b = after.data;
    let error = 0;
    let alphaChanged = 0;
    let n = 0;
    // Sample evenly, including transparency. Compare against a white background as
    // well as against black to protect antialiased edges and real pixels.
    const stride = Math.max(1, Math.floor(before.info.width * before.info.height / 150000));
    for (let p = 0; p < before.info.width * before.info.height; p += stride) {
      const i = p * 4;
      if (Math.abs(a[i + 3] - b[i + 3]) > 6) alphaChanged++;
      for (let c = 0; c < 3; c++) {
        const blackA = a[i + c] * a[i + 3] / 255;
        const blackB = b[i + c] * b[i + 3] / 255;
        const d = blackA - blackB;
        error += d * d;
      }
      n++;
    }
    if (!n || alphaChanged > Math.max(1, n * 0.002)) return false;
    const mse = error / (n * 3);
    const psnr = mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
    return psnr >= minPsnrDb;
  });
}

export async function convertAndroidGeneratedPng({
  dist,
  quality = 88,
  minBytes = 96 * 1024,
  minSavingBytes = 24 * 1024,
  minSavingFraction = 0.25,
  minPsnrDb = 36,
} = {}) {
  if (!dist || !fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error('Android WebP packaging: dist/index.html introuvable');
  }
  const assetsDir = path.join(dist, 'assets');
  const allFiles = walk(dist);
  // Only rewrite references emitted in the actual built bundle. A source map
  // alone is NOT evidence that an asset is needed at runtime.
  const textFiles = allFiles.filter((file) => TEXT_FILES.test(file));
  const texts = textFiles.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
  const liveTexts = texts.filter(({ file }) => LIVE_TEXT.test(file));

  const pngFiles = allFiles.filter((file) =>
    file.startsWith(assetsDir + path.sep) &&
    HASHED_PNG.test(path.basename(file)) &&
    fs.statSync(file).size >= minBytes
  );
  const replacements = new Map();
  const staged = [];
  const stats = { eligible: pngFiles.length, converted: 0, savedBytes: 0, untouched: 0 };

  for (const file of pngFiles) {
    const oldName = path.basename(file);
    const newName = oldName.slice(0, -4) + '.webp';
    const newPath = path.join(path.dirname(file), newName);
    if (fs.existsSync(newPath) || !liveTexts.some(({ text }) => text.includes(oldName))) {
      stats.untouched++;
      continue;
    }
    const input = fs.readFileSync(file);
    const metadata = await sharp(input, { animated: true }).metadata();
    if ((metadata.pages || 1) > 1) {
      stats.untouched++;
      continue;
    }
    const output = await sharp(input)
      .webp({ quality, effort: 5, alphaQuality: 100, smartSubsample: true })
      .toBuffer();
    const saved = input.length - output.length;
    if (saved < minSavingBytes || saved < input.length * minSavingFraction ||
        !(await perceptualCheck(input, output, minPsnrDb))) {
      stats.untouched++;
      continue;
    }
    // Both formats decode in Android WebView. Only the encoded format and the
    // bundle references change; the source PNG and original web site do not.
    fs.writeFileSync(newPath, output);
    staged.push({ oldPath: file, newPath, saved });
    replacements.set(oldName, newName);
  }

  if (replacements.size) {
    // Stage and rewrite all compiled reference holders, including .map files.
    // The original files are removed only after every rewrite has succeeded.
    for (const entry of texts) {
      let updated = entry.text;
      for (const [oldName, newName] of replacements) {
        if (updated.includes(oldName)) updated = updated.split(oldName).join(newName);
      }
      if (updated !== entry.text) fs.writeFileSync(entry.file, updated);
    }
    // Fail closed: never remove an original PNG if a stale reference remains.
    for (const entry of texts) {
      const updated = fs.readFileSync(entry.file, 'utf8');
      for (const oldName of replacements.keys()) {
        if (updated.includes(oldName)) throw new Error('Référence PNG non réécrite: ' + oldName);
      }
    }
    for (const file of staged) {
      if (!fs.existsSync(file.newPath)) throw new Error('WebP manquant: ' + file.newPath);
      fs.rmSync(file.oldPath);
      stats.converted++;
      stats.savedBytes += file.saved;
    }
  }

  console.log('[android-webp] ' + stats.converted + '/' + stats.eligible +
    ' images PNG Vite converties ; ' + (stats.savedBytes / 1024 / 1024).toFixed(2) +
    ' Mo économisés ; ' + stats.untouched + ' conservées.');
  return stats;
}
