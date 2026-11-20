// MSS — 2 visuels officiels transmis à X depuis le Chrome déjà connecté.
// Le pont temporaire travaille dans le contexte de la page uniquement lors du clic caméra.
(() => {
  'use strict';
  const TARGET = 'multisportsscor';
  const PANEL_ID = 'mss-robot-x-status';
  const TAG = 'MSS_X_OFFICIAL_VISUALS_V2';
  if (window.__mssRobotXRunning) return;
  window.__mssRobotXRunning = true;

  document.getElementById(PANEL_ID)?.remove();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  Object.assign(panel.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: '2147483647',
    width: 'min(460px, calc(100vw - 32px))', background: '#101926',
    color: '#f7fbff', border: '2px solid #00bde8', borderRadius: '12px',
    boxShadow: '0 8px 35px rgba(0,0,0,.6)', padding: '16px',
    font: '14px/1.5 system-ui,Arial,sans-serif', whiteSpace: 'pre-wrap'
  });
  panel.innerHTML = '<div style="font-weight:800;font-size:16px">🤖 MSS — Robot images X (v1.1)</div><div data-mss-log role="status" aria-live="polite" style="margin-top:8px">Initialisation…</div><div style="margin-top:10px;text-align:right"><button data-mss-close type="button" style="border:1px solid #748195;color:#fff;background:#263343;border-radius:6px;padding:5px 12px;cursor:pointer">Fermer</button></div>';
  document.documentElement.appendChild(panel);
  const status = panel.querySelector('[data-mss-log]');
  panel.querySelector('[data-mss-close]').addEventListener('click', () => panel.remove());
  const log = message => {
    if (status.isConnected) status.textContent = message;
    console.log('[MSS X]', message);
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(fn, description, timeout = 18000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await fn();
      if (result) return result;
      await wait(250);
    }
    throw new Error('Introuvable : ' + description + '.');
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && css.visibility !== 'hidden' && css.display !== 'none';
  }
  function findButton(scope, pattern) {
    return [...scope.querySelectorAll('button,[role="button"]')].find(el => visible(el) && pattern.test(((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).trim())) || null;
  }
  function validateIdentity() {
    const nav = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    const href = nav?.getAttribute('href') || '';
    const account = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent || '';
    if (href) {
      const handle = (new URL(href, location.href).pathname.split('/')[1] || '').toLowerCase();
      if (handle !== TARGET) throw new Error(`ARRÊT SÉCURITÉ : Chrome est connecté à @${handle}, pas à @${TARGET}.`);
      return true;
    }
    if (account.toLowerCase().includes('@' + TARGET)) return true;
    return false;
  }
  function getEditDialog() {
    const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')].filter(visible);
    return dialogs.reverse().find(el => el.querySelector('[data-testid="Profile_Save_Button"]')) || null;
  }
  // X (nov. 2026) shows camera buttons without stable data-testid or persistent file inputs.
  function getCamera(dialog, kind) {
    const selector = kind === 'banner'
      ? '[aria-label="Add banner photo"], [aria-label="Ajouter une photo de couverture"], [aria-label="Ajouter une photo de bannière"]'
      : '[aria-label="Add avatar photo"], [aria-label="Ajouter une photo de profil"]';
    const labeled = [...dialog.querySelectorAll(selector)].find(visible);
    if (labeled) return labeled;
    const rx = kind === 'banner'
      ? /(add|edit|modifier|ajouter).*(banner|header|couverture|bannière)/i
      : /(add|edit|modifier|ajouter).*(avatar|profile photo|photo de profil)/i;
    return findButton(dialog, rx);
  }
  function getUrlImages() {
    const imgs = [...document.images].map(el => el.currentSrc || el.src || '');
    const bg = [...document.querySelectorAll('[style]')].map(el => getComputedStyle(el).backgroundImage || '');
    const all = [...imgs, ...bg];
    return {
      avatar: all.find(u => u.includes('pbs.twimg.com/profile_images/')) || null,
      banner: all.find(u => u.includes('pbs.twimg.com/profile_banners/')) || null
    };
  }
  async function readOfficialAsset(filename) {
    const url = chrome.runtime.getURL('assets/' + filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image officielle manquante dans l’extension : ' + filename);
    const blob = await response.blob();
    if (blob.type && !blob.type.includes('jpeg') && !blob.type.includes('jpg')) throw new Error('Le fichier officiel n’est pas un JPEG.');
    if (blob.size < 100 || blob.size > 6 * 1024 * 1024) throw new Error('Taille du visuel officiel inattendue.');
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Lecture du fichier officiel impossible.'));
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  }
  async function sendToPageCamera(dialog, kind, filename, label) {
    const camera = await until(() => getCamera(dialog, kind), 'bouton caméra ' + label, 9000);
    const dataUrl = await readOfficialAsset(filename);
    const token = crypto.randomUUID();
    let resolveResult;
    const response = new Promise(resolve => { resolveResult = resolve; });
    let phase = 'ready';
    const onMessage = event => {
      const data = event.data;
      if (event.source !== window || event.origin !== location.origin || data?.tag !== TAG || data.token !== token) return;
      if (['ready', 'file-sent', 'failure'].includes(data.event)) {
        if (data.event === phase || data.event === 'failure') resolveResult(data);
      }
    };
    window.addEventListener('message', onMessage);
    try {
      window.postMessage({ tag: TAG, action: 'prepare', token, kind, filename, dataUrl }, location.origin);
      const prepared = await Promise.race([response, wait(6500).then(() => ({ event: 'failure', detail: 'Pont X non initialisé.' }))]);
      if (prepared.event !== 'ready') throw new Error(prepared.detail || 'Pont X indisponible.');
      log('Caméra ' + label + ' trouvée. Envoi de ton image officielle…');
      phase = 'file-sent';
      // Assign a fresh pending result listener; no native file chooser should open.
      const done = new Promise(resolve => { resolveResult = resolve; });
      camera.click();
      const sent = await Promise.race([done, wait(12500).then(() => ({ event: 'failure', detail: 'X n’a pas ouvert son importateur de fichier.' }))]);
      if (sent.event !== 'file-sent') throw new Error(sent.detail || 'X a refusé le fichier officiel.');
      log('Image ' + label + ' envoyée. Vérification du recadrage…');
      await confirmCrop(label);
    } finally {
      window.postMessage({ tag: TAG, action: 'cancel', token }, location.origin);
      window.removeEventListener('message', onMessage);
    }
  }
  async function confirmCrop(label) {
    const start = Date.now();
    while (Date.now() - start < 14000) {
      const candidates = [...document.querySelectorAll('[role="dialog"], dialog')].filter(visible);
      for (const dlg of candidates.reverse()) {
        // A crop editor may be nested inside the profile dialog; match Apply only.
        const apply = findButton(dlg, /^(apply|appliquer|valider|utiliser|done|terminer)$/i);
        if (apply) {
          apply.click();
          log('Recadrage ' + label + ' appliqué.');
          await wait(1400);
          return;
        }
      }
      await wait(300);
    }
    // Some X variants apply the file directly and never show a crop dialog.
    log('Aucun recadrage distinct détecté pour ' + label + ' ; poursuite du contrôle.');
  }
  async function main() {
    log('Vérification du compte connecté dans ton Chrome habituel…');
    if (location.hostname !== 'x.com') throw new Error('Cette extension fonctionne uniquement sur x.com.');
    await until(validateIdentity, 'session MSS @' + TARGET, 12000);
    let editor = getEditDialog();
    if (!editor) {
      if (!location.pathname.toLowerCase().startsWith('/' + TARGET)) throw new Error('Ouvre le profil x.com/' + TARGET + '.');
      const edit = await until(() => document.querySelector('[data-testid="editProfileButton"]') || findButton(document, /^(edit profile|modifier le profil)$/i), 'bouton Modifier le profil');
      edit.click();
      editor = await until(getEditDialog, 'fenêtre Edit profile');
    }
    log('Compte @' + TARGET + ' vérifié. Les deux boutons caméra seront utilisés.');
    const before = getUrlImages();
    await sendToPageCamera(editor, 'banner', 'MSS_COUVERTURE_OFFICIELLE.jpg', 'couverture');
    editor = await until(getEditDialog, 'éditeur après couverture');
    await sendToPageCamera(editor, 'avatar', 'MSS_LOGO_OFFICIEL.jpg', 'logo');
    editor = await until(getEditDialog, 'éditeur prêt pour enregistrement');
    const save = editor.querySelector('[data-testid="Profile_Save_Button"]') || findButton(editor, /^(save|enregistrer)$/i);
    if (!save || save.disabled) throw new Error('Enregistrement du profil indisponible : les images restent à contrôler.');
    log('Enregistrement des images dans le profil X…');
    save.click();
    await wait(4500);
    const after = getUrlImages();
    const avatarUpdated = !!after.avatar && after.avatar !== before.avatar;
    const bannerUpdated = !!after.banner && after.banner !== before.banner;
    if (avatarUpdated && bannerUpdated) log('✅ CONFIRMATION VISUELLE : logo et couverture mis à jour sur X.');
    else log('⚠️ Enregistrement demandé. Vérification des images encore nécessaire après actualisation du profil.\nLogo : ' + (avatarUpdated ? 'changé' : 'non confirmé') + '\nCouverture : ' + (bannerUpdated ? 'changée' : 'non confirmée'));
  }
  main().catch(err => {
    log('❌ ' + (err?.message || err) + '\nAucun mot de passe ou code n’a été demandé. Transmets cette erreur pour correction.');
  }).finally(() => { window.__mssRobotXRunning = false; });
})();
