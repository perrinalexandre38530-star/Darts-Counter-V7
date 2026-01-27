import { useEffect } from "react";
import { syncTrainingEvents } from "./trainingSyncEngine";
import { useAuthOnline } from "../../hooks/useAuthOnline";

export function useTrainingAutoSync() {
  const { user, online } = useAuthOnline();

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem("dc_user_id", user.id);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user || !online) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      try {
        await syncTrainingEvents(user.id);
      } catch {
        // ignore
      }
    };

    run();

    const onFocus = () => run();
    window.addEventListener("focus", onFocus);

    const t = window.setInterval(run, 30000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [user, online]);
}
