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
    } catch {}
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
  modeId?: string;
  title?: string;
  headerCenter?: React.ReactNode;

  onBack?: () => void;
  onInfo?: () => void;
  showInfo?: boolean;

  backDotSize?: number;
  infoDotSize?: number;

  headerScoreboard?: React.ReactNode;
  activeProfileHeader?: React.ReactNode;
  volleyInputDisplay?: React.ReactNode;
  inputModes?: React.ReactNode;

  playersPanelTitle?: string;
  playersPanel?: React.ReactNode;
  playersRowRight?: React.ReactNode;
  playersRowLabel?: string;
  playersPanelMode?: "modal" | "sidebar-auto";
  playersBannerImage?: string;
  playersBannerOpacity?: number;

  forceLayout?: "auto" | "phone" | "tablet";
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
          {showPlayersRowAsButton ? <span style={{ fontWeight: 900 }}>▾</span> : null}
        </div>
      </div>
    </div>
  );

  const infoEnabled = (showInfo ?? !!onInfo) && !!onInfo;

  return (
    <div style={{ height: "100svh", width: "100%", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          maxWidth: isTablet ? 1180 : 920,
          margin: "0 auto",
          padding: "10px 10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 0,
        }}
      >
        {/* HEADER */}
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <BackDot onClick={onBack} size={backDotSize} />
            <div style={{ flex: 1, textAlign: "center", fontWeight: 800 }}>
              {headerCenter ?? title}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {topRightExtra}
              {infoEnabled ? <InfoDot onClick={onInfo} size={infoDotSize} /> : null}
            </div>
          </div>
          {!headerCenter && headerScoreboard ? (
            <div style={{ marginTop: 10 }}>{headerScoreboard}</div>
          ) : null}
        </div>

        {!isTablet ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
            {activeProfileHeader ? (
              <div className="card" style={{ padding: "10px 12px" }}>
                {activeProfileHeader}
              </div>
            ) : null}

            {renderPlayersRow()}

            <RulesModal open={openPlayers} onClose={() => setOpenPlayers(false)} title={playersPanelTitle}>
              <div style={{ padding: 2 }}>{playersPanel}</div>
            </RulesModal>

            {volleyInputDisplay ? (
              <div
                className="card"
                style={{
                  padding: "10px 12px",
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                }}
              >
                {volleyInputDisplay}
              </div>
            ) : null}

            {inputModes ? (
              <div className="card" style={{ padding: "10px 12px", flex: "0 0 auto" }}>
                <FitBox minScale={0.52} maxScale={1}>
                  {inputModes}
                </FitBox>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 10,
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              {activeProfileHeader ? (
                <div className="card" style={{ padding: "10px 12px" }}>
                  {activeProfileHeader}
                </div>
              ) : null}

              {playersInSidebar ? (
                <div
                  className="card"
                  style={{ padding: "10px 12px", flex: 1, minHeight: 0, overflow: "auto" }}
                >
                  {playersPanel}
                </div>
              ) : (
                renderPlayersRow()
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              {volleyInputDisplay ? (
                <div className="card" style={{ padding: "10px 12px" }}>
                  {volleyInputDisplay}
                </div>
              ) : null}

              {inputModes ? (
                <div className="card" style={{ padding: "10px 12px", flex: "0 0 auto" }}>
                  <FitBox minScale={0.58} maxScale={1}>
                    {inputModes}
                  </FitBox>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
