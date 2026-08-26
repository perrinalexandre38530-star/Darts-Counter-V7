# Patch Auth Callback Success Exit — base V79

## Symptôme
Le callback OAuth atteignait 100 % et affichait « Connexion réussie », mais restait sur la page de callback au lieu d'ouvrir GameSelect.

## Cause
`AuthCallbackRoute` exécutait son effet principal avec la dépendance `[go]`. La fonction `go` est recréée à chaque render de `App`. Le passage à `SIGNED_IN` puis à l'état visuel `success` déclenchait un render, donc React exécutait le cleanup de l'effet (`alive = false`) avant la temporisation finale de 160 ms. La navigation finale était alors ignorée.

## Correctif
- conservation de la dernière fonction `go` dans `goRef` ;
- effet OAuth principal monté une seule fois (`[]`) ;
- navigation finale vers `gameSelect` et fallback `online` via `goRef.current(...)` ;
- aucun changement des providers, du PKCE, des timeouts ou de la création de session.
