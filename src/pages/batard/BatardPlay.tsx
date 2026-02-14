import React, { useMemo, useState } from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import Keypad from "../../components/Keypad";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";

import type { Dart as UIDart } from "../../lib/types";
import type { BatardConfig as BatardRulesConfig } from "../../lib/batard/batardTypes";
import { useBatardEngine } from "../../hooks/useBatardEngine";
import type { BatardConfigPayload } from "./BatardConfig";

const INFO_TEXT = `BÂTARD — mode variantes
- Chaque "round" impose une contrainte (cible + multiplicateur, bull…)
- Tu marques uniquement avec les flèches valides (par défaut)
- Règle d'échec configurable (malus / recul / freeze)
`;

function roundTitle(round: any, idx: number) {
  if (!round) return `Round #${idx + 1}`;
  if (round.bullOnly) return `Round #${idx + 1} — BULL`;
  const t = typeof round.target === "number" ? round.target : null;
  const m = round.multiplierRule || "ANY";
  if (!t) return `Round #${idx + 1} — SCORE LIBRE`;
  return `Round #${idx + 1} — ${m} ${t}`;
}

export default function BatardPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: BatardConfigPayload =
    (props?.params?.config as BatardConfigPayload) ||
    (props?.config as BatardConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      presetId: "classic",
      batard: {
        winMode: "SCORE_MAX",
        failPolicy: "NONE",
        failValue: 0,
        rounds: [{ id: "1", label: "Score Max", multiplierRule: "ANY" }],
      } as BatardRulesConfig,
    };

  const playerIds = useMemo(
    () => Array.from({ length: Math.max(2, cfg.players) }, (_, i) => `J${i + 1}`),
    [cfg.players]
  );

  const { states, currentPlayerIndex, currentRound, throwVisit, isFinished } =
    useBatardEngine(playerIds, cfg.batard);

  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [bustMsg, setBustMsg] = useState<string | null>(null);

  const finished = isFinished();

  const winner = useMemo(() => {
    if (!finished) return null;
    // Winner = highest score (or first finisher already marked by engine, but we keep simple)
    let best = -Infinity;
    let idx = 0;
    for (let i = 0; i < states.length; i++) {
      if (states[i].score > best) {
        best = states[i].score;
        idx = i;
      }
    }
    return { idx, score: best };
  }, [finished, states]);

  function goBack() {
    if (props?.setTab) return props.setTab("batard_config", { config: cfg });
    window.history.back();
  }

  // Keypad handlers
  const onNumber = (v: number) => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setBustMsg(null);
    setCurrentThrow((prev) => [...prev, { v, mult: multiplier, label: `${multiplier}x${v}` }]);
  };

  const onBull = () => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setBustMsg(null);
    // Bull: keypad in app usually uses 25 as value; double-bull can be via multiplier=2 with 25? Here accept 25 with mult.
    const v = 25;
    setCurrentThrow((prev) => [...prev, { v, mult: multiplier, label: multiplier === 2 ? "DBULL" : "BULL" }]);
  };

  const onUndo = () => {
    if (finished) return;
    setBustMsg(null);
    setCurrentThrow((prev) => prev.slice(0, -1));
  };

  const onCancel = () => {
    if (finished) return;
    setBustMsg(null);
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const onValidate = () => {
    if (finished) return;
    // pad to 3 darts (engine expects 3 but will validate only those present)
    const darts = [...currentThrow];
    // If user validates with 0 dart => treat as fail (no hit) by sending empty
    throwVisit(darts.map((d) => ({ value: d.v === 25 && d.mult === 2 ? 50 : d.v, multiplier: d.mult })));
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const active = states[currentPlayerIndex];
  const activeRoundIdx = active?.roundIndex ?? 0;

  return (
    <div className="page">
      <PageHeader
        title="BÂTARD"
        tickerSrc={tickerBatard}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="BÂTARD" content={INFO_TEXT} />}
      />

      <Section title={t("game.status", "Statut")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Joueur: <span style={{ opacity: 0.9 }}>{active?.id}</span>
          </div>
          <div style={{ fontWeight: 700, opacity: 0.9 }}>
            {roundTitle(currentRound, activeRoundIdx)}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {states.map((p, idx) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  idx === currentPlayerIndex ? "rgba(255,215,0,0.10)" : "rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 800 }}>{p.id}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Round {Math.min(p.roundIndex + 1, cfg.batard.rounds.length)}/{cfg.batard.rounds.length}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{p.score}</div>
            </div>
          ))}
        </div>

        {bustMsg && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.12)" }}>
            {bustMsg}
          </div>
        )}
      </Section>

      {finished && winner ? (
        <Section title="🏁 Fin de partie">
          <div style={{ fontWeight: 900, fontSize: 22 }}>
            Gagnant: {states[winner.idx].id} — {winner.score} pts
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => props?.setTab?.("games")}>
              Retour jeux
            </button>
            <button className="btn" onClick={goBack}>
              Rejouer / Reconfigurer
            </button>
          </div>
        </Section>
      ) : (
        <div style={{ paddingBottom: 120 }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onNumber={onNumber}
            onBull={onBull}
            onUndo={onUndo}
            onCancel={onCancel}
            onValidate={onValidate}
            hidePreview={false}
          />
        </div>
      )}
    </div>
  );
}
