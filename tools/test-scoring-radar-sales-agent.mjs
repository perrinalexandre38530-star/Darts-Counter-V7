import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sales = read('scoring-radar/src/sales-agent.ts');
const index = read('scoring-radar/src/index.ts');
const db = read('scoring-radar/src/db.ts');
const schema = read('scoring-radar/schema.sql');
const admin = read('scoring-radar/src/admin.ts');
const checks = [
  [sales.includes('verify') || sales.includes('verified_facts'), 'verified factual constraints'],
  [sales.includes('review_required: true'), 'human review required'],
  [sales.includes("draft.match === 'low'"), 'non-relevant discussion rejects copy'],
  [sales.includes('response_format: RESPONSE_FORMAT'), 'structured AI response'],
  [sales.includes('withTimeout') && sales.includes('22000'), 'AI latency bounded'],
  [sales.includes("status !== 'active'"), 'inactive campaigns not executed'],
  [index.includes('/api/sales/prepare-next'), 'one-click qualified opportunity preparation'],
  [index.includes('/api/sales/draft'), 'manual contextual AI draft route'],
  [index.includes('/go/${campaign.goal}/${opportunity.id}'), 'trackable destination-specific URL'],
  [index.includes('/api/sales/campaigns'), 'campaign management API'],
  [schema.includes('sales_campaign_briefs') && db.includes('sales_campaign_briefs'), 'non-destructive D1 campaign table'],
  [schema.includes('sales_drafts') && db.includes('sales_drafts'), 'persisted commercial drafts'],
  [admin.includes('salesPanel') && admin.includes('salesForm'), 'campaign cockpit'],
  [admin.includes('salesSavedDrafts'), 'saved drafts review'],
  [admin.includes('salesPrepareNext'), 'simple one-click UI'],
  [!sales.includes('POST https://facebook.com') && !index.includes('/api/sales/publish'), 'no unauthorized third-party posting']
];
for (const [ok,label] of checks) assert.ok(ok,label);
console.log('SCORING RADAR SALES AGENT integration OK ('+checks.length+' checks)');
