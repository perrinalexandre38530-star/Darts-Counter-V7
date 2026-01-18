// ============================================
// src/pages/BattleRoyalePlay.tsx
// BATTLE ROYALE — PLAY (MVP jouable)
// ✅ UI raccord Shanghai/Killer (header sticky + cards + keypad fixe)
// ✅ Rounds: 20 → 1 → BULL
// ✅ Règles supportées:
//   - life_system: 0 hit sur la cible => -1 vie ; 0 vie => éliminé
//   - zero_points: 0 point sur la cible => éliminé direct
//   - miss_x: chaque dart non sur la cible => +1 miss ; >= missLimit => éliminé
// ✅ SFX + Voice (best-effort)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import Keypad from "../components/Keypad";
import type { Dart as UIDart } from "../lib/types";

import { playImpactFromDart, playSfx, playUiConfirm, playUiClickSoft } from "../lib/sfx";
import { announceTurn, speak } from "../lib/voice";

type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

export type BattleRoyaleConfig = {
  players: PlayerLite[];
  dartsPerTurn?: number; // default 3
  lives?: number; // default 3 (life_system)
  eliminationRule?: "zero_points" | "miss_x" | "life_system";
  missLimit?: number; // default 6 (miss_x)

  sfxEnabled?: boolean;
  voiceEnabled?: boolean;
};

type Props = {
  // App.tsx passe aussi `store` pour rester homogène avec les autres modes
  store?: any;
  go: (tab: any, params?: any) => void;
  // La config est fournie par BattleRoyaleConfig via App.tsx (routeParams.config)
  config: BattleRoyaleConfig;
  // Callback fin de partie (historique)
  onFinish?: (match: any) => void;
};

type BRPlayerState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;

  alive: boolean;
  lives: number;
  misses: number;

  // ✅ FINISH / RANKING
  eliminatedAtRound?: number | null; // roundIndex (0-based) où le joueur a été éliminé
  rank?: number; // 1..N (déterminé à la fin)
};

const TARGETS: number[] = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
  10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  25, // BULL
];

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function fmtTarget(t: number) {
  if (t === 25) return "BULL";
  return String(t);
}

function isHitOnTarget(target: number, d: UIDart) {
  if (!d) return false;
  if (target === 25) return d.v === 25; // BULL ou DBULL (v=25, mult=1/2)
  return d.v === target;
}

function pointsOnTarget(target: number, d: UIDart) {
  if (!isHitOnTarget(target, d)) return 0;
  if (target === 25) {
    // v=25, mult=1 => 25 ; mult=2 => 50
    return d.mult === 2 ? 50 : 25;
  }
  return target * (d.mult || 1);
}

function avatarFallback(name: string) {
  const n = String(name || "J");
  const parts = n.trim().split(/\s+/);
  const a = (parts[0]?.[0] || "J").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b).slice(0, 2);
}


// ✅ KPI style (reprise Killer)
function HeartKpi({ value }: { value: any }) {
  const pink = "#ff79d6";
  return (
    <div
      style={{
        width: 56,
        height: 48,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 10px 18px rgba(255,121,214,.22))",
      }}
    >
      <svg width="56" height="48" viewBox="0 0 48 42" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="brHeartPinkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,121,214,.36)" />
            <stop offset="1" stopColor="rgba(0,0,0,.42)" />
          </linearGradient>
        </defs>
        <path
          d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z"
          fill="url(#brHeartPinkG)"
          stroke="rgba(255,121,214,.82)"
          strokeWidth="1.35"
        />
        <path
          d="M24 39s-17-10.2-17-23C7 10.1 11 6 16 6c3 0 5.6 1.6 7.4 4.2C25.4 7.6 28 6 32 6c5 0 9 4.1 9 10 0 12.8-17 23-17 23z"
          fill="rgba(255,121,214,.10)"
        />
      </svg>
      <div
        style={{
          position: "relative",
          textAlign: "center",
          lineHeight: 1,
          fontSize: 18,
          fontWeight: 1000,
          color: "#fff",
          transform: "translateY(2px)",
          textShadow: "0 2px 10px rgba(0,0,0,.55), 0 1px 0 rgba(0,0,0,.35)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SurvivorKpi({ value }: { value: any }) {
  const textPinkDark = "#7a0f44";
  return (
    <div
      style={{
        width: 56,
        height: 48,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 0 4px rgba(255, 55, 170, .16))",
      }}
    >
      <svg width="56" height="48" viewBox="0 0 56 48" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M28 25c6 0 11-5 11-11S34 3 28 3 17 8 17 14s5 11 11 11z"
          fill="#ffffff"
          stroke="rgba(255,255,255,.9)"
          strokeWidth="1.1"
        />
        <path
          d="M10 45c1-10 10-16 18-16s17 6 18 16"
          fill="#ffffff"
          stroke="rgba(255,255,255,.85)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "relative",
          textAlign: "center",
          lineHeight: 1,
          fontSize: 18,
          fontWeight: 1000,
          color: textPinkDark,
          transform: "translateY(2px)",
          textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 6px rgba(255,255,255,.22)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DartsDots({ total, used }: { total: number; used: number }) {
  const n = Math.max(1, Math.min(3, Number(total) || 3));
  const u = Math.max(0, Math.min(n, Number(used) || 0));
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: n }).map((_, i) => {
        const hit = i < u;
        return (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              border: `1px solid ${hit ? theme.primary + "AA" : theme.borderSoft}`,
              background: hit ? theme.primary : "rgba(0,0,0,0.25)",
              boxShadow: hit ? `0 0 12px ${theme.primary}66` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function computeFinalRanking(players: BRPlayerState[]) {
  const list = Array.isArray(players) ? players : [];

  // Survivants en premier (devrait être 1 seul), puis éliminés
  const alive = list.filter((p) => p?.alive);
  const dead = list
    .filter((p) => !p?.alive)
    .slice()
    // éliminé le plus tard = mieux classé (donc avant)
    .sort((a, b) => Number(b?.eliminatedAtRound ?? -1) - Number(a?.eliminatedAtRound ?? -1));

  const ordered = [...alive, ...dead];

  // rank 1..N
  return ordered.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));
}

function buildBattleRoyaleSummary(opts: {
  players: BRPlayerState[];
  eliminationRule: "zero_points" | "miss_x" | "life_system";
  missLimit: number;
  dartsPerTurn: number;
  roundsPlayed: number; // 1-based
  targets: number[];
}) {
  const ranking = computeFinalRanking(opts.players);
  const winner = ranking[0] || null;

  // Stats simples et fiables (Step 2 utilisera ça pour l’overlay)
  const perPlayer = ranking.map((p) => ({
    id: p.id,
    name: p.name,
    rank: p.rank ?? 999,
    alive: p.alive,
    lives: p.lives,
    misses: p.misses,
    eliminatedAtRound: p.eliminatedAtRound ?? null,
  }));

  return {
    mode: "battle_royale",
    winnerId: winner?.id ?? null,
    winnerName: winner?.name ?? null,
    ranking: perPlayer,
    meta: {
      eliminationRule: opts.eliminationRule,
      missLimit: opts.missLimit,
      dartsPerTurn: opts.dartsPerTurn,
      roundsPlayed: opts.roundsPlayed,
      targetsCount: opts.targets.length,
    },
  };
}

export default function BattleRoyalePlay({ go, config, onFinish }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const cfg: BattleRoyaleConfig | undefined = config;

  const dartsPerTurn = clampInt(cfg?.dartsPerTurn, 1, 3, 3);
  const baseLives = clampInt(cfg?.lives, 1, 9, 3);
  const eliminationRule: "zero_points" | "miss_x" | "life_system" =
    cfg?.eliminationRule || "life_system";
  const missLimit = clampInt(cfg?.missLimit, 1, 30, 6);

  const playersInit = React.useMemo<BRPlayerState[]>(() => {
    const arr = Array.isArray(cfg?.players) ? cfg!.players : [];
    return arr.map((p) => ({
      id: String(p.id),
      name: p?.name || "Joueur",
      avatarDataUrl: p?.avatarDataUrl || null,
      isBot: !!p?.isBot,

      alive: true,
      lives: baseLives,
      misses: 0,

      eliminatedAtRound: null,
    }));
  }, [cfg?.players, baseLives]);

  // Si pas de cfg: retour config
  React.useEffect(() => {
    if (!cfg || !Array.isArray(cfg.players) || cfg.players.length < 2) {
      go("battle_royale");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [players, setPlayers] = React.useState<BRPlayerState[]>(playersInit);
  const [roundIndex, setRoundIndex] = React.useState(0);
  const [turnPtr, setTurnPtr] = React.useState(0); // index sur players (ordre fixe)
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [ended, setEnded] = React.useState(false);

  // ✅ Finish guard (onFinish appelé une seule fois) + données pour overlay (Step 2)
  const finishOnceRef = React.useRef(false);
  const [finalSummary, setFinalSummary] = React.useState<any>(null);

  const target = TARGETS[roundIndex % TARGETS.length];

  const aliveCount = React.useMemo(() => players.filter((p) => p.alive).length, [players]);

  const activeIndex = React.useMemo(() => {
    if (players.length === 0) return 0;
    let idx = turnPtr % players.length;

    // sauter les éliminés
    for (let k = 0; k < players.length; k++) {
      const j = (idx + k) % players.length;
      if (players[j]?.alive) return j;
    }
    return idx;
  }, [players, turnPtr]);

  const activePlayer = players[activeIndex];

  // Voice turn (best-effort)
  const lastAnnouncedRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!activePlayer || ended) return;
    const key = `${roundIndex}:${activePlayer.id}`;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;

    // N’annonce pas si la voix n’est pas activée côté cfg (optionnelle)
    if (cfg?.voiceEnabled === false) return;

    try {
      announceTurn(activePlayer.name);
    } catch {
      // ignore
    }
  }, [activePlayer?.id, roundIndex, ended]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Keypad handlers --------
  function pushDart(d: UIDart) {
    setCurrentThrow((prev) => {
      if ((prev?.length || 0) >= dartsPerTurn) return prev;
      return [...prev, d];
    });

    // SFX impact si activé
    if (cfg?.sfxEnabled === false) return;
    try {
      playImpactFromDart(d);
    } catch {
      // ignore
    }
  }

  function onNumber(n: number) {
    pushDart({ v: n, mult: multiplier });
  }

  function onBull() {
    pushDart({ v: 25, mult: multiplier });
  }

  function onCancel() {
    // Annuler = efface la volée en cours (MVP)
    setCurrentThrow([]);
    setMultiplier(1);
    if (cfg?.sfxEnabled === false) return;
    try {
      playUiClickSoft();
    } catch {}
  }

  function onBackspace() {
    setCurrentThrow((prev) => (prev?.length ? prev.slice(0, -1) : prev));
  }

  function finishTurn() {
    if (!activePlayer || ended) return;

    const throwDarts = currentThrow || [];
    const hits = throwDarts.filter((d) => isHitOnTarget(target, d));
    const pts = throwDarts.reduce((acc, d) => acc + pointsOnTarget(target, d), 0);

    const missThisTurn = throwDarts.reduce((acc, d) => {
      const ok = isHitOnTarget(target, d);
      return acc + (ok ? 0 : 1);
    }, 0);

    let eliminatedNow = false;

    setPlayers((prev) => {
      const next = prev.map((p) => ({ ...p }));
      const p = next[activeIndex];
      if (!p || !p.alive) return next;

      if (eliminationRule === "life_system") {
        if (hits.length === 0) {
          p.lives = Math.max(0, (p.lives || 0) - 1);
          if (p.lives <= 0) {
            p.alive = false;
            p.eliminatedAtRound = roundIndex;
            eliminatedNow = true;
          }
        }
      } else if (eliminationRule === "zero_points") {
        if (pts <= 0) {
          p.alive = false;
          p.eliminatedAtRound = roundIndex;
          eliminatedNow = true;
        }
      } else if (eliminationRule === "miss_x") {
        p.misses = (p.misses || 0) + missThisTurn;
        if (p.misses >= missLimit) {
          p.alive = false;
          p.eliminatedAtRound = roundIndex;
          eliminatedNow = true;
        }
      }

      return next;
    });

    // SFX/Voice élimination (best-effort)
    if (eliminatedNow) {
      if (cfg?.sfxEnabled !== false) {
        try {
          playSfx("/sounds/killer-dead.mp3");
        } catch {}
      }
      if (cfg?.voiceEnabled !== false) {
        try {
          setTimeout(() => speak(`${activePlayer.name} est éliminé`), 900);
        } catch {}
      }
    }

    // Nettoyage volée + multiplicateur
    setCurrentThrow([]);
    setMultiplier(1);

    // Avance pointeur
    const nextPtr = (activeIndex + 1) % (players.length || 1);

    // Si on revient au début du cycle (tous les vivants ont joué), on incrémente le round
    const looped = nextPtr <= activeIndex;
    setTurnPtr(nextPtr);

    if (looped) setRoundIndex((r) => r + 1);

    // Fin de partie ?
    setTimeout(() => {
      // recalcul propre après setPlayers
      setPlayers((prev) => {
        const alive = prev.filter((p) => p.alive);
        if (alive.length <= 1 && prev.length >= 2) {
          setEnded(true);
          if (cfg?.sfxEnabled !== false) {
            try {
              playUiConfirm();
            } catch {}
          }
        }
        return prev;
      });
    }, 0);
  }

  // ✅ FIN: onFinish + summary (une seule fois)
  React.useEffect(() => {
    if (!ended) return;
    if (finishOnceRef.current) return;
    finishOnceRef.current = true;

    try {
      const summary = buildBattleRoyaleSummary({
        players,
        eliminationRule,
        missLimit,
        dartsPerTurn,
        roundsPlayed: roundIndex + 1,
        targets: TARGETS,
      });

      setFinalSummary(summary);

      onFinish?.({
        kind: "battle_royale",
        status: "finished",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: computeFinalRanking(players).map((p) => ({
          id: p.id,
          name: p.name,
          avatarDataUrl: p.avatarDataUrl ?? null,
        })),
        winnerId: summary?.winnerId ?? null,
        summary,
        payload: {
          summary,
          config: cfg,
          roundsPlayed: roundIndex + 1,
        },
      });
    } catch (e) {
      console.warn("[BattleRoyale] onFinish summary error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const pageBg = theme.bg;
  const cardBg = theme.card;

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: cardBg,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
  };

  const miniBadge: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.22)",
    fontWeight: 900,
    fontSize: 12.5,
    color: theme.textSoft,
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: pageBg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        padding: 12,
        gap: 10,
        overscrollBehavior: "none",
      }}
    >
      {/* Header sticky */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: pageBg,
          paddingBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BackDot
            onClick={() => go("battle_royale")}
            glow={theme.primary + "88"}
            title={t("common.back", "Retour")}
          />

          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 1000,
                letterSpacing: 1,
                color: theme.primary,
                textShadow: `0 0 12px ${theme.primary}66`,
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              BATTLE ROYALE
            </div>
            <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 900, marginTop: 2 }}>
              {t("common.round", "Round")} {roundIndex + 1} • {t("common.target", "Cible")} {fmtTarget(target)}
            </div>
          </div>

          <InfoDot onClick={() => setInfoOpen(true)} glow={theme.primary + "88"} />
        </div>
      </div>

      {/* Content (scroll) — 1 colonne pour éviter tout débordement */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, maxWidth: 860, margin: "0 auto" }}>

        <div style={{ ...cardShell, width: "100%" }}>
          <div
            style={{
              padding: 8,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              alignItems: "stretch",
            }}
          >
            {/* gauche (reprend ShanghaiPlay) */}
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                padding: 8,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    border: `1px solid ${theme.primary}44`,
                    background: "linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.34))",
                    boxShadow: `0 0 18px ${theme.primary}22`,
                    padding: "5px 10px",
                    display: "grid",
                    placeItems: "center",
                    minHeight: 36,
                  }}
                >
                  <div style={{ fontSize: 10.2, letterSpacing: 0.9, opacity: 0.85, textTransform: "uppercase" }}>
                    {t("common.round", "Round")}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 1000,
                      color: theme.primary,
                      textShadow: `0 0 10px ${theme.primary}55`,
                      lineHeight: 1,
                      marginTop: 1,
                    }}
                  >
                    {roundIndex + 1}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    border: `1px solid ${theme.primary}44`,
                    background: "linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.34))",
                    boxShadow: `0 0 18px ${theme.primary}22`,
                    padding: "5px 10px",
                    display: "grid",
                    placeItems: "center",
                    minHeight: 36,
                  }}
                >
                  <div style={{ fontSize: 10.2, letterSpacing: 0.9, opacity: 0.85, textTransform: "uppercase" }}>
                    {t("common.target", "Cible")}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 1000,
                      color: theme.primary,
                      textShadow: `0 0 10px ${theme.primary}55`,
                      lineHeight: 1,
                      marginTop: 1,
                    }}
                  >
                    {fmtTarget(target)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.14)",
                  padding: 8,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.22)",
                    border: `1px solid ${theme.borderSoft}`,
                    boxShadow: `0 0 16px rgba(0,0,0,.35)`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {activePlayer?.avatarDataUrl ? (
                    <img
                      src={activePlayer.avatarDataUrl}
                      alt=""
                      draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <span style={{ opacity: 0.75, fontWeight: 950, fontSize: 22 }}>
                      {avatarFallback(activePlayer?.name || "J")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* droite */}
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                padding: 8,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: 0.9, opacity: 0.85, textTransform: "uppercase" }}>
                    {t("common.activePlayer", "Joueur actif")}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 1000,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activePlayer?.name || "—"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {eliminationRule === "life_system" ? (
                    <HeartKpi value={activePlayer?.lives ?? 0} />
                  ) : (
                    <div style={miniBadge}>
                      {t("common.misses", "Ratés")}: {activePlayer?.misses ?? 0}/{missLimit}
                    </div>
                  )}
                  <SurvivorKpi value={aliveCount} />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.14)",
                  padding: "8px 10px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.textSoft }}>
                  {t("common.darts", "Fléchettes")}
                </div>
                <DartsDots total={dartsPerTurn} used={currentThrow.length} />
              </div>

              {ended && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: `1px solid ${theme.primary}55`,
                    background: `${theme.primary}18`,
                    fontWeight: 1000,
                  }}
                >
                  {(() => {
                    const winner = players.find((p) => p.alive);
                    return winner
                      ? `${t("common.winner", "Vainqueur")} : ${winner.name}`
                      : t("common.finished", "Partie terminée");
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...cardShell, padding: 12 }}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>
            {t("common.players", "Joueurs")}
          </div>

          {/* Liste joueurs: seul conteneur scrollable */}
          <div
            style={{
              maxHeight: "min(32vh, 260px)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              paddingRight: 6,
            }}
          >
            {players.map((p, idx) => {
              const isActive = idx === activeIndex && p.alive && !ended;
              const dead = !p.alive;

              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 8px",
                    borderRadius: 14,
                    border: `1px solid ${isActive ? theme.primary + "66" : theme.borderSoft}`,
                    background: dead
                      ? "rgba(0,0,0,0.25)"
                      : isActive
                      ? theme.primary + "1a"
                      : "rgba(0,0,0,0.12)",
                    opacity: dead ? 0.55 : 1,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `1px solid ${theme.borderSoft}`,
                      background: "rgba(0,0,0,0.25)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 1000,
                      flex: "0 0 auto",
                    }}
                  >
                    {p.avatarDataUrl ? (
                      <img
                        src={p.avatarDataUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <span style={{ fontSize: 12 }}>{avatarFallback(p.name)}</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 1000,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {eliminationRule === "life_system" && (
                        <span style={miniBadge}>{t("common.lives", "Vies")}: {p.lives}</span>
                      )}
                      {eliminationRule === "miss_x" && (
                        <span style={miniBadge}>
                          {t("common.misses", "Ratés")}: {p.misses}/{missLimit}
                        </span>
                      )}
                      {!p.alive && <span style={{ ...miniBadge, borderColor: "rgba(255,80,80,.35)", color: "rgba(255,200,200,.9)" }}>
                        {t("common.eliminated", "Éliminé")}
                      </span>}
                    </div>
                  </div>

                  {isActive && (
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `1px solid ${theme.primary}66`,
                        background: theme.primary + "22",
                        fontWeight: 1000,
                        fontSize: 12,
                        color: theme.text,
                      }}
                    >
                      {t("common.turn", "Tour")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              // Re-start simple (MVP): reset state
              setPlayers(playersInit);
              setRoundIndex(0);
              setTurnPtr(0);
              setCurrentThrow([]);
              setMultiplier(1);
              setEnded(false);
              finishOnceRef.current = false;
              setFinalSummary(null);
              if (cfg?.sfxEnabled !== false) {
                try { playUiClickSoft(); } catch {}
              }
            }}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 1000,
              cursor: "pointer",
            }}
            type="button"
          >
            {t("common.restart", "Relancer (MVP)")}
          </button>
        </div>
        </div>
      </div>

      {/* Keypad fixed (BottomNav masquée pendant la partie) */}
      <div style={{ marginTop: "auto" }}>
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={onBackspace}
          onCancel={onCancel}
          onNumber={onNumber}
          onBull={onBull}
          onValidate={finishTurn}
          hidePreview={false}
          hideTotal={false}
          centerSlot={
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 12, color: "rgba(255,255,255,.7)" }}>
                {t("common.target", "Cible")}
              </div>
              <div style={{ fontWeight: 1100, fontSize: 18, color: theme.primary, textShadow: `0 0 12px ${theme.primary}55` }}>
                {fmtTarget(target)}
              </div>
            </div>
          }
        />
      </div>

      {/* Overlay Info (règles + déroulé) */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 96vw)",
              maxHeight: "86vh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              boxShadow: "0 16px 44px rgba(0,0,0,.6)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 1100, letterSpacing: 0.6, color: theme.primary }}>
                Battle Royale — Infos
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                style={{
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.25)",
                  color: theme.text,
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                {t("common.close", "Fermer")}
              </button>
            </div>

            <div style={{ marginTop: 12, color: theme.textSoft, fontWeight: 900, lineHeight: 1.35 }}>
              <div style={{ ...cardShell, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 1100, marginBottom: 6 }}>Principe</div>
                <div>
                  Chaque round impose une <b>cible</b>. À ton tour, tu joues {dartsPerTurn} fléchettes.
                  Selon la règle, tu dois toucher la cible pour survivre.
                </div>
              </div>

              <div style={{ ...cardShell, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 1100, marginBottom: 6 }}>Déroulé d’une partie</div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Round = une cible commune (20→…→1→BULL).</li>
                  <li>Tous les joueurs vivants jouent une volée chacun.</li>
                  <li>Après chaque volée, on applique la règle d’élimination.</li>
                  <li>Quand il ne reste qu’un joueur, il gagne.</li>
                </ol>
              </div>

              <div style={{ ...cardShell, padding: 12 }}>
                <div style={{ fontWeight: 1100, marginBottom: 6 }}>Règle active</div>
                <div>
                  {eliminationRule === "life_system" && (
                    <>Système de vies : 0 hit sur la cible = -1 vie. À 0 vie, élimination.</>
                  )}
                  {eliminationRule === "zero_points" && (
                    <>0 point sur la cible pendant la volée = élimination immédiate.</>
                  )}
                  {eliminationRule === "miss_x" && (
                    <>X ratés : chaque fléchette hors cible = +1 raté. À {missLimit}, élimination.</>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
