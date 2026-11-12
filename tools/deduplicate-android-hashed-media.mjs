import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Lossless, Android-only deduplication of exact copies of Vite-generated media.
// It never removes public/ assets (which may be addressed by dynamic filenames).
const HASHED_MEDIA = /-[A-Za-z0-9_-]{8}\.(?:png|jpe?g|webp|avif|gif|mp3|m4a|ogg|wav|mp4|webm)$/i;
const TEXT_PATTERN = /\.(?:html|js|mjs|cjs|css|json|webmanifest|xml|svg|map)$/i;
const RUNTIME_TEXT_PATTERN = /\.(?:html|js|mjs|cjs|css|json|webmanifest|xml|svg)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  return result;
}

export function deduplicateAndroidHashedMedia({ dist, minBytes = 16 * 1024 } = {}) {
  if (!dist || !fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error('Android media dedupe: dist/index.html introuvable');
  }
  const assetsDir = path.join(dist, 'assets');
  const candidateFiles = walk(assetsDir).filter(file =>
    HASHED_MEDIA.test(path.basename(file)) && fs.statSync(file).size >= minBytes);
  const textHolders = walk(dist).filter(file => TEXT_PATTERN.test(file))
    .map(file => ({ file, text: fs.readFileSync(file, 'utf8') }));
  const live = textHolders.filter(({ file }) => RUNTIME_TEXT_PATTERN.test(file));
  const hashes = new Map();

  for (const file of candidateFiles) {
    const ext = path.extname(file).toLowerCase();
    const body = fs.readFileSync(file);
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    const key = ext + ':' + body.length + ':' + hash;
    const siblings = hashes.get(key) || [];
    siblings.push(file);
    hashes.set(key, siblings);
  }

  const replacement = new Map();
  let savedBytes = 0;
  for (const group of hashes.values()) {
    if (group.length < 2) continue;
    // Maintain the filename of whichever asset is first in the bundle.
    // Only exact byte-identical media is eligible; visual similarity is irrelevant.
    const eligible = group.filter(file =>
      live.some(({ text }) => text.includes(path.basename(file))));
    if (eligible.length < 2) continue;
    eligible.sort();
    const canonical = eligible[0];
    const canonicalName = path.basename(canonical);
    for (const duplicate of eligible.slice(1)) {
      const name = path.basename(duplicate);
      if (name === canonicalName) continue;
      replacement.set(name, { to: canonicalName, file: duplicate });
      savedBytes += fs.statSync(duplicate).size;
    }
  }

  if (replacement.size) {
    const changed = textHolders.map(({ file, text }) => {
      let next = text;
      for (const [oldName, data] of replacement) next = next.split(oldName).join(data.to);
      return { file, text, next };
    });
    for (const { file, text, next } of changed) {
      if (next !== text) fs.writeFileSync(file, next);
    }
    for (const { file } of changed) {
      const next = fs.readFileSync(file, 'utf8');
      for (const oldName of replacement.keys()) {
        if (next.includes(oldName)) throw new Error('Référence dupliquée non réécrite: ' + oldName);
      }
    }
    for (const { file } of replacement.values()) fs.rmSync(file);
  }

  console.log('[android-dedupe] ' + replacement.size + ' médias identiques regroupés, ' +
    (savedBytes / 1048576).toFixed(2) + ' Mo économisés sans aucune perte de qualité.');
  return { examined: candidateFiles.length, grouped: replacement.size, savedBytes };
}
