// Exécution uniquement au clic de l'utilisateur sur l'icône de cette extension.
// Aucune tentative de connexion Google et aucune récupération de cookies.
const TARGET = 'https://x.com/multisportsscor';

async function waitForTabReady(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdate);
      reject(new Error('La page X ne s’est pas chargée.'));
    }, timeoutMs);
    const onUpdate = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdate);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdate);
    chrome.tabs.get(tabId, tab => {
      if (chrome.runtime.lastError) return;
      if (tab.status === 'complete' && tab.url?.startsWith(TARGET)) {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdate);
        resolve();
      }
    });
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) throw new Error('Onglet Chrome introuvable.');
    if (!/^https:\/\/x\.com\/(?:multisportsscor(?:\/|$)|settings\/profile(?:\/|$))/.test(tab.url || '')) {
      await chrome.tabs.update(tab.id, { url: TARGET });
      await waitForTabReady(tab.id);
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['page-bridge.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (error) {
    console.error('MSS X : impossible de lancer l’extension', error);
    chrome.tabs.create({ url: TARGET }).catch(() => {});
  }
});
