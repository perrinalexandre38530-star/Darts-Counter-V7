# MULTISPORTS SCORING — Bootstrap Android

Identité Android retenue :

- Nom : `MULTISPORTS SCORING`
- Application ID / package : `com.multisportsscoring.app`
- Web build : `dist`
- Capacitor : `8.4.2`

## Première création du shell Android

Depuis la racine du projet :

```bash
npm run android:bootstrap
```

Cette commande installe les paquets Capacitor 8.4.2, crée `android/` si nécessaire, construit la PWA puis synchronise `dist/` dans le projet Android.

## Développement courant

Après une modification React/TypeScript :

```bash
npm run android:sync
```

Pour ouvrir le projet dans Android Studio :

```bash
npm run android:open
```

Pour vérifier l'environnement Capacitor :

```bash
npm run android:doctor
```

## Service Worker

Le Service Worker PWA reste actif sur le Web/Cloudflare. Dans la WebView Capacitor native, il est volontairement désactivé afin d'éviter qu'un cache PWA ancien conserve des chunks Vite obsolètes après une mise à jour de l'APK/AAB.

## Monétisation

Le shell Android est créé avant AdMob. Le pont `window.DCNativeMonetization` déjà présent sera la frontière native pour :

- interstitiels AdMob ;
- rewarded ads ;
- consentement UMP ;
- achats Google Play Billing ;
- restauration des achats.

Aucun vrai identifiant publicitaire n'est ajouté à ce stade.
