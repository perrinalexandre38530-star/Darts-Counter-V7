// @ts-nocheck
// =============================================================
// src/pages/dice/DicePlay.tsx
// Play DICE — DUEL (UI inspirée X01/PingPong : header score + avatars en fond)
// - Roll / Undo / Finish
// - onFinish(match) pour History/StatsHub via App
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import { rollDice, sumDice } from "../../lib/diceEngine";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

function clamp(n: any, a: number, b: number) {
  const x = Number(n) || 0;
  return Math.max(a, Math.min(b, x));
}

export default function DicePlay({ go, params, onFinish }: Props) {
  const { theme } = useTheme() as any;

  const config = params?.config || { mode: "duel", targetScore: 100, diceCount: 2, sets: 1 };
  const players = Array.isArray(params?.players) ? params.players : [];

  const A = players?.[0] || { id: "A", name: "A" };
  const B = players?.[1] || { id: "B", name: "B" };

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#8b5cf6";

  const [scores, setScores] = React.useState<Record<string, number>>({
    [A.id]: 0,
    [B.id]: 0,
  });
  const [setsWon, setSetsWon] = React.useState<Record<string, number>>({
    [A.id]: 0,
    [B.id]: 0,
  });
  const [turnId, setTurnId] = React.useState<string>(A.id);
  const [lastRoll, setLastRoll] = React.useState<number[] | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [rulesOpen, setRulesOpen] = React.useState(false);

  const target = clamp(config?.targetScore, 10, 9999);
  const diceCount = clamp(config?.diceCount, 1, 10);
  const setsToWin = clamp(config?.sets, 1, 9);

  const isFinished = setsWon[A.id] >= setsToWin || setsWon[B.id] >= setsToWin;
  const winnerId = setsWon[A.id] >= setsToWin ? A.id : setsWon[B.id] >= setsToWin ? B.id : null;

  const bgA = A?.avatarDataUrl || null;
  const bgB = B?.avatarDataUrl || null;

  function doRoll() {
    if (isFinished) return;
    const dice = rollDice(diceCount);
    const delta = sumDice(dice);

    setHistory((h) => [...h, { turnId, delta, dice }]);
    setLastRoll(dice);

    setScores((s) => {
      const next = { ...s, [turnId]: (Number(s[turnId]) || 0) + delta };
      return next;
    });

    // change turn after roll
    setTurnId((id) => (id === A.id ? B.id : A.id));
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;

    setHistory((h) => h.slice(0, -1));
    setLastRoll(null);

    setScores((s) => {
      const next = { ...s };
      next[last.turnId] = Math.max(0, (Number(next[last.turnId]) || 0) - (Number(last.delta) || 0));
      return next;
    });

    setTurnId(last.turnId);
  }

  // detect set win
  React.useEffect(() => {
    if (isFinished) return;

    const a = Number(scores[A.id]) || 0;
    const b = Number(scores[B.id]) || 0;

    const reachedA = a >= target;
    const reachedB = b >= target;
    if (!reachedA && !reachedB) return;

    const winId = reachedA && reachedB ? (a >= b ? A.id : B.id) : reachedA ? A.id : B.id;

    setSetsWon((sw) => ({ ...sw, [winId]: (Number(sw[winId]) || 0) + 1 }));
    // reset scores for next set
    setScores({ [A.id]: 0, [B.id]: 0 });
    setHistory([]);
    setLastRoll(null);
    setTurnId(winId); // winner starts next
  }, [scores[A.id], scores[B.id]]);

  function finishMatch() {
    const now = Date.now();
    const m = {
      id: `dice-${now}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "dicegame",
      sport: "dicegame",
      createdAt: now,
      finishedAt: now,
      winnerId: winnerId,
      players: [
        { id: A.id, name: A.name, avatarDataUrl: A.avatarDataUrl, score: scores[A.id], setsWon: setsWon[A.id] },
        { id: B.id, name: B.name, avatarDataUrl: B.avatarDataUrl, score: scores[B.id], setsWon: setsWon[B.id] },
      ],
      payload: {
        config: { mode: "duel", targetScore: target, diceCount, sets: setsToWin },
        scores,
        setsWon,
      },
      summary: {
        targetScore: target,
        diceCount,
        setsToWin,
      },
    };

    try {
      onFinish?.(m);
    } catch {}

    // fallback: go history dice later; for now, back to games
    try {
      go("games");
    } catch {}
  }

  const headerWrap: React.CSSProperties = {
    position: "relative",
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: theme.card,
    boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
  };

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 110, background: theme.bg, color: theme.text }}>
      {/* Header score */}
      <div style={headerWrap}>
        {/* Background avatars (zoom + gradient center out) */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          <div
            style={{
              flex: 1,
              backgroundImage: bgA ? `url(${bgA})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(0px)",
              transform: "scale(1.18)",
              opacity: bgA ? 0.22 : 0,
              maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div
            style={{
              flex: 1,
              backgroundImage: bgB ? `url(${bgB})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: "scale(1.18)",
              opacity: bgB ? 0.22 : 0,
              maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>

        {/* Top overlay dots */}
        <div style={{ position: "absolute", left: 10, top: 10, zIndex: 3 }}>
          <BackDot onClick={() => go("dice_config", { players, config })} />
        </div>
        <div style={{ position: "absolute", right: 10, top: 10, zIndex: 3 }}>
          <InfoDot onClick={() => setRulesOpen(true)} glow={primary + "88"} />
        </div>

        <div style={{ position: "relative", zIndex: 2, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <ProfileAvatar
                size={44}
                profile={{ id: A.id, name: A.name, avatarDataUrl: A.avatarDataUrl }}
                ring
                glow
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {A.name} {turnId === A.id && !isFinished ? "•" : ""}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Sets: {setsWon[A.id] || 0}</div>
              </div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  fontSize: 12,
                  opacity: 0.85,
                  textTransform: "uppercase",
                }}
              >
                Score
              </div>
              <div
                style={{
                  fontWeight: 1100,
                  fontSize: 42,
                  lineHeight: 1,
                  textShadow: `0 0 18px ${primary}66`,
                  whiteSpace: "nowrap",
                }}
              >
                {scores[A.id] || 0} <span style={{ opacity: 0.65 }}>-</span> {scores[B.id] || 0}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Cible {target} • Dés {diceCount}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, justifyContent: "flex-end" }}>
              <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {B.name} {turnId === B.id && !isFinished ? "•" : ""}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Sets: {setsWon[B.id] || 0}</div>
              </div>
              <ProfileAvatar
                size={44}
                profile={{ id: B.id, name: B.name, avatarDataUrl: B.avatarDataUrl }}
                ring
                glow
              />
            </div>
          </div>

          {lastRoll && (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.92 }}>
              Dernier lancer : <span style={{ fontWeight: 1000 }}>{lastRoll.join(" - ")}</span> ( +{sumDice(lastRoll)} )
            </div>
          )}

          {isFinished && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(0,0,0,0.22)",
                fontWeight: 1000,
                textAlign: "center",
                textShadow: `0 0 18px ${primary}55`,
              }}
            >
              ✅ Match terminé — vainqueur : {winnerId === A.id ? A.name : B.name}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <button
          onClick={doRoll}
          disabled={isFinished}
          style={{
            borderRadius: 16,
            padding: "14px 12px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: isFinished ? "rgba(255,255,255,0.10)" : `linear-gradient(90deg, ${primary}, rgba(255,255,255,0.92))`,
            color: isFinished ? "rgba(255,255,255,0.55)" : "#0b0b12",
            fontWeight: 1100,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            boxShadow: isFinished ? "none" : `0 0 18px ${primary}66`,
            cursor: isFinished ? "not-allowed" : "pointer",
          }}
        >
          Roll
        </button>

        <button
          onClick={undo}
          disabled={!history.length || isFinished}
          style={{
            borderRadius: 16,
            padding: "14px 12px",
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.18)"}`,
            background: !history.length || isFinished ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
            color: !history.length || isFinished ? "rgba(255,255,255,0.55)" : theme.text,
            fontWeight: 1100,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            cursor: !history.length || isFinished ? "not-allowed" : "pointer",
          }}
        >
          Undo
        </button>
      </div>

      <div style={{ marginTop: 12, opacity: 0.85, fontSize: 13 }}>
        Tour : <span style={{ fontWeight: 1000 }}>{turnId === A.id ? A.name : B.name}</span>
      </div>

      {/* CTA bottom */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 16 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button
            onClick={finishMatch}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "14px 14px",
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.18)"}`,
              background: "rgba(0,0,0,0.24)",
              color: theme.text,
              fontWeight: 1000,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Terminer & Sauver
          </button>
        </div>
      </div>

      {/* Rules modal */}
      {rulesOpen && (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.16)"}`,
              background: theme.card,
              boxShadow: "0 22px 60px rgba(0,0,0,0.75)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 8 }}>Règles — Dice Duel</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, opacity: 0.9, fontFamily: "inherit", lineHeight: 1.35 }}>
{`• À ton tour, tu lances ${diceCount} dé(s)\n• Ton score = somme\n• Premier à atteindre / dépasser ${target} gagne le set\n• ${setsToWin} set(s) à gagner`}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setRulesOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.16)"}`,
                  background: "rgba(255,255,255,0.06)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
