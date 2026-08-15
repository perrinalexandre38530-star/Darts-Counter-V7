import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { buildAwenaReply } from "./AwenaCore";
import { findAwenaMode } from "./AwenaKnowledge";
import { AWENA_CONTEXT_EVENT } from "./AwenaContextBridge";
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

function message(role: "awena" | "user", text: string, actions?: AwenaMessage["actions"]): AwenaMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: Date.now(),
    actions: actions?.length ? actions : undefined,
  };
}

export function AwenaProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang() as any;
  const { muted } = useAudio();
  const [settingsState, setSettingsState] = React.useState<AwenaSettings>(() => loadAwenaSettings());
  const [runtime, setRuntimeState] = React.useState<AwenaRuntimeContext>({});
  const [messages, setMessages] = React.useState<AwenaMessage[]>([
    message("awena", "Bonjour, moi c'est Awena. Je peux t'expliquer les modes de jeu, te guider dans l'application et t'aider pendant tes parties."),
  ]);
  const [voiceStatus, setVoiceStatus] = React.useState<AwenaVoiceStatus | null>(null);
  const [voices, setVoices] = React.useState<AwenaVoiceOption[]>([]);

  const setSettings = React.useCallback((next: AwenaSettings | ((prev: AwenaSettings) => AwenaSettings)) => {
    setSettingsState((prev) => saveAwenaSettings(typeof next === "function" ? next(prev) : next));
  }, []);

  const setRuntime = React.useCallback((next: Partial<AwenaRuntimeContext>) => {
    setRuntimeState((prev) => ({ ...prev, ...next }));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onContext = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AwenaRuntimeContext>>)?.detail;
      if (!detail || typeof detail !== "object") return;
      setRuntimeState((prev) => ({ ...prev, ...detail }));
    };
    window.addEventListener(AWENA_CONTEXT_EVENT, onContext as EventListener);
    return () => window.removeEventListener(AWENA_CONTEXT_EVENT, onContext as EventListener);
  }, []);

  const say = React.useCallback(async (text: string) => {
    if (muted) return;
    await awenaVoice.speak(text, settingsState, String(lang || "fr"));
  }, [lang, muted, settingsState]);

  const ask = React.useCallback(async (question: string, options?: { speak?: boolean }) => {
    const clean = String(question || "").trim();
    if (!clean) return "";

    const explicitMode = findAwenaMode(clean, runtime.mode || runtime.route);
    const contextForReply = explicitMode ? { ...runtime, mode: explicitMode.id } : runtime;
    const reply = buildAwenaReply(clean, contextForReply);

    if (reply.modeId) {
      setRuntimeState((prev) => ({ ...prev, mode: reply.modeId || prev.mode }));
    }

    setMessages((prev) => [
      ...prev,
      message("user", clean),
      message("awena", reply.text, reply.actions),
    ].slice(-40));

    if ((options?.speak ?? settingsState.autoSpeak) && settingsState.voiceEnabled && !muted) {
      await awenaVoice.speak(reply.text, settingsState, String(lang || "fr"));
    }
    return reply.text;
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
