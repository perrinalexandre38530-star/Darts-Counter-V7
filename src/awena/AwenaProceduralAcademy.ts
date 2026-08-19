import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";

export type AwenaProcedureEntry = {
  id: string; domain: string; title: string; aliases: string[]; route?: string;
  purpose: string; prerequisites: string[]; steps: string[]; verify: string[]; troubleshooting: string[]; warnings: string[]; related: string[];
};

const STOP = new Set(["a","au","aux","avec","ce","ces","cette","de","des","du","dans","et","est","en","je","la","le","les","ma","mes","mon","ne","nous","on","ou","pour","que","quel","quelle","quels","quelles","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre","comment","faire","moi","application","appli","awena","aide","expliquer","explique"]);
function norm(value: string) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[_/\\-]+/g, " ").replace(/[^a-z0-9%+\s]/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(value: string) { return norm(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token)); }

const PROCEDURES: AwenaProcedureEntry[] = [
  {
    id: "cast-start", domain: "screens", title: "Lancer un Cast TV",
    aliases: ["faire un cast", "lancer cast", "cast tv", "chromecast", "diffuser sur tv", "caster la partie", "google cast"],
    route: "cast_host",
    purpose: "Afficher le scoreboard de MULTISPORTS SCORING sur une TV ou un appareil Google Cast compatible.",
    prerequisites: ["Le téléphone/appareil qui pilote MULTISPORTS SCORING et le Chromecast/Google TV doivent pouvoir se voir sur le réseau.", "Google Cast doit être disponible sur l'appareil ou le navigateur utilisé.", "Pour un affichage live propre, lance la session Cast avant de démarrer la partie."],
    steps: ["Ouvre Écrans puis l'onglet CAST TV.", "Appuie sur Lancer. Le dialogue Google Cast s'ouvre.", "Choisis le Chromecast, la Google TV ou l'écran compatible.", "Attends l'état connecté / le nom de l'appareil.", "Reviens à la configuration de ton jeu et démarre la partie.", "Le scoreboard est ensuite envoyé automatiquement pendant la partie."],
    verify: ["L'onglet Cast indique une session active.", "Le nom de l'appareil peut être affiché.", "Un Ping vers le receiver doit pouvoir être envoyé si tu veux tester la liaison."],
    troubleshooting: ["Si aucun appareil n'apparaît, vérifie le Wi-Fi, le réseau local et la disponibilité Google Cast.", "Si le dialogue s'ouvre puis échoue, arrête la session précédente puis relance-la.", "Si la TV est connectée mais n'affiche rien, utilise Ping et consulte État & diagnostics avant de modifier l'App ID."],
    warnings: ["Ne change l'App ID Cast que si tu sais quel receiver doit être utilisé ; l'ID par défaut de l'application est normalement le bon."],
    related: ["Diagnostic Cast", "Viewer tablette", "Réglages Écrans"],
  },
  {
    id: "cast-diagnostic", domain: "screens", title: "Diagnostiquer un Cast TV",
    aliases: ["cast ne marche pas", "chromecast ne marche pas", "diagnostic cast", "ping cast", "receiver cast", "tv ne se met pas a jour"],
    route: "cast_host",
    purpose: "Identifier si le problème vient de la session Cast, du receiver ou de l'envoi des snapshots.",
    prerequisites: ["Une tentative de session Cast a déjà été faite."],
    steps: ["Ouvre Écrans > CAST TV.", "Déplie État & diagnostics.", "Vérifie si une session et un appareil sont détectés.", "Appuie sur Ping pour tester le receiver.", "Lis les dernières entrées de diagnostic.", "Si nécessaire, arrête la session puis relance-la avant de relancer la partie."],
    verify: ["Un Ping réussi confirme qu'une session Cast active peut recevoir le message de test.", "Les diagnostics doivent montrer les dernières étapes d'initialisation/envoi."],
    troubleshooting: ["Aucune session : relance Cast et sélectionne un appareil.", "Session présente mais Ping impossible : reconnecte le receiver.", "Score figé : garde la session active et reviens au jeu afin de provoquer de nouveaux snapshots."],
    warnings: ["Vider les logs efface uniquement le journal de diagnostic, pas les parties."],
    related: ["Lancer un Cast TV", "App ID Cast"],
  },
  {
    id: "cast-app-id", domain: "screens", title: "Régler l'App ID Google Cast",
    aliases: ["app id cast", "receiver id", "google cast app id", "id chromecast", "3534bc6a"],
    route: "cast_host",
    purpose: "Choisir le receiver Google Cast utilisé par MULTISPORTS SCORING.",
    prerequisites: ["À utiliser surtout pour le diagnostic ou lorsqu'un receiver personnalisé est prévu."],
    steps: ["Ouvre Écrans > Réglages.", "Repère RÉGLAGES CAST.", "Lis l'App ID courant.", "Saisis l'App ID attendu puis enregistre.", "Relance ensuite une session Cast pour que le changement soit pris en compte."],
    verify: ["L'écran confirme l'App ID enregistré.", "Une nouvelle session Cast doit utiliser le receiver correspondant."],
    troubleshooting: ["Si le receiver ne démarre plus après modification, restaure l'App ID par défaut.", "Si tu ne connais pas l'ID attendu, ne le remplace pas au hasard."],
    warnings: ["Un mauvais App ID peut empêcher le receiver de s'ouvrir."],
    related: ["Diagnostic Cast"],
  },
  {
    id: "viewer-create", domain: "screens", title: "Créer un Viewer tablette",
    aliases: ["viewer", "viewer tablette", "creer session viewer", "second ecran tablette", "afficher scores tablette", "qr viewer"],
    route: "cast_host",
    purpose: "Afficher un mini-scoreboard live sur une tablette ou un second navigateur sans Chromecast.",
    prerequisites: ["Le téléphone hôte doit avoir accès au service Viewer.", "La tablette doit pouvoir ouvrir le lien généré.", "La session Viewer doit être créée avant ou au début de la partie."],
    steps: ["Ouvre Écrans > VIEWER TABLETTE.", "Appuie sur Créer session.", "Attends l'apparition du code, du lien et du QR code.", "Sur la tablette, scanne le QR code ou ouvre le lien ; sinon utilise Rejoindre et saisis le code.", "Laisse la session active.", "Reviens au jeu et démarre la partie : joueurs, scores, joueur actif, leg/set et résumé sont publiés vers le Viewer."],
    verify: ["La page indique Session active / Synchronisation prête.", "La tablette affiche le Viewer et passe de connexion… à connecté quand des snapshots arrivent."],
    troubleshooting: ["QR absent : crée ou recrée la session.", "Tablette hors ligne : vérifie son réseau et le lien/code.", "Viewer connecté mais score figé : vérifie Publication automatique dans Réglages Écrans et les diagnostics Viewer."],
    warnings: ["Le Viewer transporte un mini snapshot d'affichage ; ce n'est pas une sauvegarde complète NAS/cloud."],
    related: ["Rejoindre un Viewer", "Réglages Viewer", "Cast TV"],
  },
  {
    id: "viewer-join", domain: "screens", title: "Rejoindre un Viewer",
    aliases: ["rejoindre viewer", "code viewer", "scanner qr viewer", "ouvrir viewer tablette"],
    route: "viewer_join",
    purpose: "Connecter la tablette à une session Viewer déjà créée sur l'appareil hôte.",
    prerequisites: ["Une session Viewer active existe sur le téléphone hôte.", "Tu disposes du QR code, du lien ou du code de session."],
    steps: ["Sur la tablette, scanne le QR code généré par l'hôte ou ouvre l'écran Rejoindre un viewer.", "Saisis le code affiché sur le téléphone si tu n'utilises pas le QR code.", "Valide Ouvrir l'écran viewer.", "Attends l'état connecté.", "Laisse cet écran ouvert pendant la partie."],
    verify: ["Le Viewer affiche les joueurs/scores dès que l'hôte publie un snapshot."],
    troubleshooting: ["Code manquant ou refusé : recrée une session sur l'hôte et utilise le nouveau code.", "État hors ligne : vérifie la connexion réseau et recharge le lien."],
    warnings: [],
    related: ["Créer un Viewer tablette"],
  },
  {
    id: "viewer-settings", domain: "screens", title: "Régler la publication Viewer",
    aliases: ["poll viewer", "rafraichissement viewer", "publication automatique viewer", "viewer 700 ms", "reglages viewer"],
    route: "cast_host",
    purpose: "Ajuster la fréquence de rafraîchissement et l'envoi automatique des snapshots vers le Viewer.",
    prerequisites: ["Une session Viewer peut être testée pour vérifier l'effet des réglages."],
    steps: ["Ouvre Écrans > Réglages.", "Dans RÉGLAGES VIEWER, laisse Publication automatique activée pour un usage normal.", "Ajuste la fréquence de rafraîchissement si nécessaire.", "Appuie sur Enregistrer.", "Teste avec une session Viewer active."],
    verify: ["Le message de l'écran confirme la fréquence et l'état de publication."],
    troubleshooting: ["Si le Viewer ne se met plus à jour, réactive Publication automatique.", "Si le réseau est instable, évite une fréquence inutilement agressive ; le réglage est borné par l'application."],
    warnings: ["Une fréquence plus courte n'améliore pas un réseau défaillant et peut augmenter les échanges."],
    related: ["Créer un Viewer tablette", "Diagnostic Viewer"],
  },
  {
    id: "viewer-diagnostic", domain: "screens", title: "Diagnostiquer un Viewer",
    aliases: ["viewer ne marche pas", "viewer hors ligne", "viewer fige", "diagnostic viewer", "tablette pas a jour"],
    route: "cast_host",
    purpose: "Comprendre pourquoi le second écran ne reçoit pas ou plus les scores.",
    prerequisites: ["Une session Viewer a été créée."],
    steps: ["Vérifie que la session est encore active.", "Sur la tablette, vérifie que le code/lien correspond à la session actuelle.", "Dans Écrans > Viewer, ouvre État & diagnostics.", "Vérifie que Publication automatique est active dans l'onglet Réglages.", "Relance un changement de score pour provoquer un nouveau snapshot.", "Si nécessaire, arrête puis recrée la session."],
    verify: ["Le Viewer doit passer à connecté et le journal doit enregistrer des publications."],
    troubleshooting: ["Aucune entrée : l'hôte n'a probablement rien publié.", "Entrées présentes mais tablette hors ligne : problème de lecture/réseau côté tablette.", "Ancien code : une nouvelle session nécessite le nouveau lien/code."],
    warnings: [],
    related: ["Réglages Viewer", "Créer un Viewer tablette"],
  },
  {
    id: "cast-vs-viewer", domain: "screens", title: "Choisir entre Cast et Viewer",
    aliases: ["difference cast viewer", "cast ou viewer", "chromecast ou tablette", "quel ecran externe"],
    route: "cast_host",
    purpose: "Choisir la méthode d'affichage externe adaptée.",
    prerequisites: [],
    steps: ["Choisis Cast si tu as un appareil Google Cast/Chromecast et veux afficher directement sur une TV.", "Choisis Viewer si tu veux utiliser une tablette, un PC ou un navigateur via un lien/code/QR.", "Tu peux préparer l'écran externe avant de démarrer la partie.", "Vérifie la liaison puis retourne au jeu."],
    verify: ["Cast indique une session active ; Viewer indique une session active et une synchronisation prête."],
    troubleshooting: ["Si Google Cast n'est pas supporté sur l'appareil, utilise Viewer comme solution de second écran."],
    warnings: [],
    related: ["Lancer un Cast TV", "Créer un Viewer tablette"],
  },
  {
    id: "camera-source-choice", domain: "external_scoring", title: "Choisir une source de comptage X01",
    aliases: ["source comptage", "comptage externe", "telephone camera bridge scolia grandarts bluetooth", "quelle source x01"],
    route: "camera_scoring_setup",
    purpose: "Choisir comment les tirs X01 arrivent dans l'application lorsqu'on ne saisit pas tout manuellement.",
    prerequisites: ["Le mode X01 utilise la configuration complète compatible avec les sources externes."],
    steps: ["Ouvre le parcours de comptage externe depuis la configuration X01.", "Choisis TÉLÉPHONE pour un téléphone compagnon qui filme/scanne la cible.", "Choisis CAMÉRA LOCALE pour utiliser la caméra de l'appareil qui exécute l'application.", "Choisis BRIDGE pour une passerelle WebSocket/HTTP compatible.", "Choisis SCOLIA ou GRANDARTS quand leur intégration passe par le bridge/API prévu.", "Choisis BLUETOOTH pour un appareil compatible identifié par l'application.", "Poursuis avec l'étape de liaison/calibration correspondant à la source."],
    verify: ["L'écran affiche la source active et les étapes spécifiques à cette source."],
    troubleshooting: ["Si tu ne sais pas quoi choisir, indique-moi ton matériel exact et je t'explique le chemin adapté."],
    warnings: ["Scolia/Grandarts/Bluetooth ne deviennent pas compatibles par simple sélection : il faut une intégration/bridge réellement compatible."],
    related: ["Téléphone compagnon", "Caméra locale", "Bridge WebSocket", "Scolia", "Grandarts", "Bluetooth"],
  },
  {
    id: "phone-companion-link", domain: "external_scoring", title: "Relier un téléphone compagnon X01",
    aliases: ["relier telephone x01", "telephone compagnon", "qr telephone camera", "creer une liaison camera"],
    route: "camera_scoring_setup",
    purpose: "Utiliser un second téléphone comme caméra/scoring compagnon du X01.",
    prerequisites: ["Le téléphone hôte affiche Camera Scoring Setup.", "Le second téléphone possède une caméra et peut ouvrir le lien de liaison."],
    steps: ["Choisis la source TÉLÉPHONE.", "Appuie sur Créer une liaison.", "Attends le QR code ou copie le lien de liaison.", "Sur le téléphone compagnon, scanne le QR code ou ouvre le lien.", "Autorise l'accès à la caméra sur le téléphone compagnon.", "Effectue la calibration sur CE téléphone, car la géométrie dépend de sa position.", "Vérifie les indicateurs Téléphone relié et Calibré avant de revenir à X01."],
    verify: ["Les pastilles indiquent Téléphone relié et Calibration OK/Calibré."],
    troubleshooting: ["Téléphone non relié : recrée la liaison et vérifie le réseau.", "Caméra refusée : accorde la permission dans Android/navigateur puis recharge.", "Calibration manquante : fais-la depuis le téléphone qui filme, pas depuis l'hôte."],
    warnings: ["Déplacer le téléphone après calibration peut dégrader la correspondance entre image et cible."],
    related: ["Calibration caméra", "Permission caméra"],
  },
  {
    id: "camera-local-calibration", domain: "external_scoring", title: "Calibrer la caméra locale",
    aliases: ["calibrer camera", "calibration cible", "bull bord double segment 20", "camera locale"],
    route: "camera_scoring_calibration",
    purpose: "Apprendre à l'application la géométrie de la cible vue par la caméra.",
    prerequisites: ["La cible doit être bien visible et la caméra stable.", "Évite de déplacer l'appareil pendant et après la calibration."],
    steps: ["Ouvre Calibration caméra.", "Étape 1/3 : tape précisément le centre du BULL.", "Étape 2/3 : tape le bord extérieur de la cible, autour de l'anneau de double.", "Étape 3/3 : tape le milieu du segment 20 en haut de la cible.", "Vérifie les repères obtenus puis enregistre la calibration.", "Retourne au setup et vérifie Calibration locale OK."],
    verify: ["Le bouton d'enregistrement devient disponible lorsque les points nécessaires sont définis.", "Le setup affiche Calibration locale OK."],
    troubleshooting: ["Si les scores sont décalés, recommence la calibration avec une caméra plus stable et des points plus précis.", "Si la caméra ne démarre pas, vérifie l'autorisation caméra."],
    warnings: ["Toute rotation, translation ou changement important de cadrage peut nécessiter une recalibration."],
    related: ["Caméra locale", "Téléphone compagnon"],
  },
  {
    id: "camera-phone-calibration", domain: "external_scoring", title: "Calibrer le téléphone compagnon",
    aliases: ["calibration telephone compagnon", "calibrer sur telephone", "score camera telephone"],
    route: "x01_device_camera",
    purpose: "Calibrer la cible sur l'appareil qui filme réellement la partie.",
    prerequisites: ["Le téléphone compagnon est lié et a accès à sa caméra."],
    steps: ["Pose le téléphone dans sa position de jeu définitive.", "Ouvre le lien compagnon et autorise la caméra.", "Si aucune calibration n'existe, passe en mode calibration.", "Utilise la détection automatique si elle fournit une géométrie correcte ; sinon ajuste/valide manuellement les repères proposés.", "Vérifie visuellement les anneaux/secteurs sur la cible.", "Passe en mode score et teste quelques zones connues avant la vraie partie."],
    verify: ["Les zones détectées correspondent visuellement aux anneaux et secteurs.", "Un tap/test sur une zone connue renvoie le segment attendu."],
    troubleshooting: ["Confiance faible ou repères incohérents : améliore l'éclairage, recentre la cible et recommence.", "Après déplacement du téléphone, recharge ou refais la calibration."],
    warnings: ["La calibration appartient au téléphone/caméra qui filme."],
    related: ["Relier un téléphone compagnon", "Calibration caméra"],
  },
  {
    id: "camera-permission", domain: "external_scoring", title: "Résoudre un refus de caméra",
    aliases: ["camera refusee", "acces camera refuse", "permission camera", "camera ne demarre pas"],
    route: "camera_scoring_setup",
    purpose: "Rétablir l'accès caméra nécessaire au scoring assisté.",
    prerequisites: [],
    steps: ["Vérifie que l'application ou le navigateur a l'autorisation Caméra.", "Sur Android, ouvre les autorisations de l'application si tu avais choisi Refuser.", "Ferme/reviens sur l'écran caméra ou recharge le lien compagnon.", "Vérifie qu'aucune autre application ne monopolise la caméra.", "Relance ensuite la calibration."],
    verify: ["L'aperçu vidéo démarre sans message Accès caméra refusé."],
    troubleshooting: ["Si l'autorisation est accordée mais l'écran reste noir, ferme les autres applications caméra et redémarre le parcours."],
    warnings: ["N'accorde la caméra qu'au domaine/application attendu."],
    related: ["Calibration caméra"],
  },
  {
    id: "bridge-websocket", domain: "external_scoring", title: "Configurer un bridge de scoring",
    aliases: ["bridge x01", "websocket bridge", "url websocket", "polling http", "passerelle scoring"],
    route: "camera_scoring_setup",
    purpose: "Recevoir des tirs depuis un matériel ou service externe via une passerelle compatible.",
    prerequisites: ["Un bridge/API réellement compatible avec le format attendu par MULTISPORTS SCORING doit être disponible.", "Tu dois connaître son URL WebSocket ou son endpoint/configuration HTTP."],
    steps: ["Dans le setup de source, choisis BRIDGE.", "Reviens à la configuration X01 complète si l'écran indique que les paramètres détaillés s'y trouvent.", "Renseigne l'URL WebSocket ou la configuration de polling HTTP prévue.", "Active la source externe.", "Teste la connexion avant de lancer une vraie partie.", "Envoie un événement de test/tir depuis le bridge et vérifie qu'il apparaît dans X01."],
    verify: ["La source est déclarée connectée/prête et les événements entrants modifient le score ou le flux de tirs attendu."],
    troubleshooting: ["Connexion impossible : vérifie protocole ws/wss ou http/https, adresse, port, réseau et certificat.", "Connexion OK sans tirs : vérifie le format des événements émis par le bridge."],
    warnings: ["Une URL joignable ne garantit pas que le protocole de messages est compatible."],
    related: ["Scolia", "Grandarts", "Bluetooth"],
  },
  {
    id: "scolia", domain: "external_scoring", title: "Utiliser Scolia avec X01",
    aliases: ["scolia", "configurer scolia", "scolia x01"],
    route: "camera_scoring_setup",
    purpose: "Brancher un système Scolia lorsque le bridge/API compatible est disponible.",
    prerequisites: ["Le système Scolia et sa passerelle/API doivent être opérationnels.", "MULTISPORTS SCORING doit recevoir les événements dans le format prévu."],
    steps: ["Sélectionne SCOLIA comme source.", "Configure ensuite l'URL/bridge dans la configuration X01 complète lorsque demandé.", "Teste la communication avant de lancer la partie.", "Vérifie qu'un tir de test est reçu correctement.", "Lance X01 seulement après validation de la liaison."],
    verify: ["Les événements Scolia sont visibles comme tirs entrants dans le flux X01."],
    troubleshooting: ["Si rien n'arrive, le problème est généralement la liaison bridge/API ou son format, pas le choix du bouton SCOLIA lui-même."],
    warnings: ["La sélection SCOLIA ne configure pas automatiquement un service tiers absent."],
    related: ["Bridge WebSocket"],
  },
  {
    id: "grandarts", domain: "external_scoring", title: "Utiliser Grandarts avec X01",
    aliases: ["grandarts", "configurer grandarts", "grandarts x01"],
    route: "camera_scoring_setup",
    purpose: "Brancher un système Grandarts lorsqu'une passerelle compatible fournit les événements de tirs.",
    prerequisites: ["Une interface/bridge Grandarts compatible doit être disponible."],
    steps: ["Sélectionne GRANDARTS.", "Renseigne ensuite la configuration de liaison prévue dans X01 complet.", "Teste la connexion et un tir.", "Vérifie le segment/multiplicateur reçu.", "Lance la partie après validation."],
    verify: ["Les tirs entrants correspondent aux tirs réels."],
    troubleshooting: ["Si la connexion existe mais les valeurs sont fausses, vérifie le mapping du bridge."],
    warnings: ["Ne suppose pas qu'un périphérique Grandarts générique expose automatiquement l'API attendue."],
    related: ["Bridge WebSocket"],
  },
  {
    id: "bluetooth-scoring", domain: "external_scoring", title: "Configurer un périphérique Bluetooth",
    aliases: ["bluetooth x01", "uuid bluetooth", "cible bluetooth", "scoring bluetooth"],
    route: "camera_scoring_setup",
    purpose: "Recevoir des données d'un appareil Bluetooth compatible.",
    prerequisites: ["Le périphérique doit exposer un service/UUID compatible avec l'intégration prévue.", "Bluetooth et les permissions nécessaires doivent être activés."],
    steps: ["Sélectionne BLUETOOTH comme source.", "Dans la configuration détaillée X01, renseigne ou sélectionne l'identifiant/UUID attendu si l'interface le demande.", "Associe/autorise le périphérique côté Android.", "Teste la réception d'un événement.", "Valide ensuite la configuration X01."],
    verify: ["Le périphérique est détecté/autorisé et un événement de test est reçu."],
    troubleshooting: ["Non détecté : vérifie Bluetooth, proximité et permissions.", "Connecté mais aucune donnée : le service/UUID ou le format peut être incompatible."],
    warnings: ["Bluetooth est un transport ; la compatibilité du protocole de scoring reste indispensable."],
    related: ["Source de comptage X01"],
  },
  {
    id: "recovery-export", domain: "data", title: "Créer une sauvegarde Recovery complète",
    aliases: ["sauvegarde recovery", "backup complet", "export recovery", "sauvegarder toutes mes donnees"],
    route: "sync_center",
    purpose: "Créer une sauvegarde destinée à restaurer les données importantes de l'application.",
    prerequisites: ["Évite de lancer une grosse sauvegarde pendant une opération de restauration ou une partie critique.", "Choisis un emplacement que tu pourras retrouver."],
    steps: ["Ouvre Sync & Partage ou Sauvegarde.", "Choisis l'export Recovery complet.", "Laisse l'export sécurisé activé si tu veux bénéficier de l'enveloppe d'intégrité/compression prévue.", "Lance l'export et choisis où conserver le fichier : stockage local, SD, cloud personnel ou emplacement système disponible.", "Attends le message de succès avant de fermer l'écran.", "Conserve au moins une copie hors de l'appareil si les données sont importantes."],
    verify: ["Un fichier de sauvegarde est créé et le message d'export confirme l'opération.", "Dans Sauvegarde, tu peux inspecter une archive avant restauration selon son format."],
    troubleshooting: ["Échec d'export : vérifie l'espace libre et les droits du sélecteur de fichiers.", "Fichier introuvable : recommence en notant explicitement l'emplacement choisi."],
    warnings: ["Une synchronisation de compte n'est pas automatiquement l'équivalent d'une sauvegarde Recovery complète."],
    related: ["Restaurer une sauvegarde", "Sauvegarde NAS", "Cloud R2"],
  },
  {
    id: "recovery-restore", domain: "data", title: "Restaurer une sauvegarde complète",
    aliases: ["restaurer sauvegarde", "restore recovery", "import backup", "recuperer toutes mes donnees"],
    route: "storage_vault",
    purpose: "Réinjecter une sauvegarde valide dans les stores de l'application.",
    prerequisites: ["Utilise de préférence une sauvegarde dont tu connais l'origine et la date.", "Si l'état actuel contient des données importantes, crée d'abord une nouvelle sauvegarde de sécurité."],
    steps: ["Ouvre Sauvegarde > Restaurer.", "Choisis ou importe le fichier/slot à restaurer.", "Utilise l'aperçu/analyse de la sauvegarde pour vérifier profils, parties, sports/modes, version et intégrité lorsqu'ils sont disponibles.", "Lance Restaurer uniquement après cette vérification.", "Laisse l'opération se terminer complètement.", "Recharge/reviens dans l'application si elle le demande, puis contrôle Profils, Historique et Stats."],
    verify: ["Le résumé de restauration indique un succès.", "Les profils et historiques attendus réapparaissent dans leurs écrans."],
    troubleshooting: ["Format non reconnu : ne force pas l'import ; vérifie que le fichier appartient bien à MULTISPORTS SCORING.", "Données partielles : vérifie le type d'archive, car un snapshot léger n'est pas toujours un Recovery complet."],
    warnings: ["La restauration modifie les données locales : fais une sauvegarde de l'état actuel avant une opération risquée."],
    related: ["Inspecter une sauvegarde", "Recovery complet"],
  },
  {
    id: "backup-inspect", domain: "data", title: "Inspecter une sauvegarde avant restauration",
    aliases: ["analyser sauvegarde", "voir contenu backup", "integrite sauvegarde", "version backup"],
    route: "storage_vault",
    purpose: "Vérifier ce qu'une archive contient avant de l'appliquer.",
    prerequisites: ["Le fichier/slot doit être accessible."],
    steps: ["Ouvre la sauvegarde depuis le coffre.", "Attends Lecture et analyse de la sauvegarde.", "Contrôle le nombre de profils/parties et la répartition par sport/mode si disponible.", "Contrôle Intégrité, Version app et Format.", "Compare la date et le contenu avec ce que tu cherches à récupérer.", "Restaurer seulement si l'archive correspond à ton besoin."],
    verify: ["L'analyse affiche des métadonnées cohérentes et, si disponible, une intégrité valide."],
    troubleshooting: ["Aucune répartition exploitable : certains anciens formats peuvent contenir moins de métadonnées ; reste prudent avant restauration."],
    warnings: ["Le nom du fichier seul ne suffit pas à garantir son contenu."],
    related: ["Restaurer une sauvegarde"],
  },
  {
    id: "nas-backup", domain: "data", title: "Sauvegarder sur un NAS privé",
    aliases: ["nas", "sauvegarde nas", "backup nas", "serveur nas", "synology qnap"],
    route: "storage_vault",
    purpose: "Conserver une copie de sauvegarde sur un stockage réseau privé.",
    prerequisites: ["Le NAS doit être accessible depuis l'appareil.", "Selon le mode utilisé, son partage doit être monté/visible dans le sélecteur système ou le backend NAS configuré doit répondre."],
    steps: ["Dans Sauvegarde, choisis la destination NAS/privée prévue.", "Si tu utilises le sélecteur système, rends d'abord le partage NAS accessible via Android ou l'application du constructeur.", "Choisis le fichier/emplacement de destination lorsque le sélecteur s'ouvre.", "Lance la sauvegarde.", "Attends la confirmation du NAS ou du sélecteur.", "Vérifie ensuite qu'une copie locale de sécurité existe si l'application l'indique."],
    verify: ["Le NAS contient le fichier/slot attendu et l'application confirme la réussite."],
    troubleshooting: ["NAS invisible : monte le partage ou passe par l'application du constructeur.", "Timeout : vérifie réseau, NAS et backend ; l'application prévoit une limite de temps afin de ne pas rester bloquée.", "Erreur proxy/HTML : le backend/proxy NAS peut ne pas accepter le paquet attendu."],
    warnings: ["MULTISPORTS SCORING ne doit pas recevoir le mot de passe de ton NAS via le simple sélecteur de fichiers."],
    related: ["Recovery complet", "Cloud R2", "Fichier/SD/cloud personnel"],
  },
  {
    id: "r2-backup", domain: "data", title: "Utiliser le Cloud R2",
    aliases: ["r2", "cloud r2", "sauvegarde r2", "backup cloud premium"],
    route: "storage_vault",
    purpose: "Envoyer ou restaurer une sauvegarde via le stockage Cloud R2 prévu par l'application.",
    prerequisites: ["La fonction doit être disponible pour ton compte/formule et le service réseau doit être joignable."],
    steps: ["Ouvre Sauvegarde et la section Cloud R2.", "Vérifie l'état/usage affiché.", "Choisis l'opération de sauvegarde ou le slot concerné.", "Lance le transfert et attends sa fin.", "Pour restaurer, inspecte le slot puis confirme la restauration."],
    verify: ["Le slot apparaît avec ses métadonnées et le transfert est confirmé."],
    troubleshooting: ["Transfert impossible : vérifie réseau, authentification et disponibilité du service.", "Quota/usage : consulte l'indicateur avant de multiplier les archives."],
    warnings: ["Cloud R2 et sauvegarde locale sont complémentaires ; garde une copie locale/externe des données importantes."],
    related: ["Recovery complet", "NAS privé"],
  },
  {
    id: "file-backup", domain: "data", title: "Sauvegarder vers fichier, SD ou cloud personnel",
    aliases: ["sauvegarder sur sd", "export usb", "google drive sauvegarde", "cloud personnel", "choisir fichier backup"],
    route: "storage_vault",
    purpose: "Utiliser le sélecteur de fichiers du système pour stocker une archive hors de l'espace interne de l'application.",
    prerequisites: ["L'emplacement cible doit être proposé par Android/le navigateur : mémoire, carte SD ou fournisseur de fichiers/cloud installé."],
    steps: ["Lance l'export depuis Sauvegarde.", "Quand le sélecteur système s'ouvre, choisis l'emplacement souhaité.", "Pour un cloud personnel, sélectionne le fournisseur installé dans le sélecteur.", "Valide le nom du fichier.", "Attends le retour/succès de l'application.", "Teste de temps en temps que tu sais retrouver le fichier."],
    verify: ["Le fichier est visible dans le gestionnaire de fichiers ou le fournisseur choisi."],
    troubleshooting: ["Destination absente : installe/ouvre l'application du fournisseur ou vérifie que la carte SD est montée."],
    warnings: ["L'application ne peut pas garantir la politique de conservation du fournisseur de cloud personnel."],
    related: ["Recovery complet"],
  },
  {
    id: "sync-local-export", domain: "data", title: "Exporter le store local",
    aliases: ["export store", "export json complet", "sync centre export local", "export donnees json"],
    route: "sync_center",
    purpose: "Générer une représentation JSON du store pour transfert ou diagnostic.",
    prerequisites: [],
    steps: ["Ouvre Sync & Partage.", "Dans la section locale, choisis Export complet du store ou Export du profil actif selon le besoin.", "Laisse l'application générer le JSON.", "Copie/télécharge le contenu via l'action proposée.", "Conserve-le uniquement si tu comprends qu'il peut contenir des données de profil/réglages."],
    verify: ["Le message confirme que l'export a été généré."],
    troubleshooting: ["Profil actif absent : sélectionne d'abord un profil si tu demandes un export ciblé."],
    warnings: ["Un export de profil ciblé n'est pas un backup Recovery de tout l'historique."],
    related: ["Import JSON", "Recovery complet"],
  },
  {
    id: "sync-local-import", domain: "data", title: "Importer un JSON local",
    aliases: ["import json", "import store", "charger fichier sync", "coller json"],
    route: "sync_center",
    purpose: "Importer un payload reconnu depuis un texte JSON ou un fichier.",
    prerequisites: ["Le payload doit provenir d'un format supporté par l'application.", "Sauvegarde l'état courant avant un import important."],
    steps: ["Ouvre Sync & Partage.", "Colle le JSON ou choisis le fichier à charger.", "Laisse l'écran analyser le format.", "Lance l'import.", "Lis le rapport d'import généré.", "Relance/recharge l'application si le message le demande."],
    verify: ["Le rapport d'import indique le type de payload et les modifications effectuées."],
    troubleshooting: ["Unknown payload format : le fichier n'est pas un format reconnu.", "JSON invalide : recharge le fichier source sans le modifier."],
    warnings: ["Ne colle pas des données JSON inconnues trouvées sur Internet."],
    related: ["Export store local", "Peer sync QR"],
  },
  {
    id: "peer-sync-qr", domain: "data", title: "Synchroniser un profil par QR entre appareils",
    aliases: ["peer sync", "sync qr", "synchroniser deux appareils", "qr profil", "device to device"],
    route: "sync_center",
    purpose: "Transférer un profil/payload ciblé d'un appareil à un autre via QR ou partage direct.",
    prerequisites: ["Un profil actif doit être sélectionné sur l'appareil source.", "L'appareil destinataire doit pouvoir scanner/lire le QR."],
    steps: ["Sur l'appareil source, ouvre Sync & Partage et génère le payload Peer Sync du profil actif.", "Affiche le QR ou copie/partage le payload.", "Sur l'appareil destinataire, ouvre le scanner QR de Sync & Partage.", "Autorise la caméra si nécessaire puis scanne le QR.", "Vérifie le rapport d'import.", "Recharge l'application si demandé."],
    verify: ["Le profil transféré est présent sur l'appareil cible et le rapport indique un import réussi."],
    troubleshooting: ["QR invalide : régénère-le et évite les captures trop compressées.", "Aucun profil à synchroniser : choisis un profil actif sur la source."],
    warnings: ["Ce transfert ciblé ne remplace pas forcément une sauvegarde complète de toutes les parties."],
    related: ["Import JSON", "Cloud sync"],
  },
  {
    id: "cloud-token-sync", domain: "data", title: "Transférer un snapshot via le cloud",
    aliases: ["cloud sync", "token cloud", "code cloud sync", "snapshot cloud autre appareil"],
    route: "sync_center",
    purpose: "Envoyer un snapshot léger vers le cloud et le récupérer sur un autre appareil du même compte.",
    prerequisites: ["Le compte doit être authentifié et le cloud accessible.", "Le code/token généré doit être conservé jusqu'à la récupération."],
    steps: ["Sur l'appareil source, lance l'envoi Cloud dans Sync & Partage.", "Attends la confirmation et note le code/token généré.", "Sur l'autre appareil connecté au compte compatible, ouvre la récupération Cloud.", "Saisis le token.", "Télécharge et importe le snapshot.", "Vérifie profils/réglages après import."],
    verify: ["Le cloud confirme l'upload puis la récupération."],
    troubleshooting: ["Token refusé : vérifie les caractères et le compte utilisé.", "Upload impossible : utilise le diagnostic Cloud et vérifie réseau/authentification."],
    warnings: ["Le snapshot cloud est décrit comme des données légères ; ne l'assimile pas automatiquement à un Recovery complet avec tout l'historique/média."],
    related: ["Recovery complet", "Diagnostic Cloud"],
  },
  {
    id: "cloud-diagnostic", domain: "data", title: "Diagnostiquer la synchronisation Cloud",
    aliases: ["diagnostic cloud", "cloud sync erreur", "supabase backup", "signed url test", "bucket backups"],
    route: "sync_center",
    purpose: "Tester authentification, upload, lecture et URL signée du backend Cloud.",
    prerequisites: ["Une connexion réseau est nécessaire."],
    steps: ["Ouvre les outils Cloud de Sync & Partage.", "Lance le test/diagnostic A ou B proposé.", "Lis chaque ligne : user id, bucket, upload, signed URL/fetch et parse.", "Identifie la première étape en erreur.", "Corrige authentification/réseau/configuration avant de retenter l'import réel."],
    verify: ["Les étapes upload, lecture/fetch et parse réussissent."],
    troubleshooting: ["Erreur utilisateur : reconnecte le compte.", "Upload OK mais fetch KO : inspecte les droits/URL signée.", "Parse KO : le contenu récupéré n'est pas le JSON attendu."],
    warnings: ["Les diagnostics créent des objets de test ; ils ne restaurent pas tes données."],
    related: ["Cloud token sync"],
  },
  {
    id: "auto-backup", domain: "data", title: "Configurer l'auto-backup",
    aliases: ["auto backup", "sauvegarde automatique", "recovery automatique", "dernier auto backup"],
    route: "sync_center",
    purpose: "Créer périodiquement/à la demande des sauvegardes Recovery locales selon le service prévu.",
    prerequisites: ["L'option doit être activée si tu veux l'automatisation."],
    steps: ["Ouvre Sync & Partage.", "Active Auto-backup si tu veux le mécanisme automatique.", "Utilise Auto-backup maintenant pour créer immédiatement un point de récupération.", "Vérifie la liste des auto-backups.", "Exporte le dernier auto-backup vers un fichier externe si tu veux le protéger d'une suppression locale."],
    verify: ["Le message Auto-backup OK apparaît et une entrée est disponible."],
    troubleshooting: ["Aucune sauvegarde disponible : lance Auto-backup maintenant puis réessaie."],
    warnings: ["Supprimer les auto-backups locaux sans copie externe supprime ces points de récupération."],
    related: ["Recovery complet"],
  },
  {
    id: "stats-cloud-sync", domain: "data", title: "Synchroniser les événements de stats avec Supabase",
    aliases: ["sync supabase stats", "cloud stats", "eventbuffer sync", "stats cloud"],
    route: "sync_center",
    purpose: "Envoyer les événements/statistiques autorisés vers le backend quand l'option cloud stats est activée.",
    prerequisites: ["Cloud stats est désactivé par défaut dans cet écran et nécessite le réseau/compte approprié."],
    steps: ["Ouvre Sync & Partage.", "Active Cloud stats si tu souhaites cette synchronisation.", "Utilise Sync Supabase pour forcer une tentative.", "Attends Sync Supabase OK.", "En cas d'erreur, garde les données locales et retente plus tard."],
    verify: ["Le message Sync Supabase OK confirme le passage de la file d'événements."],
    troubleshooting: ["Sync impossible : vérifie connexion et session ; ne supprime pas les événements locaux pour contourner l'erreur."],
    warnings: ["La synchronisation cloud et l'Historique local sont des mécanismes distincts."],
    related: ["Cloud sync"],
  },
  {
    id: "tournament-create", domain: "competition", title: "Créer une compétition",
    aliases: ["creer tournoi", "creer competition", "nouveau tournoi", "configuration competition"],
    route: "tournament_create",
    purpose: "Construire une compétition avec son sport/mode, ses participants et son format.",
    prerequisites: ["Prépare les profils/équipes que tu veux utiliser.", "Choisis le mode de jeu compatible avant de lancer les matchs."],
    steps: ["Ouvre Compétitions puis Créer.", "Choisis le sport et le mode proposés.", "Donne un nom à la compétition.", "Ajoute ou sélectionne les participants/équipes.", "Choisis le format disponible : championnat/round-robin, élimination ou autre format proposé par l'écran.", "Configure les paramètres du format : manches, groupes, tirage, seeds ou options disponibles.", "Relis le récapitulatif puis crée la compétition.", "Ouvre ensuite la vue du tournoi pour lancer les rencontres."],
    verify: ["La compétition apparaît dans la liste avec ses participants et son tableau/calendrier."],
    troubleshooting: ["Participant manquant : retourne aux profils/équipes puis recharge la composition.", "Format incohérent : vérifie le nombre de participants requis par l'option sélectionnée."],
    warnings: ["Une fois des matchs joués, changer la structure d'un tournoi peut rendre le tableau incohérent ; préfère configurer avant le premier match."],
    related: ["Composer les équipes", "Round-robin", "Élimination directe"],
  },
  {
    id: "tournament-teams", domain: "competition", title: "Composer les équipes d'une compétition",
    aliases: ["composer equipes tournoi", "equipes competition", "tournament compose teams", "brassage tournoi"],
    route: "tournament_compose_teams",
    purpose: "Répartir les joueurs dans les équipes utilisées par une compétition.",
    prerequisites: ["Les joueurs/profils doivent déjà exister."],
    steps: ["Ouvre l'étape Composer les équipes depuis la création/édition du tournoi.", "Ajoute les joueurs aux équipes proposées.", "Vérifie qu'un même joueur n'est pas placé deux fois si le format l'interdit.", "Renomme ou ajuste les équipes si l'écran le permet.", "Valide la composition puis retourne au tournoi."],
    verify: ["Chaque équipe affiche les bons membres et le tournoi utilise cette composition."],
    troubleshooting: ["Joueur absent : vérifie qu'il existe dans Profils et qu'il est sélectionnable pour ce sport."],
    warnings: ["La composition d'équipe peut influencer tout le tableau ; contrôle-la avant le tirage."],
    related: ["Créer une compétition"],
  },
  {
    id: "tournament-round-robin", domain: "competition", title: "Configurer un round-robin",
    aliases: ["round robin tournoi", "championnat toutes rencontres", "tout le monde joue contre tout le monde"],
    route: "tournament_create",
    purpose: "Organiser un format où chaque participant affronte les autres selon le calendrier généré.",
    prerequisites: ["Le nombre de participants doit être compatible avec le générateur du tournoi."],
    steps: ["Choisis le format Round-robin/Championnat si proposé.", "Ajoute tous les participants.", "Configure les paramètres de rencontre.", "Génère/valide le calendrier.", "Joue ou saisis chaque rencontre.", "Consulte le classement au fur et à mesure."],
    verify: ["Le calendrier contient les confrontations attendues et le classement évolue après les résultats."],
    troubleshooting: ["Nombre impair : un bye/repos peut être nécessaire selon le générateur."],
    warnings: [],
    related: ["Créer une compétition", "Classement"],
  },
  {
    id: "tournament-elimination", domain: "competition", title: "Configurer une élimination directe",
    aliases: ["elimination directe tournoi", "bracket", "tableau tournoi", "knockout competition"],
    route: "tournament_create",
    purpose: "Créer un tableau où une défaite élimine le participant selon le format choisi.",
    prerequisites: ["Choisis les participants et, si disponible, les têtes de série avant le tirage."],
    steps: ["Choisis Élimination directe.", "Ajoute les participants.", "Configure seeds/tirage si l'écran le permet.", "Génère le tableau.", "Lance les matchs depuis la vue du tournoi.", "Valide chaque résultat pour faire avancer le vainqueur."],
    verify: ["Les vainqueurs progressent vers le tour suivant."],
    troubleshooting: ["Nombre non puissance de deux : le tableau peut utiliser des byes."],
    warnings: [],
    related: ["Créer une compétition"],
  },
  {
    id: "tournament-match", domain: "competition", title: "Lancer un match depuis un tournoi",
    aliases: ["jouer match tournoi", "lancer rencontre competition", "score tournoi"],
    route: "tournament_view",
    purpose: "Ouvrir le mode de jeu avec les participants et le contexte du tournoi.",
    prerequisites: ["Le tournoi existe et la rencontre est disponible."],
    steps: ["Ouvre le tournoi.", "Sélectionne la rencontre à jouer.", "Vérifie participants et paramètres.", "Lance le match.", "À la fin, valide le résultat afin qu'il soit enregistré dans le tournoi.", "Retourne au tableau/classement pour vérifier la mise à jour."],
    verify: ["La rencontre passe à l'état terminé et le tableau/classement est recalculé."],
    troubleshooting: ["Résultat absent : vérifie que l'écran de fin a bien renvoyé le résultat au contexte tournoi."],
    warnings: [],
    related: ["Créer une compétition"],
  },
  {
    id: "profile-create", domain: "identity", title: "Créer un profil joueur",
    aliases: ["creer profil", "nouveau joueur", "profil local", "ajouter joueur"],
    route: "profiles",
    purpose: "Créer l'identité locale utilisée dans les parties et statistiques.",
    prerequisites: [],
    steps: ["Ouvre Profils.", "Choisis la création d'un nouveau profil.", "Renseigne le nom et les informations proposées.", "Choisis l'avatar/pays/dartset si souhaité.", "Enregistre.", "Sélectionne le profil comme profil actif si tu veux appliquer ses préférences."],
    verify: ["Le profil apparaît dans la liste et peut être sélectionné dans une configuration de partie."],
    troubleshooting: ["Profil non visible dans un sélecteur : reviens à Profils, vérifie qu'il est enregistré puis recharge la configuration."],
    warnings: [],
    related: ["Avatar", "Dartset", "Profil actif"],
  },
  {
    id: "profile-avatar", domain: "identity", title: "Configurer un avatar",
    aliases: ["avatar profil", "photo joueur", "creer avatar"],
    route: "avatar",
    purpose: "Associer une identité visuelle au profil.",
    prerequisites: ["Un profil peut être nécessaire selon le parcours."],
    steps: ["Ouvre Profils puis l'avatar du joueur.", "Choisis l'image/style proposé.", "Recadre/valide si l'outil le demande.", "Enregistre.", "Reviens au profil et vérifie l'affichage du médaillon."],
    verify: ["L'avatar est visible sur le profil et les sélecteurs compatibles."],
    troubleshooting: ["Avatar apparaît puis disparaît : vérifie la persistance du média et la liaison au bon profileId avant de recréer le profil."],
    warnings: [],
    related: ["Créer un profil"],
  },
  {
    id: "profile-dartset", domain: "identity", title: "Associer un set de fléchettes",
    aliases: ["dartset profil", "set de darts", "mes flechettes profil", "choisir flechettes"],
    route: "profiles",
    purpose: "Associer un équipement visuel/préféré à un profil pour les écrans compatibles.",
    prerequisites: ["Le dartset doit être créé ou disponible dans le catalogue."],
    steps: ["Ouvre Profils puis le profil concerné.", "Ouvre la section Set of Darts / Mes fléchettes.", "Choisis le set.", "Enregistre le profil.", "Dans X01, vérifie que le sélecteur reprend le set associé si cette option est utilisée."],
    verify: ["Le set est visible dans le profil et le sélecteur X01 compatible."],
    troubleshooting: ["Image absente dans X01 mais présente dans Profils : vérifie la référence d'asset et le cache du sélecteur, pas seulement le profil."],
    warnings: [],
    related: ["Créer un profil"],
  },
  {
    id: "language-sync", domain: "settings", title: "Changer la langue sans retour automatique",
    aliases: ["changer langue", "langue revient francais", "preference langue profil", "anglais espagnol settings"],
    route: "settings",
    purpose: "Appliquer la langue de l'interface et la conserver avec les préférences prévues.",
    prerequisites: [],
    steps: ["Ouvre Réglages > Langue.", "Choisis la langue.", "Vérifie que Mon Profil reflète la même préférence si la synchronisation des préférences est active.", "Navigue vers Profils puis reviens pour vérifier que la langue ne change pas.", "Si Awéna traduit localement sur Android, laisse le modèle de traduction se télécharger au premier usage si nécessaire."],
    verify: ["La langue reste stable après navigation et Awéna utilise la langue choisie."],
    troubleshooting: ["Retour au français : vérifie une ancienne préférence de profil qui écrase Settings ; les deux doivent rester synchronisées."],
    warnings: [],
    related: ["Awéna multilingue"],
  },
  {
    id: "theme-settings", domain: "settings", title: "Choisir un thème ou pack premium",
    aliases: ["changer theme", "pack arenas", "theme premium", "boutique themes"],
    route: "settings",
    purpose: "Modifier l'ambiance visuelle sans toucher aux résultats sportifs.",
    prerequisites: [],
    steps: ["Ouvre Réglages > Thème.", "Parcours les packs/thèmes disponibles.", "Prévisualise le rendu.", "Applique le thème souhaité.", "Vérifie sa persistance avec le profil si cette préférence est liée au profil."],
    verify: ["Les accents, fonds/cartes/textures prévus changent sans modifier l'Historique."],
    troubleshooting: ["Thème revient à l'ancien : vérifie la préférence sauvegardée du profil actif."],
    warnings: ["Un thème ne doit pas modifier les règles ni les scores."],
    related: ["Profil actif"],
  },
  {
    id: "intro-setting", domain: "settings", title: "Couper l'intro de l'application",
    aliases: ["couper intro", "intro off", "musique intro", "video intro"],
    route: "settings",
    purpose: "Désactiver la cinématique et son audio au lancement.",
    prerequisites: [],
    steps: ["Ouvre Réglages > INTRO.", "Passe INTRO sur OFF.", "Ferme puis relance l'application pour tester le comportement de démarrage.", "L'application doit arriver directement au choix des jeux/sports selon le flux configuré."],
    verify: ["Aucune vidéo ni musique d'intro ne se joue au prochain lancement."],
    troubleshooting: ["Audio coupé mais vidéo présente : vérifie que l'option contrôle bien les deux composants d'intro."],
    warnings: [],
    related: [],
  },
  {
    id: "privacy-delete", domain: "settings", title: "Supprimer le compte en sécurité",
    aliases: ["supprimer compte", "delete account", "effacer mon compte", "confidentialite suppression"],
    route: "settings",
    purpose: "Distinguer suppression de compte, nettoyage local et sauvegarde avant une action irréversible.",
    prerequisites: ["Crée une sauvegarde des données à conserver."],
    steps: ["Ouvre Réglages > Confidentialité/Compte.", "Lis précisément l'action proposée.", "Vérifie si elle supprime le compte connecté, des données locales ou les deux.", "Exporte une sauvegarde si nécessaire.", "Confirme uniquement après avoir compris la portée."],
    verify: ["L'application confirme l'action exécutée."],
    troubleshooting: ["Si tu veux seulement effacer un appareil, ne choisis pas Suppression du compte sans vérifier la description."],
    warnings: ["Une suppression de compte peut être irréversible."],
    related: ["Recovery complet"],
  },
  {
    id: "awena-voice-enable", domain: "awena", title: "Activer les commandes vocales Awéna",
    aliases: ["activer awena voix", "commande vocale awena", "awena ne m entend pas", "wake word awena"],
    route: "settings",
    purpose: "Permettre les commandes adressées à Awéna et le pilote vocal X01.",
    prerequisites: ["Android doit accorder la permission micro.", "La reconnaissance vocale système/on-device doit être disponible."],
    steps: ["Ouvre Réglages > Awéna.", "Active Awéna puis Commandes vocales.", "Accorde la permission Micro lorsqu'Android la demande.", "Laisse la préférence de reconnaissance sur l'appareil activée si ton appareil la supporte.", "Dis « Awéna, lance-moi une partie de X01 » ou pose une question de connaissance.", "Pendant qu'Awéna parle, le micro se suspend puis reprend afin d'éviter qu'elle s'entende elle-même."],
    verify: ["L'état de reconnaissance devient prêt/écoute et la commande est transcrite."],
    troubleshooting: ["Aucune réaction : vérifie permission micro, option Commandes vocales et service de reconnaissance Android.", "Mauvaise détection du nom : essaie Awéna/Awena/Avena ou parle après un court silence."],
    warnings: ["Le mode actuel est prévu quand l'application est ouverte au premier plan ; ce n'est pas un assistant système 24/24."],
    related: ["Configuration vocale X01"],
  },
  {
    id: "awena-x01-voice", domain: "awena", title: "Configurer X01 entièrement avec Awéna",
    aliases: ["awena lance x01", "configuration vocale x01", "lance moi une partie x01", "x01 a la voix"],
    route: "x01_config_v3",
    purpose: "Configurer une partie X01 par dialogue vocal tout en mettant à jour les vrais contrôles de l'écran.",
    prerequisites: ["Commandes vocales Awéna activées et micro autorisé."],
    steps: ["Dis « Awéna, lance-moi une partie de X01 ».", "Réponds au type de participants : joueurs ou équipes.", "Choisis/nomme les joueurs, bots ou équipes disponibles.", "Réponds au score de départ : 301, 501, 701 ou 901.", "Choisis Simple/Double/Master IN puis OUT.", "Choisis Best Of/First To et le nombre de legs/sets.", "Choisis l'ordre alterné ou aléatoire.", "Choisis la méthode de saisie : keypad, cible, presets ou voix.", "Réponds aux options audio/comptage externe proposées.", "Écoute le récapitulatif puis dis explicitement que tu confirmes le lancement."],
    verify: ["Les paramètres vocaux sont visibles dans X01ConfigV3 avant le lancement.", "La partie ne démarre qu'après confirmation finale."],
    troubleshooting: ["Si Awéna comprend mal un paramètre, répète seulement la valeur ou annule/recommence le dialogue."],
    warnings: ["Commande vocale Awéna et saisie vocale des fléchettes pendant la partie sont deux fonctions distinctes."],
    related: ["Activer les commandes vocales", "Source de comptage X01"],
  },
  {
    id: "x01-guided-config", domain: "game_setup", title: "Comprendre toute la configuration X01",
    aliases: ["config x01", "configuration x01 complete", "aide x01 config", "tous les parametres x01"],
    route: "x01_config_v3",
    purpose: "Configurer participants, règles, format, ordre, saisie et périphériques avant le lancement.",
    prerequisites: ["Les profils/équipes souhaités doivent idéalement être créés avant."],
    steps: ["Choisis Joueurs ou Équipes et le mode Duel/Multi si applicable.", "Sélectionne les profils et active les BOTS si nécessaire.", "Choisis le score de départ 301/501/701/901.", "Régle Simple/Double/Master IN.", "Régle Simple/Double/Master OUT.", "Configure les legs et sets en Best Of ou First To.", "Choisis l'ordre de départ alterné/aléatoire selon l'option.", "Choisis la méthode de saisie et les options audio.", "Configure le comptage externe si tu utilises caméra/bridge/Scolia/Grandarts/Bluetooth.", "Relis le résumé puis démarre."],
    verify: ["Le résumé de sélection correspond exactement à la partie voulue."],
    troubleshooting: ["Bouton démarrer indisponible : cherche un participant ou paramètre obligatoire non validé."],
    warnings: [],
    related: ["Format Best Of", "Équipes X01", "Comptage externe"],
  },
  {
    id: "x01-teams", domain: "game_setup", title: "Configurer des équipes X01",
    aliases: ["equipes x01", "x01 en equipe", "brassage auto x01", "equipes enregistrees x01"],
    route: "x01_config_v3",
    purpose: "Choisir la composition des équipes pour X01.",
    prerequisites: ["Les profils nécessaires doivent exister."],
    steps: ["Dans Participants, sélectionne Équipes.", "Choisis la source : Manuel, Équipes enregistrées ou Brassage auto.", "Pour Manuel, répartis les joueurs dans les équipes.", "Pour Équipes enregistrées, sélectionne les équipes existantes.", "Pour Brassage auto, sélectionne le pool de joueurs puis laisse l'application répartir selon l'option prévue.", "Vérifie la composition affichée avant de passer aux règles X01."],
    verify: ["Chaque équipe affiche les bons joueurs."],
    troubleshooting: ["Joueur absent : vérifie Profils et le pool sélectionné."],
    warnings: [],
    related: ["Configuration X01"],
  },
  {
    id: "x01-bestof-firstto", domain: "game_setup", title: "Choisir Best Of ou First To en X01",
    aliases: ["best of first to x01", "bo3 x01", "first to x01", "legs sets x01"],
    route: "x01_config_v3",
    purpose: "Définir combien de legs/sets sont nécessaires pour gagner.",
    prerequisites: [],
    steps: ["Choisis Best Of si tu veux un nombre maximal impair de manches : BO3 signifie premier à 2.", "Choisis First To si tu veux directement fixer le nombre de victoires nécessaires : First To 3 signifie premier à 3.", "Si les sets sont activés, applique la même logique au niveau des sets et configure les legs par set.", "Lis le résumé affiché avant de continuer."],
    verify: ["Le résumé indique le nombre de legs/sets correspondant à ton intention."],
    troubleshooting: ["Si BO5 est interprété comme 5 victoires, reviens au choix : BO5 = maximum 5, donc 3 victoires nécessaires."],
    warnings: [],
    related: ["Configuration X01"],
  },
  {
    id: "history-source", domain: "stats", title: "Comprendre Historique, Stats et Records",
    aliases: ["historique stats records", "source de verite historique", "records awena", "stats incoherentes"],
    route: "statsHub",
    purpose: "Comprendre d'où viennent les statistiques et pourquoi deux écrans peuvent parfois différer.",
    prerequisites: [],
    steps: ["Considère l'Historique détaillé comme la source principale des parties enregistrées.", "Utilise les filtres sport/mode/joueur pour sélectionner le bon échantillon.", "Vérifie que le profileId du joueur correspond aux parties concernées.", "Pour un record, vérifie la métrique, le nombre de parties et le mode exact.", "Si un écran semble incohérent, ouvre le détail de match et compare les données enregistrées plutôt que de te fier uniquement à une carte de cache."],
    verify: ["Le même ensemble de parties produit des totaux cohérents dans le détail et les statistiques."],
    troubleshooting: ["Valeur à zéro : distingue un vrai zéro d'une donnée absente.", "Profil avec stats manquantes : vérifie la liaison des anciens match records au bon profil."],
    warnings: ["Ne fusionne pas des profils uniquement parce qu'ils ont le même nom."],
    related: ["Filtres Stats", "Records X01"],
  },
  {
    id: "stats-filters", domain: "stats", title: "Utiliser correctement les filtres Stats",
    aliases: ["filtres stats", "filtrer historique", "stats joueur mode", "periode statistiques"],
    route: "statsHub",
    purpose: "Comparer des performances sur un périmètre précis.",
    prerequisites: [],
    steps: ["Ouvre Stats.", "Choisis le sport puis le mode si nécessaire.", "Sélectionne le joueur/équipe.", "Applique la période ou les filtres disponibles.", "Lis le nombre de matchs inclus avant d'interpréter une moyenne.", "Pour comparer deux joueurs, conserve les mêmes filtres de mode/période."],
    verify: ["Le nombre d'échantillons/matchs correspond au périmètre attendu."],
    troubleshooting: ["Résultat étrange : enlève les filtres un par un pour identifier celui qui exclut les parties."],
    warnings: [],
    related: ["Historique et Records"],
  },
  {
    id: "account-login", domain: "account", title: "Se connecter ou récupérer son compte",
    aliases: ["connexion compte", "login", "mot de passe oublie", "reset password"],
    route: "account_start",
    purpose: "Accéder au compte connecté sans confondre compte et profil joueur.",
    prerequisites: [],
    steps: ["Ouvre Compte.", "Choisis Connexion si le compte existe ou Création sinon.", "Saisis l'e-mail et le mot de passe.", "Si le mot de passe est oublié, utilise le parcours de réinitialisation.", "Une fois connecté, retourne aux réglages/profils et vérifie la session."],
    verify: ["Le statut de compte indique la connexion."],
    troubleshooting: ["Connexion refusée : vérifie e-mail/mot de passe avant de toucher aux données locales."],
    warnings: ["Un profil local et un compte en ligne sont deux objets différents."],
    related: ["Sauvegarde Recovery"],
  },
  {
    id: "online-lobby", domain: "online", title: "Rejoindre ou reprendre une partie Online",
    aliases: ["partie online", "lobby code", "salon en ligne", "rejoindre lobby"],
    route: "online",
    purpose: "Utiliser un lobby/code pour une rencontre en ligne compatible.",
    prerequisites: ["Connexion réseau et compte/session appropriés."],
    steps: ["Ouvre Online.", "Crée ou rejoins un lobby selon l'option disponible.", "Partage/saisis le code de lobby.", "Attends que les participants soient prêts.", "Lance le mode compatible.", "En cas d'interruption, reviens dans Online et utilise la reprise si le lobby est encore valide."],
    verify: ["Le lobby affiche les participants et l'état prêt/connecté."],
    troubleshooting: ["Code invalide : vérifie le code exact et si le lobby existe encore."],
    warnings: [],
    related: ["Messages", "Amis"],
  },
  {
    id: "friends", domain: "online", title: "Gérer amis et invitations",
    aliases: ["ajouter ami", "invitation ami", "friends", "joueur proche"],
    route: "friends",
    purpose: "Gérer les relations sociales utilisées par les fonctions Online.",
    prerequisites: ["Compte/session réseau pour les fonctions connectées."],
    steps: ["Ouvre Online > Amis.", "Consulte les invitations.", "Accepte/refuse selon ton choix.", "Utilise la recherche ou les joueurs proches si disponible.", "Ouvre ensuite Messages ou Online pour interagir."],
    verify: ["La relation apparaît dans la liste d'amis."],
    troubleshooting: ["Liste vide : vérifie connexion et filtres."],
    warnings: [],
    related: ["Messages", "Online"],
  },
  {
    id: "clubs", domain: "online", title: "Utiliser les Clubs",
    aliases: ["club", "clubs online", "rejoindre club", "creer club"],
    route: "online_clubs",
    purpose: "Accéder aux fonctions communautaires de club disponibles dans l'application.",
    prerequisites: ["Connexion réseau et droits adaptés selon l'action."],
    steps: ["Ouvre Online > Clubs.", "Recherche ou ouvre le club.", "Consulte membres/informations.", "Utilise les actions disponibles selon tes droits.", "Passe ensuite aux compétitions/messages si le club les utilise."],
    verify: ["Le club et ses membres/actions se chargent."],
    troubleshooting: ["Action absente : elle peut dépendre du rôle/droits du compte."],
    warnings: [],
    related: ["Online"],
  },
  {
    id: "ads-settings", domain: "settings", title: "Comprendre les réglages Publicité",
    aliases: ["reglages pub", "admob", "publicite fin partie", "banniere pub"],
    route: "settings",
    purpose: "Comprendre la différence entre emplacements de pub, écrans de fin et AdMob.",
    prerequisites: [],
    steps: ["Ouvre Réglages > PUB.", "Parcours les sous-onglets Publicité, Fin de partie et AdMob si présents.", "Vérifie les options réellement disponibles pour ta formule/version.", "Pour un diagnostic AdMob, distingue consentement, chargement du SDK, disponibilité de l'inventaire et placement dans l'écran.", "Ne modifie pas plusieurs réglages à la fois lors d'un diagnostic."],
    verify: ["Les placements activés apparaissent aux emplacements prévus quand une annonce est disponible."],
    troubleshooting: ["Pas de publicité : cela peut venir du consentement, du réseau, de l'inventaire ou du mode de test ; l'absence d'une bannière n'implique pas forcément un bug UI."],
    warnings: ["Les annonces et l'abonnement/premium peuvent obéir à des règles distinctes."],
    related: [],
  },
  {
    id: "performance-storage", domain: "troubleshooting", title: "Diagnostiquer lenteurs et stockage",
    aliases: ["application lente", "navigation lente", "freeze", "stockage 350 mo", "memoire app"],
    route: "settings",
    purpose: "Identifier si un ralentissement vient des médias, du stockage, du cache ou d'un écran particulier.",
    prerequisites: [],
    steps: ["Note l'écran exact et l'action qui déclenche le délai.", "Vérifie l'espace libre de l'appareil.", "Compare si le problème concerne les profils/avatars/dartsets ou toutes les pages.", "Regarde les diagnostics mémoire/store disponibles en développement ou dans les écrans prévus.", "Évite de supprimer l'Historique pour tester ; fais d'abord une sauvegarde.", "Après optimisation, reteste la même séquence avec les mêmes données."],
    verify: ["Le temps de réponse s'améliore sans perte de données/fonctions."],
    troubleshooting: ["Images apparaissent puis disparaissent : suspecte la résolution/cache/persistance des médias plutôt qu'un simple problème de CSS."],
    warnings: ["Ne vide jamais les données de l'application sans sauvegarde si tu veux conserver l'Historique."],
    related: ["Recovery complet"],
  },
  {
    id: "change-device", domain: "data", title: "Changer de téléphone sans perdre ses données",
    aliases: ["changer telephone", "nouvel appareil", "migration android", "transferer application"],
    route: "storage_vault",
    purpose: "Migrer profils, historique et réglages vers un autre appareil en réduisant le risque de perte.",
    prerequisites: ["Ancien appareil encore accessible de préférence."],
    steps: ["Sur l'ancien appareil, crée une sauvegarde Recovery complète et une copie externe.", "Optionnel : exporte également les données ciblées/peer sync si tu veux un second filet.", "Installe la même version ou une version compatible sur le nouvel appareil.", "Importe/restaure la sauvegarde.", "Vérifie Profils, Historique, Stats et médias.", "Seulement après validation, considère le nettoyage de l'ancien appareil."],
    verify: ["Les profils et matchs attendus sont visibles sur le nouvel appareil."],
    troubleshooting: ["Compte connecté mais historique vide : rappelle-toi que la connexion n'est pas forcément la sauvegarde complète ; restaure l'archive."],
    warnings: ["Ne désinstalle pas l'ancien appareil avant d'avoir vérifié la restauration."],
    related: ["Recovery complet", "Peer sync"],
  },
  {
    id: "safe-troubleshooting", domain: "troubleshooting", title: "Méthode de diagnostic sans perdre les données",
    aliases: ["bug application quoi faire", "diagnostic awena", "ça bug", "ne marche pas app"],
    route: "settings",
    purpose: "Diagnostiquer une fonction complexe sans effacer les données ni modifier plusieurs variables à la fois.",
    prerequisites: [],
    steps: ["Note version, appareil/OS, écran, action exacte et message d'erreur.", "Crée une sauvegarde si tu vas toucher au stockage ou à la configuration.", "Reproduis le problème une fois.", "Consulte les diagnostics spécifiques de la fonction : Cast, Viewer, Cloud, NAS, etc.", "Change une seule hypothèse à la fois.", "Reteste la même séquence.", "Si tu me donnes le message exact, je peux l'interpréter dans le contexte du workflow."],
    verify: ["Tu sais quelle étape précise échoue et quelle étape réussit."],
    troubleshooting: ["Si le problème est intermittent, note l'heure et les dernières actions pour comparer les logs."],
    warnings: ["Évite les solutions destructrices de type vider les données comme premier test."],
    related: ["Recovery complet"],
  },
  {
    id: "storage-vault-overview", domain: "data", title: "Comprendre le Coffre de sauvegarde",
    aliases: ["coffre sauvegarde", "storage vault", "page sauvegarde", "restaurer parties sauver expert"],
    route: "storage_vault",
    purpose: "Comprendre les zones Restaurer, Parties, Sauver, Expert et les différentes destinations de stockage.",
    prerequisites: [],
    steps: ["Ouvre Réglages > Sauvegarde.", "Commence par Restaurer si ton objectif est de récupérer un état complet.", "Utilise Parties pour les sauvegardes/entrées de parties individuelles quand elles sont disponibles.", "Utilise Sauver pour créer une nouvelle sauvegarde vers la destination choisie.", "Réserve Expert aux opérations avancées/diagnostics que tu comprends.", "Avant toute restauration, inspecte l'archive et sa date."],
    verify: ["La section active correspond à ton objectif : récupérer, consulter une partie ou créer une copie."],
    troubleshooting: ["Si tu hésites entre deux zones, dis-moi ce que tu veux obtenir — changer de téléphone, récupérer une partie, faire une copie NAS, etc."],
    warnings: ["Évite les actions Expert si une procédure standard répond déjà au besoin."],
    related: ["Recovery complet", "NAS privé", "Cloud R2"],
  },
  {
    id: "storage-trash", domain: "data", title: "Utiliser la corbeille des sauvegardes",
    aliases: ["corbeille sauvegarde", "trash cloud backup", "recuperer sauvegarde supprimee"],
    route: "storage_vault",
    purpose: "Gérer les sauvegardes placées dans une zone de corbeille lorsqu'elle est disponible.",
    prerequisites: ["La sauvegarde doit encore être présente dans la corbeille/slot correspondant."],
    steps: ["Ouvre Sauvegarde puis la zone de corbeille si elle est proposée.", "Identifie l'archive par date/titre/métadonnées.", "Inspecte-la avant toute restauration.", "Restaure ou exporte l'archive si l'action est proposée.", "Supprime définitivement seulement lorsque tu es certain de ne plus en avoir besoin."],
    verify: ["L'archive restaurée réapparaît dans l'espace actif ou ses données sont récupérées."],
    troubleshooting: ["Corbeille vide : l'archive a peut-être été supprimée définitivement ou appartient à une autre destination."],
    warnings: ["Une suppression définitive peut être irréversible."],
    related: ["Inspecter une sauvegarde"],
  },
  {
    id: "single-match-restore", domain: "data", title: "Restaurer une partie sauvegardée",
    aliases: ["restaurer une partie", "partie sauvegardee", "restore match", "sauvegarde match individuel"],
    route: "storage_vault",
    purpose: "Récupérer une entrée de partie individuelle sans nécessairement restaurer tout le store.",
    prerequisites: ["Une entrée de partie exploitable doit être présente dans Sauvegarde > Parties."],
    steps: ["Ouvre Sauvegarde > Parties.", "Sélectionne la partie voulue.", "Vérifie son sport, mode, date et participants.", "Appuie sur Restaurer cette partie.", "Retourne dans Historique/Stats pour vérifier son apparition."],
    verify: ["La partie est présente dans l'Historique avec les bons participants et le bon mode."],
    troubleshooting: ["Bouton indisponible : l'entrée peut ne pas contenir un matchId exploitable.", "Bloc brut détecté : exporte-le pour diagnostic plutôt que de le forcer comme restauration principale."],
    warnings: ["Évite de restaurer plusieurs fois la même partie si le moteur ne déduplique pas automatiquement ce format."],
    related: ["Historique et Records"],
  },
  {
    id: "secure-backup", domain: "data", title: "Comprendre l'export sécurisé",
    aliases: ["export securise", "backup chiffre", "aes sauvegarde", "hash sha 256 backup", "envelope backup"],
    route: "sync_center",
    purpose: "Créer une enveloppe de sauvegarde avec les mécanismes d'intégrité/compression/chiffrement disponibles.",
    prerequisites: ["Conserve toute clé/mot de passe nécessaire si tu actives un chiffrement qui en dépend."],
    steps: ["Dans Sync & Partage, active Export sécurisé.", "Choisis les options proposées : intégrité/hash, compression et chiffrement si elles sont exposées.", "Lance l'export Recovery.", "Conserve le fichier sans le modifier.", "Lors d'un import, laisse l'application déballer l'enveloppe et vérifier son format."],
    verify: ["Le payload est identifié comme une enveloppe de backup reconnue et l'import ne signale pas d'erreur d'intégrité."],
    troubleshooting: ["Import impossible après modification manuelle du JSON : restaure le fichier original.", "Mot de passe/clé perdue : un backup chiffré peut devenir inutilisable."],
    warnings: ["Le chiffrement protège la confidentialité mais impose de conserver le secret nécessaire à la restauration."],
    related: ["Recovery complet"],
  },
  {
    id: "sync-import-report", domain: "data", title: "Lire un rapport d'import",
    aliases: ["rapport import", "import report", "comprendre rapport sync", "source payload"],
    route: "sync_center",
    purpose: "Comprendre ce que l'import vient réellement de modifier.",
    prerequisites: ["Un import a été exécuté."],
    steps: ["Repère l'horodatage du rapport.", "Lis le kind/type du payload.", "Lis la source : local, cloud, peer, fichier, etc.", "Compare les compteurs/états avant et après lorsqu'ils sont présents.", "Vérifie ensuite les écrans concernés plutôt que de supposer que tout a été importé."],
    verify: ["Le rapport et l'état visible de l'application racontent la même opération."],
    troubleshooting: ["Rapport absent après erreur : reprends le message d'erreur brut et le type de fichier."],
    warnings: [],
    related: ["Import JSON"],
  },
  {
    id: "cloud-vs-recovery", domain: "data", title: "Différence entre snapshot Cloud et Recovery",
    aliases: ["snapshot cloud ou recovery", "difference backup cloud recovery", "cloud sauvegarde complete"],
    route: "sync_center",
    purpose: "Éviter de croire qu'un snapshot léger de synchronisation remplace forcément une archive de récupération complète.",
    prerequisites: [],
    steps: ["Utilise le snapshot Cloud pour transférer les données légères prévues par ce workflow.", "Utilise Recovery pour une sauvegarde destinée à reconstruire l'état important de l'application.", "Pour un changement de téléphone, privilégie une Recovery complète en plus du compte/cloud.", "Après restauration, vérifie Historique et médias, pas seulement le profil."],
    verify: ["Tu sais quel fichier/flux contient réellement l'Historique et les données attendues."],
    troubleshooting: ["Nouveau téléphone connecté mais historique vide : restaure la Recovery plutôt que d'attendre que le snapshot léger recrée tout."],
    warnings: [],
    related: ["Recovery complet", "Cloud token sync"],
  },
  {
    id: "cast-quick-dock", domain: "screens", title: "Utiliser le dock rapide Cast/Viewer",
    aliases: ["dock cast viewer", "bouton cast viewer rapide", "qr viewer rapide", "lancer cast depuis dock"],
    route: "cast_host",
    purpose: "Accéder rapidement à l'état Cast ou au QR Viewer sans parcourir tous les réglages.",
    prerequisites: [],
    steps: ["Ouvre le contrôle rapide Cast/Viewer lorsqu'il est disponible.", "Choisis Cast pour lancer/arrêter la session TV.", "Choisis Viewer pour afficher/créer la session et son QR si proposé.", "Utilise Réglages écrans pour les diagnostics et paramètres avancés."],
    verify: ["Le dock reflète l'état actif de Cast/Viewer."],
    troubleshooting: ["État différent de la page Écrans : ouvre Réglages écrans et vérifie la session réellement active."],
    warnings: [],
    related: ["Lancer un Cast TV", "Créer un Viewer tablette"],
  },
  {
    id: "viewer-preview", domain: "screens", title: "Tester le Viewer en aperçu local",
    aliases: ["apercu viewer", "preview viewer", "tester viewer sans tablette"],
    route: "viewer_host",
    purpose: "Vérifier le rendu Viewer sur l'appareil hôte avant de passer sur la tablette.",
    prerequisites: ["Une session Viewer doit être active."],
    steps: ["Crée une session Viewer.", "Utilise Aperçu local si l'action est proposée.", "Vérifie l'écran d'attente puis lance une partie/test.", "Compare les joueurs/scores avec l'écran principal.", "Ensuite ouvre le même Viewer sur la tablette."],
    verify: ["L'aperçu local reçoit les mêmes snapshots que le Viewer distant."],
    troubleshooting: ["Aperçu local fonctionne mais tablette non : concentre le diagnostic sur réseau/lien côté tablette."],
    warnings: [],
    related: ["Diagnostic Viewer"],
  },
  {
    id: "camera-score-test", domain: "external_scoring", title: "Tester le scoring caméra avant une partie",
    aliases: ["tester scoring camera", "test cible camera", "verifier calibration score"],
    route: "x01_device_camera",
    purpose: "Valider la calibration avec quelques zones connues avant d'enregistrer une vraie partie.",
    prerequisites: ["Calibration enregistrée."],
    steps: ["Passe le téléphone/caméra en mode score.", "Teste le BULL puis un simple connu.", "Teste un double et un triple proches d'une zone facile à reconnaître.", "Vérifie segment et multiplicateur reçus.", "Si plusieurs tests sont faux dans la même direction, refais/ajuste la calibration."],
    verify: ["Les tests renvoient les zones attendues de manière stable."],
    troubleshooting: ["Erreurs seulement près des fils : améliore la précision de calibration/cadrage.", "Erreurs globales : la géométrie ou l'orientation est incorrecte."],
    warnings: ["Ne commence pas une partie officielle avec une calibration non vérifiée."],
    related: ["Calibration caméra"],
  },
  {
    id: "external-fallback", domain: "external_scoring", title: "Revenir au scoring manuel si un périphérique tombe",
    aliases: ["peripherique tombe en panne x01", "revenir keypad", "fallback scoring", "bridge coupe partie"],
    route: "x01_config_v3",
    purpose: "Continuer à jouer lorsque la source externe ne peut plus fournir les tirs.",
    prerequisites: ["La partie doit permettre une méthode de saisie de secours selon son état."],
    steps: ["Ne supprime pas la partie en cours.", "Vérifie si la configuration/écran permet de repasser sur keypad/cible/presets.", "Si un changement à chaud n'est pas disponible, note le score courant avant toute sortie.", "Désactive/reconnecte la source externe.", "Reprends avec la méthode manuelle compatible en conservant le score."],
    verify: ["Le score courant reste inchangé et les nouveaux tirs sont acceptés par la méthode de secours."],
    troubleshooting: ["Si le changement n'est pas possible pendant la partie, utilise Undo/état sauvegardé plutôt que de recréer un match à l'aveugle."],
    warnings: ["Évite de laisser deux sources actives qui envoient le même tir en double."],
    related: ["Source de comptage X01"],
  },
  {
    id: "x01-bots", domain: "game_setup", title: "Ajouter des BOTS IA en X01",
    aliases: ["bot x01", "ajouter ia x01", "bots ia configuration x01"],
    route: "x01_config_v3",
    purpose: "Ajouter des adversaires IA aux participants X01 lorsque le mode les autorise.",
    prerequisites: ["Le panneau BOTS doit être activable dans la configuration."],
    steps: ["Dans Participants, active BOTS IA.", "Ouvre le catalogue de bots.", "Sélectionne le ou les bots voulus.", "Vérifie leur présence dans la liste des participants.", "Configure ensuite score, IN/OUT et format normalement."],
    verify: ["Les bots apparaissent dans le roster avant le lancement."],
    troubleshooting: ["Bot absent : vérifie que le panneau est ON et que tu n'as pas atteint la limite de participants."],
    warnings: [],
    related: ["Configuration X01"],
  },
  {
    id: "tournament-seeding", domain: "competition", title: "Comprendre tirage et têtes de série",
    aliases: ["seed tournoi", "tete de serie", "tirage competition", "seeding"],
    route: "tournament_create",
    purpose: "Répartir les participants en protégeant ou non certains favoris selon les options du format.",
    prerequisites: ["Le format choisi doit prendre en charge seeds/tirage."],
    steps: ["Ajoute tous les participants.", "Active/configure les têtes de série si l'option existe.", "Attribue les seeds selon le classement ou la règle voulue.", "Lance/génère le tirage.", "Vérifie visuellement que les seeds sont placés comme prévu avant le premier match."],
    verify: ["Le tableau respecte la logique de placement du format."],
    troubleshooting: ["Seeds côte à côte trop tôt : vérifie la numérotation/ordre avant de régénérer."],
    warnings: ["Une fois le tournoi commencé, évite de refaire le tirage."],
    related: ["Élimination directe"],
  },
  {
    id: "tournament-resume", domain: "competition", title: "Reprendre une compétition déjà commencée",
    aliases: ["reprendre tournoi", "continuer competition", "tournoi en cours"],
    route: "tournament_view",
    purpose: "Continuer le tableau/calendrier sans recréer le tournoi.",
    prerequisites: ["Le tournoi doit être enregistré."],
    steps: ["Ouvre Compétitions.", "Sélectionne le tournoi existant.", "Vérifie les matchs déjà terminés.", "Repère la prochaine rencontre disponible.", "Lance-la depuis la vue du tournoi.", "Après le résultat, vérifie la progression du tableau/classement."],
    verify: ["Les matchs précédents sont conservés et la prochaine rencontre se débloque correctement."],
    troubleshooting: ["Tournoi absent : vérifie Historique/stockage et la version de données avant d'en recréer un."],
    warnings: [],
    related: ["Lancer un match depuis un tournoi"],
  },
  {
    id: "active-profile", domain: "identity", title: "Comprendre le profil actif",
    aliases: ["profil actif", "mon profil preference", "quel profil est actif", "preference profil"],
    route: "profiles",
    purpose: "Comprendre pourquoi certaines préférences suivent le profil sélectionné.",
    prerequisites: [],
    steps: ["Ouvre Profils.", "Sélectionne le profil qui doit devenir actif.", "Vérifie son médaillon/statut actif.", "Ouvre Réglages et contrôle les préférences liées au profil : langue, thème ou autres options prévues.", "Si tu changes de profil, vérifie quelles préférences sont volontairement rechargées."],
    verify: ["Le profil actif affiché correspond à celui utilisé par les écrans qui consomment ses préférences."],
    troubleshooting: ["Réglage revient à une ancienne valeur : cherche une préférence enregistrée dans le profil actif qui écrase la valeur globale."],
    warnings: [],
    related: ["Changer la langue", "Choisir un thème"],
  },
  {
    id: "account-vs-profile", domain: "account", title: "Différence entre compte et profil joueur",
    aliases: ["compte ou profil", "difference compte profil", "profil local compte cloud"],
    route: "profiles",
    purpose: "Éviter de confondre l'identité de connexion avec les joueurs utilisés dans les matchs.",
    prerequisites: [],
    steps: ["Le compte sert à la connexion et aux fonctions en ligne.", "Le profil joueur sert à jouer, afficher un avatar et rattacher les statistiques.", "Plusieurs profils joueurs peuvent exister sur un appareil même si un seul compte est connecté.", "Sauvegarde et synchronisation déterminent ensuite quelles données suivent vers un autre appareil."],
    verify: ["Tu sais quelle action cible le compte et laquelle cible seulement un profil."],
    troubleshooting: ["Connexion réussie mais joueur absent : ouvre Profils, car le compte ne recrée pas forcément tous les profils locaux sans restauration."],
    warnings: ["Ne supprime pas le compte si tu voulais seulement supprimer un profil joueur."],
    related: ["Créer un profil", "Recovery complet"],
  },
  {
    id: "awena-translation", domain: "awena", title: "Comprendre la traduction locale d'Awéna",
    aliases: ["awena traduction", "awena anglais espagnol", "modele traduction awena", "ml kit awena"],
    route: "settings",
    purpose: "Faire répondre Awéna dans la langue de l'application tout en conservant sa base canonique.",
    prerequisites: ["Sur Android, certaines langues peuvent nécessiter le téléchargement local d'un modèle la première fois."],
    steps: ["Choisis la langue dans Réglages.", "Pose une question à Awéna.", "Si un modèle manque, laisse Android télécharger la ressource nécessaire.", "La question est ramenée vers la base de connaissances puis la réponse est rendue dans la langue choisie.", "Vérifie que les notations sportives T20, D16, DBULL restent intactes."],
    verify: ["Awéna comprend/répond dans la langue choisie et garde les noms/notations techniques cohérents."],
    troubleshooting: ["Première réponse non traduite : vérifie réseau pour le téléchargement initial du modèle, puis réessaie."],
    warnings: [],
    related: ["Changer la langue"],
  },
  {
    id: "awena-voice-troubleshoot", domain: "awena", title: "Diagnostiquer la reconnaissance vocale Awéna",
    aliases: ["awena ne repond pas voix", "micro awena bug", "speech recognizer awena", "awena m entend mal"],
    route: "settings",
    purpose: "Identifier si le problème vient du micro, de la reconnaissance, du wake-word ou du dialogue X01.",
    prerequisites: ["Commandes vocales activées."],
    steps: ["Vérifie la permission Micro Android.", "Vérifie l'état disponible/prêt du moteur de reconnaissance.", "Teste une phrase simple avec le nom Awéna clairement prononcé.", "Si le nom est mal reconnu, essaie Awena/Avena et parle sans bruit de fond.", "Vérifie qu'Awéna n'est pas en train de parler : l'écoute se met volontairement en pause pendant sa voix.", "Teste ensuite la commande X01."],
    verify: ["La transcription arrive puis l'intention est reconnue."],
    troubleshooting: ["Transcription vide : problème micro/reconnaissance.", "Transcription correcte mais aucune action : problème d'intention ou formulation ; reformule la commande."],
    warnings: [],
    related: ["Activer les commandes vocales"],
  },
  {
    id: "ads-consent", domain: "settings", title: "Comprendre consentement et chargement AdMob",
    aliases: ["consentement admob", "ump publicite", "pub ne charge pas", "diagnostic admob"],
    route: "settings",
    purpose: "Distinguer l'autorisation de consentement, l'initialisation publicitaire et la disponibilité réelle d'une annonce.",
    prerequisites: ["Connexion réseau pour une annonce réelle."],
    steps: ["Ouvre les réglages Publicité/AdMob.", "Vérifie l'état de consentement si UMP est utilisé.", "Vérifie que le SDK/placement est initialisé.", "Vérifie que l'emplacement de la page est activé.", "Teste en mode prévu par l'application.", "Si aucune annonce n'arrive, consulte le diagnostic avant de modifier l'interface."],
    verify: ["Le diagnostic indique un emplacement initialisé et, lorsqu'une annonce existe, un chargement/rendu."],
    troubleshooting: ["Consentement incomplet : finalise le parcours UMP.", "SDK OK mais no-fill : l'inventaire peut être indisponible sans que l'intégration soit cassée."],
    warnings: ["Ne confonds pas annonces de test et revenus de production."],
    related: ["Réglages Publicité"],
  },
  {
    id: "share-match-pack", domain: "data", title: "Importer une partie partagée",
    aliases: ["partie partagee", "shared match", "import shared match", "pack match"],
    route: "sync_center",
    purpose: "Importer un paquet de partie partagé lorsqu'il utilise le format supporté.",
    prerequisites: ["Le paquet doit provenir d'une source de confiance et d'un format reconnu."],
    steps: ["Ouvre Sync & Partage.", "Charge/colle le paquet de partie partagé.", "Laisse l'importeur identifier son format.", "Importe.", "Vérifie la partie dans Historique et son rattachement aux participants."],
    verify: ["La partie apparaît avec son sport/mode et ses données attendues."],
    troubleshooting: ["Format inconnu : ne transforme pas le fichier à la main ; demande un export compatible."],
    warnings: ["Une partie partagée n'est pas un backup complet du compte/appareil."],
    related: ["Import JSON"],
  },
  {
    id: "viewer-session-expiry", domain: "screens", title: "Comprendre l'expiration d'une session Viewer",
    aliases: ["viewer expire", "session viewer expiree", "code viewer ancien"],
    route: "viewer_host",
    purpose: "Comprendre pourquoi un ancien lien/code Viewer peut cesser de fonctionner.",
    prerequisites: [],
    steps: ["Regarde si la session affiche une expiration.", "Si elle a expiré ou a été arrêtée, crée une nouvelle session.", "Utilise le nouveau code/QR sur la tablette.", "Ferme l'ancien Viewer pour éviter toute confusion."],
    verify: ["Le nouveau Viewer passe à connecté."],
    troubleshooting: ["Ancien code toujours affiché sur la tablette : recharge avec le nouveau lien."],
    warnings: [],
    related: ["Créer un Viewer tablette"],
  },

];


function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}
function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}
function navAction(entry: AwenaProcedureEntry): AwenaAction[] | undefined {
  if (!entry.route) return undefined;
  return [{ id: `procedure-nav-${entry.id}`, label: "Ouvrir l’écran", kind: "navigate", route: entry.route }];
}
function fullText(entry: AwenaProcedureEntry) {
  const blocks = [
    `## ${entry.title.toUpperCase()}`,
    entry.purpose,
    entry.prerequisites.length ? `## AVANT DE COMMENCER\n${bullets(entry.prerequisites)}` : "",
    `## ÉTAPES\n${numbered(entry.steps)}`,
    entry.verify.length ? `## COMMENT VÉRIFIER QUE C’EST BON\n${bullets(entry.verify)}` : "",
    entry.troubleshooting.length ? `## SI ÇA NE MARCHE PAS\n${bullets(entry.troubleshooting)}` : "",
    entry.warnings.length ? `## PRÉCAUTIONS\n${bullets(entry.warnings)}` : "",
    entry.related.length ? `## JE PEUX AUSSI T’EXPLIQUER\n${entry.related.join(" · ")}` : "",
    "> Tu peux maintenant me répondre simplement « étape 3 », « et ensuite ? », « ça ne marche pas », « quels sont les prérequis ? » ou me donner le message d’erreur exact.",
  ];
  return blocks.filter(Boolean).join("\n\n");
}
function rememberedId(rememberedTopic?: string) {
  const prefix = "procedure:";
  return rememberedTopic?.startsWith(prefix) ? rememberedTopic.slice(prefix.length) : "";
}
function scoreEntry(entry: AwenaProcedureEntry, question: string, context: AwenaRuntimeContext, rememberedTopic?: string) {
  const q = norm(question);
  const qTokens = new Set(tokens(q));
  let score = 0;
  const route = norm(context.route || "");
  if (entry.route && norm(entry.route) === route) score += 5.5;
  for (const raw of entry.aliases) {
    const alias = norm(raw);
    if (!alias) continue;
    if (q === alias) score += 30;
    else if (alias.length >= 4 && q.includes(alias)) score += 15;
    const aliasTokens = tokens(alias);
    let matched = 0;
    for (const token of aliasTokens) {
      if (qTokens.has(token)) { matched += 1; score += token.length >= 6 ? 3.2 : 1.8; }
    }
    if (aliasTokens.length >= 2 && matched === aliasTokens.length) score += 6;
  }
  const title = norm(entry.title);
  if (title && q.includes(title)) score += 14;
  if (rememberedId(rememberedTopic) === entry.id) score += 11;
  if (/tutoriel|guide|etape|étape|prerequis|prérequis|bloque|bloqué|marche pas|fonctionne pas|erreur|ensuite|apres|après|verifier|vérifier/.test(q)) {
    if (entry.route && norm(entry.route) === route) score += 3;
  }
  return score;
}
function followupText(entry: AwenaProcedureEntry, question: string) {
  const q = norm(question);
  const stepMatch = q.match(/(?:etape|step)\s*(\d{1,2})/);
  if (stepMatch) {
    const index = Number(stepMatch[1]) - 1;
    if (index >= 0 && index < entry.steps.length) {
      const before = index > 0 ? `\n\n**Juste avant :** ${entry.steps[index - 1]}` : "";
      const after = index + 1 < entry.steps.length ? `\n\n**Ensuite :** ${entry.steps[index + 1]}` : "\n\nC’est la dernière étape du tutoriel.";
      return `## ${entry.title.toUpperCase()} · ÉTAPE ${index + 1}\n${entry.steps[index]}${before}${after}`;
    }
  }
  if (/prerequis|prérequis|avant de commencer|il faut quoi|besoin de quoi/.test(q)) {
    return entry.prerequisites.length
      ? `## PRÉREQUIS · ${entry.title.toUpperCase()}\n${bullets(entry.prerequisites)}`
      : `## PRÉREQUIS · ${entry.title.toUpperCase()}\nAucun prérequis particulier n’est déclaré pour ce parcours.`;
  }
  if (/marche pas|fonctionne pas|bloque|bloqué|erreur|probleme|problème|hors ligne|fige|figé/.test(q)) {
    return entry.troubleshooting.length
      ? `## DIAGNOSTIC · ${entry.title.toUpperCase()}\n${bullets(entry.troubleshooting)}\n\n> Donne-moi le message exact ou l’étape où tu es bloqué et je poursuis le diagnostic dans ce même contexte.`
      : null;
  }
  if (/verifier|vérifier|comment savoir|c est bon|cest bon|validation/.test(q)) {
    return entry.verify.length
      ? `## VÉRIFICATION · ${entry.title.toUpperCase()}\n${bullets(entry.verify)}`
      : null;
  }
  if (/danger|attention|precaution|précaution|risque/.test(q)) {
    return entry.warnings.length
      ? `## PRÉCAUTIONS · ${entry.title.toUpperCase()}\n${bullets(entry.warnings)}`
      : "Aucune précaution particulière n’est déclarée pour ce parcours.";
  }
  if (/et ensuite|ensuite|et apres|et après|apres ca|après ça/.test(q)) {
    return `## SUITE DU PARCOURS · ${entry.title.toUpperCase()}\n${numbered(entry.steps)}\n\nSi tu me dis l’étape que tu viens de terminer, je peux me concentrer sur la suivante.`;
  }
  return null;
}

export function answerAwenaProceduralAcademy(question: string, context: AwenaRuntimeContext, rememberedTopic?: string): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: { entry: AwenaProcedureEntry; score: number } | null = null;
  for (const entry of PROCEDURES) {
    const score = scoreEntry(entry, q, context, rememberedTopic);
    if (!best || score > best.score) best = { entry, score };
  }

  const remembered = rememberedId(rememberedTopic);
  if (remembered) {
    const entry = PROCEDURES.find((item) => item.id === remembered);
    const contextualFollowup = /^(?:etape|step)\s*\d{1,2}$|^(?:et ensuite|ensuite|et apres|et après|apres ca|après ça)$|^(?:ca ne marche pas|ça ne marche pas|marche pas|fonctionne pas|je suis bloque|je suis bloqué|prerequis|prérequis|comment verifier|comment vérifier|c est bon|cest bon)$/i.test(String(question || "").trim());
    if (entry && (contextualFollowup || best?.entry.id === entry.id || (best?.score || 0) < 14)) {
      const follow = followupText(entry, question);
      if (follow) return { text: follow, modeId: context.mode || null, knowledgeTopic: `procedure:${entry.id}`, actions: navAction(entry) };
    }
  }

  if (!best || best.score < 10) return null;

  const follow = followupText(best.entry, question);
  return {
    text: follow || fullText(best.entry),
    modeId: context.mode || null,
    knowledgeTopic: `procedure:${best.entry.id}`,
    actions: navAction(best.entry),
  };
}

export function awenaProceduralCount() { return PROCEDURES.length; }
export function awenaProceduralAliasCount() { return PROCEDURES.reduce((sum, entry) => sum + entry.aliases.length, 0); }
export function awenaProceduralStepCount() { return PROCEDURES.reduce((sum, entry) => sum + entry.steps.length, 0); }
export function awenaProceduralTroubleshootingCount() { return PROCEDURES.reduce((sum, entry) => sum + entry.troubleshooting.length, 0); }
export function awenaProceduralDomains() { return [...new Set(PROCEDURES.map((entry) => entry.domain))]; }

const COMPLEX_ROUTES = new Set(PROCEDURES.map((entry) => entry.route).filter(Boolean).map((route) => String(route)));
export function isAwenaComplexRoute(route?: string) { return !!route && COMPLEX_ROUTES.has(String(route)); }
export function awenaProcedurePromptForRoute(route?: string) {
  const value = String(route || "");
  const entries = PROCEDURES.filter((entry) => entry.route === value);
  if (!entries.length) return "Explique-moi en détail cette fonction, ses étapes, ses prérequis, ses vérifications et les erreurs fréquentes.";
  const labels = entries.slice(0, 8).map((entry) => entry.title).join(", ");
  return `Guide-moi pas à pas sur cet écran. Les sujets possibles ici sont : ${labels}. Commence par m’expliquer l’usage général, les prérequis, les étapes, comment vérifier que ça fonctionne et les erreurs fréquentes. Reste dans ce contexte pour mes questions suivantes.`;
}
