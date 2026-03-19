const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";
const context = cast.framework.CastReceiverContext.getInstance();
const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");
const diagEl = document.getElementById("diag");

const logs = [];

function pushDiag(entry, extra) {
  const row = {
    at: new Date().toISOString(),
    entry,
    extra: extra == null ? null : extra,
  };
  logs.push(row);
  while (logs.length > 18) logs.shift();
  diagEl.textContent = logs
    .slice()
    .reverse()
    .map((r) => `${r.at}  ${r.entry}${r.extra == null ? "" : "\n" + JSON.stringify(r.extra, null, 2)}`)
    .join("\n\n");
}

function renderWaiting(msg = "Choisis ton mode de jeu puis lance une partie sur le téléphone.") {
  statusEl.textContent = msg;
  contentEl.innerHTML = "";
}

function renderSnapshot(payload) {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  statusEl.textContent = payload?.title || payload?.game || "Snapshot reçu";

  if (!players.length) {
    contentEl.innerHTML = `<div class="meta">Snapshot reçu, mais aucun joueur n'est présent dans le payload.</div>
<pre>${JSON.stringify(payload, null, 2)}</pre>`;
    return;
  }

  contentEl.innerHTML = `
    <div class="board">
      ${players
        .map(
          (p) => `
        <section class="player ${p?.active ? "active" : ""}">
          <div class="name">${String(p?.name || "Joueur")}</div>
          <div class="score">${String(p?.score ?? 0)}</div>
        </section>
      `
        )
        .join("")}
    </div>
    <div class="meta">${Object.entries(meta)
      .map(([k, v]) => `${String(k)} : ${String(v)}`)
      .join(" · ")}</div>
    <pre>${JSON.stringify(payload, null, 2)}</pre>
  `;
}

try {
  context.addCustomMessageListener(NAMESPACE, (event) => {
    pushDiag("custom_message_received", { senderId: event.senderId, dataType: typeof event.data });

    try {
      const data = event.data || null;

      if (data?.type === "PING") {
        renderWaiting("PING reçu depuis le téléphone.");
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

      renderWaiting("Message reçu, format inconnu.");
      pushDiag("unknown_message", data);
    } catch (err) {
      renderWaiting("Erreur pendant le parsing du message Cast.");
      pushDiag("message_parse_failed", String(err));
    }
  });

  const opts = new cast.framework.CastReceiverOptions();
  opts.disableIdleTimeout = true;
  context.start(opts);
  renderWaiting("Receiver CAF prêt. En attente d'une connexion Cast…");
  pushDiag("receiver_started", { namespace: NAMESPACE });
} catch (err) {
  renderWaiting("Receiver CAF en erreur au démarrage.");
  pushDiag("receiver_start_failed", String(err));
}
