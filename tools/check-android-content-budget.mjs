import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const aab = path.join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const maxMb = Number(process.env.MSS_AAB_MAX_MB || 490);
const maxBytes = maxMb * 1024 * 1024;

if (!fs.existsSync(aab)) throw new Error(`AAB introuvable: ${aab}`);
const size = fs.statSync(aab).size;
const mb = size / 1024 / 1024;
console.log(`AAB: ${mb.toFixed(2)} MB / garde-fou ${maxMb} MB`);
if (size > maxBytes) {
  console.error(`\n❌ AAB trop lourd: ${mb.toFixed(2)} MB > ${maxMb} MB.`);
  console.error('Les nouveaux médias lourds doivent être déplacés vers les content packs Cloudflare.');
  process.exit(1);
}
console.log('✅ Budget Android OK');
