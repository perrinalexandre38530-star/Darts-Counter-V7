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
