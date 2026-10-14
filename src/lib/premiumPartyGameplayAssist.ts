// @ts-nocheck
// =============================================================
// PREMIUM PARTY GAMEPLAY ASSIST V16
// Aide cible / routes / plans de jeu lisibles pendant la volée.
// =============================================================

import type { GameDart } from "./types-game";

export type AimAssistPlan = {
  icon?: string;
  kicker?: string;
  title: string;
  detail?: string;
  targets?: string[];
  tone?: "normal" | "success" | "danger" | "gold";
};

type ScoreRouteOptions = {
  maxDarts?: number;
  outMode?: "straight" | "double" | "master";
};

const SCORE_DARTS: Array<GameDart & { score: number; label: string }> = (() => {
  const out: Array<GameDart & { score: number; label: string }> = [];
  out.push({ bed: "IB", score: 50, label: "DBULL" });
  for (let n = 20; n >= 1; n--) out.push({ bed: "T", number: n, score: n * 3, label: `T${n}` });
  for (let n = 20; n >= 1; n--) out.push({ bed: "D", number: n, score: n * 2, label: `D${n}` });
  out.push({ bed: "OB", score: 25, label: "BULL" });
  for (let n = 20; n >= 1; n--) out.push({ bed: "S", number: n, score: n, label: `S${n}` });
  return out;
})();

export function gameplayDartScore(d: GameDart | null | undefined) {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "IB") return 50;
  if (d.bed === "OB") return 25;
  const n = Number(d.number || 0);
  return d.bed === "T" ? n * 3 : d.bed === "D" ? n * 2 : n;
}

export function gameplayDartLabel(d: GameDart | null | undefined) {
  if (!d || d.bed === "MISS") return "MISS";
  if (d.bed === "IB") return "DBULL";
  if (d.bed === "OB") return "BULL";
  return `${d.bed}${d.number || ""}`;
}

function isOutDart(d: GameDart, outMode: ScoreRouteOptions["outMode"]) {
  if (outMode === "double") return d.bed === "D" || d.bed === "IB";
  if (outMode === "master") return d.bed === "D" || d.bed === "T" || d.bed === "IB";
  return true;
}

const exactCache = new Map<string, GameDart[] | null>();

export function suggestExactScoreRoute(pointsRaw: number, options: ScoreRouteOptions = {}): GameDart[] | null {
  const points = Math.max(0, Math.round(Number(pointsRaw || 0)));
  const maxDarts = Math.max(1, Math.min(3, Number(options.maxDarts || 3)));
  const outMode = options.outMode || "straight";
  if (points === 0) return [];
  if (points > maxDarts * 60) return null;
  const key = `${points}|${maxDarts}|${outMode}`;
  if (exactCache.has(key)) return exactCache.get(key) || null;

  const list = SCORE_DARTS;
  const tryRoute = (slots: number): GameDart[] | null => {
    const route: GameDart[] = [];
    let found: GameDart[] | null = null;
    const walk = (depth: number, remaining: number) => {
      if (found) return;
      if (depth === slots) {
        if (remaining === 0 && route.length && isOutDart(route[route.length - 1], outMode)) found = route.map((d) => ({ ...d }));
        return;
      }
      const left = slots - depth;
      if (remaining < left || remaining > left * 60) return;
      for (const d of list) {
        if (d.score > remaining) continue;
        if (depth === slots - 1 && !isOutDart(d, outMode)) continue;
        route.push({ bed: d.bed, number: d.number });
        walk(depth + 1, remaining - d.score);
        route.pop();
        if (found) return;
      }
    };
    walk(0, points);
    return found;
  };

  let result: GameDart[] | null = null;
  for (let slots = 1; slots <= maxDarts; slots++) {
    result = tryRoute(slots);
    if (result) break;
  }
  exactCache.set(key, result ? result.map((d) => ({ ...d })) : null);
  return result;
}

function conditionSatisfied(condition: string, darts: GameDart[]) {
  const hits = darts.filter((d) => d && d.bed !== "MISS");
  if (condition === "double") return hits.some((d) => d.bed === "D" || d.bed === "IB");
  if (condition === "triple") return hits.some((d) => d.bed === "T");
  if (condition === "bull") return hits.some((d) => d.bed === "OB" || d.bed === "IB");
  if (condition === "distinct") {
    const vals = hits.map((d) => d.bed === "OB" || d.bed === "IB" ? 25 : Number(d.number || 0)).filter(Boolean);
    return new Set(vals).size >= 3;
  }
  return true;
}

const proofCache = new Map<string, GameDart[] | null>();

export function suggestAtLeastScoreRoute(
  minimumRaw: number,
  options: { maxDarts?: number; condition?: "none" | "double" | "triple" | "bull" | "distinct"; existing?: GameDart[] } = {},
): GameDart[] | null {
  const minimum = Math.max(0, Math.round(Number(minimumRaw || 0)));
  const maxDarts = Math.max(0, Math.min(3, Number(options.maxDarts ?? 3)));
  const condition = options.condition || "none";
  const existing = Array.isArray(options.existing) ? options.existing.map((d) => ({ ...d })) : [];
  const existingScore = existing.reduce((a, d) => a + gameplayDartScore(d), 0);
  if (existingScore >= minimum && conditionSatisfied(condition, existing)) return [];
  if (maxDarts <= 0) return null;

  const existingKey = existing.map(gameplayDartLabel).join(",");
  const key = `${minimum}|${maxDarts}|${condition}|${existingKey}`;
  if (proofCache.has(key)) return proofCache.get(key) || null;

  let best: GameDart[] | null = null;
  let bestOver = Number.POSITIVE_INFINITY;
  let bestScore = -1;
  const route: GameDart[] = [];

  const walk = (depth: number, score: number) => {
    if (depth === maxDarts) {
      const combined = [...existing, ...route];
      const total = score + existingScore;
      if (total < minimum || !conditionSatisfied(condition, combined)) return;
      const over = total - minimum;
      if (over < bestOver || (over === bestOver && total > bestScore)) {
        bestOver = over;
        bestScore = total;
        best = route.map((d) => ({ ...d }));
      }
      return;
    }
    for (const d of SCORE_DARTS) {
      route.push({ bed: d.bed, number: d.number });
      walk(depth + 1, score + d.score);
      route.pop();
      if (bestOver === 0 && best && depth === 0) {
        // Exact threshold found. Keep scanning only when distinct condition may need a better structure.
        if (condition !== "distinct") return;
      }
    }
  };

  walk(0, 0);
  proofCache.set(key, best ? best.map((d) => ({ ...d })) : null);
  return best;
}

export function routeLabels(route: GameDart[] | null | undefined) {
  return (route || []).map(gameplayDartLabel);
}

export function castleAimAssist(state: any, activeId: string): AimAssistPlan {
  if (!state || !activeId) return { icon: "🏰", title: "CHOISIS TON FIEF", detail: "Un secteur libre entre 1 et 20." };
  if (state.phase === "assignment") {
    return { icon: "🎯", kicker: "CIBLE CONSEILLÉE", title: "TOUCHE UN SECTEUR LIBRE", detail: "MISS et BULL ne comptent pas.", targets: ["S1–S20"] };
  }
  const target = Number(state.config?.rules?.targetBricks || 15);
  const ownSector = Number(state.targets?.[activeId] || 20);
  const own = Number(state.bricks?.[activeId] || 0);
  const rivals = (state.players || []).filter((p: any) => String(p.id) !== String(activeId))
    .sort((a: any, b: any) => Number(state.bricks?.[b.id] || 0) - Number(state.bricks?.[a.id] || 0));
  const leader = rivals[0];
  const leaderBricks = Number(state.bricks?.[leader?.id] || 0);
  const leaderSector = Number(state.targets?.[leader?.id] || 0);
  const attack = !!state.config?.rules?.attacksEnabled && !!leader && leaderSector > 0 && (leaderBricks >= target - 3 || leaderBricks >= own + 3);

  if (attack) {
    return {
      icon: "⚔️", kicker: "PLAN DE VOLÉE", title: `STOPPE ${leader.name}`,
      detail: `${leaderBricks}/${target} briques. Son secteur ${leaderSector} détruit ses briques.`,
      targets: [`T${leaderSector} −3`, `D${leaderSector} −2`, `S${leaderSector} −1`],
      tone: "danger",
    };
  }
  const missing = Math.max(0, target - own);
  const mult = missing >= 3 ? "T" : missing === 2 ? "D" : "S";
  return {
    icon: "🏰", kicker: "PLAN DE VOLÉE", title: missing <= 3 ? "FERME TON CHÂTEAU" : "CONSTRUIS TON FIEF",
    detail: `${own}/${target} briques · secteur personnel ${ownSector}.`,
    targets: [`${mult}${ownSector}`, `D${ownSector}`, `S${ownSector}`].filter((v, i, a) => a.indexOf(v) === i),
    tone: missing <= 3 ? "gold" : "normal",
  };
}

export function gotchaAimAssist(state: any, activeId: string, currentDarts: GameDart[] = []): AimAssistPlan {
  const target = Number(state?.config?.rules?.targetScore || 301);
  const base = Number(state?.scores?.[activeId] || 0);
  const provisional = currentDarts.reduce((a, d) => a + gameplayDartScore(d), 0);
  const projected = base + provisional;
  const slots = Math.max(0, 3 - currentDarts.length);

  if (projected > target) return { icon: "💥", kicker: "AIDE CIBLE", title: "BUST EN COURS", detail: `${projected} dépasse ${target}. Corrige la volée avant validation.`, tone: "danger" };

  const exactVictim = (state?.players || []).find((p: any) => String(p.id) !== String(activeId) && Number(state?.scores?.[p.id] || 0) > 0 && Number(state?.scores?.[p.id] || 0) === projected);
  if (exactVictim) return { icon:"🎯", kicker:"GOTCHA PRÊT", title:`VALIDE : ${exactVictim.name} REPART À ZÉRO`, detail:`Ton score projeté est exactement ${projected}.`, targets:["VALIDER"], tone:"success" };
  if (projected === target) return { icon:"🏁", kicker:"FINISH PRÊT", title:"CIBLE ATTEINTE", detail:`${target} atteint. Valide la volée.`, targets:["VALIDER"], tone:"success" };

  const rivals = (state?.players || []).filter((p: any) => String(p.id) !== String(activeId))
    .map((p: any) => ({ p, score: Number(state?.scores?.[p.id] || 0) }))
    .filter((x: any) => x.score > projected && x.score < target)
    .sort((a: any, b: any) => b.score - a.score);

  for (const r of rivals) {
    const delta = r.score - projected;
    const route = suggestExactScoreRoute(delta, { maxDarts: slots, outMode: "straight" });
    if (route) {
      return {
        icon: "🎯", kicker: "GOTCHA DISPONIBLE", title: `REMETS ${r.p.name} À ZÉRO`,
        detail: `${projected} → ${r.score} exactement.`,
        targets: routeLabels(route),
        tone: "success",
      };
    }
  }

  const remaining = target - projected;
  const route = suggestExactScoreRoute(remaining, { maxDarts: slots, outMode: state?.config?.rules?.outMode || "straight" });
  if (route) {
    return { icon: "🏁", kicker: "ROUTE DE FINISH", title: `FERME ${remaining}`, detail: `Sortie ${String(state?.config?.rules?.outMode || "straight").toUpperCase()}.`, targets: routeLabels(route), tone: "gold" };
  }

  return {
    icon: "⚡", kicker: "AIDE CIBLE", title: "CONSTRUIS SANS BUST",
    detail: `${remaining} point(s) avant ${target}.`,
    targets: slots > 0 ? Array.from({ length: Math.min(3, slots) }, () => "T20") : [],
  };
}

export function hareAimAssist(state: any, activeId: string, currentDarts: GameDart[] = []): AimAssistPlan {
  if (!state || !activeId) return { icon: "🏃", title: "SUIS LA PISTE" };
  const seq = state.config?.rules?.direction === "counter"
    ? [20,5,12,9,14,11,8,16,7,19,3,17,2,15,10,6,13,4,18,1]
    : [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
  const targetZone = state.config?.rules?.targetZone || "any";
  const role = String(state.harePlayerId) === String(activeId) ? "hare" : "hound";
  const progress = Number(state.progressByPlayer?.[activeId] || 0);
  const startIndex = Number(state.startIndexByPlayer?.[activeId] || 0);
  let projectedProgress = progress;

  for (const d of currentDarts) {
    const sector = seq[(startIndex + projectedProgress) % 20];
    const zoneOk = targetZone === "double" ? d.bed === "D" : targetZone === "triple" ? d.bed === "T" : ["S","D","T"].includes(String(d.bed));
    if (zoneOk && Number(d.number || 0) === sector) projectedProgress += 1;
  }

  const bed = targetZone === "double" ? "D" : targetZone === "triple" ? "T" : "";
  const next = Array.from({ length: 3 }, (_, i) => seq[(startIndex + projectedProgress + i) % 20]);
  return {
    icon: role === "hare" ? "🐇" : "🐕",
    kicker: "PROCHAINES CIBLES",
    title: role === "hare" ? "GARDE TON AVANCE" : "RÉDUIS L’ÉCART",
    detail: targetZone === "any" ? "Simple, Double ou Triple : seul le secteur doit être juste." : `Seuls les ${targetZone === "double" ? "Doubles" : "Triples"} comptent.`,
    targets: next.map((n) => `${bed}${n || ""}` || String(n)),
    tone: role === "hare" && projectedProgress >= 17 ? "gold" : "normal",
  };
}

export function penduAimAssist(challenge: any, currentDarts: GameDart[] = [], executionMode = "flex", maxDarts = 3, penalty: any = null): AimAssistPlan {
  const slots = Math.max(0, Number(maxDarts || 3) - currentDarts.length);
  const score = currentDarts.reduce((a, d) => a + gameplayDartScore(d), 0);
  if (!challenge) return { icon: "🪢", title: "ATTENDS L’OBJECTIF" };
  const curse = penalty?.curse || null;
  const curseTarget = (() => {
    if (!curse) return null;
    if (curse.id === "require_double") return "D20";
    if (curse.id === "require_triple") return "T20";
    if (curse.id === "require_top") return "T20";
    if (curse.id === "require_bottom") return "T3";
    if (curse.id === "color_red") return "T20";
    if (curse.id === "color_green") return "T19";
    if (curse.id === "color_black") return "S20";
    if (curse.id === "color_white") return "S1";
    if (curse.id === "ban_20") return "🚫20";
    if (curse.id === "ban_bull") return "🚫BULL";
    if (curse.id === "ban_left") return "➡️ DROITE";
    if (curse.id === "ban_right") return "⬅️ GAUCHE";
    if (curse.id === "two_hits") return "2 TOUCHES";
    if (curse.id === "cursed_sector") return `🚫${curse.forbiddenSector || "?"}`;
    if (curse.id === "sudden_death") return "💣 ZÉRO ERREUR";
    return null;
  })();
  const withCurse = (plan: AimAssistPlan): AimAssistPlan => {
    if (!curse || !curseTarget) return plan;
    const targets = [curseTarget, ...(plan.targets || [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    return { ...plan, kicker: "OBJECTIF + MALÉDICTION", detail: `${curse.label} : ${curse.detail}${plan.detail ? ` · ${plan.detail}` : ""}`, targets };
  };

  if (challenge.kind === "score") {
    const remaining = Math.max(0, Number(challenge.target || 0) - score);
    const route = executionMode === "strict"
      ? suggestExactScoreRoute(remaining, { maxDarts: slots, outMode: "straight" })
      : suggestAtLeastScoreRoute(Number(challenge.target || 0), { maxDarts: slots, existing: currentDarts });
    return withCurse({
      icon: "🔢", kicker: "AIDE OBJECTIF", title: executionMode === "strict" ? `FAIS EXACTEMENT ${challenge.target}` : `ATTEINS ${challenge.target}`,
      detail: score ? `${score} déjà marqué · ${remaining} restant(s).` : "Une route possible :",
      targets: routeLabels(route),
      tone: remaining <= 60 ? "gold" : "normal",
    });
  }
  if (challenge.kind === "segment") return withCurse({ icon: "🎯", kicker: "AIDE OBJECTIF", title: `VISE ${challenge.bed}${challenge.number}`, detail: "Une seule touche valide suffit.", targets: [`${challenge.bed}${challenge.number}`] });
  if (challenge.kind === "bed") {
    const target = challenge.bed === "D" ? "D20" : challenge.bed === "T" ? "T20" : "DBULL";
    return withCurse({ icon: challenge.bed === "BULL" ? "🎯" : challenge.bed === "T" ? "⚡" : "⭕", kicker: "AIDE OBJECTIF", title: challenge.bed === "D" ? "TOUCHE UN DOUBLE" : challenge.bed === "T" ? "TOUCHE UN TRIPLE" : "TOUCHE LE BULL", targets: [target] });
  }
  if (challenge.kind === "parity") return withCurse({ icon: challenge.parity === "even" ? "2️⃣" : "1️⃣", kicker: "AIDE OBJECTIF", title: challenge.parity === "even" ? "TOUCHE UN SECTEUR PAIR" : "TOUCHE UN SECTEUR IMPAIR", targets: [challenge.parity === "even" ? "T20" : "T19"] });
  if (challenge.kind === "color") {
    const map:any = { red:"T20", green:"T19", black:"S20", white:"S1" };
    return withCurse({ icon: challenge.color === "red" ? "🔴" : challenge.color === "green" ? "🟢" : challenge.color === "black" ? "⚫" : "⚪", kicker: "AIDE OBJECTIF", title: `TOUCHE LE ${String(challenge.color).toUpperCase()}`, targets: [map[challenge.color] || "S20"] });
  }
  if (challenge.kind === "zone") {
    const map:any = { left:"T11", right:"T6", top:"T20", bottom:"T3" };
    return withCurse({ icon: challenge.zone === "left" ? "⬅️" : challenge.zone === "right" ? "➡️" : challenge.zone === "top" ? "⬆️" : "⬇️", kicker: "AIDE OBJECTIF", title: `ZONE ${String(challenge.zone).toUpperCase()}`, targets: [map[challenge.zone] || "T20"] });
  }
  if (challenge.kind === "range") return withCurse({ icon: challenge.range === "low" ? "🔽" : "🔼", kicker: "AIDE OBJECTIF", title: challenge.range === "low" ? "SECTEUR 1 À 10" : "SECTEUR 11 À 20", targets: [challenge.range === "low" ? "T10" : "T20"] });
  return withCurse({ icon: "🎯", title: "RÉUSSIS L’OBJECTIF" });
}

export function menteurProofAimAssist(bid: number, condition: string, currentDarts: GameDart[] = []): AimAssistPlan {
  const score = currentDarts.reduce((a, d) => a + gameplayDartScore(d), 0);
  const slots = Math.max(0, 3 - currentDarts.length);
  const route = suggestAtLeastScoreRoute(Number(bid || 0), { maxDarts: slots, condition: condition as any, existing: currentDarts });
  const missing = Math.max(0, Number(bid || 0) - score);
  return {
    icon: "🎯",
    kicker: "ROUTE DE PREUVE",
    title: route ? `PROUVE ${bid}` : "CONTRAT TRÈS DIFFICILE",
    detail: `${score}/${bid} · condition ${String(condition || "none").toUpperCase()} · ${slots} dart(s) restant(s).`,
    targets: routeLabels(route),
    tone: missing <= 60 ? "gold" : route ? "normal" : "danger",
  };
}

export function menteurAuctionAssist(bid: number, condition: string, minBid: number, lives: number, maxLives: number): AimAssistPlan {
  const conditionPenalty = condition === "distinct" ? 18 : condition === "bull" ? 22 : condition === "double" || condition === "triple" ? 12 : 0;
  const pressure = Math.max(0, Math.min(100, Math.round(((Number(bid || 0) + conditionPenalty) / 180) * 100)));
  const danger = Number(lives || 0) <= 1;
  if (Number(bid || 0) >= 150 || pressure >= 86) {
    return { icon: "🤥", kicker: "LECTURE DE TABLE", title: danger ? "APPELLE MENTEUR SI TU DOUTES" : "ZONE DE BLUFF", detail: `${pressure}% de pression. Une nouvelle surenchère devient très risquée.`, targets: [`MIN ${minBid}`, "MENTEUR !"], tone: "danger" };
  }
  if (pressure >= 62) return { icon: "🧠", kicker: "LECTURE DE TABLE", title: "ENCHÈRE TENDUE", detail: "Compare la condition et les vies avant de surenchérir.", targets: [`+${Math.max(0,minBid-bid)}`, "MENTEUR !"], tone: "gold" };
  return { icon: "📣", kicker: "LECTURE DE TABLE", title: "ENCHÈRE ENCORE CRÉDIBLE", detail: "Tu peux monter progressivement sans brûler tes vies.", targets: [`MIN ${minBid}`, `PRESSION ${Math.min(180,minBid+20)}`] };
}
