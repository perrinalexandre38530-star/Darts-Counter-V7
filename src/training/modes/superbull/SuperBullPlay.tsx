import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { makeTrainingStats, normalizeTrainingDart, type TrainingDart } from "../../lib/trainingDarts";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { playGolfPerfSfx, playGolfTickerSound, unlockAudio } from "../../../lib/sfx";

const dartFromKind = (kind: "bull25" | "bull50" | "miss"): TrainingDart =>
  normalizeTrainingDart(kind === "bull50" ? { v: 25, mult: 2 } : kind === "bull25" ? { v: 25, mult: 1 } : { v: 0, mult: 1 });

const kindOf = (dart: TrainingDart) => dart.dbull ? "bull50" : dart.bull ? "bull25" : "miss";
const labelOf = (dart?: TrainingDart | null) => !dart ? "—" : dart.dbull ? "50" : dart.bull ? "25" : "MISS";

function TargetIcon({ kind, size = 46 }: { kind: "bull25" | "bull50"; size?: number }) {
  const bg = kind === "bull50"
    ? "radial-gradient(circle,#d91f3c 0 34%,#168451 35% 49%,#d91f3c 50% 69%,#171717 70%)"
    : "radial-gradient(circle,#168451 0 34%,#d91f3c 35% 49%,#168451 50% 69%,#171717 70%)";
  return <span style={{ width:size, height:size, borderRadius:"50%", display:"grid", placeItems:"center", background:bg, border:"3px solid rgba(255,255,255,.18)", boxShadow:"inset 0 0 0 2px rgba(0,0,0,.35),0 7px 18px rgba(0,0,0,.32)", color:"#fff", fontWeight:1000, fontSize:Math.max(10,Math.round(size*.28)), textShadow:"0 1px 3px #000" }}>{kind === "bull50" ? "50" : "25"}</span>;
}

type Fx = { id: number; kind: "bull25" | "bull50" | "miss" } | null;

export default function SuperBullPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const target = Math.max(25, Math.floor(Number(config?.target || 100)));
  const maxDarts = Math.max(3, Math.floor(Number(config?.maxDarts || 30)));
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const [visits, setVisits] = React.useState<TrainingDart[][]>([]);
  const [pending, setPending] = React.useState<TrainingDart[]>([]);
  const [result, setResult] = React.useState<any>(null);
  const [fx, setFx] = React.useState<Fx>(null);
  const fxTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => () => { if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current); }, []);

  const allDarts = React.useMemo(() => [...visits.flat(), ...pending], [visits, pending]);
  const points = React.useMemo(() => allDarts.reduce((sum, dart) => sum + dart.score, 0), [allDarts]);
  const hits = React.useMemo(() => allDarts.filter((dart) => dart.bull || dart.dbull).length, [allDarts]);
  const bulls = React.useMemo(() => allDarts.filter((dart) => dart.bull).length, [allDarts]);
  const dbulls = React.useMemo(() => allDarts.filter((dart) => dart.dbull).length, [allDarts]);
  const misses = Math.max(0, allDarts.length - hits);

  const visitScores = React.useMemo(() => visits.map((row) => row.reduce((sum, dart) => sum + dart.score, 0)), [visits]);
  const bestVisit = visitScores.length ? Math.max(...visitScores) : 0;
  const perfectVisits = visits.filter((row) => row.length === 3 && row.every((dart) => dart.bull || dart.dbull)).length;

  const streaks = React.useMemo(() => {
    let current = 0;
    let best = 0;
    for (const dart of allDarts) {
      if (dart.bull || dart.dbull) { current += 1; best = Math.max(best, current); }
      else current = 0;
    }
    return { current, best };
  }, [allDarts]);

  const positionStats = React.useMemo(() => [0,1,2].map((slot) => {
    const darts = visits.map((row) => row[slot]).filter(Boolean) as TrainingDart[];
    if (pending[slot]) darts.push(pending[slot]);
    const b25 = darts.filter((dart) => dart.bull).length;
    const b50 = darts.filter((dart) => dart.dbull).length;
    const hitCount = b25 + b50;
    return {
      slot: slot + 1,
      darts: darts.length,
      b25,
      b50,
      misses: Math.max(0, darts.length - hitCount),
      precision: darts.length ? Math.round((hitCount / darts.length) * 100) : 0,
      points: b25 * 25 + b50 * 50,
    };
  }), [visits, pending]);

  const triggerFx = React.useCallback((kind: "bull25" | "bull50" | "miss") => {
    setFx({ id: Date.now() + Math.random(), kind });
    if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current);
    fxTimerRef.current = window.setTimeout(() => setFx(null), 700);
    // Même feedback sonore que SUPER BULL Jeu. Les helpers respectent les préférences audio globales.
    try { void unlockAudio(); } catch {}
    try {
      if (kind === "bull50") {
        playGolfTickerSound("EAGLE", 0.98);
        window.setTimeout(() => playGolfPerfSfx("EAGLE", 0.88), 110);
      } else if (kind === "bull25") {
        playGolfTickerSound("BIRDIE", 0.96);
        window.setTimeout(() => playGolfPerfSfx("BIRDIE", 0.8), 110);
      } else {
        playGolfTickerSound("MISS", 0.94);
        window.setTimeout(() => playGolfPerfSfx("MISS", 0.76), 90);
      }
    } catch {}
  }, []);

  const finishFrom = React.useCallback((finalVisits: TrainingDart[][], success: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const dartsFlat = finalVisits.flat();
    const finalPoints = dartsFlat.reduce((sum, dart) => sum + dart.score, 0);
    const finalHits = dartsFlat.filter((dart) => dart.bull || dart.dbull).length;
    const finalBulls = dartsFlat.filter((dart) => dart.bull).length;
    const finalDbulls = dartsFlat.filter((dart) => dart.dbull).length;
    let currentStreak = 0;
    let bestStreak = 0;
    for (const dart of dartsFlat) {
      if (dart.bull || dart.dbull) { currentStreak += 1; bestStreak = Math.max(bestStreak, currentStreak); }
      else currentStreak = 0;
    }
    const scores = finalVisits.map((row) => row.reduce((sum, dart) => sum + dart.score, 0));
    const finalBestVisit = scores.length ? Math.max(...scores) : 0;
    const finalPerfect = finalVisits.filter((row) => row.length === 3 && row.every((dart) => dart.bull || dart.dbull)).length;
    const finalPositionStats = [0,1,2].map((slot) => {
      const darts = finalVisits.map((row) => row[slot]).filter(Boolean) as TrainingDart[];
      const b25 = darts.filter((dart) => dart.bull).length;
      const b50 = darts.filter((dart) => dart.dbull).length;
      const centerHits = b25 + b50;
      return { slot: slot + 1, darts: darts.length, b25, b50, misses: Math.max(0, darts.length - centerHits), precision: darts.length ? Math.round(centerHits / darts.length * 100) : 0, points: b25 * 25 + b50 * 50 };
    });
    const accuracyPct = dartsFlat.length ? (finalHits / dartsFlat.length) * 100 : 0;
    const dbullPct = dartsFlat.length ? (finalDbulls / dartsFlat.length) * 100 : 0;
    const completionPct = Math.min(100, (finalPoints / target) * 100);
    const centreValue = finalHits ? finalPoints / finalHits : 0;
    const pointsPerDart = dartsFlat.length ? finalPoints / dartsFlat.length : 0;
    const stats = makeTrainingStats({ darts: dartsFlat.length, hits: finalHits, points: finalPoints, startedAt: startedAtRef.current, endedAt });
    const metrics = {
      target, maxDarts, bulls: finalBulls, dbulls: finalDbulls, misses: Math.max(0, dartsFlat.length - finalHits),
      bestStreak, bestVisit: finalBestVisit, perfectVisits: finalPerfect, accuracyPct, dbullPct,
      centreValue, completionPct, pointsPerDart, dartsToTarget: success ? dartsFlat.length : null,
      positionStats: finalPositionStats, score: completionPct,
    };
    const visitHistory: any[] = [];
    finalVisits.forEach((row, index) => appendTrainingVisit(visitHistory, row, { roundIndex: index, result: "SUPER_BULL" }));
    recordSoloTrainingResult({
      modeId: "training_super_bull", config, participantIds: config?.selectedPlayerIds,
      startedAt: startedAtRef.current, endedAt, darts: dartsFlat.length, hits: finalHits,
      points: finalPoints, success, visitHistory,
      metrics: { ...metrics, accuracyPercent: accuracyPct },
    });
    setResult({ success, stats, metrics });
  }, [config, maxDarts, target]);

  const addDart = React.useCallback((kind: "bull25" | "bull50" | "miss") => {
    if (result || endedRef.current || allDarts.length >= maxDarts || points >= target) return;
    const dart = dartFromKind(kind);
    triggerFx(kind);
    const nextPending = [...pending, dart].slice(0, 3);
    const projectedDarts = allDarts.length + 1;
    const projectedPoints = points + dart.score;
    const terminal = projectedPoints >= target || projectedDarts >= maxDarts;
    if (nextPending.length >= 3 || terminal) {
      const nextVisits = [...visits, nextPending];
      setVisits(nextVisits);
      setPending([]);
      if (terminal) finishFrom(nextVisits, projectedPoints >= target);
    } else {
      setPending(nextPending);
    }
  }, [allDarts.length, finishFrom, maxDarts, pending, points, result, target, triggerFx, visits]);

  const undo = React.useCallback(() => {
    if (result || endedRef.current) return;
    if (pending.length) {
      setPending((prev) => prev.slice(0, -1));
      return;
    }
    if (!visits.length) return;
    const last = visits[visits.length - 1];
    setVisits((prev) => prev.slice(0, -1));
    setPending(last.slice(0, Math.max(0, last.length - 1)));
  }, [pending.length, result, visits]);

  const accuracy = allDarts.length ? (hits / allDarts.length) * 100 : 0;
  const dbullRate = allDarts.length ? (dbulls / allDarts.length) * 100 : 0;
  const remaining = Math.max(0, maxDarts - allDarts.length);
  const currentSlots = [0,1,2].map((slot) => pending[slot] || null);
  const recentVisits = visits.slice(-5).reverse();

  return (
    <>
      <TrainingPlayLayout
        title="Super Bull"
        tickerId="training_super_bull"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={<><p>BULL25 = 25 points, BULL50 = 50 points, MISS = 0.</p><p>Atteins {target} points avant la limite de {maxDarts} fléchettes. La saisie est volontairement limitée aux trois résultats utiles.</p></>}
        eyebrow="SUPER BULL · TRAINING"
        target={`${points} / ${target}`}
        targetHint={`${remaining} fléchettes restantes • volée ${visits.length + 1} • ${pending.length}/3`}
        progress={{ value: points, max: target, label: "PROGRESSION BULL" }}
        kpis={[
          { label: "BULL25", value: bulls },
          { label: "BULL50", value: dbulls },
          { label: "PRÉCISION", value: `${Math.round(accuracy)}%` },
          { label: "SÉRIE", value: streaks.current },
        ]}
      >
        <style>{`
          .tsb-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.92fr);gap:8px}.tsb-card{border-radius:16px;border:1px solid rgba(39,220,255,.18);background:rgba(3,14,24,.86);padding:9px}.tsb-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tsb-slot{height:52px;border-radius:12px;border:1px solid rgba(255,255,255,.09);display:grid;place-items:center;text-align:center;background:rgba(255,255,255,.035)}.tsb-slot small{font-size:8px;opacity:.55;font-weight:900}.tsb-slot b{font-size:17px}.tsb-slot.bull25{border-color:rgba(67,235,156,.55);color:#7af0b0}.tsb-slot.bull50{border-color:rgba(255,91,110,.58);color:#ff98a4}.tsb-slot.miss{color:#b7c0c8}.tsb-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.tsb-buttons button{min-height:112px;border-radius:16px;border:1px solid rgba(255,255,255,.14);color:#fff;font-weight:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;touch-action:manipulation}.tsb-buttons button b{font-size:18px}.tsb-buttons button small{font-size:8px;opacity:.76}.tsb-buttons .b25{background:linear-gradient(180deg,#0fa667,#075b3b);border-color:#54e7a2}.tsb-buttons .b50{background:linear-gradient(180deg,#e72c43,#7c1522);border-color:#ff7484}.tsb-buttons .miss{background:linear-gradient(180deg,#46525e,#1b242d);border-color:#8493a1}.tsb-buttons button.hit{animation:tsbHit .48s ease}.tsb-undo{width:100%;height:40px;margin-top:7px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:#081522;color:#d7e5ee;font-size:9px;font-weight:1000}.tsb-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.tsb-stat{min-height:55px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);display:grid;place-items:center;text-align:center}.tsb-stat span{font-size:7.5px;opacity:.55;font-weight:950}.tsb-stat b{font-size:18px;color:#27dcff}.tsb-pos{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}.tsb-pos>div{border-radius:10px;padding:7px 4px;text-align:center;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}.tsb-pos small{display:block;font-size:7px;opacity:.55;font-weight:950}.tsb-pos b{font-size:15px}.tsb-recent{display:flex;gap:5px;overflow:auto;margin-top:7px}.tsb-recent>div{min-width:74px;border-radius:10px;padding:6px;text-align:center;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06)}.tsb-recent b{font-size:13px}.tsb-recent small{display:block;font-size:7.5px;opacity:.55}.tsb-fx{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:190;pointer-events:none;animation:tsbFx .68s ease both}.tsb-fx-card{min-width:160px;padding:14px 18px;border-radius:20px;text-align:center;background:rgba(3,10,18,.93);border:1px solid rgba(255,255,255,.15);box-shadow:0 20px 50px rgba(0,0,0,.48)}.tsb-fx-card strong{display:block;font-size:25px;margin-top:4px}.tsb-fx-card small{font-size:9px;color:#8edfff;font-weight:1000;letter-spacing:1px}@keyframes tsbFx{0%{opacity:0;transform:translate(-50%,-40%) scale(.72)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}100%{opacity:0;transform:translate(-50%,-58%) scale(1)}}@keyframes tsbHit{0%{transform:scale(.92)}50%{transform:scale(1.04)}100%{transform:scale(1)}}@media(max-width:700px){.tsb-grid{grid-template-columns:1fr}.tsb-buttons button{min-height:92px}}@media(orientation:landscape) and (max-height:520px){.tsb-grid{grid-template-columns:minmax(0,1.2fr) minmax(250px,.8fr)}.tsb-buttons button{min-height:78px}.tsb-slot{height:42px}}
        `}</style>

        <div className="tsb-grid">
          <section className="tsb-card">
            <div style={{ fontSize:9, fontWeight:1000, letterSpacing:.8, color:"#27dcff", marginBottom:6 }}>VOLÉE EN COURS</div>
            <div className="tsb-slots">
              {currentSlots.map((dart, index) => <div key={index} className={`tsb-slot ${dart ? kindOf(dart) : ""}`}><div><small>D{index + 1}</small><b>{labelOf(dart)}</b></div></div>)}
            </div>
            <div className="tsb-buttons">
              <button type="button" className={`b25 ${fx?.kind === "bull25" ? "hit" : ""}`} disabled={!!result} onClick={() => addDart("bull25")}><TargetIcon kind="bull25" /><b>BULL25</b><small>+25 PTS</small></button>
              <button type="button" className={`b50 ${fx?.kind === "bull50" ? "hit" : ""}`} disabled={!!result} onClick={() => addDart("bull50")}><TargetIcon kind="bull50" /><b>BULL50</b><small>+50 PTS</small></button>
              <button type="button" className={`miss ${fx?.kind === "miss" ? "hit" : ""}`} disabled={!!result} onClick={() => addDart("miss")}><span style={{ width:46,height:46,borderRadius:"50%",display:"grid",placeItems:"center",background:"#26313b",border:"3px solid rgba(255,255,255,.14)",fontSize:27 }}>×</span><b>MISS</b><small>0 PT</small></button>
            </div>
            <button type="button" className="tsb-undo" disabled={!!result || (!pending.length && !visits.length)} onClick={undo}>{pending.length ? "ANNULER LA DERNIÈRE FLÉCHETTE" : "CORRIGER D3 DE LA DERNIÈRE VOLÉE"}</button>
          </section>

          <aside className="tsb-card">
            <div style={{ fontSize:9, fontWeight:1000, letterSpacing:.8, color:"#27dcff", marginBottom:6 }}>STATISTIQUES LIVE</div>
            <div className="tsb-stat-grid">
              <div className="tsb-stat"><span>MISS</span><b>{misses}</b></div>
              <div className="tsb-stat"><span>TAUX BULL50</span><b>{Math.round(dbullRate)}%</b></div>
              <div className="tsb-stat"><span>BEST SÉRIE</span><b>{streaks.best}</b></div>
              <div className="tsb-stat"><span>BEST VOLÉE</span><b>{bestVisit}</b></div>
              <div className="tsb-stat"><span>VOLÉES 100%</span><b>{perfectVisits}</b></div>
              <div className="tsb-stat"><span>DARTS</span><b>{allDarts.length}/{maxDarts}</b></div>
            </div>
            <div className="tsb-pos">
              {positionStats.map((row) => <div key={row.slot}><small>D{row.slot}</small><b>{row.precision}%</b><small>{row.b25}/{row.b50}/{row.misses}</small></div>)}
            </div>
            {recentVisits.length > 0 && <div className="tsb-recent">{recentVisits.map((row, index) => { const score=row.reduce((sum,dart)=>sum+dart.score,0); const centre=row.filter((dart)=>dart.bull||dart.dbull).length; return <div key={index}><b>{score} pts</b><small>{centre}/{row.length} centre</small></div>; })}</div>}
          </aside>
        </div>

        {fx && <div className="tsb-fx" key={fx.id}><div className="tsb-fx-card">{fx.kind === "bull50" ? <TargetIcon kind="bull50" size={70} /> : fx.kind === "bull25" ? <TargetIcon kind="bull25" size={70} /> : <span style={{ width:70,height:70,borderRadius:"50%",display:"grid",placeItems:"center",margin:"0 auto",background:"#26313b",fontSize:42 }}>×</span>}<small>{fx.kind === "bull50" ? "IMPACT PARFAIT" : fx.kind === "bull25" ? "BON IMPACT" : "AUCUN POINT"}</small><strong>{fx.kind === "bull50" ? "BULL50" : fx.kind === "bull25" ? "BULL25" : "MISS"}</strong></div></div>}
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "SUPER BULL RÉUSSI" : "LIMITE ATTEINTE"}
        stats={result?.stats || makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })}
        metrics={result ? [
          { label: "BULL25 / BULL50", value: `${result.metrics.bulls} / ${result.metrics.dbulls}` },
          { label: "PRÉCISION CENTRE", value: `${Math.round(result.metrics.accuracyPct)}%` },
          { label: "TAUX BULL50", value: `${Math.round(result.metrics.dbullPct)}%` },
          { label: "MEILLEURE SÉRIE", value: result.metrics.bestStreak },
          { label: "MEILLEURE VOLÉE", value: `${result.metrics.bestVisit} pts` },
          { label: "VOLÉES 100%", value: result.metrics.perfectVisits },
          { label: "POINTS / FLÉCHETTE", value: result.metrics.pointsPerDart.toFixed(1) },
          { label: "FLÉCHETTES UTILISÉES", value: result.stats.darts },
        ] : []}
        onClose={onExit}
      />
    </>
  );
}
