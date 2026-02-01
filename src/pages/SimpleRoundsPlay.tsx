import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { History } from "../lib/history";

const clamp = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(180, v));
};

export default function SimpleRoundsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const variantId: string = props?.variantId ?? "count_up";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];

  const cfg: CommonConfig =
    (props?.params?.config as CommonConfig) ||
    (props?.config as CommonConfig) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 0,
      humansCount: 1,
    };

  const [roundIdx, setRoundIdx] = useState(0); // 0..cfg.rounds
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [visit, setVisit] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  // Stats (par joueur) — 1 saisie = 1 volée (3 darts)
  const [dartsByP, setDartsByP] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [pointsByP, setPointsByP] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [bestVisitByP, setBestVisitByP] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [visitsByP, setVisitsByP] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));

  // Auto-play bots
  // Guard (avoid double auto-play)
  const botActRef = useRef<{ key: string } | null>(null);

  // Persist history once
  const savedRef = useRef(false);

  const isFinished = gameOver || roundIdx >= cfg.rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx != null) return { idx: winnerIdx, score: scores[winnerIdx] };
    const idx = spec?.computeWinnerOnEnd(scores) ?? 0;
    return { idx, score: scores[idx] };
  }, [isFinished, winnerIdx, scores, spec]);

  const configTab = useMemo(() => {
    // Note: keep this map minimal + explicit to avoid wrong navigation
    const map: Record<string, string> = {
      count_up: "count_up_config",
      halve_it: "halve_it_config",
      bobs_27: "bobs27_config",
      bobs27: "bobs27_config",
      enculette: "enculette_config",
      super_bull: "super_bull_config",
      happy_mille: "happy_mille_config",
      game_170: "game_170_config",
    };
    return map[String(variantId || "")] || "games";
  }, [variantId]);

  const botMask = useMemo(() => {
    // Convention: si botsEnabled, les N premiers sont humains, le reste = bots
    if (!cfg?.botsEnabled) return Array.from({ length: cfg.players }, () => false);
    const humans = Math.min(Math.max(1, Number(cfg?.humansCount ?? 1)), Math.max(1, cfg.players));
    return Array.from({ length: cfg.players }, (_, i) => i >= humans);
  }, [cfg?.botsEnabled, cfg.players, (cfg as any)?.humansCount]);
function goBack() {
    if (props?.setTab) {
      // Retour logique vers la config du mode (plutôt que sortir du flow)
      if (configTab && configTab !== "games") return props.setTab(configTab, { config: cfg });
      return props.setTab("games");
    }
    window.history.back();
  }

  function advanceTurn(nextScores: number[], forcedWinner: number | null) {
    setScores(nextScores);

    if (forcedWinner != null) {
      setWinnerIdx(forcedWinner);
      setGameOver(true);
      return;
    }

    // next player
    let nextPlayer = playerIdx + 1;
    let nextRound = roundIdx;

    if (nextPlayer >= cfg.players) {
      nextPlayer = 0;
      nextRound = roundIdx + 1;
    }

    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);

    if (nextRound >= cfg.rounds) {
      setGameOver(true);
    }
  }

  function applyVisitFor(pIdx: number, rawVisit: number) {
    if (!spec) return;
    const v = clamp(rawVisit);

    const res = spec.applyVisit({
      visit: v,
      currentScore: scores[pIdx] ?? 0,
      objective: cfg.objective,
      roundIndex: roundIdx,
    });

    const nextScores = [...scores];
    nextScores[pIdx] = (nextScores[pIdx] ?? 0) + (res.delta ?? 0);

    // stats local match
    setVisitsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + 1;
      return nx;
    });
    setDartsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + 3;
      return nx;
    });
    setPointsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + (res.delta ?? 0);
      return nx;
    });
    setBestVisitByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = Math.max(nx[pIdx] ?? 0, v);
      return nx;
    });

    const forceWin = !!res.forceWin;
    advanceTurn(nextScores, forceWin ? pIdx : null);
  }

  function validate() {
    applyVisitFor(playerIdx, visit);
    setVisit(0);
  }

  function resetMatch() {
    savedRef.current = false;
    botActRef.current = null;
    setRoundIdx(0);
    setPlayerIdx(0);
    setScores(Array.from({ length: cfg.players }, () => 0));
    setVisit(0);
    setGameOver(false);
    setWinnerIdx(null);
    setVisitsByP(Array.from({ length: cfg.players }, () => 0));
    setDartsByP(Array.from({ length: cfg.players }, () => 0));
    setPointsByP(Array.from({ length: cfg.players }, () => 0));
    setBestVisitByP(Array.from({ length: cfg.players }, () => 0));
  }

  function botPickVisit(): number {
    const lvl = String(cfg?.botLevel || "normal");
    const r = Math.random();

    // Mode spécial SUPER BULL : modèle bull (25/50) sur 3 fléchettes
    if (variantId === "super_bull") {
      const pBull = lvl === "hard" ? 0.38 : lvl === "easy" ? 0.12 : 0.24; // probabilité d'outer bull (25)
      const pDBull = lvl === "hard" ? 0.18 : lvl === "easy" ? 0.03 : 0.09; // probabilité de double bull (50)
      let total = 0;
      for (let d = 0; d < 3; d++) {
        const x = Math.random();
        if (x < pDBull) total += 50;
        else if (x < pDBull + pBull) total += 25;
        else total += 0;
      }
      return clamp(total); // 0..150
    }

    // Mode spécial 170 : le bot doit parfois sortir 170
    if (variantId === "game_170") {
      const p170 = lvl === "hard" ? 0.22 : lvl === "easy" ? 0.04 : 0.11;
      if (r < p170) return 170;
      // sinon volée “normale”
      const base = lvl === "hard" ? 85 : lvl === "easy" ? 35 : 60;
      const span = lvl === "hard" ? 70 : lvl === "easy" ? 55 : 65;
      return clamp(base + (Math.random() - 0.5) * span);
    }

    // Générateur simple par difficulté
    const base = lvl === "hard" ? 95 : lvl === "easy" ? 35 : 70;
    const span = lvl === "hard" ? 85 : lvl === "easy" ? 70 : 80;

    // Petites chances de gros score
    const spike = lvl === "hard" ? 0.12 : lvl === "easy" ? 0.02 : 0.06;
    if (Math.random() < spike) {
      const high = lvl === "hard" ? 140 : 120;
      return clamp(high + Math.random() * 40);
    }

    // Petites chances de zéro (important pour enculette)
    const miss = lvl === "hard" ? 0.02 : lvl === "easy" ? 0.10 : 0.06;
    if (Math.random() < miss) return 0;

    return clamp(base + (Math.random() - 0.5) * span);
  }

  // Auto-play bots
  useEffect(() => {
    if (isFinished) return;
    if (!cfg?.botsEnabled) return;
    if (!botMask[playerIdx]) return;

    const key = `${roundIdx}:${playerIdx}:${scores.join(",")}`;
    if (botActRef.current?.key === key) return;
    botActRef.current = { key };

    const timer = window.setTimeout(() => {
      const v = botPickVisit();
      applyVisitFor(playerIdx, v);
    }, 520);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.botsEnabled, botMask, playerIdx, roundIdx, isFinished, scores.join("|")]);

  // Persist history + summary once when finished
  useEffect(() => {
    if (!isFinished) return;
    if (savedRef.current) return;
    if (!winner) return;

    savedRef.current = true;

    const now = Date.now();
    const id =
      (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `sr_${variantId}_${now}_${Math.random().toString(16).slice(2)}`);

    const players = Array.from({ length: cfg.players }, (_, i) => ({
      id: `p${i + 1}`,
      name: botMask[i] ? `${t("generic.player", "Joueur")} ${i + 1} (BOT)` : `${t("generic.player", "Joueur")} ${i + 1}`,
    }));

    const avg3ByPlayer: Record<string, number> = {};
    const dartsMap: Record<string, number> = {};
    const bestVisitMap: Record<string, number> = {};
    const bestCheckoutMap: Record<string, number> = {};

    for (let i = 0; i < cfg.players; i++) {
      const pid = `p${i + 1}`;
      const visits = visitsByP[i] || 0;
      const darts = dartsByP[i] || visits * 3;
      const pts = pointsByP[i] || 0;
      const avg3 = visits > 0 ? pts / visits : 0;
      avg3ByPlayer[pid] = Math.round(avg3 * 100) / 100;
      dartsMap[pid] = darts;
      bestVisitMap[pid] = bestVisitByP[i] || 0;
      bestCheckoutMap[pid] = 0;
    }

    const rec: any = {
      id,
      matchId: id,
      kind: String(variantId || "simple_rounds"),
      status: "finished",
      createdAt: now,
      updatedAt: now,
      players,
      winnerId: `p${winner.idx + 1}`,
      game: {
        mode: String(variantId || "simple_rounds"),
        rounds: cfg.rounds,
        objective: cfg.objective,
        botsEnabled: !!cfg.botsEnabled,
        botLevel: cfg.botLevel,
      },
      summary: {
        legs: 1,
        avg3ByPlayer,
        darts: dartsMap,
        bestVisitByPlayer: bestVisitMap,
        bestCheckoutByPlayer: bestCheckoutMap,
        // co: 0 (pas de checkout sur ces variantes)
      },
      payload: {
        variantId,
        config: cfg,
        scores,
      },
    };

    // best effort: don't break gameplay if history fails
    Promise.resolve(History.upsert(rec)).catch((e) => console.warn("History.upsert(simpleRounds) failed:", e));
  }, [
    isFinished,
    winner,
    variantId,
    cfg,
    botMask,
    visitsByP,
    dartsByP,
    pointsByP,
    bestVisitByP,
    scores,
    t,
  ]);

  if (!spec) {
    return (
      <div className="page" style={{ padding: 16, color: "#fff" }}>
        Variante inconnue: {String(variantId)}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={spec.title}
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={spec.infoTitle} content={spec.infoText} />}
      />

      <div style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 1000 }}>
            {t("generic.round", "Round")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
          </div>
          {!isFinished && (
            <div style={{ fontWeight: 900, opacity: 0.9 }}>
              {t("generic.turn", "Tour")} : {t("generic.player", "Joueur")} {playerIdx + 1}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.players}, minmax(0,1fr))`, gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active ? "1px solid rgba(120,255,200,0.35)" : "1px solid rgba(255,255,255,0.10)",
                  background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {t("generic.player", "Joueur")} {i + 1}
                  {botMask[i] ? " • BOT" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {!isFinished && !botMask[playerIdx] && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.visit", "VOLÉE")} — {variantId === "super_bull" ? t("generic.input", "BULL (0..150, paliers 25)") : t("generic.input", "entre un score 0..180")}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <input
                value={String(visit)}
                onChange={(e) => setVisit(clamp(Number(e.target.value)))}
                inputMode="numeric"
                style={{
                  flex: 1,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  padding: "12px 12px",
                  fontWeight: 900,
                  outline: "none",
                }}
              />

              <button
                onClick={validate}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,200,0.22)",
                  background: "rgba(120,255,200,0.14)",
                  padding: "12px 14px",
                  fontWeight: 1000,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                {t("generic.validate", "Valider")}
              </button>
            
            {/* SuperBull presets */}
            {variantId === "super_bull" && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[0, 25, 50, 75, 100, 125, 150].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisit(v)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(0,0,0,0.25)",
                      padding: "8px 12px",
                      fontWeight: 1000,
                      cursor: "pointer",
                      color: "#fff",
                    }}
                  >
                    {v}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setVisit((prev) => clamp(prev + 25))}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(0,0,0,0.25)",
                    padding: "8px 12px",
                    fontWeight: 1000,
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  +25
                </button>
                <button
                  onClick={() => setVisit((prev) => clamp(prev - 25))}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(0,0,0,0.25)",
                    padding: "8px 12px",
                    fontWeight: 1000,
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  −25
                </button>
              </div>
            )}
</div>
          </div>
        )}

        {!isFinished && botMask[playerIdx] && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              padding: "12px 12px",
              fontWeight: 900,
              opacity: 0.9,
            }}
          >
            BOT…
          </div>
        )}

        {isFinished && winner && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,215,100,0.35)",
              background: "rgba(255,215,100,0.12)",
              fontWeight: 1000,
            }}
          >
            {t("generic.winner", "Gagnant")} : {t("generic.player", "Joueur")} {winner.idx + 1} — {winner.score}

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={resetMatch}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,200,0.22)",
                  background: "rgba(120,255,200,0.14)",
                  padding: "10px 12px",
                  fontWeight: 1000,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                {t("generic.playAgain", "Rejouer")}
              </button>

              <button
                onClick={goBack}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  padding: "10px 12px",
                  fontWeight: 1000,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                {t("generic.backToConfig", "Retour config")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
