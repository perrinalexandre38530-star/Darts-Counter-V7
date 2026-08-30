import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAudio } from "../contexts/AudioContext";
import { awenaTranslation } from "./AwenaTranslation";
import { AWENA_CONTEXT_EVENT } from "./AwenaContextBridge";
import { awenaVoice } from "./AwenaVoice";
import { loadAwenaSettings, saveAwenaSettings } from "./AwenaSettings";
import { awenaLine } from "./AwenaVoiceCatalog";
import { awenaUi } from "./AwenaLocale";
import { parseAwenaMusicIntent, awenaMusicCatalogText, awenaMusicTrackCount } from "./AwenaMusicCommands";
import { getAudioPreferences } from "../lib/audioPreferences";
import { requestNavigationMusicTrackFromAwena } from "../lib/navigationMusicControl";
import { isGameplayRouteName } from "../lib/gameplayRoutes";
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

  // PERF NAV: le moteur Awena (connaissances + historique Records) est lourd et
  // n'a aucune raison de parser/indexer l'historique pendant la navigation normale.
  // On le précharge uniquement lorsque l'utilisateur ouvre réellement le panneau.
  React.useEffect(() => {
    if (!panelOpen) return;
    let cancelled = false;
    void Promise.all([
      import("./AwenaCore"),
      import("./AwenaKnowledge"),
      import("./AwenaLiveScreen"),
      import("./AwenaRecords"),
    ]).then(([, , , records]) => {
      if (!cancelled) return records.warmAwenaRecordsCache();
    }).catch(() => undefined);
    return () => { cancelled = true; };
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

    // Chargement à la demande : le coût du moteur Awena n'est plus payé par tous
    // les utilisateurs ni à chaque démarrage/navigation. Les imports sont mis en
    // cache par le runtime après la première ouverture.
    const [coreMod, knowledgeMod, liveScreenMod, recordsMod] = await Promise.all([
      import("./AwenaCore"),
      import("./AwenaKnowledge"),
      import("./AwenaLiveScreen"),
      import("./AwenaRecords"),
    ]);
    const explicitMode = knowledgeMod.findAwenaMode(canonicalQuestion, runtime.mode || runtime.route);
    const screenSnapshot = liveScreenMod.captureAwenaScreenSnapshot();
    const baseContext: AwenaRuntimeContext = {
      ...runtime,
      extra: {
        ...(runtime.extra || {}),
        ...(screenSnapshot ? { awenaScreenSnapshot: screenSnapshot } : {}),
        ...(options?.modeTopic ? { awenaModeTopic: options.modeTopic } : {}),
      },
    };
    const contextForReply = explicitMode ? { ...baseContext, mode: explicitMode.id } : baseContext;

    // Commandes musique : on tente d'abord le texte brut (pour rester fiable
    // même sans modèle de traduction), puis la version canonique française.
    const rawMusicIntent = parseAwenaMusicIntent(clean);
    const canonicalMusicIntent = parseAwenaMusicIntent(canonicalQuestion);
    const musicIntent = rawMusicIntent.kind !== "none" ? rawMusicIntent : canonicalMusicIntent;

    let canonicalReply: any = null;
    if (musicIntent.kind === "list") {
      canonicalReply = {
        text: `## MUSIQUES DISPONIBLES\nJ'ai **${awenaMusicTrackCount()} titres intégrés** dans MULTISPORTS SCORING. Je peux lancer directement n'importe lequel :\n\n- ${awenaMusicCatalogText().replace(/, /g, "\n- ")}\n\nDis simplement : **« Awena, lance Stadium Pulse »** ou remplace le titre par celui que tu veux.`,
      };
    } else if (musicIntent.kind === "play") {
      const gameplay = !!runtime.inGame || isGameplayRouteName(runtime.route);
      const audioPrefs = getAudioPreferences();
      if (gameplay) {
        canonicalReply = {
          text: `Je connais bien **${musicIntent.trackName}**, mais je ne lance jamais la musique de fond pendant un écran **PLAY** ou un entraînement actif. C'est volontaire pour préserver les sons, annonces et bruitages de la partie. Dès ton retour dans les menus, tu peux me redemander ce titre.`,
        };
      } else if (!audioPrefs.masterEnabled) {
        canonicalReply = {
          text: `Je peux lancer **${musicIntent.trackName}**, mais le **son général est désactivé** dans Réglages > Audio. Je respecte ce réglage et je ne le réactive pas sans toi. Réactive le son général, puis redemande-moi le morceau.`,
        };
      } else if (!audioPrefs.navigationMusicEnabled) {
        canonicalReply = {
          text: `Je peux lancer **${musicIntent.trackName}**, mais les **musiques de navigation sont désactivées** dans Réglages > Audio. Je ne contourne pas ce choix. Réactive les musiques de navigation, puis redemande-moi le titre.`,
        };
      } else {
        requestNavigationMusicTrackFromAwena(musicIntent.trackId);
        canonicalReply = {
          text: `Je lance **${musicIntent.trackName}**.`,
        };
      }
    } else if (musicIntent.kind === "missing-title") {
      canonicalReply = {
        text: `Dis-moi simplement **le nom du morceau intégré** que tu veux écouter. Je connais actuellement ${awenaMusicTrackCount()} titres. Tu peux aussi me demander : **« Quels sont les morceaux disponibles ? »**`,
      };
    } else if (musicIntent.kind === "unavailable") {
      const requested = musicIntent.requestedTitle ? ` **${musicIntent.requestedTitle}**` : " ce titre";
      canonicalReply = {
        text: `Je ne trouve pas${requested} dans les **${awenaMusicTrackCount()} morceaux intégrés** à MULTISPORTS SCORING. Je peux lancer uniquement les musiques fournies avec l'application : je n'accède pas aux fichiers audio du téléphone, aux dossiers locaux ni aux bibliothèques externes comme Spotify, Deezer, YouTube ou Apple Music. Demande-moi **« Quels sont les morceaux disponibles ? »** pour voir toute la liste.`,
      };
    }

    let recordsReply = null;
    // Séparation stricte des trois boutons de mode : une demande RÈGLES ou
    // CONFIGURATION ne passe jamais par le moteur Records, même si un libellé
    // statistique apparaît accidentellement dans la phrase traduite.
    if (!canonicalReply && options?.modeTopic !== "rules" && options?.modeTopic !== "config") {
      try {
        recordsReply = await recordsMod.buildAwenaRecordsReply(canonicalQuestion, contextForReply);
      } catch (error) {
        console.warn("[AwenaRecords] réponse records interrompue, fallback conversationnel", error);
      }
    }
    canonicalReply = canonicalReply ?? recordsReply ?? coreMod.buildAwenaReply(canonicalQuestion, contextForReply);
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
