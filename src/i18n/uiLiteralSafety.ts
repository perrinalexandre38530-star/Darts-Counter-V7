// Global UI literal translation safety-net.
//
// The application has a large historical surface and a number of recent screens
// still contain visible French literals instead of t(...).  This module does NOT
// replace the normal dictionaries: it is a last line of defence so selecting EN
// never leaves French UI fragments on screen.

export type UiDictTable = Record<string, Record<string, string>>;

const EN_EXACT: Record<string, string> = {
  "← Retour": "← Back",
  "Retour": "Back",
  "← Retour tournoi": "← Back to tournament",
  "Retour à la configuration": "Back to setup",
  "Fermer": "Close",
  "FERMER": "CLOSE",
  "Annuler": "Cancel",
  "ANNULER": "CANCEL",
  "Valider": "Confirm",
  "VALIDER": "CONFIRM",
  "Valider la volée": "Confirm visit",
  "Suivant →": "Next →",
  "SUIVANT →": "NEXT →",
  "SUIVANT": "NEXT",
  "← Précédent": "← Previous",
  "PRÉCÉDENT": "PREVIOUS",
  "PRÉC.": "PREV.",
  "Choisir": "Choose",
  "CHOISIR": "CHOOSE",
  "Choisir des joueurs": "Choose players",
  "Choisir les joueurs": "Choose players",
  "Choisir des BOTS IA": "Choose AI BOTS",
  "Choisir des équipes": "Choose teams",
  "Choisir équipes": "Choose teams",
  "Choisir les 2 joueurs": "Choose both players",
  "Joueur actif": "Active player",
  "JOUEUR A": "PLAYER A",
  "JOUEUR B": "PLAYER B",
  "Joueur 1": "Player 1",
  "Joueur 2": "Player 2",
  "Joueurs disponibles": "Available players",
  "Équipes enregistrées": "Saved teams",
  "Équipes sélectionnées": "Selected teams",
  "Équipes validées": "Teams confirmed",
  "Enregistrer ces équipes": "Save these teams",
  "Valider ces équipes": "Confirm these teams",
  "Aperçu des équipes générées": "Generated teams preview",
  "ÉQUIPE A": "TEAM A",
  "ÉQUIPE B": "TEAM B",
  "RÔLES": "ROLES",
  "Rôles": "Roles",
  "OBJECTIF": "OBJECTIVE",
  "Objectif": "Objective",
  "RÉSUMÉ": "SUMMARY",
  "Récap": "Summary",
  "STATISTIQUES": "STATISTICS",
  "Statistiques": "Statistics",
  "Statistiques joueurs": "Player statistics",
  "HISTORIQUE & STATS": "HISTORY & STATS",
  "CLASSEMENT": "RANKING",
  "Classement équipes": "Team ranking",
  "PARTIES": "MATCHES",
  "Parties récentes": "Recent matches",
  "MANCHES": "ROUNDS",
  "TOURS": "ROUNDS",
  "TOUR": "ROUND",
  "VOLÉES": "VISITS",
  "Volées": "Visits",
  "Volées jouées": "Visits played",
  "Volées réussies": "Successful visits",
  "Volées parfaites": "Perfect visits",
  "Meilleure volée": "Best visit",
  "BEST VOLÉE": "BEST VISIT",
  "Moyenne / volée": "Average / visit",
  "FLÉCHETTES": "DARTS",
  "3 FLÉCHETTES": "3 DARTS",
  "POINTS": "POINTS",
  "Points gagnés": "Points earned",
  "Points cibles": "Target points",
  "Mains gagnées": "Hands won",
  "Cartes collectées": "Cards collected",
  "Contrats réussis": "Contracts completed",
  "Contrats tentés": "Contracts attempted",
  "Précision impacts": "Hit accuracy",
  "PRÉCISION": "ACCURACY",
  "Préc.": "Acc.",
  "RÉUSSITE": "SUCCESS",
  "Réussite": "Success",
  "RÉUSS.": "SUCCESS",
  "RÉUSSI": "SUCCESS",
  "ÉCHEC": "FAILURE",
  "Échecs": "Failures",
  "VICTOIRE": "WIN",
  "Victoire": "Win",
  "DÉFAITE": "LOSS",
  "Défaite": "Loss",
  "VAINQUEUR": "WINNER",
  "ÉGALITÉ": "DRAW",
  "EN COURS": "IN PROGRESS",
  "Terminé": "Finished",
  "TERMINÉ": "FINISHED",
  "Terminées": "Finished",
  "À jouer": "To play",
  "À reprendre": "To resume",
  "PRÊT": "READY",
  "Prêt": "Ready",
  "prêt": "ready",
  "DURÉE": "DURATION",
  "MEILLEURE SÉRIE": "BEST STREAK",
  "Meilleure série": "Best streak",
  "SÉRIE": "STREAK",
  "Série": "Streak",
  "Séries": "Streaks",
  "RÉPARTITION DES IMPACTS": "HIT DISTRIBUTION",
  "Répartition des impacts": "Hit distribution",
  "SEGMENTS LES PLUS TOUCHÉS": "MOST HIT SEGMENTS",
  "Segments les plus touchés": "Most hit segments",
  "Configuration guidée": "Guided setup",
  "CONFIGURATION GUIDÉE": "GUIDED SETUP",
  "Guidée": "Guided",
  "Configuration complète": "Full setup",
  "CONFIGURATION COMPLÈTE": "FULL SETUP",
  "Complète": "Full",
  "Guidée : étape par étape. Complète : tous les réglages sur une seule page.": "Guided: step by step. Full: all settings on one page.",
  "Ordre de départ": "Starting order",
  "Ordre aléatoire": "Random order",
  "Ordre de passage aléatoire": "Random turn order",
  "Cible interactive": "Interactive target",
  "Aucune cible": "No target",
  "Hors cible": "Off target",
  "MISS hors cible": "MISS off target",
  "Aucun effet": "No effect",
  "Aucune pénalité": "No penalty",
  "Pénalités": "Penalties",
  "Illimitée": "Unlimited",
  "illimité": "unlimited",
  "Aucun": "None",
  "Aucune": "None",
  "aucune": "none",
  "Aucun set": "No set",
  "Pas assez de données.": "Not enough data.",
  "Pas assez de données": "Not enough data",
  "Chargement...": "Loading...",
  "Chargement…": "Loading…",
  "Impossible": "Unable",
  "erreur inconnue": "unknown error",
  "Création…": "Creating…",
  "création impossible": "creation failed",
  "Supprimer définitivement": "Delete permanently",
  "Désélectionner": "Deselect",
  "Sélectionné": "Selected",
  "Déconnecté": "Disconnected",
  "Hôte": "Host",
  "Président": "President",
  "Privé": "Private",
  "PRIVÉ": "PRIVATE",
  "À vie": "Lifetime",
  "À VIE": "LIFETIME",
  "Difficulté générale": "Overall difficulty",
  "Niveau tactique des Bots": "Bot tactical level",
  "Intensité initiale": "Initial intensity",
  "Zones enfumées": "Smoky zones",
  "Zones pré-protégées": "Pre-protected zones",
  "Perte critique = défaite": "Critical loss = defeat",
  "Territoires détruits tolérés": "Destroyed territories allowed",
  "Durée maximale": "Maximum duration",
  "Nouveaux départs programmés": "Scheduled new outbreaks",
  "Prévision des menaces": "Threat forecast",
  "Menaces affichées": "Displayed threats",
  "Propagation par fumée": "Smoke spread",
  "Cible du Bull": "Bull target",
  "Zones voisines arrosées": "Adjacent zones watered",
  "Puissance latérale": "Lateral power",
  "Canadair lié à la jauge": "Canadair linked to gauge",
  "Coût de la mission aérienne": "Air mission cost",
  "Volée max": "Max visit",
  "Règle du MISS": "MISS rule",
  "Probabilité": "Probability",
  "2 unités": "2 units",
  "désactivé": "disabled",
  "DÉFENSE": "DEFENSE",
  "Défense": "Defense",
  "FUMÉE": "SMOKE",
  "Fumée": "Smoke",
  "Feu réduit": "Fire reduced",
  "Feux éteints": "Fires extinguished",
  "Éteints": "Extinguished",
  "Bloquées": "Blocked",
  "Bloqués": "Blocked",
  "DÉTRUIT": "DESTROYED",
  "ÉVASIONS": "ESCAPES",
  "Évasions": "Escapes",
  "ÉVASIONS SCORE": "ESCAPE SCORE",
  "ÉVASIONS ROUNDS": "ESCAPE ROUNDS",
  "BOT EN RÉFLEXION": "BOT THINKING",
  "Tour précédent restauré.": "Previous round restored.",
  "Volée effacée.": "Visit cleared.",
  "Aucune action à annuler.": "No action to undo.",
  "Dernière volée annulée.": "Last visit cancelled.",
  "Volée BOT validée.": "BOT visit confirmed.",
  "Volée complète — VALIDER": "Visit complete — CONFIRM",
  "Un même profil ne peut pas jouer dans plusieurs équipes.": "The same profile cannot play on multiple teams.",
  "Sélectionne au moins 2 équipes.": "Select at least 2 teams.",
  "Sélectionne entre 1 et 12 joueurs ou BOTS IA.": "Select between 1 and 12 players or AI BOTS.",
  "Les équipes doivent avoir le même nombre de joueurs.": "Teams must have the same number of players.",
  "Compose 2 à 4 équipes équilibrées, 12 participants maximum.": "Create 2 to 4 balanced teams, up to 12 participants.",
  "GÉRER LES BOTS": "MANAGE BOTS",
  "MODE ÉQUIPES": "TEAM MODE",
  "DÉPART": "START",
  "Départ": "Start",
  "VALIDÉ": "CONFIRMED",
  "RATÉ": "MISS",
  "MARCHÉ": "MARKET",
  "Marché": "Market",
  "Capital de départ": "Starting capital",
  "Prisonniers créés": "Prisoners created",
  "TOUR DE L’HORLOGE": "AROUND THE CLOCK",
  "Désarmements": "Disarms",
  "Résurrections": "Resurrections",
  "Numéro favori": "Favorite number",
  "Compétitions": "Competitions",
  "Demandes reçues": "Received requests",
  "Équilibré": "Balanced",
  "Configurer": "Configure",
  "Configuré": "Configured",
  "Continuer ?": "Continue?",
  "Aucun détail de volée enregistré.": "No visit details recorded.",
  "Aucune volée enregistrée.": "No visit recorded.",
  "Aucune action.": "No action.",
  "Aucun envoi pour le moment.": "No transmission yet.",
  "Derniers envois live vers tablette.": "Latest live transmissions to tablet.",
  "Diagnostic viewer": "Viewer diagnostics",
  "Viewer tablette": "Tablet viewer",
  "Aucune session active": "No active session",
  "Copier lien": "Copy link",
  "Créer viewer": "Create viewer",
  "Arrêter viewer": "Stop viewer",
  "Page Viewer / QR code": "Viewer page / QR code",
  "Rejoindre": "Join",
  "Vider": "Clear",
  "Lien viewer copié.": "Viewer link copied.",
  "Session viewer arrêtée.": "Viewer session stopped.",
  "Création de la session viewer…": "Creating viewer session…",
  "Session Cast arrêtée.": "Cast session stopped.",
  "Session Cast démarrée.": "Cast session started.",
  "Arrêter": "Stop",
  "Démarrer": "Start",
  "Lancer": "Start",
  "Créer": "Create",
  "CRÉER": "CREATE",
  "Éditer": "Edit",
  "Modifier": "Edit",
  "Supprimer": "Delete",
  "Ajouter": "Add",
  "Reprendre": "Resume",
  "Quitter": "Quit",
  "Oui": "Yes",
  "Non": "No",
  "OUI": "YES",
  "NON": "NO",
  "oui": "yes",
  "non": "no",
  "PUBLICITÉ": "ADVERTISING",
  "FIN DE PARTIE": "END OF MATCH",
  "BIENTÔT": "COMING SOON",
  "ID PRÊT": "ID READY",
  "À VÉRIFIER": "TO CHECK",
  "VÉRIFIER": "CHECK",
  "PRÊTE": "READY",
  "MES FLÉCHETTES": "MY DARTS",
  "DÉS": "DICE",
  "Dés": "Dice",
  "Règles RUGBY": "RUGBY rules",
  "Élite": "Elite",
  "Bâtard": "Bastard",
  "BÂTARD": "BASTARD",
  "Pêche offensive": "Offensive fishing",
  "Pêche défensive": "Defensive fishing",
  "Demi dernière balle": "Half last ball",
  "Pêches": "Fishings",
  "Non défini": "Not set",

  // Game names / branded mode titles that must follow the selected language.
  "ATTRAPE MOI SI TU PEUX": "CATCH ME IF YOU CAN",
  "ATTRAPE-MOI SI TU PEUX": "CATCH ME IF YOU CAN",
  "Attrape moi si tu peux": "Catch Me If You Can",
  "Attrape-moi si tu peux": "Catch Me If You Can",
  "LES 5 VIES": "FIVE LIVES",
  "Les 5 vies": "Five Lives",
  "KILLER PROGRESSIF": "PROGRESSIVE KILLER",
  "Killer progressif": "Progressive Killer",
};

// Rules are deliberately ordered from the most specific phrases to generic words.
// They cover dynamic strings that cannot be exact-matched (counts, names, scores...).
const EN_FRAGMENT_RULES: Array<[RegExp, string]> = [
  [/\bconfiguration guidée\b/gi, "guided setup"],
  [/\bconfiguration complète\b/gi, "full setup"],
  [/\bordre de passage\b/gi, "turn order"],
  [/\bordre de départ\b/gi, "starting order"],
  [/\bau moins\b/gi, "at least"],
  [/\bau maximum\b/gi, "at most"],
  [/\bpas encore\b/gi, "not yet"],
  [/\bpour le moment\b/gi, "for now"],
  [/\bdernière volée\b/gi, "last visit"],
  [/\bdernières volées\b/gi, "last visits"],
  [/\bmeilleure volée\b/gi, "best visit"],
  [/\bmeilleure série\b/gi, "best streak"],
  [/\btaux de victoire\b/gi, "win rate"],
  [/\bmot de passe\b/gi, "password"],
  [/\bprofil actif\b/gi, "active profile"],
  [/\bjoueur actif\b/gi, "active player"],
  [/\bjoueurs disponibles\b/gi, "available players"],
  [/\béquipes sélectionnées\b/gi, "selected teams"],
  [/\baucune donnée\b/gi, "no data"],
  [/\baucun profil\b/gi, "no profile"],
  [/\baucune session\b/gi, "no session"],
  [/\baucune action\b/gi, "no action"],
  [/\baucune cible\b/gi, "no target"],
  [/\baucune pénalité\b/gi, "no penalty"],
  [/\baucun effet\b/gi, "no effect"],
  [/\baucun set\b/gi, "no set"],
  [/\ben cours\b/gi, "in progress"],
  [/\bhors cible\b/gi, "off target"],
  [/\bpartie lancée\b/gi, "match started"],
  [/\bparties récentes\b/gi, "recent matches"],
  [/\bpartie\b/gi, "match"],
  [/\bparties\b/gi, "matches"],
  [/\bjoueurs\b/gi, "players"],
  [/\bjoueur\b/gi, "player"],
  [/\béquipes\b/gi, "teams"],
  [/\béquipe\b/gi, "team"],
  [/\bprofils\b/gi, "profiles"],
  [/\bprofil\b/gi, "profile"],
  [/\bfléchettes\b/gi, "darts"],
  [/\bfléchette\b/gi, "dart"],
  [/\bvolées\b/gi, "visits"],
  [/\bvolée\b/gi, "visit"],
  [/\bmanches\b/gi, "rounds"],
  [/\bmanche\b/gi, "round"],
  [/\btours\b/gi, "rounds"],
  [/\btour\b/gi, "round"],
  [/\bvictoires\b/gi, "wins"],
  [/\bvictoire\b/gi, "win"],
  [/\bdéfaites\b/gi, "losses"],
  [/\bdéfaite\b/gi, "loss"],
  [/\bvainqueur\b/gi, "winner"],
  [/\bclassement\b/gi, "ranking"],
  [/\bstatistiques\b/gi, "statistics"],
  [/\bhistorique\b/gi, "history"],
  [/\bpréférences\b/gi, "preferences"],
  [/\bparamètres\b/gi, "settings"],
  [/\bréglages\b/gi, "settings"],
  [/\bsauvegarde\b/gi, "backup"],
  [/\bconnexion\b/gi, "sign in"],
  [/\bdéconnexion\b/gi, "sign out"],
  [/\blangue\b/gi, "language"],
  [/\bthème\b/gi, "theme"],
  [/\bcompte\b/gi, "account"],
  [/\brègles\b/gi, "rules"],
  [/\bobjectif\b/gi, "objective"],
  [/\bcibles\b/gi, "targets"],
  [/\bcible\b/gi, "target"],
  [/\bpoints gagnés\b/gi, "points earned"],
  [/\bpoints marqués\b/gi, "points scored"],
  [/\bdifficulté\b/gi, "difficulty"],
  [/\bniveau\b/gi, "level"],
  [/\bdurée\b/gi, "duration"],
  [/\bmoyenne\b/gi, "average"],
  [/\bmeilleur\b/gi, "best"],
  [/\bmeilleure\b/gi, "best"],
  [/\bséries\b/gi, "streaks"],
  [/\bsérie\b/gi, "streak"],
  [/\bprécision\b/gi, "accuracy"],
  [/\bréussite\b/gi, "success"],
  [/\bréussi(?:e|es|s)?\b/gi, "successful"],
  [/\béchec(?:s)?\b/gi, "failure"],
  [/\braté(?:e|es|s)?\b/gi, "missed"],
  [/\bterminé(?:e|es|s)?\b/gi, "finished"],
  [/\bchargement\b/gi, "loading"],
  [/\berreur\b/gi, "error"],
  [/\bimpossible\b/gi, "unable"],
  [/\bsélectionne(?:r|z)?\b/gi, "select"],
  [/\bsélection\b/gi, "selection"],
  [/\bchoisir\b/gi, "choose"],
  [/\bcréer\b/gi, "create"],
  [/\bcréation\b/gi, "creation"],
  [/\bsupprimer\b/gi, "delete"],
  [/\bmodifier\b/gi, "edit"],
  [/\béditer\b/gi, "edit"],
  [/\bajouter\b/gi, "add"],
  [/\bannuler\b/gi, "cancel"],
  [/\bvalider\b/gi, "confirm"],
  [/\bconfirmer\b/gi, "confirm"],
  [/\bdémarrer\b/gi, "start"],
  [/\blancer\b/gi, "start"],
  [/\barrêter\b/gi, "stop"],
  [/\breprendre\b/gi, "resume"],
  [/\bcontinuer\b/gi, "continue"],
  [/\bquitter\b/gi, "quit"],
  [/\bretour\b/gi, "back"],
  [/\bfermer\b/gi, "close"],
  [/\bsuivant\b/gi, "next"],
  [/\bprécédent\b/gi, "previous"],
  [/\baucune\b/gi, "no"],
  [/\baucun\b/gi, "no"],
  [/\bmenaces\b/gi, "threats"],
  [/\bmenace\b/gi, "threat"],
  [/\bzones\b/gi, "zones"],
  [/\bterritoires\b/gi, "territories"],
  [/\bterritoire\b/gi, "territory"],
  [/\bfumée\b/gi, "smoke"],
  [/\bfeux\b/gi, "fires"],
  [/\bfeu\b/gi, "fire"],
  [/\bdétruit(?:e|es|s)?\b/gi, "destroyed"],
  [/\bprotégé(?:e|es|s)?\b/gi, "protected"],
  [/\bbloqué(?:e|es|s)?\b/gi, "blocked"],
  [/\bprobabilité\b/gi, "probability"],
  [/\bunités\b/gi, "units"],
  [/\bunité\b/gi, "unit"],
  [/\bdésactivé(?:e|es|s)?\b/gi, "disabled"],
  [/\bactivé(?:e|es|s)?\b/gi, "enabled"],
  [/\bprêt(?:e|es|s)?\b/gi, "ready"],
  [/\bprivé(?:e|es|s)?\b/gi, "private"],
  [/\bpublicité\b/gi, "advertising"],
  [/\boui\b/gi, "yes"],
  [/\bnon\b/gi, "no"],
];

const FRENCH_SIGNAL = /[àâäçéèêëîïôöùûüœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]|\b(?:retour|fermer|annuler|valider|suivant|précédent|joueur|joueurs|équipe|équipes|partie|parties|manche|manches|volée|volées|fléchette|fléchettes|règles|objectif|cible|cibles|victoire|victoires|défaite|défaites|vainqueur|statistiques|historique|profil|profils|préférences|paramètres|réglages|langue|thème|compte|sauvegarde|connexion|déconnexion|chargement|erreur|impossible|sélection|choisir|créer|supprimer|modifier|ajouter|démarrer|lancer|arrêter|reprendre|continuer|quitter|aucun|aucune|durée|moyenne|meilleur|meilleure|série|réussite|échec|raté|terminé|fumée|feu|menace|territoire)\b/i;

const PROPER_NAME_EXCEPTIONS = new Set([
  "Auvergne-Rhône-Alpes",
  "Île-de-France",
  "Provence-Alpes-Côte d’Azur",
  "Provence-Alpes-Côte d'Azur",
  "Pays de la Loire",
  "Hauts-de-France",
]);

function normalize(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function matchCase(source: string, translated: string): string {
  const letters = source.replace(/[^A-Za-zÀ-ÿŒœ]/g, "");
  if (letters && letters === letters.toUpperCase()) return translated.toUpperCase();
  if (source.length > 1 && source[0] === source[0].toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}

function buildReverseDictionary(dicts: UiDictTable, targetLang: string): Map<string, string> {
  const out = new Map<string, string>();
  const target = dicts[targetLang] || {};
  const sourceLangs = Object.keys(dicts);
  for (const key of Object.keys(target)) {
    const targetValue = target[key];
    if (typeof targetValue !== "string" || !targetValue.trim()) continue;
    for (const lang of sourceLangs) {
      const src = dicts[lang]?.[key];
      if (typeof src !== "string" || !src.trim()) continue;
      const n = normalize(src);
      if (!out.has(n)) out.set(n, targetValue);
    }
  }
  return out;
}

export function looksFrenchUiText(value: string): boolean {
  const core = normalize(String(value || ""));
  return !!core && !PROPER_NAME_EXCEPTIONS.has(core) && FRENCH_SIGNAL.test(core);
}

type BrowserTranslatorLike = {
  translate(text: string): Promise<string>;
};

const browserTranslatorCache = new Map<string, Promise<BrowserTranslatorLike | null>>();

function getBrowserTranslator(targetLang: string): Promise<BrowserTranslatorLike | null> {
  const target = String(targetLang || "en").toLowerCase().split("-")[0];
  if (target === "fr") return Promise.resolve(null);
  const key = `fr>${target}`;
  const cached = browserTranslatorCache.get(key);
  if (cached) return cached;

  const api = (globalThis as any)?.Translator;
  if (!api || typeof api.create !== "function") {
    const unavailable = Promise.resolve(null);
    browserTranslatorCache.set(key, unavailable);
    return unavailable;
  }

  // Chrome 138+ exposes the on-device Translator API. create() is called
  // directly so a Settings language click can satisfy transient user activation
  // if a language model needs to be downloaded the first time.
  let created: Promise<BrowserTranslatorLike> | BrowserTranslatorLike;
  try {
    // Deliberately invoke create() synchronously in the caller stack so a direct
    // click on the language selector can satisfy transient user activation.
    created = api.create({ sourceLanguage: "fr", targetLanguage: target });
  } catch (error) {
    console.info("[i18n] Browser Translator unavailable", error);
    const unavailable = Promise.resolve(null);
    browserTranslatorCache.set(key, unavailable);
    return unavailable;
  }
  const promise = Promise.resolve(created)
    .then((translator: BrowserTranslatorLike) => translator || null)
    .catch((error: unknown) => {
      console.info("[i18n] Browser Translator unavailable", error);
      return null;
    });
  browserTranslatorCache.set(key, promise);
  return promise;
}

export function warmUiLiteralTranslator(targetLang: string): void {
  if (String(targetLang || "").toLowerCase().split("-")[0] === "fr") return;
  void getBrowserTranslator(targetLang);
}

export async function translateUiLiteralWithBrowser(raw: string, targetLang: string): Promise<string | null> {
  if (!looksFrenchUiText(raw)) return null;
  const translator = await getBrowserTranslator(targetLang);
  if (!translator) return null;
  try {
    const translated = String(await translator.translate(raw) || "").trim();
    return translated && translated !== raw.trim() ? translated : null;
  } catch (error) {
    console.info("[i18n] Browser literal translation failed", error);
    return null;
  }
}

export function createUiLiteralTranslator(dicts: UiDictTable, targetLang: string) {
  const reverse = buildReverseDictionary(dicts, targetLang);

  return (raw: string): string => {
    if (!raw || targetLang === "fr") return raw;

    const lead = raw.match(/^\s*/)?.[0] || "";
    const trail = raw.match(/\s*$/)?.[0] || "";
    const core = normalize(raw);
    if (!core || PROPER_NAME_EXCEPTIONS.has(core)) return raw;

    const dictionaryExact = reverse.get(core);
    if (dictionaryExact != null) return `${lead}${dictionaryExact}${trail}`;

    // English is the universal non-French fallback for hardcoded UI literals.
    // For a language with no exact dictionary match, do not inject French.
    if (targetLang !== "en") {
      const enTranslator = createUiLiteralTranslator(dicts, "en");
      return enTranslator(raw);
    }

    const explicit = EN_EXACT[core];
    if (explicit != null) return `${lead}${explicit}${trail}`;
    if (!FRENCH_SIGNAL.test(core)) return raw;

    let translated = core;
    for (const [pattern, replacement] of EN_FRAGMENT_RULES) {
      translated = translated.replace(pattern, (match) => matchCase(match, replacement));
    }

    return translated === core ? raw : `${lead}${translated}${trail}`;
  };
}

export const UI_LITERAL_SAFETY_EXACT_EN = EN_EXACT;
