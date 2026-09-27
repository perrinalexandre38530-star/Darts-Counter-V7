import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = [
  path.join(root, 'src', 'assets', 'wave61'),
  path.join(root, 'public', 'wave61'),
  path.join(root, 'public', 'assets', 'wave61'),
];
const maxTotalMb = Number(process.env.MSS_WAVE61_LOCAL_MAX_MB || 2);
const maxFileKb = Number(process.env.MSS_WAVE61_LOCAL_FILE_MAX_KB || 350);
const files = [];

for (const base of roots) {
  if (!fs.existsSync(base)) continue;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) stack.push(full);
      else files.push({ full, bytes: st.size });
    }
  }
}

const total = files.reduce((sum, file) => sum + file.bytes, 0);
const totalMb = total / 1024 / 1024;
const oversize = files.filter((file) => file.bytes > maxFileKb * 1024);
console.log(`Wave61 médias locaux: ${totalMb.toFixed(2)} MB / ${maxTotalMb} MB max`);
if (!files.length) console.log('✅ Aucun média Wave61 lourd embarqué : code-only + futurs Content Packs/R2.');
if (oversize.length) {
  console.error(`❌ ${oversize.length} fichier(s) Wave61 dépassent ${maxFileKb} KB.`);
  for (const file of oversize) console.error(` - ${(file.bytes / 1024).toFixed(0)} KB ${path.relative(root, file.full)}`);
  process.exit(1);
}
if (totalMb > maxTotalMb) {
  console.error(`❌ Budget Wave61 local dépassé: ${totalMb.toFixed(2)} MB > ${maxTotalMb} MB.`);
  console.error('Déplacer les tickers, fonds, voix et animations vers les Content Packs Cloudflare/R2.');
  process.exit(1);
}
console.log('✅ Budget local Wave61 respecté.');
