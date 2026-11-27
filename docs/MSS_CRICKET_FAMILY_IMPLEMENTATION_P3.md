# MSS — Famille CRICKET : lot P3

**Base attendue :** Darts-Counter-V7(4)(1) + patch P1 CRICKET MASTER / Games / Play + patch P2 Famille Cricket / SCRAM.
Cette archive P3 ne contient que ses propres fichiers modifiés ou créés.

## Changements

- **Suppression** de la carte CRICKET SANS POINTS (option du Cricket classique dans les deux configurations).
- **Renommage logique** de l'ancien mode « CRICKET MASTER » à neuf objectifs en **TACTICS** (Cricket britannique). Conservation de sa gestion du DBULL50.
- **MASTER CRICKET** devient la règle de fermeture aux doubles uniquement, avec option « doubles + triples » en Arcade.
- **SCRAM**, **SHOVE A PENNY**, **CUT-THROAT** et **ENCULETTE** restent des jeux apparentés distincts.

## Variantes ajoutées au moteur commun

| Carte | Implémentation P3 |
| --- | --- |
| TACTICS | 15–20, Bull, DOUBLE, TRIPLE ; trois impacts par objectif ; choix DBULL50 |
| MASTER CRICKET | Doubles seuls (ou doubles + triples) ; Bulls conservés |
| LOW-BALL | 1 à 6 + Bull |
| SPANISH | 11 à 20 + Bull |
| RANDOM | 6 numéros aléatoires + Bull, tirés au lancement |
| PICK-IT | 6 numéros choisis en configuration + Bull |
| HIDDEN | 6 numéros aléatoires secrets ; révélation sur impact + Bull |
| QUICKIE | 10 manches maximum |
| MICKEY MOUSE | 15 à 20, DOUBLE, TRIPLE, BULL, BED ; 3 impacts identiques dans un même lit et dans une volée = 1 marque BED |
| WILD MOUSE | Affectation exclusive par fléchette : numéro / double/triple / BED |
| WILD CARD | Un numéro joker tiré par manche ; +1 marque sur une touche valide |
| SUDDEN DEATH | Élimination si l'écart de points atteint 100 (preset MSS) |

## Jeu distinct

**ENGLISH CRICKET** utilise un nouveau moteur à batteur et lanceur : 10 guichets, 1 guichet sur Bull25 / 2 sur Bull50, batteur = surplus des points au-delà de 40 par volée de trois fléchettes ; chacun bat une manche, le plus grand total de runs gagne. Interface Play avec saisie S/D/T/Bulls et annulation.

## Limites de validation (ne pas les masquer)

- Les **nouveaux tickers propres à chaque variante** ne sont pas encore créés ou approuvés ; les nouvelles cartes utilisent provisoirement le ticker CRICKET existant. L'ancien visuel CRICKET MASTER sert temporairement à TACTICS.
- **HAMMER CRICKET** reste à définir : aucune règle de multiplicateurs universelle vérifiée, donc aucune carte déclarée « jouable » sans règles de jeu.
- Les **statistiques et historiques dédiés** aux nouvelles variantes ne sont pas tous raccordés : vérification et normalisation à faire avant version de production.
- Le parcours complet StackBlitz/Android, les classements équipes, l'IA et la compilation Vite complète ne sont **pas** validés par les tests de ce lot.
- ENGLISH CRICKET : version initiale en duel humain, sans équipes ni bot automatisé, sans synchronisation Stats finalisée.
- Les règles locales de MICKEY MOUSE, TACTICS et WILD MOUSE peuvent varier ; cette livraison suit les conventions MSS écrites ici.

## Contrôles requis avant publication

1. Depuis Games : chaque nouvelle carte ouvre le bon mode Arcade et PR (pas de renvoi au Cricket classique).
2. Vérifier LOW-BALL sur S1/D1/T1, SPANISH sur 11–14, RANDOM + PICK-IT + HIDDEN sur leurs cibles.
3. Pour TACTICS : tester le choix BULL50, la fermeture complète et l'annulation.
4. Pour MICKEY MOUSE / WILD MOUSE : tester une volée BED, l'affectation exclusive, puis Undo.
5. Pour WILD CARD : vérifier le changement de joker après chaque manche ; pour SUDDEN DEATH la rotation après élimination.
6. ENGLISH CRICKET : deux manches avec rôles inversés ; BULL25 / BULL50 ; 40 points seuil ; Undo ; fin du match.
7. Compilation Vite, smartphone portrait/paysage, bots, stats/history et sauvegardes avant validation.
