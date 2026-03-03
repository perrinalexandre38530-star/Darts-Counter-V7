// @ts-nocheck
// =============================================================
// src/pages/dice/DicePlay.tsx
// Play DICE — mode "duel" (stable) + onFinish() pour History
// - Roll sur le joueur actif
// - Switch de tour
// - Détection victoire (score >= cible)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import { rollDice, sumDice } from "../../lib/diceEngine";
import { loadDiceState, saveDiceState, clearDiceState } from "../../lib/diceStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function DicePlay({ go, params, onFinish }: Props) {
  const { theme } = useTheme() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#7cff6d";
  const textMain = theme?.colors?.text ?? "#fff";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,.72)";
  const cardBg = theme?.colors?.card ?? "rgba(255,255,255,.06)";
  const stroke = theme?.colors?.stroke ?? "rgba(255,255,255,.10)";

  const [st, setSt] = React.useState(() => loadDiceState());
  const [rolling, setRolling] = React.useState(false);

  React.useEffect(() => {
    // Si params contiennent config/players, mais pas de state en LS, on tente de réhydrater (au cas où)
    if (!st && params?.config && params?.players) {
      const players = params.players;
      const cfg = params.config;
      const next = {
        createdAt: Date.now(),
        config: cfg,
        players,
        scores: Object.fromEntries(players.map((p: any) => [p.id, 0])),
        setsWon: Object.fromEntries(players.map((p: any) => [p.id, 0])),
        currentTurnId: players[0]?.id,
        lastRoll: undefined,
        finished: false,
        winnerId: null,
      };
      saveDiceState(next);
      setSt(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!st) {
    return (
      <div className="pageWrap" style={{ padding: 14, color: textMain }}>
        <BackDot onClick={() => go("games")} />
        <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: cardBg, border: `1px solid ${stroke}` }}>
          Aucun match Dice en cours.
          <div style={{ marginTop: 10 }}>
            <button onClick={() => go("dice_config")} style={{ padding: "10px 12px", borderRadius: 12, border: "none", fontWeight: 800, background: primary }}>
              Configurer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cfg = st.config || { targetScore: 100, diceCount: 2, sets: 1 };
  const players = st.players || [];
  const a = players[0];
  const b = players[1];

  const scoreA = Number(st.scores?.[a?.id] ?? 0) || 0;
  const scoreB = Number(st.scores?.[b?.id] ?? 0) || 0;

  const turnId = st.currentTurnId;
  const isAturn = turnId === a?.id;

  const target = Number(cfg.targetScore ?? 100) || 100;

  function nextTurn(currentId: string) {
    const ids = players.map((p: any) => p.id);
    const i = Math.max(0, ids.indexOf(currentId));
    return ids[(i + 1) % ids.length];
  }

  function doRoll() {
    if (rolling || st.finished) return;
    setRolling(true);

    const dice = rollDice(Number(cfg.diceCount ?? 2) || 2);
    const add = sumDice(dice);

    const current = st.currentTurnId;
    const newScores = { ...(st.scores || {}) };
    newScores[current] = (Number(newScores[current] || 0) || 0) + add;

    let finished = false;
    let winnerId: string | null = null;

    if (newScores[current] >= target) {
      finished = true;
      winnerId = current;
    }

    const next = {
      ...st,
      lastRoll: dice,
      scores: newScores,
      currentTurnId: finished ? st.currentTurnId : nextTurn(st.currentTurnId),
      finished,
      winnerId,
      finishedAt: finished ? Date.now() : undefined,
    };

    saveDiceState(next);
    setSt(next);
    setRolling(false);

    if (finished) {
      const match = {
        kind: "dicegame",
        sport: "dicegame",
        mode: cfg?.mode || "duel",
        createdAt: next.createdAt,
        finishedAt: next.finishedAt,
        winnerId,
        config: cfg,
        players: players.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatarDataUrl: p.avatarDataUrl || null,
          score: Number(newScores[p.id] || 0) || 0,
          setsWon: Number(next.setsWon?.[p.id] || 0) || 0,
        })),
        summary: {
          mode: cfg?.mode || "duel",
          durationMs: Number(next.finishedAt || 0) - Number(next.createdAt || 0),
          targetScore: target,
          diceCount: Number(cfg.diceCount || 2) || 2,
        },
        payload: next,
      };

      try { onFinish?.(match); } catch {}
      try { clearDiceState(); } catch {}
    }
  }

  const last = Array.isArray(st.lastRoll) ? st.lastRoll : [];
  const lastSum = sumDice(last);

  return (
    <div className="pageWrap" style={{ padding: 14, color: textMain }}>
      <BackDot onClick={() => go("games")} />
      <InfoDot title="Dice Duel" lines={[`Cible: ${target}`, `Dés: ${cfg.diceCount || 2}`, isAturn ? `Tour: ${a?.name}` : `Tour: ${b?.name}`]} />

      <div style={{ marginTop: 10, borderRadius: 18, padding: 14, background: cardBg, border: `1px solid ${stroke}` }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.4, fontSize: 18 }}>
          🎲 {a?.name} <span style={{ opacity: 0.6 }}>vs</span> {b?.name}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, marginTop: 14 }}>
          <PlayerCard p={a} score={scoreA} active={isAturn} primary={primary} />
          <div style={{ fontSize: 40, fontWeight: 950, textAlign: "center", minWidth: 90 }}>
            {scoreA} <span style={{ opacity: 0.35 }}>-</span> {scoreB}
          </div>
          <PlayerCard p={b} score={scoreB} active={!isAturn} primary={primary} />
        </div>

        <button
          onClick={doRoll}
          disabled={rolling || st.finished}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 16,
            fontWeight: 950,
            letterSpacing: 0.4,
            border: "none",
            cursor: rolling || st.finished ? "not-allowed" : "pointer",
            background: primary,
            color: "#001a05",
            boxShadow: `0 0 20px ${primary}55`,
            opacity: rolling || st.finished ? 0.6 : 1,
          }}
        >
          Lancer
        </button>

        <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: `1px solid ${stroke}` }}>
          <div style={{ fontSize: 12, color: textSoft }}>Dernier lancer</div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {last.length ? (
              <>
                {last.map((d: any, idx: number) => (
                  <Die key={idx} v={Number(d) || 1} primary={primary} />
                ))}
                <div style={{ marginLeft: 8, fontWeight: 900, opacity: 0.9 }}>
                  = {lastSum}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.65 }}>—</div>
            )}
          </div>
        </div>

        {st.finished ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: `1px solid ${stroke}`, background: "rgba(0,0,0,.15)" }}>
            <div style={{ fontWeight: 950 }}>Terminé</div>
            <div style={{ marginTop: 4, color: textSoft }}>
              Gagnant : <span style={{ color: primary, fontWeight: 900 }}>{players.find((p: any) => p.id === st.winnerId)?.name}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlayerCard({ p, score, active, primary }: any) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        border: `1px solid rgba(255,255,255,.10)`,
        background: active ? `${primary}22` : "rgba(0,0,0,.18)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ProfileAvatar size={44} name={p?.name || ""} src={p?.avatarDataUrl || null} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
            {p?.name || "—"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 950, minWidth: 44, textAlign: "right" }}>{score}</div>
    </div>
  );
}

function Die({ v, primary }: any) {
  const n = Math.max(1, Math.min(6, Number(v) || 1));
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.25)",
        border: `1px solid ${primary}55`,
        boxShadow: `0 0 14px ${primary}22`,
        fontWeight: 950,
        fontSize: 18,
      }}
    >
      {n}
    </div>
  );
}
