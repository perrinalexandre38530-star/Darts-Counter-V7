// ============================================
// src/components/gameplay/GameplayLayout.tsx
// Layout unifié pour les pages GAMEPLAY.
// - Phone: Header + Profil actif + Joueurs (modal) + Volée + Modes de saisie
// - Tablet (landscape/wide): split 2 colonnes (sidebar + input)
// ============================================

import React from "react";
import BackDot from "../BackDot";
import InfoDot from "../InfoDot";
import RulesModal from "../RulesModal";
import { useTheme } from "../../contexts/ThemeContext";
import tickerX01 from "../../assets/tickers/ticker_x01.png";

// Scale children down (never up) to fit the available box.
function FitBox({
  children,
  minScale = 0.55,
  maxScale = 1,
}: {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
}) {
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const compute = () => {
      const ob = outer.getBoundingClientRect();
      const ow = ob.width;
      const oh = ob.height;
      const iw = Math.max(inner.scrollWidth, inner.getBoundingClientRect().width);
      const ih = Math.max(inner.scrollHeight, inner.getBoundingClientRect().height);
      if (!ow || !oh || !iw || !ih) return;

      const s = Math.min(maxScale, ow / iw, oh / ih);
      const clamped = Math.max(minScale, Math.min(maxScale, Math.round(s * 1000) / 1000));
      setScale(clamped);
    };

    compute();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => compute());
      ro.observe(outer);
      ro.observe(inner);
    } catch {
      // ignore
    }
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
      if (ro) ro.disconnect();
    };
  }, [minScale, maxScale]);

  return (
    <div ref={outerRef} style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale < 1 ? `${100 / scale}%` : "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(!!mql.matches);
    onChange();
    try {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      // Safari legacy
      // @ts-ignore
      mql.addListener(onChange);
      // @ts-ignore
      return () => mql.removeListener(onChange);
    }
  }, [query]);

  return matches;
}

type Props = {
  /** Identifiant du mode (ex: "x01"). Sert de fallback pour certains assets (ex ticker). */
  modeId?: string;
  /** Titre centré du header (optionnel). Si headerCenter est fourni, il prime. */
  title?: string;
  /** Contenu centré du header (ex: scoreboard compact). */
  headerCenter?: React.ReactNode;

  /** Actions header */
  onBack?: () => void;
  onInfo?: () => void;
  showInfo?: boolean;

  /** Taille des dots */
  backDotSize?: number;
  infoDotSize?: number;

  /** Contenus (slots) */
  headerScoreboard?: React.ReactNode; // fallback sous le header si headerCenter n'est pas utilisé
  activeProfileHeader?: React.ReactNode;
  volleyInputDisplay?: React.ReactNode;
  inputModes?: React.ReactNode;

  /** Bloc joueurs */
  playersPanelTitle?: string;
  playersPanel?: React.ReactNode;
  playersRowRight?: React.ReactNode;
  playersRowLabel?: string;
  playersPanelMode?: "modal" | "sidebar-auto";
  /** Image de fond (ticker) du bandeau JOUEURS (ex: ticker_x01.png). */
  playersBannerImage?: string;
  /** Opacité du ticker (0..1) */
  playersBannerOpacity?: number;

  /** Tablet */
  forceLayout?: "auto" | "phone" | "tablet";

  /** En mode debug / overlay (optionnel) */
  topRightExtra?: React.ReactNode;
};

export default function GameplayLayout({
  modeId,
  title = "",
  headerCenter,
  onBack,
  onInfo,
  showInfo,
  backDotSize = 36,
  infoDotSize = 36,
  headerScoreboard,
  activeProfileHeader,
  playersPanelTitle = "Joueurs",
  playersPanel,
  playersRowRight,
  playersRowLabel = "JOUEURS",
  playersPanelMode = "sidebar-auto",
  playersBannerImage,
  playersBannerOpacity = 0.55,
  volleyInputDisplay,
  inputModes,
  forceLayout = "auto",
  topRightExtra,
}: Props) {
  const { theme } = useTheme();
  const [openPlayers, setOpenPlayers] = React.useState(false);

  const canOpenPlayers = !!playersPanel;
  const isTabletByMedia = useMediaQuery("(min-width: 900px) and (orientation: landscape)");
  const isTablet =
    forceLayout === "tablet" ? true : forceLayout === "phone" ? false : isTabletByMedia;

  const playersInSidebar = isTablet && canOpenPlayers && playersPanelMode === "sidebar-auto";
  const showPlayersRowAsButton = canOpenPlayers && !playersInSidebar;

  // Fallback garanti: si on oublie de passer playersBannerImage, certains modes ont un ticker "obligatoire".
  // (Objectif: éviter que le ticker X01 "disparaisse" au gré des patchs.)
  const effectivePlayersBannerImage =
    playersBannerImage ?? (modeId === "x01" ? (tickerX01 as unknown as string) : undefined);

  const renderPlayersRow = () => (
    <div
      className="card"
      role={showPlayersRowAsButton ? "button" : undefined}
      tabIndex={showPlayersRowAsButton ? 0 : -1}
      onClick={showPlayersRowAsButton ? () => setOpenPlayers(true) : undefined}
      onKeyDown={
        showPlayersRowAsButton
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") setOpenPlayers(true);
            }
          : undefined
      }
      style={{
        padding: "12px 12px",
        cursor: showPlayersRowAsButton ? "pointer" : "default",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        border: `1px solid ${theme.borderSoft}`,
        background: showPlayersRowAsButton ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.18)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ticker en fond (NE PAS LE SUPPRIMER côté X01 : c'est une identité visuelle du bandeau) */}
      {effectivePlayersBannerImage ? (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${effectivePlayersBannerImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: playersBannerOpacity,
              filter: "saturate(1.05) contrast(1.05)",
              transform: "scale(1.02)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 48%, rgba(0,0,0,0.88) 100%)",
            }}
          />
        </>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.4, color: theme.primary }}>
          {playersRowLabel}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {playersRowRight}
          {showPlayersRowAsButton ? (
            <span
              style={{
                opacity: 0.8,
                fontWeight: 900,
                fontSize: 16,
                transform: "translateY(-1px)",
              }}
            >
              ▾
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  // Safe-area (mobile) so nothing collides with system UI / rounded corners.
  const safeBottom = "calc(10px + env(safe-area-inset-bottom))";
  const safeLeft = "calc(10px + env(safe-area-inset-left))";
  const safeRight = "calc(10px + env(safe-area-inset-right))";

  const infoEnabled = (showInfo ?? !!onInfo) && !!onInfo;

  // ⚠️ Barrières anti-dépassement : le layout gameplay ne doit JAMAIS déborder en largeur/hauteur.
  // Sur mobile, 100vh / 100svh peut "raboter" la zone utile (barres navigateur / UI).
  // On préfère 100dvh (dynamic viewport height) pour que la zone INPUT puisse aller jusqu'en bas.
  const outerStyle: React.CSSProperties = {
    height: "100dvh",
    width: "100%",
    overflow: "hidden",
  };

  const containerStyle: React.CSSProperties = {
    height: "100%",
    width: "100%",
    maxWidth: isTablet ? 1180 : 920,
    margin: "0 auto",
    paddingTop: 10,
    paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
    paddingLeft: safeLeft,
    paddingRight: safeRight,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 0,
  };

  return (
    <div style={outerStyle}>
      <div style={containerStyle}>
        {/* 1) HEADER SCOREBOARD + MENU & INFOS */}
        <div
          className="card"
          style={{
            padding: "10px 12px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <BackDot onClick={onBack} size={backDotSize} />
            </div>

            <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
              {headerCenter ? (
                headerCenter
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 800,
                    letterSpacing: 0.3,
                    opacity: 0.95,
                  }}
                >
                  {title}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {topRightExtra}
              {infoEnabled ? <InfoDot onClick={onInfo} size={infoDotSize} /> : null}
            </div>
          </div>

          {!headerCenter && headerScoreboard ? (
            <div style={{ marginTop: 10 }}>{headerScoreboard}</div>
          ) : null}
        </div>

        {/* 2+) CONTENU */}
        {!isTablet ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              gap: 10,
            }}
          >
            {/*
              PHONE LAYOUT (IMPORTANT UX):
              - Le contenu (profil/joueurs/volée) scroll.
              - Le KEYPAD/CIBLE est docké en bas (sticky), taille "normale".
              - Pas de double scale (ScoreInputHub gère déjà l'auto-fit interne).
            */}

            {/* Scroll zone (tout sauf la saisie) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingBottom: safeBottom,
              }}
            >
              {/* 2) HEADER PROFIL ACTIF */}
              {activeProfileHeader ? (
                <div className="card" style={{ padding: "10px 12px" }}>
                  {activeProfileHeader}
                </div>
              ) : null}

              {/* 3) JOUEURS (modal) */}
              {renderPlayersRow()}

              <RulesModal open={openPlayers} onClose={() => setOpenPlayers(false)} title={playersPanelTitle}>
                <div style={{ padding: 2 }}>{playersPanel}</div>
              </RulesModal>

              {/* 4) VOLÉE */}
              {volleyInputDisplay ? (
                <div className="card" style={{ padding: "10px 12px" }}>
                  {volleyInputDisplay}
                </div>
              ) : null}
            </div>

            {/* 5) DOCK BAS: MODES DE SAISIE (KEYPAD / CIBLE) */}
            {inputModes ? (
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  zIndex: 30,
                  width: "100%",
                  margin: 0,
                  padding: 0,
                  paddingBottom: safeBottom,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxHeight: "min(46dvh, 430px)",
                    overflow: "hidden",
                  }}
                >
                  {inputModes}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                // minmax(0,1fr) = empêche le débordement horizontal des enfants (shadows, min-width, etc.)
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 10,
                height: "100%",
                minHeight: 0,
              }}
            >
              {/* LEFT: profil + joueurs */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 0,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {activeProfileHeader ? (
                  <div className="card" style={{ padding: "10px 12px" }}>
                    {activeProfileHeader}
                  </div>
                ) : null}

                {playersInSidebar ? (
                  <div
                    className="card"
                    style={{
                      padding: "10px 12px",
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontWeight: 900, letterSpacing: 0.4, color: theme.primary }}>
                        {playersRowLabel}
                      </div>
                      {playersRowRight}
                    </div>

                    <div style={{ overflow: "auto", maxHeight: "100%", paddingRight: 4 }}>
                      {playersPanel}
                    </div>
                  </div>
                ) : (
                  <>
                    {renderPlayersRow()}
                    <RulesModal open={openPlayers} onClose={() => setOpenPlayers(false)} title={playersPanelTitle}>
                      <div style={{ padding: 2 }}>{playersPanel}</div>
                    </RulesModal>
                  </>
                )}
              </div>

              {/* RIGHT: volée + modes */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 0,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {volleyInputDisplay ? (
                  <div className="card" style={{ padding: "10px 12px" }}>
                    {volleyInputDisplay}
                  </div>
                ) : null}

                {inputModes ? (
                  <div
                    className="card"
                    style={{
                      padding: "10px 12px",
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{inputModes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
