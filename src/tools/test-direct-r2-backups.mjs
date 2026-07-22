import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/storage/backups/[[path]].ts';

class MemoryObject {
  constructor(value, meta = {}) {
    this.value = typeof value === 'string' ? value : Buffer.from(value).toString('utf8');
    this.httpMetadata = meta.httpMetadata || {};
    this.customMetadata = meta.customMetadata || {};
  }
  async text() { return this.value; }
}

class MemoryBucket {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.get(key) || null; }
  async put(key, value, meta = {}) { this.map.set(key, new MemoryObject(value, meta)); }
  async delete(key) { this.map.delete(key); }
  async list({ prefix = "", cursor = undefined, limit = 1000 } = {}) {
    const all = [...this.map.keys()].filter((key) => key.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) || 0 : 0;
    const slice = all.slice(start, start + limit);
    const next = start + slice.length;
    return { objects: slice.map((key) => ({ key })), truncated: next < all.length, cursor: next < all.length ? String(next) : undefined };
  }
  keys() { return [...this.map.keys()].sort(); }
}

function b64url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function nasToken(secret, { sub, email }) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, email, exp: Math.floor(Date.now() / 1000) + 3600 });
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

const secret = 'test-secret';
const bucket = new MemoryBucket();
const env = {
  USER_DATA_BUCKET: bucket,
  JWT_SECRET: secret,
  FOUNDER_EMAILS: 'founder@example.com',
  FREE_CLOUD_QUOTA_BYTES: String(1024),
  CLOUD_OBJECT_MAX_UPLOAD_BYTES: String(1024 * 1024),
};

async function call({ method = 'GET', path = '', body, auth, withAuth = true }) {
  const suffix = path ? `/${path}` : '';
  const headers = { ...(body ? { 'content-type': 'application/json' } : {}) };
  if (withAuth && auth) headers.authorization = `Bearer ${auth}`;
  const response = await onRequest({
    request: new Request(`https://example.pages.dev/api/storage/backups${suffix}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    params: { path },
    waitUntil() {},
    next() {},
  });
  return { response, json: await response.json() };
}

// 1) Diagnostic public.
const publicStatus = await call({ method: 'GET', path: 'status', withAuth: false });
assert.equal(publicStatus.json.ok, true);
assert.equal(publicStatus.json.bucketReady, true);
assert.equal(publicStatus.json.retention.total, 2);
assert.equal(publicStatus.json.paidPlans.supported, true);
assert.equal(publicStatus.response.headers.get('x-multisports-storage-route'), 'cloudflare-pages-r2-direct');

// 2) Fondateur : 3 sauvegardes successives -> seulement courante + précédente.
const founderAuth = nasToken(secret, { sub: 'usr_founder', email: 'founder@example.com' });
await bucket.put('users/usr_founder/backups/cloud_sync_v1/old-manual.json.gz', '{\"legacy\":true}');
const ids = [];
for (let i = 1; i <= 3; i += 1) {
  const snapshotJson = JSON.stringify({ version: i, history: { rows: { [`m${i}`]: { score: `${i}-0` } } } });
  const created = await call({ method: 'POST', auth: founderAuth, body: { snapshotJson, title: `Backup ${i}`, summary: { matches: i } } });
  assert.equal(created.response.status, 201);
  assert.equal(created.json.ok, true);
  assert.equal(created.json.retention.total, 2);
  ids.push(created.json.backup.id);
  await new Promise((r) => setTimeout(r, 2));
}
const founderList = await call({ method: 'GET', auth: founderAuth });
assert.equal(founderList.json.backups.length, 2, 'R2 doit conserver exactement 2 générations actives');
assert.equal(founderList.json.backups[0].metadata.retentionRole, 'current');
assert.equal(founderList.json.backups[1].metadata.retentionRole, 'previous');
assert.equal(founderList.json.backups.some((b) => b.id === ids[0]), false, 'la plus ancienne génération doit sortir du manifeste');
assert.equal(bucket.keys().some((key) => key.includes(ids[0])), false, 'la plus ancienne génération doit être supprimée physiquement de R2');
assert.equal(bucket.keys().some((key) => key.includes('/backups/cloud_sync_v1/')), false, 'les anciens backups Cloud Sync V1 doivent être purgés sans toucher aux autres données');

const founderUsage = await call({ method: 'GET', path: 'usage', auth: founderAuth });
assert.equal(founderUsage.json.usage.retainedBackups, 2);
assert.equal(founderUsage.json.usage.retentionTotal, 2);
assert.equal(founderUsage.json.usage.billingExempt, true);

// 3) Plan payant : le quota est lu depuis un entitlement R2 privé, pas depuis PostgreSQL.
const paidUserId = 'usr_paid';
const paidAuth = nasToken(secret, { sub: paidUserId, email: 'paid@example.com' });
await bucket.put(`users/${paidUserId}/billing/storage-entitlement-v1.json`, JSON.stringify({
  version: 1,
  userId: paidUserId,
  planId: 'starter_500mb',
  quotaBytes: 50_000,
  baseUsedBytes: 1_234,
  billingStatus: 'active',
  billingExempt: false,
  storageProvider: 'cloud_r2',
  updatedAt: new Date().toISOString(),
}));
const paidUsage = await call({ method: 'GET', path: 'usage', auth: paidAuth });
assert.equal(paidUsage.json.usage.planId, 'starter_500mb');
assert.equal(paidUsage.json.usage.quotaBytes, 50_000);
assert.equal(paidUsage.json.usage.baseUsedBytes, 1_234);
assert.equal(paidUsage.json.usage.usedBytes, 1_234);
assert.equal(paidUsage.json.usage.planSource, 'entitlement');

for (let i = 0; i < 2; i += 1) {
  const created = await call({
    method: 'POST',
    auth: paidAuth,
    body: { snapshotJson: JSON.stringify({ i, data: 'x'.repeat(8_000) }), title: `Paid ${i}` },
  });
  assert.equal(created.response.status, 201);
}
const paidList = await call({ method: 'GET', auth: paidAuth });
assert.equal(paidList.json.backups.length, 2);
assert.equal(paidList.json.usage.planId, 'starter_500mb');

// 4) Quota : calcul sur la courante + précédente uniquement.
await bucket.put('users/usr_tiny/billing/storage-entitlement-v1.json', JSON.stringify({
  version: 1,
  userId: 'usr_tiny',
  planId: 'starter_500mb',
  quotaBytes: 900,
  billingStatus: 'active',
  billingExempt: false,
  storageProvider: 'cloud_r2',
  updatedAt: new Date().toISOString(),
}));
const tinyAuth = nasToken(secret, { sub: 'usr_tiny', email: 'tiny@example.com' });
const tooLarge = await call({
  method: 'POST',
  auth: tinyAuth,
  body: { snapshotJson: JSON.stringify({ data: 'x'.repeat(1_000) }) },
});
assert.equal(tooLarge.response.status, 413);
assert.equal(tooLarge.json.code, 'quota_exceeded');

// 5) Auth mal configurée : erreur explicite.
const missingSecret = await onRequest({
  request: new Request('https://example.pages.dev/api/storage/backups', { headers: { authorization: `Bearer ${founderAuth}` } }),
  env: { USER_DATA_BUCKET: new MemoryBucket() },
  params: { path: '' }, waitUntil() {}, next() {},
});
const missingSecretJson = await missingSecret.json();
assert.equal(missingSecret.status, 503);
assert.equal(missingSecretJson.code, 'nas_jwt_secret_missing');

console.log('Direct R2 backups: retention 2 + purge physique + quota payant + auth: OK');
