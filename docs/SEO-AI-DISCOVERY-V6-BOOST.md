# MULTISPORTS SCORING — SEO / AI Discovery Boost V6

## Goal

Increase real crawl discovery of MULTISPORTS SCORING without depending on manual Google Search Console indexing requests.

## What V6 changes

- Adds three crawlable discovery hubs:
  - `/fr/decouvrir/`
  - `/en/discover/`
  - `/es/descubrir/`
- Adds direct HTML `<a href>` links from FR/EN/ES home pages to high-intent Darts pages.
- Rebuilds the Darts hub with crawlable cards for all 12 public Darts guides.
- Adds reciprocal links from every Darts guide to the Darts hub, the discovery directory and priority pages.
- Adds a discovery-directory link to generated page footers so search crawlers can traverse the public site graph from any discovered page.
- Adds `CollectionPage` + `ItemList` structured data on discovery hubs.
- Adds `WebApplication` to the existing app schema typing and expands public product keywords.
- Adds `/seo/discovery-v6.json` for machine-readable discovery entry points.
- Expands `llms.txt` / `llms-full.txt` with high-intent Darts entry points.
- Keeps the existing IndexNow ownership key and upgrades `tools/submit-indexnow.mjs` with ownership preflight, dry-run and priority modes.
- Adds an anti-orphan audit: every sitemap HTML page must receive at least one crawlable internal inbound link; priority Darts pages must receive at least three.

## Validation

Run:

```powershell
npm run seo:check
```

Expected V6 audit includes:

- 281 sitemap URLs
- 0 canonical errors
- 0 orphan sitemap pages
- 3 discovery hubs
- IndexNow key present

## IndexNow after deployment

First verify the priority payload without submitting:

```powershell
npm run seo:indexnow -- --dry-run
```

Then submit the priority Darts URLs (this is the default mode):

```powershell
npm run seo:indexnow
```

Use `--all` only after a genuine full-site content update:

```powershell
npm run seo:indexnow -- --all
```

IndexNow notifies Bing and participating search engines. It does not guarantee ranking or indexing.

## External discovery

After pushing the repository, the README contains direct links to the public Darts pages. Additional official profiles should use the same canonical URLs and product description to create consistent third-party discovery signals.
