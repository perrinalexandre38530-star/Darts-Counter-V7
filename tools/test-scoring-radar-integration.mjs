import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const radar = path.join(root, 'scoring-radar');
const required = [
  'package.json', 'wrangler.jsonc', 'schema.sql', 'README.md',
  'src/index.ts', 'src/admin.ts', 'src/ai.ts', 'src/social.ts', 'src/brave.ts', 'src/config.ts', 'src/db.ts'
];

for (const file of required) {
  const full = path.join(radar, file);
  if (!fs.existsSync(full)) throw new Error(`SCORING RADAR missing: ${file}`);
}

const wrangler = fs.readFileSync(path.join(radar, 'wrangler.jsonc'), 'utf8');
const brave = fs.readFileSync(path.join(radar, 'src/brave.ts'), 'utf8');
const config = fs.readFileSync(path.join(radar, 'src/config.ts'), 'utf8');
const ai = fs.readFileSync(path.join(radar, 'src/ai.ts'), 'utf8');
const social = fs.readFileSync(path.join(radar, 'src/social.ts'), 'utf8');
const index = fs.readFileSync(path.join(radar, 'src/index.ts'), 'utf8');
const schema = fs.readFileSync(path.join(radar, 'schema.sql'), 'utf8');

const checks = [
  [wrangler.includes('https://multisports-scoring.pages.dev/'), 'official destination URL'],
  [!wrangler.includes('darts-counter-v7.pages.dev'), 'old Pages URL removed'],
  [wrangler.includes('"crons": ["0 * * * *"]'), 'hourly cron'],
  [wrangler.includes('"RADAR_MARKETS_PER_RUN": "1"'), 'one Brave search market per hourly run'],
  [wrangler.includes('"SOCIAL_AUTOPILOT_MODE": "review"'), 'social review safe mode'],
  [wrangler.includes('"SOCIAL_MIN_QUALITY_SCORE": "90"'), 'high social quality threshold'],
  [wrangler.includes('"SOCIAL_MIN_FACTUAL_SCORE": "95"'), 'high factual threshold'],
  [config.includes("language === 'ja'"), 'Japanese Brave language normalization'],
  [config.includes("'pt-br'"), 'Brazilian Portuguese normalization'],
  [config.includes("'zh-hans'"), 'Simplified Chinese normalization'],
  [brave.includes("freshness', 'pd'"), '24h freshness filter'],
  [brave.includes("'Cache-Control': 'no-cache'"), 'fresh-search no-cache request'],
  [ai.includes('@cf/zai-org/glm-4.7-flash'), 'multilingual Workers AI model'],
  [ai.includes('transparent about affiliation'), 'transparent affiliation policy'],
  [social.includes('APPROVED') || social.includes('approved asset library'), 'approved-media-only social policy'],
  [social.includes('qualityScore'), 'independent social creative QA'],
  [social.includes('cringeRisk'), 'cheap/cringe risk gate'],
  [social.includes('factualScore'), 'factual safety gate'],
  [schema.includes('CREATE TABLE IF NOT EXISTS social_assets'), 'social asset library schema'],
  [schema.includes('CREATE TABLE IF NOT EXISTS social_campaigns'), 'social campaign schema'],
  [index.includes("url.pathname === '/api/run'"), 'manual run endpoint'],
  [index.includes("url.pathname === '/api/social/campaigns'"), 'social campaign admin endpoint'],
  [index.includes('approved_asset_required'), 'campaign approval requires approved media'],
  [index.includes('hourlyTick'), 'hourly market rotation'],
  [!index.includes('open.tiktokapis.com') && !index.includes('graph.facebook.com') && !index.includes('googleapis.com/upload/youtube'), 'no live social publisher enabled before account OAuth setup']
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`SCORING RADAR check failed: ${label}`);
}

console.log(`SCORING RADAR + SOCIAL GROWTH integration OK (${checks.length} checks)`);
