import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { makeTrainingStats, type TrainingDart } from "../../lib/trainingDarts";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

const bullValue = (dart: TrainingDart) => dart.dbull ? 50 : dart.bull ? 25 : 0;

export default function SuperBullPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const target = Math.max(25, Math.floor(Number(config?.target || 100)));
  const maxDarts = Math.max(3, Math.floor(Number(config?.maxDarts || 30)));
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const dataRef = React.useRef({
    darts: 0, hits: 0, points: 0, bulls: 0, dbulls: 0,
    streak: 0, bestStreak: 0, bestVisit: 0, perfectVisits: 0,
    visits: 0, lastVisit: 0, lastVisitHits: 0,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);
  const [dbullFlash, setDbullFlash] = React.useState(false);
  const [recentVisits, setRecentVisits] = React.useState<Array<{ points:number; hits:number; dbulls:number }>>([]);

  const finish = React.useCallback((success: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const data = dataRef.current;
    const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
    const dbullPct = data.darts > 0 ? (data.dbulls / data.darts) * 100 : 0;
    const completionPct = Math.min(100, (data.points / target) * 100);
    const centreValue = data.hits > 0 ? data.points / data.hits : 0;
    const stats = makeTrainingStats({ darts: data.darts, hits: data.hits, points: data.points, startedAt: startedAtRef.current, endedAt });
    const metrics = {
      target, maxDarts, bulls: data.bulls, dbulls: data.dbulls, bestStreak: data.bestStreak,
      bestVisit: data.bestVisit, perfectVisits: data.perfectVisits, accuracyPct, dbullPct,
      centreValue, completionPct, score: completionPct,
    };
    recordSoloTrainingResult({
      modeId: "training_super_bull", config, participantIds: config?.selectedPlayerIds,
      startedAt: startedAtRef.current, endedAt, darts: data.darts, hits: data.hits,
      points: data.points, success, visitHistory: visitHistoryRef.current,
      metrics: { ...metrics, accuracyPercent: accuracyPct },
    });
    setResult({ success, stats, metrics });
  }, [config, maxDarts, target]);

  const onVisit = React.useCallback((darts: TrainingDart[]) => {
    if (endedRef.current || !darts.length) return;
    const data = dataRef.current;
    const remaining = Math.max(0, maxDarts - data.darts);
    const accepted = darts.slice(0, remaining);
    appendTrainingVisit(visitHistoryRef.current, accepted, { roundIndex: visitHistoryRef.current.length, result: "BULL" });

    let visitPoints = 0;
    let visitHits = 0;
    let visitDbulls = 0;
    for (const dart of accepted) {
      if (endedRef.current || data.darts >= maxDarts) break;
      data.darts += 1;
      const value = bullValue(dart);
      visitPoints += value;
      if (value > 0) {
        visitHits += 1;
        data.hits += 1;
        data.points += value;
        if (dart.dbull) { data.dbulls += 1; visitDbulls += 1; }
        else data.bulls += 1;
        data.streak += 1;
        data.bestStreak = Math.max(data.bestStreak, data.streak);
      } else data.streak = 0;
    }

    data.visits += 1;
    data.lastVisit = visitPoints;
    data.lastVisitHits = visitHits;
    data.bestVisit = Math.max(data.bestVisit, visitPoints);
    if (accepted.length === 3 && visitHits === 3) data.perfectVisits += 1;
    setRecentVisits((prev) => [{ points: visitPoints, hits: visitHits, dbulls: visitDbulls }, ...prev].slice(0, 5));
    if (visitDbulls > 0) {
      setDbullFlash(true);
      window.setTimeout(() => setDbullFlash(false), 720);
    }
    rerender();
    if (data.points >= target) finish(true);
    else if (data.darts >= maxDarts) finish(false);
  }, [finish, maxDarts]);

  const data = dataRef.current;
  const accuracy = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
  const dbullRate = data.darts > 0 ? (data.dbulls / data.darts) * 100 : 0;

  return (
    <>
      <TrainingPlayLayout
        title="Super Bull"
        tickerId="training_super_bull"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={<><p>BULL = 25 points, DBULL = 50 points. Toute autre zone vaut 0.</p><p>Enchaîne les centres, cherche les DBULL et atteins {target} points avant {maxDarts} fléchettes.</p></>}
        eyebrow="SUPER BULL · CENTRE DE CIBLE"
        target={`${data.points} / ${target}`}
        targetHint={`Dernière volée ${data.lastVisit} pts • ${data.lastVisitHits}/3 au centre`}
        progress={{ value: data.points, max: target, label: "PROGRESSION BULL" }}
        kpis={[
          { label: "BULL", value: data.bulls },
          { label: "DBULL", value: data.dbulls },
          { label: "PRÉCISION", value: `${Math.round(accuracy)}%` },
          { label: "SÉRIE", value: data.streak },
        ]}
      >
        <div style={{ display: "grid", gridTemplateColumns: "132px minmax(0,1fr)", gap: 10, marginBottom: 10 }}>
          <div style={{ minHeight: 132, borderRadius: 20, display: "grid", placeItems: "center", border: dbullFlash ? "2px solid rgba(255,215,64,.95)" : "1px solid rgba(39,220,255,.24)", background: dbullFlash ? "radial-gradient(circle,rgba(255,215,64,.28),rgba(7,17,29,.96) 70%)" : "rgba(255,255,255,.035)", boxShadow: dbullFlash ? "0 0 30px rgba(255,215,64,.25)" : "none", transition: "all .18s ease" }}>
            <div style={{ width: 104, height: 104, borderRadius: "50%", background: "radial-gradient(circle,#ffd740 0 23%,#d91f38 24% 48%,#f0ead9 49% 70%,#209d63 71%)", border: "4px solid rgba(255,255,255,.12)", boxShadow: "inset 0 0 0 3px rgba(0,0,0,.28)", display: "grid", placeItems: "center", color: "#071019", fontWeight: 1000, textAlign: "center", fontSize: 10 }}><span><b style={{ fontSize: 17 }}>50</b><br/>DBULL</span></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            {[
              ["BEST SÉRIE", data.bestStreak], ["BEST VOLÉE", `${data.bestVisit} pts`],
              ["VOLÉES 100%", data.perfectVisits], ["TAUX DBULL", `${Math.round(dbullRate)}%`],
            ].map(([label,value]) => <div key={String(label)} style={{ borderRadius: 14, padding: "10px 8px", background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><div style={{ fontSize: 9, opacity: .6, fontWeight: 900 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 1000, marginTop: 3 }}>{value}</div></div>)}
          </div>
        </div>

        {recentVisits.length > 0 && <div style={{ display: "flex", gap: 6, marginBottom: 9, overflowX: "auto" }}>
          {recentVisits.map((visit, i) => <div key={i} style={{ minWidth: 76, padding: "7px 8px", borderRadius: 11, background: "rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 1000 }}>{visit.points} pts</div><div style={{ fontSize: 8.5, opacity: .6 }}>{visit.hits}/3 centre{visit.dbulls ? ` · ${visit.dbulls} DB` : ""}</div></div>)}
        </div>}

        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={<div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>DBULL : sélectionne DOUBLE puis BULL • les autres zones sont comptées comme MISS.</div>}
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "SUPER BULL RÉUSSI" : "LIMITE ATTEINTE"}
        stats={result?.stats || makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })}
        metrics={result ? [
          { label: "BULL / DBULL", value: `${result.metrics.bulls} / ${result.metrics.dbulls}` },
          { label: "PRÉCISION CENTRE", value: `${Math.round(result.metrics.accuracyPct)}%` },
          { label: "TAUX DBULL", value: `${Math.round(result.metrics.dbullPct)}%` },
          { label: "MEILLEURE SÉRIE", value: result.metrics.bestStreak },
          { label: "MEILLEURE VOLÉE", value: `${result.metrics.bestVisit} pts` },
          { label: "VOLÉES 100% CENTRE", value: result.metrics.perfectVisits },
        ] : []}
        onClose={onExit}
      />
    </>
  );
}
