# V111 — THEME LIVE PAGE PREVIEW

Objectif de cette retouche :
- transformer le bloc d'aperçu du thème en vraie mini-fenêtre de diffusion ;
- supprimer le titre/redondance "ACIER URBAIN / Façade..." au-dessus du bloc exemple ;
- rendre la miniature non transparente pour éviter le mélange avec le thème actuellement appliqué ;
- afficher le vrai profil actif (avatar + nom) ;
- injecter de vraies stats du profil actif via `getBasicProfileStatsAsync` (avec fallback local) ;
- faire défiler automatiquement plusieurs mini-pages dans l'aperçu : ACCUEIL / STATS / ONLINE ;
- conserver le reste de la page THÈME compact.

Fichier modifié :
- `src/pages/Settings.tsx`
