// PrecisionGauntletPlay — UI Play harmonisée (HUD + result)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

function isTargetHit(current: string, t: any, hit: boolean) {
  if (!hit || !t) return false;
  if (current === "BULL") return t.value === "BULL";
  if (current === "DBULL") return t.value === "DBULL";
  const n = parseInt(String(current).replace(/[^0-9]/g, ""), 10);
  return t.value === n;
}

export default function PrecisionGauntletPlay({
  config,
  onExit,
}: {
  config: { targets: string[]; lives: number };
  onExit: () => void;
}) {
  const engine = useMemo(() => new TrainingEngine({ mode: "PRECISION" }), []);
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(config.lives);
  const [ended, setEnded] = useState(false);
  const [success, setSuccess] = useState(false);

  const current = config.targets[idx];
  const stats = computeTrainingStats(engine.state);

  function finish(ok: boolean) {
    engine.finish(ok);
    setSuccess(ok);
    setEnded(true);
  }

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Precision"
            onBack={onExit}
            rules={<p>Atteins la cible courante. Raté = perte de vie (si vies activées).</p>}
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Cible", value: current }}
              mid={{ label: "Étape", value: `${idx + 1}/${config.targets.length}` }}
              right={{ label: "Vies", value: lives }}
            />
            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                const ok = isTargetHit(current, t, hit);
                engine.throw(t, ok, ok ? score : 0);
                if (ok) {
                  if (idx + 1 >= config.targets.length) finish(true);
                  else setIdx((i) => i + 1);
                } else {
                  if (lives > 0) setLives((l) => l - 1);
                  else finish(false);
                }
              }}
            />
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal
        open={ended}
        success={success}
        title={success ? "Parcours validé" : "Échec"}
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
