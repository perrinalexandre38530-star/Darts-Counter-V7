# SCORING RADAR + SOCIAL GROWTH IA

Cloudflare Worker for MULTISPORTS SCORING with two jobs:

1. **SCORING RADAR** detects public, high-intent needs that the app could legitimately answer.
2. **SOCIAL GROWTH IA** turns only the strongest needs into social campaign drafts and rejects weak creative before it can represent the brand.

The current release is intentionally **SAFE MODE / REVIEW**. It prepares campaigns automatically, but live social publishing is locked until official OAuth/API connectors are configured for the owned Facebook/Instagram/YouTube/TikTok accounts.

## Cost guardrail

The Worker is configured for **one Brave search per hour**:

- cron: `0 * * * *`
- `RADAR_MARKETS_PER_RUN=1`
- one search-intent family per run
- up to 10 results returned by that single search

This replaces the previous 5-minute / multi-market cadence.

## Social quality gate

A strong radar opportunity (default score >= 85) can create at most one campaign for that source. The daily campaign-generation cap defaults to 2.

The social pipeline uses two independent AI passes:

1. **Creative generator**: creates the hook, angle, platform copy and a media brief.
2. **Creative QA**: acts as a strict creative director / brand-safety reviewer.

Default pass thresholds:

- overall creative quality >= 90
- factual accuracy >= 95
- brand credibility >= 90
- usefulness >= 85
- visual-plan quality >= 90
- spam risk <= 10
- cheap/cringe risk <= 10

Anything below the threshold is stored as `rejected_by_qa` instead of being offered for approval.

## Approved-media-only rule

The Worker does **not** blindly generate and publish images or videos.

A campaign can only be human-approved after an asset has been added to the approved media library and has all of these properties:

- human-approved
- quality score >= 90
- technical score >= 90
- brand score >= 90
- media type matches the campaign

Recommended approved assets:

- real screen recordings of MULTISPORTS SCORING
- clean screenshots from the current app
- already validated Awena exercise videos/visuals
- approved product montages
- approved logos or product footage

Forbidden creative dependencies include fake UI, fake reviews, fake ratings, fabricated user counts and random AI-generated product screens.

## TikTok-specific media rule

TikTok's current Content Posting guidelines prohibit unwanted promotional branding/watermark treatment in media sent through the posting integration. The campaign generator therefore avoids requiring baked-in promotional watermarks/URLs/logo overlays for TikTok creative. Publication is not enabled until the TikTok app has the required scope/audit and the account flow is configured.

## Admin dashboard

Open:

```text
https://<worker-host>/admin
```

The dashboard now contains:

- Radar opportunities
- Social campaign QA scores
- generated Facebook / Instagram / YouTube / TikTok copy
- approved-media library
- media-to-campaign assignment
- approve / reject controls

Approval does not yet send the post live. That final step stays locked until the official platform connectors are configured.

## D1 schema update

After deploying this version, apply the schema again. It is additive and uses `CREATE TABLE IF NOT EXISTS`:

```bash
cd scoring-radar
npm install
npm run db:remote
```

This adds:

- `social_assets`
- `social_campaigns`

Existing Radar data remains intact.

## Secrets

Never place real secrets in source control.

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put RADAR_ADMIN_TOKEN
```

Future publication connectors will add platform OAuth/access credentials as Worker secrets only.

## Deploy

```bash
cd scoring-radar
npm install
npm run typecheck
npm run deploy
```

Then verify:

```text
GET /health
```

and open `/admin`.

## Manual scan

```text
POST /api/run
Authorization: Bearer <RADAR_ADMIN_TOKEN>
```

The scan still uses the same one-query logic as an hourly run; manual triggering is intended for testing, not high-frequency production use.

## Social API endpoints

Protected by `RADAR_ADMIN_TOKEN`:

```text
GET  /api/social/stats
GET  /api/social/campaigns
GET  /api/social/assets?approvedOnly=1
POST /api/social/assets
POST /api/social/campaigns/:id/asset
POST /api/social/campaigns/:id/approve
POST /api/social/campaigns/:id/reject
```

## Live-publishing stage

The next stage is account connection, using only official APIs:

- Facebook Page / Instagram professional account via Meta
- YouTube Data API OAuth upload
- TikTok Content Posting API after the required authorization/audit

TikTok and YouTube can restrict API-originated uploads from unaudited/unverified API clients to private visibility, so those platform review steps must be completed before a true public autopilot is enabled.

The recommended rollout remains:

1. SAFE MODE (current): generate + QA + approved media + human approval.
2. Connect one platform at a time.
3. Test posts to private/unlisted destinations where supported.
4. Enable live autopilot only after real-world visual checks and account/API validation.
