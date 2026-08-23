import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { buildAwenaReply } from "./AwenaCore";
import { awenaTranslation } from "./AwenaTranslation";
import { captureAwenaScreenSnapshot } from "./AwenaLiveScreen";
import { findAwenaMode } from "./AwenaKnowledge";
import { AWENA_CONTEXT_EVENT } from "./AwenaContextBridge";
import { awenaVoice } from "./AwenaVoice";
import { loadAwenaSettings, saveAwenaSettings } from "./AwenaSettings";
import { awenaLine } from "./AwenaVoiceCatalog";
import { awenaUi } from "./AwenaLocale";
import { buildAwenaRecordsReply, warmAwenaRecordsCache } from "./AwenaRecords";
import type { AwenaMessage, AwenaRuntimeContext, AwenaSettings, AwenaSpeechCue, AwenaVoiceOption, AwenaVoiceStatus } from "./awena.types";

type AwenaContextValue = {
  settings: AwenaSettings;
  setSettings: (next: AwenaSettings | ((prev: AwenaSettings) => AwenaSettings)) => void;
  runtime: AwenaRuntimeContext;
  setRuntime: (next: Partial<AwenaRuntimeContext>) => void;
  messages: AwenaMessage[];
  ask: (question: string, options?: { speak?: boolean; modeTopic?: "rules" | "config" | "records"; canonicalFrench?: boolean }) => Promise<string>;
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
  const canonicalAwenaMessagesRef = React.useRef(new Map<string, { text: string; actions?: AwenaMessage["actions"] }>());
  const messagesRef = React.useRef<AwenaMessage[]>([]);
  const localizationSeqRef = React.useRef(0);
  const previousLangRef = React.useRef(String(lang || "fr"));
  const [messages, setMessages] = React.useState<AwenaMessage[]>(() => {
    const introFr = awenaLine("identity", "intro");
    const first = message("awena", introFr);
    canonicalAwenaMessagesRef.current.set(first.id, { text: introFr });
    messagesRef.current = [first];
    return [first];
  });
  const [voiceStatus, setVoiceStatus] = React.useState<AwenaVoiceStatus | null>(null);
  const [voices, setVoices] = React.useState<AwenaVoiceOption[]>([]);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [speechCue, setSpeechCue] = React.useState<AwenaSpeechCue | null>(null);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Awena follows the exact same language as the application. We prepare both
  // translation directions (user -> French knowledge base and French -> user),
  // stop any sentence still speaking in the previous language, then relocalize
  // every Awena message whose canonical French source is known. User messages
  // remain untouched because they are user-authored content.
  React.useEffect(() => {
    const target = String(lang || "fr").toLowerCase().split("-")[0];
    const previous = String(previousLangRef.current || "fr").toLowerCase().split("-")[0];
    previousLangRef.current = target;
    const seq = ++localizationSeqRef.current;

    void awenaVoice.stop().catch(() => undefined);
    setSpeechCue((prev) => prev ? { ...prev, phase: "done" } : prev);

    const run = async () => {
      if (target !== "fr") await awenaTranslation.prepare(target).catch(() => false);

      const snapshot = messagesRef.current.slice();
      const localized = await Promise.all(snapshot.map(async (item) => {
        if (item.role !== "awena") return item;

        const canonical = canonicalAwenaMessagesRef.current.get(item.id);
        if (canonical) {
          // The greeting is authored for every selectable language so it changes
          // immediately even before an ML Kit model has finished downloading.
          if (canonical.text === awenaLine("identity", "intro")) {
            return { ...item, text: awenaUi(target).intro };
          }
          const reply = await awenaTranslation.replyFromFrench(
            { text: canonical.text, actions: canonical.actions },
            target,
          );
          return { ...item, text: reply.text, actions: reply.actions };
        }

        // Defensive path for a message created by an older hot-reloaded provider:
        // translate from the previously selected language instead of leaving stale text.
        if (previous !== target) {
          const translated = await awenaTranslation.textBetween(item.text, previous, target);
          return { ...item, text: translated };
        }
        return item;
      }));

      if (seq !== localizationSeqRef.current) return;
      const byId = new Map(localized.map((item) => [item.id, item] as const));
      setMessages((current) => current.map((item) => byId.get(item.id) || item));
    };

    void run();
  }, [lang]);

  const say = React.useCallback(async (text: string, messageId?: string) => {
    if (muted) return;
    const utteranceId = messageId || `awena-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSpeechCue({ messageId: utteranceId, phase: "pending" });
    const ok = await awenaVoice.speak(textForSpeech(text), settingsState, String(lang || "fr"), utteranceId);
    if (!ok) setSpeechCue((prev) => prev?.messageId === utteranceId ? { ...prev, phase: "done" } : prev);
  }, [lang, muted, settingsState]);

  const ask = React.useCallback(async (question: string, options?: { speak?: boolean; modeTopic?: "rules" | "config" | "records"; canonicalFrench?: boolean }) => {
    const clean = String(question || "").trim();
    if (!clean) return "";

    // Internal help buttons author their prompts in canonical French. They must
    // not be re-interpreted as English/German/etc. when the app language changes.
    // The user sees the localized version, while the knowledge engine receives
    // the untouched canonical French prompt.
    const visibleQuestion = options?.canonicalFrench
      ? await awenaTranslation.textFromFrench(clean, String(lang || "fr"))
      : clean;

    // Afficher la question immédiatement. Les requêtes Records peuvent devoir
    // parcourir l'historique ; l'interface ne doit pas donner l'impression
    // qu'Awena n'a pas reçu la demande pendant ce calcul.
    const userMessage = message("user", visibleQuestion);
    setMessages((prev) => [...prev, userMessage].slice(-40));

    // Canonical reasoning language = French. This lets the whole existing
    // knowledge base stay consistent while the user can ask in the language
    // selected in Settings.
    const canonicalQuestion = options?.canonicalFrench
      ? clean
      : await awenaTranslation.questionToFrench(clean, String(lang || "fr"));

    const explicitMode = findAwenaMode(canonicalQuestion, runtime.mode || runtime.route);
    const screenSnapshot = captureAwenaScreenSnapshot();
    const baseContext: AwenaRuntimeContext = {
      ...runtime,
      extra: {
        ...(runtime.extra || {}),
        ...(screenSnapshot ? { awenaScreenSnapshot: screenSnapshot } : {}),
        ...(options?.modeTopic ? { awenaModeTopic: options.modeTopic } : {}),
      },
    };
    const contextForReply = explicitMode ? { ...baseContext, mode: explicitMode.id } : baseContext;

    let recordsReply = null;
    // Séparation stricte des trois boutons de mode : une demande RÈGLES ou
    // CONFIGURATION ne passe jamais par le moteur Records, même si un libellé
    // statistique apparaît accidentellement dans la phrase traduite.
    if (options?.modeTopic !== "rules" && options?.modeTopic !== "config") {
      try {
        recordsReply = await buildAwenaRecordsReply(canonicalQuestion, contextForReply);
      } catch (error) {
        console.warn("[AwenaRecords] réponse records interrompue, fallback conversationnel", error);
      }
    }
    const canonicalReply = recordsReply ?? buildAwenaReply(canonicalQuestion, contextForReply);
    const reply = await awenaTranslation.replyFromFrench(canonicalReply, String(lang || "fr"));

    if (canonicalReply.modeId || canonicalReply.knowledgeTopic) {
      setRuntimeState((prev) => ({
        ...prev,
        // Le mode actif appartient à l'écran réel. Une simple conversation sur
        // Killer depuis l'Accueil ne doit pas faire croire qu'on est dans Killer.
        // Le sujet conversationnel est mémorisé séparément dans extra.
        extra: {
          ...(prev.extra || {}),
          ...(canonicalReply.modeId ? { awenaRememberedMode: canonicalReply.modeId } : {}),
          ...(canonicalReply.knowledgeTopic ? { awenaKnowledgeTopic: canonicalReply.knowledgeTopic } : {}),
        },
      }));
    }

    const awenaMessage = message("awena", reply.text, reply.actions);
    canonicalAwenaMessagesRef.current.set(awenaMessage.id, {
      text: canonicalReply.text,
      actions: canonicalReply.actions,
    });
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
    canonicalAwenaMessagesRef.current.clear();
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
