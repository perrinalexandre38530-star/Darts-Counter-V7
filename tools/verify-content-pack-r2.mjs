import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((x) => x.trim()).filter(Boolean) : ['fit-awena'];
const base = String(process.env.MSS_CONTENT_PACK_PUBLIC_URL || process.env.VITE_CONTENT_PACK_BASE_URL || 'https://mss-content-packs.perrin-alexandre38530.workers.dev/mss-content-packs/v1').replace(/\/+$/, '');

let failures = 0;
for (const pack of only) {
  const manifestPath = path.join(root, 'content-packs-dist', pack, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest local absent: ${manifestPath}`);
  const local = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const url = `${base}/${encodeURIComponent(pack)}/${encodeURIComponent(local.version)}/manifest.json?verify=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) {
    failures += 1;
    console.error(`FAIL ${pack} @ ${local.version}: HTTP ${response.status} ${url}`);
    continue;
  }
  const remote = await response.json();
  const sameVersion = String(remote?.version || '') === String(local.version);
  const sameCount = Array.isArray(remote?.files) && remote.files.length === local.files.length;
  if (!sameVersion || !sameCount) {
    failures += 1;
    console.error(`FAIL ${pack}: manifest public incoherent (remote=${remote?.version}, files=${remote?.files?.length}; local=${local.version}, files=${local.files.length})`);
    continue;
  }
  console.log(`OK ${pack} @ ${local.version} — ${local.files.length} fichiers visibles via le Worker`);
}
if (failures) {
  console.error('\nLe Worker public ne voit pas la version envoyée. Vérifie son binding R2 CONTENT_PACKS -> dart-scans, puis déploie: npm run deploy:content-packs-worker');
  process.exit(1);
}
