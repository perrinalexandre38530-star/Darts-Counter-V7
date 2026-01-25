/* @ts-nocheck
 * ============================================
 * src/pages/DefiConfig.tsx
 * Router Défis (CONFIG) — 1 mode = 1 config dédiée
 * Objectif: éviter les écrans noirs + garantir un menu de config propre par jeu.
 * ============================================
 */
import React from "react";

import CountUpConfig from "./CountUpConfig";
import HalveItConfig from "./HalveItConfig";
import Bobs27Config from "./Bobs27Config";
import KnockoutConfig from "./KnockoutConfig";
import ShooterConfig from "./ShooterConfig";
import BaseballConfig from "./BaseballConfig";
import FootballConfig from "./FootballConfig";
import RugbyConfig from "./RugbyConfig";
import CapitalConfig from "./CapitalConfig";

function normModeId(raw: any): string {
  const v = String(raw || "");
  // normalisations courantes
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

export default function DefiConfig(props: any) {
  const modeId = getModeId(props);

  switch (modeId) {
    case "count_up":
      return <CountUpConfig {...props} />;
    case "halve_it":
      return <HalveItConfig {...props} />;
    case "bobs_27":
      return <Bobs27Config {...props} />;
    case "knockout":
      return <KnockoutConfig {...props} />;
    case "shooter":
      return <ShooterConfig {...props} />;
    case "baseball":
      return <BaseballConfig {...props} />;
    case "football":
      return <FootballConfig {...props} />;
    case "rugby":
      return <RugbyConfig {...props} />;
    case "capital":
      return <CapitalConfig {...props} />;
    default:
      // fallback safe: revient sur CountUpConfig (pas d'écran noir)
      return <CountUpConfig {...props} />;
  }
}
