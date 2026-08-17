import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { buildAwenaReply } from "./AwenaCore";
import { findAwenaMode } from "./AwenaKnowledge";
import { AWENA_CONTEXT_EVENT } from "./AwenaContextBridge";
import { awenaVoice } from "./AwenaVoice";
import { loadAwenaSettings, saveAwenaSettings } from "./AwenaSettings";
import { awenaLine } from "./AwenaVoiceCatalog";
import { buildAwenaRecordsReply } from "./AwenaRecords";
import type { AwenaMessage, AwenaRuntimeContext, AwenaSettings, AwenaSpeechCue, AwenaVoiceOption, AwenaVoiceStatus } from "./awena.types";

type AwenaContextValue = {
  settings: AwenaSettings;
  setSettings: (next: AwenaSettings | ((prev: AwenaSettings) => AwenaSettings)) => void;
  runtime: AwenaRuntimeContext;
  setRuntime: (next: Partial<AwenaRuntimeContext>) => void;
  messages: AwenaMessage[];
  ask: (question: string, options?: { speak?: boolean }) => Promise<string>;
  say: (text: string, messageId?: string) => Promise<void>;
  stop: () => Promise<void>;
  clearMessages: () => void;
  voiceStatus: AwenaVoiceStatus | null;
  voices: AwenaVoiceOption[];
  refreshVoices: () => Promise<void>;
  speechCue: AwenaSpeechCue | null;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
};

// Keep a single Awena context identity across Vite/React Fast Refresh reloads.
// Without this, a hot-reloaded consumer can temporarily read a different
// Context instance than the mounted provider and crash with
// "useAwena must be used inside AwenaProvider".
const AWENA_CONTEXT_GLOBAL_KEY = "__msc_awena_context_v1__";
const awenaGlobal = globalThis as typeof globalThis & {
  [AWENA_CONTEXT_GLOBAL_KEY]?: React.Context<AwenaContextValue | null>;
};
const AwenaContext =
  awenaGlobal[AWENA_CONTEXT_GLOBAL_KEY] || React.createContext<AwenaContextValue | null>(null);
awenaGlobal[AWENA_CONTEXT_GLOBAL_KEY] = AwenaContext;

function textForSpeech(text: string) {
  return String(text || "")
    .replace(/^##\s+/gm, "")
    .replace(/^[-•]\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[_`#]/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    message("awena", awenaLine("identity", "intro")),
  ]);
  const [voiceStatus, setVoiceStatus] = React.useState<AwenaVoiceStatus | null>(null);
  const [voices, setVoices] = React.useState<AwenaVoiceOption[]>([]);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [speechCue, setSpeechCue] = React.useState<AwenaSpeechCue | null>(null);

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

  React.useEffect(() => {
    return awenaVoice.onSpeechTiming((event) => {
      if (event.phase === "start") {
        setSpeechCue({
          messageId: event.utteranceId,
          phase: "speaking",
          startedAt: Date.now(),
          durationMs: Math.max(250, Number(event.durationMs || 0)),
        });
      } else {
        setSpeechCue((prev) => prev?.messageId === event.utteranceId
          ? { ...prev, phase: "done" }
          : prev);
      }
    });
  }, []);

  const say = React.useCallback(async (text: string, messageId?: string) => {
    if (muted) return;
    const utteranceId = messageId || `awena-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSpeechCue({ messageId: utteranceId, phase: "pending" });
    const ok = await awenaVoice.speak(textForSpeech(text), settingsState, String(lang || "fr"), utteranceId);
    if (!ok) setSpeechCue((prev) => prev?.messageId === utteranceId ? { ...prev, phase: "done" } : prev);
  }, [lang, muted, settingsState]);

  const ask = React.useCallback(async (question: string, options?: { speak?: boolean }) => {
    const clean = String(question || "").trim();
    if (!clean) return "";

    const explicitMode = findAwenaMode(clean, runtime.mode || runtime.route);
    const contextForReply = explicitMode ? { ...runtime, mode: explicitMode.id } : runtime;

    let recordsReply = null;
    try {
      recordsReply = await buildAwenaRecordsReply(clean, contextForReply);
    } catch (error) {
      console.warn("[AwenaRecords] réponse records interrompue, fallback conversationnel", error);
    }
    const reply = recordsReply ?? buildAwenaReply(clean, contextForReply);

    if (reply.modeId) {
      setRuntimeState((prev) => ({ ...prev, mode: reply.modeId || prev.mode }));
    }

    const userMessage = message("user", clean);
    const awenaMessage = message("awena", reply.text, reply.actions);
    const shouldSpeak = (options?.speak ?? settingsState.autoSpeak) && settingsState.voiceEnabled && !muted;

    if (shouldSpeak) {
      // Keep the answer hidden until the exact moment Android starts playback.
      setSpeechCue({ messageId: awenaMessage.id, phase: "pending" });
    }

    setMessages((prev) => [
      ...prev,
      userMessage,
      awenaMessage,
    ].slice(-40));

    if (shouldSpeak) {
      const ok = await awenaVoice.speak(
        textForSpeech(reply.text),
        settingsState,
        String(lang || "fr"),
        awenaMessage.id,
      );
      if (!ok) {
        setSpeechCue((prev) => prev?.messageId === awenaMessage.id ? { ...prev, phase: "done" } : prev);
      }
    }
    return reply.text;
  }, [lang, muted, runtime, settingsState]);

  const stop = React.useCallback(async () => {
    await awenaVoice.stop();
    setSpeechCue((prev) => prev ? { ...prev, phase: "done" } : prev);
  }, []);
  const clearMessages = React.useCallback(() => {
    setMessages([]);
    setSpeechCue(null);
  }, []);

  const refreshVoices = React.useCallback(async () => {
    const [status, availableVoices] = await Promise.all([
      awenaVoice.getStatus(String(lang || "fr")),
      awenaVoice.getVoices(String(lang || "fr")),
    ]);
    setVoiceStatus(status);
    setVoices(availableVoices);
  }, [lang]);

  React.useEffect(() => { void refreshVoices(); }, [refreshVoices]);

  const openPanel = React.useCallback(() => setPanelOpen(true), []);
  const closePanel = React.useCallback(() => setPanelOpen(false), []);
  const togglePanel = React.useCallback(() => setPanelOpen((value) => !value), []);

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
    speechCue,
    panelOpen,
    openPanel,
    closePanel,
    togglePanel,
  }), [settingsState, setSettings, runtime, setRuntime, messages, ask, say, stop, clearMessages, voiceStatus, voices, refreshVoices, speechCue, panelOpen, openPanel, closePanel, togglePanel]);

  return <AwenaContext.Provider value={value}>{children}</AwenaContext.Provider>;
}

export function useAwena(): AwenaContextValue {
  const ctx = React.useContext(AwenaContext);
  if (!ctx) throw new Error("useAwena must be used inside AwenaProvider");
  return ctx;
}

export function useAwenaOptional(): AwenaContextValue | null {
  return React.useContext(AwenaContext);
}
