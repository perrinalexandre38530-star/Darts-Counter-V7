import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, {
  buildTrainingParticipantConfig,
  resolveTrainingParticipants,
  useTrainingParticipantSelection,
} from "../../ui/TrainingParticipantsSelector";

export const TRAINING_CHALLENGES = [
  {
    id: "3_DOUBLES_9",
    title: "3 DOUBLES / 9 FLÉCHETTES",
    subtitle: "Touche trois doubles quelconques avant la neuvième fléchette.",
    kind: "doubles",
    goal: 3,
    darts: 9,
  },
  {
    id: "BULL_T20_D20",
    title: "BULL → T20 → D20",
    subtitle: "Valide cette séquence exacte, dans l'ordre, en douze fléchettes maximum.",
    kind: "sequence",
    seq: ["BULL", "T20", "D20"],
    darts: 12,
  },
  {
    id: "DOUBLES_8_BONUS",
    title: "8 DOUBLES · 9 FLÉCHETTES",
    subtitle: "D20 · D18 · D16 · D12 · D10 · D8 · D4 · D2 : 3 volées chacun, puis une volée bonus.",
    kind: "doubles8",
    darts: 75,
  },
  {
    id: "CHECKOUT_40_3",
    title: "CHECKOUT 40 / 3 FLÉCHETTES",
    subtitle: "Fais exactement 40 et termine obligatoirement sur un double.",
    kind: "checkout40",
    darts: 3,
  },
] as const;

const sectionLabel: React.CSSProperties = {
  margin: "14px 2px 8px",
  color: "#27dcff",
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1,
};

export default function ChallengesConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [selected, setSelected] = React.useState<(typeof TRAINING_CHALLENGES)[number]>(TRAINING_CHALLENGES[0]);
  const [bonusDouble, setBonusDouble] = React.useState(20);
  const resolved = resolveTrainingParticipants(participants, profiles);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Challenges"
          tickerId="training_challenges"
          onBack={onExit}
          rules={
            <>
              <p>Choisis un défi court. Chaque participant réalise exactement le même défi.</p>
              <p>En multi ou en équipes, les joueurs passent à tour de rôle puis un tableau comparatif individuel et collectif est généré.</p>
            </>
          }
        />
      }
      body={
        <div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
          <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />

          <div style={sectionLabel}>DÉFI</div>
          {TRAINING_CHALLENGES.map((challenge) => (
            <TrainingOptionCard key={challenge.id} title={challenge.title} subtitle={challenge.subtitle} active={selected.id === challenge.id} onClick={() => setSelected(challenge)} />
          ))}

          {selected.id === "DOUBLES_8_BONUS" && (
            <div style={{ margin: "10px 0 4px", padding: 12, border: "1px solid #293746", borderRadius: 14, background: "#09111a" }}>
              <div style={{ color: "#27dcff", fontSize: 10, fontWeight: 950, letterSpacing: 1, marginBottom: 8 }}>VOLÉE BONUS</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, opacity: 0.8 }}>Choisis le double de la dernière volée (+50 pts par touche).</span>
                <select value={bonusDouble} onChange={(e) => setBonusDouble(Math.max(1, Math.min(20, Number(e.target.value) || 20)))} style={{ minWidth: 86, minHeight: 38, borderRadius: 10, background: "#0d1824", color: "#fff", border: "1px solid #41546a", fontWeight: 900 }}>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>D{n}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, opacity: 0.66 }}>Barème : 1 touche = 10 pts · 2 = 30 pts · 3 = 100 pts. Maximum théorique : 2550 pts.</div>
            </div>
          )}

          <TrainingStartButton
            label={resolved.length > 1 ? `LANCER LE DÉFI — ${resolved.length} JOUEURS` : "LANCER LE DÉFI"}
            disabled={!resolved.length}
            onClick={() => onStart({ ...selected, challengeId: selected.id, bonusDouble, ...buildTrainingParticipantConfig(participants, profiles) })}
          />
        </div>
      }
    />
  );
}
