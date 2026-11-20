// MSS — YouTube Studio : n'agit que sur la chaîne UC5hOS0Vhb7ob9u9SMs-qqOw.
// Aucun accès aux cookies/identifiants ni à Gmail. Pas de publication vidéo.
(() => {
  'use strict';
  if(window.__mssYtRunning)return;
  window.__mssYtRunning=true;
  const CHANNEL='UC5hOS0Vhb7ob9u9SMs-qqOw',TAG='MSS_YOUTUBE_OFFICIAL_MEDIA_V1';
  const PANEL='mss-yt-robot-panel';document.getElementById(PANEL)?.remove();
  const node=document.createElement('aside');node.id=PANEL;
  Object.assign(node.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'2147483647',width:'min(450px,calc(100vw - 32px))',background:'#101926',color:'#fff',border:'2px solid #00bde8',borderRadius:'10px',padding:'14px',boxShadow:'0 8px 30px #0009',font:'14px/1.5 system-ui,Arial'});
  node.innerHTML='<strong>🤖 MSS — Robot YouTube v1.0</strong><p data-mss-msg role="status">Initialisation…</p><button data-close type="button" style="float:right;border:1px solid #666;border-radius:7px;background:#202e42;color:#fff;padding:4px 12px">Fermer</button>';
  document.documentElement.appendChild(node);node.querySelector('[data-close]').onclick=()=>node.remove();
  const msg=node.querySelector('[data-mss-msg]'),say=t=>{if(msg.isConnected)msg.textContent=t;console.log('[MSS YouTube]',t)};
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const valid=()=>location.hostname==='studio.youtube.com'&&location.pathname.startsWith('/channel/'+CHANNEL+'/editing');
  function isVisible(el){if(!el||!el.isConnected)return false;const box=el.getBoundingClientRect();return box.height>0&&box.width>0&&getComputedStyle(el).visibility!=='hidden';}
  async function until(check,description,ms=18000){const start=Date.now();while(Date.now()-start<ms){const value=check();if(value)return value;await delay(300);}throw Error('Introuvable : '+description)}
  function choose(kind){
    const owner=kind==='banner'?document.querySelector('ytcp-banner-upload'):document.querySelector('ytcp-profile-image-upload');
    if(!owner)return null;
    const selectors=kind==='banner'?'ytcp-button.ytcpBannerUploadUploadBtn, ytcp-button.upload-btn':'ytcp-button.replace-btn';
    return [...owner.querySelectorAll(selectors)].find(isVisible)||null;
  }
  async function mediaData(filename){
    const r=await fetch(chrome.runtime.getURL('assets/'+filename));if(!r.ok)throw Error('Image MSS manquante : '+filename);
    const blob=await r.blob();if(blob.size>6*1024*1024||blob.size<100)throw Error('Taille image hors limites');
    return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('Image illisible'));fr.readAsDataURL(blob)});
  }
  async function send(kind,filename){
    const btn=await until(()=>choose(kind),'bouton '+kind+' de YouTube Studio',16000);
    const dataUrl=await mediaData(filename),token=crypto.randomUUID();
    let resolver,phase='ready';
    const callback=ev=>{const d=ev.data;if(ev.source!==window||ev.origin!==location.origin||d?.tag!==TAG||d.token!==token)return;if(d.event===phase||d.event==='failure')resolver?.(d)};
    window.addEventListener('message',callback);
    try{
      const ready=new Promise(r=>resolver=r);
      window.postMessage({tag:TAG,action:'prepare',token,kind,filename,dataUrl},location.origin);
      const accepted=await Promise.race([ready,delay(6500).then(()=>({event:'failure',detail:'Le module de transfert ne répond pas'}))]);
      if(accepted.event!=='ready')throw Error(accepted.detail||'Préparation impossible');
      phase='file-sent';const sent=new Promise(r=>resolver=r);
      say('Importation '+(kind==='banner'?'couverture':'logo')+' : envoi du fichier officiel…');btn.click();
      const result=await Promise.race([sent,delay(13000).then(()=>({event:'failure',detail:'YouTube n’a pas ouvert de champ fichier'}))]);
      if(result.event!=='file-sent')throw Error(result.detail||'Transfert impossible');
      await confirmCrop(kind);say('Fichier '+kind+' transmis, sauvegarde de YouTube à vérifier.');
    }finally{window.postMessage({tag:TAG,action:'cancel',token},location.origin);window.removeEventListener('message',callback)}
  }
  function allButtons(scope){return [...scope.querySelectorAll('ytcp-button,button,[role="button"]')].filter(isVisible)}
  async function confirmCrop(kind){
    const start=Date.now();
    while(Date.now()-start<11000){
      const dialogs=[...document.querySelectorAll('ytcp-image-crop-dialog,ytcp-dialog,[role="dialog"]')].filter(isVisible);
      for(const d of dialogs.reverse()){
        const action=allButtons(d).find(b=>/^(done|terminé|enregistrer|save|ok|valider|apply)$/i.test((b.textContent||b.getAttribute('aria-label')||'').trim()));
        if(action){action.click();say('Recadrage '+kind+' validé.');await delay(1300);return;}
      }
      await delay(300);
    }
  }
  async function main(){
    if(!valid())throw Error('Arrêt sécurité : page YouTube Studio MSS différente de la chaîne attendue.');
    await until(()=>document.querySelector('ytcp-banner-upload'),'onglet Profil de personnalisation');
    say('Chaîne MSS détectée. Installation de la couverture puis du logo officiels.');
    await send('banner','MSS_COUVERTURE_YOUTUBE_2048x1152.jpg');
    await send('avatar','MSS_LOGO_OFFICIEL.jpg');
    const publish=allButtons(document).find(b=>/^(publier|publish)$/i.test((b.textContent||'').trim()));
    if(!publish||publish.disabled)throw Error('Images envoyées, mais bouton Publier indisponible. Ne pas annoncer de succès sans vérification.');
    say('Enregistrement des deux visuels…');publish.click();
    await delay(3500);
    const toast=[...document.querySelectorAll('[role="status"],ytcp-toast')].map(x=>x.textContent||'').join(' ');
    if(/publi|publish|enregistr|saved/i.test(toast))say('✅ Enregistrement signalé par YouTube. Vérifie la bannière publique après actualisation.');
    else say('⚠️ Publication demandée. Contrôle visuel du profil encore nécessaire.');
  }
  main().catch(e=>say('❌ '+(e?.message||e)+'\nAucun autre compte ou mot de passe n’a été utilisé.')).finally(()=>{window.__mssYtRunning=false});
})();
