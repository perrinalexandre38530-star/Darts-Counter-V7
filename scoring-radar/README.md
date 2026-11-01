# SCORING RADAR + SOCIAL GROWTH IA — Acquisition V2

Cloudflare Worker d'acquisition pour MULTISPORTS SCORING.

Il fait maintenant quatre choses :

1. **Radar d'intention** : balaie le web public, les forums et communautés pour trouver des utilisateurs qui demandent réellement une solution de scoring/statistiques/sport.
2. **Qualification IA** : filtre les pages commerciales, stores, SEO, faux signaux et ne garde que les demandes utiles.
3. **File d'acquisition** : génère une réponse courte dans la langue d'origine, avec lien tracké, puis permet de suivre `NEW → COPIED → CONTACTED → WON / DISMISSED`.
4. **Social Growth + bandeau partenaire** : prépare les campagnes sociales sous QA et fournit un bandeau promotionnel intégrable sur les sites autorisés.

## Profils de scan

Le dashboard `/admin` propose :

- **ÉCO** : 1 marché × 1 intention × 10 résultats.
- **STANDARD** : valeurs de `wrangler.jsonc` (par défaut 2 marchés × 3 intentions × 20 résultats).
- **TURBO** : jusqu'à 4 marchés × 6 intentions × 20 résultats.

Pour protéger la Queue et garder une classification stable, un run ne met en analyse que **20 nouveaux candidats maximum**. Les résultats supplémentaires ne sont pas perdus définitivement : ils pourront être repris lors des runs suivants.

Une erreur Brave sur une requête ne fait plus tomber tout le scan : elle est conservée comme avertissement et le Radar continue les autres marchés/intents.

## Intents couverts

La V2 ajoute notamment :

- scoring Darts / X01 / Cricket / Killer ;
- entraînement Darts ;
- ligues, amis, classements Darts ;
- running GPS, performances et challenges ;
- scoring multisports ;
- pétanque ;
- ping-pong ;
- baby-foot ;
- Mölkky ;
- jeux entre amis ;
- recherche de partenaires/adversaires sportifs ;
- classements de clubs/groupes ;
- remplacement des feuilles de score papier ;
- wearables / montres / GPS.

Les requêtes de traduction utilisent un cache `growth-v2`, afin de ne pas réutiliser les anciennes formulations V1.

## Suivi des opportunités

Chaque opportunité affiche :

- le site source ;
- la langue et le marché ;
- le score IA ;
- le texte de réponse prêt à copier ;
- le nombre de clics ;
- le statut de traitement.

Le bouton **Copier réponse** passe l'opportunité en `copied`. Le dashboard permet ensuite de la marquer `contacted`, `won` ou `dismissed`.

Le lien inséré dans les réponses passe par `/go/:id`, puis redirige vers la page officielle avec les UTM. Les clics remontent donc dans le Radar.

## Bandeau partenaire autorisé

Le Worker expose :

```text
GET /growth-widget.js
```

Le dashboard donne le tag `<script>` à copier.

Le widget :

- s'affiche en bas de page ;
- pointe vers MULTISPORTS SCORING avec UTM ;
- peut être fermé ;
- mémorise la fermeture 7 jours ;
- n'est servi qu'aux domaines autorisés dans `RADAR_WIDGET_ALLOWED_HOSTS` lorsque cette liste est renseignée.

Ajouter uniquement des domaines que vous contrôlez ou des partenaires qui ont explicitement accepté d'afficher le bandeau.

## Social Growth

Le mode reste volontairement **review** : la génération et la QA sont automatiques, mais la publication directe n'est activée qu'après connexion des comptes sociaux via leurs APIs/OAuth officiels.

Une campagne est soumise à des seuils élevés de qualité, exactitude, marque, utilité, qualité visuelle, risque spam et risque "cheap". Un média réel et approuvé reste obligatoire avant approbation finale.

## Mise à jour D1 obligatoire

La V2 ajoute la table `outreach_actions`. Le schéma est additif.

```bash
cd scoring-radar
npm install
npm run db:remote
```

Les données Radar existantes restent conservées.

## Secrets

Ne jamais mettre les vraies valeurs dans Git :

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put RADAR_ADMIN_TOKEN
```

## Déploiement

```bash
cd scoring-radar
npm install
npm run typecheck
npm run deploy
```

Puis ouvrir :

```text
https://<worker-host>/admin
```

## Endpoints utiles

Protégés par `RADAR_ADMIN_TOKEN` :

```text
POST /api/run                         body: { "profile": "eco|standard|turbo" }
GET  /api/runs/latest
GET  /api/opportunities
POST /api/opportunities/:id/outreach body: { "status": "new|copied|contacted|won|dismissed" }
GET  /api/stats
GET  /api/social/stats
GET  /api/social/campaigns
GET  /api/social/assets?approvedOnly=1
POST /api/social/assets
POST /api/social/campaigns/:id/asset
POST /api/social/campaigns/:id/approve
POST /api/social/campaigns/:id/reject
```

Public :

```text
GET /go/:id
GET /growth-widget.js
GET /health
```
