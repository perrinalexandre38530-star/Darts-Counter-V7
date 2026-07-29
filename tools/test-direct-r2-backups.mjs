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
  async list({ prefix = '', cursor = undefined, limit = 1000 } = {}) {
    const all = [...this.map.keys()].filter((key) => key.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) || 0 : 0;
    const slice = all.slice(start, start + limit);
    const next = start + slice.length;
    return { objects: slice.map((key) => ({ key })), truncated: next < all.length, cursor: next < all.length ? String(next) : undefined };
  }
}

function b64url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function nasToken(secret, { sub, email }) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, email, exp: Math.floor(Date.now() / 1000) + 3600 });
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

const secret = 'test-secret';
const bucket = new MemoryBucket();
const env = {
  USER_DATA_BUCKET: bucket,
  JWT_SECRET: secret,
  FOUNDER_EMAILS: 'founder@example.com',
  FREE_CLOUD_QUOTA_BYTES: '0',
  CLOUD_OBJECT_MAX_UPLOAD_BYTES: String(1024 * 1024),
};
const pending = [];

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
    waitUntil(promise) { pending.push(Promise.resolve(promise)); },
    next() {},
  });
  const result = { response, json: await response.json() };
  if (pending.length) await Promise.allSettled(pending.splice(0));
  return result;
}

const publicStatus = await call({ method: 'GET', path: 'status', withAuth: false });
assert.equal(publicStatus.response.status, 200);
assert.equal(publicStatus.json.paidPlans.freeWriteQuotaBytes, 0);
assert.equal(publicStatus.json.paidPlans.writePolicy, 'premium_required');

// Compte sans abonnement : lecture possible, écriture totalement bloquée.
const freeAuth = nasToken(secret, { sub: 'usr_free', email: 'free@example.com' });
const freeUsage = await call({ method: 'GET', path: 'usage', auth: freeAuth });
assert.equal(freeUsage.json.usage.quotaBytes, 0);
assert.equal(freeUsage.json.usage.writeAllowed, false);
assert.equal(freeUsage.json.usage.premiumRequired, true);
const freeBackup = await call({ method: 'POST', auth: freeAuth, body: { snapshotJson: JSON.stringify({ test: true }) } });
assert.equal(freeBackup.response.status, 402);
assert.equal(freeBackup.json.code, 'premium_required');
const freeMedia = await call({ method: 'POST', path: 'media/test', auth: freeAuth, body: { dataUrl: 'data:image/png;base64,AAAA' } });
assert.equal(freeMedia.response.status, 402);
assert.equal(freeMedia.json.code, 'premium_required');
const freeAvatar = await call({ method: 'POST', path: 'avatar/p1', auth: freeAuth, body: { dataUrl: 'data:image/png;base64,AAAA' } });
assert.equal(freeAvatar.response.status, 402);
assert.equal(freeAvatar.json.code, 'premium_required');

// Abonnement payant actif : écriture autorisée + rétention courante/précédente.
const paidUserId = 'usr_paid';
const paidAuth = nasToken(secret, { sub: paidUserId, email: 'paid@example.com' });
await bucket.put(`users/${paidUserId}/billing/storage-entitlement-v1.json`, JSON.stringify({
  version: 1,
  userId: paidUserId,
  planId: 'starter_500mb',
  quotaBytes: 500 * 1024 * 1024,
  billingStatus: 'active',
  billingExempt: false,
  storageProvider: 'cloud_r2',
  updatedAt: new Date().toISOString(),
}));
for (let i = 1; i <= 3; i += 1) {
  const created = await call({ method: 'POST', auth: paidAuth, body: { snapshotJson: JSON.stringify({ i, data: 'x'.repeat(500) }), title: `Paid ${i}` } });
  assert.equal(created.response.status, 201);
  assert.equal(created.json.usage.writeAllowed, true);
  await new Promise((resolve) => setTimeout(resolve, 2));
}
const paidList = await call({ method: 'GET', auth: paidAuth });
assert.equal(paidList.json.backups.length, 2);
assert.equal(paidList.json.backups[0].metadata.retentionRole, 'current');
assert.equal(paidList.json.backups[1].metadata.retentionRole, 'previous');

// Même le fondateur n'a aucun passe-droit R2 gratuit : NAS privé oui, R2 uniquement PREMIUM.
const founderAuth = nasToken(secret, { sub: 'usr_founder', email: 'founder@example.com' });
const founderUsage = await call({ method: 'GET', path: 'usage', auth: founderAuth });
assert.equal(founderUsage.json.usage.writeAllowed, false);
assert.equal(founderUsage.json.usage.premiumRequired, true);
const founderBackup = await call({ method: 'POST', auth: founderAuth, body: { snapshotJson: JSON.stringify({ founder: true }) } });
assert.equal(founderBackup.response.status, 402);
assert.equal(founderBackup.json.code, 'premium_required');

console.log('Direct R2: 0 octet gratuit + HTTP 402 + PREMIUM obligatoire pour tous + rétention 2: OK');
