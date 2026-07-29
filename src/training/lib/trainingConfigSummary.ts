export function trainingModeLabel(rawModeId: string): string {
  const modeId = String(rawModeId || "").toLowerCase();
  const labels: Record<string, string> = {
    training_x01: "Training X01",
    training_doubleio: "Double In / Double Out",
    training_challenges: "Challenges",
    training_ghost: "Ghost Mode",
    training_precision_gauntlet: "Precision Gauntlet",
    training_repeat_master: "Repeat Master",
    training_super_bull: "Super Bull",
    training_time_attack: "Time Attack",
    tour_horloge: "Tour de l’horloge",
    training_clock: "Tour de l’horloge",
  };
  return labels[modeId] || rawModeId || "Training";
}

export function trainingConfigSummary(rawModeId: string, cfg: any): string {
  const modeId = String(rawModeId || "").toLowerCase();
  const config = cfg && typeof cfg === "object" ? cfg : {};

  if (modeId === "training_x01") {
    const start = Number(config.startScore || config.start || 501) || 501;
    const out = String(config.outMode || "double").toUpperCase();
    return `${start} • ${out} OUT`;
  }
  if (modeId === "training_doubleio") {
    return `${String(config.mode || "DO").toUpperCase()} • ${Number(config.rounds || 20)} rounds`;
  }
  if (modeId === "training_challenges") {
    const id = String(config.challengeId || config.id || "3_DOUBLES_9");
    const map: Record<string, string> = {
      "3_DOUBLES_9": "3 doubles / 9 fléchettes",
      BULL_T20_D20: "Bull → T20 → D20",
      CHECKOUT_40_3: "Checkout 40 / 3 fléchettes",
    };
    return map[id] || id;
  }
  if (modeId === "training_ghost") {
    return `Ghost ${Number(config.avg || 60)} moy./3 • ${Number(config.visits || 10)} volées`;
  }
  if (modeId === "training_precision_gauntlet") {
    const preset = String(config.preset || "custom").toUpperCase();
    const tolerance = Number(config.mistakesAllowed || 0);
    return `${preset} • ${tolerance === 0 ? "Hardcore" : `${tolerance} erreurs tolérées`}`;
  }
  if (modeId === "training_repeat_master") {
    return `${String(config.target || "T20")} • série ${Number(config.goal || 10)} • ${config.hardcore ? "Hardcore" : "Soft"}`;
  }
  if (modeId === "training_super_bull") {
    return `${Number(config.target || 100)} pts • ${Number(config.maxDarts || 30)} fléchettes max`;
  }
  if (modeId === "training_time_attack") {
    return `${Number(config.seconds || 60)} secondes`;
  }
  if (modeId === "tour_horloge" || modeId === "training_clock") {
    return String(config.multiplierLabel || config.mode || config.variant || "Tour complet");
  }
  return "Configuration Training";
}
