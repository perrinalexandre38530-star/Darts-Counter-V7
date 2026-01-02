// =============================================================
// src/components/stats/StatsTrainingSummary.tsx
// Bloc réutilisable "Training X01 + Tour de l'Horloge"
// - Lit les agrégats via lib/trainingAgg
// - Même logique que Home / ActiveProfileCard
// - À utiliser dans StatsHub (onglet Training / Evolution)
// =============================================================

import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Profile } from "../../lib/types";
import {
  loadTrainingAggForProfile,
  loadClockAggForProfile,
  getTrainingAvg3D,
  getClockSuccessRate,
} from "../../lib/trainingAgg";

type Props = {
  profile: Profile | null;
};

type KpiRow = {
  label: string;
  value: string;
};

function fmtNum(v?: number | null, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}

function fmtPct01(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

/* =============================================================
   Composant principal
============================================================= */

export default function StatsTrainingSummary({ profile }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme.primary ?? "#F6C256";

  const {
    hasTraining,
    hasClock,
    trainingRows,
    clockRows,
  } = useMemo(() => {
    if (!profile) {
      return {
        hasTraining: false,
        hasClock: false,
        trainingRows: [] as KpiRow[],
        clockRows: [] as KpiRow[],
      };
    }

    const tAgg = loadTrainingAggForProfile(profile.id);
    const cAgg = loadClockAggForProfile(profile.id);

    const trainingHitsTotal =
      (tAgg.hitsS ?? 0) + (tAgg.hitsD ?? 0) + (tAgg.hitsT ?? 0);
    const trainingAvg3D = getTrainingAvg3D(tAgg);

    const hasTraining = trainingHitsTotal > 0;

    const clockTargets = cAgg.targetsHitTotal ?? 0;
    const clockSuccess = getClockSuccessRate(cAgg);
    const hasClock =
      clockTargets > 0 || (cAgg.runsTotal ?? 0) > 0 || (cAgg.totalTimeSec ?? 0) > 0;

    const trainingRows: KpiRow[] = hasTraining
      ? [
          {
            label: t("stats.training.totalHits", "hits total"),
            value: fmtNum(trainingHitsTotal, 0),
          },
          {
            label: t("stats.training.avg3d", "moy. 3d"),
            value: fmtNum(trainingAvg3D, 2),
          },
          {
            label: t("stats.training.hitsS", "hits S"),
            value: fmtNum(tAgg.hitsS ?? 0, 0),
          },
          {
            label: t("stats.training.hitsD", "hits D"),
            value: fmtNum(tAgg.hitsD ?? 0, 0),
          },
          {
            label: t("stats.training.hitsT", "hits T"),
            value: fmtNum(tAgg.hitsT ?? 0, 0),
          },
          {
            label: t("stats.training.bestCO", "best CO"),
            value: fmtNum(tAgg.bestCheckout ?? 0, 0),
          },
        ]
      : [];

    const clockRows: KpiRow[] = hasClock
      ? [
          {
            label: t("stats.clock.targetsHit", "cibles touchées"),
            value: fmtNum(clockTargets, 0),
          },
          {
            label: t("stats.clock.successRate", "succès%"),
            value: fmtPct01(clockSuccess),
          },
          {
            label: t("stats.clock.runs", "runs"),
            value: fmtNum(cAgg.runsTotal ?? 0, 0),
          },
          {
            label: t("stats.clock.totalTime", "temps total"),
            value:
              cAgg.totalTimeSec != null
                ? `${Math.round(cAgg.totalTimeSec / 60)} min`
                : "—",
          },
          {
            label: t("stats.clock.bestStreak", "best série"),
            value: fmtNum(cAgg.bestStreak ?? 0, 0),
          },
        ]
      : [];

    return { hasTraining, hasClock, trainingRows, clockRows };
  }, [profile, t]);

  if (!profile) return null;

  const nothing = !hasTraining && !hasClock;

  if (nothing) {
    return (
      <div
        style={{
          borderRadius: 20,
          padding: 14,
          border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,0.22)"}`,
          background:
            "linear-gradient(135deg, rgba(5,7,16,0.9), rgba(10,14,26,0.9))",
          fontSize: 13,
          color: theme.textSoft ?? "rgba(255,255,255,0.8)",
        }}
      >
        {t(
          "stats.training.empty",
          "Aucune session Training X01 ou Tour de l'Horloge enregistrée pour ce profil."
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {hasTraining && (
        <StatsCard
          title={t("stats.training.title", "Training X01")}
          primary={primary}
        >
          <KpiGrid rows={trainingRows} primary={primary} />
        </StatsCard>
      )}

      {hasClock && (
        <StatsCard
          title={t("stats.clock.title", "Tour de l'Horloge")}
          primary={primary}
        >
          <KpiGrid rows={clockRows} primary={primary} />
        </StatsCard>
      )}
    </div>
  );
}

/* =============================================================
   Sous-composants : carte + grille KPI
============================================================= */

type StatsCardProps = {
  title: string;
  primary: string;
  children: React.ReactNode;
};

function StatsCard({ title, primary, children }: StatsCardProps) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 14,
        background: `linear-gradient(135deg, ${primary}22, rgba(0,0,0,0.96))`,
        border: `1px solid ${primary}AA`,
        boxShadow: `0 18px 38px rgba(0,0,0,0.85), 0 0 26px ${primary}33`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -30,
          background: `radial-gradient(circle at top, ${primary}22, transparent 60%)`,
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: primary,
          }}
        >
          {title}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

type KpiGridProps = {
  rows: KpiRow[];
  primary: string;
};

function KpiGrid({ rows, primary }: KpiGridProps) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            borderRadius: 14,
            padding: "6px 8px 8px",
            background:
              "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.06), rgba(5,7,16,0.96))",
            border: `1px solid ${
              theme.borderSoft ?? "rgba(255,255,255,0.18)"
            }`,
            boxShadow: "0 10px 22px rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.4,
              opacity: 0.8,
              marginBottom: 3,
              textTransform: "lowercase",
            }}
          >
            {row.label}
          </div>
          <div
            style={{
              height: 2,
              width: 32,
              borderRadius: 999,
              marginBottom: 4,
              background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
              boxShadow: `0 0 8px ${primary}66`,
            }}
          />
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: primary,
              lineHeight: 1.1,
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}
