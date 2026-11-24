# QA V2 / V7(50)
- ZIP de référence : 66 entrées de catalogue, seulement 24 PNG présents. V2 restaure les 66 PNG et remplace le catalogue.
- 66 rendus V2 1080 × 1350 générés avec contrôles glyphes / RAQM / débordement / décodage QR. `designer.py verify` : 66, invalid=[], missing=[].
- Contrôle visuel ponctuel FR/EN/AR/JA : voir aperçu livré séparément. Traductions non certifiées par un locuteur natif, graphisme à valider.
- Tests HTTP exécutés : 66/66 intègres, approbation groupée, rejet atomique d'un lot au hash invalide, refus d'un média rejeté, création de créneau, refus de créneaux trop proches, annulation, édition et régénération ciblée, invalidation de l'approbation quand le SHA change.
- Route intégrée `/graphic/` du serveur développeur sur port 4184 testée ; serveur autonome 4186 testé ; syntaxe JS vérifiée. Windows non testé ici.
- Aucun état d'approbation, override utilisateur, créneau test ou fichier de police inclus. Aucun envoi externe, compte social ni dépense.
