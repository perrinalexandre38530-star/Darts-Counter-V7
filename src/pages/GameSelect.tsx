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
import { useDevMode } from "../contexts/DevModeContext";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";
import { filterSportsForCurrentRuntime } from "../config/androidStoreV1";
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
import logoArchery from "../assets/games/logo-archery.png";
import logoMolkky from "../assets/games/logo-molkky.png";
import logoPadel from "../assets/games/logo-padel.png";
import logoPickleball from "../assets/games/logo-pickleball.png";
import logoFrisbee from "../assets/games/logo-frisbee.png";
import logoBillard from "../assets/games/logo-billard.png";
import logoBadminton from "../assets/games/logo-badminton.png";
import logoBasket from "../assets/games/logo-basket.png";
import logoCornhole from "../assets/games/logo-cornhole.png";
import logoDiceGame from "../assets/games/logo-dicegame.webp";
import logoFoot from "../assets/games/logo-foot.png";
import logoRugby from "../assets/games/logo-rugby.png";
import logoVolley from "../assets/games/logo-volley.png";
import logoTennis from "../assets/games/logo-tennis.png";
import logoChess from "../assets/games/logo-chess.png";

// Icônes monochromes dédiées aux bandes du GameSelect.
// Elles sont utilisées comme masques CSS : la couleur vient donc du thème/currentColor.
import showcaseBabyFootIcon from "../assets/game-select-icons/babyfoot.ico";
import showcaseBadmintonIcon from "../assets/game-select-icons/badminton.ico";

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
    <div style={sportShowcaseBandStyle} aria-hidden="true">
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
      return svg(<>
        <circle {...p} cx="12" cy="12" r="8" /><path {...p} d="M4.6 9.2c4.4.3 8.3 4.2 9.8 10.2M9 4.6c.2 4.4 4.2 8.4 10.3 9.8M4.4 14.5c5.8-1.1 10.1-5.4 11.1-10.1M12 4v16" />
      </>);
    case "billard":
      return svg(<>
        <circle {...p} cx="9" cy="12" r="6.5" /><circle {...p} cx="9" cy="12" r="2.1" /><path {...p} d="M16 18 22 4" />
      </>);
    case "cornhole":
      return svg(<>
        <path {...p} d="m5 5 12-2 3 15-12 2L5 5Z" /><ellipse {...p} cx="12.2" cy="8" rx="2.2" ry="1.7" /><path {...p} d="M3 19c3-2 5-2 8 0" />
      </>);
    case "darts":
      return svg(<>
        <circle {...p} cx="10" cy="12" r="7" /><circle {...p} cx="10" cy="12" r="3.5" /><circle {...p} cx="10" cy="12" r="1" /><path {...p} d="m14.8 7.2 6.2-4.2-1 3 3-1-4.2 6.2" /><path {...p} d="m19 5-6.2 6.2" />
      </>);
    case "dicegame":
      return svg(<>
        <rect {...p} x="5" y="5" width="14" height="14" rx="2.5" />
        <circle cx="9" cy="9" r="1" fill="currentColor" />
        <circle cx="15" cy="9" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="15" r="1" fill="currentColor" />
        <circle cx="15" cy="15" r="1" fill="currentColor" />
      </>);
    case "esports":
      return svg(<>
        <path {...p} d="M7 10h10c2.2 0 4 1.8 4 4v1.5c0 1.1-.9 2-2 2h-2.2l-2.1-2.2H9.3l-2.1 2.2H5c-1.1 0-2-.9-2-2V14c0-2.2 1.8-4 4-4Z" />
        <path {...p} d="M8 7l2-2h4l2 2" />
        <path {...p} d="M8.5 13.5h3M10 12v3" />
        <circle {...p} cx="15.7" cy="13.2" r=".8" />
        <circle {...p} cx="18.2" cy="14.8" r=".8" />
      </>);
    case "chess":
      return svg(<>
        <path {...p} d="M8 20h8M7 17h10M9 17l1-6h4l1 6M10 11 8 7l4-3 4 3-2 4M10 7h4" />
      </>);
    case "fit":
      return svg(<>
        <path {...p} d="M3 9v6M6 7v10M9 10h6M18 7v10M21 9v6" />
      </>);
    case "foot":
      return svg(<>
        <circle {...p} cx="12" cy="12" r="8" /><path {...p} d="m12 8 3 2-1 3.5h-4L9 10l3-2ZM9 10 6 8M15 10l3-2M10 13.5l-2 3M14 13.5l2 3M8 16.5l-2 .5M16 16.5l2 .5" />
      </>);
    case "frisbee":
      return svg(<>
        <ellipse {...p} cx="12" cy="12" rx="9" ry="4" /><path {...p} d="M6 12c2.5 1.8 9.5 1.8 12 0" />
      </>);
    case "molkky":
      return svg(<>
        <path {...p} d="M5 20V9l3-3 3 3v11M13 20V7l3-3 3 3v13" /><path {...p} d="M5 14h6M13 12h6" />
      </>);
    case "padel":
      return svg(<>
        <ellipse {...p} cx="10" cy="9" rx="5.3" ry="6.5" transform="rotate(25 10 9)" /><path {...p} d="m13 14 4.4 6" /><circle cx="8" cy="7" r=".6" fill="currentColor" /><circle cx="11" cy="8" r=".6" fill="currentColor" /><circle cx="9" cy="10.5" r=".6" fill="currentColor" /><circle cx="12" cy="11" r=".6" fill="currentColor" /><circle {...p} cx="19" cy="5" r="1.7" />
      </>);
    case "petanque":
      return svg(<>
        <circle {...p} cx="8" cy="13" r="4.5" /><circle {...p} cx="15" cy="11" r="4.5" /><circle {...p} cx="18.5" cy="18" r="1.3" /><path {...p} d="m5 11 6 4M12 9l6 4" />
      </>);
    case "pickleball":
      return svg(<>
        <path {...p} d="M5 5c3-3 8-1 10 2s1 7-2 9l-3 2-5-5V5Z" /><path {...p} d="m10 18 3 3" /><circle {...p} cx="19" cy="7" r="2.2" /><path {...p} d="M18.3 6.4h0M19.7 7.6h0" />
      </>);
    case "pingpong":
      return svg(<>
        <circle {...p} cx="9" cy="9" r="5.5" /><path {...p} d="m12.8 13 6.2 6" /><path {...p} d="m16.8 20 3.2-3.2" /><circle {...p} cx="18.5" cy="6" r="1.7" />
      </>);
    case "rugby":
      return svg(<>
        <path {...p} d="M4 15c2-6 8-10 16-10 0 7-4 13-10 15-3 1-5-1-6-5Z" /><path {...p} d="m8 16 8-8M11 12l2 2M13 10l2 2" />
      </>);
    case "running":
      return svg(<>
        <circle {...p} cx="15.5" cy="4.5" r="2" /><path {...p} d="m13.5 8-3 3 3 2.5 3.5-1.2M13.5 8l3 2 2.5-.5M13.5 13.5 10 20M16.5 12.5l2.5 6M10.5 11 7 10" />
      </>);
    case "tennis":
      return svg(<>
        <ellipse {...p} cx="9" cy="8" rx="4.5" ry="5.7" transform="rotate(35 9 8)" /><path {...p} d="m12 12 7 7M16.8 20l3.2-3.2" /><circle {...p} cx="18.5" cy="5" r="2" />
      </>);
    case "archery":
      return svg(<>
        <path {...p} d="M7 3c5 4 5 14 0 18M7 3c-2 5-2 13 0 18M7 12h13" /><path {...p} d="m17 9 3 3-3 3M4 12h3" />
      </>);
    case "volley":
      return svg(<>
        <circle {...p} cx="12" cy="12" r="8" /><path {...p} d="M12 4c2 3 2.5 6 .5 8.5M4.5 9c3.5-.5 6.5.5 8 3.5M8 19c1.5-3.5 4-5.5 8-6.5M17.5 6.5c-3 .5-5 2-6.5 4.5" />
      </>);
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

export default function GameSelect({ go }: Props) {
  const { theme } = useTheme();
  const { setSport } = useSport();
  const dev = useDevMode() as any;

  // Desktop détecté (souris / trackpad) => on ajoute des contrôles visibles
  const isDesktop = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const mq1 = window.matchMedia?.("(hover: hover)");
    const mq2 = window.matchMedia?.("(pointer: fine)");
    return Boolean(mq1?.matches && mq2?.matches);
  }, []);

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
    const copy = filterSportsForCurrentRuntime(items);
    copy.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    copy.sort((a, b) => Number(b.enabled) - Number(a.enabled));
    return copy;
  }, [items]);

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
    <div style={wrap(theme)}>
      <div
        style={panel(theme)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <SportShowcaseBand sports={SPORT_SHOWCASE_TOP} activeId={it.id} theme={theme} />

        <div style={title(theme)}>Choisis ton sport</div>
        <div style={subtitle(theme)}>Fais défiler pour choisir</div>

        <button
          key={it.id}
          onClick={clickable ? it.onClick : undefined}
          style={sportTile(theme, !visuallyDisabled)}
          aria-disabled={!clickable}
          title={clickable ? "Ouvrir" : "Bientôt"}
        >
          <img src={it.logo} alt={it.label} style={sportImg(theme, !visuallyDisabled)} draggable={false} />
          <div style={sportLabel(theme, !visuallyDisabled)}>{it.label}</div>
          {visuallyDisabled && <div style={soonPill(theme)}>SOON</div>}
        </button>

        <SportShowcaseBand sports={SPORT_SHOWCASE_BOTTOM} activeId={it.id} theme={theme} />

        <div style={dotsWrap}>
          {sortedItems.map((_, i) => (
            <span key={i} style={dot(theme, i === index)} />
          ))}
        </div>

        {/* Contrôles desktop visibles (si souris / trackpad) */}
        {isDesktop && (
          <>
            <button aria-label="Précédent" onClick={goPrev} style={navBtn(theme, "left")}>
              ‹
            </button>
            <button aria-label="Suivant" onClick={goNext} style={navBtn(theme, "right")}>
              ›
            </button>
          </>
        )}

        {/* Zones tactiles discrètes (utile tablette) */}
        <button aria-label="Précédent" onClick={goPrev} style={edgeTap("left")} />
        <button aria-label="Suivant" onClick={goNext} style={edgeTap("right")} />
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
    touchAction: "pan-y", // autorise le swipe horizontal sans bloquer le scroll vertical global (mais ici pas de scroll)
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
  const size = "min(320px, 72vw)"; // gros logo (1 sport à la fois)
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
  // zones invisibles pour faciliter le swipe sur tablette
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
