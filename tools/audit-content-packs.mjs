import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'content-packs-dist');
if (!fs.existsSync(out)) throw new Error(`Missing ${out}; run npm run content-packs:prepare first.`);
const ids = fs.readdirSync(out).filter((id) => fs.existsSync(path.join(out, id, 'manifest.json'))).sort();
if (!ids.length) throw new Error('No content pack manifests found.');

let total = 0;
for (const id of ids) {
  const manifestPath = path.join(out, id, 'manifest.json');
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const seen = new Set();
  let actualBytes = 0;
  for (const file of m.files || []) {
    if (!file.path || seen.has(file.path)) throw new Error(`${id}: duplicate/invalid path ${file.path}`);
    seen.add(file.path);
    const absolute = path.join(out, id, ...String(file.path).split('/'));
    if (!fs.existsSync(absolute)) throw new Error(`${id}: missing ${file.path}`);
    const statBytes = fs.statSync(absolute).size;
    if (statBytes !== Number(file.bytes)) throw new Error(`${id}: byte mismatch ${file.path}`);
    actualBytes += statBytes;
  }
  if (actualBytes !== Number(m.totalBytes || 0)) throw new Error(`${id}: total byte mismatch`);
  total += actualBytes;
  console.log(`${id}: ${m.files.length} files / ${(actualBytes / 1024 / 1024).toFixed(2)} MB / version ${m.version}`);
}
console.log(`TOTAL remote payload: ${(total / 1024 / 1024).toFixed(2)} MB`);
