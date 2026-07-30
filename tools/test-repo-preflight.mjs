#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function expect(label, condition, detail = '') {
  if (!condition) throw new Error(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
  checks.push(`✅ ${label}`);
}
function json(rel) {
  return JSON.parse(read(rel));
}

const gitignore = read('.gitignore');
expect('.env est explicitement ignoré par Git', /^\.env\s*$/m.test(gitignore));
expect('Les variantes .env.* sont ignorées', /^\.env\.\*\s*$/m.test(gitignore));
expect('Un modèle env reste autorisé', /^!(?:\.env\.example|env\.example)\s*$/m.test(gitignore));

const pkg = json('package.json');
const lock = json('package-lock.json');
const lockRoot = lock?.packages?.[''] || {};

for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  const expected = pkg?.[section] || {};
  const actual = lockRoot?.[section] || {};
  for (const [name, spec] of Object.entries(expected)) {
    expect(`package-lock contient ${section}.${name}`, Object.prototype.hasOwnProperty.call(actual, name));
    expect(`Version lock racine cohérente pour ${name}`, String(actual[name]) === String(spec), `${actual[name]} != ${spec}`);
  }
}
expect('Lockfile npm v3 présent', Number(lock.lockfileVersion || 0) === 3);

const workflow = read('.github/workflows/quality-gate.yml');
expect('Quality Gate utilise Node 22+', /node-version:\s*(?:['"]?)(2[2-9]|[3-9]\d)/.test(workflow));
expect('Secrets Supabase live injectés depuis GitHub Secrets', workflow.includes('secrets.SUPABASE_TEST_URL') && workflow.includes('secrets.SUPABASE_TEST_ANON_KEY') && workflow.includes('secrets.SUPABASE_TEST_SERVICE_ROLE_KEY'));

const riskyFiles = [];
const roots = ['src', 'tools', '.github', 'docs'];
const secretPatterns = [
  /\bsb_secret_[A-Za-z0-9_-]{12,}/,
  /\bservice_role\s*[=:]\s*['\"][A-Za-z0-9._-]{20,}/i,
  /\bsk_live_[A-Za-z0-9]{12,}/,
  /\bR2_SECRET_ACCESS_KEY\s*=\s*[^\s#<][^\r\n]*/,
  /\bVITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET_ACCESS_KEY|STRIPE_SECRET|PRIVATE_KEY)\s*=/,
];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && /\.(?:ts|tsx|js|jsx|mjs|cjs|json|ya?ml|md|txt|css|html)$/i.test(ent.name)) {
      let text = '';
      try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
      if (secretPatterns.some((rx) => rx.test(text))) riskyFiles.push(path.relative(root, full));
    }
  }
}
for (const rel of roots) walk(path.join(root, rel));
expect('Aucun secret serveur évident dans le frontend/tests/workflows', riskyFiles.length === 0, riskyFiles.join(', '));

console.log(checks.join('\n'));
console.log('\n✅ REPOSITORY PREFLIGHT OK');
