# Patch Dartsets canoniques

## Objectif
Corriger le dédoublement des dartsets, les `Set inconnu` dans les statistiques et l'accès incohérent aux dartsets privés entre compte actif et profil actif.

## Fichiers modifiés
- `src/lib/dartSetsStore.ts`
- `src/components/StatsDartSetsSection.tsx`
- `src/lib/statsByDartSet.ts`

## Correction principale
- Mise en place d'une identification canonique des dartsets.
- Fusion des doublons au chargement/sauvegarde.
- Conservation des anciens IDs dans des alias (`duplicateIds` / `aliasIds`) pour que les anciennes parties continuent à retrouver le bon set.
- Résolution des anciens IDs dans les stats afin d'éviter les cartes `Set inconnu` quand le set existe encore.
- Déduplication dans le comparateur `MES FLÉCHETTES`.
- Filtrage plus tolérant des dartsets privés entre compte actif / profil local rattaché / profil actif.
- `createDartSet` ne recrée plus automatiquement un set équivalent s'il existe déjà.

## Règle de fusion
Le patch considère qu'un dartset est le même lorsqu'il partage essentiellement :
- le même nom normalisé ;
- le même propriétaire/profil/compte quand disponible ;
- le même scope privé/public quand disponible.

Cela vise volontairement à stopper les doublons type `US x3`, `Brass x3`, `Zen JuJi x3`, etc.

## Assets ajoutés pour build
Le ZIP fourni avait des imports d'assets manquants qui bloquaient `npm run build`. Des placeholders PNG ont été ajoutés uniquement pour permettre au build de passer. Ils peuvent être remplacés plus tard par les vrais visuels définitifs.

## Validation
- `npm run typecheck` : OK
- `npm run build` : OK

Le build affiche encore des warnings préexistants Vite/esbuild, mais aucune erreur bloquante.
