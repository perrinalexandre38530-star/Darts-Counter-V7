# Patch Awéna V8.5 — Omni Knowledge + Local Tools — Base V80

Base stricte : `Darts-Counter-V7 (80).zip`.

## Objectif

Élargir fortement la capacité d’Awéna à répondre aux questions utilisateurs sans remplacer les couches de connaissance déjà en place et sans dépendre d’Internet pour les réponses courantes.

## Nouveautés V8.5

### 320 nouvelles fiches Omni Knowledge

Répartition :

- Application / dépannage / architecture : 56
- Fléchettes : 47
- Ping-Pong / tennis de table : 36
- Football : 36
- Pétanque : 33
- Statistiques : 30
- Baby-foot : 23
- Dés / probabilités : 22
- Compétitions : 20
- Mölkky : 17

Les fiches couvrent notamment : règles de référence, lexique, équipement, technique, stratégie, entraînement, statistiques, probabilités, sécurité, formats de compétition, stockage, sauvegardes, NAS, Android, caméra, Online, profils, médias, dépannage et fonctionnement d’Awéna.

### 6 outils de calcul local

Awéna ne se contente plus de chercher une fiche : elle calcule certaines réponses à partir des valeurs fournies par l’utilisateur.

- calcul de score de volée : `T20 D5 BULL = 95` ;
- soustraction d’une volée depuis un score : `501 - 95 = 406` ;
- calcul AVG1 / AVG3D à partir de points et fléchettes ;
- calcul du win rate ;
- calcul du nombre de manches nécessaires en Best Of ;
- probabilités simples D6 / 2D6.

## Hiérarchie conservée

Le moteur garde la priorité suivante :

1. contexte réel de l’écran ;
2. contrôles visibles ;
3. connaissance générale de l’application ;
4. atlas fonctionnel ;
5. outils déterministes V8.5 ;
6. références expertes V8.4 ;
7. Omni Knowledge V8.5 ;
8. encyclopédies/modes/fallbacks déjà existants.

Cette hiérarchie évite qu’une règle sportive générique écrase une configuration réellement active dans MULTISPORTS SCORING.

## Références générales vérifiées

Les connaissances sportives de référence ont été recoupées avec les organismes/référentiels concernés : WDF pour les fléchettes, FIPJP pour la pétanque, ITTF pour le tennis de table, The IFAB pour le football, Mölkky® / Tactic Games pour Mölkky et ITSF pour le baby-foot de compétition.

Pour toute partie dans l’application, la règle/preset réellement configuré dans MULTISPORTS SCORING reste prioritaire.

## package.json

Le `package.json` est celui de la V80. Toutes les entrées V80 sont conservées à l’identique. Une seule commande est ajoutée :

`test:awena:v85`

Elle exécute le nouveau test V8.5 puis les régressions Awéna V8.4/V8.3.

## Validation

- 320/320 nouvelles fiches détectées ;
- 10/10 domaines couverts ;
- 6 outils locaux détectés et testés ;
- `T20 + D5 + BULL = 95` vérifié ;
- soustraction depuis 501 = 406 vérifiée ;
- AVG3, win rate, BO7 et probabilité 2D6 vérifiés ;
- recherche nine-darter vérifiée ;
- politique NAS manuelle V80 retrouvée ;
- navigation générique non interceptée par Omni ;
- tests V8.5 + V8.4 + V8.3 : OK ;
- TypeScript complet : OK.
