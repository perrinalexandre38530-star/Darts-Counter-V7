import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  countNonMisses,
  isDoubleDart,
  makeTrainingStats,
  trainingDartMatches,
  visitScore,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

const DOUBLES_8_TARGETS = [20, 18, 16, 12, 10, 8, 4, 2] as const;
const normalizeDoublesTargets = (value: any): number[] => {
  const raw = Array.isArray(value) && value.length ? value : DOUBLES_8_TARGETS;
  const out: number[] = [];
  for (const item of raw) { const n = Math.max(1, Math.min(20, Math.round(Number(item) || 20))); if (!out.includes(n)) out.push(n); }
  return out.length ? out : [...DOUBLES_8_TARGETS];
};

function DoublesObjectivePad({ target, disabled, onVisit }: { target: number; disabled?: boolean; onVisit: (visit: TrainingDart[]) => void }) {
  const [pending, setPending] = React.useState<TrainingDart[]>([]);

  React.useEffect(() => { setPending([]); }, [target]);

  const push = React.useCallback((hit: boolean) => {
    if (disabled) return;
    const dart: TrainingDart = hit
      ? { v: target, mult: 2, score: target * 2, label: `D${target}`, miss: false, bull: false, dbull: false }
      : { v: 0, mult: 1, score: 0, label: "MISS", miss: true, bull: false, dbull: false };
    setPending((prev) => {
      const next = [...prev, dart].slice(0, 3);
      if (next.length === 3) {
        queueMicrotask(() => onVisit(next));
        return [];
      }
      return next;
    });
  }, [disabled, onVisit, target]);

  return (
    <div style={{ display: "grid", gap: 10, padding: "4px 0 10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
        {[0, 1, 2].map((index) => (
          <div key={index} style={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: pending[index] ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.035)", color: pending[index]?.miss ? "#9ba3b3" : "#fff", fontSize: 12, fontWeight: 950 }}>
            {pending[index]?.label || `#${index + 1}`}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button type="button" disabled={disabled} onClick={() => push(true)} style={{ minHeight: 82, borderRadius: 18, border: "1px solid rgba(255,65,84,.72)", background: "linear-gradient(180deg,rgba(255,58,78,.96),rgba(158,18,36,.98))", color: "#fff", fontSize: 24, fontWeight: 1100, boxShadow: "0 10px 28px rgba(255,40,64,.18)" }}>
          D{target}<span style={{ display: "block", marginTop: 4, fontSize: 9, letterSpacing: 1.1, opacity: .78 }}>TOUCHÉ</span>
        </button>
        <button type="button" disabled={disabled} onClick={() => push(false)} style={{ minHeight: 82, borderRadius: 18, border: "1px solid rgba(148,158,177,.38)", background: "linear-gradient(180deg,rgba(37,44,57,.98),rgba(16,20,28,.98))", color: "#e7ebf2", fontSize: 22, fontWeight: 1100 }}>
          MISS<span style={{ display: "block", marginTop: 4, fontSize: 9, letterSpacing: 1.1, opacity: .65 }}>RATÉ</span>
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 10.5, opacity: .7 }}>3 essais par volée · l'objectif change automatiquement après les 3 volées prévues.</div>
    </div>
  );
}

export default function ChallengesPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const challengeId = String(config?.challengeId || config?.id || "3_DOUBLES_9");
  const doublesTargets = normalizeDoublesTargets(config?.doublesTargets);
  const doubles8VisitsMax = doublesTargets.length * 3 + 1;
  const doubles8MaxDarts = doublesTargets.length * 9 + 3;
  const doubles8MaxScore = doublesTargets.length * 300 + 150;
  const maxDarts = Math.max(1, Math.floor(Number(challengeId === "DOUBLES_8_BONUS" ? doubles8MaxDarts : config?.darts || (challengeId === "CHECKOUT_40_3" ? 3 : 9))));
  const bonusDouble = Math.max(1, Math.min(20, Math.floor(Number(config?.bonusDouble || 20))));
  const sequence = Array.isArray(config?.seq) ? config.seq.map(String) : ["BULL", "T20", "D20"];
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    doubles: 0,
    sequenceIndex: 0,
    doubles8Visits: 0,
    bonusHits: 0,
    perDoubleHits: {} as Record<string, number>,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const title =
    challengeId === "BULL_T20_D20"
      ? "BULL → T20 → D20"
      : challengeId === "DOUBLES_8_BONUS"
      ? (doublesTargets.length === DOUBLES_8_TARGETS.length && doublesTargets.every((n, i) => n === DOUBLES_8_TARGETS[i]) ? "8 DOUBLES · 9 FLÉCHETTES" : `${doublesTargets.length} DOUBLE${doublesTargets.length > 1 ? 'S' : ''} PERSONNALISÉ${doublesTargets.length > 1 ? 'S' : ''}`)
      : challengeId === "CHECKOUT_40_3"
      ? "CHECKOUT 40"
      : "3 DOUBLES / 9";

  const finish = React.useCallback(
    (success: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const endedAt = Date.now();
      const data = dataRef.current;
      const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
      const completion =
        challengeId === "3_DOUBLES_9"
          ? Math.min(1, data.doubles / 3)
          : challengeId === "BULL_T20_D20"
          ? Math.min(1, data.sequenceIndex / Math.max(1, sequence.length))
          : challengeId === "DOUBLES_8_BONUS"
          ? Math.min(1, data.doubles8Visits / doubles8VisitsMax)
          : success
          ? 1
          : 0;
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const metrics = {
        challengeId,
        title,
        maxDarts,
        doubles: data.doubles,
        sequenceCompleted: data.sequenceIndex,
        sequenceLength: sequence.length,
        accuracyPct,
        completionPct: completion * 100,
        dartsUsed: data.darts,
        score: challengeId === "DOUBLES_8_BONUS" ? data.points : success ? 100 : completion * 100,
        bonusDouble,
        bonusHits: data.bonusHits,
        perDoubleHits: { ...data.perDoubleHits },
        doublesTargets: [...doublesTargets],
      };

      recordSoloTrainingResult({
        modeId: "training_challenges",
        config,
        participantIds: config?.selectedPlayerIds,
        startedAt: startedAtRef.current,
        endedAt,
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        success,
        visitHistory: visitHistoryRef.current,
        metrics: { ...metrics, accuracyPercent: accuracyPct },
      });
      setResult({ success, stats, metrics });
    },
    [bonusDouble, challengeId, config, doubles8VisitsMax, doublesTargets, maxDarts, sequence.length, title]
  );

  const onVisit = React.useCallback(
    (visit: TrainingDart[]) => {
      if (endedRef.current || !visit.length) return;
      const data = dataRef.current;
      const remaining = Math.max(0, maxDarts - data.darts);
      const darts = visit.slice(0, remaining);
      if (!darts.length) return;
      appendTrainingVisit(visitHistoryRef.current, darts, { roundIndex: visitHistoryRef.current.length });

      if (challengeId === "CHECKOUT_40_3") {
        data.darts += darts.length;
        data.hits += countNonMisses(darts);
        const score = visitScore(darts);
        data.points += score;
        const last = darts[darts.length - 1];
        const success = score === 40 && isDoubleDart(last);
        rerender();
        finish(success);
        return;
      }

      if (challengeId === "DOUBLES_8_BONUS") {
        const visitIndex = Math.max(0, visitHistoryRef.current.length - 1);
        const bonusVisit = visitIndex >= doublesTargets.length * 3;
        const target = bonusVisit ? bonusDouble : doublesTargets[Math.min(doublesTargets.length - 1, Math.floor(visitIndex / 3))];
        const targetHits = darts.filter((dart) => dart.v === target && dart.mult === 2).length;
        data.darts += darts.length;
        data.hits += targetHits;
        data.doubles8Visits += 1;
        data.perDoubleHits[String(target)] = (data.perDoubleHits[String(target)] || 0) + targetHits;
        if (bonusVisit) {
          data.bonusHits += targetHits;
          data.points += targetHits * 50;
        } else {
          data.points += targetHits >= 3 ? 100 : targetHits === 2 ? 30 : targetHits === 1 ? 10 : 0;
        }
        rerender();
        if (data.doubles8Visits >= doubles8VisitsMax || data.darts >= maxDarts) finish(true);
        return;
      }

      for (const dart of darts) {
        if (endedRef.current) break;
        data.darts += 1;
        data.points += dart.score;

        if (challengeId === "3_DOUBLES_9") {
          if (isDoubleDart(dart)) {
            data.hits += 1;
            data.doubles += 1;
            if (data.doubles >= 3) {
              rerender();
              finish(true);
              return;
            }
          }
        } else {
          const expected = sequence[data.sequenceIndex];
          if (expected && trainingDartMatches(dart, expected)) {
            data.hits += 1;
            data.sequenceIndex += 1;
            if (data.sequenceIndex >= sequence.length) {
              rerender();
              finish(true);
              return;
            }
          }
        }

        if (data.darts >= maxDarts) {
          rerender();
          finish(false);
          return;
        }
      }

      rerender();
    },
    [bonusDouble, challengeId, doubles8VisitsMax, doublesTargets, finish, maxDarts, sequence]
  );

  const data = dataRef.current;
  const doubles8VisitIndex = Math.max(0, Math.min(doubles8VisitsMax - 1, data.doubles8Visits));
  const doubles8Target = doubles8VisitIndex >= doublesTargets.length * 3 ? bonusDouble : doublesTargets[Math.min(doublesTargets.length - 1, Math.floor(doubles8VisitIndex / 3))];
  const currentTarget =
    challengeId === "3_DOUBLES_9"
      ? "DOUBLE"
      : challengeId === "DOUBLES_8_BONUS"
      ? `${doubles8VisitIndex >= doublesTargets.length * 3 ? "BONUS · " : ""}D${doubles8Target}`
      : challengeId === "CHECKOUT_40_3"
      ? "40"
      : sequence[Math.min(data.sequenceIndex, sequence.length - 1)] || "—";
  const progressValue =
    challengeId === "3_DOUBLES_9"
      ? data.doubles
      : challengeId === "BULL_T20_D20"
      ? data.sequenceIndex
      : challengeId === "DOUBLES_8_BONUS"
      ? data.doubles8Visits
      : result?.success
      ? 1
      : 0;
  const progressMax =
    challengeId === "3_DOUBLES_9" ? 3 : challengeId === "BULL_T20_D20" ? sequence.length : challengeId === "DOUBLES_8_BONUS" ? doubles8VisitsMax : 1;

  return (
    <>
      <TrainingPlayLayout
        title="Challenges"
        tickerId="training_challenges"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={
          <>
            <p><b>{title}</b></p>
            <p>
              {challengeId === "3_DOUBLES_9"
                ? "Touche trois doubles quelconques en neuf fléchettes maximum."
                : challengeId === "BULL_T20_D20"
                ? "Valide BULL, puis T20, puis D20 dans cet ordre en douze fléchettes maximum."
                : challengeId === "DOUBLES_8_BONUS"
                ? `Joue ${doublesTargets.map((n) => `D${n}`).join(', ')} : trois volées par double. 1 touche = 10 pts, 2 = 30 pts, 3 = 100 pts. Termine par une volée bonus sur D${bonusDouble}, +50 pts par touche.`
                : "Fais exactement 40 en trois fléchettes maximum et termine sur un double."}
            </p>
          </>
        }
        eyebrow={title}
        target={currentTarget}
        targetHint={challengeId === "DOUBLES_8_BONUS" ? `Volée ${Math.min(doubles8VisitsMax, data.doubles8Visits + 1)} / ${doubles8VisitsMax} · ${data.darts} / ${maxDarts} fléchettes` : `${data.darts} / ${maxDarts} fléchettes utilisées`}
        progress={{ value: progressValue, max: progressMax, label: "OBJECTIF" }}
        kpis={[
          { label: "DARTS", value: `${data.darts}/${maxDarts}` },
          { label: "VALIDÉS", value: data.hits },
          { label: "POINTS", value: data.points },
          { label: challengeId === "DOUBLES_8_BONUS" ? "VOLÉES" : "RESTE", value: challengeId === "DOUBLES_8_BONUS" ? `${data.doubles8Visits}/${doubles8VisitsMax}` : Math.max(0, maxDarts - data.darts) },
        ]}
      >
        {challengeId === "DOUBLES_8_BONUS" ? (
          <DoublesObjectivePad target={doubles8Target} disabled={!!result} onVisit={onVisit} />
        ) : (
          <TrainingDartPad
            disabled={!!result}
            onVisit={onVisit}
            notice={
              <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
                {challengeId === "CHECKOUT_40_3"
                  ? "Saisis ta tentative puis valide la volée : le défi s'arrête immédiatement."
                  : "Le défi s'arrête dès que l'objectif est atteint ou la limite de fléchettes consommée."}
              </div>
            }
          />
        )}
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={challengeId === "DOUBLES_8_BONUS" ? "Challenge terminé" : result?.success ? "Défi réussi" : "Défi manqué"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "DÉFI", value: result.metrics.title },
                { label: "DARTS UTILISÉES", value: `${result.metrics.dartsUsed}/${result.metrics.maxDarts}` },
                ...(challengeId === "DOUBLES_8_BONUS" ? [{ label: "SCORE CHALLENGE", value: `${Math.round(result.metrics.score)} / ${doubles8MaxScore}` }, { label: `BONUS D${result.metrics.bonusDouble}`, value: `${result.metrics.bonusHits} touche${result.metrics.bonusHits > 1 ? "s" : ""} · ${result.metrics.bonusHits * 50} pts` }] : []),
                { label: "PROGRESSION", value: `${Math.round(result.metrics.completionPct)}%` },
                { label: "PRÉCISION", value: `${Math.round(result.metrics.accuracyPct)}%` },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
