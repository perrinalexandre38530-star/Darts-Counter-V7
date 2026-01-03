// ============================================
// src/contexts/StoreContext.tsx
// Bridge Context (V7) — évite crash d'import + expose store/update
// BUT : ton App.tsx garde sa state interne.
// Ce contexte sert de "pont" pour les composants qui veulent accéder au store.
// ============================================

import React from "react";

type AnyStore = any;

type StoreContextValue = {
  store: AnyStore | null;
  tab?: any;
  go?: (t: any, p?: any) => void;
  update?: (mut: (s: AnyStore) => AnyStore) => void;
  // Helpers safe (optionnels)
  getStore: () => AnyStore | null;
};

const StoreContext = React.createContext<StoreContextValue>({
  store: null,
  tab: null,
  go: undefined,
  update: undefined,
  getStore: () => {
    try {
      return (window as any)?.__appStore?.store ?? null;
    } catch {
      return null;
    }
  },
});

/**
 * On lit le store depuis window.__appStore (que ton App.tsx remplit déjà).
 * On se rafraîchit sur l'event "dc-store-updated" si tu l’émets (voir patch optionnel plus bas).
 * Sans event, ça marche quand même : ça évite juste le crash et donne accès au store "best effort".
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const onUpdate = () => setTick((x) => x + 1);
    window.addEventListener("dc-store-updated", onUpdate as any);
    return () => window.removeEventListener("dc-store-updated", onUpdate as any);
  }, []);

  const value = React.useMemo<StoreContextValue>(() => {
    const app = (window as any)?.__appStore || {};
    return {
      store: app.store ?? null,
      tab: app.tab ?? null,
      go: typeof app.go === "function" ? app.go : undefined,
      update: typeof app.update === "function" ? app.update : undefined,
      getStore: () => {
        try {
          return (window as any)?.__appStore?.store ?? null;
        } catch {
          return null;
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return React.useContext(StoreContext);
}
