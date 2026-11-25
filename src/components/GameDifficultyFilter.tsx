import React from "react";
import GameDifficultyStars from "./GameDifficultyStars";
import { MSS_DIFFICULTY_LEVELS, MSS_DIFFICULTY_COLORS, mssDifficultyLabel, type MSSDifficulty } from "../lib/mssVisualCharter";

type Props = { value: number; onChange: (level: number) => void; label?: string; compact?: boolean; levels?: readonly MSSDifficulty[] };

/** Menu only: numeric value first, followed by left-aligned full stars and a trailing half star. */
function FilterStars({ level }: { level: MSSDifficulty }) {
  const full = Math.floor(level);
  const half = level % 1 !== 0;
  const color = MSS_DIFFICULTY_COLORS[Math.min(4, Math.ceil(level) - 1)];
  const id = React.useId().replace(/:/g, "");
  const starPath = "M12 2.1 15.05 8.3 21.9 9.3 16.95 14.15 18.12 21 12 17.75 5.88 21 7.05 14.15 2.1 9.3 8.95 8.3Z";
  return <span aria-hidden="true" style={{ display: "inline-flex", justifyContent: "flex-start", alignItems: "center", width: 70, flexShrink: 0 }}>
    {Array.from({ length: full }, (_, i) => <svg key={i} width="14" height="14" viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 14px", marginRight: -1 }}><path d={starPath} fill={color} /></svg>)}
    {half ? <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 14px", marginRight: -1 }}><defs><clipPath id={`${id}-half`}><rect x="0" y="0" width="12" height="24" /></clipPath></defs><path d={starPath} fill={color} clipPath={`url(#${id}-half)`} /></svg> : null}
  </span>;
}

/** Shared 1-5 difficulty picker for GAMES, CHALLENGE and TRAINING. */
export default function GameDifficultyFilter({ value, onChange, label = "Difficulté", compact = false, levels = MSS_DIFFICULTY_LEVELS }: Props) {
  const [open, setOpen] = React.useState(false);
  return <div data-mss-difficulty-filter-control="1" style={{ position: "relative", minWidth: 0, width: "100%" }}>
    <button type="button" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: compact ? 36 : 40, padding: compact ? "7px 8px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(255,190,65,.40)", background: "#121723", color: "#fff", cursor: "pointer", gap: 5, fontWeight: 950, fontSize: compact ? 10 : 11, whiteSpace: "nowrap" }}>
      {value > 0 ? <span style={{ display: "flex", minWidth: 0, gap: 5, alignItems: "center" }}><GameDifficultyStars level={value as MSSDifficulty} compact /><span style={{ fontSize: compact ? 9 : 10, overflow: "hidden", textOverflow: "ellipsis" }}>{mssDifficultyLabel(value)}</span></span> : <span>★ TOUS NIVEAUX</span>}
      <span aria-hidden="true" style={{ opacity: .8 }}>⌄</span>
    </button>
    {open ? <><div aria-hidden="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1090 }} />
      <div role="listbox" aria-label={label} style={{ position: "absolute", top: "calc(100% + 3px)", right: 0, minWidth: "max(100%, 270px)", maxWidth: "calc(100vw - 28px)", padding: 5, display: "grid", gap: 2, border: "1px solid rgba(255,205,98,.35)", borderRadius: 11, background: "#141a27", boxShadow: "0 10px 32px rgba(0,0,0,.58)", zIndex: 1100 }}>
        {[0, ...levels].map(level => <button key={level} type="button" role="option" aria-selected={level === value} onClick={() => { onChange(level); setOpen(false); }} style={{ minHeight: 35, display: "grid", gridTemplateColumns: "29px 78px minmax(0, 1fr)", columnGap: 8, alignItems: "center", padding: "7px 9px", borderRadius: 7, background: value === level ? "rgba(255,255,255,.10)" : "transparent", color: "#fff", border: 0, textAlign: "left", cursor: "pointer", fontWeight: 900, fontSize: 10 }}>
          {level === 0 ? <span style={{ gridColumn: "1 / -1", whiteSpace: "nowrap" }}>★ TOUS NIVEAUX</span> : <>
            <span style={{ textAlign: "left", fontVariantNumeric: "tabular-nums", color: "#ffe28a", whiteSpace: "nowrap" }}>{level}</span>
            <FilterStars level={level as MSSDifficulty} />
            <span style={{ minWidth: 0, textAlign: "left", overflowWrap: "normal" }}>{mssDifficultyLabel(level)}</span>
          </>}
        </button>)}
      </div>
    </> : null}
  </div>;
}
