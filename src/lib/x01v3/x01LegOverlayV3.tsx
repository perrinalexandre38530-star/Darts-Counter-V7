// =============================================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set / match pour X01 V3
// - Style néon + trophée 🏆
// - 1v1 : duel avec avatars alignés + scoreboard central
// - 3+ joueurs : classement final simple
// - Boutons : Manche suivante / Rejouer / Nouvelle partie / Résumé / Quitter
// - Mini stats : vainqueur en doré / perdant en blanc
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import trophyCup from "../../ui_assets/trophy-cup.png";

type Props = {
  open: boolean;
  status: "playing" | "leg_end" | "set_end" | "match_end";
  config: any;
  state: any;
  liveStatsByPlayer: any;

  onNextLeg: () => void;

  // Noms "anciens" (X01PlayV3 première version)
  onExitMatch?: () => void;
  onReplaySameConfig?: () => void;
  onReplayNewConfig?: () => void;

  // Noms "nouveaux" (compat patch X01PlayV3)
  onQuit?: () => void;
  onReplaySame?: () => void;
  onReplayNew?: () => void;

  onShowSummary?: (matchId: string) => void;
  onContinueMulti?: () => void;
};

export default function X01LegOverlayV3({
  open,
  status,
  config,
  state,
  liveStatsByPlayer,
  onNextLeg,
  onExitMatch,
  onReplaySameConfig,
  onReplayNewConfig,
  onQuit,
  onReplaySame,
  onReplayNew,
  onShowSummary,
  onContinueMulti,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // 🔒 Comportement simple : si le parent dit open=false ou status=playing,
  // on ne rend rien.
  if (!open || status === "playing") return null;

  const players = config?.players ?? [];
  const scores = state?.scores ?? {};
  const legsWon = state?.legsWon ?? {};
  const setsWon = state?.setsWon ?? {};

  const currentSet = state?.currentSet ?? 1;
  const currentLeg = state?.currentLeg ?? 1;
  const legsPerSet = config?.legsPerSet ?? "?";
  const setsToWin = config?.setsToWin ?? "?";
  const matchId = state?.matchId;

  const accent = (theme as any)?.accent ?? "#ffc63a";

  // ------------------------------------------------------------
  // Détermination vainqueur / classement
  // ------------------------------------------------------------
  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  const opponent =
    winner && players.length >= 2
      ? players.find((p: any) => p.id !== winner.id)
      : null;

  const winnerSets = winner ? setsWon[winner.id] ?? 0 : 0;
  const winnerLegs = winner ? legsWon[winner.id] ?? 0 : 0;
  const opponentSets = opponent ? setsWon[opponent.id] ?? 0 : 0;
  const opponentLegs = opponent ? legsWon[opponent.id] ?? 0 : 0;

  const victoryLabel =
    status === "match_end"
      ? t("x01.leg_overlay.victory", "Victoire")
      : status === "set_end"
      ? t("x01.leg_overlay.set_won", "Gain Set")
      : t("x01.leg_overlay.leg_won", "Gain Leg");

  const topChipLabel = `${t(
    "x01.leg_overlay.leg",
    "Manche"
  )} ${currentLeg}/${legsPerSet} · ${t(
    "x01.leg_overlay.set",
    "Set"
  )} ${currentSet}/${setsToWin}`;

  // CONTINUER (3+ joueurs)
  const finishedCount = players.filter((p: any) => scores[p.id] === 0).length;
  const showContinueMulti =
    players.length >= 3 &&
    finishedCount >= 1 &&
    finishedCount < players.length &&
    typeof onContinueMulti === "function";

  // ------------------------------------------------------------
  // Mini stats vainqueur & perdant
  // ------------------------------------------------------------

  function computeAvg3(stats: any | null | undefined) {
    if (!stats) return "0.0";
    const d = stats.dartsThrown ?? 0;
    const ts = stats.totalScore ?? 0;
    if (!d || !ts) return "0.0";
    return ((ts / d) * 3).toFixed(1);
  }

  const winnerStats = winner ? liveStatsByPlayer?.[winner.id] : null;
  const opponentStats =
    opponent && liveStatsByPlayer ? liveStatsByPlayer?.[opponent.id] : null;

  const wDarts = winnerStats?.dartsThrown ?? 0;
  const wTotalScore = winnerStats?.totalScore ?? 0;
  const wBestVisit = winnerStats?.bestVisit ?? 0;
  const wAvg3 = computeAvg3(winnerStats);

  const oDarts = opponentStats?.dartsThrown ?? 0;
  const oTotalScore = opponentStats?.totalScore ?? 0;
  const oBestVisit = opponentStats?.bestVisit ?? 0;
  const oAvg3 = computeAvg3(opponentStats);

  const showMiniStats =
    wDarts > 0 || wTotalScore > 0 || wBestVisit > 0 || !!opponentStats;

  // ------------------------------------------------------------
  // Classement multi (3+ joueurs)
  // ------------------------------------------------------------
  const isMulti = players.length >= 3;

  const rankedPlayers = isMulti
    ? [...players].sort((a: any, b: any) => {
        const aSets = setsWon[a.id] ?? 0;
        const bSets = setsWon[b.id] ?? 0;
        if (bSets !== aSets) return bSets - aSets;

        const aLegs = legsWon[a.id] ?? 0;
        const bLegs = legsWon[b.id] ?? 0;
        if (bLegs !== aLegs) return bLegs - aLegs;

        const aScore = scores[a.id] ?? config.startScore ?? 0;
        const bScore = scores[b.id] ?? config.startScore ?? 0;
        // plus petit score en premier (le premier à finir)
        return aScore - bScore;
      })
    : [];

  // ------------------------------------------------------------
  // Callbacks (avec compat noms anciens / nouveaux)
  // ------------------------------------------------------------

  const quitHandler = onExitMatch || onQuit;
  const replaySameHandler = onReplaySameConfig || onReplaySame;
  const replayNewHandler = onReplayNewConfig || onReplayNew;

  const nextLeg = () => {
    // ➜ Laisse le parent gérer le state (status / open)
    onNextLeg();
  };

  const quitMatch = () => {
    if (quitHandler) quitHandler();
  };

  const replaySame = () => {
    if (replaySameHandler) replaySameHandler();
  };

  const replayNew = () => {
    if (replayNewHandler) replayNewHandler();
  };

  const showSummary = () => {
    if (onShowSummary) {
      onShowSummary(matchId ?? "");
    }
  };

  const continueMulti = () => {
    if (onContinueMulti) onContinueMulti();
  };

  // ------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------

  return (
    <div
      className="x01legoverlay-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(92vw,520px)",
          borderRadius: 22,
          padding: 18,
          background:
            "radial-gradient(circle at top,#141824 0%,#05060b 58%,#020308 100%)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 32px rgba(0,0,0,0.9)",
          overflow: "hidden",
        }}
      >
        {/* Halo léger */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 10% 0%,rgba(255,215,120,0.18),transparent 55%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Manche / Set chip */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${accent}`,
                background:
                  "linear-gradient(135deg,rgba(0,0,0,0.9),rgba(0,0,0,0.4))",
                color: accent,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                boxShadow: "0 0 16px rgba(0,0,0,0.7)",
                textAlign: "center",
                minWidth: 190,
                justifyContent: "center",
              }}
            >
              {topChipLabel}
            </div>
          </div>

          {/* 1v1 : duel layout / 3+ : classement */}
          {!isMulti ? (
            <DuelLayout
              winner={winner}
              opponent={opponent}
              winnerSets={winnerSets}
              winnerLegs={winnerLegs}
              opponentSets={opponentSets}
              opponentLegs={opponentLegs}
              victoryLabel={victoryLabel}
              accent={accent}
            />
          ) : (
            <RankingLayout
              players={rankedPlayers}
              scores={scores}
              setsWon={setsWon}
              legsWon={legsWon}
              accent={accent}
              t={t}
            />
          )}

          {/* Mini stats vainqueur + perdant */}
          {showMiniStats && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Mini
                label="Moy.3D"
                win={wAvg3}
                lose={opponent ? oAvg3 : "-"}
              />
              <Mini
                label="Darts"
                win={String(wDarts)}
                lose={opponent ? String(oDarts) : "-"}
              />
              <Mini
                label="Best"
                win={String(wBestVisit)}
                lose={opponent ? String(oBestVisit) : "-"}
              />
            </div>
          )}

          {/* BOUTONS */}
          {status !== "match_end" ? (
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button style={btnGold} onClick={nextLeg}>
                {t("x01.leg_overlay.next_leg", "MANCHE SUIVANTE")}
              </button>

              <button style={btnGhost} onClick={quitMatch}>
                {t("common.quit", "Quitter")}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              {/* REJOUER (mêmes paramètres) */}
              {replaySameHandler && (
                <button style={btnGoldFull} onClick={replaySame}>
                  🏆{" "}
                  {t(
                    "x01.leg_overlay.replay_same",
                    "Rejouer (mêmes paramètres)"
                  )}
                </button>
              )}

              {/* Actions secondaires */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {replayNewHandler && (
                  <button style={btnGhostWide} onClick={replayNew}>
                    {t("x01.leg_overlay.new_match", "Nouvelle partie")}
                  </button>
                )}

                {onShowSummary && (
                  <button style={btnGhostWide} onClick={showSummary}>
                    {t("x01.leg_overlay.summary", "Résumé")}
                  </button>
                )}

                {showContinueMulti && (
                  <button style={btnGhostWide} onClick={continueMulti}>
                    {t("x01.leg_overlay.continue", "Continuer")}
                  </button>
                )}

                <button style={btnGhostWide} onClick={quitMatch}>
                  {t("common.quit", "Quitter")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Layout duel 1v1 — avatars alignés, même taille, scoreboard central
// ------------------------------------------------------------
function DuelLayout({
  winner,
  opponent,
  winnerSets,
  winnerLegs,
  opponentSets,
  opponentLegs,
  victoryLabel,
  accent,
}: {
  winner: any;
  opponent: any;
  winnerSets: number;
  winnerLegs: number;
  opponentSets: number;
  opponentLegs: number;
  victoryLabel: string;
  accent: string;
}) {
  const loserLabel = "Défaite";
  const AVATAR_SIZE = 72;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr 1.1fr",
        gap: 10,
        alignItems: "center",
      }}
    >
      {/* VAINQUEUR */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          minWidth: 0,
          gap: 4,
        }}
      >
        <AvatarMedallion
          avatar={
            winner?.avatarDataUrl || winner?.avatarUrl || winner?.photoUrl
          }
          size={AVATAR_SIZE}
        />

        <div
          style={{
            marginTop: 4,
            fontWeight: 800,
            fontSize: 15,
            color: accent,
            maxWidth: 110,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {winner?.name ?? "—"}
        </div>

        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: accent,
          }}
        >
          <img
            src={trophyCup}
            style={{
              width: 28,
              height: 28,
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(255,215,120,0.7))",
            }}
          />
          <span>{victoryLabel}</span>
        </div>
      </div>

      {/* SCOREBOARD CENTRAL */}
      <div
        style={{
          padding: "8px 10px 10px",
          borderRadius: 18,
          background:
            "linear-gradient(145deg,rgba(0,0,0,0.9),rgba(0,0,0,0.4))",
          border: "1px solid rgba(255,255,255,0.16)",
          textAlign: "center",
          color: "#fff",
          minWidth: 96,
          boxShadow: "0 0 14px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          Score
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>
          {/* Ligne SET */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div style={{ textAlign: "right", color: accent }}>
              {winnerSets}
            </div>
            <div style={{ paddingInline: 6, opacity: 0.8 }}>SET</div>
            <div style={{ textAlign: "left", color: accent }}>
              {opponentSets}
            </div>
          </div>

          {/* Ligne LEG */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "right", color: accent }}>
              {winnerLegs}
            </div>
            <div style={{ paddingInline: 6, opacity: 0.8 }}>LEG</div>
            <div style={{ textAlign: "left", color: accent }}>
              {opponentLegs}
            </div>
          </div>
        </div>
      </div>

      {/* ADVERSAIRE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          minWidth: 0,
          gap: 4,
        }}
      >
        <AvatarMedallion
          avatar={
            opponent?.avatarDataUrl ||
            opponent?.avatarUrl ||
            opponent?.photoUrl
          }
          size={AVATAR_SIZE}
        />

        <div
          style={{
            marginTop: 4,
            fontWeight: 800,
            fontSize: 15,
            color: "#ffffff",
            maxWidth: 110,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {opponent?.name ?? "—"}
        </div>

        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            fontWeight: 700,
            color: "#ff6677",
          }}
        >
          {loserLabel}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Layout classement multi (3+ joueurs)
// ------------------------------------------------------------
function RankingLayout({
  players,
  scores,
  setsWon,
  legsWon,
  accent,
  t,
}: {
  players: any[];
  scores: Record<string, number>;
  setsWon: Record<string, number>;
  legsWon: Record<string, number>;
  accent: string;
  t: (k: string, d: string) => string;
}) {
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: accent,
          marginBottom: 6,
        }}
      >
        {t("x01.leg_overlay.final_ranking", "Classement final")}
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(145deg,rgba(0,0,0,0.9),rgba(0,0,0,0.45))",
          padding: 8,
        }}
      >
        {players.map((p: any, index: number) => {
          const rank = index + 1;
          const s = scores[p.id] ?? 0;
          const st = setsWon[p.id] ?? 0;
          const lg = legsWon[p.id] ?? 0;

          const avatar =
            p.avatarDataUrl || p.avatarUrl || p.photoUrl || null;

          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 6px",
                borderRadius: 12,
                background:
                  rank === 1
                    ? "rgba(255,215,120,0.1)"
                    : "rgba(255,255,255,0.04)",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 22,
                  textAlign: "center",
                  fontWeight: 800,
                  color: rank === 1 ? accent : "#ddd",
                  fontSize: 13,
                }}
              >
                {rank}.
              </div>

              <AvatarMedallion avatar={avatar} size={32} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#cfd1d7",
                    marginTop: 2,
                  }}
                >
                  Sets {st} · Legs {lg} · Score {s}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Avatar médaillon simple
// ------------------------------------------------------------
function AvatarMedallion({
  avatar,
  size = 70,
}: {
  avatar?: string | null;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "transparent",
        border: "none",
        boxShadow: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          style={{
            width: "105%",
            height: "105%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          style={{
            fontWeight: 800,
            color: "#fff",
            fontSize: size * 0.35,
          }}
        >
          ?
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// MINI KPI (vainqueur + perdant)
// ------------------------------------------------------------
function Mini({
  label,
  win,
  lose,
}: {
  label: string;
  win: string | number;
  lose: string | number;
}) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 14,
        textAlign: "center",
        padding: "6px 8px",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>

      <div
        style={{
          fontWeight: 800,
          color: "#ffc63a",
          fontSize: 17,
          lineHeight: 1.1,
        }}
      >
        {win}
      </div>

      <div
        style={{
          fontWeight: 700,
          color: "#ffffff",
          fontSize: 13,
          opacity: 0.9,
          marginTop: 2,
        }}
      >
        {lose}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STYLES BOUTONS
// ------------------------------------------------------------

const btnGold: React.CSSProperties = {
  flex: 1,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "pointer",
};

const btnGoldFull: React.CSSProperties = {
  width: "100%",
  marginBottom: 10,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnGhostWide: React.CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "10px 12px",
  borderRadius: 999,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "pointer",
};
