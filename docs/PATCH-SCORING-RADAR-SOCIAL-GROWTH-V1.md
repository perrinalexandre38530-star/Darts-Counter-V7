# PATCH — SCORING RADAR + SOCIAL GROWTH IA V1

**Base de référence : `Darts-Counter-V7(36).zip`**

## Objectif

Transformer SCORING RADAR en moteur d'acquisition prudent : 1 recherche web par heure, génération automatique de campagnes sociales à partir des besoins les plus intéressants, double contrôle IA et bibliothèque de médias obligatoirement approuvés.

## Ce qui change

- Cron Radar : `0 * * * *` (une exécution par heure).
- `RADAR_MARKETS_PER_RUN=1` : une seule recherche Brave par cycle.
- Maximum 2 campagnes Social Growth générées par 24 h par défaut.
- Deux passes IA : génération puis QA indépendante.
- Seuils : qualité 90+, factuel 95+, visuel 90+, risque spam/cheap <= 10.
- Nouveau dashboard `/admin` avec campagnes, scores QA et bibliothèque média.
- Une campagne ne peut pas être approuvée sans média humainement validé avec scores qualité/technique/marque >= 90.
- Aucune image/vidéo générée au hasard n'est autorisée à partir en publication.
- Publication externe encore verrouillée : les OAuth/API officiels des comptes sociaux doivent être branchés avant activation.

## Après copie du patch

Depuis la racine du projet :

```bash
npm run test:scoring-radar
npm run radar:install
npm run radar:typecheck
```

Puis appliquer les nouvelles tables D1 :

```bash
cd scoring-radar
npm run db:remote
```

Puis déployer :

```bash
npm run deploy
```

## Important

Le schéma D1 est additif (`CREATE TABLE IF NOT EXISTS`) : il ne supprime pas les données Radar existantes.

## Étape suivante

Connecter les comptes officiels un par un :

1. Facebook Page / Instagram professionnel (Meta OAuth/API)
2. YouTube OAuth + upload API
3. TikTok Content Posting API après autorisation/audit

Tester d'abord en privé/non listé lorsque la plateforme le permet, puis activer le mode de publication réelle seulement après vérification visuelle.
