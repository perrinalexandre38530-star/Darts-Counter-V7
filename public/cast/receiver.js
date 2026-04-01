
const BUILD = "CAF-X01-TOP8-SCROLL-2026-04-01-PATCHED";
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
const completedRounds = [];
const pendingRoundScores = new Map();
const pendingPlayedIds = new Set();
let lastScoresMap = new Map();
let lastPayload = null;
let finishTimer = null;
let lastPlayersSig = '';

const gameState = {
  activeId: '',
  lastScores: new Map(),
  currentRoundRanks: new Map(),
  roundHistory: [],
  currentRoundNo: 1,
  rosterSig: '',
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

function resetHistory(players = []) {
  completedRounds.length = 0;
  pendingRoundScores.clear();
  pendingPlayedIds.clear();
  lastScoresMap = new Map((players || []).map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
  lastPlayersSig = playersSignature(players);

  gameState.activeId = '';
  gameState.lastScores = new Map((players || []).map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
  gameState.currentRoundRanks = new Map();
  gameState.roundHistory = [];
  gameState.currentRoundNo = 1;
  gameState.rosterSig = lastPlayersSig;
}

function maybeResetHistory(players) {
  const sig = playersSignature(players);
  const changedRoster = sig !== lastPlayersSig;
  const statsAreBlank = (players || []).every((p) => {
    const s = p?.stats || {};
    return !num(s.totalThrows ?? s.throws ?? s.attempts ?? 0) && !num(s.bestVisit ?? s.best ?? 0);
  });
  const allScoresEqual = (players || []).every((p) => num(p?.score, 0) === num(players?.[0]?.score, 0));
  if (!lastPlayersSig || changedRoster || (statsAreBlank && allScoresEqual && (completedRounds.length || pendingPlayedIds.size))) {
    resetHistory(players);
  }
}

function commitCompletedRound(players, scoreMap) {
  const visible = players
    .slice()
    .sort((a, b) => num(scoreMap.get(String(a?.id || a?.name || "")), num(a?.score, 0)) - num(scoreMap.get(String(b?.id || b?.name || "")), num(b?.score, 0)));
  const rankById = Object.fromEntries(visible.map((p, idx) => [String(p?.id || p?.name || idx), idx + 1]));
  completedRounds.push({ round: completedRounds.length + 1, rankById });
  while (completedRounds.length > 12) completedRounds.shift();
}

function rememberHistory(players) {
  syncBaseOrder(players);
  maybeResetHistory(players);
  if (!players.length) return;

  const currentScores = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
  if (!lastScoresMap.size) {
    lastScoresMap = new Map(currentScores);
    return;
  }

  currentScores.forEach((score, id) => {
    if (lastScoresMap.get(id) !== score) {
      pendingPlayedIds.add(id);
      pendingRoundScores.set(id, score);
    }
  });

  if (pendingPlayedIds.size >= players.length) {
    commitCompletedRound(players, currentScores);
    pendingPlayedIds.clear();
    pendingRoundScores.clear();
  }

  lastScoresMap = new Map(currentScores);
}

function getPointXY(colIndex, rank, totalCols, playerCount, w, h, topPad = 28, bottomPad = 40, leftPad = 60, rightPad = 60) {
  const x = totalCols <= 1
    ? leftPad + (w - leftPad - rightPad) / 2
    : leftPad + (colIndex * (w - leftPad - rightPad)) / Math.max(1, totalCols - 1);
  const y = topPad + ((rank - 1) * (h - topPad - bottomPad)) / Math.max(1, playerCount - 1);
  return { x, y };
}

function safeAvatarSrc(src) {
  if (typeof src !== "string") return "";
  const clean = src.trim();
  if (!clean) return "";
  if (clean.startsWith("data:") && clean.length > 220000) return "";
  return clean;
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
    const clean = safeAvatarSrc(src);
    if (clean) {
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
        <img src="${esc(src)}" alt="${esc(player?.name || "avatar")}" style="width:100%;height:100%;object-fit:cover;display:block;" />
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

function maybeResetForNewGame(players, activeId) {
  const sig = playersSignature(players);
  const changedRoster = sig !== gameState.rosterSig;
  const currentActiveId = String(activeId || "");
  const allScoresEqual = (players || []).every((p) => num(p?.score, 0) === num(players?.[0]?.score, 0));
  const statsAreBlank = (players || []).every((p) => {
    const s = p?.stats || {};
    return !num(s.totalThrows ?? s.throws ?? s.attempts ?? 0) && !num(s.bestVisit ?? s.best ?? 0);
  });

  if (!gameState.rosterSig || changedRoster || (allScoresEqual && statsAreBlank && currentActiveId && gameState.activeId && currentActiveId !== gameState.activeId)) {
    gameState.activeId = "";
    gameState.lastScores = new Map((players || []).map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));
    gameState.currentRoundRanks = new Map();
    gameState.roundHistory = [];
    gameState.currentRoundNo = 1;
    gameState.rosterSig = sig;
  }
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
  try { document.body.classList.add("is-home"); } catch {}
  if (statusEl) statusEl.textContent = "Prêt";
  setGameBadge("");
  contentEl.innerHTML = `
    <div class="receiver-shell home-shell">
      <div class="home-center">
        ${logoHtml()}
        <div class="home-tagline">Sélectionne ton mode de jeu et lance ta partie !</div>
      </div>
    </div>
  `;
}

function buildTurnOrderedPlayers(players, activeId) {
  const ids = baseOrderIds.length ? baseOrderIds.slice() : players.map((p, idx) => String(p?.id || p?.name || idx));
  const idx = ids.indexOf(activeId);
  const orderedIds = idx >= 0 ? ids.slice(idx).concat(ids.slice(0, idx)) : ids.slice();
  const playerMap = new Map(players.map((p, i) => [String(p?.id || p?.name || i), p]));
  return orderedIds.map((id) => playerMap.get(id)).filter(Boolean);
}

function miniPlayerCard(player, color, opts = {}) {
  const c = color || "#53e7ff";
  const active = !!opts.active;
  const compact = !!opts.compact;
  const size = compact ? 30 : 34;
  return `
    <div class="mini-player-card ${active ? "is-active" : ""}" style="grid-template-columns:${size}px minmax(0,1fr) auto; padding:${compact ? "5px 8px" : "7px 10px"}; border-color:${active ? c + "aa" : c + "55"}; background:${active ? "linear-gradient(180deg, color-mix(in srgb, " + c + " 18%, rgba(255,255,255,.04)), rgba(255,255,255,.04))" : "rgba(255,255,255,.03)"}; box-shadow:${active ? "0 0 26px " + c + "55, 0 0 10px " + c + "55, inset 0 1px 0 rgba(255,255,255,.06)" : "0 0 18px " + c + "22, inset 0 1px 0 rgba(255,255,255,.03)"};">
      ${avatarHtml(player, size, true)}
      <div class="mini-player-info">
        <div class="mini-player-name" style="color:${c}; font-size:${compact ? "11px" : "12px"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(player?.name || "Joueur")}</div>
      </div>
      <div class="mini-player-score" style="color:${c}; font-size:${compact ? "13px" : "14px"};">${esc(player?.score ?? 0)}</div>
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
  const s = active?.stats && typeof active.stats === "object" ? active.stats : {};
  const m = payloadMeta && typeof payloadMeta === "object" ? payloadMeta : {};

  const miss = num(s.miss ?? s.misses ?? m.miss ?? m.misses ?? 0, 0);
  const simple = num(s.simple ?? s.singles ?? m.simple ?? m.singles ?? 0, 0);
  const double_ = num(s.double ?? s.doubles ?? m.double ?? m.doubles ?? 0, 0);
  const triple = num(s.triple ?? s.triples ?? m.triple ?? m.triples ?? 0, 0);
  const bull = num(s.bull ?? s.bulls ?? m.bull ?? m.bulls ?? 0, 0);
  const dbull = num(s.dbull ?? s.doubleBull ?? s.dbulls ?? m.dbull ?? m.doubleBull ?? m.dbulls ?? 0, 0);
  const bust = num(s.bust ?? s.busts ?? m.bust ?? m.busts ?? 0, 0);
  const avg3d = s.avg3d ?? s.avg3 ?? s.avg ?? m.avg3d ?? m.avg3 ?? m.avg ?? "—";
  const bestVisit = s.bestVisit ?? s.best ?? m.bestVisit ?? m.best ?? "—";
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
                      <div style="font-size:18px;font-weight:1000;color:${idx === 0 ? activeColor : "rgba(255,255,255,.92)"};">${idx + 1}.</div>
                      ${avatarHtml(p, 44, true)}
                      <div style="min-width:0;">
                        <div style="font-size:18px;font-weight:900;color:${idx === 0 ? activeColor : "#f7f6f3"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p?.name || "Joueur")}</div>
                        <div style="font-size:13px;color:rgba(255,255,255,.66);">Score ${esc(p?.score ?? 0)}</div>
                      </div>
                      <div style="font-size:28px;font-weight:1000;color:${idx === 0 ? activeColor : "rgba(255,255,255,.96)"};">${esc(p?.score ?? 0)}</div>
                    </div>
                  `).join("")}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div class="stat-cell" style="height:auto;padding:14px;border-color:${activeColor}55;">
                  <div class="stat-label" style="color:${activeColor};">Meilleure visite</div>
                  <div class="stat-value" style="color:${activeColor};font-size:26px;">${esc(bestVisitWinner?.stats?.bestVisit ?? bestVisitWinner?.stats?.best ?? 0)}</div>
                  <div style="margin-top:6px;font-size:15px;color:rgba(255,255,255,.88);">${esc(bestVisitWinner?.name || "—")}</div>
                </div>
                <div class="stat-cell" style="height:auto;padding:14px;border-color:${activeColor}55;">
                  <div class="stat-label" style="color:${activeColor};">Meilleure moyenne</div>
                  <div class="stat-value" style="color:${activeColor};font-size:26px;">${esc(bestAvgWinner?.stats?.avg3d ?? bestAvgWinner?.stats?.avg3 ?? bestAvgWinner?.stats?.avg ?? "—")}</div>
                  <div style="margin-top:6px;font-size:15px;color:rgba(255,255,255,.88);">${esc(bestAvgWinner?.name || "—")}</div>
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
  if (players.length < 3) return "";

  const rankedNow = players.slice().sort((a, b) => num(a?.score, 0) - num(b?.score, 0));
  const visiblePlayers = rankedNow.slice(0, Math.min(8, rankedNow.length));
  const visibleIds = new Set(visiblePlayers.map((p, idx) => String(p?.id || p?.name || idx)));
  const playerCount = visiblePlayers.length;

  const visibleCompleted = completedRounds
    .slice(-10)
    .map((round, i) => ({
      round: i + 1,
      rankById: Object.fromEntries(Object.entries(round.rankById || {}).filter(([id]) => visibleIds.has(String(id))))
    }))
    .filter((r) => Object.keys(r.rankById).length > 0);

  const partialIds = Array.from(pendingPlayedIds).filter((id) => visibleIds.has(String(id)));
  const partialSorted = visiblePlayers
    .filter((p, idx) => partialIds.includes(String(p?.id || p?.name || idx)))
    .slice()
    .sort((a, b) => num(pendingRoundScores.get(String(a?.id || a?.name || "")), num(a?.score, 0)) - num(pendingRoundScores.get(String(b?.id || b?.name || "")), num(b?.score, 0)));
  const partialRankById = Object.fromEntries(partialSorted.map((p, idx) => [String(p?.id || p?.name || idx), idx + 1]));

  const w = 980;
  const h = playerCount <= 5 ? 182 : 212;
  const completedCols = visibleCompleted.length;
  const hasPending = partialIds.length > 0;
  const totalCols = Math.max(1, completedCols + (hasPending ? 1 : 0));

  const defs = visiblePlayers.map((p, idx) => {
    const color = colorById[String(p?.id || p?.name || idx)] || "#53e7ff";
    return `
      <filter id="glow-${idx}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="clip-${idx}">
        <circle cx="11" cy="11" r="10"></circle>
      </clipPath>
      <linearGradient id="ring-${idx}" x1="0%" x2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.98"></stop>
        <stop offset="100%" stop-color="${activeColor || color}" stop-opacity="0.98"></stop>
      </linearGradient>
    `;
  }).join("");

  const gridX = Array.from({ length: totalCols }, (_, i) => {
    const { x } = getPointXY(i, 1, totalCols, playerCount, w, h);
    return `<line x1="${x}" y1="28" x2="${x}" y2="${h - 40}" stroke="#fff" opacity="0.07" />`;
  }).join("");

  const gridY = Array.from({ length: playerCount }, (_, i) => {
    const { y } = getPointXY(0, i + 1, totalCols, playerCount, w, h);
    return `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="#fff" opacity="0.12" />`;
  }).join("");

  const labels = Array.from({ length: totalCols }, (_, i) => {
    const { x } = getPointXY(i, 1, totalCols, playerCount, w, h);
    return `<text x="${x}" y="${h - 10}" text-anchor="middle" font-size="12" fill="rgba(255,255,255,.72)" font-weight="800">${i + 1}</text>`;
  }).join("");

  const lines = visiblePlayers.map((p, idx) => {
    const id = String(p?.id || p?.name || idx);
    const color = colorById[id] || "#53e7ff";
    const points = [];

    visibleCompleted.forEach((round, roundIdx) => {
      const rank = round.rankById[id];
      if (!rank) return;
      points.push({ ...getPointXY(roundIdx, rank, totalCols, playerCount, w, h), kind: "complete" });
    });

    if (hasPending && partialRankById[id]) {
      points.push({ ...getPointXY(totalCols - 1, partialRankById[id], totalCols, playerCount, w, h), kind: "pending" });
    }

    if (!points.length) return "";

    const d = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
    const pointEls = points.map((pt) => {
      if (pt.kind === "pending") {
        const avatar = getAvatarSrc(p);
        if (avatar) {
          return `
            <g filter="url(#glow-${idx})">
              <circle cx="${pt.x}" cy="${pt.y}" r="13" fill="none" stroke="url(#ring-${idx})" stroke-width="2.2" opacity="0.98" />
              <image href="${esc(avatar)}" x="${(pt.x - 11).toFixed(1)}" y="${(pt.y - 11).toFixed(1)}" width="22" height="22" clip-path="url(#clip-${idx})" />
            </g>
          `;
        }
        return `<circle cx="${pt.x}" cy="${pt.y}" r="8" fill="${color}" stroke="rgba(255,255,255,.92)" stroke-width="2" filter="url(#glow-${idx})" />`;
      }
      return `<circle cx="${pt.x}" cy="${pt.y}" r="2.8" fill="${color}" filter="url(#glow-${idx})" />`;
    }).join("");

    return `
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" opacity="0.94" filter="url(#glow-${idx})" />
      ${pointEls}
    `;
  }).join("");

  return `
    <section class="panel graph-panel" style="padding:12px 14px 10px; min-height:${h + 34}px;">
      <svg viewBox="0 0 ${w} ${h}" class="graph-svg" preserveAspectRatio="none" style="height:${h}px; padding:4px 14px 0; overflow:visible;">
        <defs>${defs}</defs>
        ${gridY}
        ${gridX}
        ${lines}
        ${labels}
      </svg>
    </section>
  `;
}

function computeScrollStyle(count) {
  if (count <= 7) return "";
  const translate = Math.min(42, Math.max(10, (count - 7) * 6));
  const duration = Math.min(18, Math.max(8, count * 1.2));
  return `animation: msAutoScroll ${duration}s ease-in-out infinite alternate; will-change: transform; --scroll-shift:${translate}%;`;
}

function renderGame(payload) {
  safeClearFinishTimer();
  try { document.body.classList.remove("is-home"); } catch {}

  const players = Array.isArray(payload?.players) ? payload.players : [];
  if (!players.length) return waitingScreen();

  const active = players.find((p) => String(p?.id || "") === String(payload?.currentPlayer || "")) || players.find((p) => p?.active) || players[0];
  const activeId = String(active?.id || active?.name || "");
  rememberHistory(players);
  rememberTurnProgress(players, activeId);

  const palette = ["#53e7ff", "#ffd55b", "#ffffff", "#ff66d1", "#63ff97", "#ff8f5b", "#9da7ff", "#8df0ff", "#ff5b7d", "#c5ff5b", "#ffb45b", "#d095ff"];
  const orderIds = baseOrderIds.length ? baseOrderIds.slice() : players.map((p, idx) => String(p?.id || p?.name || idx));
  const colorById = Object.fromEntries(orderIds.map((id, idx) => [id, palette[idx % palette.length]]));

  const ordered = buildTurnOrderedPlayers(players, activeId);
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const ps = pickPlayerStats(active, meta);
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : ps.hits;
  const rankMap = getRankMap(players);
  const activeRank = rankMap.get(activeId) || 1;
  const activeColor = colorById[activeId] || "#53e7ff";
  const gameTitle = payload?.title || payload?.game || "Multisports";

  try { document.body.style.setProperty("--theme-accent", activeColor); } catch {}
  if (statusEl) statusEl.textContent = gameTitle;
  setGameBadge(gameTitle);

  contentEl.innerHTML = `
    <style>
      @keyframes msAutoScroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(calc(var(--scroll-shift, 0) * -1)); }
      }
    </style>
    <div class="receiver-shell">
      <div class="receiver-layout">
        <aside class="panel order-panel">
          <div class="panel-title">Ordre de passage</div>
          <div class="mini-player-list" style="max-height:calc(100vh - 190px); overflow:hidden; ${computeScrollStyle(ordered.length)}">
            ${ordered.map((p, i) => miniPlayerCard(p, colorById[String(p?.id || p?.name || "")], { active: i === 0, compact: ordered.length >= 8 })).join("")}
          </div>
        </aside>
        <main class="main-column">
          <section class="panel active-panel">
            <div class="active-top">
              <div class="active-left">
                <div class="active-avatar-wrap" style="box-shadow:0 0 24px ${activeColor}55, 0 0 48px ${activeColor}22;">
                  ${avatarHtml(active, players.length >= 8 ? 92 : 104)}
                </div>
                <div class="active-name" style="color:${activeColor};">${esc(active?.name || "Joueur")}</div>
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
                ${statCell("Avg 3D", ps.avg3d, activeColor)}
                ${statCell("Best volée", ps.bestVisit, activeColor)}
                ${statCell("Hits", ps.hits, activeColor)}
                ${statCell("Miss", `${ps.miss} - ${pct(ps.miss, totalRef)}`, activeColor)}
                ${statCell("Simple", formatStatPair(ps.simple, totalRef), activeColor)}
                ${statCell("Double", formatStatPair(ps.double_, totalRef), activeColor)}
                ${statCell("Triple", formatStatPair(ps.triple, totalRef), activeColor)}
                ${statCell("Bull", formatStatPair(ps.bull, totalRef), activeColor)}
                ${statCell("DBull", formatStatPair(ps.dbull, totalRef), activeColor)}
                ${statCell("Bust", formatStatPair(ps.bust, totalRef), activeColor)}
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
  const activeColor = getRankMap(players).get(String(active?.id || active?.name || "")) === 1 ? "#f4d26c" : "#53e7ff";
  try { document.body.style.setProperty("--theme-accent", activeColor); } catch {}
  if (statusEl) statusEl.textContent = "Partie terminée";
  setGameBadge(payload?.title || payload?.game || "X01");
  contentEl.innerHTML = finalSummaryHtml(players, activeColor, payload?.title || payload?.game || "X01");
  finishTimer = setTimeout(() => {
    waitingScreen();
    resetHistory([]);
  }, 9000);
}

function renderSnapshot(payload) {
  lastPayload = payload || {};
  if ((payload?.status || "") === "finished") {
    renderFinished(payload || {});
    return;
  }
  renderGame(payload || {});
}

try {
  pushDiag("receiver_script_loaded", { build: BUILD, href: location.href, namespace: NAMESPACE });
  const context = cast.framework.CastReceiverContext.getInstance();

  context.addEventListener(cast.framework.system.EventType.READY, (event) => {
    pushDiag("receiver_ready_event", event?.data || null);
    waitingScreen();
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
    pushDiag("sender_connected", { senderId: event?.senderId || null, userAgent: event?.userAgent || null });
    if (!lastPayload && statusEl) statusEl.textContent = "Sender connecté";
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event) => {
    pushDiag("sender_disconnected", { senderId: event?.senderId || null, reason: event?.reason || null });
  });

  context.addCustomMessageListener(NAMESPACE, (event) => {
    pushDiag("custom_message_received", { senderId: event.senderId, dataType: typeof event.data });
    try {
      const rawData = event.data || null;
      const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

      if (data?.type === "PING") {
        if (statusEl) statusEl.textContent = "PING reçu";
        pushDiag("ping_received", data);
        return;
      }

      if (data?.type === "SNAPSHOT") {
        renderSnapshot(data.payload || {});
        pushDiag("snapshot_received", {
          title: data?.payload?.title || "",
          game: data?.payload?.game || "",
          players: Array.isArray(data?.payload?.players) ? data.payload.players.length : 0,
          status: data?.payload?.status || "live",
        });
        return;
      }

      if (data && !data.type && data.players) {
        renderSnapshot(data);
        pushDiag("legacy_snapshot_received", {
          title: data?.title || "",
          game: data?.game || "",
          players: Array.isArray(data?.players) ? data.players.length : 0,
          status: data?.status || "live",
        });
        return;
      }

      pushDiag("unknown_message", data);
    } catch (err) {
      pushDiag("message_parse_failed", String(err));
    }
  });

  const opts = new cast.framework.CastReceiverOptions();
  opts.disableIdleTimeout = true;
  context.start(opts);
  waitingScreen();
  pushDiag("receiver_start_called", { build: BUILD, namespace: NAMESPACE });
} catch (err) {
  if (statusEl) statusEl.textContent = "Receiver CAF en erreur au démarrage.";
  pushDiag("receiver_start_failed", String(err));
}
