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
  | "blueNight"
  | "blueOcean"
  | "limeYellow"
  | "sage"
  | "skyBlue"
  | "darkTitanium"
  | "darkCarbon"
  | "darkFrost"
  | "darkObsidian"
  | "arenaDartsPub"
  | "arenaChampionship"
  | "arenaCyber"
  | "arenaStreet"
  | "arenaStadiumNight"
  | "arenaLuxuryClub"
  | "arenaRetroArcade"
  | "arenaFireIce";

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
  // Extensions visuelles facultatives pour les packs premium.
  pageBackground?: string;
  cardBackground?: string;
  ambientOverlay?: string;
  ambientOpacity?: number;
  ambientAnimation?: "drift" | "pulse" | "scan";
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


  {
    id: "blueNight",
    name: "Bleu nuit",
    primary: "#22E6FF",
    // Effet nuit profond : base presque noire + reflets bleu pétrole.
    // C'est volontairement plus sombre que l'ancien #0b1d2f pour retrouver
    // le rendu "nuit + auras cyan" validé sur l'écran d'accueil.
    bg: "#06111F",
    card: "#0B1728",
    text: "#F2FBFF",
    textSoft: "rgba(205,232,245,0.84)",
    accent1: "#22E6FF",
    accent2: "#7AF7FF",
    borderSoft: "rgba(34,230,255,0.44)",
    success: "#2EEB9A",
    danger: "#FF4A6A",
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

  // --------------------------------------------
  // Boutique · ARENAS & AMBIANCES
  // Univers plus immersifs : fonds, cartes, halos et ambiance légère.
  // --------------------------------------------
  {
    id: "arenaDartsPub",
    name: "Darts Pub",
    primary: "#F2B84B",
    bg: "#100C08",
    card: "#1A130D",
    text: "#FFF8EA",
    textSoft: "rgba(244,226,195,0.78)",
    accent1: "#D9872E",
    accent2: "#5FDB78",
    borderSoft: "rgba(242,184,75,0.30)",
    success: "#5FDB78",
    danger: "#FF685C",
    pageBackground: "radial-gradient(760px 420px at 52% -8%, rgba(242,184,75,.20), transparent 64%), repeating-linear-gradient(90deg, rgba(121,70,32,.11) 0 2px, transparent 2px 42px), linear-gradient(180deg,#160f09 0%,#0b0908 54%,#080708 100%)",
    cardBackground: "linear-gradient(145deg,rgba(48,31,18,.96),rgba(20,15,12,.98))",
    ambientOverlay: "radial-gradient(circle at 18% 14%, rgba(242,184,75,.55), transparent 24%), radial-gradient(circle at 82% 30%, rgba(95,219,120,.22), transparent 20%)",
    ambientOpacity: 0.055,
    ambientAnimation: "pulse",
  },
  {
    id: "arenaChampionship",
    name: "Championship Arena",
    primary: "#FF424E",
    bg: "#09070A",
    card: "#171014",
    text: "#FFF4F5",
    textSoft: "rgba(242,213,216,0.78)",
    accent1: "#FF424E",
    accent2: "#FFD45A",
    borderSoft: "rgba(255,66,78,0.34)",
    success: "#38E38A",
    danger: "#FF424E",
    pageBackground: "radial-gradient(520px 360px at 16% 0%, rgba(255,66,78,.22), transparent 70%), radial-gradient(520px 360px at 84% 0%, rgba(255,212,90,.11), transparent 72%), linear-gradient(180deg,#12090d 0%,#08070a 60%,#050507 100%)",
    cardBackground: "linear-gradient(155deg,rgba(40,18,24,.96),rgba(15,10,13,.98))",
    ambientOverlay: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.35) 48%, transparent 59%)",
    ambientOpacity: 0.035,
    ambientAnimation: "scan",
  },
  {
    id: "arenaCyber",
    name: "Cyber Arena",
    primary: "#20E7FF",
    bg: "#040815",
    card: "#091226",
    text: "#ECFDFF",
    textSoft: "rgba(190,236,244,0.78)",
    accent1: "#20E7FF",
    accent2: "#F347FF",
    borderSoft: "rgba(32,231,255,0.38)",
    success: "#39F29D",
    danger: "#FF4D7A",
    pageBackground: "radial-gradient(700px 440px at 16% 2%, rgba(32,231,255,.20), transparent 65%), radial-gradient(650px 430px at 92% 20%, rgba(243,71,255,.16), transparent 62%), linear-gradient(180deg,#071126 0%,#030713 100%)",
    cardBackground: "linear-gradient(145deg,rgba(9,28,55,.96),rgba(7,10,28,.98))",
    ambientOverlay: "repeating-linear-gradient(90deg, rgba(32,231,255,.26) 0 1px, transparent 1px 54px), repeating-linear-gradient(0deg, rgba(243,71,255,.18) 0 1px, transparent 1px 54px)",
    ambientOpacity: 0.032,
    ambientAnimation: "drift",
  },
  {
    id: "arenaStreet",
    name: "Street Sport",
    primary: "#A7FF3F",
    bg: "#0C0D0D",
    card: "#151718",
    text: "#F7FAF2",
    textSoft: "rgba(215,222,207,0.74)",
    accent1: "#A7FF3F",
    accent2: "#FF8A34",
    borderSoft: "rgba(167,255,63,0.28)",
    success: "#60E66B",
    danger: "#FF664F",
    pageBackground: "radial-gradient(620px 360px at 0% 12%, rgba(167,255,63,.12), transparent 70%), repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 18px), linear-gradient(180deg,#141616 0%,#090a0b 100%)",
    cardBackground: "linear-gradient(145deg,rgba(31,34,34,.97),rgba(16,17,18,.98))",
    ambientOverlay: "radial-gradient(circle at 20% 80%, rgba(167,255,63,.34), transparent 25%), radial-gradient(circle at 88% 22%, rgba(255,138,52,.30), transparent 22%)",
    ambientOpacity: 0.035,
    ambientAnimation: "drift",
  },
  {
    id: "arenaStadiumNight",
    name: "Stadium Night",
    primary: "#4DA3FF",
    bg: "#050A16",
    card: "#0A1427",
    text: "#F2F7FF",
    textSoft: "rgba(199,217,242,0.78)",
    accent1: "#4DA3FF",
    accent2: "#E8F3FF",
    borderSoft: "rgba(77,163,255,0.34)",
    success: "#42DF8B",
    danger: "#FF5D67",
    pageBackground: "radial-gradient(360px 520px at 10% -6%, rgba(221,240,255,.16), transparent 70%), radial-gradient(360px 520px at 90% -6%, rgba(77,163,255,.20), transparent 70%), linear-gradient(180deg,#0a1730 0%,#050914 72%,#03050b 100%)",
    cardBackground: "linear-gradient(150deg,rgba(16,34,63,.96),rgba(8,14,29,.98))",
    ambientOverlay: "linear-gradient(74deg, transparent 34%, rgba(255,255,255,.25) 45%, transparent 55%), linear-gradient(106deg, transparent 36%, rgba(77,163,255,.28) 47%, transparent 57%)",
    ambientOpacity: 0.038,
    ambientAnimation: "pulse",
  },
  {
    id: "arenaLuxuryClub",
    name: "Luxury Club",
    primary: "#E8C56B",
    bg: "#080808",
    card: "#11100F",
    text: "#FFF9EA",
    textSoft: "rgba(225,214,190,0.76)",
    accent1: "#E8C56B",
    accent2: "#F7E9B7",
    borderSoft: "rgba(232,197,107,0.28)",
    success: "#4FD08B",
    danger: "#E35B61",
    pageBackground: "radial-gradient(760px 400px at 50% -8%, rgba(232,197,107,.18), transparent 66%), linear-gradient(120deg,rgba(255,255,255,.018) 25%,transparent 25% 50%,rgba(255,255,255,.018) 50% 75%,transparent 75%), linear-gradient(180deg,#11100e 0%,#060607 100%)",
    cardBackground: "linear-gradient(145deg,rgba(31,28,22,.98),rgba(13,13,13,.99))",
    ambientOverlay: "radial-gradient(circle at 50% 12%, rgba(247,233,183,.40), transparent 25%)",
    ambientOpacity: 0.032,
    ambientAnimation: "pulse",
  },
  {
    id: "arenaRetroArcade",
    name: "Retro Arcade",
    primary: "#FF4FD8",
    bg: "#09051A",
    card: "#160B2A",
    text: "#FFF1FE",
    textSoft: "rgba(229,205,244,0.80)",
    accent1: "#FF4FD8",
    accent2: "#35E8FF",
    borderSoft: "rgba(255,79,216,0.34)",
    success: "#45F49A",
    danger: "#FF5576",
    pageBackground: "radial-gradient(660px 400px at 50% -2%, rgba(255,79,216,.20), transparent 64%), linear-gradient(180deg,#17072d 0%,#080515 66%,#04040c 100%)",
    cardBackground: "linear-gradient(145deg,rgba(43,16,64,.96),rgba(14,8,28,.98))",
    ambientOverlay: "repeating-linear-gradient(0deg, rgba(53,232,255,.22) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(255,79,216,.20) 0 1px, transparent 1px 34px)",
    ambientOpacity: 0.035,
    ambientAnimation: "scan",
  },
  {
    id: "arenaFireIce",
    name: "Fire & Ice",
    primary: "#70D8FF",
    bg: "#080A10",
    card: "#11131A",
    text: "#F8FBFF",
    textSoft: "rgba(216,225,238,0.78)",
    accent1: "#70D8FF",
    accent2: "#FF6848",
    borderSoft: "rgba(112,216,255,0.30)",
    success: "#55E095",
    danger: "#FF6848",
    pageBackground: "radial-gradient(620px 500px at -6% 12%, rgba(54,170,255,.28), transparent 67%), radial-gradient(620px 500px at 106% 12%, rgba(255,92,54,.25), transparent 67%), linear-gradient(180deg,#0d1018 0%,#06070b 100%)",
    cardBackground: "linear-gradient(110deg,rgba(13,29,44,.97),rgba(22,17,21,.97) 52%,rgba(44,22,16,.97))",
    ambientOverlay: "radial-gradient(circle at 12% 60%, rgba(112,216,255,.42), transparent 26%), radial-gradient(circle at 88% 40%, rgba(255,104,72,.42), transparent 26%)",
    ambientOpacity: 0.045,
    ambientAnimation: "drift",
  },
];
