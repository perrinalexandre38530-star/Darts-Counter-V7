import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "nine_dart_century" as const;

/** Écran Play dédié à nine_dart_century. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Tu as neuf fléchettes pour atteindre exactement 100 : surveille les BUSTS et les variantes de recul activées." />;
}
