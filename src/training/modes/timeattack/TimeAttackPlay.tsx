import React from "react";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  calcAvg3,
  countNonMisses,
  makeTrainingStats,
  visitScore,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

type RunData = {
  darts: number;
  hits: number;
  points: number;
  visits: number;
  bestVisit: number;
  v60: number;
  v100: number;
  v140: number;
  v180: number;
};

function emptyRun(): RunData {
  return {
    darts: 0,
    hits: 0,
    points: 0,
    visits: 0,
    bestVisit: 0,
    v60: 0,
    v100: 0,
    v140: 0,
    v180: 0,
  };
}

function fmtTimer(ms: number) {
  const safe = Math.max(0, Math.ceil(ms / 100));
  const seconds = Math.floor(safe / 10);
  const tenths = safe % 10;
  return `${seconds}.${tenths}s`;
}

export default function TimeAttackPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const seconds = [30, 60, 120].includes(Number(config?.seconds)) ? Number(config.seconds) : 60;
  const limitMs = seconds * 1000;

  const [run, setRun] = React.useState<RunData>(() => emptyRun());
  const runRef = React.useRef<RunData>(run);
  const startedAtRef = React.useRef<number | null>(null);
  const endedRef = React.useRef(false);
  const [running, setRunning] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const [remainingMs, setRemainingMs] = React.useState(limitMs);

  React.useEffect(() => {
    runRef.current = run;
  }, [run]);

  const finish = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const startedAt = startedAtRef.current ?? Math.max(0, endedAt - limitMs);
    const data = runRef.current;
    const avg3 = calcAvg3(data.points, data.darts);

    setRunning(false);
    setRemainingMs(0);
    setEnded(true);

    recordSoloTrainingResult({
      modeId: "training_time_attack",
      config: { ...config, seconds },
      participantIds: Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [],
      startedAt,
      endedAt,
      darts: data.darts,
      hits: data.hits,
      points: data.points,
      success: true,
      metrics: {
        avg3,
        bestVisit: data.bestVisit,
        visits: data.visits,
        visits60Plus: data.v60,
        visits100Plus: data.v100,
        visits140Plus: data.v140,
        visits180: data.v180,
        durationMs: Math.max(0, endedAt - startedAt),
        timeLimitMs: limitMs,
      },
    });
  }, [config, limitMs, seconds]);

  React.useEffect(() => {
    if (!running || ended) return;
    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const left = Math.max(0, limitMs - (Date.now() - startedAt));
      setRemainingMs(left);
      if (left <= 0) finish();
    }, 80);
    return () => window.clearInterval(timer);
  }, [ended, finish, limitMs, running]);

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current) return;

      if (startedAtRef.current == null) {
        startedAtRef.current = Date.now();
        setRunning(true);
        setRemainingMs(limitMs);
      }

      const score = visitScore(darts);
      const hits = countNonMisses(darts);
      setRun((prev) => {
        const next: RunData = {
          ...prev,
          darts: prev.darts + darts.length,
          hits: prev.hits + hits,
          points: prev.points + score,
          visits: prev.visits + 1,
          bestVisit: Math.max(prev.bestVisit, score),
          v60: prev.v60 + (score >= 60 ? 1 : 0),
          v100: prev.v100 + (score >= 100 ? 1 : 0),
          v140: prev.v140 + (score >= 140 ? 1 : 0),
          v180: prev.v180 + (score === 180 ? 1 : 0),
        };
        runRef.current = next;
        return next;
      });
    },
    [limitMs]
  );

  const avg3 = calcAvg3(run.points, run.darts);
  const hitRate = run.darts > 0 ? run.hits / run.darts : 0;
  const elapsedMs = Math.max(0, limitMs - remainingMs);
  const statsStart = startedAtRef.current ?? Date.now();
  const stats = makeTrainingStats({
    darts: run.darts,
    hits: run.hits,
    points: run.points,
    startedAt: statsStart,
    endedAt: statsStart + Math.max(1, elapsedMs),
  });

  return (
    <>
      <TrainingPlayLayout
        title="TIME ATTACK"
        tickerId="training_time_attack"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={
          <>
            <p>Marque le maximum de points avant la fin du chrono.</p>
            <p>Valide des volées complètes de 3 fléchettes. Le chrono part avec la première validation.</p>
            <p>À 0, la session se termine automatiquement et toutes les statistiques sont enregistrées dans Training.</p>
          </>
        }
        eyebrow={running ? "CHRONO EN COURS" : "PRÊT À DÉMARRER"}
        target={startedAtRef.current == null ? `${seconds}s` : fmtTimer(remainingMs)}
        targetHint={
          startedAtRef.current == null
            ? "Prépare ta première volée : le chrono ne démarre qu’au clic sur VALIDER."
            : "Scoring libre — garde le rythme jusqu’à la dernière seconde."
        }
        progress={{ value: elapsedMs, max: limitMs, label: "TEMPS ÉCOULÉ" }}
        kpis={[
          { label: "SCORE", value: run.points },
          { label: "MOY./3", value: avg3.toFixed(1) },
          { label: "BEST", value: run.bestVisit },
          { label: "180", value: run.v180 },
        ]}
      >
        <TrainingDartPad
          onVisit={onVisit}
          disabled={ended}
          requireFullVisit
          notice={
            <div style={{ fontSize: 10.5, fontWeight: 900, textAlign: "center", opacity: 0.72 }}>
              {run.visits} volée{run.visits > 1 ? "s" : ""} • précision {Math.round(hitRate * 100)}% • 100+ {run.v100} • 140+ {run.v140}
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={ended}
        success
        title="TIME ATTACK — SESSION TERMINÉE"
        stats={stats}
        metrics={[
          { label: "Moyenne /3", value: avg3.toFixed(1) },
          { label: "Meilleure volée", value: run.bestVisit },
          { label: "Volées 60+", value: run.v60 },
          { label: "Volées 100+", value: run.v100 },
          { label: "Volées 140+", value: run.v140 },
          { label: "180", value: run.v180 },
        ]}
        onClose={onExit}
      />
    </>
  );
}
