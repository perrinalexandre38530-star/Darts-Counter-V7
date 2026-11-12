# MSS AI CONTROL — Activation privée contrôlée

Ce document décrit **le passage de la PR d'intégration #34 aux premières missions QA réelles**. Il ne lance aucun service et ne requiert jamais de coller un secret dans une Issue publique ou dans ChatGPT.

## État de départ et conditions obligatoires

- La PR #34 est une PR d'intégration empilée sur #32 ; la PR #32 dépend de #30. L'ordre de revue/intégration est **#30 puis #32 puis #34**, jamais #34 directement sur `main` tant que ses bases ne sont pas intégrées.
- Contrôles avant intégration : **Quality Gate**, tests MSS AI CONTROL, tests du pilote QA, compilation Cloudflare Pages Functions en mode **local uniquement**, compilation Android et budget médias, vérification des artefacts.
- Vérifier la protection de `main`, l'absence de conflits et le résultat CI sur le **SHA exact** prêt à intégrer. Une réussite sur une ancienne PR ne valide pas automatiquement une nouvelle tête.
- **Aucun robot n'est exécuté en production** par la simple présence de ce code. Le pilote QA n'est pas un moteur IA génératif et ne modifie pas le code.

## Configuration Cloudflare unique — intervention administrateur

1. Créer dans **Workers & Pages** un projet Cloudflare Pages **distinct** de l'application sportive, par exemple `mss-ai-control-admin`, en connectant le dépôt GitHub après revue. Répertoire racine `ai-control`, sortie `public`, build statique sans transformation. Vérifier que les Pages Functions du dossier `ai-control/functions/` sont bien prises en charge.
2. **Protéger la production ET chaque URL d'aperçu avec Cloudflare Access**. Attention : Cloudflare protège par défaut les *previews* lorsque l'on active leur politique Access, mais le domaine principal `<projet>.pages.dev` nécessite une configuration supplémentaire. Vérifier les deux indépendamment, depuis une session privée non autorisée.
3. Créer une politique Access de type « autoriser seulement l'identité administrateur prévue » et exclure tout utilisateur non explicitement autorisé. Configurer le même contexte d'audience pour le domaine desservi, ou bien des variables adaptées à chaque environnement (Production/Preview).
4. Renseigner **côté Cloudflare Pages Functions seulement** :
   - `CF_ACCESS_TEAM_DOMAIN` : domaine de l'équipe Access en HTTPS.
   - `CF_ACCESS_AUD` : audience de l'application Access correspondante.
   - `OWNER_EMAIL` : identité administrateur unique.
   - `MSS_GITHUB_REPO` : `perrinalexandre38530-star/Darts-Counter-V7`.
   - `MSS_GITHUB_TOKEN` : **secret Cloudflare**, jamais variable exposée au navigateur. Jeton GitHub fine-grained limité au dépôt, **Issues read/write**, **Pull requests read**, **Actions read** et **Metadata read**. Ne pas accorder Contents write, Workflows write ou Admin.
5. Redéployer dans le projet Pages séparé après activation des secrets, avec Access déjà configuré. Ne jamais utiliser le projet `multisports-scoring` public pour administrer les robots.

Références officielles :
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/platform/known-issues/
- https://developers.cloudflare.com/pages/functions/middleware/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/

## Essais d'acceptation à réaliser

1. En navigation privée sans session, vérifier que la page d'accueil **et** `/api/bootstrap` sont bloqués ou redirigent vers Access. **Aucune donnée GitHub administrateur ne doit apparaître.**
2. Avec une identité différente de `OWNER_EMAIL`, l'accès doit être refusé. Avec le seul compte autorisé, le tableau de bord s'ouvre ; le statut du workflow QA doit être affiché selon l'API GitHub, sans prétendre que le moteur IA est actif.
3. Depuis le téléphone, créer une mission **non sensible** et vérifier l'Issue GitHub correspondante. Les Issues sont publiques : pas de secrets, profils de joueurs, adresses ou données de sauvegarde.
4. Vérifier le fonctionnement d'une **suspension** : le statut bloque les départs futurs, mais ne prétend pas interrompre un job déjà lancé.
5. **Seulement lorsque le pilote QA est présent sur la branche par défaut**, approuver explicitement la mission QA de test #26 ou une nouvelle mission de lecture seule. Le workflow doit démarrer sous l'identité autorisée, publier une seule note factuelle, puis apposer `mss:review`. Consulter « Rapport QA » dans l'interface. Si l'exécution échoue, ne pas présenter l'absence de rapport comme un succès.
6. Tester la réouverture de la PWA sur Android, l'absence de secrets côté navigateur, puis révoquer toute autorisation de test non nécessaire.

## Arrêt d'urgence et sécurité

- Suspendre les missions dans MSS AI CONTROL ; pour empêcher les nouvelles exécutions, désactiver **le workflow GitHub du pilote QA** sur `main` après revue administrative.
- En cas de soupçon sur les accès, **révoquer immédiatement le jeton GitHub**, conserver Cloudflare Access en place et examiner les journaux.
- Ne pas désactiver Cloudflare Access pour dépanner : une preview Pages peut sinon devenir publique.
- Aucune fusion automatique, publication Play Store, migration Supabase, modification NAS, achat publicitaire ou dépense API IA dans cette V1.

## Étape suivante

Après un test réel QA concluant, une nouvelle mission et une PR séparée pourront préparer un robot correcteur capable de proposer une branche/PR sans merge automatique. Son activation nécessitera un fournisseur d'exécution, des limites de temps/coût, des permissions distinctes et une revue humaine.
