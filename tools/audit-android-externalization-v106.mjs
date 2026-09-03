import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const MEDIA = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|m4a|aac|mp3|wav|ogg)$/i;
if (!fs.existsSync(DIST)) throw new Error('dist/ introuvable. Lance npm run build puis android:strip-content-packs avant cet audit.');

const rows = [];
const stack = [DIST];
while (stack.length) {
  const dir = stack.pop();
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) stack.push(full);
    else if (MEDIA.test(name)) rows.push({ file: path.relative(DIST, full).split(path.sep).join('/'), bytes: st.size });
  }
}
rows.sort((a, b) => b.bytes - a.bytes);
const total = rows.reduce((n, x) => n + x.bytes, 0);
console.log(`Medias encore locaux dans dist/: ${(total / 1024 / 1024).toFixed(2)} MB`);
console.log('Top 40 a traiter lors de la prochaine vague d\'externalisation:');
for (const row of rows.slice(0, 40)) console.log(`${(row.bytes / 1024 / 1024).toFixed(2).padStart(7)} MB  ${row.file}`);
console.log('\nAudit uniquement: aucun fichier n\'a ete supprime ou deplace.');
