import type { AwenaAction, AwenaReply } from "./awena.types";

export type AwenaAtlasReply = AwenaReply & { knowledgeTopic: string };

type AtlasEntry = {
  id: string;
  title: string;
  aliases: string[];
  keywords?: string[];
  text: string;
  route?: string;
  routeLabel?: string;
  related?: Array<{ label: string; prompt: string }>;
};

const STOP = new Set([
  "a","ai","au","aux","avec","ce","ces","cette","cest","ca","de","des","du","dans","et","est","il","elle","en","je","la","le","les","ma","mais","me","mes","mon","ne","nous","on","ou","pour","que","quel","quelle","quels","quelles","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre","y",
  "comment","pourquoi","faire","sert","signifie","veut","dire","explique","expliquer","moi","peux","peut","possible"
]);

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9%+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return norm(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token));
}

function navigate(id: string, label: string, route: string): AwenaAction {
  return { id: `atlas-nav-${id}`, label, kind: "navigate", route };
}

function ask(id: string, label: string, prompt: string): AwenaAction {
  return { id: `atlas-ask-${id}`, label, kind: "ask", prompt };
}

function actions(entry: AtlasEntry): AwenaAction[] | undefined {
  const result: AwenaAction[] = [];
  if (entry.route && entry.routeLabel) result.push(navigate(entry.id, entry.routeLabel, entry.route));
  for (const item of entry.related || []) result.push(ask(`${entry.id}-${result.length}`, item.label, item.prompt));
  return result.length ? result.slice(0, 4) : undefined;
}

const E: AtlasEntry[] = [
  {
    id: "account",
    title: "Compte utilisateur",
    aliases: ["compte", "mon compte", "compte utilisateur", "account", "connexion compte"],
    keywords: ["compte","connexion","email","securite"],
    text: `## COMPTE
Le **compte** sert à rattacher l'identité connectée aux fonctions en ligne et aux données légères de l'application.

## CE QU'IL FAUT DISTINGUER
- **Compte** : identité de connexion.
- **Profil joueur** : identité utilisée pour jouer.
- **Stockage** : emplacement où les données et sauvegardes sont conservées.

## DANS RÉGLAGES
La page Compte regroupe notamment le profil connecté, les notifications, la sécurité, les fonctions de confidentialité et les opérations sensibles.

> Ne confonds pas supprimer un profil joueur avec supprimer le compte connecté.`,
    route: "settings", routeLabel: "Ouvrir Réglages",
    related: [
      { label: "Compte ou profil ?", prompt: "Quelle différence entre mon compte et mon profil joueur ?" },
      { label: "Sécurité", prompt: "Explique-moi les réglages de sécurité du compte." },
    ],
  },
  {
    id: "password",
    title: "Mot de passe",
    aliases: ["mot de passe", "password", "changer mot de passe", "voir mot de passe"],
    text: `## MOT DE PASSE
Le mot de passe protège le compte connecté.

## BONNES PRATIQUES
- utilise un mot de passe unique ;
- ne le partage jamais dans un chat ou une capture publique ;
- utilise l'icône d'affichage uniquement dans un environnement privé ;
- si tu suspectes un accès non autorisé, change-le puis vérifie les sessions et réglages de sécurité.

> La fiche **Mon profil** peut afficher les préférences du compte, mais les opérations d'authentification restent distinctes des données de jeu.`,
    route: "settings", routeLabel: "Ouvrir Compte",
  },
  {
    id: "privacy",
    title: "Confidentialité",
    aliases: ["confidentialite", "vie privee", "privacy", "mes droits", "mes donnees personnelles", "rgpd"],
    keywords: ["confidentialite","donnees","droits","compte"],
    text: `## CONFIDENTIALITÉ
Les réglages de confidentialité regroupent les informations sur le traitement des données, les droits de l'utilisateur et les actions de gestion du compte.

## CE QUE TU PEUX Y TROUVER
- politique de confidentialité ;
- informations sur tes droits et tes données ;
- suppression du compte ;
- contact confidentialité.

> Pour une suppression ou une restauration importante, vérifie d'abord que tu disposes d'une sauvegarde exploitable.`,
    route: "settings", routeLabel: "Ouvrir Confidentialité",
  },
  {
    id: "delete-account",
    title: "Suppression du compte",
    aliases: ["supprimer mon compte", "suppression compte", "effacer compte", "delete account"],
    text: `## SUPPRESSION DU COMPTE
La suppression du compte est une opération différente du nettoyage de l'historique local.

## AVANT DE CONFIRMER
- vérifie ce qui est stocké localement et dans le cloud ;
- exporte une sauvegarde si tu veux conserver tes données ;
- lis la confirmation affichée par l'application ;
- ne confonds pas **reset local**, **suppression des historiques** et **suppression du compte**.

> Une suppression de compte peut être irréversible selon les données concernées.`,
    route: "settings", routeLabel: "Ouvrir Compte",
  },
  {
    id: "notifications",
    title: "Notifications",
    aliases: ["notifications", "notification", "alertes", "push"],
    text: `## NOTIFICATIONS
Les notifications servent à attirer ton attention sur certains événements de l'application ou du compte lorsque la fonction correspondante est activée.

## CONSEIL
Si tu ne reçois rien, vérifie à la fois :
- le réglage dans l'application ;
- l'autorisation Android ;
- les restrictions batterie / arrière-plan éventuelles.`,
    route: "settings", routeLabel: "Ouvrir Réglages",
  },
  {
    id: "language",
    title: "Langues",
    aliases: ["langue", "langues", "changer langue", "language", "traduction application"],
    keywords: ["langue","interface","traduction"],
    text: `## LANGUE DE L'APPLICATION
La langue choisie dans **Réglages > Langues** pilote l'interface.

## AWENA
Awena suit désormais cette langue sur Android : la question est ramenée vers sa base de connaissances, puis sa réponse est traduite localement vers la langue choisie. Pour le français, elle conserve sa voix neuronale stable ; pour les autres langues, elle utilise une voix Android compatible avec la langue.

## IMPORTANT
Le premier usage d'une nouvelle langue peut nécessiter le téléchargement local d'un modèle de traduction. Après installation du modèle, la traduction s'effectue sur l'appareil.`,
    route: "settings", routeLabel: "Ouvrir Langues",
  },
  {
    id: "theme",
    title: "Thèmes",
    aliases: ["theme", "themes", "couleur", "neon", "apparence"],
    keywords: ["theme","neon","couleur","apparence"],
    text: `## THÈMES
Les thèmes modifient surtout les **accents néon, bordures, halos et textes** tout en conservant une base sombre cohérente.

## UTILISATION
Dans Réglages, choisis un pack puis prévisualise un thème avant de l'appliquer. La préférence peut être liée au profil selon les réglages de synchronisation actifs.`,
    route: "settings", routeLabel: "Ouvrir Thèmes",
  },
  {
    id: "intro",
    title: "Intro de démarrage",
    aliases: ["intro", "animation intro", "musique intro", "intro musicale", "demarrage application"],
    text: `## INTRO
Le réglage **INTRO** contrôle l'animation et la musique jouées au lancement.

## ON
L'animation et sa musique sont jouées.

## OFF
L'application arrive directement sur la sélection des jeux sans lire l'intro.

> Ce réglage évite de subir l'intro à chaque lancement tout en permettant de la réactiver quand tu veux.`,
    route: "settings", routeLabel: "Ouvrir INTRO",
  },
  {
    id: "ads",
    title: "Publicité",
    aliases: ["publicite", "pub", "admob", "annonce", "banniere", "interstitiel"],
    keywords: ["publicite","admob","banniere","consentement"],
    text: `## PUBLICITÉ
L'application peut afficher des **bannières** et des publicités de fin de partie selon la configuration AdMob et le consentement utilisateur.

## ÉCRANS
La section Publicité sépare les paramètres de bannières, de fin de partie et d'intégration Android AdMob.

## AWENA
Quand le panneau de discussion d'Awena est ouvert, les bannières natives inline sont suspendues afin de ne pas traverser le chat.`,
    route: "settings", routeLabel: "Ouvrir Publicité",
  },
  {
    id: "consent-ads",
    title: "Consentement publicitaire",
    aliases: ["consentement pub", "consentement publicitaire", "ump", "privacy ads"],
    text: `## CONSENTEMENT PUBLICITAIRE
Le consentement publicitaire sert à gérer les choix de confidentialité liés aux annonces lorsqu'ils sont requis.

## À RETENIR
Le consentement est distinct du simple bouton ON/OFF d'une bannière : il concerne les choix autorisés pour la personnalisation et l'utilisation publicitaire selon la plateforme.`,
    route: "settings", routeLabel: "Ouvrir Publicité",
  },
  {
    id: "storage-local",
    title: "Stockage local",
    aliases: ["stockage local", "donnees locales", "indexeddb", "appareil", "local storage"],
    keywords: ["stockage","local","historique","appareil"],
    text: `## STOCKAGE LOCAL
Le stockage local conserve les données nécessaires directement sur l'appareil / dans la base locale de l'application.

## AVANTAGES
- fonctionnement rapide ;
- disponibilité hors ligne pour les données déjà présentes ;
- pas de dépendance réseau pour chaque action.

## LIMITE
Une donnée uniquement locale peut être perdue si l'application est effacée ou si l'appareil est remplacé sans sauvegarde.`,
    route: "settings", routeLabel: "Ouvrir Stockage",
  },
  {
    id: "storage-cloud",
    title: "Stockage cloud",
    aliases: ["stockage cloud", "cloud", "quota cloud", "espace cloud", "r2"],
    keywords: ["stockage","cloud","quota","r2"],
    text: `## STOCKAGE CLOUD
Le stockage cloud permet de conserver certains objets ou sauvegardes hors de l'appareil lorsque le compte et l'offre correspondante le permettent.

## DANS L'APPLICATION
La page Stockage & abonnements permet de vérifier la destination, le quota, l'état du service et les formules disponibles.

> Supabase reste utilisé principalement pour l'authentification et des données légères, tandis que les gros objets/sauvegardes peuvent suivre une autre destination.`,
    route: "settings", routeLabel: "Ouvrir Stockage",
  },
  {
    id: "r2",
    title: "Cloudflare R2",
    aliases: ["r2", "cloudflare r2", "backup r2", "sauvegarde r2"],
    keywords: ["cloudflare","r2","backup","cloud"],
    text: `## CLOUDFLARE R2
R2 est une destination de stockage objet utilisée par certaines fonctions cloud de MULTISPORTS SCORING.

## À QUOI IL SERT
Il peut stocker des sauvegardes ou médias lorsque la fonction et le niveau de stockage associés sont activés.

## PRÉCAUTION
Avant de restaurer depuis R2, vérifie la date et la source du snapshot. Avant d'envoyer de gros médias, vérifie aussi le quota et la formule active.`,
    route: "settings", routeLabel: "Ouvrir Stockage",
  },
  {
    id: "nas",
    title: "NAS",
    aliases: ["nas", "serveur nas", "backup nas", "sauvegarde nas", "push nas", "pull nas"],
    keywords: ["nas","backup","synchronisation","serveur"],
    text: `## NAS
Le NAS est une destination de sauvegarde / synchronisation distincte du stockage local et du cloud public.

## ACTIONS
- **Push** : envoyer les données vers le NAS.
- **Pull / Reload** : récupérer les données depuis le NAS.
- **Comparaison** : vérifier les écarts local / distant selon l'outil disponible.

> Avant un Pull ou une restauration, fais une sauvegarde de sécurité si tes données locales sont importantes.`,
    route: "settings", routeLabel: "Ouvrir Réglages NAS",
  },
  {
    id: "backup",
    title: "Sauvegardes",
    aliases: ["sauvegarde", "backup", "faire une sauvegarde", "exporter donnees", "snapshot"],
    keywords: ["sauvegarde","backup","export","snapshot"],
    text: `## SAUVEGARDE
Une sauvegarde sert à créer un état réutilisable de tes données avant une perte, un changement d'appareil ou une opération risquée.

## BON RÉFLEXE
1. crée la sauvegarde ;
2. vérifie sa date et sa destination ;
3. conserve au moins une copie indépendante si les données sont importantes ;
4. restaure seulement après avoir identifié la bonne source.

## DESTINATIONS
Selon la configuration : appareil/local, cloud, R2 ou NAS.`,
    route: "settings", routeLabel: "Ouvrir Sauvegardes",
  },
  {
    id: "restore",
    title: "Restauration",
    aliases: ["restaurer", "restauration", "restore", "import sauvegarde", "recuperer sauvegarde"],
    keywords: ["restauration","restore","backup","import"],
    text: `## RESTAURATION
Restaurer signifie remplacer ou reconstruire des données locales à partir d'une sauvegarde.

## AVANT
- vérifie la date du fichier / snapshot ;
- identifie clairement sa provenance ;
- si possible, sauvegarde l'état actuel avant d'écraser quoi que ce soit.

## APRÈS
L'application peut devoir recharger certains caches ou écrans pour relire les données restaurées.`,
    route: "settings", routeLabel: "Ouvrir Sauvegardes",
  },
  {
    id: "sync",
    title: "Synchronisation",
    aliases: ["synchronisation", "synchroniser", "sync", "donnees synchronisees", "push pull"],
    keywords: ["sync","synchronisation","local","cloud"],
    text: `## SYNCHRONISATION
La synchronisation maintient plusieurs emplacements cohérents. Ce n'est pas exactement la même chose qu'une sauvegarde ponctuelle.

## DIFFÉRENCE
- **Sauvegarde** : photographie de sécurité.
- **Synchronisation** : propagation d'un état entre plusieurs emplacements.

> Si l'application signale des modifications locales non synchronisées, évite une restauration distante avant d'avoir vérifié ce qui doit être conservé.`,
    route: "settings", routeLabel: "Ouvrir Synchronisation",
  },
  {
    id: "storage-plan",
    title: "Abonnements de stockage",
    aliases: ["abonnement stockage", "formule stockage", "quota", "premium stockage", "stripe stockage"],
    keywords: ["abonnement","stockage","quota","stripe"],
    text: `## STOCKAGE & ABONNEMENTS
Les offres de stockage déterminent l'espace cloud ou les fonctions associées disponibles pour le compte.

## AVANT D'ACHETER
- vérifie le quota proposé ;
- regarde la destination réellement utilisée ;
- distingue stockage de données et autres achats de personnalisation ;
- contrôle l'état du paiement avant de conclure que le quota est actif.`,
    route: "settings", routeLabel: "Ouvrir Stockage",
  },
  {
    id: "profiles-local",
    title: "Profils locaux",
    aliases: ["profils locaux", "joueur local", "creer profil", "modifier profil", "profil joueur"],
    keywords: ["profil","local","joueur","avatar"],
    text: `## PROFILS LOCAUX
Les profils locaux représentent les vrais joueurs utilisés dans les parties sur l'appareil.

## ILS PEUVENT CENTRALISER
- nom et avatar ;
- pays / identité ;
- préférences ;
- DartSets ;
- historique et statistiques lorsque les parties sont correctement rattachées.

> Le profil actif de l'application n'est pas forcément le joueur actif d'une partie.`,
    route: "profiles", routeLabel: "Ouvrir Profils",
  },
  {
    id: "avatar",
    title: "Avatars",
    aliases: ["avatar", "photo profil", "image joueur", "medaillon"],
    keywords: ["avatar","profil","image","medaillon"],
    text: `## AVATAR
L'avatar est l'identité visuelle d'un profil ou d'un BOT.

## UTILISATION
Il apparaît notamment dans les cartes joueurs, carrousels, parties et statistiques.

## CONSEIL
Utilise une image suffisamment lisible dans un médaillon circulaire et évite les détails importants trop proches des bords.`,
    route: "profiles", routeLabel: "Ouvrir Profils",
  },
  {
    id: "dartsets",
    title: "Sets de fléchettes",
    aliases: ["dartset", "dartsets", "mes flechettes", "set de flechettes", "flechettes joueur"],
    keywords: ["dartset","flechettes","profil","equipement"],
    text: `## DARTSETS
Les DartSets représentent les sets de fléchettes associés aux joueurs.

## À QUOI ÇA SERT
Ils permettent de personnaliser l'équipement affiché et de conserver des informations visuelles ou techniques liées au joueur.

> Un DartSet appartient à la personnalisation du profil ; ce n'est pas une règle de jeu.`,
    route: "profiles", routeLabel: "Ouvrir Profils",
  },
  {
    id: "teams",
    title: "Équipes",
    aliases: ["equipe", "equipes", "creer equipe", "team", "jouer en equipe"],
    keywords: ["equipe","joueurs","composition","team"],
    text: `## ÉQUIPES
Une équipe regroupe plusieurs profils lorsqu'un mode prend en charge le jeu collectif.

## IMPORTANT
Tous les modes ne supportent pas les équipes. Awena vérifie cette capacité dans le registre du mode lorsqu'elle est disponible.

## CONFIGURATION
Quand le mode accepte les équipes, compose les camps avant de lancer la partie puis vérifie l'ordre des joueurs.`,
    route: "profiles", routeLabel: "Ouvrir Profils",
  },
  {
    id: "bots",
    title: "BOTS IA",
    aliases: ["bot", "bots", "bot ia", "bots ia", "joueur virtuel", "adversaire virtuel"],
    keywords: ["bot","ia","virtuel","niveau"],
    text: `## BOT IA
Un **BOT** est un joueur virtuel contrôlé par l'application. Il sert à jouer seul, compléter une partie ou s'entraîner dans les modes compatibles.

## CE QU'IL POSSÈDE
- nom ;
- avatar ;
- pays ;
- niveau de difficulté.

## À NE PAS CONFONDRE
Un BOT joue une partie. **Awena assistante** explique, guide et analyse. Awena peut aussi exister comme BOT officiel jouable, mais ce sont deux rôles distincts.`,
    route: "profiles_bots", routeLabel: "Ouvrir BOTS IA",
  },
  {
    id: "stats-hub",
    title: "Centre de statistiques",
    aliases: ["centre statistiques", "statshub", "stats hub", "statistiques", "voir stats"],
    keywords: ["stats","historique","record","classement"],
    text: `## CENTRE DE STATISTIQUES
Le centre de statistiques regroupe les performances enregistrées par les différents modes.

## CE QUE TU PEUX ANALYSER
Selon le jeu :
- parties et victoires ;
- pourcentage de victoire ;
- moyennes ;
- meilleurs scores ;
- records personnels ;
- métriques propres au mode.

> Une statistique fiable doit exister dans les données de partie. Si elle n'est pas enregistrée, Awena doit le signaler plutôt que l'inventer.`,
    route: "stats", routeLabel: "Ouvrir Stats",
  },
  {
    id: "history",
    title: "Historique",
    aliases: ["historique", "parties jouees", "ancienne partie", "detail partie"],
    keywords: ["historique","parties","detail","stats"],
    text: `## HISTORIQUE
L'historique conserve les parties enregistrées et sert de base à de nombreuses statistiques.

## UTILITÉ
- revoir une partie ;
- reconstituer les résultats ;
- filtrer par joueur / mode / période ;
- recalculer certaines statistiques lorsque les données détaillées sont présentes.

> Supprimer l'historique peut donc supprimer aussi la matière nécessaire aux statistiques.`,
    route: "stats", routeLabel: "Ouvrir Historique",
  },
  {
    id: "leaderboards",
    title: "Classements",
    aliases: ["classement", "classements", "leaderboard", "top 3", "top 5", "meilleur joueur"],
    keywords: ["classement","top","meilleur","stats"],
    text: `## CLASSEMENTS
Les classements ordonnent les joueurs sur une métrique précise.

## EXEMPLES
- % de victoire ;
- nombre de victoires ;
- moyenne ;
- meilleur checkout ;
- kills, captures ou autres métriques propres au mode.

## CONSEIL
Précise **le mode**, **la statistique** et éventuellement **la période** pour obtenir un classement fiable.`,
    route: "stats", routeLabel: "Ouvrir Stats",
  },
  {
    id: "messages",
    title: "Messagerie",
    aliases: ["messages", "messagerie", "chat joueurs", "message ami"],
    keywords: ["messages","amis","online"],
    text: `## MESSAGES
La messagerie centralise les échanges disponibles entre utilisateurs connectés lorsque les fonctions Online sont actives.

## SI TU NE TROUVES PAS UN CONTACT
Vérifie d'abord l'état de la relation d'ami, la connexion du compte et la disponibilité de la fonction réseau.`,
    route: "messages", routeLabel: "Ouvrir Messages",
  },
  {
    id: "friends",
    title: "Amis",
    aliases: ["amis", "ami", "ajouter ami", "demande ami", "friends"],
    keywords: ["amis","online","invitation"],
    text: `## AMIS
Les fonctions Amis servent à retrouver des joueurs, gérer les demandes et faciliter les rencontres en ligne.

## FLUX TYPIQUE
1. trouver / ajouter le joueur ;
2. accepter la relation si nécessaire ;
3. créer ou rejoindre une rencontre compatible ;
4. suivre les messages / invitations.`,
    route: "online", routeLabel: "Ouvrir Online",
  },
  {
    id: "nearby",
    title: "Joueurs à proximité",
    aliases: ["joueurs proches", "a proximite", "nearby", "joueurs autour de moi"],
    keywords: ["proximite","joueurs","online"],
    text: `## JOUEURS À PROXIMITÉ
Cette fonction aide à découvrir des joueurs lorsque la disponibilité réseau, la localisation et les paramètres de confidentialité le permettent.

## SI RIEN N'APPARAÎT
Vérifie la connexion, les autorisations nécessaires et que la fonction de découverte est active pour ton compte.`,
    route: "online", routeLabel: "Ouvrir Online",
  },
  {
    id: "clubs",
    title: "Clubs",
    aliases: ["club", "clubs", "equipe club", "online club"],
    keywords: ["club","online","membres"],
    text: `## CLUBS
Les clubs servent à regrouper des joueurs autour d'une structure ou d'une communauté lorsque la fonction Online correspondante est disponible.

## USAGES
- retrouver les membres ;
- organiser des rencontres ;
- centraliser certaines informations de groupe.`,
    route: "online", routeLabel: "Ouvrir Online",
  },
  {
    id: "online-room",
    title: "Salons Online",
    aliases: ["salon online", "salon", "room", "creer salon", "rejoindre salon"],
    keywords: ["salon","online","match"],
    text: `## SALON ONLINE
Un salon sert de point de rendez-vous avant une partie en ligne.

## FLUX
- créer ou rejoindre le salon ;
- vérifier les participants ;
- choisir le mode compatible ;
- attendre que tout le monde soit prêt ;
- lancer la partie.

> La partie Online dépend de la connexion et du mode réellement pris en charge.`,
    route: "online", routeLabel: "Ouvrir Online",
  },
  {
    id: "tournaments",
    title: "Compétitions",
    aliases: ["competition", "competitions", "tournoi", "tournois", "bracket"],
    keywords: ["tournoi","competition","tableau","match"],
    text: `## COMPÉTITIONS
Le module Compétitions sert à organiser des rencontres structurées.

## ÉTAPES
1. créer / choisir la compétition ;
2. ajouter les participants ou équipes ;
3. construire le tableau / ordre des matchs ;
4. jouer les rencontres ;
5. enregistrer les résultats ;
6. suivre le classement ou l'avancement.`,
    route: "tournaments", routeLabel: "Ouvrir Compétitions",
  },
  {
    id: "cast",
    title: "Écrans / Cast",
    aliases: ["cast", "ecran externe", "ecrans", "viewer", "tele", "diffuser partie"],
    keywords: ["cast","ecran","viewer","diffusion"],
    text: `## ÉCRANS / CAST
Le Cast permet d'utiliser l'appareil principal comme contrôleur et d'afficher la partie sur un autre écran compatible.

## PRINCIPE
- l'appareil principal garde la saisie et le contrôle ;
- le viewer reçoit une vue adaptée à l'affichage ;
- les deux doivent rejoindre la même session de diffusion.

## SI ÇA NE MARCHE PAS
Vérifie la session, le réseau, l'identifiant du viewer et l'état de la connexion.`,
    route: "cast_host", routeLabel: "Ouvrir Écrans",
  },
  {
    id: "spectator",
    title: "Mode spectateur",
    aliases: ["spectateur", "spectator", "regarder partie", "viewer partie"],
    keywords: ["spectateur","viewer","partie"],
    text: `## SPECTATEUR
Le mode Spectateur sert à suivre une partie sans devenir l'interface principale de saisie.

## UTILITÉ
Il permet d'afficher les scores et informations pertinentes sur un écran secondaire ou auprès d'un public.`,
    route: "cast_host", routeLabel: "Ouvrir Écrans",
  },
  {
    id: "camera",
    title: "Scoring caméra",
    aliases: ["camera", "scoring camera", "camera scoring", "detection flechettes"],
    keywords: ["camera","scoring","calibration","cible"],
    text: `## SCORING CAMÉRA
Le scoring caméra aide à interpréter la cible à partir d'une image vidéo lorsque le module est configuré.

## AVANT DE JOUER
- stabilise la caméra ;
- cadre entièrement la cible ;
- évite les reflets importants ;
- effectue la calibration ;
- vérifie quelques impacts connus avant de faire confiance au score automatique.

> La caméra est une aide de saisie : en cas d'ambiguïté, garde une possibilité de correction manuelle.`,
    route: "camera_scoring_setup", routeLabel: "Ouvrir Caméra",
  },
  {
    id: "calibration",
    title: "Calibration caméra",
    aliases: ["calibration", "calibrer camera", "calibrer cible"],
    keywords: ["calibration","camera","cible"],
    text: `## CALIBRATION
La calibration associe la géométrie de l'image aux zones réelles de la cible.

## POUR UNE BONNE CALIBRATION
- cible entièrement visible ;
- caméra fixe ;
- centre et anneaux correctement alignés ;
- refaire la calibration si la caméra ou la cible bouge.

> Une calibration incorrecte produit des scores incohérents même si l'image paraît nette.`,
    route: "camera_scoring_setup", routeLabel: "Ouvrir Calibration",
  },
  {
    id: "online-offline",
    title: "Fonctionnement hors ligne",
    aliases: ["hors ligne", "offline", "sans internet", "pas de reseau"],
    keywords: ["offline","internet","local"],
    text: `## HORS LIGNE
Une grande partie du scoring local et des données déjà présentes peut fonctionner sans connexion.

## CE QUI PEUT NÉCESSITER INTERNET
- comptes et authentification ;
- Online / amis / clubs ;
- téléchargements de modèles ou médias ;
- cloud / R2 / synchronisation distante ;
- certaines publicités.

> Awena en français peut fonctionner localement avec son pack vocal installé. Les modèles de traduction d'autres langues doivent d'abord être téléchargés une fois.`,
  },
  {
    id: "reset",
    title: "Reset / nettoyage",
    aliases: ["reset application", "reinitialiser", "effacer cache", "vider cache", "nettoyer donnees"],
    keywords: ["reset","cache","donnees","historique"],
    text: `## RESET / NETTOYAGE
Les outils de maintenance ne suppriment pas tous la même chose.

## AVANT D'UTILISER UN BOUTON DE RESET
Lis exactement ce qui sera supprimé : historique, statistiques locales, caches, paramètres ou compte peuvent être des périmètres différents.

## CONSEIL
Fais une sauvegarde avant toute opération destructive si tu veux conserver tes données de parties.`,
    route: "settings", routeLabel: "Ouvrir Maintenance",
  },
  {
    id: "developer",
    title: "Outils développeur",
    aliases: ["developpeur", "developer", "dev tools", "diagnostic", "simulation dev"],
    keywords: ["developpeur","diagnostic","simulation"],
    text: `## OUTILS DÉVELOPPEUR
Les outils DEV servent au diagnostic, aux simulations et aux opérations techniques.

## PRÉCAUTION
Ils peuvent créer des données fictives, déclencher des tests ou agir sur le stockage. Ils ne sont pas destinés à une utilisation normale par les joueurs.

> N'utilise une simulation ou un reset DEV que si tu sais précisément quel jeu de données sera modifié.`,
    route: "settings", routeLabel: "Ouvrir Réglages",
  },
  {
    id: "awena-presence",
    title: "Présence d'Awena",
    aliases: ["presence awena", "discrete", "active", "coach", "desactivee awena"],
    keywords: ["awena","coach","discrete","active"],
    text: `## PRÉSENCE D'AWENA
Le niveau de présence règle la fréquence à laquelle l'assistante intervient.

- **Désactivée** : Awena reste masquée et silencieuse.
- **Discrète** : disponible manuellement, sans interventions spontanées.
- **Active** : disponible avec réactions importantes.
- **Coach** : conseils et accompagnement plus fréquents pendant les parties.

> Ce réglage est indépendant du volume et du bouton de lecture automatique des réponses.`,
    route: "settings", routeLabel: "Ouvrir Awena",
  },
  {
    id: "awena-voice",
    title: "Voix d'Awena",
    aliases: ["voix awena", "awena voice", "faire parler awena", "moteur vocal", "voix locale"],
    keywords: ["awena","voix","audio","neural"],
    text: `## VOIX D'AWENA
En français, Awena utilise son moteur neuronal local stable lorsqu'il est installé.

## AUTRES LANGUES
Quand la langue de l'application n'est pas le français, Awena utilise une voix Android compatible avec la langue choisie afin d'éviter de prononcer l'anglais, l'espagnol ou l'allemand avec une phonétique française.

## TEXTE
Les réponses sont traduites localement sur Android après téléchargement du modèle de langue correspondant.`,
    route: "settings", routeLabel: "Ouvrir Awena",
  },
  {
    id: "scoring-input",
    title: "Méthodes de saisie",
    aliases: ["saisie score", "keypad", "cible interactive", "entrer score", "saisir flechettes"],
    keywords: ["saisie","keypad","cible","score"],
    text: `## SAISIE DU SCORE
Selon le mode, l'application peut proposer plusieurs méthodes de saisie.

## EXEMPLES
- keypad / boutons ;
- cible interactive ;
- saisie détaillée Simple / Double / Triple / Bull / Miss ;
- scoring caméra lorsque le module est disponible.

## CHOIX
La saisie détaillée est généralement préférable lorsque tu veux reconstruire des statistiques précises par fléchette.`,
  },
  {
    id: "undo",
    title: "Annuler / Undo",
    aliases: ["annuler", "undo", "revenir en arriere", "corriger lancer"],
    keywords: ["undo","annuler","correction"],
    text: `## ANNULER
La fonction Annuler revient sur la dernière action prise en charge par le mode.

## CONSEIL
Utilise-la immédiatement après une erreur de saisie. Plus tu continues à jouer après une saisie incorrecte, plus la correction peut devenir ambiguë pour l'historique et les statistiques.`,
  },
  {
    id: "training",
    title: "Training",
    aliases: ["training", "entrainement", "s entrainer", "progresser"],
    keywords: ["training","entrainement","progression"],
    text: `## TRAINING
Les écrans Training servent à travailler une compétence sans lancer forcément un match classique.

## OBJECTIFS
Selon le sport : précision, doubles, Bull, répétition, chrono, séries, exercices techniques ou objectifs de progression.

## CONSEIL
Compare des séries sur plusieurs sessions plutôt qu'un seul score exceptionnel pour mesurer une vraie progression.`,
    route: "games", routeLabel: "Ouvrir Jeux",
  },
  {
    id: "sports",
    title: "Sports disponibles",
    aliases: ["sports disponibles", "quels sports", "liste sports", "sports de l application"],
    keywords: ["sports","jeux","flechettes","petanque"],
    text: `## SPORTS / UNIVERS
La base actuelle d'Awena connaît les univers présents dans l'application : **Fléchettes, Pétanque, Baby-foot, Ping-pong, Mölkky, Dés et Football**, avec leurs modes déclarés dans les menus correspondants.

## POUR ALLER PLUS LOIN
Demande le nom du sport ou du mode : je peux expliquer son objectif, comment le lancer, sa configuration connue et les statistiques disponibles.`,
    route: "games", routeLabel: "Ouvrir Jeux",
  },
  {
    id: "petanque",
    title: "Pétanque",
    aliases: ["petanque", "boules", "doublette", "triplette", "quadrette"],
    keywords: ["petanque","boules","mene"],
    text: `## PÉTANQUE
L'application prend en charge plusieurs formats : match simple, match à 3, Doublette, Triplette, Quadrette et Training.

## PRINCIPE DE SCORE
Les parties classiques visent généralement **13 points**, avec un score attribué à chaque mène selon les boules les mieux placées.

> Pour une règle exacte, précise le format : le nombre de joueurs et de boules change selon Simple, Doublette ou Triplette.`,
    route: "petanque_menu", routeLabel: "Ouvrir Pétanque",
  },
  {
    id: "babyfoot",
    title: "Baby-foot",
    aliases: ["babyfoot", "baby foot", "baby-foot"],
    keywords: ["babyfoot","but","match"],
    text: `## BABY-FOOT
L'application propose des formats locaux comme **1V1, 2V2 et 2V1**, ainsi que des entraînements.

## CONFIGURATION
Selon l'écran, tu peux choisir le format, les joueurs / équipes, le score cible ou un chrono et éventuellement une formule en sets.`,
    route: "babyfoot_menu", routeLabel: "Ouvrir Baby-foot",
  },
  {
    id: "pingpong",
    title: "Ping-pong",
    aliases: ["pingpong", "ping pong", "tennis de table", "tournante"],
    keywords: ["pingpong","tennis","table"],
    text: `## PING-PONG
Les modes connus incluent **1V1, 2V2, 2V1, Tournante et Training**.

## MATCH
La configuration gère les participants et le format de rencontre. Pour un détail exact des points, sets ou service, précise le mode affiché afin qu'Awena utilise le contexte de l'écran.`,
    route: "pingpong_menu", routeLabel: "Ouvrir Ping-pong",
  },
  {
    id: "molkky",
    title: "Mölkky",
    aliases: ["molkky", "quilles molkky"],
    keywords: ["molkky","quille","50"],
    text: `## MÖLKKY
Principe classique :
- une seule quille tombée = valeur inscrite sur la quille ;
- plusieurs quilles = nombre de quilles tombées ;
- objectif classique = **50 exactement**.

L'application propose **Classique, Rapide et Personnalisé**, avec des options de cible et de pénalité selon le mode.`,
    route: "molkky_menu", routeLabel: "Ouvrir Mölkky",
  },
  {
    id: "dice",
    title: "Jeux de dés",
    aliases: ["des", "jeux de des", "dice", "yams", "farkle", "421"],
    keywords: ["des","dice","yams","farkle"],
    text: `## JEUX DE DÉS
Les modes connus comprennent **Dice Duel, Dice Race, 10 000, Yam's, Farkle, 421 et Poker Dice**.

## IMPORTANT
Chaque mode possède sa propre logique de score. Demande le nom exact du jeu pour éviter de mélanger les combinaisons de Yam's avec le risque de Farkle ou les annonces du 421.`,
    route: "dice_menu", routeLabel: "Ouvrir Dés",
  },
  {
    id: "football",
    title: "Football",
    aliases: ["football", "foot", "penalty", "tir au but"],
    keywords: ["football","penalty","score"],
    text: `## FOOTBALL
L'application propose notamment Penalty et des formats **1V1, 2V2, 3V3, 5V5, 7V7, 8V8 et 11V11**.

## PENALTY
Le mode Penalty fonctionne comme un duel tireur / gardien avec une série de tirs et une mort subite possible en cas d'égalité.`,
    route: "foot_menu", routeLabel: "Ouvrir Football",
  },
  {
    id: "shop",
    title: "Boutique / personnalisation",
    aliases: ["boutique", "shop", "bundle personnalisation", "personnalisation premium"],
    keywords: ["boutique","personnalisation","bundle"],
    text: `## BOUTIQUE / PERSONNALISATION
Les fonctions de personnalisation peuvent regrouper des éléments visuels comme avatars, logos, sets ou thèmes selon les offres disponibles.

## À NE PAS CONFONDRE
Un achat de personnalisation n'est pas la même chose qu'un abonnement de stockage cloud.`,
    route: "home", routeLabel: "Retour Accueil",
  },
];

function scoreEntry(entry: AtlasEntry, raw: string) {
  const q = norm(raw);
  if (!q) return 0;
  let score = 0;
  for (const alias of entry.aliases) {
    const a = norm(alias);
    if (!a) continue;
    if (q === a) score = Math.max(score, 100);
    else if (q.includes(a)) score = Math.max(score, 72 + Math.min(18, a.split(" ").length * 4));
  }
  const qTokens = new Set(tokens(q));
  const entryTokens = new Set([
    ...entry.aliases.flatMap(tokens),
    ...(entry.keywords || []).flatMap(tokens),
    ...tokens(entry.title),
  ]);
  let overlap = 0;
  for (const token of qTokens) if (entryTokens.has(token)) overlap += 1;
  score += overlap * 9;
  return score;
}

export function answerAwenaAppAtlas(question: string, rememberedTopic?: string): AwenaAtlasReply | null {
  const q = norm(question);
  if (!q) return null;

  const ranked = E
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .sort((a, b) => b.score - a.score);

  let best = ranked[0];
  const followUp = /^(et |alors |ok |d accord )?(comment|pourquoi|ou|quand|combien|peut on|est ce que|et si|ca sert|a quoi|quelle difference)/.test(q);
  if ((!best || best.score < 26) && followUp && rememberedTopic?.startsWith("atlas:")) {
    const id = rememberedTopic.slice("atlas:".length);
    const remembered = E.find((entry) => entry.id === id);
    if (remembered) best = { entry: remembered, score: 30 };
  }

  if (!best || best.score < 26) return null;
  return {
    text: best.entry.text,
    knowledgeTopic: `atlas:${best.entry.id}`,
    actions: actions(best.entry),
  };
}

export function awenaAtlasCount() {
  return E.length;
}
