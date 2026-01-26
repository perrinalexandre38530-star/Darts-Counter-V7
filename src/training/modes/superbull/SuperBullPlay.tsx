// SuperBullPlay — UI Play harmonisée (HUD + result)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function SuperBullPlay({
  config,
  onExit,
}: {
  config: { target: number };
  onExit: () => void;
}) {
  const engine = useMemo(() => new TrainingEngine({ mode: "SUPER_BULL" }), []);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);

  const stats = computeTrainingStats(engine.state);

  function pts(t: any, hit: boolean) {
    if (!hit) return 0;
    if (t?.value === "DBULL") return 50;
    if (t?.value === "BULL") return 25;
    return 0;
  }

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Super Bull"
            onBack={onExit}
            rules={<p>BULL=25, DBULL=50. Atteins l’objectif le plus vite possible.</p>}
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Objectif", value: config.target }}
              mid={{ label: "Score", value: score }}
              right={{ label: "Darts", value: stats.darts }}
            />
            <ScoreInputHub
              onThrow={(t: any, hit: boolean) => {
                const p = pts(t, hit);
                if (p <= 0) {
                  engine.throw(t, false, 0);
                  return;
                }
                setScore((s) => s + p);
                engine.throw(t, true, p);
                if (score + p >= config.target) {
                  engine.finish(true);
                  setEnded(true);
                }
              }}
            />
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal
        open={ended}
        success={true}
        title="Objectif atteint"
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
