import React from "react";
import GameDifficultyStars from "../../components/GameDifficultyStars";
import type { MSSDifficulty } from "../../lib/mssVisualCharter";
import HubGlyph from "./TrainingHubGlyph";

/** Single visual reference for the Training and Challenge exercise lists. */
export default function TrainingExerciseListRow({ title, description, icon, level, status, badge, active = false, mastered = false, onClick }: {
  title: string; description: string; icon: string; level: MSSDifficulty; status: string; badge?: string;
  active?: boolean; mastered?: boolean; onClick: () => void;
}) {
  return <button type="button" className="mssTrainingExerciseListRow" data-active={active} data-mastered={mastered} onClick={onClick} aria-label={`${title} — ${status}`}>
    <span className="mssTrainingExerciseListIcon"><HubGlyph name={icon} size={16}/></span>
    <span className="mssTrainingExerciseListCopy"><strong>{title}</strong><span>{description}</span><small>{status}</small></span>
    <span className="mssTrainingExerciseListMeta"><GameDifficultyStars level={level} compact showValue={false}/>{badge && <span className="mssTrainingExerciseListBadge">{badge}</span>}</span>
  </button>;
}
