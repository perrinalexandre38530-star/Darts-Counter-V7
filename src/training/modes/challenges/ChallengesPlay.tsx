// ChallengesPlay — UI Play harmonisée (HUD + result)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

function isDouble(t: any, hit: boolean) {
  return !!hit && t?.multiplier === 2 && typeof t?.value === "number";
}
function isMatch(id: string, t: any, hit: boolean) {
  if (!hit || !t) return false;
  if (id === "BULL") return t.value === "BULL";
  if (id === "DBULL") return t.value === "DBULL";
  const m = id[0];
  const n = parseInt(id.slice(1), 10);
  const mult = m === "S" ? 1 : m === "D" ? 2 : 3;
  return t.value === n && t.multiplier === mult;
}

export default function ChallengesPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(() => new TrainingEngine({ mode: "CHALLENGES", maxDarts: config.darts }), []);
  const [ended, setEnded] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(config.darts);

  const stats = computeTrainingStats(engine.state);

  function finish(ok: boolean) {
    engine.finish(ok);
    setSuccess(ok);
    setEnded(true);
  }

  const title =
    config.kind === "doubles"
      ? `Doubles ${progress}/${config.goal}`
      : config.kind === "sequence"
      ? `Séquence ${progress}/${config.seq.length}`
      : "Checkout 40";

  return (
    <>
      <TrainingShell
        header={<TrainingHeader title="Challenges" onBack={onExit} rules={<p>Objectif : {title}. Darts limités.</p>} />}
        body={
          <>
            <TrainingHudRow
              left={{ label: "Objectif", value: title }}
              mid={{ label: "Restant", value: remaining }}
              right={{ label: "Score", value: stats.score }}
            />

            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                engine.throw(t, hit, score);
                setRemaining((r: number) => r - 1);

                if (config.kind === "doubles") {
                  if (isDouble(t, hit)) {
                    setProgress((p) => {
                      const next = p + 1;
                      if (next >= config.goal) finish(true);
                      return next;
                    });
                  }
                }

                if (config.kind === "sequence") {
                  const need = config.seq[progress];
                  if (isMatch(need, t, hit)) {
                    const next = progress + 1;
                    setProgress(next);
                    if (next >= config.seq.length) finish(true);
                  }
                }

                if (config.kind === "checkout40") {
                  // minimal: D20 direct => succès
                  if (hit && t?.multiplier === 2 && t?.value === 20) finish(true);
                }

                if (remaining - 1 <= 0 && !ended) finish(false);
              }}
            />
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal
        open={ended}
        success={success}
        title={success ? "Défi réussi" : "Défi raté"}
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
