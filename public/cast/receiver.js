const BUILD = "CAF-VISUAL-X01-2026-03-19-1";
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
  const parts = String(name || "Joueur").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || "").join("").toUpperCase() || "?";
}

function avatarHtml(player, size = 116) {
  const src = player?.avatarDataUrl || player?.avatarUrl || "";
  if (src) {
    return `
      <div style="
        width:${size}px;height:${size}px;border-radius:999px;overflow:hidden;
        border:2px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);
        box-shadow:0 12px 28px rgba(0,0,0,.28), 0 0 0 6px rgba(255,255,255,.03);
      ">
        <img src="${esc(src)}" alt="${esc(player?.name || "avatar")}"
             style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>
    `;
  }
  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:999px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid rgba(255,255,255,.12);
      background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.14), rgba(255,255,255,.03));
      box-shadow:0 12px 28px rgba(0,0,0,.28), 0 0 0 6px rgba(255,255,255,.03);
      font-size:${Math.round(size * 0.32)}px;font-weight:1000;color:#fff;
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
  const series = players.map((p) => historyMap.get(String(p?.id || p?.name)) || { points: [Number(p?.score ?? 0)] });
  const all = series.flatMap((s) => s.points);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 501);
  const w = 520;
  const h = 180;
  const colors = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#c084fc", "#fb7185"];

  const lines = series
    .map((s, idx) => {
      const d = linePath(s.points, w, h, min, max);
      const color = colors[idx % colors.length];
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />`;
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
      border-radius:26px;
      padding:18px;
      background:linear-gradient(180deg, rgba(20,24,31,.92), rgba(10,12,17,.92));
      box-shadow:0 18px 44px rgba(0,0,0,.28);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:10px;">
        <div style="font-size:28px;font-weight:1000;">Évolution de la partie</div>
        <div style="opacity:.76;font-size:14px;">à partir de 3 joueurs</div>
      </div>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;border-radius:16px;background:radial-gradient(circle at top, rgba(255,255,255,.04), rgba(255,255,255,.01));">
        <g opacity="0.15">
          <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#fff"/>
          <line x1="0" y1="${h*0.66}" x2="${w}" y2="${h*0.66}" stroke="#fff"/>
          <line x1="0" y1="${h*0.33}" x2="${w}" y2="${h*0.33}" stroke="#fff"/>
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
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:58vh;text-align:center;padding:24px;
    ">
      <div style="
        font-size:clamp(58px, 9vw, 112px);
        font-weight:1000;line-height:.95;letter-spacing:-0.03em;
        text-shadow:0 10px 30px rgba(0,0,0,.35);
        margin-bottom:22px;
      ">Multisports<br/>Scoring</div>
      <div style="
        font-size:clamp(20px, 2.6vw, 34px);
        opacity:.92;max-width:980px;line-height:1.25;
      ">Sélectionne ton mode de jeu et lance ta partie !</div>
    </div>
  `;
}

function statCell(label, value) {
  return `
    <div style="
      border:1px solid rgba(255,255,255,.08);
      border-radius:20px;
      background:rgba(255,255,255,.04);
      padding:14px 16px;
      min-width:140px;
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
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:22px;align-items:stretch;">
      <section style="
        border:1px solid rgba(255,255,255,.10);
        border-radius:30px;
        padding:26px;
        background:linear-gradient(180deg, rgba(20,24,31,.96), rgba(10,12,17,.96));
        box-shadow:0 24px 60px rgba(0,0,0,.32);
      ">
        <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;">
          <div style="display:flex;gap:18px;align-items:center;min-width:0;">
            ${avatarHtml(active, 124)}
            <div style="min-width:0;">
              <div style="display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:10px 16px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.34);color:#a7f3d0;font-weight:900;margin-bottom:14px;">● Joueur actif</div>
              <div style="font-size:clamp(42px, 4.2vw, 68px);font-weight:1000;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(active?.name || "Joueur")}</div>
              <div style="margin-top:8px;font-size:22px;opacity:.76;">${esc((payload?.game || "X01").toUpperCase())}</div>
            </div>
          </div>
          <div style="
            min-width:220px;text-align:right;
            border:1px solid rgba(255,255,255,.08);
            border-radius:28px;padding:18px 20px;
            background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.08), rgba(255,255,255,.02));
          ">
            <div style="opacity:.76;font-size:18px;margin-bottom:8px;">Score restant</div>
            <div style="font-size:clamp(104px, 12vw, 168px);font-weight:1000;line-height:.9;letter-spacing:-0.04em;">${esc(active?.score ?? 0)}</div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:22px;">
          ${statCell("Moyenne", avg)}
          ${statCell("Lancers", darts)}
          ${statCell("Meilleure volée", best)}
          ${statCell("Leg / Set", leg)}
        </div>
      </section>

      <section style="
        border:1px solid rgba(255,255,255,.08);
        border-radius:30px;
        padding:22px;
        background:linear-gradient(180deg, rgba(20,24,31,.92), rgba(10,12,17,.92));
        box-shadow:0 20px 50px rgba(0,0,0,.28);
      ">
        <div style="font-size:28px;font-weight:1000;margin-bottom:16px;">Joueurs en attente</div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${waiting.map((p) => `
            <div style="
              display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;align-items:center;
              border:1px solid rgba(255,255,255,.08);
              border-radius:22px;padding:14px 16px;background:rgba(255,255,255,.04);
            ">
              ${avatarHtml(p, 56)}
              <div style="min-width:0;">
                <div style="font-size:28px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p?.name || "Joueur")}</div>
              </div>
              <div style="font-size:56px;font-weight:1000;line-height:1;">${esc(p?.score ?? 0)}</div>
            </div>
          `).join("") || `<div style="opacity:.7;">Aucun autre joueur.</div>`}
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
    pushDiag("custom_message_received", { senderId: event.senderId, dataType: typeof event.data });

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
