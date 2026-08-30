# FIT PERF · AWENA WAN AUTOMATION V109

## Workflow réellement intégré

La V109 part du workflow API AWENA push-up fourni par le projet : Wan2.2 Animate 14B, LightX2V I2V LoRA, relight LoRA, DWPose, SAM2, deux passes WanAnimateToVideo et une sortie 16 fps en 640×368.

Les valeurs spécifiques au push-up sont remplacées automatiquement par exercice : identité AWENA, vidéo guide, prompts, seeds et préfixes de sortie.

Une incohérence de dimensions dans la deuxième passe (hauteur branchée sur la largeur 640) est corrigée pour conserver le 640×368 de la première passe.

## Transparence

La vidéo brute Wan n'est pas considérée comme transparente. La V109 segmente les frames AWENA finales avec SAM2, sauvegarde RGB + matte, puis fait l'assemblage alpha localement avec FFmpeg : VP9 `yuva420p`, `alpha_mode=1` obligatoire.

Le poster et les quatre étapes détaillées sont extraits de cette même séquence AWENA avec le même alpha.

## Mouvement

Ce workflow est un transfert de mouvement : DWPose est alimenté par une vidéo guide. Un mouvement source est donc requis. Les vidéos déjà présentes dans le catalogue sont exploitées automatiquement. Les exercices sans driver sont listés sans être falsifiés dans `blocked-no-motion-driver.json`.

Pour couvrir 100 % du catalogue, l'étape suivante est un générateur automatique de drivers pour le reliquat (I2V/T2V), puis ces drivers sont automatiquement passés dans le présent workflow pour transformer le personnage en AWENA.
