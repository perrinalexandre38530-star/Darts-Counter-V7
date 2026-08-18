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
  // Matière/finition pour les packs immersifs Boutique.
  textureOverlay?: string;
  textureOpacity?: number;
  textureBlendMode?: "normal" | "soft-light" | "overlay" | "screen" | "multiply";
  surfaceSheen?: string;
  surfaceShadow?: string;
  navBackground?: string;
  buttonBackground?: string;
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
  // Boutique · ARENAS & AMBIANCES V2
  // Chaque univers change la matière, la lumière et le relief de l'app.
  // Les textures restent 100 % CSS pour être légères et offline.
  // --------------------------------------------
  {
    id: "arenaDartsPub",
    name: "Darts Pub",
    primary: "#FFC35A",
    bg: "#0C0806",
    card: "#21150D",
    text: "#FFF7E8",
    textSoft: "rgba(245,224,194,0.80)",
    accent1: "#C97A2C",
    accent2: "#62D57B",
    borderSoft: "rgba(255,195,90,0.42)",
    success: "#62D57B",
    danger: "#FF655A",
    pageBackground: "radial-gradient(720px 310px at 50% -4%, rgba(255,195,90,.34), transparent 62%), radial-gradient(420px 300px at 96% 18%, rgba(38,120,61,.19), transparent 70%), repeating-linear-gradient(0deg, rgba(121,69,32,.34) 0 2px, rgba(43,24,13,.10) 2px 44px), linear-gradient(180deg,#1B1008 0%,#0E0907 48%,#070606 100%)",
    cardBackground: "repeating-linear-gradient(96deg, rgba(255,203,126,.035) 0 1px, transparent 1px 9px), linear-gradient(145deg,rgba(67,39,20,.96),rgba(26,16,11,.98) 58%,rgba(13,10,9,.99))",
    ambientOverlay: "radial-gradient(circle at 17% 12%, rgba(255,192,92,.64), transparent 20%), radial-gradient(circle at 84% 28%, rgba(85,210,118,.28), transparent 19%)",
    ambientOpacity: 0.075,
    ambientAnimation: "pulse",
    textureOverlay: "repeating-radial-gradient(ellipse at 15% 45%, rgba(255,218,161,.13) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(75,37,15,.20) 0 1px, transparent 1px 62px)",
    textureOpacity: 0.24,
    textureBlendMode: "soft-light",
    surfaceSheen: "linear-gradient(115deg, transparent 12%, rgba(255,241,203,.12) 34%, transparent 52%)",
    surfaceShadow: "0 18px 38px rgba(0,0,0,.55), 0 0 24px rgba(255,180,67,.16), inset 0 1px 0 rgba(255,226,166,.13)",
    navBackground: "linear-gradient(180deg,rgba(39,23,14,.90),rgba(10,8,7,.97)), repeating-linear-gradient(90deg,rgba(255,210,140,.025) 0 1px,transparent 1px 10px)",
    buttonBackground: "linear-gradient(135deg,#FFC35A,#C9802D 62%,#8C4F20)",
  },
  {
    id: "arenaChampionship",
    name: "Championship Arena",
    primary: "#FF3B4F",
    bg: "#070609",
    card: "#1A0D13",
    text: "#FFF7F8",
    textSoft: "rgba(244,215,219,0.80)",
    accent1: "#FF3B4F",
    accent2: "#FFD55F",
    borderSoft: "rgba(255,59,79,0.44)",
    success: "#38E38A",
    danger: "#FF3B4F",
    pageBackground: "linear-gradient(112deg, transparent 0 36%, rgba(255,255,255,.08) 42%, transparent 48%), radial-gradient(520px 460px at 8% -12%, rgba(255,45,64,.34), transparent 62%), radial-gradient(520px 460px at 92% -12%, rgba(255,216,92,.18), transparent 64%), linear-gradient(180deg,#18070D 0%,#0A070B 58%,#040406 100%)",
    cardBackground: "linear-gradient(118deg,rgba(255,255,255,.055),transparent 20% 72%,rgba(255,59,79,.10)), linear-gradient(155deg,rgba(56,17,26,.97),rgba(18,10,14,.99))",
    ambientOverlay: "linear-gradient(116deg, transparent 28%, rgba(255,255,255,.50) 47%, transparent 60%), radial-gradient(circle at 9% 20%,rgba(255,48,69,.44),transparent 22%)",
    ambientOpacity: 0.060,
    ambientAnimation: "scan",
    textureOverlay: "repeating-linear-gradient(45deg,rgba(255,255,255,.040) 0 1px,transparent 1px 8px), repeating-linear-gradient(-45deg,rgba(255,59,79,.035) 0 1px,transparent 1px 8px)",
    textureOpacity: 0.20,
    textureBlendMode: "overlay",
    surfaceSheen: "linear-gradient(110deg,transparent 8%,rgba(255,255,255,.18) 31%,transparent 43%)",
    surfaceShadow: "0 20px 42px rgba(0,0,0,.58), 0 0 28px rgba(255,48,68,.20), inset 0 1px 0 rgba(255,255,255,.10)",
    navBackground: "linear-gradient(180deg,rgba(29,9,14,.94),rgba(6,5,7,.98))",
    buttonBackground: "linear-gradient(135deg,#FF5364,#D91F38 62%,#8C1020)",
  },
  {
    id: "arenaCyber",
    name: "Cyber Arena",
    primary: "#20E7FF",
    bg: "#020612",
    card: "#07162B",
    text: "#ECFDFF",
    textSoft: "rgba(190,236,244,0.82)",
    accent1: "#20E7FF",
    accent2: "#F347FF",
    borderSoft: "rgba(32,231,255,0.48)",
    success: "#39F29D",
    danger: "#FF4D7A",
    pageBackground: "radial-gradient(700px 430px at 10% -2%, rgba(32,231,255,.27), transparent 61%), radial-gradient(620px 430px at 96% 15%, rgba(243,71,255,.24), transparent 58%), repeating-linear-gradient(90deg,rgba(32,231,255,.045) 0 1px,transparent 1px 54px), repeating-linear-gradient(0deg,rgba(243,71,255,.035) 0 1px,transparent 1px 54px), linear-gradient(180deg,#07142C 0%,#020713 100%)",
    cardBackground: "linear-gradient(130deg,rgba(32,231,255,.075),transparent 38%,rgba(243,71,255,.065)), repeating-linear-gradient(90deg,rgba(59,238,255,.035) 0 1px,transparent 1px 18px), linear-gradient(145deg,rgba(8,35,66,.97),rgba(5,10,28,.99))",
    ambientOverlay: "linear-gradient(90deg,transparent 0 42%,rgba(32,231,255,.42) 48%,transparent 54%), radial-gradient(circle at 82% 26%,rgba(243,71,255,.40),transparent 22%)",
    ambientOpacity: 0.060,
    ambientAnimation: "drift",
    textureOverlay: "repeating-linear-gradient(90deg,rgba(32,231,255,.13) 0 1px,transparent 1px 44px), repeating-linear-gradient(0deg,rgba(243,71,255,.10) 0 1px,transparent 1px 44px), linear-gradient(135deg,transparent 46%,rgba(255,255,255,.05) 47% 48%,transparent 49%)",
    textureOpacity: 0.20,
    textureBlendMode: "screen",
    surfaceSheen: "linear-gradient(112deg,transparent 18%,rgba(160,249,255,.20) 38%,transparent 48%)",
    surfaceShadow: "0 20px 46px rgba(0,0,0,.60), 0 0 28px rgba(32,231,255,.21), 0 0 48px rgba(243,71,255,.11), inset 0 1px 0 rgba(159,248,255,.12)",
    navBackground: "linear-gradient(180deg,rgba(5,24,45,.92),rgba(2,6,18,.98))",
    buttonBackground: "linear-gradient(135deg,#20E7FF,#50B4FF 50%,#F347FF)",
  },
  {
    id: "arenaStreet",
    name: "Street Sport",
    primary: "#B0FF43",
    bg: "#090A0A",
    card: "#171918",
    text: "#F7FAF2",
    textSoft: "rgba(218,224,210,0.78)",
    accent1: "#B0FF43",
    accent2: "#FF8A34",
    borderSoft: "rgba(176,255,67,0.40)",
    success: "#60E66B",
    danger: "#FF664F",
    pageBackground: "radial-gradient(circle at 8% 18%,rgba(176,255,67,.20),transparent 22%), radial-gradient(circle at 92% 14%,rgba(255,138,52,.15),transparent 24%), radial-gradient(circle at 20% 70%,rgba(255,255,255,.020) 0 1px,transparent 1.6px) 0 0/7px 7px, linear-gradient(168deg,#1A1D1B 0%,#101211 42%,#070808 100%)",
    cardBackground: "radial-gradient(circle at 20% 30%,rgba(255,255,255,.045) 0 1px,transparent 1.6px) 0 0/8px 8px, linear-gradient(145deg,rgba(36,40,38,.98),rgba(15,17,17,.99))",
    ambientOverlay: "linear-gradient(16deg,transparent 0 70%,rgba(176,255,67,.20) 71% 75%,transparent 76%), radial-gradient(circle at 88% 25%,rgba(255,138,52,.34),transparent 20%)",
    ambientOpacity: 0.065,
    ambientAnimation: "drift",
    textureOverlay: "repeating-linear-gradient(165deg,rgba(255,255,255,.035) 0 1px,transparent 1px 14px), radial-gradient(circle at 50% 50%,rgba(255,255,255,.08) 0 1px,transparent 1.5px) 0 0/11px 11px",
    textureOpacity: 0.20,
    textureBlendMode: "soft-light",
    surfaceSheen: "linear-gradient(125deg,transparent 20%,rgba(255,255,255,.07) 36%,transparent 52%)",
    surfaceShadow: "0 18px 38px rgba(0,0,0,.58), 0 0 22px rgba(176,255,67,.12), inset 0 1px 0 rgba(255,255,255,.08)",
    navBackground: "linear-gradient(180deg,rgba(27,30,29,.94),rgba(8,9,9,.98))",
    buttonBackground: "linear-gradient(135deg,#B0FF43,#72D92A 64%,#3A8E22)",
  },
  {
    id: "arenaStadiumNight",
    name: "Stadium Night",
    primary: "#5EB2FF",
    bg: "#030814",
    card: "#09182D",
    text: "#F2F8FF",
    textSoft: "rgba(202,220,244,0.82)",
    accent1: "#5EB2FF",
    accent2: "#EAF5FF",
    borderSoft: "rgba(94,178,255,0.44)",
    success: "#42DF8B",
    danger: "#FF5D67",
    pageBackground: "linear-gradient(76deg,transparent 34%,rgba(224,242,255,.12) 43%,transparent 51%), linear-gradient(104deg,transparent 36%,rgba(94,178,255,.15) 46%,transparent 56%), radial-gradient(420px 540px at 6% -10%,rgba(224,242,255,.24),transparent 62%), radial-gradient(420px 540px at 94% -10%,rgba(64,154,255,.30),transparent 62%), radial-gradient(circle,rgba(145,197,255,.13) 0 1px,transparent 1.6px) 0 86%/11px 8px, linear-gradient(180deg,#0C1D3B 0%,#050C1D 66%,#02040B 100%)",
    cardBackground: "linear-gradient(145deg,rgba(17,45,80,.98),rgba(7,15,31,.99)), radial-gradient(circle,rgba(255,255,255,.05) 0 1px,transparent 1.5px) 0 0/10px 10px",
    ambientOverlay: "linear-gradient(72deg, transparent 33%, rgba(255,255,255,.35) 45%, transparent 55%), linear-gradient(108deg, transparent 36%, rgba(94,178,255,.38) 47%, transparent 58%)",
    ambientOpacity: 0.066,
    ambientAnimation: "pulse",
    textureOverlay: "radial-gradient(circle,rgba(200,230,255,.16) 0 1px,transparent 1.5px) 0 0/12px 9px, repeating-linear-gradient(90deg,rgba(94,178,255,.035) 0 1px,transparent 1px 38px)",
    textureOpacity: 0.17,
    textureBlendMode: "screen",
    surfaceSheen: "linear-gradient(112deg,transparent 10%,rgba(239,249,255,.19) 32%,transparent 46%)",
    surfaceShadow: "0 20px 46px rgba(0,0,0,.60), 0 0 28px rgba(80,165,255,.19), inset 0 1px 0 rgba(239,249,255,.12)",
    navBackground: "linear-gradient(180deg,rgba(11,31,57,.94),rgba(3,8,20,.98))",
    buttonBackground: "linear-gradient(135deg,#EAF5FF,#79C6FF 42%,#357FEF)",
  },
  {
    id: "arenaLuxuryClub",
    name: "Luxury Club",
    primary: "#EBCB75",
    bg: "#050505",
    card: "#11100E",
    text: "#FFF9EA",
    textSoft: "rgba(229,217,191,0.80)",
    accent1: "#EBCB75",
    accent2: "#FFF0B8",
    borderSoft: "rgba(235,203,117,0.42)",
    success: "#4FD08B",
    danger: "#E35B61",
    pageBackground: "radial-gradient(760px 380px at 50% -8%,rgba(235,203,117,.26),transparent 60%), linear-gradient(115deg,transparent 0 42%,rgba(255,255,255,.025) 43% 47%,transparent 48%), repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 2px,transparent 2px 8px), linear-gradient(180deg,#15130F 0%,#080807 56%,#030303 100%)",
    cardBackground: "linear-gradient(135deg,rgba(255,240,184,.045),transparent 34%), repeating-linear-gradient(45deg,rgba(255,255,255,.026) 0 2px,transparent 2px 7px), repeating-linear-gradient(-45deg,rgba(0,0,0,.16) 0 2px,transparent 2px 7px), linear-gradient(145deg,rgba(34,31,24,.99),rgba(11,11,10,.99))",
    ambientOverlay: "radial-gradient(circle at 50% 10%,rgba(255,239,180,.46),transparent 23%), linear-gradient(115deg,transparent 38%,rgba(255,255,255,.24) 49%,transparent 59%)",
    ambientOpacity: 0.054,
    ambientAnimation: "pulse",
    textureOverlay: "repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 2px,transparent 2px 8px), repeating-linear-gradient(-45deg,rgba(0,0,0,.22) 0 2px,transparent 2px 8px)",
    textureOpacity: 0.18,
    textureBlendMode: "soft-light",
    surfaceSheen: "linear-gradient(112deg,transparent 16%,rgba(255,247,215,.21) 36%,transparent 48%)",
    surfaceShadow: "0 22px 48px rgba(0,0,0,.66), 0 0 25px rgba(235,203,117,.17), inset 0 1px 0 rgba(255,244,204,.14)",
    navBackground: "linear-gradient(180deg,rgba(28,25,19,.96),rgba(5,5,5,.99))",
    buttonBackground: "linear-gradient(135deg,#FFF0B8,#EBCB75 52%,#9D742E)",
  },
  {
    id: "arenaRetroArcade",
    name: "Retro Arcade",
    primary: "#FF4FD8",
    bg: "#070313",
    card: "#170729",
    text: "#FFF1FE",
    textSoft: "rgba(231,207,247,0.82)",
    accent1: "#FF4FD8",
    accent2: "#35E8FF",
    borderSoft: "rgba(255,79,216,0.46)",
    success: "#45F49A",
    danger: "#FF5576",
    pageBackground: "radial-gradient(680px 360px at 50% -1%,rgba(255,79,216,.28),transparent 58%), linear-gradient(180deg,transparent 54%,rgba(11,3,30,.22) 55%), repeating-linear-gradient(90deg,rgba(53,232,255,.065) 0 1px,transparent 1px 34px), repeating-linear-gradient(0deg,rgba(255,79,216,.055) 0 1px,transparent 1px 34px), linear-gradient(180deg,#1B0632 0%,#0A0419 62%,#030208 100%)",
    cardBackground: "linear-gradient(135deg,rgba(255,79,216,.10),transparent 40%,rgba(53,232,255,.07)), repeating-linear-gradient(0deg,rgba(255,255,255,.028) 0 1px,transparent 1px 5px), linear-gradient(145deg,rgba(49,13,69,.98),rgba(13,7,29,.99))",
    ambientOverlay: "linear-gradient(90deg,transparent 0 45%,rgba(53,232,255,.36) 49%,transparent 53%), radial-gradient(circle at 50% 14%,rgba(255,79,216,.40),transparent 21%)",
    ambientOpacity: 0.060,
    ambientAnimation: "scan",
    textureOverlay: "repeating-linear-gradient(0deg,rgba(53,232,255,.16) 0 1px,transparent 1px 31px), repeating-linear-gradient(90deg,rgba(255,79,216,.14) 0 1px,transparent 1px 31px), repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px)",
    textureOpacity: 0.20,
    textureBlendMode: "screen",
    surfaceSheen: "linear-gradient(112deg,transparent 15%,rgba(255,187,245,.22) 36%,transparent 48%)",
    surfaceShadow: "0 20px 44px rgba(0,0,0,.62), 0 0 30px rgba(255,79,216,.20), 0 0 44px rgba(53,232,255,.10), inset 0 1px 0 rgba(255,179,239,.12)",
    navBackground: "linear-gradient(180deg,rgba(32,7,46,.94),rgba(5,3,13,.99))",
    buttonBackground: "linear-gradient(135deg,#FF4FD8,#B52CFF 52%,#35E8FF)",
  },
  {
    id: "arenaFireIce",
    name: "Fire & Ice",
    primary: "#78DDFF",
    bg: "#05070D",
    card: "#10151D",
    text: "#F8FBFF",
    textSoft: "rgba(218,228,241,0.82)",
    accent1: "#78DDFF",
    accent2: "#FF6848",
    borderSoft: "rgba(120,221,255,0.44)",
    success: "#55E095",
    danger: "#FF6848",
    pageBackground: "radial-gradient(650px 500px at -8% 15%,rgba(49,178,255,.38),transparent 61%), radial-gradient(650px 500px at 108% 18%,rgba(255,91,50,.36),transparent 61%), linear-gradient(118deg,rgba(120,221,255,.055) 0 18%,transparent 18% 64%,rgba(255,104,72,.055) 64% 82%,transparent 82%), linear-gradient(180deg,#0D1722 0%,#0A0A10 52%,#130A08 100%)",
    cardBackground: "linear-gradient(110deg,rgba(18,48,69,.98),rgba(20,20,26,.98) 48%,rgba(63,28,20,.98)), linear-gradient(135deg,rgba(255,255,255,.05),transparent 36%)",
    ambientOverlay: "radial-gradient(circle at 12% 60%,rgba(120,221,255,.52),transparent 24%), radial-gradient(circle at 88% 40%,rgba(255,104,72,.50),transparent 24%)",
    ambientOpacity: 0.070,
    ambientAnimation: "drift",
    textureOverlay: "repeating-linear-gradient(135deg,rgba(177,237,255,.10) 0 1px,transparent 1px 18px), repeating-linear-gradient(45deg,rgba(255,144,109,.08) 0 1px,transparent 1px 21px)",
    textureOpacity: 0.18,
    textureBlendMode: "screen",
    surfaceSheen: "linear-gradient(110deg,rgba(194,245,255,.16),transparent 38%,rgba(255,171,143,.14) 70%,transparent)",
    surfaceShadow: "0 20px 46px rgba(0,0,0,.62), -12px 0 30px rgba(72,189,255,.12), 12px 0 30px rgba(255,95,57,.12), inset 0 1px 0 rgba(255,255,255,.10)",
    navBackground: "linear-gradient(90deg,rgba(8,34,50,.96),rgba(10,10,15,.98) 50%,rgba(52,21,15,.96))",
    buttonBackground: "linear-gradient(90deg,#78DDFF,#D9F6FF 46%,#FFD2C5 54%,#FF6848)",
  },
];
