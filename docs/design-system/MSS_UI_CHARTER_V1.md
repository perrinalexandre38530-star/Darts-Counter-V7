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
