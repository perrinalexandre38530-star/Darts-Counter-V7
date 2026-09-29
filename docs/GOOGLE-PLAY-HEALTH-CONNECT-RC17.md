# Google Play — Health Connect — resoumission RC17 / code 18

## Cause du refus du 29/09/2026

Google Play a refusé la mise à jour avec le motif : **« L'utilisation de l'autorisation n'est pas un cas d'utilisation autorisé ou valide pour Health Connect »**.

MULTISPORTS SCORING dispose pourtant d'un cas d'utilisation visible de suivi sportif dans **RUNNING PERF** (enregistrement, import/export de séances et statistiques). Pour la resoumission, il faut :

1. déclarer le cas d'utilisation Play Console **Fitness, bien-être et coaching / Activité et remise en forme** ;
2. décrire précisément chaque donnée Health Connect demandée ;
3. limiter la demande Android aux données réellement nécessaires ;
4. fournir à l'équipe de validation un chemin reproductible vers l'écran Health Connect.

## Durcissement RC17 appliqué dans l'application

- Les autorisations Health Connect restent demandées **par action** : IMPORT et EXPORT séparément.
- L'import ne demande que les autorisations de lecture effectivement utilisées.
- L'export ne demande que les autorisations d'écriture effectivement utilisées.
- `READ_EXERCISE_ROUTES` a été **retirée du manifeste et de la demande standard**. Android ne permet pas de l'accorder via le dialogue standard de permissions ; les parcours protégés ne font donc plus partie de l'import Health Connect standard de cette release.
- `WRITE_HEART_RATE`, `WRITE_SPEED` et `WRITE_STEPS` ne sont utilisés que lorsque MULTISPORTS SCORING possède de vraies mesures enregistrées.
- Aucune fréquence cardiaque, vitesse capteur ou cadence artificielle n'est inventée.
- Si une permission facultative est refusée, la séance continue à être importée/exportée avec les données autorisées.
- L'écran **RUNNING PERF > Stats > Capteurs & applis > Connexions & capteurs** affiche une divulgation claire avant les actions Health Connect.

## Déclaration Play Console recommandée

### Catégorie / cas d'utilisation

Sélectionner **Activité et remise en forme** dans la déclaration « Applis de santé », et **Fitness, bien-être et coaching** lorsqu'un choix de cas d'utilisation Health Connect est demandé.

Ne pas déclarer Health Connect comme jeu, publicité, analyse marketing, profilage ou autre usage secondaire.

### READ_EXERCISE

MULTISPORTS SCORING lit les séances d'exercice enregistrées dans Health Connect afin de les afficher dans l'historique RUNNING PERF et de calculer les statistiques sportives demandées par l'utilisateur.

### WRITE_EXERCISE

MULTISPORTS SCORING exporte vers Health Connect les séances de running, trail, marche, randonnée et tapis réellement enregistrées par l'utilisateur dans RUNNING PERF.

### WRITE_EXERCISE_ROUTE

MULTISPORTS SCORING peut joindre à une séance exportée le tracé GPS réellement enregistré pendant une activité RUNNING PERF. Aucun tracé n'est créé artificiellement.

### READ_DISTANCE

MULTISPORTS SCORING lit la distance des séances Health Connect afin de l'afficher dans l'historique et les statistiques sportives de RUNNING PERF.

### WRITE_DISTANCE

MULTISPORTS SCORING exporte la distance réellement enregistrée ou calculée à partir du parcours GPS de la séance RUNNING PERF.

### READ_ELEVATION_GAINED

MULTISPORTS SCORING lit le dénivelé positif associé aux séances Health Connect pour compléter les statistiques de parcours.

### WRITE_ELEVATION_GAINED

MULTISPORTS SCORING exporte le dénivelé positif calculé à partir du parcours réellement enregistré par RUNNING PERF.

### READ_HEART_RATE

MULTISPORTS SCORING lit les mesures de fréquence cardiaque associées aux séances Health Connect afin d'afficher et analyser l'intensité des entraînements dans RUNNING PERF.

### WRITE_HEART_RATE

MULTISPORTS SCORING exporte uniquement les mesures de fréquence cardiaque réellement enregistrées pendant une séance lorsqu'un capteur cardio compatible a fourni ces valeurs. Aucune donnée cardio artificielle n'est générée.

### READ_SPEED

MULTISPORTS SCORING lit les mesures de vitesse associées aux séances Health Connect afin d'afficher et analyser la performance sportive.

### WRITE_SPEED

MULTISPORTS SCORING exporte les mesures de vitesse réellement enregistrées pendant RUNNING PERF par un capteur compatible ou calculées à partir du parcours GPS enregistré.

### READ_STEPS

MULTISPORTS SCORING lit la cadence de pas (`StepsCadenceRecord`) associée aux séances Health Connect afin de compléter les statistiques d'entraînement.

### WRITE_STEPS

MULTISPORTS SCORING exporte la cadence de pas réellement mesurée pendant une séance par un footpod ou un capteur compatible (`StepsCadenceRecord`). Aucun nombre de pas ou cadence artificielle n'est créé.

## Instructions pour l'équipe de validation Google Play

Chemin dans l'application :

1. lancer MULTISPORTS SCORING ;
2. choisir **Running / RUNNING PERF** ;
3. ouvrir **Statistiques** ;
4. ouvrir **Capteurs & applis** puis **Connexions & capteurs** ;
5. la carte **HEALTH CONNECT** affiche les actions **AUTORISER IMPORT / IMPORTER 30 J** et **AUTORISER EXPORT / ENVOYER MES SORTIES** ;
6. les autorisations sont demandées seulement lorsque l'utilisateur déclenche l'une de ces actions.

La vidéo de démonstration fournie à Google Play doit montrer ce parcours, la divulgation visible, puis au moins un déclenchement du dialogue Health Connect.

## Resoumission

1. Construire une nouvelle AAB avec **versionCode 18** / **1.0.0-rc17**.
2. Dans Play Console, mettre à jour **Règles et programmes > Contenu de l'application > Applis de santé / Health Connect** avec les descriptions ci-dessus.
3. Vérifier que `READ_EXERCISE_ROUTES` n'est plus listée dans les autorisations du nouvel AAB.
4. Envoyer le nouvel AAB et la déclaration corrigée dans la même resoumission.
5. Ne pas réutiliser le **versionCode 17** rejeté.
