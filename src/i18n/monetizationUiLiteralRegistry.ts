// MONETIZATION / ADVERTISING UI SOURCE REGISTRY
//
// The monetization layer historically contained many hard-coded French labels.
// Registering authored FR -> EN/ES copies makes English/Spanish deterministic,
// while the global local translator handles the other selectable languages from
// the complete French source instead of translating fragments.

import {
  registerUiLiteralTranslation,
  registerUiLiteralTranslationSource,
} from "./uiLiteralSafety";

type Entry = readonly [fr: string, en: string, es: string];

const ENTRIES: readonly Entry[] = [
  ["Espace promotionnel intégré", "Integrated promotional area", "Espacio promocional integrado"],
  ["PUBLICITÉ · APERÇU INTÉGRÉ", "ADVERTISING · INTEGRATED PREVIEW", "PUBLICIDAD · VISTA PREVIA INTEGRADA"],
  ["Nouveautés, contenus et partenaires.", "News, content and partners.", "Novedades, contenidos y socios."],
  ["BIENTÔT", "SOON", "PRÓXIMAMENTE"],
  ["PUBLICITÉ TEST", "TEST AD", "PUBLICIDAD DE PRUEBA"],
  ["Emplacement vidéo/interstitiel prêt pour AdMob. Aucun réseau réel n'est appelé en mode test.", "Video/interstitial placement ready for AdMob. No real ad network is called in test mode.", "Espacio de vídeo/intersticial listo para AdMob. No se llama a ninguna red publicitaria real en modo de prueba."],
  ["Fermer", "Close", "Cerrar"],
  ["Accueil", "Home", "Inicio"],
  ["Messages", "Messages", "Mensajes"],
  ["Profils", "Profiles", "Perfiles"],
  ["Jeux", "Games", "Juegos"],
  ["Compétitions", "Competitions", "Competiciones"],
  ["Online", "Online", "Online"],
  ["Stats", "Stats", "Estadísticas"],
  ["Réglages", "Settings", "Ajustes"],
  ["Écrans", "Screens", "Pantallas"],
  ["Historique", "History", "Historial"],

  ["Publicité", "Advertising", "Publicidad"],
  ["Fin de partie", "End of game", "Fin de partida"],
  ["PUBLICITÉ", "ADVERTISING", "PUBLICIDAD"],
  ["Contrôle les emplacements autorisés sans surcharger les écrans de jeu.", "Controls the allowed ad placements without cluttering gameplay screens.", "Controla los espacios publicitarios permitidos sin sobrecargar las pantallas de juego."],
  ["Espaces publicitaires", "Ad spaces", "Espacios publicitarios"],
  ["Compte FREE : publicités actives automatiquement. Premium/Sans pub les supprime.", "FREE account: ads are enabled automatically. Premium/Ad-free removes them.", "Cuenta FREE: los anuncios se activan automáticamente. Premium/Sin anuncios los elimina."],
  ["Géré automatiquement par le droit Premium/Sans pub vérifié.", "Managed automatically by the verified Premium/Ad-free entitlement.", "Gestionado automáticamente por el derecho Premium/Sin anuncios verificado."],
  ["Accueil, Jeux, Stats, Historique et Réglages uniquement.", "Home, Games, Stats, History and Settings only.", "Solo Inicio, Juegos, Estadísticas, Historial y Ajustes."],
  ["Bannières", "Banners", "Banners"],
  ["Compte FREE : bannières actives automatiquement, jamais pendant le jeu.", "FREE account: banners are enabled automatically, never during gameplay.", "Cuenta FREE: los banners se activan automáticamente, nunca durante el juego."],
  ["Jamais sur le keypad ou pendant une volée.", "Never on the keypad or during a visit.", "Nunca en el teclado ni durante una tirada."],
  ["Promotions MULTISPORTS", "MULTISPORTS promotions", "Promociones MULTISPORTS"],
  ["Affiche les packs maison si aucune bannière AdMob n’est disponible.", "Shows in-house packs when no AdMob banner is available.", "Muestra los packs propios cuando no hay ningún banner de AdMob disponible."],

  ["FIN DE PARTIE", "END OF GAME", "FIN DE PARTIDA"],
  ["Interstitiel réservé aux comptes FREE, uniquement après les résultats.", "Interstitial reserved for FREE accounts, only after results.", "Intersticial reservado a cuentas FREE, solo después de los resultados."],
  ["1 PUB / 1 PARTIE", "1 AD / 1 GAME", "1 ANUNCIO / 1 PARTIDA"],
  ["APRÈS RÉSULTATS", "AFTER RESULTS", "DESPUÉS DE RESULTADOS"],
  ["PUB RÉCOMPENSÉE · BONUS SANS COUPURE", "REWARDED AD · UNINTERRUPTED BONUS", "ANUNCIO RECOMPENSADO · BONUS SIN INTERRUPCIONES"],
  ["Choix volontaire : regarde 1 Rewarded jusqu’à la validation de la récompense et les 3 prochaines parties n’auront pas d’interstitiel de fin. Les bannières restent actives.", "Optional choice: watch 1 Rewarded ad until the reward is confirmed and the next 3 games will have no end-of-game interstitial. Banners remain active.", "Elección voluntaria: mira 1 anuncio Rewarded hasta confirmar la recompensa y las próximas 3 partidas no tendrán intersticial al final. Los banners siguen activos."],
  ["Choix volontaire : regarde 1 Rewarded jusqu’à la validation de la récompense et les ", "Optional choice: watch 1 Rewarded ad until the reward is confirmed and the ", "Elección voluntaria: mira 1 anuncio Rewarded hasta confirmar la recompensa y las "],
  [" n’auront pas d’interstitiel de fin. Les bannières restent actives.", " will have no end-of-game interstitial. Banners remain active.", " no tendrán intersticial al final. Los banners siguen activos."],
  ["3 prochaines parties", "next 3 games", "próximas 3 partidas"],
  ["Passes restants :", "Passes remaining:", "Pases restantes:"],
  ["CHARGEMENT…", "LOADING…", "CARGANDO…"],
  ["BONUS ACTIF", "BONUS ACTIVE", "BONUS ACTIVO"],
  ["REGARDER 1 PUB → 3 PARTIES", "WATCH 1 AD → 3 GAMES", "VER 1 ANUNCIO → 3 PARTIDAS"],
  ["PRÊT · ID REWARDED À CRÉER", "READY · REWARDED ID TO CREATE", "LISTO · ID REWARDED POR CREAR"],
  ["APERÇU INTERSTITIEL", "INTERSTITIAL PREVIEW", "VISTA PREVIA DEL INTERSTICIAL"],
  ["Interstitiel AdMob :", "AdMob interstitial:", "Intersticial AdMob:"],
  ["Rewarded AdMob :", "AdMob Rewarded:", "Rewarded AdMob:"],
  ["Rewarded :", "Rewarded:", "Rewarded:"],
  ["Interstitiel :", "Interstitial:", "Intersticial:"],
  ["ID PRÊT", "ID READY", "ID LISTO"],
  ["ID À CRÉER DANS ADMOB", "ID TO CREATE IN ADMOB", "ID POR CREAR EN ADMOB"],
  ["TECHNIQUE PRÊTE · ID À CRÉER", "TECH READY · ID TO CREATE", "TÉCNICA LISTA · ID POR CREAR"],
  ["Préchargement interstitiel :", "Interstitial preload:", "Precarga del intersticial:"],
  ["ACTIF PENDANT LES RÉSULTATS", "ACTIVE DURING RESULTS", "ACTIVO DURANTE LOS RESULTADOS"],
  ["Rewarded : bonus accordé uniquement après confirmation réelle de la récompense AdMob.", "Rewarded: bonus granted only after actual AdMob reward confirmation.", "Rewarded: el bonus se concede solo tras la confirmación real de la recompensa de AdMob."],
  ["Parties comptées :", "Games counted:", "Partidas contabilizadas:"],
  ["Dernière pub :", "Last ad:", "Último anuncio:"],
  ["Bonus Rewarded cumulés :", "Rewarded bonuses earned:", "Bonos Rewarded acumulados:"],
  ["Dernier bonus :", "Last bonus:", "Último bonus:"],
  ["Rafraîchir", "Refresh", "Actualizar"],

  ["ANDROID / ADMOB", "ANDROID / ADMOB", "ANDROID / ADMOB"],
  ["État du consentement et du SDK natif. Les détails techniques restent repliés.", "Consent and native SDK status. Technical details remain collapsed.", "Estado del consentimiento y del SDK nativo. Los detalles técnicos permanecen plegados."],
  ["ADMOB INITIALISÉ", "ADMOB INITIALIZED", "ADMOB INICIALIZADO"],
  ["À VÉRIFIER", "CHECK REQUIRED", "POR VERIFICAR"],
  ["PWA · ADMOB NATIF INACTIF", "PWA · NATIVE ADMOB INACTIVE", "PWA · ADMOB NATIVO INACTIVO"],
  ["VÉRIFIER", "CHECK", "VERIFICAR"],
  ["Options de confidentialité", "Privacy options", "Opciones de privacidad"],
  ["MONÉTISATION ADMOB COMPLÈTE · PRÊTE", "FULL ADMOB MONETIZATION · READY", "MONETIZACIÓN ADMOB COMPLETA · LISTA"],
  ["BANNIÈRES LIVE · PLEIN ÉCRAN EN ATTENTE", "LIVE BANNERS · FULLSCREEN PENDING", "BANNERS LIVE · PANTALLA COMPLETA PENDIENTE"],
  ["ADMOB · CONFIGURATION À VÉRIFIER", "ADMOB · CONFIGURATION TO CHECK", "ADMOB · CONFIGURACIÓN POR VERIFICAR"],
  ["App ID, bannières, interstitiel et rewarded utilisent des IDs réels valides du même éditeur. Le garde-fou de release peut valider la monétisation complète.", "App ID, banners, interstitial and rewarded use valid real IDs from the same publisher. The release guard can validate full monetization.", "El App ID, los banners, el intersticial y el rewarded usan IDs reales válidos del mismo editor. El control de release puede validar la monetización completa."],
  ["Les bannières réelles sont déjà prêtes. L’interstitiel et le rewarded resteront désactivés tant que leurs deux IDs AdMob réels ne sont pas renseignés.", "Real banners are already ready. Interstitial and rewarded will remain disabled until both real AdMob IDs are configured.", "Los banners reales ya están listos. El intersticial y el rewarded permanecerán desactivados hasta configurar sus dos IDs reales de AdMob."],
  ["La configuration AdMob n’est pas encore prête pour une release publicitaire complète.", "The AdMob configuration is not yet ready for a full advertising release.", "La configuración de AdMob aún no está lista para una release publicitaria completa."],
  ["TESTS PLEIN ÉCRAN GOOGLE · AUCUN REVENU", "GOOGLE FULLSCREEN TESTS · NO REVENUE", "PRUEBAS GOOGLE A PANTALLA COMPLETA · SIN INGRESOS"],
  ["Utilise exclusivement les IDs de démonstration officiels Google. Ces boutons servent à valider le SDK Android avant de créer les vrais blocs Interstitiel et Rewarded.", "Uses only Google's official demo IDs. These buttons validate the Android SDK before creating the real Interstitial and Rewarded placements.", "Usa exclusivamente los IDs de demostración oficiales de Google. Estos botones validan el SDK Android antes de crear los bloques reales Interstitial y Rewarded."],
  ["PRÉCHARGER", "PRELOAD", "PRECARGAR"],
  ["INTERSTITIEL", "INTERSTITIAL", "INTERSTICIAL"],
  ["Détails techniques", "Technical details", "Detalles técnicos"],
  ["Consentement :", "Consent:", "Consentimiento:"],
  ["Demandes autorisées :", "Requests allowed:", "Solicitudes permitidas:"],
  ["Mode :", "Mode:", "Modo:"],
  ["Bannières réelles :", "Real banners:", "Banners reales:"],
  ["Monétisation complète :", "Full monetization:", "Monetización completa:"],
  ["oui", "yes", "sí"],
  ["non", "no", "no"],
  ["prêt", "ready", "listo"],
  ["ID manquant", "missing ID", "ID ausente"],
  ["PRÊTE", "READY", "LISTA"],
  ["en attente", "pending", "pendiente"],

  ["Les tests plein écran AdMob nécessitent l’application Android native.", "AdMob fullscreen tests require the native Android app.", "Las pruebas de AdMob a pantalla completa requieren la aplicación Android nativa."],
  ["Diagnostic V78 indisponible dans ce build.", "V78 diagnostic unavailable in this build.", "Diagnóstico V78 no disponible en esta compilación."],
  ["Diagnostic interstitiel indisponible dans ce build.", "Interstitial diagnostic unavailable in this build.", "Diagnóstico del intersticial no disponible en esta compilación."],
  ["Interstitiel Google TEST affiché correctement.", "Google TEST interstitial displayed correctly.", "Intersticial Google TEST mostrado correctamente."],
  ["Diagnostic rewarded indisponible dans ce build.", "Rewarded diagnostic unavailable in this build.", "Diagnóstico Rewarded no disponible en esta compilación."],
  ["Rewarded Google TEST validé par le SDK. Aucun bonus applicatif n’a été attribué.", "Google TEST Rewarded validated by the SDK. No app bonus was granted.", "Rewarded Google TEST validado por el SDK. No se ha concedido ningún bonus de la aplicación."],
  ["La pub récompensée est disponible dans l’application Android.", "Rewarded ads are available in the Android app.", "Los anuncios recompensados están disponibles en la aplicación Android."],
  ["Bonus Rewarded indisponible dans ce build.", "Rewarded bonus unavailable in this build.", "Bonus Rewarded no disponible en esta compilación."],
  ["Ton compte est déjà Sans pub / Premium.", "Your account is already Ad-free / Premium.", "Tu cuenta ya es Sin anuncios / Premium."],
  ["Le bonus est prêt côté application ; il manque encore l’ID Rewarded réel dans AdMob.", "The bonus is ready in the app; the real Rewarded ID is still missing in AdMob.", "El bonus está listo en la aplicación; aún falta el ID Rewarded real en AdMob."],
  ["Rewarded indisponible pour le moment. Aucun bonus n’a été consommé.", "Rewarded is currently unavailable. No bonus was consumed.", "Rewarded no está disponible por el momento. No se ha consumido ningún bonus."],
  ["Les achats s’ouvrent depuis la version Android installée via Google Play.", "Purchases open from the Android version installed via Google Play.", "Las compras se abren desde la versión Android instalada mediante Google Play."],
  ["Achat reçu. La validation serveur doit maintenant confirmer le droit avant activation.", "Purchase received. Server validation must now confirm the entitlement before activation.", "Compra recibida. La validación del servidor debe confirmar ahora el derecho antes de activarlo."],
  ["Paiement en attente de confirmation Google Play.", "Payment pending Google Play confirmation.", "Pago pendiente de confirmación de Google Play."],
  ["Achat annulé.", "Purchase cancelled.", "Compra cancelada."],
  ["Achat indisponible pour le moment.", "Purchase currently unavailable.", "Compra no disponible por el momento."],
  ["La restauration des achats est disponible dans l’application Android.", "Purchase restoration is available in the Android app.", "La restauración de compras está disponible en la aplicación Android."],

  ["PREMIUM", "PREMIUM", "PREMIUM"],
  ["Choisis une offre ou conserve le compte FREE.", "Choose an offer or keep the FREE account.", "Elige una oferta o conserva la cuenta FREE."],
  ["PREMIUM · SANS PUB", "PREMIUM · AD-FREE", "PREMIUM · SIN ANUNCIOS"],
  ["SANS PUB · À VIE", "AD-FREE · LIFETIME", "SIN ANUNCIOS · DE POR VIDA"],
  ["COMPTE FREE", "FREE ACCOUNT", "CUENTA FREE"],
  ["Les droits réels sont vérifiés côté serveur / Google Play.", "Real entitlements are verified server-side / Google Play.", "Los derechos reales se verifican en el servidor / Google Play."],
  ["PREMIUM MENSUEL", "MONTHLY PREMIUM", "PREMIUM MENSUAL"],
  ["Premium complet, renouvelé chaque mois.", "Full Premium, renewed every month.", "Premium completo, renovado cada mes."],
  ["PREMIUM ANNUEL", "YEARLY PREMIUM", "PREMIUM ANUAL"],
  ["Premium complet avec formule annuelle.", "Full Premium with yearly plan.", "Premium completo con plan anual."],
  ["SANS PUB À VIE", "LIFETIME AD-FREE", "SIN ANUNCIOS DE POR VIDA"],
  ["Supprime les publicités sans abonnement Premium.", "Removes ads without a Premium subscription.", "Elimina los anuncios sin suscripción Premium."],
  ["Prix Google Play", "Google Play price", "Precio de Google Play"],
  ["Voir sur Android", "View on Android", "Ver en Android"],
  ["CHOISIR", "CHOOSE", "ELEGIR"],
  ["Les boutons sont prêts, mais les achats restent verrouillés jusqu’à l’activation de la vérification serveur Google Play.", "The buttons are ready, but purchases remain locked until Google Play server verification is enabled.", "Los botones están listos, pero las compras permanecen bloqueadas hasta activar la verificación de servidor de Google Play."],
  ["PACKS ADDITIONNELS", "ADD-ON PACKS", "PACKS ADICIONALES"],
  ["Avatars, logos, sets, thèmes, bots IA et bundles de personnalisation.", "Avatars, logos, sets, themes, AI bots and customization bundles.", "Avatares, logos, sets, temas, bots IA y bundles de personalización."],
  ["SÉLECTIONNÉ", "SELECTED", "SELECCIONADO"],
  ["VOIR / ACHETER SUR GOOGLE PLAY", "VIEW / BUY ON GOOGLE PLAY", "VER / COMPRAR EN GOOGLE PLAY"],
  ["DISPONIBLE SUR ANDROID", "AVAILABLE ON ANDROID", "DISPONIBLE EN ANDROID"],
  ["GOOGLE PLAY", "GOOGLE PLAY", "GOOGLE PLAY"],
  ["Connexion Billing, produits Android, achats et restauration.", "Billing connection, Android products, purchases and restoration.", "Conexión Billing, productos Android, compras y restauración."],
  ["BILLING CONNECTÉ", "BILLING CONNECTED", "BILLING CONECTADO"],
  ["BILLING À VÉRIFIER", "BILLING TO CHECK", "BILLING POR VERIFICAR"],
  ["PWA · BILLING DISPONIBLE SUR ANDROID", "PWA · BILLING AVAILABLE ON ANDROID", "PWA · BILLING DISPONIBLE EN ANDROID"],
  ["Premium mensuel", "Monthly Premium", "Premium mensual"],
  ["Premium annuel", "Yearly Premium", "Premium anual"],
  ["Sans pub à vie", "Lifetime ad-free", "Sin anuncios de por vida"],
  ["Achats activés :", "Purchases enabled:", "Compras activadas:"],
  ["non — vérification serveur requise", "no — server verification required", "no — se requiere verificación del servidor"],
  ["RESTAURER ACHATS", "RESTORE PURCHASES", "RESTAURAR COMPRAS"],
  ["Pourquoi cet onglet ?", "Why this tab?", "¿Por qué esta pestaña?"],
  ["Il sert à vérifier que l’application Android dialogue bien avec Google Play Billing, restaurer les achats d’un utilisateur et diagnostiquer les produits configurés. Aucun droit Premium n’est accordé uniquement depuis le téléphone : le reçu doit être validé côté serveur.", "It checks that the Android app communicates correctly with Google Play Billing, restores a user's purchases and diagnoses configured products. No Premium entitlement is granted from the phone alone: the receipt must be validated server-side.", "Sirve para verificar que la aplicación Android se comunica correctamente con Google Play Billing, restaurar las compras de un usuario y diagnosticar los productos configurados. No se concede ningún derecho Premium solo desde el teléfono: el recibo debe validarse en el servidor."],

  ["Pack Avatars Arcade", "Arcade Avatars Pack", "Pack Avatares Arcade"],
  ["Nouveaux portraits et styles visuels pour les profils.", "New portraits and visual styles for profiles.", "Nuevos retratos y estilos visuales para los perfiles."],
  ["Avatars supplémentaires", "Additional avatars", "Avatares adicionales"],
  ["Variantes de cadres", "Frame variants", "Variantes de marcos"],
  ["Éléments cosmétiques", "Cosmetic items", "Elementos cosméticos"],
  ["Pack Logos Clubs", "Club Logos Pack", "Pack Logos de Clubes"],
  ["Une bibliothèque supplémentaire pour les équipes et clubs.", "An additional library for teams and clubs.", "Una biblioteca adicional para equipos y clubes."],
  ["Logos d'équipes", "Team logos", "Logos de equipos"],
  ["Badges", "Badges", "Insignias"],
  ["Écussons", "Crests", "Escudos"],
  ["Pack Dartsets Pro", "Dartsets Pro Pack", "Pack Dartsets Pro"],
  ["Visuels et collections additionnelles pour Mes fléchettes.", "Additional visuals and collections for My Darts.", "Visuales y colecciones adicionales para Mis Dardos."],
  ["Sets additionnels", "Additional sets", "Sets adicionales"],
  ["Vignettes", "Thumbnails", "Miniaturas"],
  ["Collections visuelles", "Visual collections", "Colecciones visuales"],
  ["Collection Thèmes Premium", "Premium Themes Collection", "Colección de Temas Premium"],
  ["Une collection de packs premium : Arenas & Ambiances, Matières d’exception, Métaux & Industrie, Éléments extrêmes et Luxe & Joyaux.", "A collection of premium packs: Arenas & Atmospheres, Exceptional Materials, Metals & Industry, Extreme Elements and Luxury & Jewels.", "Una colección de packs premium: Arenas y Ambientes, Materiales Excepcionales, Metales e Industria, Elementos Extremos y Lujo y Joyas."],
  ["Matières d’exception", "Exceptional Materials", "Materiales Excepcionales"],
  ["Métaux & Industrie", "Metals & Industry", "Metales e Industria"],
  ["Éléments extrêmes", "Extreme Elements", "Elementos Extremos"],
  ["Luxe & Joyaux", "Luxury & Jewels", "Lujo y Joyas"],
  ["THÈMES PREMIUM", "PREMIUM THEMES", "TEMAS PREMIUM"],
  ["Pack Bots IA Champions", "AI Champions Bots Pack", "Pack Bots IA Champions"],
  ["Nouveaux adversaires CPU avec identités et niveaux dédiés.", "New CPU opponents with dedicated identities and levels.", "Nuevos rivales CPU con identidades y niveles específicos."],
  ["Bots IA additionnels", "Additional AI bots", "Bots IA adicionales"],
  ["Avatars dédiés", "Dedicated avatars", "Avatares dedicados"],
  ["Profils de difficulté", "Difficulty profiles", "Perfiles de dificultad"],
  ["Bundle Personnalisation", "Customization Bundle", "Bundle de Personalización"],
  ["Avatars + logos + sets + thèmes dans un seul pack.", "Avatars + logos + sets + themes in one pack.", "Avatares + logos + sets + temas en un solo pack."],
  ["Thèmes", "Themes", "Temas"],
];

let registered = false;

export function registerMonetizationUiLiteralSources(): void {
  if (registered) return;
  registered = true;
  for (const [fr, en, es] of ENTRIES) {
    registerUiLiteralTranslationSource(fr, "fr");
    registerUiLiteralTranslation(fr, "fr", "en", en);
    registerUiLiteralTranslation(fr, "fr", "es", es);
  }
}

export function monetizationUiText(lang: string, fr: string): string {
  registerMonetizationUiLiteralSources();
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  if (target === "fr") return fr;
  const row = ENTRIES.find((entry) => entry[0] === fr);
  if (target === "en" && row) return row[1];
  if (target === "es" && row) return row[2];
  registerUiLiteralTranslationSource(fr, "fr");
  return fr;
}

export function monetizationUiDynamic(
  lang: string,
  fr: string,
  en: string,
  es: string,
): string {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  registerUiLiteralTranslationSource(fr, "fr");
  registerUiLiteralTranslation(fr, "fr", "en", en);
  registerUiLiteralTranslation(fr, "fr", "es", es);
  if (target === "fr") return fr;
  if (target === "en") return en;
  if (target === "es") return es;
  return fr;
}

export const MONETIZATION_UI_LITERAL_COUNT = ENTRIES.length;
