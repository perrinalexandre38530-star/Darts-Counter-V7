import React from "react";
import { CricketMarkIcon } from "./MaskIcon";
import { SHOVE_TARGETS, shoveNextTarget, type ShoveMarks } from "../lib/gameEngines/shoveAPennyTargets";

type ShovePlayer = { id: string; name: string };
type Props = {
  state: { players: ShovePlayer[]; special?: { shoveMarksByPlayer?: Record<string, ShoveMarks> } };
  accent: string;
  activePlayerId?: string;
  previewMarks: ShoveMarks;
  marksPerBox: number;
};

const COLORS = ["#ffc650", "#70cdff", "#d8a0ff", "#78e5ad", "#ffa1aa", "#d5d88a"];

export default function ShovePennyCricketBoard({
  state, accent, activePlayerId, previewMarks, marksPerBox,
}: Props) {
  const players = state.players || [];
  const activeTarget = shoveNextTarget(previewMarks, marksPerBox);
  const twoPlayers = players.length === 2;
  const columns = twoPlayers ? "minmax(0,1fr) 54px minmax(0,1fr)" : "54px repeat(" + players.length + ", minmax(70px,1fr))";
  const colorAt = (index: number) => index === 0 ? accent : COLORS[index % COLORS.length];

  const markCell = (player: ShovePlayer, index: number, target: number) => {
    const active = String(player.id) === String(activePlayerId);
    const marks = active ? previewMarks : (state.special?.shoveMarksByPlayer?.[player.id] || {});
    const amount = Math.max(0, Number(marks[String(target)] || 0));
    const closed = amount >= marksPerBox;
    const color = colorAt(index);
    return (
      <div key={player.id + "-" + target}
        aria-label={player.name + " " + (target === 25 ? "Bull" : target) + " " + amount + "/" + marksPerBox}
        style={{
          minWidth: 0, minHeight: 36, borderRadius: 9,
          border: "1px solid " + (active && activeTarget === target ? accent + "aa" : closed ? color + "55" : "rgba(255,255,255,.07)"),
          background: closed ? color + "16" : active && activeTarget === target ? accent + "12" : "rgba(255,255,255,.03)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "2px",
        }}>
        {amount > 0 ? <CricketMarkIcon marks={Math.min(3, amount)} color={color} size={24} glow={active} /> : <span style={{ color: "#576374", fontSize: 20 }}>—</span>}
        {amount > 3 ? <CricketMarkIcon marks={Math.min(3, amount - 3)} color={color} size={18} glow={false} /> : null}
        <small style={{ color: closed ? color : "#b1bbca", fontSize: 9, fontWeight: 1000 }}>{amount}/{marksPerBox}</small>
      </div>
    );
  };

  const numberCell = (target: number) => (
    <div key={"target-" + target} style={{
      minWidth: 0, borderRadius: 9, display: "grid", placeItems: "center",
      border: "1px solid " + (activeTarget === target ? accent + "bb" : "rgba(255,255,255,.08)"),
      background: activeTarget === target ? accent + "23" : "rgba(255,255,255,.035)",
      color: activeTarget === target ? accent : "#d2d9e5",
      fontSize: target === 25 ? 11 : 17, fontWeight: 1050,
    }}>{target === 25 ? "BULL" : target}</div>
  );

  return (
    <section data-shove-cricket-board="1" style={{
      borderRadius: 18, padding: 9, minWidth: 0,
      border: "1px solid " + accent + "55",
      background: "linear-gradient(165deg,rgba(16,19,29,.97),rgba(5,7,12,.98))",
    }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .4, marginBottom: 6 }}>
        SHOVE A PENNY · TABLEAU CRICKET · {marksPerBox} MARQUES / CASE
      </div>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <div style={{ minWidth: twoPlayers ? 0 : Math.max(300, 60 + players.length * 74), display: "grid", gap: 3 }}>
          <div style={{ display: "grid", gridTemplateColumns: columns, gap: 4, paddingBottom: 3 }}>
            {twoPlayers
              ? <>
                  <b style={{ textAlign: "center", fontSize: 10, color: String(players[0].id) === String(activePlayerId) ? accent : "#d8e0ec", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{players[0].name}</b>
                  <b style={{ textAlign: "center", fontSize: 8, color: "#94a0b0" }}>CASE</b>
                  <b style={{ textAlign: "center", fontSize: 10, color: String(players[1].id) === String(activePlayerId) ? accent : "#d8e0ec", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{players[1].name}</b>
                </>
              : <>
                  <b style={{ textAlign: "center", fontSize: 8, color: "#94a0b0" }}>CASE</b>
                  {players.map((player) => <b key={player.id} style={{ textAlign: "center", fontSize: 10, color: String(player.id) === String(activePlayerId) ? accent : "#d8e0ec", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</b>)}
                </>}
          </div>
          {SHOVE_TARGETS.map((target) => (
            <div key={target} style={{ display: "grid", gridTemplateColumns: columns, gap: 4 }}>
              {twoPlayers
                ? <>{markCell(players[0], 0, target)}{numberCell(target)}{markCell(players[1], 1, target)}</>
                : <>{numberCell(target)}{players.map((player, index) => markCell(player, index, target))}</>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
