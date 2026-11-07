// Execute with: node tools/diagnose-nas-v246.mjs
// Public, unauthenticated checks. No secrets or tokens are read.
const base = process.env.MSS_DIAG_BASE || 'https://api.multisports-api.fr';
for (const path of ['/', '/health', '/health/db', '/health/storage']) {
  try {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 10000);
    let response;
    try { response = await fetch(new URL(path, base), { signal: ctl.signal, redirect: 'manual' }); }
    finally { clearTimeout(timeout); }
    // Explicitly avoid outputting potentially sensitive server body / URLs.
    console.log(`${path.padEnd(18)} HTTP ${response.status} ${response.ok ? 'OK' : 'CHECK NAS/POSTGRES'}`);
  } catch (error) {
    console.log(`${path.padEnd(18)} NETWORK ERROR: ${error?.name || 'unreachable'}`);
  }
}
