import React from "react";
import Wave61SharedConfig from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "align_4" as const;

/** Configuration dédiée à align_4.
 * Les options propres au mode peuvent être ajoutées ici sans toucher aux 60 autres.
 */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} />;
}
