// @ts-nocheck
// =============================================================
// PREMIUM PARTY BOT MEMORY V10
// Mémoire intra-match + adaptation à l'adversaire.
// La mémoire est reconstruite depuis state.statsByPlayer + state.visits :
// elle survit donc naturellement à une reprise de partie.
// =============================================================

import type { PremiumBotBrain, PremiumPartyModeKey } from "./premiumPartyBotAI";

export type PremiumOpponentModel = {
  targetId: string;
  targetName: string;
  patternKey: string;
  label: string;
  icon: string;
  detail: string;
  sampleSize: number;
  confidence: number;
};

export type PremiumBotAdaptiveResult = {
  brain: PremiumBotBrain;
  model: PremiumOpponentModel | null;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number(v || 0)));
}
function clampSigned(v: number) {
  return Math.max(-.45, Math.min(.45, Number(v || 0)));
}
function idsToSet(value: any): Set<string> {
  if (value instanceof Set) return new Set([...value].map(String));
  if (Array.isArray(value)) return new Set(value.map(String));
  return new Set();
}
function statsFor(state: any, id: string) {
  return state?.statsByPlayer?.[id] || {};
}
function visitsFor(state: any, id: string) {
  return (Array.isArray(state?.visits) ? state.visits : []).filter((v: any) => String(v?.playerId || "") === String(id));
}
function strengthFromSamples(samples: number) {
  // Pas de sur-réaction après une seule volée.
  if (samples <= 1) return 0;
  return Math.max(.18, Math.min(1, (samples - 1) / 7));
}
function memoryConfidence(samples: number) {
  if (samples <= 0) return 0;
  return Math.min(96, 24 + samples * 10);
}
function humanOpponents(state: any, player: any, botIds: any) {
  const bots = idsToSet(botIds);
  const me = String(player?.id || "");
  const players = Array.isArray(state?.players) ? state.players : [];
  const humans = players.filter((p: any) => String(p?.id || "") !== me && !bots.has(String(p?.id || "")));
  return humans;
}
function baseClone(brain: PremiumBotBrain): PremiumBotBrain {
  return { ...brain };
}
function applyBrain(
  brain: PremiumBotBrain,
  strength: number,
  adjust: Partial<Record<"precision"|"risk"|"aggression"|"patience"|"composure"|"attackBias"|"gotchaBias"|"bluffBias"|"callBias", number>>,
): PremiumBotBrain {
  const next: any = { ...brain };
  for (const [key, delta] of Object.entries(adjust)) {
    const current = Number((next as any)[key] || 0);
    const raw = current + Number(delta || 0) * strength;
    if (["attackBias", "gotchaBias", "bluffBias", "callBias"].includes(key)) next[key] = clampSigned(raw);
    else next[key] = clamp01(raw);
  }
  next.confidence = Math.max(1, Math.min(99, Math.round(Number(next.precision || brain.precision) * 100)));
  return next;
}

function castleModel(state: any, p: any) {
  const id = String(p.id), st = statsFor(state, id), visits = visitsFor(state, id);
  const sample = Math.max(n(st.visits), visits.length);
  const builds = n(st.builds) || n(st.buildHits);
  const damage = n(st.damage) || n(st.attackHits);
  const bricks = n(state?.bricks?.[id]);
  const target = Math.max(1, n(state?.config?.rules?.targetBricks) || 15);
  const pressure = bricks / target + damage * .08 + builds * .025;
  let patternKey = "balanced", label = "POLYVALENT", icon = "⚖️";
  let detail = `${builds} construction(s) · ${damage} dégât(s).`;
  if (damage >= Math.max(2, builds * .72)) {
    patternKey = "attacker"; label = "AGRESSEUR"; icon = "⚔️";
    detail = `Attaque souvent : ${damage} dégât(s) infligé(s).`;
  } else if (builds >= Math.max(3, damage * 1.55)) {
    patternKey = "builder"; label = "BÂTISSEUR"; icon = "🧱";
    detail = `Privilégie sa construction : ${builds} brique(s)/impact(s) de build.`;
  } else if (bricks >= target - 3) {
    patternKey = "leader"; label = "LEADER À FERMER"; icon = "👑";
    detail = `${bricks}/${target} briques : il approche de la fermeture.`;
  }
  return { p, sample, pressure, patternKey, label, icon, detail };
}

function gotchaModel(state: any, p: any) {
  const id = String(p.id), st = statsFor(state, id), visits = visitsFor(state, id);
  const sample = Math.max(n(st.visits), visits.length);
  const gotchas = n(st.gotchas), busts = n(st.busts), score = n(state?.scores?.[id]);
  const bustRate = sample ? busts / sample : 0;
  const target = Math.max(1, n(state?.config?.rules?.targetScore) || 301);
  const pressure = score / target + gotchas * .14 + Math.max(0, .2 - bustRate) * .2;
  let patternKey = "scorer", label = "SCORER", icon = "📈";
  let detail = `${score}/${target} points · ${gotchas} GOTCHA.`;
  if (gotchas >= 2 || gotchas / Math.max(1, sample) >= .25) {
    patternKey = "trapper"; label = "PIÉGEUR GOTCHA"; icon = "🪤";
    detail = `${gotchas} GOTCHA : il cherche activement les remises à zéro.`;
  } else if (bustRate >= .28) {
    patternKey = "bust_prone"; label = "PRENEUR DE RISQUES"; icon = "💥";
    detail = `${busts} BUST sur ${sample} visite(s) : variance élevée.`;
  } else if (score >= target * .72) {
    patternKey = "finisher"; label = "FINISHEUR EN APPROCHE"; icon = "🎯";
    detail = `${target - score} point(s) avant sa cible.`;
  }
  return { p, sample, pressure, patternKey, label, icon, detail };
}

function hareModel(state: any, p: any) {
  const id = String(p.id), st = statsFor(state, id), visits = visitsFor(state, id);
  const sample = Math.max(n(st.visits), visits.length);
  const darts = Math.max(1, n(st.darts));
  const acc = n(st.validHits) / darts;
  const progress = n(state?.progressByPlayer?.[id]);
  const catches = n(st.catches), escapes = n(st.escapes);
  const pressure = progress / 20 + acc * .65 + (catches + escapes) * .12;
  let patternKey = "steady_runner", label = "COUREUR RÉGULIER", icon = "🏃";
  let detail = `${Math.round(acc * 100)}% de touches valides · ${progress} étape(s).`;
  if (acc >= .74 && sample >= 2) {
    patternKey = "sprinter"; label = "SPRINTER"; icon = "⚡";
    detail = `${Math.round(acc * 100)}% de réussite : cadence élevée.`;
  } else if (acc <= .46 && n(st.darts) >= 6) {
    patternKey = "erratic"; label = "IRRÉGULIER"; icon = "🌪️";
    detail = `${Math.round(acc * 100)}% de réussite : il laisse des ouvertures.`;
  } else if (catches + escapes >= 2) {
    patternKey = "closer"; label = "FINISHEUR"; icon = "🏁";
    detail = `${catches} capture(s) · ${escapes} évasion(s).`;
  }
  return { p, sample, pressure, patternKey, label, icon, detail };
}

function penduModel(state: any, p: any) {
  const id = String(p.id), st = statsFor(state, id), visits = visitsFor(state, id);
  const sample = Math.max(n(st.visits), visits.length);
  const pass = n(st.challengesPassed), fail = n(st.challengesFailed);
  const attempts = Math.max(1, pass + fail);
  const passRate = pass / attempts;
  const errors = n(state?.errors?.[id]) || n(st.errorsTaken);
  const maxErrors = Math.max(1, n(state?.config?.rules?.partsToLose) || 6);
  const pressure = passRate * .7 + (1 - errors / maxErrors) * .35 + n(st.callerSuccesses) * .06;
  let patternKey = "average_copy", label = "COPIE STANDARD", icon = "📋";
  let detail = `${Math.round(passRate * 100)}% de défis réussis · ${errors}/${maxErrors} erreur(s).`;
  if (passRate >= .72 && attempts >= 3) {
    patternKey = "strong_copy"; label = "COPIEUR SOLIDE"; icon = "🪞";
    detail = `${Math.round(passRate * 100)}% de réussite : il faut hausser la pression.`;
  } else if (errors >= maxErrors - 2) {
    patternKey = "fragile"; label = "SOUS PRESSION"; icon = "🧨";
    detail = `${errors}/${maxErrors} erreur(s) : l'élimination approche.`;
  } else if (n(st.callerSuccesses) >= 2) {
    patternKey = "strong_caller"; label = "MENEUR FORT"; icon = "📣";
    detail = `${n(st.callerSuccesses)} défi(s) réussis comme meneur.`;
  }
  return { p, sample, pressure, patternKey, label, icon, detail };
}

function menteurModel(state: any, p: any) {
  const id = String(p.id), st = statsFor(state, id), visits = visitsFor(state, id);
  const sample = Math.max(n(st.visits), visits.length);
  const calls = n(st.liarCalls), successful = n(st.successfulCalls), raises = n(st.raises), maxBid = n(st.maxBid);
  const proofs = n(st.contractsProven), proofAttempts = Math.max(1, n(st.contractsAttempted));
  const callRate = calls / Math.max(1, sample);
  const callSuccess = calls ? successful / calls : 0;
  const raiseRate = raises / Math.max(1, sample);
  const proofRate = proofs / proofAttempts;
  const pressure = maxBid / 180 + raiseRate * .12 + callSuccess * .35 + proofRate * .2;
  let patternKey = "balanced_bluff", label = "JOUEUR ÉQUILIBRÉ", icon = "🎭";
  let detail = `${raises} enchère(s) · ${calls} appel(s) MENTEUR.`;
  if (calls >= 2 && callSuccess >= .6) {
    patternKey = "bluff_detector"; label = "DÉTECTEUR DE BLUFF"; icon = "🕵️";
    detail = `${Math.round(callSuccess * 100)}% d'appels MENTEUR gagnants.`;
  } else if (maxBid >= 135 || raiseRate >= 1.35) {
    patternKey = "raiser"; label = "SURENCHÉRISSEUR"; icon = "📢";
    detail = `Monte haut : enchère max ${maxBid || "—"}.`;
  } else if (proofs >= 2 && proofRate >= .65) {
    patternKey = "prover"; label = "PREUVE SOLIDE"; icon = "🛡️";
    detail = `${Math.round(proofRate * 100)}% de contrats prouvés.`;
  } else if (callRate <= .16 && sample >= 4) {
    patternKey = "passive_caller"; label = "APPEL PRUDENT"; icon = "🤐";
    detail = "Appelle rarement MENTEUR : davantage de place pour la pression.";
  }
  return { p, sample, pressure, patternKey, label, icon, detail };
}

function selectModel(mode: PremiumPartyModeKey, state: any, humans: any[]) {
  const factory =
    mode === "castle" ? castleModel :
    mode === "gotcha" ? gotchaModel :
    mode === "hare_hounds" ? hareModel :
    mode === "pendu" ? penduModel :
    menteurModel;
  return humans
    .map((p: any) => factory(state, p))
    .sort((a: any, b: any) => (b.pressure + b.sample * .025) - (a.pressure + a.sample * .025))[0] || null;
}

function adjustmentsFor(mode: PremiumPartyModeKey, patternKey: string) {
  if (mode === "castle") {
    if (patternKey === "attacker") return { composure: .07, patience: .04, risk: -.05, attackBias: .05 };
    if (patternKey === "builder") return { attackBias: .20, aggression: .09, risk: .03 };
    if (patternKey === "leader") return { attackBias: .24, aggression: .12 };
    return { composure: .02, attackBias: .04 };
  }
  if (mode === "gotcha") {
    if (patternKey === "trapper") return { composure: .07, precision: .03, gotchaBias: .05, risk: -.04 };
    if (patternKey === "bust_prone") return { patience: .08, precision: .02, risk: -.05 };
    if (patternKey === "finisher") return { gotchaBias: .22, aggression: .08 };
    return { gotchaBias: .10, precision: .015 };
  }
  if (mode === "hare_hounds") {
    if (patternKey === "sprinter") return { precision: .04, aggression: .08, risk: .05, composure: .04 };
    if (patternKey === "erratic") return { patience: .08, risk: -.08, precision: .015 };
    if (patternKey === "closer") return { composure: .06, precision: .03 };
    return { precision: .015, patience: .02 };
  }
  if (mode === "pendu") {
    if (patternKey === "strong_copy") return { precision: .04, risk: .07, aggression: .05, composure: .04 };
    if (patternKey === "fragile") return { patience: .07, risk: -.04, precision: .02 };
    if (patternKey === "strong_caller") return { composure: .07, precision: .035 };
    return { precision: .015 };
  }
  if (patternKey === "bluff_detector") return { bluffBias: -.24, risk: -.09, patience: .09, composure: .07 };
  if (patternKey === "raiser") return { callBias: .22, patience: .06, bluffBias: -.05 };
  if (patternKey === "prover") return { callBias: -.13, precision: .025, patience: .05 };
  if (patternKey === "passive_caller") return { bluffBias: .19, risk: .08, aggression: .06 };
  return { callBias: .04, patience: .02 };
}

export function adaptPremiumBotBrain(
  mode: PremiumPartyModeKey,
  state: any,
  player: any,
  baseBrain: PremiumBotBrain,
  botIds?: Set<string> | string[],
): PremiumBotAdaptiveResult {
  const humans = humanOpponents(state, player, botIds);
  if (!player || !humans.length) return { brain: baseClone(baseBrain), model: null };

  const raw = selectModel(mode, state, humans);
  if (!raw) return { brain: baseClone(baseBrain), model: null };

  const sampleSize = Math.max(0, Number(raw.sample || 0));
  const strength = strengthFromSamples(sampleSize);
  const brain = strength > 0
    ? applyBrain(baseBrain, strength, adjustmentsFor(mode, raw.patternKey))
    : baseClone(baseBrain);

  const targetName = String(raw?.p?.name || "Adversaire");
  const model: PremiumOpponentModel = {
    targetId: String(raw?.p?.id || ""),
    targetName,
    patternKey: raw.patternKey,
    label: sampleSize <= 1 ? "OBSERVATION" : raw.label,
    icon: sampleSize <= 1 ? "👁️" : raw.icon,
    detail: sampleSize <= 1
      ? `${targetName} : l'IA collecte encore des données de jeu.`
      : raw.detail,
    sampleSize,
    confidence: memoryConfidence(sampleSize),
  };
  return { brain, model };
}
