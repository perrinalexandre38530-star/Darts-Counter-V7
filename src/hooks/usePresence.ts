import * as React from "react";
import { updatePresence } from "../lib/friendsApi";
export type OnlinePresenceStatus = "online" | "away" | "offline";
export function usePresence(pollMs = 30000) {
  const [status, setStatus] = React.useState<OnlinePresenceStatus>("online");
  const [error, setError] = React.useState<string | null>(null);
  const publish = React.useCallback(async (next: OnlinePresenceStatus = status) => {
    setError(null);
    try { await updatePresence(next); setStatus(next); }
    catch (e: any) { setError(e?.message || "Erreur présence"); }
  }, [status]);
  React.useEffect(() => {
    publish("online");
    const id = window.setInterval(() => publish(status), Math.max(15000, pollMs));
    const onHide = () => publish(document.visibilityState === "hidden" ? "away" : "online");
    document.addEventListener("visibilitychange", onHide);
    const onUnload = () => { updatePresence("offline").catch(() => {}); };
    window.addEventListener("beforeunload", onUnload);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onUnload); updatePresence("offline").catch(() => {}); };
  }, []);
  return { status, error, setPresence: publish };
}
