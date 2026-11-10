# MULTISPORTS SCORING AI TEAM — démarrage sécurisé

## Situation
Cette PR apporte des **profils d'agents** et des fondations d'orchestration, pas encore une entreprise autonome active 24 h/24. Les profils deviennent disponibles dans les environnements compatibles une fois cette PR fusionnée. Pour l'exécution en tâche de fond, il faut autoriser/configurer un moteur d'agent (p. ex. GitHub Copilot coding agent ou Codex connecté), la gestion des coûts et des déclencheurs.

## Chaîne de traitement
1. Le propriétaire décrit une mission avec le modèle GitHub "Mission pour un agent IA" (spécialiste, objectif, limites, tests, risque).
2. Le directeur IA découpe les missions trop grandes et identifie les dépendances ; plusieurs missions indépendantes peuvent être lancées en parallèle.
3. L'agent spécialisé travaille sur une branche depuis le dernier `main`. Il n'écrit jamais sur `main`.
4. L'agent lance les tests pertinents, crée une PR et fournit un compte rendu compréhensible.
5. Le testeur QA et l'auditeur vérifient les cas sensibles, les régressions, les traces et la sécurité.
6. Le propriétaire approuve le résultat avant intégration. L'intégrateur vérifie l'alignement et publie uniquement sur ordre explicite.
7. Après fusion, PC et StackBlitz sont synchronisés depuis GitHub (pull), jamais par écrasement complet avec un ZIP ancien.

## Appel des agents
Sur GitHub, ouvrir l'onglet Agents ou choisir Copilot comme responsable d'une issue ; sélectionner le profil d'agent correspondant (selon l'abonnement et la disponibilité). Dans VS Code, sélectionner un agent personnalisé de l'espace de travail. Les fichiers sont dans `.github/agents/*.agent.md`.

## Attention : dépôt actuellement public
Le dépôt GitHub est **public**. Les automations **natives de Copilot cloud agent** déclenchées selon un calendrier ou un événement sont, selon la documentation GitHub actuelle, réservées aux dépôts privés et internes. Ne pas prétendre qu'elles sont opérationnelles ici. Les sessions de coding agent et profils spécialisés peuvent fonctionner sur des dépôts publics avec un abonnement Copilot payant et l'agent activé. Pour une file d'attente réellement autonome sur ce dépôt public, évaluer des GitHub Agentic Workflows via GitHub Actions (`gh aw`) ou un orchestrateur externe, avec identifiants sécurisés, quotas et validation humaine. Ne pas activer un coût récurrent sans accord.

## Exécution continue — à activer après revue
- GitHub reste l'unique référentiel de code.
- Un ordonnanceur GitHub Actions ou un moteur d'agents externe surveille la file des issues approuvées et lance des agents selon les capacités, quotas et règles d'accès.
- Une tâche bloquée ne doit pas être relancée indéfiniment ; limiter les tentatives et les coûts.
- Priorité aux travaux utiles : données/historique, stabilité mobile, modes de jeu, acquisition et monétisation.
- Il faut activer le moteur et les identifiants par paramètres sécurisés du dépôt ; **ne jamais committer de clés API**.
- Les workflows d'agent effectuant de l'édition ou des actions externes doivent avoir des autorisations minimales. Les workflows classiques restent en lecture seule.
- Une surveillance 24 h/24 signifie des tâches déclenchées et mises en file d'attente, pas un agent consommant en permanence des ressources sans mission.

## Risques et validations obligatoires
- Toujours approbation pour données, sauvegardes, auth, SQL, secrets, facturation, publicités, production, publications externes ou contenu marketing diffusé.
- Protection de branche et revue humaine à activer dans GitHub Settings > Branches/Rulesets.
- Des tests verts ne suffisent pas à autoriser la fusion.
- Si le repo distant n'est pas à jour par rapport à StackBlitz ou au PC, effectuer une synchronisation préalable, jamais un rebase aveugle.

## Commandes existantes dans package.json
`npm run typecheck`, `npm run build`, `npm run test:ci`, `npm run test:history-integrity`, `npm run test:storage`, `npm run test:admob-native`, `npm run test:android-bootstrap`, `npm run tv:samsung:check`.

## Indicateurs à suivre
Missions ouvertes / en cours / bloquées / livrées, âge des PR, taux de tests passés, régressions, incidents de données, coûts IA, nombre de mises à jour approuvées, téléchargements et conversion — ne pas inventer ces chiffres.
