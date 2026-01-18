// ============================================
// src/pages/FiveLivesPlay.tsx
// LES 5 VIES — PLAY
// Rendu cohérent avec les autres jeux (Warfare/Killer):
// - Fond theme.bg + cards theme.card
// - Liste joueurs scrollable + halo actif
// - Keypad existant (même UX que Warfare)
// - PNG dead-active/dead-list + coeur (copié de KillerPlay)
// ============================================

import React from "react";
import type { Dart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import Keypad from "../components/Keypad";

import deadActiveIcon from "../assets/icons/dead-active.png";
import deadListIcon from "../assets/icons/dead-list.png";

import type { FiveLivesConfig, FiveLivesPlayerLite } from "./FiveLivesConfig";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  config: FiveLivesConfig;
  onFinish?: (m: any) => void;
};

type PlayerState = FiveLivesPlayerLite & {
  lives: number;
  eliminated: boolean;
};

function fmtDart(d: Dart) {
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

// -----------------------------
// ✅ Heart KPI (copié de KillerPlay)
// -----------------------------
function HeartKpi({ value }: { value: any }) {
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
          <linearGradient id="heartPinkG_5l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,121,214,.36)" />
            <stop offset="1" stopColor="rgba(0,0,0,.42)" />
          </linearGradient>
        </defs>
        <path
          d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z"
          fill="url(#heartPinkG_5l)"
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

function MiniHeart({ value, active }: { value: any; active?: boolean }) {
  const filter = active
    ? `drop-shadow(0 0 5px rgba(255,255,255,.30)) drop-shadow(0 0 10px rgba(255,121,214,.38))`
    : `drop-shadow(0 0 5px rgba(255,255,255,.22))`;

  return (
    <div
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 32,
        height: 28,
        position: "relative",
        filter,
      }}
      aria-label={`Vies: ${value}`}
      title={`Vies: ${value}`}
    >
      <svg width="32" height="28" viewBox="0 0 48 42">
        <path
          d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z"
          fill="rgba(255,121,214,.36)"
          stroke="rgba(255,255,255,.55)"
          strokeWidth="1.2"
        />
        <path
          d="M24 39s-17-10.2-17-23C7 10.1 11 6 16 6c3 0 5.6 1.6 7.4 4.2C25.4 7.6 28 6 32 6c5 0 9 4.1 9 10 0 12.8-17 23-17 23z"
          fill="rgba(255,121,214,.12)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 1000,
          color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,.55)",
          transform: "translateY(1px)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function FiveLivesPlay({ store, go, config, onFinish }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  const startingLives = clampInt((config as any)?.startingLives, 1, 15, 5);

  const [players, setPlayers] = React.useState<PlayerState[]>(() =>
    (config.players || []).map((p) => ({
      ...p,
      lives: startingLives,
      eliminated: false,
    }))
  );

  const [turnIndex, setTurnIndex] = React.useState(0);
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<Dart[]>([]);
  const [lastScoreToBeat, setLastScoreToBeat] = React.useState<number | null>(null);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [endOpen, setEndOpen] = React.useState(false);

  const aliveIds = React.useMemo(() => players.filter((p) => !p.eliminated).map((p) => p.id), [players]);

  const activeIndex = React.useMemo(() => {
    if (!players.length) return 0;
    const n = players.length;
    let i = ((turnIndex % n) + n) % n;
    // saute les éliminés
    for (let k = 0; k < n; k++) {
      const idx = (i + k) % n;
      if (!players[idx]?.eliminated) return idx;
    }
    return 0;
  }, [turnIndex, players]);

  const activePlayer = players[activeIndex] || null;

  function nextAliveIndex(from: number, list: PlayerState[]) {
    const n = list.length;
    if (!n) return 0;
    for (let step = 1; step <= n; step++) {
      const idx = (from + step) % n;
      if (!list[idx].eliminated) return idx;
    }
    return from;
  }

  function computeVisitScore(darts: Dart[]) {
    return (darts || []).reduce((sum, d) => {
      if (!d) return sum;
      const v = Number(d.v) || 0;
      const m = Number(d.mult) || 1;
      return sum + v * m;
    }, 0);
  }

  function applyTurn(darts: Dart[]) {
    if (!activePlayer) return;
    if (winnerId) return;

    const score = computeVisitScore(darts);
    const shouldBeat = lastScoreToBeat;

    const updated = players.map((p) => ({ ...p }));
    const p = updated[activeIndex];
    if (!p || p.eliminated) return;

    if (shouldBeat !== null && score <= shouldBeat) {
      p.lives = Math.max(0, (p.lives || 0) - 1);
      if (p.lives <= 0) p.eliminated = true;
    }

    const alive = updated.filter((x) => !x.eliminated);
    const nextIdx = nextAliveIndex(activeIndex, updated);

    setPlayers(updated);
    setTurnIndex(nextIdx);
    if (alive.length === 1) {
      setWinnerId(alive[0].id);
      setEndOpen(true);
    }

    setLastScoreToBeat(score);
    setCurrentThrow([]);
    setMult(1);
  }

  function onNumber(v: number) {
    if (winnerId) return;
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, { v, mult } as any];
    });
  }

  function onBull() {
    if (winnerId) return;
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, { v: 25, mult } as any];
    });
  }

  const visitScore = computeVisitScore(currentThrow);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 110,
        background: PAGE_BG,
        color: theme.text,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => go("five_lives_config")}
          style={{
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← {t("common.back", "Retour")}
        </button>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: theme.textSoft }}>{t("fiveLives.toBeat", "Score à battre")}</div>
          <div style={{ marginTop: 2, fontWeight: 1000, color: theme.primary }}>
            {lastScoreToBeat === null ? "—" : lastScoreToBeat}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: "center" }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 1.2,
            color: theme.primary,
            textShadow: `0 0 14px ${theme.primary}66`,
            textTransform: "uppercase",
          }}
        >
          {t("fiveLives.title", "LES 5 VIES")}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: theme.textSoft }}>
          {t("fiveLives.play.subtitle", "Sur 3 fléchettes, fais STRICTEMENT plus que la volée précédente.")}
        </div>
      </div>

      {/* KPI */}
      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>{t("fiveLives.turn", "Tour")}</div>
          <div style={{ marginTop: 4, fontWeight: 1000, fontSize: 16 }}>
            {activePlayer ? activePlayer.name : "—"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: theme.textSoft }}>{t("fiveLives.visit", "Volée")}</div>
            <div style={{ marginTop: 2, fontWeight: 1000 }}>{visitScore}</div>
          </div>
          {activePlayer ? <HeartKpi value={activePlayer.lives} /> : <HeartKpi value={"—"} />}
        </div>
      </div>

      {/* Liste joueurs (scrollable) */}
      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
          height: "calc(100vh - 16px - 52px - 20px - 70px - 110px)",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
            {t("fiveLives.players", "Joueurs")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {aliveIds.length}/{players.length}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {players.map((p, idx) => {
            const isActive = idx === activeIndex && !p.eliminated && !winnerId;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: `1px solid ${isActive ? theme.primary + "66" : theme.borderSoft}`,
                  background: isActive ? theme.primary + "10" : "rgba(255,255,255,.03)",
                  boxShadow: isActive ? `0 0 22px ${theme.primary}18` : "none",
                  opacity: p.eliminated ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `1px solid ${isActive ? theme.primary : theme.borderSoft}`,
                      background: "rgba(255,255,255,.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {p.avatarDataUrl ? (
                      <img src={p.avatarDataUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontWeight: 900 }}>{(p.name || "?").slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 1000,
                        color: isActive ? theme.primary : theme.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: theme.textSoft }}>
                      {p.eliminated ? t("fiveLives.dead", "Éliminé") : t("fiveLives.alive", "En jeu")}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.eliminated ? (
                    <img
                      src={isActive ? (deadActiveIcon as any) : (deadListIcon as any)}
                      alt="DEAD"
                      style={{ width: 38, height: 38, objectFit: "contain", filter: "contrast(1.1) brightness(1.05)" }}
                    />
                  ) : (
                    <MiniHeart value={p.lives} active={isActive} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keypad */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 12, zIndex: 30 }}>
        <Keypad
          currentThrow={currentThrow}
          multiplier={mult}
          onSimple={() => setMult(1)}
          onDouble={() => setMult(2)}
          onTriple={() => setMult(3)}
          onCancel={() => {
            // Annuler la volée en cours (comme les autres jeux)
            setCurrentThrow([]);
          }}
          onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
          onNumber={onNumber}
          onBull={onBull}
          onValidate={() => applyTurn(currentThrow)}
          hideTotal
          centerSlot={
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: theme.textSoft }}>{t("fiveLives.throw", "Volée")}</div>
              <div style={{ marginTop: 4, fontWeight: 900, letterSpacing: 0.4 }}>
                {currentThrow.length ? currentThrow.map(fmtDart).join("  ") : "—"}
              </div>
            </div>
          }
        />
      </div>

      {/* End overlay */}
      {endOpen && winnerId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 12px ${theme.primary}66`,
              }}
            >
              {t("fiveLives.win", "Victoire")}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: theme.textSoft, lineHeight: 1.35 }}>
              {t("fiveLives.win.desc", "Dernier survivant :")}{" "}
              <span style={{ fontWeight: 1000, color: theme.text }}>
                {(players.find((p) => p.id === winnerId)?.name as any) || winnerId}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setEndOpen(false);
                  go("five_lives_config");
                }}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.22)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.quit", "Quitter")}
              </button>

              <button
                type="button"
                onClick={() => {
                  // payload history (compatible pushHistory)
                  const createdAt = Date.now();
                  const match: any = {
                    kind: "five_lives",
                    createdAt,
                    winnerId,
                    players: (players || []).map((p) => ({
                      id: p.id,
                      name: p.name,
                      avatarDataUrl: p.avatarDataUrl || null,
                    })),
                    summary: {
                      startingLives,
                      lastScoreToBeat,
                    },
                    payload: {
                      config,
                      finalPlayers: players,
                      winnerId,
                      startingLives,
                    },
                  };
                  setEndOpen(false);
                  onFinish?.(match);
                }}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "none",
                  background: theme.primary,
                  color: "#000",
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: `0 12px 26px ${theme.primary}22`,
                }}
              >
                {t("common.save", "Sauvegarder")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
