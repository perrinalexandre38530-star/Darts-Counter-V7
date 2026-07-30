// @ts-nocheck
import React from "react";
import { getModeById } from "../../lib/dartsModesCatalog";
import DartsScoreRoundsPlay from "../DartsScoreRoundsPlay";

export default function DartsModePlay({ go, gameId, config }) {
  const mode = getModeById(gameId);
  const cfg = config ?? (() => {
    try { return JSON.parse(localStorage.getItem(`dc_modecfg_${gameId}`) || "null"); } catch { return null; }
  })() ?? {};

  return (
    <DartsScoreRoundsPlay
      go={go}
      config={cfg}
      modeId={String(gameId || "darts_mode")}
      title={mode?.label ?? "MODE DARTS"}
      infoText={mode?.infoBody ?? "Toutes les volées et chaque touche S/D/T sont enregistrées dans l’ordre réel."}
      configTab="darts_mode_config"
    />
  );
}
