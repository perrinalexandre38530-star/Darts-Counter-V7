# Google Play — Health Connect — resoumission RC16 / code 17

## Ce qui a été corrigé dans l'application

- Les autorisations Health Connect sont désormais demandées **par action** : IMPORT et EXPORT séparément.
- L'import ne demande que les autorisations de lecture nécessaires.
- L'export ne demande que les autorisations d'écriture nécessaires.
- `WRITE_HEART_RATE`, `WRITE_SPEED` et `WRITE_STEPS` sont maintenant **réellement utilisés** lorsque MULTISPORTS SCORING dispose de données enregistrées :
  - fréquence cardiaque : mesures réelles d'une ceinture cardio / capteur FTMS ;
  - vitesse : mesure capteur ou vitesse issue du GPS enregistré par RUNNING PERF ;
  - cadence : cadence réellement mesurée par footpod / capteur, exportée en `StepsCadenceRecord`.
- Aucune fréquence cardiaque ou cadence artificielle n'est inventée.
- Si une permission facultative est refusée, la séance continue à être importée/exportée avec les données autorisées.
- L'écran Health Connect explique désormais clairement quelles données sont importées et exportées.

## Déclaration Play Console recommandée

Cas d'utilisation : **Activité et remise en forme / Fitness**.

Utiliser des descriptions cohérentes avec les fonctionnalités visibles de RUNNING PERF :

### Exercice — READ_EXERCISE
MULTISPORTS SCORING lit les séances d'exercice enregistrées dans Health Connect afin de les afficher dans l'historique RUNNING PERF et de calculer les statistiques sportives de l'utilisateur.

### Exercice — WRITE_EXERCISE
MULTISPORTS SCORING exporte vers Health Connect les séances de running, trail, marche, randonnée et tapis réellement enregistrées par l'utilisateur dans RUNNING PERF.

### Parcours sportif — READ_EXERCISE_ROUTES
Avec l'accord de l'utilisateur, MULTISPORTS SCORING lit le tracé associé à une séance Health Connect pour afficher la carte et analyser le parcours dans RUNNING PERF.

### Parcours sportif — WRITE_EXERCISE_ROUTE
MULTISPORTS SCORING exporte vers Health Connect le tracé GPS réellement enregistré pendant une sortie RUNNING PERF.

### Distance — READ_DISTANCE
MULTISPORTS SCORING lit la distance des séances Health Connect afin de l'afficher dans l'historique et les statistiques sportives.

### Distance — WRITE_DISTANCE
MULTISPORTS SCORING exporte la distance réellement enregistrée ou calculée pendant une séance RUNNING PERF.

### Dénivelé positif — READ_ELEVATION_GAINED
MULTISPORTS SCORING lit le dénivelé positif des séances Health Connect pour compléter les statistiques de parcours.

### Dénivelé positif — WRITE_ELEVATION_GAINED
MULTISPORTS SCORING exporte le dénivelé positif calculé à partir du parcours GPS réellement enregistré dans RUNNING PERF.

### Fréquence cardiaque — READ_HEART_RATE
MULTISPORTS SCORING lit les mesures de fréquence cardiaque associées aux séances Health Connect afin d'afficher et analyser l'intensité des entraînements.

### Fréquence cardiaque — WRITE_HEART_RATE
MULTISPORTS SCORING exporte uniquement les mesures de fréquence cardiaque réellement enregistrées pendant une séance lorsqu'un capteur cardio compatible est connecté. Aucune donnée cardio artificielle n'est générée.

### Vitesse — READ_SPEED
MULTISPORTS SCORING lit les mesures de vitesse des séances Health Connect afin d'afficher et analyser la performance de l'utilisateur.

### Vitesse — WRITE_SPEED
MULTISPORTS SCORING exporte les mesures de vitesse réellement enregistrées pendant RUNNING PERF par un capteur compatible ou calculées à partir du parcours GPS enregistré.

### Pas / cadence — READ_STEPS
MULTISPORTS SCORING lit la cadence de pas associée aux séances Health Connect afin de compléter les statistiques d'entraînement.

### Pas / cadence — WRITE_STEPS
MULTISPORTS SCORING exporte la cadence de pas réellement mesurée pendant une séance par un footpod ou un capteur compatible (`StepsCadenceRecord`). Aucun nombre de pas artificiel n'est créé.

## Resoumission

1. Construire une nouvelle AAB avec **versionCode 17** / **1.0.0-rc16**.
2. Mettre à jour la déclaration « Applis de santé » avec les textes ci-dessus.
3. Envoyer l'AAB code 17 et la déclaration dans le même envoi pour examen.
4. Ne pas réutiliser le versionCode 16.

