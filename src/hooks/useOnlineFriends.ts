import * as React from "react";
import { listFriends, removeFriend, type OnlineFriendUser } from "../lib/friendsApi";

export function useOnlineFriends(pollMs = 25000) {
  const [friends, setFriends] = React.useState<OnlineFriendUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setFriends(await listFriends()); }
    catch (e: any) { setError(e?.message || "Erreur liste amis"); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await refresh(); };
    run();
    const id = window.setInterval(run, Math.max(12000, pollMs));
    return () => { alive = false; window.clearInterval(id); };
  }, [refresh, pollMs]);

  const deleteFriend = React.useCallback(async (userId: string) => {
    await removeFriend(userId);
    await refresh();
  }, [refresh]);

  return { friends, loading, error, refresh, removeFriend: deleteFriend };
}
