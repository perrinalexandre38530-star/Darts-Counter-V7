// @ts-nocheck
import { isAudioCategoryEnabled, resolveAudioVolume } from "./audioPreferences";
import {
  getWave61Target,
  wave61MineNeighborCount,
  wave61MafiaPhase,
  type Wave61State,
  type Wave61Visit,
} from "./gameEngines/wave61Engine";

export type Wave61FeedbackTone = "turn" | "success" | "warning" | "bull" | "victory";

type GuidanceMeta = { verb: string; fallback: string };

// One explicit guidance identity per Wave61 mode. The dynamic part is supplied by
// the engine target/state so the spoken hint follows the real rules instead of
// being a generic "aim at the target" sentence.
export const WAVE61_GUIDANCE: Record<string, GuidanceMeta> = {
  tug_rush: { verb: "Tire la corde", fallback: "Cherche le secteur actif ; doubles et triples donnent plus de traction." },
  demineur: { verb: "Sécurise la grille", fallback: "Lis les chiffres déjà révélés et garde le BULL pour scanner sans prendre de risque." },
  heist_180: { verb: "Fais avancer le casse", fallback: "Valide la phase courante et utilise les BULLS pour calmer la chaleur." },
  hot_potato: { verb: "Passe la patate", fallback: "Vise vite la cible demandée avant que la mèche ne tombe à zéro." },
  zombie_siege: { verb: "Tiens le siège", fallback: "Joue la cible active ; les BULLS sont précieux pour infection et barricades." },
  replicat: { verb: "Copie la référence", fallback: "Reproduis la volée précédente en respectant le niveau de précision demandé." },
  knockback: { verb: "Avance sans dépasser", fallback: "Cherche le score exact et guette une collision pour repousser un adversaire." },
  double_down: { verb: "Valide le contrat", fallback: "Sécurise au moins une touche sur le contrat du round pour éviter la sanction." },
  nine_dart_century: { verb: "Construis ton 100", fallback: "Reste sous 100 puis ferme exactement ; un dépassement déclenche le BUST." },
  shove_a_penny: { verb: "Ferme une case", fallback: "Complète d’abord la prochaine case inachevée avant de chercher les surplus." },
  green_vs_red: { verb: "Suis ta couleur", fallback: "Reste sur ta piste ; le triple accélère mais la mauvaise couleur peut aider l’autre camp." },
  hi_score: { verb: "Maximise la volée", fallback: "Si tu es à l’aise, construis la volée autour du T20 et sécurise tes trois darts." },
  un_deux_trois_soleil: { verb: "Avance au bon moment", fallback: "Quand le jeu annonce SOLEIL, ne bouge plus : le BULL te protège." },
  le_loup: { verb: "Cours ou chasse", fallback: "Suis la cible active ; un BULL peut offrir la protection qui change la manche." },
  chat_souris: { verb: "Réduis l’écart", fallback: "Suis ta piste : la souris cherche la fuite, le chat doit couper la distance." },
  eperviers: { verb: "Traverse le terrain", fallback: "Les coureurs avancent, l’Épervier cherche les captures : vise la cible active." },
  colin_maillard: { verb: "Joue de mémoire", fallback: "Observe l’aperçu, cache la séquence puis reproduis les secteurs dans le bon ordre." },
  ballon_prisonnier: { verb: "Trouve l’ouverture", fallback: "Touche la cible d’attaque ; garde les BULLS pour boucliers et libérations." },
  final_buzzer: { verb: "Joue avant le buzzer", fallback: "Priorité à une touche propre avant la coupure ; la dernière fléchette peut donner le Clutch." },
  maze_chase: { verb: "Sors du labyrinthe", fallback: "Suis le prochain couloir et utilise le BULL pour prendre de l’air sur le poursuivant." },
  chien_chat: { verb: "Accélère sur ta piste", fallback: "Vise le secteur de route ; les BULLS servent de raccourcis." },
  escape_game: { verb: "Ouvre le verrou", fallback: "Résous le verrou courant ; un BULL peut servir de joker si la situation se bloque." },
  iceberg: { verb: "Garde le navire à flot", fallback: "Sécurise les compartiments et utilise les BULLS pour pomper l’eau." },
  objectif_lune: { verb: "Poursuis la mission", fallback: "Alimente la phase courante et protège carburant et stabilité avec les BULLS." },
  golden_dart: { verb: "Cherche la fléchette dorée", fallback: "Utilise uniquement les indices révélés pour réduire progressivement les secteurs possibles." },
  roller_coaster: { verb: "Garde le train sur les rails", fallback: "Suis la section active sans dépasser la limite de vitesse dans les zones dangereuses." },
  jackpot: { verb: "Fais tourner les rouleaux", fallback: "Les secteurs 5, 11 et 17 alimentent le symbole SEVEN ; BULL agit comme WILD." },
  hollywood: { verb: "Tourne la scène", fallback: "Valide la scène active ; multiplicateurs et BULLS font monter les étoiles et le box-office." },
  saut_a_la_corde: { verb: "Garde le rythme", fallback: "Enchaîne les touches pour préserver le combo ; un MISS casse la cadence." },
  athletisme: { verb: "Joue la discipline", fallback: "Adapte ta volée à l’épreuve courante : sprint, haies, saut, lancer ou relais." },
  calendrier_maya: { verb: "Active le sceau", fallback: "Valide le cycle courant avant que la jauge de fin du monde ne monte trop haut." },
  chute_libre: { verb: "Contrôle la descente", fallback: "Surveille l’altitude et garde ton BULL pour ouvrir le parachute dans la bonne fenêtre." },
  tyrolien: { verb: "Garde ta vitesse", fallback: "Passe le checkpoint actif ; dose les boosts pour ne pas subir le vent." },
  mont_blanc: { verb: "Monte sans te griller", fallback: "Cherche la fenêtre météo et préserve fatigue et oxygène jusqu’au sommet." },
  everest: { verb: "Monte camp par camp", fallback: "Ne néglige pas l’acclimatation ; les BULLS restaurent oxygène et marge de sécurité." },
  summit_14: { verb: "Valide le sommet", fallback: "Accumule la progression requise puis récupère assez pour attaquer la montagne suivante." },
  mafia: { verb: "Joue la phase", fallback: "La nuit, réussis l’action secrète. Le jour, transforme les secteurs en votes sans révéler ton rôle." },
  vikings: { verb: "Mène le raid", fallback: "Fais monter la pression sur la zone active et charge la Fureur pour déclencher le Raid du Jarl." },
  codebreaker: { verb: "Casse le code", fallback: "Réutilise les retours exacts et déplacés de la tentative précédente pour réduire les possibilités." },
  black_flag: { verb: "Prends l’archipel", fallback: "Brise les fortifications, accumule le Butin et déclenche une Bordée au bon moment." },
  pyramides: { verb: "Traverse la chambre", fallback: "Protège la torche : les bonnes cibles ouvrent la voie et les BULLS rendent de la lumière." },
  menhir_mayhem: { verb: "Renverse le camp", fallback: "Charge la Potion, casse les défenses et utilise les triples pour accélérer le menhir géant." },
  attila: { verb: "Maintiens la charge", fallback: "Concentre la pression sur la cité active et fais monter la Terreur avant l’assaut massif." },
  poseidon: { verb: "Domine les mers", fallback: "Prends la zone maritime active ; les BULLS renforcent la Marée et le Trident." },
  cosmo_knights: { verb: "Charge ton Cosmos", fallback: "Vise la constellation active et prépare le COSMO BURST tout en gardant du bouclier." },
  draco_spheres: { verb: "Trouve l’orbe", fallback: "Suis l’orbe courante ; triples et BULLS chargent l’énergie qui peut invoquer une sphère bonus." },
  mythologie: { verb: "Réussis l’épreuve", fallback: "Valide l’épreuve divine et accumule la faveur ; un BULL peut faire basculer la progression." },
  jardinier: { verb: "Fais pousser la récolte", fallback: "Joue la plante active et surveille l’eau ; le BULL arrose immédiatement." },
  microscopia: { verb: "Isole l’échantillon", fallback: "Cherche l’échantillon actif sans laisser monter la contamination ; BULL désinfecte." },
  disjoncte: { verb: "Ferme le circuit", fallback: "Alimente le circuit actif mais surveille la surcharge ; BULL met l’installation à la terre." },
  jurassic_dart: { verb: "Sécurise l’expédition", fallback: "Progresse avant que la menace n’explose ; les BULLS servent de tranquillisants." },
  face_mystere: { verb: "Réduis les suspects", fallback: "Utilise les indices déjà obtenus et n’accuse que lorsque la liste devient suffisamment courte." },
  align_4: { verb: "Construis ton alignement", fallback: "Privilégie les colonnes centrales pour créer plusieurs menaces à la fois." },
  spartacus: { verb: "Prends l’avantage dans l’arène", fallback: "Cherche la fenêtre d’attaque et utilise le BULL pour renforcer ta garde." },
  cheval_de_troie: { verb: "Poursuis l’infiltration", fallback: "Valide la phase actuelle sans faire monter l’alerte ; BULL améliore la discrétion." },
  sniper: { verb: "Verrouille la cible", fallback: "Lis précisément le contrat S, D, T ou BULL avant de lâcher la fléchette." },
  petit_bac: { verb: "Valide la catégorie", fallback: "Touche le secteur associé à la lettre et garde le BULL comme joker." },
  luciole: { verb: "Mémorise la lumière", fallback: "Repère le secteur pendant l’éclair puis garde les yeux sur sa position une fois la cible cachée." },
  sabaudia_dauphine: { verb: "Prends le col", fallback: "Concentre la pression sur la zone alpine active et fortifie immédiatement les positions acquises." },
  galaxies: { verb: "Colonise le système", fallback: "Prends le système actif et charge l’Hyperdrive pour accélérer la conquête suivante." },
  apocalypse: { verb: "Sécurise le refuge", fallback: "Ramène des ressources avant la catastrophe ; les BULLS servent de medkits d’urgence." },
};

function cleanTargetLabel(value: string) {
  return String(value || "")
    .replace(/[🎯⚓🔴🟢🐱🐭🧩🐶🎢🏃🏁🪂🚀🎬🗿🔺🐉⚡🌱🔬📝🏔️⛰️🛡️🏴‍☠️🪨🐎🔱🌌🐴🥔🧟🐺🦅🏐🧊🦖☢️⚔️✨]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function activePlayerId(state: Wave61State): string {
  return String(state?.players?.[state?.activePlayerIndex || 0]?.id || "");
}

function adviceForNoTarget(state: Wave61State): string | null {
  const id = state.modeId;
  const pid = activePlayerId(state);
  if (id === "align_4") {
    const moves = Array.isArray(state.special?.align4Moves) ? state.special.align4Moves.length : 0;
    return moves < 2
      ? "Commence par la colonne 4, puis ouvre 3 ou 5 pour multiplier les alignements possibles."
      : "Cherche d’abord un alignement gagnant ou un blocage urgent ; sinon, garde la pression au centre."
  }
  if (id === "demineur") {
    const revealed = Array.isArray(state.special?.revealed) ? state.special.revealed.map(Number) : [];
    const clues = revealed
      .map((n: number) => ({ n, count: wave61MineNeighborCount(state, n) }))
      .filter((row: any) => row.count > 0)
      .slice(-3);
    if (clues.length) return `Relis les derniers indices : ${clues.map((c: any) => `${c.n} indique ${c.count}`).join(", ")}. BULL reste ton scanner sûr.`;
    return "Pas assez d’indices pour déduire une case. Joue prudemment ou utilise BULL pour scanner une zone sûre.";
  }
  if (id === "codebreaker") {
    const history = Array.isArray(state.special?.codeHistory) ? state.special.codeHistory : [];
    const last = history[history.length - 1];
    if (last) return `Dernier retour : ${Number(last.exact || 0)} exact, ${Number(last.present || 0)} déplacé. Modifie seulement ce que ces indices imposent.`;
    return `Propose ${Number(state.config?.modeOptions?.codeLength || 3)} secteurs${state.config?.modeOptions?.allowRepeats ? ", répétitions possibles" : " différents"}.`;
  }
  if (id === "face_mystere") {
    const count = Array.isArray(state.special?.faceCandidates) ? state.special.faceCandidates.length : 20;
    return count <= 3 ? `Il ne reste que ${count} suspect${count > 1 ? "s" : ""}. Croise les indices avant l’accusation.` : `${count} suspects restent possibles. Cherche encore un indice avant de tenter le portrait final.`;
  }
  if (id === "shove_a_penny") {
    const marks = state.special?.shoveMarksByPlayer?.[pid] || {};
    const perBox = Math.max(2, Number(state.config?.modeOptions?.marksPerBox || 3));
    const target = [15, 16, 17, 18, 19, 20, 25].find((n) => Number(marks[String(n)] || 0) < perBox);
    return target === 25 ? `Ferme maintenant le BULL : il te manque ${perBox - Number(marks["25"] || 0)} marque(s).` : target ? `Priorité au ${target} : complète cette case avant de pousser les surplus.` : "Ton tableau est fermé : transforme les surplus en pression sur l’adversaire.";
  }
  if (id === "golden_dart") {
    const clues = Array.isArray(state.special?.goldenClues) ? state.special.goldenClues : [];
    if (clues.length) return `Indices disponibles : ${clues.slice(-3).map((c: any) => String(c?.label || c)).join(" ; ")}. Élimine les secteurs incompatibles.`;
    return "Premier tir : choisis un secteur informatif. Chaque erreur donnera un indice sur la cible dorée.";
  }
  if (id === "hi_score") return "Si ton niveau le permet, construis autour du T20. Sinon, sécurise trois darts dans ta zone la plus fiable.";
  if (id === "jackpot") return "Pour viser le symbole SEVEN, cherche 5, 11 ou 17. BULL agit comme WILD et peut compléter une combinaison.";
  if (id === "mafia" && wave61MafiaPhase(state) === "DAY") return "Phase de jour : chaque dart devient un vote. Répartis ou concentre tes voix selon les soupçons déjà visibles.";
  if (id === "chute_libre") {
    const altitude = Number(state.special?.freefallAltitudeByPlayer?.[pid] || 0);
    return altitude > 0 ? `Altitude ${Math.round(altitude)} mètres. Prépare le BULL dès que la fenêtre parachute apparaît.` : null;
  }
  return null;
}

export function buildWave61Advice(state: Wave61State): string {
  if (!state || state.phase !== "playing") return "";
  const meta = WAVE61_GUIDANCE[state.modeId] || { verb: "Joue l’objectif", fallback: "Suis la cible active et protège ta progression." };
  const special = adviceForNoTarget(state);
  if (special) return special;
  const target = getWave61Target(state);
  if (target?.label) return `${meta.verb} : ${cleanTargetLabel(target.label)}.`;
  return meta.fallback;
}

const IMPORTANT_EVENT = /(jackpot|conquise|captur|prison|valid[ée]|sommet|atteint|explosion|bust|repli|alarme|infect|élimin|burst|orbe|sphère|verrou|citadelle|phase|refuge|catastrophe|crash|parachute|bordée|raid|trident|hyperdrive|menhir|clutch|torche|bouclier|protection|libér|victoire)/i;

function stripEvent(value: string) {
  return String(value || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/\s+/g, " ").trim();
}

export function buildWave61VisitComment(state: Wave61State, visit?: Wave61Visit | null): string | null {
  if (!state) return null;
  if (state.phase === "finished") {
    const winner = state.players.find((p) => p.id === state.winnerId)?.name || "Le vainqueur";
    return `${winner} remporte la partie. Belle fin de match.`;
  }
  if (!visit) return null;
  const events = Array.isArray(visit.events) ? visit.events.map(stripEvent).filter(Boolean) : [];
  const important = events.find((event) => IMPORTANT_EVENT.test(event));
  if (important) return important.length > 95 ? `${important.slice(0, 92)}...` : important;
  const darts = Array.isArray(visit.darts) ? visit.darts.length : 0;
  const hits = Number(visit.hits || 0);
  if (darts >= 3 && hits >= 3) return `Très propre : trois réussites sur la volée. Continue comme ça.`;
  if (darts >= 3 && hits === 0) return `Aucune cible utile cette fois. Reprends le conseil du prochain tour.`;
  return null;
}

let audioCtx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  try {
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => undefined);
    return audioCtx;
  } catch { return null; }
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number, gainValue: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playWave61FeedbackTone(tone: Wave61FeedbackTone, enabled = true) {
  if (!enabled || !isAudioCategoryEnabled(tone === "turn" ? "ui" : "arcade")) return;
  const ctx = context();
  if (!ctx) return;
  const volume = resolveAudioVolume(tone === "victory" ? 0.34 : 0.24, tone === "turn" ? "ui" : "arcade");
  if (volume <= 0) return;
  const t = ctx.currentTime + 0.01;
  if (tone === "turn") {
    note(ctx, 520, t, 0.09, volume * 0.55, "sine");
    note(ctx, 690, t + 0.07, 0.10, volume * 0.45, "sine");
  } else if (tone === "success") {
    note(ctx, 540, t, 0.10, volume, "triangle");
    note(ctx, 720, t + 0.08, 0.12, volume * 0.85, "triangle");
  } else if (tone === "bull") {
    note(ctx, 650, t, 0.10, volume, "square");
    note(ctx, 920, t + 0.07, 0.16, volume * 0.75, "triangle");
  } else if (tone === "warning") {
    note(ctx, 210, t, 0.13, volume * 0.9, "sawtooth");
    note(ctx, 165, t + 0.10, 0.16, volume * 0.72, "sawtooth");
  } else {
    note(ctx, 523, t, 0.12, volume, "triangle");
    note(ctx, 659, t + 0.10, 0.14, volume * 0.92, "triangle");
    note(ctx, 784, t + 0.20, 0.22, volume * 0.82, "triangle");
  }
}

export function wave61ToneForVisit(state: Wave61State, visit?: Wave61Visit | null): Wave61FeedbackTone {
  if (state?.phase === "finished") return "victory";
  if (!visit) return "turn";
  const darts = Array.isArray(visit.darts) ? visit.darts : [];
  if (darts.some((d: any) => d?.bed === "OB" || d?.bed === "IB")) return "bull";
  if (Number(visit.hits || 0) > 0 || Number(visit.delta || 0) > 0) return "success";
  return "warning";
}
