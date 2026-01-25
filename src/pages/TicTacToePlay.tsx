import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

export type TicTacToePlayConfig = {
  /** Best-of (ex: 3 = premier à 2) */
  bestOf: 1 | 3 | 5 | 7;
  /** Joueur qui commence (0/1) */
  startingPlayer: 0 | 1;
};

const INFO_TEXT = `TIC-TAC-TOE (mode fun)

Règles (version jouable):
- 2 joueurs.
- Grille 3x3: chaque case correspond à un numéro (1..9).
- À tour de rôle, un joueur prend 1 case par volée (en partie réelle: il suffit de toucher la cible correspondante; ici: tu appuies sur la case).
- 3 cases alignées = manche gagnée.
- Grille pleine sans alignement = manche nulle.
- Match en "best-of" (1/3/5/7).`;

type Cell = 0 | 1 | null;

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(board: Cell[]): 0 | 1 | null {
  for (const [a, b, c] of LINES) {
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) return v;
  }
  return null;
}

function isFull(board: Cell[]): boolean {
  return board.every((c) => c !== null);
}

export default function TicTacToePlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: TicTacToePlayConfig =
    (props?.params?.config as TicTacToePlayConfig) ||
    (props?.config as TicTacToePlayConfig) ||
    ({ bestOf: 3, startingPlayer: 0 } as TicTacToePlayConfig);

  const [matchWins, setMatchWins] = useState<[number, number]>([0, 0]);
  const [roundIdx, setRoundIdx] = useState(1);
  const [board, setBoard] = useState<Cell[]>(() => Array.from({ length: 9 }, () => null));
  const [current, setCurrent] = useState<0 | 1>(cfg.startingPlayer);

  const needToWin = useMemo(() => Math.floor(cfg.bestOf / 2) + 1, [cfg.bestOf]);

  const roundWinner = useMemo(() => winnerOf(board), [board]);
  const roundDraw = useMemo(() => !roundWinner && isFull(board), [roundWinner, board]);

  const matchWinner = useMemo(() => {
    if (matchWins[0] >= needToWin) return 0 as const;
    if (matchWins[1] >= needToWin) return 1 as const;
    return null;
  }, [matchWins, needToWin]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function resetRound(nextStarter: 0 | 1) {
    setBoard(Array.from({ length: 9 }, () => null));
    setCurrent(nextStarter);
  }

  function startNextRound() {
    setRoundIdx((r) => r + 1);
    // Alternance du joueur qui commence
    const nextStarter: 0 | 1 = ((roundIdx + cfg.startingPlayer) % 2) as 0 | 1;
    resetRound(nextStarter);
  }

  function onPickCell(idx: number) {
    if (matchWinner !== null) return;
    if (roundWinner !== null || roundDraw) return;
    setBoard((prev) => {
      if (prev[idx] !== null) return prev;
      const out = [...prev] as Cell[];
      out[idx] = current;
      return out;
    });
    setCurrent((p) => (p === 0 ? 1 : 0));
  }

  // Dès qu'une manche est gagnée/annulée, on incrémente score + propose next
  React.useEffect(() => {
    if (matchWinner !== null) return;
    if (roundWinner === null) return;
    setMatchWins((w) => {
      const out: [number, number] = [...w] as any;
      out[roundWinner] = out[roundWinner] + 1;
      return out;
    });
  }, [roundWinner, matchWinner]);

  const statusText = useMemo(() => {
    if (matchWinner !== null) return `${t("generic.winner", "Gagnant")} : ${t("generic.player", "Joueur")} ${matchWinner + 1}`;
    if (roundWinner !== null) return `${t("generic.round", "Manche")} ${roundIdx} : ${t("generic.winner", "Gagnant")} = ${t("generic.player", "Joueur")} ${roundWinner + 1}`;
    if (roundDraw) return `${t("generic.round", "Manche")} ${roundIdx} : ${t("generic.draw", "Égalité")}`;
    return `${t("generic.turn", "Tour")} : ${t("generic.player", "Joueur")} ${current + 1}`;
  }, [matchWinner, roundWinner, roundDraw, roundIdx, current, t]);

  return (
    <div className="page">
      <PageHeader
        title="TIC-TAC-TOE"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TIC-TAC-TOE" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.round", "MANCHE")} {roundIdx} / {cfg.bestOf}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>{statusText}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.score", "SCORE")}
              </div>
              <div style={{ fontSize: 20, fontWeight: 1000, marginTop: 6 }}>
                {matchWins[0]} - {matchWins[1]}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                {t("generic.firstTo", "Premier à")} {needToWin}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {board.map((cell, idx) => {
              const taken = cell !== null;
              const canClick = !taken && matchWinner === null && roundWinner === null && !roundDraw;
              const label = idx + 1;
              return (
                <button
                  key={idx}
                  onClick={() => onPickCell(idx)}
                  disabled={!canClick}
                  style={{
                    height: 84,
                    borderRadius: 16,
                    border: taken
                      ? cell === 0
                        ? "1px solid rgba(120,255,200,0.35)"
                        : "1px solid rgba(255,120,200,0.35)"
                      : "1px solid rgba(255,255,255,0.14)",
                    background: taken
                      ? cell === 0
                        ? "rgba(120,255,200,0.10)"
                        : "rgba(255,120,200,0.10)"
                      : "rgba(0,0,0,0.18)",
                    color: "#fff",
                    cursor: canClick ? "pointer" : "default",
                    fontWeight: 1000,
                    position: "relative",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, position: "absolute", top: 8, left: 10 }}>{label}</div>
                  <div style={{ fontSize: 34, lineHeight: "34px" }}>{cell === null ? "" : cell === 0 ? "X" : "O"}</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setMatchWins([0, 0]);
                setRoundIdx(1);
                resetRound(cfg.startingPlayer);
              }}
              style={{ flex: 1 }}
            >
              {t("generic.reset", "Réinitialiser")}
            </button>

            <button
              className="btn-primary"
              onClick={() => {
                if (matchWinner !== null) return;
                if (!roundWinner && !roundDraw) return;
                startNextRound();
              }}
              style={{ flex: 1, opacity: roundWinner || roundDraw ? 1 : 0.5 }}
            >
              {t("generic.next", "Manche suivante")}
            </button>
          </div>
        </div>

        {matchWinner !== null && (
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
            {t("generic.winner", "Gagnant")} : {t("generic.player", "Joueur")} {matchWinner + 1}
          </div>
        )}
      </div>
    </div>
  );
}
