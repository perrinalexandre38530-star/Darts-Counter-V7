import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = path.join(root, 'content-packs-dist');
const bucket = process.env.MSS_CONTENT_PACK_BUCKET || 'dart-scans';
const prefix = (process.env.MSS_CONTENT_PACK_PREFIX || 'mss-content-packs/v1').replace(/^\/+|\/+$/g, '');
const dryRun = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((x) => x.trim()).filter(Boolean)) : null;

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
    '.m4a':'audio/mp4', '.mp4':'video/mp4', '.webm':'video/webm', '.bvh':'text/plain',
    '.json':'application/json', '.svg':'image/svg+xml',
  })[ext] || 'application/octet-stream';
}

function put(key, file, immutable = true) {
  const args = [
    'wrangler', 'r2', 'object', 'put', `${bucket}/${key}`,
    '--file', file,
    '--content-type', contentType(file),
    '--cache-control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    '--remote',
  ];
  if (dryRun) { console.log('npx', args.map((x) => /\s/.test(x) ? JSON.stringify(x) : x).join(' ')); return; }
  const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', cwd: root });
  if (res.status !== 0) throw new Error(`Upload failed: ${key}`);
}

if (!fs.existsSync(out)) throw new Error(`Missing ${out}; run npm run content-packs:prepare first.`);
const packs = fs.readdirSync(out)
  .filter((name) => fs.statSync(path.join(out, name)).isDirectory())
  .filter((name) => !only || only.has(name))
  .sort();
if (!packs.length) throw new Error('No content pack selected.');

for (const pack of packs) {
  const dir = path.join(out, pack);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}; run npm run content-packs:prepare first.`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = String(manifest.version || '').trim();
  if (!version) throw new Error(`Missing version in ${manifestPath}`);

  console.log(`\nUploading ${pack} @ ${version}`);
  for (const item of manifest.files) {
    const rel = String(item.path || '').replace(/^\/+/, '');
    const file = path.join(dir, ...rel.split('/'));
    if (!fs.existsSync(file)) throw new Error(`Missing pack file: ${file}`);
    put(`${prefix}/${pack}/${version}/${rel}`, file, true);
  }
  // Manifest is useful for diagnostics and future clients, but is deliberately short-lived.
  put(`${prefix}/${pack}/${version}/manifest.json`, manifestPath, false);
}
console.log(dryRun ? '\nDry run complete.' : '\nContent packs uploaded.');
