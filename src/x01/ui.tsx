// ============================================
// src/x01/ui.tsx
// Sous-composants UI extraits de X01Play
// ============================================
import React from "react";
import type { Dart as UIDart, Profile } from "../lib/types";
import { chipStyle, fmt, isDoubleFinish, suggestCheckout } from "./helpers";

export type EnginePlayer = { id: string; name: string };

export const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background: "linear-gradient(180deg, rgba(22,22,26,.96), rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};
export const miniText: React.CSSProperties = { fontSize: 12, color: "#d9dbe3", lineHeight: 1.25 };
export const miniRankRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
};
export const miniRankName: React.CSSProperties = { fontWeight: 700, color: "#ffcf57" };
export const miniRankScore: React.CSSProperties = { fontWeight: 800, color: "#ffcf57" };
export const miniRankScoreFini: React.CSSProperties = { fontWeight: 800, color: "#7fe2a9" };

export function SetLegChip({
  currentSet, currentLegInSet, setsTarget, legsTarget,
}: { currentSet: number; currentLegInSet: number; setsTarget: number; legsTarget: number; }) {
  const st: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    border: "1px solid rgba(255,200,80,.35)",
    background: "linear-gradient(180deg, rgba(255,195,26,.12), rgba(30,30,34,.95))",
    color: "#ffcf57",
    fontWeight: 800,
    fontSize: 12,
    boxShadow: "0 6px 18px rgba(255,195,26,.15)",
    whiteSpace: "nowrap",
    borderRadius: 999,
  };
  return (
    <span style={st}>
      <span>Set {currentSet}/{setsTarget}</span>
      <span style={{ opacity: 0.6 }}>•</span>
      <span>Leg {currentLegInSet}/{legsTarget}</span>
    </span>
  );
}

export function HeaderBlock(props: {
  currentPlayer?: EnginePlayer | null;
  currentAvatar: string | null;
  currentRemaining: number;
  currentThrow: UIDart[];
  doubleOut: boolean;
  liveRanking: { id: string; name: string; score: number }[];
  curDarts: number;
  curM3D: string;
  bestVisit: number;
}) {
  const {
    currentPlayer, currentAvatar, currentRemaining, currentThrow,
    doubleOut, liveRanking, curDarts, curM3D, bestVisit,
  } = props;

  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 40, background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 8, boxShadow: "0 10px 30px rgba(0,0,0,.35)", marginBottom: 4,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "center" }}>
        {/* Avatar + nom + mini-stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <div style={{ padding: 6, borderRadius: "50%" }}>
            <div style={{
              width: 108, height: 108, borderRadius: "50%", overflow: "hidden",
              background: "linear-gradient(180deg, #1b1b1f, #111114)", boxShadow: "0 8px 28px rgba(0,0,0,.35)",
            }}>
              {currentAvatar ? (
                <img src={currentAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontWeight: 700 }}>?</div>
              )}
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#ffcf57" }}>
            {currentPlayer?.name ?? "—"}
          </div>
          <div style={{ ...miniCard, width: 180, height: 86, padding: 8 }}>
            <div style={miniText}>
              <div>Meilleure volée : <b>{Math.max(0, bestVisit)}</b></div>
              <div>Moy/3D : <b>{curM3D}</b></div>
              <div>Darts jouées : <b>{curDarts}</b></div>
              <div>Volée : <b>{Math.min(currentThrow.length, 3)}/3</b></div>
            </div>
          </div>
        </div>

        {/* Score + volée + checkout + mini-classement */}
        <div style={{ textAlign: "center", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 72, lineHeight: 1, fontWeight: 900, color: "#ffcf57", textShadow: "0 4px 20px rgba(255,195,26,.25)", letterSpacing: 0.5, marginTop: 2 }}>
            {Math.max(
              currentRemaining - currentThrow.reduce((s, d) => s + (d ? (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult) : 0), 0),
              0
            )}
          </div>

          {/* Pastilles volée */}
          <div style={{ marginTop: 2, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];
              const afterNow =
                currentRemaining - currentThrow.slice(0, i + 1).reduce((s, x) => s + (x ? (x.v === 25 && x.mult === 2 ? 50 : x.v * x.mult) : 0), 0);
              const wouldBust = afterNow < 0 || (doubleOut && afterNow === 0 && !isDoubleFinish(currentThrow.slice(0, i + 1)));
              const st = chipStyle(d, wouldBust);
              return (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 44, height: 32, padding: "0 12px", borderRadius: 10,
                  border: st.border as string, background: st.background as string, color: st.color as string, fontWeight: 800,
                }}>
                  {fmt(d)}
                </span>
              );
            })}
          </div>

          {/* Checkout */}
          {(() => {
            const only = suggestCheckout(
              Math.max(
                currentRemaining - currentThrow.reduce((s, d) => s + (d ? (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult) : 0), 0),
                0
              ),
              doubleOut,
              (3 - currentThrow.length) as 1 | 2 | 3
            )[0];
            if (!only || currentThrow.length >= 3) return null;
            return (
              <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: 6, borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "radial-gradient(120% 120% at 50% 0%, rgba(255,195,26,.10), rgba(30,30,34,.95))",
                  minWidth: 180, maxWidth: 520,
                }}>
                  <span style={{
                    padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,187,51,.4)",
                    background: "rgba(255,187,51,.12)", color: "#ffc63a", fontWeight: 900, whiteSpace: "nowrap",
                  }}>
                    {only}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Mini-Classement */}
          <div style={{ ...miniCard, alignSelf: "center", width: "min(320px, 100%)", height: "auto", padding: 6 }}>
            <div style={{ maxHeight: 3 * 28, overflow: (liveRanking.length > 3 ? "auto" : "visible") as any }}>
              {liveRanking.map((r, i) => (
                <div key={r.id} style={{ ...miniRankRow, marginBottom: 3 }}>
                  <div style={miniRankName}>{i + 1}. {r.name}</div>
                  <div style={r.score === 0 ? miniRankScoreFini : miniRankScore}>
                    {r.score === 0 ? "FINI" : r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function PlayersBlock(props: {
  playersOpen: boolean;
  setPlayersOpen: (b: boolean) => void;
  statePlayers: EnginePlayer[];
  profileById: Record<string, Profile>;
  dartsCount: Record<string, number>;
  pointsSum: Record<string, number>;
  start: number;
  scoresByPlayer: Record<string, number>;
  currentPlayer?: EnginePlayer | null;
  currentThrow: UIDart[];
  outMode: "simple" | "double" | "master";
  visitsLog?: Array<any>;
  state?: any; // pour chips "dernière volée" si tu veux ré-étendre plus tard
}) {
  const {
    playersOpen, setPlayersOpen, statePlayers, profileById,
    dartsCount, pointsSum, start, scoresByPlayer,
    currentPlayer, currentThrow, outMode,
  } = props;

  const currentRemainingHere = scoresByPlayer[(currentPlayer?.id as string) || ""] ?? start;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.85))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 10,
        marginBottom: 10,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      }}
    >
      {/* En-tête JOUEURS + checkout + disclosure */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 6px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 8px", borderRadius: 8,
            background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
            color: "#151517", fontWeight: 900, letterSpacing: 0.3, fontSize: 11.5,
          }}>
            JOUEURS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(() => {
            const only = suggestCheckout(
              Math.max(
                currentRemainingHere - currentThrow.reduce((s, d) => s + (d ? (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult) : 0), 0),
                0
              ),
              outMode !== "simple",
              (3 - currentThrow.length) as 1 | 2 | 3
            )[0];
            if (!only) return null;
            return (
              <span style={{
                padding: "3px 8px", borderRadius: 8,
                border: "1px solid rgba(255,187,51,.4)",
                background: "rgba(255,187,51,.12)", color: "#ffc63a",
                fontWeight: 900, whiteSpace: "nowrap", fontSize: 11.5,
              }}>
                {only}
              </span>
            );
          })()}
          <button
            onClick={() => setPlayersOpen(!playersOpen)}
            aria-label="Afficher / masquer les joueurs"
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid rgba(255,255,255,.12)",
              background: "transparent", color: "#e8e8ec", cursor: "pointer", fontWeight: 900,
            }}
          >
            {playersOpen ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {playersOpen && (
        <div style={{ marginTop: 4, maxHeight: "32vh", overflow: "auto", paddingRight: 4 }}>
          {statePlayers.map((p) => {
            const prof = profileById[p.id];
            const avatarSrc = (prof?.avatarDataUrl as string | null) ?? null;
            const dCount = dartsCount[p.id] || 0;
            const pSum = pointsSum[p.id] || 0;
            const a3d = dCount > 0 ? ((pSum / dCount) * 3).toFixed(2) : "0.00";
            return (
              <div key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 12, background: "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
                  border: "1px solid rgba(255,255,255,.07)", marginBottom: 6,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,.06)", flex: "0 0 auto" }}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontWeight: 700, fontSize: 12 }}>?</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: "#ffcf57" }}>{p.name}</div>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: "#cfd1d7" }}>
                    Darts: {dCount} • Moy/3D: {a3d}
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: (scoresByPlayer[p.id] ?? start) === 0 ? "#7fe2a9" : "#ffcf57" }}>
                  {scoresByPlayer[p.id] ?? start}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EndBanner({
  winnerName, continueAfterFirst, openOverlay, flushPendingFinish, goldBtn,
}: {
  winnerName: string;
  continueAfterFirst: () => void;
  openOverlay: () => void;
  flushPendingFinish: () => void;
  goldBtn: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: 64 + Math.round(260 * 0.88) + 80, // NAV_HEIGHT + KEYPAD_HEIGHT*scale + offset
        zIndex: 47, background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
        color: "#1a1a1a", fontWeight: 900, textAlign: "center",
        padding: 12, borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,.35)",
        display: "flex", gap: 12, alignItems: "center",
      }}
    >
      <span>Victoire : {winnerName}</span>
      <button onClick={continueAfterFirst} style={goldBtn}>Continuer (laisser finir)</button>
      <button onClick={openOverlay} style={goldBtn}>Classement</button>
      <button onClick={flushPendingFinish} style={goldBtn}>Terminer</button>
    </div>
  );
}

export function ContinueModal({
  endNow, continueAfterFirst,
}: { endNow: () => void; continueAfterFirst: () => void; }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        width: "min(440px, 92%)", borderRadius: 16, padding: 16,
        background: "linear-gradient(180deg, rgba(20,20,24,.96), rgba(14,14,16,.98))",
        border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        color: "#eee",
      }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Continuer la manche ?</div>
        <div style={{ opacity: 0.85, marginBottom: 14 }}>
          Un joueur a fini. Tu veux laisser les autres terminer leur leg ou arrêter maintenant ?
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={continueAfterFirst} style={{
            borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(120,200,130,.35)",
            background: "linear-gradient(180deg,#3cc86d,#2aa85a)", color: "#101214", fontWeight: 900, cursor: "pointer",
          }}>Continuer</button>
          <button onClick={endNow} style={{
            borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(255,180,0,.35)",
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)", color: "#101214", fontWeight: 900, cursor: "pointer",
          }}>Terminer</button>
        </div>
      </div>
    </div>
  );
}
