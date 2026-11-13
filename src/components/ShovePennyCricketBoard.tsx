import React from "react";
import { CricketMarkIcon } from "./MaskIcon";
import { shoveTargets, shoveNextTarget, type ShoveMarks, type ShoveRuleSet } from "../lib/gameEngines/shoveAPennyTargets";

type ShovePlayer = { id: string; name: string };
type Props = {
  state: { players: ShovePlayer[]; special?: { shoveMarksByPlayer?: Record<string, ShoveMarks> } };
  accent: string;
  activePlayerId?: string;
  previewMarks: ShoveMarks;
  marksPerBox: number;
  ruleSet?: ShoveRuleSet;
};

// Exactly the same player accents and CricketMarkIcon states as CricketPlay.
const ACCENTS = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8", "#a78bfa", "#fdba74"];

function darkenColor(hex: string, factor = .55): string {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return hex;
  return "#" + [1, 2, 3].map((index) => Math.round(parseInt(match[index], 16) * factor).toString(16).padStart(2, "0")).join("");
}

export default function ShovePennyCricketBoard({
  state, accent, activePlayerId, previewMarks, marksPerBox, ruleSet = "electronic",
}: Props) {
  const players = state.players || [];
  const targets = shoveTargets(ruleSet);
  const activeTarget = ruleSet === "electronic" ? shoveNextTarget(previewMarks, marksPerBox, ruleSet) : null;
  const twoPlayers = players.length === 2;
  const cols = twoPlayers ? "minmax(0,1fr) 48px minmax(0,1fr)" : "48px repeat(" + players.length + ", minmax(58px,1fr))";
  const targetColor = (number: number) =>
    ruleSet === "traditional" ? (number % 2 ? "#F6C256" : "#fb923c") : (number === 25 ? "#ef4444" : "#F6C256");

  const markCell = (player: ShovePlayer, index: number, target: number) => {
    const active = String(player.id) === String(activePlayerId);
    const marks = active ? previewMarks : (state.special?.shoveMarksByPlayer?.[player.id] || {});
    const amount = Math.max(0, Number(marks[String(target)] || 0));
    const hasMarks = amount > 0;
    const closed = amount >= marksPerBox;
    const color = ACCENTS[index % ACCENTS.length];
    const background = closed ? color : "rgba(15,23,42,0.95)";
    const borderColor = closed ? darkenColor(color, .55) : hasMarks ? "rgba(148,163,184,.9)" : "rgba(51,65,85,.9)";
    const boxShadow = closed ? "0 0 18px " + color + "aa" : hasMarks && active ? "0 0 12px " + color + "99" : "none";

    return (
      <div key={player.id + "-" + target}
        aria-label={player.name + " " + (target === 25 ? "Bull" : target) + " " + amount + " sur " + marksPerBox + " marques"}
        style={{
          minWidth: 0, height: 32, borderRadius: 10, background,
          border: "1px solid " + borderColor,
          boxShadow, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "2px 0", transition: "all .12s ease",
        }}>
        {hasMarks && <CricketMarkIcon marks={Math.min(3, amount)} color={color} size={closed ? 36 : 28} glow={active} />}
        {amount > 3 && <small style={{ fontSize: 9, fontWeight: 1000, color: "#fff", marginLeft: -4 }}>+{amount - 3}</small>}
        {marksPerBox !== 3 && <small style={{ fontSize: 8, fontWeight: 900, color: closed ? "#09111a" : "#b8c3d3", marginLeft: 2 }}>{amount}/{marksPerBox}</small>}
      </div>
    );
  };

  const targetCell = (target: number) => {
    const color = targetColor(target);
    return <div key={"target-" + target} style={{
      display: "grid", placeItems: "center",
      padding: "2px 0", textAlign: "center",
      fontSize: target === 25 ? 12 : 18, fontWeight: 900,
      color, textShadow: "0 0 8px " + color + "cc, 0 0 18px " + color + "80",
      letterSpacing: .6,
      borderLeft: "1px solid rgba(148,163,184,.5)",
      borderRight: "1px solid rgba(148,163,184,.5)",
      background: target === activeTarget ? color + "18" : "transparent",
    }}>{target === 25 ? "BULL" : target}</div>;
  };

  return (
    <section data-shove-cricket-board="1" data-shove-ruleset={ruleSet}
      style={{
        borderRadius: 16, background: "#121420", border: "1px solid rgba(255,255,255,.08)",
        padding: 9, minWidth: 0,
      }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1000, letterSpacing: .7, marginBottom: 5 }}>
        {ruleSet === "traditional" ? "SHOVE A PENNY · 1 À 9 · ORDRE LIBRE" : "SHOVE A PENNY · 15 À BULL · DANS L'ORDRE"}
      </div>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <div style={{ minWidth: twoPlayers ? 0 : Math.max(260, players.length * 60 + 48), display: "grid", gap: 3 }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 5 }}>
            {twoPlayers
              ? <>
                  <b style={{ color: "#fff", fontSize: 11, textAlign: "center", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{players[0].name}</b>
                  <b style={{ color: "#8e9bab", fontSize: 9, textAlign: "center" }}>CASE</b>
                  <b style={{ color: "#fff", fontSize: 11, textAlign: "center", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{players[1].name}</b>
                </>
              : <>
                  <b style={{ color: "#8e9bab", fontSize: 9, textAlign: "center" }}>CASE</b>
                  {players.map((p) => <b key={p.id} style={{ color: "#fff", fontSize: 10, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</b>)}
                </>}
          </div>
          {targets.map((target) => (
            <div key={target} style={{ display: "grid", gridTemplateColumns: cols, gap: 5, alignItems: "center", borderTop: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}>
              {twoPlayers
                ? <>{markCell(players[0], 0, target)}{targetCell(target)}{markCell(players[1], 1, target)}</>
                : <>{targetCell(target)}{players.map((player, index) => markCell(player, index, target))}</>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
