# PRÉSIDENT — Patch V2, distribution et échanges de cartes

Base : `Darts-Counter-V7(101).zip`.

## Modifications

- Moteur : chaque distribution utilise des cartes physiques (rang + enseigne), issues de 3 à 5 paquets complets de 52 cartes.
- Enseignes persistantes dans `suitsByPlayer` : elles ne changent plus selon la quantité de cartes affichées.
- Les rangs et les enseignes restent alignés lors d'un coup, d'une annulation, d'une nouvelle manche et des échanges Président / Trou du cul (2 cartes), Vice-Président / Vice-Trou du cul (1 carte).
- Les cartes réellement posées sont visibles sur le tapis grâce à `currentTableSuits`.
- Main principale et fenêtre de main : affichage conforme à la distribution.
- Écran de manche : visualisation des cartes échangées et de leurs enseignes.

## Périmètre

Ce patch conserve les règles actuelles de validation par fléchettes (S = carte, D = paire, T = brelan). Les échanges demeurent automatiques : les joueurs ne choisissent pas manuellement les cartes à rendre.

## Tests effectués

Transpilation TypeScript des fichiers modifiés, simulation de 60 parties entières de 3 manches avec 3 à 8 joueurs, vérification de l'alignement rang/enseigne après chaque action. Pas de test visuel Android ni de build intégral.

## Installation

Extraire à la racine du projet et remplacer uniquement les fichiers du patch. Ne pas extraire par-dessus une autre version que la base indiquée sans comparer les modifications.
