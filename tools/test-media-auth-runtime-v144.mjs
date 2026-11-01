import crypto from 'node:crypto';

function b64url(input) { return Buffer.from(input).toString('base64url'); }
function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
function assert(ok, msg) { if (!ok) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); }

// Proxy: upstream media 502 must become 204 soft miss.
{
  const mod = await import('../functions/api/backend/[[path]].ts');
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('bad gateway', {status:502});
  try {
    const response = await mod.onRequest({
      request: new Request('https://multisports-scoring.pages.dev/api/backend/media/media_deadbeef', {method:'GET'}),
      env: { MULTISPORTS_BACKEND_URL: 'https://api.multisports-api.fr' },
      params: { path: ['media','media_deadbeef'] },
    });
    assert(response.status === 204, 'un GET média amont 502 devient un soft-miss 204');
    assert(response.headers.get('x-mss-media-missing') === '1', 'le soft-miss porte le marqueur média absent');
  } finally { globalThis.fetch = prevFetch; }
}

// Account-media: simulate an R2 runtime rejecting `include` but accepting basic list.
{
  const mod = await import('../functions/api/storage/backups/[[path]].ts');
  const secret = 'test-secret-v144';
  const token = signJwt({ sub:'user-test', email:'test@example.com', exp: Math.floor(Date.now()/1000)+3600 }, secret);
  let listCalls = 0;
  let putCalls = 0;
  const bucket = {
    async list(opts) {
      listCalls += 1;
      if (opts && Object.prototype.hasOwnProperty.call(opts, 'include')) throw new Error('include unsupported');
      return { objects: [], truncated: false };
    },
    async put() { putCalls += 1; return {}; },
    async get() { return null; },
    async delete() {},
  };
  const req = new Request('https://example.pages.dev/api/storage/backups/account-media/team_logo_test?kind=team_logo&updatedAt=123', {
    method:'POST',
    headers:{ authorization:`Bearer ${token}`, 'content-type':'image/webp' },
    body:new Uint8Array([1,2,3,4]),
  });
  const response = await mod.onRequest({ request:req, env:{ USER_DATA_BUCKET:bucket, JWT_SECRET:secret }, params:{ path:['account-media','team_logo_test'] }, waitUntil(){} });
  const payload = await response.json();
  assert(response.status === 201 && payload.ok === true, 'account-media reste uploadable si R2 refuse list(include)');
  assert(listCalls >= 2, 'le serveur retente automatiquement un listing R2 basique');
  assert(putCalls === 1, 'le logo est écrit une seule fois dans R2');
}

console.log('\n✅ MEDIA / AUTH RUNTIME V144 OK');
