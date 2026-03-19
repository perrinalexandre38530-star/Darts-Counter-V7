const BUILD = "CAF-VISUAL-X01-2026-03-19-2";
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

function avatarHtml(player, size = 116) {
  const src = player?.avatarDataUrl || player?.avatarUrl || "";
  if (src) {
    return `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        overflow:hidden;
        border:2px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.05);
        box-shadow:
          0 12px 28px rgba(0,0,0,.28),
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
      border:2px solid rgba(255,255,255,.12);
      background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.14), rgba(255,255,255,.03));
      box-shadow:
        0 12px 28px rgba(0,0,0,.28),
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
    const score = Number(p?.score ?? 0);
    const entry = historyMap.get(id) || {
      id,
      name: String(p?.name || "Joueur"),
      color: p?.active ? "#34d399" : "#fbbf24",
      points: [],
    };
    const last = entry.points[entry.points.length - 1];
    if (last !== score) entry.points.push(score);
    entry.name = String(p?.name || entry.name || "Joueur");
    entry.color = p?.active ? "#34d399" : entry.color;
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

  const series = players.map(
    (p) => historyMap.get(String(p?.id || p?.name)) || { points: [Number(p?.score ?? 0)] }
  );
  const all = series.flatMap((s) => s.points);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 501);
  const w = 520;
  const h = 180;
  const colors = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#c084fc", "#fb7185"];

  const defs = colors
    .map(
      (color, idx) => `
        <filter id="glow-${idx}" x="-40%" y="-40%" width="180%" height="180%">
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
        <path d="${d}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.18" filter="url(#glow-${idx % colors.length})" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.98" />
      `;
    })
    .join("");

  const legend = players
    .map((p, idx) => {
      const color = colors[idx % colors.length];
      return `
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="width:10px;height:10px;border-radius:999px;background:${color};box-shadow:0 0 10px ${color};display:inline-block;"></span>
          <span style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p?.name || "Joueur")}</span>
          <span style="opacity:.74;">${esc(p?.score ?? 0)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <section style="
      border:1px solid rgba(255,255,255,.08);
      border-radius:28px;
      padding:20px;
      background:linear-gradient(180deg, rgba(20,24,31,.94), rgba(10,12,17,.94));
      box-shadow:0 22px 52px rgba(0,0,0,.30);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px;">
        <div style="font-size:30px;font-weight:1000;">Évolution de la partie</div>
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

        <g opacity="0.15">
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
        <img
          src="/assets/LOGO.png"
          alt="Multisports Scoring"
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

function statCell(label, value) {
  return `
    <div style="
      border:1px solid rgba(255,255,255,.08);
      border-radius:22px;
      background:rgba(255,255,255,.04);
      padding:14px 16px;
      min-width:150px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
    ">
      <div style="opacity:.72;font-size:14px;margin-bottom:6px;">${esc(label)}</div>
      <div style="font-size:32px;font-weight:1000;line-height:1;">${esc(value)}</div>
    </div>
  `;
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
  const waiting = players.filter((p) => p !== active);
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};

  const avg = meta.avg3 || meta.avg || "—";
  const darts = meta.dartsThrown || meta.darts || historyMap.get(String(active?.id || active?.name))?.points?.length || "—";
  const best = meta.bestVisit || meta.best || "—";
  const leg = meta.leg || meta.legs || "—";

  statusEl.textContent = payload?.title || payload?.game || "Partie en cours";

  contentEl.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:minmax(0,1fr) 420px;
      gap:24px;
      align-items:start;
    ">
      <section style="
        border:1px solid rgba(255,255,255,.10);
        border-radius:32px;
        padding:28px;
        background:linear-gradient(180deg, rgba(20,24,31,.97), rgba(10,12,17,.97));
        box-shadow:0 24px 60px rgba(0,0,0,.32);
        min-height:340px;
      ">
        <div style="
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:22px;
          align-items:start;
        ">
          <div style="
            display:flex;
            gap:20px;
            align-items:center;
            min-width:0;
          ">
            <div style="
              position:relative;
              flex:0 0 auto;
            ">
              ${avatarHtml(active, 132)}
              <div style="
                position:absolute;
                top:-10px;
                right:-10px;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                width:92px;
                height:92px;
                border-radius:999px;
                background:linear-gradient(180deg, rgba(76,230,255,.92), rgba(37,164,191,.92));
                border:2px solid rgba(255,255,255,.28);
                color:#f4f7fb;
                font-weight:1000;
                font-size:16px;
                line-height:1.02;
                text-align:center;
                box-shadow:
                  0 10px 26px rgba(0,0,0,.30),
                  0 0 18px rgba(76,230,255,.24);
                padding:10px;
              ">
                Joueur<br>actif
              </div>
            </div>

            <div style="min-width:0;">
              <div style="
                font-size:clamp(42px, 4.4vw, 68px);
                font-weight:1000;
                line-height:1;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                text-shadow:0 8px 24px rgba(0,0,0,.28);
              ">
                ${esc(active?.name || "Joueur")}
              </div>

              <div style="
                margin-top:10px;
                font-size:22px;
                opacity:.82;
                font-weight:800;
              ">
                ${esc((payload?.game || "X01").toUpperCase())}
              </div>
            </div>
          </div>

          <div style="
            min-width:260px;
            text-align:right;
            border:1px solid rgba(255,255,255,.08);
            border-radius:30px;
            padding:18px 22px;
            background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.08), rgba(255,255,255,.02));
            box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
          ">
            <div style="
              opacity:.82;
              font-size:22px;
              font-weight:900;
              margin-bottom:8px;
            ">Score restant</div>

            <div style="
              font-size:clamp(110px, 12vw, 168px);
              font-weight:1000;
              line-height:.9;
              letter-spacing:-0.05em;
              text-shadow:0 10px 28px rgba(0,0,0,.30);
            ">
              ${esc(active?.score ?? 0)}
            </div>
          </div>
        </div>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:14px;
          margin-top:24px;
        ">
          ${statCell("Moyenne", avg)}
          ${statCell("Lancers", darts)}
          ${statCell("Meilleure volée", best)}
          ${statCell("Leg / Set", leg)}
        </div>
      </section>

      <section style="
        border:1px solid rgba(255,255,255,.08);
        border-radius:32px;
        padding:22px;
        background:linear-gradient(180deg, rgba(20,24,31,.94), rgba(10,12,17,.94));
        box-shadow:0 20px 50px rgba(0,0,0,.28);
      ">
        <div style="
          font-size:30px;
          font-weight:1000;
          margin-bottom:16px;
          text-shadow:0 8px 24px rgba(0,0,0,.24);
        ">
          Joueurs en attente
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${
            waiting
              .map(
                (p) => `
            <div style="
              display:grid;
              grid-template-columns:56px minmax(0,1fr) auto;
              gap:14px;
              align-items:center;
              border:1px solid rgba(255,255,255,.08);
              border-radius:24px;
              padding:14px 16px;
              background:rgba(255,255,255,.04);
              box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
            ">
              ${avatarHtml(p, 56)}
              <div style="min-width:0;">
                <div style="
                  font-size:28px;
                  font-weight:900;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                ">
                  ${esc(p?.name || "Joueur")}
                </div>
              </div>
              <div style="
                font-size:58px;
                font-weight:1000;
                line-height:1;
                letter-spacing:-0.04em;
              ">
                ${esc(p?.score ?? 0)}
              </div>
            </div>
          `
              )
              .join("") || `<div style="opacity:.7;">Aucun autre joueur.</div>`
          }
        </div>
      </section>
    </div>

    <div style="height:18px"></div>
    ${graphHtml(players)}
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