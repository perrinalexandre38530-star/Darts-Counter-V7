import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "maze_chase" as const;

/** Écran Play dédié à MAZE CHASE. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Suis les secteurs du labyrinthe, accumule du POWER et ne laisse jamais le fantôme te rattraper." />;
}
