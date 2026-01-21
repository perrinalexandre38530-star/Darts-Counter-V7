import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type DevModeState = {
  enabled: boolean; // true => unlock des features disabled
};

type DevModeContextValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;

  // Helper principal
  shouldUnlockDisabledFeatures: boolean;
};

const LS_KEY = "dc:devmode:v1";

const DevModeContext = createContext<DevModeContextValue | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved === "1";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const value = useMemo<DevModeContextValue>(() => {
    return {
      enabled,
      setEnabled,
      shouldUnlockDisabledFeatures: enabled,
    };
  }, [enabled]);

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

export function useDevMode() {
  const ctx = useContext(DevModeContext);
  if (!ctx) throw new Error("useDevMode must be used within DevModeProvider");
  return ctx;
}
