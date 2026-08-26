# AUDIT KILLER + BOTS IA — 26/08/2026

Référence auditée : `Darts-Counter-V7(72).zip`

## Périmètre volontairement limité

Corrections ciblées sur `KillerConfig.tsx` et `KillerPlay.tsx`, sans refonte du moteur Killer ni modification des autres modes de jeu.

## Anomalies confirmées et corrigées

1. **Bots inclus dans la phase “1er lancer = choix du numéro”**
   - Avant : les humains et les bots entraient tous en phase `SELECT`.
   - Risque : le bot apparaissait dans la séquence d’assignation et pouvait bloquer/retarder son lancement.
   - Correction : seuls les humains passent par l’écran de lancer. Chaque bot reçoit immédiatement un numéro libre unique de 1 à 20.

2. **Course d’état React pendant l’assignation**
   - Avant : l’UI pouvait déjà afficher l’humain suivant alors que `turnIndex` pointait encore brièvement vers un bot sauté dans la liste.
   - Risque : une saisie rapide pouvait être appliquée au mauvais participant et laisser l’assignation incohérente.
   - Correction : un `effectiveAssignIndex` commun à l’UI et au handler de lancer devient la source de vérité pendant l’assignation.

3. **Mode “Numéros aléatoires” traité comme une phase d’assignation**
   - Avant : `assignDone` pouvait rester faux alors qu’aucune saisie n’était nécessaire.
   - Correction : seule l’option `throw` crée une phase d’assignation en jeu ; `random` démarre directement en `ARMING`.

4. **Numéros aléatoires remélangeaient aussi l’ordre des joueurs dans KillerPlay**
   - Avant : l’ordre pouvait être aléatoire même si l’option “ordre aléatoire” n’était pas activée, et pouvait être mélangé une deuxième fois.
   - Correction : KillerPlay ne mélange plus que les numéros. L’ordre décidé dans KillerConfig est conservé.

5. **Reprise de partie interrompue pendant l’assignation**
   - Avant : en particulier en Killer Progressif, un humain sauvegardé en `SELECT`/numéro 0 pouvait être réhydraté en `ARMING`/numéro 0.
   - Risque : reprise bloquée sans joueur assignable.
   - Correction : conservation explicite de `SELECT` tant qu’un humain n’a pas un numéro valide ; anciennes sauvegardes avec bot `SELECT`/0 sont réparées automatiquement.

6. **Partie 100 % bots en mode throw**
   - Avant : le mécanisme d’assignation pouvait rester dans un état ambigu.
   - Correction : aucun écran d’assignation n’est attendu ; les bots sont numérotés automatiquement et la partie démarre normalement.

7. **Bots et boucliers : règles différentes des humains**
   - Avant : une attaque directe d’un bot Killer pouvait traverser un bouclier normal ou la protection blanche de résurrection.
   - Correction : parité avec les humains : simple bloqué, double casse le bouclier, triple l’affaiblit/casse selon sa force, protection de résurrection bloquante.

8. **DBULL désarmement absent du moteur bot**
   - Avant : l’option était calculée mais le bot ne déclenchait pas le désarmement.
   - Correction : DBULL désarmement appliqué aux bots comme aux humains, avec statistiques et événements associés.

9. **BULL/DBULL dégâts de zone : protection de résurrection ignorée par les bots**
   - Avant : les bots ne respectaient que le bouclier bleu.
   - Correction : la protection blanche est désormais respectée, avec nettoyage correct des états de bouclier à l’élimination.

10. **Statistiques bots incomplètes**
    - Avant : `throwsToBecomeKiller` et `killerThrows` n’étaient pas incrémentés comme pour un humain.
    - Correction : mêmes compteurs pour humains et bots.

11. **Nettoyage incomplet lors d’une élimination par bot / auto-kill**
    - Avant : certains flags de bouclier/résurrection pouvaient survivre à l’élimination.
    - Correction : remise à zéro cohérente des états de protection lors de la mort.

12. **Sécurité > 20 participants**
    - Killer ne dispose que des numéros 1 à 20.
    - Avant : au-delà de 20 participants, l’unicité ne pouvait plus être garantie.
    - Correction : limite explicite à 20 participants dans KillerConfig.

## Comportements volontairement conservés

- Règles de dégâts humaines existantes.
- Résurrection et ses modes.
- Auto-kill, auto-hit, auto-pénalité, vol de vies.
- Rotation BULL / DBULL.
- Sons, voix, affichage de partie, historique et persistance hors correctifs de reprise ci-dessus.
- Niveaux/difficultés des 14 bots Killer officiels.
- Ordre aléatoire uniquement lorsque l’option dédiée `randomStartOrder` le demande.

## Validation

Tests passés :
- `tools/test-killer-official-bots-v1.mjs`
- `tools/test-killer-bot-flow-regression.mjs` (nouveau)
- `tools/test-awena-v931-killer-config.mjs` — 17 contrôles
- Analyse syntaxique TypeScript/TSX de `KillerPlay.tsx` et `KillerConfig.tsx`

Le test existant `tools/test-stats-killer-dashboard-regression.mjs` échoue déjà sur le `StatsHub.tsx` du ZIP de référence. `StatsHub.tsx` est strictement identique à l’original et n’a pas été modifié dans ce patch ; cette anomalie préexistante est donc laissée hors de ce correctif pour éviter d’élargir le périmètre.

Le build Vite complet n’a pas pu être rejoué dans le sandbox car l’archive ne contient pas `node_modules` et le cache npm local ne contient pas toutes les dépendances (`zustand` manquant en mode offline). Ce point n’empêche pas les contrôles syntaxiques et tests ciblés ci-dessus.
