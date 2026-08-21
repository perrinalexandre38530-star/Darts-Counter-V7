// ============================================================
// src/contexts/AudioContext.tsx
// Audio global persistant, synchronisé avec Settings > Audio.
// ============================================================

import React from "react";
import {
  getAudioPreferences,
  subscribeAudioPreferences,
  updateAudioPreferences,
} from "../lib/audioPreferences";

type AudioContextValue = {
  muted: boolean;
  setMuted: (v: boolean) => void;
};

const AudioContext = React.createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMutedState] = React.useState(() => !getAudioPreferences().masterEnabled);

  React.useEffect(() => {
    return subscribeAudioPreferences((prefs) => setMutedState(!prefs.masterEnabled));
  }, []);

  React.useEffect(() => {
    if (!muted || typeof document === "undefined") return;
    const startupAudio = document.getElementById("dc-splash-audio") as HTMLAudioElement | null;
    if (!startupAudio) return;
    try { startupAudio.pause(); } catch {}
  }, [muted]);

  const setMuted = React.useCallback((nextMuted: boolean) => {
    setMutedState(!!nextMuted);
    updateAudioPreferences({ masterEnabled: !nextMuted });
  }, []);

  const value = React.useMemo(
    () => ({ muted, setMuted }),
    [muted, setMuted]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = React.useContext(AudioContext);
  if (!ctx) {
    const prefs = getAudioPreferences();
    return { muted: !prefs.masterEnabled, setMuted: () => {} };
  }
  return ctx;
}
