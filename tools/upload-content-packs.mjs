import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = path.join(root, 'content-packs-dist');
const bucket = process.env.MSS_CONTENT_PACK_BUCKET || 'dart-scans';
const prefix = (process.env.MSS_CONTENT_PACK_PREFIX || 'mss-content-packs/v1').replace(/^\/+|\/+$/g, '');
const dryRun = process.argv.includes('--dry-run');
const packs = ['fit-awena', 'navigation-music', 'collectible-cards'];

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ '.webp':'image/webp','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.bvh':'text/plain','.json':'application/json' })[ext] || 'application/octet-stream';
}

function put(key, file) {
  const args = ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', contentType(file), '--remote'];
  if (dryRun) { console.log('npx', args.join(' ')); return; }
  const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', cwd: root });
  if (res.status !== 0) throw new Error(`Upload failed: ${key}`);
}

for (const pack of packs) {
  const dir = path.join(out, pack);
  if (!fs.existsSync(dir)) throw new Error(`Missing ${dir}; run npm run content-packs:prepare first.`);
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of fs.readdirSync(current)) {
      const file = path.join(current, name); const st = fs.statSync(file);
      if (st.isDirectory()) { stack.push(file); continue; }
      const rel = path.relative(dir, file).split(path.sep).join('/');
      put(`${prefix}/${pack}/${rel}`, file);
    }
  }
}
console.log(dryRun ? 'Dry run complete.' : 'Content packs uploaded.');
