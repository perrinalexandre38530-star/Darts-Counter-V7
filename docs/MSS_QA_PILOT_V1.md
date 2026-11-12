# MSS AI CONTROL — premier robot QA (pilote, V1)

## Ce qui est prêt
Ce pilote s'exécute dans GitHub Actions quand un propriétaire autorise une mission QA par le label **mss:approved** depuis MSS AI CONTROL (bouton « Approuver la préparation »).
Il ne fonctionne **que lorsque le workflow est présent sur la branche par défaut**. Une PR seule ne déclenche aucune mission.

Le runner GitHub Actions n'a pas accès aux secrets Cloudflare, Supabase, NAS, publicité, Android, signature Play Store ou comptes utilisateurs. Le jeton éphémère GITHUB_TOKEN est limité à : fichiers en lecture, runs en lecture et commentaires/labels Issues en écriture.

## Pipeline
1. La plateforme crée l'Issue, sans lancer de robot.
2. Le propriétaire ouvre la mission QA et clique sur « Approuver la préparation ».
3. Le label **mss:approved** déclenche un job GitHub Actions (7 minutes maximum, un job par mission à la fois).
4. Le script vérifie que la mission est ouverte, approuvée, non bloquée et attribuée à QA.
5. Il examine 25 exécutions terminées au maximum sur la branche principale et détaille jusqu'à 3 runs en échec, avec liens vers les jobs.
6. Il publie un unique rapport commenté dans l'Issue, ajoute **mss:review**, et demande une **revue humaine**.
7. MSS AI CONTROL affiche le statut « REVUE HUMAINE » dans les missions.

## Interdictions
- Pas de commande issue du texte utilisateur ou de la description de mission.
- Pas d'accès écriture au code, pas de branche créée par le robot, pas de PR, de merge ou de déploiement.
- Aucun appel IA facturé : la V1 est une **collecte et classification déterministes**, pas un agent LLM.
- Aucune assertion de cause racine sans consulter les logs.
- Aucun lancement pour les missions hors QA ou sans mss:approved, y compris en déclenchement manuel.
- Les Issues du dépôt sont publiques : ne jamais y mettre de secrets.

## Tests et activation
- Code QA : node --test tools/test-mss-qa-pilot.mjs
- Déclenchement automatique après intégration sur main : depuis la mission #26 (pilote historique), cliquer « Approuver la préparation ».
- Un compte administrateur peut aussi démarrer manuellement le workflow avec le numéro d'une mission QA **déjà approuvée**.
- Une mise à jour du dashboard peut ensuite afficher le nombre de rapports de QA et le dernier run.

## Limites connues
- Le script consulte les états des runs/jobs/étapes, **pas leurs journaux complets** : il collecte des indices et des preuves, sans diagnostic exhaustif.
- Une seule note avec le marqueur MSS_QA_PILOT_V1 par Issue : les relances n'empilent pas de commentaires.
- La V1 ne lit pas et ne modifie pas le code métier ; elle n'exécute pas la suite de tests applicatifs.
- Pour des corrections IA autonomes, activer séparément Copilot cloud agent ou un autre moteur explicitement autorisé (abonnement, quotas et revue humaine obligatoires).
- GitHub Models a été retiré en juillet 2026 ; il n'est pas utilisé ici.
- Conserver la politique **no-auto-merge** et les protections de branche.

## Dépendance plateforme
Les routes du dashboard dans la branche de la PR #27 ajoutent déjà mss:approved et reconnaissent mss:review. La PR du moteur QA peut être revue indépendamment ; ne jamais confondre « mission créée » et « tâche exécutée ».

## Qualité des preuves (renforcement du 12/11/2026)
- Le rapport présente désormais un statut **PASS**, **FAIL** ou **BLOQUÉ** uniquement pour l'échantillon consulté.
- PASS : tous les runs pris en compte sont terminés avec une conclusion probante, sans échec. **Ce n'est pas une certification de l'application**.
- FAIL : au moins un run terminé de l'échantillon a échoué ou expiré, sous réserve d'absence d'information incomplète.
- BLOQUÉ : aucun run terminé, des runs en cours, ou des conclusions ignorées/annulées/neutres. Ces situations ne doivent jamais être présentées comme un succès.
- Les données sont toujours limitées aux runs consultables de la branche par défaut ; une mission qui exige l'inspection d'une PR et ses journaux complets nécessite un audit supplémentaire.
- Tests de non-régression ajoutés pour les quatre catégories (aucune donnée, in-progress, skipped, failure/success).

## Diagnostic de journaux (V1.1 — préparation du robot correcteur)
- Jusqu'à trois runs en échec et trois jobs en échec par run peuvent être inspectés, **uniquement en lecture**.
- La lecture d'un journal est plafonnée à 2 Mo et 15 secondes par job. L'absence ou la troncature est signalée ; aucun contenu brut ne doit être transféré dans une Issue publique.
- Les catégories sont déterministes : budget des médias Android, Gradle, TypeScript, tests, dépendances, autorisations et réseau. Chaque catégorie peut suggérer une vérification **fixe** de diagnostic. Ce n'est ni une cause racine démontrée ni un correctif.
- La suite pour le robot correcteur nécessite une mission distincte et une approbation explicite. Aucun accès d'écriture code, aucune branche ou PR générée par ce pilote.
- La sortie réelle d'une mission approuvée reste non validée tant que le workflow n'a pas été activé sur la branche par défaut.
