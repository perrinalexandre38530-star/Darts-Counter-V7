// @ts-nocheck
// =============================================================
// src/pages/FiveLivesPlay.tsx
// LES 5 VIES — PLAY (style proche KillerPlay)
// - Volée de 3 fléchettes : doit battre STRICTEMENT le score précédent
// - Échec => -1 vie ; à 0 vie => éliminé
// - Dernier joueur en vie => victoire + pushHistory via onFinish
// =============================================================

import React from "react";
import type { Store, Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import Keypad from "../components/Keypad";

import deadActiveIcon from "../assets/icons/dead-active.png";
import deadListIcon from "../assets/icons/dead-list.png";

import type { FiveLivesConfig } from "./FiveLivesConfig";

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
  config: FiveLivesConfig;
  onFinish?: (m: any) => void;
};

type PState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
  lives: number;
  eliminated: boolean;
};

// -----------------------------
// ✅ Reprise Killer: Heart KPI + MiniHeart (même rendu visuel)
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
      aria-label={`Vies: ${value}`}
      title={`Vies: ${value}`}
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
          transform: "translateY(1px)",
          textShadow: "0 0 6px rgba(255,255,255,.22), 0 2px 8px rgba(0,0,0,.55)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function scoreOfThrow(darts: UIDart[]) {
  return (darts || []).reduce((acc, d) => {
    if (!d) return acc;
    if (d.v === 0) return acc;
    if (d.v === 25) return acc + (d.mult === 2 ? 50 : 25);
    return acc + d.v * d.mult;
  }, 0);
}

function fmtChip(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const p = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${p}${d.v}`;
}

function nextAliveIndex(players: PState[], fromIndex: number) {
  if (!players?.length) return 0;
  for (let i = 1; i <= players.length; i++) {
    const idx = (fromIndex + i) % players.length;
    if (!players[idx]?.eliminated) return idx;
  }
  return fromIndex;
}

export default function FiveLivesPlay({ store, go, config, onFinish }: Props) {
  const { theme } = useTheme();

  const initialPlayers = React.useMemo<PState[]>(() => {
    const lives = Number.isFinite(+config?.startingLives) ? Math.max(1, Math.min(20, Math.trunc(+config.startingLives))) : 5;
    return (config?.players || []).map((p: any) => {
      const prof = (store?.profiles || []).find((x: any) => x?.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "Joueur",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
        isBot: !!p?.isBot,
        botLevel: p?.botLevel,
        lives,
        eliminated: false,
      };
    });
  }, [config, store?.profiles]);

  const [players, setPlayers] = React.useState<PState[]>(() => initialPlayers);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [lastScoreToBeat, setLastScoreToBeat] = React.useState<number | null>(null);
  const [visit, setVisit] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [flash, setFlash] = React.useState<null | { kind: "ok" | "fail" | "out"; msg: string }>(null);

  // sécurité: si config change, reset
  React.useEffect(() => {
    setPlayers(initialPlayers);
    setActiveIndex(0);
    setLastScoreToBeat(null);
    setVisit([]);
    setMultiplier(1);
    setFlash(null);
  }, [initialPlayers]);

  const activePlayer = players?.[activeIndex] || null;
  const alivePlayers = (players || []).filter((p) => !p.eliminated);

  React.useEffect(() => {
    if (alivePlayers.length === 1 && players.length >= 2) {
      const winner = alivePlayers[0];
      const match = {
        id: `five-lives-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: "five_lives",
        createdAt: config?.createdAt ?? Date.now(),
        winnerId: winner?.id,
        players: (players || []).map((p) => ({
          id: p.id,
          name: p.name,
          avatarDataUrl: p.avatarDataUrl ?? null,
        })),
        summary: {
          startingLives: config?.startingLives ?? 5,
          winnerName: winner?.name,
        },
        payload: {
          mode: "five_lives",
          startingLives: config?.startingLives ?? 5,
          randomStartOrder: !!config?.randomStartOrder,
          players: (players || []).map((p) => ({
            id: p.id,
            name: p.name,
            avatarDataUrl: p.avatarDataUrl ?? null,
            isBot: !!p.isBot,
            botLevel: p.botLevel,
            lives: p.lives,
            eliminated: p.eliminated,
          })),
        },
      };
      try {
        onFinish?.(match);
      } catch {}
      // retour Stats ou menu : on reste cohérent avec autres jeux => retour Games
      setTimeout(() => {
        try {
          go?.("statsHub", { tab: "history" });
        } catch {
          go?.("games");
        }
      }, 350);
    }
  }, [alivePlayers.length, players, config, onFinish, go]);

  function applyThrow(d: UIDart) {
    setVisit((prev) => {
      const next = [...(prev || [])];
      if (next.length >= 3) return next;
      next.push(d);
      return next;
    });
  }

  function undo() {
    setVisit((prev) => {
      const next = [...(prev || [])];
      next.pop();
      return next;
    });
  }

  function validateVisit() {
    const darts = [...(visit || [])];
    while (darts.length < 3) darts.push({ v: 0, mult: 1 });
    const score = scoreOfThrow(darts);

    // premier joueur (ou après reset) : aucune contrainte
    if (lastScoreToBeat === null) {
      setLastScoreToBeat(score);
      setFlash({ kind: "ok", msg: `Référence : ${score}` });
      setTimeout(() => setFlash(null), 650);
      setVisit([]);
      setMultiplier(1);
      setActiveIndex((idx) => nextAliveIndex(players, idx));
      return;
    }

    const mustBeat = lastScoreToBeat;
    const success = score > mustBeat;

    setPlayers((prev) => {
      const next = [...prev];
      const p = { ...(next[activeIndex] as any) };
      if (!success) {
        p.lives = Math.max(0, (p.lives || 0) - 1);
        if (p.lives <= 0) p.eliminated = true;
      }
      next[activeIndex] = p as any;
      return next;
    });

    if (success) {
      setFlash({ kind: "ok", msg: `+${score} (OK)` });
    } else {
      const livesAfter = Math.max(0, (activePlayer?.lives || 0) - 1);
      setFlash({ kind: livesAfter <= 0 ? "out" : "fail", msg: livesAfter <= 0 ? "Éliminé" : `Perd 1 vie (${score} ≤ ${mustBeat})` });
    }

    setLastScoreToBeat(score);
    setTimeout(() => setFlash(null), 750);
    setVisit([]);
    setMultiplier(1);

    // passer au prochain vivant (si le joueur vient d'être éliminé, il sera skippé)
    setTimeout(() => {
      setActiveIndex((idx) => nextAliveIndex(players, idx));
    }, 120);
  }

  const pageBg = "#050509";
  const accent = theme?.primary || "#ffc63a";

  const card: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  };

  const playerRow = (p: PState, idx: number): React.CSSProperties => {
    const isActive = idx === activeIndex;
    const isOut = !!p.eliminated;
    return {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 16,
      border: isActive ? `1px solid ${accent}` : "1px solid rgba(255,255,255,.08)",
      background: isOut ? "rgba(255,255,255,.03)" : isActive ? "rgba(255,198,58,.10)" : "rgba(255,255,255,.04)",
      opacity: isOut ? 0.45 : 1,
      boxShadow: isActive ? `0 0 24px rgba(255,198,58,.22)` : undefined,
    };
  };

  const chip: React.CSSProperties = {
    display: "inline-block",
    minWidth: 72,
    textAlign: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(0,0,0,.55)",
    border: "1px solid rgba(255,255,255,.08)",
    fontWeight: 900,
    letterSpacing: 0.4,
    color: "#e9d7ff",
    boxShadow: "0 0 22px rgba(250,213,75,.18)",
  };

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: pageBg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: 10,
        gap: 10,
        overscrollBehavior: "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={() => (go ? go("five_lives_config") : null)}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>

        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 2, fontSize: 18, color: accent, textShadow: `0 0 18px rgba(255,198,58,.25)` }}>
            LES 5 VIES
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
            Bats la volée précédente (strictement) ou perds une vie
          </div>
        </div>

        <div style={{ width: 96 }} />
      </div>

      {/* Score à battre */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Score à battre</div>
          <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: 0.5 }}>
            {lastScoreToBeat === null ? "—" : lastScoreToBeat}
          </div>
        </div>

        {/* ✅ KPI Vies (comme Killer) */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
          <HeartKpi value={activePlayer?.eliminated ? 0 : activePlayer?.lives ?? "—"} />
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Joueur</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{activePlayer?.name ?? "—"}</div>
        </div>
      </div>

      {/* Players */}
      <div style={{ ...card, flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(players || []).map((p, idx) => (
            <div key={p.id} style={playerRow(p, idx)}>
              <div style={{ position: "relative" }}>
                <ProfileStarRing size={44} />
                <ProfileAvatar
                  avatarDataUrl={p.avatarDataUrl}
                  size={44}
                  style={{ position: "absolute", inset: 0, margin: "auto" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                  {p.isBot ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>(BOT{p.botLevel ? ` · ${p.botLevel}` : ""})</span> : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {p.eliminated ? "Éliminé" : `${p.lives} vie${p.lives > 1 ? "s" : ""}`}
                </div>
              </div>

              {/* Vies */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {p.eliminated ? (
                  <img
                    src={idx === activeIndex ? deadActiveIcon : deadListIcon}
                    alt="DEAD"
                    style={{ width: 30, height: 30, objectFit: "contain", filter: "drop-shadow(0 8px 18px rgba(0,0,0,.45))" }}
                  />
                ) : (
                  <MiniHeart value={p.lives} active={idx === activeIndex} />
                )}

                {/* si on autorise >9 vies, on garde un suffixe lisible */}
                {!p.eliminated && p.lives > 9 ? (
                  <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 2 }}>+{p.lives - 9}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chips + Flash */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <span style={chip}>{fmtChip(visit?.[0])}</span>
          <span style={chip}>{fmtChip(visit?.[1])}</span>
          <span style={chip}>{fmtChip(visit?.[2])}</span>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Total: <span style={{ fontWeight: 1000 }}>{scoreOfThrow(visit)}</span>
          </div>
          <div style={{ fontSize: 12, opacity: flash ? 1 : 0, fontWeight: 900, color: flash?.kind === "ok" ? "#8be0b8" : flash?.kind === "out" ? "#ff6b6b" : "#ffc63a" }}>
            {flash?.msg ?? ""}
          </div>
        </div>
      </div>

      {/* Keypad */}
      <div>
        <Keypad
          currentThrow={visit}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={() => {}}
          onCancel={undo}
          onNumber={(n: number) => applyThrow({ v: n, mult: multiplier })}
          onBull={() => {
            const m = multiplier === 2 ? 2 : 1;
            applyThrow({ v: 25, mult: m });
          }}
          onValidate={validateVisit}
          hidePreview={true}
        />
      </div>
    </div>
  );
}
