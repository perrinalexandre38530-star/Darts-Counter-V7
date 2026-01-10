// =============================================================
// src/pages/petanque/PetanqueStatsShell.tsx
// ✅ COPIE 1:1 de src/pages/StatsShell.tsx (VISUEL IDENTIQUE)
// ✅ Adaptation UNIQUEMENT des cartes (Pétanque)
// ✅ ONLINE + TRAINING masqués
// ✅ Ajout "PROFILS LOCAUX" (menu stats)
// =============================================================

import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type InfoMode =
  | "players"
  | "locals"
  | "teams"
  | "leaderboards"
  | "matches"
  | "history"
  | "sync"
  | null;

export default function PetanqueStatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const playerLabel = active
    ? t("statsShell.players.titleActivePrefix", "STATS ") + active.name
    : t("petanqueStatsShell.players.titleDefault", "STATS JOUEURS");

  const [infoMode, setInfoMode] = React.useState<InfoMode>(null);

  return (
    <div
      className="stats-shell-page container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        .stats-shell-page {
          --title-min: 26px;
          --title-ideal: 8vw;
          --title-max: 40px;
          --card-pad: 14px;
          --menu-gap: 10px;
          --menu-title: 14px;
          --menu-sub: 12px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .stats-shell-page {
            --title-min: 24px;
            --title-ideal: 7vw;
            --title-max: 34px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --menu-title: 13.5px;
            --menu-sub: 11px;
          }
        }

        .stats-shell-card {
          position: relative;
        }
        .stats-shell-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 15% 0%, rgba(255,255,255,.10), transparent 60%);
          opacity: 0.0;
          pointer-events: none;
          animation: statsCardGlow 3.6s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes statsCardGlow {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.12; }
        }

        .stats-shell-info-btn {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid ${theme.primary}88;
          background: radial-gradient(
            circle at 30% 30%,
            ${theme.primary}33,
            rgba(0,0,0,0.85)
          );
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
          box-shadow:
            0 0 0 1px ${theme.primary}33,
            0 0 10px ${theme.primary}55;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            transform .15s ease,
            box-shadow .15s ease,
            background .15s ease,
            opacity .15s ease;
          opacity: 0.9;
          position: relative;
          overflow: hidden;
        }
        .stats-shell-info-btn::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(
            circle,
            ${theme.primary}66,
            transparent 65%
          );
          opacity: 0.0;
          transform: scale(0.8);
          animation: statsInfoGlow 2.6s ease-in-out infinite;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .stats-shell-info-btn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 0 0 1px ${theme.primary}77,
            0 0 16px ${theme.primary}88;
          opacity: 1;
        }
        .stats-shell-info-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow:
            0 0 0 1px ${theme.primary}aa,
            0 0 8px ${theme.primary}aa;
        }
        @keyframes statsInfoGlow {
          0%, 100% {
            opacity: 0.06;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.05);
          }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.9,
                textTransform: "uppercase",
                color: theme.primary,
                fontSize:
                  "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
                textShadow: `0 0 14px ${theme.primary}66`,
                marginBottom: 4,
              }}
            >
              {t("statsShell.title", "STATS")}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.35,
                color: theme.textSoft,
                maxWidth: 260,
              }}
            >
              {t(
                "petanqueStatsShell.subtitle",
                "Matches, joueurs, équipes, classements et historique."
              )}
            </div>
          </div>

          <button
            onClick={() => go("sync_center")}
            style={{
              borderRadius: 999,
              border: `1px solid ${theme.primary}`,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              background: theme.card,
              color: theme.primary,
              boxShadow: `0 0 12px ${theme.primary}55`,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {t("statsShell.syncButton", "Sync & partage")}
          </button>
        </div>
      </div>

      {/* ===== LISTE CARTES ===== */}
      <div
        className="stats-shell-list"
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: "var(--menu-gap)",
          paddingInline: 12,
        }}
      >
        {/* 1) Stats joueurs (profil actif) */}
        <StatsShellPlayerCard
          profile={active}
          label={playerLabel}
          theme={theme}
          onClick={() => {
            go("petanque_stats_players", {
              profileId: active?.id ?? null,
              mode: "active",
            });
          }}
          onInfo={() => setInfoMode("players")}
        />

        {/* 2) Profils locaux (mêmes vues pour tous les profils) */}
        <StatsShellCard
          title={t("statsShell.locals.title", "PROFILS LOCAUX")}
          subtitle={t(
            "statsShell.locals.subtitle",
            "Accède aux mêmes vues de stats pour tous les profils locaux."
          )}
          theme={theme}
          onClick={() => {
            go("petanque_stats_players", {
              profileId: null,
              mode: "locals",
            });
          }}
          onInfo={() => setInfoMode("locals")}
        />

        {/* 3) Stats équipes */}
        <StatsShellCard
          title={t("petanqueStatsShell.teams.title", "STATS ÉQUIPES")}
          subtitle={t(
            "petanqueStatsShell.teams.subtitle",
            "Bilan par équipe (victoires/défaites, points, régularité)."
          )}
          theme={theme}
          onClick={() => {
            go("petanque_stats_teams", { profileId: active?.id ?? null });
          }}
          onInfo={() => setInfoMode("teams")}
        />

        {/* 4) Classements */}
        <StatsShellCard
          title={t("petanqueStatsShell.leaderboards.title", "CLASSEMENTS")}
          subtitle={t(
            "petanqueStatsShell.leaderboards.subtitle",
            "Leaderboards joueurs/équipes selon la période."
          )}
          theme={theme}
          onClick={() =>
            go("petanque_stats_leaderboards", { profileId: active?.id ?? null })
          }
          onInfo={() => setInfoMode("leaderboards")}
        />

        {/* 5) Matchs */}
        <StatsShellCard
          title={t("petanqueStatsShell.matches.title", "MATCHS")}
          subtitle={t(
            "petanqueStatsShell.matches.subtitle",
            "Liste des parties + détail d’un match."
          )}
          theme={theme}
          onClick={() =>
            go("petanque_stats_matches", { profileId: active?.id ?? null })
          }
          onInfo={() => setInfoMode("matches")}
        />

        {/* 6) Historique */}
        <StatsShellCard
          title={t("petanqueStatsShell.history.title", "HISTORIQUE")}
          subtitle={t(
            "petanqueStatsShell.history.subtitle",
            "Historique complet : filtres, recherche, reprise."
          )}
          theme={theme}
          onClick={() =>
            go("petanque_stats_history", { profileId: active?.id ?? null })
          }
          onInfo={() => setInfoMode("history")}
        />

        {/* 7) Sync & Partage */}
        <StatsShellCard
          title={t("statsShell.sync.title", "SYNC & PARTAGE")}
          subtitle={t(
            "statsShell.sync.subtitle",
            "Export / import de stats, sync entre appareils et via le cloud."
          )}
          theme={theme}
          onClick={() => go("sync_center")}
          onInfo={() => setInfoMode("sync")}
        />
      </div>

      <div style={{ height: 80 }} />

      {infoMode && (
        <InfoOverlay
          mode={infoMode}
          theme={theme}
          t={t}
          onClose={() => setInfoMode(null)}
        />
      )}
    </div>
  );
}

/* ---------- Carte joueur avec avatar + ring ---------- */
function StatsShellPlayerCard({
  profile,
  label,
  theme,
  onClick,
  onInfo,
}: {
  profile: Profile | null;
  label: string;
  theme: any;
  onClick?: () => void;
  onInfo?: () => void;
}) {
  return (
    <div
      className="stats-shell-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--card-pad)",
          paddingRight: 54,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatsPlayerAvatar profile={profile} theme={theme} />
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
              whiteSpace: "normal",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            {label}
          </div>
        </div>
      </button>

      <button
        type="button"
        className="stats-shell-info-btn"
        onClick={(e) => {
          e.stopPropagation();
          onInfo?.();
        }}
        aria-label="Informations"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        i
      </button>
    </div>
  );
}

function StatsPlayerAvatar({
  profile,
  theme,
}: {
  profile: Profile | null;
  theme: any;
}) {
  const AVA = 44;
  const PAD = 6;
  const STAR = 10;

  const legacy = (profile as any)?.stats || {};
  const avg3n =
    typeof legacy.avg3 === "number" && !Number.isNaN(legacy.avg3)
      ? legacy.avg3
      : 0;

  return (
    <div style={{ position: "relative", width: AVA, height: AVA, flexShrink: 0 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -(PAD + STAR / 2),
          top: -(PAD + STAR / 2),
          width: AVA + (PAD + STAR / 2) * 2,
          height: AVA + (PAD + STAR / 2) * 2,
          pointerEvents: "none",
        }}
      >
        <ProfileStarRing
          anchorSize={AVA}
          gapPx={-2}
          starSize={STAR}
          stepDeg={12}
          rotationDeg={0}
          avg3d={avg3n}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2px solid ${theme.primary}88`,
          boxShadow: `0 0 14px ${theme.primary}55`,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {profile && (profile as any).avatarDataUrl ? (
          <img
            src={(profile as any).avatarDataUrl}
            alt={profile.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : (
          <ProfileAvatar
            size={AVA}
            dataUrl={undefined}
            label={profile?.name?.[0]?.toUpperCase() || "?"}
            showStars={false}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: `inset 0 0 0 2px ${theme.primary}40`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ---------- Carte générique ---------- */
function StatsShellCard({
  title,
  subtitle,
  theme,
  onClick,
  onInfo,
}: {
  title: string;
  subtitle: string;
  theme: any;
  onClick?: () => void;
  onInfo?: () => void;
}) {
  return (
    <div
      className="stats-shell-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--card-pad)",
          paddingRight: 54,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "var(--menu-sub)",
              color: theme.textSoft,
              lineHeight: 1.3,
              maxWidth: 360,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </div>
        </div>
      </button>

      <button
        type="button"
        className="stats-shell-info-btn"
        onClick={(e) => {
          e.stopPropagation();
          onInfo?.();
        }}
        aria-label="Informations"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        i
      </button>
    </div>
  );
}

/* ---------- Popin d'aide ---------- */
function InfoOverlay({
  mode,
  theme,
  t,
  onClose,
}: {
  mode: InfoMode;
  theme: any;
  t: (k: string, f: string) => string;
  onClose: () => void;
}) {
  let title = "";
  let body = "";

  switch (mode) {
    case "players":
      title = t("petanqueStatsShell.info.players.title", "STATS — Joueurs");
      body = t(
        "petanqueStatsShell.info.players.body",
        "Bilan par joueur : points marqués/encaissés, +/- et séries. (Écran à créer ensuite.)"
      );
      break;

    case "locals":
      title = t("statsShell.info.locals.title", "PROFILS LOCAUX");
      body = t(
        "statsShell.info.locals.body",
        "Accède aux mêmes vues de stats pour tous les profils locaux. (Écran à créer ensuite.)"
      );
      break;

    case "teams":
      title = t("petanqueStatsShell.info.teams.title", "STATS — Équipes");
      body = t(
        "petanqueStatsShell.info.teams.body",
        "Bilan par équipe : victoires/défaites, points, régularité. (Écran à créer ensuite.)"
      );
      break;

    case "leaderboards":
      title = t("petanqueStatsShell.info.leaderboards.title", "CLASSEMENTS");
      body = t(
        "petanqueStatsShell.info.leaderboards.body",
        "Classements joueurs/équipes selon la période. (Écran à créer ensuite.)"
      );
      break;

    case "matches":
      title = t("petanqueStatsShell.info.matches.title", "MATCHS");
      body = t(
        "petanqueStatsShell.info.matches.body",
        "Liste des parties + ouverture du détail d’un match. (Écran à créer ensuite.)"
      );
      break;

    case "history":
      title = t("petanqueStatsShell.info.history.title", "HISTORIQUE");
      body = t(
        "petanqueStatsShell.info.history.body",
        "Historique complet : filtres, recherche, reprise. (Écran à créer ensuite.)"
      );
      break;

    case "sync":
      title = t("statsShell.info.sync.title", "SYNC & PARTAGE");
      body = t(
        "statsShell.info.sync.body",
        "Centralise toutes les options d’export / import : fichiers, JSON, sync directe entre appareils et synchronisation via le cloud."
      );
      break;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          marginInline: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 40px rgba(0,0,0,.85)",
          padding: 14,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: theme.primary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.4,
            color: theme.textSoft,
            marginBottom: 10,
          }}
        >
          {body}
        </div>
        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              background: theme.primary,
              color: "#000",
              cursor: "pointer",
              boxShadow: `0 0 14px ${theme.primary}55`,
            }}
          >
            {t("statsShell.info.close", "Fermer")}
          </button>
        </div>
      </div>
    </div>
  );
}
