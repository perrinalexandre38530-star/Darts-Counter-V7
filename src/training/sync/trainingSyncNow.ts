import { requestGlobalSync } from "../../lib/sync/syncOrchestrator";
import { trainingSyncQueueEnqueueSoon } from "./trainingSyncQueue";

let lastKick = 0;

export async function trainingSyncNowBestEffort() {
  try {
    const now = Date.now();
    if (now - lastKick < 700) return;
    lastKick = now;

    // LOCAL-FIRST : rendre la queue immédiatement éligible, puis rendre la main.
    // Aucun await réseau ne doit se glisser dans l'enregistrement Training.
    trainingSyncQueueEnqueueSoon();
    requestGlobalSync("training-event", { delayMs: 650 });
  } catch {}
}
