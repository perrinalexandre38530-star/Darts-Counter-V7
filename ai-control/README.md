# MSS AI CONTROL — La plateforme de pilotage des robots de MULTISPORTS SCORING

**Version 0.1 : interface réelle + connexion GitHub sécurisée, sans démarrage automatique des agents.**

## Ce qui est utilisable

- Accueil simple et responsive, adapté aux smartphones ; installable en PWA quand hébergé.
- Les 12 fiches agents, leurs spécialités et leur statut réel **NON CERTIFIÉ**.
- Formulaire guidé « Nouvelle mission » avec choix de l'agent, priorité, directive, critères de succès et interdictions.
- Sauvegarde locale d'un brouillon avant connexion ; transmission à GitHub Issues **après authentification et configuration du serveur**.
- Tableau des missions GitHub, propositions de code GitHub PR et statuts des tests GitHub Actions.
- Approbation pour *préparation uniquement* et suspension d'une mission, enregistrées par labels GitHub.
- Aucun bouton pour fusionner du code, déployer l'application, publier ou engager des dépenses.

**Important :** l'application sportive publique n'est pas modifiée. Aucune IA autonome ni connexion Cloudflare/GitHub ne sont activées par la simple présence de ce code.

## Démarrage en aperçu local

Ouvrir `MSS_AI_CONTROL_APERCU.html` livré à côté du ZIP. Dans cet aperçu, le formulaire permet de sauvegarder un brouillon sur le navigateur ; GitHub n'est pas connecté. Ne pas confondre un brouillon local et une mission transmise.

## Mise en ligne privée (Cloudflare Pages)

La plateforme doit être hébergée comme **un projet Cloudflare Pages DISTINCT** de `multisports-scoring` et protégée avant d'autoriser l'accès. Ne pas exposer de données administrateur ou de secrets à l'application publique des joueurs.

1. Dans Cloudflare > Workers & Pages, créer un projet `mss-ai-control-admin` connecté au dépôt GitHub `perrinalexandre38530-star/Darts-Counter-V7` **une fois la branche validée**.
2. Répertoire racine du projet : `ai-control` ; infrastructure : **Aucun** ; commande de build : **`exit 0`** (les fichiers HTML/CSS/JS sont déjà prêts, Cloudflare installe les dépendances automatiquement) ; répertoire de sortie : `public`. Node 22+ recommandé. Le dossier `functions/` situé à la racine du sous-projet sera déployé avec les fichiers statiques. Un `wrangler.toml` local à `ai-control` isole la configuration du `wrangler.toml` de l'application sportive à la racine. Vérifier dans les journaux que Cloudflare lit bien le fichier local, avec `pages_build_output_dir = ./public`, et n'importe pas les bindings du site sportif.
3. **Avant l'ouverture au public**, activer Cloudflare Zero Trust > Access et créer une application n'autorisant **que ton compte administrateur**. Protéger le domaine principal `mss-ai-control-admin.pages.dev` et les URLs d'aperçu `*.mss-ai-control-admin.pages.dev` (les réglages Pages protègent parfois uniquement les aperçus par défaut ; vérifier les deux).
4. Configurer dans Cloudflare Pages > Settings > Variables and Secrets :

   | Nom | Type | Contenu |
   |---|---|---|
   | `CF_ACCESS_TEAM_DOMAIN` | variable | URL `https://<votre-equipe>.cloudflareaccess.com` |
   | `CF_ACCESS_AUD` | variable | Audience (AUD Tag) de l'application Access |
   | `OWNER_EMAIL` | variable | Adresse email autorisée pour l'administration (exacte) |
   | `MSS_GITHUB_REPO` | variable | `perrinalexandre38530-star/Darts-Counter-V7` |
   | `MSS_GITHUB_TOKEN` | **secret chiffré** | Jeton d'accès GitHub fine-grained restreint au dépôt |

5. Pour ce jeton, limiter les permissions au seul dépôt : **Issues (Read and write)**, **Pull requests (Read)**, **Actions (Read)**, **Metadata (Read)**. Ne pas lui accorder `Contents: write`, Workflows: write, Admin, ni accès à d'autres dépôts.
6. Redéployer le projet privé après ajout des secrets ; se connecter depuis le téléphone avec ton compte Cloudflare Access. Vérifier qu'un autre utilisateur non autorisé ne peut pas accéder à l'interface ni aux API.

### Sécurité impérative

- La protection des pages statiques ET de `/api/*` est assurée par `functions/_middleware.js`, qui vérifie signature/émetteur/audience du JWT Cloudflare Access, puis compare `email` avec `OWNER_EMAIL`. **Sans cette configuration, la plateforme refuse les requêtes.**
- Le jeton GitHub est conservé côté serveur dans un secret Cloudflare. Ne jamais l'écrire dans les fichiers, dans un formulaire ou dans la console du navigateur.
- Les directives sont enregistrées dans **un dépôt GitHub actuellement PUBLIC**. Les titres et contenus des GitHub Issues sont donc visibles de tous : pas de secrets, informations personnelles, dossiers clients ou données de joueurs. Pour des missions confidentielles, créer ultérieurement un dépôt de missions privé.
- Les contrôles d'approbation et suspension utilisent des labels GitHub et n'ordonnent **aucune exécution IA**. Avant de brancher des robots, le futur moteur devra vérifier lui-même l'approbation par une identité de confiance et les protections de branche.
- Aucun merge, push sur `main`, déploiement, migration SQL, action de paiement ou envoi externe n'est disponible dans cette V1.
- Les brouillons enregistrés dans le navigateur local peuvent être supprimés par le navigateur : ce ne sont pas des sauvegardes durables.

## Tests

Depuis `ai-control/` :

```sh
node --check public/app.js
node --check functions/_middleware.js
node --check 'functions/api/[[path]].js'
node --test test/*.test.mjs
```

Les sept tests actuels ne sollicitent aucun service externe : ils simulent la création d'Issues, les décisions et les statuts GitHub. Un test de déploiement Cloudflare Access + JWT + GitHub réel reste nécessaire **avant usage de production**.

## Roadmap

1. Faire valider la PR du centre de commande et la CI dédiée.
2. Activer l'hébergement privé et la connexion GitHub depuis Cloudflare, en contrôlant l'authentification.
3. Vérifier en conditions réelles la création d'une mission à partir du smartphone, puis son affichage et sa suspension.
4. Brancher ensuite un premier moteur IA à permissions minimales pour missions **en lecture seule** uniquement, après validation du budget et des protections GitHub.
5. Après certification du QA, Débogueur et Développeur, autoriser progressivement les PR sur branches séparées.

**Ce fichier ne demande pas de commande Git à l'utilisateur final.** La configuration initiale de l'hébergement et de l'identité est une opération d'administration unique ; une fois effectuée, les missions passent exclusivement par l'interface MSS AI CONTROL.
