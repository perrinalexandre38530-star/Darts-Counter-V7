/** MSS AI CONTROL V3: static, offline, escaped dashboard (no network requests). */
const esc = (value) => String(value ?? '—').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sha = value => /^[a-f\d]{40}$/i.test(value ?? '') ? value.slice(0,12) : 'Non vérifié';
const safeStatus = value => ['PASS','FAIL','BLOQUÉ','NON_EXECUTE'].includes(value) ? value : 'INCONNU';
export function normalizeReport(raw, generatedAt) {
  if (!raw || raw.schema !== 'mss-ai-control-preflight-v2' || !raw.preflight || !raw.qa) throw new Error('Rapport précontrôle V2 invalide');
  const p=raw.preflight, q=raw.qa;
  const verified = p.ok === true && p.branch === 'main' && /^[a-f\d]{40}$/i.test(p.localSha || '') && p.localSha === p.remoteSha;
  const status = safeStatus(q.status);
  const tests = Array.isArray(q.tests) ? q.tests.map(t=>({ name:String(t.name||'Test'), ok:t.exitCode===0&&!t.error, details:t.error?String(t.error):t.exitCode===0?'Réussi':`Code ${String(t.exitCode)}` })) : [];
  return {
    schema:'mss-ai-control-dashboard-v3', generatedAt,
    pc: { status: verified ? 'ALIGNE' : 'NON_CERTIFIE', branch: p.branch || null, localSha: p.localSha || null, githubSha: p.remoteSha || null },
    github: { status: /^[a-f\d]{40}$/i.test(p.remoteSha||'') ? 'REFERENCE_VERIFIEE' : 'INCONNU', sha:p.remoteSha||null },
    stackblitz:{ status:'NON_VERIFIE', note:'Aucun accès au commit ni aux fichiers de StackBlitz depuis ce rapport local.' },
    qa:{ status, scope:raw.scope==='sync-only'?'SYNC_SEULEMENT':'SYNC_ET_QA', tests },
    alerts:[...(Array.isArray(p.errors)?p.errors:[]),...(Array.isArray(q.errors)?q.errors:[])].filter((v,i,a)=>a.indexOf(v)===i).map(String),
    actions:(Array.isArray(p.actions)?p.actions:[]).map(String),
    mutations:false,
  };
}
export function renderDashboard(data) {
  const rows = [
    ['PC / VS Code', data.pc.status, `Branche : ${esc(data.pc.branch)} · Commit : ${esc(sha(data.pc.localSha))}`],
    ['GitHub main', data.github.status, `Commit : ${esc(sha(data.github.sha))}`],
    ['StackBlitz',data.stackblitz.status,esc(data.stackblitz.note)],
  ].map(([name,status,detail])=>`<article class="panel"><h2>${name}</h2><p><strong class="${status==='ALIGNE'||status==='REFERENCE_VERIFIEE'?'ok':'warn'}">${esc(status.replaceAll('_',' '))}</strong></p><p>${detail}</p></article>`).join('');
  const tests = data.qa.tests.map(t=>`<tr><td>${esc(t.name)}</td><td class="${t.ok?'ok':'bad'}">${t.ok?'PASS':'FAIL'}</td><td>${esc(t.details)}</td></tr>`).join('');
  const list = items => items.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Aucun.</p>';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL · Rapport V3</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101622;color:#f2f4fa}body{max-width:1100px;margin:0 auto;padding:28px}h1{font-size:clamp(1.5rem,4vw,2.6rem);margin:0}header p,small{color:#b8c3d8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:16px;margin:24px 0}.panel,section{background:#1b2535;border:1px solid #37445c;border-radius:15px;padding:20px}.panel p{overflow-wrap:anywhere}.ok{color:#71dfac}.bad{color:#ff8a93}.warn{color:#ffcf76}section{margin-top:16px}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #37445c;padding:12px}li{margin:10px 0;overflow-wrap:anywhere}code{color:#aaccff}footer{margin-top:28px;color:#b8c3d8}</style></head><body><header><h1>MSS AI CONTROL — Supervision V3</h1><p>Rapport généré le ${esc(data.generatedAt)} · Lecture seule · Source : Précontrôle V2</p></header><div class="grid">${rows}</div><section><h2>Robots QA · ${esc(data.qa.status)}</h2><p>Portée : ${esc(data.qa.scope)}. Les tests ci-dessous sont des tests automatisés des robots, pas une validation complète de l'application.</p>${tests?`<table><thead><tr><th>Robot / suite</th><th>Résultat</th><th>Détail</th></tr></thead><tbody>${tests}</tbody></table>`:'<p>Aucun test QA exécuté.</p>'}</section><section><h2>Blocages et alertes</h2>${list(data.alerts)}</section><section><h2>Actions recommandées (manuelles)</h2>${list(data.actions)}<p><strong>Aucun reset, push, merge, checkout ou déploiement automatique.</strong></p></section><footer>StackBlitz ne peut pas être certifié depuis ce rapport local. Pour un alignement total, relever séparément son commit GitHub main.</footer></body></html>`;
}
