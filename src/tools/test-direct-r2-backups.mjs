import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/storage/backups/[[path]].ts';

class MemoryObject {
  constructor(value, meta = {}) { this.value = value; this.httpMetadata = meta.httpMetadata || {}; this.customMetadata = meta.customMetadata || {}; }
  async text() { return this.value; }
}
class MemoryBucket {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.get(key) || null; }
  async put(key, value, meta = {}) { this.map.set(key, new MemoryObject(typeof value === 'string' ? value : String(value), meta)); }
  async delete(key) { this.map.delete(key); }
}
function b64url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function token(secret) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub: 'usr_test', email: 'test@example.com', exp: Math.floor(Date.now()/1000)+3600 });
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
async function call(method, path = '', body) {
  const url = `https://example.pages.dev/api/storage/backups${path ? `/${path}` : ''}`;
  const request = new Request(url, {
    method,
    headers: { authorization: `Bearer ${auth}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await onRequest({ request, env, params: { path }, waitUntil() {}, next() {} });
  const json = await response.json();
  return { response, json };
}
const secret = 'test-secret';
const auth = token(secret);
const env = {
  USER_DATA_BUCKET: new MemoryBucket(),
  JWT_SECRET: secret,
  FOUNDER_EMAILS: 'test@example.com',
  FREE_CLOUD_QUOTA_BYTES: String(1024 * 1024),
  CLOUD_OBJECT_MAX_UPLOAD_BYTES: String(1024 * 1024),
};


const status = await call('GET', 'status');
assert.equal(status.json.ok, true);
assert.equal(status.json.route, 'cloudflare-pages-r2-direct');
assert.equal(status.response.headers.get('x-multisports-storage-route'), 'cloudflare-pages-r2-direct');

const snapshotJson = JSON.stringify({ version: 1, profiles: [{ id: 'p1' }], history: { rows: { m1: { score: '3-2' } } } });
const created = await call('POST', '', { snapshotJson, title: 'Test', summary: { matches: 1 } });
assert.equal(created.response.status, 201);
assert.equal(created.json.ok, true);
assert.match(created.json.backup.id, /^r2b_/);
const id = created.json.backup.id;

const listed = await call('GET');
assert.equal(listed.json.backups.length, 1);
assert.equal(listed.json.backups[0].id, id);

const downloaded = await call('GET', id);
assert.equal(downloaded.json.snapshotJson, snapshotJson);

const softDeleted = await call('DELETE', id);
assert.equal(softDeleted.json.ok, true);
const hidden = await call('GET');
assert.equal(hidden.json.backups.length, 0);

const restored = await call('POST', `${id}/undelete`);
assert.equal(restored.json.ok, true);
const visibleAgain = await call('GET');
assert.equal(visibleAgain.json.backups.length, 1);

console.log('Direct R2 backup Pages Function: OK');
