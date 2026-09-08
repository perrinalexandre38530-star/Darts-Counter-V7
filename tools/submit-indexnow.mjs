import fs from 'node:fs/promises';

const DEFAULT_SITE = 'https://multisports-scoring.pages.dev';
const DEFAULT_KEY = 'e68390561d47e281d51d8f33b20b1ec4';

const site = (process.env.SEO_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
const host = new URL(site).host;
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `${site}/${key}.txt`;
const sitemapPath = process.env.SEO_SITEMAP_PATH || 'public/sitemap.xml';

const xml = await fs.readFile(sitemapPath, 'utf8');
const urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => url.startsWith(site));

if (!urlList.length) {
  throw new Error(`No URLs matching ${site} were found in ${sitemapPath}`);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`IndexNow failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
}

console.log(`IndexNow accepted ${urlList.length} MULTISPORTS SCORING URLs for ${host}.`);
