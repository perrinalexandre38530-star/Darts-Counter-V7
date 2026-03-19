const context = cast.framework.CastReceiverContext.getInstance();

const statusEl = document.getElementById("status");

// LOG DEBUG TV
function log(msg) {
  console.log("[RECEIVER]", msg);
  statusEl.innerText = msg;
}

// 🔥 Namespace EXACT
const NAMESPACE = "urn:x-cast:com.multisports.scoreboard";

// Message bus
const channel = context.getCastMessageBus(
  NAMESPACE,
  cast.framework.messages.MessageType.JSON
);

// Quand message reçu
channel.onMessage = (event) => {
  log("Message reçu");

  try {
    const data = event.data;

    if (data.type === "SNAPSHOT") {
      log("Snapshot OK");

      document.body.innerHTML = `
        <div style="text-align:center">
          <h1>${data.payload?.mode || "Mode inconnu"}</h1>
          <pre>${JSON.stringify(data.payload, null, 2)}</pre>
        </div>
      `;
    }
  } catch (e) {
    log("Erreur receiver");
    console.error(e);
  }
};

// Start receiver
context.start();

log("Receiver prêt");