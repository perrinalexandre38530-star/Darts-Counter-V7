import fs from 'node:fs/promises';

const DEFAULT_SITE = 'https://multisports-scoring.pages.dev';
const DEFAULT_KEY = 'e68390561d47e281d51d8f33b20b1ec4';

const site = (process.env.SEO_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
const host = new URL(site).host;
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `${site}/${key}.txt`;
const sitemapPath = process.env.SEO_SITEMAP_PATH || 'public/sitemap.xml';
const strict = process.argv.includes('--strict') || String(process.env.INDEXNOW_STRICT || '').toLowerCase() === 'true';

function extractJsonLikeMessage(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const xml = await fs.readFile(sitemapPath, 'utf8');
const urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => url.startsWith(site));

if (!urlList.length) {
  throw new Error(`No URLs matching ${site} were found in ${sitemapPath}`);
}

console.log(`Submitting ${urlList.length} URLs to IndexNow for ${host}...`);

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

if (!response.ok) {
  const body = await response.text();
  const parsed = extractJsonLikeMessage(body);
  const errorCode = parsed?.errorCode || '';
  const message = parsed?.message || body || response.statusText;

  if (errorCode === 'SiteVerificationNotComplete') {
    const lines = [
      `IndexNow not accepted yet for ${host}.`,
      'Reason: site verification is still pending on the IndexNow/Bing side.',
      `Remote message: ${message}`,
      '',
      'What to do now:',
      `1. Open ${keyLocation} in the browser and confirm it returns only the key.`,
      `2. Wait a little while for the remote verification to propagate.`,
      '3. Retry the same command later: node tools/submit-indexnow.mjs',
      '4. Use --strict if you want this script to fail with a non-zero exit code.',
    ];
    console.warn(lines.join('\n'));
    if (strict) {
      process.exitCode = 1;
    }
    process.exit(process.exitCode ?? 0);
  }

  throw new Error(`IndexNow failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
}

console.log(`IndexNow accepted ${urlList.length} MULTISPORTS SCORING URLs for ${host}.`);
