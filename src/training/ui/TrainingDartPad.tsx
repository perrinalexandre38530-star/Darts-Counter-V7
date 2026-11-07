import React from "react";
import Keypad from "../../components/Keypad";
import TrainingTargetPad from "./TrainingTargetPad";
import type { Dart as UIDart } from "../../lib/types";
import { normalizeTrainingVisit, type TrainingDart } from "../lib/trainingDarts";

type Method = "keypad" | "target" | "quick";

export default function TrainingDartPad({
  onVisit,
  onQuickVisit,
  allowQuickScore = false,
  enableMethods = false,
  maxQuickDarts = 3,
  storageKey,
  disabled = false,
  notice,
  centerSlot,
  requireFullVisit = false,
}: {
  onVisit: (darts: TrainingDart[]) => void;
  /** Aggregated score, with NO fabricated dart positions. Reserved for score-only games. */
  onQuickVisit?: (score: number, darts: number) => void;
  allowQuickScore?: boolean;
  enableMethods?: boolean;
  maxQuickDarts?: number;
  storageKey?: string;
  disabled?: boolean;
  notice?: React.ReactNode;
  centerSlot?: React.ReactNode;
  requireFullVisit?: boolean;
}) {
  const preferenceKey = `dc_training_input_v269_${String(storageKey || "default")}`;
  const [method, setMethod] = React.useState<Method>(() => {
    try {
      const saved = window.localStorage.getItem(preferenceKey);
      return saved === "target" || saved === "quick" && allowQuickScore ? saved : "keypad";
    } catch { return "keypad"; }
  });
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [quickScore, setQuickScore] = React.useState("");
  const [quickDarts, setQuickDarts] = React.useState<1 | 2 | 3>(3);
  React.useEffect(() => {
    // The last scoring step may have only 1 or 2 darts left.
    setQuickDarts((previous) => Math.min(previous, Math.max(1, maxQuickDarts)) as 1 | 2 | 3);
  }, [maxQuickDarts]);
  const current = !enableMethods ? "keypad" : method === "quick" && !allowQuickScore ? "keypad" : method;

  React.useEffect(() => {
    if (!disabled) return;
    setCurrentThrow([]);
    setMultiplier(1);
    setQuickScore("");
  }, [disabled]);

  const changeMethod = (next: Method) => {
    // The previous unvalidated darts must never silently disappear during a switch.
    if (disabled || currentThrow.length || (next === "quick" && !allowQuickScore)) return;
    setMethod(next);
    try { window.localStorage.setItem(preferenceKey, next); } catch {}
  };

  const append = React.useCallback((dart: UIDart) => {
    if (disabled) return;
    setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, dart]);
    setMultiplier(1);
  }, [disabled]);

  const validate = React.useCallback(() => {
    if (disabled || currentThrow.length === 0 || (requireFullVisit && currentThrow.length < 3)) return;
    const darts = normalizeTrainingVisit(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
    onVisit(darts);
  }, [currentThrow, disabled, onVisit, requireFullVisit]);

  const safeQuickDarts = Math.min(quickDarts, Math.max(1, maxQuickDarts));
  const scoreNumber = quickScore.trim() === "" ? NaN : Number(quickScore);
  const quickValid = maxQuickDarts >= 1 && Number.isInteger(scoreNumber) && scoreNumber >= 0 && scoreNumber <= safeQuickDarts * 60;
  const buttonStyle = (active: boolean): React.CSSProperties => ({
    flex: "1 1 0", minWidth: 0, minHeight: 40, borderRadius: 11, cursor: disabled || currentThrow.length ? "not-allowed" : "pointer",
    fontSize: 11, fontWeight: 900, border: active ? "1px solid rgba(39,220,255,.62)" : "1px solid rgba(255,255,255,.12)",
    color: active ? "#76ecff" : "#e6e8ee", background: active ? "rgba(39,220,255,.15)" : "rgba(255,255,255,.04)",
    opacity: disabled ? .5 : 1,
  });

  return <div style={{ width: "100%", opacity: disabled ? .65 : 1, pointerEvents: disabled ? "none" : "auto" }}>
    {enableMethods && <div style={{ padding: "10px 10px 8px", marginBottom: 10, borderRadius: 15, border: "1px solid rgba(39,220,255,.22)", background: "rgba(4,20,30,.75)" }}>
      <div style={{ marginBottom: 8, fontSize: 10, letterSpacing: .8, fontWeight: 950, opacity: .74 }}>MODE DE SAISIE</div>
      <div style={{ display: "flex", gap: 7 }}>
        <button type="button" disabled={!!currentThrow.length} style={buttonStyle(current === "keypad")} onClick={() => changeMethod("keypad")}>CLAVIER X01</button>
        <button type="button" disabled={!!currentThrow.length} style={buttonStyle(current === "target")} onClick={() => changeMethod("target")}>CIBLE</button>
        {allowQuickScore && <button type="button" disabled={!!currentThrow.length} style={buttonStyle(current === "quick")} onClick={() => changeMethod("quick")}>SCORE VOLÉE</button>}
      </div>
      {currentThrow.length ? <div style={{ marginTop: 7, fontSize: 10, color: "#ffd86b" }}>Valide ou annule la volée avant de changer de saisie.</div> : null}
    </div>}
    {current === "quick" ? <div style={{ padding: 13, borderRadius: 16, background: "rgba(6,18,27,.88)", border: "1px solid rgba(255,255,255,.12)", display: "grid", gap: 11 }}>
      <div style={{ fontSize: 13, fontWeight: 900 }}>Total de la volée</div>
      <input inputMode="numeric" type="number" min="0" max={safeQuickDarts * 60} step="1" aria-label="Score total de la volée" value={quickScore} onChange={(event) => setQuickScore(event.target.value)} placeholder={`0 à ${safeQuickDarts * 60}`} style={{ minHeight: 52, width: "100%", borderRadius: 12, border: "1px solid rgba(39,220,255,.3)", color: "#fff", background: "rgba(0,0,0,.28)", fontSize: 23, textAlign: "center" }}/>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }} aria-label="Scores rapides">
        {[26, 45, 60, 81, 100, 140, 180].filter((n) => n <= safeQuickDarts * 60).map((n) => <button type="button" key={n} onClick={() => setQuickScore(String(n))} style={{ minHeight: 35, minWidth: 43, flex: "1 1 43px", padding: "5px 7px", borderRadius: 9, border: "1px solid rgba(39,220,255,.22)", background: "rgba(39,220,255,.07)", color: "#ddfaff", fontWeight: 850 }}>{n}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }} aria-label="Clavier numérique du score">
        {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((digit) => <button key={digit} type="button" onClick={() => setQuickScore((prev) => digit === "C" ? "" : digit === "⌫" ? prev.slice(0,-1) : `${prev}${digit}`.replace(/^0+(?=\d)/, "").slice(0,3))} style={{ minHeight: 39, borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 16, fontWeight: 900 }}>{digit}</button>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ fontSize: 11, opacity: .7 }}>Fléchettes lancées :</span>{([1,2,3] as const).map((count) => <button type="button" key={count} disabled={count > maxQuickDarts} onClick={() => setQuickDarts(count)} style={{ flex: 1, height: 39, borderRadius: 10, border: quickDarts === count ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.14)", background: quickDarts === count ? "rgba(39,220,255,.12)" : "rgba(255,255,255,.03)", color: "#fff", fontWeight: 900 }}>{count}</button>)}</div>
      <button type="button" disabled={!quickValid || disabled || !onQuickVisit} onClick={() => { if (!quickValid) return; onQuickVisit?.(scoreNumber, safeQuickDarts); setQuickScore(""); }} style={{ minHeight: 48, borderRadius: 13, background: quickValid ? "linear-gradient(135deg,#11c9e6,#0394c2)" : "rgba(255,255,255,.08)", border: 0, fontWeight: 950, color: quickValid ? "#041520" : "#8996a0" }}>VALIDER LE SCORE</button>
      <div style={{ fontSize: 10.5, lineHeight: 1.45, opacity: .7 }}>Cette méthode mémorise le score total et le nombre de fléchettes. La précision et les zones S/D/T ne sont pas déduites artificiellement.</div>
    </div> : <>
      {current === "target" && <TrainingTargetPad disabled={disabled || currentThrow.length >= 3} onHit={(sector, mult) => append({ v: sector, mult } as UIDart)} />}
      {current === "target" && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, margin: "-2px 4px 9px" }}>
        <button type="button" onClick={() => append({v:25,mult:1} as UIDart)} style={{...buttonStyle(false), color:"#83ffd0", minHeight:44 }}>BULL25</button>
        <button type="button" onClick={() => append({v:25,mult:2} as UIDart)} style={{...buttonStyle(false), color:"#ff9cac", minHeight:44 }}>BULL50</button>
        <button type="button" onClick={() => append({v:0,mult:1} as UIDart)} style={{...buttonStyle(false), minHeight:44 }}>MANQUÉ</button>
      </div>}
      {current === "target" && <div style={{ padding: "9px 10px", border: "1px solid rgba(39,220,255,.18)", borderRadius: 12, marginBottom: 9, fontSize: 12, textAlign: "center" }}><b>{currentThrow.length}/3</b> fléchettes • {currentThrow.map((d) => d.v === 25 ? (d.mult === 2 ? "BULL50" : "BULL25") : `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`).join(" · ") || "Choisis une zone"}</div>}
      {current === "keypad" ? <Keypad
        currentThrow={currentThrow} multiplier={multiplier}
        onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)}
        onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
        onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
        onNumber={(n) => append({ v: n, mult: n === 0 ? 1 : multiplier } as UIDart)}
        onBull={(bull) => append({ v: 25, mult: bull === 50 ? 2 : 1 } as UIDart)}
        onValidate={validate}
        noticeSlot={requireFullVisit && currentThrow.length > 0 && currentThrow.length < 3 ? <div style={{ fontSize: 11, fontWeight: 900, textAlign: "center" }}>Complète la volée : {currentThrow.length}/3</div> : notice}
        centerSlot={centerSlot} hideTotal={!!centerSlot}
        validateAttention={currentThrow.length > 0 && (!requireFullVisit || currentThrow.length === 3)}
      /> : <div style={{ display: "flex", gap: 8, paddingBottom: 14 }}>
        <button type="button" onClick={() => setCurrentThrow((prev) => prev.slice(0,-1))} disabled={!currentThrow.length} style={{ ...buttonStyle(false), minHeight: 46 }}>ANNULER FLÉCHETTE</button>
        <button type="button" onClick={validate} disabled={!currentThrow.length || requireFullVisit && currentThrow.length < 3} style={{ ...buttonStyle(true), minHeight: 46 }}>VALIDER VOLÉE</button>
      </div>}
    </>}
  </div>;
}
