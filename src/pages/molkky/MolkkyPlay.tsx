// =============================================================
// src/pages/molkky/MolkkyPlay.tsx
// Play MÖLKKY (LOCAL ONLY) — Premium (sans bots)
// - Paramètres reçus depuis MolkkyConfig via params: { players, config }
// - Sauvegarde historique via onFinish() (géré dans App.tsx)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import {
  applyTurn,
  buildSummary,
  createMolkkyState,
  isFinished,
  undo,
  type MolkkyConfig,
  type MolkkyState,
} from "./engine/molkkyEngine";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

function cssVarOr(v: string, cssVar: string) {
  try {
    const x = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return x || v;
  } catch {
    return v;
  }
}

export default function MolkkyPlay({ go, params, onFinish }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const initial = React.useMemo(() => {
    const players = Array.isArray(params?.players) ? params.players : [];
    const cfg: MolkkyConfig = {
      targetScore: Number(params?.config?.targetScore ?? 50) || 50,
      bounceBackTo25: Boolean(params?.config?.bounceBackTo25 ?? true),
      eliminationOnThreeMiss: Boolean(params?.config?.eliminationOnThreeMiss ?? true),
    };

    // Fallback safe: 2 joueurs anonymes
    const safePlayers = players.length
      ? players
      : [
          { id: "A", name: "Joueur A", avatarDataUrl: null },
          { id: "B", name: "Joueur B", avatarDataUrl: null },
        ];

    return createMolkkyState({ players: safePlayers, config: cfg });
  }, [params]);

  const [st, setSt] = React.useState<MolkkyState>(() => initial);

  // si on navigue vers play avec d'autres params
  React.useEffect(() => {
    setSt(initial);
  }, [initial]);

  const cur = st.players?.[st.currentIndex];

  const accent = cssVarOr(theme?.colors?.accent ?? "#6cff7a", "--accent");

  const doScore = React.useCallback((v: number) => {
    setSt((prev) => applyTurn(prev, v));
  }, []);

  const doUndo = React.useCallback(() => {
    setSt((prev) => undo(prev));
  }, []);

  // finish hook
  React.useEffect(() => {
    if (!isFinished(st)) return;
    if (!onFinish) return;
    try {
      const summary = buildSummary(st);
      onFinish({
        id: st.id,
        kind: "molkky",
        sport: "molkky",
        createdAt: st.startedAt,
        finishedAt: st.finishedAt,
        players: st.players,
        winnerId: st.winnerPlayerId,
        summary,
        payload: {
          state: st,
          config: st.config,
          summary,
        },
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.finishedAt, st.winnerPlayerId]);

  const finished = isFinished(st);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_menu")} />
        <div style={topTitle(theme)}>MÖLKKY</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={headerCard(theme)}>
        <div style={headerGrid}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <ProfileAvatar size={44} src={cur?.avatarDataUrl || null} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {cur?.name || "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Tour {Math.max(1, st.turns.length + 1)} • Cible {st.config.targetScore}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>SCORE</div>
            <div style={{ fontSize: 40, fontWeight: 1200, lineHeight: 1, color: accent, textShadow: `0 0 14px ${accent}` }}>
              {Number(cur?.score ?? 0)}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>MISS</div>
            <div style={{ fontSize: 22, fontWeight: 1100 }}>{Number(cur?.consecutiveMisses ?? 0)}/3</div>
            <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800 }}>{cur?.eliminated ? "ÉLIMINÉ" : ""}</div>
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={{ fontWeight: 1000, opacity: 0.9, marginBottom: 10, letterSpacing: 1 }}>JOUEURS</div>
        <div style={{ display: "grid", gap: 8 }}>
          {st.players.map((p, i) => {
            const active = i === st.currentIndex && !finished;
            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 10px",
                  borderRadius: 14,
                  border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
                  background: active ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.18)",
                  boxShadow: active ? `0 0 18px ${accent}33` : "none",
                  opacity: p.eliminated ? 0.55 : 1,
                }}
              >
                <ProfileAvatar size={34} src={p.avatarDataUrl || null} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                    Lancers: {p.throws} • MISS: {p.consecutiveMisses}
                  </div>
                </div>
                <div style={{ fontWeight: 1200, fontSize: 18 }}>{p.score}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={card(theme)}>
        <div style={{ fontWeight: 1000, opacity: 0.9, marginBottom: 10, letterSpacing: 1 }}>SAISIE SCORE</div>

        <div style={padGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <button key={i + 1} style={padBtn(theme)} disabled={finished} onClick={() => doScore(i + 1)}>
              {i + 1}
            </button>
          ))}

          <button style={padBtn(theme)} disabled={finished} onClick={() => doScore(2)}>
            +2
          </button>
          <button style={padBtn(theme)} disabled={finished} onClick={() => doScore(3)}>
            +3
          </button>
          <button style={padBtn(theme)} disabled={finished} onClick={() => doScore(4)}>
            +4
          </button>
          <button style={padBtn(theme)} disabled={finished} onClick={() => doScore(5)}>
            +5
          </button>

          <button style={dangerBtn(theme)} disabled={finished} onClick={() => doScore(0)}>
            MISS
          </button>
          <button style={ghostBtn(theme)} disabled={st.turns.length === 0} onClick={doUndo}>
            UNDO
          </button>
        </div>

        {finished && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <div style={{ fontWeight: 1200, fontSize: 22, color: accent, textShadow: `0 0 14px ${accent}` }}>
              {t?.("Victoire") ?? "VICTOIRE"}
            </div>
            <div style={{ opacity: 0.9, fontWeight: 900 }}>
              {(st.players.find((p) => p.id === st.winnerPlayerId)?.name ?? "—") + " a gagné"}
            </div>
            <button style={{ ...cta(theme, true), marginTop: 10 }} onClick={() => go("molkky_stats_history", { focusMatchId: st.id })}>
              {t?.("Voir dans l'historique") ?? "VOIR DANS L'HISTORIQUE"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle = (theme: any): React.CSSProperties => ({
  textAlign: "center",
  fontWeight: 1000,
  letterSpacing: 2,
  opacity: 0.95,
  color: theme?.colors?.text ?? "#fff",
});

const headerCard = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const headerGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 92px",
  gap: 10,
  alignItems: "center",
};

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const padGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
};

const padBtn = (theme: any): React.CSSProperties => ({
  height: 54,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1100,
  letterSpacing: 0.5,
  cursor: "pointer",
});

const dangerBtn = (theme: any): React.CSSProperties => ({
  ...padBtn(theme),
  background: "rgba(255,80,80,0.20)",
  border: "1px solid rgba(255,80,80,0.35)",
});

const ghostBtn = (theme: any): React.CSSProperties => ({
  ...padBtn(theme),
  background: "rgba(255,255,255,0.08)",
});

const cta = (theme: any, enabled: boolean) => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: enabled ? (theme?.colors?.accent ?? "#6cff7a") : "rgba(255,255,255,0.08)",
  color: enabled ? "#06100a" : (theme?.colors?.text ?? "#fff"),
  fontWeight: 1100,
  letterSpacing: 1,
  cursor: enabled ? "pointer" : "not-allowed",
});
