const BUILD = "CAF-VISUAL-X01-KILLER-2026-04-07-1";
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

function pushDiag(entry, extra) {
  const row = { at: new Date().toISOString(), entry, extra: extra == null ? null : extra };
  logs.push(row);
  while (logs.length > 10) logs.shift();

  if (diagEl) {
    diagEl.textContent = logs
      .slice()
      .reverse()
      .map((r) => `${r.at}  ${r.entry}${r.extra == null ? "" : "\n" + JSON.stringify(r.extra, null, 2)}`)
      .join("\n\n");
    diagEl.style.display = "none";
  }
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

function initials(name) {
  const parts = String(name || "Joueur").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || "").join("").toUpperCase() || "?";
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

function setGameBadge(value) {
  if (gameBadgeEl) gameBadgeEl.textContent = value ? String(value).toUpperCase() : "";
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
        <img
          src="${esc(src)}"
          alt="${esc(player?.name || "avatar")}"
          style="width:100%;height:100%;object-fit:cover;display:block;"
        />
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
  const incomingIds = players.map((p, idx) => String(p?.id || p?.name || idx));
  if (!baseOrderIds.length) {
    incomingIds.forEach((id) => baseOrderIds.push(id));
    return;
  }
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

function commitCompletedRound(players, scoreMap) {
  const rankedIds = players
    .slice()
    .sort((a, b) => num(scoreMap.get(String(a?.id || a?.name || '')), num(a?.score, 0)) - num(scoreMap.get(String(b?.id || b?.name || '')), num(b?.score, 0)))
    .map((p, idx) => ({ id: String(p?.id || p?.name || idx), rank: idx + 1 }));
  const rankById = Object.fromEntries(rankedIds.map((r) => [r.id, r.rank]));
  completedRounds.push({ round: completedRounds.length + 1, rankById });
  while (completedRounds.length > 12) completedRounds.shift();
}

function rememberHistory(players) {
  syncBaseOrder(players);
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

function getPointXY(colIndex, rank, totalCols, playerCount, w, h, topPad = 18, bottomPad = 30, leftPad = 34, rightPad = 34) {
  const x = totalCols <= 1
    ? leftPad + (w - leftPad - rightPad) / 2
    : leftPad + (colIndex * (w - leftPad - rightPad)) / Math.max(1, totalCols - 1);
  const y = topPad + ((rank - 1) * (h - topPad - bottomPad)) / Math.max(1, playerCount - 1);
  return { x, y };
}

function graphHtml(players, colorById) {
  if (players.length < 3) return '';

  const w = 980;
  const h = 206;
  const playerCount = players.length;
  const completedCols = completedRounds.length;
  const hasPending = pendingPlayedIds.size > 0;
  const totalCols = Math.max(1, completedCols + (hasPending ? 1 : 0));

  const partialIds = Array.from(pendingPlayedIds);
  const partialSorted = players
    .filter((p, idx) => partialIds.includes(String(p?.id || p?.name || idx)))
    .slice()
    .sort((a, b) => num(pendingRoundScores.get(String(a?.id || a?.name || '')), num(a?.score, 0)) - num(pendingRoundScores.get(String(b?.id || b?.name || '')), num(b?.score, 0)));
  const partialRankById = Object.fromEntries(partialSorted.map((p, idx) => [String(p?.id || p?.name || idx), idx + 1]));

  const defs = players.map((p, idx) => {
    const color = colorById[String(p?.id || p?.name || idx)] || '#53e7ff';
    return `
      <filter id="glow-${idx}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.8" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
  }).join('');

  const gridX = Array.from({ length: totalCols }, (_, i) => {
    const { x } = getPointXY(i, 1, totalCols, playerCount, w, h);
    return `<line x1="${x}" y1="18" x2="${x}" y2="${h - 30}" stroke="#fff" opacity="0.08" />`;
  }).join('');

  const gridY = Array.from({ length: playerCount }, (_, i) => {
    const { y } = getPointXY(0, i + 1, totalCols, playerCount, w, h);
    return `<line x1="34" y1="${y}" x2="${w - 34}" y2="${y}" stroke="#fff" opacity="0.12" />`;
  }).join('');

  const labels = Array.from({ length: totalCols }, (_, i) => {
    const { x } = getPointXY(i, 1, totalCols, playerCount, w, h);
    return `<text x="${x}" y="${h - 6}" text-anchor="middle" font-size="13" fill="rgba(255,255,255,.72)" font-weight="800">${i + 1}</text>`;
  }).join('');

  const lines = players.map((p, idx) => {
    const id = String(p?.id || p?.name || idx);
    const color = colorById[id] || '#53e7ff';
    const points = [];
    completedRounds.forEach((round, roundIdx) => {
      const rank = round.rankById[id];
      if (!rank) return;
      const pt = getPointXY(roundIdx, rank, totalCols, playerCount, w, h);
      points.push({ ...pt, roundIdx, rank, kind: 'complete' });
    });
    if (hasPending && partialRankById[id]) {
      const pt = getPointXY(totalCols - 1, partialRankById[id], totalCols, playerCount, w, h);
      points.push({ ...pt, roundIdx: totalCols - 1, rank: partialRankById[id], kind: 'pending' });
    }
    if (!points.length) return '';

    const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const pointsHtml = points.map((pt) => {
      if (pt.kind === 'pending') {
        const avatar = getAvatarSrc(p);
        if (avatar) {
          return `<image href="${esc(avatar)}" x="${pt.x - 11}" y="${pt.y - 11}" width="22" height="22" clip-path="circle(11px at 11px 11px)" />`;
        }
        return `<circle cx="${pt.x}" cy="${pt.y}" r="10" fill="${color}" stroke="rgba(255,255,255,.9)" stroke-width="2" />`;
      }
      return `<circle cx="${pt.x}" cy="${pt.y}" r="5" fill="${color}" filter="url(#glow-${idx})" />`;
    }).join('');

    return `
      <path d="${d}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.10" filter="url(#glow-${idx})" />
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
      ${pointsHtml}
    `;
  }).join('');

  return `
    <section class="panel graph-panel">
      <div class="panel-title-row">
        <div class="panel-title" style="margin-bottom:0;">Évolution</div>
        <div class="panel-subtitle">Tours</div>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="graph-svg" preserveAspectRatio="none">
        <defs>${defs}</defs>
        ${gridX}
        ${gridY}
        ${lines}
        ${labels}
      </svg>
    </section>
  `;
}

function logoHtml() {
  return `
    <img
      src="/cast/logo.png"
      alt="Multisports Scoring"
      class="home-logo"
      onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='/logo.png';}else{this.style.display='none';this.nextElementSibling.style.display='block';}"
    />
    <div class="home-logo-fallback">Multisports<br>Scoring</div>
  `;
}

function waitingScreen() {
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

function miniPlayerCard(player, isActive, color) {
  const c = color || "#53e7ff";
  return `
    <div class="mini-player-card ${isActive ? "is-active" : ""}" style="border-color:${c}55; box-shadow:${isActive ? `0 0 18px ${c}22, inset 0 1px 0 rgba(255,255,255,.03)` : `inset 0 1px 0 rgba(255,255,255,.02)`};">
      ${avatarHtml(player, 36, true)}
      <div class="mini-player-info">
        <div class="mini-player-name" style="color:${c};">${esc(player?.name || "Joueur")}</div>
      </div>
      <div class="mini-player-score" style="color:${c};">${esc(player?.score ?? 0)}</div>
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

  return {
    avg3d,
    bestVisit,
    hits,
    miss,
    simple,
    double_,
    triple,
    bull,
    dbull,
    bust,
    totalThrows,
  };
}

function killerPhaseLabel(player) {
  const phase = String(player?.killerPhase || "").toUpperCase();
  if (player?.eliminated) return "Éliminé";
  if (player?.isKiller || phase === "ACTIVE") return "Killer";
  if (phase === "ARMING") return "Armement";
  if (phase === "SELECT") return "Choix numéro";
  return "En jeu";
}

function killerTone(player, fallback) {
  if (player?.eliminated) return "#ff6b6b";
  if (player?.isKiller || String(player?.killerPhase || "").toUpperCase() === "ACTIVE") return fallback || "#53e7ff";
  return "#ffd55b";
}

function killerRankMap(players) {
  const ranked = players.slice().sort((a, b) => {
    const aDead = !!a?.eliminated;
    const bDead = !!b?.eliminated;
    if (aDead !== bDead) return aDead ? 1 : -1;
    const lifeDiff = num(b?.lives ?? b?.score, 0) - num(a?.lives ?? a?.score, 0);
    if (lifeDiff) return lifeDiff;
    const killDiff = num(b?.stats?.kills ?? b?.stats?.avg3d, 0) - num(a?.stats?.kills ?? a?.stats?.avg3d, 0);
    if (killDiff) return killDiff;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
  const out = new Map();
  ranked.forEach((p, idx) => out.set(String(p?.id || p?.name || idx), idx + 1));
  return out;
}

function killerMetaChip(label, value, color) {
  return `
    <div class="stat-cell" style="min-height:54px;box-shadow:0 0 18px ${color}18, inset 0 1px 0 rgba(255,255,255,.03); border-color:${color}44;">
      <div class="stat-label" style="color:${color};">${esc(label)}</div>
      <div class="stat-value" style="color:${color};font-size:18px;">${esc(value)}</div>
    </div>
  `;
}

function parseMetaJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function killerStateMode(player) {
  if (player?.eliminated) return "dead";
  if (player?.resurrected) return "resurrected";
  if (num(player?.shieldTurnsLeft ?? player?.stats?.shieldTurns, 0) > 0) return "shield";
  if (player?.isKiller || String(player?.killerPhase || "").toUpperCase() === "ACTIVE") return "killer";
  return "normal";
}

function killerStateColors(player, fallback) {
  const mode = killerStateMode(player);
  if (mode === "dead") {
    return {
      mode,
      tone: "#ff9d9d",
      border: "rgba(255,88,88,.46)",
      softBorder: "rgba(255,88,88,.22)",
      bg: "linear-gradient(180deg, rgba(88,14,18,.96), rgba(24,7,9,.98))",
      shadow: "0 0 24px rgba(255,88,88,.18)",
      heart: "#f05f80",
      text: "#fff0f0",
    };
  }
  if (mode === "resurrected") {
    return {
      mode,
      tone: "#ffffff",
      border: "rgba(255,255,255,.58)",
      softBorder: "rgba(255,255,255,.24)",
      bg: "linear-gradient(180deg, rgba(56,56,60,.96), rgba(16,16,18,.98))",
      shadow: "0 0 24px rgba(255,255,255,.18)",
      heart: "#f7f0f8",
      text: "#ffffff",
    };
  }
  if (mode === "shield") {
    return {
      mode,
      tone: "#8aeaff",
      border: "rgba(94,224,255,.50)",
      softBorder: "rgba(94,224,255,.24)",
      bg: "linear-gradient(180deg, rgba(14,33,46,.96), rgba(8,14,20,.98))",
      shadow: "0 0 24px rgba(94,224,255,.18)",
      heart: "#ce549c",
      text: "#ecfcff",
    };
  }
  if (mode === "killer") {
    const tone = fallback || "#ffd55b";
    return {
      mode,
      tone,
      border: `${tone}77`,
      softBorder: `${tone}33`,
      bg: "linear-gradient(180deg, rgba(36,28,10,.94), rgba(16,12,8,.98))",
      shadow: `0 0 24px ${tone}18`,
      heart: "#ce549c",
      text: "#fff8e6",
    };
  }
  return {
    mode,
    tone: fallback || "#ffd55b",
    border: "rgba(255,213,91,.36)",
    softBorder: "rgba(255,213,91,.18)",
    bg: "linear-gradient(180deg, rgba(32,34,40,.96), rgba(16,18,22,.98))",
    shadow: "0 0 18px rgba(255,213,91,.08)",
    heart: "#ce549c",
    text: "#ffffff",
  };
}

function killerRoleBadgeHtml(player, colors) {
  const mode = killerStateMode(player);
  if (mode === "dead") {
    return `
      <div class="killer-role-badge" style="background:rgba(255,90,90,.16);border-color:rgba(255,90,90,.42);color:${colors.tone};">
        <span style="font-size:11px;line-height:1;">☠</span>
      </div>
    `;
  }
  if (mode === "killer") {
    return `
      <div class="killer-role-badge" style="background:rgba(255,213,91,.16);border-color:rgba(255,213,91,.38);color:${colors.tone};">
        <span style="font-size:10px;font-weight:1000;letter-spacing:.08em;">K</span>
      </div>
    `;
  }
  if (mode === "resurrected") {
    return `
      <div class="killer-role-badge" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.42);color:${colors.tone};">
        <span style="font-size:11px;line-height:1;">↺</span>
      </div>
    `;
  }
  return "";
}

function killerNumberKpiHtml(number, colors) {
  const value = number > 0 ? number : "?";
  return `
    <div class="killer-mini-number" style="border-color:${colors.softBorder};color:${colors.tone};box-shadow:inset 0 1px 0 rgba(255,255,255,.03);">
      <span>${esc(value)}</span>
    </div>
  `;
}

function killerShieldValueHtml(value, color, compact = false) {
  const turns = Math.max(0, num(value, 0));
  if (!turns) return "";
  const size = compact ? 28 : 46;
  const font = compact ? 12 : 18;
  return `
    <div class="killer-shield-wrap ${compact ? 'is-compact' : ''}" style="width:${size}px;height:${Math.round(size * 1.06)}px;filter:drop-shadow(0 0 14px ${color}22);">
      <svg viewBox="0 0 56 60" class="killer-shield-svg" aria-hidden="true">
        <path d="M28 4L46 10V25C46 38 37.8 48.7 28 55C18.2 48.7 10 38 10 25V10L28 4Z" fill="rgba(86,225,255,.94)" stroke="rgba(255,255,255,.58)" stroke-width="2.2"/>
      </svg>
      <span class="killer-shield-value" style="font-size:${font}px;">${esc(turns)}</span>
    </div>
  `;
}

function killerMiniLifeHtml(lives, colors, player) {
  const heart = killerHeartValueHtml(lives, colors.heart, true);
  const shieldTurns = Math.max(0, num(player?.shieldTurnsLeft ?? player?.stats?.shieldTurns, 0));
  const shield = shieldTurns > 0 ? killerShieldValueHtml(shieldTurns, colors.tone, true) : "";
  return `
    <div class="killer-mini-life-row">
      ${heart}
      ${shield}
    </div>
  `;
}

function killerMiniPlayerCard(player, isActive, color) {
  const colors = killerStateColors(player, color || "#53e7ff");
  const number = num(player?.number ?? player?.stats?.number, 0);
  const lives = num(player?.lives ?? player?.score, 0);
  const botChip = player?.isBot
    ? `<span class="killer-bot-chip">CPU</span>`
    : "";
  const activeRing = isActive ? `0 0 0 1px rgba(255,198,58,.22), 0 0 18px rgba(255,198,58,.16), ` : "";

  return `
    <div class="mini-player-card ${isActive ? "is-active" : ""}" style="grid-template-columns:40px auto minmax(0,1fr) auto;border-color:${colors.border};background:${colors.bg};box-shadow:${activeRing}${colors.shadow}, inset 0 1px 0 rgba(255,255,255,.03);">
      ${avatarHtml(player, 36, true)}
      ${killerNumberKpiHtml(number, colors)}
      <div class="mini-player-info">
        <div class="mini-player-name" style="color:${colors.text};">${esc(player?.name || "Joueur")}</div>
        <div class="killer-mini-status-row">
          ${killerRoleBadgeHtml(player, colors)}
          ${botChip}
        </div>
      </div>
      ${killerMiniLifeHtml(lives, colors, player)}
    </div>
  `;
}

function formatKillerThrow(hit) {
  const target = num(hit?.target, 0);
  const mult = String(hit?.mult || "S").toUpperCase();
  if (!target) return "MISS";
  if (target === 25) {
    if (mult === "D") return "DBULL";
    if (mult === "T") return "BULL x3";
    return "BULL";
  }
  return `${mult}${target}`;
}

function killerVisitHtml(active, color) {
  const visit = Array.isArray(active?.lastVisit) ? active.lastVisit : [];
  if (!visit.length) return "";
  return `
    <section class="panel graph-panel" style="padding:10px 12px;flex:0 0 auto;">
      <div class="panel-title-row">
        <div class="panel-title" style="margin-bottom:0;">Dernière volée</div>
        <div class="panel-subtitle">Killer</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${visit.map((hit) => `
          <div class="stat-cell" style="min-height:56px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px ${color}18, inset 0 1px 0 rgba(255,255,255,.03); border-color:${color}44;">
            <div class="stat-value" style="color:${color};font-size:22px;text-align:center;">${esc(formatKillerThrow(hit))}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function pickKillerStats(active, payloadMeta) {
  const s = active?.stats && typeof active.stats === "object" ? active.stats : {};
  const m = payloadMeta && typeof payloadMeta === "object" ? payloadMeta : {};
  return {
    lives: num(active?.lives ?? active?.score ?? s?.lives, 0),
    number: num(active?.number ?? s?.number ?? m?.currentNumber, 0),
    kills: num(s?.kills ?? s?.avg3d, 0),
    killerHits: num(s?.killerHits ?? s?.hits, 0),
    uselessHits: num(s?.uselessHits ?? s?.miss, 0),
    livesTaken: num(s?.livesTaken, 0),
    livesLost: num(s?.livesLost ?? s?.bust, 0),
    totalThrows: num(s?.totalThrows, 0),
    autoHits: num(s?.autoHits, 0),
    resurrectionsGiven: num(s?.resurrectionsGiven, 0),
    resurrectionsReceived: num(s?.resurrectionsReceived, 0),
    simple: num(s?.simple, 0),
    double_: num(s?.double, 0),
    triple: num(s?.triple, 0),
    bull: num(s?.bull, 0),
    dbull: num(s?.dbull, 0),
    shieldTurns: num(active?.shieldTurnsLeft ?? s?.shieldTurns, 0),
  };
}

function killerOptionBadges(meta) {
  const raw = String(meta?.optionBadges || meta?.optionSummary || "").trim();
  if (!raw) return [];
  if (raw.includes("||")) return raw.split("||").map((v) => String(v || "").trim()).filter(Boolean);
  return raw.split(/\s+•\s+/).map((v) => String(v || "").trim()).filter(Boolean);
}

function killerOptionGroups(meta) {
  const parsed = parseMetaJson(meta?.optionGroupsJson);
  const groups = {
    BULL: [],
    DBULL: [],
    MISS: [],
    "Résurrection": [],
    Multiplicateur: [],
  };

  const pushLine = (key, value) => {
    const label = String(value || "").trim();
    if (!label) return;
    if (!groups[key].includes(label)) groups[key].push(label);
  };

  if (parsed && typeof parsed === "object") {
    const mapping = {
      bull: "BULL",
      dbull: "DBULL",
      miss: "MISS",
      resurrection: "Résurrection",
      multiplicateur: "Multiplicateur",
      multiplier: "Multiplicateur",
    };
    Object.entries(parsed).forEach(([rawKey, rawValue]) => {
      const normalized = mapping[String(rawKey || "").toLowerCase()] || null;
      if (!normalized) return;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      values.forEach((item) => pushLine(normalized, item));
    });
  }

  if (!Object.values(groups).some((arr) => arr.length)) {
    killerOptionBadges(meta).forEach((badge) => {
      const clean = String(badge || "").trim();
      if (!clean) return;
      if (/^DBULL/i.test(clean) || /DBULL/i.test(clean)) {
        pushLine("DBULL", clean.replace(/^DBULL\s*=\s*/i, "").trim());
        return;
      }
      if (/^BULL/i.test(clean) || /BULL/i.test(clean)) {
        pushLine("BULL", clean.replace(/^BULL\s*=\s*/i, "").trim());
        return;
      }
      if (/MISS/i.test(clean)) {
        pushLine("MISS", clean.replace(/^MISS\s*=\s*/i, "").trim());
        return;
      }
      if (/r[ée]surrection/i.test(clean)) {
        pushLine("Résurrection", clean);
      }
    });
  }

  if (!groups.Multiplicateur.length) {
    pushLine("Multiplicateur", `x${num(meta?.multiplier, 1)}`);
  }

  return groups;
}

function killerOptionsBoardHtml(meta, color) {
  const groups = killerOptionGroups(meta);
  const entries = Object.entries(groups);
  return `
    <section class="panel killer-options-panel" style="padding:12px 12px 10px;flex:0 0 auto;border-color:${color}44;box-shadow:0 0 18px ${color}18, inset 0 1px 0 rgba(255,255,255,.03);">
      <div class="panel-title" style="margin-bottom:10px;">Options actives</div>
      <div class="killer-options-grid">
        ${entries.map(([label, values]) => `
          <div class="killer-option-card" style="border-color:${color}22;box-shadow:inset 0 1px 0 rgba(255,255,255,.03), 0 0 14px ${color}10;">
            <div class="killer-option-title" style="color:${color};">${esc(label)}</div>
            <div class="killer-option-lines">${(values.length ? values : ["Aucune"]).map((line) => `<div>${esc(line)}</div>`).join("")}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function killerHeartValueHtml(value, color, compact = false) {
  const width = compact ? 34 : 88;
  const height = compact ? 31 : 80;
  const font = compact ? 14 : 34;
  return `
    <div class="killer-heart-wrap ${compact ? 'is-compact' : ''}" style="width:${width}px;height:${height}px;filter:drop-shadow(0 0 ${compact ? 10 : 18}px ${color}22);">
      <svg viewBox="0 0 64 58" class="killer-heart-svg" aria-hidden="true">
        <path d="M32 54C29.6 52.1 5 36.6 5 19.8C5 11.2 11.7 5 19.9 5C25.2 5 29.5 7.4 32 11.4C34.5 7.4 38.8 5 44.1 5C52.3 5 59 11.2 59 19.8C59 36.6 34.4 52.1 32 54Z" fill="rgba(206,84,156,.95)" stroke="rgba(255,255,255,.55)" stroke-width="2.2"/>
      </svg>
      <span class="killer-heart-value" style="font-size:${font}px;">${esc(value)}</span>
    </div>
  `;
}
function renderKillerSnapshot(payload) {
  lastPayload = payload || {};
  try { document.body.classList.remove("is-home"); } catch {}

  const players = Array.isArray(payload?.players) ? payload.players : [];
  if (!players.length) {
    waitingScreen();
    return;
  }

  const active = players.find((p) => p?.active) || players.find((p) => String(p?.id || "") === String(payload?.currentPlayer || "")) || players[0];
  const palette = ["#53e7ff", "#ffd55b", "#ffffff", "#ff66d1", "#63ff97", "#ff8f5b", "#9da7ff", "#8df0ff", "#ff5b7d", "#c5ff5b", "#ffb45b", "#d095ff"];
  const orderIds = players.map((p, idx) => String(p?.id || p?.name || idx));
  const colorById = Object.fromEntries(orderIds.map((id, idx) => [id, palette[idx % palette.length]]));
  const idx = orderIds.findIndex((id) => id === String(active?.id || active?.name || ""));
  const rotatedIds = idx >= 0 ? orderIds.slice(idx).concat(orderIds.slice(0, idx)) : orderIds.slice();
  const playerMap = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), p]));
  const ordered = rotatedIds.map((id) => playerMap.get(id)).filter(Boolean);
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const gameTitle = payload?.title || payload?.game || "Killer";
  const rankMap = killerRankMap(players);
  const activeRank = rankMap.get(String(active?.id || active?.name || "")) || 1;
  const baseColor = colorById[String(active?.id || active?.name || "")] || "#53e7ff";
  const activeColors = killerStateColors(active, baseColor);
  const activeColor = activeColors.tone;
  const ks = pickKillerStats(active, meta);
  const aliveCount = num(meta?.aliveCount, players.filter((p) => !p?.eliminated).length);
  const phaseLabel = killerPhaseLabel(active);

  try { document.body.style.setProperty("--theme-accent", activeColor); } catch {}
  if (statusEl) statusEl.textContent = payload?.title || payload?.game || "Partie en cours";
  setGameBadge(gameTitle);

  contentEl.innerHTML = `
    <div class="receiver-shell">
      <div class="receiver-layout">
        <aside class="panel order-panel">
          <div class="panel-title">Joueurs Killer</div>
          <div class="mini-player-list">
            ${ordered.map((p) => killerMiniPlayerCard(p, p === active, colorById[String(p?.id || p?.name || "")])).join("")}
          </div>
        </aside>

        <main class="main-column">
          <section class="panel active-panel">
            <div class="active-top">
              <div class="active-left">
                <div class="active-avatar-wrap">
                  ${avatarHtml(active, 108)}
                </div>
                <div class="active-name" style="color:${activeColors.text};">${esc(active?.name || "Joueur")}</div>
                <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  ${killerRoleBadgeHtml(active, activeColors)}
                  <div style="font-size:14px;font-weight:1000;opacity:.92;color:${activeColor};">${esc(phaseLabel)}</div>
                </div>
              </div>

              <div class="killer-top-grid">
                <div class="score-card killer-split-card">
                  <div class="score-label" style="color:${activeColor};">NUMÉRO</div>
                  <div class="score-value" style="color:${activeColor};">${esc(ks.number > 0 ? ks.number : "—")}</div>
                </div>

                <div class="score-card killer-split-card">
                  <div class="score-rank">#${esc(activeRank)}</div>
                  <div class="score-label" style="color:${activeColor};">VIES</div>
                  <div class="killer-lives-box">
                    ${killerHeartValueHtml(ks.lives, activeColors.heart)}
                  </div>
                </div>
              </div>
            </div>

            <div class="active-bottom">
              ${killerOptionsBoardHtml(meta, activeColor)}

              <section class="panel killer-stats-panel" style="padding:12px 12px 10px;flex:0 0 auto;margin-top:10px;border-color:${activeColor}44;box-shadow:0 0 18px ${activeColor}18, inset 0 1px 0 rgba(255,255,255,.03);">
                <div class="panel-title" style="margin-bottom:10px;">Stats Killer</div>
                <div class="stats-grid killer-stats-grid">
                  ${killerMetaChip("Bouclier", ks.shieldTurns > 0 ? `${ks.shieldTurns}T` : "OFF", activeColor)}
                  ${killerMetaChip("Survivants", `${aliveCount}/${players.length}`, activeColor)}
                  ${killerMetaChip("Tour", num(meta?.turnCount, 0) || "—", activeColor)}
                  ${killerMetaChip("Lancers", ks.totalThrows, activeColor)}
                  ${killerMetaChip("Dégâts", ks.livesTaken, activeColor)}
                  ${killerMetaChip("Kills", ks.kills, activeColor)}
                  ${killerMetaChip("Auto-hit", ks.autoHits, activeColor)}
                  ${killerMetaChip("Résurrection", ks.resurrectionsGiven, activeColor)}
                </div>
              </section>

              ${killerVisitHtml(active, activeColor)}
            </div>
          </section>
        </main>
      </div>
    </div>
  `;
}

function renderStandardSnapshot(payload) {
  lastPayload = payload || {};
  try { document.body.classList.remove("is-home"); } catch {}

  const players = Array.isArray(payload?.players) ? payload.players : [];

  if (!players.length) {
    waitingScreen();
    return;
  }

  const active = players.find((p) => p?.active) || players.find((p) => String(p?.id || "") === String(payload?.currentPlayer || "")) || players[0];
  rememberHistory(players);
  const palette = ["#53e7ff", "#ffd55b", "#ffffff", "#ff66d1", "#63ff97", "#ff8f5b", "#9da7ff", "#8df0ff", "#ff5b7d", "#c5ff5b", "#ffb45b", "#d095ff"];
  const orderIds = baseOrderIds.length ? baseOrderIds.slice() : players.map((p, idx) => String(p?.id || p?.name || idx));
  const colorById = Object.fromEntries(orderIds.map((id, idx) => [id, palette[idx % palette.length]]));
  const idx = orderIds.findIndex((id) => id === String(active?.id || active?.name || ""));
  const rotatedIds = idx >= 0 ? orderIds.slice(idx).concat(orderIds.slice(0, idx)) : orderIds.slice();
  const playerMap = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), p]));
  const ordered = rotatedIds.map((id) => playerMap.get(id)).filter(Boolean);
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const gameTitle = payload?.title || payload?.game || "Multisports";

  const ps = pickPlayerStats(active, meta);
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : ps.hits;
  const rankMap = getRankMap(players);
  const activeRank = rankMap.get(String(active?.id || active?.name || "")) || 1;
  const activeColor = colorById[String(active?.id || active?.name || "")] || "#53e7ff";
  try { document.body.style.setProperty("--theme-accent", activeColor); } catch {}

  if (statusEl) statusEl.textContent = payload?.title || payload?.game || "Partie en cours";
  setGameBadge(gameTitle);

  contentEl.innerHTML = `
    <div class="receiver-shell">
      <div class="receiver-layout">
        <aside class="panel order-panel">
          <div class="panel-title">Ordre de passage</div>
          <div class="mini-player-list">
            ${ordered.map((p) => miniPlayerCard(p, p === active, colorById[String(p?.id || p?.name || "")])).join("")}
          </div>
        </aside>

        <main class="main-column">
          <section class="panel active-panel">
            <div class="active-top">
              <div class="active-left">
                <div class="active-avatar-wrap">
                  ${avatarHtml(active, 108)}
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
              ${graphHtml(players, colorById)}
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

function renderSnapshot(payload) {
  const game = String(payload?.game || "").toLowerCase();
  if (game === "killer") {
    renderKillerSnapshot(payload);
    return;
  }
  renderStandardSnapshot(payload);
}

try {
  pushDiag("receiver_script_loaded", { build: BUILD, href: location.href, namespace: NAMESPACE });

  const context = cast.framework.CastReceiverContext.getInstance();

  context.addEventListener(cast.framework.system.EventType.READY, (event) => {
    pushDiag("receiver_ready_event", event?.data || null);
    waitingScreen();
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
    pushDiag("sender_connected", {
      senderId: event?.senderId || null,
      userAgent: event?.userAgent || null,
    });
    if (!lastPayload && statusEl) {
      statusEl.textContent = "Sender connecté";
    }
  });

  context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event) => {
    pushDiag("sender_disconnected", {
      senderId: event?.senderId || null,
      reason: event?.reason || null,
    });
  });

  context.addCustomMessageListener(NAMESPACE, (event) => {
    pushDiag("custom_message_received", {
      senderId: event.senderId,
      dataType: typeof event.data,
    });

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
        });
        return;
      }

      if (data && !data.type && data.players) {
        renderSnapshot(data);
        pushDiag("legacy_snapshot_received", {
          title: data?.title || "",
          game: data?.game || "",
          players: Array.isArray(data?.players) ? data.players.length : 0,
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
