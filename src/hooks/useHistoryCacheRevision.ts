import * as React from "react";

/**
 * Small bridge for legacy/derived per-sport history views.
 * History V4 remains authoritative; these views re-read their derived cache
 * whenever canonical History or the sport-specific cache is rebuilt.
 */
export function useHistoryCacheRevision(eventName: string): number {
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("dc-history-updated", refresh);
    if (eventName) window.addEventListener(eventName, refresh);
    return () => {
      window.removeEventListener("dc-history-updated", refresh);
      if (eventName) window.removeEventListener(eventName, refresh);
    };
  }, [eventName]);

  return revision;
}
