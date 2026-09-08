import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITEMAP = path.join(PUBLIC_DIR, 'sitemap.xml');
const LLMS = path.join(PUBLIC_DIR, 'llms.txt');
const SEO_CSS = path.join(PUBLIC_DIR, 'seo', 'seo.css');
const SITEMAP_XSL = path.join(PUBLIC_DIR, 'sitemap.xsl');
const BASE = 'https://multisports-scoring.pages.dev';

function localPathForUrl(url) {
  const normalized = url.replace(BASE, '');
  if (!normalized || normalized === '/') return path.join(ROOT, 'index.html');
  if (normalized.endsWith('/')) return path.join(PUBLIC_DIR, normalized.slice(1), 'index.html');
  return path.join(PUBLIC_DIR, normalized.slice(1));
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function main() {
  const errors = [];
  const warnings = [];

  for (const file of [SITEMAP, LLMS, SEO_CSS, SITEMAP_XSL]) {
    if (!await exists(file)) errors.push(`Missing required SEO file: ${path.relative(ROOT, file)}`);
  }

  const xml = await fs.readFile(SITEMAP, 'utf8');
  if (!xml.includes('xml-stylesheet')) warnings.push('Sitemap is missing the XML stylesheet instruction.');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) errors.push('No <loc> URLs were found in public/sitemap.xml.');

  let localChecked = 0;
  for (const url of urls) {
    if (!url.startsWith(BASE)) continue;
    const local = localPathForUrl(url);
    if (!await exists(local)) {
      errors.push(`Missing local file for sitemap URL: ${url} -> ${path.relative(ROOT, local)}`);
      continue;
    }
    localChecked += 1;
  }

  const htmlFiles = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.name === 'index.html') htmlFiles.push(target);
    }
  }
  await walk(PUBLIC_DIR);

  let cssLinkedCount = 0;
  for (const file of htmlFiles) {
    const source = await fs.readFile(file, 'utf8');
    if (source.includes('/seo/seo.css')) cssLinkedCount += 1;
  }

  console.log('SEO public pages audit');
  console.log('----------------------');
  console.log(`Sitemap URLs found      : ${urls.length}`);
  console.log(`Local sitemap pages ok  : ${localChecked}`);
  console.log(`Public index.html pages : ${htmlFiles.length}`);
  console.log(`Pages using seo.css     : ${cssLinkedCount}`);
  console.log(`llms.txt present        : ${await exists(LLMS) ? 'yes' : 'no'}`);
  console.log(`sitemap.xsl present     : ${await exists(SITEMAP_XSL) ? 'yes' : 'no'}`);

  if (warnings.length) {
    console.log('\nWarnings');
    for (const w of warnings) console.log(`- ${w}`);
  }

  if (errors.length) {
    console.error('\nErrors');
    for (const e of errors) console.error(`- ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nOK: SEO public pages look structurally consistent.');
}

main().catch((error) => {
  console.error('SEO audit failed:', error);
  process.exit(1);
});
