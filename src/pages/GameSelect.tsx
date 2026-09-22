// ============================================
// src/pages/GameSelect.tsx
// Hub de sélection de jeu (sans BottomNav)
// - ✅ Texte: "Choisis ton sport"
// - ✅ Affiche 1 sport à la fois (logo plus gros)
// - ✅ Swipe horizontal (doigt) pour défiler sport par sport
// - ✅ Clic sur le sport courant => route principale (avec BottomNav)
// - ✅ FIX: setSport() pour MAJ immédiate (même onglet)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useSport } from "../contexts/SportContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { useDevMode } from "../contexts/DevModeContext";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";
import { appSportMeta, isAppSportEnabled } from "../config/sportCatalog";

// IMPORTANT: ajuste les chemins si tu places ailleurs
import logoDarts from "../assets/games/logo-darts.webp";
import logoPetanque from "../assets/games/logo-petanque.webp";
import logoPingPong from "../assets/games/logo-pingpong.webp";
import logoBabyFoot from "../assets/games/logo-babyfoot.webp";
import logoRunning from "../assets/games/logo-running-performance.webp";
import logoFitPerf from "../assets/games/logo-fit-performance.webp";
import logoEsports from "../assets/games/logo-esports.webp";

// ✅ Sports à venir (affichés en SOON dans le GameSelect)
import logoArchery from "../assets/games/logo-archery.webp";
import logoMolkky from "../assets/games/logo-molkky.webp";
import logoPadel from "../assets/games/logo-padel.webp";
import logoPickleball from "../assets/games/logo-pickleball.webp";
import logoFrisbee from "../assets/games/logo-frisbee.webp";
import logoBillard from "../assets/games/logo-billard.webp";
import logoBadminton from "../assets/games/logo-badminton.webp";
import logoBasket from "../assets/games/logo-basket.webp";
import logoCornhole from "../assets/games/logo-cornhole.webp";
import logoDiceGame from "../assets/games/logo-dicegame.webp";
import logoFoot from "../assets/games/logo-foot.webp";
import logoRugby from "../assets/games/logo-rugby.webp";
import logoVolley from "../assets/games/logo-volley.webp";
import logoTennis from "../assets/games/logo-tennis.webp";
import logoChess from "../assets/games/logo-chess.webp";

// Icônes monochromes dédiées aux bandes du GameSelect.
// Elles sont utilisées comme masques CSS : la couleur vient donc du thème/currentColor.
import showcaseBabyFootIcon from "../assets/game-select-icons/babyfoot.ico";
import showcaseBadmintonIcon from "../assets/game-select-icons/badminton.ico";
import showcaseBasketIcon from "../assets/game-select-icons/basket.ico";
import showcaseBillardIcon from "../assets/game-select-icons/billard.ico";
import showcaseChessIcon from "../assets/game-select-icons/chess.ico";
import showcaseCornholeIcon from "../assets/game-select-icons/cornhole.ico";
import showcaseDartsIcon from "../assets/game-select-icons/darts.ico";
import showcaseDiceGameIcon from "../assets/game-select-icons/dicegame.ico";
import showcaseFootIcon from "../assets/game-select-icons/foot.ico";
import showcaseFrisbeeIcon from "../assets/game-select-icons/frisbee.ico";
import showcaseMolkkyIcon from "../assets/game-select-icons/molkky.ico";
import showcasePadelIcon from "../assets/game-select-icons/padel.ico";
import showcaseArcheryIcon from "../assets/game-select-icons/archery.ico";
import showcaseEsportsIcon from "../assets/game-select-icons/esports.ico";
import showcasePetanqueIcon from "../assets/game-select-icons/petanque.ico";
import showcasePickleballIcon from "../assets/game-select-icons/pickleball.ico";
import showcasePingPongIcon from "../assets/game-select-icons/pingpong.ico";
import showcaseRugbyIcon from "../assets/game-select-icons/rugby.ico";
import showcaseRunningIcon from "../assets/game-select-icons/running.ico";
import showcaseTennisIcon from "../assets/game-select-icons/tennis.ico";
import showcaseVolleyIcon from "../assets/game-select-icons/volley.ico";

type Props = {
  go: (route: any) => void;
};

type GameId =
  | "darts"
  | "petanque"
  | "pingpong"
  | "babyfoot"
  | "running"
  | "fit"
  | "esports"
  | "archery"
  | "molkky"
  | "padel"
  | "pickleball"
  | "frisbee"
  | "billard"
  | "badminton"
  | "basket"
  | "cornhole"
  | "dicegame"
  | "foot"
  | "rugby"
  | "volley"
  | "tennis"
  | "chess";

// Les deux bandes donnent une vue immédiate du catalogue complet :
// 22 disciplines, réparties en 11 pictogrammes en haut et 11 en bas,
// triés alphabétiquement, sans scroll et sans débordement sur mobile.
type ShowcaseSportId = GameId;

const SPORT_SHOWCASE: ReadonlyArray<{ id: ShowcaseSportId; label: string }> = [
  { id: "archery", label: "Tir à l'arc" },
  { id: "babyfoot", label: "Baby-Foot" },
  { id: "badminton", label: "Badminton" },
  { id: "basket", label: "Basket" },
  { id: "billard", label: "Billard" },
  { id: "chess", label: "Échecs" },
  { id: "cornhole", label: "Cornhole" },
  { id: "darts", label: "Darts" },
  { id: "dicegame", label: "Dice Game" },
  { id: "esports", label: "E-SPORTS HUB" },
  { id: "fit", label: "FIT PERF" },
  { id: "foot", label: "Foot" },
  { id: "frisbee", label: "Frisbee" },
  { id: "molkky", label: "Mölkky" },
  { id: "padel", label: "Padel" },
  { id: "petanque", label: "Pétanque" },
  { id: "pickleball", label: "Pickleball" },
  { id: "pingpong", label: "Ping-Pong" },
  { id: "rugby", label: "Rugby" },
  { id: "running", label: "Running Performance" },
  { id: "tennis", label: "Tennis" },
  { id: "volley", label: "Volley" },
].sort((a, b) => a.label.localeCompare(b.label, "fr"));

const SPORT_SHOWCASE_TOP = SPORT_SHOWCASE.slice(0, 11);
const SPORT_SHOWCASE_BOTTOM = SPORT_SHOWCASE.slice(11, 22);

function SportShowcaseBand({
  sports,
  activeId,
  theme,
}: {
  sports: ReadonlyArray<{ id: ShowcaseSportId; label: string }>;
  activeId: GameId;
  theme: any;
}) {
  return (
    <div className="msc-game-select-showcase" style={sportShowcaseBandStyle} aria-hidden="true">
      {sports.map((sport) => {
        const active = sport.id === activeId;
        const accent = appSportMeta(sport.id as any)?.accent || theme?.accent || theme?.primary || "#ffffff";
        return (
          <span key={sport.id} style={sportShowcaseCell(accent, active)}>
            <SportShowcaseIcon id={sport.id} />
          </span>
        );
      })}
    </div>
  );
}

function SportShowcaseIcon({ id }: { id: ShowcaseSportId }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
      {children}
    </svg>
  );

  switch (id) {
    case "babyfoot":
      return <ShowcaseMaskedIcon src={showcaseBabyFootIcon} />;
    case "badminton":
      return <ShowcaseMaskedIcon src={showcaseBadmintonIcon} />;
    case "basket":
      return <ShowcaseMaskedIcon src={showcaseBasketIcon} />;
    case "billard":
      return <ShowcaseMaskedIcon src={showcaseBillardIcon} />;
    case "cornhole":
      return <ShowcaseMaskedIcon src={showcaseCornholeIcon} />;
    case "darts":
      return <ShowcaseMaskedIcon src={showcaseDartsIcon} />;
    case "dicegame":
      return <ShowcaseMaskedIcon src={showcaseDiceGameIcon} />;
    case "esports":
      return <ShowcaseMaskedIcon src={showcaseEsportsIcon} />;
    case "chess":
      return <ShowcaseMaskedIcon src={showcaseChessIcon} />;
    case "fit":
      return svg(<>
        <path {...p} d="M3 9v6M6 7v10M9 10h6M18 7v10M21 9v6" />
      </>);
    case "foot":
      return <ShowcaseMaskedIcon src={showcaseFootIcon} />;
    case "frisbee":
      return <ShowcaseMaskedIcon src={showcaseFrisbeeIcon} />;
    case "molkky":
      return <ShowcaseMaskedIcon src={showcaseMolkkyIcon} />;
    case "padel":
      return <ShowcaseMaskedIcon src={showcasePadelIcon} />;
    case "petanque":
      return <ShowcaseMaskedIcon src={showcasePetanqueIcon} />;
    case "pickleball":
      return <ShowcaseMaskedIcon src={showcasePickleballIcon} />;
    case "pingpong":
      return <ShowcaseMaskedIcon src={showcasePingPongIcon} />;
    case "rugby":
      return <ShowcaseMaskedIcon src={showcaseRugbyIcon} />;
    case "running":
      return <ShowcaseMaskedIcon src={showcaseRunningIcon} />;
    case "tennis":
      return <ShowcaseMaskedIcon src={showcaseTennisIcon} />;
    case "archery":
      return <ShowcaseMaskedIcon src={showcaseArcheryIcon} />;
    case "volley":
      return <ShowcaseMaskedIcon src={showcaseVolleyIcon} />;
    default:
      return null;
  }
}

function ShowcaseMaskedIcon({ src }: { src: string }) {
  return (
    <span
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

const sportShowcaseBandStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 680,
  display: "grid",
  gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
  alignItems: "center",
  justifyItems: "center",
  gap: "clamp(1px, 0.55vw, 6px)",
  padding: "2px 0",
  overflow: "hidden",
  pointerEvents: "none",
};

function sportShowcaseCell(accent: string, active: boolean): React.CSSProperties {
  return {
    width: "clamp(16px, 5.3vw, 28px)",
    height: "clamp(16px, 5.3vw, 28px)",
    display: "grid",
    placeItems: "center",
    color: active ? accent : "rgba(220,230,238,0.42)",
    opacity: active ? 1 : 0.82,
    filter: active ? `drop-shadow(0 0 6px ${accent})` : "none",
    transform: active ? "scale(1.1)" : "scale(1)",
    transition: "color 150ms ease, opacity 150ms ease, transform 150ms ease, filter 150ms ease",
  };
}

// Même catalogue que le sélecteur de langue principal de l'application.
// Le GameSelect doit proposer TOUTES les langues prises en charge, sans code texte
// visible : uniquement le drapeau, avec le nom conservé pour l'accessibilité.
const GAME_SELECT_LANG_OPTIONS: ReadonlyArray<{ code: Lang; label: string; flag: string }> = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "is", label: "Íslenska", flag: "🇮🇸" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "sr", label: "Српски", flag: "🇷🇸" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
];

function localizedSportLabel(id: GameId, lang: Lang): string {
  const code = String(lang || "fr").toLowerCase().split("-")[0] as Lang;
  const byLang: Record<GameId, { fr: string; en: string; es: string }> = {
    archery: { fr: "Tir à l'arc", en: "Archery", es: "Tiro con arco" },
    babyfoot: { fr: "Baby-Foot", en: "Foosball", es: "Futbolín" },
    badminton: { fr: "Badminton", en: "Badminton", es: "Bádminton" },
    basket: { fr: "Basket", en: "Basketball", es: "Baloncesto" },
    billard: { fr: "Billard", en: "Billiards", es: "Billar" },
    chess: { fr: "Échecs", en: "Chess", es: "Ajedrez" },
    cornhole: { fr: "Cornhole", en: "Cornhole", es: "Cornhole" },
    darts: { fr: "Darts Scoring", en: "Darts Scoring", es: "Darts Scoring" },
    dicegame: { fr: "Dice Game", en: "Dice Game", es: "Juego de Dados" },
    esports: { fr: "E-SPORTS HUB", en: "E-SPORTS HUB", es: "E-SPORTS HUB" },
    fit: { fr: "FIT PERF", en: "FIT PERF", es: "FIT PERF" },
    foot: { fr: "Foot", en: "Football", es: "Fútbol" },
    frisbee: { fr: "Frisbee", en: "Frisbee", es: "Frisbee" },
    molkky: { fr: "Mölkky", en: "Mölkky", es: "Mölkky" },
    padel: { fr: "Padel", en: "Padel", es: "Pádel" },
    petanque: { fr: "Pétanque Scoring", en: "Petanque Scoring", es: "Petanca Scoring" },
    pickleball: { fr: "Pickleball", en: "Pickleball", es: "Pickleball" },
    pingpong: { fr: "Ping-Pong Scoring", en: "Table Tennis Scoring", es: "Ping-Pong Scoring" },
    rugby: { fr: "Rugby", en: "Rugby", es: "Rugby" },
    running: { fr: "RUNNING PERF", en: "RUNNING PERF", es: "RUNNING PERF" },
    tennis: { fr: "Tennis", en: "Tennis", es: "Tenis" },
    volley: { fr: "Volley", en: "Volleyball", es: "Voleibol" },
  };
  const entry = byLang[id];
  if (!entry) return id;
  if (code === "en") return entry.en;
  if (code === "es") return entry.es;
  return entry.fr;
}

function localizedChoiceTitle(lang: Lang): string {
  if (lang === "en") return "Choose your sport";
  if (lang === "es") return "Elige tu deporte";
  return "Choisis ton sport";
}

function localizedChoiceSubtitle(lang: Lang): string {
  if (lang === "en") return "Swipe or tap an icon";
  if (lang === "es") return "Desliza o toca un icono";
  return "Fais défiler ou touche une icône";
}


function LanguageFlag({ code }: { code: Lang }) {
  const normalized = String(code || "fr").toLowerCase().split("-")[0] as Lang;
  const option = GAME_SELECT_LANG_OPTIONS.find((entry) => entry.code === normalized) || GAME_SELECT_LANG_OPTIONS[0];
  return (
    <span
      aria-hidden="true"
      className="msc-game-select-flag"
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 30,
        minWidth: 30,
        height: 22,
        lineHeight: 1,
        fontSize: 24,
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,.38))",
      }}
    >
      {option.flag}
    </span>
  );
}


export default function GameSelect({ go }: Props) {
  const { theme } = useTheme();
  const { setSport } = useSport();
  const { lang, setLang } = useLang() as any;
  const dev = useDevMode() as any;
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const langDockRef = React.useRef<HTMLDivElement | null>(null);

  // Desktop détecté (souris / trackpad) => on ajoute des contrôles visibles
  const isDesktop = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const mq1 = window.matchMedia?.("(hover: hover)");
    const mq2 = window.matchMedia?.("(pointer: fine)");
    return Boolean(mq1?.matches && mq2?.matches);
  }, []);

  React.useEffect(() => {
    if (!showLangMenu) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && langDockRef.current && !langDockRef.current.contains(target)) setShowLangMenu(false);
    };
    window.addEventListener("mousedown", onPointerDown as EventListener);
    window.addEventListener("touchstart", onPointerDown as EventListener, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onPointerDown as EventListener);
      window.removeEventListener("touchstart", onPointerDown as EventListener);
    };
  }, [showLangMenu]);

  // ✅ routes d'entrée (BottomNav)
  // - Darts: on garde le dashboard "Home"
  // - FOOT ouvre la Home commune FOOT SCORING, comme Darts/Pétanque/Baby-foot côté accueil
  const HOME_ROUTE = "home";
  const GAMES_ROUTE = "games";

  const items: Array<{
    id: GameId;
    label: string;
    logo: string;
    enabled: boolean;
    onClick: () => void;
  }> = [
    {
      id: "darts",
      label: "Darts Scoring",
      logo: logoDarts,
      enabled: isAppSportEnabled("darts" as any),
      onClick: () => {
        setSport("darts");
        go(HOME_ROUTE);
      },
    },
    {
      id: "petanque",
      label: "Pétanque Scoring",
      logo: logoPetanque,
      enabled: isAppSportEnabled("petanque" as any),
      onClick: () => {
        setSport("petanque");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "pingpong",
      label: "Ping-Pong Scoring",
      logo: logoPingPong,
      enabled: isAppSportEnabled("pingpong" as any),
      onClick: () => {
        setSport("pingpong");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "babyfoot",
      label: "Baby-Foot Scoring",
      logo: logoBabyFoot,
      enabled: isAppSportEnabled("babyfoot" as any),
      onClick: () => {
        setSport("babyfoot");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "running",
      label: "Running Performance",
      logo: logoRunning,
      enabled: isAppSportEnabled("running" as any),
      onClick: () => {
        setSport("running");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "fit",
      label: "FIT PERF",
      logo: logoFitPerf,
      enabled: isAppSportEnabled("fit" as any),
      onClick: () => {
        setSport("fit");
        go(HOME_ROUTE);
      },
    },
    {
      id: "esports",
      label: "E-SPORTS HUB",
      logo: logoEsports,
      enabled: isAppSportEnabled("esports" as any),
      onClick: () => {
        setSport("esports");
        go(HOME_ROUTE);
      },
    },

    // ------------------------------
    // ✅ Sports à venir (SOON)
    // ------------------------------
    {
      id: "archery",
      label: "Tir à l'arc",
      logo: logoArchery,
      enabled: isAppSportEnabled("archery" as any),
      onClick: () => {},
    },
    {
      id: "molkky",
      label: "Mölkky",
      logo: logoMolkky,
      enabled: isAppSportEnabled("molkky" as any),
      onClick: () => {
        setSport("molkky");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "padel",
      label: "Padel",
      logo: logoPadel,
      enabled: isAppSportEnabled("padel" as any),
      onClick: () => {},
    },
    {
      id: "pickleball",
      label: "Pickleball",
      logo: logoPickleball,
      enabled: isAppSportEnabled("pickleball" as any),
      onClick: () => {},
    },
    {
      id: "frisbee",
      label: "Frisbee",
      logo: logoFrisbee,
      enabled: isAppSportEnabled("frisbee" as any),
      onClick: () => {},
    },
    {
      id: "billard",
      label: "Billard",
      logo: logoBillard,
      enabled: isAppSportEnabled("billard" as any),
      onClick: () => {},
    },
    {
      id: "badminton",
      label: "Badminton",
      logo: logoBadminton,
      enabled: isAppSportEnabled("badminton" as any),
      onClick: () => {},
    },
    {
      id: "basket",
      label: "Basket",
      logo: logoBasket,
      enabled: isAppSportEnabled("basket" as any),
      onClick: () => {},
    },
    {
      id: "cornhole",
      label: "Cornhole",
      logo: logoCornhole,
      enabled: isAppSportEnabled("cornhole" as any),
      onClick: () => {},
    },
    {
      id: "dicegame",
      label: "Dice Game",
      logo: logoDiceGame,
      enabled: isAppSportEnabled("dicegame" as any),
      onClick: () => {
        setSport("dicegame" as any);
        go(GAMES_ROUTE);
      },
    },
    {
      id: "foot",
      label: "FOOT",
      logo: logoFoot,
      enabled: isAppSportEnabled("foot" as any),
      onClick: () => {
        setSport("foot" as any);
        go(HOME_ROUTE);
      },
    },
    {
      id: "rugby",
      label: "Rugby",
      logo: logoRugby,
      enabled: isAppSportEnabled("rugby" as any),
      onClick: () => {},
    },
    {
      id: "volley",
      label: "Volley",
      logo: logoVolley,
      enabled: isAppSportEnabled("volley" as any),
      onClick: () => {},
    },
    {
      id: "tennis",
      label: "Tennis",
      logo: logoTennis,
      enabled: isAppSportEnabled("tennis" as any),
      onClick: () => {},
    },
    {
      id: "chess",
      label: "Échecs",
      logo: logoChess,
      enabled: isAppSportEnabled("chess" as any),
      onClick: () => {},
    },
  ];

  // ✅ TRI DEMANDÉ :
  // 1) sports disponibles d’abord
  // 2) sports grisés ensuite
  // 3) ordre alphabétique FR dans chaque groupe
  const sortedItems = React.useMemo(() => {
    // IMPORTANT : le GameSelect doit toujours conserver le catalogue complet.
    // On ne filtre donc plus les sports selon le runtime ici : les sports non
    // disponibles restent visibles (grisés / SOON), comme dans le GameSelect
    // historique. On trie seulement l'ordre d'affichage :
    //   1) sports actuellement débloqués / disponibles ;
    //   2) sports non disponibles ;
    //   3) ordre alphabétique localisé dans chacun des deux groupes.
    const copy = items.map((item) => ({
      ...item,
      label: localizedSportLabel(item.id as GameId, lang),
    }));

    copy.sort((a, b) => {
      const availabilityDelta = Number(Boolean(b.enabled)) - Number(Boolean(a.enabled));
      if (availabilityDelta !== 0) return availabilityDelta;
      return a.label.localeCompare(b.label, String(lang || "fr"), { sensitivity: "base" });
    });

    return copy;
  }, [items, lang]);

  const showcaseSports = React.useMemo(() => sortedItems.map((item) => ({ id: item.id as ShowcaseSportId, label: item.label })), [sortedItems]);
  const showcaseTop = React.useMemo(() => showcaseSports.slice(0, 11), [showcaseSports]);
  const showcaseBottom = React.useMemo(() => showcaseSports.slice(11, 22), [showcaseSports]);
  const currentLangOption = React.useMemo(() => GAME_SELECT_LANG_OPTIONS.find((option) => option.code === lang) || GAME_SELECT_LANG_OPTIONS[0], [lang]);

  // ------------------------------------------
  // Swipe (mobile / tablette)
  // ------------------------------------------
  const [index, setIndex] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);

  // Desktop drag (souris)
  const mouseDownRef = React.useRef<number | null>(null);

  const wrapIndex = React.useCallback(
    (i: number) => {
      const n = sortedItems.length || 1;
      return ((i % n) + n) % n;
    },
    [sortedItems.length]
  );

  const goPrev = React.useCallback(() => setIndex((i) => wrapIndex(i - 1)), [wrapIndex]);
  const goNext = React.useCallback(() => setIndex((i) => wrapIndex(i + 1)), [wrapIndex]);

  // ✅ si la taille change, on évite un index hors plage
  React.useEffect(() => {
    setIndex((i) => wrapIndex(i));
  }, [wrapIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? null;
    draggingRef.current = true;
  };

  const onTouchMove = () => {
    // On ne fait rien ici: on déclenche seulement au release.
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const startX = startXRef.current;
    startXRef.current = null;

    if (startX == null) return;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;

    // seuil volontairement franc pour éviter les faux positifs
    if (delta > 55) goPrev();
    else if (delta < -55) goNext();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    // clic gauche uniquement
    if (e.button !== 0) return;
    mouseDownRef.current = e.clientX;
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const startX = mouseDownRef.current;
    mouseDownRef.current = null;
    if (startX == null) return;
    const delta = e.clientX - startX;
    if (delta > 55) goPrev();
    else if (delta < -55) goNext();
  };

  // Desktop: flèches clavier (confort)
  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft") goPrev();
      if (ev.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const it = sortedItems[index];
  const visuallyDisabled = devVisuallyDisabled(!!it.enabled);
  const clickable = devClickable(!!it.enabled, !!dev?.enabled);

  return (
    <div className="msc-game-select-page" style={wrap(theme)}>
      <div className="msc-game-select-page-title" style={title(theme)}>{localizedChoiceTitle(lang)}</div>
      <div className="msc-game-select-topbar">
        <div ref={langDockRef} className="msc-game-select-lang-dock">
          <button
            type="button"
            className="msc-game-select-topbar-btn msc-game-select-lang-btn"
            aria-label={`Langue : ${currentLangOption.label}`}
            title={currentLangOption.label}
            onClick={(e) => {
              e.stopPropagation();
              setShowLangMenu((prev) => !prev);
            }}
          >
            <LanguageFlag code={currentLangOption.code} />
          </button>

          {showLangMenu ? (
            <div className="msc-game-select-lang-menu" onClick={(e) => e.stopPropagation()}>
              {GAME_SELECT_LANG_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`msc-game-select-lang-option${option.code === lang ? " is-active" : ""}`}
                  aria-label={option.label}
                  title={option.label}
                  aria-pressed={option.code === lang}
                  onClick={() => {
                    setLang(option.code);
                    setShowLangMenu(false);
                  }}
                >
                  <LanguageFlag code={option.code} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="msc-game-select-panel"
        style={panel(theme)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <SportShowcaseBand sports={showcaseTop} activeId={it.id} theme={theme} />



        <div className="msc-game-select-title msc-game-select-title-inline" style={title(theme)}>{localizedChoiceTitle(lang)}</div>
        <div className="msc-game-select-subtitle" style={subtitle(theme)}>{localizedChoiceSubtitle(lang)}</div>

        <div className="msc-game-select-hero">
          <button
            type="button"
            className="msc-game-select-hero-arrow"
            aria-label="Sport précédent"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <span aria-hidden="true">◀</span>
          </button>

          <button
            key={it.id}
            className="msc-game-select-tile"
            onClick={clickable ? it.onClick : undefined}
            style={sportTile(theme, !visuallyDisabled)}
            aria-disabled={!clickable}
            title={clickable ? "Ouvrir" : "Bientôt"}
          >
            <img className="msc-game-select-logo" src={it.logo} alt={it.label} style={sportImg(theme, !visuallyDisabled)} draggable={false} />
            <div className="msc-game-select-label" style={sportLabel(theme, !visuallyDisabled)}>{it.label}</div>
            {visuallyDisabled && <div style={soonPill(theme)}>SOON</div>}
          </button>

          <button
            type="button"
            className="msc-game-select-hero-arrow"
            aria-label="Sport suivant"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <span aria-hidden="true">▶</span>
          </button>
        </div>

        <div
          className="msc-game-select-landscape-nav"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            className="msc-game-select-landscape-icons"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, sortedItems.length)}, minmax(0, 1fr))` }}
          >
            {sortedItems.map((sport, sportIndex) => {
              const active = sportIndex === index;
              const accent = appSportMeta(sport.id as any)?.accent || theme?.accent || theme?.primary || "#ffffff";
              return (
                <button
                  key={sport.id}
                  type="button"
                  className="msc-game-select-landscape-icon"
                  aria-label={sport.label}
                  aria-current={active ? "true" : undefined}
                  title={sport.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(sportIndex);
                  }}
                  style={{
                    color: active ? accent : "rgba(220,230,238,0.40)",
                    filter: active ? `drop-shadow(0 0 6px ${accent})` : "none",
                  }}
                >
                  <SportShowcaseIcon id={sport.id as ShowcaseSportId} />
                </button>
              );
            })}
          </div>
        </div>

        <SportShowcaseBand sports={showcaseBottom} activeId={it.id} theme={theme} />

        <div className="msc-game-select-dots" style={dotsWrap}>
          {sortedItems.map((_, i) => (
            <span key={i} style={dot(theme, i === index)} />
          ))}
        </div>

        {/* Zones tactiles discrètes (utile tablette) */}
        <button className="msc-game-select-edge-tap" aria-label="Précédent" onClick={goPrev} style={edgeTap("left")} />
        <button className="msc-game-select-edge-tap" aria-label="Suivant" onClick={goNext} style={edgeTap("right")} />
      </div>
    </div>
  );
}

// ---------------- styles ----------------

function wrap(theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px 14px",
    background: theme.pageBackground || theme.bg || "#000",
    backgroundAttachment: theme.pageBackground ? "fixed" : undefined,
    backgroundPosition: "center top",
    backgroundSize: "cover",
    overflow: "hidden",
  };
}

function panel(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 680,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    position: "relative",
    padding: "18px 12px 10px",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "pan-y",
  };
}

function title(theme: any): React.CSSProperties {
  // Fond toujours sombre sur cet écran => on force un contraste.
  const accent =
    theme?.accent ||
    theme?.colors?.accent ||
    theme?.colors?.primary ||
    theme?.primary ||
    "#ffd200";

  // ✅ fallback sûr (évite un crash si une variable n'existe pas)
  const fallback = accent;

  return {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: theme?.accent1 || theme?.accent2 || fallback,
    textAlign: "center",
    padding: "0 6px",
  };
}

function subtitle(theme: any): React.CSSProperties {
  return {
    marginTop: -6,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.15,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  };
}

function sportTile(theme: any, enabled: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const bg = isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.03)";
  const glow = enabled ? (isDark ? "0 18px 60px rgba(0,0,0,0.65)" : "0 18px 60px rgba(0,0,0,0.22)") : "none";

  return {
    position: "relative",
    borderRadius: 28,
    border: `1px solid ${border}`,
    background: bg,
    boxShadow: glow,
    width: "min(520px, 92vw)",
    padding: "18px 14px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.55,
    transform: enabled ? "translateZ(0)" : "none",
  };
}

function sportImg(theme: any, enabled: boolean): React.CSSProperties {
  const size = "min(320px, 72vw)";
  const glow = enabled ? theme?.accentGlow ?? "0 0 0 rgba(0,0,0,0)" : "none";

  return {
    width: size,
    height: size,
    objectFit: "contain",
    filter: enabled ? "drop-shadow(0 10px 28px rgba(0,0,0,0.55))" : "grayscale(1)",
    boxShadow: glow,
    pointerEvents: "none",
  };
}

function sportLabel(theme: any, enabled: boolean): React.CSSProperties {
  // Fond toujours sombre sur cet écran => texte toujours clair.
  const accent =
    theme?.accent ||
    theme?.colors?.accent ||
    theme?.colors?.primary ||
    theme?.primary ||
    "#ffd200";

  // ✅ fallback sûr (évite un crash si une variable n'existe pas)
  const fallback = accent;

  return {
    fontSize: 18,
    fontWeight: 700,
    opacity: enabled ? 0.9 : 0.7,
    color: theme?.accent1 || theme?.accent2 || fallback,
    textAlign: "center",
    paddingBottom: 4,
    pointerEvents: "none",
  };
}

function navBtn(theme: any, side: "left" | "right"): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 52,
    height: 52,
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,0.16)`,
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 34,
    fontWeight: 900,
    lineHeight: "48px",
    textAlign: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
  };
  return side === "left" ? { ...base, left: 10 } : { ...base, right: 10 };
}

const dotsWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "2px 0 0",
};

function dot(theme: any, active: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const base = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
  const on = theme?.accent ?? (isDark ? "rgba(255,215,0,0.95)" : "rgba(0,0,0,0.70)");
  return {
    width: active ? 10 : 8,
    height: active ? 10 : 8,
    borderRadius: 999,
    background: active ? on : base,
    transition: "all 140ms ease",
  };
}

function soonPill(theme: any): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const bg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const fallback = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.78)";
  return {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    padding: "6px 10px",
    borderRadius: 999,
    background: bg,
    color: theme?.accent1 || theme?.accent2 || fallback,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
  };
}

function edgeTap(side: "left" | "right"): React.CSSProperties {
  const common: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "14%",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: 0,
    cursor: "default",
  };
  return side === "left" ? { ...common, left: 0 } : { ...common, right: 0 };
}
