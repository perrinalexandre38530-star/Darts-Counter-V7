import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceArg = process.argv.find((arg) => arg.startsWith('--source='));
const sourceRel = sourceArg ? sourceArg.slice('--source='.length).trim() : 'content-packs-dist';
const out = path.resolve(root, sourceRel || 'content-packs-dist');
if (out !== root && !out.startsWith(root + path.sep)) throw new Error('Content-pack source must stay inside the project directory.');
const bucket = process.env.MSS_CONTENT_PACK_BUCKET || 'dart-scans';
const prefix = (process.env.MSS_CONTENT_PACK_PREFIX || 'mss-content-packs/v1').replace(/^\/+|\/+$/g, '');
const dryRun = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((x) => x.trim()).filter(Boolean)) : null;

const onlineConfig = path.join(root, 'wrangler.online.toml');
const wranglerCliCandidates = [
  path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.mjs'),
];
const wranglerCli = wranglerCliCandidates.find((candidate) => fs.existsSync(candidate));

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
    '.m4a':'audio/mp4', '.mp4':'video/mp4', '.webm':'video/webm', '.opus':'audio/ogg', '.bvh':'text/plain',
    '.json':'application/json', '.svg':'image/svg+xml',
  })[ext] || 'application/octet-stream';
}

function parseAccountIdFromWrangler() {
  if (!fs.existsSync(onlineConfig)) return '';
  const txt = fs.readFileSync(onlineConfig, 'utf8');
  const m = txt.match(/^\s*account_id\s*=\s*["']([^"']+)["']/m);
  return m ? m[1].trim() : '';
}

const accountId = (process.env.MSS_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || parseAccountIdFromWrangler()).trim();
const accessKeyId = (process.env.MSS_R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
const secretAccessKey = (process.env.MSS_R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
const useS3 = Boolean(accountId && accessKeyId && secretAccessKey);

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}
function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function canonicalPath(bucketName, key) {
  return '/' + [bucketName, ...String(key).split('/')].map(rfc3986).join('/');
}
function amzTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

async function putS3(key, file, immutable = true) {
  const body = fs.readFileSync(file);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const pathname = canonicalPath(bucket, key);
  const url = `https://${host}${pathname}`;
  const now = new Date();
  const amzDate = amzTimestamp(now);
  const shortDate = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const type = contentType(file);
  const cacheControl = immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300';

  const canonicalHeaders = [
    `cache-control:${cacheControl}`,
    `content-type:${type}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');
  const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const kDate = hmac(Buffer.from(`AWS4${secretAccessKey}`, 'utf8'), shortDate);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  if (dryRun) {
    console.log(`S3 PUT ${bucket}/${key}`);
    return;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Cache-Control': cacheControl,
      'Content-Type': type,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1200);
    throw new Error(`R2 S3 upload failed: ${key} — HTTP ${response.status} ${response.statusText}${detail ? `\n${detail}` : ''}`);
  }
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
    stdio: 'inherit', cwd: root, env: process.env, windowsHide: false,
  });
  if (res.error) throw new Error(`${label} — impossible de lancer Wrangler: ${res.error.message}`);
  if (res.signal) throw new Error(`${label} — Wrangler interrompu par le signal ${res.signal}`);
  if (res.status !== 0) throw new Error(`${label} — Wrangler a quitté avec le code ${String(res.status)}`);
}
function commonRemoteArgs() {
  const args = ['--remote'];
  if (fs.existsSync(onlineConfig)) args.push('--config', onlineConfig);
  return args;
}
function putWrangler(key, file, immutable = true) {
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
async function put(key, file, immutable = true) {
  if (useS3) return putS3(key, file, immutable);
  return putWrangler(key, file, immutable);
}

if (!fs.existsSync(out)) throw new Error(`Missing ${out}; prepare the selected content-pack source first.`);
if (!useS3 && !wranglerCli && !dryRun) {
  throw new Error('Aucun accès R2 utilisable. Défini MSS_R2_ACCESS_KEY_ID + MSS_R2_SECRET_ACCESS_KEY, ou lance npm install pour Wrangler.');
}

console.log(`Pack source: ${path.relative(root, out) || '.'}`);
const packs = fs.readdirSync(out)
  .filter((name) => fs.statSync(path.join(out, name)).isDirectory())
  .filter((name) => !only || only.has(name))
  .sort();
if (!packs.length) throw new Error('No content pack selected.');

console.log(`R2 bucket: ${bucket}`);
console.log(`R2 prefix: ${prefix}`);
console.log(`Upload transport: ${useS3 ? 'R2 S3 API' : 'Wrangler REST'}`);
if (useS3) console.log(`R2 account: ${accountId}`);
else if (fs.existsSync(onlineConfig)) console.log('Cloudflare config: wrangler.online.toml');

if (!dryRun && !useS3) {
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
    await put(`${prefix}/${pack}/${version}/${rel}`, file, true);
    done += 1;
    console.log(`  [${done}/${manifest.files.length}] ${rel}`);
  }
  await put(`${prefix}/${pack}/${version}/manifest.json`, manifestPath, false);
  console.log(`OK ${pack} @ ${version}`);
}
console.log(dryRun ? '\nDry run complete.' : '\nContent packs uploaded successfully.');
