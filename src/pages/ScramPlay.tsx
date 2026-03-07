// =============================================================
// src/pages/ScramPlay.tsx
// SCRAM — Play
// 🎯 UI = clone visuel du CricketPlay (mêmes blocs / mêmes styles),
//    mais moteur + règles = ScramEngine (phase RACE puis SCRAM).
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { DartIconColorizable, CricketMarkIcon } from "../components/MaskIcon";

import { useTheme } from "../contexts/ThemeContext";
import { useScramEngine } from "../hooks/useScramEngine";
import type { ScramConfigPayload } from "../lib/gameEngines/scramEngine";

import tickerScram from "../assets/tickers/ticker_scram.png";

// =============================================================
// Fullscreen Play helper (UI V3.4)
// - Active le layout "plein écran" + safe-area
// - Tente le fullscreen navigateur si possible (sans jamais crasher)
//   (peut être refusé si pas de "user gesture" -> on catch)
// =============================================================
function useFullscreenPlay() {
  // ❌ Désactivé: l'ancien mode fullscreen (classes globales + requestFullscreen)
  // provoquait des régressions d'affichage sur d'autres modes.
  // Si besoin, on réactivera plus tard via src/hooks/useFullscreenPlay (opt-in).
}

// ---------- Styles (copiés de CricketPlay) ----------
const T = {
  bg: "#0b1020",
  panel: "rgba(10,14,22,0.55)",
  panel2: "rgba(255,255,255,0.06)",
  stroke: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.92)",
  sub: "rgba(255,255,255,0.72)",
  gold: "#F6C256",
  gold2: "#ffcf6b",
  red: "#ff4a4a",
  green: "#20d67b",
};

type HitMode = "S" | "D" | "T";

type Target = 15 | 16 | 17 | 18 | 19 | 20 | 25;

const UI_TARGETS: Target[] = [15, 16, 17, 18, 19, 20, 25];

const TARGET_COLORS: Record<Target, string> = {
  15: "#ffd54a",
  16: "#ffb84a",
  17: "#ff8a4a",
  18: "#ff5a5a",
  19: "#ff4ad1",
  20: "#ff4a4a",
  25: "#ff4a4a",
};

function getTargetLabel(t: Target) {
  return t === 25 ? "Bull" : String(t);
}
function getTargetColor(t: Target) {
  return TARGET_COLORS[t] ?? T.gold;
}
function darkenColor(hex: string, amt = 0.22) {
  // hex "#rrggbb"
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amt)));
  const dg = Math.max(0, Math.floor(g * (1 - amt)));
  const db = Math.max(0, Math.floor(b * (1 - amt)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`;
}

function marksToIcons(m: number) {
  // 0..3 => icons in CricketMarkIcon: "none|one|two|three"
  if (m <= 0) return "none";
  if (m === 1) return "one";
  if (m === 2) return "two";
  return "three";
}

export default function ScramPlay(props: any) {
  useFullscreenPlay();
  const { theme } = useTheme();

  const store = props?.store;
  const params = (props?.params ?? {}) as ScramConfigPayload;

  // players: resolved by App.tsx via store.resolveSelectedProfiles in most modes.
  const players = useMemo(() => {
    const resolved =
      (store?.resolveSelectedProfiles?.(params?.selectedIds ?? []) as any[]) ??
      (params?.playersList as any[]) ??
      [];
    return Array.isArray(resolved) ? resolved : [];
  }, [store, params?.selectedIds, params?.playersList]);

  const rules = useMemo(
    () => ({
      objective: params?.objective ?? 200,
      maxRounds: params?.roundsCap ?? 0,
      useBull: true,
      marksToClose: 3,
    }),
    [params?.objective, params?.roundsCap]
  );

  const { state, play, undo } = useScramEngine(players, rules);

  // UI local (identique cricket)
  const [showHelp, setShowHelp] = useState(false);
  const [hitMode, setHitMode] = useState<HitMode>("S");
  const [throwDarts, setThrowDarts] = useState<{ v: number; mult: number }[]>([]);

  const totalDartsPerTurn = 3;

  const teamA = "A";
  const teamB = "B";

  const teamPlayers = useMemo(() => {
    const idsA = state?.teams?.A ?? [];
    const idsB = state?.teams?.B ?? [];
    const byId = new Map(players.map((p: any) => [String(p.id), p]));
    return {
      A: idsA.map((id) => byId.get(String(id))).filter(Boolean),
      B: idsB.map((id) => byId.get(String(id))).filter(Boolean),
    };
  }, [state?.teams, players]);

  const activePlayerId = state?.players?.[state?.turnIndex ?? 0]?.id;
  const activeTeam = state?.teamByPlayer?.[String(activePlayerId ?? "")] ?? "A";

  const uiTitle = "Scram";

  const objective = state?.rules?.objective ?? rules.objective;

  const scramTeamScore = (teamId: "A" | "B") => {
    if (!state) return 0;
    if (state.phase !== "scram") return 0;
    return state.scorersTeam === teamId ? state.scramScore : 0;
  };

  const getMarksForTeamTarget = (teamId: "A" | "B", target: Target) => {
    if (!state) return 0;
    const key = target === 25 ? "B" : String(target);
    if (state.phase === "race") {
      return state.raceMarks?.[teamId]?.[key] ?? 0;
    }
    // phase scram: l'équipe "closers" ferme (marks visibles), l'autre marque (pas de marks ici)
    if (state.closersTeam === teamId) {
      return state.closersMarks?.[key] ?? 0;
    }
    return 0;
  };

  const onAddDart = (v: number) => {
    if (throwDarts.length >= totalDartsPerTurn) return;
    const mult = hitMode === "D" ? 2 : hitMode === "T" ? 3 : 1;
    setThrowDarts((prev) => [...prev, { v, mult }]);
  };

  const onAddBull = () => {
    // bull = 25 (outer). Si mode D/T, l'engine normalise en 50.
    onAddDart(25);
  };

  const onClear = () => setThrowDarts([]);
  const onValidate = () => {
    if (!state) return;
    if (throwDarts.length === 0) return;
    play(throwDarts);
    setThrowDarts([]);
  };

  const onUndo = () => {
    undo();
    setThrowDarts([]);
  };

  const currentName = (() => {
    const p = players.find((x: any) => String(x.id) === String(activePlayerId));
    return p?.name ?? p?.display_name ?? p?.pseudo ?? "—";
  })();

  const stats = state?.statsByPlayer?.[String(activePlayerId ?? "")] ?? {
    darts: 0,
    miss: 0,
    S: 0,
    D: 0,
    T: 0,
    OB: 0,
    IB: 0,
  };

  const volleyLabel = throwDarts
    .map((d) => {
      if (d.v === 25) return d.mult >= 2 ? "IB" : "OB";
      const p = d.mult === 2 ? "D" : d.mult === 3 ? "T" : "S";
      return `${p}${d.v}`;
    })
    .join(" • ");

  const totalLine = `Total: ${stats.darts ?? 0} darts • ${stats.miss ?? 0} miss • ${stats.S ?? 0}S / ${stats.D ?? 0}D / ${stats.T ?? 0}T • ${stats.OB ?? 0}OB / ${stats.IB ?? 0}IB`;

  // --------- RENDER (clone CricketPlay) ---------
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `radial-gradient(1200px 600px at 50% -20%, rgba(255,255,255,0.10), rgba(0,0,0,0) 55%), linear-gradient(180deg, ${T.bg}, #06080f)`,
        color: T.text,
        padding: 12,
        paddingBottom: 22,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: T.gold,
                textShadow: "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.7)",
              }}
            >
              {uiTitle}
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(true)}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "1px solid rgba(246,194,86,0.6)",
                background: "rgba(0,0,0,0.4)",
                color: T.gold,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textShadow: "0 0 6px rgba(246,194,86,0.8)",
                boxShadow: "0 0 8px rgba(246,194,86,0.5)",
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
              const active = i < throwDarts.length;
              return (
                <div key={i} style={{ opacity: active ? 1 : 0.25 }}>
                  <DartIconColorizable size={18} color={T.gold} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ticker */}
        <div
          style={{
            width: "100%",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
          }}
        >
          <img src={tickerScram} alt="SCRAM" style={{ width: "100%", height: 92, objectFit: "cover", display: "block" }} />
        </div>

        {/* cards A/B */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(["A", "B"] as const).map((teamId) => {
            const isActiveTeam = activeTeam === teamId;
            const p0 = teamPlayers[teamId]?.[0] as any;
            const name = p0?.name ?? p0?.display_name ?? p0?.pseudo ?? `Team ${teamId}`;
            const score = scramTeamScore(teamId);
            const accent = teamId === "A" ? "#ff4ad1" : "#F6C256";
            return (
              <div
                key={teamId}
                style={{
                  borderRadius: 18,
                  padding: 12,
                  background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))`,
                  border: `1px solid rgba(255,255,255,0.10)`,
                  boxShadow: isActiveTeam ? `0 0 0 2px ${accent}55, 0 0 22px ${accent}44` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative", width: 44, height: 44 }}>
                      <ProfileStarRing size={44} glow={isActiveTeam} />
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                        <ProfileAvatar profile={p0} size={34} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 14, color: T.text }}>{name}</div>
                      <div style={{ fontSize: 12, opacity: 0.78, color: accent, fontWeight: 900 }}>TEAM {teamId}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 900, color: T.text, textShadow: "0 0 10px rgba(255,255,255,0.22)" }}>
                    {score}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABLE */}
      <div
        style={{
          borderRadius: 22,
          padding: 14,
          background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))`,
          border: "1px solid rgba(255,255,255,0.10)",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: 0.2 }}>
            {state?.phase === "race" ? "RACE" : "SCRAM"} — {state?.phase === "race" ? "fermeture des cibles" : "points"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Objectif: <span style={{ fontWeight: 950, color: T.gold }}>{objective}</span>
          </div>
        </div>

        {/* header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "76px 1fr 1fr",
            gap: 8,
            alignItems: "center",
            padding: "0 6px 6px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.2,
          }}
        >
          <div style={{ opacity: 0.7 }}>Cible</div>
          <div style={{ color: "#ff4ad1" }}>TEAM A</div>
          <div style={{ color: "#F6C256" }}>TEAM B</div>
        </div>

        {/* rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {UI_TARGETS.map((target) => {
            const label = getTargetLabel(target);
            const colColor = getTargetColor(target);
            const leftMarks = getMarksForTeamTarget(teamA, target);
            const rightMarks = getMarksForTeamTarget(teamB, target);

            return (
              <div
                key={target}
                style={{
                  display: "grid",
                  gridTemplateColumns: "76px 1fr 1fr",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 44,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: colColor,
                    fontWeight: 950,
                    textShadow: `0 0 10px ${colColor}55`,
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    height: 44,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(12,20,40,0.40)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <CricketMarkIcon kind={marksToIcons(leftMarks)} color="#ff4ad1" />
                </div>

                <div
                  style={{
                    height: 44,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(12,20,40,0.40)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <CricketMarkIcon kind={marksToIcons(rightMarks)} color="#F6C256" />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72, textAlign: "center" }}>
          Fermeture = {state?.rules?.marksToClose ?? 3} marks
        </div>
      </div>

      {/* INPUT */}
      <div
        style={{
          borderRadius: 22,
          padding: 14,
          background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))`,
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* mode switch */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              height: 42,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(246,194,86,0.75)",
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
              boxShadow: "0 0 10px rgba(246,194,86,0.25)",
            }}
          >
            KEYPAD
          </div>
          <div
            style={{
              height: 42,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.10)",
              opacity: 0.55,
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
            }}
          >
            CIBLE
          </div>
        </div>

        {/* S/D/T/BULL */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          {[
            { k: "D" as HitMode, label: "DOUBLE", color: "#28d8ff" },
            { k: "T" as HitMode, label: "TRIPLE", color: "#b04aff" },
            { k: "S" as HitMode, label: "BULL", color: "#20d67b", bull: true },
          ].map((b) => {
            const active = b.bull ? false : hitMode === b.k;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => (b.bull ? onAddBull() : setHitMode(b.k))}
                style={{
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: active ? `linear-gradient(180deg, ${b.color}33, ${darkenColor(b.color, 0.35)}33)` : "rgba(0,0,0,0.28)",
                  color: T.text,
                  fontWeight: 950,
                  letterSpacing: 0.6,
                  cursor: "pointer",
                  boxShadow: active ? `0 0 16px ${b.color}40` : "none",
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* keypad numbers */}
        <div
          style={{
            borderRadius: 18,
            padding: 12,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.10)",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
            {Array.from({ length: 21 }).map((_, n) => {
              const v = n;
              const isHighlight = UI_TARGETS.includes(v as any);
              const col = isHighlight ? getTargetColor(v === 0 ? 15 : (v as any)) : "rgba(255,255,255,0.10)";
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onAddDart(v)}
                  style={{
                    height: 44,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(10,14,22,0.35)",
                    color: T.text,
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: isHighlight ? `0 0 0 1px ${col}55` : "none",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onAddBull}
            style={{
              marginTop: 10,
              width: "100%",
              height: 44,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "linear-gradient(180deg, rgba(32,214,123,0.35), rgba(0,0,0,0.35))",
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            BULL (S=OB / D,T=IB)
          </button>
        </div>

        {/* action row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            onClick={onClear}
            style={{
              height: 50,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "linear-gradient(180deg, rgba(255,74,74,0.45), rgba(0,0,0,0.35))",
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            ANNULER
          </button>

          <button
            type="button"
            onClick={onValidate}
            style={{
              height: 50,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: throwDarts.length ? "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.35))" : "rgba(255,255,255,0.06)",
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
              cursor: throwDarts.length ? "pointer" : "not-allowed",
              opacity: throwDarts.length ? 1 : 0.45,
            }}
          >
            VALIDER
          </button>
        </div>

        {/* volley + undo + total */}
        <div
          style={{
            borderRadius: 18,
            padding: 12,
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Volée:</div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>{volleyLabel || "—"}</div>
          </div>

          <button
            type="button"
            onClick={onUndo}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.28)",
              color: T.text,
              fontWeight: 950,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            UNDO
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>{totalLine}</div>
      </div>

      {/* help modal */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.66)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 22,
              padding: 14,
              background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.55))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 0 32px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 950, color: T.gold }}>SCRAM</div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.35)",
                  color: T.text,
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.35, opacity: 0.9 }}>
              <div style={{ marginBottom: 8 }}>
                <b>Phase RACE</b> : les deux équipes ferment 20→15 + Bull (3 marques).
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Phase SCRAM</b> : l’équipe qui a gagné la RACE marque des points pendant que l’autre ferme (ses marques s’affichent).
              </div>
              <div>
                <b>Objectif</b> : premier à <b>{objective}</b> points (ou fin de rounds si cap).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}