/* @ts-nocheck
 * ============================================
 * src/pages/DefiPlay.tsx
 * Router Défis (PLAY) — 1 mode = 1 play dédiée
 * Objectif: éviter les écrans noirs + conserver les règles/UI propres à chaque jeu.
 * ============================================
 */
import React from "react";

import CountUpPlay from "./CountUpPlay";
import HalveItPlay from "./HalveItPlay";
import Bobs27Play from "./Bobs27Play";
import KnockoutPlay from "./KnockoutPlay";
import ShooterPlay from "./ShooterPlay";
import BaseballPlay from "./BaseballPlay";
import FootballPlay from "./FootballPlay";
import RugbyPlay from "./RugbyPlay";
import CapitalPlay from "./CapitalPlay";

function normModeId(raw: any): string {
  const v = String(raw || "");
  if (v === "bobs27") return "bobs_27";
  if (v === "bob27") return "bobs_27";
  if (v === "halve-it") return "halve_it";
  if (v === "count-up") return "count_up";
  return v || "count_up";
}

function getModeId(props: any): string {
  return normModeId(
    props?.params?.modeId ??
      props?.params?.modelId ??
      props?.modeId ??
      props?.modelId ??
      props?.params?.gameId
  );
}

export default function DefiPlay(props: any) {
  const modeId = getModeId(props);

  switch (modeId) {
    case "count_up":
      return <CountUpPlay {...props} />;
    case "halve_it":
      return <HalveItPlay {...props} />;
    case "bobs_27":
      return <Bobs27Play {...props} />;
    case "knockout":
      return <KnockoutPlay {...props} />;
    case "shooter":
      return <ShooterPlay {...props} />;
    case "baseball":
      return <BaseballPlay {...props} />;
    case "football":
      return <FootballPlay {...props} />;
    case "rugby":
      return <RugbyPlay {...props} />;
    case "capital":
      return <CapitalPlay {...props} />;
    default:
      return <CountUpPlay {...props} />;
  }
}
