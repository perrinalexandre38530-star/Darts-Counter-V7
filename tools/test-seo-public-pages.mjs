import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITEMAP = path.join(PUBLIC_DIR, 'sitemap.xml');
const SITEMAP_TXT = path.join(PUBLIC_DIR, 'sitemap-google.txt');
const LLMS = path.join(PUBLIC_DIR, 'llms.txt');
const LLMS_FULL = path.join(PUBLIC_DIR, 'llms-full.txt');
const SEO_CSS = path.join(PUBLIC_DIR, 'seo', 'seo.css');
const ENTITY = path.join(PUBLIC_DIR, 'seo', 'entity.json');
const DARTS_CATALOG = path.join(PUBLIC_DIR, 'seo', 'darts-guides-v1.json');
const MULTISPORT_CATALOG = path.join(PUBLIC_DIR, 'seo', 'catalog-v2.json');
const DISCOVERY_V6 = path.join(PUBLIC_DIR, 'seo', 'discovery-v6.json');
const INDEXNOW_KEY = 'e68390561d47e281d51d8f33b20b1ec4';
const INDEXNOW_KEY_FILE = path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`);
const INDEXNOW_SCRIPT = path.join(ROOT, 'tools', 'submit-indexnow.mjs');
const SITEMAP_XSL = path.join(PUBLIC_DIR, 'sitemap.xsl');
const ROBOTS = path.join(PUBLIC_DIR, 'robots.txt');
const ROOT_INDEX = path.join(ROOT, 'index.html');
const BASE = 'https://multisports-scoring.pages.dev';
const MAX_SEO_TITLE_LENGTH = 55;
const EXPECTED_LANGUAGES = ['fr','en','es','de','it','pt','nl','ru','zh','ja','ar','hi','tr','da','no','sv','is','pl','ro','sr','hr','cs'];

function localPathForUrl(url) {
  const normalized = url.replace(BASE, '');
  if (!normalized || normalized === '/') return ROOT_INDEX;
  if (normalized.endsWith('/')) return path.join(PUBLIC_DIR, normalized.slice(1), 'index.html');
  return path.join(PUBLIC_DIR, normalized.slice(1));
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function main() {
  const errors = [];
  const warnings = [];

  const required = [SITEMAP, SITEMAP_TXT, LLMS, LLMS_FULL, SEO_CSS, SITEMAP_XSL, ENTITY, DARTS_CATALOG, MULTISPORT_CATALOG, DISCOVERY_V6, INDEXNOW_KEY_FILE, INDEXNOW_SCRIPT, ROBOTS, ROOT_INDEX];
  for (const file of required) {
    if (!await exists(file)) errors.push(`Missing required SEO file: ${path.relative(ROOT, file)}`);
  }

  const multisportCatalog = JSON.parse(await fs.readFile(MULTISPORT_CATALOG, 'utf8'));
  const catalogLanguages = Array.isArray(multisportCatalog.languages) ? multisportCatalog.languages : [];
  if (catalogLanguages.length !== EXPECTED_LANGUAGES.length || EXPECTED_LANGUAGES.some((lang)=>!catalogLanguages.includes(lang))) {
    errors.push(`catalog-v2.json must expose all ${EXPECTED_LANGUAGES.length} supported languages.`);
  }
  if (!Array.isArray(multisportCatalog.sports) || multisportCatalog.sports.length !== 10) {
    errors.push('catalog-v2.json must expose the 10 public sport modules used by the SEO generator.');
  }
  for (const lang of EXPECTED_LANGUAGES) {
    const homeFile = path.join(PUBLIC_DIR, lang, 'index.html');
    if (!await exists(homeFile)) errors.push(`Missing language homepage: public/${lang}/index.html`);
    for (const sport of multisportCatalog.sports || []) {
      if (!sport.routes?.[lang]) errors.push(`Missing ${lang} route for sport ${sport.id} in catalog-v2.json.`);
    }
  }

  const xml = await fs.readFile(SITEMAP, 'utf8');
  if (!xml.includes('xml-stylesheet')) warnings.push('Sitemap is missing the XML stylesheet instruction.');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) errors.push('No <loc> URLs were found in public/sitemap.xml.');
  if (urls.length < 281) errors.push(`Expected at least 281 sitemap URLs after Discovery Boost V6, found ${urls.length}.`);
  if (new Set(urls).size !== urls.length) errors.push('Duplicate <loc> URLs found in sitemap.xml.');

  const txtUrls = (await fs.readFile(SITEMAP_TXT, 'utf8')).split(/\r?\n/).map((x)=>x.trim()).filter(Boolean);
  if (txtUrls.length !== urls.length) errors.push(`sitemap-google.txt has ${txtUrls.length} URLs but sitemap.xml has ${urls.length}.`);
  const missingInTxt = urls.filter((url)=>!txtUrls.includes(url));
  if (missingInTxt.length) errors.push(`sitemap-google.txt is missing ${missingInTxt.length} sitemap URLs.`);

  let localChecked = 0;
  let cssLinkedCount = 0;
  let canonicalErrors = 0;
  let titleLengthErrors = 0;
  const inbound = new Map(urls.map((url)=>[url,0]));
  const sources = new Map();
  for (const url of urls) {
    if (!url.startsWith(BASE)) continue;
    const local = localPathForUrl(url);
    if (!await exists(local)) {
      errors.push(`Missing local file for sitemap URL: ${url} -> ${path.relative(ROOT, local)}`);
      continue;
    }
    localChecked += 1;
    const source = await fs.readFile(local, 'utf8');
    sources.set(url, source);
    const hrefs = [...source.matchAll(/<a\s+[^>]*href=[\"']([^\"']+)[\"']/gi)].map((m)=>m[1]);
    for (const href of hrefs) {
      try {
        const target = new URL(href, BASE).origin === BASE ? `${BASE}${new URL(href, BASE).pathname}` : null;
        if (target && target !== url && inbound.has(target)) inbound.set(target,(inbound.get(target)||0)+1);
      } catch {}
    }
    if (source.includes('/seo/seo.css')) cssLinkedCount += 1;
    const canonicalCount = count(source, '<link rel="canonical"');
    if (canonicalCount !== 1) {
      canonicalErrors += 1;
      errors.push(`Expected exactly one canonical link in ${path.relative(ROOT, local)}, found ${canonicalCount}.`);
    }
    if (!source.includes('SoftwareApplication')) errors.push(`Missing SoftwareApplication JSON-LD in ${path.relative(ROOT, local)}.`);
    const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);
    if (!titleMatch) {
      errors.push(`Missing <title> in ${path.relative(ROOT, local)}.`);
    } else {
      const decodedTitle = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      if (decodedTitle.length > MAX_SEO_TITLE_LENGTH) {
        titleLengthErrors += 1;
        errors.push(`SEO title exceeds ${MAX_SEO_TITLE_LENGTH} characters in ${path.relative(ROOT, local)} (${decodedTitle.length}): ${decodedTitle}`);
      }
    }
  }

  const expectedDartsUrls = [
    `${BASE}/fr/flechettes/compteur-flechettes/`,
    `${BASE}/en/darts/dart-counter/`,
    `${BASE}/es/dardos/contador-dardos/`,
    `${BASE}/fr/flechettes/challenge/`,
    `${BASE}/en/darts/darts-statistics/`,
    `${BASE}/es/dardos/dardos-online/`,
  ];
  for (const url of expectedDartsUrls) {
    if (!urls.includes(url)) errors.push(`Missing Darts discovery URL from sitemap: ${url}`);
  }

  const discoveryUrls = [
    `${BASE}/fr/decouvrir/`,
    `${BASE}/en/discover/`,
    `${BASE}/es/descubrir/`,
  ];
  for (const url of discoveryUrls) {
    if (!urls.includes(url)) errors.push(`Missing V6 discovery hub from sitemap: ${url}`);
    const source = sources.get(url) || '';
    if (!source.includes('CollectionPage') || !source.includes('ItemList')) errors.push(`Discovery hub is missing CollectionPage/ItemList JSON-LD: ${url}`);
  }

  const orphanUrls = [...inbound.entries()].filter(([,count])=>count===0).map(([url])=>url);
  if (orphanUrls.length) errors.push(`Found ${orphanUrls.length} sitemap page(s) with zero crawlable internal inbound links: ${orphanUrls.slice(0,8).join(', ')}`);

  const priorityInboundUrls = [
    `${BASE}/fr/flechettes/compteur-flechettes/`,
    `${BASE}/en/darts/dart-counter/`,
    `${BASE}/es/dardos/contador-dardos/`,
    `${BASE}/fr/flechettes/x01/`,
    `${BASE}/en/darts/darts-statistics/`,
  ];
  for (const url of priorityInboundUrls) {
    if ((inbound.get(url)||0) < 3) errors.push(`Priority discovery URL has fewer than 3 internal inbound links: ${url} (${inbound.get(url)||0})`);
  }

  const frCounter = await fs.readFile(path.join(PUBLIC_DIR,'fr','flechettes','compteur-flechettes','index.html'),'utf8');
  const enCounter = await fs.readFile(path.join(PUBLIC_DIR,'en','darts','dart-counter','index.html'),'utf8');
  const esCounter = await fs.readFile(path.join(PUBLIC_DIR,'es','dardos','contador-dardos','index.html'),'utf8');
  if (!/compteur de fléchettes/i.test(frCounter)) errors.push('FR dart-counter page does not contain the target query phrase.');
  if (!/dart counter/i.test(enCounter)) errors.push('EN dart-counter page does not contain the target query phrase.');
  if (!/contador de dardos/i.test(esCounter)) errors.push('ES dart-counter page does not contain the target query phrase.');
  for (const [name,source] of [['FR counter',frCounter],['EN counter',enCounter],['ES counter',esCounter]]) {
    if (!source.includes(`${BASE}/fr/flechettes/compteur-flechettes/`)) errors.push(`${name} is missing FR guide hreflang.`);
    if (!source.includes(`${BASE}/en/darts/dart-counter/`)) errors.push(`${name} is missing EN guide hreflang.`);
    if (!source.includes(`${BASE}/es/dardos/contador-dardos/`)) errors.push(`${name} is missing ES guide hreflang.`);
  }

  const robots = await fs.readFile(ROBOTS,'utf8');
  if (!/User-agent:\s*OAI-SearchBot[\s\S]*?Allow:\s*\//i.test(robots)) errors.push('robots.txt must explicitly allow OAI-SearchBot.');
  if (!/User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//i.test(robots)) warnings.push('GPTBot is not explicitly disallowed; verify this is intentional.');

  const entity = JSON.parse(await fs.readFile(ENTITY,'utf8'));
  const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
  if (!types.includes('SoftwareApplication') || !types.includes('MobileApplication')) errors.push('entity.json must co-type SoftwareApplication and MobileApplication.');
  if (entity.applicationCategory !== 'SportsApplication') errors.push('entity.json must use SportsApplication.');
  if (entity?.offers?.price !== '0') errors.push('entity.json must declare the current free offer with price 0.');

  const dartsCatalog = JSON.parse(await fs.readFile(DARTS_CATALOG,'utf8'));
  if (!Array.isArray(dartsCatalog.guides) || dartsCatalog.guides.length < 12) errors.push('darts-guides-v1.json must expose at least 12 Darts discovery guides.');
  if (!dartsCatalog.discoveryHubs?.fr || !Array.isArray(dartsCatalog.priorityGuideIds)) errors.push('darts-guides-v1.json must expose V6 discovery hubs and priority guide IDs.');

  const discoveryManifest = JSON.parse(await fs.readFile(DISCOVERY_V6,'utf8'));
  if (discoveryManifest.version !== 'V6 Discovery Boost') errors.push('discovery-v6.json has an unexpected version.');
  if (!discoveryManifest.priorityUrls?.fr?.includes(`${BASE}/fr/flechettes/compteur-flechettes/`)) errors.push('discovery-v6.json is missing the FR dart-counter priority URL.');

  const keyText = (await fs.readFile(INDEXNOW_KEY_FILE,'utf8')).trim();
  if (keyText !== INDEXNOW_KEY) errors.push('IndexNow key file content does not match the configured key.');
  const indexNowScript = await fs.readFile(INDEXNOW_SCRIPT,'utf8');
  if (!indexNowScript.includes(INDEXNOW_KEY) || !indexNowScript.includes('api.indexnow.org/indexnow')) errors.push('IndexNow submission script is not wired to the public key/endpoint.');

  const rootIndex = await fs.readFile(ROOT_INDEX,'utf8');
  if (!/compteur de fléchettes|dart counter/i.test(rootIndex)) errors.push('Root index metadata should explicitly identify the Darts counter capability.');
  const rootTitleMatch = rootIndex.match(/<title>([\s\S]*?)<\/title>/i);
  if (!rootTitleMatch) {
    errors.push('Root index is missing a <title>.');
  } else if (rootTitleMatch[1].trim().length > MAX_SEO_TITLE_LENGTH) {
    titleLengthErrors += 1;
    errors.push(`Root SEO title exceeds ${MAX_SEO_TITLE_LENGTH} characters (${rootTitleMatch[1].trim().length}).`);
  }

  console.log('SEO / AI public discovery audit');
  console.log('--------------------------------');
  console.log(`Supported languages    : ${EXPECTED_LANGUAGES.length}`);
  console.log(`Sitemap URLs found      : ${urls.length}`);
  console.log(`Text sitemap URLs       : ${txtUrls.length}`);
  console.log(`Local sitemap pages ok  : ${localChecked}`);
  console.log(`Pages using seo.css     : ${cssLinkedCount}`);
  console.log(`Darts guides exposed    : ${dartsCatalog.guides?.length || 0}`);
  console.log(`Canonical errors        : ${canonicalErrors}`);
  console.log(`Titles over ${MAX_SEO_TITLE_LENGTH} chars : ${titleLengthErrors}`);
  console.log(`Orphan sitemap pages    : ${orphanUrls.length}`);
  console.log(`FR dart-counter inbound : ${inbound.get(`${BASE}/fr/flechettes/compteur-flechettes/`) || 0}`);
  console.log(`Discovery hubs          : ${discoveryUrls.length}`);
  console.log(`IndexNow key present    : ${await exists(INDEXNOW_KEY_FILE) ? 'yes' : 'no'}`);
  console.log(`llms.txt present        : ${await exists(LLMS) ? 'yes' : 'no'}`);
  console.log(`llms-full.txt present   : ${await exists(LLMS_FULL) ? 'yes' : 'no'}`);
  console.log(`entity.json present     : ${await exists(ENTITY) ? 'yes' : 'no'}`);

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

  console.log('\nOK: SEO / AI public discovery files are structurally consistent.');
}

main().catch((error) => {
  console.error('SEO audit failed:', error);
  process.exit(1);
});
