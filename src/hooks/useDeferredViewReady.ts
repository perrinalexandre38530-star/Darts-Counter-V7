import React from "react";

export function useDeferredViewReady(active: boolean, delayMs = 0) {
  const [ready, setReady] = React.useState(!active);

  React.useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (!cancelled) setReady(true);
      }, Math.max(0, delayMs));
    });

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [active, delayMs]);

  return ready;
}
