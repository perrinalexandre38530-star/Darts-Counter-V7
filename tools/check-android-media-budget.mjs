import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

// 28 MB reste notre OBJECTIF d'architecture à terme, mais ce n'est pas un
// seuil réaliste pour bloquer aujourd'hui une application multisports déjà
// très riche en médias. Le garde-fou dur est donc séparé de l'objectif.
const TARGET_MB = Number(process.env.MSS_ANDROID_LOCAL_MEDIA_TARGET_MB || 28);
const HARD_MAX_MB = Number(process.env.MSS_ANDROID_LOCAL_MEDIA_MAX_MB || 200);
const FILE_MAX_MB = Number(process.env.MSS_ANDROID_LOCAL_MEDIA_FILE_MAX_MB || 6);

const MEDIA = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|m4a|aac|mp3|wav|ogg)$/i;

if (!fs.existsSync(DIST)) throw new Error('dist/ introuvable.');

const files = [];
const stack = [DIST];

while (stack.length) {
  const dir = stack.pop();
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) stack.push(full);
    else if (MEDIA.test(name)) files.push({ full, bytes: st.size });
  }
}

files.sort((a, b) => b.bytes - a.bytes);

const total = files.reduce((n, f) => n + f.bytes, 0);
const totalMb = total / 1024 / 1024;
const oversize = files.filter((f) => f.bytes > FILE_MAX_MB * 1024 * 1024);

console.log(`Médias locaux Android dist/: ${totalMb.toFixed(2)} MB`);
console.log(`Objectif Content Packs à terme: ${TARGET_MB} MB`);
console.log(`Garde-fou dur actuel: ${HARD_MAX_MB} MB`);
console.log(`Plus gros média autorisé: ${FILE_MAX_MB} MB`);

for (const f of files.slice(0, 15)) {
  console.log(
    `${(f.bytes / 1024 / 1024).toFixed(2).padStart(7)} MB  ${path.relative(ROOT, f.full).split(path.sep).join('/')}`
  );
}

if (oversize.length) {
  console.error(`\n❌ ${oversize.length} fichier(s) dépassent ${FILE_MAX_MB} MB.`);
  console.error('Ces fichiers doivent être compressés ou déplacés vers un Content Pack Cloudflare.');
  process.exit(1);
}

if (totalMb > HARD_MAX_MB) {
  console.error(`\n❌ GARDE-FOU MÉDIA ANDROID DÉPASSÉ.`);
  console.error(`Total: ${totalMb.toFixed(2)} MB > ${HARD_MAX_MB} MB.`);
  console.error('Il faut externaliser une nouvelle vague de médias avant de poursuivre.');
  process.exit(1);
}

if (totalMb > TARGET_MB) {
  console.warn(`\n⚠️ Objectif Content Packs non encore atteint: ${totalMb.toFixed(2)} MB > ${TARGET_MB} MB.`);
  console.warn('Le build reste autorisé : nous poursuivons l’externalisation par étapes sans casser les médias existants.');
  console.warn('La validation finale reste la taille réelle de l’AAB Google Play.');
} else {
  console.log(`\n✅ Objectif médias locaux atteint (${totalMb.toFixed(2)} MB <= ${TARGET_MB} MB).`);
}

console.log('✅ Budget médias locaux Android autorisé');
