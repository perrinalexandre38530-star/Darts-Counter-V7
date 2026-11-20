// MSS: Chrome habituel, aucune tentative d'authentification Google automatisée.
const TARGET = 'https://studio.youtube.com/channel/UC5hOS0Vhb7ob9u9SMs-qqOw/editing/profile';
async function waitReady(id, timeout=30000) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(handler); reject(Error('YouTube Studio non chargé.'));},timeout);
    const handler=(tid,info)=>{if(tid===id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(handler);resolve();}};
    chrome.tabs.onUpdated.addListener(handler);
    chrome.tabs.get(id,t=>{if(chrome.runtime.lastError)return; if(t.status==='complete'&&t.url?.startsWith(TARGET)){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(handler);resolve();}});
  });
}
chrome.action.onClicked.addListener(async tab=>{
  try {
    if(!tab.id) throw Error('Onglet Chrome introuvable.');
    if(!tab.url?.startsWith(TARGET)) { await chrome.tabs.update(tab.id,{url:TARGET}); await waitReady(tab.id); }
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',files:['page-bridge.js']});
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
  } catch(e) { console.error('MSS YouTube:',e); }
});
