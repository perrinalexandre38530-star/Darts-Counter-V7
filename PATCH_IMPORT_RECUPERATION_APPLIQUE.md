# Patch import récupération historique appliqué

Ce ZIP contient le patch d'importeur intégré directement dans `src/pages/HistoryPage.tsx`.

## Modification principale

Dans `handleImportFile(file)`, avant l'alerte :

```txt
Format invalide : ce fichier n'est pas une partie partageable.
```

le code tente maintenant :

```ts
const recovered = await importRecoveredHistoryJson(json);
if (recovered?.ok) {
  await loadHistory();
  window.alert(recovered.message || `${recovered.imported || 0} partie(s) récupérée(s) importée(s) dans l'historique.`);
  return;
}
```

## Fichier support ajouté/présent

`src/lib/importRecoveredHistory.ts`

Il accepte notamment :

- `match-partageable-*.json`
- `share-match-*.json`
- `RESTORE_COMPLET_7_PARTIES_v2.json`
- `dc_recovered_history_bundle_v2`
- lignes natives d'historique reconstruites

## Remarque

Le build n'a pas été lancé dans l'environnement de génération, car `node_modules` n'est pas fourni dans le ZIP et `vite` n'est donc pas disponible localement.
