// GhostModePlay — UI Play harmonisée (HUD + result)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function GhostModePlay({
  config,
  onExit,
}: {
  config: { avg: number };
  onExit: () => void;
}) {
  const engine = useMemo(() => new TrainingEngine({ mode: "GHOST", maxDarts: 30 }), []);
  const [darts, setDarts] = useState(0);
  const [ended, setEnded] = useState(false);
  const [success, setSuccess] = useState(false);

  const stats = computeTrainingStats(engine.state);

  function finish() {
    const myAvg = engine.state.score / 10;
    const ok = myAvg >= config.avg;
    engine.finish(ok);
    setSuccess(ok);
    setEnded(true);
  }

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Ghost"
            onBack={onExit}
            rules={<p>30 flèches. Objectif: moyenne ≥ {config.avg}.</p>}
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Objectif", value: config.avg }}
              mid={{ label: "Darts", value: `${darts}/30` }}
              right={{ label: "Score", value: stats.score }}
            />
            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                engine.throw(t, hit, score);
                setDarts((d) => {
                  const next = d + 1;
                  if (next >= 30) finish();
                  return next;
                });
              }}
            />
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal
        open={ended}
        success={success}
        title={success ? "Ghost battu" : "Ghost perdu"}
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
