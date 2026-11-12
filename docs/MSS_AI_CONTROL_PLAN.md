# MSS AI CONTROL — plan du centre de commandement

**Statut : spécification de MVP ; aucune plateforme déployée ni moteur IA connecté.**

## Décision d'architecture
Construire **un tableau de bord privé, distinct de l'application sportive destinée aux joueurs**, relié au dépôt GitHub existant. Éviter de créer un deuxième gestionnaire de versions du code.

- **GitHub** : source unique du code, Issues pour les missions, Pull Requests pour les changements, GitHub Actions pour les contrôles, protections de branches et audits.
- **Moteur d'exécution** : GitHub Agentic Workflows (`gh-aw`) et un fournisseur IA explicitement choisi, après configuration des crédits, des secrets et des autorisations. Par défaut lancer uniquement des missions en lecture seule tant que la chaîne n'est pas validée.
- **Orchestrateur** : service séparé avec file de tâches, verrous, ordonnancement, quotas et contrôle des prérequis. Il ne fusionne ni ne déploie.
- **Tableau de bord** : Web/PWA accessible sur Android/PC. Éventuellement hébergé sur Cloudflare Pages avec un Worker/API dédiée ; stockage minimal de métadonnées des missions et de leurs résultats dans une base distincte (Supabase possible) sans y copier les secrets GitHub.
- **Identité** : accès propriétaire uniquement dans le MVP, authentification forte/OIDC, autorisation côté serveur. GitHub App à permissions minimales pour les actions requises, aucun token dans le navigateur.
- **Isolation** : aucun accès automatique aux comptes NAS, Supabase production, Play Console, monétisation ou historiques réels des utilisateurs.

## Premier écran mobile (MVP)
1. **Vue d'ensemble** : missions à faire/en cours/bloquées/en validation, dernière activité, coûts, incidents et statut CI.
2. **Agents** : 12 rôles et 13 compétences existants, portée, examens, habilitations, disponibilité, dernier résultat ; statut de compétence réelle "NON CERTIFIÉ" tant que les épreuves n'ont pas été exécutées.
3. **Nouvelle mission** : texte libre, priorité, risque, limite budget, cible et critères d'acceptation ; le directeur propose un découpage, le propriétaire confirme.
4. **Tableau des missions** : BROUILLON → APPROUVÉE → EN ATTENTE → EN COURS → TESTS → REVUE HUMAINE → LIVRÉE ; transitions BLOQUÉE / REJETÉE / ANNULÉE possibles.
5. **Détails** : Issue GitHub, branche SHA, agent/skill, journaux, tests, résultats QA/audit, coût, diff et lien PR.
6. **Validation** : aucune fusion ou diffusion sans confirmation explicite dans GitHub, avec vérification du SHA cible au moment de l'action.

## Contrat minimal des missions
`id`, `issue_number`, `title`, `instructions`, `acceptance_criteria`, `agent_id`, `skill_id`, `base_sha`, `allowed_paths`, `risk_tier`, `priority`, `dependencies`, `max_cost`, `status`, `attempts`, `pr_url`, `test_results`, `qa_result`, `audit_result`, `created_at`, `updated_at`.

Le statut est une machine à états côté serveur ; une PR ouverte ne signifie pas une mission livrée.

## Règles anti-empilement d'erreurs
- **Préconditions** : `main` à jour, CI de base connue, budget disponible, aucune mission active sur les mêmes fichiers sensibles.
- **Travail isolé** : une branche par mission, exécution sandbox, timeouts, sorties de réseau minimales, secrets protégés et dépenses plafonnées.
- **Tests** : avant/après, typecheck, build, tests ciblés, intégration et scénarios mobiles pertinents ; exécution réellement prouvée.
- **Qualité** : QA indépendant de l'auteur, audit indépendant pour stockage/auth/paiement/permissions.
- **Blocage** : tout nouveau échec CI critique, toute perte de données, ambiguïté métier, conflit de branche ou dépassement de budget arrête la mission.
- **Validation** : aucune modification de `main` par le robot ; revue humaine, comparaison de SHA avant toute fusion.
- **Robustesse** : maximum 1 relance automatique par défaut, dédoublonnage d'événements, verrou d'exclusivité par domaine sensible, historique complet des décisions.
- **Certification** : aucune autonomie d'écriture pour un agent non qualifié ; épreuves sur copies fictives puis approbation humaine.

## Architecture des flux
```
Téléphone/PC → Tableau de bord privé → API orchestrateur
                                         │
                      ┌──────────────────┴──────────────────┐
                      │                                     │
                 GitHub Issues                         File d'attente
                      │                                     │
               Missions approuvées                 Agence IA sur Actions
                      │                                     │
                      └──────────────→ Branche/PR ←─────────┘
                                              │
                                       CI + QA + audit
                                              │
                                       Revue propriétaire
                                              │
                                      Merge manuel dans main
```

## Phases de réalisation et critères de sortie

### A. Sécuriser la base — PRIORITAIRE
- Diagnostiquer les échecs de GitHub CI sur PR #23 : contrôle des agents, contrats Cloud et workflow Android ; distinguer préexistants et changements réels en comparant les SHAs.
- Vérifier tous les fichiers d'agents et skills ; imposer un test de contrat et protections de `main`.
- Aucune certification d'agent et aucun run autonome avant la fiabilité du socle.

**Acceptation** : tests des fichiers d'agents verts ; anomalies préexistantes de la CI identifiées, tracées et non masquées ; protection de branche active.

### B. Lancer un premier véritable agent
- Choisir un moteur IA compatible et établir les limites de coûts ; configurer les secrets dans GitHub, jamais dans le dépôt.
- Installer/initialiser `gh-aw`, compiler et examiner les workflows et leurs permissions.
- Exécuter une première mission de **lecture et rapport QA** sur un scénario X01 ou Cloud non destructif ; vérifier logs et retour.
- Puis un correctif isolé sous PR avec QA et approbation humaine.

**Acceptation** : un travail exécuté hors session ChatGPT, preuves consultables, coûts identifiables, aucune écriture directe sur `main`.

### C. Disposer d'un tableau de missions immédiatement
- Utiliser les GitHub Issues (et GitHub Projects si créé) avec des champs : Agent, Priorité, Risque, Statut, Dépendances, Validation.
- Les labels et Projects sont des aides d'interface : la sécurité reste appliquée dans les permissions et workflows.
- Permettre la création d'une mission depuis téléphone, via l'interface GitHub, avant d'avoir notre propre tableau de bord.

**Acceptation** : une mission créée, attribuée et suivie de bout en bout via l'application GitHub mobile/web.

### D. Construire MSS AI CONTROL Web/PWA
- Développer une application d'administration distincte, propriétaire seulement, responsive Android/PC.
- Priorité aux vues missions / PR / tests / agents et à la validation ; le chat directeur IA est une étape ultérieure.
- API serveur avec GitHub App, webhooks signés, données d'audit et limites de débit.
- Aucune API admin intégrée à l'application public MULTISPORTS SCORING.

**Acceptation** : état fidèle à GitHub, création de mission, visibilité coût / CI / PR, permissions vérifiées, journal d'audit.

### E. Orchestration multi-agents
- Exécution parallèle progressive (1, puis 2–3 tâches disjointes).
- Files prioritaires, dépendances, réservations de fichiers, QA inter-agent, alertes et gestion des blocages.
- Garder les tâches à risque en mode proposition/revue seulement.

**Acceptation** : deux missions sans conflit ni fusion non approuvée, logs et budgets audités.

## Remarques
La documentation GitHub 2026 décrit `gh-aw` comme une couche GitHub Actions compatible avec Copilot, Codex et d'autres agents. Les workflows agentiques doivent être compilés en `.lock.yml` et l'accès à un fournisseur IA peut être payant. Ce document ne configure pas d'accès ou de clés, et ne garantit ni autonomie 24h/24 ni exécution continue avant activation effective.
