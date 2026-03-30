const BUILD = "CAF-VISUAL-X01-STABLE-2026-03-27-LAYOUTFIT";
const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");
const diagEl = document.getElementById("diag");
const buildEl = document.getElementById("build");
const gameBadgeEl = document.getElementById("gameBadge");

if (buildEl) buildEl.textContent = `Build: ${BUILD}`;

const logs = [];
const historyMap = new Map();
const avatarCache = new Map();
const baseOrderIds = [];
const roundAccumulator = new Map();
let lastRoundScores = new Map();
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

function commitRound(players, scoreMap) {
  const shadow = players.map((p, idx) => ({ ...p, score: scoreMap.get(String(p?.id || p?.name || idx)) ?? num(p?.score, 0) }));
  const rankById = getRankMap(shadow);
  players.forEach((p, idx) => {
    const id = String(p?.id || p?.name || idx);
    const rank = rankById.get(id) || idx + 1;
    const entry = historyMap.get(id) || { id, name: String(p?.name || "Joueur"), points: [{ round: 0, rank: players.length }] };
    entry.name = String(p?.name || entry.name || "Joueur");
    const last = entry.points[entry.points.length - 1];
    if (!last || last.rank !== rank) entry.points.push({ round: (last?.round || 0) + 1, rank });
    else entry.points.push({ round: (last?.round || 0) + 1, rank });
    while (entry.points.length > 20) entry.points.shift();
    historyMap.set(id, entry);
  });
}

function rememberHistory(players) {
  syncBaseOrder(players);
  if (!players.length) return;
  const currentScores = new Map(players.map((p, idx) => [String(p?.id || p?.name || idx), num(p?.score, 0)]));

  if (!lastRoundScores.size) {
    players.forEach((p, idx) => {
      const id = String(p?.id || p?.name || idx);
      historyMap.set(id, { id, name: String(p?.name || "Joueur"), points: [{ round: 0, rank: idx + 1 }] });
    });
    lastRoundScores = new Map(currentScores);
    return;
  }

  currentScores.forEach((score, id) => {
    const prev = lastRoundScores.get(id);
    if (prev !== score) roundAccumulator.set(id, score);
  });

  if (roundAccumulator.size >= players.length) {
    commitRound(players, currentScores);
    roundAccumulator.clear();
  }

  lastRoundScores = new Map(currentScores);
}

function linePath(points, w, h, rounds, playerCount) {
  if (!points.length) return "";
  return points
    .map((pt, i) => {
      const x = rounds <= 1 ? 24 : 24 + ((pt.round - 1) * (w - 48)) / Math.max(1, rounds - 1);
      const y = 16 + ((pt.rank - 1) * (h - 32)) / Math.max(1, playerCount - 1);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function graphHtml(players, colorById) {
  if (players.length < 3) return "";

  const series = players.map((p) => historyMap.get(String(p?.id || p?.name)) || { points: [{ round: 0, rank: players.length }] });
  const rounds = Math.max(1, ...series.map((s) => s.points[s.points.length - 1]?.round || 1));
  const w = 980;
  const h = 178;
  const defs = players.map((p, idx) => {
    const color = colorById[String(p?.id || p?.name || idx)] || "#53e7ff";
    return `
      <filter id="glow-${idx}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.8" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
  }).join("");

  const gridX = Array.from({ length: rounds }, (_, i) => {
    const x = rounds <= 1 ? 24 : 24 + (i * (w - 48)) / Math.max(1, rounds - 1);
    return `<line x1="${x}" y1="16" x2="${x}" y2="${h - 16}" stroke="#fff" opacity="0.08" />`;
  }).join("");

  const gridY = Array.from({ length: players.length }, (_, i) => {
    const y = 16 + (i * (h - 32)) / Math.max(1, players.length - 1);
    return `<line x1="24" y1="${y}" x2="${w - 24}" y2="${y}" stroke="#fff" opacity="0.12" />`;
  }).join("");

  const labels = Array.from({ length: rounds }, (_, i) => {
    const x = rounds <= 1 ? 24 : 24 + (i * (w - 48)) / Math.max(1, rounds - 1);
    return `<text x="${x}" y="${h - 2}" text-anchor="middle" font-size="13" fill="rgba(255,255,255,.72)" font-weight="800">${i + 1}</text>`;
  }).join("");

  const lines = series.map((s, idx) => {
    const d = linePath(s.points, w, h - 20, rounds, players.length);
    const p = players[idx];
    const color = colorById[String(p?.id || p?.name || idx)] || "#53e7ff";
    const last = s.points[s.points.length - 1];
    const x = rounds <= 1 ? 24 : 24 + ((last.round - 1) * (w - 48)) / Math.max(1, rounds - 1);
    const y = 16 + ((last.rank - 1) * ((h - 20) - 32)) / Math.max(1, players.length - 1);
    const avatar = getAvatarSrc(p);
    const end = avatar ? `<image href="${esc(avatar)}" x="${x - 11}" y="${y - 11}" width="22" height="22" clip-path="circle(11px at 11px 11px)" />` : `<circle cx="${x}" cy="${y}" r="10" fill="${color}" />`;
    return `
      <path d="${d}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.12" filter="url(#glow-${idx})" />
      <path d="${d}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.98" />
      ${end}
    `;
  }).join("");

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

  const hits = s.hits ?? s.hitCount ?? m.hits ?? m.hitCount ?? 0;
  const miss = s.miss ?? s.misses ?? m.miss ?? m.misses ?? 0;
  const simple = s.simple ?? s.singles ?? m.simple ?? m.singles ?? 0;
  const double_ = s.double ?? s.doubles ?? m.double ?? m.doubles ?? 0;
  const triple = s.triple ?? s.triples ?? m.triple ?? m.triples ?? 0;
  const bull = s.bull ?? s.bulls ?? m.bull ?? m.bulls ?? 0;
  const dbull = s.dbull ?? s.doubleBull ?? s.dbulls ?? m.dbull ?? m.doubleBull ?? m.dbulls ?? 0;
  const bust = s.bust ?? s.busts ?? m.bust ?? m.busts ?? 0;

  const avg3d = s.avg3d ?? s.avg3 ?? s.avg ?? m.avg3d ?? m.avg3 ?? m.avg ?? "—";
  const bestVisit = s.bestVisit ?? s.best ?? m.bestVisit ?? m.best ?? "—";

  const totalThrows =
    s.totalThrows ??
    s.throws ??
    s.attempts ??
    m.totalThrows ??
    m.throws ??
    m.attempts ??
    (num(hits, 0) + num(miss, 0));

  return {
    avg3d,
    bestVisit,
    hits: num(hits, 0),
    miss: num(miss, 0),
    simple: num(simple, 0),
    double_: num(double_, 0),
    triple: num(triple, 0),
    bull: num(bull, 0),
    dbull: num(dbull, 0),
    bust: num(bust, 0),
    totalThrows: num(totalThrows, 0),
  };
}

function renderSnapshot(payload) {
  lastPayload = payload || {};
  try { document.body.classList.remove("is-home"); } catch {}

  const players = Array.isArray(payload?.players) ? payload.players : [];
  rememberHistory(players);

  if (!players.length) {
    waitingScreen();
    return;
  }

  const active = players.find((p) => p?.active) || players.find((p) => String(p?.id || "") === String(payload?.currentPlayer || "")) || players[0];
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
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : (ps.hits + ps.miss);
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
                <div class="score-label" style="color:${activeColor};">${esc((payload?.game || "score").toUpperCase())}</div>
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
