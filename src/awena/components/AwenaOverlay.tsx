import React from "react";
import { useAwenaOptional } from "../AwenaProvider";
import { findAwenaMode, findAwenaModeById } from "../AwenaKnowledge";
import { useTheme } from "../../contexts/ThemeContext";
import type { AwenaAction } from "../awena.types";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

type Props = {
  route?: string;
  sport?: string;
  go?: (route: any, params?: any) => void;
  inGame?: boolean;
};

type AwenaContextValue = NonNullable<ReturnType<typeof useAwenaOptional>>;

export default function AwenaOverlay(props: Props) {
  const awena = useAwenaOptional();

  // Defensive guard for dev/HMR/startup transitions. AppRoot normally always
  // provides Awena, but a transient Fast Refresh must never crash the app.
  if (!awena) return null;

  return <AwenaOverlayInner {...props} awena={awena} />;
}

function AwenaOverlayInner({ route, sport, go, inGame = false, awena }: Props & { awena: AwenaContextValue }) {
  const { theme } = useTheme() as any;
  const { settings, runtime, setRuntime, messages, ask, say, stop, panelOpen: open, openPanel, closePanel, togglePanel } = awena;
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const routeMode = findAwenaMode("", route || "");
    setRuntime({
      route,
      sport,
      mode: routeMode?.id || runtime.mode,
      inGame,
      phase: inGame ? (runtime.phase || "play") : undefined,
      playerName: inGame ? runtime.playerName : undefined,
      score: inGame ? runtime.score : null,
      remaining: inGame ? runtime.remaining : null,
      dartsLeft: inGame ? runtime.dartsLeft : null,
      outMode: inGame ? runtime.outMode : null,
      startScore: inGame ? runtime.startScore : null,
      extra: inGame ? runtime.extra : undefined,
    });
    // Runtime intentionnellement exclu : cet effet doit réagir aux changements d'écran,
    // pas à chaque mise à jour live du score.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, sport, inGame, setRuntime]);

  React.useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  if (!settings.enabled || settings.interventionMode === "off") return null;

  const primary = theme?.primary || "#22e6ff";
  const neon = "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)";
  const currentMode = findAwenaModeById(runtime.mode) || findAwenaMode("", route || "");
  const live = runtime.phase === "play" && typeof runtime.remaining === "number";

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setInput("");
    try { await ask(clean); } finally { setBusy(false); }
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
      {!inGame && <button
        type="button"
        aria-label="Ouvrir Awena"
        onClick={togglePanel}
        style={{
          position: "fixed", right: 16, bottom: 96, zIndex: 1200,
          width: 58, height: 58, borderRadius: "50%", padding: 3,
          border: "none", background: neon, cursor: "pointer",
          boxShadow: "0 0 18px rgba(34,230,255,.45),0 0 30px rgba(255,56,199,.24),0 14px 28px rgba(0,0,0,.55)",
        }}
      >
        <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#060815" }}>
          <img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </span>
      </button>}

      {open && (
        <div style={{
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
              <div style={{ fontSize: 10.5, color: "#aeb6d9", fontWeight: 800, letterSpacing: .45 }}>ASSISTANTE MULTISPORTS SCORING · LOCAL V3</div>
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
            {[
              ["Règles", "Explique les règles de ce mode"],
              [live && currentMode?.id === "x01" ? "Que viser ?" : "Conseil", live && currentMode?.id === "x01" ? "Que me conseilles-tu de viser ?" : "Donne-moi un conseil pour ce mode"],
              ["Dans l'appli", "Comment fait-on pour y jouer dans l'application ?"],
            ].map(([label, prompt]) => (
              <button key={label} onClick={() => void submit(prompt)} style={{ minHeight: 34, borderRadius: 11, border: `1px solid ${primary}55`, background: `${primary}10`, color: "#fff", fontSize: 10.5, fontWeight: 900, cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 190, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && <div style={{ color: "#98a1c7", fontSize: 12 }}>Je suis prête.</div>}
            {messages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ padding: "9px 11px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", border: m.role === "user" ? "1px solid rgba(255,255,255,.10)" : `1px solid ${primary}44`, background: m.role === "user" ? "rgba(255,255,255,.07)" : `linear-gradient(135deg,${primary}12,rgba(255,56,199,.08))`, color: "#f7f8ff", fontSize: 12.5, lineHeight: 1.45 }}>
                  {m.text}
                  {m.role === "awena" && (
                    <button type="button" onClick={() => void say(m.text)} title="Écouter Awena" style={{ marginLeft: 8, border: 0, background: "transparent", color: primary, cursor: "pointer", fontSize: 14 }}>🔊</button>
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
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pose une question à Awena…" style={{ flex: 1, minWidth: 0, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.055)", color: "#fff", padding: "10px 11px", outline: "none", fontSize: 12 }} />
            <button disabled={busy || !input.trim()} style={{ minWidth: 48, borderRadius: 13, border: `1px solid ${primary}`, background: `${primary}22`, color: primary, fontWeight: 950, cursor: "pointer" }}>{busy ? "…" : "➜"}</button>
          </form>
        </div>
      )}
    </>
  );
}
