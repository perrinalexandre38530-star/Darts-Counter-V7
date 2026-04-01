const BUILD = "CAF-X01-TOP8-SCROLL-2026-04-01";
const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");
const diagEl = document.getElementById("diag");
const buildEl = document.getElementById("build");
const gameBadgeEl = document.getElementById("gameBadge");
if (buildEl) buildEl.textContent = `Build: ${BUILD}`;

const logs = [];
const avatarCache = new Map();
const baseOrderIds = [];
let lastPayload = null;
let finishTimer = null;

const gameState = {
  activeId: "",
  lastPlayersSig: "",
  currentRoundNo: 1,
  roundHistory: [], // [{ round:1, ranks: {id:rank} }]
  currentRoundRanks: new Map(), // id -> rank for players already played this round
  lastScores: new Map(),
};

function pushDiag(entry, extra) {
  const row = { at: new Date().toISOString(), entry, extra: extra == null ? null : extra };
  logs.push(row);
  while (logs.length > 10) logs.shift();
  if (!diagEl) return;
  diagEl.textContent = logs
    .slice()
    .reverse()
    .map((r) => `${r.at}  ${r.entry}${r.extra == null ? "" : "\n" + JSON.stringify(r.extra, null, 2)}`)
    .join("\n\n");
  diagEl.style.display = "none";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(part, total) {
  const p = num(part, 0);
  const t = num(total, 0);
  if (!t) return "0%";
  return `${Math.round((p / t) * 100)}%`;
}

function formatStatPair(value, total) {
  return `${num(value, 0)} - ${pct(value, total)}`;
}

function initials(name) {
  const parts = String(name || "Joueur").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || "").join("").toUpperCase() || "?";
}

function setGameBadge(value) {
  if (gameBadgeEl) gameBadgeEl.textContent = value ? String(value).toUpperCase() : "";
}

function safeClearFinishTimer() {
  if (finishTimer) {
    try { clearTimeout(finishTimer); } catch {}
    finishTimer = null;
  }
}

function playersSignature(players) {
  return JSON.stringify((players || []).map((p, idx) => String(p?.id || p?.name || idx)));
}

function resetGraphState(players, activeId) {
  gameState.activeId = String(activeId || "");
  gameState.currentRoundNo = 1;
  gameState.roundHistory = [];
  gameState.currentRoundRanks = new Map();
  gameState.lastScores = new Map((players || []).map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
  gameState.lastPlayersSig = playersSignature(players);
}

function maybeResetForNewGame(players, activeId) {
  const sig = playersSignature(players);
  const changedRoster = sig !== gameState.lastPlayersSig;
  const statsAreBlank = (players || []).every((p) => {
    const s = p?.stats || {};
    return !num(s.totalThrows ?? s.throws ?? s.attempts ?? 0) && !num(s.bestVisit ?? s.best ?? 0);
  });
  const allScoresEqual = (players || []).every((p) => num(p?.score, 0) === num(players?.[0]?.score, 0));
  const shouldReset = changedRoster || (statsAreBlank && allScoresEqual && gameState.roundHistory.length > 0);
  if (shouldReset || !gameState.lastPlayersSig) resetGraphState(players, activeId);
}

function getAvatarSrc(player) {
  const pid = String(player?.id || player?.name || "");
  const candidates = [
    player?.avatarDataUrl,
    player?.avatarUrl,
    player?.avatar,
    player?.photo,
    player?.photoUrl,
    player?.image,
    player?.imageUrl,
    player?.picture,
    player?.photoDataUrl,
    player?.avatar_path,
    player?.avatarPath,
    player?.profile?.avatarDataUrl,
    player?.profile?.avatarUrl,
    player?.profile?.avatar,
    player?.profile?.photoUrl,
    player?.profile?.photoDataUrl,
    player?.meta?.avatarDataUrl,
    player?.meta?.avatarUrl,
    player?.meta?.avatar,
    player?.meta?.photoUrl,
    player?.user?.avatarDataUrl,
    player?.user?.avatarUrl,
    player?.user?.avatar,
    player?.user?.photoUrl,
  ];
  for (const src of candidates) {
    if (typeof src === "string" && src.trim()) {
      const clean = src.trim();
      if (pid) avatarCache.set(pid, clean);
      return clean;
    }
  }
  return pid ? (avatarCache.get(pid) || "") : "";
}

function avatarHtml(player, size = 116, smallText = false) {
  const src = getAvatarSrc(player);
  if (src) {
    return `
      <div class="avatar-frame" style="width:${size}px;height:${size}px;">
        <img src="${esc(src)}" alt="${esc(player?.name || 'avatar')}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>
    `;
  }
  return `
    <div class="avatar-frame avatar-fallback" style="width:${size}px;height:${size}px;font-size:${Math.round(size * (smallText ? 0.30 : 0.32))}px;">
      ${esc(initials(player?.name))}
    </div>
  `;
}

function syncBaseOrder(players) {
  const incomingIds = (players || []).map((p, idx) => String(p?.id || p?.name || idx));
  incomingIds.forEach((id) => { if (!baseOrderIds.includes(id)) baseOrderIds.push(id); });
  for (let i = baseOrderIds.length - 1; i >= 0; i--) {
    if (!incomingIds.includes(baseOrderIds[i])) baseOrderIds.splice(i, 1);
  }
}

function getRankMap(players) {
  const ranked = players.slice().sort((a, b) => num(a?.score, 0) - num(b?.score, 0));
  const out = new Map();
  ranked.forEach((p, idx) => out.set(String(p?.id || p?.name || idx), idx + 1));
  return out;
}

function rememberTurnProgress(players, activeId) {
  syncBaseOrder(players);
  maybeResetForNewGame(players, activeId);
  if (!players.length) return;

  const currentActiveId = String(activeId || "");
  const prevActiveId = String(gameState.activeId || "");

  if (!prevActiveId) {
    gameState.activeId = currentActiveId;
    gameState.lastScores = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
    return;
  }

  if (currentActiveId && prevActiveId && currentActiveId !== prevActiveId) {
    const rankMap = getRankMap(players);
    gameState.currentRoundRanks.set(prevActiveId, rankMap.get(prevActiveId) || players.length);

    if (gameState.currentRoundRanks.size >= players.length) {
      const ranks = {};
      for (const [id, rank] of gameState.currentRoundRanks.entries()) ranks[id] = rank;
      gameState.roundHistory.push({ round: gameState.currentRoundNo, ranks });
      while (gameState.roundHistory.length > 12) gameState.roundHistory.shift();
      gameState.currentRoundNo += 1;
      gameState.currentRoundRanks = new Map();
    }
  }

  gameState.activeId = currentActiveId;
  gameState.lastScores = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
}

function logoHtml() {
  return `
    <img src="/cast/logo.png" alt="Multisports Scoring" class="home-logo" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='/logo.png';}else{this.style.display='none';this.nextElementSibling.style.display='block';}" />
    <div class="home-logo-fallback">Multisports<br>Scoring</div>
  `;
}

function waitingScreen() {
  safeClearFinishTimer();
  try { document.body.classList.add('is-home'); } catch {}
  if (statusEl) statusEl.textContent = 'Prêt';
  setGameBadge('');
  contentEl.innerHTML = `
    <div class="receiver-shell home-shell">
      <div class="home-center">
        ${logoHtml()}
        <div class="home-tagline">Sélectionne ton mode de jeu et lance ta partie !</div>
      </div>
    </div>
  `;
}

function miniPlayerCard(player, color, opts = {}) {
  const c = color || '#53e7ff';
  const active = !!opts.active;
  const compact = !!opts.compact;
  const size = compact ? 32 : 36;
  return `
    <div class="mini-player-card ${active ? 'is-active' : ''}" style="grid-template-columns:${size}px minmax(0,1fr) auto; padding:${compact ? '6px 8px' : '8px 10px'}; border-color:${active ? c + 'aa' : c + '55'}; background:${active ? 'linear-gradient(180deg, color-mix(in srgb, ' + c + ' 18%, rgba(255,255,255,.04)), rgba(255,255,255,.04))' : 'rgba(255,255,255,.03)'}; box-shadow:${active ? '0 0 26px ' + c + '55, 0 0 10px ' + c + '55, inset 0 1px 0 rgba(255,255,255,.06)' : '0 0 18px ' + c + '22, inset 0 1px 0 rgba(255,255,255,.03)'};">
      ${avatarHtml(player, size, true)}
      <div class="mini-player-info"><div class="mini-player-name" style="color:${c}; font-size:${compact ? '12px' : '13px'};">${esc(player?.name || 'Joueur')}</div></div>
      <div class="mini-player-score" style="color:${c}; font-size:${compact ? '14px' : '15px'};">${esc(player?.score ?? 0)}</div>
    </div>
  `;
}

function statCell(label, value, color) {
  return `
    <div class="stat-cell" style="box-shadow:0 0 18px ${color}18, inset 0 1px 0 rgba(255,255,255,.03); border-color:${color}44;">
      <div class="stat-label" style="color:${color};">${esc(label)}</div>
      <div class="stat-value" style="color:${color};">${esc(value)}</div>
    </div>
  `;
}

function pickPlayerStats(active, payloadMeta) {
  const s = active?.stats && typeof active.stats === 'object' ? active.stats : {};
  const m = payloadMeta && typeof payloadMeta === 'object' ? payloadMeta : {};

  const miss = num(s.miss ?? s.misses ?? m.miss ?? m.misses ?? 0, 0);
  const simple = num(s.simple ?? s.singles ?? m.simple ?? m.singles ?? 0, 0);
  const double_ = num(s.double ?? s.doubles ?? m.double ?? m.doubles ?? 0, 0);
  const triple = num(s.triple ?? s.triples ?? m.triple ?? m.triples ?? 0, 0);
  const bull = num(s.bull ?? s.bulls ?? m.bull ?? m.bulls ?? 0, 0);
  const dbull = num(s.dbull ?? s.doubleBull ?? s.dbulls ?? m.dbull ?? m.doubleBull ?? m.dbulls ?? 0, 0);
  const bust = num(s.bust ?? s.busts ?? m.bust ?? m.busts ?? 0, 0);
  const avg3d = s.avg3d ?? s.avg3 ?? s.avg ?? m.avg3d ?? m.avg3 ?? m.avg ?? '—';
  const bestVisit = s.bestVisit ?? s.best ?? m.bestVisit ?? m.best ?? '—';
  const hits = simple + double_ + triple + bull + dbull + miss;
  const totalThrows = hits;
  return { avg3d, bestVisit, hits, miss, simple, double_, triple, bull, dbull, bust, totalThrows };
}

function finalSummaryHtml(players, activeColor, gameTitle) {
  const ranked = players.slice().sort((a, b) => num(a?.score, 0) - num(b?.score, 0));
  const bestVisitWinner = ranked
    .slice()
    .sort((a, b) => num(b?.stats?.bestVisit ?? b?.stats?.best ?? 0) - num(a?.stats?.bestVisit ?? a?.stats?.best ?? 0))[0];
  const bestAvgWinner = ranked
    .slice()
    .sort((a, b) => num(b?.stats?.avg3d ?? b?.stats?.avg3 ?? b?.stats?.avg ?? 0) - num(a?.stats?.avg3d ?? a?.stats?.avg3 ?? a?.stats?.avg ?? 0))[0];

  return `
    <div class="receiver-shell">
      <div class="receiver-layout" style="grid-template-columns:minmax(0,1fr);">
        <main class="main-column">
          <section class="panel active-panel" style="padding:16px 18px;">
            <div class="panel-title-row" style="margin-bottom:14px;">
              <div class="panel-title" style="font-size:20px;color:${activeColor};">Classement final</div>
              <div class="panel-subtitle" style="font-size:14px;color:${activeColor};">${esc(gameTitle)}</div>
            </div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:14px;align-items:start;">
              <div class="panel" style="padding:12px;">
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${ranked.map((p, idx) => `
                    <div style="display:grid;grid-template-columns:34px 54px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.03);">
                      <div style="font-size:18px;font-weight:1000;color:${idx === 0 ? activeColor : 'rgba(255,255,255,.92)'};">${idx + 1}.</div>
                      ${avatarHtml(p, 44, true)}
                      <div style="min-width:0;">
                        <div style="font-size:18px;font-weight:900;color:${esc(idx === 0 ? activeColor : '#f7f6f3')};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p?.name || 'Joueur')}</div>
                        <div style="font-size:13px;color:rgba(255,255,255,.66);">Score ${esc(p?.score ?? 0)}</div>
                      </div>
                      <div style="font-size:28px;font-weight:1000;color:${idx === 0 ? activeColor : 'rgba(255,255,255,.96)'};">${esc(p?.score ?? 0)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div class="stat-cell" style="height:auto;padding:14px;border-color:${activeColor}55;">
                  <div class="stat-label" style="color:${activeColor};">Meilleure visite</div>
                  <div class="stat-value" style="color:${activeColor};font-size:26px;">${esc(bestVisitWinner?.stats?.bestVisit ?? bestVisitWinner?.stats?.best ?? 0)}</div>
                  <div style="margin-top:6px;font-size:15px;color:rgba(255,255,255,.88);">${esc(bestVisitWinner?.name || '—')}</div>
                </div>
                <div class="stat-cell" style="height:auto;padding:14px;border-color:${activeColor}55;">
                  <div class="stat-label" style="color:${activeColor};">Meilleure moyenne</div>
                  <div class="stat-value" style="color:${activeColor};font-size:26px;">${esc(bestAvgWinner?.stats?.avg3d ?? bestAvgWinner?.stats?.avg3 ?? bestAvgWinner?.stats?.avg ?? '—')}</div>
                  <div style="margin-top:6px;font-size:15px;color:rgba(255,255,255,.88);">${esc(bestAvgWinner?.name || '—')}</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `;
}

function graphHtml(players, colorById, activeColor) {
  if (players.length < 3) return '';

  const rankedNow = players.slice().sort((a, b) => num(a?.score, 0) - num(b?.score, 0));
  const visiblePlayers = rankedNow.slice(0, Math.min(8, rankedNow.length));
  const visibleIds = new Set(visiblePlayers.map((p, idx) => String(p?.id || p?.name || idx)));
  const visibleCount = visiblePlayers.length || 1;

  const completed = gameState.roundHistory.slice(-10)
    .map((round) => ({
      round: round.round,
      ranks: Object.fromEntries(Object.entries(round.ranks || {}).filter(([id]) => visibleIds.has(String(id))))
    }))
    .filter((round) => Object.keys(round.ranks).length > 0);

  const currentPlayed = Array.from(gameState.currentRoundRanks.entries()).filter(([id]) => visibleIds.has(String(id)));
  const columns = completed.map((r) => r.round);
  if (currentPlayed.length > 0) columns.push(gameState.currentRoundNo);

  const graphHeight = visibleCount <= 5 ? 160 : 186;
  const w = 980;
  const h = visibleCount <= 5 ? 170 : 198;
  const padLeft = 54;
  const padRight = 54;
  const padTop = 24;
  const padBottom = 22;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;
  const columnCount = Math.max(1, columns.length || 1);

  const xForCol = (colIdx) => padLeft + (columnCount <= 1 ? innerW / 2 : (colIdx * innerW) / Math.max(1, columnCount - 1));
  const yForRank = (rank) => padTop + ((rank - 1) * innerH) / Math.max(1, visibleCount - 1);

  const gridY = Array.from({ length: visibleCount }, (_, i) => {
    const y = yForRank(i + 1);
    return `<line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" stroke="#fff" opacity="0.13" />`;
  }).join('');
  const gridX = Array.from({ length: columnCount }, (_, i) => {
    const x = xForCol(i);
    return `<line x1="${x}" y1="${padTop - 6}" x2="${x}" y2="${h - padBottom + 6}" stroke="#fff" opacity="0.08" />`;
  }).join('');
  const labels = columns.length
    ? columns.map((roundNo, i) => `<text x="${xForCol(i)}" y="${h - 1}" text-anchor="middle" font-size="12" fill="rgba(255,255,255,.74)" font-weight="800">${roundNo}</text>`).join('')
    : '';

  const defs = visiblePlayers.map((p, idx) => `<filter id="glow-${idx}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`).join('');

  const completedPaths = visiblePlayers.map((p, idx) => {
    const id = String(p?.id || p?.name || idx);
    const color = colorById[id] || '#53e7ff';
    const pts = [];
    completed.forEach((round, colIdx) => {
      const rank = Number(round.ranks?.[id]);
      if (Number.isFinite(rank)) pts.push({ x: xForCol(colIdx), y: yForRank(rank) });
    });
    if (pts.length < 2) return '';
    const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.94" filter="url(#glow-${idx})" />${pts.map((pt)=>`<circle cx="${pt.x}" cy="${pt.y}" r="3.1" fill="${color}" opacity="0.96" />`).join('')}`;
  }).join('');

  const currentItems = currentPlayed.length > 0 ? visiblePlayers.map((p, idx) => {
    const id = String(p?.id || p?.name || idx);
    const rank = gameState.currentRoundRanks.get(id);
    if (!Number.isFinite(rank)) return '';
    const x = xForCol(columns.length - 1);
    const y = yForRank(rank);
    const src = getAvatarSrc(p);
    const color = colorById[id] || activeColor || '#53e7ff';
    return src
      ? `<g filter="url(#glow-${idx})"><circle cx="${x}" cy="${y}" r="11.8" fill="none" stroke="${color}" stroke-width="2.2" opacity="0.92" /><image href="${esc(src)}" x="${x - 10}" y="${y - 10}" width="20" height="20" clip-path="circle(10px at 10px 10px)" /></g>`
      : `<circle cx="${x}" cy="${y}" r="8.4" fill="${color}" stroke="rgba(255,255,255,.88)" stroke-width="2" filter="url(#glow-${idx})" />`;
  }).join('') : '';

  return `
    <section class="panel graph-panel" style="padding:12px 14px 10px; min-height:${graphHeight + 26}px;">
      <svg viewBox="0 0 ${w} ${h}" class="graph-svg" preserveAspectRatio="none" style="height:${graphHeight}px; padding:2px 8px 0; overflow:visible;">
        <defs>${defs}</defs>
        ${gridY}
        ${gridX}
        ${completedPaths}
        ${currentItems}
        ${labels}
      </svg>
    </section>
  `;
}

function renderGame(payload) {
  safeClearFinishTimer();
  try { document.body.classList.remove('is-home'); } catch {}

  const players = Array.isArray(payload?.players) ? payload.players : [];
  if (!players.length) return waitingScreen();

  const active = players.find((p) => p?.active) || players.find((p) => String(p?.id || '') === String(payload?.currentPlayer || '')) || players[0];
  rememberTurnProgress(players, String(active?.id || active?.name || ''));

  const palette = ['#53e7ff', '#ffd55b', '#ffffff', '#ff66d1', '#63ff97', '#ff8f5b', '#9da7ff', '#8df0ff', '#ff5b7d', '#c5ff5b', '#ffb45b', '#d095ff'];
  const orderIds = baseOrderIds.length ? baseOrderIds.slice() : players.map((p, idx) => String(p?.id || p?.name || idx));
  const colorById = Object.fromEntries(orderIds.map((id, idx) => [id, palette[idx % palette.length]]));

  const activeId = String(active?.id || active?.name || '');
  const idx = orderIds.findIndex((id) => id === activeId);
  const rotatedIds = idx >= 0 ? orderIds.slice(idx).concat(orderIds.slice(0, idx)) : orderIds.slice();
  const playerMap = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), p]));
  const ordered = rotatedIds.map((id) => playerMap.get(id)).filter(Boolean);

  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {};
  const ps = pickPlayerStats(active, meta);
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : ps.hits;
  const rankMap = getRankMap(players);
  const activeRank = rankMap.get(activeId) || 1;
  const activeColor = colorById[activeId] || '#53e7ff';
  const gameTitle = payload?.title || payload?.game || 'Multisports';

  try { document.body.style.setProperty('--theme-accent', activeColor); } catch {}
  if (statusEl) statusEl.textContent = gameTitle;
  setGameBadge(gameTitle);

  contentEl.innerHTML = `
    <div class="receiver-shell">
      <div class="receiver-layout">
        <aside class="panel order-panel">
          <div class="panel-title">Ordre de passage</div>
          <div class="mini-player-list">
            ${ordered.map((p, i) => miniPlayerCard(p, colorById[String(p?.id || p?.name || '')], { active: i === 0, compact: ordered.length >= 8 })).join('')}
          </div>
        </aside>
        <main class="main-column">
          <section class="panel active-panel">
            <div class="active-top">
              <div class="active-left">
                <div class="active-avatar-wrap">${avatarHtml(active, players.length >= 8 ? 92 : 104)}</div>
                <div class="active-name" style="color:${activeColor};">${esc(active?.name || 'Joueur')}</div>
              </div>
              <div class="score-card">
                <div class="score-rank">#${esc(activeRank)}</div>
                <div class="score-label" style="color:${activeColor};">SCORE</div>
                <div class="score-value" style="color:${activeColor};">${esc(active?.score ?? 0)}</div>
              </div>
            </div>
            <div class="active-bottom">
              ${graphHtml(players, colorById, activeColor)}
              <div class="stats-grid">
                ${statCell('Avg 3D', ps.avg3d, activeColor)}
                ${statCell('Best volée', ps.bestVisit, activeColor)}
                ${statCell('Hits', ps.hits, activeColor)}
                ${statCell('Miss', `${ps.miss} - ${pct(ps.miss, totalRef)}`, activeColor)}
                ${statCell('Simple', formatStatPair(ps.simple, totalRef), activeColor)}
                ${statCell('Double', formatStatPair(ps.double_, totalRef), activeColor)}
                ${statCell('Triple', formatStatPair(ps.triple, totalRef), activeColor)}
                ${statCell('Bull', formatStatPair(ps.bull, totalRef), activeColor)}
                ${statCell('DBull', formatStatPair(ps.dbull, totalRef), activeColor)}
                ${statCell('Bust', formatStatPair(ps.bust, totalRef), activeColor)}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `;
}

function renderFinished(payload) {
  safeClearFinishTimer();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const active = players.slice().sort((a, b) => num(a?.score, 0) - num(b?.score, 0))[0] || players[0] || {};
  const activeColor = getRankMap(players).get(String(active?.id || active?.name || '')) === 1 ? '#f4d26c' : '#53e7ff';
  try { document.body.style.setProperty('--theme-accent', activeColor); } catch {}
  if (statusEl) statusEl.textContent = 'Partie terminée';
  setGameBadge(payload?.title || payload?.game || 'X01');
  contentEl.innerHTML = finalSummaryHtml(players, activeColor, payload?.title || payload?.game || 'X01');
  finishTimer = setTimeout(() => {
    waitingScreen();
    // reset graph so next game starts clean
    resetGraphState([], '');
  }, 9000);
}

function renderSnapshot(payload) {
  lastPayload = payload || {};
  if ((payload?.status || '') === 'finished') {
    renderFinished(payload || {});
    return;
  }
  renderGame(payload || {});
}

try {
  pushDiag('receiver_script_loaded', { build: BUILD, href: location.href, namespace: NAMESPACE });
  const context = cast.framework.CastReceiverContext.getInstance();

  context.addEventListener(cast.framework.system.EventType.READY, (event) => {
    pushDiag('receiver_ready_event', event?.data || null);
    waitingScreen();
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
    pushDiag('sender_connected', { senderId: event?.senderId || null, userAgent: event?.userAgent || null });
    if (!lastPayload && statusEl) statusEl.textContent = 'Sender connecté';
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event) => {
    pushDiag('sender_disconnected', { senderId: event?.senderId || null, reason: event?.reason || null });
  });

  context.addCustomMessageListener(NAMESPACE, (event) => {
    pushDiag('custom_message_received', { senderId: event.senderId, dataType: typeof event.data });
    try {
      const rawData = event.data || null;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (data?.type === 'PING') {
        if (statusEl) statusEl.textContent = 'PING reçu';
        pushDiag('ping_received', data);
        return;
      }
      if (data?.type === 'SNAPSHOT') {
        renderSnapshot(data.payload || {});
        pushDiag('snapshot_received', {
          title: data?.payload?.title || '',
          game: data?.payload?.game || '',
          players: Array.isArray(data?.payload?.players) ? data.payload.players.length : 0,
          status: data?.payload?.status || 'live',
        });
        return;
      }
      if (data && !data.type && data.players) {
        renderSnapshot(data);
        pushDiag('legacy_snapshot_received', {
          title: data?.title || '',
          game: data?.game || '',
          players: Array.isArray(data?.players) ? data.players.length : 0,
          status: data?.status || 'live',
        });
        return;
      }
      pushDiag('unknown_message', data);
    } catch (err) {
      pushDiag('message_parse_failed', String(err));
    }
  });

  const opts = new cast.framework.CastReceiverOptions();
  opts.disableIdleTimeout = true;
  context.start(opts);
  waitingScreen();
  pushDiag('receiver_start_called', { build: BUILD, namespace: NAMESPACE });
} catch (err) {
  if (statusEl) statusEl.textContent = 'Receiver CAF en erreur au démarrage.';
  pushDiag('receiver_start_failed', String(err));
}
