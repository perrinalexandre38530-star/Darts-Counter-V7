// ============================================
// src/pages/StatsShell.tsx
// Menu Stats — style identique à Games / Training / Profils
// - Carte 1 : Stats joueur actif (vue complète : Général / Local / Online / Training / Cricket)
// - Carte 2 : Stats profils locaux (multi-joueurs)
// - Carte 3 : CLASSEMENTS globaux
// - Carte 4 : Training (stats sessions d’entraînement)
// - Carte 5 : Online
// - Carte 6 : Historique
// - Carte 7 : Sync & Partage (exports / imports / cloud / device-à-device)
// - Bouton "i" : popin d'aide (légère aura animée comme Games)
// ============================================
import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type InfoMode =
  | "active"
  | "locals"
  | "leaderboards"
  | "training"
  | "online"
  | "history"
  | "sync"
  | null;

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const playerLabel = active
    ? t("statsShell.players.titleActivePrefix", "STATS ") + active.name
    : t("statsShell.players.titleDefault", "STATS JOUEURS");

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
                "statsShell.subtitle",
                "Analyse tes performances, ton training, ton historique et synchronise tes stats."
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
        <StatsShellPlayerCard
          profile={active}
          label={playerLabel}
          theme={theme}
          onClick={() => {
            if (!active) return;
            go("statsHub", {
              tab: "stats",
              mode: "active",
              initialPlayerId: active.id,
              playerId: active.id,
              initialStatsSubTab: "dashboard",
            });
          }}
          onInfo={() => setInfoMode("active")}
        />

        <StatsShellCard
          title={t("statsShell.locals.title", "PROFILS LOCAUX")}
          subtitle={t(
            "statsShell.locals.subtitle",
            "Accède aux mêmes vues de stats pour tous les profils locaux."
          )}
          theme={theme}
          onClick={() => {
            go("statsHub", {
              tab: "stats",
              mode: "locals",
              initialPlayerId: null,
            });
          }}
          onInfo={() => setInfoMode("locals")}
        />

        <StatsShellCard
          title="CLASSEMENTS"
          subtitle="Classements globaux par mode de jeu (X01 multi, Cricket, Killer, etc.)."
          theme={theme}
          onClick={() => go("stats_leaderboards")}
          onInfo={() => setInfoMode("leaderboards")}
        />

        <StatsShellCard
          title="TERRITORIES"
          subtitle="Stats locales du mode TERRITORIES (domination, maps jouées, historique)."
          theme={theme}
          onClick={() => go("stats_territories")}
          onInfo={() => setInfoMode("history")}
        />

        <StatsShellCard
          title={t("statsShell.training.title", "TRAINING")}
          subtitle={t(
            "statsShell.training.subtitle",
            "Stats complètes de tes sessions Training X01 et Tour de l’horloge."
          )}
          theme={theme}
          onClick={() => go("statsHub", { tab: "training" })}
          onInfo={() => setInfoMode("training")}
        />

        <StatsShellCard
          title={t("statsShell.online.title", "ONLINE")}
          subtitle={t(
            "statsShell.online.subtitle",
            'Stats de tes parties Online (quand tu joues en mode "Online").'
          )}
          theme={theme}
          onClick={() => go("stats_online")}
          onInfo={() => setInfoMode("online")}
        />

        <StatsShellCard
          title={t("statsShell.history.title", "HISTORIQUE")}
          subtitle={t(
            "statsShell.history.subtitle",
            "Toutes tes parties et reprise des parties en cours."
          )}
          theme={theme}
          onClick={() => go("statsHub", { tab: "history" })}
          onInfo={() => setInfoMode("history")}
        />

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
    case "active":
      title = t("statsShell.info.active.title", "STATS — Joueur actif");
      body = t(
        "statsShell.info.active.body",
        "Accède aux statistiques complètes du joueur sélectionné : vue générale, stats locales, online et training pour tous les modes (X01, Cricket, etc.)."
      );
      break;
    case "locals":
      title = t("statsShell.info.locals.title", "STATS — Profils locaux");
      body = t(
        "statsShell.info.locals.body",
        "Retrouve les mêmes vues de statistiques pour tous les profils enregistrés sur cet appareil et compare leurs performances."
      );
      break;
    case "leaderboards":
      title = t("statsShell.info.leaderboards.title", "CLASSEMENTS");
      body = t(
        "statsShell.info.leaderboards.body",
        "Vue dédiée aux classements globaux : tous les profils sont comparés pour chaque mode de jeu (X01 multi, Cricket, Killer, etc.)."
      );
      break;
    case "training":
      title = t("statsShell.info.training.title", "TRAINING");
      body = t(
        "statsShell.info.training.body",
        "Analyse détaillée de tes séances d'entraînement : Training X01, Tour de l’horloge, progression globale et par segment."
      );
      break;
    case "online":
      title = t("statsShell.info.online.title", "ONLINE");
      body = t(
        "statsShell.info.online.body",
        "Analyse complète de tes matchs joués en mode Online : sessions, moyennes, gros scores, classement et progression."
      );
      break;
    case "history":
      title = t("statsShell.info.history.title", "HISTORIQUE");
      body = t(
        "statsShell.info.history.body",
        "Liste complète de l'historique de tes parties locales avec reprise des parties en cours et accès au détail de chaque match."
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
