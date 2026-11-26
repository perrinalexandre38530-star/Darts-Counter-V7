# MULTISPORTS SCORING — CHARTE UI OBLIGATOIRE (V1)

**Statut : contrat pour tout nouvel écran ou patch UI.** Cette charte décrit les références EXISTANTES de V7(2), les règles décidées pour MSS, et les éléments encore à migrer. Elle n'affirme pas que toutes les pages sont déjà conformes.

## 0. Source de vérité / précédence

1. Composants partagés réellement présents dans `src/components/`, `src/training/ui/` et `src/lib/mssVisualCharter.ts` ; ne jamais recréer en local une variante incompatible.
2. Règles explicites ci-dessous pour les écrans de jeu MSS.
3. Thème actif depuis `ThemeContext` : ne pas imposer une couleur cyan sur tout un sport ou tout un mode.
4. Un élément non documenté exige une comparaison avec au moins DEUX modes MSS de référence avant création.

**Ne pas copier une page entière comme modèle technique.** Réutiliser le composant référencé et vérifier son comportement portrait, paysage et Android.

## 1. Références dans le code V7(2)

| Besoin | Référence obligatoire | Note |
|---|---|---|
| Header d'une page jeu/config | `src/components/PageHeader.tsx` + `BackDot.tsx` + `InfoDot.tsx` | Ticker image existant, marges, langues ; éviter de remplacer par un grand texte |
| Header en TRAINING | `src/training/ui/TrainingHeader.tsx` | Ticker et boutons natifs TRAINING |
| Gabarit partie TRAINING | `src/training/ui/TrainingPlayLayout.tsx` et `trainingResponsive.css` | Réutiliser avant d'écrire un cockpit indépendant |
| Bloc joueur actif | `src/components/ShoveActivePlayerCard.tsx`, `src/pages/LoteriePlay.tsx` | Avatar estompé gauche, nom/score, objectif à droite |
| Panneau flottant | `src/components/ShoveFloatingHeader.tsx` | Croix en haut à droite du ticker, titre centré dessous |
| Icônes d'onglets | `src/components/BottomNav.tsx` (`BottomNavIcon`) | SVG linéaires homogènes ; aucune icône emoji à la place |
| Saisie fléchettes | `src/components/Keypad.tsx`, `src/components/KeypadTargets.tsx` | Ne pas réinventer une grille 1–20 indépendante si composant adapté |
| Couleurs S/D/T/MISS/BULL | `src/lib/mssVisualCharter.ts` (`MSS_HIT`, `mssHitColor`) | Seule référence pour touche/volée ; ne pas dupliquer les hex |
| Étoiles des modes | `src/components/GameDifficultyStars.tsx`, `GameDifficultyFilter.tsx` | Sous ticker sur écrans PR/AR et fiches concernées |
| Exemple onglets pédagogiques | `src/training/academy/TrainingAwenaAcademy.tsx` | Onglets avec `BottomNavIcon`, pas 4 gros panneaux empilés |

## 2. Nomenclature de chaque mode

**CONFIG / PR / AR** : ticker FR/EN en haut, BackDot/InfoDot, étoiles de difficulté sous ticker, réglages en sections aérées, bouton de lancement visible. Une variante seule conserve la largeur d'une carte normale.

**PARTIE** : ticker image en haut ; bloc actif type LOTERIE/SHOVE (avatar fondu à gauche, nom + score centraux, OBJECTIF à droite, cliquable) ; bandeau des joueurs/états si nécessaire ; **barre d'onglets icônes** (RÈGLES / CONFIG / JOUEURS / ACTIONS ou LOGS / STATS) ; zone active unique ; **keypad bas, fixe quand le contexte le prévoit**. Les détails doivent rester en modale/onglet, pas tous visibles en colonne.

**TRAINING** : prendre `TrainingPlayLayout` et `TrainingHeader` comme gabarit initial ; afficher OBJECTIF, joueur, volée et saisie sans scroll à rallonge. La FINISH DO Wave 20 est une implémentation **à mettre en conformité** et NON un nouveau modèle pour les autres pages.

**MODALE** : ticker et croix de fermeture superposée en haut à droite ; titre de section centré sous le ticker ; contenus répartis par onglets BottomNav ; fermeture accessible et clavier/pad jamais recouverts.

**STATS / PROGRESSION** : indicateurs essentiels en premier ; détails dans onglet STATS ou un panneau unique scrollable ; ne pas surcharger le jeu avec graphiques et bilans.

## 2.1. Contrat de configuration MSS — référence KILLER (obligatoire)

**KILLER est la référence de navigation et d'organisation pour toutes les configurations de modes de jeu.** Les capacités métier (nombre de participants, formats possibles, options) restent propres à chaque mode. Toute migration doit garder le moteur, les données et les sauvegardes existants.

**Parcours guidé de référence (un seul objectif par étape) :**

1. **Awena** : première étape dédiée à la présentation du mode, bouton/vidéo Awena, variantes apparentées si elles existent ; aucun choix de participants sur cette page.
2. **Type de participants** : uniquement deux grands boutons identiques à ceux de KILLER, « JOUEURS » (silhouette unique) et « ÉQUIPES » (trois silhouettes), thème MSS, occupant ensemble la largeur. Ne pas y intégrer « DUEL / MULTI » ou le nombre d'équipes.
3. **Format de partie** : si JOUEURS, choix distinct « DUEL » (2 joueurs) ou « MULTI » (minimum 2 et maximum défini par le jeu) ; si ÉQUIPES, choix *nombre d'équipes* puis *nombre de joueurs/bots par équipe* parmi les combinaisons réellement prises en charge par le moteur du mode. Les limites sont explicites et ne sont jamais inventées au niveau visuel.
4. **Sélection des participants** : « CHOIX JOUEURS » ou « CHOIX ÉQUIPES » selon le type. Sélecteurs MSS réutilisables (icônes BottomNav, profils/bots/équipes, modales de 9 cartes/page si adaptées), créateur intégré et résumé affichant photos/logos et membres. Respect strict du format choisi, sans ajouts silencieux issus de la dernière partie.
5. **Réglages propres au jeu** : une décision lisible par étape, dans l'ordre cohérent des règles du mode. Options détaillées dans les info-mini, couleurs et SVG issus de la charte centrale, sans blocs explicatifs répétés.
6. **Récapitulatif** : une étape finale compacte, claire et vérifiable (participants / équipes, format, règles, saisie, options). Le bouton « LANCER LA PARTIE » n'apparaît **qu'à cette dernière étape en vue guidée** et reste désactivé si la sélection n'est pas valide.

**Vue complète :** le commutateur **Guidée / Complète doit toujours être accessible**. La vue complète peut réunir les réglages sur une page, sans forcer l'utilisateur à parcourir la guidée. Conserver la capacité « Dernière partie » sans laisser sa restauration outrepasser un format explicitement choisi. Préserver l'état quand on avance ou revient entre les étapes et ne jamais écraser les joueurs/équipes sans action explicite.

**Références techniques :** `src/pages/KillerConfig.tsx` (parcours maître) et `src/components/config/MssGuidedConfigNav.tsx` / `MssParticipantTypeChoice` (navigation et boutons communs). `src/pages/X01ConfigV3.tsx` est la première migration : étape Awena → Participants → Format → Sélection → Réglages → Récap, avec **8 étapes**. En X01, les combinaisons d'équipes actuellement supportées sont 2×2, 2×3, 2×4, 3×2 et 4×2 ; il ne faut pas proposer 3×3/4×4 tant que le moteur ne les valide pas.

**Contrôles de non-régression :** vérifier bascule JOUEURS ↔ ÉQUIPES, DUEL ↔ MULTI, formats 2/3/4 équipes, sélection humaine/bot/équipes enregistrées/brassage, changement de format avec sélection déjà présente, retour en arrière, étape recap, lancer en guidée et en complète. Sur mobile, aucun bloc ni bouton principal ne doit se retrouver sous la BottomNav.

## 2.2. AWENA ASTUCE — contrat obligatoire de configuration (tous modes)

Cette règle s'applique à tous les menus de configuration MSS, tous modes et sports confondus, y compris les entraînements lorsqu'ils proposent ces parcours. Elle prévaut sur les comportements historiques divergents. Ne pas confondre PARTIE RAPIDE avec la vue complète de la configuration ARCADE : le choix du comportement dépend du parcours réel, pas du nombre de blocs visibles ni du scroll.

| Parcours | Nombre et placement | Comportement du conseil |
|---|---|---|
| **PARTIE RAPIDE (PR)** | Une seule image/bulle AWENA ASTUCE, tout en bas du contenu de configuration, après les réglages. Jamais une bulle par bloc, option ou section. | L'image, son cadre et le libellé ASTUCE restent fixes. Seul le texte dans la bulle change automatiquement toutes les **5 secondes (5 000 ms)**, en boucle parmi les conseils du mode. |
| **CONFIGURATION ARCADE (AR) — parcours par étapes** | Une image/bulle AWENA ASTUCE en bas de **chaque étape**, y compris l'étape finale de récapitulatif. Une seule bulle sur l'étape active ; les étapes masquées ne doivent pas afficher de bulle supplémentaire. | Un texte fixe, spécifique à l'étape et au mode. Aucun défilement, aucun minuteur. Le conseil change uniquement lorsque l'utilisateur change d'étape. |

**Implémentation et identité visuelle :** réutiliser le composant AWENA ASTUCE commun s'il existe dans la version de référence ; à défaut, mutualiser le rendu existant de `src/pages/KillerConfig.tsx` et son image `src/assets/president/awena_conseils.webp`. Ne pas inventer un autre visuel. Conserver le médaillon d'Awena, la bulle et le libellé ASTUCE ; le texte est centré, lisible, contenu dans la bulle, traduit via le système de langues MSS et adapté aux règles réelles du mode. Le visuel reste de taille stable lors d'un changement de conseil. Ne pas dupliquer ce bloc avec l'assistant Awena flottant ou la présentation vidéo initiale.

**Cycle de vie :** un seul minuteur de 5 000 ms en PR, uniquement si plusieurs conseils sont disponibles ; nettoyage au démontage ou à la sortie de PR. Aucun minuteur actif en AR. Ne pas déduire PR/AR de la hauteur de fenêtre, du scroll ou d'une heuristique DOM. La vue complète AR ne doit pas activer le carrousel PR simplement parce que plusieurs sections sont visibles ; conserver le commutateur Guidée / Complète existant.

**Recette bloquante :** vérifier sur mobile et desktop (1) une seule bulle en bas de PR, (2) image immobile et texte renouvelé à 5 s puis 10 s, (3) une bulle en bas de chaque étape AR, (4) conseil AR inchangé après au moins 10 s et adapté à l'étape suivante/précédente, (5) absence de minuteur résiduel et de doublons après changement de parcours, (6) aucun chevauchement du bouton de lancement ou de la BottomNav. Tout écart est une non-conformité à corriger avant livraison.

## 3. Règles techniques et lisibilité

- Portrait : une seule zone contextuelle affichée à la fois ; score, objectif, volée et commandes nécessaires visibles ; pas de configuration complète au-dessus du keypad en pleine partie.
- Paysage : colonne gauche fixe pour jeu/score/keypad, colonne droite défilable pour détails, sans écraser les composants. Préserver les zones sûres Android et la BottomNav globale lorsqu'elle est affichée.
- La taille des touches doit rester utilisable au doigt ; objectif minimal 44 × 44 CSS px quand la place le permet ; pas de police minuscule sur les actions principales.
- Ne pas augmenter arbitrairement les marges, cadres, textes explicatifs et gradients. Utiliser en priorité les composants du projet et les jetons déclarés dans `src/styles/mss-ui-contract.css`.
- Ne pas placer **plus d'un panneau central** avec contenu secondaire ouvert en même temps ; les onglets sont des vraies vues, pas des ancres vers des sections empilées.
- Laisser les styles partagés dominer ; les CSS propres aux modes servent seulement aux détails thématiques. Pas de `!important` global pour forcer un design local.
- Séparer état de jeu, événements, calculs et rendu. Un correctif visuel ne doit pas réécrire le moteur ni la sauvegarde.

## 4. Palette keypad — normative

`MSS_HIT` dans `src/lib/mssVisualCharter.ts` est la source unique pour les visuels d'impact.
- S gris ; D bleu/cyan ; T violet/magenta ; MISS orange ambré (texte brun foncé) ; BULL25 vert ; BULL50 / DBULL rouge (texte blanc).
- Fléchettes SVG : `src/ui_assets/cricket-dart.svg`, pas des emoji 🎯 utilisés comme compteurs permanents dans les interfaces de partie.
- À chaque changement de couleur, corriger les jetons centraux et leurs consommateurs — ne jamais fixer une valeur différente uniquement dans FINISH DO ou un autre mode.

## 5. Contrôle obligatoire avant livraison d'un patch d'UI

1. Identifier le ZIP fourni comme base exacte, comparer les fichiers : ne pas écraser un changement postérieur.
2. Classer l'écran (CONFIG, PR/AR, PARTIE, TRAINING, MODALE, STATS) et pointer les composants de référence.
3. Vérifier ticker, BackDot, Awena, bloc actif, barre d'icônes, clavier, couleurs des hits et états.
4. Vérifier portrait étroit (~360×740), portrait moyen (~390×844), paysage téléphone et desktop. **Ne pas déclarer « zéro scroll » sans capture ou essai réel.**
5. Vérifier le flux : config → jeu → retour ; annulation, BUST, finish, bot, plein écran, onglets, modales ; clavier tactile sans recouvrement.
6. Syntaxe TypeScript, test ciblé et build quand les dépendances sont présentes. Tout test non exécuté doit être signalé.
7. Livrer seulement les fichiers réellement créés/modifiés, chemins exacts dans le ZIP. Pas de modification silencieuse de `package.json`, `App.tsx` ou des moteurs.

### Checklist de revue visuelle (bloquante)

- [ ] Le ticker et l'entête sont ceux du système MSS, pas un titre local improvisé.
- [ ] La structure ressemble à une page de référence nommée ci-dessus.
- [ ] Les icônes sont des `BottomNavIcon` / icônes MSS et ont une fonction.
- [ ] Le bloc joueur / objectif reprend la composition MSS quand pertinent.
- [ ] Un seul panneau secondaire visible ; stats et règles dans leurs vues.
- [ ] Le keypad respecte les couleurs centrales et demeure accessible.
- [ ] Pas de scroll pour accéder à la saisie principale pendant une volée sur les tailles testées.
- [ ] Les modales, la BottomNav et le pad ne se chevauchent pas.
- [ ] Les états vides, chargements, erreurs et fin de manche restent lisibles.
- [ ] AWENA ASTUCE : en PR, une seule bulle en bas et texte renouvelé toutes les 5 s ; en AR, une bulle par étape et texte fixe, conformément au § 2.2.
- [ ] Contrôle code AWENA : PR = exactement 1 instance visible, placée après le dernier bloc et le bouton de lancement ; image stable, texte seul piloté par un intervalle 5 000 ms nettoyé au démontage. AR = exactement 1 instance pour l’étape active ; aucun intervalle ni conseil inséré entre des sections de la vue complète.
- [ ] Vérifier par inspection du rendu à chaque patch : 0 duplication de bulle en PR comme en AR, texte contenu dans la bulle, conseils spécifiques au mode.
- [ ] Capture avant/après et contrôle comparatif avec page MSS existante.

## 6. Gouvernance

Le présent fichier est la référence écrite **V1** ; `src/styles/mss-ui-contract.css` est le contrat visuel réutilisable ; `src/components/mss/MssSectionTabs.tsx` est la barre d'onglets réutilisable. Ne pas copier-coller les styles de ces fichiers dans chaque mode. Tout écart se justifie dans une note de patch avec capture et raison fonctionnelle. Tout écart non justifié est une régression à corriger **avant livraison**.

**Limite actuelle :** ce patch crée l'architecture et un contrôle automatique de présence, mais ne convertit pas d'un coup les centaines d'écrans existants. Le script de contrôle n'est pas un moteur de comparaison visuelle.


## Sélecteurs de participants communs — référence KILLER / X01

- Les écrans de configuration présentent d’abord le choix Joueurs/Équipes, puis un format distinct (Duel/Multi ou nombre d’équipes × membres), puis **Choix joueurs**/**Choix équipes**. Ne jamais regrouper ces trois étapes.
- La page de choix reste compacte : titre, rangée unique d’icônes BottomNav centrées, résumé des profils ou équipes choisis (avatars, logos officiels si disponibles), édition et retrait accessibles. Pas de formulaire de composition vertical directement sur la page.
- Les icônes Joueurs, Liste, Bots, Manuel, Équipes enregistrées, Brassage auto, Teams Bots et + ouvrent des galeries/fenêtres flottantes conservant la page de configuration courante. Ne pas rediriger vers Profils pour créer.
- Galeries de sélection : **9 profils, bots ou équipes par page**, trois colonnes si l’espace le permet, pagination précédente/suivante et fermeture/validation clairement identifiables. L’édition d’une équipe ouvre le choix de ses membres, sans modifier les autres équipes.
- Le format fixé à l’étape précédente reste **autoritaire** pour la capacité, la sélection, les contrôles de cohérence et le démarrage. Un joueur ou bot ne peut être retenu deux fois dans les équipes d’un même match. La liste d’une équipe enregistrée peut comporter plus de membres que le format demandé ; choisir exactement le nombre requis.
- La création contextuelle **+** propose Joueur/Bot pour une partie individuelle, et Joueur/Bot/Équipe/Team BOT pour une partie en équipes. Les nouveaux éléments sont enregistrés dans les magasins existants puis proposés directement dans la sélection, sans nouvelle route.
- Les sélecteurs en mode guidé et en mode complet utilisent le **même composant**, sans deux implémentations divergentes. Conserver les contrôles Guidée/Complète, l’étape Awena et le récapitulatif final.

## 7. Audio des configurations — contrat commun MSS

- **Toute configuration de mode jouable possède un bloc MODE AUDIO**, en étape dédiée de la vue guidée et en section compacte de la vue complète. La présentation est celle de `src/components/config/MssGuidedAudioPanel.tsx` (référence X01). Les trois commandes sont **SONS ARCADE**, **BRUITAGES** et **ANNONCES VOCALES**, avec interrupteurs ronds, iconographie BottomNav, intitulés et aide courte ; les voix se choisissent dans la même modale à cartes et comprennent Awena lorsqu'elle est disponible.
- **BRUITAGES** = sons/impacts, donc icône d'onde sonore, jamais une cible (la cible représente un mode de saisie). Tous les autres modes réutilisent cette icône partagée : pas de copie de SVG dans les pages.
- Les options de son sont initialisées depuis `getAudioPreferences()` et sauvegardées via `updateAudioPreferences()` ; les préférences de partie priment lors de la restauration de « Dernière partie ». Préserver les options audio spécifiques d'un jeu et ne pas substituer une voix qui n'est pas disponible dans son moteur.
- En **PARTIE RAPIDE**, conserver une sélection directe sans détour par la configuration guidée ; les mêmes titres, palettes, boutons et récapitulatif premium s'appliquent. Les écrans doivent conserver leur propre logique de jeu et leur mode de saisie par défaut. Le bouton **LANCER LA PARTIE** suit un récapitulatif compact, sans fausse étape supplémentaire.
- **Référence migrée en premier** : X01 (audio partagé, partie rapide) et KILLER (nouvelle section audio). Les autres configurations doivent migrer progressivement sur ce composant à la prochaine intervention, en vérifiant leur câblage réel de lecture audio et en évitant les changements massifs sans tests ciblés.

## 8. Partie rapide X01 — cohérence avec la configuration Arcade (V7(59))

- **Participants** : partie rapide compétitive uniquement, choix **DUEL / ÉQUIPES / MULTI** ; le SOLO reste dans les parcours Training. Icônes de silhouettes au trait BottomNav MSS, centrées et de dimensions identiques, sans pictogrammes emoji. Le choix ÉQUIPES rapide reste **2 équipes de 2 joueurs** tant qu'un format supplémentaire n'est pas câblé au moteur rapide.
- **Format** : commutateur compact **BO / FT** identique à la configuration Arcade, valeurs numériques en pastilles rondes et indication claire de l'unité (LEGS / SETS). Les fonctionnalités avancées non prises en charge par la partie rapide ne sont pas proposées artificiellement.
- **Ordre de départ** : employer `MssStartOrderSection` / `MssSelectorIconButton` plutôt que redessiner des SVG locaux ; l'intitulé et l'explication du choix sélectionné apparaissent sous les quatre icônes.
- **Fiche de partie** : structure alignée sur le récapitulatif KILLER (statut, liste des joueurs ou composition des équipes, règles essentielles, lancement), sans tableau dense de valeurs juxtaposées ; toutes les options affichées doivent correspondre à celles réellement envoyées au moteur.
- **Jeu X01, MULTI et ÉQUIPES** : en partie rapide, ne jamais afficher plusieurs cartes de scores imbriquées **dans** le bloc du score actif. Utiliser les blocs de joueur/équipe actif du mode Arcade (`HeaderBlock` / `TeamHeaderBlock`) et conserver les scores des autres participants dans la liste JOUEURS/ÉQUIPES (portrait comme paysage). Le mode SCORE VOLÉE reste une méthode de saisie, pas une raison de dupliquer les scores.
- **Prévention des régressions** : les données temporaires, le score de départ, la sauvegarde et la logique BO/FT de la partie rapide ne sont pas refactorisés lors d'un patch uniquement visuel.

## 9. Étoiles de difficulté — orientation obligatoire (Arcade / Partie rapide / tous modes)

- **Ordre visuel unique :** afficher toutes les étoiles **pleines à gauche**, puis l'éventuelle **demi-étoile à droite** en dernière position. Exemple 2,5 : ★ ★ ◀demi-étoile ; ne jamais placer une demi-étoile au début.
- **Effet miroir de la demi-étoile :** colorer exclusivement sa **moitié gauche**, au contact des étoiles pleines ; sa moitié droite reste transparente (sans gris de remplissage). Conserver la couleur du niveau MSS sans ajouter d'autre teinte.
- **Source normative :** `src/components/GameDifficultyStars.tsx`. Réutiliser ce composant sous les tickers des configurations Arcade, Partie rapide, menus de modes et des autres vues. Le sélecteur de niveaux `GameDifficultyFilter.tsx` utilise déjà le même ordre et la même orientation ; préserver son alignement.
- **Non-régression :** aucun changement de note de difficulté, de gameplay, d'évaluation des modes ou de règles de sélection ; uniquement rendu et placement de la demi-étoile.

## 10. CLASSIQUE — gabarit de configuration et avatars temporaires (V7(63) → patch V64)

**Référence obligatoire : KILLER et X01 ; moteur métier propre à chaque discipline.** La migration progressive ne doit jamais écraser ni neutraliser les modes spéciaux, valeurs sauvegardées, avatars et statistiques de la partie existante.

- Le composant `src/components/config/MssClassicConfigFlow.tsx` fournit la barre **Guidée / Complète**, la progression numérotée, l'accès aux explications d'Awena et le récapitulatif sous la même forme pour les modes CLASSIQUE dont la configuration est encore ancienne. Il réemploie `MssGuidedConfigNav`, sans dupliquer le moteur du jeu.
- Le parcours guidé cible : Awena → participants/format → sélection joueurs/équipes → règles particulières → audio/saisie si le jeu le supporte → récapitulatif. Des étapes peuvent être regroupées sur les petits modes, sans perdre l'accès aux réglages via **Complète**. **Lancer la partie** n'apparaît qu'à l'ultime étape guidée et reste soumis à la validation métier existante.
- Dans les parcours CLASSIQUE remaniés, le contenu des étapes inutilisées est masqué ; la configuration complète expose les mêmes contrôles qu'auparavant, et passer de l'une à l'autre ne réinitialise pas les joueurs ni les paramètres.
- Conserver le thème actif, les tickers, les composants `BottomNav`/MSS et les couleurs normatives des touches et impacts. Ne pas remplacer les icônes par des emoji. Les listes secondaires doivent devenir des sélecteurs ou modales quand leur taille le justifie ; conserver la pagination de 9 éléments lorsqu'elle existe.
- **Partie rapide :** supprimer de la carte d'introduction toute description secondaire redondante ; n'afficher que **CONFIGURATION [MODE]** et **PARTIE RAPIDE**. Les participants temporaires ont une image d'avatar `quickPartyAvatar(index, sessionId)` issue du même catalogue que le sélecteur MSS (`src/lib/prebuiltAvatarCatalog.ts` et `MssIntegratedAvatarPicker.tsx`), sans nouvelle copie d’images ; ils restent temporaires (`profileId: null`, `isTemporary: true`), sans création de profil ni modification des statistiques du compte. En équipes, les logos de l'équipe ne remplacent pas les avatars individuels de ses membres.
- Les vrais avatars des profils enregistrés, des bots et des équipes sont toujours prioritaires dans les configurations Arcade : la galerie rapide de portraits n'est **pas** une nouvelle source pour les profils persistants.
- Les générations de configurateurs déjà guidés (notamment GROS 6 / CAPITAL) conservent leurs garde-fous spécifiques ; les harmoniser incrémentalement, écran par écran, au lieu de réécrire leurs états internes ou de modifier leurs règles.
- **Tests de non-régression :** 2 joueurs temporaires KILLER, 2×2 KILLER avec logos d'équipes et portraits des 4 tireurs, X01 rapide multi, arrivée au récapitulatif, blocage du lancement lorsque la composition est insuffisante, retour en arrière sans perte de sélection, mode complet, tirage stable et sans doublons pour les participants d’une même session, renouvelé à la partie suivante.

**État du patch V64 :** gabarit commun introduit pour Cricket, Shanghai, Battle Royale, Warfare, Les 5 vies et Golf. X01/KILLER restent les références déjà en place. GROS 6 et CAPITAL disposent déjà de configurations guidées autonomes qui ne doivent pas être écrasées sans recette spécifique. L'harmonisation parfaite de toutes les variantes et des écrans avancés reste une migration distincte, à valider par mode.


## 11. CLASSIQUE — PARTIE RAPIDE — gabarit V66

- Composants normatifs : `src/components/config/MssQuickClassicControls.tsx`
  (`MssQuickPanel`, `MssQuickPlayers`, `MssQuickChoices`, `MssQuickRecap`, `MssQuickStart`).
  Toute future migration d'une configuration rapide CLASSIQUE doit réutiliser ces blocs et `DartsQuickHeader` / `DartsQuickIntro`, plutôt que recréer ses propres couleurs ou pictogrammes.
- Sélection : SOLO uniquement si le mode l'autorise ; DUEL et MULTI via pictogrammes du catalogue de `MssParticipantModeIcon`. Le nombre de participants respecte les contraintes métier de chaque jeu ; les écrans SCRAM gardent deux camps équilibrés.
- Le thème actif `ThemeContext` détermine couleurs, contours, fonds actifs ; pas de cyan ou vert codé en dur dans une page. Pas de descriptions superflues dans l'entête Partie rapide.
- Prévisualisation de la même photo que celle transmise au moteur du jeu : `quickPartyAvatar(index, sessionId)` ; identifiant de session stable pour toute la configuration et renouvelé à l'ouverture d'une nouvelle partie. Les joueurs restent temporaires ; aucun profil enregistré ou statistique personnelle n'est modifié.
- Inventaire de la V7(64) fournie : seuls `avatar-common-001` à `avatar-common-012.webp` sont présents dans l'archive. Le tirage rapide est donc limité aux **12 images réellement disponibles**, avec non-duplication jusqu'à 12 joueurs ; au-delà de 12, la réutilisation d'une image est inévitable tant que le pack galerie complet n'est pas fourni. **Ne pas masquer ni changer le catalogue des profils Arcade.**
- Chaque écran affiche ses règles spécifiques, un récapitulatif concis, puis un bouton « LANCER LA PARTIE ». Les paramètres passés au moteur doivent rester identiques à ceux du mode avant migration.
- Première vague V66 : parties rapides BOB'S 27, KNOCKOUT, SCRAM, BATTLE ROYALE, COUNT UP / HAPPY MILLE / 170 / ENCULETTE, GROS 6 / WARFARE / PRISONER / GOLF. Les autres modes devront migrer par lots vérifiés.

## 2.4. Extension progressive des menus (lot V75, sur base V7(74))

- **Configuration complète / Arcade** : le parcours `MssClassicConfigFlow` et la synthèse `MssClassicRecap` sont désormais utilisés dans `KnockoutConfig` et `SimpleRoundsConfig` (registre COUNT-UP, SUPER BULL, HAPPY MILLE, ENCULETTE, 170). Leurs payloads et contraintes propres ne sont pas remplacés par un modèle générique de jeu.
- **Partie rapide** : `QuickPartyModeConfig` utilise les panneaux, choix et récapitulatifs de `MssQuickClassicControls` pour CRICKET, KILLER, 5 VIES/CHASE, SHANGHAI, HALVE-IT/SPLIT SCORE, SHOOTER, BOWLING, BASEBALL et PRÉSIDENT. Ses règles spécifiques et les routes d'origine restent pilotées par chaque branche `modeId`.
- **Avatars partie rapide** : un identifiant de session unique alimente à la fois l'aperçu des portraits du sélecteur existant et les avatars transmis au moteur (`quickPartyAvatar`). Ne pas remplacer par des portraits artificiels ni générer un nouvel identifiant au moment du lancement.
- **Équipes rapides** : conserver le regroupement 2×2, les logos Team Gold/Team Pink et les membres individuels lorsque le moteur les supporte ; ne pas transformer 2 équipes en 4 adversaires indépendants.
- **Étapes guidées** : Awena → Participants → Bots IA → Règles → Récapitulatif pour les modes Arcade simples ci-dessus ; vue complète accessible à tout moment ; bouton de lancement seulement au récapitulatif en guidée. Les modes complexes conservent leurs étapes supplémentaires propres.
- **Couleurs** : tous les nouveaux panneaux et choix reprennent `ThemeContext` ; les couleurs des touches d'impact continuent de dépendre exclusivement de `mssVisualCharter.ts`.
- **Contrôle local** : `node tools/test-mss-config-wave-v75.mjs` analyse les TSX et vérifie les contrats visibles. Il ne valide ni rendu navigateur ni fonctionnement Android, qui demandent des essais interactifs réels.

**Restant à migrer :** audit mode par mode des autres configurateurs Arcade, de leurs panneaux de sélection humains/bots/équipes, des aides, de la saisie et des récapitulatifs, avec vérification des règles métiers et de toutes les langues. Éviter toute migration globale en une opération non testée.


### Parcours Partie rapide compact (GOLF V92 — référence d'ergonomie)

- En Partie rapide, lorsqu'un mode comporte de nombreux réglages, privilégier un parcours guidé à étapes courtes plutôt qu'une page unique à défilement long.
- Référence : **Participants → Parcours / règles propres au jeu → Options (saisie, audio, départ) → Récapitulatif / lancement**. Adapter les intitulés aux règles réelles du mode.
- Afficher **une seule étape active** à la fois, des boutons **Précédent / Suivant**, un indicateur de progression et conserver les choix lors du changement d'étape. Ne pas afficher un second bloc Guidée/Complète en Partie rapide.
- Respecter la charte AWENA : en PR **un seul visuel Awena tout en bas**, sur l'étape finale, avec texte en rotation toutes les **5 secondes** et image immobile. En configuration Arcade, un conseil fixe par étape active.
- Lancer uniquement depuis le récapitulatif ; garder les réglages et les contrats de démarrage existants du jeu.
- Checklist UI : une seule section active, pas de duplication d'Awena ou des boutons de lancement, navigation fonctionnelle et aucun changement des autres modes via un composant partagé.


## STANDARD MSS — CONFIGURATION ET SÉLECTEURS (obligatoire)

- **Partie rapide** : parcours compact découpé en étapes, un seul panneau de réglages à la fois. Une seule image AWENA ASTUCE en bas de la **dernière** étape, visuel fixe, texte des conseils propres au mode défilant toutes les 5 secondes en boucle.
- **Configuration Arcade guidée** : étape 1 = présentation Awena, **sans** image AWENA ASTUCE ; chaque étape suivante affiche **une seule** bulle Awena en bas, avec un conseil précis **fixe** qui ne change qu'au passage d'étape.
- **Participants** : réutiliser le sélecteur visuel de référence KILLER (joueurs, équipes, profils, bots, création) plutôt que d'inventer une nouvelle disposition. Les galeries s'ouvrent dans des fenêtres modales centrées largeur/hauteur, contraintes à la taille de l'écran et sans pousser le contenu de la configuration.
- **Bots IA** : quatre par page, pagination interne ; pas de défilement de page sous la modale. Les profils joueurs restent scrollables à l'intérieur de leur fenêtre.
- **Couleurs** : suivre la couleur `primary` du ThemeContext pour les commandes des configs, sauf exceptions explicitement documentées (notamment couleurs conventionnelles keypad).
- **Affichage compact** : les choix courts comme les six cœurs de vies doivent tenir sur une seule rangée, même sur petit écran.
- **Contrôle avant patch** : vérifier étapes, conseils, absence de doublons, modales mobiles, couleurs, imports, syntaxe TSX, compilation et lancement.


### Standard obligatoire de sélection (référence KILLER)

Dans chaque configuration **ARCADE** proposant joueurs et équipes, le parcours guidé est strictement séquencé :

1. **Type de participants** : deux grandes cartes **JOUEURS** / **ÉQUIPES** uniquement. Aucun sélecteur de profils, aucun bot, aucune création, aucun choix de format dans cette étape.
2. **Format conditionnel** : si JOUEURS, **DUEL** / **MULTI** ; si ÉQUIPES, **Nombre d’équipes** et **Joueurs/bots par équipe**, identiques dans leur organisation au KILLER.
3. **Choix des participants** : seulement après le format, afficher les commandes **Profils / Bots / Créer**, et si besoin les affectations des équipes. Les listes s’ouvrent en modales centrées sans déplacer la page ; hauteur bornée et contenu paginé (4 bots par page).

Toujours utiliser la **couleur thème du mode**, conserver les sélections entre étapes et séparer la sélection visuelle du moteur de jeu. Une configuration n’est pas conforme si la première étape mélange JOUEURS/ÉQUIPES avec des profils, bots ou options supplémentaires.

## MSS — Sélecteur universel de participants (SOURCE UNIQUE KILLER)

Les étapes de configuration **Type de participants → Format → Sélection** sont obligatoires et identiques pour tous les modes compatibles. **Ne jamais créer une variante graphique locale.** Les composants de référence sont `src/components/config/MssKillerParticipantProtocol.tsx` (type, format, barre d'actions et cartes) et les sélecteurs modaux existants.

1. Type : deux boutons **JOUEURS / ÉQUIPES**, aucun bot, profil ou autre réglage ici.
2. Format : si JOUEURS, **DUEL / MULTI** ; si ÉQUIPES, **nombre d'équipes et membres/équipe**. Contraintes maximales imposées par le jeu, pas par le visuel.
3. Sélection : profils ou équipes enregistrées, bots CPU, création ; barre d'action **Composition manuelle / Équipes enregistrées / Brassage auto / Équipes bots / +** ; cartes d'équipes avec logo, membres, modification et suppression. Les sélecteurs sont des modales centrées, paginées, sans décaler l'écran.

Toute évolution du rendu s'effectue dans le composant commun, et doit être testée à la fois dans KILLER et GOLF avant extension aux autres jeux. Le contrat moteur demeure spécifique au jeu.

## Règle obligatoire — Couleurs des configurations et panneau audio MSS (V100)

- Pour tous les écrans de configuration ARCADE et PARTIE RAPIDE, la couleur des titres, pictogrammes, sélections, bordures actives, navigation et accents de panneaux est toujours celle du `ThemeContext` actif (`const { theme } = useTheme(); const primary = theme.primary`). Ne pas définir d'accent local par mode et ne pas confondre le contexte avec l'objet `theme`.
- Les seules exceptions sont les couleurs sémantiques obligatoires déjà normalisées (impacts/keypad, identités des équipes, voyants activé/désactivé). Les voyants booléens conservent le rendu de KILLER, sans recoloration arbitraire.
- Les paramètres audio utilisent le composant commun `MssGuidedAudioPanel` de KILLER : sons Arcade, bruitages, annonces vocales et sélection de voix. Chaque jeu doit transmettre ces choix au moteur ; une option incapable d'agir effectivement doit être signalée ou désactivée, pas simplement décorative.
- Contrôle obligatoire : tester plusieurs thèmes distincts, les boutons ON/OFF, la persistance des réglages et les sons/annonces au lancement d'une partie.


### Configuration ARCADE — étapes compactes, thème et saisie (GOLF V101)
- Lorsqu’une étape cumule départ, saisie et audio, la séparer en étapes indépendantes : **DÉPART**, **SAISIE / GRILLE**, **AUDIO**, puis **RÉCAPITULATIF**. Conserver les états et le contrat de lancement.
- Les réglages Parcours et Scoring doivent utiliser la couleur `ThemeContext.theme.primary` pour titres, options, contours et choix actifs. Ne jamais reprendre de couleurs statiques d’un ancien formulaire.
- Le sélecteur de saisie reprend les cinq icônes KILLER dans une grille responsive de cinq colonnes `minmax(0,1fr)`, sans largeur fixe susceptible de déborder ; conserver l’indisponibilité visible des modes non câblés.
- Les voyants booléens suivent **sans modification** leur convention activé/désactivé KILLER.
- Astuce Awena : absente en introduction Arcade, fixe et spécifique au réglage dans chaque autre étape, en bas de l’étape ; jamais de rotation automatique.


## Référence de normalisation : LES 5 VIES / CHASE (lot V102)

- Configuration ARCADE : toujours une seule navigation native Guidée / Complète (aucune deuxième barre injectée par App).
- Le rituel KILLER doit être repris à l'identique pour les trois phases : (1) JOUEURS ou ÉQUIPES uniquement ; (2) DUEL/MULTI ou FORMAT DES ÉQUIPES ; (3) CHOIX JOUEURS / CHOIX ÉQUIPES avec les sélecteurs et fenêtres communs.
- Séparer ensuite les réglages spécifiques à chaque jeu en écrans courts (5 VIES : variante, vies, ordre de départ, saisie, audio, récapitulatif).
- MODE DE SAISIE : mêmes cinq pictogrammes KILLER sur une seule ligne responsive, seules les méthodes prises en charge sont actives.
- PARTIE RAPIDE : progression par étapes, une seule AWENA ASTUCE en bas du récapitulatif ; image fixe, texte tournant toutes les 5 secondes.
- ARCADE : aucune bulle AWENA ASTUCE à l'introduction, une bulle avec conseil **fixe propre à l'étape** en bas de chaque étape suivante.
- Couleur du thème actif partout (titres, bordures, boutons) ; conserver les codes de couleurs sémantiques des toggles, des impacts S/D/T/BULL/MISS et des logos d'équipes.
- Ne jamais annoncer un mode de scoring d'équipes fonctionnel à partir de simples métadonnées : le moteur doit traiter ces équipes explicitement avant validation.
- Livraison : tester les exports/imports réels, la navigation et l'ouverture des modales ; distinguer transpilation TSX, build Vite et tests Android.

## Application du protocole MSS — GROS 6 (V103)

- **Partie rapide** : navigation compacte, un seul panneau actif, Participants → Vies et règles → Zones et bonus → Départ et saisie → Audio → Fiche et lancement. Une seule image `AWENA ASTUCE` sur le dernier écran, texte renouvelé toutes les 5 secondes ; pas de bulle dans les autres étapes.
- **Configuration Arcade** : introduction Awena sans bulle ASTUCE ; puis choix JOUEURS/ÉQUIPES, FORMAT conditionnel, sélection des participants, variantes/vies, cibles, zones, bonus, départ, saisie, audio et récapitulatif. Une image ASTUCE fixe en bas de chaque étape à partir de l'étape 2 ; conseil spécifique, sans rotation.
- Utiliser les composants partagés `MssKillerParticipantMode`, `MssKillerFormat` et **`MssGolfKillerTeamSelector`** (même orchestrateur de sélection des équipes que KILLER/GOLF). Ne pas refaire de fenêtre ou formulaire propre au jeu pour ces fonctions.
- Vies de départ : cœurs MSS **sans médaille « + »**. Choix de saisie : cinq pictogrammes de KILLER, mais ne permettre que les méthodes réellement utilisables par le moteur GROS 6. Boutons booléens : voyant sémantique KILLER conservé ; autres accents : `theme.primary`.
- Panneau audio commun `MssGuidedAudioPanel` ; ses trois booléens doivent être transmis à la partie et effectivement respectés. Ne pas présenter une méthode de saisie non opérationnelle comme sélectionnable.
- **Contrôle avant livraison** : comparer étapes et sélecteurs à KILLER ; vérifier équipe enregistrée/bot, création, composition, absence de doublons, lancement individuel/équipes, paramètres transmis à `Gros6Play`, rotation PR et statisme Arcade, absence de débordement mobile.
