# MULTISPORTS SCORING — règles communes des agents IA

Source de vérité du code : dépôt GitHub, branche `main` (lecture seule pour les agents).
Ne jamais synchroniser le projet en recopiant un ZIP sur une branche de référence sans comparaison des différences et approbation.

## Principes obligatoires
1. Travailler uniquement sur une mission identifiée (issue ou instruction écrite), avec périmètre, critères d'acceptation et tests définis.
2. Une mission = une branche isolée issue de `main` à jour = une Pull Request documentée. Ne jamais pousser directement sur `main`, faire de force-push, fusionner ou déployer automatiquement.
3. Avant de modifier : lire les fichiers concernés, repérer les travaux concurrents et vérifier les tests existants. Si branche obsolète ou conflit : arrêter et signaler.
4. Ne jamais écraser un correctif récent, restaurer une ancienne version de composant, ou supprimer des données utilisateur pour faire passer un test.
5. Travailler par petits changements ; indiquer précisément fichiers modifiés, risques, tests exécutés et tests non exécutés. Aucun "corrigé" sans preuve.
6. Toute modification de migrations, Supabase, NAS, sauvegardes, authentification, facturation, publicités, publication Play Store, secrets, données utilisateurs, workflows avec droits d'écriture ou accès externe demande une validation humaine explicite.
7. L'historique V4 est la source de vérité des parties ; les statistiques sont dérivées. Préserver compatibilité des anciens historiques et des sauvegardes ; jamais de migration destructive ni de dédoublonnage non traçable.
8. Parité PC/Android, UX portrait/paysage, 22 langues et fonctionnement hors ligne à vérifier lorsqu'ils sont concernés. Préserver les comportements existants.
9. Ne jamais exécuter de commandes destructives, exposer de secrets, activer des publications ou déclencher des dépenses/communications sans accord humain.
10. Toute PR doit fournir une procédure de retour arrière ; ne jamais considérer les résultats de test comme une autorisation de fusionner.

## Compétences et limites de responsabilité
Chaque agent doit lire `docs/AI_COMPETENCIES.md` et son ou ses `SKILL.md` désignés dans son profil avant toute action. Une compétence non prouvée n'autorise pas l'exécution autonome.
Un domaine transversal doit être découpé en missions séparées. L'agent n'est pas juge de sa propre réussite : QA indépendant pour chaque patch et audit pour les zones critiques.
En cas d'échec de test, de version désalignée, de conflit ou d'incertitude métier, arrêter la mission, documenter la cause et signaler le blocage. Ne jamais assouplir les tests pour obtenir du vert.
La protection réelle repose sur les règles GitHub, permissions minimales, CI et validation humaine ; les instructions ne remplacent jamais ces contrôles techniques.

## Vérification minimale
Selon le périmètre : `npm run typecheck`, `npm run build`, puis tests ciblés existants dans `package.json`. Contrôler manuellement les interfaces et l'Android/Tizen quand le périmètre l'exige. Ne pas prétendre qu'un contrôle a été réalisé sans l'avoir exécuté.

## Format de sortie
Résumé de mission ; fichiers changés ; preuves/tests ; risques ou points ouverts ; instructions de vérification ; statut "PR prête pour revue" ou "bloqué".
