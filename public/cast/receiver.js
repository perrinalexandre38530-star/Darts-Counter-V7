const BUILD = "CAF-VISUAL-X01-2026-03-19-3";
const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");
const diagEl = document.getElementById("diag");
const buildEl = document.getElementById("build");

if (buildEl) buildEl.textContent = `Build: ${BUILD}`;

const logs = [];
const historyMap = new Map();
let lastPayload = null;

function pushDiag(entry, extra) {
  const row = { at: new Date().toISOString(), entry, extra: extra == null ? null : extra };
  logs.push(row);
  while (logs.length > 12) logs.shift();

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

function initials(name) {
  const parts = String(name || "Joueur")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0] || "").join("").toUpperCase() || "?";
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(part, total) {
  const p = num(part, 0);
  const t = num(total, 0);
  if (!t || t <= 0) return "0%";
  return `${Math.round((p / t) * 100)}%`;
}

function formatStatPair(value, total) {
  return `${num(value, 0)} - ${pct(value, total)}`;
}

function getAvatarSrc(player) {
  const candidates = [
    player?.avatarDataUrl,
    player?.avatarUrl,
    player?.avatar,
    player?.photo,
    player?.photoUrl,
    player?.image,
    player?.imageUrl,
    player?.picture,
    player?.profile?.avatarDataUrl,
    player?.profile?.avatarUrl,
    player?.profile?.avatar,
    player?.meta?.avatarDataUrl,
    player?.meta?.avatarUrl,
  ];

  for (const src of candidates) {
    if (typeof src === "string" && src.trim()) return src.trim();
  }
  return "";
}

function avatarHtml(player, size = 116) {
  const src = getAvatarSrc(player);

  if (src) {
    return `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        overflow:hidden;
        border:2px solid rgba(255,255,255,.16);
        background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.03));
        box-shadow:
          0 16px 34px rgba(0,0,0,.34),
          inset 0 1px 0 rgba(255,255,255,.06),
          0 0 0 6px rgba(255,255,255,.03);
        flex:0 0 auto;
      ">
        <img
          src="${esc(src)}"
          alt="${esc(player?.name || "avatar")}"
          style="width:100%;height:100%;object-fit:cover;display:block;"
        />
      </div>
    `;
  }

  return `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:2px solid rgba(255,255,255,.14);
      background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.16), rgba(255,255,255,.03));
      box-shadow:
        0 16px 34px rgba(0,0,0,.34),
        inset 0 1px 0 rgba(255,255,255,.06),
        0 0 0 6px rgba(255,255,255,.03);
      font-size:${Math.round(size * 0.32)}px;
      font-weight:1000;
      color:#fff;
      flex:0 0 auto;
    ">${esc(initials(player?.name))}</div>
  `;
}

function rememberHistory(players) {
  players.forEach((p) => {
    const id = String(p?.id || p?.name || Math.random());
    const score = num(p?.score, 0);
    const entry = historyMap.get(id) || {
      id,
      name: String(p?.name || "Joueur"),
      points: [],
    };
    const last = entry.points[entry.points.length - 1];
    if (last !== score) entry.points.push(score);
    entry.name = String(p?.name || entry.name || "Joueur");
    while (entry.points.length > 24) entry.points.shift();
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

function graphHtml(players) {
  if (players.length < 3) return "";

  const series = players.map((p) => {
    const key = String(p?.id || p?.name);
    return historyMap.get(key) || { points: [num(p?.score, 0)] };
  });

  const all = series.flatMap((s) => s.points);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 501);
  const w = 860;
  const h = 170;
  const colors = ["#45e3ff", "#ffd55b", "#7b8cff", "#ff66cb", "#6dff8a", "#ff7d5c"];

  const defs = colors
    .map(
      (color, idx) => `
      <filter id="glow-${idx}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `
    )
    .join("");

  const lines = series
    .map((s, idx) => {
      const d = linePath(s.points, w, h, min, max);
      const color = colors[idx % colors.length];
      return `
        <path d="${d}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".16" filter="url(#glow-${idx % colors.length})" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".98" />
      `;
    })
    .join("");

  const legend = players
    .map((p, idx) => {
      const color = colors[idx % colors.length];
      return `
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="width:10px;height:10px;border-radius:999px;background:${color};box-shadow:0 0 12px ${color};display:inline-block;"></span>
          <span style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p?.name || "Joueur")}</span>
          <span style="opacity:.78;">${esc(p?.score ?? 0)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <section style="
      margin-top:18px;
      border:1px solid rgba(255,255,255,.08);
      border-radius:28px;
      padding:18px;
      background:linear-gradient(180deg, rgba(20,24,31,.92), rgba(10,12,17,.92));
      box-shadow:0 22px 52px rgba(0,0,0,.28);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:10px;">
        <div style="font-size:28px;font-weight:1000;">Évolution de la partie</div>
        <div style="opacity:.76;font-size:14px;">à partir de 3 joueurs</div>
      </div>
      <svg viewBox="0 0 ${w} ${h}" style="
        width:100%;
        height:auto;
        display:block;
        border-radius:18px;
        background:radial-gradient(circle at top, rgba(255,255,255,.05), rgba(255,255,255,.01));
      ">
        <defs>${defs}</defs>
        <g opacity=".14">
          <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#fff"/>
          <line x1="0" y1="${h * 0.66}" x2="${w}" y2="${h * 0.66}" stroke="#fff"/>
          <line x1="0" y1="${h * 0.33}" x2="${w}" y2="${h * 0.33}" stroke="#fff"/>
          <line x1="0" y1="0" x2="${w}" y2="0" stroke="#fff"/>
        </g>
        ${lines}
      </svg>
      <div style="display:flex;flex-wrap:wrap;gap:14px 20px;margin-top:14px;">${legend}</div>
    </section>
  `;
}

function logoHtml() {
  return `
    <img
      src="/cast/logo.png"
      alt="Multisports Scoring"
      onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='/logo.png';}else{this.style.display='none';this.nextElementSibling.style.display='block';}"
      style="
        width:min(360px, 42vw);
        max-width:360px;
        height:auto;
        display:block;
        filter:
          drop-shadow(0 0 18px rgba(255, 214, 90, .10))
          drop-shadow(0 0 40px rgba(89, 218, 255, .08));
      "
    />
    <div style="
      display:none;
      font-size:clamp(56px, 7vw, 96px);
      font-weight:1000;
      line-height:.95;
      color:#f4e7b3;
      text-shadow:0 10px 30px rgba(0,0,0,.35);
    ">Multisports<br>Scoring</div>
  `;
}

function waitingScreen() {
  statusEl.textContent = "Sélectionne ton mode de jeu et lance ta partie !";

  contentEl.innerHTML = `
    <div style="
      min-height:58vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:32px;
    ">
      <div style="
        width:min(1100px, 100%);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
      ">
        ${logoHtml()}
        <div style="
          margin-top:24px;
          font-size:clamp(22px, 2.8vw, 38px);
          font-weight:900;
          line-height:1.18;
          max-width:980px;
          color:#f4e7b3;
          text-shadow:0 8px 24px rgba(0,0,0,.28);
        ">
          Sélectionne ton mode de jeu et lance ta partie !
        </div>
      </div>
    </div>
  `;
}

function miniPlayerCard(player, isActive) {
  return `
    <div style="
      display:grid;
      grid-template-columns:58px minmax(0,1fr) auto;
      gap:12px;
      align-items:center;
      border:1px solid ${isActive ? "rgba(69,227,255,.34)" : "rgba(255,255,255,.08)"};
      border-radius:22px;
      padding:12px 14px;
      background:${isActive ? "linear-gradient(180deg, rgba(69,227,255,.11), rgba(255,255,255,.04))" : "rgba(255,255,255,.04)"};
      box-shadow:${isActive ? "0 0 18px rgba(69,227,255,.12), inset 0 1px 0 rgba(255,255,255,.03)" : "inset 0 1px 0 rgba(255,255,255,.02)"};
    ">
      ${avatarHtml(player, 58)}
      <div style="min-width:0;">
        <div style="
          font-size:20px;
          font-weight:900;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          margin-bottom:4px;
        ">${esc(player?.name || "Joueur")}</div>
        <div style="font-size:13px;opacity:.72;">${isActive ? "À jouer" : "En attente"}</div>
      </div>
      <div style="
        font-size:42px;
        font-weight:1000;
        line-height:1;
        letter-spacing:-0.04em;
      ">${esc(player?.score ?? 0)}</div>
    </div>
  `;
}

function statCell(label, value) {
  return `
    <div style="
      border:1px solid rgba(255,255,255,.08);
      border-radius:18px;
      background:rgba(255,255,255,.04);
      padding:12px 14px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
      min-height:82px;
    ">
      <div style="
        opacity:.74;
        font-size:14px;
        margin-bottom:8px;
        font-weight:700;
      ">${esc(label)}</div>
      <div style="
        font-size:28px;
        font-weight:1000;
        line-height:1.05;
      ">${esc(value)}</div>
    </div>
  `;
}

function pickPlayerStats(active, payloadMeta) {
  const s = active?.stats && typeof active.stats === "object" ? active.stats : {};
  const m = payloadMeta && typeof payloadMeta === "object" ? payloadMeta : {};

  const hits =
    s.hits ?? s.hitCount ?? m.hits ?? m.hitCount ?? 0;
  const miss =
    s.miss ?? s.misses ?? m.miss ?? m.misses ?? 0;
  const simple =
    s.simple ?? s.singles ?? m.simple ?? m.singles ?? 0;
  const double_ =
    s.double ?? s.doubles ?? m.double ?? m.doubles ?? 0;
  const triple =
    s.triple ?? s.triples ?? m.triple ?? m.triples ?? 0;
  const bull =
    s.bull ?? s.bulls ?? m.bull ?? m.bulls ?? 0;
  const dbull =
    s.dbull ?? s.doubleBull ?? s.dbulls ?? m.dbull ?? m.doubleBull ?? m.dbulls ?? 0;
  const bust =
    s.bust ?? s.busts ?? m.bust ?? m.busts ?? 0;

  const avg3d =
    s.avg3d ?? s.avg3 ?? s.avg ?? m.avg3d ?? m.avg3 ?? m.avg ?? "—";
  const bestVisit =
    s.bestVisit ?? s.best ?? m.bestVisit ?? m.best ?? "—";

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

  const players = Array.isArray(payload?.players) ? payload.players : [];
  rememberHistory(players);

  if (!players.length) {
    waitingScreen();
    return;
  }

  const active = players.find((p) => p?.active) || players[0];
  const ordered = players.slice();
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const gameTitle = payload?.game || payload?.title || "X01";

  const ps = pickPlayerStats(active, meta);
  const totalRef = ps.totalThrows > 0 ? ps.totalThrows : (ps.hits + ps.miss);

  statusEl.textContent = payload?.title || payload?.game || "Partie en cours";

  contentEl.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:300px minmax(0,1fr);
      gap:22px;
      align-items:start;
    ">
      <aside style="
        border:1px solid rgba(255,255,255,.08);
        border-radius:30px;
        padding:18px;
        background:linear-gradient(180deg, rgba(20,24,31,.94), rgba(10,12,17,.94));
        box-shadow:0 20px 50px rgba(0,0,0,.28);
      ">
        <div style="
          font-size:24px;
          font-weight:1000;
          margin-bottom:14px;
        ">Ordre de passage</div>

        <div style="display:flex;flex-direction:column;gap:12px;">
          ${ordered.map((p) => miniPlayerCard(p, p === active)).join("")}
        </div>
      </aside>

      <main>
        <section style="
          border:1px solid rgba(255,255,255,.10);
          border-radius:32px;
          padding:28px;
          background:linear-gradient(180deg, rgba(20,24,31,.97), rgba(10,12,17,.97));
          box-shadow:0 24px 60px rgba(0,0,0,.32);
        ">
          <div style="
            display:grid;
            grid-template-columns:280px minmax(0,1fr);
            gap:24px;
            align-items:center;
          ">
            <div style="
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:center;
              text-align:center;
            ">
              <div style="position:relative;">
                ${avatarHtml(active, 170)}
                <div style="
                  position:absolute;
                  top:-8px;
                  right:-10px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  width:92px;
                  height:92px;
                  border-radius:999px;
                  background:linear-gradient(180deg, rgba(76,230,255,.94), rgba(37,164,191,.94));
                  border:2px solid rgba(255,255,255,.24);
                  color:#f5fbff;
                  font-size:16px;
                  font-weight:1000;
                  line-height:1.04;
                  text-align:center;
                  box-shadow:
                    0 10px 28px rgba(0,0,0,.30),
                    0 0 22px rgba(76,230,255,.22);
                  padding:10px;
                ">
                  Joueur<br>actif
                </div>
              </div>

              <div style="
                margin-top:16px;
                font-size:34px;
                font-weight:1000;
                line-height:1.05;
                max-width:100%;
                word-break:break-word;
                text-shadow:0 8px 24px rgba(0,0,0,.24);
              ">
                ${esc(active?.name || "Joueur")}
              </div>

              <div style="
                margin-top:8px;
                font-size:20px;
                font-weight:800;
                opacity:.78;
              ">${esc(String(gameTitle).toUpperCase())}</div>
            </div>

            <div style="
              border:1px solid rgba(255,255,255,.08);
              border-radius:30px;
              padding:22px 24px;
              background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.08), rgba(255,255,255,.02));
              box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
              min-height:210px;
              display:flex;
              flex-direction:column;
              justify-content:center;
            ">
              <div style="
                opacity:.82;
                font-size:22px;
                font-weight:900;
                margin-bottom:10px;
              ">Score</div>

              <div style="
                font-size:clamp(138px, 16vw, 230px);
                font-weight:1000;
                line-height:.88;
                letter-spacing:-0.06em;
                text-shadow:0 10px 28px rgba(0,0,0,.30);
              ">
                ${esc(active?.score ?? 0)}
              </div>
            </div>
          </div>

          <div style="
            margin-top:24px;
            display:grid;
            grid-template-columns:repeat(5, minmax(0,1fr));
            gap:14px;
          ">
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
        </section>

        ${graphHtml(players)}
      </main>
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

    if (!lastPayload) {
      statusEl.textContent = "Sender connecté. En attente d'un PING ou d'un snapshot…";
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
      const data = event.data || null;

      if (data?.type === "PING") {
        statusEl.textContent = "PING reçu depuis le téléphone.";
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
  statusEl.textContent = "Receiver CAF en erreur au démarrage.";
  pushDiag("receiver_start_failed", String(err));
}