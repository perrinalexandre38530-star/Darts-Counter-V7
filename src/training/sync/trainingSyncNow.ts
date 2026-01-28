import { trainingSyncQueueEnqueueSoon, trainingSyncQueueTry } from "./trainingSyncQueue";

let lastKick = 0;

export async function trainingSyncNowBestEffort() {
  try {
    const now = Date.now();
    if (now - lastKick < 1500) return;
    lastKick = now;

    trainingSyncQueueEnqueueSoon();

    const userId = (typeof localStorage !== "undefined" && localStorage.getItem("dc_user_id")) || "";
    if (!userId) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    await trainingSyncQueueTry(userId);
  } catch {}
}
