# MULTISPORTS SCORING — Académie Awena, révisions adaptatives V168

## Référence exacte de ce patch

Ce patch a été **reconstruit à partir de `Darts-Counter-V7(110)(2).zip`**, sans utiliser d'ancien App.tsx ni remplacer d'autres fonctionnalités de MSS.

Audit de la base : les 10 fichiers de l'Académie V167, comprenant les 40 leçons et leurs 120 questions, y sont déjà présents et identiques à la version V167. Inutile de réappliquer les patches V166/V167/V168 précédents : **appliquer uniquement ce patch-ci** à la racine de `Darts-Counter-V7(110)(2)`.

## Fichiers ajoutés / modifiés (5)

- `src/training/academy/academyRevision.ts` — **nouveau** : suivi des questions par profil, révision espacée, sélection ciblée des questions et métriques.
- `src/training/academy/TrainingAwenaAcademy.tsx` — **modifié** : interface « MES RÉVISIONS », enregistrement des réponses des leçons et Quiz express, recommandations, passerelle vers les exercices.
- `src/training/academy/trainingAwenaAcademy.css` — **modifié** : styles de l'onglet et du tableau de bord de révision, adaptation mobile.
- `tools/test-awena-academy-adaptive-v168.mjs` — **nouveau** : régressions révisions V168.
- `docs/PATCH_AWENA_ACADEMY_ADAPTIVE_V168.md` — **nouveau** : la présente notice.

Aucun autre fichier de la base n'est inclus. Les bibliothèques de leçons V167 et le Centre d'entraînement parent restent inchangés.

## Fonctionnement

1. Chaque validation de réponse dans une leçon et dans les Quiz express met à jour le suivi de cette question pour le profil actif.
2. Awena ne propose dans « MES RÉVISIONS » que des questions **déjà ratées**, non encore maîtrisées et dont la révision est due ; une séance comporte au plus 10 questions.
3. Après une bonne réponse, rappel à **1 jour**, puis **3 jours**, puis **7 jours** ; à **3 bonnes réponses consécutives** une notion est marquée comme maîtrisée, sauf si le joueur la rate de nouveau.
4. Les mauvaises réponses sont immédiatement éligibles à une nouvelle révision. Le mode recommande une leçon pertinente et l'accès à son exercice réel avec le clavier MSS.
5. Dans « MES PROGRÈS », affichage des questions dues et notions consolidées. Les Quiz express restent comptabilisés séparément des révisions.
6. Narration Awena via le moteur vocal MSS existant, sans obligation de service d'IA à distance.

## Stockage et conservation

- Nouvelle clé locale par profil : `mss.training.awena-academy.reviews.v1:<profileId>`.
- La progression des anciennes leçons et les résultats des Quiz express V167 ne sont pas écrasés par le module de révision.
- Aucune modification d'History V4, aucune migration Supabase ni cloud, aucun changement aux autres modes de jeu.
- Les scores historiques agrégés ne permettent pas de retrouver quelles questions ont été ratées : **le suivi individuel des erreurs débute après l'installation**.
- Les rappels ne sont pas des notifications : ils apparaissent à la prochaine ouverture de l'Académie.
- En l'absence de synchronisation cloud de l'Académie, le suivi reste propre à ce profil sur cet appareil.

## Vérifications effectuées sur la base V7(110)(2)

- `node tools/test-awena-academy-expansion-v167.mjs` : **PASS** (40 leçons, 120 questions, quiz, scoring et sauvegardes).
- `node tools/test-awena-academy-adaptive-v168.mjs` : **PASS** (suivi par profil, échéances 1/3/7 jours, maîtrise, rechute, tests TSX).
- `tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM src/training/academy/academyRevision.ts` : **PASS**.

Compilation complète Vite/Android et tests de rendu sur appareils réels : **non réalisés ici** (dépendances complètes du projet indisponibles dans l'environnement de travail).
