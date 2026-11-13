export function adminHtml(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SCORING RADAR — ACQUISITION ENGINE V4 — MULTISPORTS SCORING</title>
<style>
  :root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070a0f;color:#f7f9fc}
  *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#171f2e 0,#090d14 42%,#05070b 100%);min-height:100vh}
  button,input,select{font:inherit}.wrap{max-width:1380px;margin:0 auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  h1{font-size:clamp(26px,4vw,44px);margin:0;letter-spacing:.02em}.sub{color:#aeb9c9;margin:6px 0 0}.badge{border:1px solid #2f455f;border-radius:999px;padding:8px 12px;color:#9dd9ff;background:#0b1420}
  .panel{margin-top:20px;border:1px solid #263142;background:rgba(10,15,23,.86);border-radius:18px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.3)}
  .auth{display:grid;grid-template-columns:minmax(220px,1fr) 120px 130px 150px 170px;gap:10px}.auth input,.auth select,.auth button,.assetForm input,.assetForm select,.assetForm button{height:44px;border-radius:11px;border:1px solid #344358;background:#0c121c;color:#fff;padding:0 12px}.auth button,.assetForm button{cursor:pointer;font-weight:800;background:#16263a}.auth button.primary,.gold{background:#f1c40f!important;color:#090b0e!important;border-color:#f1c40f!important}.auth button:disabled{opacity:.55;cursor:not-allowed}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px}.stat{padding:14px;border-radius:14px;background:#0c131d;border:1px solid #253246}.stat b{display:block;font-size:28px}.stat span{font-size:12px;color:#97a6b8;text-transform:uppercase;letter-spacing:.08em}
  .status{margin-top:10px;min-height:22px;color:#aab7c9}.status.err{color:#ff8c8c}.status.ok{color:#8df5b3}.status.warn{color:#ffd980}
  .headrow{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap}.headrow h2{margin:0}.headrow label{font-size:13px;color:#aeb9c9}.headrow input{width:90px;height:38px;margin-left:8px;border:1px solid #344358;border-radius:10px;background:#0c121c;color:#fff;padding:0 10px}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.card{border:1px solid #29374b;border-radius:16px;padding:15px;background:#0a1019}.card.hot{border-color:#d6ad15;box-shadow:inset 0 0 0 1px rgba(241,196,15,.15)}.card.pass{border-color:#2b7952}.card.reject{border-color:#6a3030;opacity:.86}
  .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pill{font-size:11px;border:1px solid #34465f;border-radius:999px;padding:5px 8px;color:#b7c5d8}.score{margin-left:auto;font-weight:900;font-size:19px;color:#f5d44c}.card h3{font-size:16px;margin:12px 0 7px}.snippet{font-size:13px;line-height:1.45;color:#aeb9c9;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.reason{font-size:12px;color:#7fd9ff;margin-top:10px}.variant,.reply,.copybox{overflow-wrap:anywhere;word-break:break-word} .reply,.copybox{font-size:13px;line-height:1.45;background:#0d1722;border-radius:12px;padding:11px;margin-top:10px;white-space:pre-wrap}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.actions a,.actions button,.actions select{border:1px solid #34465f;border-radius:10px;background:#101b28;color:#fff;text-decoration:none;padding:8px 10px;font-size:12px;cursor:pointer}.actions button.danger{border-color:#703939;color:#ffaaaa}.actions button.success{border-color:#2b7952;color:#9ff0bd}.outreach-new{color:#ffe06b}.outreach-copied{color:#8fd7ff}.outreach-contacted{color:#b7a8ff}.outreach-won{color:#8df5b3}.outreach-dismissed{color:#8793a3}.embedCode{margin-top:10px;background:#060b11;border:1px solid #2a3a4f;border-radius:11px;padding:10px;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:#bde4ff;overflow:auto;white-space:nowrap}
  .qa{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:11px}.qa div{background:#0d1520;border-radius:10px;padding:8px;font-size:11px;color:#aeb9c9}.qa b{display:block;color:#fff;font-size:15px}.assetForm{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(160px,.7fr) 120px repeat(3,90px) 150px;gap:8px;margin-top:14px}.assetForm .wide{min-width:0}.check{height:44px;display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #344358;border-radius:11px;background:#0c121c;color:#c4cfdb;font-size:12px}.check input{height:auto;margin:0;padding:0}
  .targetGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.targetCard{border:1px solid #2b3c52;border-radius:14px;padding:12px;background:#0b131d}.targetCard b{display:block;margin-bottom:8px}.targetCard input{width:100%;height:40px;border-radius:9px;border:1px solid #344358;background:#07101a;color:#fff;padding:0 9px}.targetCard button{margin-top:8px;width:100%;height:36px;border-radius:9px;border:1px solid #d6ad15;background:#f1c40f;color:#111;font-weight:900;cursor:pointer}.targetMetric{font-size:12px;color:#9fb0c4;margin-top:7px}.funnel{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:12px}.funnel .stat{position:relative}
  .safeBox{margin-top:12px;padding:12px;border-radius:13px;border:1px solid #31516b;background:#0b1722;color:#b9d5e9;font-size:13px;line-height:1.45}.diagBox{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}.diagButton{border:1px solid #d6ad15;border-radius:11px;background:#f1c40f;color:#090b0e;padding:10px 14px;font-weight:900;cursor:pointer}.diagButton:disabled{opacity:.55;cursor:not-allowed}.diagnosticResult{grid-column:1/-1;margin-top:2px;padding:10px;border-radius:11px;background:#0c151f;color:#aeb9c9;font-size:12px;line-height:1.5}.diagnosticResult.ok{border:1px solid #2b7952;color:#a8efc4}.diagnosticResult.warn{border:1px solid #806a20;color:#ffe28a}.diagnosticResult.err{border:1px solid #7d3333;color:#ffaaaa}.diagMetrics{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.diagMetrics span{border:1px solid #34465f;border-radius:999px;padding:5px 8px;color:#c5d2e2}.empty{padding:28px;text-align:center;color:#8c9aad}.foot{padding:22px 0;color:#718095;font-size:12px;text-align:center}
  .scanMonitor{margin-top:14px;border:1px solid #31435a;border-radius:16px;background:#09111a;padding:14px}.scanMonitor.failed{border-color:#7d3333}.scanMonitor.done{border-color:#2c6d4d}.scanTop{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.scanTitle{font-weight:900;font-size:16px}.scanClock{font-variant-numeric:tabular-nums;color:#f6d65b;font-weight:900}.scanTrack{height:10px;background:#111d2b;border:1px solid #263b52;border-radius:999px;overflow:hidden;margin:12px 0}.scanBar{height:100%;width:0;background:linear-gradient(90deg,#f1c40f,#8de5ff);transition:width .35s ease}.scanMonitor.failed .scanBar{background:#ff7373}.scanMonitor.done .scanBar{background:#73dfa3}
  .scanSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.scanStep{border:1px solid #223146;background:#0c151f;border-radius:11px;padding:9px;font-size:12px;color:#75869a}.scanStep b{display:block;color:#b8c5d5;margin-bottom:3px}.scanStep.active{border-color:#c9a81c;color:#f3d868}.scanStep.active b{color:#fff}.scanStep.done{border-color:#2b694b;color:#8fe7b0}.scanStep.done b{color:#fff}.scanStep.failed{border-color:#7d3333;color:#ff9e9e}.scanMetrics{display:grid;grid-template-columns:repeat(5,minmax(80px,1fr));gap:7px;margin-top:12px}.scanMetric{background:#0c151f;border-radius:10px;padding:9px}.scanMetric b{display:block;font-size:18px}.scanMetric span{font-size:10px;color:#8292a5;text-transform:uppercase}.scanDetail{margin-top:10px;color:#9eb0c3;font-size:12px;line-height:1.45;overflow-wrap:anywhere}.scanError{margin-top:10px;padding:9px;border-radius:10px;background:#261313;color:#ffb0b0;display:none}.scanError.visible{display:block}
  :root{--accent:#f5c619;--line:#24384b} html{scroll-behavior:smooth}body{background:radial-gradient(ellipse at 65% -15%,rgba(16,95,109,.28),transparent 48%),radial-gradient(ellipse at 12% 4%,rgba(156,106,27,.1),transparent 40%),#070b12}.wrap{max-width:1240px}.top{padding:24px 4px 8px}.top h1{font-size:clamp(25px,3vw,38px);letter-spacing:-.02em}.heroAccent{color:#f4c922;font-size:.62em;vertical-align:middle}.top>.badge{font-size:12px}.panel{padding:22px;margin-top:16px;box-shadow:0 12px 32px rgba(0,0,0,.2)}.panel h2{font-size:clamp(19px,2vw,24px)}.sectionTitle{margin-bottom:14px}.sectionEyebrow{font-size:11px;letter-spacing:.13em;color:#f5ce45;font-weight:900;margin-bottom:5px}.quickNav{position:sticky;top:0;z-index:6;display:flex;gap:8px;overflow-x:auto;padding:10px 0;background:rgba(7,11,18,.95);backdrop-filter:blur(12px)}.quickNav a{white-space:nowrap;color:#c8d7e7;text-decoration:none;border:1px solid #294157;border-radius:999px;padding:9px 15px;background:#0d1925;font-weight:700;font-size:13px}.quickNav a:hover,.quickNav a:focus{color:#141414;background:#f5ce45}.intro{border-radius:20px;padding:20px;background:linear-gradient(115deg,#112335,#0a161e);border:1px solid #345068;margin-top:10px}.introHeading{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}.introHeading strong{font-size:20px}.introHeading span{color:#aac3d2;font-size:13px}.howGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.howCard{background:#0a131d;border:1px solid #263f51;border-radius:14px;padding:16px;min-width:0}.howNum{color:#f0c527;font-weight:900;letter-spacing:.07em;margin-right:10px}.howCard b{font-size:15px}.howCard p{font-size:13px;color:#b3c3d3;line-height:1.55;margin:10px 0 0}.advanced{margin-top:13px;background:#0b1520;border:1px solid #253b50;border-radius:12px;padding:2px 12px 12px}.advanced>summary{list-style:none;cursor:pointer;padding:12px 4px;color:#b0c8d8;font-weight:750;font-size:13px}.advanced>summary::before{content:'▸';color:#f5cc35;margin-right:9px}.advanced[open]>summary::before{content:'▾'}.advanced .stats{margin-top:4px}.diagExplanation{margin-bottom:10px;color:#d5e3f0}.auth{grid-template-columns:minmax(220px,1fr) 110px 120px 170px 190px}.auth .primary{font-size:13px}.card{padding:17px}.card .reply,.card .copybox{overflow-wrap:anywhere;word-break:break-word}.copybox{max-height:190px;overflow:auto}.card .actions{gap:8px}.card .actions button.gold{font-weight:850}.stat{background:linear-gradient(145deg,#0f1c29,#0b141e)}.targetCard input{font-size:12px}.status{line-height:1.45}.panel:target{scroll-margin-top:76px;border-color:#59634b}.foot{line-height:1.5}
  @media(max-width:820px){.howGrid{grid-template-columns:1fr}.top{padding-top:10px}.auth{grid-template-columns:1fr 1fr}.auth input{grid-column:1/-1}.auth .primary{grid-column:1/-1}.heroAccent{display:block;margin-top:3px}}
  @media(max-width:1100px){.targetGrid{grid-template-columns:1fr 1fr}.funnel{grid-template-columns:repeat(3,1fr)}.scanSteps{grid-template-columns:repeat(2,1fr)}.scanMetrics{grid-template-columns:repeat(4,1fr)}.assetForm{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}
  @media(max-width:650px){.targetGrid,.funnel{grid-template-columns:1fr}.wrap{padding:14px}.auth,.assetForm{grid-template-columns:1fr}.qa{grid-template-columns:1fr 1fr}.scanSteps,.scanMetrics{grid-template-columns:1fr 1fr}}

  .salesPanel{border-color:#3c556b;background:linear-gradient(140deg,rgba(19,38,53,.95),rgba(9,17,27,.94))}.salesIntro{color:#bbd1de;font-size:13px;line-height:1.6}.salesForm{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.salesForm label{display:flex;flex-direction:column;gap:5px;color:#b8cadd;font-size:12px;font-weight:750}.salesForm input,.salesForm textarea,.salesForm select,.salesSelect{min-width:0;width:100%;border:1px solid #3a536a;border-radius:10px;background:#07121e;color:#fff;padding:10px;font:inherit}.salesForm textarea{resize:vertical;min-height:75px}.salesForm .full{grid-column:1/-1}.salesForm button,.salesButton{border:1px solid #eac318;background:#f1c40f;color:#101218;border-radius:10px;padding:11px 16px;font-weight:900;cursor:pointer}.salesForm button:disabled,.salesButton:disabled{opacity:.55;cursor:not-allowed}.salesList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.salesCampaign{background:#0b1724;border:1px solid #365064;border-radius:13px;padding:13px;overflow-wrap:anywhere}.salesCampaign.active{border-color:#4f9476}.salesCampaign h3{margin:0 0 7px}.salesCampaign small{color:#a6bcd0}.salesCampaign p{color:#b9cada;font-size:13px}.salesDraft{border:1px solid #396075;background:#0a1824;padding:14px;border-radius:13px;margin-top:12px}.salesDraft p{font-size:13px;color:#cbd8e6;line-height:1.5}.salesDraft .variant{border:1px solid #2d485c;background:#07111d;padding:11px;margin:8px 0;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.salesDraft .actions button{font-size:12px}.salesInfo{border:1px solid #36536a;background:#0a1b2a;color:#bbd9ec;border-radius:12px;padding:13px;margin-top:12px;font-size:13px;line-height:1.6}
  @media(max-width:760px){.salesForm,.salesList{grid-template-columns:1fr}.salesForm .full{grid-column:auto}}
</style>
</head>
<body><main class="wrap">
  <div class="top"><div><h1>SCORING RADAR <span class="heroAccent">• MULTISPORTS SCORING</span></h1><p class="sub">Un assistant pour trouver des joueurs intéressés, leur répondre et mesurer les visites vers ton application.</p></div><div class="badge">🔒 Diffusion contrôlée • Aucun envoi sans confirmation</div></div>
  <nav class="quickNav" aria-label="Aller à une étape"><a href="#researchPanel">1 · Chercher</a><a href="#salesPanel">2 · Campagnes IA</a><a href="#opportunitiesPanel">3 · Répondre</a><a href="#publicationPanel">4 · Programmer</a><a href="#acquisitionPanel">5 · Mesurer</a><a href="#socialPanel">Campagnes sociales</a></nav>
  <section class="intro" aria-label="Comment utiliser le robot">
    <div class="introHeading"><strong>Comment ça marche ?</strong><span>Le robot prépare des opportunités. C'est toi qui décides où répondre et quoi publier.</span></div>
    <div class="howGrid">
      <div class="howCard"><span class="howNum">01</span><b>Repérer des demandes</b><p>Lance un scan ÉCO. Le robot cherche des discussions publiques où quelqu'un demande un compteur, des stats ou un jeu sportif.</p></div>
      <div class="howCard"><span class="howNum">02</span><b>Répondre utilement</b><p>Dans « Personnes intéressées », ouvre la discussion, vérifie qu'elle est pertinente, copie une proposition et poste-la toi-même si c'est autorisé.</p></div>
      <div class="howCard"><span class="howNum">03</span><b>Voir ce qui marche</b><p>Configure les destinations App, Facebook et Instagram. Les liens comptent les clics ; un clic ne prouve pas une installation ou un abonnement.</p></div>
    </div>
  </section>
  <section class="panel" id="researchPanel">
    <div class="sectionTitle"><div class="sectionEyebrow">ÉTAPE 1</div><h2>Rechercher des joueurs intéressés</h2><p class="sub">Un scan automatique est prévu chaque heure. Pour tester manuellement, commence par ÉCO : moins de recherches et moins de consommation.</p></div>
    <div class="auth">
      <input id="token" type="password" autocomplete="off" placeholder="RADAR_ADMIN_TOKEN" />
      <button id="save">Connexion</button><button id="refresh">Actualiser</button><select id="scanProfile" title="Intensité du scan"><option value="eco" selected>ÉCO • peu de requêtes</option><option value="standard">STANDARD • multi</option><option value="turbo">TURBO • 4×6×20</option></select><button id="run" class="primary">Lancer une recherche</button>
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
        <div class="scanMetric"><b id="mDuplicates">0</b><span>Déjà connus</span></div><div class="scanMetric"><b id="mRejected">0</b><span>Sources rejetées</span></div><div class="scanMetric"><b id="mIntentRejected">0</b><span>Intents rejetés</span></div>
        <div class="scanMetric"><b id="mAnalyzed">0</b><span>Analysés IA</span></div>
        <div class="scanMetric"><b id="mEligible">0</b><span>Opportunités</span></div>
        <div class="scanMetric"><b id="mHot">0</b><span>Score 90+</span></div>
        <div class="scanMetric"><b id="mCampaigns">0</b><span>Campagnes</span></div>
      </div>
      <details class="advanced"><summary>Détails du dernier scan (technique)</summary><div id="scanDetail" class="scanDetail">Aucun scan suivi pour l'instant.</div></details>
      <div id="scanError" class="scanError"></div>
    </div>
    <details class="advanced"><summary>Voir les statistiques techniques du robot</summary><div class="stats">
      <div class="stat"><b id="sSightings">—</b><span>Détections</span></div><div class="stat"><b id="sAnalyzed">—</b><span>Analysées</span></div><div class="stat"><b id="sEligible">—</b><span>Opportunités</span></div><div class="stat"><b id="sHot">—</b><span>Score 90+</span></div><div class="stat"><b id="sNew">—</b><span>À traiter</span></div><div class="stat"><b id="sContacted">—</b><span>Actions</span></div><div class="stat"><b id="sClicks">—</b><span>Clics</span></div><div class="stat"><b id="sWon">—</b><span>Conversions</span></div>
    </div></details><details class="advanced"><summary>Bandeau pour un site partenaire (optionnel)</summary><div class="safeBox"><b>Bandeau acquisition partenaires :</b> à intégrer uniquement sur un site que vous contrôlez ou qui vous autorise à l'afficher. Il ajoute un CTA discret vers l'application, avec UTM par domaine et fermeture mémorisée 7 jours.<div id="widgetCode" class="embedCode">&lt;script async src="/growth-widget.js"&gt;&lt;/script&gt;</div><div class="actions"><button id="copyWidget" type="button">Copier le code du bandeau</button></div></div></details>
  </section>

  <section class="panel salesPanel" id="salesPanel">
    <div class="headrow"><div><div class="sectionEyebrow">AGENT COMMERCIAL IA</div><h2>Créer une campagne pour attirer de nouveaux joueurs</h2><p class="salesIntro">Choisis une nouveauté ou un avantage réel de MULTISPORTS SCORING. L'IA compare ton offre aux discussions détectées et rédige trois approches : utile, courte et promotionnelle.</p></div><div class="badge">PRÉPARATION AUTOMATISÉE · ENVOI CONTRÔLÉ</div></div>
    <form id="salesForm" class="salesForm">
      <label>Type de campagne<select id="salesPreset"><option value="custom">Personnalisée</option><option value="darts">Les fléchettes et le suivi des scores</option><option value="multisport">Une application pour plusieurs sports</option><option value="new">Annoncer une nouveauté</option><option value="friends">Scores et parties entre amis</option></select></label>
      <label>Objectif<select id="salesGoal"><option value="app">Faire essayer / télécharger l’application</option><option value="web">Faire essayer la version Web</option><option value="facebook">Attirer vers la page Facebook</option><option value="instagram">Attirer vers Instagram</option></select></label>
      <label>Nom de la campagne<input id="salesName" maxlength="100" placeholder="Ex : Découvrez les statistiques fléchettes" required /></label>
      <label>Public visé<input id="salesAudience" maxlength="200" placeholder="Ex : joueurs de fléchettes débutants" /></label>
      <label class="full">Ce que tu veux mettre en avant<textarea id="salesPitch" maxlength="900" placeholder="Décris la nouveauté ou ce que l'application apporte à ce public…" required></textarea></label>
      <label class="full">Fonctions / informations vérifiées (obligatoire : pas de promesses inventées)<textarea id="salesFacts" maxlength="1200" placeholder="Ex : MULTISPORTS SCORING propose le scoring de fléchettes et des statistiques de partie." required></textarea></label>
      <label>Langue préférée<select id="salesLanguage"><option value="fr">Français</option><option value="en">Anglais</option><option value="es">Espagnol</option><option value="de">Allemand</option><option value="it">Italien</option></select></label>
      <div class="actions" style="align-items:end"><button type="submit" class="salesButton">Créer la campagne</button></div>
    </form>
    <div class="salesInfo">🧠 <b>Comment fonctionne l'agent ?</b> Après activation, choisis une discussion pertinente et clique « 3 réponses IA ». Le robot analyse le besoin, adapte le ton, ajoute un lien tracké et conserve le brouillon. Les discussions sans lien avec ta campagne sont écartées. <b>Activer une campagne ne publie rien en ligne.</b> Les publications automatiques nécessitent les accès officiels et le consentement des canaux autorisés.</div>
    <div class="salesInfo"><b>Préparation assistée :</b> choisis une campagne active pour traiter automatiquement la meilleure discussion encore disponible. Une discussion par clic (un seul nouvel essai IA en cas de réponse invalide), sans recherche Brave supplémentaire et sans envoi de message.<div class="actions"><select id="salesAutoCampaign" class="salesSelect" style="max-width:310px"><option value="">Sélectionner une campagne active</option></select><button id="salesPrepareNext" class="salesButton" type="button">🧠 Préparer la meilleure discussion</button></div><div id="salesAutoResult" aria-live="polite"></div></div>
    <div id="salesCampaigns" class="salesList"><div class="empty">Connecte-toi pour afficher tes campagnes.</div></div>
    <details class="advanced"><summary>Brouillons préparés · retrouver et copier les réponses</summary><div id="salesSavedDrafts">Aucun brouillon chargé.</div></details>
  </section>

  <section class="panel" id="publicationPanel">
    <div class="headrow"><div><div class="sectionEyebrow">DIFFUSION COMMERCIALE</div><h2>Programmer mes réponses et publications</h2><p class="sub">Programme une action et vérifie son texte. Facebook Page pourra être publié via Meta après connexion officielle et confirmation. Forums et Instagram restent manuels.</p></div><div class="badge">VALIDATION OBLIGATOIRE</div></div>
    <form id="publicationForm" class="salesForm">
      <label class="full">Brouillon vérifié<select id="publicationDraft" required><option value="">Prépare d'abord une réponse IA qualifiée</option></select></label>
      <label>Variante<select id="publicationVariant"><option value="helpful">Réponse utile</option><option value="concise">Réponse courte</option><option value="promotional">Approche commerciale</option></select></label>
      <label>Canal<select id="publicationChannel"><option value="community">Forum / communauté (envoi manuel)</option><option value="facebook">Facebook (Page officielle si connectée)</option><option value="instagram">Instagram (publication manuelle)</option></select></label>
      <label>Date et heure<select id="publicationDelay"><option value="now">Dès maintenant</option><option value="tomorrow">Demain, même heure</option><option value="week">Dans 7 jours</option></select></label>
      <div class="actions" style="align-items:end"><button class="salesButton" type="submit">Ajouter à mon planning</button></div>
    </form>
    <div class="safeBox" id="facebookConnector"><b>📘 Facebook Page officielle</b> · <span id="fbConnectorStatus">Connexion non vérifiée.</span> <button type="button" id="fbConnectorTest">Tester la connexion Meta</button><p class="sub">Envoi possible uniquement sur ta propre Page. Jeton et identifiant Page à configurer dans les secrets Cloudflare ; aucun droit sur des groupes, commentaires ou messages privés.</p></div>
    <div id="publicationSummary" class="safeBox">Aucune publication programmée.</div>
    <div id="publicationJobs" class="salesList"><div class="empty">Connecte-toi pour afficher le planning.</div></div>
  </section>

  <section class="panel" id="opportunitiesPanel">
    <div class="headrow"><div><div class="sectionEyebrow">ÉTAPE 3</div><h2>Personnes intéressées · réponses prêtes</h2><div class="sub">Ouvre une discussion pour vérifier le contexte. Choisis une campagne active pour que l’IA prépare trois réponses adaptées. Vérifie le contexte et les règles de la communauté avant toute diffusion.</div></div><label>Score minimum <input id="minScore" type="number" min="0" max="100" value="70" /></label></div>
    <div id="opps" class="grid"><div class="empty">Aucune donnée chargée.</div></div>
  </section>

  <section class="panel" id="acquisitionPanel">
    <div class="headrow"><div><h2>Mesurer les visites vers ton application et tes réseaux</h2><div class="sub">ÉTAPE 3 · Colle les vrais liens de destination, puis clique « Enregistrer » sous chaque case. On mesure les clics, pas les installations réelles ni les nouveaux abonnés sans connexion aux plateformes.</div></div><div class="badge">SUIVI DES CLICS</div></div>
    <div class="targetGrid">
      <div class="targetCard"><b>📲 Télécharger / essayer l’app</b><input id="targetApp" placeholder="URL Play Store / App Store / landing page"/><div id="metricApp" class="targetMetric">0 clic • 0 conversion</div><button data-save-target="app">Enregistrer</button></div>
      <div class="targetCard"><b>🌐 Application Web</b><input id="targetWeb" placeholder="https://..."/><div id="metricWeb" class="targetMetric">0 clic • 0 conversion</div><button data-save-target="web">Enregistrer</button></div>
      <div class="targetCard"><b>📘 Facebook</b><input id="targetFacebook" placeholder="URL de la page Facebook"/><div id="metricFacebook" class="targetMetric">0 clic • 0 conversion</div><button data-save-target="facebook">Enregistrer</button></div>
      <div class="targetCard"><b>📸 Instagram</b><input id="targetInstagram" placeholder="URL du compte Instagram"/><div id="metricInstagram" class="targetMetric">0 clic • 0 conversion</div><button data-save-target="instagram">Enregistrer</button></div>
    </div>
    <div id="targetNotice" class="safeBox" aria-live="polite">Vérifie les 4 liens de destination avant de diffuser des réponses.</div>
    <div class="funnel"><div class="stat"><b id="fDetect">—</b><span>Détectés</span></div><div class="stat"><b id="fQualified">—</b><span>Qualifiés</span></div><div class="stat"><b id="fContacted">—</b><span>Contactés</span></div><div class="stat"><b id="fApp">—</b><span>Clics App</span></div><div class="stat"><b id="fSocial">—</b><span>Clics sociaux</span></div><div class="stat"><b id="fConversions">—</b><span>Conversions</span></div></div>
  </section>

  <section class="panel" id="socialPanel">
    <div class="headrow"><div><h2>Préparer des publications pour les réseaux</h2><div class="sub">Le robot rédige des idées de posts. Rien n’est publié automatiquement sur Facebook ou Instagram. Vérifie le texte et les visuels avant publication.</div></div><div class="badge" id="socialMode">MODE —</div></div>
    <div class="stats">
      <div class="stat"><b id="cTotal">—</b><span>Campagnes</span></div><div class="stat"><b id="cReady">—</b><span>À valider</span></div><div class="stat"><b id="cApproved">—</b><span>Approuvées</span></div><div class="stat"><b id="cRejected">—</b><span>Rejetées QA</span></div><div class="stat"><b id="cAssets">—</b><span>Médias approuvés</span></div>
    </div>
    <details class="advanced"><summary>Outils avancés : diagnostic IA et médias approuvés</summary><div class="safeBox"><b>Verrou média :</b> la V1 n'autorise que des captures/vidéos réellement approuvées. Les créations IA aléatoires, faux écrans, faux avis, faux chiffres et médias non contrôlés restent bloqués.</div>
    <div class="safeBox diagBox"><div><b>Validation finale :</b> teste Intent Shield → classification IA → Social Growth → QA sans Brave, sans écriture D1 et sans publication.</div><button id="diagnosticSocial" class="diagButton" type="button">Tester pipeline social</button><div id="diagnosticResult" class="diagnosticResult">Diagnostic non lancé.</div></div>
    <form id="assetForm" class="assetForm">
      <input class="wide" id="assetUrl" placeholder="URL HTTPS du média approuvé" required />
      <input id="assetTitle" placeholder="Nom du média" />
      <select id="assetType"><option value="video">Vidéo</option><option value="image">Image</option></select>
      <input id="assetQuality" type="number" min="0" max="100" value="95" title="Qualité" />
      <input id="assetTechnical" type="number" min="0" max="100" value="95" title="Technique" />
      <input id="assetBrand" type="number" min="0" max="100" value="95" title="Marque" />
      <label class="check"><input id="assetApproved" type="checkbox" />Validé humainement</label>
      <button class="gold" type="submit">Ajouter média</button>
    </form></details>
    <div id="campaigns" class="grid"><div class="empty">Aucune campagne chargée.</div></div>
  </section>

  <div class="foot">Le mode actuel prépare et contrôle les campagnes. La Page Facebook peut être raccordée par API officielle Meta. Instagram et communautés restent manuels tant que leurs intégrations autorisées ne sont pas configurées.</div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const tokenInput = $('token');
  const runButton = $('run');
  const diagnosticButton = $('diagnosticSocial');
  const scanProfile = $('scanProfile');
  tokenInput.value = sessionStorage.getItem('scoringRadarToken') || '';
  let authenticatedToken = '';
  const headers = () => ({ Authorization: 'Bearer ' + tokenInput.value.trim() });
  const setStatus = (text, kind='') => { status.textContent = text; status.className = 'status ' + kind; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let salesCampaigns = [];
  const salesOptions = () => salesCampaigns.filter(c=>c.status==='active').map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.goal)+'</option>').join('');
  const presets={
    darts:{name:'Scoring et statistiques fléchettes',pitch:'Répondre aux joueurs qui cherchent un compteur de scores ou des statistiques pour leurs parties de fléchettes.',facts:'MULTISPORTS SCORING propose du scoring pour les fléchettes et des statistiques de partie.',audience:'Joueurs de fléchettes'},
    multisport:{name:'Un compteur pour plusieurs sports',pitch:'Présenter une solution de scoring pour différents sports et jeux entre amis.',facts:'MULTISPORTS SCORING prend en charge plusieurs sports, des scores et des statistiques.',audience:'Joueurs et clubs multisports'},
    new:{name:'Nouvelle fonctionnalité MULTISPORTS SCORING',pitch:'Présenter une nouveauté de l’application aux utilisateurs qui en ont besoin.',facts:'Décrire ici uniquement la nouveauté déjà publiée et testée.',audience:'Joueurs potentiellement intéressés'},
    friends:{name:'Des parties plus simples entre amis',pitch:'Aider les groupes d’amis à suivre les scores pendant leurs parties.',facts:'MULTISPORTS SCORING permet de suivre des scores sportifs et des parties.',audience:'Groupes d’amis et joueurs amateurs'}
  };
  $('salesPreset').addEventListener('change',()=>{const v=presets[$('salesPreset').value];if(!v)return; $('salesName').value=v.name;$('salesPitch').value=v.pitch;$('salesFacts').value=v.facts;$('salesAudience').value=v.audience;});
  function renderSalesCampaigns(rows){
    salesCampaigns=rows;
    $('salesAutoCampaign').innerHTML='<option value="">Sélectionner une campagne active</option>'+salesOptions();
    $('salesCampaigns').innerHTML=rows.length?rows.map(c=>'<article class="salesCampaign '+(c.status==='active'?'active':'')+'"><h3>'+esc(c.name)+'</h3><small>Objectif : '+esc(c.goal)+' · '+esc(c.status.toUpperCase())+'</small><p>'+esc(c.pitch)+'</p><div class="actions"><button data-sales-status="'+(c.status==='active'?'paused':'active')+'" data-sales-id="'+esc(c.id)+'" class="'+(c.status==='active'?'':'gold')+'">'+(c.status==='active'?'Mettre en pause':'Activer la campagne')+'</button></div></article>').join(''):'<div class="empty">Aucune campagne. Crée-en une avec le formulaire ci-dessus.</div>';
    $('salesCampaigns').querySelectorAll('[data-sales-status]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await request('/api/sales/campaigns/'+encodeURIComponent(b.dataset.salesId)+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:b.dataset.salesStatus})});setStatus('Campagne mise à jour. Activation interne uniquement : aucune publication externe.','ok');load(false);}catch(e){setStatus('Campagne : '+e.message,'err');}finally{b.disabled=false;}}));
  }
  $('salesPrepareNext').addEventListener('click',async()=>{
    const campaignId=$('salesAutoCampaign').value;
    if(!campaignId)return setStatus('Sélectionne une campagne active.','warn');
    const b=$('salesPrepareNext');b.disabled=true;$('salesAutoResult').innerHTML='<p>🧠 Analyse et rédaction en cours…</p>';
    try{const result=await request('/api/sales/prepare-next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId})});
      const box=$('salesAutoResult');box.innerHTML='<div class="salesDraft"><b>'+esc(result.opportunity.title)+'</b><p><a target="_blank" rel="noopener" href="'+esc(result.opportunity.source_url)+'" style="color:#8cd9ff">Vérifier la discussion</a></p><div id="salesAutoDraftBody"></div></div>';
      displaySalesDraft($('salesAutoDraftBody'),result.draft);
      setStatus(result.draft.match==='low'?'Cette discussion ne correspond pas à ta campagne.':'Réponses préparées. Vérifie avant de publier.','ok');
    }catch(error){$('salesAutoResult').textContent='Aucune proposition : '+error.message;setStatus(error.message,'warn');}
    finally{b.disabled=false;}
  });
  function renderSavedSalesDrafts(rows){
    const root=$('salesSavedDrafts');
    if(!rows.length){root.innerHTML='<div class="empty">Aucune réponse enregistrée. Crée ou active une campagne, puis prépare une discussion.</div>';return;}
    root.innerHTML=rows.map((d,i)=>'<div class="salesDraft"><b>'+esc(d.source_title||'Discussion')+'</b><p class="sub">Brouillon conservé : relire la source. Une ancienne proposition peut être hors sujet.</p><p>Objectif '+esc(d.goal)+' · Pertinence '+esc(d.match)+' · '+esc(d.reason||'')+'</p><div class="actions"><a href="'+esc(d.source_url||'#')+'" target="_blank" rel="noopener" style="color:#8cd9ff">Ouvrir la discussion</a></div>'+(d.match==='low'||d.verified_fit!==true?'<p>Brouillon historique ou hors cible : copie désactivée. Relance l’analyse depuis une discussion vérifiée pour obtenir une proposition exploitable.</p>':Object.entries({helpful:'Approche utile',concise:'Approche courte',promotional:'Approche commerciale'}).map(([key,label])=>'<details class="advanced"><summary>'+esc(label)+'</summary><div class="variant">'+esc(previewSalesCopy((d.variants||{})[key]||''))+'</div><button class="salesButton" data-saved-copy="'+i+'" data-variant="'+key+'">Copier cette version</button></details>').join(''))+'</div>').join('');
    root.querySelectorAll('[data-saved-copy]').forEach(b=>b.addEventListener('click',()=>{const d=rows[Number(b.dataset.savedCopy)];copy((d&&d.variants&&d.variants[b.dataset.variant])||'');}));
  }
  let facebookConfigured = false;
  async function refreshFacebookConnector(){
    try {const state=await request('/api/connectors/facebook'); facebookConfigured=Boolean(state.configured); $('fbConnectorStatus').textContent=state.note;}
    catch(e){facebookConfigured=false;$('fbConnectorStatus').textContent='Connexion Meta indisponible : '+e.message;}
  }
  $('fbConnectorTest').addEventListener('click',async()=>{
    const b=$('fbConnectorTest');b.disabled=true;
    try{const data=await request('/api/connectors/facebook/test',{method:'POST'});setStatus('Page Meta vérifiée : '+data.pageName+'.','ok');$('fbConnectorStatus').textContent='Connectée : '+data.pageName;}
    catch(e){setStatus('Facebook : '+e.message,'err');}finally{b.disabled=false;}
  });
  let publicationDrafts=[];
  function updatePublicationChoices(rows){
    publicationDrafts=rows.filter(d=>d.verified_fit===true&&d.match!=='low');
    $('publicationDraft').innerHTML='<option value="">Choisir une réponse vérifiée</option>'+publicationDrafts.map((d,i)=>'<option value="'+i+'">'+esc((d.source_title||'Discussion').slice(0,90))+' · '+esc(d.goal)+'</option>').join('');
  }
  function renderPublicationJobs(rows){
    const counts={ready:0,scheduled:0,published:0,cancelled:0};rows.forEach(j=>{if(j.status in counts)counts[j.status]++;});
    $('publicationSummary').textContent=counts.ready+' prêt(s) à publier · '+counts.scheduled+' programmé(s) · '+counts.published+' confirmé(s) publié(s). Envoi Meta uniquement après confirmation explicite.';
    $('publicationJobs').innerHTML=rows.length?rows.map(j=>'<article class="salesCampaign"><div class="meta"><span class="pill">'+esc(j.channel)+'</span><span class="pill">'+esc(j.status)+'</span></div><h3>'+esc(j.variant)+' · '+esc(new Date(j.scheduled_at).toLocaleString())+'</h3><div class="variant">'+esc(previewSalesCopy(j.text))+'</div><div class="actions"><a href="'+esc(j.source_url)+'" target="_blank" rel="noopener">Voir la source</a><button data-pub-copy="'+esc(j.id)+'">Copier la réponse</button>'+(j.status==='ready'&&j.channel==='facebook'&&facebookConfigured?'<button data-pub-facebook="'+esc(j.id)+'">Publier sur MA Page Facebook</button>':'')+(j.status==='ready'?'<button data-pub-done="'+esc(j.id)+'">J’ai publié</button>':'')+(['ready','scheduled'].includes(j.status)?'<button data-pub-cancel="'+esc(j.id)+'">Annuler</button>':'')+'</div></article>').join(''):'<div class="empty">Planning vide : prépare une réponse qualifiée et programme-la ici.</div>';
    $('publicationJobs').querySelectorAll('[data-pub-facebook]').forEach(b=>b.addEventListener('click',async()=>{
      const j=rows.find(x=>x.id===b.dataset.pubFacebook);if(!j)return;
      const approved=confirm('PUBLIER SUR TA PAGE FACEBOOK OFFICIELLE ?\n\nRelis le texte ci-dessous. Il sera réellement publié sur la Page et visible publiquement.\n\n'+j.text);
      if(!approved)return;
      b.disabled=true;
      try{const out=await request('/api/publications/'+encodeURIComponent(j.id)+'/send-facebook',{method:'POST'});
        setStatus('Publication Facebook envoyée. Vérifie-la sur ta Page : '+(out.result?.url||''),'ok');await refreshPublicationJobs();}
      catch(e){setStatus('Envoi Facebook non confirmé : '+e.message+'. Vérifie la Page avant tout nouvel essai.','err');}
      finally{b.disabled=false;}
    }));
    $('publicationJobs').querySelectorAll('[data-pub-copy]').forEach(b=>b.addEventListener('click',()=>{const j=rows.find(x=>x.id===b.dataset.pubCopy);if(j)copy(j.text);}));
    $('publicationJobs').querySelectorAll('[data-pub-cancel]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Annuler cette action programmée ?'))return;try{await request('/api/publications/'+b.dataset.pubCancel+'/cancel',{method:'POST'});await refreshPublicationJobs();}catch(e){setStatus(e.message,'err');}}));
    $('publicationJobs').querySelectorAll('[data-pub-done]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Confirmer que tu as réellement publié sur le canal indiqué ?'))return;const link=prompt('Lien public de la publication (facultatif, HTTPS) :','');if(link===null)return;try{await request('/api/publications/'+b.dataset.pubDone+'/published',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:link})});setStatus('Publication marquée comme effectuée manuellement.','ok');await refreshPublicationJobs();}catch(e){setStatus(e.message,'err');}}));
  }
  async function refreshPublicationJobs(){await refreshFacebookConnector();const data=await request('/api/publications');renderPublicationJobs(data.jobs||[]);}
  $('publicationForm').addEventListener('submit',async e=>{
    e.preventDefault();const index=Number($('publicationDraft').value);const d=publicationDrafts[index];
    if(!d||$('publicationDraft').value==='')return setStatus('Sélectionne un brouillon qualifié.','warn');
    const delay=$('publicationDelay').value;const ms=delay==='week'?7*86400000:delay==='tomorrow'?86400000:0;
    const b=e.target.querySelector('[type=submit]');b.disabled=true;
    try{await request('/api/publications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:d.campaign_id,opportunityId:d.opportunity_id,variant:$('publicationVariant').value,channel:$('publicationChannel').value,scheduledAt:new Date(Date.now()+ms).toISOString()})});setStatus('Ajouté au planning. Aucun envoi automatique.','ok');await refreshPublicationJobs();}
    catch(error){setStatus('Planning : '+error.message,'err');}finally{b.disabled=false;}
  });
  $('salesForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await request('/api/sales/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('salesName').value,pitch:$('salesPitch').value,verified_facts:$('salesFacts').value,goal:$('salesGoal').value,audience:$('salesAudience').value,language:$('salesLanguage').value})});setStatus('Campagne enregistrée. Clique ensuite « Activer la campagne ».','ok');load(false);}catch(error){setStatus('Erreur campagne : '+error.message,'err');}finally{button.disabled=false;}});
  const previewSalesCopy = (value) => String(value||'').replace(/https?:\/\/[^\s<>]+/g,'[lien de suivi inclus dans la copie]');
  function displaySalesDraft(box,draft){
    box.hidden=false;
    if(draft.match==='low'){box.innerHTML='<b>Discussion non adaptée à cette campagne</b><p>'+esc(draft.reason)+'</p><p>Le robot ne recommande aucune sollicitation.</p>';return;}
    const labels={helpful:'Réponse utile',concise:'Réponse courte',promotional:'Approche commerciale transparente'};
    box.innerHTML='<b>🧠 Pertinence : '+esc(draft.match)+'</b><p>'+esc(draft.reason)+'</p>'+Object.entries(labels).map(([key,label])=>'<div><b>'+esc(label)+'</b><div class="variant">'+esc(previewSalesCopy(draft.variants[key]||''))+'</div><div class="actions"><button data-sales-copy="'+key+'">Copier cette réponse</button></div></div>').join('')+'<p>Vérifie toujours la discussion, les fonctions annoncées et les règles du site avant publication.</p>';
    box.querySelectorAll('[data-sales-copy]').forEach(b=>b.addEventListener('click',()=>copy(draft.variants[b.dataset.salesCopy]||'')));
  }
  const copy = async (text) => { await navigator.clipboard.writeText(text); setStatus('Texte copié.', 'ok'); };
  async function request(path, init={}) {
    const response = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        authenticatedToken = '';
        sessionStorage.removeItem('scoringRadarToken');
      }
      const detail = data.detail ? ' — ' + data.detail : '';
      const error = new Error((data.error || ('HTTP ' + response.status)) + detail); error.status = response.status; throw error;
    }
    return data;
  }

  async function ensureAuth() {
    const token = tokenInput.value.trim();
    if (!token) {
      const error = new Error('Token administrateur requis.');
      error.status = 401;
      throw error;
    }
    if (authenticatedToken === token) return;
    await request('/api/auth/check');
    authenticatedToken = token;
    sessionStorage.setItem('scoringRadarToken', token);
  }

  const STAGES = [
    ['starting','Préparation'],['searching','Recherche web'],['deduplicating','Déduplication'],
    ['queueing','Mise en file'],['awaiting_classification','Attente IA'],['classifying','Analyse IA'],['social_growth','Social Growth']
  ];
  const STAGE_PROGRESS = {starting:4,searching:12,deduplicating:45,queueing:55,awaiting_classification:63,classifying:80,social_growth:92,completed:100,social_growth_failed:100,classification_failed:100,watchdog_timeout:100,failed:100};
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
  function normalizedStage(stage){ if(stage==='localizing'||stage==='brave_search')return 'searching'; if(stage==='classification_failed')return 'classifying'; if(stage==='social_growth_failed')return 'social_growth'; if(String(stage||'').endsWith('_failed'))return normalizedStage(String(stage).slice(0,-7)); return stage; }
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
      $('scanTitle').textContent = 'RADAR prêt'; $('scanSubtitle').textContent = 'Le prochain scan affichera chaque étape ici.'; $('scanBar').style.width='0%'; $('scanClock').textContent='00:00'; $('scanDetail').textContent="Aucun scan suivi pour l'instant."; $('scanError').className='scanError'; runButton.disabled=false; return;
    }
    const active = isActive(run); const failed = run.status === 'failed'; const warning = run.status === 'completed_with_warnings';
    if (failed) monitor.classList.add('failed'); else if (!active) monitor.classList.add('done');
    runButton.disabled = active;
    const normalized = normalizedStage(run.stage);
    let progress = STAGE_PROGRESS[run.stage] ?? STAGE_PROGRESS[normalized] ?? (active ? 10 : 100);
    if (normalized === 'searching' && run.details) {
      const qi = Math.max(0, Number(run.details.query_index || run.queries || 0));
      const qt = Math.max(1, Number(run.details.query_total || 1));
      progress = 12 + Math.min(1, qi / qt) * 30;
    }
    $('scanBar').style.width = String(Math.min(100, Math.max(0, progress))) + '%';
    if (failed) $('scanTitle').textContent = '❌ SCAN ÉCHOUÉ';
    else if (warning) $('scanTitle').textContent = '⚠️ SCAN TERMINÉ AVEC AVERTISSEMENT';
    else if (active && run.stalled) $('scanTitle').textContent = '⚠️ SCAN SEMBLE BLOQUÉ';
    else if (active) $('scanTitle').textContent = '🔎 SCAN EN COURS';
    else $('scanTitle').textContent = '✅ SCAN TERMINÉ';
    const qi = run.details ? Number(run.details.query_index || run.queries || 0) : 0;
    const qt = run.details ? Number(run.details.query_total || 0) : 0;
    const searchCounter = normalized === 'searching' && qt > 0 ? ' • recherche ' + Math.min(qi, qt) + '/' + qt : '';
    $('scanSubtitle').textContent = 'ID ' + String(run.run_id || '').slice(0,8) + ' • étape : ' + String(run.stage || '—') + searchCounter;
    $('mQueries').textContent = run.queries ?? 0; $('mBrave').textContent = run.brave_results ?? 0; $('mNew').textContent = run.new_candidates ?? 0;
    $('mDuplicates').textContent = run.details && Number.isFinite(Number(run.details.duplicates)) ? Number(run.details.duplicates) : Math.max(0, Number(run.brave_results||0)-Number(run.new_candidates||0));
    $('mRejected').textContent = run.details && Number.isFinite(Number(run.details.source_rejected)) ? Number(run.details.source_rejected) : 0;
    $('mIntentRejected').textContent = run.details && Number.isFinite(Number(run.details.intent_rejected)) ? Number(run.details.intent_rejected) : 0;
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
      const t = entry[0] === 'searching'
        ? Number(timings.localizing || 0) + Number(timings.brave_search || 0)
        : Number(timings[entry[0]] || 0);
      const time = t > 0 ? (t/1000).toFixed(1) + ' s' : (finishedStep ? 'Terminé' : label);
      return '<div class="'+cls+'"><b>'+mark+' '+esc(entry[1])+'</b>'+esc(time)+'</div>';
    }).join('');
    const detail=[]; if(run.details&&run.details.profile)detail.push('Profil : '+String(run.details.profile).toUpperCase()); if(run.details&&run.details.market)detail.push('Marché : '+run.details.market); if(run.details&&Array.isArray(run.details.intents))detail.push('Intents du run : '+run.details.intents.length); if(run.details&&run.details.intent)detail.push('Intent actif : '+run.details.intent); if(run.details&&Number(run.details.query_total||0)>0)detail.push('Recherche : '+Math.min(Number(run.details.query_index||run.queries||0),Number(run.details.query_total))+'/'+Number(run.details.query_total)); if(run.details&&run.details.search_stop_reason)detail.push('Arrêt recherche : '+run.details.search_stop_reason); if(run.details&&run.details.freshness)detail.push('Fenêtre Brave : '+run.details.freshness); if(run.details&&Number(run.details.source_rejected||0)>0)detail.push('Sources rejetées : '+Number(run.details.source_rejected||0)); if(run.details&&Number(run.details.intent_rejected||0)>0)detail.push('Intent Shield : '+Number(run.details.intent_rejected||0)+' rejeté(s)'); if(run.details&&Number(run.details.history_requalified||0)>0)detail.push('Historique nettoyé : '+Number(run.details.history_requalified||0)); if(run.details&&Number(run.details.capacity_skipped||0)>0)detail.push('Cap analyse atteint : '+Number(run.details.capacity_skipped||0)+' reporté(s)'); if(run.details&&Array.isArray(run.details.search_errors)&&run.details.search_errors.length)detail.push('Recherches en avertissement : '+run.details.search_errors.length); if(run.details&&run.details.query_source)detail.push('Source requête : '+run.details.query_source); if(run.details&&run.details.query)detail.push('Requête : '+run.details.query); if(run.details&&run.details.classification){const c=run.details.classification;const failedCount=Number(c.failed||0);const model=String(c.model||'').replace('@cf/meta/','').replace('@cf/','');detail.push('Classification : '+Number(c.completed||0)+'/'+Number(c.total||0)+' • lots '+Number(c.chunk_size||0)+' • parallèle '+Number(c.concurrency||0)+(failedCount?' • échecs '+failedCount:'')+(model?' • modèle '+model:''));} if(Number(run.new_candidates||0)===0&&Number(run.brave_results||0)>0)detail.push('Tous les résultats étaient déjà connus pour cet intent'); if(run.stalled)detail.push('Aucune mise à jour depuis '+Math.round(Number(run.stale_for_ms||0)/1000)+' s');
    $('scanDetail').textContent = detail.join(' • ') || 'Progression enregistrée côté Worker.';
    const errorBox=$('scanError'); if(run.error){errorBox.textContent=(warning?'Avertissement : ':'Erreur : ')+run.error;errorBox.className='scanError visible';}else{errorBox.textContent='';errorBox.className='scanError';}
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

  function hostLabel(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return 'web';}}
  async function setOutreach(id,status,note=''){
    await request('/api/opportunities/'+encodeURIComponent(id)+'/outreach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,note})});
  }
  function renderOpportunities(rows){
    const root=$('opps');if(!rows.length){root.innerHTML='<div class="empty">Aucune opportunité au-dessus de ce score.</div>';return;}
    const actionable=rows.filter(r=>r.commercial_fit?.actionable===true);
    const excluded=rows.filter(r=>!r.commercial_fit?.actionable);
    const rejectedDetails=excluded.length?'<details class="advanced" style="grid-column:1/-1"><summary>'+excluded.length+' résultat(s) non considérés comme des demandes de joueurs — consulter</summary><div class="sub">Un score IA élevé ne prouve pas qu’une personne cherche une application. Ces résultats ne sont pas proposés pour démarchage.</div>'+excluded.map(r=>'<p><a href="'+esc(r.source_url)+'" target="_blank" rel="noopener" style="color:#9dd9ff">'+esc(r.title||'Source')+'</a> — '+esc(r.commercial_fit?.reason||'À vérifier')+'</p>').join('')+'</details>':'';
    if(!actionable.length){root.innerHTML='<div class="empty" style="grid-column:1/-1">Aucune demande de joueur suffisamment explicite dans cette sélection. Le Radar a écarté les articles, vidéos promotionnelles et faux positifs.</div>'+rejectedDetails;return;}
    root.innerHTML='<div class="safeBox" style="grid-column:1/-1">'+actionable.length+' demande(s) potentielles · '+excluded.length+' source(s) non exploitables masquées. Ouvre toujours la discussion avant de répondre.</div>'+actionable.map((row)=>{ const reply=row.reply_with_link||row.suggested_reply||'';const score=Number(row.score||0);const outreach=String(row.outreach_status||'new');const clicks=Number(row.click_count||0);const links=row.tracked_links||{};return '<article class="card '+(score>=90?'hot':'')+'"><div class="meta"><span class="pill">'+esc(hostLabel(row.source_url))+'</span><span class="pill">'+esc(row.language||'und')+'</span><span class="pill">'+esc(row.market||'')+'</span><span class="pill outreach-'+esc(outreach)+'">'+esc(outreach.toUpperCase())+'</span><span class="pill">'+clicks+' clic(s)</span><span class="score">'+score+'/100</span></div><h3>'+esc(row.title||row.source_url)+'</h3><div class="snippet">'+esc(row.snippet||'')+'</div><div class="reason">'+esc(row.reason||'')+'</div><div class="safeBox">Proposition historique masquée : lance « 3 réponses IA » après vérification de la discussion et du produit.</div><div class="actions"><select class="salesSelect" style="max-width:260px" data-sales-choice="'+esc(row.id)+'"><option value="">Choisir une campagne active</option>'+salesOptions()+'</select><button class="gold" data-sales-draft="'+esc(row.id)+'">🧠 3 réponses IA</button></div><div class="salesDraft" data-sales-result="'+esc(row.id)+'" hidden></div><div class="actions"><a target="_blank" rel="noopener" href="'+esc(row.source_url)+'">Voir la discussion ↗</a><button data-copy-link="'+encodeURIComponent(links.facebook||'')+'">Lien Facebook</button><button data-copy-link="'+encodeURIComponent(links.instagram||'')+'">Lien Instagram</button><button data-outreach="contacted" data-id="'+esc(row.id)+'">J’ai répondu</button><button class="success" data-convert="app" data-id="'+esc(row.id)+'" title="À utiliser uniquement si tu as réellement vérifié l’installation" >Installation vérifiée</button><button class="success" data-convert="facebook" data-id="'+esc(row.id)+'" title="À utiliser uniquement si tu as réellement vérifié l’abonnement" >Abonnement FB vérifié</button><button class="success" data-convert="instagram" data-id="'+esc(row.id)+'" title="À utiliser uniquement si tu as réellement vérifié l’abonnement" >Abonnement IG vérifié</button><button class="danger" data-outreach="dismissed" data-id="'+esc(row.id)+'">Ignorer</button></div></article>';}).join('')+rejectedDetails;
    root.querySelectorAll('[data-sales-draft]').forEach(b=>b.addEventListener('click',async()=>{
      const id=b.dataset.salesDraft;
      const selected=root.querySelector('[data-sales-choice="'+id+'"]');
      const box=root.querySelector('[data-sales-result="'+id+'"]');
      if(!selected||!selected.value)return setStatus('Choisis d’abord une campagne active.','warn');
      b.disabled=true;box.hidden=false;box.textContent='🧠 L’IA analyse la discussion et prépare trois réponses…';
      try{const data=await request('/api/sales/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:selected.value,opportunityId:id})});displaySalesDraft(box,data.draft);setStatus(data.draft.match==='low'?'Discussion écartée : hors cible.':'Trois réponses commerciales préparées et sauvegardées.','ok');}
      catch(error){box.textContent='Erreur : '+error.message;setStatus('IA commerciale : '+error.message,'err');}
      finally{b.disabled=false;}
    }));
    root.querySelectorAll('[data-copy-link]').forEach((b)=>b.addEventListener('click',()=>copy(decodeURIComponent(b.dataset.copyLink||''))));
    root.querySelectorAll('[data-outreach]').forEach((b)=>b.addEventListener('click',async()=>{try{await setOutreach(b.dataset.id,b.dataset.outreach);setStatus('Opportunité mise à jour : '+b.dataset.outreach+'.','ok');load(false);}catch(e){setStatus('Erreur action : '+e.message,'err');}}));
    root.querySelectorAll('[data-convert]').forEach((b)=>b.addEventListener('click',async()=>{if(!confirm('As-tu une preuve que cette installation ou cet abonnement a réellement eu lieu ? Sans preuve, ne crée pas de conversion.'))return;try{await request('/api/acquisition/conversions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:b.dataset.convert,sightingId:b.dataset.id,note:'Validation manuelle cockpit'})});await setOutreach(b.dataset.id,'won',b.dataset.convert);setStatus('Conversion '+b.dataset.convert+' enregistrée.','ok');load(false);}catch(e){setStatus('Erreur conversion : '+e.message,'err');}}));
  }
  function assetOptions(assets, selected){return '<option value="">Choisir média approuvé</option>'+assets.map((a)=>'<option value="'+esc(a.id)+'" '+(selected===a.id?'selected':'')+'>'+esc(a.title||a.url)+' • '+esc(a.media_type)+'</option>').join('');}
  function renderCampaigns(rows, assets){
    const root=$('campaigns');if(!rows.length){root.innerHTML='<div class="empty">Aucune campagne générée pour l’instant.</div>';return;}
    root.innerHTML=rows.map((row)=>{ const pass=row.status==='ready_for_review'||row.status==='approved';const copies=row.platform_copy||{};return '<article class="card '+(pass?'pass':'reject')+'"><div class="meta"><span class="pill">'+esc(row.language)+'</span><span class="pill">'+esc(row.media_type)+'</span><span class="pill">'+esc(row.status)+'</span><span class="score">'+esc(row.quality_score)+'/100</span></div><h3>'+esc(row.hook||row.topic)+'</h3><div class="snippet">'+esc(row.angle)+'</div><div class="qa"><div><b>'+esc(row.factual_score)+'</b>Factuel</div><div><b>'+esc(row.visual_score)+'</b>Visuel</div><div><b>'+esc(row.spam_risk)+'</b>Risque spam</div><div><b>'+esc(row.cringe_risk)+'</b>Risque cheap</div></div><div class="reason">'+esc(row.qa_reason)+'</div><div class="copybox">'+esc(copies.facebook_page||'')+'</div><div class="actions"><button data-social-copy="facebook_page" data-id="'+esc(row.id)+'">Copier le post Facebook</button><button data-social-copy="instagram_reel" data-id="'+esc(row.id)+'">Instagram</button><button data-social-copy="youtube_short" data-id="'+esc(row.id)+'">YouTube</button><button data-social-copy="tiktok" data-id="'+esc(row.id)+'">TikTok</button></div><div class="actions"><select data-asset-select="'+esc(row.id)+'">'+assetOptions(assets.filter((a)=>a.media_type===row.media_type),row.selected_asset_id)+'</select><button data-attach="'+esc(row.id)+'">Associer média</button><button class="gold" data-approve="'+esc(row.id)+'">Approuver</button><button class="danger" data-reject="'+esc(row.id)+'">Rejeter</button></div></article>';}).join('');

    const byId=new Map(rows.map((r)=>[r.id,r])); root.querySelectorAll('[data-social-copy]').forEach((b)=>b.addEventListener('click',()=>{const r=byId.get(b.dataset.id);copy((r&&r.platform_copy&&r.platform_copy[b.dataset.socialCopy])||'');}));
    root.querySelectorAll('[data-attach]').forEach((b)=>b.addEventListener('click',async()=>{const id=b.dataset.attach;const select=root.querySelector('[data-asset-select="'+id+'"]');if(!select||!select.value)return setStatus('Choisis un média approuvé.','err');try{await request('/api/social/campaigns/'+id+'/asset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assetId:select.value})});setStatus('Média associé à la campagne.','ok');load(false);}catch(e){setStatus('Erreur média : '+e.message,'err');}}));
    root.querySelectorAll('[data-approve]').forEach((b)=>b.addEventListener('click',async()=>{try{await request('/api/social/campaigns/'+b.dataset.approve+'/approve',{method:'POST'});setStatus('Campagne approuvée. Publication toujours verrouillée tant que les connecteurs sociaux ne sont pas configurés.','ok');load(false);}catch(e){setStatus('Approbation refusée : '+e.message,'err');}}));
    root.querySelectorAll('[data-reject]').forEach((b)=>b.addEventListener('click',async()=>{try{await request('/api/social/campaigns/'+b.dataset.reject+'/reject',{method:'POST'});setStatus('Campagne rejetée.','ok');load(false);}catch(e){setStatus('Erreur : '+e.message,'err');}}));
  }

  function renderDiagnostic(data){
    const box=$('diagnosticResult');
    const classification=data&&data.classification?data.classification:null;
    const social=data&&data.social?data.social:null;
    const qa=social&&social.qa?social.qa:null;
    const draft=social&&social.draft?social.draft:null;
    const pipelineOk=Boolean(data&&data.ok);
    const qaPasses=social&&social.qaPasses===true;
    box.className='diagnosticResult '+(pipelineOk?(qaPasses?'ok':'warn'):'err');
    const parts=[];
    parts.push('<div class="diagExplanation">Ce test vérifie uniquement la génération IA. Il ne contacte personne et ne publie rien. Si la réponse JSON du modèle est invalide, la campagne reste bloquée pour sécurité.</div>');
    parts.push('<b>'+(pipelineOk?'Pipeline exécuté':'Diagnostic en échec')+'</b> • étape '+esc(data&&data.stage||'—')+' • '+(Number(data&&data.elapsedMs||0)/1000).toFixed(1)+' s');
    parts.push('<div class="diagMetrics"><span>Brave : '+esc((data&&data.braveRequests)??0)+'</span><span>Écritures D1 : '+esc((data&&data.databaseWrites)??0)+'</span><span>Publication : '+(data&&data.publicationAttempted?'OUI':'NON')+'</span><span>Intent Shield : '+(data&&data.intentShield&&data.intentShield.passed?'OK':'KO')+'</span><span>Classification : '+(classification?esc(classification.score)+'/100':'—')+'</span><span>QA : '+(qa?(qaPasses?'PASS':'REJECT'):'—')+'</span></div>');
    if(classification)parts.push('<div>Classification : '+esc(classification.category)+' • '+esc(classification.intent)+' • '+esc(classification.reason||'')+'</div>');
    if(qa)parts.push('<div>QA : qualité '+esc(qa.qualityScore)+' • factuel '+esc(qa.factualScore)+' • visuel '+esc(qa.visualScore)+' • spam '+esc(qa.spamRisk)+' • cringe '+esc(qa.cringeRisk)+' • '+esc(qa.reason||'')+'</div>');
    if(draft)parts.push('<div>Campagne diagnostic : <b>'+esc(draft.hook||draft.topic||'')+'</b></div>');
    if(data&&data.error)parts.push('<div><b>Problème détecté :</b> '+esc(data.error)+'</div><div>Action : relancer le test une seule fois. Si le modèle continue à renvoyer du JSON invalide, aucune campagne n’est approuvée et le problème reste signalé.</div>');
    box.innerHTML=parts.join('');
  }

  async function load(showLoading=true){
    if(!tokenInput.value.trim()){setStatus('Token administrateur requis.','err');return;}
    if(showLoading)setStatus('Chargement…');
    try{
      await ensureAuth();
      const minScore=Math.max(0,Math.min(100,Number($('minScore').value||70)));
      const [statsData,oppData,socialData,campaignData,assetData,runData,acqData,salesData,salesDraftData]=await Promise.all([
        request('/api/stats'),request('/api/opportunities?minScore='+minScore+'&limit=200'),request('/api/social/stats'),request('/api/social/campaigns?limit=100&activeOnly=1'),request('/api/social/assets?approvedOnly=1'),request('/api/runs/latest'),request('/api/acquisition/targets'),request('/api/sales/campaigns'),request('/api/sales/drafts')
      ]);
      const stats=statsData.stats||{};$('sSightings').textContent=stats.sightings??0;$('sAnalyzed').textContent=stats.analyzed??0;$('sEligible').textContent=stats.eligible??0;$('sHot').textContent=stats.highIntent??0;$('sNew').textContent=stats.outreachNew??0;$('sContacted').textContent=stats.outreachContacted??0;$('sClicks').textContent=stats.clicks??0;$('sWon').textContent=stats.outreachWon??0;
      const targetMap=Object.fromEntries((acqData.targets||[]).map((t)=>[t.target,t]));[['app','targetApp'],['web','targetWeb'],['facebook','targetFacebook'],['instagram','targetInstagram']].forEach(([t,id])=>{$(id).value=(targetMap[t]&&targetMap[t].url)||'';});const bt=(acqData.stats&&acqData.stats.byTarget)||{};const metric=(id,t)=>{const v=bt[t]||{clicks:0,conversions:0};$(id).textContent=v.clicks+' clic(s) • '+v.conversions+' conversion(s)';};metric('metricApp','app');metric('metricWeb','web');metric('metricFacebook','facebook');metric('metricInstagram','instagram');$('fDetect').textContent=stats.sightings??0;$('fQualified').textContent=stats.eligible??0;$('fContacted').textContent=stats.outreachContacted??0;$('fApp').textContent=(bt.app&&bt.app.clicks)||0;$('fSocial').textContent=((bt.facebook&&bt.facebook.clicks)||0)+((bt.instagram&&bt.instagram.clicks)||0);$('fConversions').textContent=(acqData.stats&&acqData.stats.totalConversions)||0;
      const appUrl=String($('targetApp').value||'').trim();
      const webUrl=String($('targetWeb').value||'').trim();
      const instagramUrl=String($('targetInstagram').value||'').trim();
      const facebookUrl=String($('targetFacebook').value||'').trim();
      const reminders=[];
      if(!instagramUrl)reminders.push('Instagram n’est pas encore configuré.');
      if(!facebookUrl)reminders.push('Ajoute l’URL de ta page Facebook.');
      if(appUrl&&webUrl&&appUrl.replace(/[/]$/,'')===webUrl.replace(/[/]$/,''))reminders.push('App et Web pointent au même endroit : si tu veux privilégier les installations Android, mets l’URL Google Play dans App.');
      $('targetNotice').textContent=reminders.length?'À vérifier : '+reminders.join(' '):'Destinations enregistrées. Tu peux désormais partager les liens trackés avec les personnes intéressées.';
      const ss=socialData.stats||{};$('cTotal').textContent=ss.total??0;$('cReady').textContent=ss.ready??0;$('cApproved').textContent=ss.approved??0;$('cRejected').textContent=ss.rejected??0;$('cAssets').textContent=ss.approvedAssets??0;$('socialMode').textContent='MODE '+String(socialData.mode||'review').toUpperCase();
      renderSalesCampaigns(salesData.campaigns||[]);renderSavedSalesDrafts(salesDraftData.drafts||[]);updatePublicationChoices(salesDraftData.drafts||[]);await refreshPublicationJobs();renderCampaigns(campaignData.campaigns||[],assetData.assets||[]);renderOpportunities(oppData.opportunities||[]);followRun(runData.run);
      const run=runData.run;
      if(!isActive(run)){
        if(run&&run.status==='failed')setStatus('Dernier scan ÉCHOUÉ • étape '+run.stage+' • '+(run.error||'erreur inconnue'),'err');
        else if(run)setStatus('Dernier scan : '+(run.finished_at||run.started_at)+' • '+(run.brave_results||0)+' résultats Brave • '+(run.new_candidates||0)+' nouveaux • '+(run.details&&Number.isFinite(Number(run.details.duplicates))?Number(run.details.duplicates):Math.max(0,Number(run.brave_results||0)-Number(run.new_candidates||0)))+' déjà connus','ok');
        else setStatus('Radar prêt.','ok');
      } else setStatus(run.stalled?'Scan actif mais sans mise à jour récente : watchdog en surveillance.':'Scan en cours : suivi automatique actif.',run.stalled?'warn':'ok');
    }catch(error){setStatus('Erreur : '+error.message,'err');}
  }

  diagnosticButton.addEventListener('click',async()=>{
    if(!tokenInput.value.trim())return setStatus('Token administrateur requis.','err');
    diagnosticButton.disabled=true;
    $('diagnosticResult').className='diagnosticResult';
    $('diagnosticResult').textContent='Diagnostic en cours : aucune recherche Brave, aucune écriture D1, aucune publication…';
    setStatus('Test du pipeline Social Growth en cours…','ok');
    try{
      await ensureAuth();
      const result=await request('/api/diagnostics/social-pipeline',{method:'POST'});
      renderDiagnostic(result);
      if(result.ok){
        setStatus(result.social&&result.social.qaPasses?'Pipeline social validé de bout en bout.':'Pipeline social exécuté : la QA a correctement rejeté la création diagnostic.','ok');
      }else{
        setStatus('Diagnostic arrêté à l’étape '+String(result.stage||'inconnue')+' : '+String(result.error||'raison inconnue'),'err');
      }
    }catch(error){
      $('diagnosticResult').className='diagnosticResult err';
      $('diagnosticResult').textContent='Erreur diagnostic : '+error.message;
      setStatus('Erreur diagnostic : '+error.message,'err');
    }finally{
      diagnosticButton.disabled=false;
    }
  });

  $('copyWidget').addEventListener('click',async()=>{
    const src=location.origin+'/growth-widget.js';
    const code='<script async src="'+src+'"><\\/script>';
    await navigator.clipboard.writeText(code);
    setStatus('Code du bandeau partenaire copié. À placer uniquement sur un site autorisé.','ok');
  });

  $('assetForm').addEventListener('submit',async(e)=>{e.preventDefault();try{const body={url:$('assetUrl').value.trim(),title:$('assetTitle').value.trim(),mediaType:$('assetType').value,qualityScore:Number($('assetQuality').value),technicalScore:Number($('assetTechnical').value),brandScore:Number($('assetBrand').value),humanApproved:$('assetApproved').checked,platforms:['facebook_page','instagram_reel','youtube_short','tiktok']};const result=await request('/api/social/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setStatus(result.humanApproved?'Média ajouté et approuvé.':'Média ajouté mais NON approuvé : vérifie les scores et la validation humaine.','ok');e.target.reset();$('assetQuality').value='95';$('assetTechnical').value='95';$('assetBrand').value='95';load(false);}catch(error){setStatus('Erreur ajout média : '+error.message,'err');}});
  document.querySelectorAll('[data-save-target]').forEach((b)=>b.addEventListener('click',async()=>{const t=b.dataset.saveTarget;const ids={app:'targetApp',web:'targetWeb',facebook:'targetFacebook',instagram:'targetInstagram'};try{await request('/api/acquisition/targets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:t,url:$(ids[t]).value.trim(),enabled:true})});setStatus('Destination '+t+' enregistrée.','ok');load(false);}catch(e){setStatus('Erreur destination : '+e.message,'err');}}));
  $('save').addEventListener('click',()=>{authenticatedToken='';load();});
  $('refresh').addEventListener('click',()=>load()); $('minScore').addEventListener('change',()=>load(false));
  runButton.addEventListener('click',async()=>{
    if(!tokenInput.value.trim())return setStatus('Token administrateur requis.','err');
    runButton.disabled=true; setStatus('Démarrage du scan…','ok');
    try{
      await ensureAuth();
      const result=await request('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:scanProfile.value||'turbo'})}); activeRunId=result.run_id;
      if(result.run)renderRun(result.run); else renderRun({run_id:result.run_id,status:'running',stage:'starting',started_at:result.triggered_at,updated_at:result.triggered_at,elapsed_ms:0,queries:0,brave_results:0,new_candidates:0,queued:0,analyzed:0,eligible:0,high_intent:0,social_campaigns:0,error:null,details:{}});
      setStatus(result.already_running?'Un scan était déjà actif : suivi repris.':'Scan '+String(result.profile||scanProfile.value).toUpperCase()+' démarré.','ok');
      if(pollTimer)clearTimeout(pollTimer);pollTimer=setTimeout(pollRun,500);
    }catch(error){runButton.disabled=false;setStatus('Erreur démarrage scan : '+error.message,'err');}
  });
  clockTimer=setInterval(updateClock,500);
  if(tokenInput.value)load();
})();
</script></body></html>`;
}
