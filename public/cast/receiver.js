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
let lastPayload = null;
let lastPlayersKey = "";
let lastActiveId = "";
let turnsSinceRoundCommit = 0;

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

function rememberHistory(players, activeId) {
  const ids = players.map((p, idx) => String(p?.id || p?.name || idx));
  const playersKey = ids.join("|");
  if (playersKey !== lastPlayersKey) {
    historyMap.clear();
    lastPlayersKey = playersKey;
    lastActiveId = String(activeId || ids[0] || "");
    turnsSinceRoundCommit = 0;
    players.forEach((p, idx) => {
      const id = ids[idx];
      historyMap.set(id, { id, name: String(p?.name || "Joueur"), points: [] });
    });
    return;
  }

  players.forEach((p, idx) => {
    const id = ids[idx];
    const entry = historyMap.get(id) || { id, name: String(p?.name || "Joueur"), points: [] };
    entry.name = String(p?.name || entry.name || "Joueur");
    historyMap.set(id, entry);
  });

  const currentActiveId = String(activeId || ids[0] || "");
  if (!currentActiveId) return;
  if (!lastActiveId) {
    lastActiveId = currentActiveId;
    return;
  }
  if (currentActiveId === lastActiveId) return;

  turnsSinceRoundCommit += 1;
  lastActiveId = currentActiveId;

  if (turnsSinceRoundCommit < players.length) return;
  turnsSinceRoundCommit = 0;

  const ranked = players
    .slice()
    .sort((a, b) => num(a?.score, 0) - num(b?.score, 0));
  const rankById = new Map();
  ranked.forEach((p, idx) => rankById.set(String(p?.id || p?.name || idx), idx + 1));
  const maxRank = Math.max(1, players.length);

  players.forEach((p, idx) => {
    const id = ids[idx];
    const rank = rankById.get(id) || idx + 1;
    const visual = (maxRank - rank) * 100;
    const entry = historyMap.get(id) || { id, name: String(p?.name || "Joueur"), points: [] };
    const last = entry.points[entry.points.length - 1];
    if (last !== visual) entry.points.push(visual);
    while (entry.points.length > 18) entry.points.shift();
    historyMap.set(id, entry);
  });
}

function linePath(values, w, h, min, max) {
  if (!values.length) return "";
  const span = Math.max(1, max - min);
  return values
    .map((v, i) => {
      const x = values.length === 1 ? 0 : (i * w) / (values.length - 1);
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function graphHtml(players, colorById) {
  if (players.length < 3) return "";

  const series = players.map((p) => historyMap.get(String(p?.id || p?.name)) || { points: [0] });
  const all = series.flatMap((s) => s.points);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 100);
  const w = 960;
  const h = 150;

  const defs = players.map((p, idx) => {
    const color = colorById[String(p?.id || p?.name || idx)] || "#53e7ff";
    return `
      <filter id="glow-${idx}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `;
  }).join("");

  const lines = series.map((s, idx) => {
    const d = linePath(s.points, w, h, min, max);
    const p = players[idx];
    const color = colorById[String(p?.id || p?.name || idx)] || "#53e7ff";
    return `
      <path d="${d}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.14" filter="url(#glow-${idx})" />
      <path d="${d}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.98" />
    `;
  }).join("");

  return `
    <section class="panel graph-panel">
      <div class="panel-title-row">
        <div class="panel-title" style="margin-bottom:0;">Évolution</div>
        <div class="panel-subtitle">3 joueurs et +</div>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="graph-svg" preserveAspectRatio="none">
        <defs>${defs}</defs>
        <g opacity="0.12">
          <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#fff"/>
          <line x1="0" y1="${h*0.66}" x2="${w}" y2="${h*0.66}" stroke="#fff"/>
          <line x1="0" y1="${h*0.33}" x2="${w}" y2="${h*0.33}" stroke="#fff"/>
          <line x1="0" y1="0" x2="${w}" y2="0" stroke="#fff"/>
        </g>
        ${lines}
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

function statCell(label, value) {
  return `
    <div class="stat-cell">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${esc(value)}</div>
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
    hits: Math.max(num(totalThrows, 0), num(hits, 0)),
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
  const activeIdRaw = String(payload?.currentPlayer || "");
  rememberHistory(players, activeIdRaw);

  if (!players.length) {
    waitingScreen();
    return;
  }

  const active = players.find((p) => String(p?.id || "") === activeIdRaw) || players.find((p) => p?.active) || players[0];
  const ordered = (() => {
    const idx = players.findIndex((p) => p === active || String(p?.id || "") === String(active?.id || ""));
    if (idx <= 0) return players.slice();
    return players.slice(idx).concat(players.slice(0, idx));
  })();
  const colors = ["#53e7ff", "#ffd55b", "#ffffff", "#ff66d1", "#63ff97", "#ff8f5b", "#8aa2ff", "#ff4d6d", "#7cf3ff", "#c6ff5b", "#ffb4ff", "#ffddb0"];
  const colorById = Object.fromEntries(players.map((p, idx) => [String(p?.id || p?.name || idx), colors[idx % colors.length]]));
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const gameTitle = payload?.title || payload?.game || "Multisports";

  const ps = pickPlayerStats(active, meta);
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : (ps.hits + ps.miss);

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
                  ${avatarHtml(active, 92)}
                </div>

                <div class="active-name" style="color:${colorById[String(active?.id || active?.name || "")] || '#f4d26c'};">${esc(active?.name || "Joueur")}</div>
              </div>

              <div class="score-card">
                <div class="score-label">${esc((payload?.game || "score").toUpperCase())}</div>
                <div class="score-value">${esc(active?.score ?? 0)}</div>
              </div>
            </div>

            <div class="active-bottom">
              ${graphHtml(players, colorById)}
              <div class="stats-grid">
                ${statCell("Avg 3D", ps.avg3d)}
                ${statCell("Best volée", ps.bestVisit)}
                ${statCell("Hits", ps.hits)}
                ${statCell("Miss", `${ps.miss} - ${pct(ps.miss, totalRef)}`)}
                ${statCell("Simple", formatStatPair(ps.simple, totalRef))}
                ${statCell("Double", formatStatPair(ps.double_, totalRef))}
                ${statCell("Triple", formatStatPair(ps.triple, totalRef))}
                ${statCell("Bull", formatStatPair(ps.bull, totalRef))}
                ${statCell("DBull", formatStatPair(ps.dbull, totalRef))}
                ${statCell("Bust", formatStatPair(ps.bust, totalRef))}
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
