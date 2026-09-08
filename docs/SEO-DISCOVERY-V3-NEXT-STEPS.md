# MULTISPORTS SCORING — SEO / AI Discovery V3 next steps

## Ce qui a été ajouté dans ce patch
- style partagé `public/seo/seo.css` pour les pages publiques SEO ;
- `public/sitemap.xsl` pour rendre le sitemap lisible et propre dans un navigateur ;
- audit local `npm run test:seo` ;
- script IndexNow amélioré avec message clair quand la vérification distante n'est pas encore terminée.

## Commandes utiles
```bash
npm run test:seo
npm run seo:indexnow
npm run seo:indexnow -- --strict
```

## Important à propos de l'erreur IndexNow 403
Le code `SiteVerificationNotComplete` ne veut pas dire que ton script est cassé.
Cela veut dire que le fichier clé est bien soumis mais que la vérification n'est pas encore propagée côté IndexNow/Bing.

À vérifier :
1. Ouvrir l'URL de la clé dans le navigateur.
2. Vérifier qu'elle affiche uniquement la clé brute.
3. Attendre un peu puis relancer la commande.

## Suite recommandée pour viser le haut des recherches
1. Connecter Google Search Console.
2. Connecter Bing Webmaster Tools.
3. Soumettre le sitemap.
4. Créer des pages longue traîne par discipline et intention de recherche.

Exemples :
- compteur fléchettes 501
- darts score counter 501
- application score pétanque
- foosball score tracker
- app de suivi running GPS
- application musculation séries répétitions charges

## Règle produit importante
Ne référencer comme disponibles sur Google Play que les modules réellement présents dans la version Android publique.
Le reste peut être présenté comme disponible côté Web/PWA si c'est exact.
