// @ts-nocheck
// =============================================================
// src/pages/dice/DiceYamsPlay.tsx
// Yam's — Play (5 dés, 2 relances, scorecard)
// - Pass&play 2 joueurs
// - Une catégorie par manche / joueur
// - Historique via onFinish(match)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import type { DiceConfig, DicePlayer } from "../../lib/diceTypes";
import { YAMS_CATEGORIES, scoreCategory, rollDice, totalWithBonus, upperSubtotal } from "../../lib/diceYamsEngine";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

type Scorecard = Partial<Record<string, number | null>>;

const LS_KEY = "dc_dice_yams_v1";

function safeJSON<T>(raw: any, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function DiceYamsPlay({ go, params, onFinish }: Props) {
  const { theme } = useTheme() as any;

  const players: DicePlayer[] = params?.players || [];
  const cfg: DiceConfig = params?.config || { mode: "yams", diceCount: 5, sets: 1, yamsRounds: 13, yamsRerolls: 2, yamsUpperBonusThreshold: 63, yamsUpperBonusValue: 35 };

  const diceCount = 5;
  const maxRerolls = Number(cfg?.yamsRerolls ?? 2) || 2;
  const threshold = Number(cfg?.yamsUpperBonusThreshold ?? 63) || 63;
  const bonusValue = Number(cfg?.yamsUpperBonusValue ?? 35) || 35;

  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [dice, setDice] = React.useState<number[]>(Array.from({ length: diceCount }, () => 1));
  const [keep, setKeep] = React.useState<boolean[]>(Array.from({ length: diceCount }, () => false));
  const [rollsLeft, setRollsLeft] = React.useState<number>(maxRerolls + 1); // incl first roll
  const [rolledOnce, setRolledOnce] = React.useState(false);

  const [cards, setCards] = React.useState<Record<string, Scorecard>>(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return safeJSON(raw, {});
    const init: any = {};
    for (const p of players) init[p.id] = {};
    return init;
  });

  const [finished, setFinished] = React.useState(false);

  const cur = players?.[currentIdx] || null;
  const curCard: Scorecard = (cur && cards?.[cur.id]) || {};

  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(cards || {}));
  }, [cards]);

  const allDone = React.useMemo(() => {
    if (!players?.length) return false;
    return players.every((p) => {
      const c = cards?.[p.id] || {};
      return YAMS_CATEGORIES.every((k) => c[k.id] !== undefined && c[k.id] !== null);
    });
  }, [cards, players]);

  React.useEffect(() => {
    if (allDone && !finished) {
      setFinished(true);

      const totals = players.map((p) => {
        const c = cards?.[p.id] || {};
        return { id: p.id, total: totalWithBonus(c as any, threshold, bonusValue) };
      });
      totals.sort((a, b) => b.total - a.total);
      const winner = totals[0]?.id || null;

      const match = {
        kind: "dicegame",
        sport: "dicegame",
        mode: "yams",
        createdAt: Date.now(),
        finishedAt: Date.now(),
        players: players.map((p) => ({ id: p.id, name: p.name })),
        payload: {
          config: cfg,
          yams: { threshold, bonusValue },
          scorecards: cards,
          totals,
          winnerId: winner,
          stats: {
            players: totals.map((t) => ({
              id: t.id,
              score: t.total,
              wins: t.id === winner ? 1 : 0,
              losses: t.id === winner ? 0 : 1,
              setsWon: t.id === winner ? 1 : 0,
            })),
          },
        },
        summary: {
          mode: "yams",
          winnerId: winner,
          totals,
        },
      };

      onFinish?.(match);
    }
  }, [allDone, finished, cards, players, threshold, bonusValue, cfg, onFinish]);

  function resetTurn(nextIdx: number) {
    setCurrentIdx(nextIdx);
    setDice(Array.from({ length: diceCount }, () => 1));
    setKeep(Array.from({ length: diceCount }, () => false));
    setRollsLeft(maxRerolls + 1);
    setRolledOnce(false);
  }

  function doRoll() {
    if (!cur || finished) return;
    if (rollsLeft <= 0) return;
    const next = rollDice(diceCount, keep, dice);
    setDice(next);
    setRolledOnce(true);
    setRollsLeft((x) => Math.max(0, x - 1));
  }

  function toggleKeep(i: number) {
    if (!rolledOnce || finished) return;
    setKeep((k) => {
      const next = [...k];
      next[i] = !next[i];
      return next;
    });
  }

  function pickCategory(catId: string) {
    if (!cur || finished) return;
    if (!rolledOnce) return;
    if (curCard?.[catId] !== undefined && curCard?.[catId] !== null) return;

    const val = scoreCategory(dice, catId as any);
    setCards((prev) => {
      const next = { ...(prev || {}) };
      const cc = { ...(next[cur.id] || {}) };
      cc[catId] = val;
      next[cur.id] = cc;
      return next;
    });

    // next player
    const nextIdx = (currentIdx + 1) % players.length;
    resetTurn(nextIdx);
  }

  const curUpper = upperSubtotal(curCard as any);
  const curTotal = totalWithBonus(curCard as any, threshold, bonusValue);

  return (
    <div style={{ padding: 18 }}>
      <BackDot onClick={() => go("dice_games")} />
      <InfoDot
        title="Yam's"
        desc={`5 dés • ${maxRerolls} relances • Bonus haut: ${threshold} → +${bonusValue}\n\n1 catégorie par tour.`}
      />

      <div style={{ maxWidth: 900, margin: "48px auto 0", display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* Left: current player + dice */}
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            background: theme.card ?? "rgba(0,0,0,0.35)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18, letterSpacing: 0.5 }}>
            {finished ? "Partie terminée" : `Au tour de : ${cur?.name || "—"}`}
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
            Lancers restants : {rollsLeft} {rolledOnce ? "" : "(lance au moins 1 fois)"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 14 }}>
            {dice.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleKeep(i)}
                style={{
                  height: 56,
                  borderRadius: 14,
                  border: `1px solid ${keep[i] ? (theme.accent ?? "#b6ff00") : (theme.borderSoft ?? "rgba(255,255,255,0.14)")}`,
                  background: keep[i] ? "rgba(182,255,0,0.14)" : "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontWeight: 1000,
                  fontSize: 20,
                  cursor: rolledOnce && !finished ? "pointer" : "not-allowed",
                }}
                title={keep[i] ? "Gardé" : "Cliquer pour garder"}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={doRoll}
            disabled={finished || rollsLeft <= 0}
            style={{
              marginTop: 14,
              width: "100%",
              height: 52,
              borderRadius: 16,
              border: "none",
              background: !finished && rollsLeft > 0 ? theme.accent ?? "#b6ff00" : "rgba(255,255,255,0.12)",
              color: "#000",
              fontWeight: 1000,
              letterSpacing: 1,
              cursor: !finished && rollsLeft > 0 ? "pointer" : "not-allowed",
              boxShadow: !finished && rollsLeft > 0 ? "0 10px 30px rgba(182,255,0,0.25)" : "none",
            }}
          >
            Lancer
          </button>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, background: "rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Sous-total haut</div>
            <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 4 }}>{curUpper}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Total (avec bonus)</div>
            <div style={{ fontSize: 20, fontWeight: 1000, marginTop: 4 }}>{curTotal}</div>
          </div>
        </div>

        {/* Right: scorecard */}
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            background: theme.card ?? "rgba(0,0,0,0.35)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>Feuille de score</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              {players.map((p, i) => (
                <span key={p.id} style={{ marginLeft: 10, color: i === currentIdx ? (theme.accent ?? "#b6ff00") : "rgba(255,255,255,0.65)" }}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Catégorie</div>
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>Score</div>
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>Choisir</div>

            {YAMS_CATEGORIES.map((c) => {
              const already = curCard?.[c.id] !== undefined && curCard?.[c.id] !== null;
              const preview = scoreCategory(dice, c.id as any);
              const shown = already ? Number(curCard?.[c.id] ?? 0) : preview;

              return (
                <React.Fragment key={c.id}>
                  <div style={{ padding: "10px 12px", borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, background: "rgba(0,0,0,0.25)" }}>
                    <div style={{ fontWeight: 800 }}>{c.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>{c.group === "upper" ? "Haut" : "Bas"}</div>
                  </div>

                  <div style={{ padding: "10px 12px", borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, background: "rgba(0,0,0,0.25)", textAlign: "right", fontWeight: 1000 }}>
                    {shown}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                    <button
                      disabled={finished || !rolledOnce || already}
                      onClick={() => pickCategory(c.id)}
                      style={{
                        height: 44,
                        padding: "0 14px",
                        borderRadius: 14,
                        border: "none",
                        background: (!finished && rolledOnce && !already) ? (theme.accent ?? "#b6ff00") : "rgba(255,255,255,0.12)",
                        color: "#000",
                        fontWeight: 1000,
                        cursor: (!finished && rolledOnce && !already) ? "pointer" : "not-allowed",
                      }}
                    >
                      Valider
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {finished && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 16, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, background: "rgba(0,0,0,0.25)" }}>
              <div style={{ fontWeight: 1000 }}>Résultat</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {players.map((p) => {
                  const total = totalWithBonus((cards?.[p.id] || {}) as any, threshold, bonusValue);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ opacity: 0.85 }}>{p.name}</div>
                      <div style={{ fontWeight: 1000 }}>{total}</div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => { localStorage.removeItem(LS_KEY); go("dice_home"); }}
                style={{
                  marginTop: 12,
                  width: "100%",
                  height: 48,
                  borderRadius: 16,
                  border: "none",
                  background: theme.accent ?? "#b6ff00",
                  color: "#000",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                Retour accueil Dice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
