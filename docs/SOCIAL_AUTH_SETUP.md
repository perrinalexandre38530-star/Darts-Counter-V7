# MULTISPORTS SCORING — Connexion sociale étendue

## Providers intégrés dans l'application

### Connexions principales

- Facebook
- Google
- Microsoft (Azure / Entra ID)
- Apple

### Plus de connexions

- X / Twitter (OAuth 2.0)
- Discord
- Instagram Pro — provider OAuth personnalisé Supabase (`custom:instagram`)
- Snapchat
- TikTok — provider OAuth personnalisé Supabase (`custom:tiktok`)
- LinkedIn (OIDC)
- GitHub
- Spotify
- Twitch
- Kakao

L'écran de connexion n'affiche que les 4 principaux par défaut : Facebook, Google, Microsoft et Apple. Le bouton **Plus de connexions** déplie les 10 autres.

## Architecture

Tous les fournisseurs passent par **Supabase Auth**. Aucun provider social n'accède directement aux sauvegardes, statistiques ou profils MULTISPORTS SCORING.

Web/PWA : fournisseur → Supabase → `https://darts-counter-v7.pages.dev/auth-callback.html` → `/#/auth/callback`

Android : fournisseur (navigateur système) → Supabase → `multisportsscoring://auth/callback` → échange PKCE dans l'app.

Après authentification, la logique existante MULTISPORTS SCORING reprend : restauration Cloud/R2, rattachement du profil local puis navigation normale.

## URLs à autoriser dans Supabase

Dans **Authentication → URL Configuration → Redirect URLs**, ajouter :

- `https://darts-counter-v7.pages.dev/auth-callback.html`
- `multisportsscoring://auth/callback`

## Callback fournisseur commun

Projet Supabase actuel : `rckbdaqksujehszafior`

Callback à déclarer chez les providers natifs :

`https://rckbdaqksujehszafior.supabase.co/auth/v1/callback`

Le fournisseur retourne d'abord vers Supabase, puis Supabase renvoie vers le site/PWA ou l'application Android.

---

## Providers natifs Supabase

### Google

Provider Supabase : `google`

1. Google Cloud / Google Auth Platform : créer ou utiliser le projet MULTISPORTS SCORING.
2. Configurer l'écran de consentement.
3. Créer un client OAuth de type Web application.
4. Ajouter le callback Supabase comme Authorized redirect URI.
5. Copier Client ID + Client Secret dans Supabase → Authentication → Providers → Google.
6. Activer Google.

### Apple

Provider Supabase : `apple`

Le flux OAuth web fonctionne également pour Android. Apple nécessite la configuration Apple Developer (Services ID, Team ID, Key ID et clé de signature) avant de pouvoir activer le provider dans Supabase.

### Facebook

Provider Supabase : `facebook`

1. Meta for Developers : créer/configurer l'application MULTISPORTS SCORING.
2. Ajouter Facebook Login.
3. Ajouter le callback Supabase dans Valid OAuth Redirect URIs.
4. Vérifier l'accès à l'email.
5. Copier App ID + App Secret dans Supabase → Providers → Facebook.
6. Activer Facebook.

### Microsoft

Provider Supabase : `azure`

Microsoft utilise Microsoft Entra ID / Azure. Le code demande explicitement le scope `email`, requis par Supabase pour ce provider.

### X / Twitter

Provider Supabase : `x`

Utiliser le provider moderne OAuth 2.0 et non l'ancien Twitter OAuth 1.0a.

### Discord

Provider Supabase : `discord`

Créer une application dans Discord Developer Portal, déclarer le callback Supabase puis copier Client ID + Client Secret dans Supabase.

### Snapchat

Provider runtime : `snapchat`

Le moteur Supabase Auth/GoTrue prend en charge Snapchat. Selon la version du dashboard Supabase hébergé, Snapchat peut ne pas apparaître dans la liste simplifiée des providers alors qu'il est supporté côté Auth. Le code utilise volontairement le provider runtime.

### LinkedIn

Provider Supabase : `linkedin_oidc`

Utiliser la configuration LinkedIn OIDC actuelle plutôt que l'ancien flux LinkedIn historique.

### GitHub

Provider Supabase : `github`

Créer une OAuth App GitHub et utiliser le callback Supabase commun.

### Spotify

Provider Supabase : `spotify`

Créer une application dans le Spotify Developer Dashboard et déclarer le callback Supabase.

### Twitch

Provider Supabase : `twitch`

Créer une application Twitch Developer et déclarer le callback Supabase.

### Kakao

Provider Supabase : `kakao`

Option ajoutée pour préparer l'internationalisation, notamment la Corée du Sud.

---

## Providers OAuth personnalisés Supabase

Supabase permet de créer des providers OAuth2/OIDC personnalisés via des identifiants commençant par `custom:`. Le plan Free accepte jusqu'à 3 providers personnalisés ; MULTISPORTS SCORING n'en utilise ici que 2.

### Instagram Pro

Identifiant attendu dans le code : `custom:instagram`

IMPORTANT : l'API **Instagram API with Instagram Login** de Meta est destinée aux comptes Instagram professionnels (Business / Creator). Ce n'est pas un équivalent grand public de « Se connecter avec Instagram » pour tous les comptes personnels.

Le bouton est donc volontairement nommé **Instagram Pro** dans l'application.

Lors de la configuration du provider custom Supabase, prévoir `email_optional: true` si le profil Instagram ne fournit pas d'email exploitable.

### TikTok

Identifiant attendu dans le code : `custom:tiktok`

Configurer TikTok Login Kit comme provider OAuth2 personnalisé dans Supabase. Si TikTok ne renvoie pas d'adresse email dans le profil utilisé, activer `email_optional: true` côté provider custom.

---

## Android / Capacitor

Le flux Android n'utilise pas une WebView OAuth embarquée :

1. l'app demande l'URL OAuth à Supabase ;
2. le navigateur système Android s'ouvre ;
3. le provider authentifie l'utilisateur ;
4. Supabase redirige vers `multisportsscoring://auth/callback` ;
5. `SocialAuthPlugin` récupère le deep link ;
6. `exchangeCodeForSession()` finalise PKCE dans la WebView de l'application ;
7. `#/auth/callback` reprend le parcours de compte MULTISPORTS SCORING existant.


---

## Import automatique vers MON PROFIL

À la première connexion OAuth, Supabase crée automatiquement l'utilisateur Auth si le provider l'autorise. MULTISPORTS SCORING crée ensuite son profil applicatif associé et importe les informations réellement fournies par le provider :

- pseudo / nom affiché ;
- prénom ;
- nom ;
- email ;
- téléphone si transmis ;
- pays, ville et date de naissance si transmis ;
- photo de profil (`avatar_url`, `picture`, `profile_image_url`, etc.).

La photo sociale devient immédiatement l'avatar du profil compte et est donc utilisée par les médaillons via `accountBridge` / `ProfileAvatar`.

Règle de sécurité UX : l'import social ne remplit que les champs encore vides (ou les noms génériques du type `Player` / partie locale de l'email). Une donnée personnalisée ensuite dans MON PROFIL, notamment l'avatar, n'est jamais écrasée à une reconnexion OAuth.

Important : Google, Facebook, Microsoft, Apple et les autres providers ne fournissent pas tous les mêmes données ni les mêmes permissions. L'application n'invente donc jamais une ville, une date de naissance, un téléphone ou un pays absent de la réponse OAuth.

## Fichiers ajoutés/modifiés

- `src/lib/socialAuth.ts`
- `src/lib/socialProfileImport.ts`
- `src/lib/onlineApi.ts`
- `src/pages/AuthV7Login.tsx`
- `src/App.tsx`
- `src/main.tsx`
- `public/auth-callback.html`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/multisportsscoring/app/MainActivity.java`
- `android/app/src/main/java/com/multisportsscoring/app/SocialAuthPlugin.java`
- `tools/test-social-auth-integration.mjs`
- `docs/SOCIAL_AUTH_SETUP.md`
