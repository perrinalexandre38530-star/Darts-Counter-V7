/* MSS X: narrow, temporary upload bridge, run in the page's MAIN world.
   It does not access cookies, credentials, network endpoints or X APIs. */
(() => {
  'use strict';
  if (window.__mssXPageBridgeV2) return;
  window.__mssXPageBridgeV2 = true;

  const TAG = 'MSS_X_OFFICIAL_VISUALS_V2';
  let pending = null;
  let timer = null;
  let previousClick = null;
  let previousPicker = null;
  let installed = false;

  function send(token, event, detail = '') {
    window.postMessage({ tag: TAG, token, event, detail }, location.origin);
  }
  function restore() {
    if (installed) {
      HTMLInputElement.prototype.click = previousClick;
      if (previousPicker) HTMLInputElement.prototype.showPicker = previousPicker;
      document.removeEventListener('click', captureInputClick, true);
    }
    installed = false;
    clearTimeout(timer);
    timer = null;
    pending = null;
  }
  function makeImage(dataUrl, filename) {
    const match = /^data:image\/jpeg;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match) throw new Error('Le fichier ne correspond pas à une image JPEG officielle.');
    const binary = atob(match[1]);
    if (binary.length < 100 || binary.length > 6 * 1024 * 1024) throw new Error('Taille du fichier non conforme.');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: 'image/jpeg', lastModified: Date.now() });
  }
  function acceptInput(input) {
    if (!pending || !input || input.tagName !== 'INPUT' || input.type !== 'file') return false;
    if (pending.used) return true;
    const job = pending;
    job.used = true;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(job.file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      send(job.token, 'file-sent', job.kind);
    } catch (err) {
      send(job.token, 'failure', String(err?.message || err));
    } finally {
      restore();
    }
    return true;
  }
  function captureInputClick(event) {
    const target = event.target;
    if (pending && target?.tagName === 'INPUT' && target.type === 'file') {
      // Prevent the OS file-picker only for this short, user-authorized upload.
      event.preventDefault();
      event.stopImmediatePropagation();
      acceptInput(target);
    }
  }
  function install(job) {
    restore();
    pending = job;
    previousClick = HTMLInputElement.prototype.click;
    previousPicker = HTMLInputElement.prototype.showPicker;
    HTMLInputElement.prototype.click = function (...args) {
      if (this.type === 'file' && acceptInput(this)) return;
      return Reflect.apply(previousClick, this, args);
    };
    if (typeof previousPicker === 'function') {
      HTMLInputElement.prototype.showPicker = function (...args) {
        if (this.type === 'file' && acceptInput(this)) return;
        return Reflect.apply(previousPicker, this, args);
      };
    }
    document.addEventListener('click', captureInputClick, true);
    installed = true;
    timer = setTimeout(() => {
      send(job.token, 'failure', 'X n’a pas déclenché de champ fichier après le clic caméra.');
      restore();
    }, 11000);
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.tag !== TAG) return;
    const { action, token, dataUrl, filename, kind } = event.data;
    if (typeof token !== 'string') return;
    if (action === 'cancel') {
      if (pending?.token === token) restore();
      return;
    }
    if (action !== 'prepare' || !['banner', 'avatar'].includes(kind)) return;
    if ((kind === 'banner' && filename !== 'MSS_COUVERTURE_OFFICIELLE.jpg') ||
        (kind === 'avatar' && filename !== 'MSS_LOGO_OFFICIEL.jpg')) {
      send(token, 'failure', 'Nom de visuel officiel non conforme.');
      return;
    }
    try {
      const file = makeImage(dataUrl, filename);
      install({ token, kind, file, used: false });
      send(token, 'ready', kind);
    } catch (err) {
      send(token, 'failure', String(err?.message || err));
      restore();
    }
  });
})();
