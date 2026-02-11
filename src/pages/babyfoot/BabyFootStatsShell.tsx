// ============================================
// src/pages/babyfoot/BabyFootStatsShell.tsx
// Menu Stats Baby-Foot — même ossature que StatsShell (darts)
// - On conserve l'UI/présentation, on change uniquement les entrées
//   et la navigation vers les pages stats baby-foot.
// ============================================

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

type InfoMode = "players" | "locals" | "rankings" | "teams" | "history" | "sync" | null;

export default function BabyFootStatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang() as any;

  const profiles = (store as any)?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  const active: Profile | null =
    profiles.find((p: any) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const playerLabel = active
    ? (t?.("statsShell.players.titleActivePrefix", "STATS ") ?? "STATS ") + (active as any).name
    : t?.("statsShell.players.titleDefault", "STATS JOUEURS") ?? "STATS JOUEURS";

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
        background: (theme as any).bg,
        color: (theme as any).text,
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

        .stats-shell-card { position: relative; }
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
          border: 1px solid ${(theme as any).primary}88;
          background: radial-gradient(
            circle at 30% 30%,
            ${(theme as any).primary}33,
            rgba(0,0,0,0.85)
          );
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
          box-shadow:
            0 0 0 1px ${(theme as any).primary}33,
            0 0 10px ${(theme as any).primary}55;
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
            ${(theme as any).primary}66,
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
            0 0 0 1px ${(theme as any).primary}77,
            0 0 16px ${(theme as any).primary}88;
          opacity: 1;
        }
        .stats-shell-info-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow:
            0 0 0 1px ${(theme as any).primary}aa,
            0 0 8px ${(theme as any).primary}aa;
        }
        @keyframes statsInfoGlow {
          0%, 100% { opacity: 0.06; transform: scale(0.9); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div style={{ width: "100%", maxWidth: 520, paddingInline: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.9,
                textTransform: "uppercase",
                color: (theme as any).primary,
                fontSize: "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
                textShadow: `0 0 14px ${(theme as any).primary}66`,
                marginBottom: 4,
              }}
            >
              {t?.("statsShell.title", "STATS") ?? "STATS"} — BABY-FOOT
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35, color: (theme as any).textSoft, maxWidth: 280 }}>
              Analyse tes performances, les classements, les équipes et les duels (local).
            </div>
          </div>

          <button
            onClick={() => go("sync_center")}
            style={{
              borderRadius: 999,
              border: `1px solid ${(theme as any).primary}`,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              background: (theme as any).card,
              color: (theme as any).primary,
              boxShadow: `0 0 12px ${(theme as any).primary}55`,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {t?.("statsShell.syncButton", "Sync & partage") ?? "Sync & partage"}
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
          onClick={() => go("babyfoot_stats_center", { scope: "active" })}
          onInfo={() => setInfoMode("players")}
        />

        <StatsShellCard
          title="PROFILS LOCAUX"
          subtitle="Centre de stats multi-profils (mêmes onglets Match/Fun/Training/Défis)."
          theme={theme}
          onClick={() => go("babyfoot_stats_center", { scope: "locals" })}
          onInfo={() => setInfoMode("locals")}
        />

        <StatsShellCard
          title="CLASSEMENTS"
          subtitle="Points, buts, diff. de buts (sur tes matchs enregistrés)."
          theme={theme}
          onClick={() => go("babyfoot_stats_history", { section: "rankings" })}
          onInfo={() => setInfoMode("rankings")}
        />

        <StatsShellCard
          title="ÉQUIPES"
          subtitle="Stats par compositions réelles (Team A / Team B)."
          theme={theme}
          onClick={() => go("babyfoot_stats_history", { section: "teams" })}
          onInfo={() => setInfoMode("teams")}
        />

        <StatsShellCard
          title="HISTORIQUE"
          subtitle="Toutes tes parties baby-foot terminées (filtres période/mode)."
          theme={theme}
          onClick={() => go("babyfoot_stats_history", { section: "history" })}
          onInfo={() => setInfoMode("history")}
        />

        <StatsShellCard
          title={t?.("statsShell.sync.title", "SYNC & PARTAGE") ?? "SYNC & PARTAGE"}
          subtitle={t?.("statsShell.sync.subtitle", "Export / import de stats, sync entre appareils et via le cloud.") ??
            "Export / import de stats, sync entre appareils et via le cloud."}
          theme={theme}
          onClick={() => go("sync_center")}
          onInfo={() => setInfoMode("sync")}
        />
      </div>

      <div style={{ height: 80 }} />

      {infoMode && (
        <InfoOverlay mode={infoMode} theme={theme} onClose={() => setInfoMode(null)} />
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

function StatsPlayerAvatar({ profile, theme }: { profile: Profile | null; theme: any }) {
  const AVA = 44;
  const PAD = 6;
  const STAR = 10;

  const legacy = (profile as any)?.stats || {};
  const avg3n = typeof legacy.avg3 === "number" && !Number.isNaN(legacy.avg3) ? legacy.avg3 : 0;

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
        <ProfileStarRing anchorSize={AVA} gapPx={-2} starSize={STAR} stepDeg={12} rotationDeg={0} avg3d={avg3n} />
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
            alt={(profile as any).name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : (
          <ProfileAvatar size={AVA} dataUrl={undefined} label={(profile as any)?.name?.[0]?.toUpperCase?.() || "?"} showStars={false} />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "var(--menu-sub)", lineHeight: 1.35, color: theme.textSoft, fontWeight: 700 }}>
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

function InfoOverlay({ mode, theme, onClose }: { mode: InfoMode; theme: any; onClose: () => void }) {
  const title =
    mode === "players"
      ? "Joueurs"
      : mode === "locals"
        ? "Profils locaux"
      : mode === "rankings"
        ? "Classements"
        : mode === "teams"
          ? "Équipes"
          : mode === "history"
            ? "Historique"
            : "Sync & partage";

  const body =
    mode === "players"
      ? "Centre de stats du joueur actif (onglets Match / Fun / Training / Défis)."
      : mode === "locals"
        ? "Centre de stats multi-profils (mêmes onglets Match / Fun / Training / Défis) — comme Darts Counter." 
      : mode === "rankings"
        ? "Classements calculés sur tes matchs baby-foot (points, goal diff, etc.)."
        : mode === "teams"
          ? "Stats équipes par composition réelle (Team A / Team B)."
          : mode === "history"
            ? "Liste des matchs terminés avec filtres période et mode (1v1 / 2v2 / 2v1)."
            : "Export/import et synchronisation entre appareils (cloud, device-to-device).";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          boxShadow: `0 24px 60px rgba(0,0,0,.70), 0 0 22px ${theme.primary}22`,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 950, letterSpacing: 0.6, color: theme.primary, textTransform: "uppercase" }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${theme.primary}77`,
              background: "transparent",
              color: theme.text,
              borderRadius: 999,
              padding: "6px 10px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
        <div style={{ marginTop: 10, color: theme.textSoft, fontWeight: 800, lineHeight: 1.35, fontSize: 13 }}>{body}</div>
      </div>
    </div>
  );
}
