// ============================================
// src/pages/WarfarePlay.tsx
// WARFARE — PLAY (DUEL + ÉQUIPES)
// - 2 camps fixes (TOP vs BOTTOM)
//   * TOP_BOTTOM = Armée SUPÉRIEURE vs INFÉRIEURE
//   * LEFT_RIGHT = Armée GAUCHE vs DROITE
// - Rotation : alterne les camps à chaque visite; rotation interne des joueurs par camp
// - Keypad existant pour saisie (même rendu)
// - Undo : annule la dernière visite validée
// - Variantes DBULL : bombardement (tuer 1 soldat adverse au choix) et/ou soin (ressusciter 1 soldat allié au choix)
// ============================================

import React from "react";
import type { Dart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import Keypad from "../components/Keypad";
import type {
  WarfareConfig,
  WarfareZoneRule,
  WarfareBullRule,
  PlayerLite,
} from "./WarfareConfig";

type Props = {
  go: (tab: any, params?: any) => void;
  config: WarfareConfig;
};

type Army = "TOP" | "BOTTOM";

// Layout TOP/BOTTOM (tes règles initiales)
const TOP_ARMY_TB = [11, 14, 9, 12, 5, 20, 1, 18, 4, 13] as const;
const BOTTOM_ARMY_TB = [6, 10, 15, 2, 17, 3, 19, 7, 16, 8] as const;

// Layout LEFT/RIGHT (verticale 12h-6h, 20 à gauche, 3 à droite)
const TOP_ARMY_LR = [20, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const; // "TOP" = GAUCHE
const BOTTOM_ARMY_LR = [1, 18, 4, 13, 6, 10, 15, 2, 17, 3] as const; // "BOTTOM" = DROITE

type ApplyDelta = {
  removedFromTop: number[];
  removedFromBottom: number[];
  revivedInTop: number[];
  revivedInBottom: number[];
  // rotation
  prevActiveArmy: Army;
  prevIdxTop: number;
  prevIdxBottom: number;
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

function chip(active: boolean, theme: any): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary + "66" : theme.borderSoft}`,
    background: active ? theme.primary + "18" : theme.card,
    color: active ? theme.primary : theme.text,
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

function avatarCircle(p: PlayerLite, theme: any): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `1px solid ${theme.borderSoft}`,
    background: p.avatarDataUrl
      ? `url(${p.avatarDataUrl}) center/cover no-repeat`
      : "rgba(255,255,255,.08)",
    boxShadow: `0 8px 18px rgba(0,0,0,.45)`,
    flex: "0 0 auto",
  };
}

export default function WarfarePlay({ go, config }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const TOP_ARMY = config.layout === "LEFT_RIGHT" ? TOP_ARMY_LR : TOP_ARMY_TB;
  const BOTTOM_ARMY = config.layout === "LEFT_RIGHT" ? BOTTOM_ARMY_LR : BOTTOM_ARMY_TB;

  const labels = React.useMemo(() => {
    if (config.layout === "LEFT_RIGHT") {
      return {
        TOP: t("warfare.army.left", "Armée GAUCHE"),
        BOTTOM: t("warfare.army.right", "Armée DROITE"),
      };
    }
    return {
      TOP: t("warfare.army.top", "Armée SUPÉRIEURE"),
      BOTTOM: t("warfare.army.bottom", "Armée INFÉRIEURE"),
    };
  }, [config.layout, t]);

  const teamTop = config.teams.TOP || [];
  const teamBottom = config.teams.BOTTOM || [];

  // Soldats vivants
  const [aliveTop, setAliveTop] = React.useState<number[]>(() => [...TOP_ARMY]);
  const [aliveBottom, setAliveBottom] = React.useState<number[]>(() => [...BOTTOM_ARMY]);

  // Rotation
  const [activeArmy, setActiveArmy] = React.useState<Army>("TOP");
  const [idxTop, setIdxTop] = React.useState(0);
  const [idxBottom, setIdxBottom] = React.useState(0);

  // Saisie visite
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<Dart[]>([]);

  const [undoStack, setUndoStack] = React.useState<ApplyDelta[]>([]);
  const [winnerArmy, setWinnerArmy] = React.useState<Army | null>(null);

  // Overlays DBULL
  const [bullOverlay, setBullOverlay] = React.useState<null | {
    kind: "BOMB" | "HEAL";
    // Pour BOMB : targets = soldats adverses vivants
    // Pour HEAL : targets = soldats alliés morts
    targets: number[];
    pendingDarts: Dart[];
    snapshot: { top: Set<number>; bottom: Set<number> };
    delta: ApplyDelta;
  }>(null);

  const activePlayer: PlayerLite | null = React.useMemo(() => {
    if (activeArmy === "TOP") {
      if (teamTop.length === 0) return null;
      return teamTop[idxTop % teamTop.length] || teamTop[0];
    }
    if (teamBottom.length === 0) return null;
    return teamBottom[idxBottom % teamBottom.length] || teamBottom[0];
  }, [activeArmy, teamTop, teamBottom, idxTop, idxBottom]);

  const activeRule: WarfareZoneRule =
    config.handicapTopHarder && activeArmy === "TOP" ? "DOUBLE_ONLY" : config.zoneRule;

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

  function applyBaseHits(darts: Dart[], topSet: Set<number>, bottomSet: Set<number>, delta: ApplyDelta) {
    const oppArmy: Army = activeArmy === "TOP" ? "BOTTOM" : "TOP";

    for (const d of darts) {
      if (!d) continue;
      if (d.v <= 0) continue;
      if (d.v === 25) continue; // Bull géré à part (variantes)
      if (!zoneAllowed(d.mult, activeRule)) continue;

      const n = d.v;
      const oppSet = oppArmy === "TOP" ? topSet : bottomSet;
      const selfSet = activeArmy === "TOP" ? topSet : bottomSet;

      if (oppSet.has(n)) {
        oppSet.delete(n);
        (oppArmy === "TOP" ? delta.removedFromTop : delta.removedFromBottom).push(n);
      } else if (config.friendlyFire && selfSet.has(n)) {
        selfSet.delete(n);
        (activeArmy === "TOP" ? delta.removedFromTop : delta.removedFromBottom).push(n);
      }
    }
  }

  function openBullOverlay(kind: "BOMB" | "HEAL", pendingDarts: Dart[], snapshot: { top: Set<number>; bottom: Set<number> }, delta: ApplyDelta) {
    const oppArmy: Army = activeArmy === "TOP" ? "BOTTOM" : "TOP";

    if (kind === "BOMB") {
      const targets = Array.from((oppArmy === "TOP" ? snapshot.top : snapshot.bottom).values())
        .filter((n) => (oppArmy === "TOP" ? TOP_ARMY : BOTTOM_ARMY).includes(n as any))
        .sort((a, b) => a - b);
      setBullOverlay({ kind, targets, pendingDarts, snapshot, delta });
      return;
    }

    // HEAL : revive un soldat mort de son armée
    const selfArmy: Army = activeArmy;
    const alive = selfArmy === "TOP" ? snapshot.top : snapshot.bottom;
    const all = selfArmy === "TOP" ? TOP_ARMY : BOTTOM_ARMY;
    const targets = all.filter((n) => !alive.has(n));
    setBullOverlay({ kind, targets, pendingDarts, snapshot, delta });
  }

  function applyBullChoice(kind: "BOMB" | "HEAL", target: number) {
    if (!bullOverlay) return;
    const { pendingDarts, snapshot, delta } = bullOverlay;

    if (kind === "BOMB") {
      const oppArmy: Army = activeArmy === "TOP" ? "BOTTOM" : "TOP";
      const oppSet = oppArmy === "TOP" ? snapshot.top : snapshot.bottom;
      if (oppSet.has(target)) {
        oppSet.delete(target);
        (oppArmy === "TOP" ? delta.removedFromTop : delta.removedFromBottom).push(target);
      }
    } else {
      const selfSet = activeArmy === "TOP" ? snapshot.top : snapshot.bottom;
      // revive seulement si mort
      if (!selfSet.has(target)) {
        selfSet.add(target);
        (activeArmy === "TOP" ? delta.revivedInTop : delta.revivedInBottom).push(target);
      }
    }

    setBullOverlay(null);
    finalizeTurn(pendingDarts, snapshot, delta);
  }

  function finalizeTurn(darts: Dart[], snapshot: { top: Set<number>; bottom: Set<number> }, delta: ApplyDelta) {
    // Push delta pour undo
    setUndoStack((prev) => [...prev, delta]);

    const nextTop = TOP_ARMY.filter((n) => snapshot.top.has(n));
    const nextBottom = BOTTOM_ARMY.filter((n) => snapshot.bottom.has(n));
    setAliveTop(nextTop);
    setAliveBottom(nextBottom);
    checkWinner(nextTop, nextBottom);

    // rotation
    if (activeArmy === "TOP") setIdxTop((x) => x + 1);
    else setIdxBottom((x) => x + 1);
    setActiveArmy((a) => (a === "TOP" ? "BOTTOM" : "TOP"));

    // reset saisie
    setCurrentThrow([]);
    setMult(1);
  }

  function applyTurn(darts: Dart[]) {
    if (winnerArmy !== null) return;
    if (!activePlayer) return;

    const delta: ApplyDelta = {
      removedFromTop: [],
      removedFromBottom: [],
      revivedInTop: [],
      revivedInBottom: [],
      prevActiveArmy: activeArmy,
      prevIdxTop: idxTop,
      prevIdxBottom: idxBottom,
    };

    // Snapshot sets
    const topSet = new Set(aliveTop);
    const bottomSet = new Set(aliveBottom);

    // Hits normaux
    applyBaseHits(darts, topSet, bottomSet, delta);

    // Bull variants : on ne traite que DBULL (mult===2)
    const dbulls = darts.filter((d) => d?.v === 25 && d.mult === 2);
    if (dbulls.length > 0 && config.bullRule !== "NONE") {
      // Pour rester simple/UX : 1 DBULL déclenche 1 action.
      // S'il y en a plusieurs dans la même visite, on applique le même flow en série (rare) :
      // on consomme la première DBULL, puis on finalise.
      const rule: WarfareBullRule = config.bullRule;
      const snapshot = { top: topSet, bottom: bottomSet };

      if (rule === "BOMB") {
        openBullOverlay("BOMB", darts, snapshot, delta);
        return;
      }
      if (rule === "HEAL") {
        openBullOverlay("HEAL", darts, snapshot, delta);
        return;
      }
      // CHOICE
      // On ouvre d'abord un mini-choix action. Pour garder le code simple, on affiche 2 boutons dans l'overlay.
      // On réutilise l'overlay avec kind choisi ensuite.
      setBullOverlay({ kind: "BOMB", targets: [], pendingDarts: darts, snapshot, delta });
      return;
    }

    finalizeTurn(darts, { top: topSet, bottom: bottomSet }, delta);
  }

  function undoLast() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    // restore rotation
    setActiveArmy(last.prevActiveArmy);
    setIdxTop(last.prevIdxTop);
    setIdxBottom(last.prevIdxBottom);
    setWinnerArmy(null);

    // restore soldiers by reversing delta
    setAliveTop((prev) => {
      const set = new Set(prev);
      for (const n of last.removedFromTop || []) set.add(n);
      for (const n of last.revivedInTop || []) set.delete(n);
      return TOP_ARMY.filter((n) => set.has(n));
    });
    setAliveBottom((prev) => {
      const set = new Set(prev);
      for (const n of last.removedFromBottom || []) set.add(n);
      for (const n of last.revivedInBottom || []) set.delete(n);
      return BOTTOM_ARMY.filter((n) => set.has(n));
    });

    setCurrentThrow([]);
    setMult(1);
  }

  function onNumber(n: number) {
    if (winnerArmy !== null) return;
    if (currentThrow.length >= 3) return;
    const d: Dart = { v: n, mult };
    setCurrentThrow((prev) => [...prev, d]);
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

  const winnerLabel = winnerArmy ? labels[winnerArmy] : null;

  // Overlay CHOICE : on réutilise bullOverlay.kind=BOMB comme placeholder
  const isChoiceMode = bullOverlay && config.bullRule === "CHOICE" && bullOverlay.targets.length === 0;

  // Helper for soldier grid
  function SoldiersGrid({ army, list, aliveSet }: { army: Army; list: readonly number[]; aliveSet: Set<number> }) {
    const isActive = army === activeArmy;
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${isActive ? theme.primary + "66" : theme.borderSoft}`,
          background: theme.card,
          boxShadow: isActive ? `0 0 26px ${theme.primary}22` : "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
              {labels[army]}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
              {(army === "TOP" ? teamTop : teamBottom).map((p, i) => (
                <div key={p.id + i} title={p.name} style={avatarCircle(p, theme)} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {aliveSet.size}/{list.length}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {list.map((n) => {
            const alive = aliveSet.has(n);
            return (
              <div
                key={n}
                style={{
                  padding: "10px 0",
                  borderRadius: 14,
                  border: `1px solid ${alive ? theme.borderSoft : "rgba(255,255,255,.08)"}`,
                  background: alive ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.25)",
                  color: alive ? theme.text : theme.textSoft,
                  textAlign: "center",
                  fontWeight: 950,
                  textDecoration: alive ? "none" : "line-through",
                  opacity: alive ? 1 : 0.45,
                  letterSpacing: 0.4,
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 14,
        paddingBottom: 190,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => go("warfare_config")}
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

        <button
          onClick={undoLast}
          style={{
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            cursor: undoStack.length ? "pointer" : "default",
            opacity: undoStack.length ? 1 : 0.5,
          }}
        >
          {t("common.undo", "Annuler")}
        </button>
      </div>

      {/* Active player / army */}
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={chip(true, theme)}>
          {labels[activeArmy]}
        </div>
        <div style={{ fontSize: 13, color: theme.textSoft }}>
          {t("warfare.turn", "Tour")}: <b style={{ color: theme.text }}>{activePlayer?.name || "—"}</b>
        </div>
        <div style={{ fontSize: 13, color: theme.textSoft }}>
          {t("warfare.rule", "Zones")}: <b style={{ color: theme.text }}>{activeRule === "ANY" ? "S/D/T" : activeRule === "SINGLE_DOUBLE" ? "S+D" : "D"}</b>
        </div>
      </div>

      {/* Soldiers */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <SoldiersGrid army="TOP" list={TOP_ARMY} aliveSet={aliveSetTop} />
        <SoldiersGrid army="BOTTOM" list={BOTTOM_ARMY} aliveSet={aliveSetBottom} />
      </div>

      {/* Current visit */}
      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
            {t("warfare.visit", "Visite")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>{currentThrow.length}/3</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {currentThrow.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textSoft }}>{t("warfare.visit.empty", "Saisis tes flèches")}</div>
          ) : (
            currentThrow.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(255,255,255,.05)",
                  fontWeight: 900,
                }}
              >
                {fmtDart(d)}
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            onClick={() => setCurrentThrow((p) => p.slice(0, -1))}
            disabled={currentThrow.length === 0 || winnerArmy !== null}
            style={{
              flex: 1,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,.06)",
              color: theme.text,
              borderRadius: 14,
              padding: "10px 12px",
              fontWeight: 900,
              cursor: currentThrow.length ? "pointer" : "default",
              opacity: currentThrow.length ? 1 : 0.5,
            }}
          >
            {t("common.delete", "Supprimer")}
          </button>
          <button
            onClick={() => applyTurn(currentThrow)}
            disabled={currentThrow.length === 0 || winnerArmy !== null}
            style={{
              flex: 1,
              border: "none",
              background: winnerArmy !== null ? "rgba(255,255,255,.08)" : `linear-gradient(180deg, ${theme.primary}, ${theme.primary}cc)`,
              color: winnerArmy !== null ? theme.textSoft : "#000",
              borderRadius: 14,
              padding: "10px 12px",
              fontWeight: 950,
              cursor: currentThrow.length ? "pointer" : "default",
              opacity: currentThrow.length ? 1 : 0.5,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {t("common.validate", "Valider")}
          </button>
        </div>
      </div>

      {/* Keypad */}
      <div style={{ marginTop: 14 }}>
        <Keypad
          mult={mult}
          setMult={setMult as any}
          onNumber={onNumber}
          onBull={onBull}
          disabled={winnerArmy !== null}
        />
      </div>

      {/* Winner overlay */}
      {winnerLabel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,.6)",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 18, color: theme.primary, textTransform: "uppercase" }}>
              {t("warfare.win", "Victoire")}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: theme.text }}>
              {winnerLabel}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => go("warfare_config")}
                style={{
                  flex: 1,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(255,255,255,.06)",
                  color: theme.text,
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.menu", "Menu")}
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  border: "none",
                  background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}cc)`,
                  color: "#000",
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontWeight: 950,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {t("common.replay", "Rejouer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bull overlay (bomb/heal/choice) */}
      {bullOverlay && !winnerLabel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,.6)",
            }}
          >
            {isChoiceMode ? (
              <>
                <div style={{ fontWeight: 950, color: theme.primary, textTransform: "uppercase" }}>
                  {t("warfare.dbull.choice", "DBULL — Choisis une action")}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      const { pendingDarts, snapshot, delta } = bullOverlay;
                      openBullOverlay("BOMB", pendingDarts, snapshot, delta);
                    }}
                    style={{
                      flex: 1,
                      border: `1px solid ${theme.borderSoft}`,
                      background: "rgba(255,255,255,.06)",
                      color: theme.text,
                      borderRadius: 14,
                      padding: "10px 12px",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    {t("warfare.dbull.bomb", "Bombardement")}
                  </button>
                  <button
                    onClick={() => {
                      const { pendingDarts, snapshot, delta } = bullOverlay;
                      openBullOverlay("HEAL", pendingDarts, snapshot, delta);
                    }}
                    style={{
                      flex: 1,
                      border: "none",
                      background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}cc)`,
                      color: "#000",
                      borderRadius: 14,
                      padding: "10px 12px",
                      fontWeight: 950,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("warfare.dbull.heal", "Soin")}
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
                  {t("warfare.dbull.choice.help", "Sélectionne ensuite le soldat concerné.")}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 950, color: theme.primary, textTransform: "uppercase" }}>
                    {bullOverlay.kind === "BOMB"
                      ? t("warfare.dbull.bomb.title", "DBULL — Bombardement")
                      : t("warfare.dbull.heal.title", "DBULL — Soin")}
                  </div>
                  <button
                    onClick={() => {
                      // fallback : pas d'action
                      const { pendingDarts, snapshot, delta } = bullOverlay;
                      setBullOverlay(null);
                      finalizeTurn(pendingDarts, snapshot, delta);
                    }}
                    style={{
                      border: `1px solid ${theme.borderSoft}`,
                      background: "rgba(255,255,255,.06)",
                      color: theme.text,
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {t("common.skip", "Passer")}
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
                  {bullOverlay.kind === "BOMB"
                    ? t("warfare.dbull.bomb.help", "Choisis 1 soldat adverse à éliminer.")
                    : t("warfare.dbull.heal.help", "Choisis 1 soldat de ton armée à ressusciter.")}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {bullOverlay.targets.length === 0 ? (
                    <div style={{ gridColumn: "1 / -1", fontSize: 13, color: theme.textSoft }}>
                      {bullOverlay.kind === "HEAL"
                        ? t("warfare.dbull.heal.none", "Aucun soldat à ressusciter.")
                        : t("warfare.dbull.bomb.none", "Aucune cible disponible.")}
                    </div>
                  ) : (
                    bullOverlay.targets.map((n) => (
                      <button
                        key={n}
                        onClick={() => applyBullChoice(bullOverlay.kind, n)}
                        style={{
                          padding: "10px 0",
                          borderRadius: 14,
                          border: `1px solid ${theme.borderSoft}`,
                          background: "rgba(255,255,255,.06)",
                          color: theme.text,
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        {n}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
