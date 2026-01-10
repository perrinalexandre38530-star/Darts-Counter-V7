// =============================================================
// src/pages/petanque/PetanqueStatsMenu.tsx
// Menu STATS dédié Pétanque (look identique StatsShell)
// - ❌ pas de ONLINE (spécifique Pétanque)
// - ✅ Matchs / Joueurs / Équipes / Classements / Historique / Sync
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import CardBtn from "../../components/CardBtn";

type Props = {
  go: (tab: any, params?: any) => void;
};

export default function PetanqueStatsMenu({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  return (
    <div style={{ paddingTop: 8, paddingBottom: 8 }}>
      {/* Header style "StatsShell" */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: theme?.primary ?? "#ffd34d",
            textAlign: "center",
            width: "100%",
          }}
        >
          {t("petanque.stats.menu.title", "STATS")}
        </div>

        <div
          className="subtitle"
          style={{
            fontSize: 12,
            marginTop: 4,
            color: theme?.textSoft ?? "rgba(255,255,255,.65)",
            textAlign: "center",
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          {t(
            "petanque.stats.menu.subtitle",
            "Matchs, joueurs, équipes, classements et historique."
          )}
        </div>
      </div>

      {/* ✅ JOUEURS */}
      <CardBtn
        title={t("petanque.stats.players.title", "STATS JOUEURS")}
        subtitle={t(
          "petanque.stats.players.subtitle",
          "Bilan par joueur (points marqués/encaissés, +/- , séries)."
        )}
        onClick={() => go("petanque_stats_players")}
      />

      {/* ✅ ÉQUIPES */}
      <CardBtn
        title={t("petanque.stats.teams.title", "STATS ÉQUIPES")}
        subtitle={t(
          "petanque.stats.teams.subtitle",
          "Bilan par équipe (victoires/défaites, points, régularité)."
        )}
        onClick={() => go("petanque_stats_teams")}
      />

      {/* ✅ CLASSEMENTS */}
      <CardBtn
        title={t("petanque.stats.rankings.title", "CLASSEMENTS")}
        subtitle={t(
          "petanque.stats.rankings.subtitle",
          "Leaderboards joueurs/équipes selon la période."
        )}
        onClick={() => go("petanque_stats_rankings")}
      />

      {/* ✅ MATCHS */}
      <CardBtn
        title={t("petanque.stats.matches.title", "MATCHS")}
        subtitle={t(
          "petanque.stats.matches.subtitle",
          "Liste des parties + détail d’un match."
        )}
        onClick={() => go("petanque_stats_matches")}
      />

      {/* ✅ HISTORIQUE (si tu veux réutiliser l’existant) */}
      <CardBtn
        title={t("petanque.stats.history.title", "HISTORIQUE")}
        subtitle={t(
          "petanque.stats.history.subtitle",
          "Historique complet : filtres, recherche, reprise."
        )}
        onClick={() => go("petanque_history")}
      />

      {/* ✅ SYNC & PARTAGE (tu as déjà SyncCenter) */}
      <CardBtn
        title={t("petanque.stats.sync.title", "SYNC & PARTAGE")}
        subtitle={t(
          "petanque.stats.sync.subtitle",
          "Export / import, synchronisation, partage."
        )}
        onClick={() => go("sync_center")}
      />

      {/* ❌ ONLINE volontairement absent */}
    </div>
  );
}
