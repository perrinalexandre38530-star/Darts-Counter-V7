// EvolutionPlay — UI Play harmonisée (HUD + timer + result)
import React, { useEffect, useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingHudRow from "../../ui/TrainingHudRow";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

const LEVELS = [
  { label: "S20", need: "S20" },
  { label: "T20", need: "T20" },
  { label: "D20", need: "D20" },
  { label: "T19", need: "T19" },
  { label: "D18", need: "D18" },
  { label: "BULL", need: "BULL" },
  { label: "DBULL", need: "DBULL" },
];

function isMatch(id: string, t: any, hit: boolean) {
  if (!hit || !t) return false;
  if (id === "BULL") return t.value === "BULL";
  if (id === "DBULL") return t.value === "DBULL";
  const m = id[0];
  const n = parseInt(id.slice(1), 10);
  const mult = m === "S" ? 1 : m === "D" ? 2 : 3;
  return t.value === n && t.multiplier === mult;
}

export default function EvolutionPlay({ config, onExit }: { config: { seconds: number; startLevel: number }; onExit: () => void }) {
  const engine = useMemo(() => new TrainingEngine({ mode: "EVOLUTION" }), []);
  const [level, setLevel] = useState(Math.max(1, Math.min(LEVELS.length, config.startLevel)));
  const [ended, setEnded] = useState(false);
  const [remaining, setRemaining] = useState(config.seconds);

  const stats = computeTrainingStats(engine.state);
  const current = LEVELS[level - 1];

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, config.seconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        engine.finish(true);
        setEnded(true);
      }
    };
    const id = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <TrainingShell
        header={
          <TrainingHeader
            title="Evolution"
            onBack={onExit}
            rules={<p>Réussite = +1 niveau, raté = -1 niveau. Fin au timer.</p>}
          />
        }
        body={
          <>
            <TrainingHudRow
              left={{ label: "Temps", value: `${remaining}s` }}
              mid={{ label: "Niveau", value: level }}
              right={{ label: "Cible", value: current.label }}
            />
            <ScoreInputHub
              onThrow={(t: any, hit: boolean, score: number) => {
                engine.throw(t, hit, score);
                const ok = isMatch(current.need, t, hit);
                setLevel((l) => (ok ? Math.min(LEVELS.length, l + 1) : Math.max(1, l - 1)));
              }}
            />
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  engine.finish(true);
                  setEnded(true);
                }}
                style={{
                  height: 44,
                  width: "100%",
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
            </div>
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal open={ended} success={true} title="Session terminée" stats={stats} onClose={onExit} />
    </>
  );
}
