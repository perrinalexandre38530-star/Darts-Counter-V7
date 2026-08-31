# Audit Android AUTH + AUDIO — V47

Référence auditée : `v47.zip`

## Diagnostic principal

Le blocage Android vient principalement de la chaîne AUTH globale, pas du lecteur audio lui-même.

Dans la V47 d'origine, `useAuthOnline.safeGetSession()` appelait d'abord `onlineApi.getCurrentSession()`. En mode public, ce chemin pouvait enchaîner : session Supabase -> `restoreSession()` -> création/récupération du profil -> probe NAS privé -> bridge Supabase/NAS -> écriture de session -> événement global `dc-auth-changed`.

Or `saveAuthToLS()` émettait `dc-auth-changed` à **chaque écriture**, même si l'identité n'avait pas changé. `AuthOnlineProvider` écoutait cet événement et relançait la résolution de session. Cela permettait une boucle de réhydratations / bridges / profils, seulement limitée par un cooldown de 1,5 s. Les mêmes événements pouvaient aussi reprogrammer la restauration cloud/NAS/R2 250 ms après la connexion.

C'est particulièrement mauvais autour d'un callback OAuth Android : l'échange Supabase partage le même runtime JS/WebView avec ces traitements globaux. Le timeout de 11 s visible sur la capture est cohérent avec cette concurrence.

## Correctifs appliqués

- Auth fast-path : lecture locale `supabase.auth.getSession()` avant tout bridge NAS réseau.
- Réutilisation locale d'un bridge en cache uniquement s'il correspond au même compte.
- Fallback NAS réseau uniquement lorsqu'il est réellement nécessaire.
- `dc-auth-changed` n'est plus émis pour chaque sauvegarde de token/profil : uniquement lors d'un changement d'identité/provider.
- Handler `dc-auth-changed` rendu non-réentrant.
- Chargements de profil coalescés : un seul chargement par utilisateur à la fois.
- Réhydratation Supabase/NAS coalescée : une seule construction lourde de session à la fois.
- Login/signup Supabase : ouverture immédiate avec la session Supabase obtenue ; profil, capability NAS et bridge repoussés au créneau idle.
- `TOKEN_REFRESHED` ne réveille plus le profil, le cloud ou les restaurations.
- Recherche/restauration de sauvegardes : cooldown + déduplication + exécution après navigation / en idle ; sur Android elle ne part plus 250 ms après login.
- OAuth : fetch settings et preflight désormais bornés par timeout.
- Polling fallback du deep-link OAuth Android : 900 ms -> 2500 ms ; focus/pageshow/visibility restent prioritaires.
- Progress bar OAuth : 55 ms -> 110 ms pour diviser les rerenders d'animation par deux.
- Navigation Android : `React.startTransition` restauré pour rendre le montage des routes lourdes interruptible.

## Audit audio

Le lecteur de navigation V47 possède déjà un unique `new Audio()` global et ne recharge pas la piste lors d'un simple changement entre pages hors PLAY : toutes ces routes restent dans la même zone `navigation`.

L'audio n'est donc pas la cause principale du freeze global. Deux coûts secondaires ont néanmoins été supprimés :

- le listener des commandes musicales AWENA ne se réabonne plus à chaque changement de route ;
- le `backdrop-filter: blur(14px)` du bandeau “musique en cours” est désactivé dans le runtime natif Android/iOS afin d'éviter un repaint GPU coûteux dans la WebView.

Les 29 fichiers de musique représentent environ 59,7 Mo dans les assets, mais le catalogue n'instancie qu'un lecteur et ne charge qu'une source à la fois. Le service worker actuel ne précache pas les 29 fichiers.

## Validation effectuée

- `test-navigation-performance-contract-v1.mjs` : PASS
- AUTH SPINE : PASS
- callback OAuth rapide V73 : 8/8 PASS
- callback OAuth démarrage V77 : 10/10 PASS
- navigation music route contract : PASS
- runtime fluidity V68 : PASS
- global gameplay fluidity V67 : PASS
- nouveau contrat ciblé Android AUTH + AUDIO V47 : 21/21 PASS
- transpilation syntaxique TypeScript des 5 fichiers TS/TSX modifiés : PASS

Le script `test:navigation-performance` de `package.json` pointait par erreur vers `./tools/test-navigation-performance-contract-v1.mjs` alors que le fichier est à la racine ; le chemin a été corrigé.

## Limite de validation

L'audit et les tests source sont terminés. Il reste à confirmer le gain réel sur le téléphone Android après rebuild/sync Capacitor et installation de l'APK/AAB : aucun benchmark physique du WebView Android n'est disponible dans cet environnement.
