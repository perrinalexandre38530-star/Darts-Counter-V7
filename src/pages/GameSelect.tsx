// ============================================
// src/pages/GameSelect.tsx
// Hub de sélection de jeu (sans BottomNav)
// - 1 sport à la fois
// - swipe horizontal + flèches desktop
// - ordre: sports disponibles puis sports SOON, ordre alpha FR dans chaque groupe
// - patch sécurité: plus aucune config locale réévaluée dans un ordre ambigu pendant le render
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useSport } from "../contexts/SportContext";
import { useDevMode } from "../contexts/DevModeContext";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";

import logoDarts from "../assets/games/logo-darts.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoBabyFoot from "../assets/games/logo-babyfoot.png";
import logoArchery from "../assets/games/logo-archery.png";
import logoMolkky from "../assets/games/logo-molkky.png";
import logoPadel from "../assets/games/logo-padel.png";
import logoPickleball from "../assets/games/logo-pickleball.png";
import logoFrisbee from "../assets/games/logo-frisbee.png";
import logoBillard from "../assets/games/logo-billard.png";
import logoBadminton from "../assets/games/logo-badminton.png";
import logoBasket from "../assets/games/logo-basket.png";
import logoCornhole from "../assets/games/logo-cornhole.png";
import logoDiceGame from "../assets/games/logo-dicegame.png";
import logoFoot from "../assets/games/logo-foot.png";
import logoRugby from "../assets/games/logo-rugby.png";
import logoVolley from "../assets/games/logo-volley.png";
import logoTennis from "../assets/games/logo-tennis.png";
import logoChess from "../assets/games/logo-chess.png";

type Props = {
  go: (route: any) => void;
};

type GameId =
  | "darts"
  | "petanque"
  | "pingpong"
  | "babyfoot"
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

type Entry = {
  id: GameId;
  label: string;
  logo: string;
  enabled: boolean;
  targetSport?: string;
  targetRoute?: "home" | "games";
};

const HOME_ROUTE = "home" as const;
const GAMES_ROUTE = "games" as const;

const GAME_CATALOG: Entry[] = [
  { id: "darts", label: "Darts Counter", logo: logoDarts, enabled: true, targetSport: "darts", targetRoute: HOME_ROUTE },
  { id: "petanque", label: "Pétanque Counter", logo: logoPetanque, enabled: true, targetSport: "petanque", targetRoute: GAMES_ROUTE },
  { id: "pingpong", label: "Ping-Pong Counter", logo: logoPingPong, enabled: true, targetSport: "pingpong", targetRoute: GAMES_ROUTE },
  { id: "babyfoot", label: "Baby-Foot Counter", logo: logoBabyFoot, enabled: true, targetSport: "babyfoot", targetRoute: GAMES_ROUTE },
  { id: "archery", label: "Tir à l'arc", logo: logoArchery, enabled: false },
  { id: "molkky", label: "Mölkky", logo: logoMolkky, enabled: true, targetSport: "molkky", targetRoute: GAMES_ROUTE },
  { id: "padel", label: "Padel", logo: logoPadel, enabled: false },
  { id: "pickleball", label: "Pickleball", logo: logoPickleball, enabled: false },
  { id: "frisbee", label: "Frisbee", logo: logoFrisbee, enabled: false },
  { id: "billard", label: "Billard", logo: logoBillard, enabled: false },
  { id: "badminton", label: "Badminton", logo: logoBadminton, enabled: false },
  { id: "basket", label: "Basket", logo: logoBasket, enabled: false },
  { id: "cornhole", label: "Cornhole", logo: logoCornhole, enabled: false },
  { id: "dicegame", label: "Dice Game", logo: logoDiceGame, enabled: true, targetSport: "dicegame", targetRoute: GAMES_ROUTE },
  { id: "foot", label: "Foot", logo: logoFoot, enabled: false },
  { id: "rugby", label: "Rugby", logo: logoRugby, enabled: false },
  { id: "volley", label: "Volley", logo: logoVolley, enabled: false },
  { id: "tennis", label: "Tennis", logo: logoTennis, enabled: false },
  { id: "chess", label: "Échecs", logo: logoChess, enabled: false },
];

const SORTED_GAME_CATALOG = [...GAME_CATALOG].sort((a, b) => {
  if (a.enabled !== b.enabled) return Number(b.enabled) - Number(a.enabled);
  return a.label.localeCompare(b.label, "fr");
});

function normalizeIndex(nextIndex: number, total: number): number {
  const safeTotal = total > 0 ? total : 1;
  return ((nextIndex % safeTotal) + safeTotal) % safeTotal;
}

function getThemeAccent(theme: any, fallback: string) {
  return theme?.accent1 || theme?.accent2 || theme?.accent || theme?.colors?.accent || theme?.colors?.primary || theme?.primary || fallback;
}

export default function GameSelect({ go }: Props) {
  const { theme } = useTheme();
  const { setSport } = useSport();
  const dev = useDevMode();

  const isDesktop = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const canHover = window.matchMedia?.("(hover: hover)")?.matches;
    const hasFinePointer = window.matchMedia?.("(pointer: fine)")?.matches;
    return Boolean(canHover && hasFinePointer);
  }, []);

  const items = SORTED_GAME_CATALOG;
  const itemCount = items.length;

  const [index, setIndex] = React.useState(0);
  const touchStartXRef = React.useRef<number | null>(null);
  const mouseStartXRef = React.useRef<number | null>(null);
  const isDraggingRef = React.useRef(false);

  const wrapIndex = React.useCallback((nextIndex: number) => normalizeIndex(nextIndex, itemCount), [itemCount]);
  const goPrev = React.useCallback(() => setIndex((prev) => wrapIndex(prev - 1)), [wrapIndex]);
  const goNext = React.useCallback(() => setIndex((prev) => wrapIndex(prev + 1)), [wrapIndex]);

  React.useEffect(() => {
    setIndex((prev) => wrapIndex(prev));
  }, [wrapIndex]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  const currentItem = items[wrapIndex(index)] ?? items[0];
  const isCurrentEnabled = !!currentItem?.enabled;
  const visuallyDisabled = devVisuallyDisabled(isCurrentEnabled);
  const clickable = devClickable(isCurrentEnabled, !!dev?.enabled);

  const openCurrent = React.useCallback(() => {
    if (!currentItem) return;
    if (!devClickable(!!currentItem.enabled, !!dev?.enabled)) return;

    if (currentItem.targetSport) {
      try {
        setSport(currentItem.targetSport as any);
      } catch {}
    }

    go(currentItem.targetRoute ?? GAMES_ROUTE);
  }, [currentItem, dev?.enabled, go, setSport]);

  const onTouchStart = React.useCallback((event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    isDraggingRef.current = true;
  }, []);

  const onTouchEnd = React.useCallback(
    (event: React.TouchEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const startX = touchStartXRef.current;
      touchStartXRef.current = null;
      if (startX == null) return;

      const endX = event.changedTouches[0]?.clientX ?? startX;
      const deltaX = endX - startX;
      if (deltaX > 55) goPrev();
      else if (deltaX < -55) goNext();
    },
    [goPrev, goNext]
  );

  const onMouseDown = React.useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    mouseStartXRef.current = event.clientX;
  }, []);

  const onMouseUp = React.useCallback(
    (event: React.MouseEvent) => {
      const startX = mouseStartXRef.current;
      mouseStartXRef.current = null;
      if (startX == null) return;

      const deltaX = event.clientX - startX;
      if (deltaX > 55) goPrev();
      else if (deltaX < -55) goNext();
    },
    [goPrev, goNext]
  );

  if (!currentItem) {
    return <div style={wrapStyle(theme)} />;
  }

  return (
    <div style={wrapStyle(theme)}>
      <div
        style={panelStyle(theme)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <div style={titleStyle(theme)}>Choisis ton sport</div>
        <div style={subtitleStyle(theme)}>Fais défiler pour choisir</div>

        <button
          key={currentItem.id}
          onClick={clickable ? openCurrent : undefined}
          style={sportTileStyle(theme, !visuallyDisabled)}
          aria-disabled={!clickable}
          title={clickable ? "Ouvrir" : "Bientôt"}
        >
          <img
            src={currentItem.logo}
            alt={currentItem.label}
            style={sportImageStyle(theme, !visuallyDisabled)}
            draggable={false}
          />
          <div style={sportLabelStyle(theme, !visuallyDisabled)}>{currentItem.label}</div>
          {visuallyDisabled ? <div style={soonPillStyle(theme)}>SOON</div> : null}
        </button>

        <div style={dotsWrapStyle}>
          {items.map((item, itemIndex) => (
            <span key={item.id} style={dotStyle(theme, itemIndex === wrapIndex(index))} />
          ))}
        </div>

        {isDesktop ? (
          <>
            <button aria-label="Précédent" onClick={goPrev} style={navButtonStyle(theme, "left")}>‹</button>
            <button aria-label="Suivant" onClick={goNext} style={navButtonStyle(theme, "right")}>›</button>
          </>
        ) : null}

        <button aria-label="Précédent" onClick={goPrev} style={edgeTapStyle("left")} />
        <button aria-label="Suivant" onClick={goNext} style={edgeTapStyle("right")} />
      </div>
    </div>
  );
}

function wrapStyle(_theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px 14px",
    backgroundColor: "#000",
    overflow: "hidden",
  };
}

function panelStyle(_theme: any): React.CSSProperties {
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

function titleStyle(theme: any): React.CSSProperties {
  return {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: getThemeAccent(theme, "#ffd200"),
    textAlign: "center",
    padding: "0 6px",
  };
}

function subtitleStyle(_theme: any): React.CSSProperties {
  return {
    marginTop: -6,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.15,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  };
}

function sportTileStyle(theme: any, enabled: boolean): React.CSSProperties {
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

function sportImageStyle(theme: any, enabled: boolean): React.CSSProperties {
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

function sportLabelStyle(theme: any, enabled: boolean): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 700,
    opacity: enabled ? 0.9 : 0.7,
    color: getThemeAccent(theme, "#ffd200"),
    textAlign: "center",
    paddingBottom: 4,
    pointerEvents: "none",
  };
}

function navButtonStyle(_theme: any, side: "left" | "right"): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 52,
    height: 52,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
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

const dotsWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "2px 0 0",
};

function dotStyle(theme: any, active: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const offColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
  const onColor = theme?.accent ?? (isDark ? "rgba(255,215,0,0.95)" : "rgba(0,0,0,0.70)");

  return {
    width: active ? 10 : 8,
    height: active ? 10 : 8,
    borderRadius: 999,
    background: active ? onColor : offColor,
    transition: "all 140ms ease",
  };
}

function soonPillStyle(theme: any): React.CSSProperties {
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
    color: getThemeAccent(theme, fallback),
    border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
  };
}

function edgeTapStyle(side: "left" | "right"): React.CSSProperties {
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
