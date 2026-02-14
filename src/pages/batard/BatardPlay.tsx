// @ts-nocheck
// =============================================================
// src/pages/BatardPlay.tsx
// BATARD — Play (Keypad V7 + engine dédié)
// =============================================================
import * as React from "react";
import type { Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import Keypad from "../components/Keypad";
import { useBatardEngine } from "../hooks/useBatardEngine";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  config: any;
  players: string[];
  onFinish?: (match: any) => void;
};

export default function BatardPlayPage(props: Props) {
  const { store, go, config, players, onFinish } = props;
  const theme = useTheme?.() || ({} as any);

  const { states, currentPlayerIndex, currentRound, submitVisit, finished, winnerId } =
    useBatardEngine(players, config);

  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const pushDart = (v: number, mult?: 1 | 2 | 3) => {
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      const m = mult || multiplier;
      return [...prev, { v, mult: m }];
    });
  };

  const backspace = () => setCurrentThrow((prev) => prev.slice(0, -1));
  const cancel = () => setCurrentThrow([]);

  const validate = () => {
    if (currentThrow.length === 0) return;
    submitVisit(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
  };

  React.useEffect(() => {
    if (!finished) return;
    // match record minimal (pushHistory gère any)
    const match = {
      id: `batard_${Date.now()}`,
      game: "batard",
      date: Date.now(),
      config,
      players,
      results: states.map((p: any) => ({ id: p.id, score: p.score })),
      winnerId,
    };
    try { onFinish?.(match); } catch {}
    // redirige vers summary
    go("batard_summary", { match });
  }, [finished]);

  const active = states[currentPlayerIndex];

  return (
    <div style={{ padding: 14, color: theme?.colors?.text || "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BackDot onClick={() => go("batard_config")} />
        <div style={{ fontWeight: 900, letterSpacing: 1.5 }}>BATARD</div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ marginTop: 10, padding: 12, borderRadius: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Joueur actif</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {active?.id}
        </div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Round</div>
            <div style={{ fontWeight: 900 }}>{currentRound?.label || "-"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
            <div style={{ fontWeight: 900 }}>{active?.score ?? 0}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Classement</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[...states].slice().sort((a: any, b: any) => (b.score||0)-(a.score||0)).map((p: any) => (
            <div key={p.id} style={{ padding: 10, borderRadius: 14, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800 }}>{p.id}</span>
              <span style={{ fontWeight: 900 }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={backspace}
          onCancel={cancel}
          onNumber={(n: number) => pushDart(n)}
          onBull={() => pushDart(25)}
          onValidate={validate}
          hidePreview
          showPlaceholders={false}
        />
      </div>
    </div>
  );
}
