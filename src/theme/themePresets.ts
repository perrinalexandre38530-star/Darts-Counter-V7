// ============================================
// src/theme/themePresets.ts
// Thèmes néon : seuls les accents changent,
// le fond reste toujours sombre (ou très sombre).
// ============================================

export type ThemeId =
  | "gold"
  | "pink"
  | "petrol"
  | "green"
  | "magenta"
  | "red"
  | "orange"
  | "white"
  | "blueOcean"
  | "limeYellow"
  | "sage"
  | "skyBlue"
  | "darkTitanium"
  | "darkCarbon"
  | "darkFrost"
  | "darkObsidian";

export type AppTheme = {
  id: ThemeId;
  name: string;
  primary: string;
  bg: string;        // fond global
  card: string;      // fond des cartes
  text: string;
  textSoft: string;
  accent1: string;
  accent2: string;
  borderSoft: string;
  success: string;
  danger: string;
};

export const DEFAULT_THEME_ID: ThemeId = "gold";
export const THEME_STORAGE_KEY = "dc_app_theme_v1";

// Fond sombre par défaut (peut être override par certains thèmes dark)
const DARK_BG = "#050712";
const DARK_CARD = "#121420";

export const THEMES: AppTheme[] = [
  {
    id: "gold",
    name: "Néon Doré",
    primary: "#F6C256",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.7)",
    accent1: "#F6C256",
    accent2: "#FF4A4A",
    borderSoft: "rgba(255,255,255,0.08)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "pink",
    name: "Rose Néon",
    primary: "#FF4FA3",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,220,245,0.8)",
    accent1: "#FF4FA3",
    accent2: "#FFC857",
    borderSoft: "rgba(255,79,163,0.3)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "petrol",
    name: "Bleu Pétrole",
    primary: "#1ABC9C",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#EFFFFF",
    textSoft: "rgba(210,245,245,0.8)",
    accent1: "#1ABC9C",
    accent2: "#F6C256",
    borderSoft: "rgba(26,188,156,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "green",
    name: "Vert Néon",
    primary: "#2ECC71",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#EFFFFF",
    textSoft: "rgba(200,255,220,0.8)",
    accent1: "#2ECC71",
    accent2: "#F6C256",
    borderSoft: "rgba(46,204,113,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "magenta",
    name: "Magenta / Violet",
    primary: "#C678DD",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F9F5FF",
    textSoft: "rgba(230,210,255,0.8)",
    accent1: "#C678DD",
    accent2: "#61AFEF",
    borderSoft: "rgba(198,120,221,0.35)",
    success: "#98C379",
    danger: "#E06C75",
  },
  {
    id: "red",
    name: "Rouge Esport",
    primary: "#FF4A4A",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFEFEF",
    textSoft: "rgba(255,220,220,0.8)",
    accent1: "#FF4A4A",
    accent2: "#FFD166",
    borderSoft: "rgba(255,74,74,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "orange",
    name: "Orange Flame",
    primary: "#FF9F43",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFF5E8",
    textSoft: "rgba(255,230,200,0.8)",
    accent1: "#FF9F43",
    accent2: "#F6C256",
    borderSoft: "rgba(255,159,67,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "white",
    name: "Clair / Blanc",
    primary: "#FFFFFF",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.7)",
    accent1: "#FFFFFF",
    accent2: "#F6C256",
    borderSoft: "rgba(255,255,255,0.15)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },

  // --------------------------------------------
  // Soft accents supplémentaires
  // --------------------------------------------

  {
    id: "blueOcean",
  name: "Bleu Océan",
  // 🌊 Bleu océan / bleu ciel naturel
  primary: "#3B82F6",

  bg: DARK_BG,
  card: DARK_CARD,

  // Texte légèrement bleuté, très lisible
  text: "#F5F8FF",
  textSoft: "rgba(210,225,250,0.85)",

  // Accents en dégradé océan
  accent1: "#3B82F6",
  accent2: "#60A5FA",

  borderSoft: "rgba(59,130,246,0.40)",

  success: "#4CD964",
  danger: "#FF4A4A",
  },
  {
    id: "limeYellow",
    name: "Vert Jaune",
    primary: "#B1DB07",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F7FFDF",
    textSoft: "rgba(200,240,150,0.75)",
    accent1: "#B1DB07",
    accent2: "#DFFF4F",
    borderSoft: "rgba(177,219,7,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "sage",
    name: "Vert Sauge",
    primary: "#A3B18A",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F6F7F2",
    textSoft: "rgba(210,220,210,0.75)",
    accent1: "#A3B18A",
    accent2: "#C7D8B7",
    borderSoft: "rgba(163,177,138,0.35)",
    success: "#8BC34A",
    danger: "#E06C75",
  },
  {
    id: "skyBlue",
    name: "Bleu Pastel",
    primary: "#A7D8FF",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F8FBFF",
    textSoft: "rgba(190,220,255,0.75)",
    accent1: "#A7D8FF",
    accent2: "#C2E3FF",
    borderSoft: "rgba(167,216,255,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },

  // --------------------------------------------
  // Thèmes DARK premiums
  // --------------------------------------------

  {
    id: "darkTitanium",
    name: "Titane sombre",
    primary: "#5A5A5A",
    bg: "#0D0D0F",
    card: "#16171A",
    text: "#E6E6E6",
    textSoft: "rgba(200,200,200,0.65)",
    accent1: "#707070",
    accent2: "#A0A0A0",
    borderSoft: "rgba(255,255,255,0.10)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "darkCarbon",
    name: "Carbone",
    primary: "#2E3B4E",
    bg: "#0A0C0F",
    card: "#13171D",
    text: "#DDE7F0",
    textSoft: "rgba(180,200,220,0.65)",
    accent1: "#32475A",
    accent2: "#88A3C8",
    borderSoft: "rgba(255,255,255,0.08)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "darkFrost",
    name: "Givre sombre",
    primary: "#98A3B8",
    bg: "#080A0E",
    card: "#101319",
    text: "#E3E7F2",
    textSoft: "rgba(210,220,235,0.7)",
    accent1: "#A8B2C8",
    accent2: "#D0DAF0",
    borderSoft: "rgba(150,170,200,0.18)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "darkObsidian",
    name: "Obsidienne",
    primary: "#C5C5C5",
    bg: "#050607",
    card: "#0C0E10",
    text: "#E6E6E6",
    textSoft: "rgba(180,180,180,0.6)",
    accent1: "#3A3A3A",
    accent2: "#707070",
    borderSoft: "rgba(255,255,255,0.10)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
];
