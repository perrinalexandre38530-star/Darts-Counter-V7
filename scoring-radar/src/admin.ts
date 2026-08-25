export function adminHtml(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SCORING RADAR — MULTISPORTS SCORING</title>
<style>
  :root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070a0f;color:#f7f9fc}
  *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#171f2e 0,#090d14 42%,#05070b 100%);min-height:100vh}
  .wrap{max-width:1320px;margin:0 auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  h1{font-size:clamp(26px,4vw,46px);margin:0;letter-spacing:.02em}.sub{color:#aeb9c9;margin:6px 0 0}.badge{border:1px solid #2f455f;border-radius:999px;padding:8px 12px;color:#9dd9ff;background:#0b1420}
  .panel{margin-top:20px;border:1px solid #263142;background:rgba(10,15,23,.86);border-radius:18px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.3)}
  .auth{display:grid;grid-template-columns:minmax(220px,1fr) 120px 130px 130px;gap:10px}.auth input,.auth button{height:44px;border-radius:11px;border:1px solid #344358;background:#0c121c;color:#fff;padding:0 12px}.auth button{cursor:pointer;font-weight:800;background:#16263a}.auth button.primary{background:#f1c40f;color:#090b0e;border-color:#f1c40f}
  .stats{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin-top:14px}.stat{padding:14px;border-radius:14px;background:#0c131d;border:1px solid #253246}.stat b{display:block;font-size:28px}.stat span{font-size:12px;color:#97a6b8;text-transform:uppercase;letter-spacing:.08em}
  .status{margin-top:10px;min-height:22px;color:#aab7c9}.status.err{color:#ff8c8c}.status.ok{color:#8df5b3}
  .headrow{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap}.headrow h2{margin:0}.headrow label{font-size:13px;color:#aeb9c9}.headrow input{width:90px;height:38px;margin-left:8px;border:1px solid #344358;border-radius:10px;background:#0c121c;color:#fff;padding:0 10px}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.opp{border:1px solid #29374b;border-radius:16px;padding:15px;background:#0a1019}.opp.hot{border-color:#d6ad15;box-shadow:inset 0 0 0 1px rgba(241,196,15,.15)}
  .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pill{font-size:11px;border:1px solid #34465f;border-radius:999px;padding:5px 8px;color:#b7c5d8}.score{margin-left:auto;font-weight:900;font-size:19px;color:#f5d44c}.opp h3{font-size:16px;margin:12px 0 7px}.snippet{font-size:13px;line-height:1.45;color:#aeb9c9;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.reason{font-size:12px;color:#7fd9ff;margin-top:10px}.reply{font-size:13px;line-height:1.45;background:#0d1722;border-radius:12px;padding:11px;margin-top:10px;white-space:pre-wrap}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.actions a,.actions button{border:1px solid #34465f;border-radius:10px;background:#101b28;color:#fff;text-decoration:none;padding:8px 10px;font-size:12px;cursor:pointer}.actions .gold{background:#f1c40f;border-color:#f1c40f;color:#080a0c;font-weight:800}
  .empty{padding:28px;text-align:center;color:#8c9aad}.foot{padding:22px 0;color:#718095;font-size:12px;text-align:center}
  @media(max-width:850px){.auth{grid-template-columns:1fr 1fr}.auth input:first-child{grid-column:1/-1}.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}
</style>
</head>
<body><main class="wrap">
  <div class="top"><div><h1>SCORING RADAR</h1><p class="sub">Détection mondiale d'intentions pour MULTISPORTS SCORING</p></div><div class="badge">HUMAN REVIEW • NO AUTO-SPAM</div></div>
  <section class="panel">
    <div class="auth">
      <input id="token" type="password" autocomplete="off" placeholder="RADAR_ADMIN_TOKEN" />
      <button id="save">Connexion</button>
      <button id="refresh">Actualiser</button>
      <button id="run" class="primary">Scanner maintenant</button>
    </div>
    <div id="status" class="status">Saisis le token administrateur du Worker.</div>
    <div class="stats">
      <div class="stat"><b id="sSightings">—</b><span>Détections</span></div>
      <div class="stat"><b id="sAnalyzed">—</b><span>Analysées</span></div>
      <div class="stat"><b id="sEligible">—</b><span>Opportunités</span></div>
      <div class="stat"><b id="sHot">—</b><span>Score 90+</span></div>
      <div class="stat"><b id="sClicks">—</b><span>Clics</span></div>
    </div>
  </section>
  <section class="panel">
    <div class="headrow"><div><h2>Opportunités détectées</h2><div class="sub">Réponses générées dans la langue d'origine, affiliation transparente.</div></div><label>Score minimum <input id="minScore" type="number" min="0" max="100" value="70" /></label></div>
    <div id="opps" class="grid"><div class="empty">Aucune donnée chargée.</div></div>
  </section>
  <div class="foot">Le tableau de bord ne publie rien automatiquement. Toute réponse reste une décision humaine.</div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const tokenInput = $('token');
  tokenInput.value = sessionStorage.getItem('scoringRadarToken') || '';
  const headers = () => ({ Authorization: 'Bearer ' + tokenInput.value.trim() });
  const setStatus = (text, kind='') => { status.textContent = text; status.className = 'status ' + kind; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const copy = async (text) => { await navigator.clipboard.writeText(text); setStatus('Réponse copiée.', 'ok'); };

  async function request(path, init={}) {
    const response = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
    return data;
  }

  function renderOpportunities(rows) {
    const root = $('opps');
    if (!rows.length) { root.innerHTML = '<div class="empty">Aucune opportunité au-dessus du seuil actuel.</div>'; return; }
    root.innerHTML = rows.map((row) => {
      const reply = row.reply_with_link || row.suggested_reply || '';
      const score = Number(row.score || 0);
      return '<article class="opp '+(score >= 90 ? 'hot' : '')+'">'+
        '<div class="meta"><span class="pill">'+esc(row.language || 'und')+'</span><span class="pill">'+esc(row.market || '')+'</span><span class="pill">'+esc(row.category || 'autre')+'</span><span class="pill">'+esc(row.source || '')+'</span><span class="score">'+score+'/100</span></div>'+
        '<h3>'+esc(row.title || row.source_url)+'</h3><div class="snippet">'+esc(row.snippet || '')+'</div>'+
        '<div class="reason">'+esc(row.reason || '')+'</div><div class="reply">'+esc(reply)+'</div>'+
        '<div class="actions"><a target="_blank" rel="noopener" href="'+esc(row.source_url)+'">Source</a><button data-copy="'+encodeURIComponent(reply)+'">Copier réponse</button><a class="gold" target="_blank" rel="noopener" href="'+esc(row.tracked_link)+'">Tester lien suivi</a></div></article>';
    }).join('');
    root.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copy(decodeURIComponent(button.dataset.copy || ''))));
  }

  async function load() {
    if (!tokenInput.value.trim()) { setStatus('Token administrateur requis.', 'err'); return; }
    setStatus('Chargement…');
    try {
      const minScore = Math.max(0, Math.min(100, Number($('minScore').value || 70)));
      const [statsData, oppData] = await Promise.all([request('/api/stats'), request('/api/opportunities?minScore='+minScore+'&limit=200')]);
      const stats = statsData.stats || {};
      $('sSightings').textContent = stats.sightings ?? 0; $('sAnalyzed').textContent = stats.analyzed ?? 0; $('sEligible').textContent = stats.eligible ?? 0; $('sHot').textContent = stats.highIntent ?? 0; $('sClicks').textContent = stats.clicks ?? 0;
      renderOpportunities(oppData.opportunities || []);
      const run = stats.latestRun; setStatus(run ? ('Dernier scan : '+(run.finished_at || run.started_at)+' • '+(run.queued || 0)+' nouveaux candidats') : 'Radar prêt.', 'ok');
    } catch (error) { setStatus('Erreur : '+error.message, 'err'); }
  }

  $('save').addEventListener('click', () => { sessionStorage.setItem('scoringRadarToken', tokenInput.value.trim()); load(); });
  $('refresh').addEventListener('click', load);
  $('minScore').addEventListener('change', load);
  $('run').addEventListener('click', async () => { if (!tokenInput.value.trim()) return setStatus('Token administrateur requis.', 'err'); setStatus('Scan mondial en cours…'); try { await request('/api/run', { method:'POST' }); setStatus('Scan terminé. Classification en file de traitement…', 'ok'); setTimeout(load, 2500); } catch (error) { setStatus('Erreur scan : '+error.message, 'err'); } });
  if (tokenInput.value) load();
})();
</script></body></html>`;
}
