export function adminHtml(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SCORING RADAR + SOCIAL GROWTH — MULTISPORTS SCORING</title>
<style>
  :root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070a0f;color:#f7f9fc}
  *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#171f2e 0,#090d14 42%,#05070b 100%);min-height:100vh}
  button,input,select{font:inherit}.wrap{max-width:1380px;margin:0 auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  h1{font-size:clamp(26px,4vw,44px);margin:0;letter-spacing:.02em}.sub{color:#aeb9c9;margin:6px 0 0}.badge{border:1px solid #2f455f;border-radius:999px;padding:8px 12px;color:#9dd9ff;background:#0b1420}
  .panel{margin-top:20px;border:1px solid #263142;background:rgba(10,15,23,.86);border-radius:18px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.3)}
  .auth{display:grid;grid-template-columns:minmax(220px,1fr) 120px 130px 160px;gap:10px}.auth input,.auth button,.assetForm input,.assetForm select,.assetForm button{height:44px;border-radius:11px;border:1px solid #344358;background:#0c121c;color:#fff;padding:0 12px}.auth button,.assetForm button{cursor:pointer;font-weight:800;background:#16263a}.auth button.primary,.gold{background:#f1c40f!important;color:#090b0e!important;border-color:#f1c40f!important}.auth button:disabled{opacity:.55;cursor:not-allowed}
  .stats{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin-top:14px}.stat{padding:14px;border-radius:14px;background:#0c131d;border:1px solid #253246}.stat b{display:block;font-size:28px}.stat span{font-size:12px;color:#97a6b8;text-transform:uppercase;letter-spacing:.08em}
  .status{margin-top:10px;min-height:22px;color:#aab7c9}.status.err{color:#ff8c8c}.status.ok{color:#8df5b3}.status.warn{color:#ffd980}
  .headrow{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap}.headrow h2{margin:0}.headrow label{font-size:13px;color:#aeb9c9}.headrow input{width:90px;height:38px;margin-left:8px;border:1px solid #344358;border-radius:10px;background:#0c121c;color:#fff;padding:0 10px}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.card{border:1px solid #29374b;border-radius:16px;padding:15px;background:#0a1019}.card.hot{border-color:#d6ad15;box-shadow:inset 0 0 0 1px rgba(241,196,15,.15)}.card.pass{border-color:#2b7952}.card.reject{border-color:#6a3030;opacity:.86}
  .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pill{font-size:11px;border:1px solid #34465f;border-radius:999px;padding:5px 8px;color:#b7c5d8}.score{margin-left:auto;font-weight:900;font-size:19px;color:#f5d44c}.card h3{font-size:16px;margin:12px 0 7px}.snippet{font-size:13px;line-height:1.45;color:#aeb9c9;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.reason{font-size:12px;color:#7fd9ff;margin-top:10px}.reply,.copybox{font-size:13px;line-height:1.45;background:#0d1722;border-radius:12px;padding:11px;margin-top:10px;white-space:pre-wrap}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.actions a,.actions button,.actions select{border:1px solid #34465f;border-radius:10px;background:#101b28;color:#fff;text-decoration:none;padding:8px 10px;font-size:12px;cursor:pointer}.actions button.danger{border-color:#703939;color:#ffaaaa}
  .qa{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:11px}.qa div{background:#0d1520;border-radius:10px;padding:8px;font-size:11px;color:#aeb9c9}.qa b{display:block;color:#fff;font-size:15px}.assetForm{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(160px,.7fr) 120px repeat(3,90px) 150px;gap:8px;margin-top:14px}.assetForm .wide{min-width:0}.check{height:44px;display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #344358;border-radius:11px;background:#0c121c;color:#c4cfdb;font-size:12px}.check input{height:auto;margin:0;padding:0}
  .safeBox{margin-top:12px;padding:12px;border-radius:13px;border:1px solid #31516b;background:#0b1722;color:#b9d5e9;font-size:13px;line-height:1.45}.empty{padding:28px;text-align:center;color:#8c9aad}.foot{padding:22px 0;color:#718095;font-size:12px;text-align:center}
  .scanMonitor{margin-top:14px;border:1px solid #31435a;border-radius:16px;background:#09111a;padding:14px}.scanMonitor.failed{border-color:#7d3333}.scanMonitor.done{border-color:#2c6d4d}.scanTop{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.scanTitle{font-weight:900;font-size:16px}.scanClock{font-variant-numeric:tabular-nums;color:#f6d65b;font-weight:900}.scanTrack{height:10px;background:#111d2b;border:1px solid #263b52;border-radius:999px;overflow:hidden;margin:12px 0}.scanBar{height:100%;width:0;background:linear-gradient(90deg,#f1c40f,#8de5ff);transition:width .35s ease}.scanMonitor.failed .scanBar{background:#ff7373}.scanMonitor.done .scanBar{background:#73dfa3}
  .scanSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.scanStep{border:1px solid #223146;background:#0c151f;border-radius:11px;padding:9px;font-size:12px;color:#75869a}.scanStep b{display:block;color:#b8c5d5;margin-bottom:3px}.scanStep.active{border-color:#c9a81c;color:#f3d868}.scanStep.active b{color:#fff}.scanStep.done{border-color:#2b694b;color:#8fe7b0}.scanStep.done b{color:#fff}.scanStep.failed{border-color:#7d3333;color:#ff9e9e}.scanMetrics{display:grid;grid-template-columns:repeat(7,minmax(80px,1fr));gap:7px;margin-top:12px}.scanMetric{background:#0c151f;border-radius:10px;padding:9px}.scanMetric b{display:block;font-size:18px}.scanMetric span{font-size:10px;color:#8292a5;text-transform:uppercase}.scanDetail{margin-top:10px;color:#9eb0c3;font-size:12px;line-height:1.45;overflow-wrap:anywhere}.scanError{margin-top:10px;padding:9px;border-radius:10px;background:#261313;color:#ffb0b0;display:none}.scanError.visible{display:block}
  @media(max-width:1100px){.scanSteps{grid-template-columns:repeat(2,1fr)}.scanMetrics{grid-template-columns:repeat(4,1fr)}.assetForm{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}
  @media(max-width:650px){.wrap{padding:14px}.auth,.assetForm{grid-template-columns:1fr}.qa{grid-template-columns:1fr 1fr}.scanSteps,.scanMetrics{grid-template-columns:1fr 1fr}}
</style>
</head>
<body><main class="wrap">
  <div class="top"><div><h1>SCORING RADAR + SOCIAL GROWTH</h1><p class="sub">Détection d'intentions + campagnes sociales sous contrôle qualité</p></div><div class="badge">SAFE MODE • QUALITY GATE • APPROVED MEDIA ONLY</div></div>
  <section class="panel">
    <div class="auth">
      <input id="token" type="password" autocomplete="off" placeholder="RADAR_ADMIN_TOKEN" />
      <button id="save">Connexion</button><button id="refresh">Actualiser</button><button id="run" class="primary">Scanner maintenant</button>
    </div>
    <div id="status" class="status">Saisis le token administrateur du Worker.</div>
    <div id="scanMonitor" class="scanMonitor">
      <div class="scanTop"><div><div id="scanTitle" class="scanTitle">RADAR prêt</div><div id="scanSubtitle" class="sub">Le prochain scan affichera chaque étape ici.</div></div><div id="scanClock" class="scanClock">00:00</div></div>
      <div class="scanTrack"><div id="scanBar" class="scanBar"></div></div>
      <div id="scanSteps" class="scanSteps"></div>
      <div class="scanMetrics">
        <div class="scanMetric"><b id="mQueries">0</b><span>Requêtes Brave</span></div>
        <div class="scanMetric"><b id="mBrave">0</b><span>Résultats Brave</span></div>
        <div class="scanMetric"><b id="mNew">0</b><span>Nouveaux</span></div>
        <div class="scanMetric"><b id="mAnalyzed">0</b><span>Analysés IA</span></div>
        <div class="scanMetric"><b id="mEligible">0</b><span>Opportunités</span></div>
        <div class="scanMetric"><b id="mHot">0</b><span>Score 90+</span></div>
        <div class="scanMetric"><b id="mCampaigns">0</b><span>Campagnes</span></div>
      </div>
      <div id="scanDetail" class="scanDetail">Aucun scan suivi pour l'instant.</div>
      <div id="scanError" class="scanError"></div>
    </div>
    <div class="stats">
      <div class="stat"><b id="sSightings">—</b><span>Détections</span></div><div class="stat"><b id="sAnalyzed">—</b><span>Analysées</span></div><div class="stat"><b id="sEligible">—</b><span>Opportunités</span></div><div class="stat"><b id="sHot">—</b><span>Score 90+</span></div><div class="stat"><b id="sClicks">—</b><span>Clics</span></div>
    </div>
  </section>

  <section class="panel">
    <div class="headrow"><div><h2>SOCIAL GROWTH IA</h2><div class="sub">Une seconde IA rejette les campagnes faibles. Aucun média non approuvé ne peut passer.</div></div><div class="badge" id="socialMode">MODE —</div></div>
    <div class="stats">
      <div class="stat"><b id="cTotal">—</b><span>Campagnes</span></div><div class="stat"><b id="cReady">—</b><span>À valider</span></div><div class="stat"><b id="cApproved">—</b><span>Approuvées</span></div><div class="stat"><b id="cRejected">—</b><span>Rejetées QA</span></div><div class="stat"><b id="cAssets">—</b><span>Médias approuvés</span></div>
    </div>
    <div class="safeBox"><b>Verrou média :</b> la V1 n'autorise que des captures/vidéos réellement approuvées. Les créations IA aléatoires, faux écrans, faux avis, faux chiffres et médias non contrôlés restent bloqués.</div>
    <form id="assetForm" class="assetForm">
      <input class="wide" id="assetUrl" placeholder="URL HTTPS du média approuvé" required />
      <input id="assetTitle" placeholder="Nom du média" />
      <select id="assetType"><option value="video">Vidéo</option><option value="image">Image</option></select>
      <input id="assetQuality" type="number" min="0" max="100" value="95" title="Qualité" />
      <input id="assetTechnical" type="number" min="0" max="100" value="95" title="Technique" />
      <input id="assetBrand" type="number" min="0" max="100" value="95" title="Marque" />
      <label class="check"><input id="assetApproved" type="checkbox" />Validé humainement</label>
      <button class="gold" type="submit">Ajouter média</button>
    </form>
    <div id="campaigns" class="grid"><div class="empty">Aucune campagne chargée.</div></div>
  </section>

  <section class="panel">
    <div class="headrow"><div><h2>Opportunités détectées</h2><div class="sub">Réponses générées dans la langue d'origine, affiliation transparente.</div></div><label>Score minimum <input id="minScore" type="number" min="0" max="100" value="70" /></label></div>
    <div id="opps" class="grid"><div class="empty">Aucune donnée chargée.</div></div>
  </section>
  <div class="foot">Le mode actuel prépare et contrôle les campagnes. Les connecteurs de publication restent désactivés jusqu'à configuration OAuth/API des comptes sociaux.</div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const tokenInput = $('token');
  const runButton = $('run');
  tokenInput.value = sessionStorage.getItem('scoringRadarToken') || '';
  const headers = () => ({ Authorization: 'Bearer ' + tokenInput.value.trim() });
  const setStatus = (text, kind='') => { status.textContent = text; status.className = 'status ' + kind; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const copy = async (text) => { await navigator.clipboard.writeText(text); setStatus('Texte copié.', 'ok'); };
  async function request(path, init={}) {
    const response = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || ('HTTP ' + response.status)); error.status = response.status; throw error; }
    return data;
  }

  const STAGES = [
    ['starting','Préparation'],['localizing','Requête / langue'],['brave_search','Brave Search'],['deduplicating','Déduplication'],
    ['queueing','Mise en file'],['awaiting_classification','Attente IA'],['classifying','Analyse IA'],['social_growth','Social Growth']
  ];
  const STAGE_PROGRESS = {starting:4,localizing:12,brave_search:30,deduplicating:45,queueing:55,awaiting_classification:63,classifying:80,social_growth:92,completed:100,social_growth_failed:100,classification_failed:100,watchdog_timeout:100,failed:100};
  let activeRunId = null;
  let pollTimer = null;
  let clockTimer = null;
  let lastRun = null;

  function formatDuration(ms) {
    const sec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const min = Math.floor(sec / 60);
    return String(min).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0');
  }
  function isActive(run){ return run && ['running','processing','queued'].includes(run.status); }
  function normalizedStage(stage){ if(stage==='classification_failed')return 'classifying'; if(stage==='social_growth_failed')return 'social_growth'; if(String(stage||'').endsWith('_failed'))return String(stage).slice(0,-7); return stage; }
  function stageIndex(stage){ const normalized=normalizedStage(stage); return STAGES.findIndex((entry) => entry[0] === normalized); }
  function updateClock(){
    if (!lastRun) return;
    let elapsed = Number(lastRun.elapsed_ms || 0);
    if (isActive(lastRun)) {
      const started = Date.parse(lastRun.started_at || '');
      if (Number.isFinite(started)) elapsed = Math.max(elapsed, Date.now() - started);
    }
    $('scanClock').textContent = formatDuration(elapsed);
  }
  function renderRun(run){
    lastRun = run || null;
    const monitor = $('scanMonitor');
    monitor.className = 'scanMonitor';
    if (!run) {
      $('scanTitle').textContent = 'RADAR prêt'; $('scanSubtitle').textContent = 'Le prochain scan affichera chaque étape ici.'; $('scanBar').style.width='0%'; $('scanClock').textContent='00:00'; $('scanDetail').textContent='Aucun scan suivi pour l\'instant.'; $('scanError').className='scanError'; runButton.disabled=false; return;
    }
    const active = isActive(run); const failed = run.status === 'failed'; const warning = run.status === 'completed_with_warnings';
    if (failed) monitor.classList.add('failed'); else if (!active) monitor.classList.add('done');
    runButton.disabled = active;
    const normalized = normalizedStage(run.stage); const progress = STAGE_PROGRESS[run.stage] ?? STAGE_PROGRESS[normalized] ?? (active ? 10 : 100);
    $('scanBar').style.width = String(progress) + '%';
    if (failed) $('scanTitle').textContent = '❌ SCAN ÉCHOUÉ';
    else if (warning) $('scanTitle').textContent = '⚠️ SCAN TERMINÉ AVEC AVERTISSEMENT';
    else if (active && run.stalled) $('scanTitle').textContent = '⚠️ SCAN SEMBLE BLOQUÉ';
    else if (active) $('scanTitle').textContent = '🔎 SCAN EN COURS';
    else $('scanTitle').textContent = '✅ SCAN TERMINÉ';
    $('scanSubtitle').textContent = 'ID ' + String(run.run_id || '').slice(0,8) + ' • étape : ' + String(run.stage || '—');
    $('mQueries').textContent = run.queries ?? 0; $('mBrave').textContent = run.brave_results ?? 0; $('mNew').textContent = run.new_candidates ?? 0;
    $('mAnalyzed').textContent = run.analyzed ?? 0; $('mEligible').textContent = run.eligible ?? 0; $('mHot').textContent = run.high_intent ?? 0; $('mCampaigns').textContent = run.social_campaigns ?? 0;
    const current = stageIndex(run.stage); const terminalFailure = run.status==='failed' || String(run.stage||'').endsWith('_failed') || run.stage==='watchdog_timeout'; const skippedAfterSearch = run.status==='completed' && Number(run.queued||0)===0;
    $('scanSteps').innerHTML = STAGES.map((entry, idx) => {
      let cls='scanStep'; let mark='○'; let label='En attente'; let finishedStep=false;
      if (skippedAfterSearch && idx >= 4) { mark='—'; label='Non requis'; }
      else if (run.stage === 'completed' || (!active && !failed && idx <= current)) { cls+=' done'; mark='✓'; finishedStep=true; }
      else if (idx < current) { cls+=' done'; mark='✓'; finishedStep=true; }
      else if (idx === current && active) { cls+=' active'; mark='⟳'; }
      else if (terminalFailure && idx === Math.max(0,current)) { cls+=' failed'; mark='✕'; label='Échec'; }
      const timings = run.details && run.details.timings && typeof run.details.timings === 'object' ? run.details.timings : {};
      const t = Number(timings[entry[0]] || 0); const time = t > 0 ? (t/1000).toFixed(1) + ' s' : (finishedStep ? 'Terminé' : label);
      return '<div class="'+cls+'"><b>'+mark+' '+esc(entry[1])+'</b>'+esc(time)+'</div>';
    }).join('');
    const detail=[]; if(run.details&&run.details.market)detail.push('Marché : '+run.details.market); if(run.details&&run.details.intent)detail.push('Intent : '+run.details.intent); if(run.details&&run.details.query)detail.push('Requête : '+run.details.query); if(run.stalled)detail.push('Aucune mise à jour depuis '+Math.round(Number(run.stale_for_ms||0)/1000)+' s');
    $('scanDetail').textContent = detail.join(' • ') || 'Progression enregistrée côté Worker.';
    const errorBox=$('scanError'); if(run.error){errorBox.textContent='Erreur : '+run.error;errorBox.className='scanError visible';}else{errorBox.textContent='';errorBox.className='scanError';}
    updateClock();
  }
  function stopPolling(){ if(pollTimer){clearTimeout(pollTimer);pollTimer=null;} activeRunId=null; }
  async function pollRun(){
    if(!activeRunId)return;
    try{
      const data=await request('/api/runs/'+encodeURIComponent(activeRunId)); renderRun(data.run);
      if(isActive(data.run)){pollTimer=setTimeout(pollRun,1000);}else{stopPolling();setStatus(data.run&&data.run.status==='failed'?'Scan échoué : '+(data.run.error||'erreur inconnue'):'Scan terminé. Résultats et compteurs actualisés. ',data.run&&data.run.status==='failed'?'err':'ok');setTimeout(()=>load(false),500);}
    }catch(error){ if(error.status===404){pollTimer=setTimeout(pollRun,700);return;} stopPolling();setStatus('Suivi du scan impossible : '+error.message,'err'); }
  }
  function followRun(run){ if(!run)return; renderRun(run); if(isActive(run)){activeRunId=run.run_id;if(pollTimer)clearTimeout(pollTimer);pollTimer=setTimeout(pollRun,500);} }

  function renderOpportunities(rows) {
    const root=$('opps'); if(!rows.length){root.innerHTML='<div class="empty">Aucune opportunité au-dessus du seuil actuel.</div>';return;}
    root.innerHTML=rows.map((row)=>{const reply=row.reply_with_link||row.suggested_reply||'';const score=Number(row.score||0);return '<article class="card '+(score>=90?'hot':'')+'"><div class="meta"><span class="pill">'+esc(row.language||'und')+'</span><span class="pill">'+esc(row.market||'')+'</span><span class="pill">'+esc(row.category||'autre')+'</span><span class="score">'+score+'/100</span></div><h3>'+esc(row.title||row.source_url)+'</h3><div class="snippet">'+esc(row.snippet||'')+'</div><div class="reason">'+esc(row.reason||'')+'</div><div class="reply">'+esc(reply)+'</div><div class="actions"><a target="_blank" rel="noopener" href="'+esc(row.source_url)+'">Source</a><button data-copy="'+encodeURIComponent(reply)+'">Copier réponse</button><a class="gold" target="_blank" rel="noopener" href="'+esc(row.tracked_link)+'">Tester lien</a></div></article>';}).join('');
    root.querySelectorAll('[data-copy]').forEach((b)=>b.addEventListener('click',()=>copy(decodeURIComponent(b.dataset.copy||''))));
  }
  function assetOptions(assets, selected){return '<option value="">Choisir média approuvé</option>'+assets.map((a)=>'<option value="'+esc(a.id)+'" '+(selected===a.id?'selected':'')+'>'+esc(a.title||a.url)+' • '+esc(a.media_type)+'</option>').join('');}
  function renderCampaigns(rows, assets){
    const root=$('campaigns');if(!rows.length){root.innerHTML='<div class="empty">Aucune campagne générée pour l’instant.</div>';return;}
    root.innerHTML=rows.map((row)=>{const pass=row.status==='ready_for_review'||row.status==='approved';const copies=row.platform_copy||{};return '<article class="card '+(pass?'pass':'reject')+'"><div class="meta"><span class="pill">'+esc(row.language)+'</span><span class="pill">'+esc(row.media_type)+'</span><span class="pill">'+esc(row.status)+'</span><span class="score">'+esc(row.quality_score)+'/100</span></div><h3>'+esc(row.hook||row.topic)+'</h3><div class="snippet">'+esc(row.angle)+'</div><div class="qa"><div><b>'+esc(row.factual_score)+'</b>Factuel</div><div><b>'+esc(row.visual_score)+'</b>Visuel</div><div><b>'+esc(row.spam_risk)+'</b>Risque spam</div><div><b>'+esc(row.cringe_risk)+'</b>Risque cheap</div></div><div class="reason">'+esc(row.qa_reason)+'</div><div class="copybox">'+esc(copies.facebook_page||'')+'</div><div class="actions"><button data-social-copy="facebook_page" data-id="'+esc(row.id)+'">Copier Facebook</button><button data-social-copy="instagram_reel" data-id="'+esc(row.id)+'">Instagram</button><button data-social-copy="youtube_short" data-id="'+esc(row.id)+'">YouTube</button><button data-social-copy="tiktok" data-id="'+esc(row.id)+'">TikTok</button></div><div class="actions"><select data-asset-select="'+esc(row.id)+'">'+assetOptions(assets.filter((a)=>a.media_type===row.media_type),row.selected_asset_id)+'</select><button data-attach="'+esc(row.id)+'">Associer média</button><button class="gold" data-approve="'+esc(row.id)+'">Approuver</button><button class="danger" data-reject="'+esc(row.id)+'">Rejeter</button></div></article>';}).join('');
    const byId=new Map(rows.map((r)=>[r.id,r])); root.querySelectorAll('[data-social-copy]').forEach((b)=>b.addEventListener('click',()=>{const r=byId.get(b.dataset.id);copy((r&&r.platform_copy&&r.platform_copy[b.dataset.socialCopy])||'');}));
    root.querySelectorAll('[data-attach]').forEach((b)=>b.addEventListener('click',async()=>{const id=b.dataset.attach;const select=root.querySelector('[data-asset-select="'+id+'"]');if(!select||!select.value)return setStatus('Choisis un média approuvé.','err');try{await request('/api/social/campaigns/'+id+'/asset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assetId:select.value})});setStatus('Média associé à la campagne.','ok');load(false);}catch(e){setStatus('Erreur média : '+e.message,'err');}}));
    root.querySelectorAll('[data-approve]').forEach((b)=>b.addEventListener('click',async()=>{try{await request('/api/social/campaigns/'+b.dataset.approve+'/approve',{method:'POST'});setStatus('Campagne approuvée. Publication toujours verrouillée tant que les connecteurs sociaux ne sont pas configurés.','ok');load(false);}catch(e){setStatus('Approbation refusée : '+e.message,'err');}}));
    root.querySelectorAll('[data-reject]').forEach((b)=>b.addEventListener('click',async()=>{try{await request('/api/social/campaigns/'+b.dataset.reject+'/reject',{method:'POST'});setStatus('Campagne rejetée.','ok');load(false);}catch(e){setStatus('Erreur : '+e.message,'err');}}));
  }

  async function load(showLoading=true){
    if(!tokenInput.value.trim()){setStatus('Token administrateur requis.','err');return;}
    if(showLoading)setStatus('Chargement…');
    try{
      const minScore=Math.max(0,Math.min(100,Number($('minScore').value||70)));
      const [statsData,oppData,socialData,campaignData,assetData,runData]=await Promise.all([
        request('/api/stats'),request('/api/opportunities?minScore='+minScore+'&limit=200'),request('/api/social/stats'),request('/api/social/campaigns?limit=100'),request('/api/social/assets?approvedOnly=1'),request('/api/runs/latest')
      ]);
      const stats=statsData.stats||{};$('sSightings').textContent=stats.sightings??0;$('sAnalyzed').textContent=stats.analyzed??0;$('sEligible').textContent=stats.eligible??0;$('sHot').textContent=stats.highIntent??0;$('sClicks').textContent=stats.clicks??0;
      const ss=socialData.stats||{};$('cTotal').textContent=ss.total??0;$('cReady').textContent=ss.ready??0;$('cApproved').textContent=ss.approved??0;$('cRejected').textContent=ss.rejected??0;$('cAssets').textContent=ss.approvedAssets??0;$('socialMode').textContent='MODE '+String(socialData.mode||'review').toUpperCase();
      renderCampaigns(campaignData.campaigns||[],assetData.assets||[]);renderOpportunities(oppData.opportunities||[]);followRun(runData.run);
      const run=runData.run;
      if(!isActive(run)){
        if(run&&run.status==='failed')setStatus('Dernier scan ÉCHOUÉ • étape '+run.stage+' • '+(run.error||'erreur inconnue'),'err');
        else if(run)setStatus('Dernier scan : '+(run.finished_at||run.started_at)+' • '+(run.brave_results||0)+' résultats Brave • '+(run.new_candidates||0)+' nouveaux','ok');
        else setStatus('Radar prêt.','ok');
      } else setStatus(run.stalled?'Scan actif mais sans mise à jour récente : watchdog en surveillance.':'Scan en cours : suivi automatique actif.',run.stalled?'warn':'ok');
    }catch(error){setStatus('Erreur : '+error.message,'err');}
  }

  $('assetForm').addEventListener('submit',async(e)=>{e.preventDefault();try{const body={url:$('assetUrl').value.trim(),title:$('assetTitle').value.trim(),mediaType:$('assetType').value,qualityScore:Number($('assetQuality').value),technicalScore:Number($('assetTechnical').value),brandScore:Number($('assetBrand').value),humanApproved:$('assetApproved').checked,platforms:['facebook_page','instagram_reel','youtube_short','tiktok']};const result=await request('/api/social/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setStatus(result.humanApproved?'Média ajouté et approuvé.':'Média ajouté mais NON approuvé : vérifie les scores et la validation humaine.','ok');e.target.reset();$('assetQuality').value='95';$('assetTechnical').value='95';$('assetBrand').value='95';load(false);}catch(error){setStatus('Erreur ajout média : '+error.message,'err');}});
  $('save').addEventListener('click',()=>{sessionStorage.setItem('scoringRadarToken',tokenInput.value.trim());load();});
  $('refresh').addEventListener('click',()=>load()); $('minScore').addEventListener('change',()=>load(false));
  runButton.addEventListener('click',async()=>{
    if(!tokenInput.value.trim())return setStatus('Token administrateur requis.','err');
    runButton.disabled=true; setStatus('Démarrage du scan…','ok');
    try{
      const result=await request('/api/run',{method:'POST'}); activeRunId=result.run_id;
      if(result.run)renderRun(result.run); else renderRun({run_id:result.run_id,status:'running',stage:'starting',started_at:result.triggered_at,updated_at:result.triggered_at,elapsed_ms:0,queries:0,brave_results:0,new_candidates:0,queued:0,analyzed:0,eligible:0,high_intent:0,social_campaigns:0,error:null,details:{}});
      setStatus(result.already_running?'Un scan était déjà actif : suivi repris.':'Scan démarré. Le bouton ne bloque plus le navigateur.','ok');
      if(pollTimer)clearTimeout(pollTimer);pollTimer=setTimeout(pollRun,500);
    }catch(error){runButton.disabled=false;setStatus('Erreur démarrage scan : '+error.message,'err');}
  });
  clockTimer=setInterval(updateClock,500);
  if(tokenInput.value)load();
})();
</script></body></html>`;
}
