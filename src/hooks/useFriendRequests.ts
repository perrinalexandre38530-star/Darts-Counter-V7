import * as React from "react";
import { listFriendRequests, respondFriendRequest, sendFriendRequest, type FriendRequest } from "../lib/friendsApi";

export function useFriendRequests(pollMs = 22000) {
  const [requests, setRequests] = React.useState<FriendRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const refresh = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setRequests(await listFriendRequests()); }
    catch (e: any) { setError(e?.message || "Erreur demandes amis"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await refresh(); };
    run();
    const id = window.setInterval(run, Math.max(12000, pollMs));
    return () => { alive = false; window.clearInterval(id); };
  }, [refresh, pollMs]);
  const respond = React.useCallback(async (id: string, status: "accepted" | "rejected") => { await respondFriendRequest(id, status); await refresh(); }, [refresh]);
  const send = React.useCallback(async (toUserId: string, message?: string) => { await sendFriendRequest(toUserId, message); await refresh(); }, [refresh]);
  const incoming = requests.filter((r) => r.direction === "incoming" && r.status === "pending");
  const outgoing = requests.filter((r) => r.direction === "outgoing" && r.status === "pending");
  return { requests, incoming, outgoing, loading, error, refresh, respond, send };
}
