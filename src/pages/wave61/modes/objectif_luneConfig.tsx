import React from "react";
import Wave61SharedConfig from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "objectif_lune" as const;

/** Configuration dédiée à objectif_lune.
 * Les options propres au mode peuvent être ajoutées ici sans toucher aux 60 autres.
 */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} />;
}
