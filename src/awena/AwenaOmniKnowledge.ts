import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

type OmniDomain = "darts" | "petanque" | "pingpong" | "molkky" | "football" | "babyfoot" | "dice" | "stats" | "competition" | "app";
type OmniKind = "official" | "glossary" | "strategy" | "technique" | "training" | "equipment" | "stats" | "competition" | "psychology" | "safety" | "probability" | "format" | "architecture" | "backup" | "profiles" | "troubleshooting" | "performance" | "privacy" | "camera" | "screens" | "online" | "settings" | "awena" | "monetization";

type OmniEntry = {
  id: string;
  domain: OmniDomain;
  kind: OmniKind;
  title: string;
  aliases: string[];
  text: string;
  source?: string;
};

const STOP = new Set([
  "a","au","aux","avec","ce","ces","cette","de","des","du","dans","et","est","en","je","la","le","les","ma","mes","mon","ne","nous","on","ou","pour","que","quel","quelle","quels","quelles","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre","comment","pourquoi","faire","sert","signifie","veut","dire","fonctionne","explique","expliquer","moi","regle","regles","règle","règles","c","quoi","combien"
]);

function norm(value: string) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[_/\\-]+/g, " ").replace(/[^a-z0-9%+\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) { return norm(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token)); }

const ENTRIES: OmniEntry[] = [
  {
    id: "omni-darts-oche", domain: "darts", kind: "glossary", title: "Oche / ligne de lancer",
    aliases: ["oche", "ligne de lancer darts", "throw line flechettes"],
    text: "## OCHE / LIGNE DE LANCER\nL’**oche** est la limite derrière laquelle le joueur doit rester pendant son lancer. En steel darts de référence, elle est placée à 2,37 m horizontalement de la face de la cible ; le centre du Bull est à 1,73 m du sol.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-bed", domain: "darts", kind: "glossary", title: "Bed / zone de score",
    aliases: ["bed flechettes", "zone bed darts", "lit cible flechettes"],
    text: "## BED / ZONE DE SCORE\nUn **bed** désigne une zone de score délimitée par les fils de la cible : simple, double ou triple. Dire « bed du T20 » signifie la petite zone triple du secteur 20.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-spider-wire", domain: "darts", kind: "glossary", title: "Spider / fils de cible",
    aliases: ["spider darts", "wire flechettes", "fils cible darts"],
    text: "## SPIDER / FILS DE CIBLE\nLe **spider** est le réseau de fils qui sépare les zones de score. Une fléchette qui frappe un fil peut dévier ou rebondir ; seule la pointe effectivement plantée dans une zone compte selon le règlement applicable.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-bounceout", domain: "darts", kind: "glossary", title: "Bounce-out",
    aliases: ["bounce out", "rebond flechette", "flechette tombe cible"],
    text: "## BOUNCE-OUT\nUn **bounce-out** est une fléchette qui frappe la cible mais ne reste pas plantée. En règles de compétition traditionnelles, une fléchette qui ne reste pas dans la cible au moment où elle est relevée ne marque pas de points.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-robinhood", domain: "darts", kind: "glossary", title: "Robin Hood",
    aliases: ["robin hood darts", "flechette dans autre flechette"],
    text: "## ROBIN HOOD\nUn **Robin Hood** se produit quand une fléchette vient se planter dans l’arrière d’une fléchette déjà en cible. C’est spectaculaire, mais la fléchette arrière ne touche pas nécessairement une zone scorante : le comptage suit la pointe et les règles de la cible.",
  },
  {
    id: "omni-darts-ton", domain: "darts", kind: "glossary", title: "Ton, ton-plus et gros scores",
    aliases: ["ton darts", "ton plus flechettes", "100 points flechettes"],
    text: "## TON, TON-PLUS ET GROS SCORES\nDans le jargon darts, un **ton** désigne 100 points sur une volée ; **ton-plus** désigne couramment 100 ou davantage. Les seuils 60+, 100+, 140+ et 180 sont utiles pour décrire le profil de scoring.",
  },
  {
    id: "omni-darts-nine-darter", domain: "darts", kind: "glossary", title: "Nine-darter / leg parfait",
    aliases: ["nine darter", "9 darts finish", "leg parfait x01", "neuf flechettes"],
    text: "## NINE-DARTER / LEG PARFAIT\nUn **nine-darter** est un leg de 501 terminé en seulement **9 fléchettes**, le minimum possible en Double Out classique. Plusieurs routes existent ; c’est l’équivalent d’un leg parfait.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-bogey-numbers", domain: "darts", kind: "strategy", title: "Bogey numbers en X01",
    aliases: ["bogey numbers", "169 168 166 165 163 162 159", "score impossible checkout 3 darts"],
    text: "## BOGEY NUMBERS EN X01\nEn 501 Double Out, certains scores sous 170 ne peuvent pas être terminés en trois fléchettes : **169, 168, 166, 165, 163, 162 et 159** sont les bogey numbers classiques. On cherche donc à éviter de les laisser après une volée de préparation.",
  },
  {
    id: "omni-darts-preferred-doubles", domain: "darts", kind: "strategy", title: "Doubles de finition préférés",
    aliases: ["meilleur double finition", "d16 d20 checkout", "quel double viser x01"],
    text: "## DOUBLES DE FINITION PRÉFÉRÉS\nBeaucoup de joueurs aiment **D16** parce qu’un simple D16 manqué dans le S16 laisse D8, puis D4, D2, D1. **D20** est naturel après le T20, et D18/D10 sont aussi fréquents. Le meilleur double reste celui que le joueur maîtrise réellement.",
  },
  {
    id: "omni-darts-leave-32", domain: "darts", kind: "strategy", title: "Pourquoi laisser 32",
    aliases: ["pourquoi laisser 32", "leave 32 darts", "d16 checkout"],
    text: "## POURQUOI LAISSER 32\nLaisser **32** offre D16, puis une chaîne de divisions propres en cas de simple : 16 → 8 → 4 → 2 → 1. C’est pourquoi de nombreuses routes de préparation essaient de conserver 32 quand c’est réaliste.",
  },
  {
    id: "omni-darts-leave-40", domain: "darts", kind: "strategy", title: "Pourquoi laisser 40",
    aliases: ["pourquoi laisser 40", "leave 40 darts", "d20 checkout"],
    text: "## POURQUOI LAISSER 40\nLaisser **40** donne D20, un double très familier parce qu’il se trouve sur l’axe du secteur 20. Si la première fléchette entre en S20, il reste D10.",
  },
  {
    id: "omni-darts-two-dart-out", domain: "darts", kind: "strategy", title: "Sortie en deux fléchettes",
    aliases: ["sortie deux flechettes", "2 dart checkout", "checkout 2 darts"],
    text: "## SORTIE EN DEUX FLÉCHETTES\nUne sortie à deux fléchettes combine souvent un **simple ou triple de préparation** puis un double. La meilleure route tient compte de la taille des zones, du double préféré et de ce que laisse une erreur dans le simple voisin.",
  },
  {
    id: "omni-darts-one-dart-out", domain: "darts", kind: "strategy", title: "Sortie en une fléchette",
    aliases: ["sortie une flechette", "1 dart checkout", "score <= 50 double out"],
    text: "## SORTIE EN UNE FLÉCHETTE\nEn Double Out, une sortie en une fléchette n’est possible que si le score restant correspond à un double valide : nombres pairs 2–40 via D1–D20, ou 50 via DBULL. En Simple Out, davantage de scores deviennent directement finissables.",
  },
  {
    id: "omni-darts-hold-break", domain: "darts", kind: "stats", title: "Hold et break de leg",
    aliases: ["hold break darts", "break de leg flechettes", "tenir son leg"],
    text: "## HOLD ET BREAK DE LEG\nUn **hold** signifie gagner un leg dans lequel on avait l’avantage du premier lancer ; un **break** signifie gagner le leg commencé par l’adversaire. Le taux de hold/break aide à mesurer la solidité au lancer d’ouverture et la capacité à renverser un leg.",
  },
  {
    id: "omni-darts-first-nine-average", domain: "darts", kind: "stats", title: "First 9 average",
    aliases: ["first 9 average", "moyenne 9 premieres flechettes", "first nine darts"],
    text: "## FIRST 9 AVERAGE\nLa **First 9 Average** mesure le scoring sur les neuf premières fléchettes des legs X01, avant que les checkouts ne pèsent fortement sur la moyenne. Elle isole mieux la puissance de scoring pur.",
  },
  {
    id: "omni-darts-darts-per-leg", domain: "darts", kind: "stats", title: "Darts per leg",
    aliases: ["darts per leg", "flechettes par leg", "nombre moyen flechettes leg"],
    text: "## DARTS PER LEG\nLe nombre de **darts per leg** mesure l’efficacité globale d’un joueur en X01. Plus il est bas, plus les legs sont terminés rapidement ; il combine scoring et finition.",
  },
  {
    id: "omni-darts-checkout-percentage", domain: "darts", kind: "stats", title: "Checkout percentage",
    aliases: ["checkout percentage", "taux checkout", "pourcentage doubles x01"],
    text: "## CHECKOUT PERCENTAGE\nLe **checkout %** = checkouts réussis ÷ tentatives de checkout × 100. Il faut lire ce taux avec le nombre de tentatives : 100 % sur 1 tentative ne vaut pas la même preuve que 50 % sur 40 tentatives.",
  },
  {
    id: "omni-darts-scoring-phase", domain: "darts", kind: "strategy", title: "Scoring phase vs finishing phase",
    aliases: ["scoring phase finishing phase", "phase scoring checkout", "quand preparer sortie"],
    text: "## SCORING PHASE VS FINISHING PHASE\nEn début de leg, l’objectif principal est souvent le **volume de points**. En approchant d’une zone de checkout, la logique bascule vers la **préparation de sortie** : il devient parfois meilleur de marquer moins pour laisser une finition plus confortable.",
  },
  {
    id: "omni-darts-switch-19", domain: "darts", kind: "strategy", title: "Quand passer du 20 au 19",
    aliases: ["switch 19 darts", "passer t20 t19", "viser 19 plutot que 20"],
    text: "## QUAND PASSER DU 20 AU 19\nLe T19 est un relais naturel quand le T20 est masqué, quand la route mathématique l’exige ou quand le joueur préfère cet angle. Une bonne stratégie ne consiste pas à viser toujours le même segment, mais à préserver la route la plus robuste.",
  },
  {
    id: "omni-darts-throw-order", domain: "darts", kind: "competition", title: "Ordre de lancer",
    aliases: ["qui commence darts", "ordre de lancer flechettes", "bull off cork"],
    text: "## ORDRE DE LANCER\nL’ordre de départ dépend du format : tirage, bull-off/cork ou règle de compétition. Ensuite, l’avantage du premier lancer peut alterner selon les legs. MULTISPORTS SCORING doit suivre la configuration réelle de la rencontre.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-bull-off", domain: "darts", kind: "competition", title: "Bull-off / cork",
    aliases: ["bull off", "cork darts", "qui est le plus proche du bull"],
    text: "## BULL-OFF / CORK\nLe **bull-off** ou **cork** sert à déterminer qui commence : les joueurs lancent vers le Bull et le plus proche obtient l’avantage selon la procédure prévue. Les détails peuvent varier selon l’organisation ou le tournoi.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-deciding-leg", domain: "darts", kind: "competition", title: "Deciding leg",
    aliases: ["deciding leg", "leg decisif darts", "derniere manche flechettes"],
    text: "## DECIDING LEG\nLe **deciding leg** est le leg qui départage une rencontre arrivée à égalité juste avant la limite du format. La pression y est élevée car il concentre l’enjeu du match en une seule manche.",
  },
  {
    id: "omni-darts-tungsten", domain: "darts", kind: "equipment", title: "Tungstène et densité",
    aliases: ["tungstene flechettes", "tungsten darts", "pourquoi tungsten"],
    text: "## TUNGSTÈNE ET DENSITÉ\nLe **tungstène** permet des barrels plus fins à masse équivalente qu’un alliage moins dense. Un barrel fin facilite le groupement serré dans les triples, mais le choix dépend aussi du grip et du confort.",
  },
  {
    id: "omni-darts-barrel", domain: "darts", kind: "equipment", title: "Barrel",
    aliases: ["barrel flechette", "corps flechette", "forme barrel darts"],
    text: "## BARREL\nLe **barrel** est la partie métallique tenue par le joueur. Sa forme, son diamètre, son centre de gravité et son grip modifient la sensation et la manière dont la fléchette quitte les doigts.",
  },
  {
    id: "omni-darts-grip", domain: "darts", kind: "equipment", title: "Grip du barrel",
    aliases: ["grip flechettes", "rainures barrel", "prise flechette"],
    text: "## GRIP DU BARREL\nUn grip agressif accroche davantage les doigts ; un grip doux libère plus facilement. Trop de grip peut retenir la fléchette au lâcher, trop peu peut la rendre instable : la bonne texture dépend du geste.",
  },
  {
    id: "omni-darts-shaft", domain: "darts", kind: "equipment", title: "Shaft / tige",
    aliases: ["shaft flechette", "tige flechette", "longueur shaft darts"],
    text: "## SHAFT / TIGE\nLe **shaft** relie le barrel à l’ailette. Sa longueur influence l’équilibre, l’angle d’entrée et la stabilité. Un changement de shaft peut modifier sensiblement la trajectoire même si le barrel reste identique.",
  },
  {
    id: "omni-darts-flight", domain: "darts", kind: "equipment", title: "Ailette / flight",
    aliases: ["flight flechette", "ailette darts", "forme ailettes flechettes"],
    text: "## AILETTE / FLIGHT\nLe **flight** stabilise la fléchette dans l’air. Les grandes formes offrent généralement davantage de stabilisation et de traînée ; les formes compactes peuvent convenir à des lancers plus rapides ou à un groupement très serré.",
  },
  {
    id: "omni-darts-point", domain: "darts", kind: "equipment", title: "Pointe",
    aliases: ["pointe flechette", "point darts", "longueur pointe flechette"],
    text: "## POINTE\nLa longueur et la texture de la pointe influencent l’accroche dans la cible, l’espace entre barrels et l’angle d’entrée. Une pointe trop agressive peut aussi user davantage le sisal.",
  },
  {
    id: "omni-darts-weight", domain: "darts", kind: "equipment", title: "Poids des fléchettes",
    aliases: ["poids flechettes", "grammes darts", "flechettes lourdes legeres"],
    text: "## POIDS DES FLÉCHETTES\nLe poids idéal n’est pas universel. Une fléchette plus lourde peut donner une sensation de stabilité ; une plus légère demande souvent davantage de vitesse. Le critère essentiel est la répétabilité du geste.",
  },
  {
    id: "omni-darts-balance", domain: "darts", kind: "equipment", title: "Équilibre avant/centre/arrière",
    aliases: ["equilibre flechette", "front weighted darts", "rear weighted darts"],
    text: "## ÉQUILIBRE AVANT/CENTRE/ARRIÈRE\nUn barrel peut être équilibré vers l’avant, le centre ou l’arrière. Le meilleur choix dépend de l’endroit où tu places les doigts et de l’angle de sortie naturel de ta fléchette.",
  },
  {
    id: "omni-darts-board-rotation", domain: "darts", kind: "equipment", title: "Rotation de la cible",
    aliases: ["tourner cible flechettes", "rotation dartboard", "user secteur 20"],
    text: "## ROTATION DE LA CIBLE\nSur une cible en sisal avec anneau de numéros amovible, la faire tourner périodiquement répartit l’usure, surtout autour du 20. Cela prolonge la durée de vie et réduit les zones trop compactées.",
  },
  {
    id: "omni-darts-lighting", domain: "darts", kind: "equipment", title: "Éclairage de cible",
    aliases: ["eclairage cible flechettes", "ombre dartboard", "ring light darts"],
    text: "## ÉCLAIRAGE DE CIBLE\nUn éclairage uniforme limite les ombres de fléchettes et améliore la lecture des fils. L’objectif est de voir clairement les segments sans éblouissement ni zone sombre.",
  },
  {
    id: "omni-darts-surround", domain: "darts", kind: "equipment", title: "Surround",
    aliases: ["surround flechettes", "protection mur darts"],
    text: "## SURROUND\nUn **surround** protège le mur autour de la cible et récupère les fléchettes manquées. Il ne change pas le score mais améliore la sécurité et protège l’environnement de jeu.",
  },
  {
    id: "omni-darts-around-clock", domain: "darts", kind: "training", title: "Around the Clock",
    aliases: ["around the clock darts", "tour de l horloge flechettes", "1 a 20 entrainement"],
    text: "## AROUND THE CLOCK\n**Around the Clock** consiste à toucher successivement 1, 2, 3… jusqu’à 20, éventuellement Bull. C’est un exercice simple de couverture de cible et de changement permanent de point de visée.",
  },
  {
    id: "omni-darts-doubles-around-clock", domain: "darts", kind: "training", title: "Around the Clock doubles",
    aliases: ["tour doubles flechettes", "d1 a d20 entrainement", "around clock doubles"],
    text: "## AROUND THE CLOCK DOUBLES\nLa version **Doubles** impose D1 → D2 → … → D20. Elle travaille la finition, la discipline de cible et la capacité à changer de zone après chaque réussite.",
  },
  {
    id: "omni-darts-121-drill", domain: "darts", kind: "training", title: "Exercice 121",
    aliases: ["121 darts training", "jeu 121 checkout", "entrainement checkout 121"],
    text: "## EXERCICE 121\nL’exercice **121** travaille les checkouts : on tente 121 en trois fléchettes, puis on progresse selon la règle choisie. Il entraîne les routes, les transitions et la prise de décision sous contrainte.",
  },
  {
    id: "omni-darts-scoring-drill", domain: "darts", kind: "training", title: "Exercice scoring 20",
    aliases: ["entrainement t20", "scoring drill darts", "60 flechettes 20"],
    text: "## EXERCICE SCORING 20\nUn exercice de scoring consiste à jouer plusieurs volées uniquement sur le 20, puis à mesurer moyenne, triples et dispersion. Il est utile de répéter le même protocole pour comparer la progression dans le temps.",
  },
  {
    id: "omni-darts-grouping-drill", domain: "darts", kind: "training", title: "Exercice de groupement",
    aliases: ["drill groupement flechettes", "entrainement precision groupement"],
    text: "## EXERCICE DE GROUPEMENT\nPour travailler le groupement, vise une zone fixe et note surtout la **dispersion** des trois fléchettes, pas seulement le score. Un paquet serré mais décalé est souvent plus facile à corriger qu’un paquet très dispersé.",
  },
  {
    id: "omni-darts-pressure-drill", domain: "darts", kind: "training", title: "Entraînement sous pression",
    aliases: ["pression entrainement darts", "double sous pression", "routine pression flechettes"],
    text: "## ENTRAÎNEMENT SOUS PRESSION\nAjoute une conséquence mesurable : recommencer une série après un double manqué, réussir deux fois de suite avant de passer, ou battre un score cible. La pression artificielle rapproche l’entraînement de la compétition.",
  },
  {
    id: "omni-darts-routine", domain: "darts", kind: "technique", title: "Routine de lancer",
    aliases: ["routine lancer flechettes", "pre shot routine darts", "rituel oche"],
    text: "## ROUTINE DE LANCER\nUne routine stable réduit les variations : position des pieds, respiration, nombre de mouvements préparatoires, regard et cadence. Le but n’est pas le rituel pour lui-même, mais une séquence reproductible.",
  },
  {
    id: "omni-darts-follow-through", domain: "darts", kind: "technique", title: "Accompagnement du geste",
    aliases: ["follow through flechettes", "accompagnement bras darts", "fin geste lancer"],
    text: "## ACCOMPAGNEMENT DU GESTE\nLe **follow-through** est l’accompagnement après le lâcher. Un bras qui poursuit naturellement sa ligne aide à éviter le freinage brutal et favorise une libération régulière.",
  },
  {
    id: "omni-darts-elbow", domain: "darts", kind: "technique", title: "Coude et avant-bras",
    aliases: ["coude flechettes", "elbow darts", "avant bras lancer darts"],
    text: "## COUDE ET AVANT-BRAS\nBeaucoup de joueurs cherchent à garder le coude relativement stable pendant l’accélération de l’avant-bras. Ce n’est pas une immobilité absolue : le repère utile est surtout une mécanique répétable sans mouvement parasite excessif.",
  },
  {
    id: "omni-darts-tempo", domain: "darts", kind: "technique", title: "Tempo de volée",
    aliases: ["tempo flechettes", "rythme lancer darts", "cadence vollee"],
    text: "## TEMPO DE VOLÉE\nUn tempo constant facilite la répétition. Se précipiter après un T20 ou ralentir excessivement après un miss peut modifier le geste ; mieux vaut revenir à la cadence habituelle.",
  },
  {
    id: "omni-darts-reset-after-miss", domain: "darts", kind: "psychology", title: "Reset après une mauvaise fléchette",
    aliases: ["reset apres miss", "oublier mauvaise flechette", "mental darts"],
    text: "## RESET APRÈS UNE MAUVAISE FLÉCHETTE\nAprès une mauvaise fléchette, la décision utile est de **réinitialiser la routine** et de jouer la suivante, plutôt que de corriger brutalement le geste. Une volée reste composée de décisions indépendantes.",
  },
  {
    id: "omni-darts-match-v-practice", domain: "darts", kind: "psychology", title: "Entraînement vs match",
    aliases: ["moyenne entrainement match darts", "stress competition flechettes"],
    text: "## ENTRAÎNEMENT VS MATCH\nUne moyenne d’entraînement n’est pas automatiquement une moyenne de match : attente, enjeu, alternance des joueurs et pression sur les doubles changent le contexte. Compare des statistiques prises dans des conditions similaires.",
  },
  {
    id: "omni-darts-etiquette", domain: "darts", kind: "safety", title: "Étiquette à l’oche",
    aliases: ["etiquette darts", "fair play flechettes", "ne pas gener lanceur"],
    text: "## ÉTIQUETTE À L’OCHE\nPendant le lancer adverse, reste hors de sa ligne de vision et évite mouvements/bruits inutiles. Attends que la volée soit terminée avant de t’approcher de la cible, sauf procédure spécifique.",
    source: "WDF — Playing and Tournament Rules / conventions internationales de fléchettes",
  },
  {
    id: "omni-darts-safety", domain: "darts", kind: "safety", title: "Sécurité fléchettes",
    aliases: ["securite flechettes", "enfant darts danger", "ramasser flechettes"],
    text: "## SÉCURITÉ FLÉCHETTES\nNe traverse jamais la zone de lancer pendant qu’un joueur arme son geste. Les fléchettes sont des projectiles pointus : cible stable, zone dégagée et récupération seulement quand le lancer est fini.",
  },
  {
    id: "omni-pet-circle", domain: "petanque", kind: "official", title: "Cercle de lancer",
    aliases: ["cercle petanque", "cercle lancer boule", "pieds cercle petanque"],
    text: "## CERCLE DE LANCER\nLe lancer se fait depuis un cercle conforme au règlement. Pendant le lancer, les pieds doivent respecter les contraintes du cercle jusqu’à ce que la boule touche le sol. Pour une partie dans l’application, Awéna doit toutefois suivre le format réellement choisi.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-jack", domain: "petanque", kind: "glossary", title: "But / cochonnet",
    aliases: ["but petanque", "cochonnet", "jack petanque"],
    text: "## BUT / COCHONNET\nLe **but**, souvent appelé cochonnet, est la petite cible autour de laquelle les équipes cherchent à placer leurs boules. Le point appartient à la boule la plus proche du but.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-point", domain: "petanque", kind: "glossary", title: "Avoir le point",
    aliases: ["avoir le point petanque", "qui a le point petanque"],
    text: "## AVOIR LE POINT\nL’équipe qui possède la boule la plus proche du but **a le point**. En principe, l’autre équipe joue jusqu’à reprendre le point ou ne plus avoir de boules.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-end-order", domain: "petanque", kind: "official", title: "Qui joue ensuite ?",
    aliases: ["qui joue petanque", "ordre apres boule petanque", "equipe qui perd point joue"],
    text: "## QUI JOUE ENSUITE ?\nAprès chaque boule, c’est généralement l’équipe qui **n’a pas le point** qui doit rejouer. Si elle reprend le point, la main passe à l’autre équipe.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-score-end", domain: "petanque", kind: "official", title: "Score d’une mène",
    aliases: ["combien points mene petanque", "score fin mene boules"],
    text: "## SCORE D’UNE MÈNE\nÀ la fin d’une mène, une seule équipe marque : **un point par boule mieux placée que la meilleure boule adverse**. Le maximum dépend donc du nombre de boules encore mieux classées.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-single-boules", domain: "petanque", kind: "official", title: "Boules en tête-à-tête",
    aliases: ["tete a tete petanque boules", "1v1 petanque combien boules"],
    text: "## BOULES EN TÊTE-À-TÊTE\nEn tête-à-tête de référence, chaque joueur dispose de **3 boules**. Le score maximal d’une mène est donc de 3 points.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-double-boules", domain: "petanque", kind: "official", title: "Boules en doublette",
    aliases: ["doublette combien boules", "2v2 petanque boules"],
    text: "## BOULES EN DOUBLETTE\nEn doublette de référence, chaque joueur dispose de **3 boules**, soit 6 boules par équipe.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-triple-boules", domain: "petanque", kind: "official", title: "Boules en triplette",
    aliases: ["triplette combien boules", "3v3 petanque boules"],
    text: "## BOULES EN TRIPLETTE\nEn triplette de référence, chaque joueur dispose de **2 boules**, soit 6 boules par équipe.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-roulette", domain: "petanque", kind: "technique", title: "Pointage à la roulette",
    aliases: ["roulette petanque", "pointer roulette boule"],
    text: "## POINTAGE À LA ROULETTE\nLa **roulette** fait rouler la boule sur une grande partie du trajet. Elle demande un terrain relativement lisible ; elle est sensible aux cailloux, pentes et irrégularités.",
  },
  {
    id: "omni-pet-demi-portee", domain: "petanque", kind: "technique", title: "Demi-portée",
    aliases: ["demi portee petanque", "pointer demi portee"],
    text: "## DEMI-PORTÉE\nLa **demi-portée** fait atterrir la boule à une distance intermédiaire avant qu’elle roule vers le but. C’est un compromis courant entre contrôle du point de chute et lecture du terrain.",
  },
  {
    id: "omni-pet-portee", domain: "petanque", kind: "technique", title: "Portée / plombée",
    aliases: ["portee petanque", "plombee petanque", "pointer haut"],
    text: "## PORTÉE / PLOMBÉE\nLa **portée** ou plombée envoie la boule plus haut avec un point de chute proche du but, afin de réduire la portion roulée. Elle est utile sur terrain irrégulier mais exige un dosage précis.",
  },
  {
    id: "omni-pet-donnee", domain: "petanque", kind: "technique", title: "La donnée",
    aliases: ["donnee petanque", "point de donnee boules", "ou faire tomber boule"],
    text: "## LA DONNÉE\nLa **donnée** est le point du sol visé pour la première prise de contact de la boule lors d’un pointage. Choisir une donnée propre et reproductible est central pour maîtriser la trajectoire.",
  },
  {
    id: "omni-pet-backspin", domain: "petanque", kind: "technique", title: "Effet rétro au point",
    aliases: ["retro petanque", "backspin boule petanque", "effet boule pointage"],
    text: "## EFFET RÉTRO AU POINT\nUn léger effet rétro peut freiner la boule après l’impact et limiter sa course. Il ne remplace pas le bon dosage : terrain, hauteur et point de chute restent déterminants.",
  },
  {
    id: "omni-pet-tir-fer", domain: "petanque", kind: "technique", title: "Tir au fer",
    aliases: ["tir au fer petanque", "tir direct boule"],
    text: "## TIR AU FER\nLe **tir au fer** vise à frapper directement la boule adverse avec peu ou pas de rebond préalable. Il est précis mais demande une trajectoire et une longueur très régulières.",
  },
  {
    id: "omni-pet-tir-devant", domain: "petanque", kind: "technique", title: "Tir devant de boule",
    aliases: ["tir devant boule petanque", "tir court petanque"],
    text: "## TIR DEVANT DE BOULE\nLe **tir devant** fait toucher le sol juste avant la boule visée. Il peut tolérer certaines erreurs de longueur sur un terrain favorable, mais devient moins fiable sur sol irrégulier.",
  },
  {
    id: "omni-pet-rafle", domain: "petanque", kind: "technique", title: "Tir à la rafle",
    aliases: ["rafle petanque", "tir rafle boules"],
    text: "## TIR À LA RAFLE\nLe **tir à la rafle** est un tir bas qui utilise davantage le sol avant d’atteindre la cible. Il est très dépendant de l’état du terrain et n’est pas adapté à toutes les situations.",
  },
  {
    id: "omni-pet-palet", domain: "petanque", kind: "glossary", title: "Palet",
    aliases: ["palet petanque", "tir palet boule"],
    text: "## PALET\nAprès un tir réussi, on parle de **palet** lorsque la boule de tir reste près de l’endroit de l’impact et peut elle-même devenir une bonne boule de point.",
  },
  {
    id: "omni-pet-recul", domain: "petanque", kind: "glossary", title: "Recul",
    aliases: ["recul petanque", "boule recule apres carreau"],
    text: "## RECUL\nUn **recul** décrit la boule de tir qui repart vers l’arrière après l’impact. C’est différent d’un carreau net, où elle reste pratiquement sur place.",
  },
  {
    id: "omni-pet-devant-boule", domain: "petanque", kind: "strategy", title: "Boule devant",
    aliases: ["boule devant petanque", "mettre boule devant cochonnet"],
    text: "## BOULE DEVANT\nUne boule placée **devant le but** peut être tactiquement forte : elle gêne les trajectoires de pointage et peut être poussée vers le but par une boule suivante.",
  },
  {
    id: "omni-pet-blocking", domain: "petanque", kind: "strategy", title: "Bouchon / blocage de ligne",
    aliases: ["bloquer ligne petanque", "bouchon pointage boules"],
    text: "## BOUCHON / BLOCAGE DE LIGNE\nAccumuler des boules sur une ligne peut fermer une trajectoire de pointage et forcer l’adversaire à porter davantage ou à tirer. Le terrain décide si ce blocage est vraiment efficace.",
  },
  {
    id: "omni-pet-shoot-or-point", domain: "petanque", kind: "strategy", title: "Tirer ou pointer ?",
    aliases: ["tirer ou pointer petanque", "quand tirer boule adverse"],
    text: "## TIRER OU POINTER ?\nTire si la boule adverse est très forte, si le pointage est difficile ou si enlever une boule crée plusieurs points. Pointe si tu peux reprendre le point avec une probabilité élevée sans ouvrir le jeu adverse.",
  },
  {
    id: "omni-pet-last-boule", domain: "petanque", kind: "strategy", title: "Dernière boule",
    aliases: ["derniere boule petanque tactique", "jouer derniere boule"],
    text: "## DERNIÈRE BOULE\nAvec la dernière boule d’une mène, le calcul risque/récompense change : il n’y aura plus de correction ensuite. Un point sûr peut valoir mieux qu’une tentative spectaculaire qui ouvre plusieurs points.",
  },
  {
    id: "omni-pet-move-jack", domain: "petanque", kind: "strategy", title: "Déplacer le but",
    aliases: ["tirer but petanque", "deplacer cochonnet tactique"],
    text: "## DÉPLACER LE BUT\nDéplacer le but peut transformer complètement une mène : annuler un avantage adverse, rapprocher ses propres boules ou envoyer le but vers une zone favorable. La validité dépend des limites et du règlement de la partie.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-measure-tool", domain: "petanque", kind: "official", title: "Mesure du point",
    aliases: ["mesurer point petanque", "metre petanque", "deux boules proches"],
    text: "## MESURE DU POINT\nQuand l’œil ne suffit pas, mesure avec un outil adapté sans déplacer les objets de jeu. Une mesure propre évite les contestations et doit respecter l’ordre de jeu prévu par le règlement.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-dead-ball", domain: "petanque", kind: "official", title: "Boule morte",
    aliases: ["boule morte petanque", "hors terrain boule petanque"],
    text: "## BOULE MORTE\nUne boule peut devenir **nulle/morte** dans les situations prévues par le règlement, notamment lorsqu’elle franchit complètement certaines limites de terrain. Les lignes et terrains délimités doivent donc être identifiés avant la partie.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-dead-jack", domain: "petanque", kind: "official", title: "But nul",
    aliases: ["but nul petanque", "cochonnet sort terrain"],
    text: "## BUT NUL\nSi le but devient nul, la suite de la mène dépend notamment des boules qu’il reste à chaque équipe. Ce cas a des règles précises : Awéna doit distinguer la référence FIPJP d’une variante maison configurée.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-one-minute", domain: "petanque", kind: "official", title: "Temps pour jouer",
    aliases: ["temps pour jouer petanque", "une minute boule petanque"],
    text: "## TEMPS POUR JOUER\nLe règlement de compétition prévoit un temps limité pour jouer une boule après que la situation de jeu est établie. En loisir, ce point est souvent appliqué avec souplesse ; la règle du tournoi reste prioritaire.",
    source: "FIPJP — règlement officiel du sport Pétanque (référence 2026)",
  },
  {
    id: "omni-pet-fanny", domain: "petanque", kind: "glossary", title: "Fanny",
    aliases: ["fanny petanque", "perdre 13 0 petanque"],
    text: "## FANNY\nDans la culture pétanque, **faire Fanny** signifie traditionnellement perdre une partie sans marquer, typiquement 13–0. C’est une expression culturelle, pas une règle de scoring supplémentaire.",
  },
  {
    id: "omni-pet-point-rate", domain: "petanque", kind: "stats", title: "Taux de pointage",
    aliases: ["taux pointage petanque", "precision pointer stats"],
    text: "## TAUX DE POINTAGE\nUn taux de pointage doit définir ce qu’est une réussite : boule prise de point, boule dans une zone cible, ou distance au but. Sans définition stable, comparer deux pourcentages peut être trompeur.",
  },
  {
    id: "omni-pet-shoot-rate", domain: "petanque", kind: "stats", title: "Taux de tir",
    aliases: ["taux tir petanque", "pourcentage tir reussi"],
    text: "## TAUX DE TIR\nLe taux de tir = tirs réussis ÷ tirs tentés. On peut l’affiner en distinguant **touché**, **boule enlevée**, **palet** et **carreau**, car tous les tirs réussis n’ont pas la même valeur tactique.",
  },
  {
    id: "omni-pet-carreau-rate", domain: "petanque", kind: "stats", title: "Taux de carreau",
    aliases: ["taux carreau petanque", "pourcentage carreaux"],
    text: "## TAUX DE CARREAU\nLe taux de carreau mesure les carreaux obtenus parmi les tirs ou parmi les tirs réussis ; il faut annoncer le dénominateur. Un carreau est plus rare et plus exigeant qu’un simple tir touché.",
  },
  {
    id: "omni-pet-mene-diff", domain: "petanque", kind: "stats", title: "Différentiel de mènes",
    aliases: ["mene gagnee perdue petanque stats", "diff mènes"],
    text: "## DIFFÉRENTIEL DE MÈNES\nLe différentiel de mènes gagnées/perdues montre la capacité à convertir les situations, tandis que le différentiel de points montre l’ampleur des mènes. Les deux indicateurs se complètent.",
  },
  {
    id: "omni-pet-safety", domain: "petanque", kind: "safety", title: "Sécurité au tir",
    aliases: ["securite petanque tir", "ne pas traverser terrain boules"],
    text: "## SÉCURITÉ AU TIR\nAvant de tirer, vérifie que personne ne traverse la ligne et que la zone derrière la boule visée est sûre. Une boule de pétanque est lourde : les spectateurs doivent rester hors de l’axe.",
  },
  {
    id: "omni-tt-game-match", domain: "pingpong", kind: "glossary", title: "Game, match et set",
    aliases: ["game match ping pong", "set tennis de table", "manche pingpong"],
    text: "## GAME, MATCH ET SET\nEn tennis de table, un **game** est une manche jouée à 11 points avec deux points d’écart. Le **match** regroupe plusieurs games selon un format Best Of.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-serve-open-palm", domain: "pingpong", kind: "official", title: "Service sur paume ouverte",
    aliases: ["service paume ouverte ping pong", "balle main service tennis table"],
    text: "## SERVICE SUR PAUME OUVERTE\nAu service, la balle doit reposer librement sur la **paume ouverte** avant d’être lancée. L’objectif est que l’adversaire puisse voir clairement le départ du service.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-serve-visible", domain: "pingpong", kind: "official", title: "Service visible",
    aliases: ["cacher balle service ping pong", "service visible tennis table"],
    text: "## SERVICE VISIBLE\nLe serveur ne doit pas cacher la balle au receveur avec le corps, le bras ou un vêtement. La visibilité du service est une exigence centrale des règles ITTF.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-serve-behind-line", domain: "pingpong", kind: "official", title: "Position de la balle au service",
    aliases: ["derriere ligne service ping pong", "balle au dessus table service"],
    text: "## POSITION DE LA BALLE AU SERVICE\nAu départ du service réglementaire, la balle doit respecter la zone de position prévue par les Laws of Table Tennis, notamment être au-dessus du niveau de la surface et derrière la ligne de fond avant le lancer.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-serve-toss", domain: "pingpong", kind: "official", title: "Lancer du service",
    aliases: ["16 cm service ping pong", "lancer vertical tennis table"],
    text: "## LANCER DU SERVICE\nLe service réglementaire exige un lancer de balle d’au moins **16 cm**, proche de la verticale, avant la frappe. Le but est d’éviter un service lancé directement depuis la main.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-deuce", domain: "pingpong", kind: "official", title: "Égalité à 10–10",
    aliases: ["10 10 ping pong", "deuce tennis table", "deux points ecart pingpong"],
    text: "## ÉGALITÉ À 10–10\nÀ **10–10**, il faut obtenir deux points d’écart. Le service alterne alors à chaque point jusqu’à ce qu’un joueur ou une équipe mène de deux.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-service-two-points", domain: "pingpong", kind: "official", title: "Rotation du service",
    aliases: ["combien services ping pong", "2 services tennis table"],
    text: "## ROTATION DU SERVICE\nAvant 10–10, le service change normalement tous les **deux points**. À 10–10, il change à chaque point.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-double-diagonal", domain: "pingpong", kind: "official", title: "Service en double",
    aliases: ["service double diagonale ping pong", "2v2 service tennis table"],
    text: "## SERVICE EN DOUBLE\nEn double, le service doit être joué **en diagonale**, depuis la moitié droite du serveur vers la moitié droite du receveur, puis l’échange respecte l’ordre alterné des partenaires.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-double-order", domain: "pingpong", kind: "official", title: "Ordre de frappe en double",
    aliases: ["ordre frappe double ping pong", "alternance partenaires tennis table"],
    text: "## ORDRE DE FRAPPE EN DOUBLE\nEn double, les partenaires doivent frapper la balle **à tour de rôle**. Un même joueur ne peut pas jouer deux coups consécutifs pour son équipe pendant un échange normal.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-let-serve", domain: "pingpong", kind: "official", title: "Let au service",
    aliases: ["let service ping pong", "filet service tennis table"],
    text: "## LET AU SERVICE\nUn service qui touche le filet mais est par ailleurs correct est rejoué : c’est un **let**. Un let ne donne pas automatiquement un point à l’adversaire.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-edge-side", domain: "pingpong", kind: "official", title: "Edge ball vs side",
    aliases: ["edge ball ping pong", "balle tranche table", "coté table tennis"],
    text: "## EDGE BALL VS SIDE\nUne balle qui touche le **bord supérieur** de la surface de jeu peut être bonne ; une balle qui frappe uniquement la face verticale du côté n’est pas un retour valide. La distinction peut être difficile à voir à vitesse réelle.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-point-after-net", domain: "pingpong", kind: "official", title: "Balle qui touche le filet en échange",
    aliases: ["balle touche filet pendant echange ping pong", "net cord rally"],
    text: "## BALLE QUI TOUCHE LE FILET EN ÉCHANGE\nPendant un échange normal, une balle peut toucher le filet et continuer si elle passe ensuite correctement sur la table adverse. Le let concerne surtout des situations spécifiques comme le service.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-table-dim", domain: "pingpong", kind: "equipment", title: "Dimensions de table",
    aliases: ["dimension table ping pong", "longueur largeur table tennis"],
    text: "## DIMENSIONS DE TABLE\nUne table de compétition mesure **2,74 m de long sur 1,525 m de large**, avec une surface à **0,76 m** du sol. Ces dimensions expliquent les angles, distances de déplacement et zones de service.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-net-height", domain: "pingpong", kind: "equipment", title: "Hauteur du filet",
    aliases: ["hauteur filet ping pong", "filet tennis table 15.25"],
    text: "## HAUTEUR DU FILET\nLe filet réglementaire a une hauteur de **15,25 cm** au-dessus de la surface de jeu.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-ball", domain: "pingpong", kind: "equipment", title: "Balle de tennis de table",
    aliases: ["diametre balle ping pong", "40 mm balle tennis table", "poids balle ping pong"],
    text: "## BALLE DE TENNIS DE TABLE\nLa balle moderne de compétition est une balle plastique d’environ **40 mm** de diamètre et **2,7 g**. Les caractéristiques exactes d’homologation relèvent des spécifications ITTF.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-racket-sides", domain: "pingpong", kind: "equipment", title: "Faces de raquette",
    aliases: ["couleurs raquette ping pong", "noir rouge raquette tennis table"],
    text: "## FACES DE RAQUETTE\nLes deux faces de la raquette doivent être clairement distinguables selon les exigences ITTF, avec une face noire et l’autre d’une couleur autorisée nettement différente. Cela aide le receveur à identifier le revêtement utilisé.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-topspin", domain: "pingpong", kind: "technique", title: "Topspin",
    aliases: ["topspin ping pong", "rotation avant tennis table"],
    text: "## TOPSPIN\nLe **topspin** donne une rotation avant : la balle plonge plus vite vers la table et rebondit en accélérant vers l’avant. Il permet d’attaquer avec une marge au-dessus du filet.",
  },
  {
    id: "omni-tt-backspin", domain: "pingpong", kind: "technique", title: "Backspin / coupe",
    aliases: ["backspin ping pong", "balle coupee tennis table", "rotation arriere"],
    text: "## BACKSPIN / COUPE\nLe **backspin** est une rotation arrière qui tend à faire plonger la balle dans le filet si l’adversaire ne lève pas suffisamment sa trajectoire. Il est fréquent sur poussettes, chops et services.",
  },
  {
    id: "omni-tt-sidespin", domain: "pingpong", kind: "technique", title: "Sidespin",
    aliases: ["sidespin ping pong", "effet lateral tennis table"],
    text: "## SIDESPIN\nLe **sidespin** dévie la trajectoire et surtout le rebond latéralement. Pour le recevoir, il faut lire la direction de la raquette et adapter l’angle de contact.",
  },
  {
    id: "omni-tt-drive", domain: "pingpong", kind: "technique", title: "Drive",
    aliases: ["drive ping pong", "coup droit frappe a plat tennis table"],
    text: "## DRIVE\nLe **drive** est un coup offensif relativement direct, avec une trajectoire plus plate qu’un loop très frotté. Il sert à prendre l’initiative sur une balle favorable.",
  },
  {
    id: "omni-tt-loop", domain: "pingpong", kind: "technique", title: "Loop / topspin lourd",
    aliases: ["loop tennis table", "topspin lourd ping pong"],
    text: "## LOOP / TOPSPIN LOURD\nLe **loop** est un topspin très frotté qui combine rotation, sécurité au-dessus du filet et profondeur. Il est particulièrement utile contre backspin lorsqu’il est exécuté avec une trajectoire montante.",
  },
  {
    id: "omni-tt-push", domain: "pingpong", kind: "technique", title: "Poussette",
    aliases: ["poussette ping pong", "push tennis table"],
    text: "## POUSSETTE\nLa **poussette** est un coup court ou contrôlé, souvent avec backspin, joué près de la table. Elle sert à empêcher l’adversaire d’attaquer facilement et à provoquer une balle plus haute.",
  },
  {
    id: "omni-tt-chop", domain: "pingpong", kind: "technique", title: "Chop",
    aliases: ["chop ping pong", "defense coupee tennis table"],
    text: "## CHOP\nLe **chop** est une défense coupée, souvent jouée plus loin de la table avec beaucoup de backspin. Il cherche à casser le rythme et à forcer l’attaquant à relever la balle.",
  },
  {
    id: "omni-tt-block", domain: "pingpong", kind: "technique", title: "Bloc",
    aliases: ["bloc ping pong", "block tennis table"],
    text: "## BLOC\nLe **bloc** utilise la vitesse adverse en présentant une raquette stable près de la table. L’angle doit compenser le topspin entrant ; un bloc actif peut aussi réaccélérer la balle.",
  },
  {
    id: "omni-tt-flick", domain: "pingpong", kind: "technique", title: "Flick",
    aliases: ["flick ping pong", "flip tennis table", "attaque balle courte"],
    text: "## FLICK\nLe **flick** attaque une balle courte au-dessus de la table grâce à un geste compact du poignet/avant-bras. Il évite de rendre systématiquement une poussette passive.",
  },
  {
    id: "omni-tt-smash", domain: "pingpong", kind: "technique", title: "Smash",
    aliases: ["smash ping pong", "frappe balle haute tennis table"],
    text: "## SMASH\nLe **smash** est une frappe très directe sur une balle haute ou lente. Le placement et le timing comptent autant que la puissance : un smash puissant mal placé peut revenir.",
  },
  {
    id: "omni-tt-third-ball", domain: "pingpong", kind: "strategy", title: "Troisième balle",
    aliases: ["troisieme balle ping pong", "third ball attack"],
    text: "## TROISIÈME BALLE\nLa **troisième balle** est le premier coup du serveur après le retour : service = 1re balle, retour = 2e, attaque du serveur = 3e. Construire un service pour obtenir cette balle favorable est une tactique fondamentale.",
    source: "ITTF — Laws of Table Tennis / Handbook (référence 2026)",
  },
  {
    id: "omni-tt-receive-short", domain: "pingpong", kind: "strategy", title: "Retour court",
    aliases: ["retour court service ping pong", "receive short tennis table"],
    text: "## RETOUR COURT\nUn retour court cherche à faire rebondir la balle deux fois sur la table adverse, pour limiter l’attaque immédiate. Il demande un toucher fin et une bonne lecture de l’effet.",
  },
  {
    id: "omni-tt-elbow", domain: "pingpong", kind: "strategy", title: "Le coude / crossover",
    aliases: ["viser coude ping pong", "crossover point tennis table"],
    text: "## LE COUDE / CROSSOVER\nViser le **coude** cherche la zone de transition entre coup droit et revers. L’adversaire doit décider très vite quel côté utiliser, ce qui augmente le risque de retard ou d’hésitation.",
  },
  {
    id: "omni-tt-wide-angle", domain: "pingpong", kind: "strategy", title: "Angles larges",
    aliases: ["angles ping pong", "jouer large tennis table"],
    text: "## ANGLES LARGES\nLes angles larges déplacent l’adversaire et ouvrent l’espace opposé. Une balle moins rapide mais mieux placée peut être plus efficace qu’une frappe plein centre très puissante.",
  },
  {
    id: "omni-tt-depth", domain: "pingpong", kind: "strategy", title: "Profondeur",
    aliases: ["jouer profond ping pong", "balle ligne fond tennis table"],
    text: "## PROFONDEUR\nUne balle profonde réduit le temps disponible et repousse l’adversaire. Alterner court/profond empêche l’adversaire de s’installer dans une distance confortable.",
  },
  {
    id: "omni-tt-service-variation", domain: "pingpong", kind: "strategy", title: "Variation de service",
    aliases: ["varier service ping pong", "meme geste effets differents"],
    text: "## VARIATION DE SERVICE\nUn bon serveur varie effet, longueur, placement et vitesse tout en gardant des préparations visuellement proches. Le but est de rendre la lecture difficile sans sacrifier la légalité du service.",
  },
  {
    id: "omni-tt-unforced-error", domain: "pingpong", kind: "stats", title: "Faute directe",
    aliases: ["faute directe ping pong", "unforced error tennis table"],
    text: "## FAUTE DIRECTE\nUne **faute directe** est une erreur sur une balle que le joueur pouvait raisonnablement contrôler. La classification reste subjective ; il faut garder la même définition si on compare des matchs.",
  },
  {
    id: "omni-tt-rally-length", domain: "pingpong", kind: "stats", title: "Longueur d’échange",
    aliases: ["longueur echange ping pong stats", "rally length tennis table"],
    text: "## LONGUEUR D’ÉCHANGE\nLa longueur moyenne des échanges aide à décrire le style : points très courts dominés par service/retour, ou rallyes plus longs. Elle doit être associée au taux de points gagnés, pas interprétée seule.",
  },
  {
    id: "omni-tt-serve-points-won", domain: "pingpong", kind: "stats", title: "Points gagnés au service",
    aliases: ["points gagnes service ping pong", "serve win rate tennis table"],
    text: "## POINTS GAGNÉS AU SERVICE\nLe taux de points gagnés au service mesure l’efficacité de l’ensemble **service + troisième balle**, pas seulement les aces. Compare-le au taux de points gagnés en réception pour comprendre le profil du joueur.",
  },
  {
    id: "omni-tt-safety", domain: "pingpong", kind: "safety", title: "Sécurité autour de la table",
    aliases: ["securite ping pong", "espace autour table tennis"],
    text: "## SÉCURITÉ AUTOUR DE LA TABLE\nGarde une zone dégagée autour de la table : les déplacements latéraux et vers l’arrière sont rapides. Évite objets au sol, murs trop proches et passages derrière les joueurs.",
  },
  {
    id: "omni-molkky-one-pin", domain: "molkky", kind: "official", title: "Une quille tombée",
    aliases: ["une quille molkky score", "1 pin molkky"],
    text: "## UNE QUILLE TOMBÉE\nSi **une seule quille** tombe, elle rapporte le nombre inscrit dessus. C’est la base du jeu de précision et la clé des fins de partie.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-many-pins", domain: "molkky", kind: "official", title: "Plusieurs quilles tombées",
    aliases: ["plusieurs quilles molkky score", "nombre quilles tombees molkky"],
    text: "## PLUSIEURS QUILLES TOMBÉES\nSi **plusieurs quilles** tombent, le score correspond au **nombre de quilles tombées**, pas à la somme de leurs numéros.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-stand-up", domain: "molkky", kind: "official", title: "Replacer les quilles",
    aliases: ["replacer quilles molkky", "ou remettre pin molkky"],
    text: "## REPLACER LES QUILLES\nAprès le lancer, les quilles tombées sont relevées **à l’endroit où elles se sont arrêtées**. La disposition s’étale donc progressivement au fil de la partie.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-leaning", domain: "molkky", kind: "official", title: "Quand une quille compte comme tombée",
    aliases: ["quille appuyee molkky", "pin leaning molkky"],
    text: "## QUAND UNE QUILLE COMPTE COMME TOMBÉE\nUne quille simplement appuyée contre une autre quille ou le lanceur n’est pas considérée comme pleinement tombée selon la règle officielle. Le comptage doit distinguer chute réelle et quille encore soutenue.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-exact50", domain: "molkky", kind: "official", title: "Atteindre exactement 50",
    aliases: ["exactement 50 molkky", "fin partie molkky"],
    text: "## ATTEINDRE EXACTEMENT 50\nLa victoire exige **exactement 50 points**. C’est ce qui transforme la fin de partie en exercice de précision plutôt qu’en simple course au score.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-over50", domain: "molkky", kind: "official", title: "Dépassement de 50",
    aliases: ["depasser 50 molkky", "retour 25 molkky"],
    text: "## DÉPASSEMENT DE 50\nSi le score dépasse 50, il redescend à **25 points** dans la règle officielle. À l’approche de 50, il faut donc viser des quilles ou groupes compatibles avec le reste exact.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-three-miss", domain: "molkky", kind: "official", title: "Trois misses",
    aliases: ["3 misses molkky", "trois echecs molkky"],
    text: "## TROIS MISSES\nTrois lancers manqués consécutifs entraînent la fin de partie pour le joueur dans la règle officielle Mölkky®. Une variante d’application peut toutefois rendre ce comportement configurable.",
    source: "Mölkky® / Tactic Games — règles officielles du jeu",
  },
  {
    id: "omni-molkky-endgame", domain: "molkky", kind: "strategy", title: "Calcul de fin de partie",
    aliases: ["strategie fin molkky", "reste 7 molkky"],
    text: "## CALCUL DE FIN DE PARTIE\nÀ 40+ points, pense en **reste exact** : si tu es à 43, la quille 7 devient une cible claire. Garde aussi un plan B si la quille visée est mal placée ou entourée.",
  },
  {
    id: "omni-molkky-cluster-risk", domain: "molkky", kind: "strategy", title: "Risque des groupes",
    aliases: ["groupe quilles molkky", "risque plusieurs pins molkky"],
    text: "## RISQUE DES GROUPES\nViser un groupe augmente la tolérance au toucher mais rend le nombre de quilles tombées moins prévisible. Près de 50, la précision sur une quille isolée devient souvent préférable.",
  },
  {
    id: "omni-molkky-open-board", domain: "molkky", kind: "strategy", title: "Ouvrir le terrain",
    aliases: ["ecarter quilles molkky", "ouvrir jeu molkky"],
    text: "## OUVRIR LE TERRAIN\nAu début, certains lancers peuvent disperser les quilles et créer des numéros plus accessibles pour la suite. Mais ouvrir le terrain aide aussi les adversaires : c’est un choix tactique.",
  },
  {
    id: "omni-molkky-deny-number", domain: "molkky", kind: "strategy", title: "Refuser un numéro facile",
    aliases: ["bloquer numero molkky", "adversaire reste molkky"],
    text: "## REFUSER UN NUMÉRO FACILE\nSi un adversaire a besoin d’un numéro précis, une disposition dense ou un lancer qui déplace cette quille peut rendre sa finition plus difficile. La stratégie ne se limite pas à son propre score.",
  },
  {
    id: "omni-molkky-accuracy", domain: "molkky", kind: "training", title: "Entraîner la précision",
    aliases: ["entrainement precision molkky", "viser une quille molkky"],
    text: "## ENTRAÎNER LA PRÉCISION\nTravaille des séries sur une seule quille, puis change de distance/angle. Note le taux de quilles uniques touchées : c’est une meilleure mesure de précision que le score brut d’une partie.",
  },
  {
    id: "omni-molkky-group-control", domain: "molkky", kind: "training", title: "Contrôle des groupes",
    aliases: ["entrainement groupe molkky", "faire tomber 2 3 quilles"],
    text: "## CONTRÔLE DES GROUPES\nCrée des petits groupes et essaie de faire tomber exactement 2, 3 ou 4 quilles. Cet exercice développe le dosage utile aux phases intermédiaires.",
  },
  {
    id: "omni-molkky-miss-rate", domain: "molkky", kind: "stats", title: "Taux de miss",
    aliases: ["taux miss molkky", "miss rate molkky"],
    text: "## TAUX DE MISS\nLe taux de miss = lancers sans quille tombée ÷ lancers totaux. Il est particulièrement important parce que les misses consécutifs peuvent entraîner une sanction dans la règle officielle.",
  },
  {
    id: "omni-molkky-exact-hit-rate", domain: "molkky", kind: "stats", title: "Taux de quille unique",
    aliases: ["taux quille unique molkky", "precision numero molkky"],
    text: "## TAUX DE QUILLE UNIQUE\nLe taux de quille unique mesure la capacité à faire tomber exactement une quille. C’est un indicateur très utile pour évaluer les fins de partie à score exact.",
  },
  {
    id: "omni-molkky-turns-to-win", domain: "molkky", kind: "stats", title: "Tours pour atteindre 50",
    aliases: ["nombre tours molkky stats", "vitesse victoire molkky"],
    text: "## TOURS POUR ATTEINDRE 50\nLe nombre de tours nécessaires pour atteindre 50 combine rendement et précision de finition. Compare-le avec le taux de dépassement à 25 pour comprendre si un style est rapide mais risqué.",
  },
  {
    id: "omni-molkky-safety", domain: "molkky", kind: "safety", title: "Sécurité Mölkky",
    aliases: ["securite molkky", "zone lancer quilles bois"],
    text: "## SÉCURITÉ MÖLKKY\nPersonne ne doit se tenir dans l’axe de lancer. Le lanceur en bois et les quilles peuvent rebondir : garde les spectateurs derrière la ligne de lancer ou suffisamment éloignés.",
  },
  {
    id: "omni-foot-players-min", domain: "football", kind: "official", title: "Nombre de joueurs",
    aliases: ["11 joueurs football", "minimum 7 joueurs football"],
    text: "## NOMBRE DE JOUEURS\nEn football à 11, une équipe a au maximum **11 joueurs**, dont un gardien. Selon les Laws 2026/27, un match ne peut pas commencer ou continuer durablement avec moins de **7 joueurs** par équipe, sous réserve des protocoles prévus.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-halves", domain: "football", kind: "official", title: "Durée normale",
    aliases: ["2x45 football", "duree match foot 90 minutes"],
    text: "## DURÉE NORMALE\nUn match standard est composé de **deux périodes de 45 minutes**. Le temps additionnel compense notamment les interruptions ; certaines compétitions, catégories ou formats réduits utilisent d’autres durées.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-halftime", domain: "football", kind: "official", title: "Mi-temps",
    aliases: ["duree mi temps football", "pause football 15 minutes"],
    text: "## MI-TEMPS\nLa pause de mi-temps est encadrée par les Laws et la réglementation de compétition. En match standard, elle ne dépasse généralement pas **15 minutes**.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-offside-position", domain: "football", kind: "official", title: "Position de hors-jeu",
    aliases: ["position hors jeu football", "quand joueur est hors jeu"],
    text: "## POSITION DE HORS-JEU\nÊtre en **position** de hors-jeu n’est pas automatiquement une infraction. L’infraction survient si le joueur en position interdite devient impliqué dans le jeu actif selon les critères de la Law 11.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-offside-half", domain: "football", kind: "official", title: "Pas de hors-jeu dans sa moitié",
    aliases: ["hors jeu propre moitie terrain", "offside own half"],
    text: "## PAS DE HORS-JEU DANS SA MOITIÉ\nUn joueur ne peut pas être sanctionné pour hors-jeu s’il se trouve dans sa propre moitié de terrain au moment pertinent. D’autres critères de position doivent aussi être examinés.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-no-offside-restarts", domain: "football", kind: "official", title: "Reprises sans hors-jeu direct",
    aliases: ["pas hors jeu touche corner six metres", "offside throw in goal kick corner"],
    text: "## REPRISES SANS HORS-JEU DIRECT\nIl n’y a pas d’infraction de hors-jeu lorsqu’un joueur reçoit **directement** le ballon sur certaines reprises prévues par la Law 11, notamment une touche, un coup de pied de but ou un corner.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-direct-free-kick", domain: "football", kind: "official", title: "Coup franc direct",
    aliases: ["coup franc direct football", "direct free kick"],
    text: "## COUP FRANC DIRECT\nSur un **coup franc direct**, un but peut être marqué directement dans le but adverse. Le type de faute commise détermine si la reprise est directe ou indirecte.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-indirect-free-kick", domain: "football", kind: "official", title: "Coup franc indirect",
    aliases: ["coup franc indirect football", "indirect free kick"],
    text: "## COUP FRANC INDIRECT\nSur un **coup franc indirect**, le ballon doit toucher un autre joueur avant qu’un but soit valable. L’arbitre signale ce type de reprise selon la procédure prévue.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-penalty-kick", domain: "football", kind: "official", title: "Penalty",
    aliases: ["regle penalty football", "point de penalty"],
    text: "## PENALTY\nUn penalty sanctionne certaines fautes de coup franc direct commises par l’équipe défendante dans sa propre surface de réparation. La procédure impose une position précise du ballon, du tireur, du gardien et des autres joueurs.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-throwin", domain: "football", kind: "official", title: "Touche",
    aliases: ["touche football regle", "throw in football"],
    text: "## TOUCHE\nLa touche remet le ballon en jeu quand il a entièrement franchi la ligne de touche. Elle est exécutée par l’équipe adverse à celle qui a touché le ballon en dernier, selon la technique réglementaire.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-goalkick", domain: "football", kind: "official", title: "Coup de pied de but",
    aliases: ["six metres football", "goal kick regle"],
    text: "## COUP DE PIED DE BUT\nUn coup de pied de but est accordé lorsque le ballon franchit entièrement la ligne de but après avoir été touché en dernier par un attaquant, sans but marqué, dans les conditions de la Law 16.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-corner", domain: "football", kind: "official", title: "Corner",
    aliases: ["corner football regle", "coup de pied coin"],
    text: "## CORNER\nUn corner est accordé lorsque le ballon franchit entièrement la ligne de but après avoir été touché en dernier par un défenseur, sans but marqué.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-kickoff", domain: "football", kind: "official", title: "Coup d’envoi",
    aliases: ["coup envoi football", "kickoff regle"],
    text: "## COUP D’ENVOI\nLe coup d’envoi débute chaque période et reprend le jeu après un but. Les positions et distances des joueurs sont encadrées par la Law 8.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-dropped-ball", domain: "football", kind: "official", title: "Balle à terre",
    aliases: ["balle a terre football", "dropped ball"],
    text: "## BALLE À TERRE\nLa **balle à terre** est une reprise utilisée après certaines interruptions où aucune autre reprise spécifique ne s’applique. La procédure dépend de l’endroit et de la situation lors de l’arrêt.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-advantage", domain: "football", kind: "official", title: "Avantage",
    aliases: ["regle avantage football", "laisser jouer faute foot"],
    text: "## AVANTAGE\nL’arbitre peut appliquer l’**avantage** si arrêter immédiatement le jeu pénaliserait l’équipe victime. Il peut ensuite revenir à une sanction disciplinaire lorsque les Laws le permettent.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-yellow", domain: "football", kind: "official", title: "Carton jaune",
    aliases: ["carton jaune football", "avertissement foot"],
    text: "## CARTON JAUNE\nLe carton jaune est un **avertissement disciplinaire**. Les motifs et les conséquences d’un second jaune dépendent de la Law 12 et de la compétition.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-red", domain: "football", kind: "official", title: "Carton rouge",
    aliases: ["carton rouge football", "exclusion foot"],
    text: "## CARTON ROUGE\nLe carton rouge entraîne l’**exclusion** du joueur ou officiel concerné selon les Laws. Une équipe ne remplace normalement pas un joueur exclu dans un match standard, sauf protocoles spécifiques.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-extra-time", domain: "football", kind: "competition", title: "Prolongation",
    aliases: ["prolongation football", "extra time 2x15"],
    text: "## PROLONGATION\nCertaines compétitions à élimination directe utilisent une prolongation, couramment deux périodes de 15 minutes, si le score doit être départagé. Le règlement de compétition décide si elle est utilisée avant les tirs au but.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-shootout", domain: "football", kind: "competition", title: "Tirs au but",
    aliases: ["seance tirs au but", "penalty shootout football"],
    text: "## TIRS AU BUT\nUne séance de tirs au but sert à désigner un vainqueur lorsque le règlement l’exige après une égalité. Elle est distincte du score du match pour de nombreuses statistiques : un tir réussi en séance n’est pas un but de match ordinaire.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-foot-clean-sheet", domain: "football", kind: "stats", title: "Clean sheet",
    aliases: ["clean sheet football", "match sans encaisser"],
    text: "## CLEAN SHEET\nUn **clean sheet** signifie terminer le match sans encaisser de but. Pour les gardiens, il faut préciser les règles de crédit si plusieurs gardiens ont joué.",
  },
  {
    id: "omni-foot-brace", domain: "football", kind: "glossary", title: "Doublé",
    aliases: ["double football buteur", "brace football"],
    text: "## DOUBLÉ\nUn **doublé** signifie qu’un joueur marque deux buts dans le même match.",
  },
  {
    id: "omni-foot-hattrick", domain: "football", kind: "glossary", title: "Triplé / hat-trick",
    aliases: ["hat trick football", "triple foot buteur"],
    text: "## TRIPLÉ / HAT-TRICK\nUn **hat-trick** ou triplé signifie qu’un joueur marque trois buts dans le même match. Un « perfect hat-trick » désigne couramment pied droit + pied gauche + tête, mais c’est une convention culturelle, pas une Law.",
  },
  {
    id: "omni-foot-assist", domain: "football", kind: "stats", title: "Passe décisive",
    aliases: ["passe decisive football", "assist foot"],
    text: "## PASSE DÉCISIVE\nLa **passe décisive** est une statistique, pas une catégorie des Laws of the Game. Sa définition peut varier selon le fournisseur de données : déviation, penalty obtenu, rebond ou but contre son camp peuvent être traités différemment.",
  },
  {
    id: "omni-foot-shot-on-target", domain: "football", kind: "stats", title: "Tir cadré",
    aliases: ["tir cadre football", "shot on target definition"],
    text: "## TIR CADRÉ\nUn tir cadré est généralement une tentative qui aurait fini dans le but sans l’intervention du gardien/d’un défenseur, ou qui devient un but. Les conventions statistiques peuvent varier sur certains contres.",
  },
  {
    id: "omni-foot-conversion-rate", domain: "football", kind: "stats", title: "Taux de conversion",
    aliases: ["taux conversion tirs football", "buts tirs pourcentage"],
    text: "## TAUX DE CONVERSION\nLe taux de conversion = buts ÷ tirs × 100. Il mesure l’efficacité de finition, mais dépend fortement de la qualité des occasions et du volume de tirs.",
  },
  {
    id: "omni-foot-pass-completion", domain: "football", kind: "stats", title: "Précision de passe",
    aliases: ["passes reussies football pourcentage", "pass completion"],
    text: "## PRÉCISION DE PASSE\nLa précision de passe = passes réussies ÷ passes tentées. Un taux élevé ne signifie pas automatiquement meilleure création : difficulté et progressivité des passes comptent aussi.",
  },
  {
    id: "omni-foot-possession", domain: "football", kind: "stats", title: "Possession",
    aliases: ["possession football calcul", "pourcentage possession foot"],
    text: "## POSSESSION\nLa possession décrit la part de contrôle du ballon estimée ou mesurée par le fournisseur de données. Elle indique qui a davantage le ballon, pas qui a nécessairement créé les meilleures occasions.",
  },
  {
    id: "omni-foot-xg", domain: "football", kind: "stats", title: "Expected Goals (xG)",
    aliases: ["xg football", "expected goals", "buts attendus"],
    text: "## EXPECTED GOALS (XG)\nLes **xG** estiment la probabilité qu’un tir devienne un but à partir de caractéristiques de l’occasion. Deux fournisseurs peuvent produire des valeurs différentes ; l’xG n’est donc pas une vérité unique ni une statistique directement définie par les Laws.",
  },
  {
    id: "omni-foot-xa", domain: "football", kind: "stats", title: "Expected Assists (xA)",
    aliases: ["xa football", "expected assists"],
    text: "## EXPECTED ASSISTS (XA)\nLes **xA** estiment la qualité des occasions créées par une passe, indépendamment du fait que le partenaire marque réellement. La méthodologie dépend du modèle de données.",
  },
  {
    id: "omni-foot-pressing", domain: "football", kind: "strategy", title: "Pressing",
    aliases: ["pressing football", "presser haut foot"],
    text: "## PRESSING\nLe **pressing** cherche à réduire le temps et l’espace du porteur pour récupérer le ballon ou forcer une passe prévisible. Il peut être haut, médian ou bas selon la hauteur du bloc.",
  },
  {
    id: "omni-foot-counterpress", domain: "football", kind: "strategy", title: "Contre-pressing",
    aliases: ["contre pressing football", "gegenpressing"],
    text: "## CONTRE-PRESSING\nLe contre-pressing consiste à presser immédiatement après la perte pour récupérer avant que l’adversaire ne puisse lancer sa transition.",
  },
  {
    id: "omni-foot-lowblock", domain: "football", kind: "strategy", title: "Bloc bas",
    aliases: ["bloc bas football", "low block"],
    text: "## BLOC BAS\nUn **bloc bas** défend près de sa surface avec des lignes compactes. Il réduit l’espace dans le dos mais peut laisser davantage de possession et de tirs lointains à l’adversaire.",
  },
  {
    id: "omni-foot-counterattack", domain: "football", kind: "strategy", title: "Contre-attaque",
    aliases: ["contre attaque football", "transition offensive foot"],
    text: "## CONTRE-ATTAQUE\nLa contre-attaque exploite les espaces juste après récupération, avant que l’adversaire ne se replace. Vitesse de première passe, appels et largeur sont souvent déterminants.",
  },
  {
    id: "omni-foot-setpiece", domain: "football", kind: "strategy", title: "Coup de pied arrêté",
    aliases: ["coup de pied arrete football", "set piece foot"],
    text: "## COUP DE PIED ARRÊTÉ\nLes corners, coups francs et penalties sont des **coups de pied arrêtés**. Ils peuvent être préparés avec des routines spécifiques et sont souvent analysés séparément dans les statistiques.",
  },
  {
    id: "omni-foot-formation", domain: "football", kind: "strategy", title: "Formation",
    aliases: ["formation 433 442 football", "schema tactique foot"],
    text: "## FORMATION\nUne formation comme 4-3-3 ou 4-4-2 décrit une **structure de départ**, pas la position exacte permanente. En possession et sans ballon, la forme réelle peut changer fortement.",
  },
  {
    id: "omni-foot-safety", domain: "football", kind: "safety", title: "Sécurité et blessures",
    aliases: ["securite football blessure", "joueur blesse arbitre"],
    text: "## SÉCURITÉ ET BLESSURES\nEn cas de blessure potentiellement grave, la sécurité prime sur le score. Le règlement prévoit les conditions d’arrêt et de reprise ; dans un match amateur, ne force pas un joueur blessé à continuer.",
    source: "The IFAB — Laws of the Game 2026/27",
  },
  {
    id: "omni-bf-fivebar", domain: "babyfoot", kind: "glossary", title: "Barre des 5",
    aliases: ["barre des 5 baby foot", "five bar foosball"],
    text: "## BARRE DES 5\nLa **barre des 5** est la ligne de milieux. Elle sert beaucoup à la possession, aux passes vers l’attaque et à la défense du milieu de table.",
  },
  {
    id: "omni-bf-threebar", domain: "babyfoot", kind: "glossary", title: "Barre des 3",
    aliases: ["barre des 3 baby foot", "three bar foosball"],
    text: "## BARRE DES 3\nLa **barre des 3** est la barre d’attaque. Elle sert aux tirs, feintes et combinaisons de finition.",
  },
  {
    id: "omni-bf-goalie-rods", domain: "babyfoot", kind: "glossary", title: "Barres défensives",
    aliases: ["barre gardien baby foot", "defense rods foosball"],
    text: "## BARRES DÉFENSIVES\nLes barres arrière contrôlent gardien et défenseurs selon le modèle de table. Leur coordination sert à fermer les angles et préparer les relances.",
  },
  {
    id: "omni-bf-deadball", domain: "babyfoot", kind: "official", title: "Balle morte",
    aliases: ["balle morte baby foot", "dead ball foosball"],
    text: "## BALLE MORTE\nUne **balle morte** est une balle inaccessible aux figurines dans une zone donnée. Les règles de remise en jeu dépendent du règlement ITSF ou des règles maison choisies.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-spinning", domain: "babyfoot", kind: "official", title: "Moulinet / spinning",
    aliases: ["moulinet baby foot interdit", "spinning foosball"],
    text: "## MOULINET / SPINNING\nEn règles ITSF, la rotation incontrôlée des barres au-delà de ce qui est autorisé est interdite : on parle de **spinning**. En loisir, les règles maison doivent être annoncées avant la partie.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-serve", domain: "babyfoot", kind: "official", title: "Engagement",
    aliases: ["engagement baby foot", "serve foosball"],
    text: "## ENGAGEMENT\nLa procédure d’engagement et de remise en jeu est définie par le règlement utilisé. En compétition ITSF, elle est encadrée ; les usages de bar français peuvent différer.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-pass", domain: "babyfoot", kind: "technique", title: "Passe 5 vers 3",
    aliases: ["passe 5 3 baby foot", "five to three pass"],
    text: "## PASSE 5 VERS 3\nLa passe de la barre des 5 vers la barre des 3 est une compétence centrale : elle transforme la possession au milieu en vraie occasion de tir.",
  },
  {
    id: "omni-bf-lane-wall-pass", domain: "babyfoot", kind: "technique", title: "Passe couloir / mur",
    aliases: ["lane pass wall pass foosball", "passe mur baby foot"],
    text: "## PASSE COULOIR / MUR\nUne passe peut passer le long de la bande (**wall pass**) ou dans un couloir intérieur (**lane pass**). Alterner les deux oblige le défenseur à couvrir plusieurs portes.",
  },
  {
    id: "omni-bf-pinshot", domain: "babyfoot", kind: "technique", title: "Pin shot",
    aliases: ["pin shot baby foot", "tir pince foosball"],
    text: "## PIN SHOT\nLe **pin shot** contrôle la balle sous le pied de la figurine avant une libération latérale et un tir. Il demande toucher, vitesse et lecture du gardien.",
  },
  {
    id: "omni-bf-snake", domain: "babyfoot", kind: "technique", title: "Snake / rollover",
    aliases: ["snake shot baby foot", "rollover foosball"],
    text: "## SNAKE / ROLLOVER\nLe **snake shot** ou rollover est un tir moderne où la balle est pincée puis déplacée rapidement avant la frappe. Sa légalité dépend du respect des règles anti-spinning.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-pullshot", domain: "babyfoot", kind: "technique", title: "Pull shot",
    aliases: ["pull shot baby foot", "tir tire foosball"],
    text: "## PULL SHOT\nLe **pull shot** déplace la balle latéralement vers le joueur avant de la frapper. La vitesse du déplacement et la capacité à choisir court/milieu/long créent l’incertitude.",
  },
  {
    id: "omni-bf-pushshot", domain: "babyfoot", kind: "technique", title: "Push shot",
    aliases: ["push shot baby foot", "tir pousse foosball"],
    text: "## PUSH SHOT\nLe **push shot** est l’image inverse du pull shot : la balle est déplacée dans l’autre direction avant la frappe. Il peut être utilisé comme système principal ou comme variation.",
  },
  {
    id: "omni-bf-bankshot", domain: "babyfoot", kind: "technique", title: "Bande / bank shot",
    aliases: ["tir bande baby foot", "bank shot foosball"],
    text: "## BANDE / BANK SHOT\nUn **bank shot** utilise la bande pour changer l’angle avant d’entrer dans le but. Il est plus dépendant de la table et du rebond que le tir direct.",
  },
  {
    id: "omni-bf-tictac", domain: "babyfoot", kind: "technique", title: "Tic-tac",
    aliases: ["tic tac baby foot", "tic tac foosball"],
    text: "## TIC-TAC\nLe **tic-tac** fait circuler rapidement la balle entre plusieurs figurines pour déplacer la défense et créer une ouverture. Il exige contrôle et synchronisation.",
  },
  {
    id: "omni-bf-possession", domain: "babyfoot", kind: "strategy", title: "Possession",
    aliases: ["possession baby foot", "garder balle foosball"],
    text: "## POSSESSION\nLa possession réduit les occasions adverses et permet de préparer une passe ou un tir. Mais conserver la balle sans progression n’est pas une fin en soi : le règlement peut aussi imposer des limites temporelles.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-goalie-angle", domain: "babyfoot", kind: "strategy", title: "Fermer les angles",
    aliases: ["angle gardien baby foot", "defense foosball"],
    text: "## FERMER LES ANGLES\nEn défense, aligne gardien et défenseurs pour couvrir des lignes différentes plutôt que les superposer. Le but est de fermer tir direct, diagonale et bande avec le moins de trous possible.",
  },
  {
    id: "omni-bf-read-defense", domain: "babyfoot", kind: "strategy", title: "Lire la défense",
    aliases: ["lire gardien baby foot", "choisir trou tir foosball"],
    text: "## LIRE LA DÉFENSE\nAvant de tirer, observe le déplacement du gardien et des défenseurs : beaucoup de systèmes gagnent par **lecture et timing**, pas seulement par vitesse.",
  },
  {
    id: "omni-bf-pass-rate", domain: "babyfoot", kind: "stats", title: "Taux de passes 5→3",
    aliases: ["taux passe baby foot", "5 to 3 pass percentage"],
    text: "## TAUX DE PASSES 5→3\nLe taux de passes 5→3 = possessions transformées en contrôle à l’attaque ÷ tentatives de passe. C’est un indicateur clé pour séparer jeu de milieu et qualité de finition.",
  },
  {
    id: "omni-bf-shot-rate", domain: "babyfoot", kind: "stats", title: "Taux de conversion des tirs",
    aliases: ["taux tir baby foot", "shot percentage foosball"],
    text: "## TAUX DE CONVERSION DES TIRS\nLe taux de conversion = buts ÷ tirs. Pour l’interpréter, distingue si possible tirs depuis la barre des 3, tirs de défense et buts chanceux/rebonds.",
  },
  {
    id: "omni-bf-possession-turnover", domain: "babyfoot", kind: "stats", title: "Pertes de balle",
    aliases: ["pertes de balle baby foot", "turnover foosball stats"],
    text: "## PERTES DE BALLE\nLes pertes de balle montrent combien de possessions se terminent sans passe ni tir contrôlé. Elles sont souvent plus instructives que le score seul pour analyser la progression technique.",
  },
  {
    id: "omni-bf-official-v-house", domain: "babyfoot", kind: "official", title: "Règles ITSF vs règles de café",
    aliases: ["regle officielle baby foot vs bar", "demi gamelle pissette officielle"],
    text: "## RÈGLES ITSF VS RÈGLES DE CAFÉ\nLe baby-foot possède des règles de compétition ITSF, mais de nombreuses tables françaises utilisent des **règles de café** : demis, gamelles, pissettes, engagements, pêche, etc. Avant une partie, annonce le référentiel pour éviter les disputes.",
    source: "ITSF — Standard Matchplay Rules 2024 (règles publiées en vigueur sur le site ITSF)",
  },
  {
    id: "omni-bf-table-variation", domain: "babyfoot", kind: "equipment", title: "Différences entre tables",
    aliases: ["bonzini tornado leonhart difference", "table baby foot change jeu"],
    text: "## DIFFÉRENCES ENTRE TABLES\nLe poids des barres, la balle, l’adhérence, les figurines et la surface changent fortement selon la table. Une technique dominante sur une Bonzini peut demander une adaptation sur Tornado ou Leonhart.",
  },
  {
    id: "omni-bf-safety", domain: "babyfoot", kind: "safety", title: "Sécurité des barres",
    aliases: ["securite baby foot barres", "poignees foosball danger"],
    text: "## SÉCURITÉ DES BARRES\nNe laisse pas les barres dépasser brutalement vers un autre joueur et évite les mouvements violents. Les barres télescopiques réduisent certains risques, mais la maîtrise des gestes reste essentielle.",
  },
  {
    id: "omni-dice-outcomes-d6", domain: "dice", kind: "probability", title: "Univers d’un D6",
    aliases: ["issues d6", "combien faces de", "probabilite de 1 a 6"],
    text: "## UNIVERS D’UN D6\nUn D6 équilibré possède **6 issues équiprobables**. La probabilité d’obtenir une face précise est 1/6 ≈ 16,67 %.",
  },
  {
    id: "omni-dice-two-d6-outcomes", domain: "dice", kind: "probability", title: "Univers de 2D6",
    aliases: ["36 combinaisons 2d6", "deux des 36 issues"],
    text: "## UNIVERS DE 2D6\nAvec deux D6 indépendants et ordonnés, il existe **36 couples équiprobables**. Les sommes ne sont donc pas équiprobables : 7 peut être obtenu de 6 façons, alors que 2 ou 12 n’en ont qu’une.",
  },
  {
    id: "omni-dice-2d6-seven", domain: "dice", kind: "probability", title: "Probabilité de faire 7 avec 2D6",
    aliases: ["faire 7 avec 2 des", "probabilite somme 7 2d6"],
    text: "## PROBABILITÉ DE FAIRE 7 AVEC 2D6\nLa somme 7 possède 6 combinaisons sur 36 : **6/36 = 1/6 ≈ 16,67 %**. C’est la somme la plus probable avec deux D6.",
  },
  {
    id: "omni-dice-2d6-extremes", domain: "dice", kind: "probability", title: "Sommes 2 et 12",
    aliases: ["probabilite 2 ou 12 deux des", "somme 2 2d6", "somme 12 2d6"],
    text: "## SOMMES 2 ET 12\nAvec 2D6, 2 ne peut être obtenu que par 1+1 et 12 que par 6+6 : chacun a une probabilité de **1/36 ≈ 2,78 %**.",
  },
  {
    id: "omni-dice-any-double", domain: "dice", kind: "probability", title: "Faire un double avec 2D6",
    aliases: ["probabilite double deux des", "faire double 2d6"],
    text: "## FAIRE UN DOUBLE AVEC 2D6\nIl existe 6 doubles parmi les 36 couples possibles : **6/36 = 1/6 ≈ 16,67 %**. Un double précis, comme double 6, vaut 1/36 ≈ 2,78 %.",
  },
  {
    id: "omni-dice-3d6-range", domain: "dice", kind: "probability", title: "Somme avec 3D6",
    aliases: ["3d6 somme min max", "trois des somme 3 18"],
    text: "## SOMME AVEC 3D6\nAvec 3D6, la somme minimale est **3** et la maximale **18**. Les valeurs centrales sont beaucoup plus probables que les extrêmes.",
  },
  {
    id: "omni-dice-independence", domain: "dice", kind: "probability", title: "Indépendance des lancers",
    aliases: ["des independants", "le de se souvient", "gambler fallacy dice"],
    text: "## INDÉPENDANCE DES LANCERS\nSi les dés sont équilibrés et les lancers indépendants, les résultats précédents ne rendent pas une face « due ». Faire cinq fois 6 ne réduit pas la probabilité de 6 au lancer suivant.",
  },
  {
    id: "omni-dice-gambler-fallacy", domain: "dice", kind: "probability", title: "Erreur du joueur",
    aliases: ["erreur du joueur probabilite", "gambler fallacy des"],
    text: "## ERREUR DU JOUEUR\nLa **gambler’s fallacy** consiste à croire qu’une série doit être compensée à court terme. Avec des essais indépendants, une longue série inhabituelle ne change pas la probabilité du prochain lancer.",
  },
  {
    id: "omni-dice-expected-value", domain: "dice", kind: "stats", title: "Espérance mathématique",
    aliases: ["esperance d6", "expected value dice"],
    text: "## ESPÉRANCE MATHÉMATIQUE\nL’espérance d’un D6 équilibré vaut **3,5** : c’est la moyenne théorique sur un très grand nombre de lancers, pas un résultat qu’on peut obtenir sur un lancer unique.",
  },
  {
    id: "omni-dice-variance", domain: "dice", kind: "stats", title: "Variance et volatilité",
    aliases: ["variance des", "jeu de des volatilite", "chance vs regularite"],
    text: "## VARIANCE ET VOLATILITÉ\nDeux jeux peuvent avoir la même moyenne mais des dispersions différentes. Une forte variance produit davantage de résultats extrêmes et rend les petites séries plus imprévisibles.",
  },
  {
    id: "omni-dice-hot-hand", domain: "dice", kind: "stats", title: "Série chaude aux dés",
    aliases: ["serie chance des", "hot streak dice"],
    text: "## SÉRIE CHAUDE AUX DÉS\nUne série de bons lancers peut exister par hasard. Sans mécanisme qui change réellement les probabilités, elle n’est pas une preuve que le dé est devenu plus favorable.",
  },
  {
    id: "omni-dice-yam-five-kind", domain: "dice", kind: "probability", title: "Yam en un seul lancer",
    aliases: ["probabilite yams premier lancer", "5 des identiques chance"],
    text: "## YAM EN UN SEUL LANCER\nAvec cinq D6, obtenir cinq faces identiques dès le premier lancer possède 6 résultats favorables sur 6⁵, soit **1/1296 ≈ 0,077 %**.",
  },
  {
    id: "omni-dice-yam-upper", domain: "dice", kind: "strategy", title: "Partie haute du Yam",
    aliases: ["partie haute yams", "bonus yams strategie"],
    text: "## PARTIE HAUTE DU YAM\nDans les jeux de type Yam/Yahtzee, la partie haute récompense les 1 à 6 et peut offrir un bonus selon la grille utilisée. La stratégie dépend de la scorecard exacte de MULTISPORTS SCORING.",
  },
  {
    id: "omni-dice-yam-reroll", domain: "dice", kind: "strategy", title: "Garder ou relancer au Yam",
    aliases: ["garder des yams", "relance yams strategie"],
    text: "## GARDER OU RELANCER AU YAM\nAvant une relance, compare les catégories encore ouvertes, le nombre de dés déjà utiles et les issues qui améliorent vraiment la feuille. Garder une paire n’a pas la même valeur si le brelan est déjà rempli.",
  },
  {
    id: "omni-dice-farkle-bank", domain: "dice", kind: "strategy", title: "Bank au Farkle",
    aliases: ["bank farkle", "quand encaisser farkle"],
    text: "## BANK AU FARKLE\nAu Farkle, **bank** signifie sécuriser les points du tour au lieu de continuer. Plus le total non sécurisé monte, plus le coût d’un bust devient élevé : le bon seuil dépend du retard, du nombre de dés et des règles de score.",
  },
  {
    id: "omni-dice-farkle-bust", domain: "dice", kind: "strategy", title: "Bust au Farkle",
    aliases: ["bust farkle", "aucun de marque farkle"],
    text: "## BUST AU FARKLE\nUn **bust/Farkle** survient quand le lancer ne fournit aucune combinaison scorante selon le barème utilisé ; les points non sécurisés du tour sont alors perdus. Les combinaisons exactes peuvent varier selon la variante.",
  },
  {
    id: "omni-dice-farkle-hot", domain: "dice", kind: "strategy", title: "Hot Dice",
    aliases: ["hot dice farkle", "tous les des scorent farkle"],
    text: "## HOT DICE\nQuand tous les dés disponibles ont été utilisés dans des combinaisons scorantes, de nombreuses variantes permettent de reprendre l’ensemble des dés et de continuer : ce sont les **Hot Dice**. Vérifie la règle du mode actif.",
  },
  {
    id: "omni-dice-421-variation", domain: "dice", kind: "official", title: "421 : variantes",
    aliases: ["regles 421 differentes", "classement combinaisons 421"],
    text: "## 421 : VARIANTES\nLe **421** possède de nombreuses variantes régionales : hiérarchie des combinaisons, jetons et manches peuvent changer. Awéna doit donc donner priorité aux règles affichées par MULTISPORTS SCORING plutôt qu’à une convention unique supposée.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-dice-poker-hands", domain: "dice", kind: "glossary", title: "Combinaisons Poker Dice",
    aliases: ["combinaison poker dice", "brelan full carre poker des"],
    text: "## COMBINAISONS POKER DICE\nPoker Dice reprend des familles de combinaisons de poker adaptées aux dés : paire, double paire, brelan, suite selon la variante, full, carré, cinq identiques. La hiérarchie exacte doit suivre le mode actif.",
  },
  {
    id: "omni-dice-risk-reward", domain: "dice", kind: "strategy", title: "Risque / récompense",
    aliases: ["risque recompense jeu des", "push your luck strategie"],
    text: "## RISQUE / RÉCOMPENSE\nDans un jeu push-your-luck, la bonne décision ne maximise pas seulement le gain possible : elle compare **gain attendu, risque de perdre le tour et situation au score**.",
  },
  {
    id: "omni-dice-sample", domain: "dice", kind: "stats", title: "Petite série de lancers",
    aliases: ["50 lancers des statistique", "petit echantillon des"],
    text: "## PETITE SÉRIE DE LANCERS\nSur quelques dizaines de lancers, des écarts visibles par rapport aux probabilités théoriques sont normaux. Plus l’échantillon grandit, plus les fréquences ont tendance à se stabiliser autour des probabilités si le dé est équilibré.",
  },
  {
    id: "omni-dice-fairness", domain: "dice", kind: "stats", title: "Dé équilibré",
    aliases: ["de truque statistique", "tester equilibre de"],
    text: "## DÉ ÉQUILIBRÉ\nUne fréquence inhabituelle n’est pas suffisante pour conclure qu’un dé est biaisé. Il faut un échantillon important et un test statistique adapté, en contrôlant aussi la manière de lancer et la surface.",
  },
  {
    id: "omni-stat-mean", domain: "stats", kind: "stats", title: "Moyenne arithmétique",
    aliases: ["moyenne arithmetique", "calcul moyenne stats"],
    text: "## MOYENNE ARITHMÉTIQUE\nLa moyenne = somme des valeurs ÷ nombre de valeurs. Elle résume bien un ensemble régulier mais peut être tirée vers le haut ou le bas par des valeurs extrêmes.",
  },
  {
    id: "omni-stat-median", domain: "stats", kind: "stats", title: "Médiane",
    aliases: ["mediane definition", "difference moyenne mediane"],
    text: "## MÉDIANE\nLa **médiane** est la valeur centrale après tri. Elle résiste mieux aux valeurs extrêmes que la moyenne et décrit souvent mieux une distribution asymétrique.",
  },
  {
    id: "omni-stat-mode", domain: "stats", kind: "stats", title: "Mode statistique",
    aliases: ["mode statistique definition", "valeur la plus frequente"],
    text: "## MODE STATISTIQUE\nLe **mode** est la valeur ou catégorie la plus fréquente. Un ensemble peut avoir plusieurs modes ou aucun mode vraiment informatif.",
  },
  {
    id: "omni-stat-range", domain: "stats", kind: "stats", title: "Étendue",
    aliases: ["etendue statistique", "range stats max min"],
    text: "## ÉTENDUE\nL’étendue = maximum − minimum. Elle donne une idée très simple de dispersion mais dépend entièrement des deux valeurs extrêmes.",
  },
  {
    id: "omni-stat-stddev", domain: "stats", kind: "stats", title: "Écart-type",
    aliases: ["ecart type definition", "standard deviation sport stats"],
    text: "## ÉCART-TYPE\nL’**écart-type** décrit la dispersion autour de la moyenne. Un écart-type faible indique des performances plus regroupées ; élevé indique davantage de variabilité.",
  },
  {
    id: "omni-stat-percentile", domain: "stats", kind: "stats", title: "Percentile",
    aliases: ["percentile sport stats", "90e percentile definition"],
    text: "## PERCENTILE\nLe 90e percentile est une valeur telle qu’environ 90 % des observations sont inférieures ou égales. Les percentiles permettent de situer une performance sans supposer une distribution particulière.",
  },
  {
    id: "omni-stat-rate", domain: "stats", kind: "stats", title: "Taux",
    aliases: ["taux statistique definition", "rate vs count"],
    text: "## TAUX\nUn **taux** rapporte des réussites à des opportunités : 12 checkouts sur 40 tentatives = 30 %. Il est souvent plus comparable qu’un simple nombre brut.",
  },
  {
    id: "omni-stat-percentage-point", domain: "stats", kind: "stats", title: "Points de pourcentage",
    aliases: ["point de pourcentage", "10 a 15 pourcent hausse"],
    text: "## POINTS DE POURCENTAGE\nPasser de 10 % à 15 % correspond à **+5 points de pourcentage**, mais à une hausse relative de **50 %**. Les deux formulations ne disent pas la même chose.",
  },
  {
    id: "omni-stat-relative-change", domain: "stats", kind: "stats", title: "Variation relative",
    aliases: ["variation relative pourcentage", "augmentation de 20 a 25"],
    text: "## VARIATION RELATIVE\nLa variation relative = (nouveau − ancien) ÷ ancien × 100. De 20 à 25, l’augmentation est de 25 %, même si l’écart absolu n’est que de 5.",
  },
  {
    id: "omni-stat-weighted", domain: "stats", kind: "stats", title: "Moyenne pondérée",
    aliases: ["moyenne ponderee sport", "aggreger moyennes matchs"],
    text: "## MOYENNE PONDÉRÉE\nPour agréger des moyennes calculées sur des volumes différents, pondère par le nombre d’opportunités. La moyenne simple de deux pourcentages peut être fausse si l’un vient de 5 essais et l’autre de 100.",
  },
  {
    id: "omni-stat-rolling", domain: "stats", kind: "stats", title: "Moyenne glissante",
    aliases: ["moyenne glissante", "rolling average forme"],
    text: "## MOYENNE GLISSANTE\nUne moyenne glissante sur les N derniers matchs lisse le bruit tout en restant sensible à la forme récente. Plus N est petit, plus la courbe réagit vite mais devient instable.",
  },
  {
    id: "omni-stat-trend", domain: "stats", kind: "stats", title: "Tendance",
    aliases: ["tendance stats sport", "trend performance"],
    text: "## TENDANCE\nUne tendance est une évolution durable, pas deux matchs consécutifs. Cherche plusieurs points cohérents, un volume suffisant et un contexte comparable avant de conclure à une progression.",
  },
  {
    id: "omni-stat-outlier", domain: "stats", kind: "stats", title: "Valeur aberrante",
    aliases: ["outlier statistique", "valeur aberrante match"],
    text: "## VALEUR ABERRANTE\nUn **outlier** est une observation très éloignée du reste. Il peut être une erreur de données ou une vraie performance exceptionnelle ; il ne faut pas le supprimer automatiquement.",
  },
  {
    id: "omni-stat-correlation", domain: "stats", kind: "stats", title: "Corrélation",
    aliases: ["correlation causalite", "correlation stats sport"],
    text: "## CORRÉLATION\nUne corrélation indique que deux variables évoluent ensemble, mais ne prouve pas que l’une cause l’autre. Elles peuvent partager une cause ou coïncider sur un petit échantillon.",
  },
  {
    id: "omni-stat-causation", domain: "stats", kind: "stats", title: "Causalité",
    aliases: ["causalite statistique", "prouver cause performance"],
    text: "## CAUSALITÉ\nPour parler de causalité, il faut davantage qu’une corrélation : contrôle du contexte, comparaison pertinente, répétition et parfois expérimentation. Les stats de match seules donnent surtout des associations.",
  },
  {
    id: "omni-stat-selection-bias", domain: "stats", kind: "stats", title: "Biais de sélection",
    aliases: ["biais selection statistiques", "selection bias sport"],
    text: "## BIAIS DE SÉLECTION\nSi tu analyses seulement les matchs gagnés, les meilleurs adversaires ou une période choisie après coup, l’échantillon peut être biaisé. Les filtres doivent être définis avant l’interprétation.",
  },
  {
    id: "omni-stat-survivorship", domain: "stats", kind: "stats", title: "Biais du survivant",
    aliases: ["biais survivant sport stats", "survivorship bias"],
    text: "## BIAIS DU SURVIVANT\nLe biais du survivant apparaît quand on ne voit que les cas restés visibles ou réussis. Par exemple, comparer seulement les joueurs encore actifs ignore ceux qui ont arrêté.",
  },
  {
    id: "omni-stat-h2h", domain: "stats", kind: "stats", title: "Head-to-head",
    aliases: ["head to head", "h2h definition", "face a face joueurs"],
    text: "## HEAD-TO-HEAD\nLe **H2H** compare directement deux joueurs/équipes. Il est utile pour le matchup, mais un H2H de 2 matchs est beaucoup moins solide qu’un historique de 30.",
  },
  {
    id: "omni-stat-streak", domain: "stats", kind: "stats", title: "Série",
    aliases: ["winning streak", "serie victoires statistiques"],
    text: "## SÉRIE\nUne streak est une suite de résultats consécutifs. Elle décrit la continuité, mais ne remplace pas le win rate ni la qualité des adversaires.",
  },
  {
    id: "omni-stat-form", domain: "stats", kind: "stats", title: "Forme récente",
    aliases: ["forme recente stats", "last 5 matches"],
    text: "## FORME RÉCENTE\nLa forme récente se mesure souvent sur les derniers matchs. Elle capte mieux l’état actuel qu’un historique très ancien, mais elle est aussi plus sensible au hasard d’un petit échantillon.",
  },
  {
    id: "omni-stat-normalization", domain: "stats", kind: "stats", title: "Normalisation",
    aliases: ["normaliser statistiques sport", "comparer formats differents"],
    text: "## NORMALISATION\nNormaliser consiste à remettre des métriques sur une base comparable : par match, par volée, par tentative, par minute ou par set. C’est indispensable lorsque les volumes diffèrent.",
  },
  {
    id: "omni-stat-per-match", domain: "stats", kind: "stats", title: "Par match vs total",
    aliases: ["par match vs total stats", "moyenne par partie"],
    text: "## PAR MATCH VS TOTAL\nUn total récompense le volume de jeu ; une valeur **par match** mesure davantage le rendement. Le meilleur indicateur dépend de la question : activité ou efficacité.",
  },
  {
    id: "omni-stat-rate-count", domain: "stats", kind: "stats", title: "Taux vs volume",
    aliases: ["taux ou nombre brut", "10 sur 20 vs 20 sur 100"],
    text: "## TAUX VS VOLUME\nUn taux élevé avec peu d’essais peut être fragile ; un gros volume avec un taux légèrement plus faible peut être plus convaincant. Affiche idéalement **numérateur, dénominateur et pourcentage**.",
  },
  {
    id: "omni-stat-confidence", domain: "stats", kind: "stats", title: "Confiance dans une statistique",
    aliases: ["fiabilite statistique", "confiance petit echantillon"],
    text: "## CONFIANCE DANS UNE STATISTIQUE\nPlus le nombre d’observations augmente, plus une estimation de taux devient stable en général. Awéna doit donc signaler les petits échantillons au lieu de présenter un chiffre comme une vérité définitive.",
  },
  {
    id: "omni-stat-bar-chart", domain: "stats", kind: "stats", title: "Lire un graphique en barres",
    aliases: ["graphique barres stats", "bar chart lecture"],
    text: "## LIRE UN GRAPHIQUE EN BARRES\nUn graphique en barres compare bien des catégories discrètes. Vérifie l’échelle de l’axe : un axe tronqué peut exagérer visuellement de petites différences.",
  },
  {
    id: "omni-stat-line-chart", domain: "stats", kind: "stats", title: "Lire une courbe",
    aliases: ["graphique courbe stats", "line chart progression"],
    text: "## LIRE UNE COURBE\nUne courbe montre bien une évolution chronologique. Observe la période, la fréquence des points et les trous de données avant d’interpréter une hausse ou baisse.",
  },
  {
    id: "omni-stat-pie-chart", domain: "stats", kind: "stats", title: "Lire un camembert",
    aliases: ["camembert statistiques", "pie chart parts"],
    text: "## LIRE UN CAMEMBERT\nUn camembert convient surtout à quelques parts d’un total de 100 %. Avec beaucoup de catégories proches, des barres sont souvent plus lisibles.",
  },
  {
    id: "omni-stat-sparkline", domain: "stats", kind: "stats", title: "Sparkline",
    aliases: ["sparkline definition", "mini courbe stats"],
    text: "## SPARKLINE\nUne **sparkline** est une mini-courbe sans beaucoup d’axes ni d’annotations. Elle sert à montrer rapidement direction et volatilité, mais pas à lire des valeurs précises.",
  },
  {
    id: "omni-stat-record", domain: "stats", kind: "stats", title: "Record vs performance typique",
    aliases: ["record vs moyenne", "meilleur score pas niveau moyen"],
    text: "## RECORD VS PERFORMANCE TYPIQUE\nUn record décrit un **extrême**, pas le niveau habituel. Pour juger la régularité, compare record, moyenne, médiane, dispersion et fréquence à laquelle le joueur approche ce record.",
  },
  {
    id: "omni-stat-denominator", domain: "stats", kind: "stats", title: "Toujours vérifier le dénominateur",
    aliases: ["denominateur pourcentage stats", "sur combien tentatives"],
    text: "## TOUJOURS VÉRIFIER LE DÉNOMINATEUR\nUn pourcentage sans dénominateur est incomplet. « 80 % de réussite » peut signifier 4/5 ou 80/100 : la confiance n’est pas la même.",
  },
  {
    id: "omni-comp-firstto", domain: "competition", kind: "format", title: "First To",
    aliases: ["first to competition", "premier a 3 manches"],
    text: "## FIRST TO\n**First To N** signifie que le premier participant à atteindre N victoires/manches gagne. Le nombre maximal de manches possibles est 2N−1.",
  },
  {
    id: "omni-comp-bestof", domain: "competition", kind: "format", title: "Best Of",
    aliases: ["best of competition", "bo5 bo7"],
    text: "## BEST OF\n**Best Of N** signifie qu’on peut jouer au maximum N manches et que la majorité suffit pour gagner : BO5 = premier à 3, BO7 = premier à 4.",
  },
  {
    id: "omni-comp-roundrobin", domain: "competition", kind: "format", title: "Round-robin",
    aliases: ["round robin tournoi", "toutes rondes championnat"],
    text: "## ROUND-ROBIN\nEn **round-robin**, chaque participant rencontre tous les autres du groupe. Ce format mesure mieux la régularité qu’une élimination directe, mais demande davantage de matchs.",
  },
  {
    id: "omni-comp-knockout", domain: "competition", kind: "format", title: "Élimination directe",
    aliases: ["elimination directe tournoi", "knockout bracket"],
    text: "## ÉLIMINATION DIRECTE\nEn élimination directe, une défaite élimine le participant. Le format est rapide et dramatique, mais un seul mauvais match peut suffire à sortir un favori.",
  },
  {
    id: "omni-comp-doubleelim", domain: "competition", kind: "format", title: "Double élimination",
    aliases: ["double elimination", "loser bracket"],
    text: "## DOUBLE ÉLIMINATION\nEn double élimination, il faut généralement deux défaites pour être éliminé. Un tableau principal et un tableau des perdants donnent une seconde chance après une première défaite.",
  },
  {
    id: "omni-comp-swiss", domain: "competition", kind: "format", title: "Système suisse",
    aliases: ["systeme suisse tournoi", "swiss tournament"],
    text: "## SYSTÈME SUISSE\nLe système suisse fait jouer plusieurs rondes sans que tout le monde se rencontre. Les joueurs sont appariés avec des adversaires de score proche ; un tie-break départage souvent les égalités.",
  },
  {
    id: "omni-comp-groupstage", domain: "competition", kind: "format", title: "Phase de groupes",
    aliases: ["phase groupes tournoi", "group stage"],
    text: "## PHASE DE GROUPES\nUne phase de groupes qualifie un nombre défini de participants vers la suite du tournoi. Les critères d’égalité doivent être fixés avant le début : points, différence, H2H, etc.",
  },
  {
    id: "omni-comp-seed", domain: "competition", kind: "format", title: "Tête de série",
    aliases: ["tete de serie tournoi", "seed bracket"],
    text: "## TÊTE DE SÉRIE\nUne tête de série est placée pour éviter que les meilleurs classés ne se rencontrent trop tôt. Le seeding dépend d’un classement ou d’une règle annoncée avant le tirage.",
  },
  {
    id: "omni-comp-bye", domain: "competition", kind: "format", title: "Bye / exemption",
    aliases: ["bye tournoi", "exemption premier tour"],
    text: "## BYE / EXEMPTION\nUn **bye** permet à un participant de passer un tour sans jouer, souvent pour équilibrer un tableau dont le nombre d’inscrits n’est pas une puissance de deux.",
  },
  {
    id: "omni-comp-walkover", domain: "competition", kind: "format", title: "Walkover / forfait",
    aliases: ["walkover tournoi", "victoire forfait"],
    text: "## WALKOVER / FORFAIT\nUn walkover/forfait donne la victoire parce que l’adversaire ne peut pas ou ne se présente pas pour jouer. Il faut distinguer forfait, abandon en cours de match et disqualification.",
  },
  {
    id: "omni-comp-dq", domain: "competition", kind: "format", title: "Disqualification",
    aliases: ["disqualification tournoi", "dq competition"],
    text: "## DISQUALIFICATION\nUne disqualification est une exclusion pour motif réglementaire ou disciplinaire. Ses conséquences sur scores, classement et matchs passés dépendent du règlement de la compétition.",
  },
  {
    id: "omni-comp-tiebreak", domain: "competition", kind: "format", title: "Tie-break",
    aliases: ["tie break classement", "departager egalite tournoi"],
    text: "## TIE-BREAK\nUn tie-break est un critère ou une épreuve pour départager une égalité. Il doit être défini à l’avance afin d’éviter de choisir après coup le critère qui avantage quelqu’un.",
  },
  {
    id: "omni-comp-headtohead-tb", domain: "competition", kind: "format", title: "H2H comme départage",
    aliases: ["h2h tie break", "face a face departage classement"],
    text: "## H2H COMME DÉPARTAGE\nLe H2H peut servir de départage si deux participants sont à égalité, mais devient plus complexe à trois ou plus. Les règlements utilisent alors souvent différence, mini-classement ou autres critères.",
  },
  {
    id: "omni-comp-score-diff", domain: "competition", kind: "format", title: "Différentiel comme tie-break",
    aliases: ["difference points classement", "goal difference tie break"],
    text: "## DIFFÉRENTIEL COMME TIE-BREAK\nLe différentiel points/buts/legs récompense la marge globale. Il peut encourager à continuer de scorer même quand la victoire d’un match est déjà presque acquise.",
  },
  {
    id: "omni-comp-schedule", domain: "competition", kind: "format", title: "Équité du calendrier",
    aliases: ["equite calendrier tournoi", "ordre matchs avantage"],
    text: "## ÉQUITÉ DU CALENDRIER\nL’ordre des matchs influence fatigue et temps de repos. Un calendrier équitable cherche à éviter qu’un participant enchaîne systématiquement sans pause pendant qu’un autre récupère longtemps.",
  },
  {
    id: "omni-comp-bracket", domain: "competition", kind: "glossary", title: "Bracket / tableau",
    aliases: ["bracket tournoi", "tableau elimination"],
    text: "## BRACKET / TABLEAU\nLe **bracket** est la représentation du chemin des participants dans un tournoi à élimination. Il montre les matchs, gagnants, prochains adversaires et tours.",
  },
  {
    id: "omni-comp-pool", domain: "competition", kind: "glossary", title: "Pool / poule",
    aliases: ["poule tournoi", "pool stage competition"],
    text: "## POOL / POULE\nUne **poule** regroupe plusieurs participants pour une mini-phase de classement. Les meilleurs avancent ensuite selon le nombre de qualifiés prévu.",
  },
  {
    id: "omni-comp-sudden-death", domain: "competition", kind: "format", title: "Mort subite",
    aliases: ["mort subite competition", "sudden death"],
    text: "## MORT SUBITE\nEn mort subite, la prochaine réussite ou le prochain avantage défini décide immédiatement du résultat. La règle exacte dépend du sport et du mode.",
  },
  {
    id: "omni-comp-homeaway", domain: "competition", kind: "format", title: "Aller-retour",
    aliases: ["aller retour competition", "home away aggregate"],
    text: "## ALLER-RETOUR\nUn format aller-retour oppose deux équipes deux fois, souvent à domicile puis à l’extérieur. Le résultat peut être décidé par points de classement ou score cumulé selon le règlement.",
  },
  {
    id: "omni-comp-fairplay", domain: "competition", kind: "safety", title: "Fair-play et règle annoncée",
    aliases: ["fair play tournoi", "regle avant competition"],
    text: "## FAIR-PLAY ET RÈGLE ANNONCÉE\nLe meilleur moyen d’éviter les litiges est de fixer avant le tournoi : format, tie-breaks, retards, forfaits, ordre de lancer/service et procédure de contestation.",
  },
  {
    id: "omni-app-local-first", domain: "app", kind: "architecture", title: "Local-first",
    aliases: ["local first application", "donnees locales multisports scoring"],
    text: "## LOCAL-FIRST\nMULTISPORTS SCORING conserve une part importante de son état **localement** pour rester rapide et utilisable hors ligne sur les fonctions compatibles. Le réseau reste nécessaire pour les fonctions Online, cloud, publicité ou services distants.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-idb-store", domain: "app", kind: "architecture", title: "dc-store-v1",
    aliases: ["dc store v1", "base indexeddb profils", "ou sont profils local"],
    text: "## DC-STORE-V1\nLa base locale **dc-store-v1** fait partie des stockages IndexedDB utilisés par l’application pour l’état principal. La supprimer ou effacer les données du site peut faire perdre des éléments non sauvegardés.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-idb-history", domain: "app", kind: "architecture", title: "dc-history-v1",
    aliases: ["dc history v1", "base historique indexeddb", "ou sont matchs historique"],
    text: "## DC-HISTORY-V1\n**dc-history-v1** est un stockage local lié à l’historique selon les composants de la V80. Les statistiques ne peuvent pas reconstruire ce qui n’a jamais été persisté ou ce qui a été supprimé.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-persistent-storage", domain: "app", kind: "architecture", title: "Stockage persistant",
    aliases: ["storage persist multisports", "persistance navigateur"],
    text: "## STOCKAGE PERSISTANT\nL’application demande la persistance du stockage lorsque la plateforme le permet. Cela réduit le risque d’éviction automatique, mais **ne remplace pas une sauvegarde**.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-export", domain: "app", kind: "backup", title: "Export",
    aliases: ["export donnees multisports", "sauvegarder fichier application"],
    text: "## EXPORT\nUn export crée une copie transportable de données. Avant une grosse mise à jour, une restauration ou un changement d’appareil, un export récent réduit fortement le risque de perte.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-import", domain: "app", kind: "backup", title: "Import",
    aliases: ["import donnees multisports", "restaurer fichier sauvegarde"],
    text: "## IMPORT\nUn import/rétablissement peut remplacer ou fusionner des données selon l’outil utilisé. Vérifie la date et la provenance du fichier et conserve une copie de l’état actuel avant une opération destructrice.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-nas-manual", domain: "app", kind: "backup", title: "Synchronisation NAS manuelle",
    aliases: ["nas manuel multisports", "push pull nas", "sync nas manuelle", "synchronisation nas automatique", "nas automatique", "synchronisation nas manuelle"],
    text: "## SYNCHRONISATION NAS MANUELLE\nDans la V80, la logique NAS est conçue comme une **synchronisation manuelle** : les modifications restent locales jusqu’à une action explicite de push/sauvegarde ou de pull/rechargement. Il ne faut pas supposer une réplication automatique permanente.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-nas-push", domain: "app", kind: "backup", title: "Push NAS",
    aliases: ["push nas multisports", "synchroniser compte nas"],
    text: "## PUSH NAS\nUn **push NAS** envoie l’état local préparé vers la destination NAS. Avant de pousser, vérifie que le local contient bien les dernières modifications, car c’est cet état qui sert de source.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-nas-pull", domain: "app", kind: "backup", title: "Pull NAS",
    aliases: ["pull nas multisports", "recharger depuis nas"],
    text: "## PULL NAS\nUn **pull/reload NAS** récupère un snapshot distant. Comme il peut remplacer l’état local, crée une sauvegarde de sécurité si les données présentes sur l’appareil sont importantes.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-r2", domain: "app", kind: "backup", title: "Cloudflare R2",
    aliases: ["cloudflare r2 multisports", "r2 sauvegarde app"],
    text: "## CLOUDFLARE R2\nR2 sert à certaines fonctions de stockage objet/sauvegarde ou de secours média. Ce n’est pas la base locale de jeu ni un remplacement automatique de l’Historique.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-supabase", domain: "app", kind: "architecture", title: "Supabase",
    aliases: ["supabase multisports scoring", "a quoi sert supabase app"],
    text: "## SUPABASE\nDans la V80, Supabase est notamment présent pour l’authentification et certaines données/services légers ou Online. Le code évite de traiter Supabase comme une copie automatique de tout l’historique local.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-profile-active", domain: "app", kind: "profiles", title: "Profil actif",
    aliases: ["profil actif multisports", "mon profil actif"],
    text: "## PROFIL ACTIF\nLe profil actif représente l’identité principale sélectionnée dans l’application. Il peut être différent du joueur dont c’est le tour dans une partie locale multijoueur.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-local-player", domain: "app", kind: "profiles", title: "Joueur local",
    aliases: ["joueur local profil", "profil local sans compte"],
    text: "## JOUEUR LOCAL\nUn joueur local peut participer sur l’appareil sans nécessairement être un compte distant distinct. Ses statistiques dépendent de l’identité utilisée lors de l’enregistrement des matchs.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-linked-profile", domain: "app", kind: "profiles", title: "Profil lié",
    aliases: ["profil lie compte", "linked profile multisports"],
    text: "## PROFIL LIÉ\nUn profil lié associe une identité locale à une continuité de compte ou un mécanisme distant prévu par l’application. Cette liaison ne signifie pas que chaque donnée lourde est automatiquement synchronisée.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-avatar", domain: "app", kind: "profiles", title: "Avatar",
    aliases: ["avatar profil multisports", "photo joueur app"],
    text: "## AVATAR\nL’avatar est un média de présentation du profil. Sa présence visuelle ne doit jamais être utilisée comme clé unique d’identité statistique : les stats doivent reposer sur les identifiants de profil.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-dartset", domain: "app", kind: "profiles", title: "Dartset",
    aliases: ["dartset multisports", "jeu de flechettes profil"],
    text: "## DARTSET\nUn **dartset** représente un set de fléchettes associé à un joueur. Les statistiques de dartset permettent de comparer le matériel, à condition d’avoir enregistré assez de parties avec chaque set.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-team", domain: "app", kind: "profiles", title: "Équipe",
    aliases: ["equipe multisports scoring", "team stats app"],
    text: "## ÉQUIPE\nUne équipe regroupe plusieurs joueurs pour les modes compatibles. Les stats d’équipe et les stats individuelles doivent rester séparées : gagner en équipe ne signifie pas que chaque joueur possède exactement la même performance individuelle.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-bot", domain: "app", kind: "profiles", title: "Bot IA",
    aliases: ["bot ia multisports", "adversaire ordinateur awena"],
    text: "## BOT IA\nUn bot IA est un adversaire simulé. Son niveau et ses comportements peuvent différer d’un humain ; les comparaisons statistiques sont plus claires quand on peut filtrer bots et joueurs réels.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-history-finished", domain: "app", kind: "stats", title: "Match terminé et Historique",
    aliases: ["match fini historique multisports", "quand partie apparait stats"],
    text: "## MATCH TERMINÉ ET HISTORIQUE\nLes statistiques fiables doivent partir de matchs réellement **persistés**. Une partie interrompue, un écran fermé avant sauvegarde ou une donnée legacy incomplète peut ne pas fournir toutes les métriques d’un match terminé moderne.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-zero-missing", domain: "app", kind: "stats", title: "Zéro vs donnée absente",
    aliases: ["zero ou donnee absente stats", "0 stat signifie quoi"],
    text: "## ZÉRO VS DONNÉE ABSENTE\n**0** signifie une valeur connue égale à zéro ; **absent/null** signifie qu’on ne possède pas l’information. Awéna ne doit pas transformer automatiquement une donnée absente en zéro, car cela fausse les moyennes.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-legacy-match", domain: "app", kind: "stats", title: "Anciennes parties",
    aliases: ["ancienne partie stats incompletes", "legacy historique multisports"],
    text: "## ANCIENNES PARTIES\nLes anciennes parties peuvent avoir été enregistrées avant l’ajout de certains champs. Une statistique moderne comme le détail par fléchette n’est pas toujours reconstructible rétroactivement.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-cache", domain: "app", kind: "performance", title: "Cache",
    aliases: ["cache multisports scoring", "stats cache app"],
    text: "## CACHE\nUn cache accélère l’affichage en réutilisant un résultat déjà calculé. Il ne doit pas devenir une seconde source de vérité : après une modification importante, le système doit pouvoir invalider ou reconstruire le cache depuis les données persistées.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-slow-profiles", domain: "app", kind: "troubleshooting", title: "Profils lents",
    aliases: ["profils lents multisports", "navigation profils lente", "avatars mettent temps"],
    text: "## PROFILS LENTS\nSi Profils est lent, les causes possibles incluent beaucoup de médias, décodage d’images, lectures IndexedDB ou recalculs inutiles. Évite d’effacer les données comme premier réflexe : commence par vérifier version, stockage disponible et comportement après redémarrage.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-slow-images", domain: "app", kind: "troubleshooting", title: "Images lentes",
    aliases: ["images dartsets lentes", "avatars chargent lentement"],
    text: "## IMAGES LENTES\nLes images lourdes coûtent en décodage, mémoire et I/O. Les versions WebP/miniatures et le cache local améliorent généralement la fluidité ; l’image originale peut être conservée séparément si nécessaire.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-freeze", domain: "app", kind: "troubleshooting", title: "Navigation figée",
    aliases: ["application fige", "navigation freeze multisports"],
    text: "## NAVIGATION FIGÉE\nEn cas de gel : attends la fin d’une éventuelle écriture, note l’écran et l’action qui déclenchent le problème, puis redémarre l’application. Si le bug est reproductible, ces étapes exactes sont beaucoup plus utiles qu’un reset global.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-crash", domain: "app", kind: "troubleshooting", title: "Crash reproductible",
    aliases: ["crash multisports scoring", "application se ferme erreur"],
    text: "## CRASH REPRODUCTIBLE\nPour un crash, relève **écran, mode, action juste avant, version et message d’erreur**. Un crash reproductible sur la même action pointe souvent vers une variable, un composant ou une donnée précise et se corrige plus sûrement qu’un effacement complet.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-clear-data", domain: "app", kind: "troubleshooting", title: "Effacer les données",
    aliases: ["effacer donnees application risque", "clear storage multisports"],
    text: "## EFFACER LES DONNÉES\nEffacer stockage/site data peut supprimer profils, historique et préférences locales non sauvegardés. Cette action doit être un dernier recours après export/sauvegarde, pas une étape de dépannage banale.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-reinstall", domain: "app", kind: "troubleshooting", title: "Réinstaller l’application",
    aliases: ["reinstaller multisports scoring donnees", "desinstaller app perte stats"],
    text: "## RÉINSTALLER L’APPLICATION\nUne désinstallation peut supprimer le stockage local de l’application selon la plateforme. Avant de réinstaller, vérifie qu’une sauvegarde récupérable existe si l’Historique ou les profils sont importants.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-update", domain: "app", kind: "troubleshooting", title: "Mettre à jour sans perdre les données",
    aliases: ["mise a jour application perdre stats", "update android multisports"],
    text: "## METTRE À JOUR SANS PERDRE LES DONNÉES\nUne mise à jour normale doit conserver les données de l’application, mais une sauvegarde reste prudente avant une version majeure. Une désinstallation/réinstallation n’est pas équivalente à une mise à jour par-dessus l’application.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-version", domain: "app", kind: "troubleshooting", title: "Version installée",
    aliases: ["quelle version multisports", "version android rc"],
    text: "## VERSION INSTALLÉE\nPour diagnostiquer une différence entre appareils, vérifie la **version réellement installée**, pas seulement le fichier que tu pensais avoir publié. Store, cache de distribution et track de test peuvent servir une autre release.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-pwa-android", domain: "app", kind: "architecture", title: "PWA vs Android",
    aliases: ["pwa vs android multisports", "version web version android"],
    text: "## PWA VS ANDROID\nLa version web/PWA et le paquet Android partagent une grande partie du code, mais Android ajoute des bridges natifs et une chaîne de build/synchronisation. Une fonctionnalité présente dans les sources web n’est disponible sur Android que si elle est incluse dans le build installé.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-android-sync", domain: "app", kind: "architecture", title: "Build Android et synchronisation",
    aliases: ["capacitor sync android", "pourquoi fonctionnalite absente android"],
    text: "## BUILD ANDROID ET SYNCHRONISATION\nDans le projet V80, la chaîne Android exécute build puis synchronisation Capacitor et configurations natives. Si un ancien bundle est distribué, une modification source récente peut ne pas apparaître sur l’appareil.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-permissions-camera", domain: "app", kind: "privacy", title: "Permission caméra",
    aliases: ["permission camera multisports", "camera refusee app"],
    text: "## PERMISSION CAMÉRA\nLa caméra nécessite une permission de la plateforme. Si elle a été refusée durablement, il peut être nécessaire de la réactiver dans les réglages système avant qu’un mode caméra puisse fonctionner.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-camera-calibration", domain: "app", kind: "camera", title: "Calibration caméra",
    aliases: ["calibration camera darts", "camera scoring calibrer cible"],
    text: "## CALIBRATION CAMÉRA\nLa calibration relie les coordonnées de l’image aux zones de la cible. Si le téléphone, le zoom ou la cible bougent, une calibration précédente peut devenir imprécise et doit être refaite.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-camera-light", domain: "app", kind: "camera", title: "Éclairage caméra",
    aliases: ["camera darts eclairage", "detection cible ombre"],
    text: "## ÉCLAIRAGE CAMÉRA\nUne détection visuelle est plus robuste avec lumière uniforme, cible nette, faible reflet et téléphone stable. Ombres fortes, scintillement ou cible partiellement masquée dégradent la qualité des observations.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-cast", domain: "app", kind: "screens", title: "Cast / écran externe",
    aliases: ["cast multisports", "ecran externe scoring"],
    text: "## CAST / ÉCRAN EXTERNE\nLe mode Cast/Écrans sert à afficher une partie ou des informations sur un autre écran compatible. Le téléphone/tablette de contrôle reste la source d’interaction principale selon le mode.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-online", domain: "app", kind: "online", title: "Online",
    aliases: ["online multisports scoring", "jouer en ligne app"],
    text: "## ONLINE\nLes fonctions Online dépendent du réseau et des services distants. Une panne réseau n’empêche pas nécessairement les modes locaux, mais peut bloquer salons, amis, clubs, messages ou synchronisations.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-nearby", domain: "app", kind: "privacy", title: "Joueurs à proximité",
    aliases: ["nearby players multisports", "joueurs proches localisation"],
    text: "## JOUEURS À PROXIMITÉ\nLes fonctions de proximité peuvent nécessiter une permission de localisation ou des coordonnées. La localisation est une donnée sensible : l’application doit limiter son usage à la fonction demandée et respecter les réglages de confidentialité.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-friends", domain: "app", kind: "online", title: "Amis",
    aliases: ["amis multisports scoring", "friend request app"],
    text: "## AMIS\nLes fonctions Amis structurent les relations Online et peuvent faciliter invitations, comparaison ou salons. Elles sont distinctes des profils locaux jouant sur le même appareil.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-clubs", domain: "app", kind: "online", title: "Clubs",
    aliases: ["clubs multisports scoring", "club online app"],
    text: "## CLUBS\nLes Clubs regroupent des utilisateurs/relations autour d’une structure Online. Les données de club et les statistiques locales personnelles ne doivent pas être confondues sans mécanisme explicite d’agrégation.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-messages", domain: "app", kind: "online", title: "Messagerie",
    aliases: ["messages multisports", "chat app"],
    text: "## MESSAGERIE\nLa messagerie est une fonction Online distincte du moteur de scoring local. Si le réseau est indisponible, un match local peut continuer même si les messages ne se chargent pas.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-tournaments", domain: "app", kind: "competition", title: "Compétitions dans l’application",
    aliases: ["tournoi multisports scoring", "competitions app"],
    text: "## COMPÉTITIONS DANS L’APPLICATION\nLe centre Compétitions organise des rencontres/tournois selon les formats disponibles. Awéna doit expliquer le format choisi et ne pas supposer un bracket ou tie-break qui n’a pas été configuré.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-theme", domain: "app", kind: "settings", title: "Thèmes",
    aliases: ["theme multisports scoring", "pack arenas ambiances"],
    text: "## THÈMES\nUn thème modifie la présentation visuelle et peut inclure fonds, cartes ou textures. Il ne doit pas modifier les résultats sportifs enregistrés.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-language", domain: "app", kind: "settings", title: "Langue",
    aliases: ["changer langue multisports", "awena langue app"],
    text: "## LANGUE\nLa langue sélectionnée doit piloter l’interface et Awéna. Les identifiants techniques et notations sportives comme T20, D16 ou DBULL restent stables même si les libellés autour sont traduits.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-intro", domain: "app", kind: "settings", title: "Intro",
    aliases: ["couper intro multisports", "intro on off"],
    text: "## INTRO\nLe réglage Intro contrôle l’expérience de démarrage prévue par l’application. Lorsqu’elle est désactivée, l’objectif est d’accéder plus directement à l’application sans rejouer systématiquement la séquence d’introduction.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-awena-local", domain: "app", kind: "awena", title: "Awéna locale",
    aliases: ["awena hors ligne", "assistant local multisports"],
    text: "## AWÉNA LOCALE\nAwéna s’appuie d’abord sur des bases locales : modes, écrans, règles et connaissance de l’application. Elle ne doit pas inventer une fonction absente simplement parce qu’une fonction similaire existe dans un autre produit.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-awena-context", domain: "app", kind: "awena", title: "Contexte de l’écran",
    aliases: ["awena sait ou je suis", "awena ecran courant"],
    text: "## CONTEXTE DE L’ÉCRAN\nAwéna reçoit un contexte de route/mode/phase et peut scanner certains contrôles visibles. Pour une question « que puis-je faire ici ? », ce contexte doit être prioritaire sur une réponse encyclopédique générique.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-awena-history", domain: "app", kind: "awena", title: "Awéna et les statistiques",
    aliases: ["awena connait mes stats", "awena historique joueur"],
    text: "## AWÉNA ET LES STATISTIQUES\nQuand Awéna parle de statistiques personnelles, elle doit s’appuyer sur les données réellement enregistrées et les filtres actifs. Elle ne doit jamais inventer un record pour remplir un trou de données.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-awena-translation", domain: "app", kind: "awena", title: "Traduction locale Android",
    aliases: ["awena traduction android", "ml kit awena langues"],
    text: "## TRADUCTION LOCALE ANDROID\nLa V80 dispose d’un bridge Android de traduction locale pour convertir questions et réponses autour d’une base canonique. Les traductions ne doivent pas modifier les scores, noms de mode ni symboles sportifs.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-awena-voice", domain: "app", kind: "awena", title: "Voix Awéna",
    aliases: ["voix awena android", "tts awena"],
    text: "## VOIX AWÉNA\nAwéna dispose d’une chaîne vocale locale avec moteur neural/voix Android selon disponibilité. Si une voix spécifique n’est pas prête, le système peut utiliser un moteur de synthèse compatible plutôt que bloquer la réponse texte.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-ads", domain: "app", kind: "monetization", title: "Publicité",
    aliases: ["publicite multisports scoring", "admob app"],
    text: "## PUBLICITÉ\nLa publicité est gérée séparément du scoring sportif. Un problème de bannière/interstitiel ne doit pas altérer le calcul d’une partie ni la persistance d’un match terminé.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-consent", domain: "app", kind: "monetization", title: "Consentement publicitaire",
    aliases: ["consentement admob", "ump multisports"],
    text: "## CONSENTEMENT PUBLICITAIRE\nLe consentement publicitaire concerne la confidentialité et la diffusion d’annonces selon la région et la configuration. Il ne doit pas servir de mécanisme d’accès aux données sportives privées.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-free-premium", domain: "app", kind: "monetization", title: "Fonctions gratuites/premium",
    aliases: ["premium multisports scoring", "fonction verrouillee app"],
    text: "## FONCTIONS GRATUITES/PREMIUM\nCertaines fonctions ou ressources peuvent dépendre de la formule active. Awéna doit distinguer **fonction inexistante**, **fonction disponible mais verrouillée** et **fonction temporairement indisponible**.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-store-theme", domain: "app", kind: "monetization", title: "Boutique de thèmes",
    aliases: ["boutique themes multisports", "pack premium arenas"],
    text: "## BOUTIQUE DE THÈMES\nLa Boutique peut proposer des packs visuels premium. Un pack cosmétique enrichit l’ambiance mais ne change pas les règles d’un mode à moins qu’une fonctionnalité l’indique explicitement.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-debug-info", domain: "app", kind: "troubleshooting", title: "Informations utiles pour un bug",
    aliases: ["quoi envoyer pour bug app", "diagnostic multisports"],
    text: "## INFORMATIONS UTILES POUR UN BUG\nPour diagnostiquer : **version**, appareil/OS, écran/mode, étapes exactes, résultat attendu, résultat observé, capture et message d’erreur. Ces éléments permettent de reproduire sans supprimer les données au hasard.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
  {
    id: "omni-app-storage-space", domain: "app", kind: "troubleshooting", title: "Manque d’espace",
    aliases: ["stockage plein multisports", "application 350 mo"],
    text: "## MANQUE D’ESPACE\nQuand l’espace appareil devient faible, écritures, cache et médias peuvent ralentir ou échouer. Réduire le poids des assets et conserver des sauvegardes externes est préférable à supprimer brutalement l’Historique.",
    source: "MULTISPORTS SCORING — comportement et architecture constatés dans la base V80",
  },
];

function domainBoost(entry: OmniEntry, context?: AwenaRuntimeContext) {
  const sport = norm(context?.sport || "");
  const route = norm(context?.route || "");
  if (entry.domain === "darts" && (sport.includes("dart") || /x01|cricket|killer|darts/.test(route))) return 1.75;
  if (entry.domain === "petanque" && (sport.includes("petanque") || route.includes("petanque"))) return 1.75;
  if (entry.domain === "pingpong" && (sport.includes("ping") || route.includes("pingpong"))) return 1.75;
  if (entry.domain === "molkky" && (sport.includes("molk") || route.includes("molkky"))) return 1.75;
  if (entry.domain === "football" && (sport.includes("foot") || route.startsWith("foot"))) return 1.75;
  if (entry.domain === "babyfoot" && (sport.includes("baby") || route.includes("babyfoot"))) return 1.75;
  if (entry.domain === "dice" && (sport.includes("dice") || route.includes("dice"))) return 1.75;
  return 0;
}

function scoreEntry(entry: OmniEntry, question: string, rememberedTopic?: string, context?: AwenaRuntimeContext) {
  const q = norm(question);
  const qTokens = new Set(tokens(q));
  let score = domainBoost(entry, context);
  for (const raw of entry.aliases) {
    const alias = norm(raw);
    if (!alias) continue;
    if (q === alias) score += 28;
    else if (alias.length >= 5 && q.includes(alias)) score += 14;
    const aliasTokens = tokens(alias);
    let matched = 0;
    for (const token of aliasTokens) {
      if (qTokens.has(token)) { matched += 1; score += token.length >= 6 ? 3 : 1.75; }
    }
    if (aliasTokens.length >= 2 && matched === aliasTokens.length) score += 6;
  }
  if (rememberedTopic === `omni:${entry.id}`) score += 7;
  return score;
}

export function answerAwenaOmniKnowledge(question: string, context: AwenaRuntimeContext, rememberedTopic?: string): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;
  let best: { entry: OmniEntry; score: number } | null = null;
  for (const entry of ENTRIES) {
    const score = scoreEntry(entry, q, rememberedTopic, context);
    if (!best || score > best.score) best = { entry, score };
  }
  // Strict threshold: this corpus is broad and must never steal a generic navigation question.
  if (!best || best.score < 9) return null;
  const reference = best.entry.source ? `\n\n> **Référence :** ${best.entry.source}. Pour une partie active, la configuration réelle de MULTISPORTS SCORING reste prioritaire.` : "";
  return { text: `${best.entry.text}${reference}`, modeId: context.mode || null, knowledgeTopic: `omni:${best.entry.id}` };
}

export function awenaOmniKnowledgeCount() { return ENTRIES.length; }
export function awenaOmniKnowledgeDomains() { return [...new Set(ENTRIES.map((entry) => entry.domain))]; }
export function awenaOmniKnowledgeKinds() { return [...new Set(ENTRIES.map((entry) => entry.kind))]; }
