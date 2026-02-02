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
  /** Image ticker en fond du bloc "JOUEURS" (ex: ticker_x01.png). */
  playersRowTicker?: string;
  playersPanelMode?: "modal" | "sidebar-auto";

  /** Tablet */
  forceLayout?: "auto" | "phone" | "tablet";

  /** En mode debug / overlay (optionnel) */
  topRightExtra?: React.ReactNode;
};

export default function GameplayLayout({
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
  playersRowTicker,
  playersPanelMode = "sidebar-auto",
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
        background: playersRowTicker
          ? `linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.32)), url(${playersRowTicker}) center / cover no-repeat`
          : showPlayersRowAsButton
          ? "rgba(0,0,0,0.28)"
          : "rgba(0,0,0,0.18)",
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

  const infoEnabled = (showInfo ?? !!onInfo) && !!onInfo;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isTablet ? 1180 : 920,
    margin: "0 auto",
    padding: "10px 10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BackDot onClick={onBack} size={backDotSize} />
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
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
        <>
          {/* 2) HEADER PROFIL ACTIF */}
          {activeProfileHeader ? (
            <div className="card" style={{ padding: "10px 12px" }}>
              {activeProfileHeader}
            </div>
          ) : null}

          {/* 3) JOUEURS (modal) */}
          {renderPlayersRow()}

          <RulesModal
            open={openPlayers}
            onClose={() => setOpenPlayers(false)}
            title={playersPanelTitle}
          >
            <div style={{ padding: 2 }}>{playersPanel}</div>
          </RulesModal>

          {/* 4) VOLÉE */}
          {volleyInputDisplay ? (
            <div className="card" style={{ padding: "10px 12px" }}>
              {volleyInputDisplay}
            </div>
          ) : null}

          {/* 5) MODES DE SAISIE */}
          {inputModes ? (
            <div className="card" style={{ padding: "10px 12px", minHeight: 180 }}>
              {inputModes}
            </div>
          ) : null}
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {/* LEFT: profil + joueurs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            {activeProfileHeader ? (
              <div className="card" style={{ padding: "10px 12px" }}>
                {activeProfileHeader}
              </div>
            ) : null}

            {playersInSidebar ? (
              <div className="card" style={{ padding: "10px 12px", flex: 1, minHeight: 0 }}>
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
                <RulesModal
                  open={openPlayers}
                  onClose={() => setOpenPlayers(false)}
                  title={playersPanelTitle}
                >
                  <div style={{ padding: 2 }}>{playersPanel}</div>
                </RulesModal>
              </>
            )}
          </div>

          {/* RIGHT: volée + modes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            {volleyInputDisplay ? (
              <div className="card" style={{ padding: "10px 12px" }}>
                {volleyInputDisplay}
              </div>
            ) : null}

            {inputModes ? (
              <div className="card" style={{ padding: "10px 12px", flex: 1, minHeight: 0 }}>
                {inputModes}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
