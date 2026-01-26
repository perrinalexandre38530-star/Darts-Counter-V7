// RepeatMasterPlay — UI Play harmonisée (HUD + result)
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

function isTargetMatch(targetId: string, t: any, hit: boolean) {
  if (!hit || !t) return false;
  if (targetId === "BULL") return t.value === "BULL";
  if (targetId === "DBULL") return t.value === "DBULL";
  const m = targetId[0]; // S/T/D
  const n = parseInt(targetId.slice(1), 10);
  const mult = m === "S" ? 1 : m === "D" ? 2 : 3;
  return t.value === n && t.multiplier === mult;
}

export default function RepeatMasterPlay({
  config,
  onExit,
}: {
  config: { target: string; goal: number; hardcore: boolean };
  onExit: () => void;
}) {
  const engine = useMemo(() => new TrainingEngine({ mode: "REPEAT" }), []);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [ended, setEnded] = useState(false);
  const [success, setSuccess] = useState(false);

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
            title="Repeat Master"
            onBack={onExit}
            rules={
              <p>
                Cible: <b>{config.target}</b>. Objectif: streak {config.goal}. Mode{" "}
                {config.hardcore ? "Hardcore" : "Soft"}.
              </p>
            }
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Streak", value: `${streak}/${config.goal}` }}
              mid={{ label: "Best", value: best }}
              right={{ label: "Cible", value: config.target }}
            />

            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                const ok = isTargetMatch(config.target, t, hit);
                engine.throw(t, ok, ok ? score : 0);
                if (ok) {
                  setStreak((s) => {
                    const next = s + 1;
                    setBest((b) => Math.max(b, next));
                    if (next >= config.goal) finish(true);
                    return next;
                  });
                } else {
                  if (config.hardcore) finish(false);
                  else setStreak(0);
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
        title={success ? "Streak validé" : "Session terminée"}
        stats={stats}
        onClose={onExit}
      />
    </>
  );
}
