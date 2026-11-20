// Diagnostic réseau non destructif du canal Viewer sur le Worker ONLINE.
// Usage: node tools/diagnose-samsung-viewer.mjs ABC123
// Ne crée, ne ferme et ne modifie aucune session.
const code = String(process.argv[2] || '').trim().toUpperCase();
if (!/^[A-Z0-9]{6}$/.test(code)) {
  console.error('Usage : node tools/diagnose-samsung-viewer.mjs CODE6');
  process.exit(2);
}
const base = String(process.env.VITE_VIEWER_API_URL || process.env.VITE_ONLINE_API_URL || 'https://dc-online-v3.perrin-alexandre38530.workers.dev').replace(/\/+$/, '');
const snapshotUrl = `${base}/api/viewer/session/${code}/snapshot`;
let httpOK = false;
try {
  const response = await fetch(snapshotUrl, { signal: AbortSignal.timeout(8000) });
  const contentType = response.headers.get('content-type') || '';
  httpOK = response.ok && contentType.includes('json');
  console.log(`API snapshot : HTTP ${response.status} (${contentType || 'type inconnu'})`);
  if (response.status === 404) console.log('Code absent ou expiré : recréer une session Viewer sur le téléphone.');
  if (response.ok && !httpOK) console.log('Réponse inattendue : probable mauvaise cible API.');
} catch (error) {
  console.log(`API snapshot inaccessible : ${error.message}`);
}
const wsUrl = snapshotUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/snapshot$/, '/socket');
if (typeof WebSocket !== 'function') {
  console.log('WebSocket Node indisponible : utiliser Node 22+ pour le diagnostic.');
  process.exit(httpOK ? 0 : 1);
}
let status = 'timeout';
const socket = new WebSocket(wsUrl);
const timer = setTimeout(() => socket.close(), 8000);
await new Promise((resolve) => {
  socket.addEventListener('open', () => {
    status = 'ouvert';
    socket.send(JSON.stringify({ kind: 'join', role: 'guest', lobbyCode: code, matchId: `viewer:${code}`, playerId: 'diagnostic-only' }));
  });
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(String(event.data));
      if (data.kind === 'info') { status = 'join confirmé'; socket.close(1000, 'diagnostic_done'); }
      if (data.kind === 'error') { status = `erreur serveur: ${data.code || 'inconnue'}`; socket.close(); }
    } catch {}
  });
  socket.addEventListener('error', () => { if (status === 'timeout') status = 'erreur handshake'; });
  socket.addEventListener('close', resolve, { once: true });
});
clearTimeout(timer);
console.log(`Canal WebSocket Viewer : ${status}`);
if (!httpOK || status !== 'join confirmé') process.exitCode = 1;
else console.log('Backend Viewer accessible depuis ce PC. Tester ensuite les statuts téléphone ET TV.');
