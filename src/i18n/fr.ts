// src/i18n/fr.ts
import type { Dict } from "../contexts/LangContext";

export const fr: Dict = {
  // ============================================
  // Dictionnaire FR complet (v1)
  // - Clés à plat : "section.sousSection.clef"
  // - Utilisé par LangContext via DICT["fr"][key]
  // ============================================

  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Accueil",
  "nav.local": "Local",
  "nav.games": "Jeux",
  "nav.training": "Entraînement",
  "nav.online": "En ligne",
  "nav.stats": "Stats",
  "nav.settings": "Réglages",
  "nav.profiles": "Profils",
  "nav.sync": "Sync & partage",
  "nav.back": "Retour",
  "nav.close": "Fermer",

  // -----------------------------
  // GÉNÉRIQUE / COMMUN
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Annuler",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.save": "Enregistrer",
  "common.edit": "Modifier",
  "common.delete": "Supprimer",
  "common.confirm": "Confirmer",
  "common.next": "Suivant",
  "common.prev": "Précédent",
  "common.start": "Commencer",
  "common.continue": "Continuer",
  "common.resume": "Reprendre",
  "common.pause": "Pause",
  "common.reset": "Réinitialiser",
  "common.shuffle": "Aléatoire",
  "common.loading": "Chargement…",
  "common.error": "Une erreur est survenue",
  "common.info": "Infos",
  "common.stats": "Statistiques",
  "common.history": "Historique",
  "common.tutorial": "Tutoriel",
  "common.exit": "Quitter",
  "common.backHome": "Retour à l'accueil",
  "common.player": "Joueur",
  "common.players": "Joueurs",
  "common.team": "Équipe",
  "common.teams": "Équipes",
  "common.points": "Points",
  "common.average": "Moyenne",
  "common.best": "Meilleur",
  "common.worst": "Pire",
  "common.total": "Total",
  "common.date": "Date",
  "common.time": "Heure",

// -----------------------------
// HOME — PAGE + CARTE PROFIL + BANDEAU ARCADE (FR)
// -----------------------------
"home.title": "Dashboard",
"home.subtitle": "Centre de contrôle Darts Counter",
"status.online": "En ligne",
"status.away": "Absent",
"status.offline": "Hors ligne",

// Bandeau haut
"home.welcome": "Bienvenue",
"home.welcome.noProfile": "Bienvenue dans Darts Counter",
"home.hero.tagline": "Prêt à lancer quelques fléchettes ?",

// Carte profil actif
"home.activeProfile.title": "Profil actif",
"home.activeProfile.none": "Aucun profil sélectionné",
"home.activeProfile.select": "Sélectionner un profil",
"home.activeProfile.manage": "Gérer les profils",
"home.activeProfile.status.online": "Connecté",
"home.activeProfile.status.offline": "Hors ligne",
"home.activeProfile.status.guest": "Invité",
"home.activeProfile.badge.you": "Toi",
"home.activeProfile.badge.local": "Local",
"home.activeProfile.badge.online": "Online",

// Stats dans la carte
"home.activeProfile.stats.title": "Stats rapides",
"home.activeProfile.stats.x01Avg": "Moyenne X01",
"home.activeProfile.stats.cricketMpr": "MPR Cricket",
"home.activeProfile.stats.trainingVolume": "Volume training",
"home.activeProfile.stats.lastGame": "Dernier match",
"home.activeProfile.stats.noGames": "Pas encore de match",
"home.activeProfile.stats.seeAll": "Voir toutes les stats",

// Actions rapides
"home.quickActions.title": "Actions rapides",
"home.quickActions.playX01": "Lancer un X01",
"home.quickActions.playCricket": "Lancer un Cricket",
"home.quickActions.training": "Accéder au Training",
"home.quickActions.stats": "Voir les statistiques",

// Carrousel / bandeau de stats
"home.statsCarousel.title": "Stats rapides",
"home.statsCarousel.x01": "X01",
"home.statsCarousel.cricket": "Cricket",
"home.statsCarousel.training": "Training",

// Bandeau arcade (ArcadeTicker)
"home.arcadeBanner.title": "Infos & nouveautés",
"home.arcadeBanner.tapForMore": "Touchez pour en savoir plus",
"home.arcadeBanner.empty": "Aucune info à afficher pour le moment",
"home.arcadeBanner.tag.new": "Nouveau",
"home.arcadeBanner.tag.tip": "Astuce",
"home.arcadeBanner.tag.update": "Mise à jour",

// Gros boutons de navigation
"home.nav.profiles": "Profils",
"home.nav.profiles.desc": "Profils locaux, avatars & BOTS",
"home.nav.local": "Local",
"home.nav.local.desc": "Joue en présentiel sur cette cible",
"home.nav.online": "Online",
"home.nav.online.desc": "Matchs à distance avec tes amis",
"home.nav.training": "Training",
"home.nav.training.desc": "Modules d’entraînement détaillés",
"home.nav.stats": "Stats",
"home.nav.stats.desc": "Dashboards, courbes, historique",
"home.nav.settings": "Réglages",
"home.nav.settings.desc": "Thèmes, langue, reset complet",

  // -----------------------------
  // HOME / DASHBOARD
  // -----------------------------
  // Bandeau arcade / ticker
  "home.ticker.records": "Derniers records",
  "home.ticker.records.text":
    "Plusieurs records battus récemment, continue sur ta lancée !",

  "home.ticker.localLast": "Dernier match local",
  "home.ticker.localLast.text":
    "Résumé du dernier match joué en local.",

  "home.ticker.onlineLast": "Dernier match online",
  "home.ticker.onlineLast.text":
    "Ton dernier duel online est prêt pour la revanche.",

  "home.ticker.onlineLeader": "Leader du classement",
  "home.ticker.onlineLeader.text":
    "Découvre qui est en tête du classement online.",

  "home.ticker.training": "Training du moment",
  "home.ticker.training.text":
    "Total des sessions Training X01 et Tour de l’Horloge.",

  "home.ticker.month": "Stats du mois",
  "home.ticker.month.text":
    "Total des matchs et des hits pour ce mois.",

  "home.ticker.tip": "Astuce du jour",
  "home.ticker.tip.text":
    "Ancre ta finition préférée en la rejouant régulièrement.",

  // -----------------------------
  // GAMES (LISTE DE JEUX LOCAUX)
  // -----------------------------
  "games.title": "Tous les jeux",
  "games.subtitle": "Choisissez un mode de jeu",
  "games.section.classic": "Classiques",
  "games.section.training": "Entraînement",
  "games.section.party": "Fun & party",
  "games.section.other": "Autres modes",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… terminez exactement à 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 à 20 + Bull, ouvrez/fermez et marquez.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Devenez killer et éliminez les autres joueurs.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Un numéro par manche, visez S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Tour de l'horloge",
  "games.training.custom": "Entraînement personnalisé",
  "games.training.evolution": "Stats d'évolution",
  "games.info.title": "Infos jeu",
  "games.info.rules": "Règles",
  "games.info.tips": "Conseils",

  // -----------------------------
  // PROFILS LOCAUX
  // -----------------------------
  "profiles.title": "Profils locaux",
  "profiles.subtitle": "Gérez vos joueurs locaux",
  "profiles.add": "Ajouter un profil",
  "profiles.edit": "Modifier le profil",
  "profiles.delete": "Supprimer le profil",
  "profiles.confirmDelete": "Supprimer définitivement ce profil ?",
  "profiles.name.label": "Nom du joueur",
  "profiles.name.placeholder": "Saisir un pseudo",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Avatar aléatoire",
  "profiles.stats.title": "Stats du profil",
  "profiles.stats.x01": "Stats X01",
  "profiles.stats.cricket": "Stats Cricket",
  "profiles.stats.training": "Stats Training",
  "profiles.status.active": "Actif",
  "profiles.status.inactive": "Inactif",
  "profiles.selectActive": "Définir comme profil actif",
  "profiles.list.empty": "Aucun profil pour l'instant",
  "profiles.list.selectHint": "Touchez un profil pour le sélectionner",
  "profiles.hint.avatarTap": "Touchez le médaillon pour changer l'avatar",

  // -----------------------------
  // AVATAR CREATOR / MÉDAILLONS
  // -----------------------------
  "avatar.title": "Créateur d'avatar",
  "avatar.subtitle": "Personnalisez votre médaillon",
  "avatar.style.label": "Style",
  "avatar.style.realistic": "Réalisme léger",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Exagéré",
  "avatar.theme.label": "Thème",
  "avatar.preview.label": "Aperçu",
  "avatar.generate": "Générer un nouvel avatar",
  "avatar.keep": "Conserver cet avatar",
  "avatar.cancel": "Annuler la modification",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "Paramètres X01",
  "x01.config.subtitle": "Préparez votre partie",
  "x01.config.section.players": "Joueurs",
  "x01.config.section.match": "Format de match",
  "x01.config.section.rules": "Paramètres de base",
  "x01.config.players.add": "Ajouter un joueur",
  "x01.config.players.remove": "Retirer",
  "x01.config.players.teams": "Équipes",
  "x01.config.mode.label": "Mode de jeu",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Équipes",
  "x01.config.raceToSets.label": "Sets gagnants",
  "x01.config.raceToLegs.label": "Legs gagnants",
  "x01.config.startingScore.label": "Score de départ",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Perso",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Simple in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Simple out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Service",
  "x01.config.service.random": "Aléatoire",
  "x01.config.service.alternate": "Alterné",
  "x01.config.bots.title": "BOTS (IA)",
  "x01.config.bots.add": "Ajouter un bot",
  "x01.config.bots.level.easy": "Facile",
  "x01.config.bots.level.medium": "Moyen",
  "x01.config.bots.level.hard": "Difficile",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Lancer la partie",
  "x01.config.back": "Retour aux jeux",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Au tour de",
  "x01.play.scoreRemaining": "Restant",
  "x01.play.lastVisit": "Dernière visite",
  "x01.play.average3": "Moyenne / 3 darts",
  "x01.play.bestVisit": "Meilleure visite",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Fléchettes tirées",
  "x01.play.visits": "Visites",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Annuler la visite",
  "x01.play.confirmExit": "Quitter la partie en cours ?",
  "x01.play.botThinking": "Le bot joue…",
  "x01.play.noScoreYet": "Pas encore de score",
  "x01.play.matchOver": "Match terminé",
  "x01.play.legOver": "Leg terminé",
  "x01.play.setOver": "Set terminé",
  "x01.play.nextLeg": "Leg suivant",
  "x01.play.nextSet": "Set suivant",
  "x01.play.backToConfig": "Retour aux paramètres",
  "x01.play.saveInHistory": "Sauvegarder dans l'historique",

  // -----------------------------
  // CRICKET (JEU + PARAMS)
  // -----------------------------
  "cricket.config.title": "Paramètres Cricket",
  "cricket.config.players": "Joueurs",
  "cricket.config.raceTo.label": "Points ou legs",
  "cricket.config.pointsWin": "Victoire aux points",
  "cricket.config.legsWin": "Victoire aux legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Cibles",
  "cricket.play.hits": "Touches",
  "cricket.play.score": "Score",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Au tour de",
  "cricket.play.open": "Ouvert",
  "cricket.play.closed": "Fermé",
  "cricket.stats.title": "Stats Cricket",
  "cricket.stats.profile": "Profil Cricket",
  "cricket.stats.bestMpr": "Meilleur MPR",
  "cricket.stats.averageMpr": "MPR moyen",
  "cricket.stats.gamesPlayed": "Parties jouées",
  "cricket.stats.gamesWon": "Parties gagnées",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Entraînement",
  "training.menu.subtitle": "Travaillez vos points forts",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Suivi détaillé de chaque fléchette.",
  "training.menu.clock": "Tour de l'horloge",
  "training.menu.clock.desc": "Faites le tour de toutes les cibles.",
  "training.menu.evolution": "Courbe d'évolution",
  "training.menu.evolution.desc": "Visualisez votre progression dans le temps.",
  "training.menu.custom": "Session personnalisée",
  "training.menu.resumeLast": "Reprendre la dernière session",
  "training.menu.noSession": "Aucune session enregistrée pour l'instant",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analyse de chaque fléchette",
  "training.x01.targetScore.label": "Score de départ",
  "training.x01.throws": "Fléchettes tirées",
  "training.x01.hitsBySegment": "Touches par segment",
  "training.x01.hits.single": "Simples",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Moyenne / fléchette",
  "training.x01.session.save": "Enregistrer la session",
  "training.x01.session.saved": "Session sauvegardée",
  "training.x01.session.delete": "Supprimer la session",
  "training.x01.session.confirmDelete":
    "Supprimer définitivement cette session d'entraînement ?",

  // -----------------------------
  // TRAINING CLOCK (TOUR DE L'HORLOGE)
  // -----------------------------
  "training.clock.title": "Tour de l'horloge",
  "training.clock.subtitle": "Touchez chaque numéro dans l'ordre",
  "training.clock.objective.label": "Objectif",
  "training.clock.objective.allSingles": "Tous les simples",
  "training.clock.objective.allDoubles": "Tous les doubles",
  "training.clock.objective.allTriples": "Tous les triples",
  "training.clock.objective.custom": "Parcours personnalisé",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Sans timer",
  "training.clock.timer.30": "30 secondes",
  "training.clock.timer.60": "60 secondes",
  "training.clock.timer.120": "120 secondes",
  "training.clock.players": "Joueurs",
  "training.clock.start": "Démarrer l'entraînement",
  "training.clock.currentTarget": "Cible actuelle",
  "training.clock.progress": "Progrès",
  "training.clock.session.save": "Enregistrer cette session",
  "training.clock.session.saved": "Session de l'horloge sauvegardée",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Centre des statistiques",
  "stats.shell.tabs.local": "Profils locaux",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historique",
  "stats.shell.info": "Choisissez une section de stats.",
  "stats.hub.local.title": "Stats profils locaux",
  "stats.hub.local.selectProfile":
    "Sélectionnez un profil pour voir les stats",
  "stats.hub.training.title": "Stats Training",
  "stats.hub.online.title": "Stats Online",
  "stats.hub.history.title": "Historique des matchs",
  "stats.hub.kpi.avg3": "Moyenne /3 darts",
  "stats.hub.kpi.winRate": "Taux de victoire",
  "stats.hub.kpi.bestLeg": "Meilleur leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Forme récente",
  "stats.hub.radar.skills": "Radar des compétences",
  "stats.hub.training.clock": "Tour de l'horloge",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Volume d'entraînement",
  "stats.hub.empty": "Pas encore de stats disponibles",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Historique des matchs",
  "history.subtitle": "Vos derniers matchs",
  "history.filter.all": "Tous",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Aucun match enregistré pour l'instant",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Entraînement",
  "history.details.title": "Détails du match",
  "history.details.players": "Joueurs",
  "history.details.winner": "Vainqueur",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Moyenne /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Supprimer ce match",
  "history.confirmDelete": "Supprimer définitivement ce match ?",

  // -----------------------------
  // ONLINE / MODE EN LIGNE
  // -----------------------------
  "online.title": "Mode en ligne",
  "online.subtitle": "Jouez avec vos amis à distance",
  "online.login.title": "Connexion",
  "online.login.nickname": "Pseudo",
  "online.login.email": "E-mail (optionnel)",
  "online.login.password": "Mot de passe",
  "online.login.submit": "Se connecter",
  "online.signup.title": "Créer un compte",
  "online.logout": "Se déconnecter",
  "online.profile.title": "Profil en ligne",
  "online.profile.country": "Pays",
  "online.profile.bio": "Bio",
  "online.lobby.title": "Salons X01",
  "online.lobby.create": "Créer un salon",
  "online.lobby.join": "Rejoindre un salon",
  "online.lobby.empty": "Aucun salon disponible pour l'instant",
  "online.friends.title": "Amis",
  "online.friends.add": "Ajouter un ami",
  "online.friends.status.online": "En ligne",
  "online.friends.status.away": "Absent",
  "online.friends.status.offline": "Hors ligne",

  // -----------------------------
  // SETTINGS / RÉGLAGES
  // -----------------------------
  "settings.theme.title": "Thèmes néon",
  "settings.theme.subtitle": "Choisissez votre ambiance",
  "settings.theme.current": "Thème actuel",
  "settings.theme.applied": "Thème appliqué",
  "settings.lang.title": "Langue",
  "settings.lang.subtitle": "Langue de l'application",
  "settings.lang.help": "Les textes de l'interface sont traduits.",
  "settings.section.language": "Langue",
  "settings.section.theme": "Thèmes",
  "settings.section.misc": "Autres réglages",
  "settings.misc.sounds": "Sons",
  "settings.misc.vibrations": "Vibrations",
  "settings.misc.animations": "Animations visuelles",
  "settings.misc.resetApp": "Réinitialiser l'application",
  "settings.misc.resetConfirm":
    "Réinitialiser toutes les données locales (profils, historique, training) ?",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & partage",
  "sync.subtitle": "Sauvegardez et partagez vos données",
  "sync.tabs.local": "Local",
  "sync.tabs.peer": "Device à device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Export local",
  "sync.local.export.desc": "Copiez ce JSON pour le sauvegarder ailleurs.",
  "sync.local.export.button": "Générer l'export",
  "sync.local.import.title": "Import local",
  "sync.local.import.desc":
    "Collez ici un JSON exporté depuis un autre appareil.",
  "sync.local.import.button": "Importer le JSON",
  "sync.local.import.success": "Import réussi",
  "sync.local.import.error": "Import impossible, JSON invalide.",
  "sync.peer.soon": "Sync device-à-device bientôt disponible",
  "sync.cloud.soon": "Sync Cloud bientôt disponible",

  // -----------------------------
  // DIVERS / ÉTIQUETTES
  // -----------------------------
  "label.points": "Points",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Moyenne /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volume",
  "label.duration": "Durée",
  "label.date": "Date",
  "label.mode": "Mode",

    // -----------------------------
  // SETTINGS / RÉGLAGES
  // -----------------------------
  "settings.back": "Retour",
  "settings.title": "Réglages",
  "settings.subtitle":
    "Personnalise le thème et la langue de l'application",

  "settings.theme": "Thème",
  "settings.theme.group.neons": "Néons classiques",
  "settings.theme.group.soft": "Couleurs douces",
  "settings.theme.group.dark": "Thèmes Dark Premium",

  "settings.theme.gold.label": "Gold néon",
  "settings.theme.gold.desc": "Thème premium doré",

  "settings.theme.pink.label": "Rose fluo",
  "settings.theme.pink.desc": "Ambiance arcade rose",

  "settings.theme.petrol.label": "Bleu pétrole",
  "settings.theme.petrol.desc": "Bleu profond néon",

  "settings.theme.green.label": "Vert néon",
  "settings.theme.green.desc": "Style practice lumineux",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Violet / magenta intense",

  "settings.theme.red.label": "Rouge",
  "settings.theme.red.desc": "Rouge arcade agressif",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Orange chaud énergique",

  "settings.theme.white.label": "Blanc",
  "settings.theme.white.desc": "Fond clair moderne",

  "settings.theme.blueOcean.label": "Bleu océan",
  "settings.theme.blueOcean.desc": "Bleu naturel océan / ciel",

  "settings.theme.limeYellow.label": "Vert jaune",
  "settings.theme.limeYellow.desc": "Couleur lime hyper flashy",

  "settings.theme.sage.label": "Vert sauge",
  "settings.theme.sage.desc": "Tons verts naturels et doux",

  "settings.theme.skyBlue.label": "Bleu pastel",
  "settings.theme.skyBlue.desc": "Bleu très doux et lumineux",

  "settings.theme.darkTitanium.label": "Titane sombre",
  "settings.theme.darkTitanium.desc": "Look métal premium mat",

  "settings.theme.darkCarbon.label": "Carbone",
  "settings.theme.darkCarbon.desc": "Ambiance fibre carbone moderne",

  "settings.theme.darkFrost.label": "Givre sombre",
  "settings.theme.darkFrost.desc": "Noir givré futuriste",

  "settings.theme.darkObsidian.label": "Obsidienne",
  "settings.theme.darkObsidian.desc": "Noir poli premium et lisible",

  "settings.lang": "Langue",

  "settings.reset.title": "Réinitialiser l’application",
  "settings.reset.subtitle":
    "Efface tous les profils locaux, BOTS, stats, historique de parties et réglages. Action définitive.",
  "settings.reset.button": "Tout réinitialiser",

  // Noms de langues (FR)
  "lang.fr": "Français",
  "lang.en": "Anglais",
  "lang.es": "Espagnol",
  "lang.de": "Allemand",
  "lang.it": "Italien",
  "lang.pt": "Portugais",
  "lang.nl": "Néerlandais",
  "lang.ru": "Russe",
  "lang.zh": "Chinois",
  "lang.ja": "Japonais",
  "lang.ar": "Arabe",
  "lang.hi": "Hindi",
  "lang.tr": "Turc",
  "lang.da": "Danois",
  "lang.no": "Norvégien",
  "lang.sv": "Suédois",
  "lang.is": "Islandais",
  "lang.pl": "Polonais",
  "lang.ro": "Roumain",
  "lang.sr": "Serbe",
  "lang.hr": "Croate",
  "lang.cs": "Tchèque",
};
