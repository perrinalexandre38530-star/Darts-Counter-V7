import fs from 'node:fs/promises';

const DEFAULT_SITE = 'https://multisports-scoring.pages.dev';
const DEFAULT_KEY = 'e68390561d47e281d51d8f33b20b1ec4';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const site = (process.env.SEO_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
const host = new URL(site).host;
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `${site}/${key}.txt`;
const sitemapPath = process.env.SEO_SITEMAP_PATH || 'public/sitemap.xml';
const discoveryPath = process.env.SEO_DISCOVERY_PATH || 'public/seo/discovery-v6.json';
const strict = process.argv.includes('--strict') || String(process.env.INDEXNOW_STRICT || '').toLowerCase() === 'true';
const dryRun = process.argv.includes('--dry-run');
const priorityOnly = process.argv.includes('--priority') || !process.argv.includes('--all');

function extractJsonLikeMessage(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function normalizeUrls(urls) {
  return [...new Set(urls)].filter((url)=>{
    try { return new URL(url).host === host; } catch { return false; }
  });
}

async function sitemapUrls() {
  const xml = await fs.readFile(sitemapPath, 'utf8');
  return normalizeUrls([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match)=>match[1].trim()));
}

async function priorityUrls() {
  const data = JSON.parse(await fs.readFile(discoveryPath, 'utf8'));
  return normalizeUrls(Object.values(data.priorityUrls || {}).flat());
}

async function verifyKey() {
  const response = await fetch(keyLocation, {headers:{'user-agent':'MULTISPORTS-SCORING-IndexNow/1.0'}});
  if (!response.ok) throw new Error(`IndexNow key preflight failed: ${response.status} ${response.statusText} at ${keyLocation}`);
  const body = (await response.text()).trim();
  if (body !== key) throw new Error(`IndexNow key preflight failed: ${keyLocation} returned unexpected content.`);
  console.log(`IndexNow ownership key verified: ${keyLocation}`);
}

const urlList = priorityOnly ? await priorityUrls() : await sitemapUrls();
if (!urlList.length) throw new Error(`No URLs matching ${site} were found.`);

console.log(`IndexNow target: ${host}`);
console.log(`Mode: ${priorityOnly ? 'priority discovery URLs' : 'all sitemap URLs'}`);
console.log(`URLs ready: ${urlList.length}`);
console.log(`Key location: ${keyLocation}`);

if (dryRun) {
  console.log('\nDry run only. First URLs:');
  for (const url of urlList.slice(0,20)) console.log(`- ${url}`);
  process.exit(0);
}

await verifyKey();

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

const body = await response.text();
if (!response.ok) {
  const parsed = extractJsonLikeMessage(body);
  const errorCode = parsed?.errorCode || '';
  const message = parsed?.message || body || response.statusText;
  const lines = [
    `IndexNow rejected the submission for ${host}.`,
    `HTTP ${response.status} ${response.statusText}`,
    errorCode ? `Code: ${errorCode}` : '',
    message ? `Message: ${message}` : '',
    '',
    `Verify ${keyLocation} in a browser, then retry.`,
  ].filter(Boolean);
  console.warn(lines.join('\n'));
  if (strict) process.exitCode = 1;
  process.exit(process.exitCode ?? 0);
}

console.log(`IndexNow accepted ${urlList.length} MULTISPORTS SCORING URLs for ${host}.`);
console.log('Bing Webmaster Tools > IndexNow can be used to monitor received URLs, crawl status and index status.');
