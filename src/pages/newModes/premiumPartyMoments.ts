// @ts-nocheck
// Shared spectacle/AI intent helpers for CASTLE / GOTCHA / HARE & HOUNDS / PENDU / MENTEUR.

export type PartyModeKey = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur";
export type PartyMoment = {
  key: string;
  icon: string;
  kicker: string;
  title: string;
  detail?: string;
  tone?: "success" | "danger" | "info" | "gold";
  durationMs?: number;
  playerId?: string | null;
};

function latestVisit(state: any) {
  const rows = Array.isArray(state?.visits) ? state.visits : [];
  return rows.length ? rows[rows.length - 1] : null;
}
function latestEvent(state: any) {
  const visit = latestVisit(state);
  const events = Array.isArray(visit?.events) ? visit.events.filter(Boolean) : [];
  return { visit, events, text: events.join(" · ") };
}
function legWinnerMoment(mode: PartyModeKey, next: any, previous: any, nameById: (id: any) => string): PartyMoment | null {
  if (Number(next?.legIndex || 0) <= Number(previous?.legIndex || 0) || !next?.lastLegWinnerId) return null;
  const winner = nameById(next.lastLegWinnerId);
  const icon = mode === "castle" ? "🏰" : mode === "gotcha" ? "🎯" : mode === "hare_hounds" ? "🏁" : mode === "pendu" ? "🪢" : "🤥";
  return {
    key: `${mode}-leg-${next.legIndex}-${next.lastLegWinnerId}`,
    icon,
    kicker: `MANCHE ${Number(previous?.legIndex || 0) + 1}`,
    title: `${winner} remporte la manche`,
    detail: next?.phase === "finished" ? "Victoire du match" : `Prochaine manche · score ${Number(next?.legWins?.[next.lastLegWinnerId] || 0)}`,
    tone: "gold",
    durationMs: 2450,
    playerId: String(next.lastLegWinnerId),
  };
}

export function resolvePremiumPartyMoment(mode: PartyModeKey, next: any, previous: any, nameById: (id: any) => string): PartyMoment | null {
  if (!next || !previous) return null;
  if (next.phase === "finished" && next.winnerId && previous.phase !== "finished") {
    return {
      key: `${mode}-victory-${next.winnerId}-${Date.now()}`,
      icon: "🏆",
      kicker: "VICTOIRE",
      title: `${nameById(next.winnerId)} gagne le match`,
      detail: "Performance enregistrée dans l'historique",
      tone: "gold",
      durationMs: 2800,
      playerId: String(next.winnerId),
    };
  }
  const leg = legWinnerMoment(mode, next, previous, nameById);
  if (leg) return leg;

  const { visit, text } = latestEvent(next);
  const previousVisit = latestVisit(previous);
  if (!visit || !text || (previousVisit?.id && String(previousVisit.id) === String(visit.id))) return null;
  const playerId = String(visit.playerId || next?.players?.[previous?.activePlayerIndex]?.id || "") || null;
  const player = playerId ? nameById(playerId) : "Joueur";
  const lc = text.toLowerCase();

  if (mode === "castle") {
    if (text.includes("−")) return { key: `${visit.id}-attack`, icon: "⚔️", kicker: "ASSAUT", title: "Château adverse touché !", detail: text, tone: "danger", durationMs: 1900, playerId };
    if (text.includes("+")) return { key: `${visit.id}-build`, icon: "🧱", kicker: "CONSTRUCTION", title: `${player} renforce son château`, detail: text, tone: "success", durationMs: 1750, playerId };
  }
  if (mode === "gotcha") {
    if (lc.includes("gotcha")) return { key: `${visit.id}-gotcha`, icon: "💥", kicker: "GOTCHA !", title: `${player} remet un adversaire à zéro`, detail: text, tone: "danger", durationMs: 2250, playerId };
    if (lc.includes("finish")) return { key: `${visit.id}-finish`, icon: "🎯", kicker: "FINISH", title: `${player} atteint la cible`, detail: text, tone: "success", durationMs: 2050, playerId };
    if (lc.includes("bust")) return { key: `${visit.id}-bust`, icon: "💣", kicker: "BUST", title: "Volée annulée", detail: text, tone: "danger", durationMs: 1750, playerId };
  }
  if (mode === "hare_hounds") {
    if (lc.includes("rattrape")) return { key: `${visit.id}-catch`, icon: "🐕", kicker: "CAPTURE", title: "Le Limier rattrape le Lièvre !", detail: text, tone: "danger", durationMs: 2200, playerId };
    if (lc.includes("boucle")) return { key: `${visit.id}-escape`, icon: "🐇", kicker: "ÉVASION", title: "Le Lièvre boucle le tour !", detail: text, tone: "success", durationMs: 2200, playerId };
    if (lc.includes("avance")) return { key: `${visit.id}-step`, icon: "🏃", kicker: "POURSUITE", title: `${player} progresse`, detail: text, tone: "info", durationMs: 1450, playerId };
  }
  if (mode === "pendu") {
    if (lc.includes("est pendu")) return { key: `${visit.id}-out`, icon: "☠️", kicker: "ÉLIMINATION", title: `${player} est PENDU`, detail: text, tone: "danger", durationMs: 2350, playerId };
    if (lc.includes("réussit") || lc.includes("reussit")) return { key: `${visit.id}-success`, icon: "✅", kicker: "DÉFI RÉUSSI", title: `${player} tient le défi`, detail: text, tone: "success", durationMs: 1800, playerId };
    if (lc.includes("rate")) return { key: `${visit.id}-miss`, icon: "🪢", kicker: "ERREUR", title: "Le pendu avance…", detail: text, tone: "danger", durationMs: 1750, playerId };
  }
  if (mode === "menteur") {
    if (lc.includes("crie menteur")) return { key: `${visit.id}-liar`, icon: "🤥", kicker: "MENTEUR !", title: `${player} défie l'annonce`, detail: text, tone: "danger", durationMs: 2050, playerId };
    if (lc.includes("prouve")) return { key: `${visit.id}-proved`, icon: "✅", kicker: "PREUVE RÉUSSIE", title: "Annonce validée !", detail: text, tone: "success", durationMs: 2200, playerId };
    if (lc.includes("flagrant mensonge")) return { key: `${visit.id}-caught`, icon: "🚨", kicker: "MENSONGE DÉMASQUÉ", title: "Pris en flagrant mensonge !", detail: text, tone: "danger", durationMs: 2300, playerId };
    if (lc.includes("éliminé") || lc.includes("elimine")) return { key: `${visit.id}-out`, icon: "☠️", kicker: "ÉLIMINATION", title: "Un joueur quitte la table", detail: text, tone: "danger", durationMs: 2300, playerId };
    if (lc.includes("annonce")) return { key: `${visit.id}-raise`, icon: "📣", kicker: "ENCHÈRE", title: `${player} monte la pression`, detail: text, tone: "info", durationMs: 1450, playerId };
  }
  return null;
}

export function premiumBotConfidence(level: any) {
  return level === "hard" ? 88 : level === "easy" ? 52 : 70;
}

export function premiumBotIntent(mode: PartyModeKey, state: any, activePlayer: any): string {
  if (!activePlayer) return "ANALYSE";
  const id = String(activePlayer.id || "");
  if (mode === "castle") {
    if (state?.phase === "assignment") return "ATTRIBUTION DU SECTEUR";
    const own = Number(state?.bricks?.[id] || 0);
    const rivals = (state?.players || []).filter((p: any) => String(p.id) !== id);
    const leader = rivals.sort((a: any, b: any) => Number(state?.bricks?.[b.id] || 0) - Number(state?.bricks?.[a.id] || 0))[0];
    const leaderBricks = Number(state?.bricks?.[leader?.id] || 0);
    if (state?.config?.rules?.attacksEnabled && leaderBricks > own + 2) return "ASSAUT DU LEADER";
    if (own >= Number(state?.config?.rules?.targetBricks || 15) - 3) return "FERMETURE DU CHÂTEAU";
    return "FORTIFICATION";
  }
  if (mode === "gotcha") {
    const score = Number(state?.scores?.[id] || 0);
    const target = Number(state?.config?.rules?.targetScore || 301);
    const remaining = target - score;
    if (remaining <= 170) return "FINISH";
    const canGotcha = (state?.players || []).some((p: any) => p.id !== id && Number(state?.scores?.[p.id] || 0) > score && Number(state?.scores?.[p.id] || 0) - score <= 180);
    return canGotcha ? "PIÈGE GOTCHA" : "SCORING";
  }
  if (mode === "hare_hounds") return String(state?.harePlayerId) === id ? "FUITE MAXIMALE" : "POURSUITE DU LIÈVRE";
  if (mode === "pendu") {
    const errors = Number(state?.errors?.[id] || 0), limit = Number(state?.config?.rules?.partsToLose || 6);
    if (errors >= limit - 1) return "SURVIE — ZÉRO ERREUR";
    return state?.phase === "round" ? "SURVIVRE À L’OBJECTIF" : state?.phase === "caller" ? "POSER LE DÉFI" : "REPRODUIRE LE DÉFI";
  }
  if (mode === "menteur") {
    if (state?.phase === "challenge") return "PROUVER L'ANNONCE";
    const bid = Number(state?.bid || 0);
    if (bid >= 140) return "DÉTECTER LE BLUFF";
    if (bid >= 90) return "METTRE LA PRESSION";
    return "CONSTRUIRE L'ENCHÈRE";
  }
  return "ANALYSE";
}
