// MSS — uploads des deux médias officiels dans la session X du Chrome habituel.
// Pas d'appel API tiers, pas de récupération d'identifiants/cookies.
(() => {
  'use strict';
  const TARGET = 'multisportsscor';
  const BASE = `https://x.com/${TARGET}`;
  const PANEL_ID = 'mss-robot-x-status';
  if (window.__mssRobotXRunning) {
    return;
  }
  window.__mssRobotXRunning = true;

  const elapsedStart = Date.now();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  Object.assign(panel.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: '2147483647',
    width: 'min(420px, calc(100vw - 32px))', background: '#101926',
    color: '#f7fbff', border: '2px solid #00bde8', borderRadius: '12px',
    boxShadow: '0 8px 35px rgba(0,0,0,.6)', padding: '16px',
    font: '14px/1.5 system-ui,Arial,sans-serif', whiteSpace: 'pre-wrap'
  });
  panel.innerHTML = '<div style="font-weight:800;font-size:16px">🤖 MSS — Robot images X</div><div data-mss-log role="status" aria-live="polite" style="margin-top:8px">Initialisation…</div><div style="margin-top:10px;text-align:right"><button data-mss-close type="button" style="border:1px solid #748195;color:#fff;background:#263343;border-radius:6px;padding:5px 12px;cursor:pointer">Fermer</button></div>';
  document.documentElement.appendChild(panel);
  const status = panel.querySelector('[data-mss-log]');
  panel.querySelector('[data-mss-close]').addEventListener('click', () => panel.remove());
  const log = text => {
    if (status.isConnected) status.textContent = text;
    console.log('[MSS X]', text);
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(getValue, description, timeout=18000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const val = await getValue();
      if (val) return val;
      await wait(250);
    }
    throw new Error('Introuvable : ' + description + ' (interface X différente ou non connecté).');
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const box=el.getBoundingClientRect();
    const style=getComputedStyle(el);
    return box.width>0 && box.height>0 && style.visibility!=='hidden' && style.display!=='none';
  }
  function findButton(scope, pattern) {
    return [...scope.querySelectorAll('button,[role="button"]')].find(el => visible(el) && pattern.test(((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).trim())) || null;
  }
  function validateIdentity() {
    const nav = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    const href = nav?.getAttribute('href') || '';
    const shown = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent || '';
    if (href) {
      const handle = (new URL(href,location.href).pathname.split('/')[1] || '').toLowerCase();
      if (handle !== TARGET) throw new Error(`ARRÊT SÉCURITÉ : Chrome est connecté à @${handle}, pas à @${TARGET}.`);
      return true;
    }
    if (shown.toLowerCase().includes('@'+TARGET)) return true;
    return false;
  }
  function selectInput(dialog, kind) {
    const tests = kind==='banner' ? [
      'input[data-testid="ProfileHeaderInput"]',
      '[data-testid="ProfileHeaderInput"] input[type="file"]',
      '[data-testid="editProfileHeader"] input[type="file"]',
      '[data-testid="addBannerButton"] input[type="file"]',
      '[data-testid="ProfileHeader"] input[type="file"]'
    ] : [
      'input[data-testid="ProfileAvatarInput"]',
      '[data-testid="ProfileAvatarInput"] input[type="file"]',
      '[data-testid="editProfileAvatar"] input[type="file"]',
      '[data-testid="addAvatarButton"] input[type="file"]',
      '[data-testid="ProfileAvatar"] input[type="file"]'
    ];
    for (const selector of tests) {
      const found = dialog.querySelector(selector);
      if (found?.tagName === 'INPUT' && found.type === 'file') return found;
    }
    // Pas de sélection aveugle par index : risque d'inverser bannière et avatar.
    return null;
  }
  function getDialog() {
    return [...document.querySelectorAll('[role="dialog"]')].filter(visible).at(-1) || null;
  }
  function getUrlImages() {
    const images=[...document.images].map(el=>el.currentSrc||el.src||'');
    const backgrounds=[...document.querySelectorAll('[style]')].map(el=>getComputedStyle(el).backgroundImage||'');
    const all=[...images,...backgrounds];
    return {
      avatar:all.find(u=>u.includes('pbs.twimg.com/profile_images/')) || null,
      banner:all.find(u=>u.includes('pbs.twimg.com/profile_banners/')) || null
    };
  }
  async function upload(input, filename, kind) {
    const url=chrome.runtime.getURL('assets/'+filename);
    const response=await fetch(url);
    if (!response.ok) throw new Error('Image officielle inaccessible dans l’extension : '+filename);
    const blob=await response.blob();
    if (blob.size<100 || blob.size>6*1024*1024) throw new Error('Taille du fichier inattendue : '+filename);
    const file=new File([blob],filename,{type:'image/jpeg',lastModified:Date.now()});
    const transfer=new DataTransfer();
    transfer.items.add(file);
    input.files=transfer.files;
    input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    input.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
    log('Image '+kind+' transmise au formulaire X. Vérification du recadrage…');
    await wait(1000);
    const crop = await (async()=>{
      const start=Date.now();
      while (Date.now()-start<8500) {
        const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(visible);
        for (const dlg of dialogs) {
          const apply=findButton(dlg,/^(apply|appliquer|valider|save|enregistrer)$/i);
          // Ne jamais cliquer Enregistrer dans l'éditeur de profil à ce stade.
          if (apply && /^(apply|appliquer|valider)$/i.test((apply.textContent || '').trim())) return apply;
        }
        await wait(350);
      }
      return null;
    })();
    if (crop) {
      crop.click();
      log('Recadrage '+kind+' appliqué.');
      await wait(1100);
    }
  }
  async function main() {
    log('Vérification du compte connecté dans ton Chrome habituel…');
    if (location.hostname!=='x.com') throw new Error('La page active n’est pas x.com.');
    await until(()=>validateIdentity(), 'connexion du compte X officiel', 12000);
    if (!location.pathname.toLowerCase().startsWith('/'+TARGET)) {
      throw new Error('Ouvre le profil x.com/'+TARGET+' et relance le robot.');
    }
    const before=getUrlImages();
    log('Compte officiel @'+TARGET+' confirmé. Ouverture de Modifier le profil…');
    const edit=await until(()=>document.querySelector('[data-testid="editProfileButton"]') || findButton(document,/^(edit profile|modifier le profil)$/i), 'bouton Modifier le profil');
    edit.click();
    let dialog=await until(()=>getDialog(), 'dialogue Modifier le profil');
    const steps=[
      ['banner','MSS_COUVERTURE_OFFICIELLE.jpg','couverture'],
      ['avatar','MSS_LOGO_OFFICIEL.jpg','logo']
    ];
    for (const [kind,file,label] of steps) {
      dialog=await until(()=>getDialog(), 'éditeur pour '+label);
      const input=await until(()=>selectInput(dialog,kind), 'champ fichier '+label, 6500);
      log('Installation de la '+label+' officielle…');
      await upload(input,file,label);
      await wait(800);
    }
    // On conserve les valeurs texte en place. Le bouton X enregistre tout l'éditeur.
    dialog=await until(()=>getDialog(), 'éditeur prêt pour enregistrement');
    const save=dialog.querySelector('[data-testid="Profile_Save_Button"]') || findButton(dialog,/^(save|enregistrer)$/i);
    if (!save) throw new Error('Bouton Enregistrer introuvable : aucun succès annoncé.');
    if (save.disabled) throw new Error('X n’active pas le bouton Enregistrer : vérifie le recadrage des photos.');
    log('Enregistrement de la nouvelle photo et de la couverture…');
    save.click();
    await wait(4200);
    const after=await until(()=>{const a=getUrlImages();return a.avatar||a.banner?a:null},'profil public après enregistrement',12000).catch(()=>getUrlImages());
    const avatarUpdated=!!after.avatar && after.avatar!==before.avatar;
    const bannerUpdated=!!after.banner && after.banner!==before.banner;
    if (avatarUpdated && bannerUpdated) {
      log('✅ SUCCÈS CONFIRMÉ : logo ET couverture officiels visibles sur X.\nDurée : '+Math.round((Date.now()-elapsedStart)/1000)+' s.');
    } else {
      log('⚠️ Enregistrement demandé à X, mais vérification incomplète :\nLogo : '+(avatarUpdated?'mis à jour':'à vérifier')+'\nCouverture : '+(bannerUpdated?'mise à jour':'à vérifier')+'\nRecharge le profil pour vérifier ou transmets-moi cette capture.');
    }
  }
  main().catch(error=>{
    log('❌ '+error.message+'\nAucune connexion Google n’a été tentée. Transmets-moi cette erreur pour correction.');
  }).finally(()=>{window.__mssRobotXRunning=false;});
})();
