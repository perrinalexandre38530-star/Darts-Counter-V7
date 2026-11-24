# MULTISPORTS SCORING — Référence obligatoire : configurations premium

Version 1 — basée sur le parcours KILLER V7(43), référence de migration des autres modes (X01, CRICKET, FIVE LIVES, etc.). Les écrans non migrés ne sont **pas** présumés conformes.

## Invariants visuels

- Ticker image existant en en-tête, BackDot à gauche, Awena à droite ; ne jamais inventer d'autres habillages.
- Même bloc de navigation **Guidée / Complète** sur toutes les configurations : aucun écran ne doit le masquer à cause de la restauration de « Dernière partie ».
- Parcours guidé : une étape = une décision. Intro Awena en premier, accès vidéo dans un bloc flottant, CTA **LANCER** uniquement sur la dernière étape, après validation des contraintes. Une ligne de repères numériques compacts indique les étapes précédentes, active et suivantes ; le bouton actif reprend l’accent du thème, et les autres restent neutres. Aucun gigantesque sommaire permanent.
- En mode complet : les mêmes sections et réglages que dans le guide, dans le même ordre, sans doublons.
- Titres courts en haut à gauche ; décisions par icônes dans le style bottomnav ; intitulé et courte explication uniquement sous le choix actif. Les longues règles vont dans l'infomini, pas en ligne.
- Participants : format JOUEURS / ÉQUIPES en amont, puis choix et composition dans un sélecteur modal commun (9 avatars/page) ; modes humain/bot et plafonds spécifiques au jeu, sans listes géantes en page.
- Options booléennes : une ligne compacte alignée à gauche, infomini au titre et interrupteur discret à droite. Les sous-options n'apparaissent **que si** leur parent est actif.
- Récapitulatif final : une **fiche de partie** concise, compositions en lignes (logo/avatar, noms), règles en paires label/valeur sans six cartes empilées, variantes actives, méthode de saisie et fonctions BULL. Éviter les répétitions, encarts décoratifs en cascade ou le même libellé affiché deux fois.
- Boutons keypad et impacts : **une seule palette** dans `src/lib/mssVisualCharter.ts` et `src/styles/mss-scoring-palette.css` ; jamais de couleur recréée par mode.
- Écran mobile/paysage : colonnes minmax(0, 1fr), icônes à taille fixe, aucun débordement, fenêtre flottante scrollable localement, pas de second bloc joueur redondant dans le gameplay.

## Composants et source de vérité

- `src/components/config/MssPremiumConfig.tsx` : légendes, lignes faits-clés, icônes de méthode de saisie.
- `src/components/DartsConfigGuideBoundary.tsx` : parcours guidé / complet déjà existant avec repères d’étapes numérotés. Les sections doivent déclarer un unique `data-mss-guide-section` stable. N’ajouter `data-mss-guide-order` qu’avec une numérotation cohérente pour TOUTES les étapes ; sinon laisser l’ordre DOM sans attribut pour les sections qui suivent les premières étapes.
- `src/components/MssSelectorIconButton.tsx` : boutons de choix d'étape thémés.
- `src/components/PlayerPagedSelector.tsx`, `src/components/BotPagedSelector.tsx`, `src/pages/X01ConfigV3.tsx` (TeamsSection) : sélecteurs natifs.
- `src/components/ScoreInputHub.tsx` : KEY­PAD, CIBLE, VOIX. `CameraAssistedOverlay.tsx` : caméra assistée. Les appareils AutoDarts requièrent un bridge WebSocket explicitement paramétré ; jamais de score inventé ni d'activation silencieuse.
- Les limites joueurs / équipes / membres sont définies par le **moteur du mode**, pas par un plafond universel codé en dur.

## Critères d'acceptation avant migration d'un autre mode

1. Comparer écran guidé, complet, PC, Android, portrait et paysage.
2. Vérifier les données de partie mémorisées, le changement participants/équipes et l'impossibilité de démarrer avant configuration valide.
3. Vérifier chaque modal : ouverture, retour, pagination, sélection, suppression et conservation de l'étape.
4. Vérifier l'équivalence entre récapitulatif affiché et configuration réellement transmise au moteur.
5. Vérifier que le lancement n'ajoute pas de hooks conditionnels et n'introduit pas de régressions des bots ni du gameplay.
6. **Ne pas marquer un mode « migré »** sans cette vérification. Cette référence prépare une migration progressive, elle ne réécrit pas automatiquement les centaines de pages existantes.

## Comportement de saisie Killer (première intégration)

- KEYPAD et CIBLE : moteur `ScoreInputHub` historique, même `applyThrow` que le jeu.
- VOCAL : hook existant `useVoiceScoreInput`, une fléchette reconnue à la fois ; la volée est validée par l’utilisateur. Option disponible si Web Speech est présent.
- CAMÉRA : `CameraAssistedOverlay` après calibration, ouverture volontaire via la commande caméra ; keypad toujours accessible comme recours.
- AUTODARTS : connexion WebSocket vers le bridge déjà configuré pour X01 ; seuls les impacts reçus et validés sont injectés. Sans bridge, ne pas présenter la connexion comme opérationnelle.
- Les autres modes ne changent pas de moteur de scoring au titre de cette charte : migrer et vérifier chaque mode séparément.

## Migration X01 — première passe (V7(46))

- `X01ConfigV3.tsx` utilise désormais le bandeau réutilisable `MssGuidedConfigNav` pour les **7 étapes guidées** : numéros, barre de progression, bouton Awena (vidéo), Précédent/Suivant et accès permanent à **Complète**.
- Le mode **Complète** conserve son sélecteur Guidée/Complète historique et la même configuration métier. Le guide ne duplique plus un deuxième bloc de navigation en bas des étapes.
- L'étape « Participants » utilise les cartes iconographiques `MssParticipantTypeChoice` (une silhouette / trois silhouettes), sans sous-texte dans les cartes ; les sélecteurs et leurs données de partie sont inchangés.
- Le récapitulatif de fin de guide X01 utilise les faits-clés compacts `MssConfigFact`.
- Source de présentation transverse créée : `src/components/config/MssGuidedConfigNav.tsx`. Les composants gardent **zéro logique métier** ; toute validation de participants reste dans X01.
- **Non migré dans cette passe** : le détail des sections avancées en vue complète, l'écran de jeu X01, les modales d'équipes et les autres modes. À vérifier visuellement en portrait/paysage et dans StackBlitz/Android avant de déclarer le mode entièrement migré.
