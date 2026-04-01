// ============================================
// src/pages/GameSelect.tsx
// Hub de sélection de jeu (sans BottomNav)
// - 1 sport à la fois
// - swipe horizontal / flèches clavier / boutons desktop
// - ouverture directe vers Home ou Games selon le sport
// - version restructurée pour éliminer tout risque de TDZ
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

type RawItem = {
  id: GameId;
  label: string;
  logo: string;
  enabled: boolean;
  sport?: string;
  route: "home" | "games" | null;
};

type RenderItem = RawItem & {
  onClick: () => void;
};

const RAW_ITEMS: RawItem[] = [
  { id: "darts", label: "Darts Counter", logo: logoDarts, enabled: true, sport: "darts", route: "home" },
  { id: "petanque", label: "Pétanque Counter", logo: logoPetanque, enabled: true, sport: "petanque", route: "games" },
  { id: "pingpong", label: "Ping-Pong Counter", logo: logoPingPong, enabled: true, sport: "pingpong", route: "games" },
  { id: "babyfoot", label: "Baby-Foot Counter", logo: logoBabyFoot, enabled: true, sport: "babyfoot", route: "games" },

  { id: "archery", label: "Tir à l'arc", logo: logoArchery, enabled: false, route: null },
  { id: "molkky", label: "Mölkky", logo: logoMolkky, enabled: true, sport: "molkky", route: "games" },
  { id: "padel", label: "Padel", logo: logoPadel, enabled: false, route: null },
  { id: "pickleball", label: "Pickleball", logo: logoPickleball, enabled: false, route: null },
  { id: "frisbee", label: "Frisbee", logo: logoFrisbee, enabled: false, route: null },
  { id: "billard", label: "Billard", logo: logoBillard, enabled: false, route: null },
  { id: "badminton", label: "Badminton", logo: logoBadminton, enabled: false, route: null },
  { id: "basket", label: "Basket", logo: logoBasket, enabled: false, route: null },
  { id: "cornhole", label: "Cornhole", logo: logoCornhole, enabled: false, route: null },
  { id: "dicegame", label: "Dice Game", logo: logoDiceGame, enabled: true, sport: "dicegame", route: "games" },
  { id: "foot", label: "Foot", logo: logoFoot, enabled: false, route: null },
  { id: "rugby", label: "Rugby", logo: logoRugby, enabled: false, route: null },
  { id: "volley", label: "Volley", logo: logoVolley, enabled: false, route: null },
  { id: "tennis", label: "Tennis", logo: logoTennis, enabled: false, route: null },
  { id: "chess", label: "Échecs", logo: logoChess, enabled: false, route: null },
];

const DOTS_WRAP: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "2px 0 0",
};

function sortItems(items: RenderItem[]): RenderItem[] {
  return [...items]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .sort((a, b) => Number(b.enabled) - Number(a.enabled));
}

function detectDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const mq1 = window.matchMedia?.("(hover: hover)");
  const mq2 = window.matchMedia?.("(pointer: fine)");
  return Boolean(mq1?.matches && mq2?.matches);
}

function wrapIndex(i: number, length: number): number {
  const n = length || 1;
  return ((i % n) + n) % n;
}

export default function GameSelect({ go }: Props) {
  const { theme } = useTheme();
  const { setSport } = useSport();
  const dev = useDevMode() as any;

  const isDesktop = React.useMemo(() => detectDesktop(), []);

  const openItem = React.useCallback(
    (item: RawItem) => {
      if (!item.enabled) return;
      if (item.sport) {
        try {
          setSport(item.sport as any);
        } catch {}
      }
      if (item.route) {
        go(item.route);
      }
    },
    [go, setSport]
  );

  const sortedItems = React.useMemo<RenderItem[]>(() => {
    const built = RAW_ITEMS.map((item) => ({
      ...item,
      onClick: () => openItem(item),
    }));
    return sortItems(built);
  }, [openItem]);

  const [index, setIndex] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);
  const mouseDownRef = React.useRef<number | null>(null);

  const normalizedIndex = React.useMemo(() => wrapIndex(index, sortedItems.length), [index, sortedItems.length]);
  const currentItem = sortedItems[normalizedIndex] ?? sortedItems[0] ?? null;

  const goPrev = React.useCallback(() => {
    setIndex((prev) => wrapIndex(prev - 1, sortedItems.length));
  }, [sortedItems.length]);

  const goNext = React.useCallback(() => {
    setIndex((prev) => wrapIndex(prev + 1, sortedItems.length));
  }, [sortedItems.length]);

  React.useEffect(() => {
    setIndex((prev) => wrapIndex(prev, sortedItems.length));
  }, [sortedItems.length]);

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft") goPrev();
      if (ev.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? null;
    draggingRef.current = true;
  }, []);

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const startX = startXRef.current;
      startXRef.current = null;
      if (startX == null) return;

      const endX = e.changedTouches[0]?.clientX ?? startX;
      const delta = endX - startX;
      if (delta > 55) goPrev();
      else if (delta < -55) goNext();
    },
    [goPrev, goNext]
  );

  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseDownRef.current = e.clientX;
  }, []);

  const onMouseUp = React.useCallback(
    (e: React.MouseEvent) => {
      const startX = mouseDownRef.current;
      mouseDownRef.current = null;
      if (startX == null) return;
      const delta = e.clientX - startX;
      if (delta > 55) goPrev();
      else if (delta < -55) goNext();
    },
    [goPrev, goNext]
  );

  if (!currentItem) {
    return (
      <div style={wrap()}>
        <div style={panel()}>
          <div style={title(theme)}>Choisis ton sport</div>
          <div style={subtitle()}>Aucun sport disponible</div>
        </div>
      </div>
    );
  }

  const visuallyDisabled = devVisuallyDisabled(!!currentItem.enabled);
  const clickable = devClickable(!!currentItem.enabled, !!dev?.enabled);

  return (
    <div style={wrap()}>
      <div
        style={panel()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <div style={title(theme)}>Choisis ton sport</div>
        <div style={subtitle()}>Fais défiler pour choisir</div>

        <button
          key={currentItem.id}
          onClick={clickable ? currentItem.onClick : undefined}
          style={sportTile(theme, !visuallyDisabled)}
          aria-disabled={!clickable}
          title={clickable ? "Ouvrir" : "Bientôt"}
        >
          <img
            src={currentItem.logo}
            alt={currentItem.label}
            style={sportImg(theme, !visuallyDisabled)}
            draggable={false}
          />
          <div style={sportLabel(theme, !visuallyDisabled)}>{currentItem.label}</div>
          {visuallyDisabled && <div style={soonPill(theme)}>SOON</div>}
        </button>

        <div style={DOTS_WRAP}>
          {sortedItems.map((item, i) => (
            <span key={item.id} style={dot(theme, i === normalizedIndex)} />
          ))}
        </div>

        {isDesktop && (
          <>
            <button aria-label="Précédent" onClick={goPrev} style={navBtn("left")}>
              ‹
            </button>
            <button aria-label="Suivant" onClick={goNext} style={navBtn("right")}>
              ›
            </button>
          </>
        )}

        <button aria-label="Précédent" onClick={goPrev} style={edgeTap("left")} />
        <button aria-label="Suivant" onClick={goNext} style={edgeTap("right")} />
      </div>
    </div>
  );
}

function wrap(): React.CSSProperties {
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

function panel(): React.CSSProperties {
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
  const accent = theme?.accent || theme?.colors?.accent || theme?.colors?.primary || theme?.primary || "#ffd200";
  return {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: theme?.accent1 || theme?.accent2 || accent,
    textAlign: "center",
    padding: "0 6px",
  };
}

function subtitle(): React.CSSProperties {
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
  const accent = theme?.accent || theme?.colors?.accent || theme?.colors?.primary || theme?.primary || "#ffd200";
  return {
    fontSize: 18,
    fontWeight: 700,
    opacity: enabled ? 0.9 : 0.7,
    color: theme?.accent1 || theme?.accent2 || accent,
    textAlign: "center",
    paddingBottom: 4,
    pointerEvents: "none",
  };
}

function navBtn(side: "left" | "right"): React.CSSProperties {
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
