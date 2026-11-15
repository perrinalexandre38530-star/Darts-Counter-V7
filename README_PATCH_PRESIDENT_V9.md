# PRÉSIDENT — V9 (base Darts-Counter-V7(122).zip)

## Installation
Extraire ce ZIP à la racine du projet de référence, en conservant l’arborescence.
Ce correctif remplace uniquement `src/pages/PresidentPlay.tsx`.

## Modifications
- Aperçu des cartes exactes qui seront posées pour simple / paire / brelan, avec enseignes conservées et dans le même ordre de retrait que le moteur.
- Nouveau classement de fin de manche : Président mis en avant, insignes de rôles, avatars et points.
- Rappel des taxes de la manche suivante et détails des échanges déjà effectués.
- Pas d’enseigne inventée pour les actions anciennes dont la couleur n’était pas enregistrée.
- Libellé de l'historique clarifié pour ne pas présenter le dernier poseur comme vainqueur si le pli est encore actif.

## Vérifications
- Transpilation TSX via TypeScript sans diagnostic de syntaxe.
- Vérification de présence et différence avec le fichier de la V122.
- Pas de compilation complète, ni de validation manuelle PC/Android dans cette livraison.

Ce patch n'inclut aucun fichier d'un autre mode et ne modifie pas GitHub.
