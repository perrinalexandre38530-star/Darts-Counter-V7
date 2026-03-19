// ============================================
// 🎯 MULTISPORTS SCORING — RECEIVER V2 (UI PREMIUM)
// ============================================

const root = document.getElementById("app");

let state = {
  players: [],
  currentPlayerId: null,
  scores: {},
};

function render() {
  if (!state.players.length) {
    return renderHome();
  }

  const current = state.players.find(p => p.id === state.currentPlayerId);
  const others = state.players.filter(p => p.id !== state.currentPlayerId);

  root.innerHTML = `
    <div class="screen">
      ${renderActivePlayer(current)}
      <div class="side">
        ${others.map(renderWaitingPlayer).join("")}
      </div>
      ${renderGraph()}
    </div>
  `;
}

function renderHome() {
  root.innerHTML = `
    <div class="home">
      <img src="/assets/LOGO.png" class="logo" />
      <div class="tagline">Sélectionne ton mode de jeu et lance ta partie</div>
    </div>
  `;
}

function renderActivePlayer(player) {
  if (!player) return "";

  const score = state.scores[player.id] ?? 0;

  return `
    <div class="active-card">
      <div class="active-badge">JOUEUR ACTIF</div>
      <div class="active-content">
        <div class="avatar-wrap">
          <img src="${player.avatar || '/assets/default_avatar.png'}" />
        </div>
        <div class="info">
          <div class="name">${player.name}</div>
          <div class="score">${score}</div>
        </div>
      </div>
    </div>
  `;
}

function renderWaitingPlayer(player) {
  const score = state.scores[player.id] ?? 0;

  return `
    <div class="waiting-card">
      <img src="${player.avatar || '/assets/default_avatar.png'}" />
      <div class="waiting-info">
        <div class="waiting-name">${player.name}</div>
        <div class="waiting-score">${score}</div>
      </div>
    </div>
  `;
}

function renderGraph() {
  return `
    <div class="graph">
      <div class="graph-line"></div>
    </div>
  `;
}

window.addEventListener("message", (e) => {
  const data = e.data;
  if (!data) return;
  state = { ...state, ...data };
  render();
});

render();
