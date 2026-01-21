// ============================================
// src/pages/WarfarePlay.tsx
// WARFARE — PLAY
// - 1v1 (2 joueurs) : TOP vs BOTTOM
// - Keypad existant pour la saisie des flèches (même rendu que les autres jeux)
// - Undo local (annule la dernière volée validée)
// ============================================

import React from "react";
import { useViewport } from "../hooks/useViewport";
import type { Dart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ScoreInputHub from "../components/ScoreInputHub";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import type { WarfareConfig, WarfareZoneRule } from "./WarfareConfig";

type Props = {
  go: (tab: any, params?: any) => void;
  config: WarfareConfig;
};

type Army = "TOP" | "BOTTOM";

const TOP_ARMY = [11, 14, 9, 12, 5, 20, 1, 18, 4, 13] as const;
const BOTTOM_ARMY = [6, 10, 15, 2, 17, 3, 19, 7, 16, 8] as const;

type ApplyDelta = {
  removedFromTop: number[];
  removedFromBottom: number[];
};

type PlayerStats = {
  darts: number;
  kills: number;
  friendlyKills: number;
  heals: number;
  bombard: number;
  invalidZone: number;
};

function zoneAllowed(mult: 1 | 2 | 3, rule: WarfareZoneRule) {
  if (rule === "ANY") return true;
  if (rule === "SINGLE_DOUBLE") return mult === 1 || mult === 2;
  return mult === 2; // DOUBLE_ONLY
}

function fmtDart(d: Dart) {
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

// Alias robuste (évite crash si slot vide)
function fmt(d?: Dart) {
  if (!d) return "—";
  return fmtDart(d);
}

export default function WarfarePlay({ go, config }: Props) {
  const { theme } = useTheme();
  const { isLandscapeTablet } = useViewport({ tabletMinWidth: 900 });
  const { t } = useLang();

  // ------------------------------------------------------------
  // Normalisation config (supporte legacy 1v1 + nouveau mode équipes)
  // ------------------------------------------------------------
  type PlayerLite = { id: string; name: string; avatarDataUrl?: string | null; isBot?: boolean };
  const safeArr = (v: any): PlayerLite[] => (Array.isArray(v) ? (v.filter(Boolean) as PlayerLite[]) : []);

  const normalized = React.useMemo(() => {
    const anyCfg: any = config || {};

    // Nouveau format (équipes)
    if (anyCfg?.teams) {
      const top = safeArr(anyCfg?.teams?.TOP ?? anyCfg?.teams?.top);
      const bottom = safeArr(anyCfg?.teams?.BOTTOM ?? anyCfg?.teams?.bottom);
      return {
        mode: "TEAMS" as const,
        teams: { TOP: top, BOTTOM: bottom },
        // compat options
        zoneRule: (anyCfg?.zoneRule || "ANY") as WarfareZoneRule,
        friendlyFire: !!anyCfg?.friendlyFire,
        handicapP1Harder: !!anyCfg?.handicapP1Harder,
        // variantes DBULL (si présentes)
        dbullBombard: !!(anyCfg?.dbullBombard || anyCfg?.variantDbullBombard),
        dbullHeal: !!(anyCfg?.dbullHeal || anyCfg?.variantDbullHeal || anyCfg?.dbullSoin),
      };
    }

    // Ancien format (duel 1v1)
    const players = safeArr(anyCfg?.players);
    const p1 = players[0];
    const p2 = players[1];
    const p1Army: Army = anyCfg?.p1Army === "BOTTOM" ? "BOTTOM" : "TOP";
    const teams = {
      TOP: p1Army === "TOP" ? [p1].filter(Boolean) : [p2].filter(Boolean),
      BOTTOM: p1Army === "TOP" ? [p2].filter(Boolean) : [p1].filter(Boolean),
    } as { TOP: PlayerLite[]; BOTTOM: PlayerLite[] };

    return {
      mode: "DUEL" as const,
      teams,
      zoneRule: (anyCfg?.zoneRule || "ANY") as WarfareZoneRule,
      friendlyFire: anyCfg?.friendlyFire !== false,
      handicapP1Harder: !!anyCfg?.handicapP1Harder,
      dbullBombard: false,
      dbullHeal: false,
    };
  }, [config]);

  const teams = normalized.teams;

  // Guard: si config invalide (aucun joueur dans un camp), on évite tout crash.
  const invalidTeams = teams.TOP.length === 0 || teams.BOTTOM.length === 0;

  const [aliveTop, setAliveTop] = React.useState<number[]>(() => [...TOP_ARMY]);
  const [aliveBottom, setAliveBottom] = React.useState<number[]>(() => [...BOTTOM_ARMY]);

  // turnIndex = 0 => TOP, 1 => BOTTOM
  const [turnIndex, setTurnIndex] = React.useState<0 | 1>(0);
  const [cursorTop, setCursorTop] = React.useState(0);
  const [cursorBottom, setCursorBottom] = React.useState(0);

  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<Dart[]>([]);
  const [undoStack, setUndoStack] = React.useState<ApplyDelta[]>([]);
  const [winnerArmy, setWinnerArmy] = React.useState<null | Army>(null);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const [statsByPlayerId, setStatsByPlayerId] = React.useState<Record<string, PlayerStats>>({});

  const activeArmy: Army = turnIndex === 0 ? "TOP" : "BOTTOM";
  const activeCursor = activeArmy === "TOP" ? cursorTop : cursorBottom;
  const activeTeam = teams[activeArmy];
  const activePlayer = activeTeam.length ? activeTeam[activeCursor % activeTeam.length] : null;

  const getStats = React.useCallback(
    (id?: string | null): PlayerStats => {
      if (!id) return { darts: 0, kills: 0, friendlyKills: 0, heals: 0, bombard: 0, invalidZone: 0 };
      return (
        statsByPlayerId[id] || { darts: 0, kills: 0, friendlyKills: 0, heals: 0, bombard: 0, invalidZone: 0 }
      );
    },
    [statsByPlayerId]
  );

  // Handicap: si activé, l'armée TOP (ou GAUCHE) joue en DOUBLE_ONLY
  const activeRule: WarfareZoneRule =
    normalized.handicapP1Harder && activeArmy === "TOP" ? "DOUBLE_ONLY" : normalized.zoneRule;

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  if (invalidTeams) {
    return (
      <div style={{ minHeight: "100vh", background: PAGE_BG, color: theme.text, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <BackDot onClick={() => go("warfare_config")} />
        </div>
        <div style={{ marginTop: 18, padding: 14, borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: CARD_BG }}>
          <div style={{ fontWeight: 900, color: theme.primary, marginBottom: 6 }}>{t("warfare.invalid.title", "Configuration incomplète")}</div>
          <div style={{ color: theme.textSoft }}>{t("warfare.invalid.body", "Ajoute au moins 1 joueur dans chaque armée.")}</div>
        </div>
      </div>
    );
  }

  function checkWinner(nextTop: number[], nextBottom: number[]) {
    if (nextTop.length === 0) {
      setWinnerArmy("BOTTOM");
      return true;
    }
    if (nextBottom.length === 0) {
      setWinnerArmy("TOP");
      return true;
    }
    return false;
  }

  function applyTurn(darts: Dart[]) {
    if (winnerArmy !== null) return;
    const delta: ApplyDelta = { removedFromTop: [], removedFromBottom: [] };

    const pid = activePlayer?.id || "";
    const nextStatsDelta: Partial<PlayerStats> = {
      darts: (darts || []).length,
      kills: 0,
      friendlyKills: 0,
      heals: 0,
      bombard: 0,
      invalidZone: 0,
    };

    // Snapshot local (permet de gérer 3 flèches dans la même volée sans incohérences)
    const topSet = new Set(aliveTop);
    const bottomSet = new Set(aliveBottom);

    const oppArmy: Army = activeArmy === "TOP" ? "BOTTOM" : "TOP";

    // Apply each dart
    darts.forEach((d) => {
      if (!d) return;
      if (d.v <= 0) return;
      if (d.v === 25) return; // bull n'est pas un soldat
      if (!zoneAllowed(d.mult, activeRule)) {
        nextStatsDelta.invalidZone = (nextStatsDelta.invalidZone || 0) + 1;
        return;
      }

      const n = d.v;
      const oppSet = oppArmy === "TOP" ? topSet : bottomSet;
      const selfSet = activeArmy === "TOP" ? topSet : bottomSet;

      if (oppSet.has(n)) {
        oppSet.delete(n);
        (oppArmy === "TOP" ? delta.removedFromTop : delta.removedFromBottom).push(n);
        nextStatsDelta.kills = (nextStatsDelta.kills || 0) + 1;
      } else if (normalized.friendlyFire && selfSet.has(n)) {
        selfSet.delete(n);
        (activeArmy === "TOP" ? delta.removedFromTop : delta.removedFromBottom).push(n);
        nextStatsDelta.friendlyKills = (nextStatsDelta.friendlyKills || 0) + 1;
      }
    });

    // Stats player
    if (pid) {
      setStatsByPlayerId((prev) => {
        const cur = prev[pid] || { darts: 0, kills: 0, friendlyKills: 0, heals: 0, bombard: 0, invalidZone: 0 };
        return {
          ...prev,
          [pid]: {
            darts: cur.darts + (nextStatsDelta.darts || 0),
            kills: cur.kills + (nextStatsDelta.kills || 0),
            friendlyKills: cur.friendlyKills + (nextStatsDelta.friendlyKills || 0),
            heals: cur.heals + (nextStatsDelta.heals || 0),
            bombard: cur.bombard + (nextStatsDelta.bombard || 0),
            invalidZone: cur.invalidZone + (nextStatsDelta.invalidZone || 0),
          },
        };
      });
    }

    // Push delta for undo
    setUndoStack((prev) => [...prev, delta]);

    const nextTop = TOP_ARMY.filter((n) => topSet.has(n));
    const nextBottom = BOTTOM_ARMY.filter((n) => bottomSet.has(n));
    setAliveTop(nextTop);
    setAliveBottom(nextBottom);
    checkWinner(nextTop, nextBottom);

    // next player (avance le curseur de l'armée qui vient de jouer, puis switch d'armée)
    if (activeArmy === "TOP") setCursorTop((c) => c + 1);
    else setCursorBottom((c) => c + 1);
    setTurnIndex((i) => (i === 0 ? 1 : 0));
    setCurrentThrow([]);
    setMult(1);
  }

  function undoLast() {
    if (undoStack.length === 0 || winnerArmy !== null) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setAliveTop((prev) => {
      const add = last.removedFromTop || [];
      const merged = Array.from(new Set([...prev, ...add]));
      // preserve canonical order
      return TOP_ARMY.filter((n) => merged.includes(n));
    });
    setAliveBottom((prev) => {
      const add = last.removedFromBottom || [];
      const merged = Array.from(new Set([...prev, ...add]));
      return BOTTOM_ARMY.filter((n) => merged.includes(n));
    });
    setWinnerArmy(null);
    // On revient au joueur précédent : l'armée qui a joué est l'opposée de l'armée courante.
    const lastArmy: Army = turnIndex === 0 ? "BOTTOM" : "TOP";
    if (lastArmy === "TOP") setCursorTop((c) => Math.max(0, c - 1));
    else setCursorBottom((c) => Math.max(0, c - 1));
    setTurnIndex((i) => (i === 0 ? 1 : 0));
    setCurrentThrow([]);
    setMult(1);
  }

  function onNumber(n: number) {
    if (winnerArmy !== null) return;
    if (currentThrow.length >= 3) return;
    const d: Dart = { v: n, mult };
    setCurrentThrow((prev) => [...prev, d]);
    // auto reset to simple (comme ailleurs)
    if (mult !== 1) setMult(1);
  }

  function onBull() {
    if (winnerArmy !== null) return;
    if (currentThrow.length >= 3) return;
    const d: Dart = { v: 25, mult };
    setCurrentThrow((prev) => [...prev, d]);
    if (mult !== 1) setMult(1);
  }

  const aliveSetTop = new Set(aliveTop);
  const aliveSetBottom = new Set(aliveBottom);

  const topPlayers = teams.TOP;
  const bottomPlayers = teams.BOTTOM;

  const zonesLabel =
    activeRule === "DOUBLE_ONLY" ? "DOUBLE" : activeRule === "SINGLE_DOUBLE" ? "S + D" : "S/D/T";

  const renderMedallions = (players: any[], army: Army) => {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {players.slice(0, 6).map((pl) => {
          const isActive = pl?.id === activePlayer?.id && army === activeArmy;
          const src = pl?.avatarDataUrl || pl?.avatar || null;
          return (
            <div key={pl?.id || Math.random()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: `2px solid ${isActive ? theme.primary : "rgba(255,255,255,.14)"}`,
                  boxShadow: isActive
                    ? `0 0 0 4px ${theme.primary}22, 0 0 18px ${theme.primary}66`
                    : "0 0 0 2px rgba(0,0,0,.35)",
                  overflow: "hidden",
                  background: "rgba(255,255,255,.06)",
                }}
                title={pl?.name || ""}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ThrowChips = () => {
    const c = currentThrow || [];
    const chipBase: React.CSSProperties = {
      height: 44,
      minWidth: 72,
      borderRadius: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      letterSpacing: 0.4,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(0,0,0,.35)",
      color: theme.text,
      boxShadow: "0 10px 24px rgba(0,0,0,.35)",
    };
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ ...chipBase, color: "#eec7ff" }}>{fmt(c[0])}</div>
        <div style={{ ...chipBase, color: "#cfe6ff" }}>{fmt(c[1])}</div>
        <div style={{ ...chipBase, color: "#ffe7c0" }}>{fmt(c[2])}</div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 14,
        paddingBottom: 170,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Header (une ligne : BackDot + titre + InfoDot) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BackDot onClick={() => go("warfare_config")} />

        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 1,
              color: theme.primary,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${theme.primary}66`,
            }}
          >
            {t("warfare.title", "WARFARE")}
          </div>
        </div>

        <InfoDot onClick={() => setInfoOpen(true)} />
      </div>

      {/* Active player card (compact - mini stats like Killer) */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 20,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        {(() => {
          const s = getStats(activePlayer?.id);
          const ownAlive = activeArmy === "TOP" ? aliveTop.length : aliveBottom.length;
          const oppAlive = activeArmy === "TOP" ? aliveBottom.length : aliveTop.length;
          const hits = (s.kills || 0) + (s.friendlyKills || 0);
          const acc = s.darts ? Math.round((hits / s.darts) * 100) : 0;

          const statRow = (label: string, value: string | number) => (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: theme.textSoft, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>{value}</div>
            </div>
          );

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* left: avatar + name */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: `2px solid ${theme.primary}`,
                  boxShadow: `0 0 0 4px ${theme.primary}22, 0 0 18px ${theme.primary}66`,
                  overflow: "hidden",
                  background: "rgba(255,255,255,.06)",
                  flex: "0 0 auto",
                }}
              >
                {activePlayer?.avatarDataUrl ? (
                  <img src={activePlayer.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 950,
                    color: theme.primary,
                    textShadow: `0 0 14px ${theme.primary}55`,
                    letterSpacing: 0.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activePlayer?.name || "Joueur"}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: `1px solid ${theme.primary}55`,
                      background: `${theme.primary}18`,
                      color: theme.text,
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {activeArmy}
                  </div>
                  <div
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: `1px solid rgba(255,255,255,.16)`,
                      background: "rgba(0,0,0,.25)",
                      color: theme.text,
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {t("warfare.kpi.soldiers", "Soldats")}: <span style={{ color: theme.primary }}>{ownAlive}/10</span>
                    <span style={{ marginLeft: 10, color: theme.textSoft }}>{t("warfare.kpi.enemy", "Ennemis")}:</span>{" "}
                    <span style={{ color: theme.primary }}>{oppAlive}/10</span>
                  </div>
                </div>
              </div>

              {/* right: mini stats box */}
              <div
                style={{
                  width: 150,
                  padding: 10,
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.22)",
                }}
              >
                {statRow(t("warfare.kpi.kills", "Kills"), s.kills || 0)}
                <div style={{ height: 6 }} />
                {statRow(t("warfare.kpi.ff", "Friendly"), s.friendlyKills || 0)}
                <div style={{ height: 6 }} />
                {statRow(t("warfare.kpi.darts", "Flèches"), s.darts || 0)}
                <div style={{ height: 6 }} />
                {statRow(t("warfare.kpi.accuracy", "Précision"), `${acc}%`)}

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: theme.textSoft,
                  }}
                >
                  <span>{t("warfare.zones", "Zones")}</span>
                  <span style={{ color: theme.primary }}>{zonesLabel}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Armies (stacked TOP then BOTTOM) */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {([
          { army: "TOP" as const, title: "TOP", nums: TOP_ARMY, aliveSet: aliveSetTop, players: topPlayers },
          { army: "BOTTOM" as const, title: "BOTTOM", nums: BOTTOM_ARMY, aliveSet: aliveSetBottom, players: bottomPlayers },
        ] as const).map(({ army, title, nums, aliveSet, players }) => {
          const isActiveArmy = activeArmy === army;
          const aliveCount = army === "TOP" ? aliveTop.length : aliveBottom.length;
          return (
            <div
              key={army}
              style={{
                padding: 14,
                borderRadius: 18,
                border: `1px solid ${isActiveArmy ? theme.primary + "55" : theme.borderSoft}`,
                background: CARD_BG,
                boxShadow: isActiveArmy ? `0 0 24px ${theme.primary}22` : "0 10px 24px rgba(0,0,0,0.55)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontWeight: 950, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.7 }}>
                    {title}
                  </div>
                  <div style={{ color: theme.textSoft, fontWeight: 900, fontSize: 12 }}>{aliveCount}/10</div>
                </div>
                {renderMedallions(players, army)}
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {nums.map((n) => {
                  const alive = aliveSet.has(n);
                  return (
                    <div
                      key={n}
                      style={{
                        height: 42,
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 950,
                        border: `1px solid ${alive ? theme.borderSoft : "rgba(255,255,255,.06)"}`,
                        background: alive ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.35)",
                        color: alive ? theme.text : "rgba(255,255,255,.35)",
                        textDecoration: alive ? "none" : "line-through",
                      }}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: volée en cours (3 blocs) + zones à droite + clavier */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          zIndex: 30,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 4px",
          }}
        >
          <ThrowChips />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.35)",
              color: theme.textSoft,
              fontWeight: 900,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
            title={t("warfare.zoneRule", "Zones")}
          >
            {t("warfare.zoneRule", "Zones")} :
            <span style={{ color: theme.primary, textShadow: `0 0 10px ${theme.primary}44` }}>
              {zonesLabel}
            </span>
          </div>
        </div>

        <ScoreInputHub
          currentThrow={currentThrow}
          multiplier={mult}
          onSimple={() => setMult(1)}
          onDouble={() => setMult(2)}
          onTriple={() => setMult(3)}
          onCancel={() => {
            // Annuler = UNDO dernier tour validé
            undoLast();
          }}
          onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
          onNumber={onNumber}
          onBull={onBull}
          onValidate={() => applyTurn(currentThrow)}
          onDirectDart={(d) => {
            if (winnerArmy !== null) return;
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: d.v, mult: d.mult as any } as any]);
            if (mult !== 1) setMult(1);
          }}
          hidePreview
          hideTotal
        />
      </div>

      {/* Info overlay */}
      {infoOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.78)",
            zIndex: 90,
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.borderSoft}`,
              boxShadow: "0 18px 40px rgba(0,0,0,.70)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: theme.primary }}>
                {t("warfare.rules", "Règles — Warfare")}
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                style={{
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  color: theme.text,
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.close", "Fermer")}
              </button>
            </div>

            <div style={{ marginTop: 12, color: theme.textSoft, fontSize: 13, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 900, color: theme.text, marginBottom: 6 }}>{t("warfare.rules.goal", "Objectif")}</div>
              <div>
                {t(
                  "warfare.rules.goal.body",
                  "Éliminer tous les soldats (nombres) de l'armée adverse. Un soldat meurt quand on touche son nombre dans une zone autorisée."
                )}
              </div>

              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 900, color: theme.text, marginBottom: 6 }}>{t("warfare.rules.flow", "Déroulement")}</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t("warfare.rules.flow.1", "Les joueurs jouent à tour de rôle. Une volée = jusqu’à 3 fléchettes.")}</li>
                <li>{t("warfare.rules.flow.2", "Si tu touches un soldat adverse, il est éliminé.")}</li>
                <li>{t("warfare.rules.flow.3", "Si Friendly fire est activé et tu touches ton propre soldat, il est aussi éliminé.")}</li>
                <li>{t("warfare.rules.flow.4", "Le BULL (25) n’élimine personne. DBULL (50) peut déclencher une variante si activée.")}</li>
              </ul>

              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 900, color: theme.text, marginBottom: 6 }}>{t("warfare.rules.variants", "Variantes")}</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t("warfare.rules.var.zone", "Zones valides : S/D/T, S + D, ou DOUBLE uniquement.")}</li>
                <li>{t("warfare.rules.var.ff", "Friendly fire : toucher un soldat de son armée l’élimine aussi.")}</li>
                <li>{t("warfare.rules.var.hcap", "Handicap : l’armée (TOP/GAUCHE) joue en DOUBLE uniquement.")}</li>
                <li>{t("warfare.rules.var.dbull", "DBULL : Bombardement (tuer 1 soldat adverse au choix) et/ou Soin (ressusciter 1 soldat allié au choix) si activés.")}</li>
              </ul>

              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 900, color: theme.text, marginBottom: 6 }}>{t("warfare.rules.win", "Victoire")}</div>
              <div>{t("warfare.rules.win.body", "Tu gagnes dès que l’armée adverse n’a plus aucun soldat vivant.")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Winner overlay */}
      {winnerArmy !== null && (
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
              {t("warfare.win", "Victoire")}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: theme.textSoft }}>
              {t("warfare.win.army", "L'armée") + " " +
                (winnerArmy === "TOP"
                  ? t("warfare.army.top", "supérieure")
                  : t("warfare.army.bottom", "inférieure")) +
                " " +
                t("warfare.win.suffix", "remporte la partie")}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() => go("warfare_config")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("warfare.replay", "Rejouer")}
              </button>
              <button
                onClick={() => go("games")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: theme.primary,
                  color: "#000",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.backToMenu", "Menu jeux")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
