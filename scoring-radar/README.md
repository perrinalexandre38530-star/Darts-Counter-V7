# SCORING RADAR — MVP

SCORING RADAR is an isolated Cloudflare Worker for discovering public, high-intent requests that MULTISPORTS SCORING could legitimately answer.

It is deliberately **not** an auto-spammer. The MVP detects, scores and drafts transparent replies for human review.

## What the MVP does

- Rotates through configured language/country markets every 5 minutes.
- Uses Brave Search API with a 24-hour freshness filter to find recent public pages/discussions.
- Uses Workers AI to localize search queries for each market and cache them in D1.
- Deduplicates URLs in D1 before sending them to a Cloudflare Queue.
- Classifies candidates in batches with a multilingual model.
- Scores intent from 0 to 100 and marks only relevant opportunities as eligible.
- Drafts a reply in the source language with transparent affiliation and a `{{APP_LINK}}` placeholder.
- Exposes a protected admin API to list opportunities.
- Serves `/admin` as a lightweight dashboard; the token stays in browser `sessionStorage` and is never embedded in the public app bundle.
- Generates `/go/:id` tracked links and records clicks before redirecting to the app with UTM parameters.
- Accepts additional platform connectors through the protected `/api/ingest` endpoint.

## Architecture

```text
Cron (5 min)
   │
   ├─ market/query rotation
   │       │
   │       ├─ Workers AI query localization + D1 cache
   │       └─ Brave Web Search (freshness = last 24h)
   │
   ├─ D1 deduplication
   └─ Queue: scoring-radar-candidates
            │
            └─ Workers AI multilingual batch classifier
                     │
                     └─ D1 opportunities
                              │
                              ├─ protected /api/opportunities
                              └─ public /go/:id → click log → localized official app landing page
```

## Supported languages

The engine is language-agnostic: Workers AI detects the language and drafts in the same language. Search markets are configured with `RADAR_MARKETS` using `language:COUNTRY` pairs.

The default global sweep starts with more than 50 language/country markets, including European, Asian, Arabic, Cyrillic and Indic languages. Workers AI remains language-agnostic for ingested sources.

Brave uses provider-specific codes for some languages (`jp`, `pt-br`, `pt-pt`, `zh-hans`, `zh-hant`). The Worker normalizes these automatically and omits `search_lang` when a language is not explicitly supported by Brave, so the localized query can still be searched.

Add any other language/country pair supported by your search provider without changing the Worker code, for example:

```text
RADAR_MARKETS=fr:FR,en:US,es:ES,sv:SE,da:DK,no:NO,fi:FI,cs:CZ,ro:RO,el:GR,he:IL,th:TH,vi:VN
```

## Cloudflare resources

Create the resources once:

```bash
cd scoring-radar
npm install
npx wrangler d1 create scoring-radar-db
npx wrangler queues create scoring-radar-candidates
npx wrangler queues create scoring-radar-candidates-dlq
```

Copy the D1 database id into `wrangler.jsonc`, then initialize the schema:

```bash
npm run db:remote
```

## Secrets

Never place secrets in `wrangler.jsonc`, `.env`, client-side code or Git.

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put RADAR_ADMIN_TOKEN
```

For local development only, copy `.dev.vars.example` to `.dev.vars` and keep `.dev.vars` untracked.

## Deploy

```bash
npm run typecheck
npm run deploy
```

Verify:

```bash
curl https://<worker-host>/health
```

Then open `https://<worker-host>/admin` and enter `RADAR_ADMIN_TOKEN`.

## Trigger and inspect

For a deployment smoke test, trigger one collection pass manually:

```bash
curl -X POST -H "Authorization: Bearer <RADAR_ADMIN_TOKEN>" https://<worker-host>/api/run
```

Read aggregate counters:

```bash
curl -H "Authorization: Bearer <RADAR_ADMIN_TOKEN>" https://<worker-host>/api/stats
```

## Read opportunities

```bash
curl \
  -H "Authorization: Bearer <RADAR_ADMIN_TOKEN>" \
  "https://<worker-host>/api/opportunities?minScore=70&limit=100"
```

Each item contains:

- original source URL
- detected language
- category and intent
- score
- reason
- suggested reply
- tracked link
- reply with the tracked link already substituted

## Add other sources

Official platform/API connectors can send normalized candidates to:

```text
POST /api/ingest
Authorization: Bearer <RADAR_ADMIN_TOKEN>
```

Body:

```json
{
  "candidates": [
    {
      "source": "official-platform-api",
      "sourceUrl": "https://example.com/post/123",
      "title": "Need a darts scoring app",
      "snippet": "Does anyone know an app that tracks X01 and stats?",
      "languageHint": "en"
    }
  ]
}
```

This keeps source-specific authentication and platform rules outside the core classifier.

## Cost / speed control

The default cron is every 5 minutes and checks 5 markets per run, one intent family per global market sweep, with 10 results per query. Markets are batched without overlapping sliding windows, which avoids duplicate spend while still covering the configured world markets.

Increase coverage only after measuring conversion. Broad web search is not literally real-time and no service can legally/technically see every private or non-indexed request on the Internet. For sources that offer streams/webhooks, use them to approach real-time and feed `/api/ingest`.

## Anti-spam rules built into the classifier

- no automatic publishing in this MVP
- only active user needs are eligible
- news/SEO/store/company pages are rejected
- replies must help first
- affiliation must be transparent
- source-language reply
- all publishing remains a human decision

## Recommended next stage

1. Add official source connectors one by one (platform APIs, RSS/Atom, forums that explicitly allow automation).
2. Add conversion attribution after install/account creation so the funnel becomes: detection → reply → click → install → account.
3. Learn from accepted/rejected opportunities to tune thresholds and query families.
