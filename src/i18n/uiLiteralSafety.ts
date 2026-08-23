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

  // Residual literals found by the V7(13) full-source audit.
  "FIN DU MATCH": "END OF MATCH",
  "Fin du match": "End of match",
  "Afficher tous les jeux": "Show all games",
  "Afficher seulement": "Show only",
  "Afficher les filtres": "Show filters",
  "Changer la couverture": "Change cover",
  "Nouveau nom du groupe": "New group name",
  "Comparer les stats": "Compare stats",
  "Simuler le tournoi": "Simulate tournament",
  "Les prochains matchs jouables.": "Next playable matches.",
  "Les prochains matchs jouables": "Next playable matches",
  "Affiner la main": "Refine hand",
  "Valide le showdown": "Confirm showdown",
  "Profil local": "Local profile",
  "Résumé": "Summary",
  "Détails": "Details",
  "Année": "Year",
  "Résultats": "Results",
  "Évolution": "Trend",
  "Meilleur score": "Best score",
  "Score de départ": "Starting score",
  "Mode de jeu préféré": "Favorite game mode",
  "Difficulté IA": "AI difficulty",
  "Débutant": "Beginner",
  "débutant": "beginner",
  "Intermédiaire": "Intermediate",
  "intermédiaire": "intermediate",
  "Difficile": "Hard",
  "difficile": "hard",
  "Facile": "Easy",
  "facile": "easy",
  "Légende": "Legend",
  "légende": "legend",
  "Confirmé": "Advanced",
  "confirmé": "advanced",
  "Défaut": "Default",
  "Niveau": "Level",
  "Nom": "Name",
  "Téléphone": "Phone",
  "Actualité": "News",
  "Nouvelle partie": "New match",
  "Adresse email": "Email address",
  "Repêchage": "Repechage",
  "Score cible": "Target score",
  "À proximité": "Nearby",
  "Créer une équipe": "Create a team",
  "Liste équipes": "Team list",
  "Nom du tournoi": "Tournament name",
  "Score final": "Final score",
  "Période": "Period",
  "Événements": "Events",
  "Personnalisé": "Custom",
  "Personnalisée": "Custom",
  "Mettre à jour": "Update",
  "Nouveau mot de passe": "New password",
  "Nom de l’équipe": "Team name",
  "Nom d’équipe requis.": "Team name required.",
  "Nom de profil requis.": "Profile name required.",
  "Région": "Region",
  "Région / Département": "Region / Department",
  "Joueurs sélectionnés": "Selected players",
  "Équipes existantes": "Existing teams",
  "Résultat": "Result",
  "Résurrection": "Resurrection",
  "Publicité": "Advertising",
  "Préparation de la sauvegarde…": "Preparing backup…",
  "Fichier de sauvegarde": "Backup file",
  "Fichier configuré": "File configured",
  "Fichier invalide": "Invalid file",
  "Erreur inconnue": "Unknown error",
  "Choisir un fichier": "Choose a file",
  "Choisir un avatar": "Choose an avatar",
  "Choisir un mode": "Choose a mode",
  "Choisir une couverture": "Choose a cover",
  "Choisir équipe": "Choose team",
  "Choisir...": "Choose...",
  "Choisir langue": "Choose language",
  "Choix de sport": "Sport selection",
  "Méthode de saisie": "Input method",
  "Mode de saisie": "Input mode",
  "Score moyen": "Average score",
  "Score total": "Total score",
  "Score cumulé": "Cumulative score",
  "Points marqués": "Points scored",
  "Matchs joués": "Matches played",
  "Partie terminée": "Match finished",
  "Fin de partie": "End of match",
  "Pays du joueur": "Player country",
  "Profil": "Profile",
  "JOUEUR": "PLAYER",
  "JOUEURS": "PLAYERS",
  "ÉQUIPE": "TEAM",
  "ÉQUIPES": "TEAMS",
  "Équipe A": "Team A",
  "Équipe B": "Team B",
  "Victoires": "Wins",
  "Défaites": "Losses",
  "Égalité": "Draw",
  "Mènes": "Ends",
  "Flèches": "Darts",
  "CIBLE": "TARGET",
  "Démarrer la partie": "Start match",
  "LANCER LA PARTIE": "START MATCH",
  "Aucune donnée": "No data",
  "Aucune donnée.": "No data.",
  "Aucun joueur": "No player",
  "Aucun profil.": "No profile.",
  "Match nul": "Draw",
  "Tous matchs": "All matches",
  "TOUS": "ALL",
  "TOUTES": "ALL",
  "Tous": "All",
  "Toutes": "All",
  "Jeux": "Games",
  "Autres jeux": "Other games",
  "Tournoi": "Tournament",
  "TOURNOI": "TOURNAMENT",
  "Amis": "Friends",
  "Ami": "Friend",
  "Envoyer": "Send",
  "Ouvrir": "Open",
  "Les mots de passe ne correspondent pas.": "Passwords do not match.",
  "Nom de la ligue": "League name",
  "Nom du club": "Club name",
  "Premier Fuyard": "First Runner",
  "Premier double": "First double",
  "Dernier double": "Last double",
  "Comprendre les valeurs": "Understand the values",
  "Caster sur un appareil": "Cast to a device",
  "Ouvrir Awena": "Open Awena",
  "Me rendre disponible": "Make me available",
  "Publier une recherche": "Post a search",
  "Publier une actu": "Post an update",
  "Temps de jeu": "Playing time",
  "Photos de match": "Match photos",
  "Feuilles de match": "Match sheets",
  "Mettre corbeille": "Move to trash",
  "Scanner un QR": "Scan a QR code",
  "Masquer liste": "Hide list",
  "Score restant": "Remaining score",
  "Confirmer le score": "Confirm score",
  "Valide ou corrige le score": "Confirm or correct the score",
  "COMPOSITION DES CAMPS": "TEAM COMPOSITION",
  "Buts / match": "Goals / match",
  "SAISIE SCORE": "SCORE INPUT",
  "tous sets confondus": "across all sets",
};

// Rules are deliberately ordered from the most specific phrases to generic words.
// They cover dynamic strings that cannot be exact-matched (counts, names, scores...).
const EN_FRAGMENT_RULES: Array<[RegExp, string]> = [
  [/\bconfiguration guidée\b/gi, "guided setup"],
  [/\bconfiguration complète\b/gi, "full setup"],
  [/\bafficher tous les jeux\b/gi, "show all games"],
  [/\bafficher seulement\b/gi, "show only"],
  [/\bafficher les filtres\b/gi, "show filters"],
  [/\bchanger la couverture\b/gi, "change cover"],
  [/\bnouveau nom du groupe\b/gi, "new group name"],
  [/\bsimuler le tournoi\b/gi, "simulate tournament"],
  [/\bprochains matchs jouables\b/gi, "next playable matches"],
  [/\baffiner la main\b/gi, "refine hand"],
  [/\bvalide le showdown\b/gi, "confirm showdown"],
  [/\bcomparer les stats\b/gi, "compare stats"],
  [/\bfin du match\b/gi, "end of match"],
  [/\bmeilleur score\b/gi, "best score"],
  [/\bscore de départ\b/gi, "starting score"],
  [/\bmode de jeu préféré\b/gi, "favorite game mode"],
  [/\bdifficulté ia\b/gi, "AI difficulty"],
  [/\bnouvelle partie\b/gi, "new match"],
  [/\bnouveau mot de passe\b/gi, "new password"],
  [/\badresse email\b/gi, "email address"],
  [/\bnom du tournoi\b/gi, "tournament name"],
  [/\bnom de l[’']équipe\b/gi, "team name"],
  [/\bprofil local\b/gi, "local profile"],
  [/\bjoueurs sélectionnés\b/gi, "selected players"],
  [/\béquipes existantes\b/gi, "existing teams"],
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
  [/\baléatoire\b/gi, "random"],
  [/\béliminé(?:e|es|s)?\b/gi, "eliminated"],
  [/\bélimination\b/gi, "elimination"],
  [/\bréinitialiser\b/gi, "reset"],
  [/\bconnecté(?:e|es|s)?\b/gi, "connected"],
  [/\bcumulé(?:e|es|s)?\b/gi, "cumulative"],
  [/\bafficher\b/gi, "show"],
  [/\bintensité\b/gi, "intensity"],
  [/\brafraîchir\b/gi, "refresh"],
  [/\bsécurité\b/gi, "safety"],
  [/\bgagné(?:e|es|s)?\b/gi, "won"],
  [/\bremporté(?:e|es|s)?\b/gi, "won"],
  [/\brécupération\b/gi, "recovery"],
  [/\breçue(?:s)?\b/gi, "received"],
  [/\benvoyé(?:e|es|s)?\b/gi, "sent"],
  [/\bprénom\b/gi, "first name"],
  [/\brécapitulatif\b/gi, "summary"],
  [/\brépondre\b/gi, "reply"],
  [/\bse déconnecter\b/gi, "sign out"],
  [/\btélécharger\b/gi, "download"],
  [/\bvalidé(?:e|es|s)?\b/gi, "confirmed"],
  [/\bcaméra locale\b/gi, "local camera"],
  [/\bbientôt disponible\b/gi, "coming soon"],
  [/\bà venir\b/gi, "coming soon"],
  [/\bà définir\b/gi, "to be defined"],
  [/\bà planifier\b/gi, "to schedule"],
  [/\bpièce jointe\b/gi, "attachment"],
  [/\bactions spéciales\b/gi, "special actions"],
  [/\bbonus bouclier\b/gi, "shield bonus"],
  [/\bcases spéciales\b/gi, "special cells"],
  [/\bcalibration caméra\b/gi, "camera calibration"],
  [/\bfléchettes jouées\b/gi, "darts thrown"],
  [/\bmanches jouées\b/gi, "rounds played"],
  [/\btours joués\b/gi, "rounds played"],
  [/\bmatch partagé\b/gi, "shared match"],
  [/\bpartie partagée\b/gi, "shared match"],
  [/\butilisateur non connecté\b/gi, "user not signed in"],
  [/\brésumé\b/gi, "summary"],
  [/\bdétails\b/gi, "details"],
  [/\bannée\b/gi, "year"],
  [/\brésultats\b/gi, "results"],
  [/\bévolution\b/gi, "trend"],
  [/\bdébutant\b/gi, "beginner"],
  [/\bintermédiaire\b/gi, "intermediate"],
  [/\bdifficile\b/gi, "hard"],
  [/\bfacile\b/gi, "easy"],
  [/\blégende\b/gi, "legend"],
  [/\bconfirmé\b/gi, "advanced"],
  [/\bdéfaut\b/gi, "default"],
  [/\btéléphone\b/gi, "phone"],
  [/\bactualité\b/gi, "news"],
  [/\brepêchage\b/gi, "repechage"],
  [/\bà proximité\b/gi, "nearby"],
  [/\bpériode\b/gi, "period"],
  [/\bévénements\b/gi, "events"],
  [/\bpersonnalisé(?:e|es|s)?\b/gi, "custom"],
  [/\bmettre à jour\b/gi, "update"],
  [/\brésurrection\b/gi, "resurrection"],
  [/\bpublicité\b/gi, "advertising"],
  [/\brégion\b/gi, "region"],
  [/\bméthode de saisie\b/gi, "input method"],
  [/\bmode de saisie\b/gi, "input mode"],
  [/\bmatch nul\b/gi, "draw"],
  [/\btous matchs\b/gi, "all matches"],
  [/\bautres jeux\b/gi, "other games"],
  [/\btournoi\b/gi, "tournament"],
  [/\bjeux\b/gi, "games"],
  [/\bamis\b/gi, "friends"],
  [/\bami\b/gi, "friend"],
  [/\benvoyer\b/gi, "send"],
  [/\bouvrir\b/gi, "open"],
  [/\bmots de passe\b/gi, "passwords"],
  [/\bnom de la ligue\b/gi, "league name"],
  [/\bnom du club\b/gi, "club name"],
  [/\bpremier fuyard\b/gi, "first runner"],
  [/\bpremier double\b/gi, "first double"],
  [/\bdernier double\b/gi, "last double"],
  [/\bcomprendre les valeurs\b/gi, "understand the values"],
  [/\bcaster sur un appareil\b/gi, "cast to a device"],
  [/\bpublier une recherche\b/gi, "post a search"],
  [/\bpublier une actu\b/gi, "post an update"],
  [/\btemps de jeu\b/gi, "playing time"],
  [/\bphotos de match\b/gi, "match photos"],
  [/\bfeuilles de match\b/gi, "match sheets"],
  [/\bmettre corbeille\b/gi, "move to trash"],
  [/\bmasquer liste\b/gi, "hide list"],
  [/\bscore restant\b/gi, "remaining score"],
  [/\bconfirmer le score\b/gi, "confirm score"],
  [/\bvalide ou corrige le score\b/gi, "confirm or correct the score"],
  [/\bcomposition des camps\b/gi, "team composition"],
  [/\bbuts\b/gi, "goals"],
  [/\bsaisie score\b/gi, "score input"],
  [/\btous sets confondus\b/gi, "across all sets"],
  [/\btous\b/gi, "all"],
  [/\btoutes\b/gi, "all"],
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

const FRENCH_SIGNAL = /[àâäçéèêëîïôöùûüœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]|\b(?:retour|fermer|annuler|valider|suivant|précédent|joueur|joueurs|équipe|équipes|partie|parties|manche|manches|volée|volées|fléchette|fléchettes|règles|objectif|cible|cibles|victoire|victoires|défaite|défaites|vainqueur|statistiques|historique|profil|profils|préférences|paramètres|réglages|langue|thème|compte|sauvegarde|connexion|déconnexion|chargement|erreur|impossible|sélection|choisir|créer|supprimer|modifier|ajouter|démarrer|lancer|arrêter|reprendre|continuer|quitter|aucun|aucune|durée|moyenne|meilleur|meilleure|série|réussite|échec|raté|terminé|fumée|feu|menace|territoire|afficher|changer|nouveau|nouvelle|seulement|simuler|prochain|prochains|couverture|groupe|résumé|détails|année|résultats|évolution|débutant|intermédiaire|difficile|facile|légende|confirmé|défaut|téléphone|actualité|repêchage|proximité|période|événements|personnalisé|publicité|région|méthode|mot de passe|adresse email|aléatoire|éliminé|élimination|réinitialiser|connecté|cumulé|intensité|rafraîchir|sécurité|gagné|remporté|récupération|reçue|envoyé|prénom|récapitulatif|répondre|télécharger|validé|caméra|bientôt|définir|planifier|pièce jointe|actions spéciales|calibration|jouées|partagé|utilisateur|tournoi|jeux|amis|ami|envoyer|ouvrir|mots de passe|nom|publier|recherche|temps|feuilles|mettre|corbeille|masquer|liste|restant|confirmer|valide|corrige|camps|buts|saisie|tous|toutes|comprendre|valeurs|appareil|membres|messagerie|groupes|retirer|assigne|clique)\b/i;

const PROPER_NAME_EXCEPTIONS = new Set([
  "Auvergne-Rhône-Alpes",
  "Île-de-France",
  "Provence-Alpes-Côte d’Azur",
  "Provence-Alpes-Côte d'Azur",
  "Pays de la Loire",
  "Hauts-de-France",
  "Pétanque",
  "PÉTANQUE",
  "pétanque",
  "Mölkky",
  "MÖLKKY",
  "mölkky",
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

// JavaScript \b is ASCII-oriented: it does not see É/À/Ç as normal word
// characters. Convert boundary-based rules to Unicode letter/number boundaries
// so existing rules work for both "Equipe" and "Équipe".
const unicodeRuleCache = new WeakMap<RegExp, RegExp>();
function unicodeWordPattern(pattern: RegExp): RegExp {
  const cached = unicodeRuleCache.get(pattern);
  if (cached) return cached;
  const boundaryCount = (pattern.source.match(/\\b/g) || []).length;
  if (!boundaryCount) {
    unicodeRuleCache.set(pattern, pattern);
    return pattern;
  }
  let seen = 0;
  const source = pattern.source.replace(/\\b/g, () => {
    seen += 1;
    return seen === 1
      ? "(?<![\\p{L}\\p{N}_])"
      : "(?![\\p{L}\\p{N}_])";
  });
  const flags = pattern.flags.includes("u") ? pattern.flags : `${pattern.flags}u`;
  const converted = new RegExp(source, flags);
  unicodeRuleCache.set(pattern, converted);
  return converted;
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

function buildCaseInsensitiveMap(source: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  source.forEach((value, key) => {
    const lowered = normalize(key).toLocaleLowerCase("fr");
    if (!out.has(lowered)) out.set(lowered, value);
  });
  return out;
}

const EN_EXACT_CI = new Map<string, string>();
for (const [source, target] of Object.entries(EN_EXACT)) {
  const key = normalize(source).toLocaleLowerCase("fr");
  if (!EN_EXACT_CI.has(key)) EN_EXACT_CI.set(key, target);
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
  const reverseCi = buildCaseInsensitiveMap(reverse);

  return (raw: string): string => {
    if (!raw || targetLang === "fr") return raw;

    const lead = raw.match(/^\s*/)?.[0] || "";
    const trail = raw.match(/\s*$/)?.[0] || "";
    const core = normalize(raw);
    if (!core || PROPER_NAME_EXCEPTIONS.has(core)) return raw;

    const dictionaryExact = reverse.get(core);
    if (dictionaryExact != null) return `${lead}${dictionaryExact}${trail}`;
    const dictionaryCi = reverseCi.get(core.toLocaleLowerCase("fr"));
    if (dictionaryCi != null) return `${lead}${matchCase(core, dictionaryCi)}${trail}`;

    // English is the universal non-French fallback for hardcoded UI literals.
    // For a language with no exact dictionary match, do not inject French.
    if (targetLang !== "en") {
      const enTranslator = createUiLiteralTranslator(dicts, "en");
      return enTranslator(raw);
    }

    const explicit = EN_EXACT[core];
    if (explicit != null) return `${lead}${explicit}${trail}`;
    const explicitCi = EN_EXACT_CI.get(core.toLocaleLowerCase("fr"));
    if (explicitCi != null) return `${lead}${matchCase(core, explicitCi)}${trail}`;
    if (!FRENCH_SIGNAL.test(core)) return raw;

    let translated = core;
    for (const [pattern, replacement] of EN_FRAGMENT_RULES) {
      const safePattern = unicodeWordPattern(pattern);
      translated = translated.replace(safePattern, (match) => matchCase(match, replacement));
    }

    return translated === core ? raw : `${lead}${translated}${trail}`;
  };
}

export const UI_LITERAL_SAFETY_EXACT_EN = EN_EXACT;
