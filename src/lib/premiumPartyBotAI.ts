// @ts-nocheck
// =============================================================
// PREMIUM PARTY BOT AI V9
// Personnalités stables + niveau réel + plan tactique partagé
// CASTLE / GOTCHA / HARE & HOUNDS / PENDU / MENTEUR.
// =============================================================

export type PremiumPartyModeKey = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur";
export type PremiumBotPersonaKey = "aggressive" | "tactician" | "sniper" | "steady" | "trickster";

export type PremiumBotBrain = {
  key: PremiumBotPersonaKey;
  label: string;
  icon: string;
  description: string;
  precision: number;
  confidence: number;
  risk: number;
  aggression: number;
  patience: number;
  composure: number;
  attackBias: number;
  gotchaBias: number;
  bluffBias: number;
  callBias: number;
  sourceStyle?: string | null;
};

export type PremiumBotPlan = {
  intent: string;
  detail: string;
  reaction?: string;
  persona: string;
  personaIcon: string;
  confidence: number;
};

const PRESETS: Record<PremiumBotPersonaKey, Omit<PremiumBotBrain, "precision" | "confidence" | "sourceStyle"> & { precisionDelta: number }> = {
  aggressive: {
    key: "aggressive",
    label: "ATTAQUANT",
    icon: "🔥",
    description: "Joue vite, cherche les gros coups et accepte davantage de risque.",
    precisionDelta: -0.015,
    risk: .86,
    aggression: .92,
    patience: .28,
    composure: .54,
    attackBias: .26,
    gotchaBias: .12,
    bluffBias: .18,
    callBias: -.04,
  },
  tactician: {
    key: "tactician",
    label: "TACTICIEN",
    icon: "🧠",
    description: "Observe le classement et privilégie les actions à forte valeur tactique.",
    precisionDelta: .015,
    risk: .54,
    aggression: .58,
    patience: .74,
    composure: .76,
    attackBias: .12,
    gotchaBias: .24,
    bluffBias: .04,
    callBias: .16,
  },
  sniper: {
    key: "sniper",
    label: "SNIPER",
    icon: "🎯",
    description: "Privilégie la précision, les finishes et les contrats propres.",
    precisionDelta: .055,
    risk: .46,
    aggression: .44,
    patience: .70,
    composure: .86,
    attackBias: .02,
    gotchaBias: .08,
    bluffBias: -.12,
    callBias: .08,
  },
  steady: {
    key: "steady",
    label: "RÉGULIER",
    icon: "🧊",
    description: "Réduit la variance et garde un plan stable sous pression.",
    precisionDelta: .035,
    risk: .30,
    aggression: .34,
    patience: .88,
    composure: .94,
    attackBias: -.08,
    gotchaBias: -.05,
    bluffBias: -.18,
    callBias: .10,
  },
  trickster: {
    key: "trickster",
    label: "BLUFFEUR",
    icon: "🃏",
    description: "Imprévisible : cherche les pièges, le bluff et les retournements.",
    precisionDelta: -.025,
    risk: .76,
    aggression: .68,
    patience: .42,
    composure: .62,
    attackBias: .18,
    gotchaBias: .30,
    bluffBias: .34,
    callBias: .12,
  },
};

function clamp01(v: number) { return Math.max(0, Math.min(1, Number(v || 0))); }
function hashString(value: any) {
  const s = String(value ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}
function profileKey(profile: any) {
  return String(profile?.id || profile?.profileId || profile?.playerId || profile?.avatarKey || profile?.displayName || profile?.name || "bot");
}
function personaFromStyle(profile: any): PremiumBotPersonaKey | null {
  const raw = String(profile?.premiumPersona || profile?.personality || profile?.style || profile?.playStyle || "").toLowerCase();
  if (["aggressive", "attaquant", "power_scorer", "power scorer"].includes(raw)) return "aggressive";
  if (["tactician", "tacticien", "all_rounder", "all rounder"].includes(raw)) return "tactician";
  if (["sniper", "checkout_master", "checkout master"].includes(raw)) return "sniper";
  if (["steady", "regular", "regulier", "régulier", "ultra_regular", "ultra regular"].includes(raw)) return "steady";
  if (["trickster", "bluffer", "bluffeur", "chaos"].includes(raw)) return "trickster";
  return null;
}
function levelBase(level: any) {
  return level === "hard" ? .875 : level === "easy" ? .50 : .70;
}
function profileSkill(profile: any): number | null {
  const raw = Number(profile?.botLevel ?? profile?.level ?? profile?.skillLevel);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const normalized = Math.max(1, Math.min(5, raw));
  return .36 + (normalized / 5) * .57;
}

export function resolvePremiumBotBrain(profile: any, level: any = "normal"): PremiumBotBrain {
  const stylePersona = personaFromStyle(profile);
  const keys: PremiumBotPersonaKey[] = ["aggressive", "tactician", "sniper", "steady", "trickster"];
  const key = stylePersona || keys[hashString(profileKey(profile)) % keys.length];
  const preset = PRESETS[key];
  const base = levelBase(level);
  const individual = profileSkill(profile);
  const blended = individual == null ? base : base * .66 + individual * .34;
  const precision = clamp01(blended + preset.precisionDelta);
  return {
    key,
    label: preset.label,
    icon: preset.icon,
    description: preset.description,
    precision,
    confidence: Math.round(precision * 100),
    risk: preset.risk,
    aggression: preset.aggression,
    patience: preset.patience,
    composure: preset.composure,
    attackBias: preset.attackBias,
    gotchaBias: preset.gotchaBias,
    bluffBias: preset.bluffBias,
    callBias: preset.callBias,
    sourceStyle: String(profile?.style || profile?.playStyle || "") || null,
  };
}

export function premiumBotBrainSummary(brain: PremiumBotBrain) {
  return `${brain.icon} ${brain.label} · ${Math.round(brain.confidence)}%`;
}

function latestText(state: any) {
  const visits = Array.isArray(state?.visits) ? state.visits : [];
  const visit = visits.length ? visits[visits.length - 1] : null;
  return Array.isArray(visit?.events) ? visit.events.join(" · ") : "";
}

export function premiumBotReaction(mode: PremiumPartyModeKey, state: any, player: any, brain: PremiumBotBrain): string {
  const id = String(player?.id || "");
  const name = String(player?.name || "").toLowerCase();
  const text = latestText(state);
  const lc = text.toLowerCase();

  if (mode === "castle") {
    const bricks = Number(state?.bricks?.[id] || 0);
    const target = Number(state?.config?.rules?.targetBricks || 15);
    if (bricks >= target - 3) return brain.key === "aggressive" ? "Il sent la victoire et accélère." : "Il verrouille sa fin de château.";
    if (lc.includes("−") && name && lc.includes(name)) return "Son château vient d'être touché : réaction immédiate.";
    if (brain.key === "trickster") return "Il garde un œil sur le leader avant de choisir sa cible.";
  }
  if (mode === "gotcha") {
    const score = Number(state?.scores?.[id] || 0);
    const target = Number(state?.config?.rules?.targetScore || 301);
    if (score === 0 && state?.turnIndex > 1) return "Reparti de zéro : il cherche un retour agressif.";
    if (target - score <= 170) return brain.key === "sniper" ? "Zone de finish : il ralentit et vise propre." : "Il sent le finish.";
    if (lc.includes("gotcha")) return brain.key === "trickster" ? "Le piège lui donne des idées…" : "La table vient de bouger : il recalcule.";
  }
  if (mode === "hare_hounds") {
    const role = String(state?.harePlayerId) === id ? "hare" : "hound";
    const progress = Number(state?.progressByPlayer?.[id] || 0);
    if (role === "hare" && progress >= 16) return "Dernière ligne droite : priorité à la sécurité.";
    if (role === "hound") return brain.key === "aggressive" ? "Le Limier pousse le rythme." : "Il mesure l'écart avant d'attaquer.";
  }
  if (mode === "pendu") {
    const errors = Number(state?.errors?.[id] || 0), max = Number(state?.config?.rules?.partsToLose || 6);
    if (errors >= max - 1) return brain.key === "steady" || brain.key === "sniper" ? "Dos au mur : il simplifie son exécution." : "Dos au mur : il doit réussir maintenant.";
    if (lc.includes("réussit") || lc.includes("reussit")) return "La réussite précédente augmente sa confiance.";
  }
  if (mode === "menteur") {
    const lives = Number(state?.lives?.[id] || 0), max = Number(state?.config?.rules?.lives || 5);
    if (lives <= 1) return brain.key === "trickster" ? "Dernière vie : bluff total ou repli." : "Dernière vie : il réduit les décisions gratuites.";
    if (Number(state?.bid || 0) >= 140) return brain.key === "tactician" ? "Enchère haute : il cherche la faille logique." : "La pression monte à la table.";
    if (lc.includes("menteur")) return "L'appel précédent change son seuil de risque.";
  }
  return brain.key === "aggressive" ? "Il veut imposer le rythme."
    : brain.key === "tactician" ? "Il recalcule la meilleure option."
    : brain.key === "sniper" ? "Il privilégie la cible la plus propre."
    : brain.key === "steady" ? "Il garde son plan sans surjouer."
    : "Il cherche l'ouverture inattendue.";
}

export function premiumBotTacticalPlan(mode: PremiumPartyModeKey, state: any, player: any, brain: PremiumBotBrain): PremiumBotPlan {
  const id = String(player?.id || "");
  let intent = "ANALYSE";
  let detail = brain.description;

  if (mode === "castle") {
    if (state?.phase === "assignment") {
      intent = "ATTRIBUTION DU SECTEUR";
      detail = "Choisir un secteur libre pour démarrer la construction.";
    } else {
      const own = Number(state?.bricks?.[id] || 0);
      const target = Number(state?.config?.rules?.targetBricks || 15);
      const rivals = [...(state?.players || [])].filter((p: any) => String(p.id) !== id)
        .sort((a: any, b: any) => Number(state?.bricks?.[b.id] || 0) - Number(state?.bricks?.[a.id] || 0));
      const leader = rivals[0];
      const leaderBricks = Number(state?.bricks?.[leader?.id] || 0);
      if (own >= target - 3) {
        intent = brain.risk > .70 ? "FERMETURE RAPIDE" : "SÉCURISER LE CHÂTEAU";
        detail = `${target - own} brique(s) avant la victoire de manche.`;
      } else if (state?.config?.rules?.attacksEnabled && leader && (leaderBricks >= own + 2 || brain.attackBias > .15)) {
        intent = brain.key === "trickster" ? "SABOTAGE DU LEADER" : "ASSAUT DU LEADER";
        detail = `${leader.name || "Leader"} possède ${leaderBricks} briques : cible prioritaire.`;
      } else {
        intent = brain.key === "aggressive" ? "CONSTRUCTION MAXIMALE" : "FORTIFICATION";
        detail = `${own}/${target} briques · consolider son propre secteur.`;
      }
    }
  }

  if (mode === "gotcha") {
    const score = Number(state?.scores?.[id] || 0);
    const target = Number(state?.config?.rules?.targetScore || 301);
    const remaining = target - score;
    const candidates = (state?.players || []).filter((p: any) => p.id !== id)
      .map((p: any) => ({ p, delta: Number(state?.scores?.[p.id] || 0) - score }))
      .filter((x: any) => x.delta > 0 && x.delta <= 180);
    if (remaining <= 170) {
      intent = brain.key === "sniper" || brain.key === "steady" ? "FINISH PROPRE" : "FINISH";
      detail = `${remaining} point(s) pour fermer la manche.`;
    } else if (candidates.length && brain.gotchaBias >= .08) {
      const leader = [...candidates].sort((a: any, b: any) => Number(state?.scores?.[b.p.id] || 0) - Number(state?.scores?.[a.p.id] || 0))[0];
      intent = brain.key === "trickster" ? "PIÈGE GOTCHA" : "CHASSE AU GOTCHA";
      detail = `${leader?.p?.name || "Adversaire"} peut être remis à zéro avec ${leader?.delta || "?"} point(s).`;
    } else {
      intent = brain.risk > .70 ? "SCORING AGRESSIF" : "SCORING CONTRÔLÉ";
      detail = `${score}/${target} · construire un finish sans dépasser.`;
    }
  }

  if (mode === "hare_hounds") {
    const isHare = String(state?.harePlayerId) === id;
    const progress = Number(state?.progressByPlayer?.[id] || 0);
    if (isHare) {
      intent = progress >= 16 ? "SPRINT FINAL" : (brain.risk > .70 ? "FUITE MAXIMALE" : "FUITE CONTRÔLÉE");
      detail = `${20 - progress} étape(s) avant de boucler le tour.`;
    } else {
      intent = brain.key === "sniper" ? "CAPTURE AU MILLIMÈTRE" : "POURSUITE DU LIÈVRE";
      detail = "Suivre la piste physique secteur par secteur et réduire l'écart.";
    }
  }

  if (mode === "pendu") {
    const errors = Number(state?.errors?.[id] || 0), max = Number(state?.config?.rules?.partsToLose || 6);
    const caller = state?.phase === "caller";
    const randomRound = state?.phase === "round";
    if (errors >= max - 1) {
      intent = "SURVIE — ZÉRO ERREUR";
      detail = "Une erreur supplémentaire peut provoquer l'élimination.";
    } else if (randomRound) {
      intent = brain.key === "sniper" ? "OBJECTIF PROPRE" : brain.risk > .70 ? "OBJECTIF À FOND" : "SURVIVRE À LA RONDE";
      detail = `Ronde ${Number(state?.roundNumber || 1)} · ${errors}/${max} erreur(s) accumulée(s).`;
    } else if (caller) {
      intent = brain.risk > .70 ? "DÉFI AMBITIEUX" : "POSER LE DÉFI";
      detail = "Réussir la cible pour mettre tous les adversaires sous pression.";
    } else {
      intent = brain.key === "sniper" ? "COPIE PRÉCISE" : "REPRODUIRE LE DÉFI";
      detail = `${errors}/${max} erreur(s) accumulée(s).`;
    }
  }

  if (mode === "menteur") {
    const bid = Number(state?.bid || 0);
    const lives = Number(state?.lives?.[id] || 0), max = Number(state?.config?.rules?.lives || 5);
    if (state?.phase === "challenge") {
      intent = brain.key === "sniper" ? "PREUVE PROPRE" : "PROUVER L'ANNONCE";
      detail = `${bid} point(s) à justifier · ${lives}/${max} vie(s).`;
    } else if (!state?.lastBidderId) {
      intent = brain.key === "trickster" ? "OUVERTURE PIÈGE" : "CONSTRUIRE L'ENCHÈRE";
      detail = "Fixer une première annonce crédible sans dévoiler son seuil.";
    } else if (bid >= 135 || brain.callBias > .12) {
      intent = brain.key === "trickster" ? "TESTER LE BLUFF" : "DÉTECTER LE BLUFF";
      detail = `${bid} point(s) annoncés : comparer le risque à la condition imposée.`;
    } else {
      intent = brain.bluffBias > .15 ? "METTRE LA PRESSION" : "SURENCHÈRE MESURÉE";
      detail = `${lives}/${max} vie(s) · choisir entre hausse et appel MENTEUR.`;
    }
  }

  return {
    intent,
    detail,
    reaction: premiumBotReaction(mode, state, player, brain),
    persona: brain.label,
    personaIcon: brain.icon,
    confidence: brain.confidence,
  };
}
