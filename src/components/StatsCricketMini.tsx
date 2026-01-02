// =============================================================
// src/components/StatsCricketMini.tsx
// Bloc "onglet Cricket" réutilisable dans Stats joueur actif
// et Profils locaux.
// - Charge les stats Cricket par profil via l’historique
//   (loadCricketStatsByProfileFromHistory)
// - Affiche : matches, victoires, winrate, MPR
//   + détail 15–20 & Bull
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Profile } from "../lib/types";
import type {
  CricketPlayerStats,
  CricketNumberKey,
} from "../lib/StatsCricket";

import {
  loadCricketStatsByProfileFromHistory,
} from "../lib/statsCricketProfileAgg";

// -------- Styles utilitaires ---------------------------------

const sectionTitleStyle = (color: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  color,
  letterSpacing: 0.6,
  marginBottom: 8,
});

const card: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  padding: 14,
  borderRadius: 14,
  marginBottom: 14,
  border: "1px solid rgba(255,255,255,0.06)",
};

const kpiChip: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

const numberCell: React.CSSProperties = {
  flex: "1 1 30%",
  minWidth: 90,
  padding: 8,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.06)",
  marginBottom: 8,
};

// -------- Props -----------------------------------------------

type Props = {
  profile: Profile | null;
  // Optionnel : si plus tard tu veux injecter un cache externe
  cricketStatsByProfile?: Record<string, CricketPlayerStats> | null;
};

// =============================================================

export default function StatsCricketMini({
  profile,
  cricketStatsByProfile,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const accent = theme.accent;

  const [statsMap, setStatsMap] = useState<
    Record<string, CricketPlayerStats> | null
  >(cricketStatsByProfile ?? null);
  const [loading, setLoading] = useState(!cricketStatsByProfile);
  const [error, setError] = useState<string | null>(null);

  // ---------- Chargement des stats depuis l'historique ----------
  useEffect(() => {
    let alive = true;

    if (cricketStatsByProfile) {
      setStatsMap(cricketStatsByProfile);
      setLoading(false);
      setError(null);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await loadCricketStatsByProfileFromHistory();
        if (!alive) return;
        setStatsMap(res);
      } catch (e) {
        console.warn(
          "[StatsCricketMini] loadCricketStatsByProfileFromHistory error:",
          e
        );
        if (!alive) return;
        setError("failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cricketStatsByProfile]);

  const currentStats: CricketPlayerStats | null = useMemo(() => {
    if (!profile || !statsMap) return null;
    return statsMap[profile.id] ?? null;
  }, [profile, statsMap]);

  const numbersOrder: CricketNumberKey[] = [
    "20",
    "19",
    "18",
    "17",
    "16",
    "15",
    "25", // bull
  ];

  // -----------------------------------------------------------
  // Rendu
  // -----------------------------------------------------------

  // Aucun profil sélectionné
  if (!profile) {
    return (
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("stats.cricket.title", "Statistiques Cricket")}
        </div>
        <div
          style={{
            textAlign: "center",
            color: theme.textSoft,
            padding: "18px 0",
            fontSize: 13,
          }}
        >
          {t(
            "stats.cricket.noPlayer",
            "Aucun joueur sélectionné. Ajoute ou sélectionne un profil pour voir ses stats Cricket."
          )}
        </div>
      </div>
    );
  }

  // Loading global
  if (loading && !statsMap) {
    return (
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("stats.cricket.title", "Statistiques Cricket")}
        </div>
        <div
          style={{
            textAlign: "center",
            color: theme.textSoft,
            padding: "18px 0",
            fontSize: 13,
          }}
        >
          {t("stats.cricket.loading", "Chargement des statistiques Cricket…")}
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("stats.cricket.title", "Statistiques Cricket")}
        </div>
        <div
          style={{
            textAlign: "center",
            color: theme.textSoft,
            padding: "18px 0",
            fontSize: 13,
          }}
        >
          {t(
            "stats.cricket.error",
            "Impossible de charger les données Cricket pour le moment."
          )}
        </div>
      </div>
    );
  }

  // Aucune donnée pour ce joueur
  if (!currentStats) {
    return (
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("stats.cricket.title", "Statistiques Cricket")}
        </div>
        <div
          style={{
            textAlign: "center",
            color: theme.textSoft,
            padding: "18px 0",
            fontSize: 13,
          }}
        >
          {t(
            "stats.cricket.noDataYet",
            "Aucune donnée Cricket pour ce joueur pour le moment."
          )}
        </div>
      </div>
    );
  }

  const winrate =
    currentStats.games > 0 ? (currentStats.wins / currentStats.games) * 100 : 0;

  return (
    <>
      {/* KPIs principaux */}
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("stats.cricket.overview", "Vue d’ensemble")}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Matches */}
          <div style={kpiChip}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: theme.textSoft,
                marginBottom: 4,
              }}
            >
              {t("stats.cricket.games", "Matches")}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {currentStats.games}
            </div>
          </div>

          {/* Victoires */}
          <div style={kpiChip}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: theme.textSoft,
                marginBottom: 4,
              }}
            >
              {t("stats.cricket.wins", "Victoires")}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {currentStats.wins}
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.textSoft,
                marginTop: 2,
              }}
            >
              {winrate.toFixed(0)}%
            </div>
          </div>

          {/* Marks / Round */}
          <div style={kpiChip}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: theme.textSoft,
                marginBottom: 4,
              }}
            >
              {t("stats.cricket.mpr", "Marks / Round")}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {currentStats.marksPerRound.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Détail par numéro */}
      <div style={card}>
        <div style={sectionTitleStyle(accent)}>
          {t("cricket.hits", "Touches / points par numéro")}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {numbersOrder.map((numKey) => {
            const s = currentStats.numbers[numKey] ?? {
              hits: 0,
              closes: 0,
              points: 0,
            };

            const label = numKey === "25" ? "BULL" : numKey;

            return (
              <div key={numKey} style={numberCell}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: accent,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: theme.textSoft,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("stats.cricket.marksShort", "marks")}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {s.hits}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: theme.textSoft,
                  }}
                >
                  <span>
                    {t("stats.cricket.closesShort", "ferm.")}: {s.closes}
                  </span>
                  <span>
                    {t("stats.cricket.pointsShort", "pts")}: {s.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
