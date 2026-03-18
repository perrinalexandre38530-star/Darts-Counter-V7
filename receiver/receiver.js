
const SUPABASE_URL = "https://hkyqtnhugciixmepcnbw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXF0bmh1Z2NpaXhtZXBjbmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDE0NDgsImV4cCI6MjA4MjkxNzQ0OH0.ioiOh9ZyYL4jWavR4DVM1_VZ2_ToXapKA9ibAFQy5RI";
const POLL_MS = 1500;
const STALE_AFTER_MS = 1000 * 60 * 10;

const $title = document.getElementById('title');
const $status = document.getElementById('status');
const $meta = document.getElementById('meta');
const $board = document.getElementById('board');

let lastStamp = "";

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function renderMeta(meta) {
  const entries = Object.entries(meta || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  $meta.innerHTML = entries.map(([k, v]) => `<div class="pill">${String(k)} : ${String(v)}</div>`).join('');
}

function renderWaiting() {
  $title.textContent = 'Multisports Scoring';
  $status.textContent = 'Choisis ton mode de jeu depuis le téléphone.';
  $meta.innerHTML = '';
  $board.innerHTML = `
    <div class="empty">
      <div class="empty-card">
        <div class="empty-badge">● Diffusion TV prête</div>
        <div class="empty-logo">Multisports Scoring</div>
        <div class="empty-subtitle">Écran connecté et en attente de données</div>
        <div class="empty-choice">Choisis ton mode de jeu</div>
        <div class="empty-help">Active Diffuser sur le téléphone puis lance une partie X01 pour afficher le score ici.</div>
      </div>
    </div>
  `;
}

function render(snapshot) {
  if (!snapshot || !asArray(snapshot.players).length) {
    renderWaiting();
    return;
  }

  $title.textContent = snapshot.title || snapshot.game || 'Multisports Scoring';
  $status.textContent = snapshot.status === 'finished' ? 'Match terminé' : 'Diffusion en direct';
  renderMeta(snapshot.meta || {});

  $board.innerHTML = asArray(snapshot.players).map((player) => `
    <section class="player ${player.active ? 'active' : ''}">
      <div class="name">${String(player.name || 'Joueur')}</div>
      <div class="score">${String(player.score ?? 0)}</div>
      <div class="sub">${player.active ? 'Joueur / équipe actif' : 'En attente du prochain tour'}</div>
    </section>
  `).join('');
}

async function fetchLatestSnapshot() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cast_room_state?select=payload,updated_at&order=updated_at.desc.nullslast&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return row || null;
}

async function tick() {
  try {
    const row = await fetchLatestSnapshot();
    const stamp = String(row?.updated_at || row?.payload?.updatedAt || "");
    const age = row?.updated_at ? (Date.now() - new Date(row.updated_at).getTime()) : Number.POSITIVE_INFINITY;
    if (!row || !row.payload || age > STALE_AFTER_MS) {
      if (lastStamp !== "__waiting__") {
        lastStamp = "__waiting__";
        renderWaiting();
      }
      return;
    }
    if (stamp !== lastStamp) {
      lastStamp = stamp;
      render(row.payload || null);
    }
  } catch (err) {
    console.warn("[cast receiver] poll failed", err);
  }
}

renderWaiting();
tick();
setInterval(tick, POLL_MS);
