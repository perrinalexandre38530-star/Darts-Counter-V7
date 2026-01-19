// @ts-nocheck
// =============================================================
// src/pages/CountUpPlay.tsx
// COUNT-UP — PLAY (look & feel coherent)
// - Saisie visite via Keypad
// - Rounds / objectif
// - Classement live + victoire
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import type { CountUpConfig } from "./CountUpConfig";

type Props = {
  go: (tab: any, params?: any) => void;
  config: CountUpConfig;
};

type PState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  score: number;
};

export default function CountUpPlay({ go, config }: Props) {
  const theme = useTheme();
  const primary = theme?.primary || "#f3c76a";
  const bg = theme?.pageBg || "linear-gradient(180deg, #05060a, #070811 55%, #05060a)";

  const players0: PState[] = (config?.players || []).map((p) => ({
    id: String(p.id),
    name: String(p.name || "Joueur"),
    avatarDataUrl: p.avatarDataUrl || null,
    isBot: !!p.isBot,
    score: 0,
  }));

  const rounds = Math.max(1, Number(config?.rounds || 10));
  const target = config?.targetScore ? Number(config.targetScore) : undefined;

  const [players, setPlayers] = React.useState<PState[]>(players0);
  const [turn, setTurn] = React.useState(0); // index joueur
  const [round, setRound] = React.useState(1);
  const [visit, setVisit] = React.useState<number>(0);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);

  const cur = players[turn];

  function commitVisit(v: number) {
    if (!cur || winnerId) return;
    const vv = Math.max(0, Math.min(180, Number(v || 0)));

    setPlayers((prev) =>
      prev.map((p, idx) => (idx === turn ? { ...p, score: (p.score || 0) + vv } : p))
    );

    // victoire par objectif
    const nextScore = (cur?.score || 0) + vv;
    if (target != null && nextScore >= target) {
      setWinnerId(cur.id);
      return;
    }

    // avancer tour
    const nextTurn = (turn + 1) % players.length;
    const nextRound = nextTurn === 0 ? round + 1 : round;

    if (nextRound > rounds) {
      // fin: winner au meilleur score (apres setPlayers, on calcule a partir de nextScore)
      const final = players.map((p, idx) => ({
        id: p.id,
        score: idx === turn ? nextScore : p.score || 0,
      }));
      final.sort((a, b) => b.score - a.score);
      setWinnerId(final[0]?.id || null);
      return;
    }

    setTurn(nextTurn);
    setRound(nextRound);
    setVisit(0);
  }

  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: bg, color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <BackDot onClick={() => go("home")} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", color: primary }}>
            Count-Up
          </div>
          <div style={{ opacity: 0.85, fontSize: 12 }}>
            Round {round}/{rounds} • Joueur {turn + 1}/{players.length}
            {target != null ? ` • Objectif: ${target}` : ""}
          </div>
        </div>
        <InfoDot onClick={() => setRulesOpen(true)} />
      </div>

      {/* Board */}
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${primary}33`,
            background: "rgba(255,255,255,0.06)",
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 950, letterSpacing: 1, textTransform: "uppercase", color: primary }}>
              Joueur actif
            </div>
            {winnerId ? (
              <div style={{ fontWeight: 1000, color: primary }}>TERMINE</div>
            ) : null}
          </div>

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cur?.name || "-"}
              </div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Score: {cur?.score ?? 0}</div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${primary}55`,
                background: `${primary}18`,
                fontWeight: 1000,
                fontSize: 22,
                minWidth: 90,
                textAlign: "center",
              }}
            >
              {visit}
            </div>
          </div>

          {winnerId ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: `1px solid ${primary}55`, background: `${primary}14` }}>
              <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>Victoire</div>
              <div style={{ marginTop: 4, fontSize: 14, opacity: 0.9 }}>
                {players.find((p) => p.id === winnerId)?.name || "Joueur"} gagne !
              </div>
              <button
                type="button"
                onClick={() => go("home")}
                style={{
                  marginTop: 10,
                  width: "100%",
                  borderRadius: 14,
                  padding: "12px 12px",
                  border: `1px solid ${primary}55`,
                  background: `linear-gradient(180deg, ${primary}35, ${primary}12)`,
                  color: "#fff",
                  fontWeight: 1000,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Retour accueil
              </button>
            </div>
          ) : null}
        </div>

        {/* Ranking */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontWeight: 950, letterSpacing: 1, textTransform: "uppercase", color: primary }}>Classement</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((p, idx) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, opacity: 0.95 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ width: 22, textAlign: "center", fontWeight: 1000, color: idx === 0 ? primary : "rgba(255,255,255,0.75)" }}>
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 900 }}>
                    {p.name}
                  </div>
                </div>
                <div style={{ fontWeight: 1000 }}>{p.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keypad */}
      {!winnerId ? (
        <div style={{ padding: 10 }}>
          <Keypad
            value={visit}
            onChange={setVisit}
            onEnter={() => commitVisit(visit)}
            onBack={() => setVisit((v) => Math.floor((v || 0) / 10))}
            onClear={() => setVisit(0)}
          />
        </div>
      ) : null}

      {/* Rules modal */}
      {rulesOpen ? (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "78vh",
              overflowY: "auto",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: `1px solid ${primary}33`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 1, color: primary, textTransform: "uppercase" }}>Regles — Count-Up</div>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                style={{
                  borderRadius: 12,
                  padding: "8px 10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35, opacity: 0.92 }}>
              <p>
                Objectif: marquer le plus de points en {rounds} volees.
              </p>
              <ul>
                <li>Chaque tour, tu saisis le total de ta volee (0 a 180).</li>
                <li>Le score est cumule au fil de la partie.</li>
                <li>Option: objectif {target != null ? target : "non defini"} (victoire immediate si atteint).</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
