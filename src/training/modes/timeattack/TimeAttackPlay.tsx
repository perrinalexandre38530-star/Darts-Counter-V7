// TimeAttackPlay — UI Play harmonisée (HUD + footer)
import React, { useEffect, useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function TimeAttackPlay({
  config,
  onExit,
}: {
  config: { seconds: number };
  onExit: () => void;
}) {
  const engine = useMemo(
    () => new TrainingEngine({ mode: "TIME_ATTACK", timeLimitMs: config.seconds * 1000 }),
    []
  );
  const [ended, setEnded] = useState(false);
  const [success, setSuccess] = useState(true);
  const [remaining, setRemaining] = useState(config.seconds);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, config.seconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        engine.finish(true);
        setSuccess(true);
        setEnded(true);
      }
    };
    const id = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(id);
  }, []);

  const stats = computeTrainingStats(engine.state);

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Time Attack"
            onBack={onExit}
            rules={<p>Marque un maximum de points avant la fin du timer.</p>}
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Temps", value: `${remaining}s` }}
              mid={{ label: "Darts", value: stats.darts }}
              right={{ label: "Score", value: stats.score }}
            />
            <ScoreInputHub onThrow={(t: any, hit: boolean, score: number) => engine.throw(t, hit, score)} />
          </>
        }
        footer={
          <TrainingFooter
            stats={stats}
            rightSlot={
              <button
                type="button"
                onClick={() => {
                  engine.finish(true);
                  setSuccess(true);
                  setEnded(true);
                }}
                style={{
                  height: 46,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(0,0,0,0.45)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Terminer
              </button>
            }
          />
        }
      />

      <TrainingResultModal
        open={ended}
        success={success}
        title="Session terminée"
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
