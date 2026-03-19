const BUILD="CAF-DIAG-2026-03-19-1515";
const NAMESPACE="urn:x-cast:com.multisports.scoreboard";
const contentEl=document.getElementById("content");
const statusEl=document.getElementById("status");
const diagEl=document.getElementById("diag");
const logs=[];

function pushDiag(entry, extra){
  const row={at:new Date().toISOString(),entry,extra:extra==null?null:extra};
  logs.push(row);
  while(logs.length>18) logs.shift();
  diagEl.textContent=logs.slice().reverse().map(r=>`${r.at}  ${r.entry}${r.extra==null?"":"\n"+JSON.stringify(r.extra,null,2)}`).join("\n\n");
}

function renderWaiting(msg){
  statusEl.textContent=msg || "Choisis ton mode de jeu puis lance une partie sur le téléphone.";
  contentEl.innerHTML="";
}

function renderSnapshot(payload){
  const players=Array.isArray(payload?.players)?payload.players:[];
  statusEl.textContent=payload?.title || payload?.game || "Snapshot reçu";
  if(!players.length){
    contentEl.innerHTML=`<pre>${JSON.stringify(payload,null,2)}</pre>`;
    return;
  }
  contentEl.innerHTML=`
    <div class="board">
      ${players.map(p=>`
        <section class="player ${p?.active?"active":""}">
          <div class="name">${String(p?.name || "Joueur")}</div>
          <div class="score">${String(p?.score ?? 0)}</div>
        </section>
      `).join("")}
    </div>
    <pre>${JSON.stringify(payload,null,2)}</pre>
  `;
}

try {
  pushDiag("receiver_script_loaded", { build: BUILD, href: location.href, namespace: NAMESPACE });
  const context=cast.framework.CastReceiverContext.getInstance();

  context.addEventListener(cast.framework.system.EventType.READY, (event)=>{
    pushDiag("receiver_ready_event", event?.data || null);
    renderWaiting("Receiver CAF prêt. En attente d'une connexion Cast…");
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event)=>{
    pushDiag("sender_connected", { senderId: event?.senderId || null, userAgent: event?.userAgent || null });
    renderWaiting("Sender connecté. En attente d'un PING ou d'un snapshot…");
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event)=>{
    pushDiag("sender_disconnected", { senderId: event?.senderId || null, reason: event?.reason || null });
  });

  context.addCustomMessageListener(NAMESPACE, (event)=>{
    pushDiag("custom_message_received", { senderId:event.senderId, dataType: typeof event.data });
    const data=event.data || null;
    if(data?.type==="PING"){
      renderWaiting("PING reçu depuis le téléphone.");
      pushDiag("ping_received", data);
      return;
    }
    if(data?.type==="SNAPSHOT"){
      renderSnapshot(data.payload || {});
      pushDiag("snapshot_received", { title:data?.payload?.title||"", game:data?.payload?.game||"", players:Array.isArray(data?.payload?.players)?data.payload.players.length:0 });
      return;
    }
    pushDiag("unknown_message", data);
    renderWaiting("Message reçu, format inconnu.");
  });

  const opts=new cast.framework.CastReceiverOptions();
  opts.disableIdleTimeout=true;
  context.start(opts);
  renderWaiting("Receiver CAF en cours de démarrage…");
  pushDiag("receiver_start_called", { build: BUILD, namespace: NAMESPACE });
} catch(err) {
  renderWaiting("Receiver CAF en erreur au démarrage.");
  pushDiag("receiver_start_failed", String(err));
}
