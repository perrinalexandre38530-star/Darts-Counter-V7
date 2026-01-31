// =============================================================
// src/components/dev/X01DevPanel.tsx
// Dev Panel X01 (DEV + DevMode ON)
// - Boutons 1-click pour tester UNDO + CHECKOUTS sans "jouer" une partie
// - Affiche PASS/FAIL + dump minimal (joueur actif, score, dartsLeft)
// =============================================================

import React from "react";
import { extAdaptCheckoutSuggestion } from "../../lib/x01v3/x01CheckoutV3";

type OutMode = "simple" | "double" | "master";

export type X01DevPanelProps = {
  outMode: OutMode;
  // état minimal (pour afficher)
  activePlayerId: string | null;
  activeScore: number | null;
  dartsLeft: number | null;
  // actions moteur
  throwDart: (input: { segment: number; multiplier: 0 | 1 | 2 | 3 }) => void;
  undoLastDart: () => void;
  // helpers
  getScoreByPlayerId: (pid: string) => number | null;
};

type LogLine = { t: number; level: "ok" | "ko" | "info"; msg: string };

function fmtNow() {
  const d = new Date();
  return d.toLocaleTimeString();
}

function pillStyle(level: LogLine["level"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
  };
  if (level === "ok") return { ...base, background: "rgba(40,200,120,.18)", color: "#2fe49a" };
  if (level === "ko") return { ...base, background: "rgba(255,60,60,.18)", color: "#ff6b6b" };
  return { ...base, background: "rgba(255,255,255,.10)", color: "rgba(255,255,255,.8)" };
}

function dartLabel(seg: number, mult: number) {
  if (mult === 0) return "MISS";
  if (seg === 25) return mult === 2 ? "DBULL" : "SBULL";
  const p = mult === 1 ? "S" : mult === 2 ? "D" : "T";
  return `${p}${seg}`;
}

export default function X01DevPanel(props: X01DevPanelProps) {
  const {
    outMode,
    activePlayerId,
    activeScore,
    dartsLeft,
    throwDart,
    undoLastDart,
    getScoreByPlayerId,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [log, setLog] = React.useState<LogLine[]>([]);
  const [checkoutScore, setCheckoutScore] = React.useState<number>(170);

  const push = React.useCallback((level: LogLine["level"], msg: string) => {
    setLog((prev) => [{ t: Date.now(), level, msg }, ...prev].slice(0, 50));
  }, []);

  const snapshot = React.useCallback(() => {
    const pid = activePlayerId ?? "?";
    const score = activeScore ?? getScoreByPlayerId(pid) ?? null;
    push(
      "info",
      `SNAP | P=${pid} score=${score ?? "?"} dartsLeft=${dartsLeft ?? "?"} outMode=${outMode}`
    );
  }, [activePlayerId, activeScore, dartsLeft, outMode, getScoreByPlayerId, push]);

  // Scénario court mais "piégeux":
  // - A fait 3 darts (fin de visit)
  // - B fait 1 dart
  // - UNDO
  // - B rejoue autre dart
  const runUndoTorture = React.useCallback(() => {
    push("info", `RUN UNDO TORTURE @ ${fmtNow()}`);
    try {
      // On envoie volontairement rapidement (le moteur commit via refs)
      throwDart({ segment: 20, multiplier: 3 });
      throwDart({ segment: 20, multiplier: 3 });
      throwDart({ segment: 20, multiplier: 3 });
      throwDart({ segment: 20, multiplier: 1 });
      // UNDO du dernier dart de B
      undoLastDart();
      // Re-throw différent
      throwDart({ segment: 19, multiplier: 3 });
      push("ok", "UNDO TORTURE: terminé (si pas de bug UI/moteur, c'est PASS)");
      snapshot();
    } catch (e: any) {
      push("ko", `UNDO TORTURE: exception ${String(e?.message ?? e)}`);
    }
  }, [push, snapshot, throwDart, undoLastDart]);

  const showCheckout = React.useCallback(() => {
    const score = Number.isFinite(checkoutScore) ? checkoutScore : 0;
    const sug = extAdaptCheckoutSuggestion({ score, dartsLeft: 3, outMode });
    if (!sug) {
      push("ko", `CHECKOUT ${score}: aucune suggestion (outMode=${outMode})`);
      return;
    }
    const txt = sug.darts.map((d) => dartLabel(d.segment, d.multiplier)).join(" ");
    push("ok", `CHECKOUT ${score} (${outMode}): ${txt}`);
  }, [checkoutScore, outMode, push]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 9999,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.18)",
          background: "rgba(0,0,0,.35)",
          color: "rgba(255,255,255,.9)",
          fontWeight: 800,
        }}
        title="X01 Dev Panel"
      >
        DEV X01
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        width: 360,
        maxWidth: "calc(100vw - 24px)",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.18)",
        background: "rgba(10,10,12,.72)",
        backdropFilter: "blur(10px)",
        color: "rgba(255,255,255,.92)",
        boxShadow: "0 18px 60px rgba(0,0,0,.45)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px" }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>X01 DEV</div>
        <button
          onClick={() => setOpen(false)}
          style={{
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.06)",
            color: "rgba(255,255,255,.9)",
            borderRadius: 12,
            padding: "6px 10px",
            fontWeight: 900,
          }}
        >
          Fermer
        </button>
      </div>

      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
          Active={activePlayerId ?? "?"} | score={activeScore ?? "?"} | left={dartsLeft ?? "?"} | outMode={outMode}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={runUndoTorture}
            style={{
              padding: "9px 10px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.92)",
              fontWeight: 900,
              flex: "1 1 160px",
            }}
          >
            UNDO Torture
          </button>

          <button
            onClick={snapshot}
            style={{
              padding: "9px 10px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.92)",
              fontWeight: 900,
              flex: "1 1 160px",
            }}
          >
            Snapshot
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input
            value={checkoutScore}
            onChange={(e) => setCheckoutScore(parseInt(e.target.value || "0", 10))}
            style={{
              width: 92,
              padding: "8px 10px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(0,0,0,.25)",
              color: "rgba(255,255,255,.92)",
              fontWeight: 900,
            }}
          />
          <button
            onClick={showCheckout}
            style={{
              padding: "9px 10px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.92)",
              fontWeight: 900,
              flex: 1,
            }}
          >
            Checkout
          </button>
        </div>

        <div
          style={{
            maxHeight: 220,
            overflow: "auto",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.12)",
            padding: 10,
            background: "rgba(0,0,0,.20)",
          }}
        >
          {log.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Aucun log. Clique UNDO Torture ou Checkout.</div>
          ) : (
            log.map((l) => (
              <div key={l.t} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                <span style={pillStyle(l.level)}>{l.level.toUpperCase()}</span>
                <div style={{ fontSize: 12, lineHeight: 1.25, opacity: 0.95 }}>{l.msg}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
