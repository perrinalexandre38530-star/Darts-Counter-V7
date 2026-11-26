# MSS SOCIAL PUBLISHER V1 — base V7(66)

## Installation et utilisation
- Décompresser ce patch à la racine du projet. Aucun changement des jeux, du package.json, du lanceur existant, des 66 images ou de leurs validations.
- Fermer les anciennes consoles. Relancer `MSS_AI_CONTROL_OUVRIR_AGENT_V15.cmd` : accès à `http://127.0.0.1:4184/graphic/publisher/` depuis le menu Graphic Designer / Social Publisher. Sans jeton, la préparation et la validation sont disponibles, mais l'envoi est bloqué.
- Dans Graphic Designer, vérifier les droits des visuels, leurs affirmations commerciales et leurs traductions. Valider les images, puis créer des créneaux futurs sur X pour `@multisportsscor`. Un créneau sélectionne un visuel validé inédit pour le compte. Les heures locales sont converties en UTC.
- Ouvrir Social Publisher et autoriser individuellement l'image, le texte exact et la date. Les légendes X sont construites à partir de la copie localisée du catalogue et raccourcies à des limites conservatrices, sans traduire ou inventer du texte à l'envoi. Chaque autorisation est liée au SHA-256 du média et à une empreinte du créneau et de la légende.

## Connexion réelle X (non réalisée ici)
X Developer Console : créer/configurer une application autorisée en lecture/écriture, et obtenir un jeton OAuth 2.0 **utilisateur** (pas le Bearer d'application) pour le compte officiel. Scopes nécessaires : `tweet.read`, `tweet.write`, `users.read`, `media.write`. OAuth PKCE et renouvellement automatique non intégrés à cette V1. Voir la documentation officielle :
- https://docs.x.com/x-api/users/get-my-user
- https://docs.x.com/x-api/media/upload-media
- https://docs.x.com/x-api/posts/create-post

La session Chrome du robot de profil X ne fournit pas ce jeton. Le compte doit avoir accès aux endpoints, et X peut facturer leur usage. Vérifier coûts/quotas dans la console X avant activation. Aucun achat de publicité et aucune inscription ne sont réalisés par le programme.

Fermer les anciennes consoles, puis lancer `MSS_SOCIAL_PUBLISHER_OUVRIR.cmd` pour saisir le jeton dans le terminal (saisie masquée, variable d'environnement du processus uniquement). Si PowerShell interdit les scripts, utiliser un terminal local autorisé par les règles de sécurité du PC ; ne pas désactiver ces protections. Le jeton ne doit jamais être envoyé dans le chat, dans Git, dans les fichiers ou dans les journaux. Il n'est pas stocké sur disque par le moteur. Il faut le renouveler lorsqu'il expire. Une clé OpenAI n'est pas nécessaire.

Sur la page Social Publisher, cliquer sur Activer la diffusion après avoir accepté les éventuels frais API. Le cycle tourne toutes les 30 secondes tant que le serveur est ouvert. Il ne traite que les créneaux dus et autorisés, au maximum un envoi par période de 24 h (également après un échec avant publication). Après redémarrage, toujours en pause. Suspendre empêche les nouvelles requêtes de publication, mais une requête déjà transmise ne peut pas être annulée. Les autres réseaux sont bloqués : aucune tentative de connexion ou de publication.

## Historique et incident
`output/publisher-history.json` (local, ignoré Git) est le journal de publication, distinct du calendrier. Conserver ce fichier dans les sauvegardes locales, sans le remplacer par un ZIP ni l'effacer pour relancer une campagne. Le moteur ne confirme un post qu'avec un identifiant de réponse X. Aucun renvoi automatique après une erreur. Un état UNKNOWN ou SENDING interrompu bloque toute nouvelle publication jusqu'à rapprochement manuel avec le compte X ; le verrou `.publisher-lock` peut rester présent après un arrêt brutal. Ne pas supprimer le verrou ou modifier le journal pendant qu'un serveur tourne. Cette V1 ne possède pas encore d'interface de rapprochement : arrêter toutes les consoles et demander un diagnostic avant toute reprise. Les médias ou textes déjà publiés par cette bibliothèque ne sont pas renvoyés. Les publications manuelles ou extérieures à cette bibliothèque ne sont pas connues.

## Tests
`node --test tools/mss-social-content/graphic-designer/publisher.test.mjs` : fixture isolée, requêtes simulées (aucun appel X). Tests locaux Node 22 : route health, galerie, page Publisher et refus POST sans session. L'API réelle et Windows restent à tester. 66 images de la base contrôlées par SHA-256, non modifiées. Aucun compte connecté par ce patch, aucune publication externe.
