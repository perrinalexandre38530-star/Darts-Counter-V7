
const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");

// --- CLEAN UI FULLSCREEN ---
function esc(v){return String(v??"")}

function getAvatar(p){
  return p?.avatarDataUrl || p?.avatarUrl || "";
}

function avatar(p, size=80){
  const src = getAvatar(p);
  if(src){
    return `<img src="${src}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#222;font-size:30px;">${(p.name||"?")[0]}</div>`
}

function waiting(){
  contentEl.innerHTML = `
    <div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#000;color:#fff;">
      <img src="/cast/logo.png" style="width:180px;">
      <div style="margin-top:20px;font-size:28px;">Sélectionne ton mode de jeu</div>
    </div>
  `;
}

function render(payload){
  const players = payload.players || [];
  if(!players.length){waiting();return;}

  const active = players.find(p=>p.active) || players[0];
  const others = players.filter(p=>p!==active);

  contentEl.innerHTML = `
  <div style="height:100vh;background:#000;color:#fff;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div style="font-size:42px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;">
        MULTISPORTS SCORING
      </div>
      <div style="font-size:32px;font-weight:900;">${payload.game||"X01"}</div>
    </div>

    <div style="flex:1;display:flex;gap:20px;">

      <!-- LEFT PLAYERS -->
      <div style="width:260px;display:flex;flex-direction:column;gap:10px;">
        ${players.map(p=>`
          <div style="display:flex;align-items:center;gap:10px;background:#111;padding:10px;border-radius:12px;">
            ${avatar(p,50)}
            <div style="flex:1;font-size:18px;">${esc(p.name)}</div>
            <div style="font-size:24px;font-weight:800;">${p.score}</div>
          </div>
        `).join("")}
      </div>

      <!-- ACTIVE PLAYER -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">

        ${avatar(active,140)}
        <div style="font-size:34px;margin-top:10px;">${esc(active.name)}</div>

        <div style="font-size:140px;font-weight:900;line-height:1;">
          ${active.score}
        </div>

      </div>

    </div>

  </div>
  `;
}

try{
  const ctx = cast.framework.CastReceiverContext.getInstance();

  ctx.addCustomMessageListener(NAMESPACE, e=>{
    if(e.data?.type==="SNAPSHOT"){
      render(e.data.payload||{});
    }
  });

  ctx.start();
  waiting();

}catch(e){
  console.error(e);
}
