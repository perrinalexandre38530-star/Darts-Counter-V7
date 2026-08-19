import React from "react";
import { useAwenaOptional } from "../AwenaProvider";
import { findAwenaMode, findAwenaModeById } from "../AwenaKnowledge";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { awenaUi } from "../AwenaLocale";
import { awenaTranslation } from "../AwenaTranslation";
import type { AwenaAction, AwenaSpeechCue } from "../awena.types";
import { hideAllInlineGoogleAds } from "../../monetization/inlineAdMob";
import { awenaSpeechRecognition, type AwenaSpeechStatus } from "../AwenaSpeechRecognition";
import {
  getAwenaVoiceDialogOwner,
  parseAwenaVoiceIntent,
  publishAwenaVoiceTranscript,
} from "../AwenaVoiceCommands";
import { awenaProcedurePromptForRoute, isAwenaComplexRoute } from "../AwenaProceduralAcademy";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

type Props = {
  route?: string;
  sport?: string;
  go?: (route: any, params?: any) => void;
  inGame?: boolean;
};

type AwenaContextValue = NonNullable<ReturnType<typeof useAwenaOptional>>;

function inlineRich(text: string, accent: string) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} style={{ color: accent, fontWeight: 950 }}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function sectionColor(title: string, primary: string) {
  const t = title.toUpperCase();
  if (/OBJECTIF|VICTOIRE|FORMAT/.test(t)) return "#ffd76a";
  if (/CONFIG|OPTIONS|PARTICIPANTS|SAISIE|DANS L/.test(t)) return "#65d8ff";
  if (/FUYARD|ÉVASION|EVASION/.test(t)) return "#ff6fa8";
  if (/CHASSEUR|CAPTURE/.test(t)) return "#42d6ff";
  if (/CONSEIL|ASTUCE/.test(t)) return "#5dff9b";
  return primary;
}

function RichAwenaText({ text, primary }: { text: string; primary: string }) {
  const lines = String(text || "").split(/\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join(" ").trim();
    paragraph = [];
    if (!content) return;
    blocks.push(
      <div key={`p-${blocks.length}`} style={{ color: "#eef2ff", lineHeight: 1.5 }}>
        {inlineRich(content, primary)}
      </div>
    );
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      return;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      const title = line.slice(3).trim();
      const color = sectionColor(title, primary);
      blocks.push(
        <div key={`h-${blocks.length}`} style={{
          marginTop: blocks.length ? 5 : 0,
          color,
          fontSize: 11,
          fontWeight: 1000,
          letterSpacing: .8,
          textTransform: "uppercase",
          paddingBottom: 4,
          borderBottom: `1px solid ${color}35`,
        }}>
          {title}
        </div>
      );
      return;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      blocks.push(
        <div key={`b-${blocks.length}`} style={{ display: "flex", gap: 7, alignItems: "flex-start", color: "#edf1ff", lineHeight: 1.45 }}>
          <span aria-hidden style={{ color: primary, fontWeight: 1000, marginTop: 1 }}>•</span>
          <span style={{ flex: 1 }}>{inlineRich(line.slice(2).trim(), primary)}</span>
        </div>
      );
      return;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push(
        <div key={`n-${blocks.length}`} style={{
          padding: "7px 9px",
          borderRadius: 10,
          border: "1px solid rgba(255,215,106,.26)",
          background: "rgba(255,215,106,.06)",
          color: "#f4dfaa",
          lineHeight: 1.42,
        }}>
          {inlineRich(line.slice(2).trim(), "#ffd76a")}
        </div>
      );
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();

  return <div style={{ display: "grid", gap: 7 }}>{blocks}</div>;
}

function MicNavIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11.5a5 5 0 0 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16.5V20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 20h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function progressiveSlice(text: string, ratio: number) {
  const source = String(text || "");
  if (ratio >= 1) return source;
  if (ratio <= 0) return "";
  const tokens = source.match(/\S+\s*/g) || [];
  if (!tokens.length) return source;
  const count = Math.max(1, Math.min(tokens.length, Math.ceil(tokens.length * ratio)));
  return tokens.slice(0, count).join("").trimEnd();
}

function ProgressiveAwenaText({
  messageId,
  text,
  primary,
  speechCue,
  voicePreparing,
}: {
  messageId: string;
  text: string;
  primary: string;
  speechCue: AwenaSpeechCue | null;
  voicePreparing: string;
}) {
  const isTarget = speechCue?.messageId === messageId;
  const [ratio, setRatio] = React.useState(isTarget && speechCue?.phase !== "done" ? 0.18 : 1);

  React.useEffect(() => {
    if (!isTarget || !speechCue) {
      setRatio(1);
      return;
    }
    if (speechCue.phase === "pending") {
      // Le texte utile apparaît immédiatement pendant que le moteur neuronal
      // prépare l'audio. On garde une partie à révéler lorsque la voix démarre.
      setRatio(0.18);
      return;
    }
    if (speechCue.phase === "done") {
      setRatio(1);
      return;
    }

    const startedAt = Number(speechCue.startedAt || Date.now());
    const durationMs = Math.max(350, Number(speechCue.durationMs || 1200));
    let frame = 0;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      const next = Math.min(1, Math.max(0.18, elapsed / durationMs));
      setRatio(next);
      if (next < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isTarget, speechCue?.phase, speechCue?.startedAt, speechCue?.durationMs]);

  if (isTarget && speechCue?.phase === "pending") {
    return (
      <div>
        <RichAwenaText text={progressiveSlice(text, ratio)} primary={primary} />
        <div
          aria-label="Awena prépare sa voix"
          style={{ marginTop: 7, color: primary, opacity: .72, fontSize: 9.5, fontWeight: 850, letterSpacing: .35 }}
        >
          {voicePreparing}
        </div>
      </div>
    );
  }

  return <RichAwenaText text={progressiveSlice(text, ratio)} primary={primary} />;
}

export default function AwenaOverlay(props: Props) {
  const awena = useAwenaOptional();

  // Defensive guard for dev/HMR/startup transitions. AppRoot normally always
  // provides Awena, but a transient Fast Refresh must never crash the app.
  if (!awena) return null;

  return <AwenaOverlayInner {...props} awena={awena} />;
}

function AwenaOverlayInner({ route, sport, go, inGame = false, awena }: Props & { awena: AwenaContextValue }) {
  const { theme } = useTheme() as any;
  const { lang } = useLang();
  const ui = awenaUi(lang);
  const { settings, setSettings, runtime, setRuntime, messages, ask, say, stop, speechCue, panelOpen: open, openPanel, closePanel, togglePanel } = awena;
  const [input, setInput] = React.useState("");
  const [speechStatus, setSpeechStatus] = React.useState<AwenaSpeechStatus | null>(null);
  const voiceIntentBusyRef = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const routeMode = findAwenaMode("", route || "");
    setRuntime({
      route,
      sport,
      // Le mode actif vient de la route / partie réelle. Hors d'un écran de
      // mode on le libère, tandis que le sujet de conversation reste conservé
      // dans awenaRememberedMode.
      mode: routeMode?.id || (inGame ? runtime.mode : undefined),
      inGame,
      phase: inGame ? (runtime.phase || "play") : undefined,
      playerName: inGame ? runtime.playerName : undefined,
      score: inGame ? runtime.score : null,
      remaining: inGame ? runtime.remaining : null,
      dartsLeft: inGame ? runtime.dartsLeft : null,
      outMode: inGame ? runtime.outMode : null,
      startScore: inGame ? runtime.startScore : null,
      extra: inGame
        ? runtime.extra
        : {
            awenaKnowledgeTopic: runtime.extra?.awenaKnowledgeTopic,
            awenaRememberedMode: runtime.extra?.awenaRememberedMode,
          },
    });
    // Runtime intentionnellement exclu : cet effet doit réagir aux changements d'écran,
    // pas à chaque mise à jour live du score.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, sport, inGame, setRuntime]);

  React.useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, speechCue, open]);

  React.useEffect(() => {
    return awenaSpeechRecognition.onStatus(setSpeechStatus);
  }, []);

  React.useEffect(() => {
    const shouldListen = !!settings.enabled
      && settings.interventionMode !== "off"
      && !!settings.voiceCommandsEnabled
      && !inGame;
    if (!shouldListen) {
      void awenaSpeechRecognition.stop();
      return;
    }
    void awenaSpeechRecognition.start(String(lang || "fr"), {
      preferOffline: settings.preferOnDeviceRecognition !== false,
      requestPermission: false,
    });
    return () => { void awenaSpeechRecognition.stop(); };
  }, [settings.enabled, settings.interventionMode, settings.voiceCommandsEnabled, settings.preferOnDeviceRecognition, lang, inGame]);

  // Awena ne doit jamais interpréter sa propre voix comme une commande.
  React.useEffect(() => {
    if (!settings.voiceCommandsEnabled || inGame) return;
    if (speechCue?.phase === "pending" || speechCue?.phase === "speaking") {
      void awenaSpeechRecognition.pause();
      return;
    }
    if (speechCue?.phase === "done") {
      const timer = window.setTimeout(() => { void awenaSpeechRecognition.resume(); }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [speechCue?.phase, speechCue?.messageId, settings.voiceCommandsEnabled, inGame]);

  React.useEffect(() => {
    return awenaSpeechRecognition.onResult((result) => {
      if (!result.final || !settings.voiceCommandsEnabled || inGame) return;
      const text = String(result.text || "").trim();
      if (!text) return;

      if (getAwenaVoiceDialogOwner()) {
        publishAwenaVoiceTranscript({ text, confidence: result.confidence ?? undefined, final: true });
        return;
      }

      const intent = parseAwenaVoiceIntent(text);
      if (intent.kind === "none" || voiceIntentBusyRef.current) return;
      voiceIntentBusyRef.current = true;

      void (async () => {
        try {
          await awenaSpeechRecognition.pause();
          if (intent.kind === "x01-start") {
            go?.("x01_config_v3", { awenaVoiceSetup: true, awenaVoiceRequestId: Date.now() });
            closePanel();
            return;
          }
          if (intent.kind === "ask") {
            await ask(intent.prompt, { speak: true });
          }
        } finally {
          voiceIntentBusyRef.current = false;
          if (!getAwenaVoiceDialogOwner()) {
            window.setTimeout(() => { void awenaSpeechRecognition.resume(); }, 420);
          }
        }
      })();
    });
  }, [settings.voiceCommandsEnabled, inGame, ask, go, closePanel]);

  // Les bannières AdMob inline Android sont des vues natives superposées à la
  // WebView : un simple z-index CSS ne peut donc pas les placer derrière Awena.
  // On les suspend pendant l'ouverture du chat, puis les slots les rechargent
  // automatiquement à la fermeture.
  React.useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const publish = (visible: boolean) => {
      document.documentElement.dataset.awenaPanelOpen = visible ? "1" : "0";
      window.dispatchEvent(new CustomEvent("dc:awena-panel-visibility", { detail: { open: visible } }));
      if (visible) void hideAllInlineGoogleAds();
    };

    publish(open);
    return () => {
      if (open) publish(false);
    };
  }, [open]);

  if (!settings.enabled || settings.interventionMode === "off") return null;

  const primary = theme?.primary || "#22e6ff";
  const neon = "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)";
  const currentMode = findAwenaModeById(runtime.mode) || findAwenaMode("", route || "");
  const live = runtime.phase === "play" && typeof runtime.remaining === "number";
  const proceduralRoute = !currentMode && isAwenaComplexRoute(String(route || runtime.route || ""));
  const proceduralPrompt = proceduralRoute ? awenaProcedurePromptForRoute(String(route || runtime.route || "")) : "";

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setInput("");
    try { await ask(clean); } finally { setBusy(false); }
  }

  async function submitCanonical(promptFr: string) {
    const localized = await awenaTranslation.textFromFrench(promptFr, String(lang || "fr"));
    await submit(localized);
  }

  function runAction(action: AwenaAction) {
    if (action.kind === "ask" && action.prompt) {
      void submit(action.prompt);
      return;
    }
    if (action.kind === "navigate" && action.route && go) {
      go(action.route, action.params);
      closePanel();
    }
  }

  return (
    <>
      {!inGame && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 96,
            width: 74,
            height: 74,
            zIndex: 1200,
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            aria-label="Ouvrir Awena"
            onClick={togglePanel}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 58,
              height: 58,
              borderRadius: "50%",
              padding: 3,
              border: "none",
              background: neon,
              cursor: "pointer",
              pointerEvents: "auto",
              boxShadow: "0 0 18px rgba(34,230,255,.45),0 0 30px rgba(255,56,199,.24),0 14px 28px rgba(0,0,0,.55)",
            }}
          >
            <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#060815" }}>
              <img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </span>
          </button>

          <button
            type="button"
            aria-label={settings.voiceCommandsEnabled ? "Désactiver les commandes vocales Awena" : "Activer les commandes vocales Awena"}
            title={settings.voiceCommandsEnabled ? "Awena écoute son nom" : "Activer « Awena… »"}
            onClick={() => {
              void (async () => {
                if (settings.voiceCommandsEnabled) {
                  setSettings((prev) => ({ ...prev, voiceCommandsEnabled: false }));
                  await awenaSpeechRecognition.stop();
                  return;
                }
                const granted = await awenaSpeechRecognition.requestPermission();
                if (!granted) return;
                setSettings((prev) => ({ ...prev, enabled: true, voiceCommandsEnabled: true }));
              })();
            }}
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              zIndex: 2,
              width: 29,
              height: 29,
              borderRadius: "50%",
              padding: 0,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${settings.voiceCommandsEnabled ? "#36f59a" : "rgba(255,255,255,.24)"}`,
              background: "linear-gradient(180deg, rgba(20,32,58,.98), rgba(7,10,23,.98))",
              color: settings.voiceCommandsEnabled ? "#64ffad" : "#f2f6ff",
              cursor: "pointer",
              pointerEvents: "auto",
              boxShadow: settings.voiceCommandsEnabled
                ? "0 0 12px rgba(54,245,154,.28), 0 8px 18px rgba(0,0,0,.45)"
                : "0 8px 18px rgba(0,0,0,.45)",
            }}
          >
            <MicNavIcon size={15} />
          </button>

          {settings.voiceCommandsEnabled && speechStatus?.listening && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 8,
                bottom: 28,
                zIndex: 3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#36f59a",
                boxShadow: "0 0 9px #36f59a",
              }}
            />
          )}
        </div>
      )}

      {open && (
        <div data-awena-overlay="1" style={{
          position: "fixed", right: 12, ...(inGame ? { top: 78, bottom: "auto" } : { bottom: 166 }), zIndex: 1199,
          width: "min(390px, calc(100vw - 24px))", maxHeight: inGame ? "min(620px, calc(100vh - 96px))" : "min(620px, calc(100vh - 210px))",
          display: "flex", flexDirection: "column", overflow: "hidden",
          borderRadius: 22, border: `1px solid ${primary}88`,
          background: "linear-gradient(180deg,rgba(7,10,25,.98),rgba(3,5,16,.98))",
          boxShadow: `0 0 30px ${primary}35,0 24px 60px rgba(0,0,0,.72)`,
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(90deg,rgba(255,230,0,.08),rgba(22,232,255,.07),rgba(255,56,199,.08))" }}>
            <img src={AWENA_AVATAR} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${primary}` }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: "#fff", letterSpacing: .8 }}>AWENA</div>
              <div style={{ fontSize: 10.5, color: "#aeb6d9", fontWeight: 800, letterSpacing: .45 }}>ASSISTANTE MULTISPORTS SCORING · LOCAL V9.2 · GUIDE UTILISATEUR EXPERT + TUTORIELS + VOICE X01</div>
              {(currentMode || live) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                  {currentMode && <span style={{ fontSize: 9, fontWeight: 900, color: primary, border: `1px solid ${primary}55`, borderRadius: 999, padding: "2px 6px", background: `${primary}12` }}>{currentMode.label}</span>}
                  {live && <span style={{ fontSize: 9, fontWeight: 900, color: "#44ff9a", border: "1px solid rgba(68,255,154,.35)", borderRadius: 999, padding: "2px 6px", background: "rgba(68,255,154,.08)" }}>LIVE · {runtime.remaining}</span>}
                </div>
              )}
            </div>
            <button onClick={() => void stop()} style={{ border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", borderRadius: 999, width: 34, height: 34, cursor: "pointer" }} title="Arrêter la voix">■</button>
            <button onClick={closePanel} style={{ border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", borderRadius: 999, width: 34, height: 34, cursor: "pointer" }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, padding: "9px 10px 0" }}>
            {(proceduralRoute
              ? [
                  [String(lang || "fr").toLowerCase().startsWith("fr") ? "Tutoriel pas à pas" : "Step-by-step", proceduralPrompt],
                  [String(lang || "fr").toLowerCase().startsWith("fr") ? "Prérequis" : "Prerequisites", `${proceduralPrompt} Donne-moi d'abord uniquement les prérequis et ce qu'il faut préparer.`],
                  [String(lang || "fr").toLowerCase().startsWith("fr") ? "Diagnostic" : "Troubleshoot", `${proceduralPrompt} Je suis bloqué : commence par les vérifications et les erreurs fréquentes.`],
                ]
              : currentMode && !live
              ? [
                  [ui.rules, `Explique-moi clairement les règles de ${currentMode.label}.`],
                  [ui.configuration, `Détaille uniquement la configuration de ${currentMode.label} : chaque option, valeur possible, variante, format et réglage disponible.`],
                  [ui.records, `Donne-moi les records de ${currentMode.label} et les principaux classements disponibles.`],
                ]
              : currentMode && live
                ? [
                    [ui.rules, `Explique-moi les règles de ${currentMode.label}.`],
                    [currentMode.id === "x01" ? ui.whatToAim : ui.advice, currentMode.id === "x01" ? "Que me conseilles-tu de viser ?" : `Donne-moi un conseil pour ${currentMode.label}.`],
                    [ui.records, `Donne-moi les records de ${currentMode.label}.`],
                  ]
                : [
                    [ui.thisScreen, "Que puis-je faire sur cet écran ?"],
                    [ui.navigation, "Aide-moi à trouver une fonction dans l'application."],
                    [ui.whatDoYouKnow, "Que peux-tu m'expliquer dans l'application ?"],
                  ]
            ).map(([label, prompt]) => (
              <button key={label} onClick={() => void submitCanonical(prompt)} style={{ minHeight: 34, borderRadius: 11, border: `1px solid ${primary}55`, background: `${primary}10`, color: "#fff", fontSize: 10.5, fontWeight: 900, cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 190, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && <div style={{ color: "#98a1c7", fontSize: 12 }}>{ui.ready}</div>}
            {messages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ padding: "9px 11px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", border: m.role === "user" ? "1px solid rgba(255,255,255,.10)" : `1px solid ${primary}44`, background: m.role === "user" ? "rgba(255,255,255,.07)" : `linear-gradient(135deg,${primary}12,rgba(255,56,199,.08))`, color: "#f7f8ff", fontSize: 12.5, lineHeight: 1.45 }}>
                  {m.role === "awena" ? <ProgressiveAwenaText messageId={m.id} text={m.text} primary={primary} speechCue={speechCue} voicePreparing={ui.voicePreparing} /> : m.text}
                  {m.role === "awena" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
                      <button
                          type="button"
                          onClick={() => {
                            const active = speechCue?.messageId === m.id && speechCue.phase !== "done";
                            if (active) {
                              void stop();
                            } else {
                              void say(m.text, m.id);
                            }
                          }}
                          title={speechCue?.messageId === m.id && speechCue.phase !== "done"
                            ? ui.stopVoice
                            : ui.listen}
                          aria-label={speechCue?.messageId === m.id && speechCue.phase !== "done"
                            ? ui.stopVoice
                            : ui.listen}
                          style={{ border: 0, background: "transparent", color: primary, cursor: "pointer", fontSize: 14, padding: "2px 4px" }}
                        >
                          {speechCue?.messageId === m.id && speechCue.phase !== "done" ? "🔇" : "🔊"}
                        </button>
                    </div>
                  )}
                  {m.role === "awena" && !String(lang || "fr").toLowerCase().startsWith("fr") && (
                    <div style={{ marginTop: 3, color: "#8f98b8", fontSize: 8.5, textAlign: "right", opacity: .78 }}>
                      Traduction automatique · Google Translate
                    </div>
                  )}
                </div>
                {m.role === "awena" && Array.isArray(m.actions) && m.actions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {m.actions.map((action) => {
                      if (action.kind === "navigate" && action.imageSrc) {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => runAction(action)}
                            aria-label={action.imageAlt || action.label}
                            title={action.label}
                            style={{
                              width: "min(280px, 100%)",
                              aspectRatio: "800 / 230",
                              padding: 0,
                              overflow: "hidden",
                              borderRadius: 12,
                              border: `1px solid ${primary}aa`,
                              background: "#050713",
                              boxShadow: `0 0 16px ${primary}22`,
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={action.imageSrc}
                              alt={action.imageAlt || action.label}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          </button>
                        );
                      }
                      return (
                        <button key={action.id} type="button" onClick={() => runAction(action)} style={{ borderRadius: 999, border: `1px solid ${primary}88`, background: `${primary}18`, color: "#fff", padding: "6px 9px", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void submit(input); }} style={{ display: "flex", gap: 7, padding: 10, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ui.placeholder} style={{ flex: 1, minWidth: 0, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.055)", color: "#fff", padding: "10px 11px", outline: "none", fontSize: 12 }} />
            <button disabled={busy || !input.trim()} style={{ minWidth: 48, borderRadius: 13, border: `1px solid ${primary}`, background: `${primary}22`, color: primary, fontWeight: 950, cursor: "pointer" }}>{busy ? "…" : "➜"}</button>
          </form>
        </div>
      )}
    </>
  );
}
