import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const radar = path.join(root, 'scoring-radar');
const required = [
  'package.json', 'wrangler.jsonc', 'schema.sql', 'README.md',
  'src/index.ts', 'src/admin.ts', 'src/ai.ts', 'src/brave.ts', 'src/config.ts', 'src/db.ts'
];

for (const file of required) {
  const full = path.join(radar, file);
  if (!fs.existsSync(full)) throw new Error(`SCORING RADAR missing: ${file}`);
}

const wrangler = fs.readFileSync(path.join(radar, 'wrangler.jsonc'), 'utf8');
const brave = fs.readFileSync(path.join(radar, 'src/brave.ts'), 'utf8');
const config = fs.readFileSync(path.join(radar, 'src/config.ts'), 'utf8');
const ai = fs.readFileSync(path.join(radar, 'src/ai.ts'), 'utf8');
const index = fs.readFileSync(path.join(radar, 'src/index.ts'), 'utf8');

const checks = [
  [wrangler.includes('https://multisports-scoring.pages.dev/'), 'official destination URL'],
  [!wrangler.includes('darts-counter-v7.pages.dev'), 'old Pages URL removed'],
  [wrangler.includes('REPLACE_WITH_D1_DATABASE_ID'), 'D1 id remains an explicit deployment placeholder'],
  [config.includes("language === 'ja'"), 'Japanese Brave language normalization'],
  [config.includes("'pt-br'"), 'Brazilian Portuguese normalization'],
  [config.includes("'zh-hans'"), 'Simplified Chinese normalization'],
  [brave.includes("freshness', 'pd'"), '24h freshness filter'],
  [brave.includes("'Cache-Control': 'no-cache'"), 'fresh-search no-cache request'],
  [ai.includes('@cf/zai-org/glm-4.7-flash'), 'multilingual Workers AI model'],
  [ai.includes('transparent about affiliation'), 'transparent affiliation policy'],
  [index.includes("url.pathname === '/api/run'"), 'manual run endpoint'],
  [index.includes("url.pathname === '/api/stats'"), 'stats endpoint'],
  [index.includes("url.pathname === '/admin'"), 'admin dashboard route'],
  [index.includes('chooseMarketBatch'), 'non-overlapping market batching'],
  [!index.includes('auto-post'), 'no auto-post implementation in Worker']
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`SCORING RADAR check failed: ${label}`);
}

console.log(`SCORING RADAR integration OK (${checks.length} checks)`);
