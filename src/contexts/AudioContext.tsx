// ============================================================
// src/contexts/AudioContext.tsx
// Audio global (V7 STABLE)
// - Export nommé: AudioProvider (obligatoire car App.tsx l'importe)
// - Hook optionnel: useAudio()
// ============================================================

import React from "react";

type AudioContextValue = {
  muted: boolean;
  setMuted: (v: boolean) => void;
};

const AudioContext = React.createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = React.useState(false);

  const value = React.useMemo(
    () => ({
      muted,
      setMuted,
    }),
    [muted]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = React.useContext(AudioContext);
  if (!ctx) {
    // fallback SAFE si jamais un composant est monté hors provider
    return { muted: false, setMuted: () => {} };
  }
  return ctx;
}
