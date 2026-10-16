// @ts-nocheck
// =============================================================
// PREMIUM PARTY TURN OUTCOME V18
// Résume immédiatement la conséquence de la dernière action.
// =============================================================

export type PremiumTurnOutcome = {
  id: string;
  icon: string;
  kicker: string;
  title: string;
  detail: string;
  chips: string[];
  tone: "normal" | "success" | "danger" | "gold" | "info";
  playerId?: string | null;
  playerName?: string;
};

function safeRows(state: any) {
  return Array.isArray(state?.visits) ? state.visits : [];
}
function lastVisit(state: any) {
  const rows = safeRows(state);
  return rows.length ? rows[rows.length - 1] : null;
}
function playerName(state: any, id: any) {
  return state?.players?.find((p: any) => String(p?.id) === String(id))?.name || "Joueur";
}
function eventDetail(row: any, fallback = "") {
  const events = Array.isArray(row?.events) ? row.events.filter(Boolean).map(String) : [];
  return events.length ? events.slice(0, 3).join(" · ") : fallback;
}
function signed(n: any, suffix = "") {
  const v = Number(n || 0);
  return `${v > 0 ? "+" : ""}${v}${suffix}`;
}

export function castleTurnOutcome(state: any): PremiumTurnOutcome | null {
  const row = lastVisit(state);
  if (!row) return null;
  const name = playerName(state, row.playerId);
  const built = Number(row.built || 0);
  const damage = Number(row.damage || 0);
  const useful = Number(row.usefulHits || 0);

  let icon = "🏰", title = "VOLÉE SANS IMPACT", tone: PremiumTurnOutcome["tone"] = "normal";
  if (built > 0 && damage > 0) { icon = "⚔️"; title = "CONSTRUCTION + ATTAQUE"; tone = "gold"; }
  else if (damage > 0) { icon = "💥"; title = "ATTAQUE RÉUSSIE"; tone = "danger"; }
  else if (built > 0) { icon = "🧱"; title = "CHÂTEAU RENFORCÉ"; tone = "success"; }

  const own = Number(state?.bricks?.[row.playerId] || 0);
  const target = Number(state?.config?.rules?.targetBricks || 15);
  return {
    id: String(row.id || `${row.playerId}-${state?.turnIndex || 0}`),
    icon, kicker: `DERNIÈRE VOLÉE · ${name}`, title, tone,
    detail: eventDetail(row, useful ? `${useful} touche(s) utile(s).` : "Aucune brique construite ni détruite."),
    chips: [
      built ? `${signed(built)} BRIQUE${built > 1 ? "S" : ""}` : null,
      damage ? `${signed(-damage)} ADVERSE` : null,
      `${own}/${target} CHÂTEAU`,
      `${useful}/3 UTILES`,
    ].filter(Boolean),
    playerId: row.playerId, playerName: name,
  };
}

export function gotchaTurnOutcome(state: any): PremiumTurnOutcome | null {
  const row = lastVisit(state);
  if (!row) return null;
  const name = playerName(state, row.playerId);
  const victims = Array.isArray(row.gotchaVictimIds) ? row.gotchaVictimIds : [];
  const target = Number(state?.config?.rules?.targetScore || 301);

  let icon = "⚡", title = `${Number(row.visitScore || 0)} POINTS`, tone: PremiumTurnOutcome["tone"] = "normal";
  if (row.bust) { icon = "💥"; title = "BUST"; tone = "danger"; }
  else if (victims.length) { icon = "🎯"; title = `GOTCHA ×${victims.length}`; tone = "success"; }
  else if (Number(row.endScore || 0) === target) { icon = "🏁"; title = "FINISH"; tone = "gold"; }

  const victimNames = victims.map((id: any) => playerName(state, id)).join(", ");
  return {
    id: String(row.id || `${row.playerId}-${state?.turnIndex || 0}`),
    icon, kicker: `DERNIÈRE VOLÉE · ${name}`, title, tone,
    detail: row.bust ? eventDetail(row, "La volée est annulée.") :
      victims.length ? `${victimNames} ${victims.length > 1 ? "repartent" : "repart"} à zéro. ${eventDetail(row)}` :
      eventDetail(row, `${row.startScore || 0} → ${row.endScore || 0}.`),
    chips: [
      row.bust ? "VOLÉE ANNULÉE" : `${row.startScore || 0} → ${row.endScore || 0}`,
      !row.bust ? `${signed(row.visitScore)} PTS` : null,
      victims.length ? `${victims.length} VICTIME${victims.length > 1 ? "S" : ""}` : null,
      `${Math.max(0, target - Number(row.endScore || 0))} RESTE`,
    ].filter(Boolean),
    playerId: row.playerId, playerName: name,
  };
}

export function hareTurnOutcome(state: any): PremiumTurnOutcome | null {
  const row = lastVisit(state);
  if (!row) return null;
  const name = playerName(state, row.playerId);
  const events = eventDetail(row);
  const lower = events.toLowerCase();
  const steps = Number(row.steps || 0);

  let icon = row.role === "hare" ? "🐇" : "🐕";
  let title = steps > 0 ? `${steps} ÉTAPE${steps > 1 ? "S" : ""}` : "AUCUNE AVANCÉE";
  let tone: PremiumTurnOutcome["tone"] = steps > 0 ? "success" : "normal";
  if (lower.includes("capture")) { icon = "🐕"; title = "LIÈVRE CAPTURÉ"; tone = "gold"; }
  if (lower.includes("échapp") || lower.includes("escape") || lower.includes("fuite")) { icon = "🐇"; title = "LIÈVRE ÉCHAPPÉ"; tone = "gold"; }

  return {
    id: String(row.id || `${row.playerId}-${state?.turnIndex || 0}`),
    icon, kicker: `DERNIÈRE COURSE · ${name}`, title, tone,
    detail: events || (steps ? `${row.startSegment} → ${row.endSegment}.` : "La cible suivante n'a pas été validée."),
    chips: [
      String(row.role || "").toUpperCase(),
      steps ? `${signed(steps)} ÉTAPE${steps > 1 ? "S" : ""}` : "0 ÉTAPE",
      `${row.startSegment} → ${row.endSegment}`,
    ].filter(Boolean),
    playerId: row.playerId, playerName: name,
  };
}

export function penduTurnOutcome(state: any): PremiumTurnOutcome | null {
  const row = lastVisit(state);
  if (!row) return null;
  const name = playerName(state, row.playerId);
  const errors = Number(state?.errors?.[row.playerId] || 0);
  const max = Number(state?.config?.rules?.partsToLose || 6);
  const dead = !!state?.eliminated?.[row.playerId];

  let icon = "✅", title = "OBJECTIF RÉUSSI", tone: PremiumTurnOutcome["tone"] = "success";
  if (!row.success) { icon = dead ? "☠️" : "🪢"; title = dead ? "PENDU · ÉLIMINÉ" : "ÉCHEC · LE PENDU AVANCE"; tone = "danger"; }

  const penaltyAfter = row?.penaltyAfter || state?.penaltiesByPlayer?.[row.playerId] || {};
  const curse = penaltyAfter?.curse || null;
  const lastDraw = penaltyAfter?.lastDraw || penaltyAfter?.lastBodyEffect || null;

  return {
    id: String(row.id || `${row.playerId}-${state?.turnIndex || 0}`),
    icon, kicker: `DERNIER OBJECTIF · ${name}`, title, tone,
    detail: eventDetail(row, row.success ? "Le pendu reste intact." : `Erreur ${errors}/${max}.`),
    chips: [
      `${errors}/${max} ERREURS`,
      row.score != null ? `${Number(row.score || 0)} PTS` : null,
      curse ? `${curse.icon || "⚠️"} ${curse.label}` : null,
      lastDraw && !curse ? `${lastDraw.icon || "🎲"} ${lastDraw.label}` : null,
    ].filter(Boolean),
    playerId: row.playerId, playerName: name,
  };
}

export function menteurTurnOutcome(state: any): PremiumTurnOutcome | null {
  const row = lastVisit(state);
  if (!row) return null;
  const name = playerName(state, row.playerId);
  let icon = "📣", title = "NOUVELLE ENCHÈRE", tone: PremiumTurnOutcome["tone"] = "info";

  if (row.kind === "call") { icon = "🤥"; title = "MENTEUR !"; tone = "danger"; }
  if (row.kind === "resolution") {
    if (row.success) { icon = "🛡️"; title = "ANNONCE PROUVÉE"; tone = "success"; }
    else { icon = "🕵️"; title = "BLUFF DÉMASQUÉ"; tone = "gold"; }
  }

  const living = Number(state?.lives?.[row.playerId] || 0);
  return {
    id: String(row.id || `${row.playerId}-${state?.turnIndex || 0}`),
    icon, kicker: `DERNIÈRE ACTION · ${name}`, title, tone,
    detail: eventDetail(row, row.kind === "raise" ? `${name} annonce ${row.bid} points.` : ""),
    chips: [
      row.bid ? `${row.bid} PTS` : null,
      row.condition ? String(row.condition).toUpperCase() : null,
      row.score != null ? `PREUVE ${row.score} PTS` : null,
      row.kind === "resolution" ? `${living} VIE${living > 1 ? "S" : ""}` : null,
    ].filter(Boolean),
    playerId: row.playerId, playerName: name,
  };
}

export function premiumPartyTurnOutcome(mode: string, state: any): PremiumTurnOutcome | null {
  if (mode === "castle") return castleTurnOutcome(state);
  if (mode === "gotcha") return gotchaTurnOutcome(state);
  if (mode === "hare_hounds") return hareTurnOutcome(state);
  if (mode === "pendu") return penduTurnOutcome(state);
  if (mode === "menteur") return menteurTurnOutcome(state);
  return null;
}
