import fs from 'node:fs';
import vm from 'node:vm';

const swCode = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

const manifest = {
  'src/main.tsx': {
    file: 'assets/main.js',
    isEntry: true,
    imports: ['_shared.js'],
    dynamicImports: ['src/App.tsx'],
  },
  '_shared.js': { file: 'assets/shared.js' },
  'src/App.tsx': {
    file: 'assets/App.js',
    imports: ['_shared.js'],
    dynamicImports: Array.from({ length: 290 }, (_, i) => `src/pages/Lazy${i}.tsx`),
  },
  'src/pages/Home.tsx': { file: 'assets/Home.js' },
  'src/pages/Games.tsx': { file: 'assets/Games.js' },
  'src/pages/Profiles.tsx': { file: 'assets/Profiles.js' },
  'src/pages/StatsHub.tsx': { file: 'assets/StatsHub.js' },
  'src/pages/Settings.tsx': { file: 'assets/Settings.js' },
};
for (let i = 0; i < 290; i += 1) manifest[`src/pages/Lazy${i}.tsx`] = { file: `assets/Lazy${i}.js` };

const listeners = new Map();
const stores = new Map();
const fetchLog = [];
let networkOnline = true;

function normalizeKey(request) {
  if (typeof request === 'string') return request;
  const url = String(request?.url || request || '');
  try {
    const u = new URL(url, 'https://example.test');
    return `${u.pathname}${u.search}`;
  } catch { return url; }
}

const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const map = stores.get(name);
    return {
      async put(request, response) { map.set(normalizeKey(request), response.clone()); },
      async match(request) { return map.get(normalizeKey(request))?.clone() || null; },
      async keys() { return Array.from(map.keys()).map((x) => new Request(`https://example.test${x}`)); },
      async delete(request) { return map.delete(normalizeKey(request)); },
    };
  },
  async keys() { return Array.from(stores.keys()); },
  async delete(name) { return stores.delete(name); },
};

async function fakeFetch(request) {
  const key = normalizeKey(request);
  fetchLog.push(key);
  if (!networkOnline) throw new TypeError('network offline');
  if (key === '/manifest.json') {
    return new Response(JSON.stringify(manifest), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response(`ok:${key}`, { status: 200, headers: { 'content-type': key.endsWith('.js') ? 'text/javascript' : 'text/plain' } });
}

const self = {
  location: { origin: 'https://example.test' },
  addEventListener(type, handler) { listeners.set(type, handler); },
  async skipWaiting() {},
  clients: { async claim() {}, async matchAll() { return []; } },
  registration: { async showNotification() {} },
};

class BrowserRequest extends Request {
  constructor(input, init) {
    const normalized = typeof input === 'string' ? new URL(input, 'https://example.test').toString() : input;
    super(normalized, init);
  }
}

const context = vm.createContext({
  self, caches, fetch: fakeFetch, Request: BrowserRequest, Response, Headers, URL,
  console, setTimeout, clearTimeout, encodeURIComponent,
});
vm.runInContext(swCode, context, { filename: 'sw.js' });

async function fireWaitable(type, data = {}) {
  const waits = [];
  const event = { ...data, waitUntil(p) { waits.push(Promise.resolve(p)); } };
  listeners.get(type)?.(event);
  await Promise.all(waits);
}

await fireWaitable('install');
const afterInstall = fetchLog.slice();
const cacheName = Array.from(stores.keys()).find((x) => x.startsWith('dc-sw-'));
const shell = stores.get(cacheName);
const markerAfterInstall = JSON.parse(await shell.get('/__mss_offline_ready__').text());

if (!markerAfterInstall.coreReady) throw new Error('coreReady=false after install');
if (markerAfterInstall.fullReady) throw new Error('fullReady should be false after install');
if (afterInstall.filter((x) => x.endsWith('.js')).length > 20) {
  throw new Error(`install fetched too many JS chunks: ${afterInstall.filter((x) => x.endsWith('.js')).length}`);
}

// Prove that a real top-level navigation is served from CacheStorage with the
// network gone, i.e. no Chromium dinosaur once this SW controls the page.
networkOnline = false;
let offlineResponsePromise = null;
listeners.get('fetch')?.({
  request: { method: 'GET', url: 'https://example.test/', mode: 'navigate', destination: 'document' },
  respondWith(p) { offlineResponsePromise = Promise.resolve(p); },
});
const offlineResponse = await offlineResponsePromise;
if (!offlineResponse || offlineResponse.status !== 200) throw new Error('offline navigation did not return cached shell');
networkOnline = true;

await fireWaitable('message', { data: { type: 'PRECACHE_APP_SHELL' } });
const markerAfterFull = JSON.parse(await shell.get('/__mss_offline_ready__').text());
if (!markerAfterFull.fullReady) throw new Error('fullReady=false after full cache');
if (markerAfterFull.manifestAssets < 295) throw new Error(`manifestAssets unexpectedly low: ${markerAfterFull.manifestAssets}`);

console.log(`✅ SW runtime simulation: cached offline navigation OK · install JS=${afterInstall.filter((x) => x.endsWith('.js')).length}, full manifest=${markerAfterFull.manifestAssets}`);
