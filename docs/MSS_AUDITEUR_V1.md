# MSS-Auditeur V1 — deuxième robot du centre de contrôle

MSS-TesteurQA collecte et classe les échecs GitHub Actions. **MSS-Auditeur** vérifie ensuite, indépendamment, la provenance et la cohérence du rapport avant toute mission de correction. Ce premier auditeur est déterministe et sans consommation de crédits API OpenAI.

## Conditions d'activation

Le propriétaire de GitHub doit ajouter lui-même l'étiquette `mss:audit-approved` à une Issue QA existante portant déjà `mss:mission`, `mss:approved` et `mss:review`. Les Issues bloquées (`mss:blocked`) ou déjà clôturées sont refusées. Aucun audit n'est lancé sans cette autorisation.

## Vérifications réelles

1. Contrôle que le commentaire QA provient de `github-actions[bot]`, appartient à la bonne Issue et au bon dépôt, et comporte le marqueur authentique du pilote.
2. Lit les métadonnées du run GitHub Actions cité dans ce rapport, qui doit être terminé avec succès, sur `main`, déclenché par le propriétaire et comporter un job `qa_pilot` réussi.
3. Revérifie jusqu'à trois exécutions CI référencées dans le rapport et compare leur conclusion, branche et préfixe SHA aux métadonnées GitHub.
4. Publie un commentaire `VERIFIED` si et seulement si les métadonnées concordent, et appose `mss:audited`. Sinon, publie `BLOCKED` ; ne déclare jamais une réussite par défaut.
5. Laisse explicitement la correction et la validation finale à une revue humaine.

## Périmètre et limites

- Pas de lecture de logs bruts, pas d'API OpenAI, pas de modification des sources, pas de déploiement, pas de merge.
- Permissions minimales du workflow : `contents: read`, `actions: read`, `issues: write`, uniquement pour le rapport et l'étiquette de revue.
- La validation est celle de **l'intégrité des métadonnées**. Elle ne démontre pas une cause racine et ne certifie pas l'application.
- Le robot ne peut pas être activé depuis `main` avant fusion de sa Pull Request après revue. La mission QA #39 est un candidat au premier test d'intégration.
- L'IA générative de l'auditeur et le futur Débogueur restent des étapes ultérieures, indépendantes de la clé et du budget actuellement configurés pour TesteurQA.
