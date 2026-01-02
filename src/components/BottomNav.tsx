import React from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * BottomNav
 * - Le bouton "Stats" ouvre le menu StatsShell (puis accès au Hub).
 * - Visuellement, l’onglet "Stats" reste actif quand on est dans statsHub.
 * - ✅ NEW: onglet "Tournois" (local) + actif aussi dans tournament_* routes
 */
type TabKey =
  | "home"
  | "games"
  | "tournaments"
  | "tournament_create"
  | "tournament_view"
  | "tournament_match_play"
  | "profiles"
  | "friends"
  | "stats"
  | "statsHub"
  | "settings";

type NavItem = {
  k: Exclude<
    TabKey,
    | "statsHub"
    | "tournament_create"
    | "tournament_view"
    | "tournament_match_play"
  >;
  label: string;
  icon: React.ReactNode;
};

function Icon({ name, size = 22 }: { name: TabKey; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M3 11.5 12 4l9 7.5" />
          <path {...p} d="M5 10.5V20h14v-9.5" />
        </svg>
      );

    // GAMES (Local) — cible 🎯
    case "games":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="7" />
          <circle {...p} cx="12" cy="12" r="3.2" />
          <path {...p} d="M12 5V3" />
          <path {...p} d="M19 12h2" />
          <path {...p} d="M12 21v-2" />
          <path {...p} d="M3 12h2" />
        </svg>
      );

    // TOURNOIS — trophée 🏆
    case "tournaments":
    case "tournament_create":
    case "tournament_view":
    case "tournament_match_play":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z" />
          <path {...p} d="M6 5H4v2a4 4 0 0 0 4 4" />
          <path {...p} d="M18 5h2v2a4 4 0 0 1-4 4" />
          <path {...p} d="M12 12v3" />
          <path {...p} d="M9 20h6" />
          <path {...p} d="M10 15h4" />
        </svg>
      );

    case "profiles":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20a6.5 6.5 0 0 1 16 0" />
          <circle {...p} cx="12" cy="8" r="3.6" />
        </svg>
      );

    // FRIENDS (Online) — globe + ping 🌐
    case "friends":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="7" />
          <path {...p} d="M12 5c2 2.8 2 11.2 0 14" />
          <path {...p} d="M5 12h14" />
          <circle
            cx="18.2"
            cy="6"
            r="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle cx="18.2" cy="6" r="0.9" fill="currentColor" />
        </svg>
      );

    case "stats":
    case "statsHub": // ✅ même icône
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20V7" />
          <path {...p} d="M10 20V4" />
          <path {...p} d="M16 20v-6" />
          <path {...p} d="M22 20V9" />
        </svg>
      );

    case "settings":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            {...p}
            d="m12 3 1.6 2.4a2 2 0 0 0 1.1.8l2.8.7-.7 2.8a2 2 0 0 0 .2 1.4l1.4 2.3-2.3 1.4a2 2 0 0 0-1 .9l-.8 2.7-2.8-.6a2 2 0 0 0-1.4.2L9 21l-1.4-2.3a2 2 0 0 0-.9-1l-2.7-.8.6-2.8a2 2 0 0 0-.2-1.4L3 9l2.3-1.4a2 2 0 0 0 1-.9l.8-2.7 2.8.6a2 2 0 0 0 1.4-.2Z"
          />
          <circle {...p} cx="12" cy="12" r="2.8" />
        </svg>
      );
  }
}

export default function BottomNav({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const { theme } = useTheme();

  // Couleurs pilotées par le thème
  const bg = (theme as any)?.navBg ?? theme.card ?? "#050608";
  const borderTop = theme.cardSoft ?? "#111827";
  const textSoft = theme.textSoft ?? "#9ca3af";
  const textMain = theme.textMain ?? "#f9fafb";
  const accent = (theme as any)?.navAccent ?? theme.primary ?? textMain;

  const tabs: NavItem[] = [
    { k: "home", label: "Accueil", icon: <Icon name="home" /> },

    // Profils avant Local
    { k: "profiles", label: "Profils", icon: <Icon name="profiles" /> },

    // Local (jeux)
    { k: "games", label: "Local", icon: <Icon name="games" /> },

    // ✅ NEW: Tournois (local)
    { k: "tournaments", label: "Tournois", icon: <Icon name="tournaments" /> },

    // Online
    { k: "friends", label: "Online", icon: <Icon name="friends" /> },

    { k: "stats", label: "Stats", icon: <Icon name="stats" /> },
    { k: "settings", label: "Réglages", icon: <Icon name="settings" /> },
  ];

  const tap = (k: NavItem["k"]) => {
    (navigator as any)?.vibrate?.(8);

    // Stats -> ouvre le menu (StatsShell)
    if (k === "stats") {
      onChange("stats");
      return;
    }

    onChange(k);
  };

  const isTournamentRoute =
    value === "tournaments" ||
    value === "tournament_create" ||
    value === "tournament_view" ||
    value === "tournament_match_play";

  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label="Navigation principale"
      style={{
        background: bg,
        borderTop: `1px solid ${borderTop}`,
      }}
    >
      {tabs.map((t) => {
        // ✅ onglet Stats actif aussi quand on est dans statsHub
        const activeStats = t.k === "stats" && value === "statsHub";

        // ✅ onglet Tournois actif aussi quand on est dans tournament_*
        const activeTournaments = t.k === "tournaments" && isTournamentRoute;

        const active = value === t.k || activeStats || activeTournaments;

        const halo = active ? accent : "transparent";

        return (
          <button
            key={t.k}
            className={`tab pill ${active ? "is-active" : ""}`}
            onClick={() => tap(t.k)}
            aria-current={active ? "page" : undefined}
            title={t.label}
            style={{
              color: active ? accent : textSoft,
            }}
          >
            <span
              className="pill-inner"
              style={{
                borderColor: active ? accent : "transparent",
                boxShadow: active
                  ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC`
                  : "none",
                background: active ? "rgba(0,0,0,0.22)" : "transparent",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
              }}
            >
              <span
                className="tab-icon"
                style={{
                  filter: active ? `drop-shadow(0 0 6px ${halo})` : "none",
                }}
              >
                {t.icon}
              </span>
              <span
                className="tab-label"
                style={{
                  color: active ? textMain : textSoft,
                }}
              >
                {t.label}
              </span>
            </span>
          </button>
        );
      })}
      <div className="bn-safe" />
    </nav>
  );
}
