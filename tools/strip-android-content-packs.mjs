import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const removed = [];

function removeDir(rel) {
  const target = path.join(dist, rel);
  if (!fs.existsSync(target)) return;
  let size = 0;
  for (const f of walk(target)) size += fs.statSync(f).size;
  fs.rmSync(target, { recursive: true, force: true });
  removed.push({ rel, size });
}
function walk(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const f = path.join(d, name); const st = fs.statSync(f);
      st.isDirectory() ? stack.push(f) : out.push(f);
    }
  }
  return out;
}

// FIT PERF media is streamed/installed from the Cloudflare content pack on Android.
removeDir('fit');
// Theme textures are also served by the Cloudflare theme-textures pack.
removeDir('theme-textures');

const saved = removed.reduce((n, x) => n + x.size, 0);
console.log(`Android content-pack strip: ${(saved / 1024 / 1024).toFixed(2)} MB removed from dist`);
for (const item of removed) console.log(` - ${item.rel}: ${(item.size / 1024 / 1024).toFixed(2)} MB`);
