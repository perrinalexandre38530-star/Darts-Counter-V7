// ============================================
// src/components/gameplay/GameplayLayout.tsx
// Layout unifié pour tous les modes GAMEPLAY (darts + autres sports)
// Objectif: appliquer UNE règle de mise en page (cf. MEP.jpg)
// - Header "scoreboard + Menu & Infos" (BackDot / InfoDot)
// - Bloc "Header Profil Actif"
// - Rangée "Liste des joueurs" (ouvre un bloc flottant scrollable)
// - Zone "Affichage saisie de volée" (keypad)
// - Zone principale "Modes de saisie" (keypad/cible/etc)
// NB: BottomNav est déjà masquée côté App.tsx pour les tabs *_play.
// ============================================

import React from "react";
import BackDot from "../BackDot";
import InfoDot from "../InfoDot";
import RulesModal from "../RulesModal";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  /** Titre centré du header (optionnel) */
  title?: string;

  /** Actions header */
  onBack?: () => void;
  onInfo?: () => void;

  /** Afficher le bouton InfoDot (par défaut: true) */
  showInfo?: boolean;

  /** Slot inline au centre du header (recommandé pour scoreboard compact) */
  headerInline?: React.ReactNode;

  /** Slot à droite du header (ex: set/leg, badge, etc.) */
  headerRight?: React.ReactNode;

  /** Contenus (slots) */
  headerScoreboard?: React.ReactNode;
  activeProfileHeader?: React.ReactNode;
  volleyInputDisplay?: React.ReactNode;
  inputModes?: React.ReactNode;

  /** Bloc joueurs */
  playersPanelTitle?: string;
  playersPanel?: React.ReactNode;
  playersRowRight?: React.ReactNode; // ex: mini badge, count, etc.
  playersRowLabel?: string;
  playersRowLabelColor?: string;

  /** En mode debug / overlay (optionnel) */
  topRightExtra?: React.ReactNode;
};

export default function GameplayLayout({
  title = "",
  onBack,
  onInfo,
  showInfo = true,
  headerInline,
  headerRight,
  headerScoreboard,
  activeProfileHeader,
  playersPanelTitle = "Joueurs",
  playersPanel,
  playersRowRight,
  playersRowLabel = "LISTE DES JOUEURS",
  playersRowLabelColor,
  volleyInputDisplay,
  inputModes,
  topRightExtra,
}: Props) {
  const { theme } = useTheme();
  const [openPlayers, setOpenPlayers] = React.useState(false);

  const canOpenPlayers = !!playersPanel;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        padding: "10px 10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
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
          {/* Left: Back */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ transform: "scale(0.88)", transformOrigin: "left center" }}>
              <BackDot onClick={onBack} />
            </div>
          </div>

          {/* Center: scoreboard compact (preferred) OR title */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {headerInline ? (
              headerInline
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

          {/* Right: badges + info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerRight}
            {topRightExtra}
            {showInfo ? (
              <div
                style={{
                  transform: "scale(0.88)",
                  transformOrigin: "right center",
                }}
              >
                <InfoDot onClick={onInfo} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Legacy: headerScoreboard rendered below when provided */}
        {headerScoreboard ? <div style={{ marginTop: 10 }}>{headerScoreboard}</div> : null}
      </div>

      {/* 2) HEADER PROFIL ACTIF */}
      {activeProfileHeader ? (
        <div className="card" style={{ padding: "10px 12px" }}>
          {activeProfileHeader}
        </div>
      ) : null}

      {/* 3) LISTE DES JOUEURS (ouvre bloc flottant) */}
      <div
        className="card"
        role={canOpenPlayers ? "button" : undefined}
        tabIndex={canOpenPlayers ? 0 : -1}
        onClick={canOpenPlayers ? () => setOpenPlayers(true) : undefined}
        onKeyDown={
          canOpenPlayers
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") setOpenPlayers(true);
              }
            : undefined
        }
        style={{
          padding: "12px 12px",
          cursor: canOpenPlayers ? "pointer" : "default",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          border: `1px solid ${theme.borderSoft}`,
          background: canOpenPlayers ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.18)",
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
          <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
            <span style={{ color: playersRowLabelColor ?? "inherit" }}>
              {playersRowLabel}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {playersRowRight}
            {canOpenPlayers ? (
              <span
                style={{
                  opacity: 0.7,
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

      <RulesModal
        open={openPlayers}
        onClose={() => setOpenPlayers(false)}
        title={playersPanelTitle}
      >
        <div style={{ padding: 2 }}>{playersPanel}</div>
      </RulesModal>

      {/* 4) AFFICHAGE SAISIE DE VOLÉE (KEYPAD) */}
      {volleyInputDisplay ? (
        <div className="card" style={{ padding: "10px 12px" }}>
          {volleyInputDisplay}
        </div>
      ) : null}

      {/* 5) MODES DE SAISIE (KEYPAD / CIBLE / ETC) */}
      {inputModes ? (
        <div
          className="card"
          style={{
            padding: "10px 12px",
            minHeight: 180,
          }}
        >
          {inputModes}
        </div>
      ) : null}
    </div>
  );
}
