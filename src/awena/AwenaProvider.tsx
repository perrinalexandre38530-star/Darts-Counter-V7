import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { buildAwenaAnswer } from "./AwenaCore";
import { awenaVoice } from "./AwenaVoice";
import { loadAwenaSettings, saveAwenaSettings } from "./AwenaSettings";
import type { AwenaMessage, AwenaRuntimeContext, AwenaSettings, AwenaVoiceOption, AwenaVoiceStatus } from "./awena.types";

type AwenaContextValue = {
  settings: AwenaSettings;
  setSettings: (next: AwenaSettings | ((prev: AwenaSettings) => AwenaSettings)) => void;
  runtime: AwenaRuntimeContext;
  setRuntime: (next: Partial<AwenaRuntimeContext>) => void;
  messages: AwenaMessage[];
  ask: (question: string, options?: { speak?: boolean }) => Promise<string>;
  say: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  clearMessages: () => void;
  voiceStatus: AwenaVoiceStatus | null;
  voices: AwenaVoiceOption[];
  refreshVoices: () => Promise<void>;
};

const AwenaContext = React.createContext<AwenaContextValue | null>(null);

function message(role: "awena" | "user", text: string): AwenaMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text, createdAt: Date.now() };
}

export function AwenaProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang() as any;
  const { muted } = useAudio();
  const [settingsState, setSettingsState] = React.useState<AwenaSettings>(() => loadAwenaSettings());
  const [runtime, setRuntimeState] = React.useState<AwenaRuntimeContext>({});
  const [messages, setMessages] = React.useState<AwenaMessage[]>([
    message("awena", "Bonjour, moi c'est Awena. Je peux t'expliquer les modes de jeu et t'aider pendant tes parties."),
  ]);
  const [voiceStatus, setVoiceStatus] = React.useState<AwenaVoiceStatus | null>(null);
  const [voices, setVoices] = React.useState<AwenaVoiceOption[]>([]);

  const setSettings = React.useCallback((next: AwenaSettings | ((prev: AwenaSettings) => AwenaSettings)) => {
    setSettingsState((prev) => saveAwenaSettings(typeof next === "function" ? next(prev) : next));
  }, []);

  const setRuntime = React.useCallback((next: Partial<AwenaRuntimeContext>) => {
    setRuntimeState((prev) => ({ ...prev, ...next }));
  }, []);

  const say = React.useCallback(async (text: string) => {
    if (muted) return;
    await awenaVoice.speak(text, settingsState, String(lang || "fr"));
  }, [lang, muted, settingsState]);

  const ask = React.useCallback(async (question: string, options?: { speak?: boolean }) => {
    const clean = String(question || "").trim();
    if (!clean) return "";
    const answer = buildAwenaAnswer(clean, runtime);
    setMessages((prev) => [...prev, message("user", clean), message("awena", answer)].slice(-30));
    if ((options?.speak ?? settingsState.autoSpeak) && settingsState.voiceEnabled && !muted) {
      await awenaVoice.speak(answer, settingsState, String(lang || "fr"));
    }
    return answer;
  }, [lang, muted, runtime, settingsState]);

  const stop = React.useCallback(async () => awenaVoice.stop(), []);
  const clearMessages = React.useCallback(() => setMessages([]), []);

  const refreshVoices = React.useCallback(async () => {
    const [status, availableVoices] = await Promise.all([
      awenaVoice.getStatus(String(lang || "fr")),
      awenaVoice.getVoices(String(lang || "fr")),
    ]);
    setVoiceStatus(status);
    setVoices(availableVoices);
  }, [lang]);

  React.useEffect(() => { void refreshVoices(); }, [refreshVoices]);

  const value = React.useMemo<AwenaContextValue>(() => ({
    settings: settingsState,
    setSettings,
    runtime,
    setRuntime,
    messages,
    ask,
    say,
    stop,
    clearMessages,
    voiceStatus,
    voices,
    refreshVoices,
  }), [settingsState, setSettings, runtime, setRuntime, messages, ask, say, stop, clearMessages, voiceStatus, voices, refreshVoices]);

  return <AwenaContext.Provider value={value}>{children}</AwenaContext.Provider>;
}

export function useAwena(): AwenaContextValue {
  const ctx = React.useContext(AwenaContext);
  if (!ctx) throw new Error("useAwena must be used inside AwenaProvider");
  return ctx;
}
