import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { buildAwenaReply } from "./AwenaCore";
import { findAwenaMode } from "./AwenaKnowledge";
import { AWENA_CONTEXT_EVENT } from "./AwenaContextBridge";
import { awenaVoice } from "./AwenaVoice";
import { loadAwenaSettings, saveAwenaSettings } from "./AwenaSettings";
import { awenaLine } from "./AwenaVoiceCatalog";
import { buildAwenaRecordsReply, warmAwenaRecordsCache } from "./AwenaRecords";
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

  // Pré-indexer l'historique quand le navigateur est au repos. Ainsi, la
  // première question Records ne paie généralement pas le coût de lecture et
  // de normalisation au moment où l'utilisateur attend sa réponse.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    let idleId: any = null;
    let timerId: number | null = null;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => warmAwenaRecordsCache(), { timeout: 1400 });
    } else {
      timerId = window.setTimeout(() => warmAwenaRecordsCache(), 700);
    }
    return () => {
      if (idleId != null && typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, []);

  React.useEffect(() => {
    if (panelOpen) warmAwenaRecordsCache();
  }, [panelOpen]);

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

    // Afficher la question immédiatement. Les requêtes Records peuvent devoir
    // parcourir l'historique ; l'interface ne doit pas donner l'impression
    // qu'Awena n'a pas reçu la demande pendant ce calcul.
    const userMessage = message("user", clean);
    setMessages((prev) => [...prev, userMessage].slice(-40));

    const explicitMode = findAwenaMode(clean, runtime.mode || runtime.route);
    const contextForReply = explicitMode ? { ...runtime, mode: explicitMode.id } : runtime;

    let recordsReply = null;
    try {
      recordsReply = await buildAwenaRecordsReply(clean, contextForReply);
    } catch (error) {
      console.warn("[AwenaRecords] réponse records interrompue, fallback conversationnel", error);
    }
    const reply = recordsReply ?? buildAwenaReply(clean, contextForReply);

    if (reply.modeId || reply.knowledgeTopic) {
      setRuntimeState((prev) => ({
        ...prev,
        // Le mode actif appartient à l'écran réel. Une simple conversation sur
        // Killer depuis l'Accueil ne doit pas faire croire qu'on est dans Killer.
        // Le sujet conversationnel est mémorisé séparément dans extra.
        extra: {
          ...(prev.extra || {}),
          ...(reply.modeId ? { awenaRememberedMode: reply.modeId } : {}),
          ...(reply.knowledgeTopic ? { awenaKnowledgeTopic: reply.knowledgeTopic } : {}),
        },
      }));
    }

    const awenaMessage = message("awena", reply.text, reply.actions);
    const shouldSpeak = (options?.speak ?? settingsState.autoSpeak) && settingsState.voiceEnabled && !muted;

    if (shouldSpeak) {
      setSpeechCue({ messageId: awenaMessage.id, phase: "pending" });
    }

    setMessages((prev) => [...prev, awenaMessage].slice(-40));

    if (shouldSpeak) {
      // La génération vocale neuronale ne doit pas bloquer la réponse ni le
      // champ de saisie. Le texte est déjà disponible ; la voix démarre en
      // parallèle et ses événements synchronisent ensuite l'affichage progressif.
      void awenaVoice.speak(
        textForSpeech(reply.text),
        settingsState,
        String(lang || "fr"),
        awenaMessage.id,
      ).then((ok) => {
        if (!ok) {
          setSpeechCue((prev) => prev?.messageId === awenaMessage.id ? { ...prev, phase: "done" } : prev);
        }
      }).catch((error) => {
        console.warn("[AwenaVoice] synthèse non bloquante interrompue", error);
        setSpeechCue((prev) => prev?.messageId === awenaMessage.id ? { ...prev, phase: "done" } : prev);
      });
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
