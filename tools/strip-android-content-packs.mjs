import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const removed = [];

function walk(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const f = path.join(d, name);
      const st = fs.statSync(f);
      st.isDirectory() ? stack.push(f) : out.push(f);
    }
  }
  return out;
}

function removeDir(rel) {
  const target = path.join(dist, rel);
  if (!fs.existsSync(target)) return;
  let size = 0;
  for (const f of walk(target)) size += fs.statSync(f).size;
  fs.rmSync(target, { recursive: true, force: true });
  removed.push({ rel, size, kept: [] });
}

function removeDirExcept(rel, keepRelativePaths) {
  const target = path.join(dist, rel);
  if (!fs.existsSync(target)) return;

  const keep = new Set(keepRelativePaths.map((value) => value.split('/').join(path.sep)));
  let size = 0;

  for (const file of walk(target)) {
    const relative = path.relative(target, file);
    if (keep.has(relative)) continue;
    size += fs.statSync(file).size;
    fs.rmSync(file, { force: true });
  }

  // Nettoie seulement les dossiers devenus vides, sans supprimer les fichiers gardés.
  const dirs = [];
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    dirs.push(current);
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      if (fs.existsSync(full) && fs.statSync(full).isDirectory()) stack.push(full);
    }
  }
  for (const dir of dirs.sort((a, b) => b.length - a.length)) {
    if (dir !== target && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }

  removed.push({ rel, size, kept: [...keepRelativePaths] });
}

// FIT PERF media is streamed/installed from the Cloudflare content pack on Android.
removeDir('fit');

// Les grosses textures sont distantes. Deux SVG de quelques Ko restent locaux car
// src/index.css les référence directement avant même que le thème React soit monté.
removeDirExcept('theme-textures', [
  'postapoc-cracks-overlay.svg',
  'postapoc-panel-concrete.svg',
]);

const saved = removed.reduce((n, x) => n + x.size, 0);
console.log(`Android content-pack strip: ${(saved / 1024 / 1024).toFixed(2)} MB removed from dist`);
for (const item of removed) {
  console.log(` - ${item.rel}: ${(item.size / 1024 / 1024).toFixed(2)} MB`);
  if (item.kept?.length) console.log(`   kept local: ${item.kept.join(', ')}`);
}
