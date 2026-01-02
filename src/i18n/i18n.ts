// ============================================
// src/i18n/i18n.ts
// Mini système i18n pour l'appli
// ============================================

export type LangCode =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "sv";

export type I18nKey =
  | "settings_title"
  | "settings_theme_section"
  | "settings_theme_hint"
  | "settings_language_section"
  | "settings_language_hint"
  | "settings_back_home";

export const AVAILABLE_LANGS: { code: LangCode; label: string; flag: string }[] =
  [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "nl", label: "Nederlands", flag: "🇳🇱" },
    { code: "pl", label: "Polski", flag: "🇵🇱" },
    { code: "sv", label: "Svenska", flag: "🇸🇪" },
  ];

export const I18N_STRINGS: Record<LangCode, Record<I18nKey, string>> = {
  fr: {
    settings_title: "Réglages",
    settings_theme_section: "Thème global",
    settings_theme_hint:
      "Choisissez la couleur principale de l'application. Tout le style néon s'adaptera à ce thème.",
    settings_language_section: "Langue de l'application",
    settings_language_hint:
      "Choisissez la langue utilisée pour les menus, les boutons et les textes.",
    settings_back_home: "Retour à l'accueil",
  },
  en: {
    settings_title: "Settings",
    settings_theme_section: "Global theme",
    settings_theme_hint:
      "Choose the main color of the app. The whole neon style will adapt to this theme.",
    settings_language_section: "App language",
    settings_language_hint:
      "Choose the language used for menus, buttons and text.",
    settings_back_home: "Back to home",
  },
  es: {
    settings_title: "Ajustes",
    settings_theme_section: "Tema global",
    settings_theme_hint:
      "Elige el color principal de la app. Todo el estilo neón se adaptará a este tema.",
    settings_language_section: "Idioma de la aplicación",
    settings_language_hint:
      "Elige el idioma usado para menús, botones y textos.",
    settings_back_home: "Volver al inicio",
  },
  de: {
    settings_title: "Einstellungen",
    settings_theme_section: "Globales Thema",
    settings_theme_hint:
      "Wähle die Hauptfarbe der App. Der gesamte Neon-Stil passt sich diesem Thema an.",
    settings_language_section: "App-Sprache",
    settings_language_hint:
      "Wähle die Sprache für Menüs, Buttons und Texte.",
    settings_back_home: "Zur Startseite",
  },
  it: {
    settings_title: "Impostazioni",
    settings_theme_section: "Tema globale",
    settings_theme_hint:
      "Scegli il colore principale dell'app. Tutto lo stile al neon si adatterà a questo tema.",
    settings_language_section: "Lingua dell'app",
    settings_language_hint:
      "Scegli la lingua per menu, pulsanti e testi.",
    settings_back_home: "Torna alla home",
  },
  pt: {
    settings_title: "Configurações",
    settings_theme_section: "Tema global",
    settings_theme_hint:
      "Escolha a cor principal da aplicação. Todo o estilo néon irá adaptar-se a este tema.",
    settings_language_section: "Idioma da aplicação",
    settings_language_hint:
      "Escolha o idioma usado para menus, botões e textos.",
    settings_back_home: "Voltar ao início",
  },
  nl: {
    settings_title: "Instellingen",
    settings_theme_section: "Globaal thema",
    settings_theme_hint:
      "Kies de hoofdkleur van de app. De hele neonstijl past zich aan dit thema aan.",
    settings_language_section: "App-taal",
    settings_language_hint:
      "Kies de taal voor menu's, knoppen en teksten.",
    settings_back_home: "Terug naar start",
  },
  pl: {
    settings_title: "Ustawienia",
    settings_theme_section: "Motyw globalny",
    settings_theme_hint:
      "Wybierz główny kolor aplikacji. Cały styl neonowy dopasuje się do tego motywu.",
    settings_language_section: "Język aplikacji",
    settings_language_hint:
      "Wybierz język używany w menu, przyciskach i tekstach.",
    settings_back_home: "Powrót do ekranu głównego",
  },
  sv: {
    settings_title: "Inställningar",
    settings_theme_section: "Globalt tema",
    settings_theme_hint:
      "Välj appens huvudfärg. Hela neonsstilen anpassar sig till detta tema.",
    settings_language_section: "App-språk",
    settings_language_hint:
      "Välj språk för menyer, knappar och texter.",
    settings_back_home: "Tillbaka till start",
  },
};
