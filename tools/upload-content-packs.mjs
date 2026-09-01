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

// IMPORTANT Windows/Node 25:
// Do not spawn npx.cmd directly. .cmd launch semantics changed across Node/Windows
// combinations and can return status=null/ERROR_EINVAL without ever starting Wrangler.
// Invoke Wrangler's JS entry point with the current Node executable instead.
const wranglerCliCandidates = [
  path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.mjs'),
];
const wranglerCli = wranglerCliCandidates.find((candidate) => fs.existsSync(candidate));
const onlineConfig = path.join(root, 'wrangler.online.toml');

if (!wranglerCli && !dryRun) {
  throw new Error('Wrangler local introuvable. Lance d\'abord: npm install');
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
    '.m4a':'audio/mp4', '.mp4':'video/mp4', '.webm':'video/webm', '.opus':'audio/ogg', '.bvh':'text/plain',
    '.json':'application/json', '.svg':'image/svg+xml',
  })[ext] || 'application/octet-stream';
}

function quote(value) {
  const text = String(value);
  return /\s/.test(text) ? JSON.stringify(text) : text;
}

function runWrangler(args, label) {
  const fullArgs = [wranglerCli, ...args];
  if (dryRun) {
    console.log('node', fullArgs.map(quote).join(' '));
    return;
  }

  const res = spawnSync(process.execPath, fullArgs, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
    windowsHide: false,
  });

  if (res.error) {
    throw new Error(`${label} — impossible de lancer Wrangler: ${res.error.message}`);
  }
  if (res.signal) {
    throw new Error(`${label} — Wrangler interrompu par le signal ${res.signal}`);
  }
  if (res.status !== 0) {
    throw new Error(`${label} — Wrangler a quitté avec le code ${String(res.status)}`);
  }
}

function commonRemoteArgs() {
  const args = ['--remote'];
  // This config contains the Cloudflare account_id and the existing dart-scans R2 binding.
  // Supplying it removes ambiguity when another wrangler.toml exists for Pages/user-data.
  if (fs.existsSync(onlineConfig)) args.push('--config', onlineConfig);
  return args;
}

function put(key, file, immutable = true) {
  const args = [
    'r2', 'object', 'put', `${bucket}/${key}`,
    '--file', file,
    '--content-type', contentType(file),
    '--cache-control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    '--force',
    ...commonRemoteArgs(),
  ];
  runWrangler(args, `Upload failed: ${key}`);
}

if (!fs.existsSync(out)) throw new Error(`Missing ${out}; run npm run content-packs:prepare first.`);
const packs = fs.readdirSync(out)
  .filter((name) => fs.statSync(path.join(out, name)).isDirectory())
  .filter((name) => !only || only.has(name))
  .sort();
if (!packs.length) throw new Error('No content pack selected.');

console.log(`R2 bucket: ${bucket}`);
console.log(`R2 prefix: ${prefix}`);
if (fs.existsSync(onlineConfig)) console.log('Cloudflare config: wrangler.online.toml');

// Fast authentication/account preflight. If Cloudflare auth is missing, this now prints
// Wrangler's real message instead of the previous generic "Upload failed" exception.
if (!dryRun) {
  runWrangler(['whoami', ...(fs.existsSync(onlineConfig) ? ['--config', onlineConfig] : [])], 'Cloudflare authentication check failed');
}

for (const pack of packs) {
  const dir = path.join(out, pack);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}; run npm run content-packs:prepare first.`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = String(manifest.version || '').trim();
  if (!version) throw new Error(`Missing version in ${manifestPath}`);

  console.log(`\nUploading ${pack} @ ${version} (${manifest.files.length} files)`);
  let done = 0;
  for (const item of manifest.files) {
    const rel = String(item.path || '').replace(/^\/+/, '');
    const file = path.join(dir, ...rel.split('/'));
    if (!fs.existsSync(file)) throw new Error(`Missing pack file: ${file}`);
    put(`${prefix}/${pack}/${version}/${rel}`, file, true);
    done += 1;
    console.log(`  [${done}/${manifest.files.length}] ${rel}`);
  }
  put(`${prefix}/${pack}/${version}/manifest.json`, manifestPath, false);
  console.log(`OK ${pack} @ ${version}`);
}
console.log(dryRun ? '\nDry run complete.' : '\nContent packs uploaded successfully.');
