const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

const $title = document.getElementById("title");
const $status = document.getElementById("status");
const $meta = document.getElementById("meta");
const $board = document.getElementById("board");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function renderMeta(meta) {
  const entries = Object.entries(meta || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  $meta.innerHTML = entries.map(([k, v]) => `<div class="pill">${String(k)} : ${String(v)}</div>`).join("");
}

function renderWaiting() {
  $title.textContent = "Multisports Scoring";
  $status.textContent = "Choisis ton mode de jeu depuis le téléphone.";
  $meta.innerHTML = "";
  $board.innerHTML = `
    <div class="empty">
      <div class="empty-card">
        <div class="empty-badge">● Diffusion TV prête</div>
        <div class="empty-logo">Multisports Scoring</div>
        <div class="empty-subtitle">Receiver connecté et en attente de données</div>
        <div class="empty-choice">Choisis ton mode de jeu</div>
        <div class="empty-help">Lance une partie X01 sur le téléphone puis le score s'affichera ici automatiquement.</div>
      </div>
    </div>
  `;
}

function render(snapshot) {
  if (!snapshot || !asArray(snapshot.players).length) {
    renderWaiting();
    return;
  }

  $title.textContent = snapshot.title || snapshot.game || "Multisports Scoring";
  $status.textContent = snapshot.status === "finished" ? "Match terminé" : "Diffusion en direct";
  renderMeta(snapshot.meta || {});
  $board.innerHTML = asArray(snapshot.players).map((player) => `
    <section class="player ${player.active ? "active" : ""}">
      <div class="name">${String(player.name || "Joueur")}</div>
      <div class="score">${String(player.score ?? 0)}</div>
      <div class="sub">${player.active ? "Joueur / équipe actif" : "En attente du prochain tour"}</div>
    </section>
  `).join("");
}

function bootReceiver() {
  renderWaiting();

  if (!window.cast || !cast.framework) {
    console.error("[receiver] cast framework unavailable");
    return;
  }

  const context = cast.framework.CastReceiverContext.getInstance();
  const options = new cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = true;

  context.addCustomMessageListener(NAMESPACE, (event) => {
    try {
      render(event.data || null);
    } catch (err) {
      console.error("[receiver] render failed", err);
      renderWaiting();
    }
  });

  context.start(options);
}

bootReceiver();