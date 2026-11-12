import React from "react";
import { awenaVoice } from "../../awena/AwenaVoice";
import { loadAwenaSettings } from "../../awena/AwenaSettings";
import { useAudio } from "../../contexts/AudioContext";

const STORAGE_KEY = "mss_training_voice_coach_auto_v1";

function loadAutoMode(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
}

/** Voice is opt-in and never blocks exercise recording. Uses the existing MSS Awena voice engine. */
export function useTrainingVoiceCoach() {
  const { muted } = useAudio();
  const [automatic, setAutomatic] = React.useState(loadAutoMode);
  const [notice, setNotice] = React.useState("");
  const spokenKeys = React.useRef(new Set<string>());
  const ownSpeech = React.useRef(false);
  const ownUtteranceId = React.useRef("");
  const active = React.useRef(true);

  React.useEffect(() => {
    active.current = true;
    const unsubscribe = awenaVoice.onSpeechTiming((event) => {
      if (event.utteranceId === ownUtteranceId.current && event.phase === "end") ownSpeech.current = false;
    });
    return () => {
      active.current = false;
      unsubscribe();
      if (ownSpeech.current) void awenaVoice.stop().catch(() => undefined);
    };
  }, []);

  React.useEffect(() => {
    if (muted && ownSpeech.current) {
      ownSpeech.current = false;
      void awenaVoice.stop().catch(() => undefined);
    }
  }, [muted]);

  const setAuto = React.useCallback((enabled: boolean) => {
    setAutomatic(enabled);
    try { window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false"); } catch {}
    if (!enabled && ownSpeech.current) {
      ownSpeech.current = false;
      void awenaVoice.stop().catch(() => undefined);
    }
  }, []);

  const say = React.useCallback((text: string): void => {
    const settings = loadAwenaSettings();
    if (muted || !settings.enabled || !settings.voiceEnabled || settings.volume <= 0) {
      setNotice("Active le son global et la voix d'Awena dans les réglages MSS pour écouter les conseils.");
      return;
    }
    if (!text.trim()) return;
    setNotice("");
    ownSpeech.current = true;
    const utteranceId = `mss-training-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    ownUtteranceId.current = utteranceId;
    void awenaVoice.speak(text, settings, "fr", utteranceId).then((ok) => {
      if (!ok) {
        ownSpeech.current = false;
        if (active.current) setNotice("Voix indisponible sur cet appareil. Le conseil reste écrit.");
      }
    }).catch(() => {
      ownSpeech.current = false;
      if (active.current) setNotice("Voix indisponible. La saisie reste utilisable.");
    });
  }, [muted]);

  const announce = React.useCallback((key: string, text: string): void => {
    if (!automatic || !text || spokenKeys.current.has(key)) return;
    // Missing or disabled voice should not consume the announcement: after activation
    // it can still be read manually by using the speaker button.
    const settings = loadAwenaSettings();
    if (muted || !settings.enabled || !settings.voiceEnabled || settings.volume <= 0) return;
    spokenKeys.current.add(key);
    say(text);
  }, [automatic, muted, say]);

  return { automatic, setAuto, notice, say, announce };
}
