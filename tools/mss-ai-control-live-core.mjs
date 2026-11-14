/** MSS AI CONTROL V4 — local-only supervisor helpers, intentionally read-only. */
import { resolve, sep } from 'node:path';
import { isIP } from 'node:net';

export function isOutsideRepository(repoRoot, reportDir) {
  const root = resolve(repoRoot), out = resolve(reportDir);
  return out !== root && !out.startsWith(root + sep);
}
export function assertLoopbackHost(host) {
  if (host !== '127.0.0.1') throw new Error('Écoute réseau interdite : utiliser 127.0.0.1 uniquement.');
  return host;
}
export function sanitizeReport(data) {
  if (!data || data.schema !== 'mss-ai-control-dashboard-v3') throw new Error('Rapport V3 absent ou invalide.');
  const value = (x) => typeof x === 'string' ? x.slice(0,500) : null;
  return {
    generatedAt:value(data.generatedAt),
    pc: {status:value(data.pc?.status),branch:value(data.pc?.branch),sha:value(data.pc?.localSha)},
    github: {status:value(data.github?.status),sha:value(data.github?.sha)},
    stackblitz:{status:'NON_VERIFIE'},
    qa: {status:value(data.qa?.status),scope:value(data.qa?.scope),tests:Array.isArray(data.qa?.tests)?data.qa.tests.slice(0,30).map(t=>({name:value(t.name),ok:t.ok===true})):[]},
    alerts:Array.isArray(data.alerts)?data.alerts.slice(0,40).map(value):[],
    actions:Array.isArray(data.actions)?data.actions.slice(0,40).map(value):[],
  };
}
export function buildPage() {
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MSS AI CONTROL — Console V4</title><style>
:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#0c1420;color:#edf3fa}body{max-width:1100px;margin:auto;padding:24px}h1{font-size:clamp(1.5rem,4vw,2.5rem);margin:0 0 8px}p,.muted{color:#b4c4d5}header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:22px}.card,section{background:#192638;border:1px solid #34485e;border-radius:16px;padding:18px;margin:0}.card h2{font-size:1.05rem;margin:0 0 10px}.status{font-weight:700}.ok{color:#7fdfb0}.warn{color:#ffd385}.bad{color:#ff939b}button{background:#e9effb;color:#162334;border:0;border-radius:10px;padding:12px 16px;cursor:pointer;font-weight:700}button:disabled{opacity:.6;cursor:wait}section{margin-top:14px}li{margin:8px 0;overflow-wrap:anywhere}code{overflow-wrap:anywhere}small{color:#aec3dc}a{color:#a9d2ff}#error{color:#ff939b}footer{margin-top:20px;color:#abc0d4}
</style></head><body><header><div><h1>🛡 MSS AI CONTROL</h1><p>Console V4 · PC / GitHub / StackBlitz · lecture seule</p></div><button id="refresh">Relancer le contrôle</button></header><p id="progress" role="status">Chargement du dernier rapport…</p><p id="error" role="alert"></p><div class="grid"><article class="card"><h2>PC / VS Code</h2><div id="pc" class="status">—</div><small id="pc-meta"></small></article><article class="card"><h2>GitHub · main</h2><div id="github" class="status">—</div><small id="github-meta"></small></article><article class="card"><h2>StackBlitz</h2><div class="status warn">NON VÉRIFIÉ</div><small>Un contrôle depuis le PC ne prouve pas le commit StackBlitz. Vérification séparée indispensable.</small></article><article class="card"><h2>Robots QA</h2><div id="qa" class="status">—</div><small id="qa-meta"></small></article></div><section><h2>Alertes</h2><ul id="alerts"></ul></section><section><h2>Actions recommandées (manuelles)</h2><ul id="actions"></ul></section><footer>Rapports hors dépôt Git. Aucun push, reset, merge, checkout ou déploiement. <a href="/rapport" target="_blank" rel="noopener">Rapport HTML détaillé</a></footer>
<script>
'use strict';const $=id=>document.getElementById(id);const put=(id,value)=>{$(id).textContent=value??'—'};const fmt=v=>typeof v==='string'?v.slice(0,12):'?';function list(id,items){const el=$(id);el.replaceChildren();for(const message of items?.length?items:['Aucun']){const li=document.createElement('li');li.textContent=message??'';el.append(li)}}
function render(d){put('pc',d.pc.status);$('pc').className='status '+(d.pc.status==='ALIGNE'?'ok':'bad');put('pc-meta',String(d.pc.branch??'?')+' · '+fmt(d.pc.sha));put('github',d.github.status);$('github').className='status '+(d.github.status==='REFERENCE_VERIFIEE'?'ok':'warn');put('github-meta',fmt(d.github.sha));put('qa',d.qa.status);$('qa').className='status '+(d.qa.status==='PASS'?'ok':'warn');put('qa-meta',d.qa.tests.length+' suites · '+d.qa.scope);list('alerts',d.alerts);list('actions',d.actions);put('progress','Rapport du '+(d.generatedAt??'?'))}
async function fetchReport(){try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error('Rapport indisponible');render(await r.json())}catch(e){put('error',String(e.message))}}
$('refresh').addEventListener('click',async()=>{const b=$('refresh');b.disabled=true;put('progress','Contrôle en cours…');put('error','');try{const r=await fetch('/api/refresh',{method:'POST'});const d=await r.json();if(!r.ok)put('error',d.error??'Contrôle bloqué');await fetchReport()}catch(e){put('error',String(e.message))}finally{b.disabled=false}});fetchReport();
</script></body></html>`;
}
