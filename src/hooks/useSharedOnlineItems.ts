import * as React from "react";
import { listSharedItems, markSharedItemRead, shareWithFriend, type SharedOnlineItem } from "../lib/friendsApi";
export function useSharedOnlineItems(pollMs = 26000) {
  const [items, setItems] = React.useState<SharedOnlineItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const refresh = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listSharedItems()); }
    catch (e: any) { setError(e?.message || "Erreur partages"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await refresh(); };
    run();
    const id = window.setInterval(run, Math.max(12000, pollMs));
    return () => { alive = false; window.clearInterval(id); };
  }, [refresh, pollMs]);
  const markRead = React.useCallback(async (id: string) => { await markSharedItemRead(id); await refresh(); }, [refresh]);
  const share = React.useCallback(async (input: Parameters<typeof shareWithFriend>[0]) => { await shareWithFriend(input); await refresh(); }, [refresh]);
  return { items, loading, error, refresh, markRead, share };
}
