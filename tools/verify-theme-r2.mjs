import fs from 'node:fs';

const GENERATED_TS = 'src/lib/contentPackCatalog.generated.ts';
const BASE_URL = String(process.env.MSS_CONTENT_PACK_PUBLIC_URL || process.env.VITE_CONTENT_PACK_BASE_URL || 'https://mss-content-packs.perrin-alexandre38530.workers.dev/mss-content-packs/v1').replace(/\/+$/, '');
const CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.MSS_R2_VERIFY_CONCURRENCY || 8)));

function readCatalog() {
  const source = fs.readFileSync(GENERATED_TS, 'utf8');
  const prefix = 'export const CONTENT_PACK_CATALOG = ';
  const start = source.indexOf(prefix);
  const end = source.lastIndexOf(' as const;');
  return JSON.parse(source.slice(start + prefix.length, end));
}
function encPath(value) { return String(value).split('/').filter(Boolean).map(encodeURIComponent).join('/'); }
async function checkUrl(url, expectedBytes) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let res = await fetch(url, { method: 'HEAD', cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: 'GET', cache: 'no-store', headers: { Range: 'bytes=0-0', 'cache-control': 'no-cache' } });
        try { await res.body?.cancel(); } catch {}
      }
      if (res.ok) {
        const len = Number(res.headers.get('content-length') || 0);
        if (expectedBytes && len && res.status !== 206 && len !== Number(expectedBytes)) {
          throw new Error(`content-length ${len} != ${expectedBytes}`);
        }
        return;
      }
      last = new Error(`HTTP ${res.status}`);
    } catch (error) { last = error; }
    await new Promise((r) => setTimeout(r, 350 * attempt));
  }
  throw last || new Error('verification impossible');
}

const pack = readCatalog()['theme-textures'];
if (!pack) throw new Error('theme-textures absent du catalogue');
if ((pack.files || []).length < 110) throw new Error(`Catalogue theme incomplet: ${pack.files?.length || 0} fichiers.`);
const version = encodeURIComponent(pack.version);
const base = `${BASE_URL}/theme-textures/${version}`;

const manifestRes = await fetch(`${base}/manifest.json`, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
if (!manifestRes.ok) throw new Error(`Manifest R2 inaccessible: HTTP ${manifestRes.status}`);
const remoteManifest = await manifestRes.json();
const remotePaths = new Set((remoteManifest.files || []).map((x) => x.path));
const missingInManifest = pack.files.filter((x) => !remotePaths.has(x.path));
if (missingInManifest.length) throw new Error(`Manifest R2 incomplet: ${missingInManifest.length} fichier(s) absents.`);

let cursor = 0;
const failures = [];
const workers = Array.from({ length: Math.min(CONCURRENCY, pack.files.length) }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= pack.files.length) return;
    const item = pack.files[index];
    const url = `${base}/${encPath(item.path)}`;
    try {
      await checkUrl(url, item.bytes);
      if ((index + 1) % 10 === 0 || index + 1 === pack.files.length) console.log(`R2 verify ${index + 1}/${pack.files.length}`);
    } catch (error) {
      failures.push(`${item.path}: ${error?.message || error}`);
    }
  }
});
await Promise.all(workers);

if (failures.length) {
  console.error(`\nECHEC R2: ${failures.length} objet(s) manquant(s)/invalides:`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`\nOK R2 - ${pack.files.length}/${pack.files.length} textures accessibles via le Worker.`);
console.log(`Version validee: ${pack.version}`);
