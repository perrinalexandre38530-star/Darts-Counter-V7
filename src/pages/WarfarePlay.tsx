// ============================================
// src/pages/WarfarePlay.tsx
// WARFARE — PLAY
// - 1v1 (2 joueurs) : TOP vs BOTTOM
// - Keypad existant pour la saisie des flèches (même rendu que les autres jeux)
// - Undo local (annule la dernière volée validée)
// ============================================

import React from "react";
import type { Dart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import Keypad from "../components/Keypad";
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

export default function WarfarePlay({ go, config }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const p1 = config.players[0];
  const p2 = config.players[1];
  const p1Army: Army = config.p1Army;
  const p2Army: Army = p1Army === "TOP" ? "BOTTOM" : "TOP";

  const [aliveTop, setAliveTop] = React.useState<number[]>(() => [...TOP_ARMY]);
  const [aliveBottom, setAliveBottom] = React.useState<number[]>(() => [...BOTTOM_ARMY]);

  const [turnIndex, setTurnIndex] = React.useState<0 | 1>(0);
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<Dart[]>([]);
  const [undoStack, setUndoStack] = React.useState<ApplyDelta[]>([]);
  const [winner, setWinner] = React.useState<null | 0 | 1>(null);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const activePlayer = turnIndex === 0 ? p1 : p2;
  const activeArmy = turnIndex === 0 ? p1Army : p2Army;
  const activeRule: WarfareZoneRule =
    config.handicapP1Harder && turnIndex === 0 ? "DOUBLE_ONLY" : config.zoneRule;

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function checkWinner(nextTop: number[], nextBottom: number[]) {
    if (nextTop.length === 0) {
      // TOP a perdu => gagnant = celui qui est BOTTOM
      const w = p1Army === "BOTTOM" ? 0 : 1;
      setWinner(w as 0 | 1);
      return true;
    }
    if (nextBottom.length === 0) {
      const w = p1Army === "TOP" ? 0 : 1;
      setWinner(w as 0 | 1);
      return true;
    }
    return false;
  }

  function applyTurn(darts: Dart[]) {
    if (winner !== null) return;
    const delta: ApplyDelta = { removedFromTop: [], removedFromBottom: [] };

    // Snapshot local (permet de gérer 3 flèches dans la même volée sans incohérences)
    const topSet = new Set(aliveTop);
    const bottomSet = new Set(aliveBottom);

    const oppArmy: Army = activeArmy === "TOP" ? "BOTTOM" : "TOP";

    // Apply each dart
    darts.forEach((d) => {
      if (!d) return;
      if (d.v <= 0) return;
      if (d.v === 25) return; // bull n'est pas un soldat
      if (!zoneAllowed(d.mult, activeRule)) return;

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
    });

    // Push delta for undo
    setUndoStack((prev) => [...prev, delta]);

    const nextTop = TOP_ARMY.filter((n) => topSet.has(n));
    const nextBottom = BOTTOM_ARMY.filter((n) => bottomSet.has(n));
    setAliveTop(nextTop);
    setAliveBottom(nextBottom);
    checkWinner(nextTop, nextBottom);

    // next player
    setTurnIndex((i) => (i === 0 ? 1 : 0));
    setCurrentThrow([]);
    setMult(1);
  }

  function undoLast() {
    if (undoStack.length === 0 || winner !== null) return;
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
    setWinner(null);
    setTurnIndex((i) => (i === 0 ? 1 : 0));
    setCurrentThrow([]);
    setMult(1);
  }

  function onNumber(n: number) {
    if (winner !== null) return;
    if (currentThrow.length >= 3) return;
    const d: Dart = { v: n, mult };
    setCurrentThrow((prev) => [...prev, d]);
    // auto reset to simple (comme ailleurs)
    if (mult !== 1) setMult(1);
  }

  function onBull() {
    if (winner !== null) return;
    if (currentThrow.length >= 3) return;
    const d: Dart = { v: 25, mult };
    setCurrentThrow((prev) => [...prev, d]);
    if (mult !== 1) setMult(1);
  }

  const ArmyBadge = ({ army, label }: { army: Army; label: string }) => {
    const active = army === activeArmy;
    return (
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${active ? theme.primary + "66" : theme.borderSoft}`,
          background: active ? theme.primary + "18" : theme.card,
          color: active ? theme.primary : theme.text,
          fontWeight: 900,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </div>
    );
  };

  const aliveSetTop = new Set(aliveTop);
  const aliveSetBottom = new Set(aliveBottom);

  function armyPlayers(army: Army) {
    // Compat: si un futur WarfareConfig expose des équipes, on saura les lire.
    const anyCfg: any = config as any;
    if (anyCfg?.teams?.TOP && anyCfg?.teams?.BOTTOM) {
      return (anyCfg.teams[army] || []) as any[];
    }
    const a1 = p1Army;
    const a2 = p2Army;
    if (army === a1) return [p1];
    return [p2];
  }

  const topPlayers = armyPlayers("TOP");
  const bottomPlayers = armyPlayers("BOTTOM");

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

      {/* Active turn */}
      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontWeight: 900,
                color: theme.primary,
                textShadow: `0 0 14px ${theme.primary}55`,
                letterSpacing: 0.3,
              }}
            >
              {activePlayer?.name || "Joueur"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ArmyBadge army={"TOP"} label={"TOP"} />
              <ArmyBadge army={"BOTTOM"} label={"BOTTOM"} />
            </div>
          </div>
        </div>
      </div>

      {/* Armies */}
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            border: `1px solid ${activeArmy === "TOP" ? theme.primary + "55" : theme.borderSoft}`,
            background: CARD_BG,
            boxShadow: activeArmy === "TOP" ? `0 0 24px ${theme.primary}22` : "0 10px 24px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.7 }}>
              TOP
            </div>
            {renderMedallions(topPlayers, "TOP")}
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {TOP_ARMY.map((n) => {
              const alive = aliveSetTop.has(n);
              return (
                <div
                  key={n}
                  style={{
                    height: 42,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
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

        <div
          style={{
            padding: 14,
            borderRadius: 18,
            border: `1px solid ${activeArmy === "BOTTOM" ? theme.primary + "55" : theme.borderSoft}`,
            background: CARD_BG,
            boxShadow: activeArmy === "BOTTOM" ? `0 0 24px ${theme.primary}22` : "0 10px 24px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.7 }}>
              BOTTOM
            </div>
            {renderMedallions(bottomPlayers, "BOTTOM")}
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {BOTTOM_ARMY.map((n) => {
              const alive = aliveSetBottom.has(n);
              return (
                <div
                  key={n}
                  style={{
                    height: 42,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
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

        <Keypad
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
      {winner !== null && (
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
              {(winner === 0 ? p1.name : p2.name) + " " + t("warfare.win.suffix", "remporte la partie")}
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
