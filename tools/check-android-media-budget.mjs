import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const TOTAL_MAX_MB = Number(process.env.MSS_ANDROID_LOCAL_MEDIA_MAX_MB || 28);
const FILE_MAX_MB = Number(process.env.MSS_ANDROID_LOCAL_MEDIA_FILE_MAX_MB || 6);
const MEDIA = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|m4a|aac|mp3|wav|ogg)$/i;
if (!fs.existsSync(DIST)) throw new Error('dist/ introuvable.');
const files = [];
const stack = [DIST];
while (stack.length) {
  const dir = stack.pop();
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name); const st = fs.statSync(full);
    if (st.isDirectory()) stack.push(full);
    else if (MEDIA.test(name)) files.push({ full, bytes: st.size });
  }
}
files.sort((a, b) => b.bytes - a.bytes);
const total = files.reduce((n, f) => n + f.bytes, 0);
const totalMb = total / 1024 / 1024;
const oversize = files.filter((f) => f.bytes > FILE_MAX_MB * 1024 * 1024);
console.log(`Médias locaux Android dist/: ${totalMb.toFixed(2)} MB / budget ${TOTAL_MAX_MB} MB`);
console.log(`Plus gros média autorisé: ${FILE_MAX_MB} MB`);
for (const f of files.slice(0, 15)) console.log(`${(f.bytes/1024/1024).toFixed(2).padStart(7)} MB  ${path.relative(ROOT, f.full).split(path.sep).join('/')}`);
if (oversize.length || totalMb > TOTAL_MAX_MB) {
  console.error('\n❌ BUDGET MÉDIA ANDROID DÉPASSÉ.');
  if (oversize.length) console.error(`Fichiers > ${FILE_MAX_MB} MB: ${oversize.length}`);
  if (totalMb > TOTAL_MAX_MB) console.error(`Total: ${totalMb.toFixed(2)} MB > ${TOTAL_MAX_MB} MB.`);
  console.error('Déplace ces médias vers un Content Pack Cloudflare au lieu de grossir le module de base.');
  process.exit(1);
}
console.log('✅ Budget médias locaux Android OK');
