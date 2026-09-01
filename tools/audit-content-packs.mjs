import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'content-packs-dist');
const ids = ['fit-awena', 'navigation-music', 'collectible-cards'];
let total = 0;
for (const id of ids) {
  const manifestPath = path.join(out, id, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}; run npm run content-packs:prepare first.`);
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  total += Number(m.totalBytes || 0);
  console.log(`${id}: ${m.files.length} files / ${(m.totalBytes / 1024 / 1024).toFixed(2)} MB / version ${m.version}`);
}
console.log(`TOTAL remote payload: ${(total / 1024 / 1024).toFixed(2)} MB`);
