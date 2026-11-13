import React from "react";
import GameDifficultyStars from "./GameDifficultyStars";
import { MSS_DIFFICULTY_LABELS, type MSSDifficulty } from "../lib/mssVisualCharter";

type Props = { value: number; onChange: (level: number) => void; label?: string; compact?: boolean };
/** Shared 1-5 difficulty picker for GAMES, CHALLENGE and TRAINING. */
export default function GameDifficultyFilter({ value, onChange, label = "Difficulté", compact = false }: Props) {
  const [open, setOpen] = React.useState(false);
  return <div data-mss-difficulty-filter-control="1" style={{ position: "relative", minWidth: 0, width: "100%" }}>
    <button type="button" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: compact ? 36 : 40, padding: compact ? "7px 8px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(255,190,65,.40)", background: "#121723", color: "#fff", cursor: "pointer", gap: 5, fontWeight: 950, fontSize: compact ? 10 : 11, whiteSpace: "nowrap" }}>
      {value > 0 ? <span style={{ display: "flex", minWidth: 0, gap: 5, alignItems: "center" }}><GameDifficultyStars level={value as MSSDifficulty} compact /><span style={{ fontSize: compact ? 9 : 10, overflow: "hidden", textOverflow: "ellipsis" }}>{MSS_DIFFICULTY_LABELS[value - 1]}</span></span> : <span>★ TOUS NIVEAUX</span>}
      <span aria-hidden="true" style={{ opacity: .8 }}>⌄</span>
    </button>
    {open ? <><div aria-hidden="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1090 }} />
      <div role="listbox" aria-label={label} style={{ position: "absolute", top: "calc(100% + 3px)", right: 0, minWidth: "max(100%, 175px)", maxWidth: "calc(100vw - 28px)", padding: 5, display: "grid", gap: 2, border: "1px solid rgba(255,205,98,.35)", borderRadius: 11, background: "#141a27", boxShadow: "0 10px 32px rgba(0,0,0,.58)", zIndex: 1100 }}>
        {[0, 1, 2, 3, 4, 5].map(level => <button key={level} type="button" role="option" aria-selected={level === value} onClick={() => { onChange(level); setOpen(false); }} style={{ minHeight: 35, display: "flex", gap: 7, alignItems: "center", padding: "7px 9px", borderRadius: 7, background: value === level ? "rgba(255,255,255,.10)" : "transparent", color: "#fff", border: 0, textAlign: "left", cursor: "pointer", fontWeight: 900, fontSize: 10 }}>
          {level === 0 ? "★ TOUS NIVEAUX" : <><GameDifficultyStars level={level as MSSDifficulty} compact /><span>{MSS_DIFFICULTY_LABELS[level - 1]}</span></>}
        </button>)}
      </div>
    </> : null}
  </div>;
}
