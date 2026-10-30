#!/usr/bin/env node
import fs from 'node:fs';
const backend = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
function assert(ok, msg) { if (!ok) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); }
assert(backend.includes('async function personalCloudAuthRequired'), 'middleware personalCloudAuthRequired présent');
assert(/app\.get\(["']\/account\/personal-cloud\/google_drive\/status["'],\s*personalCloudAuthRequired/.test(backend), 'status Google Drive utilise auth compte public');
assert(/app\.get\(["']\/account\/personal-cloud\/google_drive\/backups["'],\s*personalCloudAuthRequired/.test(backend), 'liste Google Drive utilise auth compte public');
assert(/app\.post\(["']\/account\/personal-cloud\/google_drive\/backups["'],\s*personalCloudAuthRequired/.test(backend), 'upload Google Drive utilise auth compte public');
assert(/app\.get\(["']\/account\/backups\/latest["'],\s*personalCloudAuthRequired/.test(backend), 'pointeur latest GET présent');
assert(/app\.post\(["']\/account\/backups\/latest["'],\s*personalCloudAuthRequired/.test(backend), 'pointeur latest POST présent');
assert(backend.includes('X-MSS-Backend-Build') && backend.includes('V169_SINGLE_SOURCE_BACKUP_AUTH_LOCK'), 'marqueur backend V169 présent');
console.log('\n✅ BACKUP / PERSONAL CLOUD AUTH CONTRACT V169 OK');
