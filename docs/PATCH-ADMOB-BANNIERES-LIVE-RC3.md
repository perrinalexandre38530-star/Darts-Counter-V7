# Patch AdMob — bannières live RC3

- `VITE_ADMOB_MODE` effectif : production via `config/admob.public.json`.
- 12 blocs de bannières réels utilisés sur Android.
- Aucun appareil de test injecté localement dans le bundle public.
- Les appareils enregistrés dans la console AdMob restent protégés en test.
- Premium/Sans pub vérifié : aucune requête publicitaire.
- Interstitiel et rewarded absents : désactivés proprement, sans fallback vers les IDs de démonstration Google.
- Le configurateur Android lit maintenant `config/admob.public.json`, ce qui garantit l'App ID réel dans GitHub Actions même sans `.env`.
