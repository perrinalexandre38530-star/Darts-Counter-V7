import { useEffect } from "react";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { trainingSyncQueueTry, trainingSyncQueueEnqueueSoon } from "./trainingSyncQueue";

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

    let alive = true;

    trainingSyncQueueEnqueueSoon();
    trainingSyncQueueTry(user.id);

    const onFocus = () => {
      if (!alive) return;
      trainingSyncQueueEnqueueSoon();
      trainingSyncQueueTry(user.id);
    };

    window.addEventListener("focus", onFocus);

    const t = window.setInterval(() => {
      if (!alive) return;
      trainingSyncQueueTry(user.id);
    }, 15000);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [user, online]);
}
