// DoubleInOutPlay — UI Play harmonisée (HUD + footer)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function DoubleInOutPlay({
  config,
  onExit,
}: {
  config: { mode: "DI" | "DO" | "DIDO" };
  onExit: () => void;
}) {
  const engine = useMemo(() => new TrainingEngine({ mode: "DOUBLE" }), []);
  const [validated, setValidated] = useState(0);
  const [ended, setEnded] = useState(false);

  const stats = computeTrainingStats(engine.state);

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Double In/Out"
            onBack={onExit}
            rules={
              <p>
                Mode: <b>{config.mode}</b>. Seuls les doubles valident l’objectif. Objectif: enchaîner un maximum de doubles.
              </p>
            }
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Mode", value: config.mode }}
              mid={{ label: "Validés", value: validated }}
              right={{ label: "Darts", value: stats.darts }}
            />
            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                const isDouble = !!hit && t?.multiplier === 2;
                if (isDouble) setValidated((v) => v + 1);
                engine.throw(t, isDouble, isDouble ? score : 0);
              }}
            />
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
        success={true}
        title="Session terminée"
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
